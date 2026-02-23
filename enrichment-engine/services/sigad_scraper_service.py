"""
SIGAD Scraper Service — Integração com o SIGAD (Sistema Integrado de Gestão
de Atendimento da Defensoria, v3.8.2, CakePHP).

Fluxo mapeado via Chrome MCP (2026-02-23, investigação aprofundada):

1. Login: POST /usuarios/login
   - data[Usuario][login], data[Usuario][senha]
   - Session cookie gerenciada pelo Playwright

2. Buscar assistido por CPF: POST /assistidos?md=
   - Formulário: #formAssitido (CakePHP POST)
   - Campo tipo: data[Filtro][tipoDoc] = "102" (CPF)
   - Campo CPF:  data[Filtro][documento] = CPF sem máscara
   - Tabela resultado: #lst_assistido (preenchida via AJAX após POST)
   - "Nenhum Assistido Presente" → CPF não encontrado
   - Link extrato: /assistidos/extrato/{sigad_id}

3. Extrato: GET /assistidos/extrato/{sigad_id}
   - Header: CPF, Data Nascimento, Nome Mãe, Cidade, Celular, Nº Triagem
   - Tabela "AÇÕES GERADAS POR AGENDAMENTOS" (7 colunas):
       Data | Número da Ação | Especializada | Tipo de Ação | Nº do Processo | Situação | Opções
   - Painel expandido (inline, Detalhar Todos ativo por padrão):
       "Nº do processo: XXXX - Atuação: 1ª Vara Criminal"
   - Tabela observações (4 colunas): Data | Defensor/Servidor | Tipo | Observações
   - Aba AGENDAMENTOS: #tableAgendamento (8 colunas)
   - Aba ANEXOS: #table_anexos_extrato (6 colunas)
   - Botão exportar: #exportar_solar (.BtnExport)

4. Exportar: POST /assistidos/exportarDadosBasicosAssistido/{sigad_id}?trs=1
   - Trigger: $.ajax() acionado pelo click em #exportar_solar
   - dataType: json — retorna objeto JSON
   - Resposta (verificada no handler JS):
     * "CPF/CNPJ já cadastrado" → já existe no Solar
       → link: https://solar.defensoria.ba.def.br/assistido/buscar/
     * "Dados exportados com sucesso!" → exportação realizada (novo)
     * "Este campo não pode ser nulo." → CPF é "ND" no SIGAD
   - Solar URL pós-exportação: /assistido/buscar/?cpf={CPF_FORMATADO}&page=1&

Requisito: assistido DEVE ter CPF cadastrado no SIGAD (não "ND") para exportar.

Verificação de processo (2026-02-23):
  Antes de exportar, cruzar sigad.numero_processo com processos do OMBUDS.
  Normaliza ambos (remove pontos/traços/barras) para comparação robusta.
  Fonte primária do número: extrato (mais completo que listagem).
  Se não bater → error: "processo_nao_corresponde" (falso positivo de CPF).

Seletores corretos confirmados (2026-02-23):
  - tipoDoc: select[name="data[Filtro][tipoDoc]"] — value "102" = CPF
  - documento: input[name="data[Filtro][documento]"] — CPF sem máscara
  - submit: input[type="submit"]#submit-XXXX (id dinâmico — não usar id)
  - resultado: table#lst_assistido tbody tr
  - "nenhum resultado": td[colspan="2"] com texto "Nenhum Assistido Presente."
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

    async def _is_authenticated(self, page: Page) -> bool:
        """
        Verifica se a sessão atual ainda está ativa.
        Faz uma requisição leve para /assistidos e checa redirect para login.
        """
        try:
            current_url = page.url
            # Indicadores de sessão expirada
            if any(p in current_url for p in ("/login", "/usuarios/login")):
                return False
            return True
        except Exception:
            return False

    async def _get_page(self) -> Page:
        """Retorna página autenticada, fazendo login se necessário."""
        page = await self._ensure_browser()

        if not self._authenticated:
            await self._login()
            return self._page  # type: ignore[return-value]

        # Verificar se sessão ainda está ativa
        if not await self._is_authenticated(page):
            logger.info("Sessão SIGAD expirada, re-autenticando")
            self._authenticated = False
            try:
                await self._login()
            except Exception as e:
                logger.error("Falha ao re-autenticar no SIGAD: %s", e)
                raise

        return self._page  # type: ignore[return-value]

    async def _reset_browser(self) -> None:
        """
        Destrói o browser Playwright e limpa todo o estado interno.
        Chamado quando um crash é detectado (TimeoutError, TargetClosedError, etc.)
        — a próxima chamada a _ensure_browser() recriará tudo do zero.
        """
        logger.warning("Resetando browser Playwright (crash ou timeout detectado)")
        self._authenticated = False
        try:
            if self._page and not self._page.is_closed():
                await self._page.close()
        except Exception:
            pass
        try:
            if self._context:
                await self._context.close()
        except Exception:
            pass
        try:
            if self._browser:
                await self._browser.close()
        except Exception:
            pass
        try:
            if self._playwright:
                await self._playwright.stop()
        except Exception:
            pass
        finally:
            self._page = None
            self._context = None
            self._browser = None
            self._playwright = None

    # ------------------------------------------------------------------
    # Busca de assistido (listagem)
    # ------------------------------------------------------------------

    async def buscar_assistido_por_cpf(self, cpf: str) -> dict[str, Any] | None:
        """
        Busca assistido no SIGAD pelo CPF via listagem /assistidos.

        Seletores confirmados (2026-02-23):
          - data[Filtro][tipoDoc] = "102" (CPF)
          - data[Filtro][documento] = CPF sem máscara (ex: "06072263585")
          - Tabela resultado: #lst_assistido
          - "Nenhum Assistido Presente." → CPF não cadastrado

        A tabela é populada via AJAX após o POST — aguarda até 8s.
        Se houver múltiplos resultados, usa o primeiro e loga warning.

        Retorna dict com: sigad_id, nome, numero_processo, triagem, cidade.
        Retorna None se não encontrado.
        """
        page = await self._get_page()

        # Normalizar CPF: remover máscara para o campo do formulário
        cpf_sem_mascara = re.sub(r"[\s.\-/]", "", cpf)

        # Navegar para página de busca
        await page.goto(f"{self.BASE_URL}/assistidos")
        await page.wait_for_load_state("domcontentloaded")
        await page.wait_for_timeout(1500)

        # Verificar se página carregou corretamente (não caiu no login)
        if "/login" in page.url or "/usuarios/login" in page.url:
            logger.warning("Sessão SIGAD expirada ao navegar para /assistidos — re-autenticando")
            self._authenticated = False
            await self._login()
            await page.goto(f"{self.BASE_URL}/assistidos")
            await page.wait_for_timeout(1500)

        # Setar tipo de documento = CPF (value "102") via JS com events
        # (evita problema de máscara dinâmica que limpa o campo documento)
        await page.evaluate("""() => {
            const sel = document.querySelector('select[name="data[Filtro][tipoDoc]"]');
            if (sel) {
                sel.value = '102';
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }""")
        await page.wait_for_timeout(300)

        # Preencher CPF sem máscara
        cpf_field = await page.query_selector('input[name="data[Filtro][documento]"]')
        if cpf_field:
            await cpf_field.fill(cpf_sem_mascara)
            await cpf_field.dispatch_event("input")
            await cpf_field.dispatch_event("change")
        else:
            logger.warning("Campo data[Filtro][documento] não encontrado — tentando fallback")
            await page.evaluate(f"""() => {{
                const inp = document.querySelector('input[name="data[Filtro][documento]"]')
                    || document.querySelector('#documentoIdentificacao');
                if (inp) {{
                    inp.value = '{cpf_sem_mascara}';
                    inp.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    inp.dispatchEvent(new Event('change', {{ bubbles: true }}));
                }}
            }}""")

        # Submeter formulário diretamente (evita problemas com botão de submit)
        await page.evaluate("() => document.querySelector('#formAssitido')?.submit()")
        await page.wait_for_load_state("domcontentloaded")

        # Aguardar tabela de resultados com polling (AJAX pode demorar)
        resultado_pronto = False
        for _ in range(8):  # até 8s
            await page.wait_for_timeout(1000)
            tabela_html = await page.evaluate("""() => {
                const t = document.querySelector('#lst_assistido tbody');
                return t ? t.innerHTML : null;
            }""")
            if tabela_html and "Nenhum Assistido Presente" not in tabela_html:
                resultado_pronto = True
                break
            if tabela_html and "Nenhum Assistido Presente" in tabela_html:
                break  # definitivamente não encontrado

        if not resultado_pronto:
            logger.info("Assistido com CPF %s não encontrado no SIGAD", cpf)
            return None

        # Extrair TODOS os resultados para detectar múltiplos (ambiguidade)
        resultados = await page.evaluate("""() => {
            const table = document.querySelector('#lst_assistido');
            if (!table) return [];
            const rows = Array.from(table.querySelectorAll('tbody tr'));

            return rows
                .filter(row => {
                    // Filtrar linha de "nenhum resultado"
                    const cells = row.querySelectorAll('td');
                    if (cells.length === 1) return false;
                    return true;
                })
                .map(row => {
                    const cells = Array.from(row.querySelectorAll('td'));

                    // Extrair sigad_id via link /extrato/{id}
                    let sigad_id = null;
                    for (const a of row.querySelectorAll('a')) {
                        const m = (a.href || '').match(/\\/extrato\\/(\\d+)/);
                        if (m) { sigad_id = m[1]; break; }
                        const m2 = (a.href || '').match(/\\/view\\/(\\d+)/);
                        if (m2) { sigad_id = m2[1]; break; }
                    }

                    return {
                        sigad_id,
                        triagem:         cells[0] ? cells[0].textContent.trim() : null,
                        nome:            cells[1] ? cells[1].textContent.trim() : null,
                        numero_processo: cells[2] ? cells[2].textContent.trim() : null,
                        mae:             cells[3] ? cells[3].textContent.trim() : null,
                        data_nascimento: cells[4] ? cells[4].textContent.trim() : null,
                        cidade:          cells[5] ? cells[5].textContent.trim() : null,
                    };
                })
                .filter(r => r.sigad_id);
        }""")

        if not resultados:
            logger.info("Assistido com CPF %s não encontrado no SIGAD", cpf)
            return None

        if len(resultados) > 1:
            logger.warning(
                "CPF %s retornou %d assistidos no SIGAD — usando o primeiro: sigad_id=%s",
                cpf,
                len(resultados),
                resultados[0]["sigad_id"],
            )

        result = resultados[0]
        logger.info(
            "Assistido encontrado no SIGAD: sigad_id=%s nome=%s processo=%s",
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

    def _solar_url_para_cpf(self, cpf: str | None) -> str | None:
        """
        Gera URL do Solar para busca por CPF.
        Formato confirmado: /assistido/buscar/?cpf=060.722.635-85&page=1&
        """
        if not cpf:
            return None
        # Normalizar para formato com máscara: xxx.xxx.xxx-xx
        digits = re.sub(r"\D", "", cpf)
        if len(digits) == 11:
            formatted = f"{digits[:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:]}"
        else:
            formatted = cpf
        return f"https://solar.defensoria.ba.def.br/assistido/buscar/?cpf={formatted}&page=1&"

    async def exportar_para_solar(
        self,
        sigad_id: str,
        cpf: str | None = None,
    ) -> dict[str, Any]:
        """
        Exporta assistido do SIGAD para o Solar via botão nativo.

        Navega para /assistidos/extrato/{sigad_id} (se não estiver lá),
        clica em #exportar_solar, aguarda modal de resposta e interpreta.

        Respostas possíveis (confirmadas via inspeção do JS handler):
          - "CPF/CNPJ já cadastrado"      → ja_existia=True, success=True
          - "Dados exportados com sucesso!" → ja_existia=False, success=True
          - "Este campo não pode ser nulo." → CPF "ND", success=False
          - Ausência de modal              → error="sem_resposta"

        Retorna: success, ja_existia, solar_url, message, error.
        """
        page = await self._get_page()

        extrato_url = f"{self.BASE_URL}/assistidos/extrato/{sigad_id}"
        if extrato_url not in page.url:
            logger.info("Navegando para extrato SIGAD: %s", extrato_url)
            await page.goto(extrato_url)
            await page.wait_for_load_state("domcontentloaded")
            await page.wait_for_timeout(2000)

        # Verificar CPF exibido na página (obrigatório para exportar)
        cpf_displayed = await page.evaluate("""() => {
            const m = document.body.innerText.match(/CPF:\\s*([\\d.\\-]+)/i);
            return m ? m[1] : null;
        }""")

        # CPF "ND" = não disponível → exportação vai falhar
        if not cpf_displayed or cpf_displayed.upper() in ("ND", "N/D", ""):
            logger.warning("Assistido %s sem CPF no SIGAD — exportação irá falhar", sigad_id)
            return {
                "success": False,
                "ja_existia": False,
                "solar_url": None,
                "message": "Assistido não possui CPF/CNPJ cadastrado no SIGAD",
                "error": "cpf_ausente",
            }

        # CPF efetivo: usar o exibido na página (já tem máscara correta)
        cpf_efetivo = cpf or cpf_displayed

        # Clicar no botão EXPORTAR PARA O SOLAR
        btn = await page.query_selector("#exportar_solar, .BtnExport")
        if not btn:
            logger.error("Botão #exportar_solar não encontrado na página %s", extrato_url)
            return {
                "success": False,
                "ja_existia": False,
                "solar_url": None,
                "message": "Botão EXPORTAR PARA O SOLAR não encontrado na página",
                "error": "button_not_found",
            }

        await btn.click()

        # Aguardar modal com polling (AJAX assíncrono — pode demorar até 6s)
        modal_text: str | None = None
        for _ in range(6):
            await page.wait_for_timeout(1000)
            modal_text = await page.evaluate("""() => {
                // SweetAlert / bootbox / modal Bootstrap
                for (const sel of [
                    '.swal2-content', '.swal2-html-container',
                    '.bootbox .modal-body',
                    '.modal.in .modal-body',
                    '.modal[style*="display: block"] .modal-body',
                    '.modal[style*="display:block"] .modal-body',
                ]) {
                    const el = document.querySelector(sel);
                    if (el && el.innerText.trim()) return el.innerText.trim();
                }
                return null;
            }""")
            if modal_text:
                break

        # Capturar link Solar no modal (caso "já cadastrado" inclua link)
        solar_link_modal = await page.evaluate("""() => {
            const modals = [
                '.swal2-content a', '.bootbox a', '.modal.in a',
                '.modal[style*="display: block"] a',
            ];
            for (const sel of modals) {
                for (const a of document.querySelectorAll(sel)) {
                    if (a.href && a.href.includes('solar.defensoria')) return a.href;
                }
            }
            return null;
        }""")

        # Fechar modal
        await page.evaluate("""() => {
            for (const sel of [
                '.swal2-confirm', '.bootbox .btn-primary', '.bootbox .btn',
                '.modal.in [data-dismiss="modal"]', '.modal.in .btn-primary',
            ]) {
                const btn = document.querySelector(sel);
                if (btn) { btn.click(); return; }
            }
        }""")

        # URL do Solar: preferir link do modal, fallback para URL construída pelo CPF
        solar_url = solar_link_modal or self._solar_url_para_cpf(cpf_efetivo)

        # Interpretar resultado baseado nas strings confirmadas no JS handler
        text_lower = (modal_text or "").lower()

        if "cpf/cnpj já cadastrado" in text_lower or "já está cadastrado" in text_lower:
            logger.info("Assistido sigad_id=%s já está cadastrado no Solar", sigad_id)
            return {
                "success": True,
                "ja_existia": True,
                "solar_url": solar_url,
                "message": modal_text,
                "error": None,
            }

        if "dados exportados com sucesso" in text_lower or "exportado com sucesso" in text_lower:
            logger.info("Assistido sigad_id=%s exportado com sucesso para o Solar", sigad_id)
            return {
                "success": True,
                "ja_existia": False,
                "solar_url": solar_url,
                "message": modal_text,
                "error": None,
            }

        # "Este campo não pode ser nulo." → CPF ND detectado tarde
        if "campo não pode ser nulo" in text_lower or "nulo" in text_lower:
            return {
                "success": False,
                "ja_existia": False,
                "solar_url": None,
                "message": modal_text or "Campo CPF/CNPJ nulo no SIGAD",
                "error": "cpf_ausente",
            }

        # Fallback: qualquer outra string com "cpf" ou "cnpj" = erro de CPF
        if "cpf" in text_lower or "cnpj" in text_lower:
            return {
                "success": False,
                "ja_existia": False,
                "solar_url": None,
                "message": modal_text or "Erro relacionado a CPF/CNPJ no SIGAD",
                "error": "cpf_ausente",
            }

        # Sem modal = sem resposta AJAX (timeout ou erro de rede)
        if not modal_text:
            logger.error(
                "Sem resposta do SIGAD após clicar em exportar (sigad_id=%s)", sigad_id
            )
            return {
                "success": False,
                "ja_existia": False,
                "solar_url": None,
                "message": "Sem resposta do SIGAD após tentativa de exportação",
                "error": "sem_resposta",
            }

        # Resposta desconhecida — logar para investigação futura
        logger.warning(
            "Resposta inesperada do SIGAD ao exportar sigad_id=%s: %r", sigad_id, modal_text
        )
        return {
            "success": False,
            "ja_existia": False,
            "solar_url": solar_link_modal,
            "message": modal_text,
            "error": "resposta_inesperada",
        }

    # ------------------------------------------------------------------
    # Método principal: buscar, verificar, enriquecer e exportar
    # ------------------------------------------------------------------

    _ERRO_VAZIO: dict[str, Any] = {
        "success": False,
        "encontrado_sigad": False,
        "ja_existia_solar": False,
        "verificacao_processo": None,
        "sigad_processo": None,
        "dados_para_enriquecer": None,
        "solar_url": None,
        "sigad_id": None,
        "nome_sigad": None,
        "vara": None,
        "observacoes": [],
        "message": "",
        "error": "",
    }

    async def exportar_assistido_por_cpf(
        self,
        cpf: str,
        numeros_processo_ombuds: list[str] | None = None,
    ) -> dict[str, Any]:
        """
        Fluxo completo SIGAD → Solar com verificação de processo e enriquecimento.

        Wrapper com resiliência: se o browser Playwright crashar (TimeoutError,
        TargetClosedError, etc.), destrói o browser, recria, e tenta 1x mais.

        Etapas internas (em _exportar_assistido_interno):
        1. Buscar assistido no SIGAD pelo CPF
        2. Verificar correspondência de processo
        3. Extrair dados detalhados da página extrato
        4. Exportar para o Solar via botão nativo
        5. Retornar resultado + dados_para_enriquecer

        Returns:
            Dict com campos: success, encontrado_sigad, ja_existia_solar,
            verificacao_processo, sigad_processo, dados_para_enriquecer,
            solar_url, sigad_id, nome_sigad, message, error.
        """
        try:
            return await self._exportar_assistido_interno(cpf, numeros_processo_ombuds)
        except Exception as e:
            error_type = type(e).__name__
            # Erros Playwright que indicam browser morto ou instável
            playwright_crashes = (
                "Timeout", "TargetClosed", "Connection",
                "BrowserType", "NavigationAborted", "Closed",
            )
            is_playwright_crash = any(t in error_type for t in playwright_crashes)

            if is_playwright_crash:
                logger.warning(
                    "Playwright crash (%s: %s) — resetando browser e tentando 1x mais",
                    error_type, e,
                )
                await self._reset_browser()
                try:
                    return await self._exportar_assistido_interno(
                        cpf, numeros_processo_ombuds,
                    )
                except Exception as e2:
                    logger.error(
                        "Segunda tentativa falhou: %s: %s", type(e2).__name__, e2,
                    )
                    return {
                        **self._ERRO_VAZIO,
                        "message": f"Falha persistente no browser: {e2}",
                        "error": f"playwright_{type(e2).__name__.lower()}",
                    }

            # Erro não-Playwright (ex: bug de lógica) — retornar com tipo explícito
            logger.error(
                "Erro inesperado em exportar_assistido_por_cpf: %s: %s",
                error_type, e,
            )
            return {
                **self._ERRO_VAZIO,
                "message": f"Erro interno: {e}",
                "error": f"internal_{error_type.lower()}",
            }

    async def _exportar_assistido_interno(
        self,
        cpf: str,
        numeros_processo_ombuds: list[str] | None = None,
    ) -> dict[str, Any]:
        """Corpo real do fluxo SIGAD → Solar. Chamado pelo wrapper com retry."""
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
