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

Verificação de processo (2026-02-23):
  Antes de exportar, cruzar sigad.numero_processo com processos do OMBUDS.
  Normaliza ambos (remove pontos/traços/barras) para comparação robusta.
  Se não bater → error: "processo_nao_corresponde" (falso positivo de CPF).
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


def _normalizar_numero_processo(numero: str | None) -> str:
    """Remove pontos, traços, barras e espaços para comparação normalizada."""
    if not numero:
        return ""
    return re.sub(r"[\s.\-/]", "", numero)


class SigadScraperService:
    """
    Scraper do SIGAD — exporta assistidos para o Solar via /exportarDadosBasicosAssistido/.

    Usa Playwright em modo headless com sessão persistente.

    Fluxo principal (exportar_assistido_por_cpf):
    1. Busca assistido por CPF na listagem
    2. Verifica se o processo do SIGAD corresponde a algum processo do OMBUDS
    3. Extrai dados detalhados da página extrato (nomeMae, dataNascimento, telefone, etc.)
    4. Exporta para o Solar via botão nativo
    5. Retorna resultado + dados para enriquecer o OMBUDS
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
    # Busca de assistido (listagem)
    # ------------------------------------------------------------------

    async def buscar_assistido_por_cpf(self, cpf: str) -> dict[str, Any] | None:
        """
        Busca assistido no SIGAD pelo CPF via listagem /assistidos.

        Retorna dados da linha da tabela: sigad_id, nome, numero_processo,
        mae, data_nascimento, cidade, triagem. Ou None se não encontrado.
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
            cpf_input = await page.query_selector(
                'input[placeholder*="documento"], input[placeholder*="CPF"]'
            )

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

            // Extrair sigad_id via links
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
            "Assistido encontrado: sigad_id=%s nome=%s processo=%s",
            result["sigad_id"],
            result["nome"],
            result.get("numero_processo"),
        )
        return result

    # ------------------------------------------------------------------
    # Extração detalhada da página extrato
    # ------------------------------------------------------------------

    async def extrair_dados_extrato(self, sigad_id: str) -> dict[str, Any]:
        """
        Extrai dados completos da página /assistidos/extrato/{sigad_id}.

        Campos extraídos do header do assistido:
          - cpf, data_nascimento, nome_mae, cidade, celular, triagem

        Campos extraídos da tabela "AÇÕES GERADAS POR AGENDAMENTOS":
          - acoes: lista com {data, numero_acao, tipo_acao, numero_processo, situacao, viz_url}
          - numero_processo: primeiro número de processo encontrado nas ações
          - vara: vara extraída do painel de detalhe expandido (ex: "1ª Vara Criminal")

        Campos extraídos das observações de atendimento (inline com Detalhar Todos):
          - observacoes: lista com {data, defensor, tipo, texto}

        Navegação só ocorre se não estiver já nessa URL.
        Nota: "Detalhar Todos" já vem ativo por padrão — observações ficam no DOM.
        """
        page = await self._get_page()
        extrato_url = f"{self.BASE_URL}/assistidos/extrato/{sigad_id}"

        # Navegar para extrato se ainda não estiver lá
        if extrato_url not in page.url:
            await page.goto(extrato_url)
            await page.wait_for_timeout(2000)

        dados = await page.evaluate("""() => {
            const text = document.body.innerText;

            function extrair(pattern) {
                const m = text.match(pattern);
                return m ? m[1].trim() : null;
            }

            // --- Dados pessoais do header ---
            const cpf = extrair(/CPF:\\s*([\\d.\\-]+)/i);
            const dataNasc = extrair(/DATA\\s+DE\\s+NASCIMENTO:\\s*([\\d\\/]+)/i);
            const nomeMae = extrair(/NOME\\s+DA\\s+M[ÃA]E:\\s*([^\\n\\r]+)/i);
            const triagem = extrair(/N[°º\\.]+\\s*TRIAGEM:\\s*([\\d]+)/i);
            const cidade = extrair(/CIDADE:\\s*([^\\n\\r]+)/i);
            const celular = extrair(/CEL:\\s*([\\(\\d\\)\\s\\-]+)/i);

            // --- Tabela de ações (7 colunas) ---
            const allRows = Array.from(document.querySelectorAll('table tbody tr'));
            const acaoRows = allRows.filter(r => r.querySelectorAll('td').length === 7);
            const acoes = acaoRows.map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                const vizLink = row.querySelector('a[href*="detalhes/acoes"]');
                const numProcesso = cells[4] ? cells[4].innerText.trim() : null;
                return {
                    data_cadastro: cells[0] ? cells[0].innerText.trim() : null,
                    numero_acao: cells[1] ? cells[1].innerText.replace('visualização rápida','').trim() : null,
                    especializada: cells[2] ? cells[2].innerText.trim() : null,
                    tipo_acao: cells[3] ? cells[3].innerText.trim() : null,
                    numero_processo: numProcesso,
                    situacao: cells[5] ? cells[5].innerText.trim() : null,
                    viz_url: vizLink ? vizLink.href : null,
                };
            });

            // Primeiro número de processo das ações
            const primeiroProcesso = acoes.length > 0 ? acoes[0].numero_processo : null;

            // Vara do painel expandido (ex: "0301743-15.2015.8.05.0039 - Atuação: 1ª Vara Criminal")
            let vara = null;
            const panelProcM = text.match(/N[°º\\.]+\\s*do\\s*processo:\\s*([^\\n\\r]+)/i);
            if (panelProcM) {
                const varaM = panelProcM[1].match(/Atua[çc][ãa]o:\\s*(.+)$/i);
                vara = varaM ? varaM[1].trim() : null;
            }

            // --- Observações de atendimento (4 colunas: data, defensor, tipo, texto) ---
            const obsRows = allRows.filter(r => r.querySelectorAll('td').length === 4);
            const observacoes = obsRows.map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                return {
                    data: cells[0] ? cells[0].innerText.trim() : null,
                    defensor: cells[1] ? cells[1].innerText.trim() : null,
                    tipo: cells[2] ? cells[2].innerText.trim() : null,
                    texto: cells[3] ? cells[3].innerText.trim() : null,
                };
            }).filter(o => o.data && o.texto);

            return {
                cpf: cpf && cpf.toUpperCase() !== 'ND' ? cpf : null,
                data_nascimento: dataNasc,
                nome_mae: nomeMae ? nomeMae.trim() : null,
                cidade: cidade ? cidade.trim() : null,
                celular: celular ? celular.trim() : null,
                triagem: triagem,
                // Dados processuais
                acoes: acoes,
                numero_processo: primeiroProcesso,
                vara: vara,
                // Histórico de atendimentos
                observacoes: observacoes,
            };
        }""")

        logger.info(
            "Extrato SIGAD %s: cpf=%s dataNasc=%s nomeMae=%s celular=%s processo=%s vara=%s acoes=%d obs=%d",
            sigad_id,
            dados.get("cpf"),
            dados.get("data_nascimento"),
            dados.get("nome_mae"),
            dados.get("celular"),
            dados.get("numero_processo"),
            dados.get("vara"),
            len(dados.get("acoes") or []),
            len(dados.get("observacoes") or []),
        )
        return dados

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
        Retorna: success, ja_existia, solar_url, message, error.
        """
        page = await self._get_page()

        extrato_url = f"{self.BASE_URL}/assistidos/extrato/{sigad_id}"
        if extrato_url not in page.url:
            logger.info("Navegando para extrato SIGAD: %s", extrato_url)
            await page.goto(extrato_url)
            await page.wait_for_timeout(2000)

        # Verificar se assistido tem CPF no SIGAD (campo obrigatório para exportar)
        cpf_displayed = await page.evaluate("""() => {
            const text = document.body.innerText;
            const m = text.match(/CPF:\\s*([\\d.\\-]+)/i);
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
            const modal = document.querySelector('.modal.in .modal-body, .modal[style*="display: block"] .modal-body');
            if (modal) return modal.innerText.trim();
            const bootbox = document.querySelector('.bootbox .modal-body');
            if (bootbox) return bootbox.innerText.trim();
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
    # Método principal: buscar, verificar, enriquecer e exportar
    # ------------------------------------------------------------------

    async def exportar_assistido_por_cpf(
        self,
        cpf: str,
        numeros_processo_ombuds: list[str] | None = None,
    ) -> dict[str, Any]:
        """
        Fluxo completo SIGAD → Solar com verificação de processo e enriquecimento.

        Etapas:
        1. Buscar assistido no SIGAD pelo CPF
        2. Verificar correspondência de processo (se numeros_processo_ombuds fornecido)
           - Normaliza ambos (remove pontos/traços) para comparação robusta
           - Se não bater → retorna error: "processo_nao_corresponde"
        3. Extrair dados detalhados da página extrato (nomeMae, dataNascimento, telefone, etc.)
        4. Exportar para o Solar via botão nativo
        5. Retornar resultado + dados_para_enriquecer (apenas campos não-nulos)

        Args:
            cpf: CPF do assistido (com ou sem máscara)
            numeros_processo_ombuds: Lista de numeroAutos dos processos no OMBUDS.
                Se fornecida, valida que o processo do SIGAD está na lista.

        Returns:
            Dict com campos: success, encontrado_sigad, ja_existia_solar,
            verificacao_processo, sigad_processo, dados_para_enriquecer,
            solar_url, sigad_id, nome_sigad, message, error.
        """
        # 1. Buscar no SIGAD
        assistido = await self.buscar_assistido_por_cpf(cpf)
        if not assistido:
            return {
                "success": False,
                "encontrado_sigad": False,
                "ja_existia_solar": False,
                "verificacao_processo": None,
                "sigad_processo": None,
                "dados_para_enriquecer": None,
                "solar_url": None,
                "sigad_id": None,
                "nome_sigad": None,
                "message": f"CPF {cpf} não encontrado no SIGAD",
                "error": "nao_encontrado",
            }

        sigad_id = assistido["sigad_id"]
        nome = assistido.get("nome", "")
        sigad_numero = (assistido.get("numero_processo") or "").strip()

        # 2. Extrair dados completos da página extrato ANTES da verificação.
        # Isso permite usar o número de processo diretamente do SIGAD
        # (mais confiável que o da listagem, que pode estar truncado).
        dados_extrato = await self.extrair_dados_extrato(sigad_id)

        # Número do processo: preferir o extraído do extrato (mais completo)
        numero_extrato = dados_extrato.get("numero_processo") or ""
        sigad_numero_final = numero_extrato or sigad_numero  # fallback para o da listagem

        # 3. Verificar correspondência de processo
        # Usa o número extraído do extrato como fonte primária.
        verificacao_ok: bool | None = None
        if numeros_processo_ombuds:
            sigad_norm = _normalizar_numero_processo(sigad_numero_final)
            match = (
                sigad_norm
                and any(
                    _normalizar_numero_processo(n) == sigad_norm
                    for n in numeros_processo_ombuds
                )
            )
            if not match:
                logger.warning(
                    "Processo SIGAD '%s' não corresponde aos processos OMBUDS: %s",
                    sigad_numero_final,
                    numeros_processo_ombuds,
                )
                return {
                    "success": False,
                    "encontrado_sigad": True,
                    "ja_existia_solar": False,
                    "verificacao_processo": False,
                    "sigad_processo": sigad_numero_final,
                    "dados_para_enriquecer": None,
                    "solar_url": None,
                    "sigad_id": sigad_id,
                    "nome_sigad": nome,
                    "vara": dados_extrato.get("vara"),
                    "observacoes": dados_extrato.get("observacoes", []),
                    "message": (
                        f"Processo no SIGAD ({sigad_numero_final}) não corresponde "
                        f"aos processos do OMBUDS: {', '.join(numeros_processo_ombuds)}"
                    ),
                    "error": "processo_nao_corresponde",
                }
            verificacao_ok = True

        # 4. Montar dados para enriquecer o OMBUDS (apenas campos não-nulos)
        dados_para_enriquecer: dict[str, Any] = {}
        if dados_extrato.get("nome_mae"):
            dados_para_enriquecer["nomeMae"] = dados_extrato["nome_mae"]
        if dados_extrato.get("data_nascimento"):
            dados_para_enriquecer["dataNascimento"] = dados_extrato["data_nascimento"]
        if dados_extrato.get("cidade"):
            dados_para_enriquecer["naturalidade"] = dados_extrato["cidade"]
        if dados_extrato.get("celular"):
            dados_para_enriquecer["telefone"] = dados_extrato["celular"]

        # 5. Exportar para o Solar (página extrato já está carregada)
        export_result = await self.exportar_para_solar(sigad_id=sigad_id, cpf=cpf)

        return {
            "success": export_result["success"],
            "encontrado_sigad": True,
            "ja_existia_solar": export_result.get("ja_existia", False),
            "verificacao_processo": verificacao_ok,
            "sigad_processo": sigad_numero_final or None,
            "vara": dados_extrato.get("vara"),
            "observacoes": dados_extrato.get("observacoes", []),
            "dados_para_enriquecer": dados_para_enriquecer if dados_para_enriquecer else None,
            "solar_url": export_result.get("solar_url"),
            "sigad_id": sigad_id,
            "nome_sigad": nome,
            "message": export_result.get("message"),
            "error": export_result.get("error"),
        }
