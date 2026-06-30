export type VfTipo =
  | "POSSE" | "PROMOCAO" | "REMOCAO" | "TITULARIDADE" | "ACUMULO"
  | "DESIGNACAO_RELEVANTE" | "CONVOCACAO" | "FERIAS" | "LICENCA" | "AFASTAMENTO" | "COOPERACAO" | "OUTRA_AUSENCIA"
  | "DIARIA" | "FOLGA" | "TRABALHO_EXTRAORDINARIO" | "SUBSTITUICAO" | "GRATIFICACAO" | "REEMBOLSO"
  | "SOLICITACAO_ADM";

export type VfCluster = "progressao" | "ausencias" | "contraprestacao" | "administrativo";

const TIPO_CLUSTER: Record<VfTipo, VfCluster> = {
  POSSE: "progressao",
  PROMOCAO: "progressao",
  REMOCAO: "progressao",
  TITULARIDADE: "progressao",
  ACUMULO: "progressao",
  DESIGNACAO_RELEVANTE: "ausencias",
  CONVOCACAO: "ausencias",
  FERIAS: "ausencias",
  LICENCA: "ausencias",
  AFASTAMENTO: "ausencias",
  COOPERACAO: "ausencias",
  OUTRA_AUSENCIA: "ausencias",
  DIARIA: "contraprestacao",
  FOLGA: "contraprestacao",
  TRABALHO_EXTRAORDINARIO: "contraprestacao",
  SUBSTITUICAO: "contraprestacao",
  GRATIFICACAO: "contraprestacao",
  REEMBOLSO: "contraprestacao",
  SOLICITACAO_ADM: "administrativo",
};

/** Tipos exibidos como marcos na Linha do Tempo de Carreira (Trajetória). */
export const MARCO_TIPOS = [
  "POSSE", "PROMOCAO", "REMOCAO", "TITULARIDADE", "ACUMULO",
  "DESIGNACAO_RELEVANTE", "CONVOCACAO",
] as const satisfies readonly VfTipo[];

export function tipoToCluster(tipo: VfTipo): VfCluster {
  return TIPO_CLUSTER[tipo];
}

export function isMarco(tipo: VfTipo): boolean {
  return (MARCO_TIPOS as readonly VfTipo[]).includes(tipo);
}
