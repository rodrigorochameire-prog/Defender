# API Cost Firewall + M4 Max Bootstrap

> **Data:** 2026-06-25
> **Motivação:** cobrança real (~R$50) de API Anthropic, violando a regra "nunca
> usar API paga — só a conta Max via daemon `claude -p`". Diagnóstico revelou
> DUAS brechas + o host do daemon (Mac mini M4) não-funcional.

## Causa-raiz da cobrança

`scripts/claude-code-daemon.mjs` rodava `claude -p` **herdando todo o
`process.env`**, incluindo `ANTHROPIC_API_KEY`. O `claude` dá **precedência à
chave de API sobre o login Max** (confirmado pelo stderr:
*"claude.ai connectors are disabled because ANTHROPIC_API_KEY … takes precedence
over your claude.ai login"*). Resultado: o daemon — que deveria ser grátis —
bilhetava a API. Quando a chave esgotou/rotacionou (~17/06), todo `claude -p`
passou a falhar com `exit 1`. **Mesma causa explica a cobrança E a queda.**

Validação empírica: `claude -p` com a chave REMOVIDA do ambiente responde via
login Max, **sem custo** (`scripts/m4-bootstrap.mjs` confirma "login Max OK").

## Escopo

Três frentes:

### Fase 1 — Firewall no daemon (a correção da cobrança)
`scripts/claude-code-daemon.mjs`:
- Remove `ANTHROPIC_API_KEY` (+ `ANTHROPIC_AUTH_TOKEN`, chaves Gemini/OpenAI) do
  `env` de **todo** spawn de `claude` → força login Max, por construção.
- Fail-closed: avisa se houver chave paga no ambiente; com
  `DAEMON_STRICT_NO_API=true`, recusa iniciar.
- Diagnóstico: em falha, anexa a cauda do `stdout` ao `erro` (fim do "exit 1" cego).

### Fase 2 — Guard unificado de APIs pagas (a restrição pedida)
- Novo `src/lib/services/paid-api-guard.ts`: `assertPaidApiAllowed(provider, feature)`
  para `anthropic | gemini | openai`, bloqueando por padrão. Liberação consciente
  por flag: `ALLOW_CLAUDE_API` / `ALLOW_GEMINI_API` / `ALLOW_OPENAI_API`.
- `claude-api-guard.ts` re-exporta (back-compat — call-sites Anthropic intactos).
- Guards inseridos em TODOS os choke points pagos não cobertos:
  - Gemini: `gemini.ts`, `pdf-extraction.ts`, `pdf-ficha-generator.ts`,
    `noticias/enricher.ts`, `pdf-classifier.ts` (fallback), `jurisprudencia-ai.ts`
    (refatorado de client eager → lazy), rotas `summarize-transcript`, `plaud-api.ts`.
  - OpenAI: rota `strategy-advisor`.

### Fase 3 — Bootstrap do host do daemon (M4 funcional)
- `scripts/m4-bootstrap.mjs`: doctor idempotente. Detecta a máquina e se é host
  (marcador `~/.ombuds-daemon-host` ou `OMBUDS_ROLE=daemon`); checa `claude` CLI,
  chaves pagas no ambiente, **testa o login Max** (`claude -p` com chaves
  removidas), daemon em execução, serviço `launchd`. Com `--fix`: marca o host,
  instala/carrega `launchd` (`com.ombuds.daemon`, `DAEMON_STRICT_NO_API=true`).
- Hook `SessionStart` em `.claude/settings.json` roda `--session`: **no-op fora do
  host** (M1 silencioso), e no M4 identifica + aplica fixes seguros a cada abertura.
- Skill `/m4-setup` (`.claude/commands/m4-setup.md`) documenta o fluxo.

## Não-objetivos
- Não migrar embeddings/transcrição para outro provedor — só **bloquear** o uso
  pago (libera sob flag se necessário, pontualmente).
- Não automatizar o `claude /login` (interativo) — o bootstrap detecta e instrui.

## Verificação
- `paid-api-guard.test.ts`: 7 testes (bloqueio padrão, liberação por flag por
  provedor, back-compat).
- `m4-bootstrap.mjs`: validado no M1 (não-host) — detecta chave, confirma login
  Max funcional sem API, sinaliza daemon/launchd ausentes.
- Lint + typecheck no CI.

## Operação (no M4, uma vez)
```bash
node scripts/m4-bootstrap.mjs --fix     # marca host + instala launchd
# se o teste de login Max falhar:
claude                                   # /login na conta Max
```
Depois disso, o hook mantém o host saudável a cada sessão. Remover
`ANTHROPIC_API_KEY`/`GEMINI_API_KEY`/`OPENAI_API_KEY` do `.env`/shell do M4
elimina o risco na raiz (o firewall já protege em runtime).
