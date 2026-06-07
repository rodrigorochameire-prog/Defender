export type FolderKey = "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | "GRUPO_JURI";

const MAP: Record<string, FolderKey> = {
  JURI: "JURI",
  VIOLENCIA_DOMESTICA: "VVD",
  EXECUCAO_PENAL: "EP",
  SUBSTITUICAO: "SUBSTITUICAO",
};

/** Atribuição primária do assistido → chave de pasta do Drive (ou null se não há pasta dedicada). */
export function atribuicaoToFolderKey(atribuicao: string | null | undefined): FolderKey | null {
  if (!atribuicao) return null;
  return MAP[atribuicao] ?? null;
}
