import { differenceInDays } from "date-fns";

/**
 * Flags de benefícios / risco na execução penal (Camada 3, Fase IX).
 * Funções puras — sinalizam OPORTUNIDADE (emerald) ou RISCO (amber/red) para o
 * defensor verificar. Limiares conservadores; nunca afirmam direito, provocam análise.
 */

export type NivelBeneficio = "emerald" | "amber" | "red";

export interface BeneficioFlag {
  tipo: string;
  nivel: NivelBeneficio;
  motivo: string;
}

// ------------------------------------------
// Risco de regressão por desatualização cadastral
// ------------------------------------------
const LIMITE_CADASTRO_DIAS = 60;
const LIMITE_CADASTRO_RED_DIAS = 120;

// Situações/regimes "na comunidade" — onde manter endereço/contato atualizado importa.
const SITUACAO_COMUNIDADE = ["livramento-condicional", "monitoramento", "domiciliar"];
const REGIME_COMUNIDADE = ["aberto", "semiaberto"];

export function detectRiscoRegressaoCadastral(
  e: {
    situacao: string;
    regimeAtual: string | null;
    dataUltimaConfirmacaoCadastral: string | null;
  },
  hoje: Date = new Date(),
): BeneficioFlag | null {
  const naComunidade =
    SITUACAO_COMUNIDADE.includes(e.situacao) ||
    (e.regimeAtual != null && REGIME_COMUNIDADE.includes(e.regimeAtual));
  if (!naComunidade) return null;

  if (!e.dataUltimaConfirmacaoCadastral) {
    return {
      tipo: "risco-regressao-cadastral",
      nivel: "amber",
      motivo: "Cadastro de endereço/contato nunca confirmado — risco de regressão; sugerir contato",
    };
  }

  const dt = new Date(e.dataUltimaConfirmacaoCadastral);
  if (isNaN(dt.getTime())) return null;
  const dias = Math.max(0, differenceInDays(hoje, dt));
  if (dias <= LIMITE_CADASTRO_DIAS) return null;

  return {
    tipo: "risco-regressao-cadastral",
    nivel: dias > LIMITE_CADASTRO_RED_DIAS ? "red" : "amber",
    motivo: `Cadastro sem confirmação há ${dias} dias — risco de regressão por desatualização; sugerir contato/visita`,
  };
}

// ------------------------------------------
// Saída temporária possível (art. 122 LEP)
// ------------------------------------------
export function detectSaidaTemporaria(e: {
  regimeAtual: string | null;
  fracaoCumprida: number;
  reincidente: boolean;
  hediondo: boolean;
  faltaGraveRecente: boolean;
}): BeneficioFlag | null {
  if (e.regimeAtual !== "semiaberto") return null;
  if (e.hediondo) return null; // conservador
  if (e.faltaGraveRecente) return null;

  const limiar = e.reincidente ? 1 / 4 : 1 / 6;
  if (e.fracaoCumprida < limiar) return null;

  return {
    tipo: "saida-temporaria",
    nivel: "emerald",
    motivo: `Saída temporária possível — semiaberto, ${Math.round(e.fracaoCumprida * 100)}% cumprido (limiar ${e.reincidente ? "1/4" : "1/6"}), sem falta grave recente`,
  };
}

// ------------------------------------------
// Livramento condicional possível (art. 83 CP)
// ------------------------------------------
export function detectLivramentoCondicional(e: {
  fracaoCumprida: number;
  reincidente: boolean;
  hediondo: boolean;
  faltaGraveRecente: boolean;
}): BeneficioFlag | null {
  if (e.faltaGraveRecente) return null;
  // Reincidência específica em hediondo veda (art. 83 V). Sem distinguir
  // genérica/específica, somos conservadores: não sinalizamos.
  if (e.hediondo && e.reincidente) return null;

  const limiar = e.hediondo ? 2 / 3 : e.reincidente ? 1 / 2 : 1 / 3;
  if (e.fracaoCumprida < limiar) return null;

  const fracaoLabel = e.hediondo ? "2/3" : e.reincidente ? "1/2" : "1/3";
  return {
    tipo: "livramento-condicional",
    nivel: "emerald",
    motivo: `Livramento condicional possível — ${Math.round(e.fracaoCumprida * 100)}% cumprido (limiar ${fracaoLabel})`,
  };
}
