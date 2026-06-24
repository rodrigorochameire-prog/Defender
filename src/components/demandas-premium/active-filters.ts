/**
 * Deriva os "chips de filtro ativo" do estado de filtro da tela Demandas
 * (Fase 2 do redesign). Puro/testável: a view passa o estado + resolvers de
 * rótulo e renderiza o resultado numa barra com X por chip + "Limpar tudo".
 */

export interface FilterChip {
  /** Identifica QUAL filtro o chip representa (a view despacha o clear por aqui).
   *  Atribuição usa `atrib:<valor>` para limpar só aquele item do array. */
  key: string;
  label: string;
}

export interface ActiveFilterState {
  searchTerm?: string;
  prazo?: string | null;
  atribuicoes?: string[];
  estadoPrisional?: string | null;
  tipoAto?: string | null;
  tipoProcesso?: string | null;
  statusGroup?: string | null;
  /** Filtros rápidos de prazo/expedição (cockpit) já resolvidos em {key,label}. */
  pills?: { key: string; label: string }[];
}

export interface ChipLabelers {
  statusLabel?: (group: string) => string;
  atribLabel?: (atrib: string) => string;
  prisionalLabel?: (estado: string) => string;
}

const PRAZO_LABELS: Record<string, string> = {
  atrasados: "Atrasados",
  hoje: "Vence hoje",
  semana: "Esta semana",
  sem_prazo: "Sem prazo",
  expedidas_hoje: "Expedidas hoje",
  expedidas_semana: "Expedidas (7d)",
  reu_preso: "Réu preso",
};

export function buildActiveFilterChips(s: ActiveFilterState, l: ChipLabelers = {}): FilterChip[] {
  const chips: FilterChip[] = [];
  if (s.searchTerm && s.searchTerm.trim()) {
    chips.push({ key: "search", label: `"${s.searchTerm.trim()}"` });
  }
  if (s.statusGroup) {
    chips.push({ key: "status", label: l.statusLabel?.(s.statusGroup) ?? s.statusGroup });
  }
  for (const a of s.atribuicoes ?? []) {
    chips.push({ key: `atrib:${a}`, label: l.atribLabel?.(a) ?? a });
  }
  if (s.prazo) {
    chips.push({ key: "prazo", label: PRAZO_LABELS[s.prazo] ?? s.prazo });
  }
  if (s.estadoPrisional) {
    chips.push({ key: "prisional", label: l.prisionalLabel?.(s.estadoPrisional) ?? s.estadoPrisional });
  }
  if (s.tipoAto) chips.push({ key: "ato", label: s.tipoAto });
  if (s.tipoProcesso) chips.push({ key: "tipoProc", label: s.tipoProcesso });
  for (const p of s.pills ?? []) chips.push({ key: `pill:${p.key}`, label: p.label });
  return chips;
}

/** True quando há qualquer filtro ativo (útil pra decidir render da barra). */
export function hasActiveFilters(s: ActiveFilterState): boolean {
  return buildActiveFilterChips(s).length > 0;
}
