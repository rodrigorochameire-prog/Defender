# Status / Handoff — Programa Zero API Paga (noite 2026-06-11)

> Trabalho autônomo enquanto o dono dormia. **Regra de ouro respeitada: nada foi para produção.**
> Branch isolada `feat/migracao-daemon-fase1` (worktree em `../Defender-migracao`). `main` e o **daemon vivo intactos**.

## ✅ Feito esta noite (na branch, não deployado)

1. **Design completo do programa** — `2026-06-11-programa-zero-api-paga-overview.md` + specs das Fases 1–4. Embeddings (Fase 5) adiado por sua decisão.
2. **Daemon v2** — `scripts/lib/dispatcher.mjs` (cap de concorrência + fila com prioridade), **com 4 testes unitários passando** (`scripts/lib/dispatcher.test.mjs`). Integrado em `scripts/claude-code-daemon.mjs`: Realtime INSERT e catch-up agora empurram para a mesma fila (dedup), respeitando `DAEMON_MAX_CONCURRENT` (default 3). Prioridade ordenada in-memory → **não depende da coluna existir no banco** (seguro antes da migration). `node --check` OK.
3. **Schema** — colunas `priority` (smallint, default 100) e `source` (text) + índice em `claude_code_tasks` (`src/lib/db/schema/casos.ts`) + SQL idempotente em `scripts/sql/0051_claude_tasks_priority.sql`.

## ⚠️ NÃO feito (de propósito — precisa de você / verificação contra o app)

Estes tocam features de produção e/ou têm contratos JSON que não dá pra validar sem o app rodando e dados reais. Deixados como passo revisado:

4. **Helper `enqueueDaemonTask`** (+ `waitForTaskResult` para fluxos batch server-side).
5. **Skills novas** — `oficio-revisao`, `processo-resumo`, `pdf-classificacao`, `factual-resumo`. **Atenção estrutural:** `.claude/skills-cowork/` é **gitignored** — as skills NÃO são versionadas neste repo (vivem no Mini, sync por outro caminho). Logo skills novas vão no **dir principal do Mini**, não nesta branch. (Corrige suposição do spec da Fase 1.) Decidir: versionar skills-cowork? como sincronizam hoje entre Macs?
6. **Migração dos call-sites** (oficios.ts, processo.ts, noticias.ts, pdf-classifier.ts, factual/scraper.ts) → enfileirar via helper + UI `useSkillTask`.
7. **Guard sweep** — fechar `assertClaudeApiAllowed` em cada feature **junto** da sua migração (fechar antes quebra a feature). `melhorarTexto` e `document-sections.ts` hoje sem guard.
8. **dead code:** `analisarDadosEstruturados` (sem caller) — remover.

## Passos de manhã (ordem)

1. Revisar specs + esta branch.
2. Decidir sobre versionamento das skills-cowork (item 5).
3. `npm run db:generate` → migration canônica das colunas (ou aplicar `scripts/sql/0051...sql`).
4. **Swap do daemon v2** no Mini com backup do atual:
   - backup: `cp scripts/claude-code-daemon.mjs scripts/claude-code-daemon.bak.mjs`
   - trazer o código v2 para o dir principal (merge da branch ou cherry-pick) + `cp -r scripts/lib` ; `launchctl kickstart -k gui/$(id -u)/com.ombuds.daemon`
   - smoke test: inserir uma task de teste e ver `completed`.
5. Implementar itens 4–8 com validação por feature (preview), depois deploy de `main`.

## Como reverter o daemon (se algo der errado no swap)

`cp scripts/claude-code-daemon.bak.mjs scripts/claude-code-daemon.mjs && launchctl kickstart -k gui/$(id -u)/com.ombuds.daemon`
(O daemon atual já tem o re-subscribe; v2 só adiciona cap+prioridade.)

## Commits da branch

- `8627dec0` fix(daemon): re-subscribe automático (já estava)
- `5b7ac2d9` docs(specs): overview + Fases 1–4
- `b7bb4417` feat(daemon): v2 — cap + prioridade (dispatcher) + testes
- (este) schema priority/source + status
