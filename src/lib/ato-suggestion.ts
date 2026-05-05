/**
 * Mapeamento regra-based: (tipoDocumento, tipoProcesso, atribuicao) → ato sugerido
 * Usado pelo PJe Import v2 para sugerir o ato antes da importacao
 */

import { getAtosPorAtribuicao } from "@/config/atos-por-atribuicao";

// ============================================================================
// TIPOS
// ============================================================================

export interface AudienciaDetection {
  tipo: "designacao" | "redesignacao";
  data?: string;       // ISO date (YYYY-MM-DD)
  hora?: string;       // HH:MM
  tipoAudiencia?: string;
}

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

// ============================================================================
// DETECCAO DE AUDIENCIA
// ============================================================================

const REDESIGNACAO_PATTERNS = [
  /redesigna[çc][aã]o\s+(?:de\s+|da\s+)?audi[eê]ncia/i,
  /audi[eê]ncia\s+redesignada/i,
  /transferida\s+.*audi[eê]ncia/i,
  /adiada\s+.*audi[eê]ncia.*nova\s+data/i,
  /redesignou.*audi[eê]ncia/i,
];

const DESIGNACAO_PATTERNS = [
  /designa[çc][aã]o\s+(?:de\s+|da\s+)?audi[eê]ncia/i,
  /audi[eê]ncia\s+designada\s+para/i,
  /fica\s+designad[ao].*dia/i,
  /pauta.*audi[eê]ncia/i,
  /designou.*audi[eê]ncia/i,
  // Forma verbal 1ª pessoa — comum em atos ordinários ("designo audiência
  // oitiva especializada para o dia X"). Sem este padrão, o ato não dispara
  // o modal de confirmação de audiência.
  /designo\s+(?:a\s+)?audi[eê]ncia/i,
  // Estrutura PJe automatizada: "AUDIÊNCIA <TIPO> DESIGNADA CONDUZIDA POR DD/MM/YYYY HH:MM"
  /audi[eê]ncia\s+\S+\s+designada\s+conduzida/i,
];

const MESES: Record<string, string> = {
  janeiro: "01",
  fevereiro: "02",
  março: "03",
  marco: "03",
  abril: "04",
  maio: "05",
  junho: "06",
  julho: "07",
  agosto: "08",
  setembro: "09",
  outubro: "10",
  novembro: "11",
  dezembro: "12",
};

function extractDate(text: string): string | undefined {
  // dd/mm/yyyy
  const numericMatch = text.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (numericMatch) {
    const [, dd, mm, yyyy] = numericMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  // dd de mês de yyyy
  const extensoMatch = text.match(
    /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})\b/i
  );
  if (extensoMatch) {
    const [, dd, mes, yyyy] = extensoMatch;
    const mm = MESES[mes.toLowerCase().replace("ç", "c").replace("ã", "a")];
    if (mm) {
      return `${yyyy}-${mm}-${dd.padStart(2, "0")}`;
    }
  }

  return undefined;
}

function extractTime(text: string): string | undefined {
  // HH:MM
  const colonMatch = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (colonMatch) {
    const [, hh, mm] = colonMatch;
    return `${hh.padStart(2, "0")}:${mm}`;
  }

  // HHhMM
  const hMatch = text.match(/\b(\d{1,2})h(\d{2})\b/i);
  if (hMatch) {
    const [, hh, mm] = hMatch;
    return `${hh.padStart(2, "0")}:${mm}`;
  }

  // HH horas
  const horasMatch = text.match(/\b(\d{1,2})\s+horas\b/i);
  if (horasMatch) {
    const [, hh] = horasMatch;
    return `${hh.padStart(2, "0")}:00`;
  }

  return undefined;
}

function extractTipoAudiencia(text: string): string | undefined {
  const lower = text.toLowerCase();
  // Ordem importa: padrões mais específicos primeiro. Mesma cobertura do
  // parser canônico em audiencia-parser.ts (TIPOS_CONHECIDOS). Mantenha
  // sincronizados — divergência aqui significa modal abrindo sem o tipo.
  if (/instru[çc][aã]o\s+e\s+julgamento/.test(lower)) return "Instrução e Julgamento";
  if (/oitiva\s+especial(?:izad[ao])?|depoimento\s+sem\s+dano/.test(lower)) return "Oitiva Especial";
  if (/antecipa[çc][aã]o\s+de\s+prova|produ[çc][aã]o\s+antecipada/.test(lower)) return "Antecipação de Prova";
  if (/plen[aá]rio\s+(?:do\s+)?j[uú]ri|sess[aã]o\s+(?:de\s+)?j[uú]ri/.test(lower)) return "Plenário do Júri";
  if (/preliminar\s+\(?maria\s+da\s+penha|art\.?\s*16\s+(?:da\s+)?lei\s+maria/.test(lower)) return "Preliminar (Maria da Penha)";
  if (/instru[çc][aã]o/.test(lower)) return "Instrução";
  if (/julgamento/.test(lower)) return "Julgamento";
  if (/concilia[çc][aã]o/.test(lower)) return "Conciliação";
  if (/justifica[çc][aã]o/.test(lower)) return "Justificação";
  if (/cust[oó]dia/.test(lower)) return "Custódia";
  if (/admoesta[çc][aã]o|admonit[oó]ria/.test(lower)) return "Admoestação";
  return undefined;
}

export function detectAudiencia(texto: string): AudienciaDetection | null {
  // Check redesignação first (more specific)
  for (const pattern of REDESIGNACAO_PATTERNS) {
    if (pattern.test(texto)) {
      return {
        tipo: "redesignacao",
        data: extractDate(texto),
        hora: extractTime(texto),
        tipoAudiencia: extractTipoAudiencia(texto),
      };
    }
  }

  // Check designação
  for (const pattern of DESIGNACAO_PATTERNS) {
    if (pattern.test(texto)) {
      return {
        tipo: "designacao",
        data: extractDate(texto),
        hora: extractTime(texto),
        tipoAudiencia: extractTipoAudiencia(texto),
      };
    }
  }

  return null;
}

export function suggestAtoWithText(
  tipoDocumento?: string,
  tipoProcesso?: string,
  atribuicao?: string,
  textoIntimacao?: string
): AtoSuggestion & { audienciaDetection?: AudienciaDetection } {
  if (textoIntimacao) {
    const detection = detectAudiencia(textoIntimacao);
    if (detection) {
      const isRedesignacao = detection.tipo === "redesignacao";
      const ato = isRedesignacao
        ? "Ciência redesignação de audiência"
        : "Ciência designação de audiência";
      const hasDataHora = Boolean(detection.data && detection.hora);
      const confidence: "high" | "medium" = hasDataHora ? "high" : "medium";
      const tipoLabel = isRedesignacao ? "redesignação" : "designação";
      const dataStr = detection.data ? ` para ${detection.data}` : "";
      const horaStr = detection.hora ? ` às ${detection.hora}` : "";
      const reason = `Detectada ${tipoLabel} de audiência${dataStr}${horaStr} no texto da intimação`;

      return {
        ato,
        confidence,
        reason,
        audienciaDetection: detection,
      };
    }
  }

  return suggestAto(tipoDocumento, tipoProcesso, atribuicao);
}
