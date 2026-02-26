/**
 * PDF Text Extractor — pdfjs-dist (Mozilla)
 *
 * Extrai texto de cada página de um PDF, com posições.
 * Usado server-side (Inngest jobs / API routes).
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
 */
export async function extractTextFromPdf(
  pdfBuffer: Buffer
): Promise<PdfExtractionResult> {
  try {
    // Dynamic import — pdfjs-dist legacy build for Node.js (no DOM/canvas)
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const uint8Array = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;

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
 * Agrupa páginas em blocos de N para enviar ao classificador.
 * Retorna blocos com texto concatenado e range de páginas.
 */
export function chunkPages(
  pages: PageText[],
  chunkSize: number = 20
): Array<{ startPage: number; endPage: number; text: string }> {
  const chunks: Array<{ startPage: number; endPage: number; text: string }> = [];

  for (let i = 0; i < pages.length; i += chunkSize) {
    const slice = pages.slice(i, i + chunkSize);
    chunks.push({
      startPage: slice[0].pageNumber,
      endPage: slice[slice.length - 1].pageNumber,
      text: slice
        .map((p) => `[PÁGINA ${p.pageNumber}]\n${p.text}`)
        .join("\n\n"),
    });
  }

  return chunks;
}
