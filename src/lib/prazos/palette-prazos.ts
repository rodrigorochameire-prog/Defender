/**
 * Seleção dos prazos realmente urgentes (vencidos / vencendo hoje) para o card
 * do ⌘K — lógica pura. Recebe as linhas de `prazos.prazosCriticos` e devolve
 * itens enxutos, clicáveis (levam ao processo). Ordena do mais atrasado.
 */

export interface PrazoRowLike {
  demanda: { id: number; ato?: string | null };
  assistido?: { nome?: string | null } | null;
  processo?: { id?: number | null } | null;
  diasRestantes?: number | null;
  urgencia?: string | null;
}

export type PrazoTone = "danger" | "warning";

export interface UrgentPrazoItem {
  id: number;
  processoId: number | null;
  ato: string;
  assistidoNome: string | null;
  diasRestantes: number | null;
  urgencia: "VENCIDO" | "HOJE";
  tone: PrazoTone;
  /** Texto curto da urgência (ex.: "vencido há 3d", "hoje"). */
  quando: string;
}

function quandoLabel(urgencia: "VENCIDO" | "HOJE", dias: number | null): string {
  if (urgencia === "HOJE") return "hoje";
  const d = typeof dias === "number" ? Math.abs(dias) : null;
  return d != null ? `vencido há ${d}d` : "vencido";
}

/**
 * Retorna os prazos vencidos/de hoje, do mais atrasado para o menos, limitados.
 * Demais urgências (crítico/atenção) ficam de fora — o card é só para o que
 * exige ação AGORA.
 */
export function urgentPrazoItems(
  rows: PrazoRowLike[] | null | undefined,
  max = 5,
): UrgentPrazoItem[] {
  return (rows ?? [])
    .filter((r) => r.urgencia === "VENCIDO" || r.urgencia === "HOJE")
    .sort((a, b) => (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0))
    .slice(0, max)
    .map((r) => {
      const urgencia = r.urgencia as "VENCIDO" | "HOJE";
      return {
        id: r.demanda.id,
        processoId: r.processo?.id ?? null,
        ato: r.demanda.ato?.trim() || "Prazo",
        assistidoNome: r.assistido?.nome?.trim() || null,
        diasRestantes: r.diasRestantes ?? null,
        urgencia,
        tone: urgencia === "VENCIDO" ? "danger" : "warning",
        quando: quandoLabel(urgencia, r.diasRestantes ?? null),
      };
    });
}
