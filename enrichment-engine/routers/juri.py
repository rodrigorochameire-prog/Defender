"""
POST /api/juri/extrair — Extract structured data from jury trial documents.
Supports: quesitos sheet, sentenca (dosimetria), ata da sessao.
Flow: Download file -> OCR if needed -> Claude extraction -> structured JSON
"""
from __future__ import annotations

import base64
import json
import logging
import re
import time
from typing import Any, Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import get_settings
from prompts.juri_extraction import PROMPT_ATA, PROMPT_QUESITOS, PROMPT_SENTENCA

logger = logging.getLogger("enrichment-engine.juri")

router = APIRouter()

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class JuriExtractionRequest(BaseModel):
    file_url: str  # URL to download the file
    tipo: Literal["quesitos", "sentenca", "ata"]


class JuriExtractionResponse(BaseModel):
    tipo: str
    dados_extraidos: dict
    processing_time_ms: int
    texto_ocr: str | None = None  # raw OCR text for debugging


# ---------------------------------------------------------------------------
# Prompt mapping
# ---------------------------------------------------------------------------

PROMPT_MAP: dict[str, str] = {
    "quesitos": PROMPT_QUESITOS,
    "sentenca": PROMPT_SENTENCA,
    "ata": PROMPT_ATA,
}

# File type detection
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp"}
PDF_EXTENSIONS = {".pdf"}

IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/bmp",
    "image/webp",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _detect_file_type(url: str, content_type: str | None) -> Literal["pdf", "image"]:
    """Detect whether the file is a PDF or image based on URL extension and content-type."""
    url_lower = url.lower().split("?")[0]  # strip query params

    # Check by extension
    for ext in PDF_EXTENSIONS:
        if url_lower.endswith(ext):
            return "pdf"
    for ext in IMAGE_EXTENSIONS:
        if url_lower.endswith(ext):
            return "image"

    # Check by content-type header
    if content_type:
        ct = content_type.lower()
        if "pdf" in ct:
            return "pdf"
        if any(img_ct in ct for img_ct in IMAGE_CONTENT_TYPES):
            return "image"

    # Default to PDF (most common for legal docs)
    return "pdf"


async def _download_file(url: str) -> tuple[bytes, str | None]:
    """Download file from URL, return (bytes, content_type)."""
    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        content_type = resp.headers.get("content-type")
        return resp.content, content_type


async def _ocr_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF using existing OCR service."""
    from services.ocr_service import extract_text_with_ocr

    result = await extract_text_with_ocr(pdf_bytes, language="por", dpi=300)

    if result.get("error"):
        logger.warning("OCR completed with error: %s", result["error"])

    pages = result.get("pages", [])
    if not pages:
        raise ValueError(f"OCR returned no pages. Error: {result.get('error', 'unknown')}")

    # Concatenate all pages
    return "\n\n".join(p["text"] for p in pages if p.get("text"))


async def _ocr_image(image_bytes: bytes) -> str:
    """Extract text from an image using Tesseract directly."""
    try:
        import pytesseract
        from PIL import Image
        import io

        img = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(img, lang="por")
        return text.strip()
    except ImportError as e:
        logger.warning("Image OCR dependencies missing: %s", e)
        raise ValueError(f"Image OCR dependencies not available: {e}") from e


def _image_media_type(url: str, content_type: str | None) -> str:
    """Determine the media type string for Anthropic vision API."""
    url_lower = url.lower().split("?")[0]
    if url_lower.endswith(".png"):
        return "image/png"
    if url_lower.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if url_lower.endswith((".tiff", ".tif")):
        return "image/tiff"  # Anthropic may not support tiff — fallback to OCR
    if url_lower.endswith(".webp"):
        return "image/webp"
    if content_type and content_type.lower() in IMAGE_CONTENT_TYPES:
        return content_type.lower()
    return "image/jpeg"  # safe default


async def _extract_with_claude_vision(
    image_bytes: bytes,
    media_type: str,
    system_prompt: str,
) -> dict[str, Any]:
    """Use Anthropic Claude vision to extract data directly from an image."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY not configured")

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    message = await client.messages.create(
        model=settings.claude_sonnet_model,
        max_tokens=settings.claude_max_tokens,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": b64_image,
                        },
                    },
                    {
                        "type": "text",
                        "text": "Extraia os dados estruturados deste documento conforme as instruções do sistema. Retorne APENAS JSON válido.",
                    },
                ],
            }
        ],
    )

    response_text = message.content[0].text if message.content else ""
    return _parse_json_response(response_text)


