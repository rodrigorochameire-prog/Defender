/**
 * Tipos de Processo
 * Configuração centralizada dos tipos de processo utilizados no sistema
 *
 * Nota: Recursos como RESE, Apelação são no âmbito da AP.
 *       Agravo em Execução é no âmbito da EP.
 *       Por isso não são tipos de processo separados.
 */

export const TIPOS_PROCESSO = {
  AP: {
    sigla: "AP",
    label: "Ação Penal",
    descricao: "Processo criminal comum (inclui recursos como RESE, Apelação)",
  },
  IP: {
    sigla: "IP",
    label: "Inquérito Policial",
    descricao: "Procedimento investigatório",
  },
  APF: {
    sigla: "APF",
    label: "Auto de Prisão em Flagrante",
    descricao: "Prisão em flagrante delito",
  },
  MPU: {
    sigla: "MPU",
    label: "Medida Protetiva de Urgência",
    descricao: "Medida protetiva (Lei Maria da Penha)",
  },
  EP: {
    sigla: "EP",
    label: "Execução Penal",
    descricao: "Processo de execução de pena (inclui Agravo em Execução)",
  },
  ANPP: {
    sigla: "ANPP",
    label: "ANPP",
    descricao: "Acordo de Não Persecução Penal",
  },
  PPP: {
    sigla: "PPP",
    label: "PPP",
    descricao: "Procedimento de Pacificação de Conflito Penal / Pedido de Prisão Preventiva",
  },
  CAUTELAR: {
    sigla: "Cautelar",
    label: "Cautelar",
    descricao: "Medida Cautelar diversa da prisão",
  },
  HC: {
    sigla: "HC",
    label: "Habeas Corpus",
    descricao: "Remédio constitucional contra prisão ilegal",
  },
  TC: {
    sigla: "TC",
    label: "Termo Circunstanciado",
    descricao: "Infração de menor potencial ofensivo",
  },
  RC: {
    sigla: "RC",
    label: "Revisão Criminal",
    descricao: "Revisão de sentença transitada em julgado",
  },
  OE: {
    sigla: "OE",
    label: "Oitiva Especial",
    descricao: "Procedimento especial para ouvir crianças pré-processualmente (evita revitimização)",
  },
} as const;

export type TipoProcessoKey = keyof typeof TIPOS_PROCESSO;

/**
 * Array de opções para uso em selects/dropdowns
 * Ordenado por frequência de uso (mais comuns primeiro)
 */
export const TIPO_PROCESSO_OPTIONS = [
  { value: "AP", label: "AP - Ação Penal" },
  { value: "IP", label: "IP - Inquérito Policial" },
  { value: "APF", label: "APF - Flagrante" },
  { value: "MPU", label: "MPU - Med. Protetiva" },
  { value: "EP", label: "EP - Execução Penal" },
  { value: "ANPP", label: "ANPP" },
  { value: "PPP", label: "PPP" },
  { value: "Cautelar", label: "Cautelar" },
  { value: "HC", label: "HC - Habeas Corpus" },
  { value: "TC", label: "TC - Termo Circ." },
  { value: "RC", label: "RC - Revisão Criminal" },
  { value: "OE", label: "OE - Oitiva Especial" },
];

/**
 * Versão compacta para uso em tabelas/listas
 */
export const TIPO_PROCESSO_OPTIONS_COMPACT = [
  { value: "AP", label: "AP" },
  { value: "IP", label: "IP" },
  { value: "APF", label: "APF" },
  { value: "MPU", label: "MPU" },
  { value: "EP", label: "EP" },
  { value: "ANPP", label: "ANPP" },
  { value: "PPP", label: "PPP" },
  { value: "Cautelar", label: "Cautelar" },
  { value: "HC", label: "HC" },
  { value: "TC", label: "TC" },
  { value: "RC", label: "RC" },
  { value: "OE", label: "OE" },
];

/**
 * Obtém o label de um tipo de processo pela sigla
 */
export function getTipoProcessoLabel(sigla: string): string {
  const tipo = Object.values(TIPOS_PROCESSO).find(t => t.sigla === sigla);
  return tipo?.label || sigla;
}

/**
 * Obtém a descrição de um tipo de processo pela sigla
 */
export function getTipoProcessoDescricao(sigla: string): string {
  const tipo = Object.values(TIPOS_PROCESSO).find(t => t.sigla === sigla);
  return tipo?.descricao || "";
}
