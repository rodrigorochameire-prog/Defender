import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { demandaEventos, atendimentoDemandas } from "@/lib/db/schema/demanda-eventos";
import { demandas, users } from "@/lib/db/schema/core";
import { atendimentos } from "@/lib/db/schema/agenda";
import { and, eq, isNull, desc, sql, notInArray } from "drizzle-orm";
import {
  createEventoSchema,
  updateEventoSchema,
} from "@/lib/trpc/zod/demanda-eventos";

async function loadDemandaForPermission(id: number) {
  const [d] = await db
    .select({
      id: demandas.id,
      defensorId: demandas.defensorId,
      delegadoParaId: demandas.delegadoParaId,
    })
    .from(demandas)
    .where(eq(demandas.id, id))
    .limit(1);
  return d;
}

function canWriteOnDemanda(
  d: { defensorId: number | null; delegadoParaId: number | null },
  userId: number,
  isAdmin: boolean,
) {
  return isAdmin || d.defensorId === userId || d.delegadoParaId === userId;
}

async function loadEventoById(id: number) {
  const [e] = await db
    .select()
    .from(demandaEventos)
    .where(eq(demandaEventos.id, id))
    .limit(1);
  return e;
}

export async function autoVincularAtendimentoADemandas(args: {
  atendimentoId: number;
  processoId: number;
  autorId: number;
  resumoBase: string;
}): Promise<{ vinculadas: number }> {
  const abertas = await db
    .select({ id: demandas.id })
    .from(demandas)
    .where(
      and(
        eq(demandas.processoId, args.processoId),
        isNull(demandas.deletedAt),
        notInArray(demandas.status, ["CONCLUIDO", "ARQUIVADO"]),
      ),
    );
  if (abertas.length === 0) return { vinculadas: 0 };

  await db
    .insert(atendimentoDemandas)
    .values(
      abertas.map((d) => ({
        atendimentoId: args.atendimentoId,
        demandaId: d.id,
      })),
    )
    .onConflictDoNothing();

  const resumo = (args.resumoBase || "Atendimento").slice(0, 140);
  await db.insert(demandaEventos).values(
    abertas.map((d) => ({
      demandaId: d.id,
      tipo: "atendimento" as const,
      resumo,
      atendimentoId: args.atendimentoId,
      autorId: args.autorId,
    })),
  );
  return { vinculadas: abertas.length };
}

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

  create: protectedProcedure
    .input(createEventoSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const isAdmin = ctx.user.role === "admin";

      const demanda = await loadDemandaForPermission(input.demandaId);
      if (!demanda) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Demanda não encontrada",
        });
      }
      if (!canWriteOnDemanda(demanda, userId, isAdmin)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para criar eventos nesta demanda",
        });
      }

      const payload: Record<string, any> = {
        demandaId: input.demandaId,
        tipo: input.tipo,
        resumo: input.resumo,
        descricao: input.descricao ?? null,
        responsavelId: input.responsavelId ?? null,
        autorId: userId,
      };

      if (input.tipo === "diligencia") {
        payload.subtipo = input.subtipo;
        payload.status = input.status;
        payload.prazo = input.prazo ?? null;
        if (input.status === "feita") {
          payload.dataConclusao = new Date();
        }
      } else if (input.tipo === "atendimento") {
        payload.atendimentoId = input.atendimentoId;
      }

      const [created] = await db
        .insert(demandaEventos)
        .values(payload as any)
        .returning();

      return created;
    }),

  update: protectedProcedure
    .input(updateEventoSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const isAdmin = ctx.user.role === "admin";

      const evento = await loadEventoById(input.id);
      if (!evento || evento.deletedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento não encontrado",
        });
      }

      if (!isAdmin && evento.autorId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas o autor do evento pode editá-lo",
        });
      }

      const patch: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (input.resumo !== undefined) patch.resumo = input.resumo;
      if (input.descricao !== undefined) patch.descricao = input.descricao;
      if (input.prazo !== undefined) patch.prazo = input.prazo;

      if (input.status !== undefined) {
        if (evento.tipo !== "diligencia") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Apenas eventos do tipo diligência podem ter status",
          });
        }
        patch.status = input.status;
        if (input.status === "feita" && !evento.dataConclusao) {
          patch.dataConclusao = new Date();
        }
        // Diligência pendente exige prazo — invariante consistente com createEventoSchema.
        if (input.status === "pendente") {
          const prazoAposPatch = input.prazo !== undefined ? input.prazo : evento.prazo;
          if (!prazoAposPatch) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Diligência pendente requer prazo",
            });
          }
        }
      }

      const [updated] = await db
        .update(demandaEventos)
        .set(patch)
        .where(eq(demandaEventos.id, input.id))
        .returning();

      return updated;
    }),

  marcarFeita: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const isAdmin = ctx.user.role === "admin";

      const evento = await loadEventoById(input.id);
      if (!evento || evento.deletedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento não encontrado",
        });
      }

      if (evento.tipo !== "diligencia") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Apenas diligências podem ser marcadas como feitas",
        });
      }

      if (!isAdmin && evento.autorId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas o autor do evento pode marcá-lo como feito",
        });
      }

      const now = new Date();
      const [updated] = await db
        .update(demandaEventos)
        .set({
          status: "feita",
          dataConclusao: now,
          updatedAt: now,
        })
        .where(eq(demandaEventos.id, input.id))
        .returning();

      return updated;
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const isAdmin = ctx.user.role === "admin";

      const evento = await loadEventoById(input.id);
      if (!evento || evento.deletedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento não encontrado",
        });
      }

      if (!isAdmin && evento.autorId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas o autor do evento pode arquivá-lo",
        });
      }

      await db
        .update(demandaEventos)
        .set({ deletedAt: new Date() })
        .where(eq(demandaEventos.id, input.id));

      return { ok: true as const, id: input.id };
    }),

  vincularAtendimento: protectedProcedure
    .input(
      z.object({
        demandaId: z.number().int().positive(),
        atendimentoId: z.number().int().positive(),
        resumo: z.string().min(1).max(140).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const isAdmin = ctx.user.role === "admin";

      const demanda = await loadDemandaForPermission(input.demandaId);
      if (!demanda) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Demanda não encontrada",
        });
      }
      if (!canWriteOnDemanda(demanda, userId, isAdmin)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sem permissão na demanda",
        });
      }

      const [a] = await db
        .select({ id: atendimentos.id, assunto: atendimentos.assunto })
        .from(atendimentos)
        .where(eq(atendimentos.id, input.atendimentoId))
        .limit(1);
      if (!a) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Atendimento não encontrado",
        });
      }

      await db
        .insert(atendimentoDemandas)
        .values({
          atendimentoId: input.atendimentoId,
          demandaId: input.demandaId,
        })
        .onConflictDoNothing();

      const resumo = (input.resumo ?? a.assunto ?? "Atendimento").slice(0, 140);
      const [created] = await db
        .insert(demandaEventos)
        .values({
          demandaId: input.demandaId,
          tipo: "atendimento",
          resumo,
          atendimentoId: input.atendimentoId,
          autorId: userId,
        })
        .returning();
      return created;
    }),

  desvincularAtendimento: protectedProcedure
    .input(
      z.object({
        demandaId: z.number().int().positive(),
        atendimentoId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const isAdmin = ctx.user.role === "admin";

      const demanda = await loadDemandaForPermission(input.demandaId);
      if (!demanda) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Demanda não encontrada",
        });
      }
      if (!canWriteOnDemanda(demanda, userId, isAdmin)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db
        .update(demandaEventos)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(demandaEventos.demandaId, input.demandaId),
            eq(demandaEventos.atendimentoId, input.atendimentoId),
            isNull(demandaEventos.deletedAt),
          ),
        );

      await db
        .delete(atendimentoDemandas)
        .where(
          and(
            eq(atendimentoDemandas.demandaId, input.demandaId),
            eq(atendimentoDemandas.atendimentoId, input.atendimentoId),
          ),
        );

      return { ok: true };
    }),
});
