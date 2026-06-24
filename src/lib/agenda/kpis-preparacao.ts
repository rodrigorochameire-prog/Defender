/**
 * KPIs do inbox de preparação de audiências (spec §C): total, completos,
 * parciais, pendentes e próximas 24h. Lógica pura/testável — recebe `now`
 * explícito para ser determinística.
 */

export interface KpisPreparacao {
  total: number;
  completos: number;
  parciais: number;
  pendentes: number;
  /** Audiências que ocorrem dentro das próximas 24h. */
  proximas24h: number;
}

interface AudienciaPrep {
  statusPrep?: string | null;
  dataAudiencia?: string | Date | null;
}

const UM_DIA_MS = 24 * 60 * 60 * 1000;

function tempo(d: string | Date | null | undefined): number | null {
  if (!d) return null;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isNaN(t) ? null : t;
}

export function kpisPreparacao(audiencias: AudienciaPrep[], now: number): KpisPreparacao {
  const k: KpisPreparacao = { total: 0, completos: 0, parciais: 0, pendentes: 0, proximas24h: 0 };
  if (!Array.isArray(audiencias)) return k;
  k.total = audiencias.length;
  for (const a of audiencias) {
    const s = (a.statusPrep ?? "").toLowerCase();
    if (s === "completo") k.completos++;
    else if (s === "parcial") k.parciais++;
    else if (s === "pendente") k.pendentes++;

    const t = tempo(a.dataAudiencia);
    if (t !== null && t >= now && t <= now + UM_DIA_MS) k.proximas24h++;
  }
  return k;
}
