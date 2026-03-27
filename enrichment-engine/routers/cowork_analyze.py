"""
POST /cowork/analyze — Análise completa via Claude com prompt da skill do Cowork.
Gera _analise_ia.json + relatório, salva no Drive, popula banco.
"""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import get_settings

logger = logging.getLogger("enrichment-engine.cowork-analyze")
router = APIRouter()

# ─── Prompt da skill do júri (compactado) ───
JURI_SYSTEM_PROMPT = """Você é o analista forense sênior da Defensoria Pública da Bahia (DPE-BA, 7ª Regional – Camaçari), especializado em Tribunal do Júri.

REGRAS DE REDAÇÃO:
- Nome do assistido PRIMEIRO, seguido da Defensoria
- "A denúncia acusa [NOME]..." — nunca "devidamente recebida"
- Usar "o fato teria ocorrido" (não "a conduta" — pressupõe autoria)
- Proibido valorações: "devidamente", "regularmente"
- Reconhecimento irregular = ILEGALIDADE (art. 226 CPP), não nulidade

ANALISE OS AUTOS E GERE:
1. Relatório completo (cabeçalho, resumão, perfil réu, denúncia, vítima, laudos, depoimentos, tabela comparativa, inconsistências, perguntas, orientação, teses, diligências)
2. JSON _analise_ia.json no formato OMBUDS (schema abaixo)"""


JURI_JSON_SCHEMA = """
Retorne TAMBÉM um bloco JSON com EXATAMENTE este schema (campos obrigatórios):

```json
{
  "schema_version": "1.0",
  "tipo": "juri",
  "gerado_em": "(ISO 8601)",
  "assistido": "(nome completo)",
  "processo": "(número dos autos)",
  "resumo_fato": "(síntese factual 3-5 frases)",
  "tese_defesa": "(tese principal)",
  "estrategia_atual": "(estratégia recomendada)",
  "crime_principal": "(tipo penal)",
  "pontos_criticos": ["ponto 1", "ponto 2"],
  "payload": {
    "perguntas_por_testemunha": [
      {"nome": "Nome Completo", "tipo": "ACUSACAO|DEFESA", "perguntas": ["p1", "p2"]}
    ],
    "contradicoes": [
      {"testemunha": "Nome", "delegacia": "versão", "juizo": "versão", "contradicao": "desc"}
    ],
    "orientacao_ao_assistido": "(orientação para interrogatório)",
    "perspectiva_plenaria": "(estratégia plenário)",
    "quesitos_criticos": ["quesito 1"]
  }
}
```
"""


class CoworkAnalyzeRequest(BaseModel):
    assistido_nome: str
    processo_numero: str
    content: str  # briefing + documentos concatenados
    assistido_id: Optional[int] = None
    processo_id: Optional[int] = None


class CoworkAnalyzeResponse(BaseModel):
    success: bool
    relatorio_md: str = ""
    analise_json: dict = {}
    tese_defesa: str = ""
    campos_atualizados: list[str] = []
    processing_time_ms: int = 0
    error: str = ""


def _call_claude(system: str, user: str, model: str, api_key: str, max_tokens: int = 16384) -> str:
    """Chama Claude via API Anthropic."""
    resp = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": model,
            "max_tokens": max_tokens,
            "temperature": 0.2,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        },
        timeout=600,
    )
    resp.raise_for_status()
    return resp.json()["content"][0]["text"]


