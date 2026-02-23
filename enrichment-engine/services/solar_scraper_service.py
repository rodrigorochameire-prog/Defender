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

    async def _navigate(self, url: str, wait_until: str = "domcontentloaded"):
        """
        Navega para uma URL com rate limiting e auth check.

        NOTA: Solar é SPA AngularJS — nunca atinge 'networkidle'.
        Usar 'domcontentloaded' e aguardar dados via wait_for_timeout ou
        wait_for_function separadamente.
        """
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

        Navega para /processo/listar/ e usa AngularJS scope injection para buscar
        pelo número — NÃO usa page.fill() pois isso não atualiza o modelo Angular.
        O ng-model correto é filtro.filtro (descoberto via discovery 2026-02-22).

        Args:
            numero_processo: Número do processo (formato CNJ ex: "8057518-39.2021.8.05.0039")

        Returns:
            Dados do processo incluindo classe, assunto, vara, comarca, partes, atendimento_id
        """
        logger.info("Consultando processo: %s", numero_processo)

        page = await self.auth.get_page()

        try:
            # 1. Navegar para busca de processos
            search_url = f"{self.settings.solar_base_url}{URLS['processos_listar']}"
            await self._navigate(search_url)

            # Aguardar controller Angular carregar (SPA precisa de tempo)
            await page.wait_for_timeout(2000)

            # 2. Buscar via scope Angular — CORRETO: setar filtro.filtro, não preencher DOM
            # page.fill() só atualiza o DOM, não o modelo Angular.
            # O ng-model do campo de busca é 'filtro.filtro' (verificado via discovery).
            num_escaped = numero_processo.replace("'", "\\'")
            await page.evaluate(f"""() => {{
                const el = document.querySelector('[ng-controller]');
                if (!el) return;
                const scope = angular.element(el).scope();
                scope.$apply(function() {{
                    // ng-model = filtro.filtro (campo único de busca de número/nome/CPF)
                    scope.filtro.filtro = '{num_escaped}';
                    scope.buscar(0, true);
                }});
            }}""")

            # Aguardar resultado da busca (chamada AJAX)
            await page.wait_for_timeout(4000)

            # 3. Verificar total e extrair dados via scope
            result = await page.evaluate("""() => {
                const el = document.querySelector('[ng-controller]');
                if (!el) return {total: 0, processos: []};
                const scope = angular.element(el).scope();
                if (!scope) return {total: 0, processos: []};

                // O total pode estar em scope.filtro.total ou scope.total
                const total = (scope.filtro && scope.filtro.total != null)
                    ? scope.filtro.total
                    : (scope.total || 0);

                // A lista pode estar em scope.processos ou scope.filtro.processos
                const lista = scope.processos || (scope.filtro && scope.filtro.processos) || [];

                return {
                    total: total,
                    processos: lista.map(p => ({
                        // Campos do objeto processo no scope Solar
                        numero:           p.numero || p.numero_puro || p.numero_processo,
                        grau:             p.grau,
                        classe:           p.classe || p.area_classe || p.tipo_processo,
                        vara:             p.vara,
                        comarca:          p.comarca,
                        area:             p.area,
                        assunto:          p.assunto,
                        partes:           p.partes,
                        // ID do atendimento Solar — necessário para navegar à aba PJE
                        atendimento_id:   p.atendimento_id
                                          || p.atendimento
                                          || (p.atendimentos && p.atendimentos[0])
                                          || null,
                        atendimento_numero: p.atendimento_numero || null,
                    }))
                };
            }""")

            total = result.get("total", 0)
            processos_lista = result.get("processos", [])

            if total == 0 or not processos_lista:
                logger.info("Processo não encontrado no Solar: %s", numero_processo)
                return {"found": False, "numero": numero_processo}

            # Pegar o primeiro resultado (busca por número exacto deve retornar 1)
            p = processos_lista[0]
            p["found"] = True
            p["numero"] = numero_processo

            logger.info(
                "Processo encontrado: %s | classe=%s atendimento_id=%s",
                numero_processo,
                p.get("classe"),
                p.get("atendimento_id"),
            )
            return p

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

        Estratégia em duas camadas:
        1. PRIMÁRIA: ler dados do scope AngularJS (estruturado, sem depender de DOM)
        2. FALLBACK: iterar linhas visíveis das tabelas de cada categoria

        O painel /processo/intimacao/painel/ usa Bootstrap accordion por categoria
        (URG, INT, CIT, NOT, VIS, PTA, FCO). Cada categoria tem uma tabela com
        colunas: Nº, Processo, Vara, Assistido, Data Expedição, Prazo, Ciência.

        Returns:
            Lista de avisos: [{tipo, categoria, numero_processo, descricao,
                               data_publicacao, prazo, lido}]
        """
        import re

        logger.info("Listando avisos pendentes...")

        try:
            # Navegar para painel de avisos
            avisos_url = f"{self.settings.solar_base_url}{URLS['avisos_painel']}"
            page = await self._navigate(avisos_url)

            # Aguardar carregamento do Angular (painel tem filtros e accordion)
            await page.wait_for_timeout(4000)

            avisos: list[dict[str, Any]] = []

            # ── CAMADA 1: Scope AngularJS ──────────────────────────────────────
            # O Solar provavelmente guarda os avisos em scope.prateleiras ou
            # scope.intimacoes agrupados por código de categoria.
            scope_data = await page.evaluate("""() => {
                try {
                    // Tentar encontrar scope com dados de intimações
                    const candidates = [
                        document.querySelector('[ng-controller]'),
                        document.querySelector('[ng-app]'),
                        document.body,
                    ];
                    for (const el of candidates) {
                        if (!el) continue;
                        const scope = angular.element(el).scope();
                        if (!scope) continue;
                        // Procurar chaves que contenham arrays de intimações
                        const keys = Object.keys(scope).filter(k =>
                            !k.startsWith('$') && Array.isArray(scope[k])
                        );
                        // Tentar chaves conhecidas
                        const known = ['prateleiras', 'intimacoes', 'avisos',
                                       'pendentes', 'processos', 'items'];
                        for (const k of known) {
                            if (scope[k] && Array.isArray(scope[k]) && scope[k].length > 0) {
                                return {source: k, data: scope[k]};
                            }
                        }
                        // Se não achou por nome, retornar todas as chaves arrays
                        const arrays = {};
                        for (const k of keys) {
                            if (scope[k].length > 0) arrays[k] = scope[k].slice(0, 3);
                        }
                        if (Object.keys(arrays).length > 0) {
                            return {source: 'unknown', keys: Object.keys(arrays), sample: arrays};
                        }
                    }
                    return null;
                } catch(e) {
                    return {error: String(e)};
                }
            }""")

            if scope_data and scope_data.get("source") not in ("unknown", None) and "data" in scope_data:
                # Dados estruturados encontrados no scope — extrair
                raw_items = scope_data["data"]
                for item in raw_items:
                    if not isinstance(item, dict):
                        continue
                    tipo = item.get("tipo") or item.get("categoria") or "Intimação"
                    aviso = {
                        "tipo": tipo,
                        "categoria": item.get("codigo") or item.get("categoria_codigo", ""),
                        "numero_processo": item.get("numero_processo") or item.get("processo"),
                        "descricao": item.get("descricao") or item.get("ato") or item.get("assunto", ""),
                        "data_publicacao": item.get("data_expedicao") or item.get("data_publicacao"),
                        "prazo": item.get("prazo") or item.get("data_prazo"),
                        "lido": bool(item.get("lido") or item.get("ciencia")),
                    }
                    # Limpar strings vazias
                    if aviso["descricao"]:
                        avisos.append(aviso)
                logger.info("Avisos via scope Angular: %d", len(avisos))
                if avisos:
                    return avisos
            elif scope_data:
                logger.debug("Scope retornou (não estruturado): %s", str(scope_data)[:200])

            # ── CAMADA 2: DOM — accordion por categoria ────────────────────────
            # Iterar cada categoria, expandir accordion, ler linhas da tabela.
            # A tabela tem colunas: Processo | Vara | Assistido | Exp. | Prazo | ...
            logger.info("Fallback: extraindo via DOM accordion")

            # Regex para número de processo CNJ
            PROC_RE = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")
            # Regex para datas dd/mm/aaaa
            DATE_RE = re.compile(r"\d{2}/\d{2}/\d{4}")

            for codigo, nome in AVISOS["categorias"].items():
                panel_id = f"collapse_prateleiras{codigo}"

                try:
                    # Bootstrap accordion: o toggle tem href=#panel_id ou data-target=#panel_id
                    toggle = await page.query_selector(
                        f'a[href="#{panel_id}"], a[data-target="#{panel_id}"]'
                    )

                    if toggle:
                        # Normalizar texto: remover espaços/newlines extras
                        toggle_text = " ".join((await toggle.text_content() or "").split())
                        # Pular categorias sem itens (texto contém "(0)")
                        if "(0)" in toggle_text:
                            logger.debug("Categoria %s vazia, pulando", codigo)
                            continue

                        logger.debug("Expandindo categoria %s: %s", codigo, toggle_text)

                        # Expandir se o panel estiver colapsado
                        panel_el = await page.query_selector(f"#{panel_id}")
                        is_collapsed = panel_el and not await panel_el.is_visible()
                        if is_collapsed or not panel_el:
                            await toggle.click()
                            await page.wait_for_timeout(800)

                    # Buscar tabela dentro do panel
                    panel_el = await page.query_selector(f"#{panel_id}")
                    if not panel_el:
                        # Tentar sem o id (alguns acordeons usam classes)
                        panel_el = await page.query_selector(
                            f'.panel[data-code="{codigo}"], .prateleira-{codigo}'
                        )
                    if not panel_el:
                        continue

                    # Ler todas as linhas <tr> excluindo cabeçalho (thead tr)
                    rows = await panel_el.query_selector_all("tbody tr")
                    if not rows:
                        # Fallback: qualquer tr que não seja cabeçalho
                        rows = await panel_el.query_selector_all("tr:not(:first-child)")

                    for row in rows:
                        try:
                            cells = await row.query_selector_all("td")
                            if len(cells) < 2:
                                continue

                            # Extrair texto de todas as células
                            cell_texts = []
                            for cell in cells:
                                t = (await cell.text_content() or "").strip()
                                cell_texts.append(t)

                            row_text = " ".join(cell_texts)
                            if not row_text.strip():
                                continue

                            # Extrair número do processo CNJ do texto completo
                            proc_match = PROC_RE.search(row_text)
                            numero_processo = proc_match.group() if proc_match else None

                            # Extrair datas (primeira = expedição, última = prazo)
                            datas = DATE_RE.findall(row_text)

                            # Construir descrição limpa a partir das células
                            # Colunas típicas: Nº | Processo | Vara | Assistido | Exp. | Prazo
                            descricao_parts = [t for t in cell_texts if t and t != "–" and t != "-"]
                            descricao = " | ".join(descricao_parts[:4])  # Primeiras 4 células

                            aviso = {
                                "tipo": nome,
                                "categoria": codigo,
                                "numero_processo": numero_processo,
                                "descricao": descricao[:300],
                                "data_publicacao": datas[0] if datas else None,
                                "prazo": datas[-1] if len(datas) > 1 else None,
                                "lido": False,
                            }
                            avisos.append(aviso)

                        except Exception as row_err:
                            logger.debug("Erro ao processar linha de %s: %s", codigo, row_err)

                except Exception as cat_err:
                    logger.debug("Erro ao processar categoria %s: %s", nome, cat_err)

            logger.info("Avisos extraídos via DOM: %d", len(avisos))
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

    async def buscar_processos_por_nome(self, nome: str) -> list[dict[str, Any]]:
        """
        Lista todos os processos vinculados a um defensor pelo nome.

        Reutiliza a mesma busca de consultar_processo() — o campo filtro.filtro
        aceita nome, número ou CPF indistintamente (campo único de busca do Solar).

        Args:
            nome: Nome do defensor ex: "rodrigo rocha meire"

        Returns:
            Lista de processos com: numero, grau, classe, vara, comarca, area, atendimento_id
        """
        logger.info("Buscando processos por nome: '%s'", nome)

        page = await self.auth.get_page()
        search_url = f"{self.settings.solar_base_url}{URLS['processos_listar']}"
        await self._navigate(search_url)
        await page.wait_for_timeout(2000)

        nome_escaped = nome.replace("'", "\\'")
        await page.evaluate(f"""() => {{
            const el = document.querySelector('[ng-controller]');
            if (!el) return;
            const scope = angular.element(el).scope();
            scope.$apply(function() {{
                scope.filtro.filtro = '{nome_escaped}';
                scope.buscar(0, true);
            }});
        }}""")
        await page.wait_for_timeout(4000)

        result = await page.evaluate("""() => {
            const el = document.querySelector('[ng-controller]');
            if (!el) return {total: 0, processos: []};
            const scope = angular.element(el).scope();
            if (!scope) return {total: 0, processos: []};
            const total = (scope.filtro && scope.filtro.total != null)
                ? scope.filtro.total
                : (scope.total || 0);
            const lista = scope.processos || (scope.filtro && scope.filtro.processos) || [];
            return { total, processos: lista.map(p => ({
                numero: p.numero || p.numero_puro || p.numero_processo,
                grau: p.grau,
                classe: p.classe || p.area_classe,
                vara: p.vara,
                comarca: p.comarca,
                area: p.area,
                atendimento_id: p.atendimento_id || p.atendimento
                                || (p.atendimentos && p.atendimentos[0]) || null,
            })) };
        }""")

        processos = result.get("processos", [])
        total = result.get("total", 0)

        # Paginação: se total > len(lista), buscar páginas seguintes
        pagina = 1
        while len(processos) < total and pagina < 50:  # Safety: max 50 pages
            await page.evaluate(f"""() => {{
                const el = document.querySelector('[ng-controller]');
                if (!el) return;
                const scope = angular.element(el).scope();
                scope.$apply(function() {{ scope.buscar({pagina}, false); }});
            }}""")
            await page.wait_for_timeout(3000)
            page_result = await page.evaluate("""() => {
                const el = document.querySelector('[ng-controller]');
                if (!el) return [];
                const scope = angular.element(el).scope();
                const lista = scope.processos || (scope.filtro && scope.filtro.processos) || [];
                return lista.map(p => ({
                    numero: p.numero || p.numero_puro || p.numero_processo,
                    grau: p.grau,
                    classe: p.classe || p.area_classe,
                    vara: p.vara,
                    comarca: p.comarca,
                    area: p.area,
                    atendimento_id: p.atendimento_id || p.atendimento
                                    || (p.atendimentos && p.atendimentos[0]) || null,
                }));
            }""")
            if not page_result:
                break
            processos.extend(page_result)
            pagina += 1

        logger.info("Busca por nome '%s': %d processos (total esperado: %d)", nome, len(processos), total)
        return processos

    async def cadastrar_processo_solar(
        self,
        numero_processo: str,
        grau: int = 1,
    ) -> dict[str, Any]:
        """
        Cadastra processo no Solar via botão 'Novo Processo Judicial'.

        Fluxo:
        1. Verificar se processo já existe (consultar_processo)
        2. Se não existe: setar filtro.filtro + filtro.numero, chamar buscar()
        3. Chamar scope.novo_processo({numero, grau}) via Angular
        4. Aguardar redirect para /atendimento/{id}/ e capturar atendimento_id

        Args:
            numero_processo: Número do processo (formato CNJ)
            grau: Grau do processo (1 ou 2)

        Returns:
            Dict com: success, cadastrado, ja_existia, numero, atendimento_id, url_pos_cadastro
        """
        logger.info("Cadastrando processo no Solar: %s (grau=%d)", numero_processo, grau)

        # 1. Verificar se já existe
        existente = await self.consultar_processo(numero_processo)
        if existente.get("found"):
            logger.info("Processo %s já existe no Solar", numero_processo)
            return {
                "success": True,
                "cadastrado": False,
                "ja_existia": True,
                "numero": numero_processo,
                "atendimento_id": existente.get("atendimento_id"),
                "url_pos_cadastro": None,
            }

        # 2. Navegar para busca e setar filtros
        page = await self.auth.get_page()
        search_url = f"{self.settings.solar_base_url}{URLS['processos_listar']}"
        await self._navigate(search_url)
        await page.wait_for_timeout(2000)

        import re as _re
        num_escaped = numero_processo.replace("'", "\\'")
        await page.evaluate(f"""() => {{
            const el = document.querySelector('[ng-controller]');
            if (!el) return;
            const scope = angular.element(el).scope();
            scope.$apply(function() {{
                scope.filtro.filtro = '{num_escaped}';
                scope.filtro.numero = '{num_escaped}';
                scope.buscar(0, true);
            }});
        }}""")
        await page.wait_for_timeout(3000)

        # 3. Chamar novo_processo() via scope Angular
        try:
            await page.evaluate(f"""() => {{
                const el = document.querySelector('[ng-controller]');
                if (!el) throw new Error('ng-controller not found');
                const scope = angular.element(el).scope();
                if (!scope) throw new Error('scope not found');
                scope.$apply(function() {{
                    scope.novo_processo({{numero: '{num_escaped}', grau: {grau}}});
                }});
            }}""")
        except Exception as e:
            logger.warning("scope.novo_processo() falhou (%s), tentando fallback DOM", e)
            # Fallback: clicar botão DOM
            btn = await page.query_selector(
                'button[ng-click*="novo_processo"], a[ng-click*="limpar_busca"]'
            )
            if btn:
                await btn.click()
            else:
                raise Exception(f"Botão 'Novo Processo Judicial' não encontrado. Erro original: {e}")

        # 4. Aguardar redirect para /atendimento/{id}/
        await page.wait_for_timeout(5000)
        current_url = page.url
        atendimento_id = None
        m = _re.search(r"/atendimento/(\d+)/", current_url)
        if m:
            atendimento_id = m.group(1)

        # Screenshot para debug (a tela pode exibir formulário de preenchimento)
        await self._screenshot_error("cadastro_processo", numero_processo)

        logger.info(
            "Cadastro processo %s: atendimento=%s url=%s",
            numero_processo, atendimento_id, current_url,
        )
        return {
            "success": bool(atendimento_id),
            "cadastrado": bool(atendimento_id),
            "ja_existia": False,
            "numero": numero_processo,
            "atendimento_id": atendimento_id,
            "url_pos_cadastro": current_url,
        }

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
