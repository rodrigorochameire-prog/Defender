# OMBUDS · Skill Launcher na Interface — Spec (TDD + Spec-Driven)

**Data:** 2026-06-25
**Autor:** Defensor Rodrigo + Claude (sessão autônoma)
**Método:** Spec-driven + TDD. Gate verde obrigatório (`tsc --noEmit` 0 erros · `vitest run` 0 falhas · `next lint` limpo) a cada story.
**Origem (sem invenção — Art. IV):** consolida o que já existe no código + os planos `docs/superpowers/plans/2026-03-27-ombuds-skills-engine.md`, `2026-03-31-skills-defensoria-refactor.md`, `docs/specs/leitura-para-peca.md` e a frente **P** do `2026-06-22-aprimoramentos-ombuds-spec-master.md`.

---

## Problema

As skills jurídicas que o Defensor usa no dia a dia (`juri`, `vvd`, `criminal-comum`, `execucao-penal`, `analise-audiencias`, `preparar-audiencias`, `revisar-minutas`, `pergunte-ao-auto` etc.) **já são executáveis pelo daemon** (`claude_code_tasks` → `scripts/claude-code-daemon.mjs` → `claude -p` no login Max, **custo zero**), mas **não estão expostas na interface** de forma navegável. Hoje só existe:

- `AnaliseButton` em `/admin/assistidos/[id]` → hardcoded para `analise-assistido`.
- `CoworkActionButton` → 5 ações hardcoded, com fallback de clipboard, **sem progresso realtime**.

Não há um lugar único onde o Defensor veja, **filtradas pelo contexto** (atribuição do processo + tipo de entidade), as skills aplicáveis e as dispare com **progresso ao vivo**, reaproveitando o hook `useSkillTask` que já existe.

## Objetivo

Um **catálogo tipado** de skills jurídicas + um componente **SkillLauncher** que, dado um contexto (`processo`/`assistido`/`caso` + atribuição), lista as skills aplicáveis e as dispara via `analise.criarTask`, exibindo progresso por `useSkillTask`. **Zero API paga** — toda execução passa pelo daemon (login Max).

## Não-objetivos

- Não reimplementar o command palette (⌘K) do plano 2026-03-27 — fica para depois.
- Não migrar references de skills (`skills-defensoria-refactor`) — independente.
- Não tocar no firewall nem no contrato do daemon (`claude_code_tasks`, `claude -p`).
- Não criar novas tabelas. Reusa `claude_code_tasks` e o hook `useSkillTask`.

---

## Arquitetura (reuso do que existe)

```
SkillLauncher (novo)  ──► useSkillTask (existe) ──► analise.criarTask (existe)
   │                                                      │
   └─ catalog.ts (novo, puro)                             ▼
        skillsForContext({entity, atribuicao})      claude_code_tasks (existe)
                                                          │
                                                   claude-code-daemon.mjs (existe)
                                                          │
                                                     claude -p  (login Max, $0)
```

O **catálogo é a fonte única de verdade** da UI e fica amarrado à realidade do daemon: cada `slug` do catálogo DEVE resolver a um diretório de skill real (chave em `.claude/skills-cowork/SKILL_ALIASES.json` **ou** nome de diretório em `.claude/skills-cowork/`). Um teste garante isso (impede "skill na UI sem handler").

### Atribuições (enum real — `src/lib/db/schema/enums.ts`)

`JURI_CAMACARI`, `VVD_CAMACARI`, `EXECUCAO_PENAL`, `SUBSTITUICAO`, `SUBSTITUICAO_CIVEL`, `GRUPO_JURI`, `MUTIRAO_PROTEGE`, `CRIMINAL_*` (Camaçari, Simões Filho, Lauro de Freitas, Candeias, Itaparica, 2º Grau Salvador).

O catálogo agrupa estas em **famílias** para filtragem: `JURI` (JURI_CAMACARI, GRUPO_JURI, CRIMINAL_CANDEIAS, CRIMINAL_ITAPARICA), `VVD` (VVD_CAMACARI), `EXECUCAO_PENAL` (EXECUCAO_PENAL, CRIMINAL_ITAPARICA), `CRIMINAL` (SUBSTITUICAO, CRIMINAL_*), e `ANY` (sempre).

