#!/usr/bin/env python3
"""
Re-extract JSON estruturado a partir de um MD já gerado (quando a resposta anterior truncou o JSON).
Envia apenas o MD como contexto — muito mais rápido que reprocessar o PDF.

Uso:
  python3 scripts/extract_json_from_md.py --md /caminho/_analise_vvd_XYZ.md --processo-id 194
"""
import argparse, json, re, sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from batch_vvd_audiencia import (
    ENV, SUPABASE_URL, CLAUDE_MODEL, log,
    parse_json_from_response, drive_create_or_update_file,
    get_access_token, supabase_update, supabase_insert, _hidratar_depoentes,
)
import httpx


EXTRACT_PROMPT = """Leia o Dossiê Estratégico de Defesa abaixo e extraia os dados estruturados no schema v2 EXATAMENTE como definido. Retorne APENAS o bloco JSON entre ```json```, sem narrativa antes ou depois.

Schema (todos os campos obrigatórios — use [] / "" / null quando não aplicável):
{{
  "resumo_executivo": "3 parágrafos",
  "narrativa_denuncia": "síntese",
  "imputacao": "crimes em 1 frase",
  "crimes_imputados": ["art. X"],
  "tipo_processo": "MPU|Ação Penal|Queixa-Crime",
  "medidas_protetivas_vigentes": [],
  "versao_delegacia": "",
  "laudos": [{{"nome":"", "detalhes":""}}],
  "vulnerabilidades_acusacao": [],
  "testemunhas_acusacao": [
    {{
      "nome": "", "vinculo": "",
      "jaOuvido": "nenhum|delegacia|juizo-anterior|ambos",
      "statusIntimacao": "intimado-pessoalmente|intimado-advogado|intimado-edital|sem-diligencia|frustrada-nao-localizado|frustrada-endereco-incorreto|frustrada-mudou|frustrada|dispensado|mp-desistiu|pendente",
      "teorCertidao": "texto literal da certidão quando frustrada",
      "dataCertidao": "YYYY-MM-DD",
      "resumo": "", "pontosFavoraveis": "", "pontosDesfavoraveis": "",
      "perguntasSugeridas": "", "credibilidade": "Alta|Média|Baixa"
    }}
  ],
  "testemunhas_defesa": [],
  "contradicoes": [{{"descricao":"","favoravel":true}}],
  "pendencias_diligencia_pre_aij": [],
  "teses_defesa": [{{"tese":"","viabilidade":"alta|media|baixa","fundamento":""}}],
  "tese_principal": "",
  "viabilidade_tese_principal": "Alta|Média|Baixa",
  "teses_subsidiarias": [],
  "riscos_principais": [],
  "urgencias": [],
  "prescricao": {{"risco": false, "detalhes": ""}},
  "dinamica_relacional": "",
  "historico_violencia": ""
}}

=== DOSSIÊ ===
{md_content}
=== FIM ===

Retorne APENAS o JSON."""


def call_anthropic_text(prompt: str) -> str:
    resp = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ENV["ANTHROPIC_API_KEY"],
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": CLAUDE_MODEL,
            "max_tokens": 16384,
            "temperature": 0.1,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=900,
    )
    resp.raise_for_status()
    data = resp.json()
    log.info("  tokens: in=%d out=%d", data.get("usage",{}).get("input_tokens",0), data.get("usage",{}).get("output_tokens",0))
    return data["content"][0]["text"]


def fetch_processo(pid: int) -> dict:
    r = httpx.get(
        f"{SUPABASE_URL}/rest/v1/processos?id=eq.{pid}&select=id,numero_autos,drive_folder_id,assistido_id,analysis_data,atribuicao,assistidos(nome)",
        headers={"apikey": ENV["SUPABASE_SERVICE_ROLE_KEY"], "Authorization": f"Bearer {ENV['SUPABASE_SERVICE_ROLE_KEY']}"},
        timeout=15,
    )
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else {}


