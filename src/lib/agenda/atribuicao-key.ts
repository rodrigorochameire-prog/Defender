// src/lib/agenda/atribuicao-key.ts
//
// Função compartilhada para derivar a chave de atribuição a partir dos campos
// `atribuicao` e `area`. Usada tanto pela página agenda/page.tsx quanto pelo
// mapper registro-to-agenda-item.ts — DRY, sem duplicação.

import { normalizeAreaToFilter } from "@/lib/config/atribuicoes";

/**
 * Mapeia os campos `atribuicao` e `area` do banco para a chave de filtro da
 * agenda (ex.: "JURI", "VVD", "EXECUCAO", "SUBSTITUICAO", "SUBSTITUICAO_CIVEL").
 *
 * Lógica (em ordem):
 * 1. Tenta normalizar pelo valor exato via AREA_TO_FILTER_MAP
 * 2. Faz fallback por substring no valor em maiúsculas
 * 3. Se nenhum casar, retorna "SUBSTITUICAO"
 */
export function mapAtribuicaoToKey(
  atribuicao: string | null | undefined,
  area: string | null | undefined,
): string {
  // Primeiro tentar pelo valor exato
  const exactMatch = normalizeAreaToFilter(atribuicao) || normalizeAreaToFilter(area);
  if (exactMatch && exactMatch !== "all") return exactMatch;

  // Fallback para busca por padrão
  if (!atribuicao && !area) return "SUBSTITUICAO";

  const atrib = (atribuicao || area || "").toUpperCase();

  if (atrib.includes("VVD") || atrib.includes("VIOLENCIA") || atrib.includes("DOMESTICA"))
    return "VVD";
  if (atrib.includes("JURI") || atrib.includes("JÚRI")) return "JURI";
  if (atrib.includes("EXECU")) return "EXECUCAO";
  if (atrib.includes("CIVEL") || atrib.includes("FAMILIA") || atrib.includes("FAZENDA"))
    return "SUBSTITUICAO_CIVEL";
  if (atrib.includes("SUBSTITU") || atrib.includes("CRIMINAL")) return "SUBSTITUICAO";

  return "SUBSTITUICAO";
}
