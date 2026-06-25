/**
 * Guard de cobrança da API Claude (Anthropic SDK = PAGO por token).
 *
 * Mantido por compatibilidade: re-exporta `assertClaudeApiAllowed` do guard
 * unificado `paid-api-guard.ts` (que cobre Anthropic, Gemini e OpenAI).
 *
 * O OMBUDS deve usar EXCLUSIVAMENTE a conta Max via Claude Code (daemon
 * `claude -p`), que não bilheta por token. Para reabilitar a API Claude
 * conscientemente (uso pontual e cobrado), setar ALLOW_CLAUDE_API=true.
 */
export { assertClaudeApiAllowed } from "./paid-api-guard";
