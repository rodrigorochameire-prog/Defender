"""
Serviço de análise de depoimentos com Claude Sonnet.
Recebe transcrição e produz análise completa para defesa criminal:
- Classificação do depoente (multi-tag)
- Extração de entidades (pessoas, locais, objetos, datas)
- Análise de percepção (viu diretamente, ouviu dizer, boato)
- Condições de percepção (iluminação, distância, estado emocional)
- Resumo orientado à defesa com pontos favoráveis/desfavoráveis
- Contradições detectadas
- Highlights com timestamps
- Providências sugeridas
"""
from __future__ import annotations

import json
import logging
from typing import Any

from config import get_settings

logger = logging.getLogger("enrichment-engine.analysis")

DEPOSITION_ANALYSIS_PROMPT = """Você é um analista forense especializado em Defensoria Pública Criminal no Brasil.
Vai receber a transcrição de um depoimento/audiência/interrogatório e deve produzir uma análise COMPLETA orientada à DEFESA do acusado.

CONTEXTO: O acusado é assistido da Defensoria Pública. Sua análise será usada pelo defensor para preparar a estratégia de defesa.

INSTRUÇÕES ESTRITAS:
1. Analise APENAS o que está na transcrição. Não invente fatos.
2. Seja OBJETIVO — identifique tanto pontos favoráveis quanto desfavoráveis.
3. Para cada afirmação relevante, indique o timestamp aproximado.
4. Classifique o depoente com MÚLTIPLAS tags quando aplicável.
5. Extraia TODAS as entidades mencionadas (pessoas, locais, objetos, datas).
6. Distinga rigorosamente entre o que o depoente VIU DIRETAMENTE, o que OUVIU DE PESSOA ESPECÍFICA, e o que é BOATO/FAMA PÚBLICA.

TAGS DE CLASSIFICAÇÃO DO DEPOENTE (use todas que se aplicam):
- testemunha_presencial: estava no local e viu os fatos
- testemunha_ouvir_dizer_boato: ouviu comentários genéricos ("o pessoal fala que...")
- testemunha_ouvir_dizer_fonte: ouviu de pessoa específica identificável que presenciou
- testemunha_mera_conduta: presenciou conduta mas não o resultado
- testemunha_referida: mencionada por outra testemunha mas não depôs
- vitima: vítima do fato
- policial_civil: delegado ou agente de polícia civil
- policial_militar: PM
- familiar_vitima: parente da vítima
- familiar_reu: parente do réu
- vizinho: mora nas proximidades do local dos fatos
- informante: sem compromisso legal de verdade
- perito: depõe sobre questão técnica
- correu: coréu depondo

FORMATO DE SAÍDA — responda APENAS com JSON válido:
{
  "depoente": {
    "nome": "Nome Completo se mencionado",
    "apelido": "apelido se mencionado ou null",
    "classificacoes": ["tag1", "tag2"],
    "relacao_com_fatos": "descrição curta da relação",
    "credibilidade_notas": "observações sobre credibilidade/interesse"
  },
  "entidades": {
    "pessoas": [
      {
        "nome": "Nome da Pessoa",
        "apelidos": ["apelido1"],
        "papel": "réu | vítima | testemunha | suspeito | familiar | outro",
        "caracteristicas": ["descrições físicas ou pessoais mencionadas"],
        "mencionado_por": ["DELEGADO"]
      }
    ],
    "locais": [
      {
        "nome": "endereço ou descrição do local",
        "tipo": "local_do_fato | residencia | via_publica | delegacia | outro",
        "descricao_ambiente": "condições do local se descritas"
      }
    ],
    "datas_horarios": [
      { "referencia": "por volta de 23h", "contexto": "horário do fato" }
    ],
    "objetos": [
      { "descricao": "arma de fogo", "contexto": "supostamente na cintura do réu" }
    ]
  },
  "percepcao": {
    "viu_diretamente": [
      {
        "fato": "descrição do que viu",
        "condicoes": "condições de visão",
        "timestamp_ref": "MM:SS",
        "confiabilidade": "forte | media | fragil — justificativa curta"
      }
    ],
    "ouviu_dizer_especifico": [
      {
        "fato": "o que ouviu",
        "fonte": "quem disse (nome ou descrição)",
        "timestamp_ref": "MM:SS",
        "natureza": "hearsay_identificado"
      }
    ],
    "ouviu_dizer_boato": [
      {
        "fato": "o que diziam",
        "timestamp_ref": "MM:SS",
        "natureza": "hearsay_boato"
      }
    ],
    "condicoes_percepcao": {
      "iluminacao": "diurna | noturna | artificial | precária | boa | null se não mencionado",
      "distancia": "estimativa se mencionada ou null",
      "estado_emocional": "estado do depoente durante os fatos ou null",
      "tempo_exposicao": "quanto tempo observou ou null",
      "obstaculos_visuais": "muros, árvores, veículos ou null",
      "intoxicacao": "menção a álcool/drogas ou null"
    }
  },
  "resumo_defesa": "Parágrafo de 3-5 frases resumindo o valor deste depoimento para a defesa, apontando forças e fraquezas.",
  "pontos_favoraveis": [
    {
      "ponto": "descrição do ponto favorável à defesa",
      "timestamp_ref": "MM:SS",
      "relevancia": "alta | media | baixa",
      "tese_aplicavel": "fragilidade_reconhecimento | ausencia_prova | alibi | legítima_defesa | atipicidade | nulidade | outra"
    }
  ],
  "pontos_desfavoraveis": [
    {
      "ponto": "descrição do ponto desfavorável",
      "timestamp_ref": "MM:SS",
      "relevancia": "alta | media | baixa"
    }
  ],
  "contradicoes": [
    {
      "fato_1": "primeira afirmação (com timestamp)",
      "fato_2": "afirmação contraditória (com timestamp)",
      "analise": "por que são incompatíveis"
    }
  ],
  "highlights": [
    {
      "texto": "trecho exato ou paráfrase curta da fala",
      "tipo": "favoravel | desfavoravel | hearsay | contradicao | admissao | relevante",
      "timestamp_ref": "MM:SS",
      "motivo": "por que este trecho é importante para a defesa"
    }
  ],
  "providencias": [
    "Sugestão de providência concreta para o defensor"
  ]
}

REGRAS IMPORTANTES:
- Se um campo não se aplica, use null ou array vazio [].
- timestamps no formato "MM:SS" ou "HH:MM:SS".
- highlights: inclua os trechos MAIS RELEVANTES (5 a 15 highlights).
- pontos_favoraveis: foque no que AJUDA a defesa.
- contradicoes: identifique TODAS, por menores que sejam.
- providencias: sugira ações CONCRETAS (arrolar testemunha, requerer perícia, impugnar, etc).
- NÃO invente fatos — analise APENAS o que está na transcrição."""


