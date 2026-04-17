export type StatusTone = "emerald" | "rose" | "amber" | "neutral" | "slate";

export interface StatusTonInput {
  realizada?: boolean;
  status?: string;
  resultado?: string;
  decretoRevelia?: boolean;
}

export interface StatusToneOutput {
  tone: StatusTone;
  label: string;
  shortLabel: string;
}

export function statusTone(input: StatusTonInput): StatusToneOutput {
  const { realizada, status, resultado, decretoRevelia } = input;

  if (resultado === "redesignada" || status === "redesignada") {
    return { tone: "rose", label: "Redesignada", shortLabel: "RED" };
  }

  if (resultado === "suspensa" || status === "suspensa") {
    return { tone: "amber", label: "Suspensa", shortLabel: "SUS" };
  }

  if (decretoRevelia) {
    return { tone: "neutral", label: "Decreto Revelia", shortLabel: "REV" };
  }

  if (resultado === "desistencia" || status === "desistencia") {
    return { tone: "slate", label: "Desistência", shortLabel: "DES" };
  }

  if (realizada === true) {
    if (resultado === "sentenciado") {
      return { tone: "emerald", label: "Sentenciada", shortLabel: "✓" };
    }
    return { tone: "emerald", label: "Concluída", shortLabel: "✓" };
  }

  return { tone: "neutral", label: "Pendente", shortLabel: "—" };
}

export const TONE_BG: Record<StatusTone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export const TONE_BORDER: Record<StatusTone, string> = {
  emerald: "border-l-emerald-400 dark:border-l-emerald-500",
  rose: "border-l-rose-400 dark:border-l-rose-500",
  amber: "border-l-amber-400 dark:border-l-amber-500",
  neutral: "border-l-neutral-300 dark:border-l-neutral-600",
  slate: "border-l-slate-400 dark:border-l-slate-500",
};
