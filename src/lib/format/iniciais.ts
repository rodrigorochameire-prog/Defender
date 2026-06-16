// Conectivos que não entram nas iniciais (evita "Amilton de Souza" → "AD").
const CONECTIVOS_NOME = new Set(["de", "da", "do", "das", "dos", "e"]);

/**
 * Iniciais (até 2 letras) a partir de um nome, ignorando conectivos.
 * Ex.: "Amilton de Souza Santos" → "AS" (não "AD").
 * Fonte única usada pelos avatares dos sheets (agenda e demandas).
 */
export function iniciaisNome(nome: string): string {
  return (nome || "")
    .split(/\s+/)
    .filter((p) => p && !CONECTIVOS_NOME.has(p.toLowerCase()))
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
