#!/usr/bin/env python3
"""
Batch VVD — Análise Estratégica para Audiência
Lê PDFs de autos VVD, envia ao Claude Sonnet com prompt do dossiê estratégico,
salva relatório Markdown no Drive e atualiza OMBUDS.

Uso:
  python3 scripts/batch_vvd_audiencia.py --pdf-dir ~/Desktop/pje-autos-vvd-20260416 --data 2026-04-16
"""

import argparse
import base64
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, date
from pathlib import Path
from typing import Any, Optional

import httpx

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
ENV_FILE = PROJECT_DIR / ".env.local"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("batch-vvd")


def load_env(path: Path) -> dict[str, str]:
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, val = line.partition("=")
                val = val.strip().strip('"').strip("'")
                env[key.strip()] = val
    return env


ENV = load_env(ENV_FILE)
SUPABASE_URL = ENV["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]
ANTHROPIC_API_KEY = ENV["ANTHROPIC_API_KEY"]
GOOGLE_CLIENT_ID = ENV["GOOGLE_CLIENT_ID"]
GOOGLE_CLIENT_SECRET = ENV["GOOGLE_CLIENT_SECRET"]
GOOGLE_REFRESH_TOKEN = ENV["GOOGLE_REFRESH_TOKEN"]
CLAUDE_MODEL = "claude-sonnet-4-6"

_access_token_cache: dict[str, Any] = {}


def get_access_token() -> str:
    if _access_token_cache.get("token") and _access_token_cache.get("expires_at", 0) > time.time():
        return _access_token_cache["token"]
    resp = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "refresh_token": GOOGLE_REFRESH_TOKEN,
            "grant_type": "refresh_token",
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    _access_token_cache["token"] = data["access_token"]
    _access_token_cache["expires_at"] = time.time() + data.get("expires_in", 3500) - 60
    return data["access_token"]


def supabase_update(table: str, row_id: int, data: dict) -> bool:
    resp = httpx.patch(
        f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{row_id}",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json=data,
        timeout=15,
    )
    return resp.status_code in (200, 204)


def supabase_insert(table: str, data: dict) -> Optional[dict]:
    resp = httpx.post(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        json=data,
        timeout=15,
    )
    if resp.status_code in (200, 201):
        rows = resp.json()
        return rows[0] if isinstance(rows, list) and rows else rows
    log.error("Insert %s failed: %s %s", table, resp.status_code, resp.text[:200])
    return None


def drive_create_or_update_file(
    folder_id: str, filename: str, content: str, mime_type: str, token: str
) -> Optional[dict]:
    resp = httpx.get(
        "https://www.googleapis.com/drive/v3/files",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "q": f"'{folder_id}' in parents and name = '{filename}' and trashed = false",
            "fields": "files(id)",
        },
        timeout=10,
    )
    existing = resp.json().get("files", [])

    if existing:
        file_id = existing[0]["id"]
        resp = httpx.patch(
            f"https://www.googleapis.com/upload/drive/v3/files/{file_id}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": mime_type},
            params={"uploadType": "media"},
            content=content.encode("utf-8"),
            timeout=30,
        )
    else:
        metadata = json.dumps({"name": filename, "parents": [folder_id]})
        boundary = "batch_boundary_ombuds"
        body = (
            f"--{boundary}\r\n"
            f"Content-Type: application/json; charset=UTF-8\r\n\r\n"
            f"{metadata}\r\n"
            f"--{boundary}\r\n"
            f"Content-Type: {mime_type}\r\n\r\n"
            f"{content}\r\n"
            f"--{boundary}--"
        )
        resp = httpx.post(
            "https://www.googleapis.com/upload/drive/v3/files",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": f"multipart/related; boundary={boundary}",
            },
            params={"uploadType": "multipart", "fields": "id,name,webViewLink"},
            content=body.encode("utf-8"),
            timeout=30,
        )

    if resp.status_code in (200, 201):
        return resp.json()
    log.error("Drive upload failed: %s %s", resp.status_code, resp.text[:200])
    return None


