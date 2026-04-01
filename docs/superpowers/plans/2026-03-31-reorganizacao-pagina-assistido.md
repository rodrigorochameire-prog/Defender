# Reorganização Página Assistido — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplificar a página de assistido de 7+ botões para 2 (Analisar + Promptório), criar aba Análise rica, bridge Claude Code via Supabase Realtime, e renomear Inteligência → Investigação Defensiva.

**Architecture:** Nova tabela `casos` agrupa processos por AP referência. Tabela `claude_code_tasks` é a fila de trabalho. Daemon Node.js no Mac Mini escuta Supabase Realtime e executa `claude -p`. Frontend usa Realtime para progresso e resultado. UI segue Padrão Defender v2.

**Tech Stack:** Next.js, Drizzle ORM, tRPC, Supabase (Realtime + Postgres), Radix Accordion, Tailwind, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-03-31-reorganizacao-pagina-assistido-design.md`

---

## File Map

### New Files
- `src/lib/db/schema/casos.ts` — tabela casos + claude_code_tasks
- `src/lib/trpc/routers/analise.ts` — router tRPC para análise (criar task, buscar resultado)
- `src/app/(dashboard)/admin/assistidos/[id]/_components/analise-tab.tsx` — aba Análise completa
- `src/app/(dashboard)/admin/assistidos/[id]/_components/analise-blocks.tsx` — 5 blocos de análise (Caso, Pessoas, Provas, Estratégia, Preparação)
- `src/app/(dashboard)/admin/assistidos/[id]/_components/promptorio-modal.tsx` — modal Promptório
- `src/app/(dashboard)/admin/assistidos/[id]/_components/analise-button.tsx` — botão Analisar com estados
- `scripts/claude-code-daemon.mjs` — daemon Node.js para Mac Mini

### Modified Files
- `src/lib/db/schema/core.ts` — adicionar tipo_processo, is_referencia em processos
- `src/lib/db/schema/index.ts` — exportar novos schemas
- `src/lib/trpc/routers/index.ts` — registrar analiseRouter
- `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` — remover botões antigos, adicionar novos, nova aba

### Removed/Deprecated
- `src/components/shared/cowork-action-button.tsx` — não deletar, apenas parar de importar
- `src/app/api/cowork/analyze/route.ts` — manter como fallback, não deletar

---

## Task 1: Schema do banco — tabelas casos e claude_code_tasks

**Files:**
- Create: `src/lib/db/schema/casos.ts`
- Modify: `src/lib/db/schema/core.ts:160-186` (processos)
- Modify: `src/lib/db/schema/index.ts`

- [ ] **Step 1: Criar schema casos.ts**

Criar arquivo com as duas novas tabelas: `casos` e `claudeCodeTasks`.

- [ ] **Step 2: Adicionar campos em processos**

Em `core.ts`, adicionar `tipoProcesso` (varchar com default 'AP') e `isReferencia` (boolean default false) à tabela processos.

- [ ] **Step 3: Exportar em index.ts**

Adicionar export de `casos.ts` no barrel file.

- [ ] **Step 4: Gerar migração**

Run: `npm run db:generate`

- [ ] **Step 5: Aplicar migração**

Run: `npm run db:push`

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema/ drizzle/
git commit -m "feat: add casos and claude_code_tasks tables, add tipo_processo to processos"
```

---

## Task 2: Router tRPC de análise

**Files:**
- Create: `src/lib/trpc/routers/analise.ts`
- Modify: `src/lib/trpc/routers/index.ts:78` (registrar)

- [ ] **Step 1: Criar analise router**

Mutations:
- `criarTask` — insere claude_code_tasks, verifica duplicata (pending/processing para mesmo caso_id)
- `buscarTaskStatus` — retorna status + etapa + resultado de uma task
- `listarAnalises` — retorna análises de um assistido agrupadas por caso

Queries:
- `getAnalisesPorAssistido` — busca casos com analysis_data populado
- `getCasosDoAssistido` — lista casos com processos vinculados

- [ ] **Step 2: Registrar no index**

Importar e adicionar `analise: analiseRouter` no appRouter.

- [ ] **Step 3: Commit**

```bash
git add src/lib/trpc/routers/analise.ts src/lib/trpc/routers/index.ts
git commit -m "feat: add analise tRPC router with task creation and status queries"
```

---

## Task 3: Daemon Claude Code (Mac Mini)

**Files:**
- Create: `scripts/claude-code-daemon.mjs`

- [ ] **Step 1: Criar daemon**

Script Node.js (~100 linhas) que:
- Conecta no Supabase via `@supabase/supabase-js`
- Escuta INSERT em `claude_code_tasks` via Realtime
- Ao reconectar: catch-up de tasks pendentes
- Para cada task: lock otimista → busca Drive files via API → spawna `claude -p` → parseia resultado → salva no banco
- Health check do Claude CLI no startup
- Atualiza campo `etapa` periodicamente

- [ ] **Step 2: Criar package.json script**

Adicionar `"daemon": "node scripts/claude-code-daemon.mjs"` ao package.json.

- [ ] **Step 3: Commit**

```bash
git add scripts/claude-code-daemon.mjs package.json
git commit -m "feat: add Claude Code daemon for Supabase Realtime task processing"
```

---

## Task 4: Componente botão Analisar

**Files:**
- Create: `src/app/(dashboard)/admin/assistidos/[id]/_components/analise-button.tsx`

- [ ] **Step 1: Criar componente**

