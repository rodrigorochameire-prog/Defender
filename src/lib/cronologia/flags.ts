import { differenceInDays } from "date-fns";

interface PrisaoMin {
  tipo: string;
  dataInicio: string;
  dataFim?: string | null;
  situacao: string;
}

interface MarcoMin {
  tipo: string;
  data: string;
}

export interface PrisaoStatus {
  tipo: string;
  dataInicio: string;
  diasPreso: number;
}

export function computePrisaoStatus(prisoes: PrisaoMin[]): PrisaoStatus | null {
  const ativa = prisoes.find((p) => p.situacao === "ativa" && !p.dataFim);
  if (!ativa) return null;
  const ini = new Date(ativa.dataInicio);
  if (isNaN(ini.getTime())) return null;
  return {
    tipo: ativa.tipo,
    dataInicio: ativa.dataInicio,
    diasPreso: Math.max(0, differenceInDays(new Date(), ini)),
  };
}

export interface ExcessoPrazoFlag {
  diasPreso: number;
  diasExcedidos: number;
  motivo: string;
}

const LIMITE_PREVENTIVA_SEM_DENUNCIA_DIAS = 80;

export function detectExcessoPrazoPreventiva(
  prisoes: PrisaoMin[],
  marcos: MarcoMin[],
): ExcessoPrazoFlag | null {
  const status = computePrisaoStatus(prisoes);
  if (!status || status.tipo !== "preventiva") return null;

  const denunciaAposInicio = marcos.some((m) => {
    if (m.tipo !== "denuncia") return false;
    const md = new Date(m.data);
    const pi = new Date(status.dataInicio);
    return md.getTime() >= pi.getTime();
  });
  if (denunciaAposInicio) return null;

  if (status.diasPreso > LIMITE_PREVENTIVA_SEM_DENUNCIA_DIAS) {
    return {
      diasPreso: status.diasPreso,
      diasExcedidos: status.diasPreso - LIMITE_PREVENTIVA_SEM_DENUNCIA_DIAS,
      motivo: `Preventiva ativa há ${status.diasPreso} dias sem denúncia (limite STJ ${LIMITE_PREVENTIVA_SEM_DENUNCIA_DIAS}d)`,
    };
  }
  return null;
}

export interface FlagranteSemCustodiaFlag {
  diasDesdeFlagrante: number;
}

export function detectFlagranteSemCustodia(
  prisoes: PrisaoMin[],
  marcos: MarcoMin[],
): FlagranteSemCustodiaFlag | null {
  const flagrante = prisoes.find((p) => p.tipo === "flagrante" && p.situacao === "ativa" && !p.dataFim);
  if (!flagrante) return null;

  const ini = new Date(flagrante.dataInicio);
  if (isNaN(ini.getTime())) return null;

  const teveCustodia = marcos.some((m) => {
    if (m.tipo !== "audiencia-custodia") return false;
    const md = new Date(m.data);
    return md.getTime() >= ini.getTime();
  });
  if (teveCustodia) return null;

  const dias = Math.max(0, differenceInDays(new Date(), ini));
  if (dias >= 1) {
    return { diasDesdeFlagrante: dias };
  }
  return null;
}
