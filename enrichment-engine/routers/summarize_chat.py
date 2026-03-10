"""
POST /enrich/summarize-chat — Resumo estruturado de conversa WhatsApp para defensor público.
Fluxo: Mensagens → Claude Sonnet (análise jurídica) → JSON estruturado
"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException, status

from config import get_settings
from models.schemas import SummarizeChatInput, SummarizeChatOutput, SummarizeChatStructured

logger = logging.getLogger("enrichment-engine.summarize-chat")
router = APIRouter()


SYSTEM_PROMPT = """Você é um assistente jurídico da Defensoria Pública do Estado da Bahia.
Sua função é analisar conversas de WhatsApp e produzir resumos estruturados para uso do defensor público.
Foque em informações relevantes para a defesa criminal. Seja objetivo e conciso.
Responda APENAS com JSON válido, sem markdown ou texto adicional."""


def _build_user_prompt(input_data: SummarizeChatInput) -> str:
    ctx = input_data.context
    processo_str = ctx.processo_number or "Não informado"

    return f"""Analise a conversa de WhatsApp abaixo e produza um resumo estruturado.

Contexto:
- Assistido: {ctx.assistido_name}
- Interlocutor: {ctx.interlocutor}
- Processo: {processo_str}

Conversa:
{input_data.messages}

Produza o resumo no seguinte formato JSON:
{{
  "summary": "Resumo geral em 2-3 frases",
  "structured": {{
    "fatos": ["fato 1", "fato 2"],
    "pedidos": ["pedido 1"],
    "providencias": ["providência 1"]
  }}
}}

Regras:
- "fatos": fatos relevantes relatados na conversa (objetivos, sem interpretação)
- "pedidos": o que o assistido ou interlocutor está pedindo/demandando
- "providencias": ações que o defensor público deve tomar
- Seja conciso — cada item deve ter no máximo 2 frases
- Se não houver itens para uma categoria, retorne lista vazia []"""


@router.post("/summarize-chat", response_model=SummarizeChatOutput)
async def summarize_chat(input_data: SummarizeChatInput) -> SummarizeChatOutput:
    """
    Gera resumo estruturado de conversa WhatsApp para o defensor público.

    1. Recebe mensagens pré-formatadas + contexto (assistido, interlocutor, processo)
    2. Claude Sonnet analisa e extrai fatos, pedidos e providências
    3. Retorna resumo + dados estruturados
    """
    settings = get_settings()

    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ANTHROPIC_API_KEY not configured",
        )

    logger.info(
        "Summarizing chat | assistido=%s interlocutor=%s chars=%d",
        input_data.context.assistido_name,
        input_data.context.interlocutor,
        len(input_data.messages),
    )

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        message = client.messages.create(
            model=settings.claude_sonnet_model,
            max_tokens=settings.claude_max_tokens,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": _build_user_prompt(input_data)},
            ],
        )

        raw_text = message.content[0].text.strip()

        # Parse JSON response
        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError:
            # Try extracting JSON from markdown code block
            if "```" in raw_text:
                json_start = raw_text.find("{")
                json_end = raw_text.rfind("}") + 1
                if json_start >= 0 and json_end > json_start:
                    parsed = json.loads(raw_text[json_start:json_end])
                else:
                    raise
            else:
                raise

        structured_data = parsed.get("structured", {})
        structured = SummarizeChatStructured(
            fatos=structured_data.get("fatos", []),
            pedidos=structured_data.get("pedidos", []),
            providencias=structured_data.get("providencias", []),
        )

        logger.info(
            "Chat summarized | fatos=%d pedidos=%d providencias=%d tokens_in=%d tokens_out=%d",
            len(structured.fatos),
            len(structured.pedidos),
            len(structured.providencias),
            message.usage.input_tokens,
            message.usage.output_tokens,
        )

        return SummarizeChatOutput(
            summary=parsed.get("summary", ""),
            structured=structured,
        )

    except json.JSONDecodeError as e:
        logger.error("Failed to parse Claude response as JSON: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to parse AI response: {str(e)}",
        )
    except Exception as e:
        logger.error("Failed to summarize chat: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat summarization failed: {str(e)}",
        )