VVD_SYSTEM = """Você é um Defensor Público criminalista sênior da DPE-BA, 7ª Regional – Camaçari, especializado em Violência Doméstica (Lei Maria da Penha). Elabore um Dossiê Estratégico de Defesa completo para audiência de instrução e julgamento.

REGRAS DE LINGUAGEM OBRIGATÓRIAS:
- "defendido" (NUNCA "acusado", "réu", "agressor")
- "ofendida" ou "suposta vítima" quando houver dúvida
- "fato imputado" (NUNCA "crime cometido")
- Modalizadores: "segundo a denúncia", "conforme a acusação pretende"
- "declarou", "relatou" (NUNCA "confessou", "admitiu")"""

VVD_PROMPT = """PROCESSO: {numero_autos}
DEFENDIDO: {assistido_nome}
AUDIÊNCIA: {tipo_audiencia} — {data_audiencia} às {horario}

ATENÇÃO ESPECIAL — STATUS DE CADA DEPOENTE (CAMPO MAIS CRÍTICO):
Para CADA testemunha/vítima/informante listada, procure nos autos e relate:
1. Se JÁ FOI OUVIDA em juízo (audiência anterior) — OU só na delegacia — OU nenhum.
2. Se NÃO foi ouvida em juízo: foi INTIMADA para esta audiência? (pessoalmente / advogado / edital)
3. Se NÃO intimada: por quê?
   - Não houve diligência de intimação (servidor não foi procurar)
   - Diligência frustrada: não localizado / endereço incorreto / mudou / outro motivo
   - Dispensada pela defesa ou pelo MP
4. TEOR LITERAL da certidão do oficial de justiça / servidor quando diligência frustrada.

Essa informação é CRÍTICA e deve aparecer nos campos `statusIntimacao`, `jaOuvido`, `teorCertidao`, `dataCertidao` de cada testemunha no JSON.

Analise o PDF completo dos autos e gere o DOSSIÊ ESTRATÉGICO DE DEFESA para a audiência de amanhã, com TODAS as seções:

1. PAINEL DE CONTROLE DO CASO (tabela: defendido, ofendida, ação penal, IP, MPU, crimes imputados, juízo, status, prescrição)

2. RESUMO EXECUTIVO ESTRATÉGICO (3 parágrafos: acusação central, principal prova e vulnerabilidade, linha de defesa mais promissora)

3. STATUS PROCESSUAL E PONTOS DE ATENÇÃO URGENTES (prescrição, intimações, MPU vigentes, processos conexos)

4. PERFIL DOS ENVOLVIDOS (defendido, ofendida, dinâmica do relacionamento, filhos, disputas paralelas)

5. RADIOGRAFIA DA ACUSAÇÃO (tese da denúncia, testemunhas da acusação em tabela, provas materiais, lacunas probatórias)

6. PAINEL DE DEPOENTES — ANÁLISE CRÍTICA (ficha por depoente: fase policial vs judicial, trechos de impacto, contradições, credibilidade + TABELA COMPARATIVA)

7. SÍNTESE ESTRATÉGICA E TESES DE DEFESA (vulnerabilidades numeradas, teses ordenadas por viabilidade com fundamento legal, narrativa defensiva)

8. PLANO DE AÇÃO PARA A AUDIÊNCIA (perguntas-chave por depoente, preparação do interrogatório, testemunhas de defesa)

9. AVALIAÇÃO DE RISCO (tabela: risco, probabilidade, impacto, mitigação)

Gere o relatório em Markdown. Depois, adicione UM único bloco JSON ao final entre ```json``` com o schema v2 completo abaixo. TODOS os campos são obrigatórios — use [] / "" / null quando não se aplicar. NÃO invente informação.

{{
  "resumo_executivo": "3 parágrafos: (1) acusação central; (2) principal prova da acusação e sua vulnerabilidade; (3) linha de defesa mais promissora",
  "narrativa_denuncia": "síntese factual da denúncia ou BO em prosa corrida (o que o MP/ofendida alega)",
  "imputacao": "descrição textual dos crimes imputados em 1 frase",
  "crimes_imputados": ["art. X do CP/Lei Y (nome)"],
  "tipo_processo": "MPU|Ação Penal|Queixa-Crime",
  "medidas_protetivas_vigentes": ["lista"],

  "versao_delegacia": "versão do defendido em sede policial (literal ou resumida); \\"\\" se silenciou ou não há",

  "laudos": [
    {{"nome": "Laudo de Exame de Corpo de Delito", "detalhes": "conclusão/resultado resumido"}}
  ],

  "vulnerabilidades_acusacao": [
    "lacunas probatórias, pontos frágeis, ausências na denúncia — cada item uma frase"
  ],

  "testemunhas_acusacao": [
    {{
      "nome": "Nome completo",
      "vinculo": "ofendida|policial|familiar|vizinha|outro",
      "jaOuvido": "nenhum|delegacia|juizo-anterior|ambos",
      "statusIntimacao": "intimado-pessoalmente|intimado-advogado|intimado-edital|sem-diligencia|frustrada-nao-localizado|frustrada-endereco-incorreto|frustrada-mudou|frustrada|dispensado|mp-desistiu|pendente",
      "teorCertidao": "texto literal da certidão do oficial/servidor quando a intimação frustrou; vazio se intimado ou já ouvido",
      "dataCertidao": "YYYY-MM-DD da última certidão quando houver",
      "resumo": "síntese do depoimento em sede policial/anterior",
      "pontosFavoraveis": "o que favorece a defesa (contradições, hesitação, interesse)",
      "pontosDesfavoraveis": "o que prejudica a defesa",
      "perguntasSugeridas": "perguntas-chave para inquirição",
      "credibilidade": "Alta|Média|Baixa"
    }}
  ],
  "testemunhas_defesa": [
    {{
      "nome": "Nome completo",
      "vinculo": "familiar|colega|vizinha|outro",
      "jaOuvido": "nenhum|delegacia|juizo-anterior|ambos",
      "statusIntimacao": "intimado-pessoalmente|intimado-advogado|intimado-edital|sem-diligencia|frustrada-nao-localizado|frustrada-endereco-incorreto|frustrada-mudou|frustrada|dispensado|mp-desistiu|pendente",
      "teorCertidao": "",
      "dataCertidao": "",
      "resumo": "o que poderá declarar",
      "pontosFavoraveis": "",
      "pontosDesfavoraveis": "",
      "perguntasSugeridas": "",
      "credibilidade": "Alta|Média|Baixa"
    }}
  ],

  "contradicoes": [
    {{"descricao": "contradição específica entre depoimentos ou entre fases", "favoravel": true}}
  ],

  "pendencias_diligencia_pre_aij": [
    "diligências urgentes a fazer antes da audiência (ex.: intimar testemunha X, juntar documento Y)"
  ],

  "teses_defesa": [
    {{"tese": "nome curto da tese", "viabilidade": "alta|media|baixa", "fundamento": "base legal + argumentação"}}
  ],

  "tese_principal": "resumo em 1 frase da tese mais forte",
  "viabilidade_tese_principal": "Alta|Média|Baixa",
  "teses_subsidiarias": ["lista curta"],
  "riscos_principais": ["lista"],
  "urgencias": ["lista de ações urgentes para antes da audiência"],
  "prescricao": {{"risco": true, "detalhes": "texto"}},
  "dinamica_relacional": "resumo da dinâmica",
  "historico_violencia": "resumo do histórico"
}}"""


