export type OrigemDesignacao =
  | "requerimento_defesa"
  | "pedido_revogacao_ofendida"
  | "alegacao_descumprimento"
  | "reavaliacao_juizo"
  | "caso_novo"
  | "outro";

export interface MotivoDesignacao {
  origem: OrigemDesignacao | null;
  detalhe: string;
}

export const LABEL_ORIGEM: Record<OrigemDesignacao, string> = {
  requerimento_defesa: "Requerimento da defesa",
  pedido_revogacao_ofendida: "Pedido de revogação da ofendida",
  alegacao_descumprimento: "Alegação de descumprimento",
  reavaliacao_juizo: "Reavaliação pelo juízo",
  caso_novo: "Caso novo",
  outro: "Outro",
};

const ORIGENS = Object.keys(LABEL_ORIGEM) as OrigemDesignacao[];

export function normalizarMotivo(raw: unknown): MotivoDesignacao | null {
  if (!raw) return null;

  if (typeof raw === "string") {
    const detalhe = raw.trim();
    return detalhe ? { origem: null, detalhe } : null;
  }

  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const detalhe = typeof o.detalhe === "string" ? o.detalhe.trim() : "";
    const origem = ORIGENS.includes(o.origem as OrigemDesignacao) ? (o.origem as OrigemDesignacao) : null;
    if (!detalhe && !origem) return null;
    return { origem, detalhe };
  }

  return null;
}
