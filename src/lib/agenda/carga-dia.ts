/**
 * Carga processual de um dia da pauta.
 *
 * Spec §B (pauta futura): cada dia deve "parecer um painel de carga processual",
 * tratando audiência (júri/AIJ/instrução) como ato de maior peso que um
 * compromisso seriado. Este helper resume um conjunto de eventos do dia em
 * total, nº de audiências e um nível ponderado (audiência conta em dobro).
 *
 * "Cor = exceção" (doutrina §2.1): só carga ALTA recebe tom de atenção; média e
 * leve permanecem neutras — o rótulo carrega o significado.
 */

export type NivelCarga = "alta" | "media" | "baixa";

export interface CargaDia {
  total: number;
  audiencias: number;
  nivel: NivelCarga;
  label: string;
}

interface EventoLike {
  tipo?: string | null;
  fonte?: string | null;
}

export interface CargaVisual {
  label: string;
  /** Classes da pílula (bg + text). */
  badge: string;
  dot: string;
}

export const CARGA_CONFIG: Record<NivelCarga, CargaVisual> = {
  alta: {
    label: "Carga alta",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  media: {
    label: "Carga média",
    badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    dot: "bg-neutral-400",
  },
  baixa: {
    label: "Dia leve",
    badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    dot: "bg-neutral-300 dark:bg-neutral-600",
  },
};

const ehAudiencia = (e: EventoLike): boolean =>
  e.fonte === "audiencias" || e.tipo === "audiencia";

/** Limiares do score ponderado (audiência = 2, demais = 1). */
const SCORE_ALTA = 8;
const SCORE_MEDIA = 4;

export function cargaDoDia(eventos: EventoLike[]): CargaDia {
  const total = eventos.length;
  const audiencias = eventos.filter(ehAudiencia).length;
  const score = audiencias * 2 + (total - audiencias);
  const nivel: NivelCarga = score >= SCORE_ALTA ? "alta" : score >= SCORE_MEDIA ? "media" : "baixa";
  return { total, audiencias, nivel, label: CARGA_CONFIG[nivel].label };
}
