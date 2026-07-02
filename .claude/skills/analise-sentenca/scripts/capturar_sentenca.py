#!/usr/bin/env python3
"""
capturar_sentenca.py — Browser-lane capture for the `analise-sentenca` skill.

Captures ONE sentença PDF from the PJe, uploads it to the assistido's
"03 - Decisões e Sentenças" Drive folder, records a `drive_files` row and
extracts the full text for the AI lane to analyse.

Output contract (single JSON object on stdout):
  success → {"ok": true,  "drive_files_row_id": <int>, "texto_integral": "<...>"}
  failure → {"ok": false, "error": "<msg>", "stage": "<navigate|download|upload|extract>"}
            (also exits non-zero so the caller can fall back to the registro raw_text)

This script is meant to run on the browser-lane daemon host, where the
enrichment-engine venv (Playwright + Supabase + OCR/Docling) is available.
It deliberately REUSES the real capture/upload code from
`enrichment-engine/services/pje_playwright_service.py` instead of reinventing it.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path

# ── Runtime path wiring ───────────────────────────────────────────────────────
# The enrichment-engine services (pje_playwright_service, supabase_service,
# ocr_service, docling_service) live in `enrichment-engine/` and import each
# other by bare module name (`from services... import`, `from config import`).
# Add both the repo root and the enrichment-engine dir to sys.path so those
# bare imports resolve at runtime. (No-op for `py_compile`, which only parses.)
_REPO_ROOT = Path(__file__).resolve().parents[3]  # .../<repo>
_ENRICHMENT_DIR = _REPO_ROOT / "enrichment-engine"
for _p in (str(_ENRICHMENT_DIR), str(_REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)


class StageError(Exception):
    """Carries the pipeline stage that failed so the caller can branch on it."""

    def __init__(self, stage: str, message: str):
        super().__init__(message)
        self.stage = stage
        self.message = message


# ── Google Drive OAuth (mirrors scripts/batch_juri_cowork.get_access_token) ───
_access_token_cache: dict = {}


def get_drive_access_token() -> str:
    """
    Refresh a short-lived Google OAuth access token from the long-lived
    GOOGLE_REFRESH_TOKEN (same approach used by scripts/batch_juri_cowork.py).
    Cached in-process until ~1 min before expiry.
    """
    import httpx

    if _access_token_cache.get("token") and _access_token_cache.get("expires_at", 0) > time.time():
        return _access_token_cache["token"]

    client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN", "")
    if not (client_id and client_secret and refresh_token):
        raise StageError("upload", "Google OAuth env vars not configured (GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN)")

    resp = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    _access_token_cache["token"] = data["access_token"]
    _access_token_cache["expires_at"] = time.time() + data.get("expires_in", 3500) - 60
    return data["access_token"]


# ── Supabase lookups + drive_files insert ─────────────────────────────────────
def _resolve_assistido(assistido_id: int) -> tuple[str, int | None]:
    """Return (assistido_nome, processo_id_or_None) for the given assistido id."""
    from services.supabase_service import get_supabase_service

    client = get_supabase_service()._get_client()
    nome = "Assistido"
    try:
        res = client.table("assistidos").select("nome").eq("id", assistido_id).limit(1).execute()
        if res.data:
            nome = res.data[0].get("nome") or nome
    except Exception:
        # Best-effort — the Drive folder name falls back to "Assistido".
        pass
    return nome, None


async def _resolve_processo_id(numero_processo: str) -> int | None:
    """Resolve the OMBUDS processo id from the process number (best-effort)."""
    from services.supabase_service import get_supabase_service

    svc = get_supabase_service()
    try:
        proc = await svc.find_processo_by_numero(numero_processo)
        return proc.get("id") if proc else None
    except Exception:
        return None


def insert_drive_files_row(
    *,
    drive_file: dict,
    drive_folder_id: str,
    name: str,
    assistido_id: int | None,
    processo_id: int | None,
) -> int:
    """
    Insert one row into `drive_files` and return its integer `id`.

    Required NOT NULL columns (see src/lib/db/schema/drive.ts → driveFiles):
      driveFileId (Drive's own file id), driveFolderId (parent folder id), name.
    `provider` defaults to 'google'. We also persist the link + classification.
    """
    from services.supabase_service import get_supabase_service

    client = get_supabase_service()._get_client()
    row: dict = {
        "drive_file_id": drive_file.get("id"),
        "drive_folder_id": drive_folder_id,
        "provider": "google",
        "name": name,
        "mime_type": "application/pdf",
        "web_view_link": drive_file.get("webViewLink", ""),
        "document_type": "Sentença",
        "categoria": "decisao",
        "sync_status": "synced",
    }
    if assistido_id:
        row["assistido_id"] = assistido_id
    if processo_id:
        row["processo_id"] = processo_id

    try:
        res = client.table("drive_files").insert(row).execute()
    except Exception as e:
        raise StageError("upload", f"drive_files insert failed: {e}") from e

    if not res.data:
        raise StageError("upload", "drive_files insert returned no row")
    return int(res.data[0]["id"])


# ── PJe navigate + download (reuses pje_playwright_service) ────────────────────
async def capturar_pdf(numero_processo: str, pje_documento_id: str) -> Path:
    """
    Open the process in PJe FIRST (Painel → search → open), THEN download the
    document. `download_document(id)` only matches `a:has-text('{id}')` on the
    CURRENT page, so navigation must happen before the download.
    """
    from services.pje_playwright_service import get_pje_playwright_service

    service = get_pje_playwright_service()

    # 1. Authenticate.
    if not await service._auth.ensure_authenticated():
        raise StageError("navigate", "PJe authentication failed")

    # 2. Open the process so its document list (and the sentença link) is loaded.
    page = service._auth.page
    navigated = await service._navigate_to_processo(page, numero_processo)
    if not navigated:
        raise StageError("navigate", f"Could not navigate to processo {numero_processo}")

    # 3. Download the sentença PDF (link must be on the now-current page).
    filepath = await service.download_document(pje_documento_id, "Sentença")
    if not filepath or not Path(filepath).exists():
        raise StageError("download", f"download_document returned no file for {pje_documento_id}")
    return Path(filepath)


# ── Drive upload to "03 - Decisões e Sentenças" (reuses service helpers) ───────
async def upload_para_drive(
    filepath: Path,
    *,
    assistido_nome: str,
    numero_processo: str,
    atribuicao: str,
) -> tuple[dict, str]:
    """
    Upload the PDF into <root>/<assistido>/<AP numero>/03 - Decisões e Sentenças.
    Returns (drive_file_dict, target_folder_id). Reuses the service's Drive
    helpers (`_find_or_create_drive_folder`, `_upload_file_to_drive`) and the
    `ATRIBUICAO_FOLDER_ENV` / `_build_folder_name` mapping.
    """
    from services import pje_playwright_service as pps

    service = pps.get_pje_playwright_service()
    token = get_drive_access_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Root folder for the atribuição (env var, e.g. GOOGLE_DRIVE_FOLDER_JURI).
    env_var = pps.ATRIBUICAO_FOLDER_ENV.get(atribuicao, "GOOGLE_DRIVE_FOLDER_JURI")
    root_folder_id = os.environ.get(env_var, "")
    if not root_folder_id:
        raise StageError("upload", f"Drive folder env var {env_var} not set")

    # <root>/<assistido>
    assistido_folder_id = await service._find_or_create_drive_folder(
        pps._sanitize_folder_name(assistido_nome), root_folder_id, headers
    )
    if not assistido_folder_id:
        raise StageError("upload", "could not resolve assistido Drive folder")

    # <assistido>/<AP numero>
    processo_folder_name = pps._build_folder_name(None, numero_processo)
    processo_folder_id = await service._find_or_create_drive_folder(
        processo_folder_name, assistido_folder_id, headers
    )
    if not processo_folder_id:
        raise StageError("upload", "could not resolve processo Drive folder")

    # <AP numero>/03 - Decisões e Sentenças
    target_folder_id = await service._find_or_create_drive_folder(
        "03 - Decisões e Sentenças", processo_folder_id, headers
    )
    if not target_folder_id:
        raise StageError("upload", "could not resolve '03 - Decisões e Sentenças' folder")

    drive_file = await service._upload_file_to_drive(filepath, target_folder_id, headers)
    if not drive_file:
        raise StageError("upload", "Drive upload failed")
    return drive_file, target_folder_id


# ── Full-text extraction (OCR primary, Docling fallback) ──────────────────────
async def extrair_texto(pdf_bytes: bytes) -> str:
    """
    Extract the sentença full text. Primary: Tesseract OCR
    (`ocr_service.extract_text_with_ocr`); fallback: Docling.
    """
    texto = ""

    # Primary — OCR (returns {"pages": [{"text": ...}], ...}).
    try:
        from services.ocr_service import extract_text_with_ocr

        result = await extract_text_with_ocr(pdf_bytes, language="por")
        pages = result.get("pages", []) if isinstance(result, dict) else []
        texto = "\n".join(p.get("text", "") for p in pages).strip()
    except Exception:
        texto = ""

    # Fallback — Docling (handles born-digital PDFs better than OCR).
    if len(texto) < 40:
        try:
            from services.docling_service import get_docling_service

            md = get_docling_service().parse_from_bytes(pdf_bytes, filename="sentenca.pdf")
            if md and len(md.strip()) > len(texto):
                texto = md.strip()
        except Exception:
            pass

    if not texto:
        raise StageError("extract", "no text could be extracted (OCR + Docling both empty)")
    return texto


# ── Orchestration ─────────────────────────────────────────────────────────────
async def run(numero_processo: str, pje_documento_id: str, assistido_id: int, atribuicao: str) -> dict:
    # 1. Navigate + download the PDF.
    filepath = await capturar_pdf(numero_processo, pje_documento_id)
    pdf_bytes = filepath.read_bytes()

    # 2. Resolve assistido name + processo id for the Drive row.
    assistido_nome, _ = _resolve_assistido(assistido_id)
    processo_id = await _resolve_processo_id(numero_processo)

    # 3. Upload to "03 - Decisões e Sentenças".
    drive_file, target_folder_id = await upload_para_drive(
        filepath,
        assistido_nome=assistido_nome,
        numero_processo=numero_processo,
        atribuicao=atribuicao,
    )

    # 4. Insert drive_files row → capture integer id.
    drive_files_row_id = insert_drive_files_row(
        drive_file=drive_file,
        drive_folder_id=target_folder_id,
        name=filepath.name,
        assistido_id=assistido_id,
        processo_id=processo_id,
    )

    # 5. Extract full text.
    texto_integral = await extrair_texto(pdf_bytes)

    # Best-effort cleanup of the temp PDF.
    try:
        filepath.unlink()
    except Exception:
        pass

    return {"ok": True, "drive_files_row_id": drive_files_row_id, "texto_integral": texto_integral}


def parse_args(argv: list[str]) -> dict:
    """
    Accept either discrete CLI flags or a single --json '{...}' payload.
    Required keys: numero_processo, pje_documento_id, assistido_id, atribuicao.
    """
    parser = argparse.ArgumentParser(description="Capture one PJe sentença PDF + extract its text.")
    parser.add_argument("--json", help="JSON payload with all inputs (overrides flags).")
    parser.add_argument("--numero-processo", dest="numero_processo")
    parser.add_argument("--pje-documento-id", dest="pje_documento_id")
    parser.add_argument("--assistido-id", dest="assistido_id", type=int)
    parser.add_argument("--atribuicao", dest="atribuicao")
    ns = parser.parse_args(argv)

    if ns.json:
        payload = json.loads(ns.json)
    else:
        payload = {
            "numero_processo": ns.numero_processo,
            "pje_documento_id": ns.pje_documento_id,
            "assistido_id": ns.assistido_id,
            "atribuicao": ns.atribuicao,
        }

    missing = [k for k in ("numero_processo", "pje_documento_id", "assistido_id", "atribuicao") if not payload.get(k)]
    if missing:
        parser.error(f"missing required input(s): {', '.join(missing)}")
    payload["assistido_id"] = int(payload["assistido_id"])
    return payload


def main(argv: list[str]) -> int:
    try:
        payload = parse_args(argv)
    except SystemExit:
        # argparse already printed usage; surface a contract-shaped error too.
        print(json.dumps({"ok": False, "error": "invalid arguments", "stage": "navigate"}))
        return 2

    try:
        result = asyncio.run(
            run(
                numero_processo=payload["numero_processo"],
                pje_documento_id=str(payload["pje_documento_id"]),
                assistido_id=payload["assistido_id"],
                atribuicao=payload["atribuicao"],
            )
        )
    except StageError as e:
        print(json.dumps({"ok": False, "error": e.message, "stage": e.stage}, ensure_ascii=False))
        return 1
    except Exception as e:  # noqa: BLE001 — last-resort guard, stage unknown.
        print(json.dumps({"ok": False, "error": str(e), "stage": "navigate"}, ensure_ascii=False))
        return 1

    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