Botão emerald com 3 estados:
- `idle`: "Analisar" com ícone Sparkles
- `analyzing`: spinner + "Analisando..." + etapa (text-emerald-500)
- `completed`: toast + volta pra idle

Props: `assistidoId`, `processoId`, `casoId`, `onComplete`

Usa tRPC mutation `analise.criarTask` e subscription Realtime para status.

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/admin/assistidos/[id]/_components/analise-button.tsx
git commit -m "feat: add Analisar button with realtime progress states"
```

---

## Task 5: Modal Promptório

**Files:**
- Create: `src/app/(dashboard)/admin/assistidos/[id]/_components/promptorio-modal.tsx`

- [ ] **Step 1: Criar modal**

Componente com:
- Dialog do shadcn/ui
- Select com opções: Analisar Autos, Gerar Peça, Feedback Estagiário, Preparar Audiência, Análise Júri
- Textarea para instrução adicional
- Botão Copiar que monta prompt com contexto do caso e copia pro clipboard
- Toast de confirmação

Props: `assistidoNome`, `processoNumero`, `vara`, `atribuicao`, `open`, `onOpenChange`

Templates de prompt migrados de `cowork-action-button.tsx` (linhas 25-126).

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/admin/assistidos/[id]/_components/promptorio-modal.tsx
git commit -m "feat: add Promptório modal with prompt templates and clipboard copy"
```

---

## Task 6: Aba Análise — blocos de conteúdo

**Files:**
- Create: `src/app/(dashboard)/admin/assistidos/[id]/_components/analise-blocks.tsx`
- Create: `src/app/(dashboard)/admin/assistidos/[id]/_components/analise-tab.tsx`

- [ ] **Step 1: Criar analise-blocks.tsx**

5 componentes de bloco usando Accordion do Radix:
- `BlocoCaso` — resumo narrativo, versões, cronologia, fatos relacionados
- `BlocoPessoas` — perfil réu/vítima, depoentes com cards, informantes
- `BlocoProvas` — periciais, documentais, informativos, possibilidades probatórias
- `BlocoEstrategia` — tese principal (card emerald), subsidiárias, nulidades, qualificadoras, pontos fortes/fracos, matriz de guerra
- `BlocoPreparacao` — orientação, quesitos, atendimentos, pontos críticos

Cada bloco: ícone colorido, título, contagem, conteúdo colapsável.
Estilo: Padrão Defender v2 (bg-zinc-900, border-zinc-800, rounded-xl).

- [ ] **Step 2: Criar analise-tab.tsx**

Componente principal da aba que:
- Busca casos do assistido via `analise.getCasosDoAssistido`
- Mostra seletor de caso (pills horizontais) quando há mais de 1
- Renderiza os 5 blocos com dados do caso selecionado
- Empty state: "Nenhuma análise — Clique em Analisar"
- Loading state: skeletons nos blocos
- Metadados no footer: data da análise, skill usada, link pro Drive

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/assistidos/[id]/_components/analise-blocks.tsx
git add src/app/(dashboard)/admin/assistidos/[id]/_components/analise-tab.tsx
git commit -m "feat: add Análise tab with 5 strategic analysis blocks"
```

---

## Task 7: Refatorar página do assistido

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`

- [ ] **Step 1: Atualizar tipo Tab**

Linha 38: adicionar "analise" e renomear "inteligencia" → "investigacao".

- [ ] **Step 2: Remover seção Ações IA antiga**

Linhas 475-561: remover botões Cowork, Sonnet, CoworkActionGroup. Substituir por AnaliseButton + botão Promptório.

- [ ] **Step 3: Atualizar tabs array**

Linhas 345-366: adicionar tab "Análise" na posição 3, renomear "Inteligência" → "Investigação Defensiva".

- [ ] **Step 4: Adicionar renderização da aba Análise**

Após a seção de tabs content (~linha 1050), adicionar:
```
{tab === "analise" && <AnaliseTab assistidoId={...} />}
```

- [ ] **Step 5: Renomear conteúdo da aba inteligência**

Linha 1050: trocar `tab === "inteligencia"` por `tab === "investigacao"`.

- [ ] **Step 6: Remover imports não usados**

Remover imports de CoworkActionGroup, Brain (Sonnet icon), e mutations antigas (coworkAnalise, analiseProfunda).

- [ ] **Step 7: Adicionar imports novos**

Importar AnaliseButton, PromptorioModal, AnaliseTab.

- [ ] **Step 8: Commit**

```bash
git add src/app/(dashboard)/admin/assistidos/[id]/page.tsx
git commit -m "feat: refactor assistido page — 2 buttons, Análise tab, rename Investigação Defensiva"
```

---

## Task 8: Remover botões por processo (Sonnet/Exportar/Importar inline)

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`

- [ ] **Step 1: Remover botões Exportar/Importar/Sonnet dos cards de processo**

Nas linhas ~694-738, remover os botões inline de cada processo card. Manter apenas o card do processo com dados.

- [ ] **Step 2: Remover estados relacionados**

Remover states: `exportingProcessoId`, `importingProcessoId`, `sonnetProcessoId`, `exportarParaCowork`, `importarAnaliseCowork`, `analiseProfunda`.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/assistidos/[id]/page.tsx
git commit -m "refactor: remove inline Sonnet/Export/Import buttons from processo cards"
```

---

## Task 9: Build e verificação

- [ ] **Step 1: Verificar build**

Run: `npm run build`

- [ ] **Step 2: Corrigir erros se houver**

- [ ] **Step 3: Commit final se necessário**

```bash
git commit -m "fix: resolve build errors from page refactoring"
```
