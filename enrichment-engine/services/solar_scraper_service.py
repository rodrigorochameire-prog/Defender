"""
Solar Scraper Service — Extrai dados do Sistema Solar (DPEBA) via Playwright.

Estratégia de extração (descoberta via Chrome MCP Discovery 2026-02-22):
- Solar é um app AngularJS 1.x com routing hash-based
- Os dados de processo/movimentações ficam no scope AngularJS:
  angular.element(...).scope().eproc.processo
- Documentos são baixados via API REST /procapi/:
  /procapi/processo/{numero_sem_pontos}{grau}/documento/{documento_id}/
- Isso permite extração via JavaScript injection ao invés de CSS scraping
"""

import asyncio
import base64
import logging
import time
from typing import Any

from config import get_settings
from services.solar_auth_service import get_solar_auth_service
from services.solar_selectors import (
    LOGIN,
    URLS,
    SEARCH,
    PJE,
    AVISOS,
    format_numero_processo_grau,
    build_documento_url,
)

logger = logging.getLogger("enrichment-engine.solar-scraper")


class SolarScraperService:
    """
    Scraper do Solar — extrai dados via AngularJS scope injection + API /procapi/.

    Fluxo principal:
    1. Navegar para /processo/listar/
    2. Buscar por número do processo
    3. Entrar na página do atendimento (#/eproc/{numero}/grau/1)
    4. Extrair dados do scope AngularJS (eproc.processo)
    5. Baixar documentos via /procapi/processo/{id}/documento/{doc_id}/
    """

    def __init__(self):
        self.settings = get_settings()
        self.auth = get_solar_auth_service()
        self._last_navigation_time: float = 0

    async def _rate_limit(self):
        """Respeita rate limiting entre navegações."""
        elapsed = time.time() - self._last_navigation_time
        delay = self.settings.solar_rate_limit_seconds
        if elapsed < delay:
            wait_time = delay - elapsed
            logger.debug("Rate limiting: waiting %.1fs", wait_time)
            await asyncio.sleep(wait_time)
        self._last_navigation_time = time.time()

    async def _navigate(self, url: str, wait_until: str = "networkidle"):
        """Navega para uma URL com rate limiting e auth check."""
        await self._rate_limit()
        page = await self.auth.get_page()
        await page.goto(url, wait_until=wait_until, timeout=30000)

        # Check se foi redirecionado para login
        if LOGIN["login_url_pattern"] in page.url:
            logger.warning("Session expired during navigation, re-authenticating...")
            await self.auth.ensure_authenticated()
            await page.goto(url, wait_until=wait_until, timeout=30000)

        return page

    async def consultar_processo(self, numero_processo: str) -> dict[str, Any]:
        """
        Consulta dados de um processo no Solar.

        Navega para a busca de processos, busca pelo número,
        e extrai dados via AngularJS scope.

        Args:
            numero_processo: Número do processo (formato CNJ ex: "8057518-39.2021.8.05.0039")

        Returns:
            Dados do processo incluindo classe, assunto, vara, comarca, partes
        """
        logger.info("Consultando processo: %s", numero_processo)

        page = await self.auth.get_page()

        try:
            # 1. Navegar para busca de processos
            search_url = f"{self.settings.solar_base_url}{URLS['processos_listar']}"
            await self._navigate(search_url)

            # 2. Preencher número e buscar
            # Usar AngularJS scope para busca programática
            await page.fill(SEARCH["search_input"], numero_processo)

            # Trigger AngularJS buscar via evaluate
            await page.evaluate("""() => {
                const scope = angular.element(document.querySelector('[ng-controller]')).scope();
                scope.$apply(() => {
                    scope.filtro.pagina = 0;
                    scope.buscar(0, true);
                });
            }""")

            # Aguardar resultado
            await page.wait_for_timeout(3000)

            # 3. Verificar se encontrou resultado
            result_count = await page.evaluate("""() => {
                const scope = angular.element(document.querySelector('[ng-controller]')).scope();
                return scope.filtro ? scope.filtro.total : 0;
            }""")

            if result_count == 0:
                logger.info("Processo não encontrado no Solar: %s", numero_processo)
                return {"found": False, "numero": numero_processo}

            # 4. Extrair dados do primeiro resultado da lista
            processo_data = await page.evaluate("""() => {
                const scope = angular.element(document.querySelector('[ng-controller]')).scope();
                if (!scope.processos || scope.processos.length === 0) return null;
                const p = scope.processos[0];
                return {
                    numero: p.numero || p.numero_puro,
                    grau: p.grau,
                    classe: p.classe || p.area_classe,
                    vara: p.vara,
                    comarca: p.comarca,
                    area: p.area,
                    partes: p.partes,
                    atendimento_numero: p.atendimento_numero,
                    atendimento_id: p.atendimento_id || p.atendimento,
                };
            }""")

            if not processo_data:
                logger.info("Processo encontrado mas sem dados: %s", numero_processo)
                return {"found": False, "numero": numero_processo}

            processo_data["found"] = True
            processo_data["numero"] = numero_processo

            logger.info(
                "Processo encontrado: %s | classe=%s atendimento=%s",
                numero_processo,
                processo_data.get("classe"),
                processo_data.get("atendimento_id"),
            )
            return processo_data

        except Exception as e:
            logger.error("Erro ao consultar processo %s: %s", numero_processo, e)
            await self._screenshot_error("consultar_processo", numero_processo)
            raise

    async def extrair_movimentacoes_eproc(
        self,
        numero_processo: str,
        atendimento_id: str | None = None,
        grau: int = 1,
    ) -> dict[str, Any]:
        """
        Extrai movimentações (eventos PJe) de um processo via aba PJE do Solar.

        Navega para /atendimento/{id}/#/eproc/{numero}/grau/{grau}
        e extrai dados do AngularJS scope: eproc.processo.eventos

        Args:
            numero_processo: Número do processo (formato CNJ)
            atendimento_id: ID do atendimento no Solar (se já conhecido)
            grau: Grau do processo (1 ou 2, default=1)

        Returns:
            Dict com: processo_data, eventos[], partes[], assuntos[], vinculados[]
        """
        logger.info("Extraindo movimentações PJe: %s (atendimento=%s)", numero_processo, atendimento_id)

        page = await self.auth.get_page()

        try:
            # Se não temos o atendimento_id, precisamos buscar primeiro
            if not atendimento_id:
                proc_data = await self.consultar_processo(numero_processo)
                if not proc_data.get("found"):
                    return {"found": False, "numero": numero_processo, "eventos": []}
                atendimento_id = proc_data.get("atendimento_id")
                if not atendimento_id:
                    logger.error("Atendimento ID não encontrado para processo %s", numero_processo)
                    return {"found": False, "numero": numero_processo, "eventos": []}

            # Navegar para a aba PJE do atendimento
            numero_limpo = numero_processo.replace("-", "").replace(".", "")
            eproc_url = (
                f"{self.settings.solar_base_url}"
                f"/atendimento/{atendimento_id}/"
                f"#/eproc/{numero_limpo}/grau/{grau}"
            )
            await self._navigate(eproc_url)

            # Aguardar carregamento dos dados PJe (pode demorar)
            await page.wait_for_timeout(5000)

            # Forçar atualização do processo (busca dados mais recentes do PJe)
            try:
                await page.evaluate("""() => {
                    const tableDiv = document.querySelector('#table');
                    if (tableDiv) {
                        const scope = angular.element(tableDiv).scope();
                        if (scope && scope.forcar_atulizacao) {
                            scope.$apply(() => scope.forcar_atulizacao());
                        }
                    }
                }""")
                await page.wait_for_timeout(8000)  # Atualização PJe é lenta
            except Exception as e:
                logger.debug("Forçar atualização falhou (ok se dados já carregados): %s", e)

            # Extrair dados completos do scope AngularJS
            eproc_data = await page.evaluate("""() => {
                const tableDiv = document.querySelector('#table');
                if (!tableDiv) return null;

                const scope = angular.element(tableDiv).scope();
                if (!scope || !scope.eproc || !scope.eproc.processo) return null;

                const proc = scope.eproc.processo;

                // Extrair eventos (movimentações)
                const eventos = (proc.eventos || []).map(evt => ({
                    id: evt.id,
                    numero: evt.numero,
                    data_protocolo: evt.data_protocolo,
                    descricao: evt.descricao,
                    descricao_amigavel: evt.descricao_amigavel,
                    descricao_complementar: evt.descricao_complementar,
                    tipo_local: evt.tipo_local,
                    tipo_nacional: evt.tipo_nacional,
                    usuario: evt.usuario,
                    defensoria: evt.defensoria,
                    // Documentos do evento
                    documentos: (evt.documentos || []).map(doc => ({
                        documento_id: doc.documento,
                        nome: doc.nome,
                        tipo: doc.tipo,
                        tipo_local: doc.tipo_local,
                        data_protocolo: doc.data_protocolo,
                        mimetype: doc.mimetype,
                        nivel_sigilo: doc.nivel_sigilo,
                        // Docs vinculados (sub-documentos)
                        vinculados: (doc.vinculados || []).map(v => ({
                            documento_id: v.documento,
                            nome: v.nome,
                            tipo: v.tipo,
                            mimetype: v.mimetype,
                        })),
                    })),
                }));

                // Extrair assuntos
                const assuntos = (proc.assuntos || []).map(a => ({
                    codigo: a.codigo,
                    descricao: a.descricao,
                    principal: a.principal,
                }));

                // Extrair partes
                const partes = (proc.partes || []).map(p => ({
                    nome: p.nome,
                    tipo: p.tipo,
                    sexo: p.sexo,
                    nascimento: p.nascimento,
                    municipio: p.municipio,
                    uf: p.uf,
                }));

                // Extrair processos vinculados
                const vinculados = (proc.vinculados || []).map(v => ({
                    vinculo: v.vinculo,
                    numero: v.numero,
                    localidade: v.localidade,
                    classe: v.classe,
                }));

                return {
                    found: true,
                    sucesso: scope.eproc.sucesso,
                    processo: {
                        numero: proc.numero,
                        classe: proc.classe,
                        localidade: proc.localidade,
                        orgao_julgador: proc.orgao_julgador,
                        competencia: proc.competencia,
                        grau: proc.grau,
                        area_de_vara: proc.area_de_vara,
                        valor_causa: proc.valor_causa,
                    },
                    eventos: eventos,
                    assuntos: assuntos,
                    partes: partes,
                    vinculados: vinculados,
                    total_eventos: eventos.length,
                };
            }""")

            if not eproc_data:
                logger.warning("Dados PJe não carregados para %s", numero_processo)
                return {"found": False, "numero": numero_processo, "eventos": []}

            logger.info(
                "Movimentações extraídas: %s | total=%d assuntos=%d partes=%d",
                numero_processo,
                eproc_data.get("total_eventos", 0),
                len(eproc_data.get("assuntos", [])),
                len(eproc_data.get("partes", [])),
            )
            return eproc_data

        except Exception as e:
            logger.error("Erro ao extrair movimentações %s: %s", numero_processo, e)
            await self._screenshot_error("movimentacoes_eproc", numero_processo)
            return {"found": False, "numero": numero_processo, "eventos": [], "error": str(e)}

    async def baixar_documento(
        self,
        numero_processo: str,
        documento_id: str,
        grau: int = 1,
    ) -> tuple[bytes, str, str]:
        """
        Baixa um documento PDF via API /procapi/ do Solar.

        URL: /procapi/processo/{numero_sem_pontos}{grau}/documento/{documento_id}/

        Args:
            numero_processo: Número do processo (formato CNJ)
            documento_id: ID do documento no PJe
            grau: Grau do processo (default=1)

        Returns:
            Tupla: (bytes_conteudo, nome_arquivo, mime_type)
        """
        logger.info("Baixando documento %s do processo %s", documento_id, numero_processo)
        await self._rate_limit()

        page = await self.auth.get_page()

        try:
            # Construir URL da API /procapi/
            doc_path = build_documento_url(numero_processo, documento_id, grau)
            full_url = f"{self.settings.solar_base_url}{doc_path}"

            # Navegar para o documento (abre PDF ou dispara download)
            response = await page.goto(full_url, wait_until="load", timeout=60000)

            if response and response.status == 200:
                # Tentar obter o conteúdo diretamente do response
                content = await response.body()

                # Determinar nome do arquivo e mime type
                content_type = response.headers.get("content-type", "application/pdf")
                content_disposition = response.headers.get("content-disposition", "")

                filename = f"doc_{documento_id}.pdf"
                if "filename=" in content_disposition:
                    import re
                    match = re.search(r'filename[*]?="?([^";]+)', content_disposition)
                    if match:
                        filename = match.group(1).strip('"')

                mime_type = content_type.split(";")[0].strip()

                logger.info(
                    "Documento baixado: %s (%d bytes, %s)",
                    filename, len(content), mime_type,
                )
                return content, filename, mime_type

            else:
                status = response.status if response else "no response"
                raise Exception(f"Download failed: status={status}")

        except Exception as e:
            logger.error("Erro ao baixar documento %s: %s", documento_id, e)
            raise

    async def baixar_autos_completos(
        self,
        numero_processo: str,
        atendimento_id: str | None = None,
        grau: int = 1,
    ) -> tuple[bytes, str] | None:
        """
        Baixa os autos completos (materialização) de um processo.
        Usa a função download_unificado do Solar.

        Args:
            numero_processo: Número do processo
            atendimento_id: ID do atendimento (opcional)
            grau: Grau do processo

        Returns:
            Tupla (bytes, filename) ou None
        """
        logger.info("Baixando autos completos: %s", numero_processo)

        page = await self.auth.get_page()

        try:
            # Se não estamos na página do eproc, navegar
            if atendimento_id:
                numero_limpo = numero_processo.replace("-", "").replace(".", "")
                eproc_url = (
                    f"{self.settings.solar_base_url}"
                    f"/atendimento/{atendimento_id}/"
                    f"#/eproc/{numero_limpo}/grau/{grau}"
                )
                await self._navigate(eproc_url)
                await page.wait_for_timeout(3000)

            # Trigger download_unificado via AngularJS
            numero_grau = format_numero_processo_grau(numero_processo, grau)

            async with page.expect_download(timeout=120000) as download_info:
                await page.evaluate(f"""() => {{
                    const scope = angular.element(document.querySelector('#table')).scope();
                    scope.$apply(() => scope.download_unificado({numero_grau}));
                }}""")

            download = await download_info.value
            filename = download.suggested_filename or f"autos_{numero_processo}.pdf"

            temp_path = await download.path()
            content = temp_path.read_bytes() if temp_path else b""

            logger.info("Autos completos baixados: %s (%d bytes)", filename, len(content))
            return content, filename

        except Exception as e:
            logger.error("Erro ao baixar autos %s: %s", numero_processo, e)
            return None

    async def listar_avisos_pendentes(self) -> list[dict[str, Any]]:
        """
        Lista avisos pendentes do painel Solar (intimações PJe/SEEU).

        Navega para /processo/intimacao/painel/ e extrai dados dos
        accordion panels de cada categoria.

        Returns:
            Lista de avisos: [{tipo, numero_processo, descricao, data_publicacao, prazo, lido}]
        """
        logger.info("Listando avisos pendentes...")

        try:
            # Navegar para painel de avisos
            avisos_url = f"{self.settings.solar_base_url}{URLS['avisos_painel']}"
            page = await self._navigate(avisos_url)
            await page.wait_for_timeout(3000)

            avisos = []

            # Iterar pelas categorias de avisos
            for codigo, nome in AVISOS["categorias"].items():
                panel_selector = f"#collapse_prateleiras{codigo}"

                try:
                    # Abrir accordion se fechado
                    toggle_selector = f'a[data-target="{panel_selector}"]'
                    toggle = await page.query_selector(toggle_selector)
                    if toggle:
                        # Verificar se tem itens (texto mostra count)
                        toggle_text = await toggle.text_content()
                        if toggle_text and "(0)" in toggle_text:
                            continue  # Pular categorias vazias

                        # Clicar para expandir
                        await toggle.click()
                        await page.wait_for_timeout(1000)

                    # Extrair avisos desta categoria
                    panel = await page.query_selector(panel_selector)
                    if not panel:
                        continue

                    # Extrair itens dentro do panel
                    items = await panel.query_selector_all("tr, .aviso-item, .list-group-item")
                    for item in items:
                        try:
                            text_content = await item.text_content()
                            if not text_content or text_content.strip() == "":
                                continue

                            aviso = {
                                "tipo": nome,
                                "categoria": codigo,
                                "descricao": text_content.strip()[:200],
                                "lido": False,
                            }

                            # Tentar extrair número do processo do texto
                            import re
                            proc_match = re.search(
                                r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}",
                                text_content,
                            )
                            if proc_match:
                                aviso["numero_processo"] = proc_match.group()

                            avisos.append(aviso)
                        except Exception:
                            pass

                except Exception as e:
                    logger.debug("Erro ao processar categoria %s: %s", nome, e)

            logger.info("Avisos pendentes: %d", len(avisos))
            return avisos

        except Exception as e:
            logger.error("Erro ao listar avisos: %s", e)
            return []

    async def _screenshot_error(self, operation: str, context: str = ""):
        """Salva screenshot para debugging de erros."""
        try:
            page = self.auth._page
            if page:
                filename = f"/tmp/solar_error_{operation}_{int(time.time())}.png"
                await page.screenshot(path=filename)
                logger.info("Debug screenshot: %s (context=%s)", filename, context)
        except Exception:
            pass

    @staticmethod
    def is_ready() -> bool:
        """
        Verifica se o scraper está pronto.
        Com a abordagem AngularJS + /procapi/, não depende mais de CSS selectors.
        """
        return True  # Seletores mapeados na discovery


# Singleton
_solar_scraper_service: SolarScraperService | None = None


def get_solar_scraper_service() -> SolarScraperService:
    """Retorna singleton do SolarScraperService."""
    global _solar_scraper_service
    if _solar_scraper_service is None:
        _solar_scraper_service = SolarScraperService()
    return _solar_scraper_service
