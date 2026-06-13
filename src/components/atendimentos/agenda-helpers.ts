// Helpers puros da pauta de atendimentos — sem React/estado, testáveis em Node.
// Centralizam janela de período, detecção de "a registrar" e a ordenação
// centrada em hoje (hoje → próximos → anteriores).

import type { AtendimentoListItem } from "./config";

export type PeriodoPreset = "recentes" | "hoje" | "semana" | "passados" | "todos";

export const PERIODO_OPTIONS: { value: PeriodoPreset; label: string }[] = [
  { value: "recentes", label: "Recentes & próximos" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Próximos 7 dias" },
  { value: "passados", label: "Anteriores" },
  { value: "todos", label: "Todos" },
];

/** Meia-noite local de `base` (cópia — não muta o argumento). */
function meiaNoite(base: Date): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  return d;
}

function somarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

/**
 * Janela de datas (ISO) por preset. O default "recentes" inclui o passado
 * recente (30 dias) — assim atendimentos de ontem NÃO desaparecem da vista no
 * dia seguinte (a causa da percepção de "foram apagados").
 */
export function rangeFromPreset(
  preset: PeriodoPreset,
  now: Date = new Date()
): { dateFrom?: string; dateTo?: string } {
  const hoje = meiaNoite(now);
  switch (preset) {
    case "recentes":
      return { dateFrom: somarDias(hoje, -30).toISOString(), dateTo: somarDias(hoje, 120).toISOString() };
    case "hoje":
      return { dateFrom: hoje.toISOString(), dateTo: somarDias(hoje, 1).toISOString() };
    case "semana":
      return { dateFrom: hoje.toISOString(), dateTo: somarDias(hoje, 7).toISOString() };
    case "passados":
      return { dateFrom: somarDias(hoje, -365).toISOString(), dateTo: hoje.toISOString() };
    case "todos":
      return {};
  }
}

/** Atendimento que já aconteceu (passou do horário) e segue agendado. */
export function isPendente(a: AtendimentoListItem, now: Date = new Date()): boolean {
  return a.status === "agendado" && new Date(a.dataRegistro).getTime() < now.getTime();
}

/** Chave de dia (yyyy-MM-dd) no fuso local. */
export function chaveDia(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export interface GrupoDia {
  dia: string;
  itens: AtendimentoListItem[];
  /** true quando o dia é futuro ou hoje (afeta só a estética do cabeçalho). */
  futuro: boolean;
}

/**
 * Agrupa por dia e ordena de forma centrada em hoje:
 *   hoje → dias futuros (ascendente) → dias passados (descendente).
 * Assim a tela "aterrissa" no presente, mostra o que vem e mantém o recente
 * logo abaixo, sem esconder nada.
 */
export function agruparPorDia(
  itens: AtendimentoListItem[],
  now: Date = new Date()
): GrupoDia[] {
  const hojeKey = chaveDia(now);
  const mapa = new Map<string, AtendimentoListItem[]>();
  for (const a of itens) {
    const k = chaveDia(new Date(a.dataRegistro));
    const lista = mapa.get(k) ?? [];
    lista.push(a);
    mapa.set(k, lista);
  }
  for (const lista of mapa.values()) {
    lista.sort(
      (x, y) => new Date(x.dataRegistro).getTime() - new Date(y.dataRegistro).getTime()
    );
  }
  const grupos = [...mapa.entries()].map(([dia, lista]) => ({
    dia,
    itens: lista,
    futuro: dia >= hojeKey,
  }));
  grupos.sort((a, b) => {
    const aFut = a.dia >= hojeKey;
    const bFut = b.dia >= hojeKey;
    if (aFut && bFut) return a.dia.localeCompare(b.dia); // futuros: ascendente
    if (!aFut && !bFut) return b.dia.localeCompare(a.dia); // passados: descendente
    return aFut ? -1 : 1; // futuros/hoje antes dos passados
  });
  return grupos;
}

/** Rótulo humano do cabeçalho do dia (Hoje/Ontem/Amanhã ou data). */
export function rotuloDia(diaKey: string, now: Date = new Date()): string | null {
  const hoje = chaveDia(now);
  const ontem = chaveDia(new Date(now.getTime() - 86400000));
  const amanha = chaveDia(new Date(now.getTime() + 86400000));
  if (diaKey === hoje) return "Hoje";
  if (diaKey === ontem) return "Ontem";
  if (diaKey === amanha) return "Amanhã";
  return null; // o componente formata a data por extenso
}
