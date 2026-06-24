import { normalizeName } from "./match-document";

export type DocumentCategory =
  | "inquerito"
  | "acao-penal"
  | "laudo"
  | "termo"
  | "relatorio"
  | "midia"
  | "imagem"
  | "outros";

export const CATEGORY_ORDER: DocumentCategory[] = [
  "inquerito",
  "acao-penal",
  "laudo",
  "termo",
  "relatorio",
  "midia",
  "imagem",
  "outros",
];

export const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  inquerito: "Inquérito Policial",
  "acao-penal": "Ação Penal",
  laudo: "Laudos/Perícias",
  termo: "Termos/Oitivas",
  relatorio: "Relatórios",
  midia: "Mídia",
  imagem: "Imagens",
  outros: "Outros",
};

interface FileLike {
  name: string;
  mimeType?: string | null;
}

export function categorizeDocument(file: FileLike): DocumentCategory {
  const mime = file.mimeType ?? "";
  if (mime.startsWith("image/")) return "imagem";
  if (mime.startsWith("audio/") || mime.startsWith("video/")) return "midia";

  const n = normalizeName(file.name);
  if (/\blaudo\b/.test(n) || /\bpericia\b/.test(n)) return "laudo";
  if (/\btermo\b/.test(n) || /\bdepoimento\b/.test(n) || /\boitiva\b/.test(n)) return "termo";
  if (/\brelatorio\b/.test(n)) return "relatorio";
  if (/\bip\b/.test(n) || /\binquerito\b/.test(n)) return "inquerito";
  if (/\bap\b/.test(n) || /\bapelacao\b/.test(n) || /acao penal/.test(n)) return "acao-penal";

  return "outros";
}

export interface GrupoCategoria<T> {
  category: DocumentCategory;
  label: string;
  files: T[];
}

/**
 * Agrupa arquivos por categoria documental (taxonomia §F: "biblioteca processual
 * refinada"), na ordem canônica CATEGORY_ORDER. Só retorna grupos não-vazios e
 * preserva a ordem de entrada dentro de cada grupo.
 */
export function agruparPorCategoria<T extends FileLike>(files: T[]): GrupoCategoria<T>[] {
  if (!Array.isArray(files) || files.length === 0) return [];
  const buckets = new Map<DocumentCategory, T[]>();
  for (const f of files) {
    const c = categorizeDocument(f);
    const arr = buckets.get(c);
    if (arr) arr.push(f);
    else buckets.set(c, [f]);
  }
  return CATEGORY_ORDER.filter((c) => buckets.has(c)).map((c) => ({
    category: c,
    label: CATEGORY_LABEL[c],
    files: buckets.get(c)!,
  }));
}
