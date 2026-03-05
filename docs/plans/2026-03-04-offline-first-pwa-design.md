# Offline-First PWA — Design Document

**Data**: 2026-03-04
**Status**: Aprovado
**Objetivo**: Tornar o OMBUDS um app com sensacao de software nativo — carregamento instantaneo, funcional sem internet, sync inteligente.

---

## Escopo

- **Cache inteligente** de todos os assets e dados visitados
- **CRUD offline** para assistidos, atendimentos, demandas, processos, casos
- **Sync automatico** ao voltar online com deteccao de conflitos
- **Fila de revisao** para merge manual quando o mesmo registro for editado em dois dispositivos
- **Performance**: optimistic UI, prefetching, bundle optimization

**Fora do escopo**: Drive files, enrichment data, transcricoes (sempre online).

---

## Arquitetura

```
┌─────────────────────────────────────┐
│           UI (React)                │
│  - Optimistic updates              │
│  - Online/offline indicator         │
│  - Sync queue badge                 │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        Data Layer (tRPC hooks)      │
│  - React Query (cache in-memory)    │
│  - Interceptor: online → server     │
│                  offline → IndexedDB │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Persistence (IndexedDB/Dexie)   │
│  - Mirror das tabelas principais    │
│  - Sync Queue (operacoes pendentes) │
│  - Conflict Queue (para revisao)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Service Worker (Serwist)      │
│  - Cache de assets (JS/CSS/fonts)   │
│  - Cache de API responses           │
│  - Background sync                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Supabase (PostgreSQL)       │
│  - Source of truth                  │
│  - updatedAt para conflict detect   │
└─────────────────────────────────────┘
```

### Tecnologias

| Tecnologia | Proposito |
|-----------|-----------|
| **Serwist** | Service Worker para Next.js 15 (fork moderno do Workbox) |
| **Dexie.js** | Wrapper ergonomico para IndexedDB |
| **Background Sync API** | Retry automatico de escritas ao voltar online |
| **react-window** | Virtualizacao de listas grandes |

---

## Modelo de Dados IndexedDB

### Tabelas espelhadas

```typescript
const db = new Dexie('ombuds-offline');

db.version(1).stores({
  assistidos:   'id, nome, cpf, updatedAt',
  processos:    'id, assistidoId, numeroAutos, updatedAt',
  atendimentos: 'id, assistidoId, processoId, dataAtendimento, updatedAt',
  demandas:     'id, assistidoId, processoId, tipo, updatedAt',
  casos:        'id, assistidoId, updatedAt',

  syncQueue:     '++id, table, operation, recordId, status, createdAt',
  conflictQueue: '++id, table, recordId, resolvedAt',

  syncMeta:      'key',
});
```

### Sync Queue

```typescript
interface SyncQueueItem {
  id?: number;
  table: string;
  operation: 'create' | 'update' | 'delete';
  recordId: number | string;
  data: Record<string, unknown>;
  expectedUpdatedAt?: Date;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
  createdAt: Date;
  attempts: number;
  lastError?: string;
}
```

### Conflict Queue

```typescript
interface ConflictItem {
  id?: number;
  table: string;
  recordId: number;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  localTimestamp: Date;
  serverTimestamp: Date;
  resolvedAt?: Date;
  resolution?: 'local' | 'server' | 'merged';
  mergedData?: Record<string, unknown>;
}
```

### Regras de espelhamento

- Hydration completa apos login (todos os dados do workspace)
- Sync incremental via `updatedAt > lastSyncAt`
- Colunas pesadas (enrichmentData, transcricao) NAO sao espelhadas

---

## Service Worker — Cache Strategy

| Recurso | Estrategia | TTL |
|---------|-----------|-----|
| App Shell (HTML, JS, CSS) | StaleWhileRevalidate | Sempre fresh |
| Fonts | CacheFirst | 1 ano |
| Imagens/logos | CacheFirst | 30 dias |
| API GET (tRPC) | NetworkFirst | Fallback IndexedDB |
| API mutations | NetworkOnly | Queue offline |
| Drive files | NetworkOnly | Sem cache |

### Paginas pre-cached (App Shell)

- `/admin/dashboard`
- `/admin/assistidos`
- `/admin/assistidos/[id]` (skeleton, dados vem do IDB)
- `/admin/demandas`
- `/admin/agenda`

---

## Fluxo de Sync

### Fase 1: Hydration (primeiro load / pos-login)

```
GET /api/trpc/offline.fullSync
  → Retorna: assistidos[], processos[], atendimentos[], demandas[], casos[]
  → Filtra: apenas dados do workspace do usuario
  → Salva tudo no IndexedDB
  → Grava syncMeta.lastSyncAt = now()
```

### Fase 2: Incremental Sync (a cada 15 min ou ao voltar online)

```
GET /api/trpc/offline.incrementalSync?since={lastSyncAt}
  → Retorna: registros com updatedAt > lastSyncAt
  → Upsert no IndexedDB
  → Atualiza lastSyncAt
```

### Fase 3: Push (processar syncQueue)

