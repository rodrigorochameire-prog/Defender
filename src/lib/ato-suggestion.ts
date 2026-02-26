/**
 * Mapeamento regra-based: (tipoDocumento, tipoProcesso, atribuicao) → ato sugerido
 * Usado pelo PJe Import v2 para sugerir o ato antes da importacao
 */

import { getAtosPorAtribuicao } from "@/config/atos-por-atribuicao";

// ============================================================================
// TIPOS
// ============================================================================

export interface AtoSuggestion {
  ato: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

interface AtoRule {
  tipoDocumento?: string | RegExp;
  tipoProcesso?: string | RegExp;
  atribuicao?: string | RegExp;
  ato: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

// ============================================================================
// REGRAS DE SUGESTAO (ordenadas por especificidade — primeiro match vence)
// ============================================================================

const ATO_RULES: AtoRule[] = [
  // ── Liberdade (urgente) ──
  {
    tipoDocumento: /^Intimação$/i,
    tipoProcesso: /^LibProv$/i,
    ato: "Relaxamento da prisão",
    confidence: "high",
    reason: "Liberdade Provisória — verificar se relaxamento ou revogação",
  },
  {
    tipoDocumento: /^Intimação$/i,
    tipoProcesso: /^AuPrFl$/i,
    ato: "Relaxamento da prisão",
    confidence: "high",
    reason: "Auto de Prisão em Flagrante",
  },

  // ── VVD / MPU ──
  {
    tipoDocumento: /^Intimação$/i,
    tipoProcesso: /^MPUMPCrim$/i,
    ato: "Modulação de MPU",
    confidence: "medium",
    reason: "MPU — verificar se é modulação, revogação ou resposta",
  },

  // ── Júri ──
  {
    tipoDocumento: /^Intimação$/i,
    tipoProcesso: /^Juri$/i,
    ato: "Diligências do 422",
    confidence: "medium",
    reason: "Júri — verificar fase processual",
  },
  {
    tipoDocumento: /^Ato Ordinatório$/i,
    tipoProcesso: /^Juri$/i,
    ato: "Ciência",
    confidence: "medium",
    reason: "Ato Ordinatório em processo do Júri",
  },

  // ── Execução Penal ──
  {
    tipoDocumento: /^Intimação$/i,
    tipoProcesso: /^EP$/i,
    ato: "Manifestação",
    confidence: "medium",
    reason: "Execução Penal — verificar tipo de manifestação",
  },

  // ── Ação Penal Ordinária (mais comum) ──
  {
    tipoDocumento: /^Intimação$/i,
    tipoProcesso: /^APOrd$/i,
    ato: "Resposta à Acusação",
    confidence: "high",
    reason: "Intimação em Ação Penal Ordinária",
  },
  {
    tipoDocumento: /^Intimação$/i,
    tipoProcesso: /^APSum$/i,
    ato: "Resposta à Acusação",
    confidence: "high",
    reason: "Intimação em Ação Penal Sumária",
  },
  {
    tipoDocumento: /^Intimação$/i,
    tipoProcesso: /^APri$/i,
    ato: "Resposta à Acusação",
    confidence: "high",
    reason: "Intimação em Ação Penal",
  },

  // ── Petição Criminal ──
  {
    tipoDocumento: /^Intimação$/i,
    tipoProcesso: /^PetCrim$/i,
    ato: "Petição intermediária",
    confidence: "medium",
    reason: "Petição Criminal — verificar natureza",
  },

  // ── Insanidade ──
  {
    tipoDocumento: /^Intimação$/i,
    tipoProcesso: /^InsanAc$/i,
    ato: "Incidente de insanidade",
    confidence: "high",
    reason: "Incidente de Insanidade Mental",
  },

  // ── Por tipo de documento (sem tipo de processo) ──
  {
    tipoDocumento: /^Sentença$/i,
    ato: "Ciência",
    confidence: "high",
    reason: "Ciência de sentença",
  },
  {
    tipoDocumento: /^Decisão$/i,
    ato: "Ciência de decisão",
    confidence: "high",
    reason: "Ciência de decisão interlocutória",
  },
  {
    tipoDocumento: /^Despacho$/i,
    ato: "Ciência",
    confidence: "high",
    reason: "Ciência de despacho",
  },
  {
    tipoDocumento: /^Certidão$/i,
    ato: "Ciência",
    confidence: "high",
    reason: "Ciência de certidão",
  },
  {
    tipoDocumento: /^Ato Ordinatório$/i,
    ato: "Ciência",
    confidence: "medium",
    reason: "Ato Ordinatório — verificar conteúdo",
  },
  {
    tipoDocumento: /^Termo$/i,
    ato: "Ciência",
    confidence: "medium",
    reason: "Ciência de termo",
  },
  {
    tipoDocumento: /^Edital$/i,
    ato: "Ciência",
    confidence: "medium",
    reason: "Ciência de edital",
  },

  // ── Intimação genérica (sem tipo de processo identificado) ──
  {
    tipoDocumento: /^Intimação$/i,
    ato: "Resposta à Acusação",
    confidence: "low",
    reason: "Intimação — tipo de processo não identificado",
  },
];

// ============================================================================
// FUNCAO PRINCIPAL
// ============================================================================

function matchField(
  value: string | undefined,
  pattern: string | RegExp | undefined
): boolean {
  if (!pattern) return true; // Regra não exige este campo
  if (!value) return false; // Campo não disponível
  if (typeof pattern === "string") {
    return value.toLowerCase() === pattern.toLowerCase();
  }
  return pattern.test(value);
}

/**
 * Sugere o ato mais provável baseado nos dados do parser PJe.
 * Retorna ato com nível de confiança e razão.
 * Valida contra atos disponíveis para a atribuição.
 */
export function suggestAto(
  tipoDocumento?: string,
  tipoProcesso?: string,
  atribuicao?: string
): AtoSuggestion {
  // Encontrar primeira regra que casa
  for (const rule of ATO_RULES) {
    if (
      matchField(tipoDocumento, rule.tipoDocumento) &&
      matchField(tipoProcesso, rule.tipoProcesso) &&
      matchField(atribuicao, rule.atribuicao)
    ) {
      // Validar que o ato sugerido existe na atribuição selecionada
      if (atribuicao) {
        const atosDisponiveis = getAtosPorAtribuicao(atribuicao);
        const atoExiste = atosDisponiveis.some(
          (a) => a.value.toLowerCase() === rule.ato.toLowerCase()
        );
        if (atoExiste) {
          return {
            ato: rule.ato,
            confidence: rule.confidence,
            reason: rule.reason,
          };
        }
        // Se o ato sugerido não existe na atribuição, tentar próxima regra
        continue;
      }
      return {
        ato: rule.ato,
        confidence: rule.confidence,
        reason: rule.reason,
      };
    }
  }

  // Fallback: Ciência
  return {
    ato: "Ciência",
    confidence: "low",
    reason: "Tipo não identificado — ajustar manualmente",
  };
}
