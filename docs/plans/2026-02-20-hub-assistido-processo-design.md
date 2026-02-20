# Hub Assistido & Processo — Design Document

> **Data:** 2026-02-20
> **Status:** Aprovado ✅
> **Scope:** Integração das páginas de detalhe de Assistido e Processo com dados reais de tRPC, Drive (SubpastaExplorer + TimelineDocumental), Demandas (multi-defensor), Audiências e Processos vinculados.

---

## Contexto

As páginas `/admin/assistidos/[id]` e `/admin/processos/[id]` existem com UI rica, mas usam **100% mock data** (objetos hardcoded). Os routers tRPC já têm procedures base (`getById`, `getProcessos`, `getDemandas`, `getAudiencias`), mas precisam ser enriquecidos para retornar todos os dados relacionados em uma só chamada.

O objetivo é tornar essas páginas hubs completos e bidirecionais — cada entidade mostra todas as outras que se relacionam com ela.

---

## Seção 1 — Arquitetura de Queries

### `assistidos.getById(id)` — Query Enriquecida

```typescript
{
  // Dados base
  id, nome, cpf, statusPrisional, dataNascimento, telefone,
  localPrisao, unidadePrisional, driveFolderId, casoId,

  // Processos vinculados (via assistidos_processos)
  processos: [{ id, numeroAutos, vara, assunto, fase, situacao, papel }],

  // Audiências (de todos os processos deste assistido)
  audiencias: [{ id, dataAudiencia, tipo, local, processoId, numeroAutos, status }],

  // Demandas (todos defensores, read-only)
  demandas: [{ id, ato, tipoAto, status, prazo, defensorId, defensorNome, processoId }],

  // Drive files (assistidoId = id)
  driveFiles: [{ id, name, mimeType, webViewLink, lastModifiedTime,
                 isFolder, parentFileId, driveFolderId }],

  // Caso vinculado (se houver)
  caso: { id, titulo, descricao } | null,
}
```

### `processos.getById(id)` — Query Enriquecida

```typescript
{
  id, numeroAutos, vara, comarca, assunto, classeProcessual,
  fase, situacao, isJuri, driveFolderId, casoId,

  // Assistidos (via assistidos_processos com papel)
  assistidos: [{ id, nome, cpf, papel, statusPrisional, isPrincipal }],

  // Audiências do processo
  audiencias: [{ id, dataAudiencia, tipo, local, status, resultado }],

  // Demandas (todos defensores)
  demandas: [{ id, ato, tipoAto, status, prazo, defensorId, defensorNome, assistidoId, assistidoNome }],

  // Drive files (processoId = id)
  driveFiles: [{ id, name, mimeType, webViewLink, lastModifiedTime,
                 isFolder, parentFileId, driveFolderId }],

  // Processos vinculados (mesmo casoId)
  processosVinculados: [{ id, numeroAutos, vara, assunto }],

  // Caso vinculado
  caso: { id, titulo } | null,
}
```

### Implementação: `Promise.all` paralelo

```typescript
const [base, processos, audiencias, demandas, driveFiles] = await Promise.all([
  db.select().from(assistidos).where(eq(assistidos.id, id)).limit(1),
  db.select(...).from(assistidos_processos).leftJoin(processos, ...).where(...),
  db.select(...).from(audiencias).where(eq(audiencias.assistidoId, id)),
  db.select(...).from(demandas).leftJoin(users, ...).where(eq(demandas.assistidoId, id)),
  db.select(...).from(driveFiles).where(eq(driveFiles.assistidoId, id)).limit(100),
]);
```

---

## Seção 2 — UI & Componentes

### Layout Hub (ambas as páginas)

```
┌─────────────────────────────────────────────────────┐
│  ← Voltar    👤 [Nome/Número]                        │
│              [badges de contexto]                    │
├─────────────────────────────────────────────────────┤
│ [Tab 1] [Tab 2] [Tab 3] [Tab 4] [Tab 5?]            │
└─────────────────────────────────────────────────────┘
        ↓ conteúdo da tab ativa
```

### Tabs — Assistido `/admin/assistidos/[id]`

| Tab | Conteúdo |
|-----|----------|
| Processos | Cards dos processos vinculados com `papel` em badge |
| Demandas | Tabela compacta read-only, badge `defensorNome` |
| Drive | SubpastaExplorer + TimelineDocumental |
| Audiências | Lista cronológica com badge passado/futuro |