```
Para cada item na syncQueue (FIFO):
  1. CREATE → POST ao servidor
     - Sucesso: atualiza tempId → ID real no IDB
     - Falha: incrementa attempts, retry depois

  2. UPDATE → enviar com expectedUpdatedAt
     - server.updatedAt === expectedUpdatedAt → sucesso
     - server.updatedAt !== expectedUpdatedAt → CONFLITO
       → Move para conflictQueue
       → Busca versao atual do servidor

  3. DELETE → soft delete no servidor
     - Ja deletado → ignora (idempotente)
```

---

## Resolucao de Conflitos

### Regra principal

Sync automatico sem intervencao. Fila de revisao **somente** quando o mesmo registro foi editado em dois dispositivos (updatedAt diverge).

### UI de conflitos

```
┌─────────────────────────────────────────────────┐
│  ⚠️  1 conflito para resolver                   │
│                                                  │
│  Atendimento #123 — Joao Silva                   │
│  Editado offline em 04/03 14:30                  │
│  Editado no servidor em 04/03 14:45              │
│                                                  │
│  ┌─────────────────┬─────────────────┐          │
│  │ Sua versao      │ Versao servidor │          │
│  ├─────────────────┼─────────────────┤          │
│  │ Resumo: "..."   │ Resumo: "..."   │          │
│  │ Status: em_and. │ Status: concl.  │          │
│  └─────────────────┴─────────────────┘          │
│                                                  │
│  [Manter minha] [Manter servidor] [Merge manual] │
└─────────────────────────────────────────────────┘
```

- **Manter minha**: envia versao local com force=true
- **Manter servidor**: descarta versao local
- **Merge manual**: formulario pre-preenchido, usuario escolhe campo a campo

### Pagina dedicada

`/admin/sync` — lista todos os conflitos pendentes com diff visual.

---

## Performance e UX

### Optimistic Updates

Todas as mutacoes atualizam UI imediatamente. Se falhar, rollback com toast de erro. Se offline, salva na syncQueue e mantem a UI atualizada.

### Prefetching

- Hover sobre assistido na lista → prefetch `getById`
- Abrir assistido → prefetch tabs mais usadas (demandas, processos)
- Dashboard prefetcha dados das 3 primeiras secoes
- Links da sidebar com `prefetch={true}`

### Percepcao de velocidade

- Dados do IndexedDB aparecem instantaneamente, atualiza silencioso quando server responde (stale-while-revalidate no nivel de dados)
- Skeletons so no primeiro load (antes da hydration)
- Transicoes com `startTransition`
- Listas grandes: virtualizacao com `react-window`

### Bundle optimization

- Dynamic imports para paginas pesadas (Drive, Enrichment, PDF viewer)
- Lazy load de dependencias pesadas (recharts, jspdf, xlsx)
- Separar chunks por rota

### Offline indicator

- Badge no header: "Offline" (amarelo) quando sem internet
- Badge no sidebar: "N pendentes" quando ha items na syncQueue
- Toast ao voltar online: "Sincronizando N alteracoes..."
- Toast de conflito: "1 conflito encontrado — revisar"

---

## Plano de Implementacao

### Fase 1: Service Worker + App Shell (fundacao)
1. Instalar e configurar Serwist para Next.js 15
2. Definir cache strategies por tipo de recurso
3. Pre-cache das paginas principais
4. Offline indicator no header
5. Verificar: app carrega sem internet (shell vazio)

### Fase 2: IndexedDB + Hydration
6. Instalar Dexie.js, criar schema do banco local
7. Criar endpoint `offline.fullSync` no tRPC
8. Criar endpoint `offline.incrementalSync`
9. Implementar hydration pos-login
10. Implementar sync incremental (15 min)
11. Verificar: dados aparecem offline apos primeira visita

### Fase 3: Data Layer — Leitura offline
12. Criar hook `useOfflineQuery` que busca do IDB quando offline
13. Integrar com React Query (fallback para IDB)
14. Atualizar paginas principais para usar `useOfflineQuery`
15. Verificar: navegar offline entre paginas com dados

### Fase 4: Escrita offline + Sync Queue
16. Criar syncQueue no Dexie
17. Criar hook `useOfflineMutation` com optimistic updates
18. Implementar Background Sync para processar fila
19. Atualizar mutacoes de assistidos, atendimentos, demandas, processos
20. Verificar: criar/editar offline, sync ao voltar online

### Fase 5: Conflitos
21. Implementar deteccao de conflito via `updatedAt`
22. Criar conflictQueue no Dexie
23. Criar pagina `/admin/sync` com diff visual
24. Implementar opcoes: manter local, manter servidor, merge manual
25. Verificar: conflito detectado e resolvido corretamente

### Fase 6: Performance
26. Implementar prefetching (hover, tab switch, sidebar)
27. Dynamic imports para paginas pesadas
28. Virtualizacao de listas com react-window
29. Bundle audit e lazy load de deps pesadas
30. Verificar: Lighthouse score, TTI, bundle size