def fetch_audiencia_for_processo(pid: int, date_str: str) -> dict:
    r = httpx.get(
        f"{SUPABASE_URL}/rest/v1/audiencias?processo_id=eq.{pid}&data_audiencia=gte.{date_str}T00:00:00&data_audiencia=lt.{date_str}T23:59:59&select=id,horario,registro_audiencia",
        headers={"apikey": ENV["SUPABASE_SERVICE_ROLE_KEY"], "Authorization": f"Bearer {ENV['SUPABASE_SERVICE_ROLE_KEY']}"},
        timeout=15,
    )
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else {}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--md", required=True)
    parser.add_argument("--processo-id", type=int, required=True)
    parser.add_argument("--data", default=datetime.now().strftime("%Y-%m-%d"))
    args = parser.parse_args()

    md = Path(args.md).read_text(encoding="utf-8")
    # Remove the truncated JSON tail to avoid confusing the model
    md_clean = re.sub(r"```json[\s\S]*$", "", md).strip()
    log.info("MD size: %d chars (cleaned %d)", len(md), len(md_clean))

    proc = fetch_processo(args.processo_id)
    if not proc:
        log.error("Processo %d not found", args.processo_id); return 1
    nome = (proc.get("assistidos") or {}).get("nome") or "Desconhecido"
    numero = proc["numero_autos"]
    folder_id = proc.get("drive_folder_id")
    log.info("Extract for: %s | %s", numero, nome)

    text = call_anthropic_text(EXTRACT_PROMPT.format(md_content=md_clean))
    metadata = parse_json_from_response(text)
    log.info("  Metadata: tipo=%s, testemunhas=%d/%d",
             metadata.get("tipo_processo", "?"),
             len(metadata.get("testemunhas_acusacao") or []),
             len(metadata.get("testemunhas_defesa") or []))

    pdf_dir = Path(args.md).parent
    date_slug = datetime.now().strftime("%Y-%m-%d")
    analysis_data = {
        "schema_version": 2, "tipo": "vvd",
        "assistido": nome, "processo": numero,
        "audiencia_data": args.data,
        "analyzed_at": datetime.now().isoformat(),
        "source": "extract_json_from_md", "model": CLAUDE_MODEL,
        **metadata,
    }
    local_json = pdf_dir / f"_analise_ia_{date_slug}_{numero.replace('.', '-')}.json"
    local_json.write_text(json.dumps(analysis_data, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info("  Saved: %s", local_json.name)

    if folder_id:
        token = get_access_token()
        drive_create_or_update_file(folder_id, f"_analise_ia_{date_slug}.json",
                                     json.dumps(analysis_data, ensure_ascii=False, indent=2),
                                     "application/json", token)
        log.info("  Drive: json uploaded")

    # Update processos (dict direto, NÃO json.dumps)
    existing_ad = proc.get("analysis_data") or {}
    if isinstance(existing_ad, str):
        try: existing_ad = json.loads(existing_ad)
        except: existing_ad = {}
    rich_keys = (
        "resumo_executivo","narrativa_denuncia","imputacao","crimes_imputados","tipo_processo",
        "medidas_protetivas_vigentes","versao_delegacia","laudos","vulnerabilidades_acusacao",
        "testemunhas_acusacao","testemunhas_defesa","contradicoes","pendencias_diligencia_pre_aij",
        "teses_defesa","tese_principal","viabilidade_tese_principal","teses_subsidiarias",
        "riscos_principais","urgencias","prescricao","dinamica_relacional","historico_violencia",
    )
    for k in rich_keys:
        if k in metadata and metadata[k] not in (None, "", []):
            existing_ad[k] = metadata[k]
    existing_ad["vvd_analise_audiencia"] = analysis_data
    existing_ad["vvd_analyzed_at"] = datetime.now().isoformat()

    supabase_update("processos", args.processo_id, {
        "analysis_data": existing_ad,
        "analysis_status": "completed",
        "analyzed_at": datetime.now().isoformat(),
    })
    log.info("  OMBUDS: processos %d updated", args.processo_id)

    # Update audiencia registro_audiencia.depoentes (se houver audiência hoje)
    aud = fetch_audiencia_for_processo(args.processo_id, args.data)
    if aud:
        existing_reg = aud.get("registro_audiencia") or {}
        if isinstance(existing_reg, str):
            try: existing_reg = json.loads(existing_reg)
            except: existing_reg = {}
        if not (existing_reg or {}).get("depoentes"):
            deps = _hidratar_depoentes(
                metadata.get("testemunhas_acusacao") or [],
                metadata.get("testemunhas_defesa") or [],
            )
            if deps:
                existing_reg["depoentes"] = deps
                supabase_update("audiencias", aud["id"], {"registro_audiencia": existing_reg})
                log.info("  OMBUDS: audiencias %d registro_audiencia updated (%d deps)", aud["id"], len(deps))

    # analises_cowork
    supabase_insert("analises_cowork", {
        "processo_id": args.processo_id,
        "assistido_id": proc.get("assistido_id"),
        "audiencia_id": (aud or {}).get("id"),
        "tipo": "vvd_analise_audiencia",
        "schema_version": 2,
        "resumo_fato": (metadata.get("historico_violencia") or "")[:2000],
        "tese_defesa": (metadata.get("tese_principal") or "")[:2000],
        "estrategia_atual": json.dumps(metadata.get("teses_subsidiarias") or [], ensure_ascii=False)[:2000],
        "crime_principal": ", ".join(metadata.get("crimes_imputados") or [])[:500],
        "pontos_criticos": json.dumps(metadata.get("riscos_principais") or [], ensure_ascii=False)[:2000],
        "payload": json.dumps(analysis_data, ensure_ascii=False),
        "fonte_arquivo": f"extract_json_from_md/{CLAUDE_MODEL}",
        "created_at": datetime.now().isoformat(),
    })
    log.info("DONE")
    return 0


if __name__ == "__main__":
    sys.exit(main())
