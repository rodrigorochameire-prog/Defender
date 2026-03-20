# Radar Criminal — Performance + UX Loading

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduzir tempo de carregamento do feed do radar e melhorar UX durante carregamento/refetch.

**Architecture:** Três frentes: (A) índices compostos no banco, (B) eliminar segunda query de matches absorvendo count no select principal via subquery, (C) UX de skeleton durante refetch por filtro.

**Tech Stack:** PostgreSQL (Supabase), Drizzle ORM, tRPC, React Query, Next.js 15

---

## Task 1: Índices compostos no banco

**Files:**
- Create: `supabase/migrations/20260320_radar_performance_indexes.sql`
- Modify: `src/lib/db/schema/radar.ts`

**Step 1: Criar migration SQL**

```sql
-- Performance: índices compostos para o feed do Radar Criminal
-- O feed filtra por enrichmentStatus != 'pending' E ordena por dataPublicacao DESC

-- Índice composto principal: filtro de status + ordenação por data
CREATE INDEX CONCURRENTLY IF NOT EXISTS radar_noticias_status_datapub_idx
  ON radar_noticias (enrichment_status, data_publicacao DESC NULLS LAST);

-- Índice composto com relevância (para o floor de score default = 60)
CREATE INDEX CONCURRENTLY IF NOT EXISTS radar_noticias_status_relevancia_datapub_idx
  ON radar_noticias (enrichment_status, relevancia_score DESC, data_publicacao DESC NULLS LAST);

-- Índice para subquery de contagem de matches por notícia
CREATE INDEX CONCURRENTLY IF NOT EXISTS radar_matches_noticia_id_idx
  ON radar_matches (noticia_id);

-- Índice para busca de matches pendentes (matchesPendentesByNoticias)
CREATE INDEX CONCURRENTLY IF NOT EXISTS radar_matches_noticia_status_idx
  ON radar_matches (noticia_id, status);
```

**Step 2: Adicionar os novos índices ao schema Drizzle**

Em `src/lib/db/schema/radar.ts`, na definição de `radarNoticias` (no array de indexes), adicionar:

```typescript
index("radar_noticias_status_datapub_idx").on(table.enrichmentStatus, table.dataPublicacao),
index("radar_noticias_status_relevancia_datapub_idx").on(table.enrichmentStatus, table.relevanciaScore, table.dataPublicacao),
```

E na definição de `radarMatches`, adicionar:
```typescript
index("radar_matches_noticia_id_idx").on(table.noticiaId),
index("radar_matches_noticia_status_idx").on(table.noticiaId, table.status),
```

**Step 3: Aplicar migration no banco via node script**

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
// Usar service_role key do .env.local
"
```

Usar o Supabase JS client com service_role (como feito na task anterior) para executar o SQL.

**Step 4: Commit**
```bash
git add supabase/migrations/20260320_radar_performance_indexes.sql src/lib/db/schema/radar.ts
git commit -m "perf(radar): índices compostos para feed principal + matches"
```

---

## Task 2: Eliminar segunda query — matchCount via subquery no list

**Files:**
- Modify: `src/lib/trpc/routers/radar.ts` (procedure `list`, linhas ~89-151)
- Modify: `src/components/radar/radar-feed.tsx` (remover `matchesPendentesByNoticias`)

**Contexto:** O feed faz DUAS queries:
1. `radar.list` — busca notícias
2. `radar.matchesPendentesByNoticias` — busca detalhes dos matches pendentes para mostrar quick actions nos cards

O problema: toda vez que `allNoticias` muda (scroll, filtro), a segunda query refaz. Solução: incluir `matchCount` como subquery correlated no select principal (sem JOIN/window function), e incluir os matches com `status='possivel'` diretamente no select via subquery JSON.

**Step 1: Modificar o select do `list` (modo normal, sem soMatches)**

No select da query normal (linha ~131), adicionar `matchCount` via subquery:

```typescript
// Antes (sem matchCount):
query = db
  .select({
    id: radarNoticias.id,
    // ... outros campos
    createdAt: radarNoticias.createdAt,
  })
  .from(radarNoticias)
  ...

