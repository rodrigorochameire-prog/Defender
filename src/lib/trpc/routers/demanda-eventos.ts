import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { demandaEventos } from "@/lib/db/schema/demanda-eventos";
import { demandas, users } from "@/lib/db/schema/core";
import { and, eq, isNull, desc, sql } from "drizzle-orm";

export const demandaEventosRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        demandaId: z.number().int().positive(),
        limit: z.number().int().min(1).max(200).default(50),
        cursor: z.number().int().optional(),
      }),
    )
    .query(async ({ input }) => {
      const rows = await db
        .select({
          evento: demandaEventos,
          autor: { id: users.id, name: users.name },
        })
        .from(demandaEventos)
        .leftJoin(users, eq(users.id, demandaEventos.autorId))
        .where(
          and(
            eq(demandaEventos.demandaId, input.demandaId),
            isNull(demandaEventos.deletedAt),
            input.cursor
              ? sql`${demandaEventos.id} < ${input.cursor}`
              : sql`true`,
          ),
        )
        .orderBy(desc(demandaEventos.createdAt), desc(demandaEventos.id))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;
      const nextCursor = hasMore ? items[items.length - 1].evento.id : undefined;
      return { items, nextCursor };
    }),

  lastByDemandaIds: protectedProcedure
    .input(
      z.object({
        demandaIds: z.array(z.number().int().positive()).max(500),
      }),
    )
    .query(async ({ input }) => {
      if (input.demandaIds.length === 0) return {} as Record<number, unknown>;
      const rows = await db.execute(sql`
        SELECT DISTINCT ON (demanda_id)
          id, demanda_id, tipo, subtipo, status, resumo, prazo, autor_id, created_at
        FROM demanda_eventos
        WHERE demanda_id IN (${sql.join(input.demandaIds, sql`, `)})
          AND deleted_at IS NULL
        ORDER BY demanda_id, created_at DESC, id DESC
      `);
      const map: Record<number, any> = {};
      for (const r of rows as unknown as Array<Record<string, any>>) {
        map[r.demanda_id] = r;
      }
      return map;
    }),

  pendentesByDemandaIds: protectedProcedure
    .input(
      z.object({
        demandaIds: z.array(z.number().int().positive()).max(500),
      }),
    )
    .query(async ({ input }) => {
      if (input.demandaIds.length === 0) return {} as Record<number, unknown>;
      const rows = await db.execute(sql`
        SELECT DISTINCT ON (demanda_id)
          id, demanda_id, tipo, subtipo, status, resumo, prazo, responsavel_id
        FROM demanda_eventos
        WHERE demanda_id IN (${sql.join(input.demandaIds, sql`, `)})
          AND tipo = 'diligencia' AND status = 'pendente' AND deleted_at IS NULL
        ORDER BY demanda_id, prazo ASC NULLS LAST, created_at ASC
      `);
      const map: Record<number, any> = {};
      for (const r of rows as unknown as Array<Record<string, any>>) {
        map[r.demanda_id] = r;
      }
      return map;
    }),

  historicoByAssistidoId: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number().int().positive(),
        limit: z.number().int().min(1).max(500).default(100),
      }),
    )
    .query(async ({ input }) => {
      return await db
        .select({
          evento: demandaEventos,
          demanda: { id: demandas.id, ato: demandas.ato },
          autor: { id: users.id, name: users.name },
        })
        .from(demandaEventos)
        .innerJoin(demandas, eq(demandas.id, demandaEventos.demandaId))
        .leftJoin(users, eq(users.id, demandaEventos.autorId))
        .where(
          and(
            eq(demandas.assistidoId, input.assistidoId),
            isNull(demandaEventos.deletedAt),
          ),
        )
        .orderBy(desc(demandaEventos.createdAt))
        .limit(input.limit);
    }),

  historicoByProcessoId: protectedProcedure
    .input(
      z.object({
        processoId: z.number().int().positive(),
        limit: z.number().int().min(1).max(500).default(100),
      }),
    )
    .query(async ({ input }) => {
      return await db
        .select({
          evento: demandaEventos,
          demanda: { id: demandas.id, ato: demandas.ato },
          autor: { id: users.id, name: users.name },
        })
        .from(demandaEventos)
        .innerJoin(demandas, eq(demandas.id, demandaEventos.demandaId))
        .leftJoin(users, eq(users.id, demandaEventos.autorId))
        .where(
          and(
            eq(demandas.processoId, input.processoId),
            isNull(demandaEventos.deletedAt),
          ),
        )
        .orderBy(desc(demandaEventos.createdAt))
        .limit(input.limit);
    }),
});
