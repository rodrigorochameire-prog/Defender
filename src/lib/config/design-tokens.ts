/**
 * Padrão Defender v2 — Design Tokens
 *
 * Tipografia, espaçamento, cores semânticas, estilos de abas.
 * REGRAS:
 * - Nada abaixo de 11px
 * - Headers nunca abaixo de 16px
 * - Espaçamento em grid de 8px
 * - Cor com propósito semântico
 */

// ============================================
// TIPOGRAFIA
// ============================================

export const TYPO = {
  /** 24px bold — número do processo, títulos de página */
  h1: "text-2xl font-bold tracking-tight",
  /** 20px semibold — título de seção (TESES DEFENSIVAS) */
  h2: "text-xl font-semibold",
  /** 16px semibold — subtítulo (nome da testemunha, crime) */
  h3: "text-base font-semibold",
  /** 14px regular — texto geral, resumos, parágrafos */
  body: "text-sm leading-relaxed",
  /** 12px regular — metadados, pills, badges */
  small: "text-xs",
  /** 11px muted — datas, versão do modelo, hints */
  caption: "text-[11px] text-muted-foreground",
  /** 14px mono — números de processo, CPF, códigos */
  mono: "text-sm font-mono tabular-nums",
  /** 12px uppercase — labels de seção (ACHADOS-CHAVE) */
  label: "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
} as const;

// ============================================
// ESPAÇAMENTO (grid de 8px)
// ============================================

export const SPACE = {
  xs: "gap-1",     // 4px  — ícone + texto no botão
  sm: "gap-2",     // 8px  — entre items em lista
  md: "gap-3",     // 12px — dentro de cards
  lg: "gap-4",     // 16px — entre cards
  xl: "gap-6",     // 24px — entre seções
  "2xl": "gap-8",  // 32px — entre áreas da página
} as const;

// ============================================
// ABAS PRINCIPAIS (underline emerald)
// ============================================

export const TAB_STYLE = {
  bar: "flex items-center gap-6 border-b border-border px-6",
  item: "py-3 text-sm font-medium text-muted-foreground hover:text-foreground/80 border-b-2 border-transparent transition-colors cursor-pointer",
  active: "text-foreground border-emerald-500",
} as const;

// ============================================
// SUBABAS / PILLS (rounded, background sutil)
// ============================================

export const PILL_STYLE = {
  bar: "flex items-center gap-1.5 mb-4",
  item: "px-3 py-1 text-xs rounded-full text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer",
  active: "bg-muted text-foreground",
} as const;

// ============================================
// CARDS
// ============================================

export const CARD_STYLE = {
  /** Card padrão com borda */
  base: "rounded-lg border border-border p-4",
  /** Card com borda lateral colorida (urgência, nulidades) */
  highlight: "rounded-lg border-l-4 p-4",
  /** Card glass translúcido (v3) */
  glass: "bg-neutral-100/60 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/[0.06] rounded-lg p-3.5",
} as const;

// ============================================
// HEADER (v3 — gradient escuro)
// ============================================

export const HEADER_STYLE = {
  /** Page Header — card meio-termo */
  container: "rounded-2xl bg-[#424242] shadow-sm shadow-black/[0.06] ring-1 ring-white/[0.04]",
  text: "text-white font-sans text-lg font-semibold tracking-tight",
  label: "text-white/80 text-[9px] uppercase tracking-wider font-semibold",
  value: "text-white font-mono tracking-wide",
  separator: "w-px h-3.5 bg-white/[0.10] rounded-full",
  /** Inset row — levemente mais claro */
  bottomRow: "bg-[#4c4c4c] rounded-xl px-3.5 py-2.5 ring-1 ring-white/[0.05]",
  stat: "text-white font-semibold",
  statLabel: "text-white/60",
  /** Utility Bar — mais escuro que o header */
  utilityRow: "bg-[#3a3a3a]",
  utilityText: "text-white/55 text-[10px]",
  utilityButton: "w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.08] transition-colors cursor-pointer",
  utilityIcon: "w-[13px] h-[13px] text-white/45",
  /** Collapsed — entre utility e header */
  collapsedBar: "bg-[#3e3e3e] shadow-sm shadow-black/[0.06]",
  collapsedText: "text-white text-[11px] font-semibold",
} as const;

// ============================================
// GLASS (v3 — cards translúcidos)
// ============================================

export const GLASS = {
  card: "bg-neutral-100/60 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/[0.06] rounded-lg",
  hover: "hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-all duration-200",
  cardHover: "bg-neutral-100/60 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/[0.06] rounded-lg hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-all duration-200 cursor-pointer",
} as const;

// ============================================
// LIST ITEM (v3 — itens de lista glass)
// ============================================

export const LIST_ITEM = {
  container: "bg-neutral-100/60 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/[0.06] rounded-lg px-3 py-2.5 hover:bg-neutral-100 dark:hover:bg-white/[0.07] cursor-pointer transition-all",
  icon: "w-[13px] h-[13px] text-neutral-500 dark:text-neutral-400 shrink-0",
  title: "text-[11px] font-medium text-foreground/80",
  meta: "text-[9px] text-muted-foreground",
} as const;

// ============================================
// ABAS v3 (pill rounded, bg invertido)
// ============================================

export const TAB_STYLE_V3 = {
  bar: "flex items-center gap-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1",
  item: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-white/5",
  active: "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm",
  badge: "text-[9px] min-w-[18px] text-center px-1 py-px rounded-full font-medium",
  badgeActive: "bg-white/20 text-white/70 dark:bg-neutral-700 dark:text-neutral-300",
  badgeInactive: "bg-neutral-200/60 dark:bg-white/10 text-neutral-400 dark:text-neutral-500",
} as const;

// ============================================
// CORES SEMÂNTICAS
// ============================================

export const COLORS = {
  primary: { border: "border-emerald-200 dark:border-emerald-800", bg: "bg-emerald-50/50 dark:bg-emerald-950/10", text: "text-emerald-600 dark:text-emerald-400" },
  danger:  { border: "border-red-200 dark:border-red-800", bg: "bg-red-50/50 dark:bg-red-950/10", text: "text-red-600 dark:text-red-400" },
  warning: { border: "border-amber-200 dark:border-amber-800", bg: "bg-amber-50/50 dark:bg-amber-950/10", text: "text-amber-600 dark:text-amber-400" },
  info:    { border: "border-blue-200 dark:border-blue-800", bg: "bg-blue-50/50 dark:bg-blue-950/10", text: "text-blue-600 dark:text-blue-400" },
  violet:  { border: "border-violet-200 dark:border-violet-800", bg: "bg-violet-50/50 dark:bg-violet-950/10", text: "text-violet-600 dark:text-violet-400" },
  neutral: { border: "border-border", bg: "bg-neutral-50 dark:bg-card", text: "text-neutral-600 dark:text-muted-foreground" },
} as const;

// ============================================
// HELPERS
// ============================================

/** Cor baseada na urgência do radar de liberdade */
export function urgencyColor(level: string) {
  switch (level?.toUpperCase()) {
    case "ALTA": return COLORS.danger;
    case "MEDIA": return COLORS.warning;
    default: return COLORS.primary;
  }
}

/** Cor do status prisional */
export function prisaoColor(preso: boolean) {
  return preso ? COLORS.danger : COLORS.primary;
}

/** Cor da proximidade da audiência */
export function audienciaUrgency(dias: number) {
  if (dias < 3) return COLORS.danger;
  if (dias < 7) return COLORS.warning;
  return COLORS.neutral;
}
