"""
Claude Service — Extração semântica via Anthropic Claude Sonnet.
Wrapper com retry, rate limiting e response JSON.

Usa o pacote `anthropic` (SDK oficial da Anthropic).
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any

from config import get_settings

logger = logging.getLogger("enrichment-engine.claude")


class ClaudeService:
    """Wrapper para Claude Sonnet com retry e parse de JSON."""

    def __init__(self):
        self.settings = get_settings()
        self._client = None
        self._request_times: list[float] = []

    def _get_client(self):
        """Lazy init do cliente Anthropic."""
        if self._client is None:
            try:
                import anthropic

                self._client = anthropic.AsyncAnthropic(
                    api_key=self.settings.anthropic_api_key
                )
                logger.info(
                    "Claude client initialized: model=%s", self.settings.claude_sonnet_model
                )
            except ImportError as e:
                logger.error("anthropic not installed: %s", e)
                raise RuntimeError("Anthropic library not available") from e

        return self._client

    async def _check_rate_limit(self):
        """Rate limiting simples — sliding window de 1 minuto."""
        now = time.time()
        window = 60
        self._request_times = [t for t in self._request_times if now - t < window]

        # Claude Sonnet: ~50 req/min no tier padrão
        if len(self._request_times) >= 50:
            wait_time = window - (now - self._request_times[0])
            logger.warning("Rate limit hit, waiting %.1fs", wait_time)
            await asyncio.sleep(wait_time)

        self._request_times.append(now)

    async def extract(self, system_prompt: str, context: str) -> dict[str, Any]:
        """
        Envia system_prompt + contexto para Claude e retorna JSON estruturado.

        Args:
            system_prompt: Prompt com instruções de extração (do prompts/)
            context: Texto/dados a serem analisados

        Returns:
            dict com dados extraídos conforme prompt
        """
        client = self._get_client()
        await self._check_rate_limit()

        # Truncar contexto se muito longo
        max_chars = self.settings.max_text_length
        if len(context) > max_chars:
            logger.warning(
                "Context truncated from %d to %d chars", len(context), max_chars
            )
            context = context[:max_chars]

        last_error = None
        max_retries = self.settings.gemini_max_retries  # reutiliza configuração

        for attempt in range(1, max_retries + 1):
            try:
                start = time.time()
                response = await client.messages.create(
                    model=self.settings.claude_sonnet_model,
                    max_tokens=4096,
                    system=system_prompt,
                    messages=[{"role": "user", "content": context}],
                )
                elapsed = time.time() - start

                logger.info(
                    "Claude response | attempt=%d time=%.1fs tokens_in=%d tokens_out=%d",
                    attempt,
                    elapsed,
                    response.usage.input_tokens,
                    response.usage.output_tokens,
                )

                text = response.content[0].text.strip()

                # Extrair JSON de bloco markdown se presente
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0].strip()
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0].strip()

                result = json.loads(text)
                return result

            except json.JSONDecodeError as e:
                raw = locals().get("text", "")
                logger.warning(
                    "Claude returned invalid JSON (attempt %d): %s | text=%s...",
                    attempt,
                    e,
                    raw[:200],
                )
                last_error = e

            except Exception as e:
                logger.warning(
                    "Claude request failed (attempt %d): %s", attempt, str(e)
                )
                last_error = e

                if attempt < max_retries:
                    wait = 2 ** attempt
                    logger.info("Retrying in %ds...", wait)
                    await asyncio.sleep(wait)

        raise RuntimeError(
            f"Claude failed after {max_retries} attempts: {last_error}"
        )

    @staticmethod
    def is_configured() -> bool:
        """Verifica se Claude está configurado."""
        settings = get_settings()
        return bool(settings.anthropic_api_key)


# Singleton
_claude_service: ClaudeService | None = None


def get_claude_service() -> ClaudeService:
    """Retorna singleton do ClaudeService."""
    global _claude_service
    if _claude_service is None:
        _claude_service = ClaudeService()
    return _claude_service
