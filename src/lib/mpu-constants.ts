/**
 * Valores canônicos para os campos `faseProcedimento` e `motivoUltimaIntimacao`
 * de `processos_vvd`. Usar essas constantes (não strings literais) ao escrever
 * no banco — evita typos e dá type-safety na classify() do Plano 2.
 *
 * Em sincronia com os comentários em src/lib/db/schema/vvd.ts.
 */

export const FASE_PROCEDIMENTO = {
  REPRESENTACAO_INICIAL: "representacao_inicial",
  DECISAO_LIMINAR: "decisao_liminar",
  AUDIENCIA_DESIGNADA: "audiencia_designada",
  AUDIENCIA_REALIZADA: "audiencia_realizada",
  MANIFESTACAO_PENDENTE: "manifestacao_pendente",
  RECURSO: "recurso",
  DESCUMPRIMENTO_APURADO: "descumprimento_apurado",
  EXPIRADA: "expirada",
  REVOGADA: "revogada",
} as const;

export type FaseProcedimento =
  (typeof FASE_PROCEDIMENTO)[keyof typeof FASE_PROCEDIMENTO];

export const MOTIVO_INTIMACAO = {
  CIENCIA_DECISAO_MPU: "ciencia_decisao_mpu",
  CIENCIA_AUDIENCIA: "ciencia_audiencia",
  MANIFESTAR_RENOVACAO: "manifestar_renovacao",
  MANIFESTAR_MODULACAO: "manifestar_modulacao",
  MANIFESTAR_REVOGACAO: "manifestar_revogacao",
  MANIFESTAR_LAUDO: "manifestar_laudo",
  MANIFESTAR_DESCUMPRIMENTO: "manifestar_descumprimento",
  CIENCIA_MODULACAO: "ciencia_modulacao",
  INTIMACAO_GENERICA: "intimacao_generica",
} as const;

export type MotivoIntimacao =
  (typeof MOTIVO_INTIMACAO)[keyof typeof MOTIVO_INTIMACAO];
