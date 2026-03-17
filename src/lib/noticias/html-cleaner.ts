/**
 * Extrai o link de um PDF de um HTML/texto, se houver.
 */
export function extractPdfLink(html: string): string | null {
  const match =
    html.match(/href="([^"]*\.pdf[^"]*)"/i) ||
    html.match(/(https?:\/\/[^\s"<]+\.pdf(?:[?#][^\s"<]*)?)/i);
  return match?.[1] ?? null;
}

/**
 * Baixa um PDF e retorna o texto extraído (máx. 20.000 chars).
 */
export async function fetchPdfContent(pdfUrl: string): Promise<string> {
  const res = await fetch(pdfUrl, {
    headers: { "User-Agent": "OmbudsBot/1.0 (Defensoria Publica BA; legal research)" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`PDF HTTP ${res.status}`);
  const buffer = await res.arrayBuffer();
  const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;
  const parsed = await pdfParse(Buffer.from(buffer));
  // Normaliza espaços e limita tamanho
  const text = parsed.text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return text.substring(0, 20000);
}

/**
 * Remove tags desnecessárias e preserva conteúdo legível.
 */
export function cleanHtml(rawHtml: string): string {
  let html = rawHtml;

  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<nav[\s\S]*?<\/nav>/gi, "");
  html = html.replace(/<aside[\s\S]*?<\/aside>/gi, "");
  html = html.replace(/<footer[\s\S]*?<\/footer>/gi, "");
  html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  html = html.replace(/<form[\s\S]*?<\/form>/gi, "");
  html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  html = html.replace(/ (class|id|data-[a-z-]+|style|onclick|onload)="[^"]*"/gi, "");
  html = html.replace(/<(\w+)[^>]*>\s*<\/\1>/gi, "");

  return html.trim();
}

/** Extrai texto puro (sem HTML) para preview/resumo */
export function extractPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Gera resumo de N caracteres do texto */
export function gerarResumo(html: string, maxChars = 300): string {
  const plain = extractPlainText(html);
  if (plain.length <= maxChars) return plain;
  return plain.slice(0, maxChars).replace(/\s\S*$/, "") + "…";
}
