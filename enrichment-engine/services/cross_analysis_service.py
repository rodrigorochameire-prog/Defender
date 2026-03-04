"""
Serviço de análise cruzada de depoimentos com Claude Sonnet.
Compara múltiplas análises individuais de depoimentos para encontrar:
- Contradições ENTRE depoentes
- Corroborações cruzadas
- Lacunas (fatos mencionados por um mas não por outro)
- Tese consolidada de defesa
- Timeline unificada dos fatos
- Mapa de atores
"""

import json
import logging
from typing import Any

from config import get_settings

logger = logging.getLogger("enrichment-engine.cross-analysis")

CROSS_ANALYSIS_PROMPT = """Você é um analista forense sênior especializado em Defensoria Pública Criminal no Brasil.
Vai receber MÚLTIPLAS análises individuais de depoimentos/interrogatórios do MESMO CASO e deve produzir uma ANÁLISE CRUZADA comparativa.

OBJETIVO: Comparar o que cada depoente disse sobre os MESMOS fatos, identificando contradições, corroborações e lacunas.

INSTRUÇÕES ESTRITAS:
1. Compare afirmações sobre os MESMOS FATOS entre depoentes diferentes.
2. Identifique TODAS as contradições, por menores que sejam — elas são OURO para a defesa.
3. Identifique corroborações — quando múltiplos depoentes confirmam o mesmo fato.
4. Identifique lacunas — fatos mencionados por um depoente mas não abordados por outros.
5. Consolide uma tese de defesa baseada nos pontos favoráveis de TODOS os depoimentos.
6. Monte uma timeline unificada com referências cruzadas.
7. Mapeie TODOS os atores mencionados e suas relações.

FORMATO DE SAÍDA — responda APENAS com JSON válido:
{
  "contradiction_matrix": [
    {
      "fato": "descrição do fato em questão",
      "depoimentos": [
        {
          "source_file_id": 123,
          "depoente": "DELEGADO",
          "afirmacao": "o que este depoente disse sobre o fato",
          "timestamp_ref": "MM:SS ou null"
        }
      ],
      "tipo": "contradicao | corroboracao | lacuna",
      "analise": "análise do impacto desta divergência/convergência para a defesa"
    }
  ],
  "tese_consolidada": {
    "tese_principal": "descrição da tese principal de defesa que emerge dos depoimentos",
    "teses_subsidiarias": ["tese alternativa 1", "tese alternativa 2"],
    "pontos_fortes": [
      {
        "ponto": "descrição do ponto favorável",
        "fontes": [123, 456],
        "relevancia": "alta | media | baixa"
      }
    ],
    "pontos_fracos": [
      {
        "ponto": "descrição do ponto desfavorável",
        "fontes": [123],
        "relevancia": "alta | media | baixa"
      }
    ]
  },
  "timeline_fatos": [
    {
      "data_ref": "referência temporal (data, horário, 'antes de X')",
      "fato": "descrição do fato",
      "fontes": [
        {
          "file_id": 123,
          "depoente": "DELEGADO",
          "timestamp_ref": "MM:SS ou null"
        }
      ],
      "importancia": "alta | media | baixa"
    }
  ],
  "mapa_atores": [
    {
      "nome": "Nome da Pessoa",
      "papel": "réu | vítima | testemunha | policial | familiar | outro",
      "mencionado_por": [
        {
          "file_id": 123,
          "depoente": "DELEGADO",
          "contexto": "como este depoente se refere a esta pessoa"
        }
      ],
      "relacoes": [
        { "com": "Outra Pessoa", "tipo": "familiar | vizinho | amigo | inimigo | desconhecido" }
      ]
    }
  ],
  "providencias_agregadas": [
    "providência concreta 1 (deduzida do cruzamento)",
    "providência 2"
  ]
}

REGRAS IMPORTANTES:
- Foque nas CONTRADIÇÕES — são a principal ferramenta da defesa.
- Para cada item na contradiction_matrix, inclua TODOS os depoentes que falaram sobre aquele fato.
- Se um depoente NÃO mencionou um fato, isso é uma "lacuna" (pode ser estrategicamente relevante).
- fontes[] referencia os source_file_id fornecidos.
- timeline_fatos deve ser ordenada cronologicamente quando possível.
- providencias_agregadas deve ser a UNIÃO deduzida de todas as análises + novas providências do cruzamento.
- NÃO invente fatos — analise APENAS o que está nas análises individuais."""


