#!/usr/bin/env python3
"""
Batch Cowork — Relatório do Júri
Gera briefings, analisa via Gemini (prompt master de júri) e salva no Drive.

Fluxo por processo:
  1. Gera briefing markdown (dados do banco)
  2. Lista arquivos na pasta Drive do processo
  3. Chama Gemini com PROMPT_JURI_MASTER
  4. Salva _analise_ia.json + _relatorio_juri.md na pasta do assistido no Drive
  5. Atualiza processos.analysis_data no banco

Uso:
  python3 scripts/batch_juri_cowork.py [--dry-run] [--limit N] [--processo-id ID]
"""

import argparse
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
# google.generativeai não é mais usado — agora usa Claude Sonnet via Anthropic API

# ==========================================
# CONFIG
# ==========================================

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
ENV_FILE = PROJECT_DIR / ".env.local"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("batch-juri")

# ==========================================
# ENV LOADER
# ==========================================

def load_env(path: Path) -> dict[str, str]:
    """Carrega .env.local como dict."""
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
GOOGLE_CLIENT_ID = ENV["GOOGLE_CLIENT_ID"]
GOOGLE_CLIENT_SECRET = ENV["GOOGLE_CLIENT_SECRET"]
GOOGLE_REFRESH_TOKEN = ENV["GOOGLE_REFRESH_TOKEN"]
ANTHROPIC_API_KEY = ENV["ANTHROPIC_API_KEY"]
CLAUDE_MODEL = "claude-sonnet-4-6"  # Mesmo modelo do enrichment-engine
DRIVE_ROOT_JURI = ENV.get("GOOGLE_DRIVE_ROOT_FOLDER_ID", "1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-")

# ==========================================
# GOOGLE AUTH
# ==========================================

_access_token_cache: dict[str, Any] = {}

def get_access_token() -> str:
    """Refresh Google OAuth token."""
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

# ==========================================
# SUPABASE CLIENT
# ==========================================

def supabase_query(query: str) -> list[dict]:
    """Executa query via Supabase REST RPC."""
    resp = httpx.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        },
        json={"query": query},
        timeout=30,
    )
    if resp.status_code != 200:
        # Fallback: usar endpoint direto do postgres
        return supabase_query_direct(query)
    return resp.json()


def supabase_query_direct(query: str) -> list[dict]:
    """Executa query via psycopg2 direto (fallback)."""
    import urllib.parse
    db_url = ENV["DATABASE_URL"]

    # Parse connection string
    try:
        import psycopg2
    except ImportError:
        # Use httpx com Supabase REST API
        return supabase_rest_query(query)

    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute(query)
            if cur.description:
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, row)) for row in cur.fetchall()]
            return []
    finally:
        conn.close()


def supabase_rest_query(query: str) -> list[dict]:
    """Executa via Supabase REST API (select simples)."""
    # Para queries complexas, usar o endpoint PostgREST rpc
    resp = httpx.post(
        f"{SUPABASE_URL}/rest/v1/rpc/",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        json={"query": query},
        timeout=30,
    )
    return resp.json() if resp.status_code == 200 else []


def supabase_update(table: str, row_id: int, data: dict) -> bool:
    """Atualiza registro via Supabase REST."""
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


# ==========================================
# GOOGLE DRIVE
# ==========================================

def drive_find_folder_by_name(name: str, parent_id: str, token: str) -> Optional[str]:
    """Busca pasta por nome dentro de um parent. Retorna folder_id ou None."""
    resp = httpx.get(
        "https://www.googleapis.com/drive/v3/files",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "q": f"'{parent_id}' in parents and name = '{name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            "fields": "files(id,name)",
            "pageSize": 1,
        },
        timeout=10,
    )
    if resp.status_code == 200:
        files = resp.json().get("files", [])
        if files:
            return files[0]["id"]
    return None


def drive_resolve_folder(assistido_nome: str, stored_folder_id: Optional[str], token: str) -> Optional[str]:
    """Resolve folder_id real: tenta o armazenado, senão busca por nome."""
    # Tenta o folder armazenado
    if stored_folder_id:
        resp = httpx.get(
            f"https://www.googleapis.com/drive/v3/files/{stored_folder_id}",
            headers={"Authorization": f"Bearer {token}"},
            params={"fields": "id,name", "supportsAllDrives": "true"},
            timeout=10,
        )
        if resp.status_code == 200:
            return stored_folder_id

    # Busca por nome na pasta raiz do Júri
    found = drive_find_folder_by_name(assistido_nome, DRIVE_ROOT_JURI, token)
    if found:
        log.info("  🔍 Pasta encontrada por nome: %s → %s", assistido_nome, found)
        return found

    # Tenta busca parcial (primeiro + último nome)
    parts = assistido_nome.split()
    if len(parts) >= 2:
        # Busca ampla
        resp = httpx.get(
            "https://www.googleapis.com/drive/v3/files",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "q": f"'{DRIVE_ROOT_JURI}' in parents and name contains '{parts[0]}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
                "fields": "files(id,name)",
                "pageSize": 10,
            },
            timeout=10,
        )
        if resp.status_code == 200:
            for f in resp.json().get("files", []):
                if parts[-1].lower() in f["name"].lower():
                    log.info("  🔍 Pasta encontrada (parcial): %s → %s", f["name"], f["id"])
                    return f["id"]

    return None


