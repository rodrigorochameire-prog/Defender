/**
 * Constantes canônicas dos tipos de processo.
 *
 * O campo `processos.tipoProcesso` é varchar(30) livre. Esta constante é a
 * fonte única da verdade para labels, badges e cores na UI, e serve de base
 * para validação Zod nas mutations.
 */

export const TIPOS_PROCESSO = {
  AP:        { label: "Ação Penal",         badge: "AP",        color: "slate"   },
  IP:        { label: "Inquérito Policial", badge: "IP",        color: "neutral" },
  MPU:       { label: "Medida Protetiva",   badge: "MPU",       color: "amber"   },
  REVOGACAO: { label: "Revogação",          badge: "Revogação", color: "blue"    },
  HC:        { label: "Habeas Corpus",      badge: "HC",        color: "rose"    },
  RECURSO:   { label: "Recurso",            badge: "Recurso",   color: "violet"  },
  EP:        { label: "Execução Penal",     badge: "EP",        color: "blue"    },
  PEDIDO:    { label: "Pedido Apartado",    badge: "Apartado",  color: "indigo"  },
} as const;

export type TipoProcesso = keyof typeof TIPOS_PROCESSO;

export const TIPOS_INCIDENTAIS: TipoProcesso[] = [
  "REVOGACAO",
  "HC",
  "RECURSO",
  "MPU",
  "IP",
  "PEDIDO",
];

export function tipoProcessoLabel(tipo: string | null | undefined): string {
  if (!tipo) return "Processo";
  return (TIPOS_PROCESSO as Record<string, { label: string }>)[tipo]?.label ?? tipo;
}

/**
 * Mapeia `processos.area` (areaEnum) para `casos.atribuicao` (atribuicaoEnum).
 * Usado quando criamos um caso automaticamente ao vincular um incidental.
 */
export function mapAreaParaAtribuicao(area: string): string {
  const map: Record<string, string> = {
    VIOLENCIA_DOMESTICA: "VVD_CAMACARI",
    JURI: "JURI_CAMACARI",
    EXECUCAO_PENAL: "EXECUCAO_PENAL",
    CRIMINAL: "CRIMINAL_CAMACARI",
  };
  return map[area] ?? "SUBSTITUICAO";
}
