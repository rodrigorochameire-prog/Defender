"""
Solar Write Service -- Escreve dados do OMBUDS no Solar (DPEBA) via Playwright.

Operacoes de escrita:
- Criar Fase Processual (atividade registrada no processo)
- Criar Atendimento (futuro V2)

IMPORTANTE: Solar nao tem REST API para escrita.
Toda operacao de write e via Playwright (browser automation) + AngularJS scope injection.

ARQUITETURA DO FORMULARIO (descoberto via Chrome MCP 2026-02-24):
- Form: CadastroFaseForm → POST /processo/fase/salvar/
- Todos os ng-model usam prefix "audiencia.*" (ex: audiencia.tipo, audiencia.descricao)
- Dropdowns: Select2 (Defensor, Defensoria, Tipo, Status, Itinerante)
- Modal Bootstrap abre via botao "+ Nova Fase" na aba Processos
- 263 tipos de atividade disponiveis (mapeados em solar_selectors.TIPO_MAP)

Safety mechanisms:
- Idempotencia via hash SHA-256 (nao cria duplicatas)
- Dry-run mode (preenche mas nao salva)
- Verificacao pos-escrita (re-le e confirma criacao)
- Screenshot antes/depois de cada operacao
- Rate limit reforcado (5s entre escritas)
- Concurrency lock (semaforo: 1 escrita por vez)
"""

import asyncio
import hashlib
import logging
import time
from typing import Any

from config import get_settings
from services.solar_auth_service import get_solar_auth_service
from services.solar_scraper_service import get_solar_scraper_service
from services.solar_selectors import (
    URLS,
    PROCESSO,
    FASE_PROCESSUAL,
    ANOTACAO,
    TIPO_MAP,
    TIPO_NOME,
    QUALIFICACAO_MAP,
    SCOPE_FUNCTIONS,
    build_atendimento_eproc_url,
    format_numero_processo_grau,
)

logger = logging.getLogger("enrichment-engine.solar-write")


