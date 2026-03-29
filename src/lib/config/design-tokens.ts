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
  bar: "flex items-center gap-6 border-b border-zinc-200 dark:border-zinc-800 px-6",
  item: "py-3 text-sm font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 border-b-2 border-transparent transition-colors cursor-pointer",
  active: "text-zinc-900 dark:text-zinc-100 border-emerald-500",
} as const;

// ============================================
// SUBABAS / PILLS (rounded, background sutil)
// ============================================

export const PILL_STYLE = {
  bar: "flex items-center gap-1.5 mb-4",
  item: "px-3 py-1 text-xs rounded-full text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer",
  active: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
} as const;

// ============================================
// CARDS
// ============================================

export const CARD_STYLE = {
  /** Card padrão com borda */
  base: "rounded-lg border border-zinc-200 dark:border-zinc-800 p-4",
  /** Card com borda lateral colorida (urgência, nulidades) */
  highlight: "rounded-lg border-l-4 p-4",
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
  neutral: { border: "border-zinc-200 dark:border-zinc-800", bg: "bg-zinc-50 dark:bg-zinc-900", text: "text-zinc-600 dark:text-zinc-400" },
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
