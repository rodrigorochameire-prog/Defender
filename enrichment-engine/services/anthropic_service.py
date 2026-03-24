"""
Anthropic Claude Service — Análise de dados e revisão de documentos.

- Claude Sonnet 4.6: Todas as funções (análise, revisão, dados estruturados)
- Opus removido (mar/2026) — custo 5x maior sem ganho proporcional para JSON estruturado
"""
from __future__ import annotations

import json
import logging
from typing import Any

from config import get_settings

logger = logging.getLogger("enrichment-engine.anthropic")

CONTEXTO_JURIDICO = """Você é um especialista jurídico da Defensoria Pública do Estado da Bahia.
Suas análises devem priorizar a defesa do assistido, usar linguagem técnica jurídica formal,
citar artigos de lei e jurisprudência quando pertinente, e ser direto e objetivo."""


class AnthropicService:
    """Wrapper para Anthropic Claude com lazy init."""

    def __init__(self):
        self.settings = get_settings()
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=self.settings.anthropic_api_key)
                logger.info("Anthropic client initialized")
            except ImportError as e:
                logger.error("anthropic not installed: %s", e)
                raise RuntimeError("Anthropic library not available") from e
        return self._client

    def is_available(self) -> bool:
        return bool(self.settings.anthropic_api_key)

    async def revisar_oficio(
        self,
        conteudo: str,
        tipo_oficio: str,
        destinatario: str,
        contexto_adicional: str = "",
    ) -> dict[str, Any]:
        """
        Revisa um ofício com Claude Sonnet 4.6.
        Retorna: { score, sugestoes[], tomAdequado, formalidadeOk, dadosCorretos, conteudoRevisado? }
        """
        client = self._get_client()

        prompt = f"""## TAREFA
Revise o ofício abaixo com rigor profissional. Avalie cada aspecto e retorne JSON.

## INFORMAÇÕES
- Tipo: {tipo_oficio}
- Destinatário: {destinatario}
{f'- Contexto: {contexto_adicional}' if contexto_adicional else ''}

## CONTEÚDO
{conteudo}

## CRITÉRIOS
1. Tom formal — Linguagem adequada
2. Coerência textual — Argumentação lógica
3. Adequação jurídica — Termos corretos, referências precisas
4. Dados — Nome, CPF, processo consistentes
5. Estrutura — Cabeçalho, saudação, corpo, fechamento
6. Ortografia e gramática

## RESPONDA APENAS COM JSON:
{{
  "score": 0-100,
  "tomAdequado": true/false,
  "formalidadeOk": true/false,
  "dadosCorretos": true/false,
  "sugestoes": [
    {{
      "tipo": "correcao|melhoria|alerta",
      "trecho": "trecho problemático",
      "sugestao": "o que fazer",
      "prioridade": "alta|media|baixa"
    }}
  ],
  "conteudoRevisado": "versão melhorada (se score < 80)"
}}"""

        message = client.messages.create(
            model=self.settings.claude_sonnet_model,
            max_tokens=self.settings.claude_max_tokens,
            system=CONTEXTO_JURIDICO,
            messages=[{"role": "user", "content": prompt}],
        )

        text = message.content[0].text if message.content else ""
        tokens_in = message.usage.input_tokens
        tokens_out = message.usage.output_tokens

        # Parse JSON
        try:
            json_str = text
            if "```json" in text:
                json_str = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                json_str = text.split("```")[1].split("```")[0].strip()
            parsed = json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            logger.warning("Failed to parse Claude response as JSON")
            parsed = {"score": 50, "sugestoes": [{"tipo": "alerta", "sugestao": text[:500], "prioridade": "media"}]}

        return {
            **parsed,
            "modelo": self.settings.claude_sonnet_model,
            "tokens_entrada": tokens_in,
            "tokens_saida": tokens_out,
        }

    async def melhorar_texto(self, conteudo: str, instrucao: str) -> dict[str, Any]:
        """Melhora texto com Claude Sonnet. Retorna texto melhorado."""
        client = self._get_client()

        message = client.messages.create(
            model=self.settings.claude_sonnet_model,
            max_tokens=self.settings.claude_max_tokens,
            system=CONTEXTO_JURIDICO,
            messages=[{
                "role": "user",
                "content": f"""Melhore o texto abaixo seguindo: "{instrucao}"

## TEXTO
{conteudo}

Retorne APENAS o texto melhorado, sem explicações.""",
            }],
        )

        text = message.content[0].text if message.content else conteudo
        return {
            "conteudo": text,
            "modelo": self.settings.claude_sonnet_model,
            "tokens_entrada": message.usage.input_tokens,
            "tokens_saida": message.usage.output_tokens,
        }

    async def analisar_dados_estruturados(
        self,
        dados: dict[str, Any],
        pergunta: str,
    ) -> dict[str, Any]:
        """
        Sonnet 4.6 — Análise de dados JÁ ESTRUTURADOS.
        Input DEVE ser JSON depurado, NÃO texto livre.
        """
        input_size = len(json.dumps(dados))
        if input_size > 100000:
            raise ValueError(
                f"Input muito grande ({input_size} chars). "
                "Use Gemini para processar grandes volumes primeiro."
            )

        client = self._get_client()

        message = client.messages.create(
            model=self.settings.claude_sonnet_model,
            max_tokens=self.settings.claude_max_tokens,
            system=f"{CONTEXTO_JURIDICO}\n\nVocê analisa dados ESTRUTURADOS com raciocínio profundo.",
            messages=[{
                "role": "user",
                "content": f"""## PERGUNTA
{pergunta}

## DADOS
{json.dumps(dados, ensure_ascii=False, indent=2)}

## RESPONDA COM JSON:
{{
  "insights": [{{"categoria": "...", "descricao": "...", "confianca": 0.0-1.0, "acaoRecomendada": "..."}}],
  "padroesIdentificados": ["..."],
  "recomendacoes": ["..."]
}}""",
            }],
        )

        text = message.content[0].text if message.content else ""
        try:
            json_str = text
            if "```json" in text:
                json_str = text.split("```json")[1].split("```")[0].strip()
            parsed = json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            parsed = {"insights": [], "recomendacoes": [text[:500]]}

        return {
            **parsed,
            "modelo": self.settings.claude_sonnet_model,
            "tokens_entrada": message.usage.input_tokens,
            "tokens_saida": message.usage.output_tokens,
        }


# Singleton
_anthropic_service: AnthropicService | None = None


def get_anthropic_service() -> AnthropicService:
    global _anthropic_service
    if _anthropic_service is None:
        _anthropic_service = AnthropicService()
    return _anthropic_service
