/**
 * Vínculo de trabalho a uma substituição — regra aprovada 11/06:
 * pertence à substituição o item (demanda/audiência/atendimento) que
 *   1. foi criado DENTRO do período da substituição;
 *   2. é de processo no ESCOPO de atribuições dela;
 *   3. NÃO é de processo pré-existente do defensor (titularidade) — ou seja,
 *      o processo também chegou durante o período.
 * Derivado por consulta (sem coluna nova): retroativo e sem hooks de escrita.
 */

export interface PeriodoSubstituicao {
  /** yyyy-MM-dd */
  dataInicio: string;
  /** yyyy-MM-dd ou null (em aberto) */
  dataFim?: string | null;
  escopoAtribuicoes: string[];
}

export interface ItemCandidato {
  itemCriadoEm: Date;
  atribuicao: string;
  processoCriadoEm: Date;
}

function inicioDoDia(iso: string): Date {
  return new Date(`${iso}T00:00:00-03:00`);
}
function fimDoDia(iso: string): Date {
  return new Date(`${iso}T23:59:59-03:00`);
}

export function pertenceASubstituicao(
  sub: PeriodoSubstituicao,
  item: ItemCandidato,
): boolean {
  if (!sub.escopoAtribuicoes.includes(item.atribuicao)) return false;
  const ini = inicioDoDia(sub.dataInicio);
  const fim = sub.dataFim ? fimDoDia(sub.dataFim) : null;
  const dentro = (d: Date) => d >= ini && (!fim || d <= fim);
  return dentro(item.itemCriadoEm) && dentro(item.processoCriadoEm);
}

/**
 * Pendências da esteira: em_andamento não cobra nada; a partir de concluída,
 * cobra ofício/relatório; oficiada cobra SEI; paga completa = zero.
 */
export function pendenciasDaSubstituicao(s: {
  status: string;
  oficioNumero: string | null;
  relatorioPath: string | null;
  seiProtocolo: string | null;
}): string[] {
  if (s.status === "em_andamento") return [];
  const p: string[] = [];
  if (!s.oficioNumero) p.push("Gerar ofício (sem número)");
  if (!s.relatorioPath) p.push("Gerar relatório (sem arquivo)");
  if ((s.status === "oficiada" || s.status === "paga") && !s.seiProtocolo) {
    p.push("Protocolar no SEI");
  }
  return p;
}
