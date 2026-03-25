"""
PJe Download Service — Baixa PDFs de processos e organiza no Google Drive local.

Estratégia (baseada no mapeamento DOM do PJe 1g TJ-BA, 2026-03-25):
1. Conecta ao Chrome via CDP (sessão PJe já autenticada)
2. Na página do processo, clica "Download autos do processo"
3. Seleciona cronologia ASC (crescente)
4. Clica botão Download → PJe gera PDF em background
5. Navega para Área de Download, aguarda processamento
6. Baixa o PDF gerado
7. Move para ~/My Drive/1 - Defensoria 9ª DP/{atribuição}/{assistido}/

Seletores chave (PJe 1g TJ-BA, calibrados 2026-03-25):
- Cronologia: #navbar:cbCronologia
- Botão download: #navbar:j_id312
- Área de download: /pje/AreaDeDownload/listView.seam
- Polo passivo (nome assistido): #poloPassivo tbody tr a

IMPORTANTE: Funciona apenas localmente — requer Chrome/Chromium com --remote-debugging-port=9222.
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
import shutil
import time
from pathlib import Path
from typing import Any

from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from config import get_settings

logger = logging.getLogger("enrichment-engine.pje-download")

# Base URL do PJe TJ-BA
PJE_BASE_URL = "https://pje.tjba.jus.br"
PJE_DOWNLOAD_AREA_URL = f"{PJE_BASE_URL}/pje/AreaDeDownload/listView.seam"

# Google Drive local base path
DRIVE_BASE = Path.home() / "My Drive" / "1 - Defensoria 9ª DP"

# Mapeamento atribuição → pasta do Drive
# Suporta tanto texto livre (vindo do PJe) quanto enums do banco (Drizzle schema)
ATRIBUICAO_FOLDER_MAP: dict[str, str] = {
    # Texto livre (PJe)
    "tribunal do júri": "Processos - Júri",
    "júri": "Processos - Júri",
    "juri": "Processos - Júri",
    "execução penal": "Processos - Execução Penal",
    "execucao penal": "Processos - Execução Penal",
    "violência doméstica": "Processos - VVD",
    "violencia domestica": "Processos - VVD",
    "vvd": "Processos - VVD",
    "grupo do júri": "Processos - Grupo do juri",
    "grupo do juri": "Processos - Grupo do juri",
    "substituição criminal": "Processos - Substituição criminal",
    "substituicao criminal": "Processos - Substituição criminal",
    "criminal": "Processos",
    # Enums do banco (atribuicaoEnum no Drizzle schema)
    "juri_camacari": "Processos - Júri",
    "vvd_camacari": "Processos - VVD",
    "execucao_penal": "Processos - Execução Penal",
    "substituicao": "Processos - Substituição criminal",
    "substituicao_civel": "Processos - Substituição cível",
    "substituição cível": "Processos - Substituição cível",
    "substituicao civel": "Processos - Substituição cível",
    "cível": "Processos - Substituição cível",
    "civel": "Processos - Substituição cível",
    "grupo_juri": "Processos - Grupo do juri",
    # Peticionamento integrado
    "peticionamento integrado": "Processos - Peticionamento integrado",
    "peticionamento_integrado": "Processos - Peticionamento integrado",
}

# Diretório padrão de downloads do Chrome
CHROME_DOWNLOADS = Path.home() / "Downloads"

# Polling config
DOWNLOAD_POLL_INTERVAL = 5  # seconds
DOWNLOAD_MAX_WAIT = 300  # 5 minutes max wait for PJe to generate PDF


def _resolve_drive_folder(atribuicao: str) -> Path:
    """Resolve atribuição para pasta do Drive."""
    key = atribuicao.strip().lower()
    folder_name = ATRIBUICAO_FOLDER_MAP.get(key, "Processos")
    return DRIVE_BASE / folder_name


# Regex para número CNJ: 0000000-00.0000.0.00.0000
_CNJ_RE = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")

# === Classificação de processos: principal vs acessório ===
# Apenas processos PRINCIPAIS justificam subpastas separadas.
# Acessórios ficam na mesma pasta da Ação Penal correspondente.
# Classes que SEMPRE criam subpasta própria (eixo principal)
CLASSES_PRINCIPAIS: set[str] = {
    "ação penal",
    "ação penal de competência do júri",
    "execução da pena",
    "execução penal",
}

# MPU é especial: principal quando sozinha, acessória quando há AP no mesmo caso
CLASSES_MPU: set[str] = {
    "medidas protetivas de urgência",
}

# Classes que NUNCA criam subpasta — ficam junto da AP correspondente
CLASSES_ACESSORIAS: set[str] = {
    "inquérito policial",
    "auto de prisão em flagrante",
    "carta precatória criminal",
    "pedido de prisão preventiva",
    "pedido de medida cautelar",
    "habeas corpus",
    "mandado de segurança criminal",
}

# Prefixo para nome de subpasta: "AP 8000640-...", "IP 8000387-...", etc.
CLASSE_PREFIXO_MAP: dict[str, str] = {
    "ação penal": "AP",
    "ação penal de competência do júri": "AP",
    "medidas protetivas de urgência": "MPU",
    "execução da pena": "EP",
    "execução penal": "EP",
    "inquérito policial": "IP",
    "auto de prisão em flagrante": "APF",
    "carta precatória criminal": "CP",
    "pedido de prisão preventiva": "PP",
    "pedido de medida cautelar": "MC",
    "habeas corpus": "HC",
    "mandado de segurança criminal": "MS",
}


def _classe_prefixo(classe: str | None) -> str:
    """Retorna o prefixo para o nome da subpasta (ex: AP, IP, MPU)."""
    if not classe:
        return ""
    return CLASSE_PREFIXO_MAP.get(classe.strip().lower(), "")


def _folder_name_for_processo(numero_processo: str, classe: str | None) -> str:
    """Gera nome da subpasta com prefixo: 'AP 8000640-...' ou só '8000640-...'."""
    prefixo = _classe_prefixo(classe)
    if prefixo:
        return f"{prefixo} {numero_processo}"
    return numero_processo


def _is_classe_principal(classe: str | None) -> bool:
    """Verifica se a classe processual é de um processo principal (Ação Penal, EP)."""
    if not classe:
        return False
    return classe.strip().lower() in CLASSES_PRINCIPAIS


def _is_classe_mpu(classe: str | None) -> bool:
    """Verifica se é MPU (principal sozinha, acessória se houver AP)."""
    if not classe:
        return False
    return classe.strip().lower() in CLASSES_MPU


def _is_classe_acessoria(classe: str | None) -> bool:
    """Verifica se a classe processual é de um processo acessório (IP, APF, etc.)."""
    if not classe:
        return False
    return classe.strip().lower() in CLASSES_ACESSORIAS


def _find_ap_folder(assistido_folder: Path) -> Path | None:
    """Encontra subpasta de Ação Penal dentro da pasta do assistido (prefixo 'AP ')."""
    for d in assistido_folder.iterdir():
        if d.is_dir() and d.name.startswith("AP "):
            return d
    return None


def _looks_like_cnj(text: str) -> bool:
    """Verifica se o texto parece um número CNJ."""
    return bool(_CNJ_RE.fullmatch(text.strip()))


def _extract_cnj_from_filename(filename: str) -> str | None:
    """Extrai número CNJ de um nome de arquivo."""
    m = _CNJ_RE.search(filename)
    return m.group(0) if m else None


def _detect_existing_processos(folder: Path) -> set[str]:
    """Detecta números CNJ de processos já existentes numa pasta (arquivos e subpastas)."""
    cnjs: set[str] = set()
    if not folder.exists():
        return cnjs
    for item in folder.iterdir():
        if item.is_dir():
            # Subpasta pode ser "AP 8000640-..." ou "8000640-..."
            cnj = _extract_cnj_from_filename(item.name)
            if cnj:
                cnjs.add(cnj)
        elif item.is_file() and item.suffix.lower() == ".pdf":
            cnj = _extract_cnj_from_filename(item.stem)
            if cnj:
                cnjs.add(cnj)
    return cnjs


def _find_subfolder_for_cnj(assistido_folder: Path, cnj: str) -> Path | None:
    """Encontra subpasta existente que contém o CNJ (com ou sem prefixo)."""
    for d in assistido_folder.iterdir():
        if d.is_dir() and cnj in d.name:
            return d
    return None


def _promote_to_subfolders(
    assistido_folder: Path,
    existing_cnjs: set[str],
    classe_map: dict[str, str | None] | None = None,
):
    """
    Migra arquivos soltos na pasta do assistido para subpastas por processo.

    Usa prefixo de classe quando disponível (ex: "AP 8000640-...").
    Apenas move PDFs cujo nome contém um CNJ. Outros arquivos permanecem.
    """
    classe_map = classe_map or {}
    for f in list(assistido_folder.iterdir()):
        if not f.is_file():
            continue
        cnj = _extract_cnj_from_filename(f.name)
        if not cnj:
            continue
        # Verificar se já existe subpasta com esse CNJ
        existing = _find_subfolder_for_cnj(assistido_folder, cnj)
        if existing:
            subfolder = existing
        else:
            folder_name = _folder_name_for_processo(cnj, classe_map.get(cnj))
            subfolder = assistido_folder / folder_name
        subfolder.mkdir(exist_ok=True)
        dest = subfolder / f.name
        if not dest.exists():
            shutil.move(str(f), str(dest))
            logger.info("Reorganized %s → %s/", f.name, subfolder.name)
        else:
            logger.debug("Skipped duplicate: %s", f.name)


def _sanitize_folder_name(name: str) -> str:
    """Sanitiza nome para uso como pasta (remove caracteres inválidos)."""
    # Capitaliza cada palavra, remove caracteres especiais do filesystem
    name = name.strip().title()
    name = re.sub(r'[<>:"/\\|?*]', "", name)
    # Remove espaços múltiplos
    name = re.sub(r"\s+", " ", name)
    return name


class PjeDownloadService:
    """
    Baixa PDFs de processos do PJe e organiza no Drive local.

    Conecta ao Chrome já aberto do defensor (com sessão PJe ativa).
    NÃO faz login — depende de autenticação prévia manual.
    """

    def __init__(self):
        self.settings = get_settings()
        self._browser: Browser | None = None
        self._playwright: Any = None
        self._last_navigation_time: float = 0

    async def _connect(self) -> Browser:
        """Conecta ao Chrome via CDP."""
        if self._browser and self._browser.is_connected():
            return self._browser

        try:
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.connect_over_cdp(
                self.settings.pje_cdp_url
            )
            logger.info(
                "Connected to Chrome via CDP at %s",
                self.settings.pje_cdp_url,
            )
            return self._browser
        except Exception as e:
            logger.error("Failed to connect to Chrome CDP: %s", e)
            raise ConnectionError(
                f"Não foi possível conectar ao Chrome. "
                f"Verifique se o Chrome está aberto com --remote-debugging-port=9222. "
                f"Erro: {e}"
            ) from e

    async def _get_context(self) -> BrowserContext:
        """Obtém o contexto do browser."""
        browser = await self._connect()
        contexts = browser.contexts
        if not contexts:
            raise ConnectionError("Nenhum contexto de navegador encontrado.")
        return contexts[0]

    async def _rate_limit(self):
        """Respeita rate limiting entre navegações."""
        elapsed = time.time() - self._last_navigation_time
        delay = self.settings.pje_scrape_rate_limit_seconds
        if elapsed < delay:
            await asyncio.sleep(delay - elapsed)
        self._last_navigation_time = time.time()

    async def _extract_assistido_name(self, page: Page) -> str | None:
        """Extrai nome do réu (polo passivo) da página do processo."""
        try:
            name = await page.evaluate("""() => {
                var poloPassivo = document.querySelector('#poloPassivo');
                if (!poloPassivo) return null;
                var link = poloPassivo.querySelector('tbody tr a');
                if (!link) return null;
                var text = link.textContent.trim();
                // Remove "(RÉU)" ou similar do final
                var match = text.match(/^(.+?)\\s*\\([^)]+\\)\\s*$/);
                return match ? match[1].trim() : text;
            }""")
            return name
        except Exception as e:
            logger.warning("Could not extract assistido name: %s", e)
            return None

    async def _extract_atribuicao_from_page(self, page: Page) -> str | None:
        """Tenta extrair atribuição/competência da página do processo."""
        try:
            return await page.evaluate("""() => {
                var dls = document.querySelectorAll('dl.dl-horizontal');
                for (var i = 0; i < dls.length; i++) {
                    var children = dls[i].children;
                    for (var j = 0; j < children.length - 1; j++) {
                        if (children[j].tagName === 'DT') {
                            var key = children[j].textContent.trim().toLowerCase();
                            if (key.indexOf('compet') > -1 || key.indexOf('órgão') > -1 || key.indexOf('orgao') > -1) {
                                return children[j+1].textContent.trim();
                            }
                        }
                    }
                }
                return null;
            }""")
        except Exception:
            return None

    async def _trigger_download(self, page: Page) -> bool:
        """
        Na página do processo, inicia o download dos autos.

        1. Seleciona cronologia ASC
        2. Clica botão Download
        3. Aguarda modal de confirmação

        Returns:
            True se download foi disparado com sucesso.
        """
        try:
            # Selecionar cronologia ASC (Crescente)
            cronologia_select = page.locator("#navbar\\:cbCronologia")
            if await cronologia_select.count() > 0:
                await cronologia_select.select_option(label="Crescente")
                logger.debug("Selected cronologia ASC")
                await page.wait_for_timeout(1000)
            else:
                logger.warning("Cronologia select not found, proceeding with default")

            # Clicar botão Download
            download_btn = page.locator("#navbar\\:j_id312")
            if await download_btn.count() > 0:
                await download_btn.click()
                logger.info("Clicked download button")
                await page.wait_for_timeout(2000)
                return True
            else:
                # Tentar seletor alternativo (IDs dinâmicos do JSF)
                alt_btn = page.locator("a[onclick*='iniciarTemporizadorDownload']")
                if await alt_btn.count() > 0:
                    await alt_btn.click()
                    logger.info("Clicked download button (alt selector)")
                    await page.wait_for_timeout(2000)
                    return True

                logger.error("Download button not found")
                return False

        except Exception as e:
            logger.error("Failed to trigger download: %s", e)
            return False

    async def _wait_and_download_from_area(
        self, page: Page, numero_processo: str
    ) -> Path | None:
        """
        Navega para Área de Download do PJe e aguarda o PDF ficar pronto.

        O PJe gera o PDF em background. A Área de Download mostra o status:
        - "Processando" → ainda gerando
        - Link de download ativo → pronto

        Returns:
            Path do arquivo baixado, ou None se falhou.
        """
        await self._rate_limit()

        try:
            await page.goto(
                PJE_DOWNLOAD_AREA_URL,
                wait_until="domcontentloaded",
                timeout=self.settings.pje_scrape_timeout,
            )
            await page.wait_for_timeout(3000)

            start_time = time.time()

            while (time.time() - start_time) < DOWNLOAD_MAX_WAIT:
                # Verificar se há link de download disponível
                # O PJe mostra uma tabela com status dos downloads
                download_ready = await page.evaluate("""() => {
                    // Procurar links de download na tabela
                    var rows = document.querySelectorAll('table tbody tr');
                    for (var i = 0; i < rows.length; i++) {
                        var row = rows[i];
                        var cells = row.querySelectorAll('td');
                        // Verificar se ainda está processando
                        var text = row.textContent || '';
                        if (text.indexOf('Processando') > -1) {
                            return { ready: false, processing: true };
                        }
                        // Procurar link de download (ícone ou texto)
                        var downloadLink = row.querySelector('a[href*="download"], a[onclick*="download"], a.iceMsgInfo');
                        if (downloadLink) {
                            return {
                                ready: true,
                                processing: false,
                                href: downloadLink.getAttribute('href') || downloadLink.getAttribute('onclick') || ''
                            };
                        }
                    }
                    // Se não encontrou nem processando nem pronto, pode ser que a tabela esteja vazia
                    return { ready: false, processing: false };
                }""")

                if download_ready.get("ready"):
                    logger.info("Download ready for %s", numero_processo)

                    # Configurar download path e disparar download
                    # Usar CDP para configurar download behavior
                    cdp_session = await page.context.new_cdp_session(page)
                    await cdp_session.send(
                        "Browser.setDownloadBehavior",
                        {
                            "behavior": "allowAndName",
                            "downloadPath": str(CHROME_DOWNLOADS),
                            "eventsEnabled": True,
                        },
                    )

                    # Clicar no primeiro link de download disponível
                    await page.evaluate("""() => {
                        var rows = document.querySelectorAll('table tbody tr');
                        for (var i = 0; i < rows.length; i++) {
                            var link = rows[i].querySelector('a[href*="download"], a[onclick*="download"], a.iceMsgInfo');
                            if (link) {
                                link.click();
                                return true;
                            }
                        }
                        return false;
                    }""")

                    # Esperar o arquivo aparecer no diretório de downloads
                    downloaded_file = await self._wait_for_downloaded_file(
                        numero_processo
                    )
                    return downloaded_file

                if download_ready.get("processing"):
                    logger.debug(
                        "Still processing %s (%.0fs elapsed)",
                        numero_processo,
                        time.time() - start_time,
                    )
                else:
                    logger.debug("No download entry found yet, refreshing...")

                await asyncio.sleep(DOWNLOAD_POLL_INTERVAL)
                await page.reload(wait_until="domcontentloaded")
                await page.wait_for_timeout(2000)

            logger.error(
                "Timeout waiting for download of %s (>%ds)",
                numero_processo,
                DOWNLOAD_MAX_WAIT,
            )
            return None

        except Exception as e:
            logger.error("Error in download area for %s: %s", numero_processo, e)
            return None

    async def _wait_for_downloaded_file(
        self, numero_processo: str, timeout: int = 60
    ) -> Path | None:
        """Aguarda o arquivo PDF aparecer no diretório de downloads."""
        start = time.time()
        # O PJe gera arquivos com nome contendo o número do processo
        numero_limpo = numero_processo.replace(".", "").replace("-", "")

        while (time.time() - start) < timeout:
            # Procurar por arquivos recém-criados
            for f in CHROME_DOWNLOADS.iterdir():
                if not f.is_file():
                    continue
                # Ignorar downloads parciais
                if f.suffix in (".crdownload", ".tmp", ".part"):
                    continue
                if f.suffix != ".pdf":
                    continue
                # Verificar se é recente (< 2 min)
                if (time.time() - f.stat().st_mtime) > 120:
                    continue
                # Verificar se contém o número do processo
                fname = f.stem.replace(".", "").replace("-", "").replace(" ", "")
                if numero_limpo in fname or numero_processo in f.stem:
                    logger.info("Found downloaded file: %s", f)
                    return f

            await asyncio.sleep(2)

        logger.warning("Timeout waiting for PDF file for %s", numero_processo)
        return None

    def _move_to_drive(
        self,
        file_path: Path,
        atribuicao: str,
        assistido_name: str,
        numero_processo: str,
        classe_processual: str | None = None,
    ) -> Path:
        """
        Move PDF para a pasta correta no Drive local.

        Regra de organização:
        - Apenas Ações Penais (AP) criam subpastas: "AP 8000640-..."
        - Acessórios (IP, APF) ficam na pasta da AP correspondente.
        - MPU: principal se sozinha ("MPU 8002384-..."), acessória se houver AP.
        - Se não há AP ainda, tudo na pasta do assistido.
        - Subpastas nomeadas com prefixo: AP, IP, MPU, EP, APF, etc.
        """
        atrib_folder = _resolve_drive_folder(atribuicao)
        assistido_folder_name = _sanitize_folder_name(assistido_name)
        assistido_folder = atrib_folder / assistido_folder_name
        assistido_folder.mkdir(parents=True, exist_ok=True)

        is_principal = _is_classe_principal(classe_processual)
        is_mpu = _is_classe_mpu(classe_processual)
        is_acessorio = _is_classe_acessoria(classe_processual)

        # Procurar subpasta de AP existente
        ap_folder = _find_ap_folder(assistido_folder)

        # Detectar todas as subpastas com CNJ
        existing_subfolders = [
            d for d in assistido_folder.iterdir()
            if d.is_dir() and _extract_cnj_from_filename(d.name)
        ]

        if is_acessorio:
            # Acessório → junto com AP se existir 1, senão raiz
            if ap_folder:
                dest_folder = ap_folder
            else:
                dest_folder = assistido_folder

        elif is_mpu:
            # MPU → acessória se AP existe, principal se sozinha
            if ap_folder:
                dest_folder = ap_folder
            else:
                # MPU é o processo referência
                folder_name = _folder_name_for_processo(numero_processo, classe_processual)
                existing = _find_subfolder_for_cnj(assistido_folder, numero_processo)
                if existing:
                    dest_folder = existing
                elif existing_subfolders:
                    dest_folder = assistido_folder / folder_name
                    dest_folder.mkdir(exist_ok=True)
                else:
                    # Única MPU, sem subpastas ainda → raiz do assistido
                    dest_folder = assistido_folder

        elif is_principal:
            # AP / EP → sempre cria subpasta se há outros processos
            existing_cnjs = _detect_existing_processos(assistido_folder)
            other_cnjs = existing_cnjs - {numero_processo}
            folder_name = _folder_name_for_processo(numero_processo, classe_processual)

            # Já existe subpasta para este processo?
            existing = _find_subfolder_for_cnj(assistido_folder, numero_processo)
            if existing:
                dest_folder = existing
            elif other_cnjs and not existing_subfolders:
                _promote_to_subfolders(assistido_folder, existing_cnjs)
                dest_folder = assistido_folder / folder_name
                dest_folder.mkdir(exist_ok=True)
            elif existing_subfolders:
                dest_folder = assistido_folder / folder_name
                dest_folder.mkdir(exist_ok=True)
            else:
                dest_folder = assistido_folder

        else:
            # Classe desconhecida → raiz ou subpasta se já houver
            if existing_subfolders:
                folder_name = _folder_name_for_processo(numero_processo, classe_processual)
                dest_folder = assistido_folder / folder_name
                dest_folder.mkdir(exist_ok=True)
            else:
                dest_folder = assistido_folder

        # Nome do arquivo
        dest_file = dest_folder / f"{numero_processo}.pdf"
        if dest_file.exists():
            counter = 1
            while dest_file.exists():
                dest_file = dest_folder / f"{numero_processo} ({counter}).pdf"
                counter += 1

        shutil.move(str(file_path), str(dest_file))
        logger.info("Moved PDF to %s", dest_file)
        return dest_file

    async def _extract_classe_processual(self, page: Page) -> str | None:
        """Extrai a classe processual da página do processo (ex: Ação Penal, IP)."""
        try:
            return await page.evaluate("""() => {
                var dls = document.querySelectorAll('dl.dl-horizontal');
                for (var i = 0; i < dls.length; i++) {
                    var children = dls[i].children;
                    for (var j = 0; j < children.length - 1; j++) {
                        if (children[j].tagName === 'DT') {
                            var key = children[j].textContent.trim().toLowerCase();
                            if (key.indexOf('classe') > -1) {
                                return children[j+1].textContent.trim();
                            }
                        }
                    }
                }
                return null;
            }""")
        except Exception:
            return None

    async def download_processo(
        self,
        numero_processo: str,
        link_pje: str | None = None,
        atribuicao: str = "criminal",
        assistido_name: str | None = None,
        classe_processual: str | None = None,
    ) -> dict[str, Any]:
        """
        Baixa os autos completos de um processo e organiza no Drive.

        Args:
            numero_processo: Número CNJ do processo
            link_pje: URL direta no PJe (com token ca)
            atribuicao: Atribuição para determinar pasta do Drive
            assistido_name: Nome do assistido (se None, extrai do processo)

        Returns:
            Dict com resultado: {downloaded, dest_path, error}
        """
        context = await self._get_context()
        page = await context.new_page()

        try:
            # Navegar para o processo
            if link_pje:
                url = link_pje
            else:
                logger.warning(
                    "No link_pje for %s, cannot navigate directly", numero_processo
                )
                return {
                    "numero_processo": numero_processo,
                    "downloaded": False,
                    "error": "link_pje necessário para navegação direta",
                }

            await self._rate_limit()
            await page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=self.settings.pje_scrape_timeout,
            )
            await page.wait_for_timeout(4000)

            # Extrair nome do assistido se não fornecido
            if not assistido_name:
                assistido_name = await self._extract_assistido_name(page)
                if not assistido_name:
                    assistido_name = numero_processo  # fallback

            # Extrair classe processual da página se não fornecida
            if not classe_processual:
                classe_processual = await self._extract_classe_processual(page)

            # Tentar extrair atribuição da página se não fornecida explicitamente
            if atribuicao == "criminal":
                page_atrib = await self._extract_atribuicao_from_page(page)
                if page_atrib:
                    # Verificar se alguma keyword bate
                    for key in ATRIBUICAO_FOLDER_MAP:
                        if key in page_atrib.lower():
                            atribuicao = key
                            break

            # Disparar download
            triggered = await self._trigger_download(page)
            if not triggered:
                return {
                    "numero_processo": numero_processo,
                    "assistido": assistido_name,
                    "downloaded": False,
                    "error": "Não foi possível clicar no botão de download",
                }

            # Navegar para Área de Download e aguardar
            downloaded_file = await self._wait_and_download_from_area(
                page, numero_processo
            )

            if not downloaded_file:
                return {
                    "numero_processo": numero_processo,
                    "assistido": assistido_name,
                    "downloaded": False,
                    "error": "Timeout aguardando geração do PDF na Área de Download",
                }

            # Mover para Drive
            dest_path = self._move_to_drive(
                downloaded_file, atribuicao, assistido_name, numero_processo,
                classe_processual=classe_processual,
            )

            return {
                "numero_processo": numero_processo,
                "assistido": assistido_name,
                "downloaded": True,
                "dest_path": str(dest_path),
                "atribuicao_folder": _resolve_drive_folder(atribuicao).name,
            }

        except Exception as e:
            logger.error("Error downloading %s: %s", numero_processo, e)
            return {
                "numero_processo": numero_processo,
                "assistido": assistido_name,
                "downloaded": False,
                "error": str(e),
            }
        finally:
            await page.close()

    async def download_processos(
        self,
        processos: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Baixa múltiplos processos sequencialmente.

        Args:
            processos: Lista de {"numero_processo", "link_pje", "atribuicao", "assistido_name"}

        Returns:
            Lista de resultados por processo.
        """
        results = []

        logger.info("Starting PJe download | processos=%d", len(processos))

        for i, proc in enumerate(processos):
            logger.info(
                "Downloading [%d/%d]: %s",
                i + 1,
                len(processos),
                proc["numero_processo"],
            )

            result = await self.download_processo(
                numero_processo=proc["numero_processo"],
                link_pje=proc.get("link_pje"),
                atribuicao=proc.get("atribuicao", "criminal"),
                assistido_name=proc.get("assistido_name"),
                classe_processual=proc.get("classe_processual"),
            )
            results.append(result)

        downloaded = sum(1 for r in results if r.get("downloaded"))
        errors = sum(1 for r in results if not r.get("downloaded"))
        logger.info(
            "PJe download complete | downloaded=%d errors=%d", downloaded, errors
        )

        return results

    async def close(self):
        """Desconecta do Chrome (não fecha o navegador)."""
        if self._browser:
            self._browser = None
        if self._playwright:
            try:
                await self._playwright.stop()
            except Exception:
                pass
            self._playwright = None


# === Singleton ===
_service: PjeDownloadService | None = None


def get_pje_download_service() -> PjeDownloadService:
    """Singleton do PJe download service."""
    global _service
    if _service is None:
        _service = PjeDownloadService()
    return _service
