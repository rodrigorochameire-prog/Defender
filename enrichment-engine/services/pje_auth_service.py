"""
PJe Auth Service — Autenticação no PJe TJ-BA via Playwright.
Login Keycloak SSO, gerenciamento de sessão, re-autenticação automática.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional

from config import get_settings

logger = logging.getLogger("enrichment-engine.pje-auth")

# Seletores do PJe login (Keycloak SSO)
PJE_SELECTORS = {
    "username_input": "#username",
    "password_input": "#password",
    "submit_button": "#kc-login",
    "login_url_pattern": "sso.cloud.pje.jus.br",
    "pje_url_pattern": "pje.tjba.jus.br/pje",
}


class PjeAuthService:
    """Gerencia autenticação no PJe TJ-BA via Playwright + Keycloak SSO."""

    def __init__(self):
        self.settings = get_settings()
        self._browser = None
        self._context = None
        self._page = None
        self._last_auth_time: float | None = None
        self._lock = asyncio.Lock()

    @property
    def is_authenticated(self) -> bool:
        return self._last_auth_time is not None and self._is_session_fresh()

    @property
    def session_age_seconds(self) -> float | None:
        if self._last_auth_time is None:
            return None
        return time.time() - self._last_auth_time

    @property
    def page(self):
        return self._page

    def _is_session_fresh(self) -> bool:
        if self._last_auth_time is None:
            return False
        return (time.time() - self._last_auth_time) < self.settings.pje_session_timeout

    async def _ensure_browser(self):
        """Inicializa browser Playwright (lazy)."""
        if self._browser is None:
            try:
                from playwright.async_api import async_playwright

                self._playwright = await async_playwright().start()
                self._browser = await self._playwright.chromium.launch(
                    headless=self.settings.pje_headless,
                    args=[
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-gpu",
                    ],
                )
                self._context = await self._browser.new_context(
                    viewport={"width": 1280, "height": 720},
                    user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    accept_downloads=True,
                )
                self._page = await self._context.new_page()
                logger.info("PJe Playwright browser initialized (headless=%s)", self.settings.pje_headless)
            except ImportError:
                logger.error("Playwright not installed")
                raise RuntimeError("Playwright not available")

    async def ensure_authenticated(self) -> bool:
        """Garante sessão autenticada no PJe. Re-autentica se expirada."""
        async with self._lock:
            await self._ensure_browser()

            if self._is_session_fresh() and await self._is_on_pje():
                return True

            logger.info("PJe session expired or not started, authenticating...")
            return await self._authenticate()

    async def _is_on_pje(self) -> bool:
        """Verifica se o browser está no PJe (não redirecionou para login)."""
        try:
            url = self._page.url
            return PJE_SELECTORS["pje_url_pattern"] in url
        except Exception:
            return False

    async def _authenticate(self) -> bool:
        """Login completo no PJe via Keycloak SSO."""
        if not self.settings.pje_cpf or not self.settings.pje_senha:
            logger.error("PJE_CPF or PJE_SENHA not configured")
            return False

        try:
            page = self._page

            # 1. Navegar para PJe login
            logger.info("Navigating to PJe: %s", self.settings.pje_base_url)
            await page.goto(
                f"{self.settings.pje_base_url}/pje/login.seam",
                wait_until="domcontentloaded",
                timeout=30000,
            )

            # 2. Aguardar página de login Keycloak
            current_url = page.url
            if PJE_SELECTORS["login_url_pattern"] in current_url:
                # Na página Keycloak — preencher credenciais
                logger.info("On Keycloak login page, filling credentials...")
                await page.wait_for_selector(PJE_SELECTORS["username_input"], timeout=10000)
                await page.fill(PJE_SELECTORS["username_input"], self.settings.pje_cpf)
                await page.fill(PJE_SELECTORS["password_input"], self.settings.pje_senha)
                await page.click(PJE_SELECTORS["submit_button"])
            elif PJE_SELECTORS["pje_url_pattern"] in current_url:
                # Já autenticado via cookies
                logger.info("Already authenticated via cookies")
                self._last_auth_time = time.time()
                return True
            else:
                # PJe tem formulário próprio na landing page
                logger.info("On PJe login page, filling credentials...")
                cpf_input = await page.wait_for_selector("#username, input[name='username']", timeout=10000)
                if cpf_input:
                    await cpf_input.fill(self.settings.pje_cpf)
                    pwd_input = await page.query_selector("#password, input[name='password']")
                    if pwd_input:
                        await pwd_input.fill(self.settings.pje_senha)
                    submit = await page.query_selector("#kc-login, button[type='submit'], #btnEntrar")
                    if submit:
                        await submit.click()

            # 3. Aguardar redirect para PJe
            try:
                await page.wait_for_url(
                    f"**/{PJE_SELECTORS['pje_url_pattern']}**",
                    timeout=15000,
                )
            except Exception:
                # Fallback: verificar se chegou ao painel
                await page.wait_for_load_state("domcontentloaded", timeout=10000)

            current_url = page.url
            if PJE_SELECTORS["pje_url_pattern"] in current_url:
                self._last_auth_time = time.time()
                logger.info("PJe authentication successful")
                return True
            else:
                logger.error("PJe authentication failed, URL: %s", current_url)
                return False

        except Exception as e:
            logger.error("PJe authentication error: %s", e)
            return False

    async def close(self):
        """Fecha browser e libera recursos."""
        if self._browser:
            await self._browser.close()
            self._browser = None
        if hasattr(self, "_playwright") and self._playwright:
            await self._playwright.stop()
            self._playwright = None
        self._page = None
        self._context = None
        self._last_auth_time = None
        logger.info("PJe browser closed")


# Singleton
_pje_auth: PjeAuthService | None = None


def get_pje_auth_service() -> PjeAuthService:
    global _pje_auth
    if _pje_auth is None:
        _pje_auth = PjeAuthService()
    return _pje_auth
