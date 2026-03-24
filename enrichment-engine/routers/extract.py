"""
POST /api/extract-text — Lightweight Docling text extraction.
Returns Markdown text + per-page text without classification or enrichment.
Used by Next.js pipeline for high-quality text extraction from scanned/complex PDFs.
"""
from __future__ import annotations

import logging
import time

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("enrichment-engine.extract")
router = APIRouter()


class ExtractTextRequest(BaseModel):
    file_url: str
    drive_file_id: str | None = None


class ExtractPage(BaseModel):
    page_number: int
    text: str
    char_count: int
    quality: str  # good (>100 chars) | low (10-100) | failed (<10)


class ExtractTextResponse(BaseModel):
    pages: list[ExtractPage]
    markdown: str
    total_pages: int
    ocr_applied: bool
    extraction_engine: str
    processing_time_ms: int


def _split_markdown_to_pages(markdown: str) -> list[ExtractPage]:
    """Split Docling markdown output into approximate pages."""
    # Docling doesn't always have clear page breaks — split by common markers
    # Try "## Page" markers or "---" separators
    import re

    # Try to split by page markers that Docling sometimes inserts
    page_texts = re.split(r'\n---\n|\n## Page \d+\n', markdown)

    if len(page_texts) <= 1:
        # No page markers — split by approximate chunk size (~3000 chars per page)
        chunk_size = 3000
        page_texts = []
        for i in range(0, len(markdown), chunk_size):
            # Try to split at a paragraph boundary
            end = min(i + chunk_size, len(markdown))
            if end < len(markdown):
                # Look for paragraph break near the end
                last_break = markdown.rfind('\n\n', i, end)
                if last_break > i + chunk_size // 2:
                    end = last_break
            page_texts.append(markdown[i:end])

    pages = []
    for i, text in enumerate(page_texts):
        text = text.strip()
        char_count = len(text)
        quality = "good" if char_count > 100 else "low" if char_count >= 10 else "failed"
        pages.append(ExtractPage(
            page_number=i + 1,
            text=text,
            char_count=char_count,
            quality=quality,
        ))

    return pages


@router.post("/extract-text", response_model=ExtractTextResponse)
async def extract_text_endpoint(request: ExtractTextRequest):
    """
    Extracts text from PDF using Docling (with built-in OCR).
    Returns structured Markdown + per-page text with quality metrics.
    """
    start_time = time.time()

    try:
        from services.docling_service import get_docling_service
        docling = get_docling_service()
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Docling service unavailable: {e}",
        )

    # Download file
    try:
        if request.file_url.startswith("drive://"):
            raise HTTPException(
                status_code=400,
                detail="Google Drive URLs not supported. Provide a direct/signed URL.",
            )

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.get(request.file_url)
            resp.raise_for_status()
            pdf_bytes = resp.content

        logger.info(
            "Downloaded file for extraction | size=%.1fKB | url=%s",
            len(pdf_bytes) / 1024,
            request.file_url[:80],
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Failed to download: {e}")

    # Parse with Docling
    try:
        markdown = docling.parse_from_bytes(pdf_bytes)
        ocr_applied = get_docling_service().settings.docling_ocr_enabled
    except Exception as e:
        logger.error("Docling extraction failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Extraction failed: {e}")

    # Split into pages
    pages = _split_markdown_to_pages(markdown)
    processing_time_ms = int((time.time() - start_time) * 1000)

    logger.info(
        "Extraction complete | pages=%d chars=%d ocr=%s time=%dms",
        len(pages), len(markdown), ocr_applied, processing_time_ms,
    )

    return ExtractTextResponse(
        pages=pages,
        markdown=markdown,
        total_pages=len(pages),
        ocr_applied=ocr_applied,
        extraction_engine="docling",
        processing_time_ms=processing_time_ms,
    )
