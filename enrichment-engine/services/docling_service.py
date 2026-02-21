"""
Docling Service — Parsing de documentos (PDF, DOCX, imagens) para Markdown.
Usa IBM Docling para extração com alta fidelidade de layout, tabelas e OCR.
"""

import logging
import tempfile
from pathlib import Path

import httpx

from config import get_settings

logger = logging.getLogger("enrichment-engine.docling")


class DoclingService:
    """Wrapper para IBM Docling — converte documentos em Markdown estruturado."""

    def __init__(self):
        self.settings = get_settings()
        self._converter = None

    def _get_converter(self):
        """Lazy init do DocumentConverter (pesado, carrega modelos)."""
        if self._converter is None:
            try:
                from docling.document_converter import DocumentConverter, PdfFormatOption
                from docling.datamodel.pipeline_options import PdfPipelineOptions
                from docling.datamodel.base_models import InputFormat

                pipeline_options = PdfPipelineOptions()
                pipeline_options.do_ocr = self.settings.docling_ocr_enabled
                pipeline_options.ocr_options = {
                    "lang": [self.settings.docling_ocr_lang],
                }

                self._converter = DocumentConverter(
                    format_options={
                        InputFormat.PDF: PdfFormatOption(
                            pipeline_options=pipeline_options
                        )
                    }
                )
                logger.info("Docling DocumentConverter initialized successfully")
            except ImportError as e:
                logger.error("Docling not installed: %s", e)
                raise RuntimeError("Docling library not available") from e
            except Exception as e:
                logger.error("Failed to initialize Docling: %s", e)
                raise

        return self._converter

    async def download_file(self, url: str) -> tuple[Path, str]:
        """
        Baixa arquivo via URL signed.
        Retorna (path_local, mime_type_detectado).
        """
        max_size = self.settings.docling_max_file_size_mb * 1024 * 1024

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.get(url)
            response.raise_for_status()

            content_length = len(response.content)
            if content_length > max_size:
                raise ValueError(
                    f"File too large: {content_length / 1024 / 1024:.1f}MB "
                    f"(max: {self.settings.docling_max_file_size_mb}MB)"
                )

            # Detectar extensão pelo content-type
            content_type = response.headers.get("content-type", "")
            ext = self._mime_to_ext(content_type)

            # Salvar em arquivo temporário
            tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
            tmp.write(response.content)
            tmp.close()

            logger.info(
                "Downloaded file | size=%.1fKB mime=%s path=%s",
                content_length / 1024,
                content_type,
                tmp.name,
            )
            return Path(tmp.name), content_type

    def parse_to_markdown(self, file_path: Path) -> str:
        """
        Converte documento para Markdown usando Docling.
        Preserva layout, tabelas (como Markdown tables) e texto OCR.
        """
        converter = self._get_converter()

        logger.info("Parsing document: %s", file_path.name)

        try:
            result = converter.convert(str(file_path))
            markdown = result.document.export_to_markdown()

            logger.info(
                "Parsed successfully | chars=%d pages=%s",
                len(markdown),
                getattr(result.document, "num_pages", "?"),
            )
            return markdown

        except Exception as e:
            logger.error("Docling parse failed for %s: %s", file_path.name, e)
            raise RuntimeError(f"Document parsing failed: {e}") from e

    def parse_from_bytes(self, content: bytes, filename: str = "document.pdf") -> str:
        """
        Converte bytes de documento para Markdown.
        Útil quando o arquivo já está em memória.
        """
        ext = Path(filename).suffix or ".pdf"
        tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
        tmp.write(content)
        tmp.close()

        try:
            return self.parse_to_markdown(Path(tmp.name))
        finally:
            Path(tmp.name).unlink(missing_ok=True)

    @staticmethod
    def _mime_to_ext(mime_type: str) -> str:
        """Mapeia MIME type para extensão de arquivo."""
        mime_map = {
            "application/pdf": ".pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
            "application/msword": ".doc",
            "image/png": ".png",
            "image/jpeg": ".jpg",
            "image/tiff": ".tiff",
        }
        # Limpar mime type (pode ter charset)
        base_mime = mime_type.split(";")[0].strip()
        return mime_map.get(base_mime, ".pdf")

    @staticmethod
    def is_available() -> bool:
        """Verifica se Docling está instalado e funcional."""
        try:
            from docling.document_converter import DocumentConverter  # noqa: F401
            return True
        except ImportError:
            return False


# Singleton
_docling_service: DoclingService | None = None


def get_docling_service() -> DoclingService:
    """Retorna singleton do DoclingService."""
    global _docling_service
    if _docling_service is None:
        _docling_service = DoclingService()
    return _docling_service
