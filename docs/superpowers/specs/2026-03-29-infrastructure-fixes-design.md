# Sprint 1 — Infrastructure Fixes

**Data:** 2026-03-29
**Escopo:** 9 correções críticas/altas identificadas na auditoria de Assistido & Processo

---

## 1. Consolidar queries N+1 no assistidos.list()

**Arquivo:** `src/lib/trpc/routers/assistidos.ts` (linhas 146-299)

**Problema:** 6 queries sequenciais após fetch inicial — processos count, demandas count, drive files count, audiências, processos details. Para 100 assistidos = 600+ queries.

**Solução:** Consolidar em 2 queries usando subqueries no SELECT principal:
- Query 1: Assistidos + counts agregados via subquery correlacionada (processos, demandas, driveFiles, audiências)
- Query 2: Próxima audiência por assistido (window function ou lateral join)

**Critério de aceite:**
- [ ] Lista de assistidos carrega com no máximo 3 queries ao banco
- [ ] Dados retornados idênticos ao formato atual (sem breaking change no frontend)
- [ ] Tempo de resposta < 500ms para 200 assistidos

---

## 2. Mover API key DataJud para env var

**Arquivo:** `src/lib/trpc/routers/processos.ts` — enrichFromDatajud mutation

**Problema:** Authorization header hardcoded no código.

**Solução:**
- Criar env var `DATAJUD_API_KEY`
- Ler via `process.env.DATAJUD_API_KEY`
- Retornar erro claro se não configurada
- Adicionar ao `.env.example`

**Critério de aceite:**
- [ ] API key removida do código fonte
- [ ] Funciona com env var configurada
- [ ] Erro descritivo se env var ausente
- [ ] `.env.example` atualizado

---

## 3. Await Drive folder creation + notificar falha

**Arquivo:** `src/lib/trpc/routers/assistidos.ts` (linhas 11-57)

**Problema:** `ensureDriveFolderForAssistido()` chamada sem await — se falha, usuário não sabe.

**Solução:**
- Await a criação do folder no create mutation
- Se falhar, retornar `{ ...assistido, driveFolderError: true }` (não bloquear criação)
- No frontend, mostrar toast warning "Pasta do Drive não foi criada — tente novamente"
- Adicionar botão "Recriar pasta" na ficha-sheet

**Critério de aceite:**
- [ ] Criação de assistido continua funcionando mesmo se Drive falhar
- [ ] Toast de warning aparece quando Drive falha
- [ ] Campo `driveFolderError` retornado pelo mutation

---

## 4. Página Novo Processo funcional

**Arquivo:** `src/app/(dashboard)/admin/processos/novo/page.tsx`

**Problema:** Mock data, handleSubmit simula delay mas não chama tRPC.

**Solução:**
- Substituir mockAssistidos por `trpc.assistidos.list.useQuery()`
- Chamar `trpc.processos.create.useMutation()` no submit
- Redirecionar para `/admin/processos/[id]` após sucesso
- Manter todos os campos do form existente

**Critério de aceite:**
- [ ] Processo criado no banco ao submeter form
- [ ] Assistidos carregados do banco (não mock)
- [ ] Redirect para página do processo após criação
- [ ] Toast de sucesso/erro
- [ ] Validação zod no input

---

## 5. Trocar refetch() por invalidate() no IntelligenceTab

**Arquivo:** `src/components/intelligence/IntelligenceTab.tsx` (linhas 99-145)

**Problema:** `analysisQuery.refetch()` e `pendingQuery.refetch()` manuais — ineficiente, race conditions.

**Solução:**
- Importar `trpc.useUtils()`
- Substituir `refetch()` por `utils.intelligence.getForAssistido.invalidate({ assistidoId })`
- Aplicar mesmo padrão em todos os `onSuccess` callbacks do componente

**Critério de aceite:**
- [ ] Zero chamadas a `.refetch()` no componente
- [ ] Cache invalidado corretamente após mutations
- [ ] Dados atualizam na UI após gerar análise

---

## 6. Paralelizar queries do intelligence.getPendingEnrichments

**Arquivo:** `src/lib/trpc/routers/intelligence.ts` (linhas 225-298)

**Problema:** 8 count queries sequenciais para processoId path.

**Solução:**
- Agrupar em `Promise.all([...])` como já feito no assistidoId path
- Combinar counts que consultam a mesma tabela em uma única query com CASE/WHEN

**Critério de aceite:**
- [ ] Queries executam em paralelo
- [ ] Tempo de resposta reduzido em ~60%
- [ ] Dados retornados idênticos

---

## 7. Normalizar atribuição de CSV para array

**Arquivo:** `src/lib/trpc/routers/assistidos.ts` + frontend consumers

**Problema:** Atribuições armazenadas como string CSV, parsing repetido no frontend.

**Solução:**
- No router list(), transformar CSV em `string[]` antes de retornar
- Adicionar campo `atribuicoes: string[]` ao tipo de retorno
- No frontend, remover todos os `.split(',').filter(Boolean)` manuais
- Manter retrocompatibilidade: se o campo já é array, não splittar

**Critério de aceite:**
- [ ] Router retorna `atribuicoes` como array
- [ ] Frontend não faz mais parsing de CSV
- [ ] Cards e filtros continuam funcionando
- [ ] Zero `(a as any).atribuicoes` no código

---

## 8. Filtro de defensor no getById() do Processo

**Arquivo:** `src/lib/trpc/routers/processos.ts` — getById procedure

**Problema:** getById() não aplica filtro de visibilidade — qualquer usuário autenticado vê qualquer processo.

**Solução:**
- Aplicar mesma lógica de `baseConditions` do list() ao getById()
- Admin continua vendo tudo
- Defensor só vê processos que é responsável ou de parceiros
- Retornar 404 se processo não acessível (não 403 — evita information leak)

**Critério de aceite:**
- [ ] Defensor não-admin só acessa processos permitidos
- [ ] Admin continua acessando todos
- [ ] Retorna "Processo não encontrado" se sem permissão
- [ ] Sem breaking change para admins

---

## 9. Fix race condition no enrichment

**Arquivo:** `src/lib/trpc/routers/enrichment.ts`

**Problema:** Entre marcar status "processing" e salvar resultado, outra request pode passar.

**Solução:**
- Usar UPDATE atômico: `UPDATE ... SET status = 'processing' WHERE status != 'processing' RETURNING *`
- Se RETURNING vazio, significa que outra request já pegou — retornar `{ alreadyProcessing: true }`
- No frontend, mostrar "Documento já está sendo processado"

**Critério de aceite:**
- [ ] Impossível processar mesmo documento 2x simultaneamente
- [ ] Resposta clara quando documento já em processamento
- [ ] Sem deadlocks ou timeouts

---

## Estratégia de Implementação

Todos os 9 itens são **independentes** — podem ser implementados em paralelo por subagentes.

**Agrupamento por subagente:**

| Subagente | Itens | Arquivos |
|-----------|-------|----------|
| A — Assistidos Router | #1, #3, #7 | assistidos.ts |
| B — Processos Router | #2, #4, #8 | processos.ts, novo/page.tsx |
| C — Intelligence & Enrichment | #5, #6, #9 | IntelligenceTab.tsx, intelligence.ts, enrichment.ts |

**Ordem:** Todos em paralelo via worktree isolation.
