# Defensor Parceiros, Processos 3-Camadas e WhatsApp por Defensor

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Isolar processos por defensor (com parceria configurável Rodrigo↔Juliane), tirar agenda do hardcode, e isolar WhatsApp por defensor via `createdById` em `evolution_config`.

**Architecture:** Nova tabela `defensor_parceiros` (relação M:M simétrica entre usuários) serve como fonte de verdade para partilha de processos E agenda. WhatsApp usa `createdById` já existente em `evolution_config` para filtrar configs por dono. Processos ganha filtro 3 camadas similar ao de assistidos.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, PostgreSQL (Supabase), Tailwind + shadcn/ui

---

## Task 1: Tabela `defensor_parceiros` + migration + seed

**Files:**
- Create: `supabase/migrations/20260321_defensor_parceiros.sql`
- Modify: `src/lib/db/schema/core.ts`

**Step 1: Criar migration SQL**

```sql
-- supabase/migrations/20260321_defensor_parceiros.sql

CREATE TABLE IF NOT EXISTS defensor_parceiros (
  id SERIAL PRIMARY KEY,
  defensor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parceiro_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT defensor_parceiros_unique UNIQUE (defensor_id, parceiro_id),
  CONSTRAINT defensor_parceiros_no_self CHECK (defensor_id != parceiro_id)
);

CREATE INDEX IF NOT EXISTS defensor_parceiros_defensor_idx ON defensor_parceiros(defensor_id);
CREATE INDEX IF NOT EXISTS defensor_parceiros_parceiro_idx ON defensor_parceiros(parceiro_id);

-- Seed: Rodrigo (id=1) e Juliane (id=4) são parceiros
-- Inserir ambas as direções para facilitar o JOIN
INSERT INTO defensor_parceiros (defensor_id, parceiro_id)
VALUES (1, 4), (4, 1)
ON CONFLICT DO NOTHING;
```

**Step 2: Aplicar migration via Node.js**

```bash
node -e "
const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
async function run() {
  await sql\`
    CREATE TABLE IF NOT EXISTS defensor_parceiros (
      id SERIAL PRIMARY KEY,
      defensor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parceiro_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      CONSTRAINT defensor_parceiros_unique UNIQUE (defensor_id, parceiro_id),
      CONSTRAINT defensor_parceiros_no_self CHECK (defensor_id != parceiro_id)
    )
  \`;
  await sql\`CREATE INDEX IF NOT EXISTS defensor_parceiros_defensor_idx ON defensor_parceiros(defensor_id)\`;
  await sql\`CREATE INDEX IF NOT EXISTS defensor_parceiros_parceiro_idx ON defensor_parceiros(parceiro_id)\`;
  await sql\`INSERT INTO defensor_parceiros (defensor_id, parceiro_id) VALUES (1, 4), (4, 1) ON CONFLICT DO NOTHING\`;
  const rows = await sql\`SELECT * FROM defensor_parceiros\`;
  console.log('Parceiros:', JSON.stringify(rows));
  await sql.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
"
```

Esperado: `Parceiros: [{"id":1,"defensor_id":1,"parceiro_id":4,...},{"id":2,"defensor_id":4,"parceiro_id":1,...}]`

**Step 3: Adicionar tabela ao schema Drizzle**

Em `src/lib/db/schema/core.ts`, encontrar onde ficam as tabelas de usuários e adicionar APÓS a tabela `users` (e seus índices), antes da próxima tabela:

```typescript
// ==========================================
// DEFENSOR PARCEIROS
// ==========================================
export const defensorParceiros = pgTable("defensor_parceiros", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  parceiroId: integer("parceiro_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("defensor_parceiros_defensor_idx").on(table.defensorId),
  index("defensor_parceiros_parceiro_idx").on(table.parceiroId),
  unique("defensor_parceiros_unique").on(table.defensorId, table.parceiroId),
]);
export type DefensorParceiro = typeof defensorParceiros.$inferSelect;
export type InsertDefensorParceiro = typeof defensorParceiros.$inferInsert;
```

**Step 4: Verificar TypeScript**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -v "page-refactored\|schema.old" | head -20
```

Esperado: nenhum erro.

**Step 5: Commit**

```bash
git add supabase/migrations/20260321_defensor_parceiros.sql src/lib/db/schema/core.ts
git commit -m "feat(schema): tabela defensor_parceiros + seed Rodrigo↔Juliane"
```

---

## Task 2: Helper `getParceiros()` em `comarca-scope.ts`

**Files:**
- Modify: `src/lib/trpc/comarca-scope.ts`

**Step 1: Adicionar import e função**

Em `src/lib/trpc/comarca-scope.ts`, adicionar após os imports existentes:

```typescript
import { defensorParceiros } from "@/lib/db/schema";
```

E adicionar a função (antes das funções existentes ou após — desde que não dentro de nenhuma):

```typescript
/**
 * Retorna IDs dos parceiros de um defensor (ex: Rodrigo ↔ Juliane).
 * Usado para Layer 2 do filtro de processos e agenda.
 */
