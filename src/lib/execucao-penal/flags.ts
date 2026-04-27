import { differenceInDays } from "date-fns";

interface ExecucaoMin {
  dataInicioPena?: string | null;
  dataTerminoPrevisto?: string | null;
  dataProgressaoPrevista?: string | null;
  dataLivramentoPrevisto?: string | null;
  penaTotalDias?: number | null;
  jaCumpridoDias?: number | null;
  jaRemidoDias?: number | null;
  regimeAtual?: string | null;
}

export interface ProgressaoFlag {
  diasParaProgressao: number;
  vencida: boolean;
}

export function detectProgressaoIminente(ex: ExecucaoMin): ProgressaoFlag | null {
  if (!ex.dataProgressaoPrevista) return null;
  const d = new Date(ex.dataProgressaoPrevista);
  if (isNaN(d.getTime())) return null;
  const dias = differenceInDays(d, new Date());
  if (dias > 60) return null;  // só sinaliza se ≤ 60 dias
  return { diasParaProgressao: dias, vencida: dias < 0 };
}

export interface LivramentoFlag {
  diasParaLivramento: number;
  vencido: boolean;
}

export function detectLivramentoIminente(ex: ExecucaoMin): LivramentoFlag | null {
  if (!ex.dataLivramentoPrevisto) return null;
  const d = new Date(ex.dataLivramentoPrevisto);
  if (isNaN(d.getTime())) return null;
  const dias = differenceInDays(d, new Date());
  if (dias > 90) return null;
  return { diasParaLivramento: dias, vencido: dias < 0 };
}

export interface IndultoFlag {
  motivo: string;
}

/**
 * Indulto natalino: quem cumpriu mais de 1/4 da pena (regra simplificada).
 * Implementação básica — refinar com decretos específicos depois.
 */
export function detectIndultoAplicavel(ex: ExecucaoMin): IndultoFlag | null {
  if (!ex.penaTotalDias || !ex.jaCumpridoDias) return null;
  const total = ex.penaTotalDias + (ex.jaRemidoDias ?? 0);
  if (total === 0) return null;
  const pct = (ex.jaCumpridoDias + (ex.jaRemidoDias ?? 0)) / total;
  if (pct >= 0.25) {
    return { motivo: `${(pct * 100).toFixed(0)}% da pena cumprida — verificar decreto vigente` };
  }
  return null;
}