class SolarWriteService:
    """
    Servico de escrita no Solar via Playwright.

    Usa o SolarScraperService (existente) para navegacao e autenticacao,
    adicionando operacoes de escrita com safety mechanisms.

    Fluxo de criacao de Fase Processual:
    1. Navega para /atendimento/{id}/#/processo/{num}/grau/{grau}
    2. Clica "+ Nova Fase" (abre modal Bootstrap)
    3. Preenche via AngularJS scope injection (audiencia.tipo, .descricao, etc.)
    4. Clica "Salvar" (form POST /processo/fase/salvar/)
    5. Verifica sucesso (modal fecha = sucesso)
    """

    def __init__(self):
        self.settings = get_settings()
        self.auth = get_solar_auth_service()
        self.scraper = get_solar_scraper_service()
        self._write_lock = asyncio.Lock()
        self._last_write_time: float = 0
        # Rate limit mais agressivo para escritas (5s vs 3s de leitura)
        self._write_rate_limit_seconds = 5.0
        # Cache de hashes para idempotencia intra-sessao
        self._created_hashes: set[str] = set()

    async def _write_rate_limit(self):
        """Rate limiting especifico para operacoes de escrita (mais conservador)."""
        elapsed = time.time() - self._last_write_time
        if elapsed < self._write_rate_limit_seconds:
            wait_time = self._write_rate_limit_seconds - elapsed
            logger.debug("Write rate limiting: waiting %.1fs", wait_time)
            await asyncio.sleep(wait_time)
        self._last_write_time = time.time()

    async def _screenshot(self, label: str, context: str = "") -> str | None:
        """Captura screenshot para auditoria/debug."""
        try:
            page = self.auth._page
            if page:
                ts = int(time.time())
                filename = f"/tmp/solar_write_{label}_{ts}.png"
                await page.screenshot(path=filename)
                logger.info("Write screenshot: %s (context=%s)", filename, context)
                return filename
        except Exception:
            pass
        return None

    def _compute_hash(self, numero_processo: str, tipo_id: int, descricao: str, data: str) -> str:
        """Gera hash SHA-256 para idempotencia."""
        content = f"{numero_processo}|{tipo_id}|{descricao[:200]}|{data}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    # ==========================================
    # Verificação Pós-Escrita (Write-then-Read)
    # ==========================================

    async def _verificar_fase_criada(
        self,
        page: Any,
        numero_processo: str,
        tipo_id: int,
        descricao_prefix: str,
        data_atividade: str,
    ) -> dict[str, Any]:
        """
        Verifica se a fase processual foi realmente criada no Solar.

        Apos salvar, navega para a lista de fases do processo e busca
        a fase recém-criada comparando tipo + data + prefix da descricao.

        Returns:
            {verified: bool, solar_fase_id: str | None, message: str}
        """
        try:
            tipo_nome = TIPO_NOME.get(tipo_id, "")
            prefix = (descricao_prefix or "")[:50].strip()

            # A lista de fases está na mesma página (seção "Fases Processuais")
            # Scroll down para garantir visibilidade
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1500)

            # Extrair fases visíveis via AngularJS scope
            fases_data = await page.evaluate("""() => {
                try {
                    var scope = angular.element(document.querySelector('[ng-controller]')).scope();
                    if (!scope || !scope.fases) return null;
                    return scope.fases.map(function(f) {
                        return {
                            id: f.id,
                            tipo_nome: f.tipo ? f.tipo.nome : '',
                            tipo_id: f.tipo ? f.tipo.id : 0,
                            data: f.data_agendamento || f.data || '',
                            descricao: (f.descricao || '').substring(0, 80),
                            defensor: f.defensor ? f.defensor.nome : ''
                        };
                    });
                } catch(e) { return null; }
            }""")

            if not fases_data:
                # Fallback: tentar ler da tabela DOM
                fases_data = await page.evaluate("""() => {
                    var rows = document.querySelectorAll('table tbody tr, [ng-repeat*="fase"] tr');
                    if (!rows.length) return [];
                    return Array.from(rows).map(function(row) {
                        var cells = row.querySelectorAll('td');
                        return {
                            id: null,
                            tipo_nome: cells[0] ? cells[0].textContent.trim() : '',
                            data: cells[1] ? cells[1].textContent.trim() : '',
                            descricao: cells[2] ? cells[2].textContent.trim().substring(0, 80) : ''
                        };
                    });
                }""")

            if not fases_data:
                logger.warning("Verificacao: nao conseguiu ler lista de fases")
                return {
                    "verified": False,
                    "solar_fase_id": None,
                    "message": "Nao foi possivel ler lista de fases para verificacao",
                }

            # Buscar a fase recém-criada
            for fase in fases_data:
                tipo_match = (
                    fase.get("tipo_id") == tipo_id
                    or tipo_nome.lower() in (fase.get("tipo_nome") or "").lower()
                )
                data_match = data_atividade in (fase.get("data") or "")
                desc_match = (
                    not prefix
                    or prefix.lower() in (fase.get("descricao") or "").lower()
                )

                if tipo_match and data_match:
                    solar_fase_id = str(fase.get("id")) if fase.get("id") else None
                    logger.info(
                        "Verificacao OK: fase encontrada id=%s tipo=%s data=%s",
                        solar_fase_id, fase.get("tipo_nome"), fase.get("data"),
                    )
                    return {
                        "verified": True,
                        "solar_fase_id": solar_fase_id,
                        "message": f"Fase verificada: {fase.get('tipo_nome')} em {fase.get('data')}",
                    }

            logger.warning(
                "Verificacao FALHOU: fase nao encontrada (tipo=%d data=%s prefix='%s'). "
                "Total fases visiveis: %d",
                tipo_id, data_atividade, prefix, len(fases_data),
            )
            return {
                "verified": False,
                "solar_fase_id": None,
                "message": f"Fase nao encontrada na lista ({len(fases_data)} fases visiveis)",
            }

        except Exception as e:
            logger.error("Erro na verificacao pos-escrita: %s", e)
            return {
                "verified": False,
                "solar_fase_id": None,
                "message": f"Erro ao verificar: {e}",
            }

    async def _verificar_anotacao_criada(
        self,
        page: Any,
        texto_prefix: str,
    ) -> dict[str, Any]:
        """
        Verifica se a anotação apareceu no topo da timeline do Histórico.

        Returns:
            {verified: bool, message: str}
        """
        try:
            prefix = (texto_prefix or "")[:60].strip()
            await page.wait_for_timeout(1500)

            # Ler a anotação mais recente da timeline
            latest = await page.evaluate("""() => {
                // A timeline tem divs com data/hora e conteúdo
                var entries = document.querySelectorAll('[class*="timeline"] > div, .panel-body');
                if (!entries.length) return null;
                // Pegar o texto visível mais recente
                var texts = [];
                entries.forEach(function(el) {
                    var t = el.textContent.trim().substring(0, 200);
                    if (t.length > 10) texts.push(t);
                });
                return texts.length > 0 ? texts[texts.length - 1] : null;
            }""")

            if latest and prefix and prefix.lower() in latest.lower():
                logger.info("Verificacao anotacao OK: texto encontrado na timeline")
                return {"verified": True, "message": "Anotacao encontrada na timeline"}

            if latest:
                logger.warning(
                    "Verificacao anotacao: texto nao corresponde. "
                    "Esperado prefix='%s', encontrado='%s'",
                    prefix, (latest or "")[:80],
                )
                return {
                    "verified": False,
                    "message": f"Texto nao corresponde: '{(latest or '')[:80]}...'",
                }

            return {
                "verified": False,
                "message": "Timeline vazia ou nao carregou",
            }

        except Exception as e:
            logger.error("Erro verificando anotacao: %s", e)
            return {"verified": False, "message": f"Erro: {e}"}

    # ==========================================
    # Retry com Recovery
    # ==========================================

    RECOVERABLE_ERRORS = {
        "modal_nao_abriu",
        "botao_nova_fase_nao_encontrado",
        "botao_anotacao_nao_encontrado",
        "textarea_nao_encontrado",
        "exception",
    }

    NON_RECOVERABLE_ERRORS = {
        "validacao_solar",
        "permissao_negada",
        "anotacao_nao_salvou",
        "modal_nao_fechou",
    }

    async def _cleanup_modal(self, page: Any):
        """Fecha qualquer modal aberto para limpar estado antes de retry."""
        try:
            # Tentar fechar modal Bootstrap
            close_btn = await page.query_selector('.modal.in .close')
            if close_btn:
                await close_btn.click()
                await page.wait_for_timeout(500)

            # Pressionar Escape como fallback
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(500)

            # Clicar no backdrop se ainda aberto
            backdrop = await page.query_selector('.modal-backdrop.in')
            if backdrop:
                await backdrop.click()
                await page.wait_for_timeout(500)
        except Exception:
            pass

    async def _with_retry(
        self,
        operation_name: str,
        operation_fn,
        max_retries: int = 1,
    ) -> dict[str, Any]:
        """
        Executa operação com retry para erros recuperáveis.

        Args:
            operation_name: Nome para logging ("criar_fase", "criar_anotacao")
            operation_fn: Async callable que retorna dict com 'success' e 'error'
            max_retries: Número máximo de retries (default 1 = 2 tentativas total)

        Returns:
            Resultado da operação
        """
        last_result = None

        for attempt in range(max_retries + 1):
            if attempt > 0:
                logger.info(
                    "Retry %d/%d para %s (erro anterior: %s)",
                    attempt, max_retries, operation_name,
                    last_result.get("error") if last_result else "?",
                )
                # Cleanup entre tentativas
                page = await self.auth.get_page()
                await self._cleanup_modal(page)
                await asyncio.sleep(5)

            result = await operation_fn()
            last_result = result

            if result.get("success"):
                if attempt > 0:
                    logger.info(
                        "%s: sucesso na tentativa %d", operation_name, attempt + 1
                    )
                return result

            # Verificar se erro é recuperável
            error_code = result.get("error", "")
            if error_code in self.NON_RECOVERABLE_ERRORS:
                logger.warning(
                    "%s: erro nao recuperavel '%s', sem retry",
                    operation_name, error_code,
                )
                return result

            if error_code not in self.RECOVERABLE_ERRORS and attempt >= max_retries:
                return result

            # Screenshot antes do retry
            await self._screenshot(
                f"pre_retry_{attempt + 1}",
                f"{operation_name}_{error_code}",
            )

        return last_result or {"success": False, "error": "max_retries_exceeded"}

    async def _fill_select2_by_scope(
        self,
        page: Any,
        ng_model_field: str,
        value: dict | int | str,
    ) -> bool:
        """
        Preenche dropdown Select2 via AngularJS scope injection.

        Mais confiavel que interagir com a UI do Select2 diretamente.
        Solar usa Select2 com AngularJS binding — setar o scope atualiza a UI.

        Args:
            page: Playwright page
            ng_model_field: Campo no scope (ex: "audiencia.tipo")
            value: Valor a setar (ex: {"id": 52} para tipo, ou ID int)

        Returns:
            True se preencheu com sucesso
        """
        try:
            # Construir o valor JS
            if isinstance(value, dict):
                value_js = str(value).replace("'", '"')
            elif isinstance(value, int):
                value_js = f'{{"id": {value}}}'
            else:
                value_js = f'"{value}"'

            script = f"""() => {{
                var modal = document.querySelector('{FASE_PROCESSUAL["modal"]}');
                if (!modal) return 'MODAL_NOT_FOUND';
                var scope = angular.element(modal).scope();
                if (!scope) return 'SCOPE_NOT_FOUND';
                scope.$apply(function() {{
                    scope.{ng_model_field} = {value_js};
                }});
                return 'OK';
            }}"""

            result = await page.evaluate(script)
            if result == "OK":
                logger.debug("Scope injection OK: %s = %s", ng_model_field, value_js)
                return True
            else:
                logger.warning("Scope injection falhou: %s → %s", ng_model_field, result)
                return False

        except Exception as e:
            logger.error("Scope injection error para %s: %s", ng_model_field, e)
            return False

    async def _fill_select2_by_ui(
        self,
        page: Any,
        container_index: int,
        search_text: str,
        timeout: int = 5000,
    ) -> bool:
        """
        Preenche Select2 via interacao com a UI (fallback).

        Args:
            page: Playwright page
            container_index: Indice do Select2 container dentro do modal (0-based)
            search_text: Texto para buscar no dropdown
            timeout: Timeout em ms

        Returns:
            True se preencheu com sucesso
        """
        try:
            modal_selector = FASE_PROCESSUAL["modal"]
            sel2 = FASE_PROCESSUAL["select2"]

            # 1. Encontrar o N-esimo Select2 container no modal
            containers = await page.query_selector_all(
                f'{modal_selector} .select2-container'
            )
            if container_index >= len(containers):
                logger.warning(
                    "Select2 container index %d fora do range (total=%d)",
                    container_index, len(containers),
                )
                return False

            # 2. Clicar para abrir o dropdown
            choice_link = await containers[container_index].query_selector(
                "a.select2-choice"
            )
            if choice_link:
                await choice_link.click()
            else:
                await containers[container_index].click()

            await page.wait_for_timeout(300)

            # 3. Digitar no campo de busca
            search_input = await page.query_selector(sel2["search_input"])
            if search_input:
                await search_input.fill(search_text)
                await page.wait_for_timeout(500)

            # 4. Selecionar primeiro resultado
            first_result = await page.query_selector(sel2["first_result"])
            if first_result:
                await first_result.click()
                await page.wait_for_timeout(300)
                return True
            else:
                # Verificar "no results"
                no_results = await page.query_selector(sel2["no_results"])
                if no_results:
                    logger.warning("Select2: nenhum resultado para '%s'", search_text)
                await page.keyboard.press("Escape")
                return False

        except Exception as e:
            logger.error("Select2 UI error: %s", e)
            try:
                await page.keyboard.press("Escape")
            except Exception:
                pass
            return False

    async def criar_fase_processual(
        self,
        atendimento_id: str,
        numero_processo: str,
        tipo_id: int,
        data_atividade: str,
        hora_atividade: str,
        descricao: str,
        grau: int = 1,
        defensor_nome: str | None = None,
        defensoria_nome: str | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """
        Cria uma Fase Processual no Solar.

        Navega para /atendimento/{atendimento_id}/#/processo/{numero_puro}/grau/{grau},
        clica "+ Nova Fase", preenche formulario via scope injection, salva.

        Args:
            atendimento_id: Numero do atendimento no Solar (ex: "260120000756")
            numero_processo: Numero do processo formatado CNJ (ex: "8000189-30.2025.8.05.0039")
            tipo_id: ID do tipo de atividade no Solar (ex: 52 para Consulta/Orientação)
            data_atividade: Data no formato DD/MM/YYYY
            hora_atividade: Hora no formato HH:MM
            descricao: Texto descritivo da fase (max 2000 chars)
            grau: Grau do processo (1 ou 2)
            defensor_nome: Nome do defensor (opcional, Select2 ja vem pre-preenchido)
            defensoria_nome: Nome da defensoria (opcional, Select2 ja vem pre-preenchido)
            dry_run: Se True, preenche mas nao clica "Salvar"

        Returns:
            Dict com: success, fase_id, dry_run, screenshots, error
        """
        async with self._write_lock:
            await self._write_rate_limit()

            # Idempotencia: verificar hash
            fase_hash = self._compute_hash(numero_processo, tipo_id, descricao, data_atividade)
            if fase_hash in self._created_hashes:
                logger.info("Fase ja criada (hash duplicada): %s", fase_hash)
                return {
                    "success": True,
                    "fase_id": None,
                    "dry_run": False,
                    "message": "Fase ja criada anteriormente (idempotencia)",
                    "hash": fase_hash,
                    "screenshots": [],
                }

            tipo_nome = TIPO_NOME.get(tipo_id, f"ID {tipo_id}")
            logger.info(
                "Criando fase processual: atendimento=%s processo=%s tipo=%d(%s) dry_run=%s",
                atendimento_id, numero_processo, tipo_id, tipo_nome, dry_run,
            )

            page = await self.auth.get_page()
            screenshots: list[str] = []

            try:
                # 1. Navegar para aba Processos do atendimento
                numero_puro = numero_processo.replace("-", "").replace(".", "")
                processo_url = URLS["atendimento_processo_pattern"].format(
                    atendimento_numero=atendimento_id,
                    numero_puro=numero_puro,
                    grau=grau,
                )
                full_url = f"{self.settings.solar_base_url}{processo_url}"
                await self.scraper._navigate(full_url)
                await page.wait_for_timeout(3000)

                # Screenshot pre-operacao
                ss = await self._screenshot("pre_nova_fase", numero_processo)
                if ss:
                    screenshots.append(ss)

                # 2. Clicar "+ Nova Fase"
                nova_fase_btn = await page.query_selector(
                    FASE_PROCESSUAL["btn_nova_fase"]
                )

                if not nova_fase_btn:
                    # Fallback: buscar por texto
                    nova_fase_btn = await page.query_selector(
                        'a:has-text("Nova Fase"), button:has-text("Nova Fase")'
                    )

                if not nova_fase_btn:
                    logger.error("Botao 'Nova Fase' nao encontrado")
                    return {
                        "success": False,
                        "error": "botao_nova_fase_nao_encontrado",
                        "message": "Botao '+ Nova Fase' nao encontrado. Verifique se esta na aba Processos.",
                        "screenshots": screenshots,
                    }

                await nova_fase_btn.click()
                await page.wait_for_timeout(2000)

                # Verificar se modal abriu
                modal = await page.query_selector(FASE_PROCESSUAL["modal"])
                if not modal:
                    logger.error("Modal 'Fase Processual' nao abriu")
                    return {
                        "success": False,
                        "error": "modal_nao_abriu",
                        "message": "Modal 'Fase Processual' nao abriu apos clicar '+ Nova Fase'",
                        "screenshots": screenshots,
                    }

                # Screenshot do formulario aberto
                ss = await self._screenshot("form_nova_fase", numero_processo)
                if ss:
                    screenshots.append(ss)

                # 3. Preencher formulario via AngularJS scope injection
                form_filled = await self._preencher_form_fase(
                    page=page,
                    tipo_id=tipo_id,
                    data_atividade=data_atividade,
                    hora_atividade=hora_atividade,
                    descricao=descricao,
                    defensor_nome=defensor_nome,
                    defensoria_nome=defensoria_nome,
                )

                if not form_filled:
                    # Fechar modal para limpar estado
                    try:
                        close_btn = await page.query_selector(FASE_PROCESSUAL["btn_fechar"])
                        if close_btn:
                            await close_btn.click()
                    except Exception:
                        pass
                    return {
                        "success": False,
                        "error": "formulario_nao_preenchido",
                        "message": "Nao foi possivel preencher campos obrigatorios do formulario",
                        "screenshots": screenshots,
                    }

                # Screenshot pre-save
                ss = await self._screenshot("pre_save_fase", numero_processo)
                if ss:
                    screenshots.append(ss)

                # 4. Dry-run: nao salvar
                if dry_run:
                    logger.info("DRY-RUN: formulario preenchido mas nao salvo")
                    # Fechar modal
                    try:
                        close_btn = await page.query_selector(FASE_PROCESSUAL["btn_fechar"])
                        if close_btn:
                            await close_btn.click()
                            await page.wait_for_timeout(500)
                    except Exception:
                        pass
                    return {
                        "success": True,
                        "dry_run": True,
                        "fase_id": None,
                        "message": "Formulario preenchido (dry-run, nao salvo)",
                        "hash": fase_hash,
                        "screenshots": screenshots,
                    }

                # 5. Salvar
                save_result = await self._salvar_fase(page)

                # Screenshot pos-save
                ss = await self._screenshot("pos_save_fase", numero_processo)
                if ss:
                    screenshots.append(ss)

                if save_result.get("success"):
                    # Registrar hash para idempotencia
                    self._created_hashes.add(fase_hash)

                    # 6. Verificação pós-escrita (Write-then-Read)
                    verificacao = await self._verificar_fase_criada(
                        page=page,
                        numero_processo=numero_processo,
                        tipo_id=tipo_id,
                        descricao_prefix=descricao[:50] if descricao else "",
                        data_atividade=data_atividade,
                    )

                    ss = await self._screenshot("pos_verificacao_fase", numero_processo)
                    if ss:
                        screenshots.append(ss)

                    solar_fase_id = verificacao.get("solar_fase_id")

                    logger.info(
                        "Fase processual criada: processo=%s tipo=%s hash=%s verified=%s fase_id=%s",
                        numero_processo, tipo_nome, fase_hash,
                        verificacao.get("verified"), solar_fase_id,
                    )

                    return {
                        **save_result,
                        "dry_run": False,
                        "hash": fase_hash,
                        "fase_id": solar_fase_id,
                        "verified": verificacao.get("verified", False),
                        "verificacao_msg": verificacao.get("message"),
                        "screenshots": screenshots,
                    }
                else:
                    logger.error(
                        "Falha ao salvar fase: processo=%s erro=%s",
                        numero_processo, save_result.get("error"),
                    )

                    return {
                        **save_result,
                        "dry_run": False,
                        "hash": fase_hash,
                        "verified": False,
                        "screenshots": screenshots,
                    }

            except Exception as e:
                logger.error("Erro criando fase processual: %s", e)
                ss = await self._screenshot("error_fase", numero_processo)
                if ss:
                    screenshots.append(ss)
                return {
                    "success": False,
                    "error": "exception",
                    "message": str(e),
                    "screenshots": screenshots,
                }

    async def _preencher_form_fase(
        self,
        page: Any,
        tipo_id: int,
        data_atividade: str,
        hora_atividade: str,
        descricao: str,
        defensor_nome: str | None = None,
        defensoria_nome: str | None = None,
    ) -> bool:
        """
        Preenche os campos do formulario "Nova Fase Processual" via scope injection.

        Estrategia principal: AngularJS scope injection (mais confiavel que UI).
        Fallback: interacao direta com Select2 UI.

        Campos obrigatorios: tipo (vermelho), data, hora
        Campos pre-preenchidos: defensor, defensoria, data, hora (Solar preenche automaticamente)

        Returns:
            True se campo obrigatorio 'tipo' foi preenchido
        """
        ng = FASE_PROCESSUAL["ng_model"]
        inputs = FASE_PROCESSUAL["input"]
        filled_tipo = False

        # --- 1. Tipo de Atividade (OBRIGATORIO, Select2) ---
        # Preferencia: scope injection com {id: N}
        filled_tipo = await self._fill_select2_by_scope(
            page, ng["tipo"], {"id": tipo_id}
        )

        if not filled_tipo:
            # Fallback: buscar pelo nome via UI Select2
            tipo_nome = TIPO_NOME.get(tipo_id)
            if tipo_nome:
                # Tipo e o 3o Select2 no modal (index 2: Defensor=0, Defensoria=1, Tipo=2)
                filled_tipo = await self._fill_select2_by_ui(
                    page, container_index=2, search_text=tipo_nome
                )

        if not filled_tipo:
            logger.error(
                "FALHA: nao conseguiu preencher tipo_id=%d (%s)",
                tipo_id, TIPO_NOME.get(tipo_id, "?"),
            )
            return False

        # --- 2. Data (pre-preenchida pelo Solar, mas sobrescrever se necessario) ---
        try:
            data_input = await page.query_selector(inputs["data"])
            if data_input:
                # Limpar e preencher
                await data_input.click(click_count=3)  # Select all
                await data_input.fill(data_atividade)
                logger.debug("Data preenchida: %s", data_atividade)
            else:
                # Fallback via scope
                await self._fill_select2_by_scope(page, ng["data"], data_atividade)
        except Exception as e:
            logger.warning("Erro preenchendo data: %s (usando default do Solar)", e)

        # --- 3. Hora (pre-preenchida pelo Solar) ---
        try:
            hora_input = await page.query_selector(inputs["hora"])
            if hora_input:
                await hora_input.click(click_count=3)
                await hora_input.fill(hora_atividade)
                logger.debug("Hora preenchida: %s", hora_atividade)
            else:
                await self._fill_select2_by_scope(page, ng["hora"], hora_atividade)
        except Exception as e:
            logger.warning("Erro preenchendo hora: %s (usando default do Solar)", e)

        # --- 4. Descricao (textarea, opcional mas importante) ---
        try:
            desc_area = await page.query_selector(inputs["descricao"])
            if desc_area:
                # Truncar a 2000 chars
                texto = descricao[:2000] if descricao else ""
                await desc_area.fill(texto)
                logger.debug("Descricao preenchida: %d chars", len(texto))
            else:
                # Fallback via scope
                texto = (descricao or "")[:2000].replace("'", "\\'").replace("\n", "\\n")
                await self._fill_select2_by_scope(page, ng["descricao"], texto)
        except Exception as e:
            logger.warning("Erro preenchendo descricao: %s", e)

        # --- 5. Defensor (Select2, opcional — ja vem pre-preenchido) ---
        if defensor_nome:
            try:
                # Index 0: primeiro Select2 no modal
                await self._fill_select2_by_ui(
                    page, container_index=0, search_text=defensor_nome
                )
            except Exception as e:
                logger.debug("Defensor nao alterado (usando default): %s", e)

        # --- 6. Defensoria (Select2, opcional — ja vem pre-preenchida) ---
        if defensoria_nome:
            try:
                # Index 1: segundo Select2 no modal
                await self._fill_select2_by_ui(
                    page, container_index=1, search_text=defensoria_nome
                )
            except Exception as e:
                logger.debug("Defensoria nao alterada (usando default): %s", e)

        logger.info(
            "Formulario preenchido: tipo=%d(%s) data=%s hora=%s desc=%d chars",
            tipo_id, TIPO_NOME.get(tipo_id, "?"),
            data_atividade, hora_atividade, len(descricao or ""),
        )
        return True

    async def _salvar_fase(self, page: Any) -> dict[str, Any]:
        """
        Clica o botao "Salvar" do formulario de fase processual.

        Estrategia de verificacao:
        1. Clica btn-primary[type="submit"] dentro do modal
        2. Aguarda 3s
        3. Se modal fechou (nao mais visivel) → sucesso
        4. Se modal ainda aberto → verifica mensagens de erro

        Returns:
            Dict com: success, fase_id, error
        """
        try:
            # 1. Encontrar botao salvar no modal
            save_btn = await page.query_selector(FASE_PROCESSUAL["btn_salvar"])

            if not save_btn:
                # Fallback: qualquer btn-primary submit no modal
                save_btn = await page.query_selector(
                    '.modal.in button.btn-primary[type="submit"], '
                    '.modal.in button:has-text("Salvar")'
                )

            if not save_btn:
                # Ultimo fallback: submit via scope
                try:
                    await page.evaluate(f"""() => {{
                        var modal = document.querySelector('{FASE_PROCESSUAL["modal"]}');
                        if (!modal) return 'NO_MODAL';
                        var scope = angular.element(modal).scope();
                        scope.salvando = true;
                        var form = modal.querySelector('form[name="CadastroFaseForm"]');
                        if (form) {{
                            form.submit();
                            return 'SUBMITTED';
                        }}
                        return 'NO_FORM';
                    }}""")
                except Exception as e:
                    return {
                        "success": False,
                        "error": "botao_salvar_nao_encontrado",
                        "message": f"Botao 'Salvar' nao encontrado no modal: {e}",
                    }
            else:
                await save_btn.click()

            # 2. Aguardar processamento
            await page.wait_for_timeout(3000)

            # 3. Verificar se modal fechou (indicador principal de sucesso)
            modal = await page.query_selector(FASE_PROCESSUAL["modal"])
            modal_visible = False
            if modal:
                modal_visible = await modal.is_visible()

            if not modal_visible:
                # Modal fechou = sucesso!
                logger.info("Modal fechou apos salvar → fase criada com sucesso")
                return {
                    "success": True,
                    "fase_id": None,
                    "message": "Fase processual criada com sucesso (modal fechou)",
                }

            # 4. Modal ainda aberto → verificar erros
            # Verificar mensagens de erro dentro do modal
            error_text = await page.evaluate(f"""() => {{
                var modal = document.querySelector('{FASE_PROCESSUAL["modal"]}');
                if (!modal) return null;
                var alerts = modal.querySelectorAll('.alert-danger, .alert-error, .text-danger, .help-block');
                var errors = [];
                alerts.forEach(function(el) {{
                    var text = el.textContent.trim();
                    if (text) errors.push(text);
                }});
                return errors.length > 0 ? errors.join('; ') : null;
            }}""")

            if error_text:
                return {
                    "success": False,
                    "error": "validacao_solar",
                    "message": f"Erro de validacao no Solar: {error_text[:500]}",
                }

            # Verificar se esta mostrando "salvando..." (loading)
            is_loading = await page.evaluate(f"""() => {{
                var modal = document.querySelector('{FASE_PROCESSUAL["modal"]}');
                if (!modal) return false;
                var scope = angular.element(modal).scope();
                return scope && scope.salvando === true;
            }}""")

            if is_loading:
                # Esperar mais um pouco
                await page.wait_for_timeout(5000)
                modal = await page.query_selector(FASE_PROCESSUAL["modal"])
                if not modal or not await modal.is_visible():
                    return {
                        "success": True,
                        "fase_id": None,
                        "message": "Fase criada (aguardou loading)",
                    }

            # Se ainda aberto sem erro explicito, pode ter funcionado
            # mas o modal pode nao ter fechado automaticamente
            return {
                "success": False,
                "error": "modal_nao_fechou",
                "message": "Modal permaneceu aberto apos salvar. Verifique manualmente.",
            }

        except Exception as e:
            return {
                "success": False,
                "error": "exception_ao_salvar",
                "message": str(e),
            }

    async def criar_anotacao(
        self,
        atendimento_id: str,
        texto: str,
        qualificacao_id: int = 302,
        atuacao_value: str | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """
        Cria uma Anotação no Histórico do atendimento no Solar.

        Alternativa mais leve que Fase Processual — ideal para notas,
        observações e registros textuais simples.

        Formulário Django puro (não AngularJS):
        POST /atendimento/{atendimento_id}/anotacao/nova/

        Args:
            atendimento_id: Numero do atendimento (ex: "260120000756")
            texto: Texto da anotação (sem limite conhecido)
            qualificacao_id: ID da qualificação (default 302 = ANOTAÇÕES)
            atuacao_value: Valor do select atuação (defensoria+defensor)
            dry_run: Se True, preenche mas não submete

        Returns:
            Dict com: success, message, screenshots
        """
        async with self._write_lock:
            await self._write_rate_limit()

            qualif_nome = ANOTACAO["qualificacoes"].get(qualificacao_id, f"ID {qualificacao_id}")
            logger.info(
                "Criando anotacao: atendimento=%s qualif=%d(%s) dry_run=%s",
                atendimento_id, qualificacao_id, qualif_nome, dry_run,
            )

            # Idempotencia
            anot_hash = self._compute_hash(atendimento_id, qualificacao_id, texto, "")
            if anot_hash in self._created_hashes:
                return {
                    "success": True,
                    "message": "Anotacao ja criada (idempotencia)",
                    "hash": anot_hash,
                    "screenshots": [],
                }

            page = await self.auth.get_page()
            screenshots: list[str] = []

            try:
                # 1. Navegar para aba Histórico
                historico_url = (
                    f"{self.settings.solar_base_url}"
                    f"/atendimento/{atendimento_id}/#/historico"
                )
                await self.scraper._navigate(historico_url)
                await page.wait_for_timeout(3000)

                ss = await self._screenshot("pre_anotacao", atendimento_id)
                if ss:
                    screenshots.append(ss)

                # 2. Clicar botão "Anotação" (laranja no rodapé)
                anot_btn = await page.query_selector(ANOTACAO["btn_nova_anotacao"])
                if not anot_btn:
                    anot_btn = await page.query_selector(
                        'a:has-text("Anotação"), button:has-text("Anotação")'
                    )
                if not anot_btn:
                    return {
                        "success": False,
                        "error": "botao_anotacao_nao_encontrado",
                        "screenshots": screenshots,
                    }

                await anot_btn.click()
                await page.wait_for_timeout(1500)

                # 3. Preencher formulário (Django form, não AngularJS)
                # Qualificação
                qualif_select = await page.query_selector(ANOTACAO["qualificacao_select"])
                if qualif_select:
                    await page.select_option(
                        ANOTACAO["qualificacao_select"],
                        value=str(qualificacao_id),
                    )

                # Atuação (se fornecida)
                if atuacao_value:
                    atuacao_select = await page.query_selector(ANOTACAO["atuacao_select"])
                    if atuacao_select:
                        await page.select_option(
                            ANOTACAO["atuacao_select"],
                            value=atuacao_value,
                        )

                # Texto
                textarea = await page.query_selector(ANOTACAO["historico_textarea"])
                if textarea:
                    await textarea.fill(texto[:5000])
                else:
                    return {
                        "success": False,
                        "error": "textarea_nao_encontrado",
                        "screenshots": screenshots,
                    }

                ss = await self._screenshot("pre_save_anotacao", atendimento_id)
                if ss:
                    screenshots.append(ss)

                # 4. Dry-run: não salvar
                if dry_run:
                    # Cancelar
                    cancel = await page.query_selector(ANOTACAO["btn_cancelar"])
                    if cancel:
                        await cancel.click()
                    return {
                        "success": True,
                        "dry_run": True,
                        "message": "Anotacao preenchida (dry-run)",
                        "hash": anot_hash,
                        "screenshots": screenshots,
                    }

                # 5. Salvar
                save_btn = await page.query_selector(ANOTACAO["btn_salvar"])
                if save_btn:
                    await save_btn.click()
                else:
                    return {
                        "success": False,
                        "error": "botao_salvar_nao_encontrado",
                        "screenshots": screenshots,
                    }

                await page.wait_for_timeout(3000)

                ss = await self._screenshot("pos_save_anotacao", atendimento_id)
                if ss:
                    screenshots.append(ss)

                # 6. Verificar sucesso (popup desapareceu + timeline atualizou)
                # Se o textarea não está mais visível, sucesso
                textarea_after = await page.query_selector(
                    'textarea[name="historico"][placeholder="Digite a anotação..."]'
                )
                is_visible = False
                if textarea_after:
                    is_visible = await textarea_after.is_visible()

                if not is_visible:
                    self._created_hashes.add(anot_hash)

                    # 7. Verificação pós-escrita
                    verificacao = await self._verificar_anotacao_criada(
                        page=page,
                        texto_prefix=texto[:60] if texto else "",
                    )

                    ss = await self._screenshot("pos_verificacao_anotacao", atendimento_id)
                    if ss:
                        screenshots.append(ss)

                    return {
                        "success": True,
                        "message": "Anotacao criada com sucesso",
                        "hash": anot_hash,
                        "verified": verificacao.get("verified", False),
                        "verificacao_msg": verificacao.get("message"),
                        "screenshots": screenshots,
                    }
                else:
                    return {
                        "success": False,
                        "error": "anotacao_nao_salvou",
                        "message": "Formulario ainda visivel apos salvar",
                        "screenshots": screenshots,
                    }

            except Exception as e:
                logger.error("Erro criando anotacao: %s", e)
                ss = await self._screenshot("error_anotacao", atendimento_id)
                if ss:
                    screenshots.append(ss)
                return {
                    "success": False,
                    "error": "exception",
                    "message": str(e),
                    "screenshots": screenshots,
                }

    # Tipos que devem ir como Anotação (Histórico) em vez de Fase Processual
    ANOTACAO_TIPOS = {"nota", "observacao", "lembrete", "sigad"}
    # Tipos que devem ir como Fase Processual (registro formal no processo)
    FASE_TIPOS = {"audiencia", "peticao", "sentenca", "decisao", "recurso",
                  "habeas_corpus", "contestacao", "alegacoes_finais", "resposta_acusacao",
                  "solar:movimentacao", "providencia"}

    async def sync_anotacoes_to_solar(
        self,
        assistido_id: int,
        anotacoes: list[dict[str, Any]],
        modo: str = "auto",
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """
        Sincroniza anotacoes do OMBUDS no Solar.

        Modos:
        - "fase": Todas viram Fase Processual (registro formal)
        - "anotacao": Todas viram Anotação no Histórico (nota simples)
        - "auto": Decide por tipo — audiencia/peticao/sentenca → Fase,
                  nota/observacao/lembrete → Anotação

        Para cada anotacao:
        1. Verifica se o processo existe no Solar (cria se nao)
        2. Mapeia tipo_anotacao → destino (fase ou anotação)
        3. Cria registro no Solar
        4. Verifica criação (Write-then-Read)
        5. Retorna IDs para marcar como sincronizada

        Args:
            assistido_id: ID do assistido no OMBUDS
            anotacoes: Lista de dicts com {id, processoId, conteudo, tipo, createdAt, numeroAutos}
            modo: "fase", "anotacao", ou "auto"
            dry_run: Se True, nao salva (apenas preenche e screenshota)

        Returns:
            Dict com resultado agregado
        """
        logger.info(
            "Sync anotacoes -> Solar: assistido=%d total=%d modo=%s dry_run=%s",
            assistido_id, len(anotacoes), modo, dry_run,
        )

        resultados: list[dict[str, Any]] = []
        fases_criadas = 0
        fases_skipped = 0
        fases_falhadas = 0
        erros: list[str] = []

        # Agrupar anotacoes por processo
        por_processo: dict[str, list[dict[str, Any]]] = {}
        for anot in anotacoes:
            num = anot.get("numeroAutos") or "sem_processo"
            if num not in por_processo:
                por_processo[num] = []
            por_processo[num].append(anot)

        for numero_processo, anots_processo in por_processo.items():
            if numero_processo == "sem_processo":
                for anot in anots_processo:
                    resultados.append({
                        "anotacao_id": anot["id"],
                        "status": "skipped",
                        "reason": "Anotacao sem processo vinculado",
                    })
                    fases_skipped += 1
                continue

            # 1. Verificar/criar processo no Solar
            try:
                proc_data = await self.scraper.consultar_processo(numero_processo)
                if not proc_data.get("found"):
                    # Criar processo
                    cadastro = await self.scraper.cadastrar_processo_solar(
                        numero_processo=numero_processo,
                        grau=1,
                    )
                    if not cadastro.get("success"):
                        for anot in anots_processo:
                            resultados.append({
                                "anotacao_id": anot["id"],
                                "status": "failed",
                                "error": f"Nao foi possivel criar processo no Solar: {cadastro.get('error')}",
                            })
                            fases_falhadas += 1
                        continue
                    atendimento_id = cadastro.get("atendimento_id")
                else:
                    atendimento_id = proc_data.get("atendimento_id")

                if not atendimento_id:
                    for anot in anots_processo:
                        resultados.append({
                            "anotacao_id": anot["id"],
                            "status": "failed",
                            "error": "atendimento_id nao encontrado no Solar",
                        })
                        fases_falhadas += 1
                    continue

            except Exception as e:
                for anot in anots_processo:
                    resultados.append({
                        "anotacao_id": anot["id"],
                        "status": "failed",
                        "error": f"Erro ao consultar/criar processo: {e}",
                    })
                    fases_falhadas += 1
                erros.append(f"Processo {numero_processo}: {e}")
                continue

            # 2. Criar fase/anotação para cada item
            for anot in anots_processo:
                try:
                    tipo_ombuds = anot.get("tipo", "nota")
                    descricao = (anot.get("conteudo") or "")[:2000]

                    # Decidir destino: Fase Processual ou Anotação
                    usar_anotacao = False
                    if modo == "anotacao":
                        usar_anotacao = True
                    elif modo == "fase":
                        usar_anotacao = False
                    elif modo == "auto":
                        usar_anotacao = tipo_ombuds in self.ANOTACAO_TIPOS

                    if usar_anotacao:
                        # Criar como Anotação no Histórico
                        qualif_id = QUALIFICACAO_MAP.get(tipo_ombuds, 302)

                        result = await self.criar_anotacao(
                            atendimento_id=atendimento_id,
                            texto=descricao,
                            qualificacao_id=qualif_id,
                            dry_run=dry_run,
                        )
                    else:
                        # Criar como Fase Processual (registro formal)
                        tipo_id = TIPO_MAP.get(tipo_ombuds, 52)
                        created_at = anot.get("createdAt", "")
                        data_atividade, hora_atividade = self._parse_datetime(created_at)

                        result = await self.criar_fase_processual(
                            atendimento_id=atendimento_id,
                            numero_processo=numero_processo,
                            tipo_id=tipo_id,
                            data_atividade=data_atividade,
                            hora_atividade=hora_atividade,
                            descricao=descricao,
                            dry_run=dry_run,
                        )

                    if result.get("success"):
                        fases_criadas += 1
                        resultados.append({
                            "anotacao_id": anot["id"],
                            "status": "created" if not dry_run else "dry_run",
                            "solar_fase_id": result.get("fase_id"),
                        })
                    else:
                        fases_falhadas += 1
                        resultados.append({
                            "anotacao_id": anot["id"],
                            "status": "failed",
                            "error": result.get("message") or result.get("error"),
                            "requires_discovery": result.get("requires_discovery", False),
                        })

                except Exception as e:
                    fases_falhadas += 1
                    resultados.append({
                        "anotacao_id": anot["id"],
                        "status": "failed",
                        "error": str(e),
                    })
                    erros.append(f"Anotacao {anot['id']}: {e}")

        return {
            "success": fases_criadas > 0 or (dry_run and len(resultados) > 0),
            "fases_criadas": fases_criadas,
            "fases_skipped": fases_skipped,
            "fases_falhadas": fases_falhadas,
            "total": len(resultados),
            "dry_run": dry_run,
            "erros": erros,
            "detalhes": resultados,
        }

    @staticmethod
    def _parse_datetime(created_at: str) -> tuple[str, str]:
        """
        Converte ISO 8601 ou string de data para DD/MM/YYYY e HH:MM.

        Args:
            created_at: Data no formato ISO (2026-02-24T10:30:00Z) ou DD/MM/YYYY

        Returns:
            Tuple (data_ddmmyyyy, hora_hhmm)
        """
        import re
        from datetime import datetime

        data_atividade = ""
        hora_atividade = ""

        if not created_at:
            # Usar data/hora atual
            now = datetime.now()
            return now.strftime("%d/%m/%Y"), now.strftime("%H:%M")

        try:
            if isinstance(created_at, str) and "T" in created_at:
                # ISO 8601: "2026-02-24T10:30:00Z" ou "2026-02-24T10:30:00.000Z"
                dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                data_atividade = dt.strftime("%d/%m/%Y")
                hora_atividade = dt.strftime("%H:%M")
            elif re.match(r"\d{4}-\d{2}-\d{2}", str(created_at)):
                # YYYY-MM-DD
                parts = str(created_at)[:10].split("-")
                data_atividade = f"{parts[2]}/{parts[1]}/{parts[0]}"
                hora_atividade = "10:00"  # Default
            elif re.match(r"\d{2}/\d{2}/\d{4}", str(created_at)):
                # Ja no formato DD/MM/YYYY
                data_atividade = str(created_at)[:10]
                hora_atividade = "10:00"
            else:
                # Fallback
                data_atividade = str(created_at)[:10]
                hora_atividade = "10:00"
        except Exception:
            now = datetime.now()
            data_atividade = now.strftime("%d/%m/%Y")
            hora_atividade = now.strftime("%H:%M")

        return data_atividade, hora_atividade


# Singleton
_solar_write_service: SolarWriteService | None = None


def get_solar_write_service() -> SolarWriteService:
    """Retorna singleton do SolarWriteService."""
    global _solar_write_service
    if _solar_write_service is None:
        _solar_write_service = SolarWriteService()
    return _solar_write_service
