// ==========================================
// SECTION BUCKETING — distribui demandas de um sub-grupo nas suas seções
// ==========================================
//
// Invariante garantida: TODO item entregue volta exatamente uma vez — numa
// seção que casa, ou no "leftover". O cabeçalho do sub-grupo conta items.length,
// então o leftover impede a contagem-fantasma (header diz N, render mostra 0)
// quando um item não casa com nenhuma seção (ex.: demanda delegada cujo status
// base não é "delegar", ou status de enum como "4_MONITORAR").

export interface BucketItem {
  id: string | number;
  status?: string | null;
  substatus?: string | null;
  /** Nome do delegatário (preenchido = demanda tem ou teve delegação). */
  delegadoPara?: string | null;
  /**
   * Estado canônico da delegação: "a_delegar" (pendente de aceite) ou
   * "delegado" (ativa). Quando null/undefined a demanda não está em fluxo de
   * delegação e cai no status normal da pipeline.
   */
  statusDelegacao?: string | null;
}

export interface BucketSection {
  label: string;
  statuses: string[];
}

/**
 * Normaliza um status/substatus para a chave canônica das seções.
 * Remove prefixo de ordenação em qualquer forma — "2 - Elaborar", "4_MONITORAR",
 * "4-monitorar" — depois minúsculas, sem acentos, espaços → underscore.
 */
export function normalizeStatusKey(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/^\d+\s*[-_]\s*/, "") // "2 - ", "4_", "4-"
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_");
}

/**
 * Chaves efetivas de um item para fins de seção.
 *
 * A dimensão delegação (statusDelegacao) tem precedência sobre o status da
 * pipeline, exceto quando o defensor MOVE o card para uma coluna real — aí
 * ele migra mantendo o chip de delegação (a delegação persiste, só muda de
 * lugar no quadro).
 *
 * Valores canônicos de statusDelegacao:
 *   "a_delegar" → seção "A delegar"
 *   "delegado"  → seção "Delegados" (padrão), ou coluna da pipeline se
 *                 substatus for um status real (não placeholder "delegar")
 *   null/undefined → usa substatus (ou status) normalizado
 */
export function effectiveSectionKeys(item: BucketItem): string[] {
  // Delegação (statusDelegacao) tem precedência sobre o status da pipeline,
  // exceto quando o defensor MOVE o card para uma coluna real — aí ele migra
  // mantendo o chip (a delegação persiste, só muda de lugar no quadro).
  if (item.statusDelegacao === "a_delegar") return ["a_delegar"];
  if (item.statusDelegacao === "delegado") {
    const sub = normalizeStatusKey(item.substatus);
    // Placeholder ("delegar") ou vazio = ainda na casa padrão "Delegados".
    if (!sub || sub === "delegar") return ["delegado"];
    return [sub];
  }
  return [normalizeStatusKey(item.substatus || item.status)];
}

/**
 * Distribui os itens nas seções. Cada item entra na PRIMEIRA seção cujas
 * `statuses` interceptam as chaves efetivas do item; os sem correspondência
 * vão para `leftover`.
 */
export function bucketIntoSections<T extends BucketItem>(
  items: T[],
  sections: BucketSection[],
): { perSection: Map<string, T[]>; leftover: T[] } {
  const perSection = new Map<string, T[]>();
  for (const s of sections) perSection.set(s.label, []);
  const leftover: T[] = [];

  for (const item of items) {
    const keys = effectiveSectionKeys(item);
    const section = sections.find((s) => s.statuses.some((st) => keys.includes(st)));
    if (section) perSection.get(section.label)!.push(item);
    else leftover.push(item);
  }

  return { perSection, leftover };
}
