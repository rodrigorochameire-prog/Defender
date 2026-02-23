"""
SIGAD Scraper Service — Integração com o SIGAD (Sistema Integrado de Gestão
de Atendimento da Defensoria, v3.8.2, CakePHP).

Fluxo descoberto via Chrome MCP em 2026-02-23:

1. Login: POST /usuarios/login
   - data[Usuario][login], data[Usuario][senha]
   - Session cookie gerenciada pelo Playwright

2. Buscar assistido por CPF: GET /assistidos + form submit
   - Tipo de Documento = CPF, Documento de identificação = CPF

3. Extrato: GET /assistidos/extrato/{sigad_id}
   - Exibe dados completos + botão EXPORTAR PARA O SOLAR

4. Exportar: POST /assistidos/exportarDadosBasicosAssistido/{sigad_id}?trs=1
   - Payload: data[Assistido][id]={sigad_id}
   - Resposta:
     * "já está cadastrado no SOLAR" → assistido já existe no Solar
     * "Exportado com sucesso" → exportação realizada
     * "não possui CPF ou CNPJ" → erro, CPF ausente no SIGAD

Requisito: assistido DEVE ter CPF cadastrado no SIGAD para exportar.
"""

import logging
import re
from typing import Any

from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from config import get_settings

logger = logging.getLogger("enrichment-engine.sigad-scraper")

_sigad_service: "SigadScraperService | None" = None


def get_sigad_scraper_service() -> "SigadScraperService":
    global _sigad_service
    if _sigad_service is None:
        _sigad_service = SigadScraperService()
    return _sigad_service


