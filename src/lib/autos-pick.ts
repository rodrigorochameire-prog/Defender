/**
 * Seleção do PDF "autos" principal entre os arquivos de um processo/assistido.
 *
 * Os autos do PJe normalmente entram com nome contendo o CNJ + "processo"
 * (ex.: "8009582-13.2024.8.05.0039-...-processo.pdf") ou categoria/documentType
 * "autos". Análises/relatórios/peças NÃO são autos e são despriorizados.
 */

export interface PdfLike {
  driveFileId?: string | null;
  name?: string | null;
  mimeType?: string | null;
  webViewLink?: string | null;
  fileSize?: number | string | null;
  enrichmentStatus?: string | null;
  categoria?: string | null;
  documentType?: string | null;
  lastModifiedTime?: string | number | Date | null;
}

const CNJ_RE = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

function modifiedMs(f: PdfLike): number {
  const t = f.lastModifiedTime;
  if (!t) return 0;
  const ms = typeof t === "number" ? t : new Date(t).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** Pontua o quão provável é que o arquivo SEJA os autos do processo. */
export function autosScore(f: PdfLike): number {
  const name = (f.name ?? "").toLowerCase();
  const cat = `${f.categoria ?? ""} ${f.documentType ?? ""}`.toLowerCase();
  let score = 0;

  if (/\bautos?\b/.test(cat)) score += 100;
  if (cat.includes("processo")) score += 40;

  if (name.includes("processo") || /\bautos?\b/.test(name)) score += 50;
  if (name.includes("sistematiz")) score += 45; // "Processo Sistematizado"
  if (CNJ_RE.test(name)) score += 40;
  if (name.includes("inteiro teor") || name.includes("integra")) score += 20;

  // Despriorizar o que claramente NÃO são autos
  if (/(an[áa]lise|relat[óo]rio|dossi[êe]|peti[çc][ãa]o|peça|minuta|certid[ãa]o|laudo|despacho|senten[çc]a|decis[ãa]o)/.test(name))
    score -= 30;

  return score;
}

/** Ordena os PDFs por probabilidade de serem os autos (desc), com desempate por data. */
export function rankAutos<T extends PdfLike>(files: T[]): T[] {
  return [...files].sort((a, b) => {
    const d = autosScore(b) - autosScore(a);
    if (d !== 0) return d;
    return modifiedMs(b) - modifiedMs(a);
  });
}

/** Retorna o PDF "autos" principal, ou null se a lista estiver vazia. */
export function pickPrimaryAutos<T extends PdfLike>(files: T[]): T | null {
  const pdfs = files.filter((f) => (f.mimeType ?? "") === "application/pdf");
  if (pdfs.length === 0) return null;
  return rankAutos(pdfs)[0] ?? null;
}
