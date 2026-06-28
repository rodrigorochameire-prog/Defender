export type ParcelaLite = { id: number; dataInicio: string; dataFim: string; status: string };
export type Saldo = { direito: number; programados: number; concluidos: number; disponiveis: number };

/** Inclusive day count between two YYYY-MM-DD strings (UTC). 0 if fim < inicio. */
export function diasInclusive(inicio: string, fim: string): number {
  if (fim < inicio) return 0;
  const a = new Date(`${inicio}T00:00:00Z`).getTime();
  const b = new Date(`${fim}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

const PROGRAMADO = new Set(["programada", "homologada", "em_fruicao"]);

export function computeSaldo(diasDireito: number, parcelas: ParcelaLite[]): Saldo {
  let programados = 0;
  let concluidos = 0;
  for (const p of parcelas) {
    if (p.status === "cancelada") continue;
    const dias = diasInclusive(p.dataInicio, p.dataFim);
    if (p.status === "concluida") concluidos += dias;
    else if (PROGRAMADO.has(p.status)) programados += dias;
  }
  return { direito: diasDireito, programados, concluidos, disponiveis: diasDireito - programados - concluidos };
}
