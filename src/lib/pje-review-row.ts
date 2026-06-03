/**
 * Montagem das linhas do preview de importação PJe (etapa "revisar").
 * Funções puras — testáveis sem React.
 */

import { suggestAto } from "@/lib/ato-suggestion";
import { calcularPrazoPorAto } from "@/lib/prazo-calculator";
import type { PjeReviewRow } from "@/components/demandas-premium/pje-review-table";

/**
 * Converte dataExpedicao ("DD/MM/YYYY", "DD/MM/YY HH:mm" ou "YYYY-MM-DD") +
 * ato em prazo BR via calcularPrazoPorAto. Retorna "" quando não calculável.
 * (Movida de pje-review-table.tsx para reutilizar na montagem e no lote.)
 */
export function calcularPrazoParaAto(dataExpedicao: string, ato: string): string {
  if (!dataExpedicao || !ato) return "";

  try {
    let date: Date;
    if (dataExpedicao.includes("-")) {
      // ISO format
      date = new Date(dataExpedicao + "T12:00:00");
    } else {
      const parts = dataExpedicao.split(/[\s/]/);
      const dia = parseInt(parts[0]);
      const mes = parseInt(parts[1]) - 1;
      const ano = parseInt(parts[2]);
      const fullYear = ano < 100 ? 2000 + ano : ano;
      date = new Date(fullYear, mes, dia);
    }

    if (isNaN(date.getTime())) return "";

    return calcularPrazoPorAto(date, ato) || "";
  } catch {
    return "";
  }
}

export interface IntimacaoParaReview {
  assistido: string;
  numeroProcesso: string;
  dataExpedicao: string;
  tipoDocumento?: string;
  tipoProcesso?: string;
  crime?: string;
  ordemOriginal?: number;
}

/**
 * Monta a linha do preview a partir da intimação parseada.
 *
 * Pré-preenche ato + prazo quando a sugestão regra-based tem confiança
 * alta/média; baixa fica vazia para classificação manual. Usa suggestAto
 * (campos da própria linha) e NÃO o texto colado completo — a detecção de
 * audiência no texto misturado de todas as intimações é imprecisa.
 */
export function montarReviewRow(
  intimacao: IntimacaoParaReview,
  atribuicao: string,
  index: number,
): PjeReviewRow {
  const suggestion = suggestAto(
    intimacao.tipoDocumento,
    intimacao.tipoProcesso,
    atribuicao,
  );
  const prefill = suggestion.confidence !== "low";
  const ato = prefill ? suggestion.ato : "";

  return {
    assistidoNome: intimacao.assistido,
    numeroProcesso: intimacao.numeroProcesso,
    dataExpedicao: intimacao.dataExpedicao,
    tipoDocumento: intimacao.tipoDocumento,
    tipoProcesso: intimacao.tipoProcesso,
    crime: intimacao.crime,
    ordemOriginal: intimacao.ordemOriginal ?? index,
    ato,
    atoConfidence: suggestion.confidence,
    status: "triagem", // Triagem — aguardando conferência/classificação
    prazo: ato ? calcularPrazoParaAto(intimacao.dataExpedicao, ato) : "",
    estadoPrisional: "Solto",
    excluded: false,
    prazoManual: false,
    providencias: "",
    assistidoMatch: { type: "new" }, // Será atualizado pelo matchQuery
    // Audiência: não preencher automaticamente (detecção por linha é do scan)
    audienciaData: undefined,
    audienciaHora: undefined,
    audienciaTipo: undefined,
    criarEventoAgenda: undefined,
  };
}
