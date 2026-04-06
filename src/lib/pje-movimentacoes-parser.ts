/**
 * PJe Movimentações Parser
 *
 * Parses PJe case movements to detect witness intimation status.
 * Pure logic module — no React or database dependencies.
 */

export interface MovimentacaoPJe {
  data: string;       // YYYY-MM-DD
  descricao: string;  // Full movement description
}

export interface IntimacaoTestemunha {
  testemunhaNome?: string;
  status: "INTIMADA" | "NAO_LOCALIZADA" | "CARTA_PRECATORIA";
  movimentacao: string;  // Original movement text
  data: string;          // Date of the movement
}

// ---------------------------------------------------------------------------
// Pattern sets
// ---------------------------------------------------------------------------

const PATTERNS_INTIMADA: RegExp[] = [
  /mandado\s+de\s+intima[çc][aã]o.*cumprido/i,
  /certid[aã]o\s+de\s+intima[çc][aã]o.*testemunha/i,
  /intima[çc][aã]o.*testemunha.*realizada/i,
  /testemunha.*devidamente\s+intimad[ao]/i,
  /intima[çc][aã]o\s+(?:da|do)\s+(?:testemunha|depoente).*(?:cumprida|realizada|efetivada)/i,
];

const PATTERNS_NAO_LOCALIZADA: RegExp[] = [
  /mandado.*devolvido/i,
  /n[aã]o\s+localizad[ao]/i,
  /intima[çc][aã]o.*n[aã]o.*cumprida/i,
  /testemunha.*n[aã]o.*encontrad[ao]/i,
];

const PATTERNS_CARTA_PRECATORIA: RegExp[] = [
  /carta\s+precat[oó]ria.*intima[çc][aã]o/i,
  /deprecada.*intima[çc][aã]o/i,
];

// ---------------------------------------------------------------------------
// Witness name extraction
// ---------------------------------------------------------------------------

const PATTERNS_NOME: RegExp[] = [
  /testemunha\s+([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)(?:\s*,|\s*\.|$)/i,
  /intima[çc][aã]o\s+(?:de|da|do)\s+([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)(?:\s*,|\s*\.|$)/i,
  /depoente\s+([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)(?:\s*,|\s*\.|$)/i,
];

// Common stopwords that should not be treated as names
const STOPWORDS = new Set(["DA", "DE", "DO", "DAS", "DOS", "E", "A", "O", "EM", "NA", "NO"]);

function extrairNomeTestemunha(texto: string): string | undefined {
  for (const pattern of PATTERNS_NOME) {
    const match = texto.match(pattern);
    if (match) {
      const candidate = match[1].trim().toUpperCase();
      if (candidate.length > 3 && !STOPWORDS.has(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// parseMovimentacoes
// ---------------------------------------------------------------------------

/**
 * Splits raw PJe text by newlines, extracts lines that start with a date
 * prefix in the format `dd/mm/yyyy`, and returns structured movimentações
 * with dates converted to YYYY-MM-DD.
 */
export function parseMovimentacoes(texto: string): MovimentacaoPJe[] {
  const lines = texto.split(/\r?\n/);
  const dateLineRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(.+)$/;
  const result: MovimentacaoPJe[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(dateLineRegex);
    if (match) {
      const [, day, month, year, descricao] = match;
      result.push({
        data: `${year}-${month}-${day}`,
        descricao: descricao.trim(),
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// detectarIntimacaoTestemunha
// ---------------------------------------------------------------------------

/**
 * For each movimentação, checks against known intimation patterns.
 * First match wins (INTIMADA > NAO_LOCALIZADA > CARTA_PRECATORIA).
 * Returns only movimentações that matched at least one pattern.
 */
export function detectarIntimacaoTestemunha(
  movimentacoes: MovimentacaoPJe[]
): IntimacaoTestemunha[] {
  const result: IntimacaoTestemunha[] = [];

  for (const mov of movimentacoes) {
    const texto = mov.descricao;

    if (PATTERNS_INTIMADA.some((p) => p.test(texto))) {
      result.push({
        testemunhaNome: extrairNomeTestemunha(texto),
        status: "INTIMADA",
        movimentacao: texto,
        data: mov.data,
      });
      continue;
    }

    if (PATTERNS_NAO_LOCALIZADA.some((p) => p.test(texto))) {
      result.push({
        testemunhaNome: extrairNomeTestemunha(texto),
        status: "NAO_LOCALIZADA",
        movimentacao: texto,
        data: mov.data,
      });
      continue;
    }

    if (PATTERNS_CARTA_PRECATORIA.some((p) => p.test(texto))) {
      result.push({
        testemunhaNome: extrairNomeTestemunha(texto),
        status: "CARTA_PRECATORIA",
        movimentacao: texto,
        data: mov.data,
      });
    }
  }

  return result;
}
