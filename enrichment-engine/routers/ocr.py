"""
POST /api/ocr — OCR extraction from scanned PDFs via Tesseract.
Fluxo: Download PDF → pdf2image → Tesseract OCR → output per page
"""
from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.ocr_service import extract_text_with_ocr

logger = logging.getLogger("enrichment-engine.ocr")

router = APIRouter()


class OcrRequest(BaseModel):
    file_url: str
    drive_file_id: str | None = None
    language: str = "por"
    dpi: int = 300


class OcrPage(BaseModel):
    page_number: int
    text: str


class OcrResponse(BaseModel):
    pages: list[OcrPage]
    total_pages: int
    ocr_engine: str
    processing_time_ms: int


@router.post("/ocr", response_model=OcrResponse)
async def ocr_endpoint(request: OcrRequest):
    """
    Receives a PDF URL and returns OCR-extracted text per page.
    """
    try:
        # Download PDF
        if request.file_url.startswith("drive://"):
            # Google Drive download not available in Python engine
            raise HTTPException(
                status_code=400,
                detail="Google Drive download not available in enrichment engine. Provide a direct URL.",
            )
        else:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.get(request.file_url)
                resp.raise_for_status()
                pdf_bytes = resp.content

        result = await extract_text_with_ocr(
            pdf_bytes,
            language=request.language,
            dpi=request.dpi,
        )

        if "error" in result:
            logger.warning(f"OCR completed with error: {result['error']}")

        return OcrResponse(
            pages=[OcrPage(**p) for p in result["pages"]],
            total_pages=result["total_pages"],
            ocr_engine=result["ocr_engine"],
            processing_time_ms=result["processing_time_ms"],
        )

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Failed to download PDF: {e}")
    except Exception as e:
        logger.exception("OCR endpoint error")
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")
