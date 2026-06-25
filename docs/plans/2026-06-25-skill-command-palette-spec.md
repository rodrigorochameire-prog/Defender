# OMBUDS · ⌘K Skill Command Palette — Spec (TDD + Spec-Driven)

**Data:** 2026-06-25
**Método:** Spec-driven + TDD. Gate verde (`tsc` 0 · `CI=1 vitest` 0 falhas · `next lint` 0) por story.
**Origem (sem invenção):** plano `docs/superpowers/plans/2026-03-27-ombuds-skills-engine.md` (Command Palette → Skill Engine) + catálogo de skills do daemon já entregue (PR #270). **Correção ao plano:** o matching por Gemini Flash do plano original é **API paga (bloqueada pelo firewall)** — fica de fora; matching segue determinístico (command + regex, já existente) e o disparo das skills do daemon usa `claude -p` (login Max, custo zero).

## Estado atual

O ⌘K (`src/components/shared/command-palette.tsx`) **já expõe as skills in-app** (navegação/painel via `matchSkill`/`executeSkill`) e a busca de entidades. **Não expõe** o catálogo de skills do daemon (juri, vvd, criminal-comum, execucao-penal, dpe-ba-pecas, transcrições…), porque elas precisam de uma **entidade em foco**.

## Objetivo

Quando o usuário está numa rota de entidade (`/admin/processos/[id]` ou `/admin/assistidos/[id]`), o ⌘K mostra um grupo **"Ações de IA"** com as skills aplicáveis àquela entidade (reusando o catálogo + `buildLauncherItems`), disparáveis pelo daemon via `useSkillTask`. Fora dessas rotas, o grupo não aparece (zero regressão).

## Não-objetivos
- Não adicionar matching por IA paga. Não plumbing de "entidade global" — a entidade vem da URL.
- Não tocar no comportamento existente do palette (skills in-app, busca, recentes).

## Stories

### P1 — `entityFromPathname` (puro, TDD) `[ ]`
`src/lib/skills/palette-context.ts` + testes. `entityFromPathname(pathname)` → `{ entity: "processo" | "assistido"; id: number } | null`. Reconhece `/admin/processos/123` e `/admin/assistidos/45`; ignora `/novo`, sub-rotas não-numéricas, e outras páginas.
**AC:** processo/assistido com id numérico → objeto; `/admin/processos/novo` → null; `/admin/demandas` → null; trailing slash/query tolerados.

### P2 — `PaletteAiActions` (componente isolado) `[ ]`
`src/components/shared/palette-ai-actions.tsx` + teste RTL. Recebe `entity` (de P1). Para `processo`: query `processos.getById` → atribuição + assistido principal → `buildLauncherItems(entity="processo", …)`. Para `assistido`: `buildLauncherItems(entity="assistido", assistidoId=id, atribuicao="")` (skills `ANY`, sem query). Renderiza um `CommandGroup "Ações de IA"`; ao selecionar, dispara `useSkillTask().trigger`, fecha o palette e dá toast apontando o histórico. Sem itens → não renderiza nada.
**AC:** lista as skills do contexto; selecionar dispara com o payload correto; sem entidade/sem assistido → nada.

### P3 — Integração no ⌘K `[ ]`
`command-palette.tsx`: `const entity = entityFromPathname(usePathname())`; renderiza `<PaletteAiActions entity={entity} onDone={() => setOpen(false)} />` logo após o grupo de Skills. Mudança mínima, comportamento existente intacto.
**AC:** typecheck/lint/build limpos; em rota de processo o ⌘K mostra "Ações de IA"; fora dela, não.

## Verificação
`tsc` 0 · `CI=1 vitest` 0 falhas · `next lint` 0. Branch `feat/skill-command-palette`; commits atômicos; PR.

## Log
- 2026-06-25: spec criado (base: ⌘K já expõe skills in-app; falta o catálogo do daemon por entidade).
- 2026-06-25: **P1–P3 concluídas.** `entityFromPathname` (8 testes), `PaletteAiActions` (4 testes RTL), integração no ⌘K. Em rota de processo/assistido, o ⌘K mostra "Ações de IA" com as skills do contexto, disparáveis pelo daemon. Gate verde: `tsc` 0 · `CI=1 vitest` 265 arq/**2007** testes (0 falhas) · `next lint` 0.
