/**
 * Resumo de "audiências de hoje" para o chip do cabeçalho — lógica pura.
 * Conta as audiências (futuras, de `proximas`) cuja data cai no dia de `now` e
 * descreve a próxima. Sem urgência (0 hoje) → o chip some.
 */

export interface HearingLike {
  id: number;
  dataHora: string | Date | null;
  tipo?: string | null;
  horario?: string | null;
  assistido?: { nome?: string | null } | null;
}

export interface TodaySummary {
  /** Quantas audiências caem hoje. */
  count: number;
  /** Rótulo da próxima de hoje (ex.: "AIJ · 14:00 · Fulano"), se houver. */
  proximaLabel: string | null;
}

function toDate(v: string | Date | null): Date | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtHora(d: Date, horario?: string | null): string {
  if (horario && /^\d{1,2}:\d{2}$/.test(horario)) return horario;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function summarizeToday(
  hearings: HearingLike[] | null | undefined,
  now: number,
): TodaySummary {
  const today = new Date(now);
  const ofToday = (hearings ?? [])
    .map((h) => ({ h, d: toDate(h.dataHora) }))
    .filter((x): x is { h: HearingLike; d: Date } => x.d != null && sameLocalDay(x.d, today))
    .sort((a, b) => a.d.getTime() - b.d.getTime());

  if (ofToday.length === 0) return { count: 0, proximaLabel: null };

  // Próxima de hoje: a primeira ainda não-passada, senão a primeira do dia.
  const futura = ofToday.find((x) => x.d.getTime() >= now) ?? ofToday[0];
  const partes = [
    futura.h.tipo?.trim() || "Audiência",
    fmtHora(futura.d, futura.h.horario),
    futura.h.assistido?.nome?.trim(),
  ].filter(Boolean);

  return { count: ofToday.length, proximaLabel: partes.join(" · ") };
}