def drive_list_files(folder_id: str, token: str) -> list[dict]:
    """Lista arquivos numa pasta do Drive."""
    files = []
    page_token = None
    while True:
        params = {
            "q": f"'{folder_id}' in parents and trashed = false",
            "fields": "nextPageToken, files(id, name, mimeType, size)",
            "pageSize": 100,
        }
        if page_token:
            params["pageToken"] = page_token

        resp = httpx.get(
            "https://www.googleapis.com/drive/v3/files",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        files.extend(data.get("files", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return files


def drive_download_text(file_id: str, mime_type: str, token: str) -> Optional[str]:
    """Baixa conteúdo de texto de um arquivo Drive."""
    if mime_type and "google-apps" in mime_type:
        # Google Docs → export como texto
        resp = httpx.get(
            f"https://www.googleapis.com/drive/v3/files/{file_id}/export",
            headers={"Authorization": f"Bearer {token}"},
            params={"mimeType": "text/plain"},
            timeout=30,
        )
    else:
        resp = httpx.get(
            f"https://www.googleapis.com/drive/v3/files/{file_id}",
            headers={"Authorization": f"Bearer {token}"},
            params={"alt": "media"},
            timeout=30,
        )

    if resp.status_code != 200:
        return None

    # Tentar decodificar como texto
    try:
        return resp.text
    except Exception:
        return None


def drive_create_or_update_file(
    folder_id: str, filename: str, content: str, mime_type: str, token: str
) -> Optional[dict]:
    """Cria ou atualiza arquivo no Drive."""
    # Verificar se já existe
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
        # Update
        file_id = existing[0]["id"]
        resp = httpx.patch(
            f"https://www.googleapis.com/upload/drive/v3/files/{file_id}",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": mime_type,
            },
            params={"uploadType": "media"},
            content=content.encode("utf-8"),
            timeout=30,
        )
    else:
        # Create (multipart)
        import io
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

# ==========================================
# PROMPT MESTRE DE JÚRI (copiado do juri_agent.py)
# ==========================================

PROMPT_JURI_MASTER = """
Você é um assistente jurídico altamente especializado em Defesa Criminal para o Tribunal do Júri. Sua função é analisar documentos processuais e gerar análises estratégicas completas.

DOCUMENTO PARA ANÁLISE:
{content}

Analise o documento e gere um relatório estruturado seguindo TODOS os módulos abaixo:

---

## MÓDULO 0: RADAR DE LIBERDADE

Analise a situação de custódia do assistido:
- Status atual: PRESO / SOLTO / MONITORADO
- Se preso: unidade prisional, data da prisão, tipo de prisão (preventiva, temporária, flagrante)
- Fundamentos da prisão (se houver decisão nos autos)
- Possibilidades de liberdade: HC, relaxamento, revogação
- Urgência: CRÍTICA / ALTA / MÉDIA / BAIXA

---

## MÓDULO 1: SANEAMENTO

Identifique obstáculos formais à defesa:
- Citação válida?
- Defensor constituído/nomeado?
- Prazo de resposta à acusação respeitado?
- Testemunhas arroladas corretamente?
- Documentos juntados?
- Pendências a sanar

---

## MÓDULO 2: AUTÓPSIA DO INQUÉRITO

Analise vícios do inquérito policial:
- Nulidades identificadas (lista com fundamento legal)
- Provas ilícitas (origem e teoria dos frutos)
- Cadeia de custódia quebrada?
- Reconhecimentos irregulares?
- Confissão sob coação?
- Recomendações de requerimentos

---

## MÓDULO 3: ENGENHARIA FORENSE

Analise as perícias e laudos:
- Laudos presentes nos autos (lista)
- Qualidade técnica de cada laudo
- Contradições entre laudos
- Perícias não realizadas que deveriam ter sido
- Quesitos complementares a formular

---

## MÓDULO 4: OSINT (Investigação Defensiva)

Sugira linhas de investigação:
- Testemunhas não ouvidas
- Locais a vistoriar
- Câmeras de segurança
- Registros de celular/ERBs
- Redes sociais das partes

---

## MÓDULO 5: MATRIZ DE GUERRA

Compare versões sobre fatos controversos:

Para cada FATO CONTROVERSO, apresente:
| Fato | Versão Acusação | Versão Defesa | Prova Acusação | Prova Defesa | Contradições |

Identifique:
- Pontos fortes da acusação
- Pontos fracos da acusação
- Contradições entre testemunhas
- Lacunas probatórias

---

## MÓDULO 6: ESTRATÉGIA DA DEFESA

### 6.1 Tese Principal
- Qual a melhor tese? (negativa de autoria, legítima defesa, etc.)
- Fundamento fático
- Fundamento jurídico

### 6.2 Teses Subsidiárias
- Lista ordenada por preferência
- Quando usar cada uma

### 6.3 Desclassificação
- Possível desclassificar para crime não doloso?
- Para qual crime?
- Fundamentos

### 6.4 Quesitos Sugeridos
- Quesitos de defesa a formular
- Estratégia de votação

---

## FORMATO DE SAÍDA

Retorne um JSON estruturado:

{{
    "radar_liberdade": {{
        "status": "PRESO/SOLTO/MONITORADO",
        "detalhes": "...",
        "urgencia": "CRITICA/ALTA/MEDIA/BAIXA",
        "acoes_sugeridas": ["ação 1", "ação 2"]
    }},
    "saneamento": {{
        "pendencias": ["pendência 1"],
        "status": "OK/PENDENTE/CRITICO"
    }},
    "nulidades": [
        {{"tipo": "...", "fundamento": "...", "consequencia": "..."}}
    ],
    "laudos": {{
        "presentes": ["laudo 1"],
        "ausentes": ["perícia não feita"],
        "quesitos": ["quesito 1"]
    }},
    "osint": {{
        "linhas_investigacao": ["linha 1"],
        "testemunhas_sugeridas": ["pessoa 1"],
        "provas_buscar": ["prova 1"]
    }},
    "matriz": [
        {{
            "fato": "...",
            "versao_acusacao": "...",
            "versao_defesa": "...",
            "contradicoes": ["..."]
        }}
    ],
    "tese": {{
        "principal": "...",
        "fundamento_fatico": "...",
        "fundamento_juridico": "..."
    }},
    "subsidiarias": ["tese 2", "tese 3"],
    "desclassificacao": {{
        "possivel": true,
        "para_crime": "...",
        "fundamento": "..."
    }},
    "quesitos": ["quesito 1", "quesito 2"]
}}

IMPORTANTE:
- Seja específico e prático
- Cite artigos de lei quando relevante
- Identifique todas as nulidades possíveis
- Foque em estratégia defensiva
- Retorne APENAS o JSON
"""

# ==========================================
# GEMINI ANALYSIS
# ==========================================

def _call_anthropic(model: str, system: str, user: str, max_tokens: int = 8192, temperature: float = 0.2) -> str:
    """Chama API Anthropic e retorna texto da resposta."""
    resp = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        },
        timeout=600,
    )
    resp.raise_for_status()
    return resp.json()["content"][0]["text"]


