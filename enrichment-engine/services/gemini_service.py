"""
Gemini Service — Extração semântica via Google Gemini Flash.
Wrapper com retry, rate limiting e response JSON.

Usa o pacote `google-genai` (novo SDK unificado do Google).
"""

import json
import logging
import time
from typing import Any

from config import get_settings

logger = logging.getLogger("enrichment-engine.gemini")


class GeminiService:
    """Wrapper para Google Gemini Flash com retry e rate limiting."""

    def __init__(self):
        self.settings = get_settings()
        self._client = None
        self._request_times: list[float] = []

    def _get_client(self):
        """Lazy init do Gemini client."""
        if self._client is None:
            try:
                from google import genai

                self._client = genai.Client(api_key=self.settings.gemini_api_key)
                logger.info("Gemini client initialized: model=%s", self.settings.gemini_model)
            except ImportError as e:
                logger.error("google-genai not installed: %s", e)
                raise RuntimeError("Google GenAI library not available") from e

        return self._client

    def _check_rate_limit(self):
        """Rate limiting simples — sliding window."""
        now = time.time()
        window = 60  # 1 minuto
        self._request_times = [t for t in self._request_times if now - t < window]

        if len(self._request_times) >= self.settings.gemini_rate_limit:
            wait_time = window - (now - self._request_times[0])
            logger.warning("Rate limit hit, waiting %.1fs", wait_time)
            time.sleep(wait_time)

        self._request_times.append(now)

    async def extract(self, prompt: str, context: str) -> dict[str, Any]:
        """
        Envia prompt + contexto para Gemini e retorna JSON estruturado.

        Args:
            prompt: Prompt com instruções de extração (do prompts/)
            context: Texto/dados a serem analisados

        Returns:
            dict com dados extraídos conforme prompt
        """
        client = self._get_client()
        self._check_rate_limit()

        full_prompt = f"{prompt}\n\n---\n\nTEXTO PARA ANÁLISE:\n\n{context}"

        # Truncar se muito longo
        max_chars = self.settings.max_text_length
        if len(full_prompt) > max_chars:
            logger.warning(
                "Prompt truncated from %d to %d chars",
                len(full_prompt),
                max_chars,
            )
            full_prompt = full_prompt[:max_chars]

        last_error = None
        for attempt in range(1, self.settings.gemini_max_retries + 1):
            try:
                from google.genai import types

                start = time.time()
                response = client.models.generate_content(
                    model=self.settings.gemini_model,
                    contents=full_prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1,  # Baixa — extração precisa
                        max_output_tokens=8192,
                    ),
                )
                elapsed = time.time() - start

                logger.info(
                    "Gemini response | attempt=%d time=%.1fs",
                    attempt,
                    elapsed,
                )

                # Parse JSON response
                text = response.text.strip()
                result = json.loads(text)
                return result

            except json.JSONDecodeError as e:
                logger.warning(
                    "Gemini returned invalid JSON (attempt %d): %s | text=%s...",
                    attempt,
                    e,
                    response.text[:200] if response else "None",
                )
                last_error = e

            except Exception as e:
                logger.warning(
                    "Gemini request failed (attempt %d): %s",
                    attempt,
                    str(e),
                )
                last_error = e

                # Backoff exponencial
                if attempt < self.settings.gemini_max_retries:
                    wait = 2 ** attempt
                    logger.info("Retrying in %ds...", wait)
                    time.sleep(wait)

        raise RuntimeError(
            f"Gemini failed after {self.settings.gemini_max_retries} attempts: {last_error}"
        )

    async def extract_with_schema(
        self, prompt: str, context: str, json_schema: dict
    ) -> dict[str, Any]:
        """
        Extrai dados com schema JSON explícito no prompt.
        Adiciona instrução para seguir o schema exato.
        """
        schema_instruction = (
            f"\n\nRESPONDA ESTRITAMENTE no seguinte formato JSON:\n"
            f"```json\n{json.dumps(json_schema, indent=2, ensure_ascii=False)}\n```\n"
            f"NÃO invente dados. Se não encontrar um campo, use null.\n"
            f"Confidence score: 0.0 = não encontrou, 1.0 = certeza absoluta."
        )

        return await self.extract(prompt + schema_instruction, context)

    @staticmethod
    def is_configured() -> bool:
        """Verifica se Gemini está configurado."""
        settings = get_settings()
        return bool(settings.gemini_api_key)


# Singleton
_gemini_service: GeminiService | None = None


def get_gemini_service() -> GeminiService:
    """Retorna singleton do GeminiService."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