---

## Stories (TDD, incrementais, gate verde por story)

### Story 1 — Catálogo de skills (puro, 100% testável) `[ ]`
`src/lib/skills/catalog.ts` + `src/lib/skills/__tests__/catalog.test.ts`.
- Tipos: `CatalogSkill { slug, label, description, icon, appliesTo: SkillEntity[], familias: SkillFamilia[], category, order }`.
- Função pura `skillsForContext({ entity, atribuicao })` → lista filtrada e ordenada (por `category`, depois `order`).
- `familiaDeAtribuicao(atribuicao)` → mapeia enum real → famílias.
**AC:**
1. `skillsForContext({entity:'processo', atribuicao:'JURI_CAMACARI'})` inclui `juri`, exclui `vvd`.
2. `atribuicao:'VVD_CAMACARI'` inclui `vvd`, exclui `juri`.
3. Skills `ANY` (ex.: `pergunte-ao-auto`, `revisar-minutas`) aparecem em qualquer atribuição.
4. Filtra por entidade: skill só-de-processo não aparece p/ `entity:'assistido'`.
5. Ordem estável e determinística.

### Story 2 — Amarração catálogo↔daemon (teste de integridade) `[ ]`
`src/lib/skills/__tests__/catalog-resolves.test.ts`.
**AC:** para todo `slug` do catálogo, o slug é chave em `SKILL_ALIASES.json` OU diretório existente em `.claude/skills-cowork/`. Falha lista os slugs órfãos. (Lê os arquivos reais via `fs`.)

### Story 3 — View-model do launcher (puro) `[ ]`
`src/lib/skills/launcher-view.ts` + teste. Dado `{entity, atribuicao, assistidoId, processoId, casoId}`, produz a lista de `LauncherItem { slug, label, description, icon, triggerInput }` pronta para o componente — `triggerInput` é exatamente o payload de `useSkillTask().trigger`. Mantém o componente burro e testa a lógica de montagem do payload.
**AC:** `triggerInput` carrega `skill=slug` e os ids do contexto; item de processo sem `assistidoId` é omitido (criarTask exige assistido).

### Story 4 — Componente `SkillLauncher` `[ ]`
`src/components/shared/skill-launcher.tsx` + teste RTL (`// @vitest-environment happy-dom`).
- Consome `launcher-view` + `useSkillTask`. Renderiza grupos por categoria, botão por skill, estados idle/processing/completed/failed (Padrão Defender: zinc + emerald hover, ícones Lucide, `cursor-pointer`).
**AC:** renderiza as skills do contexto; clicar dispara `trigger` com o `triggerInput` correto (mock do hook); mostra etapa quando `processing`.

### Story 5 — Superfície na página de processo `[ ]`
Monta `<SkillLauncher>` no cockpit/sheet do processo (`ProcessoSheet` / processo header), passando entity='processo' + atribuição + ids. Mudança mínima, sem regressão.
**AC:** typecheck/lint/build limpos; launcher aparece e dispara task real (verificável em `/admin/daemon`).

---

## Verificação global
- `tsc --noEmit` 0 · `vitest run` 0 falhas · `next lint` limpo após cada story.
- Branch `feat/skills-launcher-ui`; commits atômicos por story; PR para revisão (não merge direto em `main`).

## Log de progresso
- 2026-06-25: spec criado; baseline medido (tsc 0 erros, suíte verde sob `CI=1`: 257 arq/1943 testes); catálogo iniciado.
- 2026-06-25: **Stories 1–5 concluídas.** Catálogo + view-model + componente `SkillLauncher` + superfície no `ProcessoSheet` (via prop `iaLauncher`, body mantido puro). `familiaDeAtribuicao` degrada com segurança para atribuição desconhecida/nula. Gate verde: `tsc` 0 · `CI=1 vitest` 261 arq/**1971** testes (0 falhas; +28 meus) · `next lint` 0 erros. Commits: `feat(skills) F1-3` + `feat(skills) F4-5`.
- Próximos (fora desta sessão): command palette ⌘K (plano 2026-03-27), histórico de tasks por entidade, superfície no sheet de assistido, migração de references (`skills-defensoria-refactor`).
