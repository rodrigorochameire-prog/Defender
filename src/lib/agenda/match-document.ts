export interface DriveFile {
  driveFileId: string;
  name: string;
  mimeType?: string | null;
}

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TERMO_KEYWORDS = ["termo", "depoimento", "oitiva"];
const LAUDO_KEYWORDS = ["laudo", "pericia", "exame"];
const LAUDO_TYPE_HINTS = [
  "dna",
  "balistica",
  "balistico",
  "necropsia",
  "toxicologico",
  "psiquiatrico",
  "cadaverico",
  "grafotecnico",
];

export function matchTermoDepoente(
  depoenteNome: string,
  files: DriveFile[],
): string | null {
  const nome = normalizeName(depoenteNome);
  if (!nome) return null;
  const tokens = nome.split(" ").filter((t) => t.length >= 3);
  if (tokens.length === 0) return null;

  const candidates = files.filter((f) => {
    const n = normalizeName(f.name);
    const hasTermoKeyword = TERMO_KEYWORDS.some((k) => n.includes(k));
    if (!hasTermoKeyword) return false;
    return tokens.every((t) => n.includes(t));
  });

  if (candidates.length === 0) return null;
  return candidates[0].driveFileId;
}

export function matchLaudo(
  laudoDescricao: string,
  files: DriveFile[],
): string | null {
  const desc = normalizeName(laudoDescricao);
  if (!desc) return null;

  const typeInDesc = LAUDO_TYPE_HINTS.find((t) => desc.includes(t));

  const candidates = files.filter((f) => {
    const n = normalizeName(f.name);
    const hasLaudoKeyword = LAUDO_KEYWORDS.some((k) => n.includes(k));
    if (!hasLaudoKeyword) return false;
    if (typeInDesc && !n.includes(typeInDesc)) return false;
    return true;
  });

  if (candidates.length === 0) return null;
  return candidates[0].driveFileId;
}
