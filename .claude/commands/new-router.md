# /new-router - Skill para Criar Novo Router tRPC

> **Tipo**: Workflow Especializado
> **Execução**: No contexto principal

## Descrição
Cria um novo router tRPC seguindo os padrões do projeto OMBUDS.

## Template Base

```typescript
// src/lib/trpc/routers/[nome].ts

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { nomeTabela } from "@/lib/db/schema";
import { eq, and, ilike, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Schema de validação
const createSchema = z.object({
  titulo: z.string().min(1, "Título obrigatório"),
  descricao: z.string().optional(),
  // ... outros campos
});

const updateSchema = createSchema.partial().extend({
  id: z.number(),
});

export const nomeRouter = router({
  // Listar com filtros
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["ativo", "inativo"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { search, status, limit, offset } = input;

      const conditions = [];

      if (search) {
        conditions.push(ilike(nomeTabela.titulo, `%${search}%`));
      }

      if (status) {
        conditions.push(eq(nomeTabela.status, status));
      }

      const items = await db
        .select()
        .from(nomeTabela)
        .where(and(...conditions))
        .orderBy(desc(nomeTabela.createdAt))
        .limit(limit)
        .offset(offset);

      return items;
    }),

  // Buscar por ID
  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const item = await db
        .select()
        .from(nomeTabela)
        .where(eq(nomeTabela.id, input.id))
        .limit(1);

      if (!item[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item não encontrado",
        });
      }

      return item[0];
    }),

  // Criar
  create: protectedProcedure
    .input(createSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(nomeTabela)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .returning();

      return created;
    }),

  // Atualizar
  update: protectedProcedure
    .input(updateSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [updated] = await db
        .update(nomeTabela)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(nomeTabela.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item não encontrado",
        });
      }

      return updated;
    }),

  // Deletar (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .update(nomeTabela)
        .set({ deletedAt: new Date() })
        .where(eq(nomeTabela.id, input.id))
        .returning();

      return deleted;
    }),

  // Estatísticas
  stats: protectedProcedure.query(async () => {
    const total = await db
      .select({ count: sql`count(*)` })
      .from(nomeTabela)
      .where(isNull(nomeTabela.deletedAt));

    return {
      total: Number(total[0]?.count || 0),
    };
  }),
});
```

## Checklist de Criação

1. **Criar arquivo**
   - Local: `src/lib/trpc/routers/[nome].ts`

2. **Registrar no index**
   ```typescript
   // src/lib/trpc/routers/index.ts
   import { nomeRouter } from "./nome";

   export const appRouter = router({
     // ... outros routers
     nome: nomeRouter,
   });
   ```

3. **Criar tabela no schema** (se necessário)
   ```typescript
   // src/lib/db/schema.ts
   export const nomeTabela = pgTable("nome_tabela", {
     id: serial("id").primaryKey(),
     titulo: text("titulo").notNull(),
     // ... campos
     createdAt: timestamp("created_at").defaultNow(),
     updatedAt: timestamp("updated_at"),
     deletedAt: timestamp("deleted_at"),
   });
   ```

4. **Gerar migration**
   ```bash
   npm run db:generate
   npm run db:push
   ```

## Padrões Obrigatórios

### Validação
- SEMPRE usar Zod para inputs
- Mensagens de erro em português
- Validar campos obrigatórios

### Segurança
- SEMPRE usar `protectedProcedure` (requer auth)
- Usar `adminProcedure` para ações sensíveis
- Nunca expor dados de outros usuários

### Performance
- Usar `limit` e `offset` para paginação
- Usar `select()` específico quando possível
- Evitar N+1 queries

### Soft Delete
- SEMPRE usar soft delete (`deletedAt`)
- Filtrar `deletedAt IS NULL` nas queries
