"""
PJe Download Service — Baixa documentos do PJe e organiza no Google Drive.

Estrutura no Drive:
  Processos - Júri/
  ├── [Nome Assistido]/
  │   └── AP [numero_autos]/
  │       ├── decisao-64523274.pdf
  │       ├── 01 - Documentos Pessoais/
  │       ├── 02 - Peças Protocoladas/
  │       ├── 03 - Decisões e Sentenças/
  │       ├── 04 - Audiências/
  │       └── 05 - Outros/
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
import tempfile
from pathlib import Path

from config import get_settings
from services.pje_auth_service import get_pje_auth_service

logger = logging.getLogger("enrichment-engine.pje-download")

# Mapeamento classe processual → prefixo pasta
CLASSE_TO_PREFIX = {
    "Juri": "AP",
    "InsanAc": "InsanAc",
    "LibProv": "LibProv",
    "PetCrim": "PetCrim",
    "EP": "EP",
    "AuPrFl": "AuPrFl",
    "APFD": "APFD",
    "APOrd": "AP",
    "APSum": "AP",
    "APri": "AP",
    "AcNãoPerPenal": "AP",
    "IP": "IP",
    "DeFaPa": "DeFaPa",
    "AlEsp": "AlEsp",
    "ProceComCiv": "ProceComCiv",
    "VD": "VD",
    "MPUMPCrim": "MPU",
}

# Mapeamento atribuição → env var da pasta raiz no Drive
ATRIBUICAO_FOLDER_ENV = {
    "JURI_CAMACARI": "GOOGLE_DRIVE_FOLDER_JURI",
    "GRUPO_JURI": "GOOGLE_DRIVE_FOLDER_JURI",
    "EXECUCAO_PENAL": "GOOGLE_DRIVE_FOLDER_EP",
    "VVD_CAMACARI": "GOOGLE_DRIVE_FOLDER_VVD",
    "SUBSTITUICAO": "GOOGLE_DRIVE_FOLDER_SUBSTITUICAO",
}

# Subpastas padrão dentro de cada processo
SUBPASTAS_PROCESSO = [
    "01 - Documentos Pessoais",
    "02 - Peças Protocoladas",
    "03 - Decisões e Sentenças",
    "04 - Audiências",
    "05 - Outros",
]


def _sanitize_folder_name(name: str) -> str:
    """Remove caracteres inválidos para nome de pasta no Drive."""
    return re.sub(r'[<>:"/\\|?*]', "", name).strip()


def _build_folder_name(classe_processual: str | None, numero_autos: str) -> str:
    """Constrói nome da pasta do processo: 'AP 8000247-96.2026.8.05.0039'."""
    prefix = "AP"
    if classe_processual:
        prefix = CLASSE_TO_PREFIX.get(classe_processual, classe_processual)
    return f"{prefix} {numero_autos}"


def _build_filename(tipo_documento: str, id_documento: str) -> str:
    """Constrói nome do arquivo: 'decisao-64523274.pdf'."""
    tipo_clean = tipo_documento.lower().replace(" ", "-")
    # Normalizar acentos
    replacements = {
        "á": "a", "à": "a", "ã": "a", "â": "a",
        "é": "e", "ê": "e", "í": "i", "î": "i",
        "ó": "o", "ô": "o", "õ": "o",
        "ú": "u", "û": "u", "ç": "c",
    }
    for old, new in replacements.items():
        tipo_clean = tipo_clean.replace(old, new)
    tipo_clean = re.sub(r"[^a-z0-9-]", "", tipo_clean)
    return f"{tipo_clean}-{id_documento}.pdf"


class PjeDownloadService:
    """Baixa documentos do PJe via Playwright e organiza no Google Drive."""

    def __init__(self):
        self.settings = get_settings()
        self._auth = get_pje_auth_service()

    async def _rate_limit(self):
        """Delay entre operações para não sobrecarregar o PJe."""
        await asyncio.sleep(self.settings.pje_rate_limit_seconds)

    async def download_document(
        self,
        id_documento: str,
        tipo_documento: str = "Documento",
    ) -> Path | None:
        """
        Baixa um documento do PJe pelo ID.

        Fluxo:
        1. Autenticar no PJe
        2. Navegar ao painel do representante
        3. Localizar o documento pelo ID
        4. Clicar no link do documento → abre viewer PDF
        5. Clicar no botão de download dentro do viewer
        6. Salvar o PDF

        Args:
            id_documento: ID do documento PJe (ex: '64523274')
            tipo_documento: Tipo (Decisão, Despacho, etc.)

        Returns:
            Path do arquivo baixado ou None se falhou.
        """
        if not await self._auth.ensure_authenticated():
            logger.error("Cannot download: PJe authentication failed")
            return None

        page = self._auth.page
        await self._rate_limit()

        try:
            # Buscar o documento na página atual ou navegar para ele
            # O PJe permite acessar documentos diretamente se o processo estiver aberto
            doc_link = await page.query_selector(f"a:has-text('{id_documento}')")
            if not doc_link:
                logger.warning("Document link %s not found on current page", id_documento)
                return None

            # Clicar no documento para abrir o viewer
            await doc_link.click()
            await asyncio.sleep(2)

            # Baixar via expect_download no viewer de PDF
            tmp_dir = tempfile.mkdtemp(prefix="pje-")
            filename = _build_filename(tipo_documento, id_documento)
            filepath = Path(tmp_dir) / filename

            try:
                async with page.expect_download(timeout=15000) as download_info:
                    # Procurar botão de download nos iframes aninhados
                    await self._click_download_button(page)

                download = await download_info.value
                await download.save_as(str(filepath))
            except Exception as e:
                logger.warning("expect_download failed for %s, trying alternative: %s", id_documento, e)
                # Fallback: tentar via URL direta do iframe
                pdf_url = await self._extract_pdf_url(page)
                if pdf_url:
                    filepath = await self._download_via_url(pdf_url, filepath, page)

            if filepath and filepath.exists() and filepath.stat().st_size > 0:
                logger.info("Downloaded: %s (%d bytes)", filename, filepath.stat().st_size)
                return filepath
            else:
                logger.warning("Download failed or empty file: %s", filename)
                return None

        except Exception as e:
            logger.error("Failed to download document %s: %s", id_documento, e)
            return None

    async def _click_download_button(self, page):
        """Procura e clica no botão de download dentro do viewer PDF (iframes aninhados)."""
        # Nível 1: botão na página principal
        dl_btn = await page.query_selector(
            "a[title*='download' i], button[title*='Baixar']"
        )
        if dl_btn:
            await dl_btn.click()
            return

        # Nível 2: dentro do primeiro iframe
        iframes = await page.query_selector_all("iframe")
        for iframe in iframes:
            frame = await iframe.content_frame()
            if not frame:
                continue

            dl_btn = await frame.query_selector(
                "button[title*='Baixar'], button[title*='Download'], "
                "a[title*='Baixar'], a[title*='Download']"
            )
            if dl_btn:
                await dl_btn.click()
                return

            # Nível 3: iframe aninhado (viewer PDF)
            nested_iframes = await frame.query_selector_all("iframe")
            for ni in nested_iframes:
                nf = await ni.content_frame()
                if not nf:
                    continue
                dl_btn = await nf.query_selector(
                    "button[title*='Baixar'], button[title*='Download'], "
                    "#download, button.download"
                )
                if dl_btn:
                    await dl_btn.click()
                    return

        logger.warning("No download button found in any iframe level")

    async def _extract_pdf_url(self, page) -> str | None:
        """Extrai a URL do PDF do viewer embarcado."""
        try:
            url = await page.evaluate("""() => {
                const iframes = document.querySelectorAll('iframe');
                for (const iframe of iframes) {
                    if (iframe.src && iframe.src.includes('downloadBinario')) {
                        return iframe.src;
                    }
                    try {
                        const doc = iframe.contentDocument;
                        if (doc) {
                            const inner = doc.querySelectorAll('iframe');
                            for (const ii of inner) {
                                if (ii.src && ii.src.includes('downloadBinario')) {
                                    return ii.src;
                                }
                            }
                        }
                    } catch(e) {}
                }
                return null;
            }""")
            return url
        except Exception:
            return None

    async def _download_via_url(self, url: str, filepath: Path, page) -> Path | None:
        """Baixa PDF via URL direta usando cookies da sessão Playwright."""
        try:
            cookies = await page.context.cookies()
            cookie_str = "; ".join(f"{c['name']}={c['value']}" for c in cookies)

            import httpx
            async with httpx.AsyncClient(follow_redirects=True) as client:
                resp = await client.get(
                    url,
                    headers={"Cookie": cookie_str},
                    timeout=30,
                )
                if resp.status_code == 200 and len(resp.content) > 100:
                    filepath.write_bytes(resp.content)
                    return filepath
        except Exception as e:
            logger.error("URL download failed: %s", e)
        return None

    async def download_and_upload_processo(
        self,
        processo_id: int,
        numero_autos: str,
        assistido_nome: str,
        atribuicao: str,
        classe_processual: str | None,
        doc_ids: list[dict],
        google_drive_access_token: str | None = None,
    ) -> dict:
        """
        Baixa documentos de um processo do PJe e organiza no Google Drive.

        Args:
            processo_id: ID do processo no OMBUDS
            numero_autos: Número dos autos
            assistido_nome: Nome do assistido
            atribuicao: Atribuição (JURI_CAMACARI, etc.)
            classe_processual: Classe (Juri, InsanAc, etc.)
            doc_ids: [{id_documento, tipo_documento}]
            google_drive_access_token: Token OAuth do Google Drive

        Returns:
            {processo_id, downloaded, uploaded, errors}
        """
        results = {
            "processo_id": processo_id,
            "numero_autos": numero_autos,
            "downloaded": [],
            "uploaded": [],
            "errors": [],
        }

        # Primeiro, navegar ao processo no PJe
        if not await self._auth.ensure_authenticated():
            results["errors"].append("PJe authentication failed")
            return results

        page = self._auth.page

        # Navegar para o processo (pesquisa por número)
        navigated = await self._navigate_to_processo(page, numero_autos)
        if not navigated:
            results["errors"].append(f"Could not navigate to processo {numero_autos}")
            return results

        # Baixar cada documento
        for doc in doc_ids:
            id_doc = doc.get("id_documento")
            tipo_doc = doc.get("tipo_documento", "Documento")

            filepath = await self.download_document(id_doc, tipo_doc)
            if filepath:
                results["downloaded"].append({
                    "id_documento": id_doc,
                    "tipo_documento": tipo_doc,
                    "filepath": str(filepath),
                    "size_bytes": filepath.stat().st_size,
                })
            else:
                results["errors"].append(f"Failed to download doc {id_doc} ({tipo_doc})")

            await self._rate_limit()

        # Upload para Google Drive
        if google_drive_access_token and results["downloaded"]:
            uploaded = await self._upload_to_drive(
                downloaded=results["downloaded"],
                assistido_nome=assistido_nome,
                numero_autos=numero_autos,
                atribuicao=atribuicao,
                classe_processual=classe_processual,
                access_token=google_drive_access_token,
            )
            results["uploaded"] = uploaded

        return results

    async def _navigate_to_processo(self, page, numero_autos: str) -> bool:
        """Navega para a página de detalhes de um processo no PJe."""
        try:
            # Ir para o painel e pesquisar pelo número
            await page.goto(
                f"{self.settings.pje_base_url}/pje/Painel/painel_usuario/advogado.seam",
                wait_until="domcontentloaded",
                timeout=30000,
            )
            await page.wait_for_load_state("networkidle", timeout=15000)

            # Preencher campo de pesquisa por número de processo
            search_input = await page.query_selector(
                "input[placeholder*='Pesquise por número'], "
                "input[placeholder*='número de processo'], "
                "input[id*='numeroPesquisa']"
            )
            if search_input:
                # Limpar e digitar o número
                numero_limpo = re.sub(r"[^0-9.-]", "", numero_autos)
                await search_input.fill(numero_limpo)
                await page.keyboard.press("Enter")
                await asyncio.sleep(3)

                # Clicar no resultado
                result_link = await page.query_selector(f"a:has-text('{numero_limpo[:20]}')")
                if result_link:
                    await result_link.click()
                    await page.wait_for_load_state("domcontentloaded", timeout=15000)
                    return True

            logger.warning("Could not navigate to processo %s", numero_autos)
            return False

        except Exception as e:
            logger.error("Navigation to processo failed: %s", e)
            return False

    async def _upload_to_drive(
        self,
        downloaded: list[dict],
        assistido_nome: str,
        numero_autos: str,
        atribuicao: str,
        classe_processual: str | None,
        access_token: str,
    ) -> list[dict]:
        """Upload dos PDFs para o Google Drive na estrutura correta."""
        import httpx

        uploaded = []
        headers = {"Authorization": f"Bearer {access_token}"}

        # 1. Pasta raiz da atribuição
        env_var = ATRIBUICAO_FOLDER_ENV.get(atribuicao, "GOOGLE_DRIVE_FOLDER_JURI")
        root_folder_id = os.environ.get(env_var, "")
        if not root_folder_id:
            logger.error("Drive folder env var %s not set", env_var)
            return []

        # 2. Pasta do assistido
        assistido_folder_name = _sanitize_folder_name(assistido_nome)
        assistido_folder_id = await self._find_or_create_drive_folder(
            assistido_folder_name, root_folder_id, headers
        )
        if not assistido_folder_id:
            return []

        # 3. Pasta do processo (AP XXXXX)
        processo_folder_name = _build_folder_name(classe_processual, numero_autos)
        processo_folder_id = await self._find_or_create_drive_folder(
            processo_folder_name, assistido_folder_id, headers
        )
        if not processo_folder_id:
            return []

        # 4. Criar subpastas padrão (se não existem)
        for subpasta in SUBPASTAS_PROCESSO:
            await self._find_or_create_drive_folder(subpasta, processo_folder_id, headers)

        # 5. Upload cada documento na raiz da pasta do processo
        for doc in downloaded:
            filepath = Path(doc["filepath"])

            drive_file = await self._upload_file_to_drive(
                filepath, processo_folder_id, headers
            )
            if drive_file:
                uploaded.append({
                    "id_documento": doc["id_documento"],
                    "drive_file_id": drive_file["id"],
                    "drive_link": drive_file.get("webViewLink", ""),
                })

            # Limpar arquivo temporário
            try:
                filepath.unlink()
            except Exception:
                pass

        return uploaded

    async def _find_or_create_drive_folder(
        self, name: str, parent_id: str, headers: dict
    ) -> str | None:
        """Encontra ou cria pasta no Google Drive."""
        import httpx

        async with httpx.AsyncClient() as client:
            # Buscar pasta existente
            query = (
                f"name='{name}' and '{parent_id}' in parents "
                f"and mimeType='application/vnd.google-apps.folder' and trashed=false"
            )
            resp = await client.get(
                "https://www.googleapis.com/drive/v3/files",
                params={"q": query, "fields": "files(id,name)"},
                headers=headers,
                timeout=10,
            )
            if resp.status_code == 200:
                files = resp.json().get("files", [])
                if files:
                    return files[0]["id"]

            # Criar pasta
            metadata = {
                "name": name,
                "mimeType": "application/vnd.google-apps.folder",
                "parents": [parent_id],
            }
            resp = await client.post(
                "https://www.googleapis.com/drive/v3/files",
                json=metadata,
                headers={**headers, "Content-Type": "application/json"},
                timeout=10,
            )
            if resp.status_code == 200:
                folder = resp.json()
                logger.info("Created Drive folder: %s (id=%s)", name, folder["id"])
                return folder["id"]
            else:
                logger.error("Failed to create Drive folder '%s': %s", name, resp.text)
                return None

    async def _upload_file_to_drive(
        self, filepath: Path, folder_id: str, headers: dict
    ) -> dict | None:
        """Upload arquivo para o Google Drive."""
        import httpx
        import json

        metadata = json.dumps({
            "name": filepath.name,
            "parents": [folder_id],
        })

        async with httpx.AsyncClient() as client:
            with open(filepath, "rb") as f:
                file_content = f.read()

            # Multipart upload
            boundary = "---pje-upload-boundary---"
            body = (
                f"--{boundary}\r\n"
                f"Content-Type: application/json; charset=UTF-8\r\n\r\n"
                f"{metadata}\r\n"
                f"--{boundary}\r\n"
                f"Content-Type: application/pdf\r\n\r\n"
            ).encode() + file_content + f"\r\n--{boundary}--".encode()

            resp = await client.post(
                "https://www.googleapis.com/upload/drive/v3/files",
                params={"uploadType": "multipart", "fields": "id,name,webViewLink"},
                headers={
                    **headers,
                    "Content-Type": f"multipart/related; boundary={boundary}",
                },
                content=body,
                timeout=30,
            )

            if resp.status_code == 200:
                result = resp.json()
                logger.info("Uploaded to Drive: %s → %s", filepath.name, result.get("id"))
                return result
            else:
                logger.error("Drive upload failed for %s: %s", filepath.name, resp.text)
                return None


# Singleton
_pje_download: PjeDownloadService | None = None


def get_pje_playwright_service() -> PjeDownloadService:
    global _pje_download
    if _pje_download is None:
        _pje_download = PjeDownloadService()
    return _pje_download
