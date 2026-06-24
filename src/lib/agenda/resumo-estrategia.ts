/**
 * Síntese de prontidão estratégica para o "painel de inteligência" do modo
 * Estratégia (spec §D): imputação, denúncia, teses e contradições com estado
 * claro — extraído (presente) ou pendente (a analisar).
 *
 * Nota: a spec prevê ainda os estados "inconsistente" e "requer revisão", que
 * dependem de validação/freshness ainda não disponível aqui. Implementamos os
 * dois estados verificáveis hoje; os demais ficam como extensão futura.
 */

export type EstadoEstrategia = "extraido" | "pendente";

export interface ItemEstrategia {
  key: "imputacao" | "denuncia" | "teses" | "contradicoes";
  label: string;
  status: EstadoEstrategia;
  /** Quantidade, para itens de lista (teses/contradições). */
  count?: number;
}

export interface ResumoEstrategia {
  itens: ItemEstrategia[];
  extraidos: number;
  total: number;
}

const temTexto = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;
const tamanho = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

export function resumoEstrategia(args: {
  imputacao?: string | null;
  denuncia?: string | null;
  teses?: unknown[];
  contradicoes?: unknown[];
}): ResumoEstrategia {
  const nTeses = tamanho(args.teses);
  const nContra = tamanho(args.contradicoes);

  const itens: ItemEstrategia[] = [
    {
      key: "imputacao",
      label: "Imputação",
      status: temTexto(args.imputacao) ? "extraido" : "pendente",
    },
    {
      key: "denuncia",
      label: "Denúncia",
      status: temTexto(args.denuncia) ? "extraido" : "pendente",
    },
    {
      key: "teses",
      label: "Teses",
      status: nTeses > 0 ? "extraido" : "pendente",
      ...(nTeses > 0 ? { count: nTeses } : {}),
    },
    {
      key: "contradicoes",
      label: "Contradições",
      status: nContra > 0 ? "extraido" : "pendente",
      ...(nContra > 0 ? { count: nContra } : {}),
    },
  ];

  return {
    itens,
    extraidos: itens.filter((i) => i.status === "extraido").length,
    total: itens.length,
  };
}
