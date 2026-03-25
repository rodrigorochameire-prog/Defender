/**
 * PDF Text Extractor — unpdf (serverless-compatible)
 *
 * Extrai texto de cada página de um PDF, com posições.
 * Usado server-side (tRPC mutations / API routes).
 *
 * Uses `unpdf` which bundles pdfjs-dist with proper worker support
 * for serverless environments (Vercel, Cloudflare, etc).
 */

export interface PageText {
  pageNumber: number;
  text: string;
  lineCount: number;
}

export interface PdfExtractionResult {
  success: boolean;
  totalPages: number;
  pages: PageText[];
  fullText: string;
  error?: string;
}

/**
 * Extrai texto de todas as páginas de um PDF a partir de um Buffer.
 * Uses unpdf for serverless-compatible text extraction.
 */
export async function extractTextFromPdf(
  pdfBuffer: Buffer
): Promise<PdfExtractionResult> {
  try {
    const { getDocumentProxy } = await import("unpdf");

    const uint8Array = new Uint8Array(pdfBuffer);
    const pdfDocument = await getDocumentProxy(uint8Array);

    const totalPages = pdfDocument.numPages;
    const pages: PageText[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();

      // Reconstruct text from items, preserving line breaks
      let lastY: number | null = null;
      let pageText = "";

      for (const item of textContent.items) {
        if (!("str" in item)) continue;
        const textItem = item as { str: string; transform: number[] };
        const currentY = textItem.transform[5];

        // New line when Y position changes significantly
        if (lastY !== null && Math.abs(currentY - lastY) > 2) {
          pageText += "\n";
        } else if (lastY !== null && pageText.length > 0 && !pageText.endsWith(" ")) {
          pageText += " ";
        }

        pageText += textItem.str;
        lastY = currentY;
      }

      const trimmedText = pageText.trim();
      pages.push({
        pageNumber: i,
        text: trimmedText,
        lineCount: trimmedText.split("\n").length,
      });
    }

    const fullText = pages.map((p) => p.text).join("\n\n--- PÁGINA " + "---\n\n");

    return {
      success: true,
      totalPages,
      pages,
      fullText,
    };
  } catch (error) {
    console.error("[pdf-extractor] Error:", error);
    return {
      success: false,
      totalPages: 0,
      pages: [],
      fullText: "",
      error: error instanceof Error ? error.message : "Unknown error extracting PDF",
    };
  }
}

/**
 * Detects if a PDF is scanned (needs OCR).
 * Criteria:
 * - Average characters per page < 50
 * - More than 70% of pages have empty or very short text
 */
export function detectNeedsOcr(pages: PageText[]): boolean {
  if (pages.length === 0) return false;

  const totalChars = pages.reduce((sum, p) => sum + p.text.trim().length, 0);
  const avgCharsPerPage = totalChars / pages.length;

  const emptyPages = pages.filter((p) => p.text.trim().length < 30).length;
  const emptyRatio = emptyPages / pages.length;

  return avgCharsPerPage < 50 || emptyRatio > 0.7;
}

/**
 * Agrupa páginas em blocos de N para enviar ao classificador.
 * Retorna blocos com texto concatenado e range de páginas.
 *
 * @param overlap — number of pages shared between adjacent chunks (default 2).
 *   Prevents sections at chunk boundaries from being missed by the classifier.
 */
export function chunkPages(
  pages: PageText[],
  chunkSize: number = 30,
  overlap: number = 3
): Array<{ startPage: number; endPage: number; text: string }> {
  const chunks: Array<{ startPage: number; endPage: number; text: string }> = [];
  const step = Math.max(1, chunkSize - overlap);

  for (let i = 0; i < pages.length; i += step) {
    const slice = pages.slice(i, i + chunkSize);
    if (slice.length === 0) break;
    chunks.push({
      startPage: slice[0].pageNumber,
      endPage: slice[slice.length - 1].pageNumber,
      text: slice
        .map((p) => `[PÁGINA ${p.pageNumber}]\n${p.text}`)
        .join("\n\n"),
    });
    // If this slice already reaches the end, stop
    if (i + chunkSize >= pages.length) break;
  }

  return chunks;
}