class SigadScraperService:
    """
    Scraper do SIGAD — exporta assistidos para o Solar via /exportarDadosBasicosAssistido/.

    Usa Playwright em modo headless com sessão persistente.
    """

    BASE_URL = "https://sigad.defensoria.ba.def.br"

    def __init__(self) -> None:
        self.settings = get_settings()
        self._playwright = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        self._page: Page | None = None
        self._authenticated = False

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def _ensure_browser(self) -> Page:
        """Inicializa browser Playwright se necessário."""
        if self._page and not self._page.is_closed():
            return self._page

        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=self.settings.solar_headless,
        )
        self._context = await self._browser.new_context(
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        self._page = await self._context.new_page()
        self._authenticated = False
        return self._page

    async def _login(self) -> None:
        """Faz login no SIGAD via formulário CakePHP."""
        page = await self._ensure_browser()

        await page.goto(f"{self.BASE_URL}/usuarios/login")
        await page.wait_for_timeout(2000)

        # Preencher formulário CakePHP
        await page.fill('input[name="data[Usuario][login]"]', self.settings.solar_username)
        await page.fill('input[name="data[Usuario][senha]"]', self.settings.solar_password)
        await page.click('input[type="submit"], button[type="submit"]')
        await page.wait_for_timeout(3000)

        # Verificar se autenticado (redireciona para /assistidos ou /usuarios/painel)
        current_url = page.url
        if "/login" in current_url:
            raise RuntimeError(
                f"SIGAD login falhou — ainda na tela de login: {current_url}"
            )

        self._authenticated = True
        logger.info("SIGAD login bem-sucedido. URL: %s", current_url)

    async def _get_page(self) -> Page:
        """Retorna página autenticada, fazendo login se necessário."""
        page = await self._ensure_browser()

        if not self._authenticated:
            await self._login()
            return self._page  # type: ignore[return-value]

        # Verificar se sessão ainda está ativa
        try:
            current_url = page.url
            if "/login" in current_url:
                logger.info("Sessão SIGAD expirada, re-autenticando")
                self._authenticated = False
                await self._login()
        except Exception:
            await self._login()

        return self._page  # type: ignore[return-value]

    # ------------------------------------------------------------------
    # Busca de assistido
    # ------------------------------------------------------------------

    async def buscar_assistido_por_cpf(self, cpf: str) -> dict[str, Any] | None:
        """
        Busca assistido no SIGAD pelo CPF.

        Retorna dict com {sigad_id, nome, cpf, data_nascimento, triagem} ou None.
        """
        page = await self._get_page()

        # Navegar para página de busca
        await page.goto(f"{self.BASE_URL}/assistidos")
        await page.wait_for_timeout(2000)

        # Selecionar tipo de documento CPF
        await page.select_option('select[name="data[Assistido][tipo_doc_id]"], #tipo_doc', "CPF")
        await page.wait_for_timeout(500)

        # Preencher CPF (aceita com ou sem máscara)
        cpf_input = await page.query_selector(
            'input[name="data[Assistido][documento]"], #documento'
        )
        if not cpf_input:
            # Fallback: campo genérico de documento
            cpf_input = await page.query_selector('input[placeholder*="documento"], input[placeholder*="CPF"]')

        if cpf_input:
            await cpf_input.fill(cpf)
        else:
            logger.warning("Campo CPF não encontrado, tentando via JS")
            await page.evaluate(f"""() => {{
                const inputs = document.querySelectorAll('input[type=text]');
                for (const inp of inputs) {{
                    if (inp.name && inp.name.toLowerCase().includes('documento')) {{
                        inp.value = '{cpf}';
                        break;
                    }}
                }}
            }}""")

        # Submeter formulário
        await page.click('button[type="submit"], input[type="submit"]')
        await page.wait_for_timeout(3000)

        # Extrair primeiro resultado da tabela
        result = await page.evaluate("""() => {
            const rows = document.querySelectorAll('table tbody tr');
            if (!rows.length) return null;

            const row = rows[0];
            const cells = Array.from(row.querySelectorAll('td'));

            // Extrair link do extrato para pegar o ID
            const links = Array.from(row.querySelectorAll('a'));
            let sigad_id = null;
            for (const link of links) {
                const m = link.href && link.href.match(/\\/extrato\\/(\\d+)/);
                if (m) { sigad_id = m[1]; break; }
                const m2 = link.href && link.href.match(/\\/view\\/(\\d+)/);
                if (m2) { sigad_id = m2[1]; break; }
            }

            return {
                sigad_id: sigad_id,
                triagem: cells[0] ? cells[0].textContent.trim() : null,
                nome: cells[1] ? cells[1].textContent.trim() : null,
                numero_processo: cells[2] ? cells[2].textContent.trim() : null,
                mae: cells[3] ? cells[3].textContent.trim() : null,
                data_nascimento: cells[4] ? cells[4].textContent.trim() : null,
                cidade: cells[5] ? cells[5].textContent.trim() : null,
            };
        }""")

        if not result or not result.get("sigad_id"):
            logger.info("Assistido com CPF %s não encontrado no SIGAD", cpf)
            return None

        logger.info(
            "Assistido encontrado: sigad_id=%s nome=%s",
            result["sigad_id"],
            result["nome"],
        )
        return result

    # ------------------------------------------------------------------
    # Exportação para o Solar
    # ------------------------------------------------------------------

    async def exportar_para_solar(
        self,
        sigad_id: str,
        cpf: str | None = None,
    ) -> dict[str, Any]:
        """
        Exporta assistido do SIGAD para o Solar.

        Navega para /assistidos/extrato/{sigad_id} e clica em EXPORTAR PARA O SOLAR.

        Retorna:
          - success: bool
          - ja_existia: bool (True se já estava no Solar)
          - solar_url: str | None (link para o Solar, se fornecido)
          - message: str (mensagem do SIGAD)
          - error: str | None
        """
        page = await self._get_page()

        extrato_url = f"{self.BASE_URL}/assistidos/extrato/{sigad_id}"
        logger.info("Navegando para extrato SIGAD: %s", extrato_url)
        await page.goto(extrato_url)
        await page.wait_for_timeout(2000)

        # Verificar se assistido tem CPF no SIGAD (campo obrigatório)
        cpf_displayed = await page.evaluate("""() => {
            const text = document.body.innerText;
            const m = text.match(/CPF:\\s*([\\d.\\-]+)/);
            return m ? m[1] : null;
        }""")
        if not cpf_displayed or cpf_displayed.upper() in ("ND", "N/D", ""):
            logger.warning("Assistido %s sem CPF no SIGAD — exportação irá falhar", sigad_id)

        # Clicar no botão EXPORTAR PARA O SOLAR
        btn = await page.query_selector("#exportar_solar, .BtnExport")
        if not btn:
            return {
                "success": False,
                "ja_existia": False,
                "solar_url": None,
                "message": "Botão EXPORTAR PARA O SOLAR não encontrado",
                "error": "button_not_found",
            }

        await btn.click()
        await page.wait_for_timeout(4000)

        # Capturar modal/aviso exibido após o clique
        modal_text = await page.evaluate("""() => {
            // Tenta modal Bootstrap
            const modal = document.querySelector('.modal.in .modal-body, .modal[style*="display: block"] .modal-body');
            if (modal) return modal.innerText.trim();
            // Tenta bootbox
            const bootbox = document.querySelector('.bootbox .modal-body');
            if (bootbox) return bootbox.innerText.trim();
            // Tenta qualquer aviso
            const aviso = document.querySelector('.alert, #aviso, .aviso');
            if (aviso) return aviso.innerText.trim();
            return null;
        }""")

        # Capturar link para o Solar se houver
        solar_link = await page.evaluate("""() => {
            const links = document.querySelectorAll('a');
            for (const a of links) {
                if (a.href && a.href.includes('solar.defensoria')) return a.href;
            }
            return null;
        }""")

        # Fechar modal se aberto
        await page.evaluate("""() => {
            const closeBtn = document.querySelector('.modal.in .btn, .modal.in [data-dismiss], .bootbox .btn');
            if (closeBtn) closeBtn.click();
        }""")

        # Interpretar resultado
        text_lower = (modal_text or "").lower()
        if "já está cadastrado" in text_lower or "ja esta cadastrado" in text_lower:
            logger.info("Assistido %s já está no Solar", sigad_id)
            return {
                "success": True,
                "ja_existia": True,
                "solar_url": solar_link,
                "message": modal_text,
                "error": None,
            }
        elif "exportado" in text_lower or "sucesso" in text_lower or "cadastrado" in text_lower:
            logger.info("Assistido %s exportado com sucesso para o Solar", sigad_id)
            return {
                "success": True,
                "ja_existia": False,
                "solar_url": solar_link,
                "message": modal_text,
                "error": None,
            }
        elif "cpf" in text_lower or "cnpj" in text_lower:
            return {
                "success": False,
                "ja_existia": False,
                "solar_url": None,
                "message": modal_text or "Assistido sem CPF/CNPJ no SIGAD",
                "error": "cpf_ausente",
            }
        else:
            logger.warning("Resposta inesperada do SIGAD: %s", modal_text)
            return {
                "success": bool(modal_text),
                "ja_existia": False,
                "solar_url": solar_link,
                "message": modal_text or "Sem resposta do SIGAD",
                "error": None if modal_text else "sem_resposta",
            }

    # ------------------------------------------------------------------
    # Método principal: buscar por CPF e exportar
    # ------------------------------------------------------------------

    async def exportar_assistido_por_cpf(self, cpf: str) -> dict[str, Any]:
        """
        Fluxo completo: buscar assistido no SIGAD pelo CPF e exportar para o Solar.

        Usado pelo endpoint /sigad/exportar-assistido.
        """
        # 1. Buscar no SIGAD
        assistido = await self.buscar_assistido_por_cpf(cpf)
        if not assistido:
            return {
                "success": False,
                "encontrado_sigad": False,
                "ja_existia_solar": False,
                "solar_url": None,
                "sigad_id": None,
                "nome_sigad": None,
                "message": f"CPF {cpf} não encontrado no SIGAD",
                "error": "nao_encontrado",
            }

        sigad_id = assistido["sigad_id"]
        nome = assistido.get("nome", "")

        # 2. Exportar para o Solar
        export_result = await self.exportar_para_solar(sigad_id=sigad_id, cpf=cpf)

        return {
            "success": export_result["success"],
            "encontrado_sigad": True,
            "ja_existia_solar": export_result.get("ja_existia", False),
            "solar_url": export_result.get("solar_url"),
            "sigad_id": sigad_id,
            "nome_sigad": nome,
            "message": export_result.get("message"),
            "error": export_result.get("error"),
        }
