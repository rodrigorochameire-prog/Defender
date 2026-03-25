import io
import time
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# Thread pool for CPU-bound OCR work
_ocr_executor = ThreadPoolExecutor(max_workers=4)


def _ocr_single_page(image, language: str) -> dict:
    """OCR a single PIL image. Runs in thread pool."""
    import pytesseract
    try:
        text = pytesseract.image_to_string(image, lang=language)
        return {"text": text.strip(), "success": True}
    except Exception as e:
        logger.warning(f"OCR failed for page: {e}")
        return {"text": "", "success": False}


async def extract_text_with_ocr(
    pdf_bytes: bytes,
    language: str = "por",
    dpi: int = 200,
) -> dict:
    """
    Converts each PDF page to image and applies Tesseract OCR.
    Features: parallel processing (4 concurrent), adaptive DPI, quality metrics.
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
            "quality_summary": {"good": 0, "low": 0, "failed": 0},
            "error": f"Missing dependency: {e}",
        }

    # Convert PDF pages to images
    try:
        images = convert_from_bytes(pdf_bytes, dpi=dpi)
    except Exception as e:
        logger.error(f"Failed to convert PDF to images: {e}")
        return {
            "pages": [],
            "total_pages": 0,
            "ocr_engine": "tesseract",
            "processing_time_ms": int((time.time() - start_time) * 1000),
            "quality_summary": {"good": 0, "low": 0, "failed": 0},
            "error": str(e),
        }

    loop = asyncio.get_event_loop()

    # Phase 1: OCR all pages in parallel at initial DPI
    async def ocr_page(idx: int, image):
        result = await loop.run_in_executor(
            _ocr_executor, _ocr_single_page, image, language
        )
        return idx, result

    # Run OCR on all pages concurrently (limited by thread pool size)
    tasks = [ocr_page(i, img) for i, img in enumerate(images)]
    results = await asyncio.gather(*tasks)
    results.sort(key=lambda x: x[0])  # Ensure page order

    pages = []
    retry_indices = []

    for idx, result in results:
        text = result["text"]
        char_count = len(text)

        if char_count < 20 and result["success"]:
            # Low quality — mark for DPI retry
            retry_indices.append(idx)
            pages.append({
                "page_number": idx + 1,
                "text": text,
                "char_count": char_count,
                "dpi_used": dpi,
                "quality": "failed" if char_count < 10 else "low",
            })
        else:
            quality = "good" if char_count > 100 else "low" if char_count >= 10 else "failed"
            pages.append({
                "page_number": idx + 1,
                "text": text,
                "char_count": char_count,
                "dpi_used": dpi,
                "quality": quality,
            })

    # Phase 2: Retry failed/low pages at higher DPI
    if retry_indices and dpi < 400:
        logger.info(
            "Retrying %d low-quality pages at 400 DPI",
            len(retry_indices),
        )
        try:
            high_dpi_images = convert_from_bytes(pdf_bytes, dpi=400)

            retry_tasks = [
                ocr_page(idx, high_dpi_images[idx])
                for idx in retry_indices
                if idx < len(high_dpi_images)
            ]
            retry_results = await asyncio.gather(*retry_tasks)

            for idx, result in retry_results:
                text = result["text"]
                char_count = len(text)
                # Only replace if higher DPI gave better result
                if char_count > pages[idx]["char_count"]:
                    quality = "good" if char_count > 100 else "low" if char_count >= 10 else "failed"
                    pages[idx] = {
                        "page_number": idx + 1,
                        "text": text,
                        "char_count": char_count,
                        "dpi_used": 400,
                        "quality": quality,
                    }
        except Exception as e:
            logger.warning(f"High-DPI retry failed: {e}")

    processing_time_ms = int((time.time() - start_time) * 1000)

    # Quality summary
    quality_summary = {"good": 0, "low": 0, "failed": 0}
    for p in pages:
        quality_summary[p["quality"]] = quality_summary.get(p["quality"], 0) + 1

    return {
        "pages": pages,
        "total_pages": len(pages),
        "ocr_engine": "tesseract",
        "processing_time_ms": processing_time_ms,
        "quality_summary": quality_summary,
    }
