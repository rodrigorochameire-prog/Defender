/**
 * Resumo de urgência de prazos para o chip de alerta no cabeçalho — lógica pura,
 * testável. Transforma as estatísticas de `prazos.estatisticasPrazos` num modelo
 * de exibição compacto, priorizando o que é acionável AGORA (vencidos + hoje) e
 * sinalizando o caso mais grave (réu preso com prazo vencido).
 */

export interface PrazosStats {
  vencidos?: number | null;
  vencendoHoje?: number | null;
  proximosDias?: number | null;
  reuPresoVencido?: number | null;
}

export type PrazosTone = "danger" | "warning" | "muted";

export interface PrazosAlertModel {
  /** Há algo que exige ação agora (vencidos ou vencendo hoje). */
  hasUrgent: boolean;
  /** Contagem acionável agora: vencidos + vencendo hoje. */
  count: number;
  tone: PrazosTone;
  /** Texto curto p/ o chip (ex.: "3 vencidos · 2 hoje"). */
  label: string;
  /** Sinaliza réu preso com prazo vencido (o caso mais crítico). */
  reuPresoVencido: number;
}

const n = (v: number | null | undefined): number => (typeof v === "number" && v > 0 ? v : 0);

export function summarizePrazos(stats: PrazosStats | null | undefined): PrazosAlertModel {
  const vencidos = n(stats?.vencidos);
  const hoje = n(stats?.vencendoHoje);
  const reuPresoVencido = n(stats?.reuPresoVencido);

  const count = vencidos + hoje;
  const hasUrgent = count > 0;

  const parts: string[] = [];
  if (vencidos > 0) parts.push(`${vencidos} vencido${vencidos > 1 ? "s" : ""}`);
  if (hoje > 0) parts.push(`${hoje} hoje`);

  const tone: PrazosTone =
    vencidos > 0 || reuPresoVencido > 0 ? "danger" : hoje > 0 ? "warning" : "muted";

  return {
    hasUrgent,
    count,
    tone,
    label: parts.join(" · "),
    reuPresoVencido,
  };
}
