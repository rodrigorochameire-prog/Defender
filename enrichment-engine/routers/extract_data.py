"""
POST /enrich/extract-data — Extrai dados estruturados de conversas WhatsApp para preencher cadastro do assistido.
Fluxo: Mensagens → Claude Sonnet (extração jurídica) → JSON estruturado
"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException, status

from config import get_settings
from models.schemas import ExtractDataInput, ExtractDataOutput, ExtractedData, ExtractedDate

logger = logging.getLogger("enrichment-engine.extract-data")
router = APIRouter()


SYSTEM_PROMPT = """Você é um assistente jurídico da Defensoria Pública do Estado da Bahia.
Sua função é analisar conversas de WhatsApp e extrair dados cadastrais e informações relevantes para a defesa criminal.
Extraia APENAS informações que estejam explicitamente mencionadas na conversa. Não invente dados.
Responda APENAS com JSON válido, sem markdown ou texto adicional."""


def _build_user_prompt(input_data: ExtractDataInput) -> str:
    ctx = input_data.context
    processo_str = ctx.processo_number or "Não informado"

    return f"""Analise a conversa de WhatsApp abaixo e extraia dados cadastrais e informações relevantes.

Contexto:
- Assistido: {ctx.assistido_name}
- Processo: {processo_str}

Conversa:
{input_data.messages}

Extraia os dados no seguinte formato JSON:
{{
  "extracted": {{
    "endereco": "Endereço completo mencionado (rua, número, bairro, cidade) ou null",
    "telefones": ["telefones mencionados na conversa, além do próprio WhatsApp"],
    "relato_fatos": "Narrativa dos fatos relatados pelo assistido ou interlocutor, escrita em terceira pessoa para uso em peças processuais, ou null",
    "nomes_testemunhas": ["nomes de possíveis testemunhas mencionadas"],
    "datas_relevantes": [
      {{"data": "DD/MM/YYYY ou descrição temporal", "descricao": "o que aconteceu nessa data"}}
    ],
    "locais": ["locais mencionados na conversa (bairros, ruas, estabelecimentos, cidades)"],
    "documentos_mencionados": ["documentos mencionados (RG, comprovante, atestado, etc.)"]
  }},
  "confidence": 0.85
}}

Regras:
- Extraia APENAS dados explicitamente mencionados na conversa
- Se um campo não tiver dados, use null para strings, [] para listas
- "relato_fatos" deve ser uma narrativa coesa em terceira pessoa, adequada para peças processuais
- "confidence" deve refletir a qualidade/quantidade dos dados extraídos (0.0 a 1.0)
- Telefones devem incluir DDD quando mencionado
- Para "datas_relevantes", inclua datas de fatos narrados, não datas das mensagens em si
- Nomes de testemunhas incluem qualquer pessoa mencionada que possa depor sobre os fatos"""


@router.post("/extract-data", response_model=ExtractDataOutput)
async def extract_data(input_data: ExtractDataInput) -> ExtractDataOutput:
    """
    Extrai dados estruturados de conversa WhatsApp para preenchimento cadastral.

    1. Recebe mensagens pré-formatadas + contexto (assistido, processo)
    2. Claude Sonnet analisa e extrai endereco, telefones, relato, testemunhas, datas, locais, documentos
    3. Retorna dados estruturados para revisão e aplicação ao cadastro
    """
    settings = get_settings()

    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ANTHROPIC_API_KEY not configured",
        )

    logger.info(
        "Extracting data | assistido=%s chars=%d",
        input_data.context.assistido_name,
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

        extracted_raw = parsed.get("extracted", {})

        # Parse datas_relevantes
        datas_relevantes = []
        for d in extracted_raw.get("datas_relevantes", []) or []:
            if isinstance(d, dict):
                datas_relevantes.append(ExtractedDate(
                    data=d.get("data", ""),
                    descricao=d.get("descricao", ""),
                ))

        extracted = ExtractedData(
            endereco=extracted_raw.get("endereco"),
            telefones=extracted_raw.get("telefones") or [],
            relato_fatos=extracted_raw.get("relato_fatos"),
            nomes_testemunhas=extracted_raw.get("nomes_testemunhas") or [],
            datas_relevantes=datas_relevantes,
            locais=extracted_raw.get("locais") or [],
            documentos_mencionados=extracted_raw.get("documentos_mencionados") or [],
        )

        confidence = parsed.get("confidence", 0.5)

        logger.info(
            "Data extracted | endereco=%s telefones=%d testemunhas=%d datas=%d locais=%d confidence=%.2f tokens_in=%d tokens_out=%d",
            bool(extracted.endereco),
            len(extracted.telefones),
            len(extracted.nomes_testemunhas),
            len(extracted.datas_relevantes),
            len(extracted.locais),
            confidence,
            message.usage.input_tokens,
            message.usage.output_tokens,
        )

        return ExtractDataOutput(
            extracted=extracted,
            confidence=confidence,
        )

    except json.JSONDecodeError as e:
        logger.error("Failed to parse Claude response as JSON: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to parse AI response: {str(e)}",
        )
    except Exception as e:
        logger.error("Failed to extract data: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data extraction failed: {str(e)}",
        )