### Tabs — Processo `/admin/processos/[id]`

| Tab | Conteúdo |
|-----|----------|
| Partes | Cards de assistidos com `papel` em badge colorido |
| Demandas | Tabela compacta read-only, badge `defensorNome` + `assistidoNome` |
| Drive | SubpastaExplorer + TimelineDocumental |
| Audiências | Lista cronológica |
| Vinculados | Processos do mesmo caso |

### `SubpastaExplorer`

```
📁 Pasta raiz
  📂 Subpasta A          ← clica para expandir
    📄 arquivo.pdf  🔗
  📄 arquivo solto  🔗
```

- Estado local `expandedFolders: Set<string>`
- Constrói árvore no cliente a partir de `driveFiles[]` (isFolder + parentFileId)
- Botão `🔗` abre `webViewLink` em nova aba
- Sem chamada extra de API

### `TimelineDocumental`

```
▸ Fevereiro 2026
  📄 Defesa Prévia.docx    Pasta: Processo 01   12/02 às 14h
  📄 RG.pdf                Pasta raiz            08/02 às 09h

▸ Janeiro 2026
  ...
```

- Agrupado por mês no cliente: `groupBy(files, f => format(f.lastModifiedTime, 'MMMM yyyy'))`
- `max-h-96 overflow-y-auto`
- Apenas arquivos (não pastas) — filtra `isFolder === false`

### `PartesCard` (Processo → Tab Partes)

- Badge `papel`: réu→rose-100, corréu→amber-100, vítima→blue-100, interveniente→zinc-100
- `statusPrisional === "preso"` → ícone `Lock` Lucide em rose-500
- Clique → `router.push(/admin/assistidos/${id})`

### `DemandasTabela` (Read-only)

- Estrutura visual da planilha existente (DemandaCompactView)
- Badge `defensorNome` em zinc-100/zinc-700
- Clique → abre DemandaModal existente (sem edição)
- Sem drag handle

---

## Seção 3 — Data Flow

```
Page (RSC) → tRPC query (protectedProcedure)
           → Promise.all([base, processos, audiencias, demandas, driveFiles])
           → return enrichedAssistido

Client Component → useQuery(trpc.assistidos.getById)
                 → tabs passam slice do objeto para cada sub-componente
                 → SubpastaExplorer(driveFiles)
                 → TimelineDocumental(driveFiles)
                 → DemandasTabela(demandas)
```

**Cache:** `staleTime: 60_000` — evita refetch em cada troca de tab.

---

## Seção 4 — Error Handling & Edge Cases

| Situação | Comportamento |
|----------|--------------|
| Assistido sem processos | Empty state: ícone + "Nenhum processo vinculado" |
| Assistido sem drive files | Empty state + link "Abrir Drive" |
| `lastModifiedTime` nulo | Arquivo ordenado no final da timeline |
| `papel` nulo em `assistidos_processos` | Badge "réu" como fallback |
| Processo sem partes além do principal | Mostra só o assistido principal |
| Processos vinculados: `casoId === null` | Tab "Vinculados" oculta/empty |
| `driveFiles` > 100 | Limitado a 100 registros (LIMIT no SQL) |

### Navegação Bidirecional

- Assistido → Processo: clique no card do processo → `/admin/processos/[id]`
- Processo → Assistido: clique no card da parte → `/admin/assistidos/[id]`
- Breadcrumb: botão `← Voltar` usa `router.back()`

### Segurança

- Queries usam `protectedProcedure` + filtro `workspaceId` (já padrão)
- Demandas de outros defensores: **somente leitura** — sem mutações expostas nas páginas hub
- Drive files: apenas `webViewLink` exposto

---

## Decisões de Design

| Decisão | Escolha | Razão |
|---------|---------|-------|
| Query strategy | `Promise.all` paralelo | Evita cartesian product de múltiplos JOINs |
| Drive tree | Construída no cliente | Dados já no banco, sem chamada extra à API |
| Demandas visibilidade | Todos os defensores | Contexto completo do caso (read-only) |
| Schema changes | Nenhuma | Todas as FKs já existem |
| Tabs lazy | Sim (sem prefetch) | Tab ativa carrega imediatamente |
