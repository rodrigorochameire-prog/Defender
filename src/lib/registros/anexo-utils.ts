// src/lib/registros/anexo-utils.ts
export type AnexoTipo = "imagem" | "documento";

export const MAX_BYTES = 10 * 1024 * 1024; // 10MB (limite do bucket documents)
const COMPRESS_THRESHOLD = 1.5 * 1024 * 1024; // imagens acima disto são comprimidas no cliente

/** Mimes aceitos. HEIC/HEIF entram no cliente e são convertidos para JPEG antes do upload. */
export const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export function mimeToTipo(mime: string): AnexoTipo {
  return mime.startsWith("image/") ? "imagem" : "documento";
}

export function needsHeicConversion(mime: string): boolean {
  return mime === "image/heic" || mime === "image/heif";
}

export function needsCompression(mime: string, sizeBytes: number): boolean {
  return mime.startsWith("image/") && sizeBytes > COMPRESS_THRESHOLD;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "jpg",
  "image/heif": "jpg",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

function slugify(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "arquivo";
}

/** registros/{registroId}/{uuid}-{slug}.{ext} */
export function buildStoragePath(
  registroId: number,
  fileName: string,
  uuid: () => string,
  mime?: string,
): string {
  const extFromName = (fileName.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
  const ext = extFromName || (mime ? EXT_BY_MIME[mime] : "") || "bin";
  return `registros/${registroId}/${uuid()}-${slugify(fileName)}.${ext}`;
}
