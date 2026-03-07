"""
Servico de diarizacao e identificacao de speakers.
Usa o output da transcricao existente + Claude Sonnet para inferir identidade.
"""

import json
import logging
import os
from typing import Optional

import anthropic

logger = logging.getLogger("enrichment-engine.diarization")


class DiarizationService:
    """Identifica speakers em transcricoes juridicas usando Claude Sonnet."""

    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.client = anthropic.AsyncAnthropic(api_key=api_key) if api_key else None

    @property
    def available(self) -> bool:
        return self.client is not None

    async def identify_speakers(
        self,
        transcription_text: str,
        caso_contexto: Optional[str] = None,
        existing_labels: Optional[list[dict]] = None,
    ) -> list[dict]:
        """
        Analisa transcricao e identifica speakers por papel/nome.

        Returns: [
            {
                "speaker_key": "Speaker 1",
                "label": "Dr. Joao Silva",
                "role": "defensor",
                "confidence": 0.95,
                "reasoning": "Identificado como defensor pois..."
            }
        ]
        """
        if not self.client:
            logger.warning("[diarization] Anthropic client not configured")
            return []

        existing_context = ""
        if existing_labels:
            existing_context = f"""
Labels ja conhecidos de gravacoes anteriores deste caso:
{json.dumps(existing_labels, ensure_ascii=False, indent=2)}
Use esses labels como referencia para manter consistencia.
"""

        caso_info = ""
        if caso_contexto:
            caso_info = f"""
Contexto do caso:
{caso_contexto}
"""

        prompt = f"""Analise esta transcricao de audiencia/atendimento juridico e identifique cada speaker.

{caso_info}
{existing_context}

TRANSCRICAO:
{transcription_text[:15000]}

Para cada speaker, determine:
1. **label**: Nome da pessoa se possivel inferir, ou papel generico (ex: "Defensor", "Assistido", "Juiz")
2. **role**: Um de: "defensor", "assistido", "juiz", "promotor", "testemunha", "perito", "outro"
3. **confidence**: 0.0 a 1.0 baseado em quao certo voce esta
4. **reasoning**: Explicacao breve de como identificou

DICAS para identificacao:
- Defensor: faz perguntas ao assistido, usa linguagem tecnica juridica, menciona "meu assistido", "a defesa"
- Juiz: conduz a sessao, da ordens, usa "esta magistratura", "determino", "indefiro/defiro"
- Promotor: acusa, usa "Ministerio Publico", "a acusacao", faz perguntas incriminatorias
- Assistido/Reu: responde perguntas, conta sua versao, linguagem informal
- Testemunha: responde sobre o que viu/ouviu, usa "eu vi", "eu estava"

Responda APENAS com JSON array:
[{{"speaker_key": "Speaker 1", "label": "...", "role": "...", "confidence": 0.95, "reasoning": "..."}}]"""

        try:
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )

            text = response.content[0].text.strip()
            # Extract JSON from response
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()

            return json.loads(text)
        except Exception as e:
            logger.error("[diarization] Error identifying speakers: %s", str(e))
            return []


def get_diarization_service() -> DiarizationService:
    """Factory para DiarizationService."""
    return DiarizationService()