async def _extract_with_claude_text(
    text: str,
    system_prompt: str,
) -> dict[str, Any]:
    """Use Anthropic Claude with OCR text to extract structured data."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY not configured")

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # Truncate if too long
    max_chars = 150_000
    if len(text) > max_chars:
        text = text[:max_chars] + "\n\n[... TEXTO TRUNCADO POR LIMITE ...]"
        logger.warning("Text truncated from %d to %d chars", len(text), max_chars)

    message = await client.messages.create(
        model=settings.claude_sonnet_model,
        max_tokens=settings.claude_max_tokens,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": f"DOCUMENTO (texto extraído por OCR):\n\n{text}\n\nExtraia os dados estruturados conforme as instruções do sistema. Retorne APENAS JSON válido.",
            }
        ],
    )

    response_text = message.content[0].text if message.content else ""
    return _parse_json_response(response_text)


def _parse_json_response(response_text: str) -> dict[str, Any]:
    """Parse JSON from Claude response, handling markdown code blocks."""
    # Try direct parse
    try:
        return json.loads(response_text.strip())
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code block
    json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", response_text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Try finding first { to last }
    first_brace = response_text.find("{")
    last_brace = response_text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(response_text[first_brace : last_brace + 1])
        except json.JSONDecodeError:
            pass

    logger.warning("Failed to parse Claude JSON response")
    raise ValueError("Could not parse structured data from Claude response")


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post("/juri/extrair", response_model=JuriExtractionResponse)
async def juri_extraction_endpoint(request: JuriExtractionRequest):
    """
    Extract structured data from jury trial documents.

    Supports three document types:
    - **quesitos**: Jury question/voting sheet
    - **sentenca**: Sentencing document with dosimetria
    - **ata**: Session minutes

    Flow: Download file -> detect type -> OCR if needed -> Claude extraction -> JSON
    """
    start_time = time.time()
    settings = get_settings()

    # Validate Anthropic availability
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY not configured — extraction unavailable",
        )

    prompt = PROMPT_MAP[request.tipo]
    ocr_text: str | None = None

    try:
        # 1. Download file
        logger.info("Downloading file | tipo=%s | url=%s", request.tipo, request.file_url[:100])
        file_bytes, content_type = await _download_file(request.file_url)
        logger.info("Downloaded %d bytes | content_type=%s", len(file_bytes), content_type)

        # 2. Detect file type
        file_type = _detect_file_type(request.file_url, content_type)
        logger.info("Detected file type: %s", file_type)

        # 3. Extract based on file type
        if file_type == "pdf":
            # PDF -> OCR -> Claude text extraction
            logger.info("Processing PDF with OCR...")
            ocr_text = await _ocr_pdf(file_bytes)

            if not ocr_text or len(ocr_text.strip()) < 20:
                raise ValueError("OCR produced insufficient text from PDF")

            logger.info("OCR extracted %d chars from PDF", len(ocr_text))
            dados = await _extract_with_claude_text(ocr_text, prompt)

        else:
            # Image -> try Claude vision first, fall back to OCR + text
            logger.info("Processing image...")
            media_type = _image_media_type(request.file_url, content_type)

            # Anthropic vision supports jpeg, png, gif, webp
            vision_supported = media_type in {"image/jpeg", "image/png", "image/gif", "image/webp"}

            if vision_supported:
                try:
                    logger.info("Using Claude vision for image extraction (media_type=%s)", media_type)
                    dados = await _extract_with_claude_vision(file_bytes, media_type, prompt)
                except Exception as e:
                    logger.warning("Claude vision failed, falling back to OCR: %s", str(e))
                    ocr_text = await _ocr_image(file_bytes)
                    if not ocr_text or len(ocr_text.strip()) < 20:
                        raise ValueError("OCR produced insufficient text from image") from e
                    dados = await _extract_with_claude_text(ocr_text, prompt)
            else:
                # Unsupported vision format (e.g. TIFF) — use OCR
                logger.info("Vision not supported for %s, using OCR", media_type)
                ocr_text = await _ocr_image(file_bytes)
                if not ocr_text or len(ocr_text.strip()) < 20:
                    raise ValueError("OCR produced insufficient text from image")
                dados = await _extract_with_claude_text(ocr_text, prompt)

        processing_time_ms = int((time.time() - start_time) * 1000)

        logger.info(
            "Extraction COMPLETED | tipo=%s | time_ms=%d | keys=%s",
            request.tipo,
            processing_time_ms,
            list(dados.keys()),
        )

        return JuriExtractionResponse(
            tipo=request.tipo,
            dados_extraidos=dados,
            processing_time_ms=processing_time_ms,
            texto_ocr=ocr_text,
        )

    except httpx.HTTPStatusError as e:
        logger.error("File download failed: %s", str(e))
        raise HTTPException(
            status_code=502,
            detail=f"Failed to download file: {e.response.status_code} {str(e)[:200]}",
        )
    except ValueError as e:
        processing_time_ms = int((time.time() - start_time) * 1000)
        logger.error("Extraction failed: %s", str(e))
        raise HTTPException(
            status_code=422,
            detail=f"Extraction failed: {str(e)[:300]}",
        )
    except Exception as e:
        processing_time_ms = int((time.time() - start_time) * 1000)
        logger.exception("Juri extraction endpoint error | tipo=%s", request.tipo)
        raise HTTPException(
            status_code=500,
            detail=f"Extraction error: {str(e)[:300]}",
        )
