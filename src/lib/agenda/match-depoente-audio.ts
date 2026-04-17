export interface MediaFileCandidate {
  driveFileId: string;
  name: string;
  mimeType: string;
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchDepoenteAudio(
  depoenteNome: string,
  candidates: MediaFileCandidate[]
): string | null {
  if (!depoenteNome || candidates.length === 0) return null;
  const nomeNorm = normalize(depoenteNome);
  const tokens = nomeNorm.split(" ").filter((t) => t.length >= 3);
  if (tokens.length === 0) return null;

  for (const c of candidates) {
    if (!c.mimeType.startsWith("audio/")) continue;
    const nameNorm = normalize(c.name);
    if (tokens.some((t) => nameNorm.includes(t))) return c.driveFileId;
  }
  return null;
}
