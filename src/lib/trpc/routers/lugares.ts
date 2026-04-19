import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { lugares, participacoesLugar, lugaresAccessLog } from "@/lib/db/schema";
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
});
