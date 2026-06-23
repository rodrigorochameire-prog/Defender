/**
 * Registry central de tipologia visual do OMBUDS.
 *
 * Fonte única de cores/rótulos/ícones por domínio. Telas devem importar daqui
 * em vez de redefinir badges/cores inline. Atribuição permanece em
 * `@/lib/config/atribuicoes` (já central) e é re-exportada para descoberta.
 */

export type { VisualTipo } from "./caso";

export {
  CASO_STATUS_CONFIG,
  CASO_PRIORIDADE_CONFIG,
  CASO_PRIORIDADE_ORDEM,
  statusCasoInfo,
  prioridadeCasoInfo,
  pesoPrioridadeCaso,
} from "./caso";

export { PROCESSO_SITUACAO_CONFIG, situacaoProcessoInfo } from "./processo";

// Atribuição (já centralizada) — re-export para um único ponto de entrada.
export {
  getAtribuicaoColors,
  getAtribuicaoIcon,
  normalizeAreaToFilter,
  areaMatchesFilter,
  ATRIBUICAO_COLORS,
  SOLID_COLOR_MAP,
} from "@/lib/config/atribuicoes";