def call_anthropic_with_pdf(pdf_path: Path, assistido_nome: str, numero_autos: str,
                            tipo_audiencia: str, data_audiencia: str, horario: str) -> str:
    pdf_bytes = pdf_path.read_bytes()
    pdf_b64 = base64.standard_b64encode(pdf_bytes).decode("ascii")

    user_content = [
        {
            "type": "document",
            "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_b64},
        },
        {
            "type": "text",
            "text": VVD_PROMPT.format(
                numero_autos=numero_autos,
                assistido_nome=assistido_nome,
                tipo_audiencia=tipo_audiencia,
                data_audiencia=data_audiencia,
                horario=horario,
            ),
        },
    ]

    resp = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": CLAUDE_MODEL,
            "max_tokens": 32000,
            "temperature": 0.2,
            "system": VVD_SYSTEM,
            "messages": [{"role": "user", "content": user_content}],
        },
        timeout=1500,
    )
    resp.raise_for_status()
    data = resp.json()
    usage = data.get("usage", {})
    log.info("  tokens: in=%d out=%d cache_read=%d",
             usage.get("input_tokens", 0), usage.get("output_tokens", 0),
             usage.get("cache_read_input_tokens", 0))
    return data["content"][0]["text"]


def _hidratar_depoentes(testemunhas_acusacao: list, testemunhas_defesa: list) -> list[dict]:
    """Converte testemunhas do schema v2 em objetos Depoente (ver
    src/components/agenda/registro-audiencia/types.ts) para pré-popular
    audiencias.registro_audiencia.depoentes. O hook use-registro-form respeita
    o array se ele já existir (não re-importa de previewPreparacao)."""
    def _classifica_tipo(vinculo: str) -> str:
        v = (vinculo or "").lower()
        if "ofendid" in v or "vítima" in v or "vitima" in v:
            return "vitima"
        if "policial" in v or "pm" in v or "condutor" in v or "investigador" in v:
            return "policial"
        if "perit" in v:
            return "perito"
        if "informante" in v:
            return "informante"
        return "testemunha"

    _STATUS_VALIDOS = {
        "intimado", "intimado-pessoalmente", "intimado-advogado", "intimado-edital",
        "nao-intimado", "sem-diligencia",
        "frustrada", "frustrada-nao-localizado", "frustrada-endereco-incorreto", "frustrada-mudou",
        "mp-desistiu", "dispensado", "pendente",
    }
    _OUVIDO_VALIDOS = {"nenhum", "delegacia", "audiencia-anterior", "juizo-anterior", "ambos"}

    def _normaliza_status(raw: str) -> str:
        v = (raw or "").strip().lower()
        if v in _STATUS_VALIDOS:
            return v
        # Aliases comuns gerados pelo modelo
        aliases = {
            "intimada": "intimado",
            "intimado pessoalmente": "intimado-pessoalmente",
            "intimado por advogado": "intimado-advogado",
            "edital": "intimado-edital",
            "nao intimado": "nao-intimado",
            "não intimado": "nao-intimado",
            "sem diligencia": "sem-diligencia",
            "sem diligência": "sem-diligencia",
            "nao localizado": "frustrada-nao-localizado",
            "não localizado": "frustrada-nao-localizado",
            "endereco incorreto": "frustrada-endereco-incorreto",
            "endereço incorreto": "frustrada-endereco-incorreto",
            "mudou": "frustrada-mudou",
            "mudou-se": "frustrada-mudou",
            "desistiu": "mp-desistiu",
        }
        return aliases.get(v, "pendente")

    def _normaliza_ouvido(raw: str, tem_resumo: bool) -> str:
        v = (raw or "").strip().lower()
        if v in _OUVIDO_VALIDOS:
            return v
        if v in {"juizo", "juízo"}:
            return "juizo-anterior"
        if v in {"aij", "audiencia"}:
            return "audiencia-anterior"
        return "delegacia" if tem_resumo else "nenhum"

    def _mk(t: Any, lado: str, idx: int) -> Optional[dict]:
        if isinstance(t, str):
            nome = t.strip()
            if not nome:
                return None
            return {
                "id": f"auto-{lado}-{idx}",
                "nome": nome,
                "tipo": "testemunha",
                "lado": lado,
                "intimado": False,
                "presente": False,
                "statusIntimacao": "pendente",
                "teorCertidao": "",
                "dataCertidao": "",
                "jaOuvido": "nenhum",
                "depoimentoDelegacia": "",
                "depoimentoAnterior": "",
                "pontosFortes": "",
                "pontosFracos": "",
                "estrategiaInquiricao": "",
                "perguntasDefesa": "",
                "depoimentoLiteral": "",
                "analisePercepcoes": "",
            }
        if not isinstance(t, dict):
            return None
        nome = (t.get("nome") or t.get("name") or "").strip()
        if not nome:
            return None
        vinculo = t.get("vinculo") or t.get("vínculo") or t.get("papel") or ""
        resumo = (t.get("resumo") or "").strip()
        status = _normaliza_status(t.get("statusIntimacao") or "")
        ouvido = _normaliza_ouvido(t.get("jaOuvido") or "", bool(resumo))
        teor = (t.get("teorCertidao") or "").strip()
        data_cert = (t.get("dataCertidao") or "").strip()
        intimado_bool = status in {"intimado", "intimado-pessoalmente", "intimado-advogado", "intimado-edital"}
        return {
            "id": f"auto-{lado}-{idx}",
            "nome": nome,
            "tipo": _classifica_tipo(vinculo),
            "lado": lado,
            "intimado": intimado_bool,
            "presente": False,
            "statusIntimacao": status,
            "teorCertidao": teor,
            "dataCertidao": data_cert,
            "jaOuvido": ouvido,
            "depoimentoDelegacia": resumo,
            "depoimentoAnterior": "",
            "pontosFortes": (t.get("pontosFavoraveis") or "").strip(),
            "pontosFracos": (t.get("pontosDesfavoraveis") or "").strip(),
            "estrategiaInquiricao": (t.get("perguntasSugeridas") or "").strip(),
            "perguntasDefesa": "",
            "depoimentoLiteral": "",
            "analisePercepcoes": vinculo.strip(),
        }

    out: list[dict] = []
    for i, t in enumerate(testemunhas_acusacao or []):
        d = _mk(t, "acusacao", i)
        if d:
            out.append(d)
    for i, t in enumerate(testemunhas_defesa or []):
        d = _mk(t, "defesa", i)
        if d:
            out.append(d)
    return out


