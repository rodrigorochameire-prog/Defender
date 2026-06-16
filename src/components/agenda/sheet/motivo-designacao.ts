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

/**
 * Tokens de origem aceitos (inclui aliases legados das análises). O dossiê às
 * vezes grava `motivo_designacao` como string `"<token> (<detalhe>)"` ou
 * `"<token> — <detalhe>"`; mapeamos o token para a origem canônica.
 */
const ALIAS_ORIGEM: Record<string, OrigemDesignacao> = {
  requerimento_defesa: "requerimento_defesa",
  pedido_revogacao_ofendida: "pedido_revogacao_ofendida",
  alegacao_descumprimento: "alegacao_descumprimento",
  reavaliacao_juizo: "reavaliacao_juizo",
  primeiro_contato: "reavaliacao_juizo", // 1º contato após deferir a MPU = reavaliação de ofício
  caso_novo: "caso_novo",
  outro: "outro",
};

function resolverOrigem(token: unknown): OrigemDesignacao | null {
  if (typeof token !== "string") return null;
  return ALIAS_ORIGEM[token.trim().toLowerCase()] ?? null;
}

/** Extrai `{origem, detalhe}` de uma string `"<token> <sep> <detalhe>"`. */
function parseStringMotivo(s: string): MotivoDesignacao {
  const trimmed = s.trim();
  const tokenMatch = trimmed.match(/^([a-z][a-z_]+)/);
  const origem = tokenMatch ? resolverOrigem(tokenMatch[1]) : null;
  if (origem && tokenMatch) {
    // remove o token e um separador imediato (— : -); preserva parênteses (conteúdo)
    const detalhe = trimmed
      .slice(tokenMatch[1].length)
      .replace(/^\s*[—:-]\s*/, "")
      .trim();
    return { origem, detalhe };
  }
  return { origem: null, detalhe: trimmed };
}

export function normalizarMotivo(raw: unknown): MotivoDesignacao | null {
  if (!raw) return null;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed ? parseStringMotivo(trimmed) : null;
  }

  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const detalhe = typeof o.detalhe === "string" ? o.detalhe.trim() : "";
    const origem = resolverOrigem(o.origem);
    if (!detalhe && !origem) return null;
    return { origem, detalhe };
  }

  return null;
}