class AnalysisService:
    """Analisa transcrições de depoimentos com Claude Sonnet."""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.anthropic_api_key
        self.model = settings.claude_sonnet_model
        self.max_tokens = 8192  # Análises podem ser longas
        self.timeout = settings.claude_timeout

        if not self.api_key:
            logger.warning("ANTHROPIC_API_KEY não configurada — análise Sonnet indisponível")

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    async def analyze_deposition(
        self,
        transcript: str,
        file_name: str = "",
        speakers: list[str] | None = None,
        assistido_nome: str | None = None,
    ) -> dict[str, Any] | None:
        """
        Analisa transcrição de depoimento com Claude Sonnet.
        Retorna análise estruturada ou None se indisponível.
        """
        if not self.available:
            logger.warning("Análise Sonnet indisponível — ANTHROPIC_API_KEY não configurada")
            return None

        import anthropic

        logger.info(
            "Iniciando análise Sonnet | file=%s | transcript_len=%d | speakers=%s",
            file_name, len(transcript), speakers,
        )

        # Construir contexto
        context_parts = []
        if assistido_nome:
            context_parts.append(f"ASSISTIDO (RÉU): {assistido_nome}")
        if file_name:
            context_parts.append(f"ARQUIVO: {file_name}")
        if speakers:
            context_parts.append(f"INTERLOCUTORES IDENTIFICADOS: {', '.join(speakers)}")

        context = "\n".join(context_parts)

        # Truncar transcrição se muito longa (Sonnet aceita ~200k tokens)
        max_chars = 180_000  # ~45k tokens, com margem para prompt + resposta
        if len(transcript) > max_chars:
            transcript = transcript[:max_chars] + "\n\n[... TRANSCRIÇÃO TRUNCADA POR LIMITE ...]"
            logger.warning("Transcrição truncada de %d para %d chars", len(transcript), max_chars)

        try:
            client = anthropic.AsyncAnthropic(api_key=self.api_key)

            message = await client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                messages=[
                    {
                        "role": "user",
                        "content": f"{context}\n\nTRANSCRIÇÃO:\n{transcript}",
                    }
                ],
                system=DEPOSITION_ANALYSIS_PROMPT,
            )

            response_text = message.content[0].text

            # Parse JSON da resposta
            analysis = self._parse_analysis_response(response_text)

            if analysis:
                logger.info(
                    "Análise Sonnet concluída | file=%s | highlights=%d | pontos_fav=%d | contradicoes=%d",
                    file_name,
                    len(analysis.get("highlights", [])),
                    len(analysis.get("pontos_favoraveis", [])),
                    len(analysis.get("contradicoes", [])),
                )
            else:
                logger.warning("Análise Sonnet retornou resposta não-parseável")

            return analysis

        except anthropic.APIError as e:
            logger.error("Anthropic API error: %s", str(e))
            return None
        except Exception as e:
            logger.error("Análise Sonnet falhou: %s", str(e))
            return None

    def _parse_analysis_response(self, response_text: str) -> dict[str, Any] | None:
        """Parse da resposta JSON do Sonnet."""
        import re as _re

        # Tentar parse direto
        try:
            return json.loads(response_text.strip())
        except json.JSONDecodeError:
            pass

        # Tentar extrair JSON de markdown code block
        json_match = _re.search(r"```(?:json)?\s*\n?(.*?)\n?```", response_text, _re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # Tentar encontrar o primeiro { e último }
        first_brace = response_text.find("{")
        last_brace = response_text.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            try:
                return json.loads(response_text[first_brace : last_brace + 1])
            except json.JSONDecodeError:
                pass

        logger.warning("Não foi possível parsear resposta da análise Sonnet")
        return None


# Singleton
_analysis_service: AnalysisService | None = None


def get_analysis_service() -> AnalysisService:
    global _analysis_service
    if _analysis_service is None:
        _analysis_service = AnalysisService()
    return _analysis_service