def _parse_json(text: str) -> dict:
    """Extrai e parseia JSON de resposta LLM."""
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if json_match:
        text = json_match.group(1)
    else:
        bs = text.find("{")
        be = text.rfind("}")
        if bs != -1 and be > bs:
            text = text[bs:be + 1]
    cleaned = text.strip()
    cleaned = re.sub(r',\s*}', '}', cleaned)
    cleaned = re.sub(r',\s*]', ']', cleaned)
    cleaned = re.sub(r'[\x00-\x1f]', ' ', cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Tentar fechar JSON truncado
        error_pos = e.pos if hasattr(e, 'pos') else len(cleaned) // 2
        partial = cleaned[:error_pos].rstrip(', \n\t')
        ob = partial.count('{') - partial.count('}')
        oq = partial.count('[') - partial.count(']')
        partial += ']' * oq + '}' * ob
        return json.loads(partial)


# ==========================================
# CAMADA 2: Extração precisa (Haiku 4.5)
# ==========================================

EXTRACTION_SYSTEM = """Você é um extrator de dados jurídicos de alta precisão. Extraia TODOS os dados factuais do documento processual.
REGRAS:
- Extraia APENAS o que está escrito. NUNCA invente.
- Nomes devem ser EXATOS como aparecem no documento.
- Datas no formato YYYY-MM-DD quando possível.
- Artigos de lei com número e parágrafos/incisos completos.
- Se um campo não tem dados, use null ou array vazio.
Retorne APENAS JSON válido."""

EXTRACTION_PROMPT = """PROCESSO: {numero_autos}
ASSISTIDO: {assistido_nome}

DOCUMENTO:
{content}

---

Extraia todos os dados estruturados:

{{
  "pessoas": [
    {{"nome": "Nome Completo", "tipo": "REU|VITIMA|TESTEMUNHA|POLICIAL|PERITO|FAMILIAR|JUIZ|PROMOTOR|OUTRO", "papel": "descrição curta", "preso": true/false/null}}
  ],
  "cronologia": [
    {{"data": "YYYY-MM-DD ou descrição", "evento": "o que aconteceu", "fonte": "de onde veio (doc, depoimento, etc)"}}
  ],
  "acusacoes": [
    {{"crime": "tipo penal", "artigos": ["art. 121, §2º, I, CP"], "qualificadoras": ["motivo torpe"], "vitima": "nome"}}
  ],
  "nulidades": [
    {{"tipo": "nome da nulidade", "descricao": "vício encontrado", "severidade": "alta|media|baixa", "fundamentacao": "art. X CPP"}}
  ],
  "depoimentos": [
    {{"nome": "quem depôs", "tipo": "testemunha|vitima|reu|policial|perito", "resumo": "principais pontos", "favoravel_defesa": true/false, "contradicoes": ["contradição se houver"]}}
  ],
  "laudos": {{
    "presentes": ["laudo 1 com descrição"],
    "ausentes": ["perícia que deveria existir"],
    "problemas": ["defeito técnico encontrado"]
  }},
  "radar_liberdade": {{
    "status": "PRESO|SOLTO|MONITORADO",
    "detalhes": "tipo de prisão, data, unidade",
    "urgencia": "CRITICA|ALTA|MEDIA|BAIXA"
  }},
  "saneamento": {{
    "pendencias": ["pendência processual"],
    "status": "OK|PENDENTE|CRITICO"
  }},
  "resumo_fatos": "Resumo factual em 3-5 frases do que aconteceu segundo os autos.",
  "inconsistencias": ["contradição entre depoimentos ou documentos"]
}}"""


# ==========================================
# CAMADA 3: Análise estratégica (Sonnet — seletivo)
# ==========================================

STRATEGY_SYSTEM = """Você é o estrategista criminal sênior da Defensoria Pública da Bahia, especializado em Tribunal do Júri.
Com base nos DADOS EXTRAÍDOS do processo, elabore a estratégia de defesa.
Seja PRÁTICO e ESPECÍFICO. Cite artigos de lei e jurisprudência."""

STRATEGY_PROMPT = """ASSISTIDO: {assistido_nome}
PROCESSO: {numero_autos}

DADOS EXTRAÍDOS:
{extracted_json}

---

Elabore a estratégia de defesa:

{{
  "teses": {{
    "principal": "Tese principal com fundamento",
    "fundamento_fatico": "Base nos fatos extraídos",
    "fundamento_juridico": "Base legal com artigos",
    "subsidiarias": [
      {{"tese": "Tese alternativa", "quando_usar": "cenário"}}
    ],
    "desclassificacao": {{
      "possivel": true/false,
      "para_crime": "crime menos grave",
      "fundamento": "razão"
    }},
    "quesitos_sugeridos": ["quesito de defesa"]
  }},
  "matriz_guerra": [
    {{
      "fato": "Fato controverso",
      "versao_acusacao": "O que sustenta a acusação",
      "versao_defesa": "O que a defesa pode sustentar",
      "contradicoes": ["vulnerabilidade da acusação"]
    }}
  ],
  "osint": {{
    "linhas_investigacao": ["diligência a fazer"],
    "testemunhas_sugeridas": ["pessoa a arrolar"],
    "provas_buscar": ["prova a requisitar"]
  }},
  "recomendacoes": ["ação concreta para o defensor"],
  "achados_chave": ["ponto crucial para a defesa"]
}}"""


def analyze_with_claude(content: str, assistido_nome: str, numero_autos: str, use_sonnet: bool = False) -> dict:
    """Pipeline em 3 camadas: Haiku extrai dados, Sonnet (opcional) analisa estratégia."""

    # Limitar conteúdo
    if len(content) > 120000:
        log.info("  📏 Conteúdo truncado: %d → 120000 chars", len(content))
        content = content[:120000] + "\n\n[... conteúdo truncado ...]"

    # ─── CAMADA 2: Extração precisa com Haiku ───
    log.info("  📋 Camada 2: Extração de dados (Haiku 4.5)...")
    extraction_prompt = EXTRACTION_PROMPT.format(
        numero_autos=numero_autos,
        assistido_nome=assistido_nome,
        content=content,
    )
    extraction_text = _call_anthropic(
        model="claude-haiku-4-5-20251001",
        system=EXTRACTION_SYSTEM,
        user=extraction_prompt,
        max_tokens=12000,
        temperature=0.1,
    )
    extraction = _parse_json(extraction_text)
    log.info("  ✅ Extração: %d pessoas, %d eventos, %d nulidades",
             len(extraction.get("pessoas", [])),
             len(extraction.get("cronologia", [])),
             len(extraction.get("nulidades", [])))

    # ─── CAMADA 3: Estratégia com Sonnet (se solicitado) ───
    strategy = {}
    if use_sonnet:
        log.info("  ⚖️  Camada 3: Análise estratégica (Sonnet 4.6)...")
        extracted_json = json.dumps(extraction, ensure_ascii=False, indent=1)
        # Truncar se muito grande
        if len(extracted_json) > 60000:
            extracted_json = extracted_json[:60000] + "\n..."

        strategy_prompt = STRATEGY_PROMPT.format(
            assistido_nome=assistido_nome,
            numero_autos=numero_autos,
            extracted_json=extracted_json,
        )
        strategy_text = _call_anthropic(
            model=CLAUDE_MODEL,
            system=STRATEGY_SYSTEM,
            user=strategy_prompt,
            max_tokens=8192,
            temperature=0.3,
        )
        strategy = _parse_json(strategy_text)
        log.info("  ✅ Estratégia: tese = %s", strategy.get("teses", {}).get("principal", "N/A"))

    # ─── Combinar resultados ───
    result = extraction.copy()
    if strategy:
        result["teses"] = strategy.get("teses", {})
        result["matriz_guerra"] = strategy.get("matriz_guerra", [])
        result["osint"] = strategy.get("osint", {})
        result["recomendacoes"] = strategy.get("recomendacoes", [])
        result["achados_chave"] = strategy.get("achados_chave", [])
    else:
        # Sem Sonnet: gerar resumo e recomendações básicas a partir da extração
        result["teses"] = {}
        result["matriz_guerra"] = []
        result["osint"] = {}
        result["recomendacoes"] = [f"Analisar {len(extraction.get('nulidades', []))} nulidades identificadas"] if extraction.get("nulidades") else []
        result["achados_chave"] = extraction.get("inconsistencias", [])

    result["resumo"] = extraction.get("resumo_fatos", "")
    return result


# ==========================================
# BRIEFING GENERATOR
# ==========================================

def generate_briefing(proc: dict, demandas: list[dict], files: list[dict]) -> str:
    """Gera briefing markdown de um processo (mesma lógica do exportarParaCowork)."""
    lines = []
    now = datetime.now()
    data_str = now.strftime("%d/%m/%Y")
    hora_str = now.strftime("%H:%M")

    lines.append(f"# Briefing OMBUDS — {proc['assistido_nome']}")
    lines.append(f"> Gerado automaticamente em {data_str} às {hora_str}")
    lines.append(f"> Tipo: Análise para Tribunal do Júri")
    lines.append("")

    # Assistido
    lines.append("## Assistido")
    lines.append(f"- **Nome**: {proc['assistido_nome']}")
    if proc.get("reu_preso"):
        lines.append("- **Status prisional**: PRESO")
    else:
        lines.append("- **Status prisional**: SOLTO")
    lines.append("")

    # Processo
    lines.append("## Processo")
    lines.append(f"- **Número**: {proc['numero_autos']}")
    if proc.get("classe_processual"):
        lines.append(f"- **Classe**: {proc['classe_processual']}")
    if proc.get("assunto"):
        lines.append(f"- **Assunto**: {proc['assunto']}")
    if proc.get("vara"):
        lines.append(f"- **Vara**: {proc['vara']}")
    lines.append(f"- **Área**: JÚRI")
    lines.append("")

    # Demandas
    if demandas:
        lines.append("## Demandas em Análise")
        for d in demandas:
            prazo_str = d.get("prazo") or "sem prazo"
            preso = " [RÉU PRESO]" if d.get("reu_preso") else ""
            lines.append(f"- **{d.get('ato', 'N/A')}** — prazo: {prazo_str}{preso}")
            if d.get("providencias"):
                lines.append(f"  → {d['providencias']}")
        lines.append("")

    # Arquivos no Drive
    if files:
        lines.append("## Arquivos na Pasta do Processo")
        for f in files:
            size_kb = int(f.get("size", 0)) // 1024 if f.get("size") else 0
            lines.append(f"- {f['name']} ({f.get('mimeType', '').split('/')[-1]}, {size_kb}KB)")
        lines.append("")

    # Analysis data existente
    if proc.get("analysis_data"):
        ad = proc["analysis_data"]
        if isinstance(ad, str):
            try:
                ad = json.loads(ad)
            except json.JSONDecodeError:
                ad = {}
        if ad.get("resumo"):
            lines.append("## Análise IA Existente")
            lines.append(ad["resumo"])
            lines.append("")

    lines.append("---")
    lines.append(f"_Briefing gerado pelo OMBUDS Batch Cowork em {data_str} às {hora_str}_")

    return "\n".join(lines)


# ==========================================
# REPORT GENERATOR (human-readable from JSON)
# ==========================================

def generate_report_md(analysis: dict, proc: dict) -> str:
    """Converte a análise JSON em relatório markdown legível."""
    lines = []
    now = datetime.now()

    lines.append(f"# RELATÓRIO DO JÚRI — {proc['assistido_nome']}")
    lines.append(f"**Processo:** {proc['numero_autos']}")
    lines.append(f"**Gerado em:** {now.strftime('%d/%m/%Y às %H:%M')}")
    lines.append(f"**Via:** OMBUDS Batch Cowork (Claude Sonnet 4.6)")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Módulo 0: Radar de Liberdade
    radar = analysis.get("radar_liberdade", {})
    lines.append("## MÓDULO 0: RADAR DE LIBERDADE")
    lines.append(f"- **Status**: {radar.get('status', 'N/A')}")
    lines.append(f"- **Urgência**: {radar.get('urgencia', 'N/A')}")
    if radar.get("detalhes"):
        lines.append(f"- **Detalhes**: {radar['detalhes']}")
    if radar.get("acoes_sugeridas"):
        lines.append("- **Ações sugeridas**:")
        for a in radar["acoes_sugeridas"]:
            lines.append(f"  - {a}")
    lines.append("")

    # Módulo 1: Saneamento
    san = analysis.get("saneamento", {})
    lines.append("## MÓDULO 1: SANEAMENTO")
    lines.append(f"- **Status**: {san.get('status', 'N/A')}")
    if san.get("pendencias"):
        lines.append("- **Pendências**:")
        for p in san["pendencias"]:
            lines.append(f"  - {p}")
    lines.append("")

    # Módulo 2: Nulidades
    nulidades = analysis.get("nulidades", [])
    lines.append("## MÓDULO 2: AUTÓPSIA DO INQUÉRITO")
    if nulidades:
        for n in nulidades:
            lines.append(f"### {n.get('tipo', 'Nulidade')}")
            lines.append(f"- **Fundamento**: {n.get('fundamento', 'N/A')}")
            lines.append(f"- **Consequência**: {n.get('consequencia', 'N/A')}")
            lines.append("")
    else:
        lines.append("_Nenhuma nulidade identificada com os dados disponíveis._")
    lines.append("")

    # Módulo 3: Engenharia Forense
    laudos = analysis.get("laudos", {})
    lines.append("## MÓDULO 3: ENGENHARIA FORENSE")
    if laudos.get("presentes"):
        lines.append("- **Laudos presentes**:")
        for l in laudos["presentes"]:
            lines.append(f"  - {l}")
    if laudos.get("ausentes"):
        lines.append("- **Perícias ausentes**:")
        for l in laudos["ausentes"]:
            lines.append(f"  - ⚠️ {l}")
    if laudos.get("quesitos"):
        lines.append("- **Quesitos sugeridos**:")
        for q in laudos["quesitos"]:
            lines.append(f"  - {q}")
    lines.append("")

    # Módulo 4: OSINT
    osint = analysis.get("osint", {})
    lines.append("## MÓDULO 4: INVESTIGAÇÃO DEFENSIVA (OSINT)")
    if osint.get("linhas_investigacao"):
        lines.append("- **Linhas de investigação**:")
        for l in osint["linhas_investigacao"]:
            lines.append(f"  - {l}")
    if osint.get("testemunhas_sugeridas"):
        lines.append("- **Testemunhas sugeridas**:")
        for t in osint["testemunhas_sugeridas"]:
            lines.append(f"  - {t}")
    if osint.get("provas_buscar"):
        lines.append("- **Provas a buscar**:")
        for p in osint["provas_buscar"]:
            lines.append(f"  - {p}")
    lines.append("")

    # Módulo 5: Matriz de Guerra
    matriz = analysis.get("matriz", [])
    lines.append("## MÓDULO 5: MATRIZ DE GUERRA")
    if matriz:
        lines.append("")
        lines.append("| Fato | Versão Acusação | Versão Defesa | Contradições |")
        lines.append("|------|-----------------|---------------|--------------|")
        for m in matriz:
            fato = m.get("fato", "N/A")
            va = m.get("versao_acusacao", "N/A")
            vd = m.get("versao_defesa", "N/A")
            contra = "; ".join(m.get("contradicoes", []))
            lines.append(f"| {fato} | {va} | {vd} | {contra} |")
    else:
        lines.append("_Dados insuficientes para construir matriz._")
    lines.append("")

    # Módulo 6: Estratégia
    teses = analysis.get("teses", analysis.get("tese", {}))
    lines.append("## MÓDULO 6: ESTRATÉGIA DA DEFESA")
    lines.append("")
    lines.append("### 6.1 Tese Principal")
    lines.append(f"- **Tese**: {teses.get('principal', 'N/A')}")
    lines.append(f"- **Fundamento fático**: {teses.get('fundamento_fatico', 'N/A')}")
    lines.append(f"- **Fundamento jurídico**: {teses.get('fundamento_juridico', 'N/A')}")
    lines.append("")

    subs = teses.get("subsidiarias", analysis.get("subsidiarias", []))
    if subs:
        lines.append("### 6.2 Teses Subsidiárias")
        for i, s in enumerate(subs, 1):
            if isinstance(s, dict):
                lines.append(f"  {i}. **{s.get('tese', '')}** — {s.get('quando_usar', '')}")
            else:
                lines.append(f"  {i}. {s}")
        lines.append("")

    desc = teses.get("desclassificacao", analysis.get("desclassificacao", {}))
    lines.append("### 6.3 Desclassificação")
    lines.append(f"- **Possível**: {'Sim' if desc.get('possivel') else 'Não'}")
    if desc.get("para_crime"):
        lines.append(f"- **Para crime**: {desc['para_crime']}")
    if desc.get("fundamento"):
        lines.append(f"- **Fundamento**: {desc['fundamento']}")
    lines.append("")

    quesitos = teses.get("quesitos_sugeridos", analysis.get("quesitos", []))
    if quesitos:
        lines.append("### 6.4 Quesitos Sugeridos")
        for i, q in enumerate(quesitos, 1):
            lines.append(f"  {i}. {q}")
        lines.append("")

    # Resumo e recomendações (novo, do Claude)
    if analysis.get("resumo"):
        lines.append("## RESUMO ESTRATÉGICO")
        lines.append(analysis["resumo"])
        lines.append("")

    if analysis.get("recomendacoes"):
        lines.append("## RECOMENDAÇÕES AO DEFENSOR")
        for i, r in enumerate(analysis["recomendacoes"], 1):
            lines.append(f"  {i}. {r}")
        lines.append("")

    if analysis.get("achados_chave"):
        lines.append("## ACHADOS-CHAVE")
        for a in analysis["achados_chave"]:
            lines.append(f"- {a}")
        lines.append("")

    lines.append("---")
    lines.append(f"_Relatório gerado automaticamente pelo OMBUDS em {now.strftime('%d/%m/%Y às %H:%M')}_")

    return "\n".join(lines)


# ==========================================
# MAIN
# ==========================================

def fetch_processes() -> list[dict]:
    """Busca processos do júri com status '2 - Analisar' via REST."""
    # Query direta via Supabase REST API (PostgREST)
    # Buscar demandas primeiro
    resp = httpx.get(
        f"{SUPABASE_URL}/rest/v1/demandas",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        params={
            "select": "id,ato,prazo,providencias,reu_preso,substatus,processo_id,assistido_id",
            "substatus": "eq.2 - Analisar",
            "deleted_at": "is.null",
        },
        timeout=30,
    )
    resp.raise_for_status()
    demandas = resp.json()

    if not demandas:
        log.warning("Nenhuma demanda com substatus '2 - Analisar' encontrada")
        return []

    # Agrupar por processo_id
    from collections import defaultdict
    by_processo = defaultdict(list)
    for d in demandas:
        by_processo[d["processo_id"]].append(d)

    processo_ids = list(by_processo.keys())

    # Buscar processos (júri)
    # Fazer em batches para não estourar URL
    all_procs = []
    for i in range(0, len(processo_ids), 50):
        batch = processo_ids[i:i+50]
        ids_str = ",".join(str(x) for x in batch)
        resp = httpx.get(
            f"{SUPABASE_URL}/rest/v1/processos",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
            params={
                "select": "id,numero_autos,classe_processual,assunto,vara,area,is_juri,drive_folder_id,link_drive,analysis_data,analysis_status,assistido_id",
                "id": f"in.({ids_str})",
                "deleted_at": "is.null",
            },
            timeout=30,
        )
        resp.raise_for_status()
        all_procs.extend(resp.json())

    # Filtrar apenas júri
    juri_procs = [p for p in all_procs if p.get("is_juri") or p.get("area") == "JURI"]

    # Buscar assistidos
    assistido_ids = list(set(p["assistido_id"] for p in juri_procs if p.get("assistido_id")))
    assistidos_map = {}
    for i in range(0, len(assistido_ids), 50):
        batch = assistido_ids[i:i+50]
        ids_str = ",".join(str(x) for x in batch)
        resp = httpx.get(
            f"{SUPABASE_URL}/rest/v1/assistidos",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
            params={
                "select": "id,nome,drive_folder_id,status_prisional",
                "id": f"in.({ids_str})",
            },
            timeout=30,
        )
        resp.raise_for_status()
        for a in resp.json():
            assistidos_map[a["id"]] = a

    # Montar resultado
    results = []
    for p in juri_procs:
        assistido = assistidos_map.get(p["assistido_id"], {})
        if not assistido.get("drive_folder_id"):
            log.info("SKIP %s (%s) — sem pasta Drive no assistido", p["numero_autos"], assistido.get("nome", "?"))
            continue

        # Pegar reu_preso de qualquer demanda
        proc_demandas = by_processo.get(p["id"], [])
        reu_preso = any(d.get("reu_preso") for d in proc_demandas)

        results.append({
            "processo_id": p["id"],
            "numero_autos": p["numero_autos"],
            "classe_processual": p.get("classe_processual"),
            "assunto": p.get("assunto"),
            "vara": p.get("vara"),
            "drive_folder_id": p.get("drive_folder_id"),
            "analysis_data": p.get("analysis_data"),
            "assistido_id": p["assistido_id"],
            "assistido_nome": assistido.get("nome", "Desconhecido"),
            "assistido_drive_folder_id": assistido["drive_folder_id"],
            "reu_preso": reu_preso,
            "demandas": proc_demandas,
        })

    # Priorizar réus presos
    results.sort(key=lambda x: (not x["reu_preso"], x["assistido_nome"]))

    return results


def process_one(proc: dict, token: str, args) -> dict:
    """Processa um processo: briefing → análise → salvar."""
    log.info("━━━ %s — %s %s", proc["numero_autos"], proc["assistido_nome"],
             "🔴 PRESO" if proc["reu_preso"] else "")

    result = {
        "processo_id": proc["processo_id"],
        "numero_autos": proc["numero_autos"],
        "assistido": proc["assistido_nome"],
        "status": "pending",
    }

    try:
        # 0. Resolver pasta real no Drive (IDs no banco podem estar desatualizados)
        real_folder = drive_resolve_folder(
            proc["assistido_nome"],
            proc.get("drive_folder_id") or proc.get("assistido_drive_folder_id"),
            token
        )
        if not real_folder:
            log.warning("  ⚠️ Nenhuma pasta encontrada no Drive para %s — pulando", proc["assistido_nome"])
            result["status"] = "no_folder"
            return result

        log.info("  📂 Pasta real: %s", real_folder)

        # 1. Listar arquivos no Drive
        files = []
        try:
            files = drive_list_files(real_folder, token)
            log.info("  📁 %d arquivos na pasta", len(files))
        except Exception as e:
            log.warning("  ⚠️ Erro ao listar pasta: %s", e)

        # Listar subpastas também (processo pode estar numa subpasta)
        subfolders = [f for f in files if f.get("mimeType") == "application/vnd.google-apps.folder"]
        for sf in subfolders:
            try:
                sub_files = drive_list_files(sf["id"], token)
                if sub_files:
                    log.info("  📁 Subpasta '%s': %d arquivos", sf["name"], len(sub_files))
                    seen_ids = set(f["id"] for f in files)
                    for f in sub_files:
                        if f["id"] not in seen_ids:
                            files.append(f)
            except Exception:
                pass

        # 2. Baixar conteúdo de arquivos texto (md, txt, json)
        doc_content = []
        text_mimes = ["text/", "application/json", "application/vnd.google-apps.document"]
        for f in files:
            mime = f.get("mimeType", "")
            name = f.get("name", "")
            if any(m in mime for m in text_mimes) or name.endswith((".md", ".txt", ".json")):
                if name.startswith("_analise_ia") or name.startswith("_briefing"):
                    continue  # Pular análises anteriores
                try:
                    text = drive_download_text(f["id"], mime, token)
                    if text and len(text.strip()) > 50:
                        doc_content.append(f"### Arquivo: {name}\n\n{text}")
                        log.info("  📄 Baixado: %s (%d chars)", name, len(text))
                except Exception as e:
                    log.warning("  ⚠️ Erro ao baixar %s: %s", name, e)

        # 3. Gerar briefing
        briefing = generate_briefing(proc, proc["demandas"], files)

        # 4. Combinar briefing + documentos
        full_content = briefing
        if doc_content:
            full_content += "\n\n---\n\n## Documentos do Processo\n\n" + "\n\n---\n\n".join(doc_content)

        log.info("  📝 Conteúdo total: %d chars", len(full_content))

        if args.dry_run:
            result["status"] = "dry_run"
            result["content_length"] = len(full_content)
            result["files_count"] = len(files)
            return result

        # 5. Usar pasta real resolvida
        target_folder = real_folder
        date_slug = datetime.now().strftime("%Y-%m-%d")

        # Salvar briefing no Drive
        briefing_name = f"_briefing_juri_{date_slug}.md"
        briefing_result = drive_create_or_update_file(
            target_folder, briefing_name, briefing,
            "text/markdown", token
        )
        if briefing_result:
            log.info("  ✅ Briefing salvo: %s", briefing_name)
        else:
            log.warning("  ⚠️ Não conseguiu salvar briefing no Drive (folder %s)", target_folder[:20])

        # 6. Análise — Haiku extrai, Sonnet analisa (só réu preso)
        use_sonnet = args.sonnet_all  # Sonnet só quando explicitamente solicitado
        log.info("  🤖 Analisando... (Haiku%s)", " + Sonnet" if use_sonnet else " only")
        analysis = analyze_with_claude(full_content, proc["assistido_nome"], proc["numero_autos"], use_sonnet=use_sonnet)

        # Adicionar metadados
        analysis["_metadata"] = {
            "schema_version": "1.0",
            "tipo": "juri",
            "gerado_em": datetime.now().isoformat(),
            "assistido": proc["assistido_nome"],
            "processo": proc["numero_autos"],
            "model": CLAUDE_MODEL,
            "source": "batch_juri_cowork",
        }

        tese_principal = analysis.get("teses", {}).get("principal", analysis.get("tese", {}).get("principal", "N/A"))
        log.info("  ✅ Análise concluída — tese: %s", tese_principal)

        # 7. Salvar _analise_ia.json no Drive
        analise_json = json.dumps(analysis, ensure_ascii=False, indent=2)
        r1 = drive_create_or_update_file(
            target_folder, "_analise_ia.json", analise_json,
            "application/json", token
        )
        if r1:
            log.info("  ✅ _analise_ia.json salvo")
        else:
            log.warning("  ⚠️ Falha ao salvar _analise_ia.json")

        # 8. Gerar e salvar relatório legível (.md)
        report_md = generate_report_md(analysis, proc)
        report_name = f"_relatorio_juri_{date_slug}.md"

        r2 = drive_create_or_update_file(
            target_folder, report_name, report_md,
            "text/markdown", token
        )
        if r2:
            log.info("  ✅ Relatório salvo: %s", report_name)
        else:
            log.warning("  ⚠️ Falha ao salvar relatório")

        # Se tem pasta de processo separada, salvar lá também
        if proc.get("drive_folder_id") and proc["drive_folder_id"] != target_folder:
            drive_create_or_update_file(
                proc["drive_folder_id"], report_name, report_md,
                "text/markdown", token
            )
            log.info("  ✅ Relatório copiado para pasta do processo")

        # 9. Atualizar banco — modelo completo compatível com intelligence-consolidation
        teses_obj = analysis.get("teses", {})
        teses_list = [teses_obj.get("principal", "")] if teses_obj.get("principal") else []
        for sub in teses_obj.get("subsidiarias", []):
            if isinstance(sub, dict):
                teses_list.append(sub.get("tese", ""))
            elif isinstance(sub, str):
                teses_list.append(sub)

        nulidades_formatted = []
        for n in analysis.get("nulidades", []):
            nulidades_formatted.append({
                "tipo": n.get("tipo", ""),
                "descricao": n.get("descricao", ""),
                "severidade": n.get("severidade", "media"),
                "fundamentacao": n.get("fundamentacao", ""),
            })

        analysis_data = {
            "resumo": analysis.get("resumo", ""),
            "achadosChave": analysis.get("achados_chave", []),
            "recomendacoes": analysis.get("recomendacoes", []),
            "inconsistencias": analysis.get("inconsistencias", []),
            "teses": teses_list,
            "nulidades": nulidades_formatted,
            "fonte": "batch_juri_cowork",
            "kpis": {
                "totalPessoas": len(analysis.get("pessoas", [])),
                "totalAcusacoes": len(analysis.get("acusacoes", [])),
                "totalDocumentosAnalisados": len(files),
                "totalEventos": len(analysis.get("cronologia", [])),
                "totalNulidades": len(analysis.get("nulidades", [])),
                "totalRelacoes": 0,
            },
            "radarLiberdade": analysis.get("radar_liberdade", {}),
            "matrizGuerra": analysis.get("matriz_guerra", []),
            "laudos": analysis.get("laudos", {}),
            "osint": analysis.get("osint", {}),
            "tesesCompleto": teses_obj,
            "versaoModelo": CLAUDE_MODEL,
            "updatedAt": datetime.now().isoformat(),
        }

        updated = supabase_update("processos", proc["processo_id"], {
            "analysis_data": json.dumps(analysis_data, ensure_ascii=False),
            "analysis_status": "completed",
        })
        if updated:
            log.info("  ✅ processos.analysis_data atualizado")

        # 10. Popular case_facts e case_personas via REST
        # Cronologia → case_facts tipo "evento"
        caso_id = None
        try:
            resp = httpx.get(
                f"{SUPABASE_URL}/rest/v1/casos",
                headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
                params={"processo_id": f"eq.{proc['processo_id']}", "select": "id", "limit": "1"},
                timeout=10,
            )
            casos = resp.json()
            if casos:
                caso_id = casos[0]["id"]
        except Exception:
            pass

        if caso_id:
            facts_to_insert = []
            for ev in analysis.get("cronologia", []):
                facts_to_insert.append({
                    "caso_id": caso_id,
                    "assistido_id": proc["assistido_id"],
                    "titulo": ev.get("evento", ""),
                    "descricao": ev.get("fonte", ""),
                    "tipo": "evento",
                    "fonte": "intelligence",
                    "data_fato": ev.get("data") if ev.get("data") and len(str(ev.get("data", ""))) >= 8 else None,
                })
            for nul in analysis.get("nulidades", []):
                facts_to_insert.append({
                    "caso_id": caso_id,
                    "assistido_id": proc["assistido_id"],
                    "titulo": nul.get("tipo", ""),
                    "descricao": nul.get("descricao", ""),
                    "tipo": "nulidade",
                    "fonte": "intelligence",
                    "severidade": nul.get("severidade"),
                    "tags": [nul.get("fundamentacao", "")],
                })
            for ac in analysis.get("acusacoes", []):
                facts_to_insert.append({
                    "caso_id": caso_id,
                    "assistido_id": proc["assistido_id"],
                    "titulo": ac.get("crime", ""),
                    "descricao": f"Artigos: {', '.join(ac.get('artigos', []))}",
                    "tipo": "acusacao",
                    "fonte": "intelligence",
                    "tags": ac.get("artigos", []),
                })

            if facts_to_insert:
                resp = httpx.post(
                    f"{SUPABASE_URL}/rest/v1/case_facts",
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal",
                    },
                    json=facts_to_insert,
                    timeout=15,
                )
                if resp.status_code in (200, 201):
                    log.info("  ✅ %d case_facts inseridos", len(facts_to_insert))
                else:
                    log.warning("  ⚠️ case_facts insert: %s", resp.status_code)

            # Personas
            personas_to_insert = []
            for p in analysis.get("pessoas", []):
                personas_to_insert.append({
                    "caso_id": caso_id,
                    "assistido_id": proc["assistido_id"],
                    "nome": p.get("nome", ""),
                    "tipo": p.get("tipo", "OUTRO"),
                    "observacoes": p.get("observacoes", p.get("papel", "")),
                    "fonte": "intelligence",
                })

            if personas_to_insert:
                resp = httpx.post(
                    f"{SUPABASE_URL}/rest/v1/case_personas",
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal",
                    },
                    json=personas_to_insert,
                    timeout=15,
                )
                if resp.status_code in (200, 201):
                    log.info("  ✅ %d case_personas inseridos", len(personas_to_insert))
                else:
                    log.warning("  ⚠️ case_personas insert: %s", resp.status_code)
        else:
            log.info("  ℹ️ Sem caso_id — case_facts/personas não inseridos")

        result["status"] = "success"
        result["tese_principal"] = tese_principal
        result["urgencia"] = analysis.get("radar_liberdade", {}).get("urgencia", "N/A")
        result["pessoas"] = len(analysis.get("pessoas", []))
        result["nulidades"] = len(analysis.get("nulidades", []))

    except Exception as e:
        log.error("  ❌ ERRO: %s", str(e), exc_info=True)
        result["status"] = "error"
        result["error"] = str(e)

    return result