export async function getParceirosIds(userId: number): Promise<number[]> {
  const rows = await db
    .select({ parceiroId: defensorParceiros.parceiroId })
    .from(defensorParceiros)
    .where(eq(defensorParceiros.defensorId, userId));
  return rows.map((r) => r.parceiroId);
}
```

**Step 2: Verificar TypeScript**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -v "page-refactored\|schema.old" | head -20
```

**Step 3: Commit**

```bash
git add src/lib/trpc/comarca-scope.ts
git commit -m "feat(comarca-scope): helper getParceirosIds para partilha de processos/agenda"
```

---

## Task 3: Processos — filtro 3 camadas + toggle `verComarca`

**Files:**
- Modify: `src/lib/trpc/routers/processos.ts`
- Modify: `src/hooks/use-comarca-visibilidade.ts` (adicionar `verComarca`)
- Modify: `src/lib/trpc/routers/settings.ts` (adicionar `verComarca` ao JSONB)

**Step 1: Atualizar `settings.ts` — adicionar `verComarca`**

Localizar o procedimento `setComarcaVisibilidade` em `src/lib/trpc/routers/settings.ts`.

O input schema atual deve ter `verRMS: z.boolean()`. Adicionar `verComarca: z.boolean().optional()`:

```typescript
// Input schema de setComarcaVisibilidade
z.object({
  verRMS: z.boolean().optional(),
  verComarca: z.boolean().optional(),
})
```

O `getComarcaVisibilidade` deve retornar ambos:
```typescript
return {
  verRMS: settings?.comarcaVisibilidade?.verRMS ?? false,
  verComarca: settings?.comarcaVisibilidade?.verComarca ?? false,
};
```

**Step 2: Atualizar hook `use-comarca-visibilidade.ts`**

Adicionar `verComarca` ao retorno do hook:

```typescript
export function useComarcaVisibilidade() {
  const { data, ...rest } = trpc.settings.getComarcaVisibilidade.useQuery();
  const mutation = trpc.settings.setComarcaVisibilidade.useMutation({ ... });

  return {
    verRMS: data?.verRMS ?? false,
    verComarca: data?.verComarca ?? false,
    toggle: (values: { verRMS?: boolean; verComarca?: boolean }) => mutation.mutate(values),
    isLoading: mutation.isPending,
  };
}
```

**Step 3: Atualizar `processos.ts` — filtro 3 camadas**

Localizar o procedimento `list` em `src/lib/trpc/routers/processos.ts`. Atualmente o bloco `if (!isAdmin)` tem apenas:
```typescript
conditions.push(eq(processos.comarcaId, getComarcaId(ctx.user)));
```

Substituir por filtro 3 camadas:

```typescript
import { getParceirosIds } from "@/lib/trpc/comarca-scope";
import { or, inArray } from "drizzle-orm";

// Dentro do procedimento list, no bloco if (!isAdmin):
if (!isAdmin) {
  const verComarca = input.verComarca ?? false;
  if (verComarca) {
    // Layer 3: toda a comarca
    conditions.push(eq(processos.comarcaId, getComarcaId(ctx.user)));
  } else {
    // Layer 1 + 2: próprios + parceiros
    const parceirosIds = await getParceirosIds(ctx.user.id);
    const defensoresVisiveis = [ctx.user.id, ...parceirosIds];
    conditions.push(
      or(
        inArray(processos.defensorId, defensoresVisiveis),
        isNull(processos.defensorId) // processos sem defensor atribuído ficam visíveis na comarca
          ? eq(processos.comarcaId, getComarcaId(ctx.user))
          : undefined,
      )!
    );
  }
}
```

**Nota importante**: `processos.defensorId` é opcional (nullable). Processos sem defensor atribuído devem ser visíveis por comarca. O `or()` acima cobre isso.

O input schema do `list` precisa aceitar `verComarca`:
```typescript
z.object({
  // campos existentes...
  verComarca: z.boolean().optional(),
}).optional()
```

**Step 4: Verificar TypeScript**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -v "page-refactored\|schema.old" | head -20
```

**Step 5: Commit**

```bash
git add src/lib/trpc/routers/processos.ts src/lib/trpc/routers/settings.ts src/hooks/use-comarca-visibilidade.ts
git commit -m "feat(processos): filtro 3 camadas — próprios + parceiros + toggle comarca"
```

---

## Task 4: Agenda — substituir hardcode por `defensor_parceiros`

**Files:**
- Modify: `src/lib/trpc/routers/calendar.ts`

**Step 1: Ler o arquivo atual**

Ler `src/lib/trpc/routers/calendar.ts` linhas 1-50 para entender o contexto completo do `AGENDA_COMPARTILHADA`.

**Step 2: Substituir lógica hardcoded**

Localizar:
```typescript
const AGENDA_COMPARTILHADA = [1, 4]; // Rodrigo=1, Juliane=4
// ...
if (AGENDA_COMPARTILHADA.includes(defensoresVisiveis[0])) {
  return [inArray(calendarEvents.createdById, AGENDA_COMPARTILHADA)];
}
```

Substituir por:
```typescript
import { getParceirosIds } from "@/lib/trpc/comarca-scope";