// Depois (com matchCount via subquery):
query = db
  .select({
    id: radarNoticias.id,
    url: radarNoticias.url,
    fonte: radarNoticias.fonte,
    titulo: radarNoticias.titulo,
    dataPublicacao: radarNoticias.dataPublicacao,
    dataFato: radarNoticias.dataFato,
    imagemUrl: radarNoticias.imagemUrl,
    tipoCrime: radarNoticias.tipoCrime,
    bairro: radarNoticias.bairro,
    armaMeio: radarNoticias.armaMeio,
    resumoIA: radarNoticias.resumoIA,
    envolvidos: radarNoticias.envolvidos,
    enrichmentStatus: radarNoticias.enrichmentStatus,
    relevanciaScore: radarNoticias.relevanciaScore,
    createdAt: radarNoticias.createdAt,
    matchCount: sql<number>`(
      SELECT COUNT(*)::int FROM radar_matches rm
      WHERE rm.noticia_id = ${radarNoticias.id}
    )`,
  })
  .from(radarNoticias)
  .where(conditions.length > 0 ? and(...conditions) : undefined)
  .orderBy(sql`${radarNoticias.dataPublicacao} DESC NULLS LAST`, desc(radarNoticias.createdAt), desc(radarNoticias.id))
  .limit(input.limit + 1);
```

O modo `soMatches` já tem `matchCount` via window function — deixar como está (INNER JOIN garante que só vêm notícias com matches).

**Step 2: Adicionar staleTime à query `matchesPendentesByNoticias` no feed**

Em `src/components/radar/radar-feed.tsx`, adicionar `staleTime` para evitar refetch desnecessário:

```typescript
const { data: matchesPendentes } = trpc.radar.matchesPendentesByNoticias.useQuery(
  { noticiaIds: noticiaIdsComMatch },
  {
    enabled: noticiaIdsComMatch.length > 0,
    staleTime: 30_000, // não refaz por 30s
  }
);
```

**Step 3: Commit**
```bash
git add src/lib/trpc/routers/radar.ts src/components/radar/radar-feed.tsx
git commit -m "perf(radar): matchCount via subquery no list, staleTime em matchesPendentes"
```

---

## Task 3: UX — skeleton durante refetch por filtro

**Files:**
- Modify: `src/components/radar/radar-feed.tsx`

**Contexto:** O `isLoading` só é `true` na primeira carga (sem dados em cache). Quando o usuário muda um filtro, `isFetching=true` mas `isLoading=false` — o feed continua mostrando os dados antigos até a nova query completar. Isso causa a sensação de "travamento".

**Step 1: Adicionar estado de "refetching" com overlay de skeleton**

Usar `isFetching && !isFetchingNextPage` para detectar refetch por mudança de filtro:

```typescript
const {
  data,
  isLoading,
  isFetching,          // <-- adicionar
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = trpc.radar.list.useInfiniteQuery(...)
```

**Step 2: Mostrar skeleton completo durante refetch**

Substituir o bloco de loading existente:

```typescript
// Antes:
if (isLoading) {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

// Depois:
const showSkeleton = isLoading || (isFetching && !isFetchingNextPage && allNoticias.length === 0);
const showRefetchOverlay = isFetching && !isFetchingNextPage && allNoticias.length > 0;

if (showSkeleton) {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}
```

**Step 3: Adicionar indicador sutil de refetch sobre os cards existentes**

Dentro do `return` principal, envolver o conteúdo com um wrapper que fica levemente opaco durante refetch:

```tsx
<div className={cn("space-y-3 transition-opacity duration-200", showRefetchOverlay && "opacity-50 pointer-events-none")}>
  {/* ... conteúdo existente ... */}
</div>
```

E adicionar um spinner pequeno no topo:

```tsx
{showRefetchOverlay && (
  <div className="flex items-center gap-2 text-xs text-zinc-400 py-1">
    <RefreshCw className="h-3 w-3 animate-spin" />
    Atualizando...
  </div>
)}
```

**Step 4: Adicionar `staleTime` na query principal para evitar refetch em troca de tab**

```typescript
trpc.radar.list.useInfiniteQuery(
  { ... },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 60_000, // dados ficam frescos por 1 min (troca de tab não refaz)
  }
)
```

**Step 5: Commit**
```bash
git add src/components/radar/radar-feed.tsx
git commit -m "feat(radar): skeleton e overlay durante refetch por filtro, staleTime 60s"
```

---

## Ordem de execução

1. Task 1 (índices) — maior impacto, aplicar no banco imediatamente
2. Task 2 (matchCount subquery) — elimina round-trip
3. Task 3 (UX skeleton) — percepção de velocidade

**Commit final:**
```bash
git push origin main
```
