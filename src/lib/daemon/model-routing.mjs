/**
 * Roteamento de modelo por skill — lógica pura, testável.
 *
 * O daemon roda `claude -p` SEM `--model` por padrão (segue o default da conta
 * Max, hoje Opus). Este mapa permite rotear, por skill, para um modelo mais
 * barato/rápido (haiku) ou mais capaz (opus), reduzindo latência em tarefas
 * simples sem sacrificar qualidade nas complexas.
 *
 * Princípios:
 *  - OPT-IN por skill. Skill ausente do mapa ⇒ `null` ⇒ daemon NÃO passa
 *    `--model` ⇒ comportamento atual (zero regressão).
 *  - Conservador: só mapeamos o que temos confiança. Cada entrada deve ser
 *    validada por uma task real antes de virar default de produção.
 *  - Sempre conta Max: `--model` aceita aliases curtos (haiku/sonnet/opus);
 *    NUNCA usa API key (o firewall de custo do daemon remove chaves pagas).
 *
 * Chave = nome do DIRETÓRIO da skill (após resolução de alias no daemon).
 */
export const MODEL_ROUTING = {
  // Classificação/extração de baixa complexidade → haiku (rápido, barato).
  "classify-document": "haiku",
  "numeracao-oficios": "haiku",

  // Peças e análises de alta complexidade → opus (melhor qualidade).
  juri: "opus",
  vvd: "opus",
  "criminal-comum": "opus",
  "execucao-penal": "opus",
};

/**
 * Resolve o modelo para uma skill. Retorna 'haiku' | 'sonnet' | 'opus' quando
 * mapeada, ou `null` quando não mapeada (daemon não passa `--model`).
 *
 * @param {string|null|undefined} skillDir nome do diretório da skill
 * @returns {'haiku'|'sonnet'|'opus'|null}
 */
export function resolveModel(skillDir) {
  if (!skillDir || typeof skillDir !== "string") return null;
  return MODEL_ROUTING[skillDir] ?? null;
}
