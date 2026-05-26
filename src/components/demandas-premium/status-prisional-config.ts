export const STATUS_PRISIONAL_VALUES = [
  "SOLTO",
  "CADEIA_PUBLICA",
  "PENITENCIARIA",
  "COP",
  "HOSPITAL_CUSTODIA",
  "DOMICILIAR",
  "MONITORADO",
] as const;

export type StatusPrisional = typeof STATUS_PRISIONAL_VALUES[number];

interface Config {
  label: string;
  color: string;
  bg: string;
}

export const STATUS_PRISIONAL_CONFIG: Record<StatusPrisional, Config> = {
  SOLTO:             { label: "Solto",                color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  CADEIA_PUBLICA:    { label: "Cadeia Pública",       color: "text-rose-700 dark:text-rose-400",       bg: "bg-rose-50 dark:bg-rose-950/30" },
  PENITENCIARIA:     { label: "Penitenciária",        color: "text-rose-800 dark:text-rose-300",       bg: "bg-rose-100 dark:bg-rose-950/50" },
  COP:               { label: "COP",                   color: "text-rose-700 dark:text-rose-400",       bg: "bg-rose-50 dark:bg-rose-950/30" },
  HOSPITAL_CUSTODIA: { label: "Hospital de Custódia", color: "text-orange-700 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-950/30" },
  DOMICILIAR:        { label: "Domiciliar",            color: "text-amber-700 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-950/30" },
  MONITORADO:        { label: "Monitorado",            color: "text-orange-700 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-950/30" },
};

export const STATUS_PRISIONAL_OPTIONS = STATUS_PRISIONAL_VALUES.map((v) => ({
  value: v,
  label: STATUS_PRISIONAL_CONFIG[v].label,
}));
