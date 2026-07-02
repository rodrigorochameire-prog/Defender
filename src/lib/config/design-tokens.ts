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
// HEADER GLASS (v6 — vidro em duas camadas, colado nas margens)
// ============================================
// Barra de vidro translúcida com blur, borda a borda (o conteúdo passa por
// baixo com blur ao rolar). Fallback: sem backdrop-filter, fundo sólido.

export const HEADER_GLASS = {
  /** Wrapper sticky que deixa o conteúdo passar por baixo do vidro */
  wrapper: "sticky top-0 z-50",
  /** O bloco de vidro em si — flush nas margens, só borda inferior */
  shell:
    "border-b border-white/[0.09] shadow-[0_8px_24px_rgba(0,0,0,0.18)] bg-[#3a3a3d] dark:bg-[#1b1b1d] supports-[backdrop-filter]:bg-[#303033]/80 dark:supports-[backdrop-filter]:bg-[#171719]/75 supports-[backdrop-filter]:backdrop-blur-xl",
  /** Faixa utilitária (camada de cima, mais funda) */
  utilityRow:
    "flex items-center gap-3 px-4 bg-black/[0.22] border-b border-white/[0.07] text-[11px] text-white/45",
  /** Faixa de trabalho (camada de baixo) */
  workRow: "flex h-12 items-center gap-1.5 px-2.5",
  /** Moldura do switch de atribuições — clara, elevada, com brilho sutil no topo */
  well:
    "inline-flex items-center gap-0.5 p-[3px] rounded-[10px] bg-white/[0.06] ring-1 ring-inset ring-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_1px_2px_rgba(0,0,0,0.15)]",
  /** Botão fantasma da faixa de trabalho (FOCUS_RING: a11y §10.8) — alvo de toque maior no mobile */
  ghostBtn:
    "inline-flex items-center justify-center gap-1.5 h-9 md:h-8 rounded-lg text-white/70 hover:bg-white/[0.10] hover:text-white transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
  /** Único botão sólido do header */
  primaryBtn:
    "inline-flex items-center gap-1.5 h-9 md:h-8 px-3 rounded-lg bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-all duration-150 cursor-pointer text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
} as const;

// ============================================
// SHEET (v5 refinado — sheets laterais adaptáveis)
// ============================================
// Tokens compartilhados pelos detail-sheets (Agenda, Demandas, Atendimentos).
// Objetivo: ritmo de espaçamento consistente, tipografia sóbria e o padrão de
// campos-dropdown inline que o usuário prefere — sem desnaturar o comportamento.

export const SHEET_STYLE = {
  /** Barra fixa do topo — backdrop blur + borda inferior sutil */
  topBar:
    "bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800",
  /** Card de identidade (assistido + processo) elevado sobre o corpo */
  identityCard:
    "rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 shadow-sm",
  /** Botão icônico do header (fechar, navegar) */
  iconBtn:
    "w-7 h-7 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center cursor-pointer shrink-0 transition-colors duration-150",
  /** Chip do rito/tipo no header — cores vêm de corBadge(cor) por atribuição */
  ritoBadge:
    "inline-flex items-center gap-1.5 h-7 pl-2 pr-2.5 rounded-lg border text-[11.5px] font-semibold min-w-0 transition-colors duration-150",
  /** Pill de status (read-only) no header */
  statusPill: "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold tabular-nums",
  /** Ritmo de respiro entre seções do corpo */
  sectionGap: "space-y-3",
  /** Label de campo — uppercase sóbrio */
  fieldLabel:
    "text-[9px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500",
  /** Valor de campo */
  fieldValue: "text-[13px] text-neutral-800 dark:text-neutral-200 leading-snug",
  /** Trigger de dropdown inline — preserva o padrão atual, só refina o frame */
  dropdownTrigger:
    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-medium ring-1 ring-inset ring-neutral-200 dark:ring-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors duration-150 cursor-pointer",
} as const;

/** Tom (label + classes) do status de uma audiência — fonte única do pill. */
export function statusAudienciaInfo(status?: string | null): { label: string; cls: string } {
  const s = (status ?? "").toLowerCase();
  if (s.includes("conclu") || s.includes("realiz"))
    return { label: "Realizada", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
  if (s.includes("cancel"))
    return { label: "Cancelada", cls: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" };
  if (s.includes("redesign") || s.includes("remarc") || s.includes("reagend") || s.includes("adiad"))
    return { label: "Redesignada", cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  if (s.includes("ata"))
    return { label: "Aguard. ata", cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  return { label: "Designada", cls: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" };
}

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

/** Anel de foco padrão p/ elementos interativos — operabilidade por teclado (a11y §10.8). */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40";

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
