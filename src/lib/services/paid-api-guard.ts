/**
 * Guard de cobrança das APIs de IA pagas (por token).
 *
 * O OMBUDS deve usar EXCLUSIVAMENTE a conta Max via Claude Code (daemon
 * `claude -p`), que não bilheta por token. Qualquer chamada direta às APIs
 * pagas — Anthropic (ANTHROPIC_API_KEY), Google Gemini (GEMINI_API_KEY) ou
 * OpenAI (OPENAI_API_KEY) — custa dinheiro e está BLOQUEADA por padrão.
 *
 * Para reabilitar conscientemente um provedor (uso pontual e cobrado), setar a
 * flag correspondente: ALLOW_CLAUDE_API / ALLOW_GEMINI_API / ALLOW_OPENAI_API.
 * Sem isso, todo call-site pago lança erro claro em vez de cobrar — e a
 * funcionalidade deve ser acionada pelo daemon (claude_code_tasks).
 */

export type PaidProvider = "anthropic" | "gemini" | "openai";

const ALLOW_FLAG: Record<PaidProvider, string> = {
  anthropic: "ALLOW_CLAUDE_API",
  gemini: "ALLOW_GEMINI_API",
  openai: "ALLOW_OPENAI_API",
};

const PROVIDER_LABEL: Record<PaidProvider, string> = {
  anthropic: "Claude (Anthropic)",
  gemini: "Gemini (Google)",
  openai: "OpenAI",
};

/**
 * Lança se o provedor pago não estiver explicitamente liberado via env flag.
 * `feature` identifica o call-site na mensagem de erro (ex.: "gemini.client").
 */
export function assertPaidApiAllowed(provider: PaidProvider, feature: string): void {
  if (process.env[ALLOW_FLAG[provider]] === "true") return;
  throw new Error(
    `[paid-api-guard] Chamada paga à API ${PROVIDER_LABEL[provider]} bloqueada em "${feature}". ` +
      `O OMBUDS usa a conta Max via Claude Code (daemon claude -p), sem custo de API. ` +
      `Acione esta funcionalidade pelo daemon (claude_code_tasks) ou, para uso pontual e ` +
      `cobrado, defina ${ALLOW_FLAG[provider]}=true.`,
  );
}

export const assertClaudeApiAllowed = (feature: string): void =>
  assertPaidApiAllowed("anthropic", feature);

export const assertGeminiApiAllowed = (feature: string): void =>
  assertPaidApiAllowed("gemini", feature);

export const assertOpenAiApiAllowed = (feature: string): void =>
  assertPaidApiAllowed("openai", feature);
