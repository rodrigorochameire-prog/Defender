import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { lugares, participacoesLugar, lugaresAccessLog, lugaresDistinctsConfirmed } from "@/lib/db/schema";
import { eq, and, isNull, desc, sql, ilike, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { normalizarEndereco } from "@/lib/lugares/normalizar-endereco";
import { isPlaceholderLugar } from "@/lib/lugares/placeholders";

export const lugaresRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        logradouro: z.string().optional().nullable(),
        numero: z.string().optional().nullable(),
        complemento: z.string().optional().nullable(),
        bairro: z.string().optional().nullable(),
        cidade: z.string().optional().nullable(),
        uf: z.string().max(2).optional().nullable(),
        cep: z.string().optional().nullable(),
        enderecoCompleto: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
        fonte: z.string().min(1).default("manual"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const full =
        input.enderecoCompleto ??
        [input.logradouro, input.numero, input.bairro, input.cidade, input.uf]
          .filter(Boolean)
          .join(", ");

      if (!full || isPlaceholderLugar(full)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Endereço inválido ou placeholder",
        });
      }

      const norm = normalizarEndereco(full);
      if (!norm) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não foi possível normalizar o endereço",
        });
      }

      const [row] = await db
        .insert(lugares)
        .values({
          workspaceId: ctx.user.workspaceId ?? 1,
          logradouro: input.logradouro ?? null,
          numero: input.numero ?? null,
          complemento: input.complemento ?? null,
          bairro: input.bairro ?? null,
          cidade: input.cidade ?? "Camaçari",
          uf: input.uf ?? "BA",
          cep: input.cep ?? null,
          enderecoCompleto: full,
          enderecoNormalizado: norm,
          observacoes: input.observacoes ?? null,
          fonteCriacao: input.fonte,
        } as any)
        .returning();

      return row;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        patch: z.object({
          logradouro: z.string().optional().nullable(),
          numero: z.string().optional().nullable(),
          complemento: z.string().optional().nullable(),
          bairro: z.string().optional().nullable(),
          cidade: z.string().optional().nullable(),
          uf: z.string().max(2).optional().nullable(),
          cep: z.string().optional().nullable(),
          observacoes: z.string().optional().nullable(),
          latitude: z.number().nullable().optional(),
          longitude: z.number().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const current = await db
        .select()
        .from(lugares)
        .where(
          and(
            eq(lugares.id, input.id),
            eq(lugares.workspaceId, ctx.user.workspaceId ?? 1)
          )
        )
        .limit(1);

      if (current.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lugar não encontrado" });
      }

      const c = current[0];
      const addrKeys = ["logradouro", "numero", "bairro", "cidade", "uf", "cep"] as const;

      const addrChanged = addrKeys.some(
        (k) => input.patch[k] !== undefined && input.patch[k] !== (c as any)[k]
      );

      const next = Object.fromEntries(
        addrKeys.map((k) => [k, input.patch[k] !== undefined ? input.patch[k] : (c as any)[k]])
      ) as Record<(typeof addrKeys)[number], string | null>;

      const full = [next.logradouro, next.numero, next.bairro, next.cidade, next.uf]
        .filter(Boolean)
        .join(", ");

      const norm = addrChanged ? normalizarEndereco(full) : c.enderecoNormalizado;

      const latChanged = input.patch.latitude !== undefined;
      const lngChanged = input.patch.longitude !== undefined;
      const clearGeo = latChanged && input.patch.latitude === null;

      const [row] = await db
        .update(lugares)
        .set({
          ...next,
          enderecoCompleto: full,
          enderecoNormalizado: norm,
          observacoes: input.patch.observacoes !== undefined ? input.patch.observacoes : c.observacoes,
          latitude: latChanged
            ? input.patch.latitude != null
              ? String(input.patch.latitude)
              : null
            : c.latitude,
          longitude: lngChanged
            ? input.patch.longitude != null
              ? String(input.patch.longitude)
              : null
            : c.longitude,
          geocodedAt: clearGeo ? null : c.geocodedAt,
          geocodingSource: clearGeo ? null : c.geocodingSource,
          updatedAt: new Date(),
        } as any)
        .where(eq(lugares.id, input.id))
        .returning();

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return { id: input.id, updated: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db
        .delete(participacoesLugar)
        .where(eq(participacoesLugar.lugarId, input.id));

      await db
        .delete(lugares)
        .where(
          and(
            eq(lugares.id, input.id),
            eq(lugares.workspaceId, ctx.user.workspaceId ?? 1)
          )
        );

      return { deleted: true };
    }),

  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        bairro: z.string().optional(),
        cidade: z.string().optional(),
        temCoord: z.boolean().optional(),
        limit: z.number().max(200).default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      const conds: any[] = [
        eq(lugares.workspaceId, workspaceId),
        isNull(lugares.mergedInto),
      ];

      if (input.search) {
        conds.push(
          or(
            ilike(lugares.logradouro, `%${input.search}%`),
            ilike(lugares.bairro, `%${input.search}%`),
            ilike(lugares.enderecoCompleto, `%${input.search}%`)
          )
        );
      }
      if (input.bairro) conds.push(ilike(lugares.bairro, `%${input.bairro}%`));
      if (input.cidade) conds.push(ilike(lugares.cidade, `%${input.cidade}%`));
      if (input.temCoord) conds.push(sql`${lugares.latitude} IS NOT NULL`);

      const items = await db
        .select()
        .from(lugares)
        .where(and(...conds))
        .orderBy(desc(lugares.updatedAt))
        .limit(input.limit)
        .offset(input.offset);

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(lugares)
        .where(and(eq(lugares.workspaceId, workspaceId), isNull(lugares.mergedInto)));

      if (!input.search && !input.bairro && !input.cidade) {
        await db.insert(lugaresAccessLog).values({
          userId: ctx.user.id,
          action: "list-dump",
          context: { limit: input.limit, offset: input.offset },
        } as any);
      }

      return { items, total: Number(total) };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const rows = await db
        .select()
        .from(lugares)
        .where(
          and(
            eq(lugares.id, input.id),
            eq(lugares.workspaceId, ctx.user.workspaceId ?? 1)
          )
        )
        .limit(1);

      if (rows.length === 0) return null;

      await db.insert(lugaresAccessLog).values({
        lugarId: input.id,
        userId: ctx.user.id,
        action: "get-by-id",
      } as any);

      return rows[0];
    }),

  getParticipacoesDoLugar: protectedProcedure
    .input(z.object({ lugarId: z.number() }))
    .query(async ({ input, ctx }) => {
      await db.insert(lugaresAccessLog).values({
        lugarId: input.lugarId,
        userId: ctx.user.id,
        action: "get-participacoes",
      } as any);
      return await db.select().from(participacoesLugar)
        .where(eq(participacoesLugar.lugarId, input.lugarId))
        .orderBy(desc(participacoesLugar.createdAt));
    }),

  getParticipacoesDoProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      return await db.select({
        participacao: participacoesLugar,
        lugar: lugares,
      })
      .from(participacoesLugar)
      .leftJoin(lugares, eq(lugares.id, participacoesLugar.lugarId))
      .where(eq(participacoesLugar.processoId, input.processoId))
      .orderBy(desc(participacoesLugar.createdAt));
    }),

  addParticipacao: protectedProcedure
    .input(z.object({
      lugarId: z.number(),
      processoId: z.number().nullable().optional(),
      pessoaId: z.number().nullable().optional(),
      tipo: z.enum([
        "local-do-fato","endereco-assistido","residencia-agressor",
        "trabalho-agressor","local-atendimento","radar-noticia",
      ]),
      dataRelacionada: z.string().nullable().optional(),
      sourceTable: z.string().nullable().optional(),
      sourceId: z.number().nullable().optional(),
      fonte: z.string().default("manual"),
    }))
    .mutation(async ({ input }) => {
      const [row] = await db.insert(participacoesLugar).values({
        lugarId: input.lugarId,
        processoId: input.processoId ?? null,
        pessoaId: input.pessoaId ?? null,
        tipo: input.tipo,
        dataRelacionada: input.dataRelacionada ?? null,
        sourceTable: input.sourceTable ?? null,
        sourceId: input.sourceId ?? null,
        fonte: input.fonte,
      } as any).onConflictDoNothing().returning({ id: participacoesLugar.id });
      return { id: row?.id ?? null };
    }),

  removeParticipacao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(participacoesLugar).where(eq(participacoesLugar.id, input.id));
      return { removed: true };
    }),

  searchForAutocomplete: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      bairro: z.string().optional(),
      limit: z.number().max(20).default(8),
    }))
    .query(async ({ input, ctx }) => {
      const q = `%${input.query}%`;
      const conds: any[] = [
        eq(lugares.workspaceId, ctx.user.workspaceId ?? 1),
        isNull(lugares.mergedInto),
        or(ilike(lugares.logradouro, q), ilike(lugares.bairro, q), ilike(lugares.enderecoCompleto, q)),
      ];
      if (input.bairro) conds.push(ilike(lugares.bairro, `%${input.bairro}%`));
      return await db.select({
        id: lugares.id,
        enderecoCompleto: lugares.enderecoCompleto,
        logradouro: lugares.logradouro,
        numero: lugares.numero,
        bairro: lugares.bairro,
        cidade: lugares.cidade,
      }).from(lugares)
        .where(and(...conds))
        .limit(input.limit);
    }),

  listDuplicates: protectedProcedure
    .input(z.object({ limit: z.number().max(50).default(20), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      const rows = await db.execute<{
        a_id: number; b_id: number; tipo: string;
        a_endereco: string; b_endereco: string;
      }>(sql`
        SELECT LEAST(a.id, b.id) AS a_id, GREATEST(a.id, b.id) AS b_id,
               'mesmo-normalizado' AS tipo,
               a.endereco_completo AS a_endereco, b.endereco_completo AS b_endereco
        FROM lugares a
        JOIN lugares b ON a.endereco_normalizado = b.endereco_normalizado
          AND a.id < b.id
          AND a.merged_into IS NULL AND b.merged_into IS NULL
          AND a.workspace_id = ${workspaceId}
          AND b.workspace_id = ${workspaceId}
          AND NOT EXISTS (
            SELECT 1 FROM lugares_distincts_confirmed d
            WHERE d.lugar_a_id = LEAST(a.id, b.id) AND d.lugar_b_id = GREATEST(a.id, b.id)
          )
        ORDER BY a.id
        LIMIT ${input.limit} OFFSET ${input.offset}
      `);
      const data = (rows as any).rows ?? rows;
      return {
        items: data.map((r: any) => ({
          aId: r.a_id, bId: r.b_id, tipo: r.tipo,
          aEndereco: r.a_endereco, bEndereco: r.b_endereco,
        })),
      };
    }),

  merge: protectedProcedure
    .input(z.object({ keepId: z.number(), mergeId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.keepId === input.mergeId) throw new Error("keepId e mergeId não podem ser iguais");
      const workspaceId = ctx.user.workspaceId ?? 1;
      await db.update(participacoesLugar)
        .set({ lugarId: input.keepId })
        .where(eq(participacoesLugar.lugarId, input.mergeId));
      await db.update(lugares)
        .set({ mergedInto: input.keepId, updatedAt: new Date() })
        .where(and(eq(lugares.id, input.mergeId), eq(lugares.workspaceId, workspaceId)));
      return { merged: true };
    }),

  markDistinct: protectedProcedure
    .input(z.object({ aId: z.number(), bId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const [lo, hi] = input.aId < input.bId ? [input.aId, input.bId] : [input.bId, input.aId];
      await db.insert(lugaresDistinctsConfirmed).values({
        lugarAId: lo, lugarBId: hi, confirmedBy: ctx.user.id,
      }).onConflictDoNothing();
      return { marked: true };
    }),

  geocode: protectedProcedure
    .input(z.object({ id: z.number(), force: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      const rows = await db.select().from(lugares)
        .where(and(eq(lugares.id, input.id), eq(lugares.workspaceId, workspaceId)))
        .limit(1);
      if (rows.length === 0) throw new Error("Lugar não encontrado");
      const l = rows[0];

      if (!input.force && l.latitude !== null && l.longitude !== null) {
        return {
          latitude: Number(l.latitude),
          longitude: Number(l.longitude),
          source: l.geocodingSource ?? "manual",
        };
      }

      const { getGeocoder } = await import("@/lib/lugares/geocoder-instance");
      const geocoder = getGeocoder();
      const result = await geocoder.geocode({
        logradouro: l.logradouro,
        numero: l.numero,
        bairro: l.bairro,
        cidade: l.cidade,
        uf: l.uf,
      });

      await db.insert(lugaresAccessLog).values({
        lugarId: input.id,
        userId: ctx.user.id,
        action: "geocode",
        context: { failed: result.failed ?? false },
      } as any);

      if (result.failed) {
        await db.update(lugares).set({
          geocodedAt: new Date(),
          geocodingSource: "nominatim-fail",
        } as any).where(eq(lugares.id, input.id));
        return { source: "nominatim" as const, failed: true };
      }

      await db.update(lugares).set({
        latitude: String(result.latitude),
        longitude: String(result.longitude),
        geocodedAt: new Date(),
        geocodingSource: "nominatim",
      } as any).where(eq(lugares.id, input.id));

      return {
        latitude: result.latitude,
        longitude: result.longitude,
        source: "nominatim" as const,
      };
    }),
});
