import io
import time
import logging

logger = logging.getLogger(__name__)


async def extract_text_with_ocr(
    pdf_bytes: bytes,
    language: str = "por",
    dpi: int = 300,
) -> dict:
    """
    Converts each PDF page to image and applies Tesseract OCR.
    Falls back gracefully if dependencies are missing.
    """
    start_time = time.time()

    try:
        import pytesseract
        from pdf2image import convert_from_bytes
    except ImportError as e:
        logger.warning(f"OCR dependencies not installed: {e}. Returning empty result.")
        return {
            "pages": [],
            "total_pages": 0,
            "ocr_engine": "tesseract",
            "processing_time_ms": 0,
            "error": f"Missing dependency: {e}",
        }

    try:
        images = convert_from_bytes(pdf_bytes, dpi=dpi)
    except Exception as e:
        logger.error(f"Failed to convert PDF to images: {e}")
        return {
            "pages": [],
            "total_pages": 0,
            "ocr_engine": "tesseract",
            "processing_time_ms": int((time.time() - start_time) * 1000),
            "error": str(e),
        }

    pages = []
    for i, image in enumerate(images):
        try:
            text = pytesseract.image_to_string(image, lang=language)
            pages.append({
                "page_number": i + 1,
                "text": text.strip(),
            })
        except Exception as e:
            logger.warning(f"OCR failed for page {i + 1}: {e}")
            pages.append({
                "page_number": i + 1,
                "text": "",
            })

    processing_time_ms = int((time.time() - start_time) * 1000)

    return {
        "pages": pages,
        "total_pages": len(pages),
        "ocr_engine": "tesseract",
        "processing_time_ms": processing_time_ms,
    }
