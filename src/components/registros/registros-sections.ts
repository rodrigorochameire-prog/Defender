// src/components/registros/registros-sections.ts
import type { TipoRegistro } from "./registro-tipo-config";

export type RegistroLike = {
  id: number;
  tipo: TipoRegistro | string;
  status: string | null;
  prazo: string | null;
  dataRegistro: string | Date;
  titulo: string | null;
  conteudo: string | null;
  [k: string]: unknown;
};

export type DayGroup<T extends RegistroLike> = { dayKey: string; registros: T[] };
export type SplitResult<T extends RegistroLike> = { pendencias: T[]; historico: DayGroup<T>[] };

const dayKeyOf = (d: string | Date): string => new Date(d).toISOString().slice(0, 10);
const ts = (d: string | Date): number => new Date(d).getTime();

/** A pendência is an open (status=agendado) diligência. */
export function isPendencia(r: RegistroLike): boolean {
  return r.tipo === "diligencia" && r.status === "agendado";
}

export function splitRegistros<T extends RegistroLike>(registros: T[]): SplitResult<T> {
  const pendencias: T[] = [];
  const historicoFlat: T[] = [];
  for (const r of registros) (isPendencia(r) ? pendencias : historicoFlat).push(r);

  pendencias.sort((a, b) => {
    if (a.prazo && b.prazo) return a.prazo.localeCompare(b.prazo); // asc
    if (a.prazo) return -1; // dated first
    if (b.prazo) return 1;
    return ts(b.dataRegistro) - ts(a.dataRegistro);
  });

  const byDay = new Map<string, T[]>();
  for (const r of historicoFlat) {
    const k = dayKeyOf(r.dataRegistro);
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(r);
  }
  const historico: DayGroup<T>[] = [...byDay.entries()]
    .map(([dayKey, regs]) => ({ dayKey, registros: regs.sort((a, b) => ts(b.dataRegistro) - ts(a.dataRegistro)) }))
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey)); // newest day first

  return { pendencias, historico };
}

/** "HOJE" / "ONTEM" / "26 JUN" label for a dayKey, relative to `now`. */
export function dayLabel(dayKey: string, now: Date = new Date()): string {
  const today = now.toISOString().slice(0, 10);
  const yest = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  if (dayKey === today) return "HOJE";
  if (dayKey === yest) return "ONTEM";
  const [y, m, d] = dayKey.split("-");
  const meses = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  return `${d} ${meses[Number(m) - 1]}${y !== today.slice(0, 4) ? " " + y : ""}`;
}