def _extract_json(text: str) -> dict:
    """Extrai JSON de texto com code blocks."""
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        raw = match.group(1)
    else:
        bs = text.find("{")
        be = text.rfind("}")
        raw = text[bs:be + 1] if bs >= 0 and be > bs else "{}"

    cleaned = raw.strip()
    cleaned = re.sub(r",\s*}", "}", cleaned)
    cleaned = re.sub(r",\s*]", "]", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Tentar fechar JSON truncado
        pos = e.pos if hasattr(e, "pos") else len(cleaned) // 2
        partial = cleaned[:pos].rstrip(", \n\t")
        ob = partial.count("{") - partial.count("}")
        oq = partial.count("[") - partial.count("]")
        partial += "]" * oq + "}" * ob
        return json.loads(partial)


def _import_to_db(analise: dict, assistido_id: int | None, processo_id: int | None) -> list[str]:
    """Importa análise no banco via Supabase REST."""
    from services.supabase_service import SupabaseService

    sb = SupabaseService()
    client = sb._get_client()
    updated = []

    # 1. analises_cowork
    try:
        client.table("analises_cowork").insert({
            "assistido_id": assistido_id,
            "processo_id": processo_id,
            "tipo": analise.get("tipo", "juri"),
            "schema_version": analise.get("schema_version", "1.0"),
            "resumo_fato": analise.get("resumo_fato"),
            "tese_defesa": analise.get("tese_defesa"),
            "estrategia_atual": analise.get("estrategia_atual"),
            "crime_principal": analise.get("crime_principal"),
            "pontos_criticos": analise.get("pontos_criticos", []),
            "payload": analise.get("payload", {}),
            "fonte_arquivo": "_analise_ia.json",
        }).execute()
        updated.append("analises_cowork")
    except Exception as e:
        logger.warning("analises_cowork insert failed: %s", e)

    # 2. processos.analysis_data
    if processo_id:
        try:
            payload = analise.get("payload", {})
            client.table("processos").update({
                "analysis_data": {
                    "resumo": analise.get("resumo_fato", ""),
                    "teses": [analise["tese_defesa"]] if analise.get("tese_defesa") else [],
                    "estrategia": analise.get("estrategia_atual", ""),
                    "crimePrincipal": analise.get("crime_principal", ""),
                    "pontosCriticos": analise.get("pontos_criticos", []),
                    "fonte": "cowork",
                    "perspectivaPlenaria": payload.get("perspectiva_plenaria", ""),
                    "quesitoscriticos": payload.get("quesitos_criticos", []),
                    "orientacaoAssistido": payload.get("orientacao_ao_assistido", ""),
                },
                "analysis_status": "completed",
            }).eq("id", processo_id).execute()
            updated.append("processos.analysis_data")
        except Exception as e:
            logger.warning("processos update failed: %s", e)

    # 3. testemunhas.perguntas_sugeridas
    payload = analise.get("payload", {})
    perguntas = payload.get("perguntas_por_testemunha", [])
    if perguntas and processo_id:
        try:
            testemunhas_db = client.table("testemunhas").select("id,nome").eq(
                "processo_id", processo_id
            ).execute()
            t_map = {t["nome"].lower(): t["id"] for t in testemunhas_db.data}
            count = 0
            for item in perguntas:
                nome_t = item.get("nome", "").lower()
                tid = t_map.get(nome_t)
                if tid:
                    client.table("testemunhas").update({
                        "perguntas_sugeridas": json.dumps(item.get("perguntas", []), ensure_ascii=False),
                    }).eq("id", tid).execute()
                    count += 1
            if count:
                updated.append(f"testemunhas[{count}]")
        except Exception as e:
            logger.warning("testemunhas update failed: %s", e)

    return updated


@router.post("/analyze", response_model=CoworkAnalyzeResponse)
async def cowork_analyze(req: CoworkAnalyzeRequest):
    """Análise completa do Cowork via Claude API + import no banco."""
    start = time.time()
    settings = get_settings()

    if not settings.anthropic_api_key:
        raise HTTPException(503, "ANTHROPIC_API_KEY não configurada")

    # Truncar conteúdo
    content = req.content
    if len(content) > 120_000:
        content = content[:120_000] + "\n\n[... truncado ...]"

    try:
        # 1. Chamar Claude com prompt da skill + schema JSON
        user_prompt = f"""Analise os autos abaixo para o Tribunal do Júri.

ASSISTIDO: {req.assistido_nome}
PROCESSO: {req.processo_numero}

{content}

---

{JURI_JSON_SCHEMA}"""

        result_text = _call_claude(
            system=JURI_SYSTEM_PROMPT,
            user=user_prompt,
            model=settings.claude_sonnet_model,
            api_key=settings.anthropic_api_key,
        )

        # 2. Extrair JSON
        analise_json = _extract_json(result_text)

        # Garantir campos mínimos
        analise_json.setdefault("schema_version", "1.0")
        analise_json.setdefault("tipo", "juri")
        analise_json.setdefault("assistido", req.assistido_nome)
        analise_json.setdefault("processo", req.processo_numero)
        analise_json.setdefault("pontos_criticos", [])
        analise_json.setdefault("payload", {})

        # 3. Separar relatório (texto antes do JSON)
        json_start = result_text.find("```json")
        relatorio_md = result_text[:json_start].strip() if json_start > 0 else result_text

        # 4. Importar no banco
        updated = _import_to_db(analise_json, req.assistido_id, req.processo_id)

        elapsed = int((time.time() - start) * 1000)

        return CoworkAnalyzeResponse(
            success=True,
            relatorio_md=relatorio_md,
            analise_json=analise_json,
            tese_defesa=analise_json.get("tese_defesa", ""),
            campos_atualizados=updated,
            processing_time_ms=elapsed,
        )

    except Exception as e:
        logger.exception("cowork analyze failed")
        elapsed = int((time.time() - start) * 1000)
        return CoworkAnalyzeResponse(
            success=False,
            error=str(e)[:500],
            processing_time_ms=elapsed,
        )
