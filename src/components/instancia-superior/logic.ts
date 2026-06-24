// ─── Pure logic — Instância Superior ──────────────────────────────────────
// Funções puras, sem React/DOM. Alvos de TDD: priorização da carteira,
// subtítulo por modo, validação/máscara do número CNJ, taxa de provimento.

export type EscopoModo = "meus" | "todos";

/** Subtítulo do cabeçalho conforme o modo de escopo (Contexto — Faixa A). */
export function subtituloDoModo(modo: EscopoModo): string {
  return modo === "todos"
    ? "Carteira recursal de toda a Defensoria"
    : "Seus recursos em instância superior";
}

/** Taxa de provimento (%) inteira, ou null quando não há julgados. */
export function taxaProvimento(providos: number, julgados: number): number | null {
  if (!julgados || julgados <= 0) return null;
  return Math.round((providos / julgados) * 100);
}

// ─── Priorização da carteira ──────────────────────────────────────────────
// Ordem (spec): 1) em pauta · 2) pendência urgente · 3) aguardando providência
// pós-julgamento · 4) fluxo regular · (encerrados/transitados por último).

export type CarteiraRow = {
  status?: string | null;
  dataPauta?: string | null;
  prioridade?: string | null;
};

const PRIORIDADE_URGENTE = new Set(["URGENTE", "ALTA", "ALTO"]);

/** Rank de prioridade (menor = mais urgente). */
export function prioridadeRecurso(r: CarteiraRow, now: Date = new Date()): number {
  const status = (r.status ?? "").toUpperCase();
  const pautaFutura =
    r.dataPauta != null && r.dataPauta !== "" &&
    !Number.isNaN(new Date(r.dataPauta).getTime()) &&
    new Date(r.dataPauta).getTime() >= now.getTime();

  if (status === "PAUTADO" || pautaFutura) return 0;            // em pauta
  if (PRIORIDADE_URGENTE.has((r.prioridade ?? "").toUpperCase())) return 1; // pendência urgente
  if (status === "JULGADO") return 2;                          // aguardando providência pós-julgamento
  if (status === "TRANSITADO") return 4;                       // encerrado → por último
  return 3;                                                    // fluxo regular
}

/** Ordena a carteira por prioridade, preservando a ordem original em empates. */
export function ordenarCarteira<T extends CarteiraRow>(rows: readonly T[], now: Date = new Date()): T[] {
  return rows
    .map((row, idx) => ({ row, idx, rank: prioridadeRecurso(row, now) }))
    .sort((a, b) => a.rank - b.rank || a.idx - b.idx)
    .map((x) => x.row);
}

// ─── KPIs do cabeçalho (Faixa B) ──────────────────────────────────────────

export type StatsLike = {
  total?: number | null;
  pendentes?: number | null;
  emPauta?: number | null;
  julgados?: number | null;
  taxaProvimento?: number | null;
  porTribunal?: { tribunal: string; total: number }[] | null;
};

export type KpiRowData = {
  total: number;
  tjba: number;
  stj: number;
  stf: number;
  pendentes: number;
  emPauta: number;
  julgados: number;
  provimento: number | null;
};

/** Total de recursos de um tribunal a partir de stats.porTribunal. */
export function tribunalCount(
  porTribunal: { tribunal: string; total: number }[] | null | undefined,
  key: string,
): number {
  return porTribunal?.find((t) => t.tribunal === key)?.total ?? 0;
}

/** Deriva os 8 valores da faixa de KPIs a partir do objeto stats. */
export function kpiRowData(stats: StatsLike | null | undefined): KpiRowData {
  return {
    total: stats?.total ?? 0,
    tjba: tribunalCount(stats?.porTribunal, "TJBA"),
    stj: tribunalCount(stats?.porTribunal, "STJ"),
    stf: tribunalCount(stats?.porTribunal, "STF"),
    pendentes: stats?.pendentes ?? 0,
    emPauta: stats?.emPauta ?? 0,
    julgados: stats?.julgados ?? 0,
    provimento: stats?.taxaProvimento ?? null,
  };
}

// ─── Número CNJ ───────────────────────────────────────────────────────────
// Formato: NNNNNNN-DD.AAAA.J.TR.OOOO (20 dígitos).

const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

/** True quando a string está no formato CNJ completo e válido. */
export function validarNumeroRecurso(s: string): boolean {
  return CNJ_REGEX.test(s.trim());
}

/** Aplica a máscara CNJ progressivamente sobre os dígitos digitados. */
export function formatarNumeroRecurso(s: string): string {
  const d = s.replace(/\D/g, "").slice(0, 20);
  if (d.length === 0) return "";
  let out = d.slice(0, 7);
  if (d.length > 7) out += "-" + d.slice(7, 9);
  if (d.length > 9) out += "." + d.slice(9, 13);
  if (d.length > 13) out += "." + d.slice(13, 14);
  if (d.length > 14) out += "." + d.slice(14, 16);
  if (d.length > 16) out += "." + d.slice(16, 20);
  return out;
}
