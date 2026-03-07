"""
Ofícios Service — Geração de minutas e análise de ofícios.

- Gemini 2.5 Flash: Classificação rápida de ofícios (alto volume)
- Gemini 2.5 Pro / 3.1 Pro: Redação de minutas, análise processual
"""
from __future__ import annotations

import json
import logging
from typing import Any

from config import get_settings

logger = logging.getLogger("enrichment-engine.oficios")

CONTEXTO_OFICIO = """Você é um especialista em redação jurídica da Defensoria Pública do Estado da Bahia, Núcleo de Camaçari.
Redija ofícios com linguagem formal, técnica e objetiva. Siga a estrutura padrão:
- Cabeçalho (DEFENSORIA PÚBLICA DO ESTADO DA BAHIA)
- Número do ofício e data
- Destinatário com tratamento adequado
- Referência (processo e assistido)
- Corpo objetivo e fundamentado
- Fechamento formal
- Assinatura do(a) Defensor(a) Público(a)"""


class OficiosService:
    """Serviço de geração e análise de ofícios com IA."""

    def __init__(self):
        self.settings = get_settings()
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.settings.gemini_api_key)
                logger.info("Gemini client initialized for oficios")
            except ImportError as e:
                logger.error("google-genai not installed: %s", e)
                raise RuntimeError("Google GenAI not available") from e
        return self._client

    async def gerar_minuta(
        self,
        tipo_oficio: str,
        template_base: str,
        dados_assistido: dict[str, str],
        dados_processo: dict[str, str],
        contexto_adicional: str = "",
        instrucoes: str = "",
    ) -> dict[str, Any]:
        """
        Gera corpo de ofício com Gemini 2.5 Pro.
        Se template_base fornecido, usa como base. Senão, gera do zero.
        """
        client = self._get_client()

        assistido_info = "\n".join(f"- {k}: {v}" for k, v in dados_assistido.items() if v)
        processo_info = "\n".join(f"- {k}: {v}" for k, v in dados_processo.items() if v)

        prompt = f"""{CONTEXTO_OFICIO}

## TAREFA
Redija um ofício do tipo "{tipo_oficio}" com os dados abaixo.

## DADOS DO ASSISTIDO
{assistido_info or 'Não informado'}

## DADOS DO PROCESSO
{processo_info or 'Não informado'}

{f'## TEMPLATE BASE (use como referência de estrutura)\n{template_base}' if template_base else ''}

{f'## CONTEXTO ADICIONAL\n{contexto_adicional}' if contexto_adicional else ''}

{f'## INSTRUÇÕES ESPECÍFICAS\n{instrucoes}' if instrucoes else ''}

## REGRAS
- Use "Camaçari" como comarca padrão
- Data: usar data atual
- Mantenha tom formal e objetivo
- Cite artigos de lei quando pertinente
- Use CAIXA ALTA para nomes próprios do assistido

Retorne APENAS o texto do ofício, pronto para uso. Sem explicações extras."""

        result = client.models.generate_content(
            model=self.settings.gemini_pro_model,
            contents=prompt,
        )

        text = result.text if result.text else ""
        tokens = result.usage_metadata

        return {
            "conteudo": text,
            "modelo": self.settings.gemini_pro_model,
            "tokens_entrada": getattr(tokens, "prompt_token_count", 0) if tokens else 0,
            "tokens_saida": getattr(tokens, "candidates_token_count", 0) if tokens else 0,
        }

    async def classificar_oficio(self, conteudo_markdown: str) -> dict[str, Any]:
        """
        Classifica um ofício existente com Gemini Flash (rápido, barato).
        Retorna: tipo, destinatário, assunto, variáveis, score.
        """
        client = self._get_client()

        prompt = f"""Analise o ofício abaixo e classifique.

## OFÍCIO
{conteudo_markdown[:8000]}

## RESPONDA COM JSON:
{{
  "tipo_oficio": "requisitorio|comunicacao|encaminhamento|solicitacao_providencias|intimacao|pedido_informacao|manifestacao|representacao|parecer_tecnico|convite|resposta_oficio|certidao",
  "destinatario_tipo": "juiz|delegacia|ipa|iml|conselho_tutelar|hospital|escola|tribunal|oab|interno|outro",
  "assunto": "resumo em 1 frase",
  "variaveis_detectadas": ["NOME", "CPF", "PROCESSO", "VARA", ...],
  "qualidade_score": 0-100,
  "estrutura": {{
    "saudacao": "Ex: Ao Excelentíssimo Senhor...",
    "corpo": "resumo do corpo",
    "fechamento": "Ex: Atenciosamente,",
    "assinatura": "Ex: Defensor(a) Público(a)"
  }}
}}"""

        result = client.models.generate_content(
            model=self.settings.gemini_model,  # Flash for speed
            contents=prompt,
        )

        text = result.text if result.text else ""
        try:
            json_str = text
            if "```json" in text:
                json_str = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                json_str = text.split("```")[1].split("```")[0].strip()
            parsed = json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            logger.warning("Failed to parse classification JSON")
            parsed = {"tipo_oficio": "comunicacao", "qualidade_score": 50}

        return parsed


# Singleton
_oficios_service: OficiosService | None = None


def get_oficios_service() -> OficiosService:
    global _oficios_service
    if _oficios_service is None:
        _oficios_service = OficiosService()
    return _oficios_service
