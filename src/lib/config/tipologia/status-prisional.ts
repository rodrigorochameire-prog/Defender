/**
 * Tipologia de Status Prisional — fonte ÚNICA (antes duplicada entre
 * assistido-config.ts e demandas-premium/status-prisional-config.ts).
 *
 * Paleta canônica = a do demandas-premium (rótulos acentuados, tons nuançados).
 * Carrega um superset de campos para servir os dois consumidores:
 *  - demandas usa { label, color, bg } (badge).
 *  - cards do assistido usam { labelShort, color, bgColor, borderColor, iconBg, priority }.
 *
 * Classes Tailwind são LITERAIS (sem template strings) para o JIT não purgar.
 */

export const STATUS_PRISIONAL_VALUES = [
  "SOLTO",
  "CADEIA_PUBLICA",
  "PENITENCIARIA",
  "COP",
  "HOSPITAL_CUSTODIA",
  "DOMICILIAR",
  "MONITORADO",
] as const;

export type StatusPrisional = (typeof STATUS_PRISIONAL_VALUES)[number];

export interface StatusPrisionalVisual {
  /** Rótulo completo, acentuado (ex.: "Hospital de Custódia"). */
  label: string;
  /** Rótulo abreviado para pills compactos (ex.: "Hosp. Custódia"). */
  labelShort: string;
  /** 1 = mais grave (preso) … 7 = solto. Para ordenação. */
  priority: number;
  /** Cor do texto (badge). */
  color: string;
  /** Fundo do badge. */
  bg: string;
  /** Fundo suave do card. */
  bgColor: string;
  /** Borda do card. */
  borderColor: string;
  /** Fundo do chip do ícone (constante). */
  iconBg: string;
}

const ICON_BG = "bg-zinc-800 dark:bg-zinc-700";

export const STATUS_PRISIONAL_CONFIG: Record<StatusPrisional, StatusPrisionalVisual> = {
  CADEIA_PUBLICA: {
    label: "Cadeia Pública",
    labelShort: "Cadeia Pública",
    priority: 1,
    color: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    bgColor: "bg-rose-50/80 dark:bg-rose-950/20",
    borderColor: "border-rose-200/60 dark:border-rose-800/30",
    iconBg: ICON_BG,
  },
  PENITENCIARIA: {
    label: "Penitenciária",
    labelShort: "Penitenciária",
    priority: 2,
    color: "text-rose-800 dark:text-rose-300",
    bg: "bg-rose-100 dark:bg-rose-950/50",
    bgColor: "bg-rose-50/80 dark:bg-rose-950/20",
    borderColor: "border-rose-200/60 dark:border-rose-800/30",
    iconBg: ICON_BG,
  },
  COP: {
    label: "COP",
    labelShort: "COP",
    priority: 3,
    color: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    bgColor: "bg-rose-50/80 dark:bg-rose-950/20",
    borderColor: "border-rose-200/60 dark:border-rose-800/30",
    iconBg: ICON_BG,
  },
  HOSPITAL_CUSTODIA: {
    label: "Hospital de Custódia",
    labelShort: "Hosp. Custódia",
    priority: 4,
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    bgColor: "bg-orange-50/80 dark:bg-orange-950/20",
    borderColor: "border-orange-200/60 dark:border-orange-800/30",
    iconBg: ICON_BG,
  },
  MONITORADO: {
    label: "Monitorado",
    labelShort: "Monitorado",
    priority: 5,
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    bgColor: "bg-orange-50/80 dark:bg-orange-950/20",
    borderColor: "border-orange-200/60 dark:border-orange-800/30",
    iconBg: ICON_BG,
  },
  DOMICILIAR: {
    label: "Domiciliar",
    labelShort: "Domiciliar",
    priority: 6,
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    bgColor: "bg-amber-50/80 dark:bg-amber-950/20",
    borderColor: "border-amber-200/60 dark:border-amber-800/30",
    iconBg: ICON_BG,
  },
  SOLTO: {
    label: "Solto",
    labelShort: "Solto",
    priority: 7,
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    bgColor: "bg-emerald-50/80 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200/60 dark:border-emerald-800/30",
    iconBg: ICON_BG,
  },
};

export const STATUS_PRISIONAL_OPTIONS = STATUS_PRISIONAL_VALUES.map((v) => ({
  value: v,
  label: STATUS_PRISIONAL_CONFIG[v].label,
}));

export function statusPrisionalInfo(status: string | null | undefined): StatusPrisionalVisual | null {
  if (!status) return null;
  return STATUS_PRISIONAL_CONFIG[status as StatusPrisional] ?? null;
}
