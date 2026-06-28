export type AfastamentoLite = {
  id: number; defensorId: number; substitutoId: number;
  dataInicio: string; dataFim: string | null; ativo: boolean; tipo: string;
};

export type SubstituicaoLite = {
  id: number; defensorId: number | null; afastamentoId: number | null;
  unidadeSubstituida: string; status: string;
  oficioNumero: string | null; relatorioPath: string | null; seiProtocolo: string | null;
};

export type UserLite = { id: number; name: string };

export type CoberturaRollup = {
  kpis: {
    afastadosHoje: number;
    substituicoesAbertas: number;
    semCobertura: number;
    gratificacoesAOficiar: number;
    gratificacoesAPagar: number;
  };
  cobertura: Array<{
    afastamentoId: number; defensorAfastado: string; periodo: string;
    substituicaoId: number | null; defensorSubstituto: string; statusGratificacao: string | null;
  }>;
  pendencias: Array<{
    substituicaoId: number; defensorSubstituto: string; unidadeSubstituida: string;
    status: string; faltando: string[];
  }>;
  porDefensor: Array<{ defensorId: number; nome: string; substituicoesAbertas: number; afastamentoAtivo: boolean }>;
};

/** Gratification steps still missing on a substituição. */
export function faltandoSteps(s: SubstituicaoLite): string[] {
  const f: string[] = [];
  if (!s.oficioNumero) f.push("ofício");
  if (!s.relatorioPath) f.push("relatório");
  if (!s.seiProtocolo) f.push("SEI");
  return f;
}

function isActiveToday(a: AfastamentoLite, today: string): boolean {
  if (!a.ativo) return false;
  if (a.dataInicio > today) return false;
  if (a.dataFim !== null && a.dataFim < today) return false;
  return true;
}

export function buildCoberturaRollup(
  input: { afastamentos: AfastamentoLite[]; substituicoes: SubstituicaoLite[]; users: UserLite[] },
  today: string,
): CoberturaRollup {
  const { afastamentos, substituicoes, users } = input;
  const nameOf = (id: number | null) => (id === null ? "" : users.find((u) => u.id === id)?.name ?? `#${id}`);

  const subsByAfastamento = new Map<number, SubstituicaoLite>();
  for (const s of substituicoes) {
    if (s.afastamentoId !== null && !subsByAfastamento.has(s.afastamentoId)) {
      subsByAfastamento.set(s.afastamentoId, s);
    }
  }

  const activeAfastamentos = afastamentos.filter((a) => a.ativo);

  const afastadosHoje = afastamentos.filter((a) => isActiveToday(a, today)).length;
  const substituicoesAbertas = substituicoes.filter((s) => s.status !== "paga").length;
  const semCobertura = activeAfastamentos.filter((a) => !subsByAfastamento.has(a.id)).length;
  const gratificacoesAOficiar = substituicoes.filter((s) => s.status === "concluida").length;
  const gratificacoesAPagar = substituicoes.filter((s) => s.status === "oficiada").length;

  const cobertura = activeAfastamentos
    .slice()
    .sort((a, b) => (a.dataInicio < b.dataInicio ? 1 : a.dataInicio > b.dataInicio ? -1 : 0))
    .map((a) => {
      const linked = subsByAfastamento.get(a.id) ?? null;
      return {
        afastamentoId: a.id,
        defensorAfastado: nameOf(a.defensorId),
        periodo: `${a.dataInicio} – ${a.dataFim ?? "em aberto"}`,
        substituicaoId: linked?.id ?? null,
        defensorSubstituto: nameOf(a.substitutoId),
        statusGratificacao: linked?.status ?? null,
      };
    });

  const pendencias = substituicoes
    .filter((s) => s.status !== "paga")
    .map((s) => ({
      substituicaoId: s.id,
      defensorSubstituto: nameOf(s.defensorId),
      unidadeSubstituida: s.unidadeSubstituida,
      status: s.status,
      faltando: faltandoSteps(s),
    }));

  const porDefensor = users.map((u) => ({
    defensorId: u.id,
    nome: u.name,
    substituicoesAbertas: substituicoes.filter((s) => s.defensorId === u.id && s.status !== "paga").length,
    afastamentoAtivo: afastamentos.some((a) => a.defensorId === u.id && isActiveToday(a, today)),
  }));

  return {
    kpis: { afastadosHoje, substituicoesAbertas, semCobertura, gratificacoesAOficiar, gratificacoesAPagar },
    cobertura, pendencias, porDefensor,
  };
}
