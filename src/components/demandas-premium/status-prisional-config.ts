// Status prisional — fonte única em lib/config/tipologia/status-prisional.
// Mantido como re-export para não quebrar os imports existentes do módulo
// demandas-premium. A config central carrega campos extras (labelShort,
// priority, bgColor…) que os consumidores daqui simplesmente ignoram.
export {
  STATUS_PRISIONAL_VALUES,
  STATUS_PRISIONAL_CONFIG,
  STATUS_PRISIONAL_OPTIONS,
  type StatusPrisional,
} from "@/lib/config/tipologia/status-prisional";