class CrossAnalysisService:
    """Análise cruzada de depoimentos com Claude Sonnet."""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.anthropic_api_key
        self.model = settings.claude_sonnet_model
        self.max_tokens = 8192
        self.timeout = settings.claude_timeout

        if not self.api_key:
            logger.warning("ANTHROPIC_API_KEY não configurada — cross-analysis indisponível")

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    async def cross_analyze(
        self,
        analyses: list[dict[str, Any]],
        assistido_nome: str | None = None,
    ) -> dict[str, Any] | None:
        """
        Compara múltiplas análises individuais e gera análise cruzada.

        Args:
            analyses: Lista de dicts com {file_id, file_name, depoente, analysis}
            assistido_nome: Nome do assistido (réu) para contexto

        Returns:
            Dict com contradiction_matrix, tese_consolidada, timeline_fatos, mapa_atores, providencias_agregadas
        """
        if not self.available:
            logger.warning("Cross-analysis indisponível — ANTHROPIC_API_KEY não configurada")
            return None

        if len(analyses) < 2:
            logger.warning("Cross-analysis requer pelo menos 2 análises individuais")
            return None

        import anthropic

        logger.info(
            "Iniciando cross-analysis | assistido=%s | num_analyses=%d",
            assistido_nome, len(analyses),
        )

        # Construir conteúdo para o prompt
        context_parts = []
        if assistido_nome:
            context_parts.append(f"ASSISTIDO (RÉU): {assistido_nome}")
        context_parts.append(f"TOTAL DE DEPOIMENTOS: {len(analyses)}")

        analyses_text = []
        for i, a in enumerate(analyses, 1):
            analysis_json = json.dumps(a.get("analysis", {}), ensure_ascii=False, indent=2)
            # Truncar análises muito longas
            if len(analysis_json) > 15_000:
                analysis_json = analysis_json[:15_000] + "\n... [TRUNCADO]"

            analyses_text.append(
                f"--- DEPOIMENTO {i} ---\n"
                f"source_file_id: {a.get('file_id')}\n"
                f"Arquivo: {a.get('file_name', 'desconhecido')}\n"
                f"Depoente: {a.get('depoente', 'não identificado')}\n"
                f"Análise individual:\n{analysis_json}\n"
            )

        context = "\n".join(context_parts)
        all_analyses = "\n\n".join(analyses_text)

        # Truncar se muito longo
        max_chars = 150_000
        if len(all_analyses) > max_chars:
            all_analyses = all_analyses[:max_chars] + "\n\n[... TRUNCADO POR LIMITE ...]"
            logger.warning("Cross-analysis input truncado para %d chars", max_chars)

        try:
            client = anthropic.AsyncAnthropic(api_key=self.api_key)

            message = await client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                messages=[
                    {
                        "role": "user",
                        "content": f"{context}\n\n{all_analyses}",
                    }
                ],
                system=CROSS_ANALYSIS_PROMPT,
            )

            response_text = message.content[0].text
            result = self._parse_response(response_text)

            if result:
                logger.info(
                    "Cross-analysis concluída | contradictions=%d | timeline=%d | atores=%d",
                    len(result.get("contradiction_matrix", [])),
                    len(result.get("timeline_fatos", [])),
                    len(result.get("mapa_atores", [])),
                )
            else:
                logger.warning("Cross-analysis retornou resposta não-parseável")

            return result

        except anthropic.APIError as e:
            logger.error("Anthropic API error (cross-analysis): %s", str(e))
            return None
        except Exception as e:
            logger.error("Cross-analysis falhou: %s", str(e))
            return None

    def _parse_response(self, response_text: str) -> dict[str, Any] | None:
        """Parse da resposta JSON do Sonnet."""
        import re as _re

        try:
            return json.loads(response_text.strip())
        except json.JSONDecodeError:
            pass

        json_match = _re.search(r"```(?:json)?\s*\n?(.*?)\n?```", response_text, _re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        first_brace = response_text.find("{")
        last_brace = response_text.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            try:
                return json.loads(response_text[first_brace : last_brace + 1])
            except json.JSONDecodeError:
                pass

        logger.warning("Não foi possível parsear resposta da cross-analysis")
        return None


# Singleton
_cross_analysis_service: CrossAnalysisService | None = None


def get_cross_analysis_service() -> CrossAnalysisService:
    global _cross_analysis_service
    if _cross_analysis_service is None:
        _cross_analysis_service = CrossAnalysisService()
    return _cross_analysis_service
