import { differenceInDays } from "date-fns";
import {
  calcularPrescricaoExecutoria,
  type PrescricaoExecutoriaInput,
  type PrescricaoExecutoriaResult,
} from "./prescricao";
import {
  detectRiscoRegressaoCadastral,
  detectSaidaTemporaria,
  detectLivramentoCondicional,
  type BeneficioFlag,
} from "./flags-beneficios";

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

export interface ExecucaoParaBeneficios extends ExecucaoParaPrescricao {
  hediondo: boolean;
  regimeAtual: string | null;
  dataUltimaConfirmacaoCadastral: string | null;
}

export interface EventoParaBeneficios {
  tipo: string;
  data: string;
  dados?: { dias?: number; grauFalta?: string } | null;
}

/** Roda os detectores de benefício/risco da execução e devolve os flags ativos. */
export function avaliarBeneficiosExecucao(
  exec: ExecucaoParaBeneficios,
  eventos: EventoParaBeneficios[],
  hoje: Date = new Date(),
): BeneficioFlag[] {
  const flags: BeneficioFlag[] = [];

  const penaTotalDias = exec.penaAnos * 365 + exec.penaMeses * 30 + exec.penaDias;
  const inicio = exec.inicioCumprimento ? new Date(exec.inicioCumprimento) : null;
  const diasCumpridos =
    inicio && !isNaN(inicio.getTime()) ? Math.max(0, differenceInDays(hoje, inicio)) : 0;
  const diasRemidos = eventos
    .filter((e) => e.tipo === "remissao")
    .reduce((s, e) => s + (e.dados?.dias ?? 0), 0);
  const fracaoCumprida = penaTotalDias > 0 ? (diasCumpridos + diasRemidos) / penaTotalDias : 0;

  const faltaGraveRecente = eventos.some((e) => {
    if (e.tipo !== "falta" || e.dados?.grauFalta !== "grave") return false;
    const d = new Date(e.data);
    return !isNaN(d.getTime()) && differenceInDays(hoje, d) <= 365;
  });

  const reg = detectRiscoRegressaoCadastral(
    {
      situacao: exec.situacao,
      regimeAtual: exec.regimeAtual,
      dataUltimaConfirmacaoCadastral: exec.dataUltimaConfirmacaoCadastral,
    },
    hoje,
  );
  if (reg) flags.push(reg);

  const saida = detectSaidaTemporaria({
    regimeAtual: exec.regimeAtual,
    fracaoCumprida,
    reincidente: exec.reincidente,
    hediondo: exec.hediondo,
    faltaGraveRecente,
  });
  if (saida) flags.push(saida);

  const liv = detectLivramentoCondicional({
    fracaoCumprida,
    reincidente: exec.reincidente,
    hediondo: exec.hediondo,
    faltaGraveRecente,
  });
  if (liv) flags.push(liv);

  return flags;
}
