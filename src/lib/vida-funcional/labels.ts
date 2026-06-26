import type { VfTipo } from "./tipo-cluster";

export const TIPO_LABELS: Record<VfTipo, string> = {
  POSSE: "Posse",
  PROMOCAO: "Promoção",
  REMOCAO: "Remoção",
  TITULARIDADE: "Titularidade / Lotação",
  ACUMULO: "Acúmulo de atribuição",
  DESIGNACAO_RELEVANTE: "Designação relevante",
  CONVOCACAO: "Convocação",
  FERIAS: "Férias",
  LICENCA: "Licença",
  AFASTAMENTO: "Afastamento",
  COOPERACAO: "Cooperação",
  DIARIA: "Diária",
  FOLGA: "Folga",
  TRABALHO_EXTRAORDINARIO: "Trabalho extraordinário",
  SUBSTITUICAO: "Substituição",
  GRATIFICACAO: "Gratificação",
  REEMBOLSO: "Reembolso",
  SOLICITACAO_ADM: "Solicitação administrativa",
};

export const STATUS_LABELS: Record<string, string> = {
  previsto: "Previsto",
  em_curso: "Em curso",
  concluido: "Concluído",
  pendente: "Pendente",
  arquivado: "Arquivado",
};

export function tipoLabel(t: string): string {
  return (TIPO_LABELS as Record<string, string>)[t] ?? t;
}

export function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s;
}

export const TIPO_OPTIONS: { value: VfTipo; label: string }[] = (
  Object.keys(TIPO_LABELS) as VfTipo[]
).map((value) => ({ value, label: TIPO_LABELS[value] }));
