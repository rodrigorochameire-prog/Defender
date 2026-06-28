export type AusenciaTipo = "licenca" | "outra_ausencia";

const SITUACAO_RULES: { match: RegExp; situacao: string; suspensa?: boolean }[] = [
  { match: /gozad/i, situacao: "gozada" },
  { match: /indefer|desist/i, situacao: "indeferida" },
  { match: /suspens/i, situacao: "deferida", suspensa: true },
];

export function situacaoFromSiga(raw: string | null): { situacao: string; suspensa: boolean } {
  const s = raw ?? "";
  for (const r of SITUACAO_RULES) if (r.match.test(s)) return { situacao: r.situacao, suspensa: !!r.suspensa };
  return { situacao: "solicitada", suspensa: false };
}

export function mapToAusencia(tipo: AusenciaTipo, payload: Record<string, unknown>) {
  const p = payload as Record<string, any>;
  const { situacao, suspensa } = situacaoFromSiga((p.situacaoSiga as string) ?? null);
  return {
    tipo,
    motivo: (p.motivo as string) ?? null,
    dataInicio: p.dataInicio as string,
    dataFim: p.dataFim as string,
    situacao,
    suspensa: suspensa || Boolean(p.suspensa),
    interrompida: Boolean(p.interrompida),
    numeroSolicitacao: (p.numeroSolicitacao as string) ?? null,
    nSiga: (p.nSiga as string) ?? null,
    dataPublicacao: (p.dataPublicacao as string) ?? null,
    situacaoSiga: (p.situacaoSiga as string) ?? null,
    observacao: (p.observacao as string) ?? null,
  };
}
