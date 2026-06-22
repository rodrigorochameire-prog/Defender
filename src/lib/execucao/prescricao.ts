import { differenceInDays } from "date-fns";

/**
 * Prescrição da Pretensão Executória (PPE) — função pura, sinal de oportunidade.
 *
 * Base legal modelada (CP):
 * - Art. 109: tabela de prazos pela pena.
 * - Art. 110: PPE pela pena aplicada; +1/3 se reincidente.
 * - Art. 113: evasão/revogação → prescrição pela pena RESIDUAL (modelo base).
 * - Art. 115: prazo reduzido à metade (menor de 21 no fato / maior de 70 na sentença).
 * - Art. 112/117: termo inicial / interrupção → `marcoInterruptivo`.
 *
 * NÃO é opinião legal fechada — é um detector para PROVOCAR a extinção. A UI
 * deve expor os números do cálculo para conferência ("verificar prescrição").
 */

export interface PrescricaoExecutoriaInput {
  /** Pena aplicada, em dias. */
  penaTotalDias: number;
  /** Tempo já cumprido, em dias. */
  diasCumpridos: number;
  diasRemidos?: number;
  diasDetraidos?: number;
  reincidente?: boolean;
  menor21NaDataFato?: boolean;
  maior70NaDataSentenca?: boolean;
  /** Data ISO (YYYY-MM-DD) do último marco interruptivo. */
  marcoInterruptivo: string;
  /** Injetável para teste; default = agora. */
  hoje?: Date;
  /** Janela de iminência em dias; default 180. */
  janelaIminenciaDias?: number;
}

export interface PrescricaoExecutoriaResult {
  penaResidualDias: number;
  prazoPrescricionalDias: number;
  diasDecorridos: number;
  /** prazo − decorrido. Negativo = prescrição já consumada. */
  diasParaPrescricao: number;
  iminente: boolean;
  nivel: "amber" | "red";
  motivo: string;
}

const DIAS_POR_ANO = 365;

/** Tabela do art. 109 CP: anos de pena → anos de prazo prescricional. */
function tabelaArt109(anosPena: number): number {
  if (anosPena > 12) return 20;
  if (anosPena > 8) return 16;
  if (anosPena > 4) return 12;
  if (anosPena > 2) return 8;
  if (anosPena >= 1) return 4;
  return 3;
}

export function calcularPrescricaoExecutoria(
  input: PrescricaoExecutoriaInput,
): PrescricaoExecutoriaResult | null {
  const hoje = input.hoje ?? new Date();
  const janela = input.janelaIminenciaDias ?? 180;

  const penaResidualDias = Math.max(
    0,
    input.penaTotalDias -
      input.diasCumpridos -
      (input.diasRemidos ?? 0) -
      (input.diasDetraidos ?? 0),
  );
  if (penaResidualDias <= 0) return null;

  const prazoAnosBase = tabelaArt109(penaResidualDias / DIAS_POR_ANO);
  let prazoPrescricionalDias = prazoAnosBase * DIAS_POR_ANO;
  if (input.reincidente) prazoPrescricionalDias = (prazoPrescricionalDias * 4) / 3;
  if (input.menor21NaDataFato || input.maior70NaDataSentenca) prazoPrescricionalDias /= 2;
  prazoPrescricionalDias = Math.round(prazoPrescricionalDias);

  const marco = new Date(input.marcoInterruptivo);
  if (isNaN(marco.getTime())) return null;
  const diasDecorridos = Math.max(0, differenceInDays(hoje, marco));
  const diasParaPrescricao = prazoPrescricionalDias - diasDecorridos;

  if (diasParaPrescricao > janela) return null;

  const nivel: "amber" | "red" = diasParaPrescricao <= 60 ? "red" : "amber";
  const motivo =
    diasParaPrescricao <= 0
      ? `Prescrição executória possivelmente CONSUMADA (prazo ${prazoPrescricionalDias}d, decorridos ${diasDecorridos}d) — verificar extinção da punibilidade`
      : `Prescrição executória em ~${diasParaPrescricao} dias (prazo ${prazoPrescricionalDias}d sobre pena residual de ${penaResidualDias}d) — verificar`;

  return {
    penaResidualDias,
    prazoPrescricionalDias,
    diasDecorridos,
    diasParaPrescricao,
    iminente: true,
    nivel,
    motivo,
  };
}