def parse_json_from_response(text: str) -> dict:
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if json_match:
        raw = json_match.group(1)
    else:
        bs = text.find("{")
        be = text.rfind("}")
        if bs != -1 and be > bs:
            raw = text[bs:be + 1]
        else:
            return {}
    cleaned = raw.strip()
    cleaned = re.sub(r',\s*}', '}', cleaned)
    cleaned = re.sub(r',\s*]', ']', cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {}


def get_audiencias(data_str: str) -> list[dict]:
    """Fetch VVD audiências for a date from OMBUDS."""
    resp = httpx.get(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        timeout=15,
    )
    # Fallback: use pg directly via node
    import subprocess
    result = subprocess.run(
        ["node", "-e", f"""
const {{ Client }} = require('pg');
require('dotenv').config({{ path: '{ENV_FILE}' }});
(async () => {{
  const c = new Client({{ connectionString: process.env.DATABASE_URL }});
  await c.connect();
  const r = await c.query(`
    SELECT a.id as audiencia_id, a.data_audiencia, a.horario, a.tipo as tipo_audiencia,
           a.registro_audiencia, a.resumo_defesa,
           p.id as processo_id, p.numero_autos, p.classe_processual, p.assistido_id,
           p.drive_folder_id, p.analysis_data, p.analysis_status,
           ass.nome as assistido_nome
    FROM audiencias a
    JOIN processos p ON p.id = a.processo_id
    LEFT JOIN assistidos ass ON ass.id = a.assistido_id
    WHERE a.data_audiencia::date = '{data_str}' AND p.atribuicao = 'VVD_CAMACARI'
    ORDER BY a.horario
  `);
  console.log(JSON.stringify(r.rows));
  await c.end();
}})();
"""],
        capture_output=True, text=True, cwd=str(PROJECT_DIR),
    )
    if result.returncode != 0:
        log.error("DB query failed: %s", result.stderr[-300:])
        return []
    for line in result.stdout.strip().split("\n"):
        line = line.strip()
        if line.startswith("[{"):
            return json.loads(line)
    return []


def find_pdf(pdf_dir: Path, numero_autos: str) -> Optional[Path]:
    for f in pdf_dir.glob("*.pdf"):
        if numero_autos in f.name:
            return f
    return None


def main():
    parser = argparse.ArgumentParser(prog="batch_vvd_audiencia")
    parser.add_argument("--pdf-dir", required=True, help="Dir with downloaded PDFs")
    parser.add_argument("--data", required=True, help="Date YYYY-MM-DD for audiências")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--processo-id", type=int, help="Process single processo by ID")
    args = parser.parse_args()

    pdf_dir = Path(args.pdf_dir)
    if not pdf_dir.is_dir():
        log.error("PDF dir not found: %s", pdf_dir)
        return 1

    log.info("Fetching VVD audiências for %s...", args.data)
    audiencias = get_audiencias(args.data)
    if not audiencias:
        log.error("No VVD audiências found for %s", args.data)
        return 1

    log.info("Found %d VVD audiências", len(audiencias))

    results = []
    for aud in audiencias:
        pid = aud["processo_id"]
        if args.processo_id and pid != args.processo_id:
            continue

        numero = aud["numero_autos"]
        nome = aud["assistido_nome"] or "Desconhecido"
        horario = aud["horario"] or "?"
        tipo_aud = aud["tipo_audiencia"] or "AIJ"
        data_aud = args.data
        folder_id = aud.get("drive_folder_id")

        pdf = find_pdf(pdf_dir, numero)
        if not pdf:
            log.warning("  PDF not found for %s (%s) — skipping", numero, nome)
            results.append({"processo": numero, "assistido": nome, "status": "no_pdf"})
            continue

        log.info("=" * 60)
        log.info("Processing: %s | %s | %s | %s", horario, numero, nome, f"{pdf.stat().st_size / 1024 / 1024:.1f}MB")

        if args.dry_run:
            log.info("  [DRY RUN] Would analyze %s", pdf.name)
            results.append({"processo": numero, "assistido": nome, "status": "dry_run"})
            continue

        # 1. Call Claude with PDF
        try:
            report_text = call_anthropic_with_pdf(
                pdf, nome, numero, tipo_aud, data_aud, horario,
            )
        except Exception as e:
            log.error("  Claude API failed: %s", e)
            results.append({"processo": numero, "assistido": nome, "status": "api_error", "error": str(e)[:200]})
            continue

        # 2. Extract JSON metadata
        metadata = parse_json_from_response(report_text)
        log.info("  Metadata: tipo=%s, tese=%s",
                 metadata.get("tipo_processo", "?"),
                 metadata.get("tese_principal", "?")[:60])

        # 3. Save report locally
        local_report = pdf_dir / f"_analise_vvd_{numero.replace('.', '-')}.md"
        local_report.write_text(report_text, encoding="utf-8")
        log.info("  Saved local: %s", local_report.name)

        local_json = pdf_dir / f"_analise_ia_{numero.replace('.', '-')}.json"
        analysis_data = {
            "schema_version": 2,
            "tipo": "vvd",
            "assistido": nome,
            "processo": numero,
            "audiencia_data": data_aud,
            "audiencia_horario": horario,
            "audiencia_tipo": tipo_aud,
            "analyzed_at": datetime.now().isoformat(),
            "source": "batch_vvd_audiencia",
            "model": CLAUDE_MODEL,
            **metadata,
        }
        local_json.write_text(json.dumps(analysis_data, ensure_ascii=False, indent=2), encoding="utf-8")

        # 4. Upload to Drive
        if folder_id:
            try:
                token = get_access_token()
                date_slug = datetime.now().strftime("%Y-%m-%d")
                report_name = f"_analise_vvd_{date_slug}.md"
                dr = drive_create_or_update_file(folder_id, report_name, report_text, "text/markdown", token)
                if dr:
                    log.info("  Drive: uploaded %s", report_name)

                json_name = f"_analise_ia_{date_slug}.json"
                dj = drive_create_or_update_file(folder_id, json_name,
                                                  json.dumps(analysis_data, ensure_ascii=False, indent=2),
                                                  "application/json", token)
                if dj:
                    log.info("  Drive: uploaded %s", json_name)
            except Exception as e:
                log.error("  Drive upload failed: %s", e)
        else:
            log.warning("  No drive_folder_id — skipping Drive upload")

        # 5. Update OMBUDS
        try:
            # 5a. processos.analysis_data — promove chaves ricas ao topo (consumidas
            # pelo event-detail-sheet e tab-briefing) e mantém backup aninhado.
            existing_ad = aud.get("analysis_data") or {}
            if isinstance(existing_ad, str):
                existing_ad = json.loads(existing_ad)
            # Chaves ricas do schema v2 que o frontend consome no topo
            rich_keys = (
                "resumo_executivo", "narrativa_denuncia", "imputacao",
                "crimes_imputados", "tipo_processo", "medidas_protetivas_vigentes",
                "versao_delegacia",
                "laudos", "vulnerabilidades_acusacao",
                "testemunhas_acusacao", "testemunhas_defesa",
                "contradicoes", "pendencias_diligencia_pre_aij",
                "teses_defesa",
                "tese_principal", "viabilidade_tese_principal", "teses_subsidiarias",
                "riscos_principais", "urgencias", "prescricao",
                "dinamica_relacional", "historico_violencia",
            )
            for k in rich_keys:
                if k in metadata and metadata[k] not in (None, "", []):
                    existing_ad[k] = metadata[k]
            existing_ad["vvd_analise_audiencia"] = analysis_data
            existing_ad["vvd_analyzed_at"] = datetime.now().isoformat()

            ok = supabase_update("processos", pid, {
                "analysis_data": existing_ad,
                "analysis_status": "completed",
                "analyzed_at": datetime.now().isoformat(),
                "classe_processual": metadata.get("tipo_processo") or aud.get("classe_processual"),
            })
            if ok:
                log.info("  OMBUDS: processos.analysis_data updated (id=%d)", pid)

            # 5b. audiencias.resumo_defesa (header do sheet) + registro_audiencia.depoentes
            # (modal "Registro de Audiência" pré-hidratado). Só escreve se estiver vazio —
            # respeita edições manuais do defensor.
            aud_id = aud["audiencia_id"]
            aud_update: dict = {}

            existing_resumo = aud.get("resumo_defesa")
            if not existing_resumo:
                resumo_exec = (metadata.get("resumo_executivo") or "").strip()
                tese_p = (metadata.get("tese_principal") or "").strip()
                resumo_defesa_txt = (resumo_exec + ("\n\n" + tese_p if tese_p else "")).strip() or tese_p
                if resumo_defesa_txt:
                    aud_update["resumo_defesa"] = resumo_defesa_txt[:4000]

            existing_registro = aud.get("registro_audiencia") or {}
            if isinstance(existing_registro, str):
                try:
                    existing_registro = json.loads(existing_registro)
                except Exception:
                    existing_registro = {}
            has_depoentes = bool((existing_registro or {}).get("depoentes"))
            if not has_depoentes:
                depoentes_hidratados = _hidratar_depoentes(
                    metadata.get("testemunhas_acusacao") or [],
                    metadata.get("testemunhas_defesa") or [],
                )
                if depoentes_hidratados:
                    existing_registro = dict(existing_registro or {})
                    existing_registro["depoentes"] = depoentes_hidratados
                    # jsonb column — passar o dict direto (httpx serializa para JSON)
                    aud_update["registro_audiencia"] = existing_registro

            if aud_update:
                if supabase_update("audiencias", aud_id, aud_update):
                    campos = ", ".join(aud_update.keys())
                    log.info("  OMBUDS: audiencias updated (id=%d, %s)", aud_id, campos)

            # Insert analises_cowork record
            ac = supabase_insert("analises_cowork", {
                "processo_id": pid,
                "assistido_id": aud.get("assistido_id"),
                "audiencia_id": aud["audiencia_id"],
                "tipo": "vvd_analise_audiencia",
                "schema_version": 2,
                "resumo_fato": metadata.get("historico_violencia", "")[:2000],
                "tese_defesa": metadata.get("tese_principal", "")[:2000],
                "estrategia_atual": json.dumps(metadata.get("teses_subsidiarias", []), ensure_ascii=False)[:2000],
                "crime_principal": ", ".join(metadata.get("crimes_imputados", []))[:500],
                "pontos_criticos": json.dumps(metadata.get("riscos_principais", []), ensure_ascii=False)[:2000],
                "payload": json.dumps(analysis_data, ensure_ascii=False),
                "fonte_arquivo": f"batch_vvd_audiencia/{CLAUDE_MODEL}",
                "created_at": datetime.now().isoformat(),
            })
            if ac:
                log.info("  OMBUDS: analises_cowork inserted (id=%s)", ac.get("id", "?"))
        except Exception as e:
            log.error("  OMBUDS update failed: %s", e)

        results.append({
            "processo": numero,
            "assistido": nome,
            "horario": horario,
            "status": "completed",
            "tipo_processo": metadata.get("tipo_processo"),
            "crimes": metadata.get("crimes_imputados"),
            "tese_principal": metadata.get("tese_principal"),
        })

    # Summary
    log.info("=" * 60)
    log.info("SUMMARY: %d processed", len(results))
    for r in results:
        log.info("  %s | %s | %s | %s",
                 r.get("horario", "?"), r["processo"][:25],
                 r["assistido"][:25], r["status"])

    report_path = pdf_dir / f"batch_vvd_report_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
    report_path.write_text(json.dumps(results, ensure_ascii=False, indent=2))
    log.info("Report: %s", report_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
