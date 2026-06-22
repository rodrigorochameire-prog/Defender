import { differenceInDays } from "date-fns";
import {
  calcularPrescricaoExecutoria,
  type PrescricaoExecutoriaInput,
  type PrescricaoExecutoriaResult,
} from "./prescricao";

/**
 * Readers da execução penal — convertem o dado persistido (título executivo +
 * eventos) nas entradas tipadas que a função pura de prescrição consome.
 * Mantém a função pura agnóstica ao schema do banco.
 */

export interface ExecucaoParaPrescricao {
  penaAnos: number;
  penaMeses: number;
  penaDias: number;
  detracaoDias: number;
  reincidente: boolean;
  menor21NoFato: boolean;
  maior70NaSentenca: boolean;
  inicioCumprimento: string | null;
  transitoJulgadoData: string | null;
  situacao: string;
}

export interface EventoParaPrescricao {
  tipo: string;
  dados?: { dias?: number } | null;
}

export function montarInputPrescricao(
  exec: ExecucaoParaPrescricao,
  eventos: EventoParaPrescricao[],
  hoje: Date = new Date(),
): PrescricaoExecutoriaInput | null {
  // Termo interruptivo: início do cumprimento; na ausência, o trânsito em julgado.
  const marcoInterruptivo = exec.inicioCumprimento ?? exec.transitoJulgadoData;
  if (!marcoInterruptivo) return null;

  const penaTotalDias = exec.penaAnos * 365 + exec.penaMeses * 30 + exec.penaDias;

  const diasRemidos = eventos
    .filter((e) => e.tipo === "remissao")
    .reduce((soma, e) => soma + (e.dados?.dias ?? 0), 0);

  const inicio = exec.inicioCumprimento ? new Date(exec.inicioCumprimento) : null;
  const diasCumpridos =
    inicio && !isNaN(inicio.getTime())
      ? Math.max(0, differenceInDays(hoje, inicio))
      : 0;

  return {
    penaTotalDias,
    diasCumpridos,
    diasRemidos,
    diasDetraidos: exec.detracaoDias,
    reincidente: exec.reincidente,
    menor21NaDataFato: exec.menor21NoFato,
    maior70NaDataSentenca: exec.maior70NaSentenca,
    marcoInterruptivo,
    hoje,
  };
}

export function avaliarPrescricaoExecucao(
  exec: ExecucaoParaPrescricao,
  eventos: EventoParaPrescricao[],
  hoje: Date = new Date(),
): PrescricaoExecutoriaResult | null {
  const input = montarInputPrescricao(exec, eventos, hoje);
  if (!input) return null;
  return calcularPrescricaoExecutoria(input);
}
