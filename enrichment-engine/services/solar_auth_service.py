"""
Solar Auth Service — Autenticação Keycloak via Playwright.
Gerencia login, sessão, e re-autenticação automática no Solar (DPEBA).
"""

import asyncio
import logging
import time
from typing import Optional

from config import get_settings
from services.solar_selectors import LOGIN

logger = logging.getLogger("enrichment-engine.solar-auth")


class SolarAuthService:
    """Gerencia autenticação no Solar via Playwright + Keycloak."""

    def __init__(self):
        self.settings = get_settings()
        self._browser = None
        self._context = None
        self._page = None
        self._last_auth_time: float | None = None
        self._lock = asyncio.Lock()

    async def _ensure_browser(self):
        """Inicializa browser Playwright (lazy)."""
        if self._browser is None:
            try:
                from playwright.async_api import async_playwright

                self._playwright = await async_playwright().start()
                self._browser = await self._playwright.chromium.launch(
                    headless=self.settings.solar_headless,
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
                )
                self._page = await self._context.new_page()
                logger.info("Playwright browser initialized (headless=%s)", self.settings.solar_headless)
            except ImportError:
                logger.error("Playwright not installed. Run: pip install playwright && playwright install chromium")
                raise RuntimeError("Playwright not available")
            except Exception as e:
                logger.error("Failed to initialize Playwright: %s", e)
                raise

    async def ensure_authenticated(self) -> bool:
        """
        Garante que a sessão está autenticada.
        Re-autentica automaticamente se sessão expirou.

        Returns:
            True se autenticado com sucesso.
        """
        async with self._lock:
            await self._ensure_browser()

            if await self._is_session_valid():
                return True

            logger.info("Session expired or not started, authenticating...")
            return await self._authenticate()

    async def _authenticate(self) -> bool:
        """
        Fluxo completo de login Keycloak.

        1. Navega para Solar → redireciona para Keycloak
        2. Preenche username + password
        3. Submete formulário
        4. Verifica redirect de volta ao Solar
        """
        if not self.settings.solar_username or not self.settings.solar_password:
            logger.error("SOLAR_USERNAME or SOLAR_PASSWORD not configured")
            return False

        try:
            page = self._page

            # 1. Navegar para Solar (redireciona para Keycloak)
            logger.info("Navigating to Solar: %s", self.settings.solar_base_url)
            await page.goto(self.settings.solar_base_url, wait_until="commit", timeout=120000)
            # Aguardar redirect para Keycloak completar
            await page.wait_for_load_state("domcontentloaded", timeout=120000)

            # 2. Verificar se estamos na página de login Keycloak
            current_url = page.url
            if LOGIN["login_url_pattern"] not in current_url:
                # Já autenticado (sessão ainda válida via cookies)
                if LOGIN["solar_url_pattern"] in current_url:
                    logger.info("Already authenticated (valid session cookies)")
                    self._last_auth_time = time.time()
                    return True
                else:
                    logger.warning("Unexpected URL after navigation: %s", current_url)
                    return False

            # 3. Preencher formulário de login
            logger.info("Filling Keycloak login form...")
            await page.wait_for_selector(LOGIN["username_input"], timeout=10000)
            await page.fill(LOGIN["username_input"], self.settings.solar_username)
            await page.fill(LOGIN["password_input"], self.settings.solar_password)

            # 4. Submeter
            await page.click(LOGIN["submit_button"])

            # 5. Aguardar redirect de volta ao Solar
            try:
                await page.wait_for_url(
                    f"**/{LOGIN['solar_url_pattern']}/**",
                    timeout=15000,
                )
            except Exception:
                # Verificar se houve erro de login
                error_elem = await page.query_selector(".alert-error, .kc-feedback-text")
                if error_elem:
                    error_text = await error_elem.text_content()
                    logger.error("Keycloak login failed: %s", error_text)
                    return False
                # Talvez outro tipo de redirect
                current_url = page.url
                if LOGIN["solar_url_pattern"] not in current_url:
                    logger.error("Login redirect failed. Current URL: %s", current_url)
                    return False

            # 6. Sucesso
            self._last_auth_time = time.time()
            logger.info("Successfully authenticated with Solar")
            return True

        except Exception as e:
            logger.error("Authentication failed: %s", e)
            # Screenshot para debugging
            try:
                await self._page.screenshot(path="/tmp/solar_auth_error.png")
                logger.info("Debug screenshot saved to /tmp/solar_auth_error.png")
            except Exception:
                pass
            return False

    async def _is_session_valid(self) -> bool:
        """
        Verifica se a sessão atual ainda é válida.

        Checks:
        1. Browser/page existem
        2. Tempo desde último login < session_timeout
        3. Quick navigation test (não redireciona para login)
        """
        if self._page is None or self._last_auth_time is None:
            return False

        # Check timeout
        elapsed = time.time() - self._last_auth_time
        if elapsed > self.settings.solar_session_timeout:
            logger.info("Session timeout exceeded (%.0fs > %ds)", elapsed, self.settings.solar_session_timeout)
            return False

        # Quick URL check - ver se a página atual ainda é do Solar
        try:
            current_url = self._page.url
            if LOGIN["login_url_pattern"] in current_url:
                logger.info("Session expired (on login page)")
                return False
            return True
        except Exception:
            return False

    async def get_page(self):
        """
        Retorna uma página Playwright autenticada.

        Raises:
            RuntimeError: Se não conseguir autenticar.
        """
        authenticated = await self.ensure_authenticated()
        if not authenticated:
            raise RuntimeError("Failed to authenticate with Solar")
        return self._page

    @property
    def is_authenticated(self) -> bool:
        """Check rápido (sem network) se parece autenticado."""
        if self._last_auth_time is None:
            return False
        elapsed = time.time() - self._last_auth_time
        return elapsed < self.settings.solar_session_timeout

    @property
    def session_age_seconds(self) -> Optional[int]:
        """Idade da sessão em segundos."""
        if self._last_auth_time is None:
            return None
        return int(time.time() - self._last_auth_time)

    async def close(self):
        """Cleanup de recursos do browser."""
        try:
            if self._page:
                await self._page.close()
            if self._context:
                await self._context.close()
            if self._browser:
                await self._browser.close()
            if hasattr(self, "_playwright") and self._playwright:
                await self._playwright.stop()
            logger.info("Browser resources cleaned up")
        except Exception as e:
            logger.warning("Error cleaning up browser: %s", e)
        finally:
            self._browser = None
            self._context = None
            self._page = None
            self._last_auth_time = None

    @staticmethod
    def is_configured() -> bool:
        """Verifica se credenciais Solar estão configuradas."""
        settings = get_settings()
        return bool(settings.solar_username and settings.solar_password)


# Singleton
_solar_auth_service: SolarAuthService | None = None


def get_solar_auth_service() -> SolarAuthService:
    """Retorna singleton do SolarAuthService."""
    global _solar_auth_service
    if _solar_auth_service is None:
        _solar_auth_service = SolarAuthService()
    return _solar_auth_service