def main():
    parser = argparse.ArgumentParser(description="Batch Cowork — Relatório do Júri")
    parser.add_argument("--dry-run", action="store_true", help="Apenas listar, não processar")
    parser.add_argument("--limit", type=int, default=0, help="Limitar a N processos")
    parser.add_argument("--processo-id", type=int, help="Processar apenas um processo")
    parser.add_argument("--presos-primeiro", action="store_true", default=True, help="Priorizar réus presos")
    parser.add_argument("--sonnet-all", action="store_true", help="Usar Sonnet para todos (não só presos)")
    parser.add_argument("--skip-done", action="store_true", help="Pular processos já analisados")
    args = parser.parse_args()

    log.info("=" * 60)
    log.info("BATCH COWORK — RELATÓRIO DO JÚRI")
    log.info("=" * 60)

    # 1. Autenticar no Google
    log.info("🔑 Obtendo token Google...")
    token = get_access_token()
    log.info("✅ Token obtido")

    # 2. Buscar processos
    log.info("🔍 Buscando processos com '2 - Analisar' no Júri...")
    procs = fetch_processes()

    if args.processo_id:
        procs = [p for p in procs if p["processo_id"] == args.processo_id]

    if args.skip_done:
        before = len(procs)
        procs = [p for p in procs if p.get("analysis_data") is None or not p["analysis_data"]]
        log.info("⏭️  Skip done: %d → %d processos", before, len(procs))

    if args.limit:
        procs = procs[:args.limit]

    log.info("📋 %d processos para processar", len(procs))

    # Listar processos
    for i, p in enumerate(procs, 1):
        preso = "🔴 PRESO" if p["reu_preso"] else "      "
        log.info("  %2d. %s — %s %s", i, p["numero_autos"], p["assistido_nome"], preso)

    if not procs:
        log.info("Nenhum processo para processar.")
        return

    # 3. Processar cada
    results = []
    for i, proc in enumerate(procs, 1):
        log.info("")
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        log.info("  PROCESSANDO %d/%d", i, len(procs))
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

        result = process_one(proc, token, args)
        results.append(result)

        # Rate limiting para Gemini
        if not args.dry_run and i < len(procs):
            log.info("  ⏳ Aguardando 5s (rate limit)...")
            time.sleep(5)

    # 4. Resumo
    log.info("")
    log.info("=" * 60)
    log.info("RESUMO")
    log.info("=" * 60)

    success = [r for r in results if r["status"] == "success"]
    errors = [r for r in results if r["status"] == "error"]
    skipped = [r for r in results if r["status"] == "dry_run"]

    log.info("✅ Sucesso: %d", len(success))
    log.info("❌ Erros: %d", len(errors))
    if skipped:
        log.info("⏭️  Dry run: %d", len(skipped))

    if success:
        log.info("")
        log.info("RELATÓRIOS GERADOS:")
        for r in success:
            log.info("  ✅ %s — %s — Tese: %s", r["numero_autos"], r["assistido"], r.get("tese_principal", "N/A"))

    if errors:
        log.info("")
        log.info("ERROS:")
        for r in errors:
            log.info("  ❌ %s — %s — %s", r["numero_autos"], r["assistido"], r.get("error", ""))

    # Salvar relatório consolidado
    report_path = PROJECT_DIR / "scripts" / f"batch_juri_report_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
    with open(report_path, "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    log.info("")
    log.info("📄 Relatório consolidado: %s", report_path)


if __name__ == "__main__":
    main()
