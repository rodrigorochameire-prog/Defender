/**
 * Guard de cobrança da API Claude (Anthropic SDK = PAGO por token).
 *
 * O OMBUDS deve usar EXCLUSIVAMENTE a conta Max via Claude Code (daemon
 * `claude -p`), que não bilheta por token. Qualquer chamada direta ao SDK
 * Anthropic (ANTHROPIC_API_KEY) custa dinheiro e está bloqueada por padrão.
 *
 * Para reabilitar conscientemente (uso pontual), setar ALLOW_CLAUDE_API=true.
 * Sem isso, todo call-site pago lança erro claro em vez de cobrar — e a
 * funcionalidade deve ser acionada pelo daemon (claude_code_tasks).
 */
export function assertClaudeApiAllowed(feature: string): void {
  if (process.env.ALLOW_CLAUDE_API === "true") return;
  throw new Error(
    `[claude-api-guard] Chamada à API Claude paga bloqueada em "${feature}". ` +
      `O OMBUDS usa a conta Max via Claude Code (daemon claude -p), sem custo de API. ` +
      `Acione esta função pelo daemon (claude_code_tasks) ou, para uso pontual e cobrado, ` +
      `defina ALLOW_CLAUDE_API=true.`,
  );
}