// Dentro da função de filtro (ou inline no procedimento):
const userId = ctx.user.id; // ou defensoresVisiveis[0]
const parceirosIds = await getParceirosIds(userId);
const defensoresVisiveisNaAgenda = [userId, ...parceirosIds];
// Se tiver parceiros, inclui todos na agenda
return [inArray(calendarEvents.createdById, defensoresVisiveisNaAgenda)];
```

Remover completamente a constante `AGENDA_COMPARTILHADA`.

**Step 3: Verificar TypeScript**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -v "page-refactored\|schema.old" | head -20
```

**Step 4: Commit**

```bash
git add src/lib/trpc/routers/calendar.ts
git commit -m "feat(agenda): partilha por defensor_parceiros — remover AGENDA_COMPARTILHADA hardcoded"
```

---

## Task 5: WhatsApp — isolar `listConfigs` por `createdById`

**Files:**
- Modify: `src/lib/trpc/routers/whatsapp-chat.ts`

**Contexto:** `evolution_config` já tem `createdById INTEGER REFERENCES users(id)`. Não precisa de nova coluna. Só filtrar a query.

**Step 1: Localizar `listConfigs`**

Em `src/lib/trpc/routers/whatsapp-chat.ts`, linha ~105:
```typescript
listConfigs: protectedProcedure.query(async ({ ctx }) => {
  // atualmente retorna todos sem filtro
```

**Step 2: Adicionar filtro por dono**

```typescript
listConfigs: protectedProcedure.query(async ({ ctx }) => {
  const isAdmin = ctx.user.role === "admin";
  const configs = await db
    .select()
    .from(evolutionConfig)
    .where(
      isAdmin
        ? undefined
        : eq(evolutionConfig.createdById, ctx.user.id)
    )
    .orderBy(desc(evolutionConfig.createdAt));
  return configs;
}),
```

**Step 3: Garantir que `getConfig` também está isolado**

Localizar `getConfig` (~linha 117). Atualmente busca por `id`. Adicionar verificação de ownership:

```typescript
getConfig: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ input, ctx }) => {
    const isAdmin = ctx.user.role === "admin";
    const [config] = await db
      .select()
      .from(evolutionConfig)
      .where(
        and(
          eq(evolutionConfig.id, input.id),
          isAdmin ? undefined : eq(evolutionConfig.createdById, ctx.user.id),
        )
      );
    if (!config) throw new TRPCError({ code: "NOT_FOUND" });
    return config;
  }),
```

**Step 4: Verificar que `createConfig` já stampa `createdById`**

Procurar no procedimento de criação (em torno de linha 151) se `createdById: ctx.user.id` é passado no insert. Se não estiver, adicionar.

**Step 5: Verificar TypeScript**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -v "page-refactored\|schema.old" | head -20
```

**Step 6: Commit**

```bash
git add src/lib/trpc/routers/whatsapp-chat.ts
git commit -m "feat(whatsapp): isolamento por createdById — cada defensor vê só sua instância"
```

---

## Task 6: Atendimentos — filtro básico por comarca

**Files:**
- Modify: `src/lib/trpc/routers/atendimentos.ts`

**Contexto:** `atendimentos` tem `atendidoPorId` (quem criou) e deveria ter `comarcaId` — verificar se existe. Se não existir, usar `atendidoPorId` + parceiros.

**Step 1: Verificar schema de atendimentos**

```bash
grep -n "comarcaId\|comarca_id\|atendidoPorId" /Users/rodrigorochameire/Projetos/Defender/src/lib/db/schema/core.ts | grep -A2 -B2 "atendimento"
```

**Step 2a: Se `comarcaId` existir em atendimentos**

Adicionar ao `list`:
```typescript
if (!isAdmin) {
  conditions.push(eq(atendimentos.comarcaId, getComarcaId(ctx.user)));
}
```

**Step 2b: Se `comarcaId` NÃO existir**

Usar `atendidoPorId` + parceiros (igual processos):
```typescript
if (!isAdmin) {
  const parceirosIds = await getParceirosIds(ctx.user.id);
  const defensoresVisiveis = [ctx.user.id, ...parceirosIds];
  conditions.push(inArray(atendimentos.atendidoPorId, defensoresVisiveis));
}
```

**Step 3: Verificar TypeScript + Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -v "page-refactored\|schema.old" | head -20
git add src/lib/trpc/routers/atendimentos.ts
git commit -m "feat(atendimentos): filtro por comarca/defensor — isolamento multi-defensor"
```

---

## Task 7: Verificação final + build

**Step 1: Build completo**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npm run build 2>&1 | tail -20
```

Esperado: build sem erros.

**Step 2: Verificar dados no banco**

```bash
node -e "
const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
async function run() {
  const p = await sql\`SELECT * FROM defensor_parceiros\`;
  console.log('Parceiros:', JSON.stringify(p));
  const c = await sql\`SELECT id, instance_name, created_by_id FROM evolution_config\`;
  console.log('WhatsApp configs:', JSON.stringify(c));
  await sql.end();
}
run().catch(e => console.error(e.message));
"
```

**Step 3: Push**

```bash
git push origin main
```
