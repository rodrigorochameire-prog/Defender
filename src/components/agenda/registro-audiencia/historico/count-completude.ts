interface RegistroCompletude {
  resultado?: string;
  assistidoCompareceu?: boolean;
  anotacoesGerais?: string;
  depoentes?: Array<unknown>;
}

export const COMPLETUDE_TOTAL = 5;

export function countCompletude(
  registro: RegistroCompletude,
  statusAudiencia?: string
): number {
  let count = 0;
  if (statusAudiencia) count++;
  if (registro.resultado) count++;
  if (registro.assistidoCompareceu !== undefined) count++;
  if (registro.anotacoesGerais) count++;
  if ((registro.depoentes?.length ?? 0) > 0) count++;
  return count;
}

export type CompletudeState = "full" | "partial" | "empty";

export type TabKey = "briefing" | "depoentes" | "anotacoes" | "resultado" | "historico";

export interface CompletudeBreakdown {
  total: number;
  filled: number;
  byTab: Record<TabKey, CompletudeState>;
}

interface BriefingData {
  imputacao?: string | null;
  fatos?: string | null;
}

interface DepoenteLite {
  nome?: string;
  tipo?: string;
}

export function getCompletudeBreakdown(
  registro: RegistroCompletude & { depoentes?: DepoenteLite[] },
  statusAudiencia: string | undefined,
  briefing?: BriefingData,
  hasRegistroSalvo?: boolean,
): CompletudeBreakdown {
  const briefingHasImputacao = !!briefing?.imputacao;
  const briefingHasFatos = !!briefing?.fatos;
  const briefingScore: CompletudeState =
    briefingHasImputacao && briefingHasFatos
      ? "full"
      : briefingHasImputacao || briefingHasFatos
        ? "partial"
        : "empty";

  const depoentes = (registro.depoentes ?? []) as DepoenteLite[];
  const depoentesScore: CompletudeState =
    depoentes.length === 0
      ? "empty"
      : depoentes.every((d) => !!d.tipo)
        ? "full"
        : "partial";

  const anotacoesScore: CompletudeState = registro.anotacoesGerais ? "full" : "empty";

  const resultadoScore: CompletudeState =
    statusAudiencia && statusAudiencia !== "pendente" ? "full" : "empty";

  const historicoScore: CompletudeState = hasRegistroSalvo ? "full" : "empty";

  const byTab: Record<TabKey, CompletudeState> = {
    briefing: briefingScore,
    depoentes: depoentesScore,
    anotacoes: anotacoesScore,
    resultado: resultadoScore,
    historico: historicoScore,
  };

  const filled = Object.values(byTab).filter((s) => s === "full").length;

  return { total: COMPLETUDE_TOTAL, filled, byTab };
}
