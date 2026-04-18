import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { pessoas, participacoesProcesso, pessoasDistinctsConfirmed } from "@/lib/db/schema";
import { eq, and, isNull, desc, asc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { normalizarNome } from "@/lib/pessoas/normalize";
import { PAPEIS_VALIDOS } from "@/lib/pessoas/intel-config";

const papelEnum = z.enum(PAPEIS_VALIDOS as unknown as [string, ...string[]]);

const pessoaInputSchema = z.object({
  nome: z.string().min(2, "Nome muito curto"),
  cpf: z.string().max(14).optional(),
  rg: z.string().optional(),
  dataNascimento: z.string().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  observacoes: z.string().optional(),
  categoriaPrimaria: z.string().max(30).optional(),
  fonteCriacao: z.enum([
    "manual",
    "backfill",
    "ia-atendimento",
    "ia-denuncia",
    "import-pje",
  ]),
});

export const pessoasRouter = router({
  create: protectedProcedure
    .input(pessoaInputSchema)
    .mutation(async ({ input, ctx }) => {
      const nomeNorm = normalizarNome(input.nome);
      if (!nomeNorm) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nome inválido" });
      }
      try {
        const [row] = await db
          .insert(pessoas)
          .values({
            nome: input.nome.trim(),
            nomeNormalizado: nomeNorm,
            cpf: input.cpf || null,
            rg: input.rg || null,
            dataNascimento: input.dataNascimento || null,
            telefone: input.telefone || null,
            endereco: input.endereco || null,
            observacoes: input.observacoes || null,
            categoriaPrimaria: input.categoriaPrimaria || null,
            fonteCriacao: input.fonteCriacao,
            criadoPor: ctx.user?.id ?? null,
          } as any)
          .returning();
        return row;
      } catch (e: any) {
        if (e?.code === "23505") {
          throw new TRPCError({ code: "CONFLICT", message: "CPF já cadastrado" });
        }
        throw e;
      }
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(2).optional(),
      cpf: z.string().max(14).nullable().optional(),
      rg: z.string().nullable().optional(),
      dataNascimento: z.string().nullable().optional(),
      telefone: z.string().nullable().optional(),
      endereco: z.string().nullable().optional(),
      observacoes: z.string().nullable().optional(),
      categoriaPrimaria: z.string().max(30).nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const updates: any = { updatedAt: new Date() };
      if (input.nome !== undefined) {
        updates.nome = input.nome.trim();
        updates.nomeNormalizado = normalizarNome(input.nome);
      }
      for (const k of ["cpf", "rg", "dataNascimento", "telefone", "endereco", "observacoes", "categoriaPrimaria"] as const) {
        if (input[k] !== undefined) updates[k] = input[k];
      }
      const [row] = await db
        .update(pessoas)
        .set(updates)
        .where(eq(pessoas.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(pessoas).where(eq(pessoas.id, input.id));
      return { ok: true };
    }),

  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      papel: papelEnum.optional(),
      categoria: z.string().optional(),
      hasProcessos: z.boolean().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
      orderBy: z.enum(["nome", "recente"]).default("nome"),
    }))
    .query(async ({ input }) => {
      const where = [isNull(pessoas.mergedInto)];
      if (input.search) {
        const searchNorm = normalizarNome(input.search);
        where.push(sql`${pessoas.nomeNormalizado} ILIKE ${'%' + searchNorm + '%'}`);
      }
      if (input.categoria) where.push(eq(pessoas.categoriaPrimaria, input.categoria));

      const orderByCol = input.orderBy === "recente" ? desc(pessoas.updatedAt) : asc(pessoas.nome);

      const items = await db
        .select()
        .from(pessoas)
        .where(and(...where))
        .orderBy(orderByCol)
        .limit(input.limit)
        .offset(input.offset);

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(pessoas)
        .where(and(...where));

      return { items, total: Number(total) };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [pessoa] = await db.select().from(pessoas).where(eq(pessoas.id, input.id));
      if (!pessoa) throw new TRPCError({ code: "NOT_FOUND" });
      const parts = await db
        .select()
        .from(participacoesProcesso)
        .where(eq(participacoesProcesso.pessoaId, input.id))
        .orderBy(desc(participacoesProcesso.createdAt));
      return { pessoa, participacoes: parts };
    }),

  // === BUSCA ===
  searchForAutocomplete: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      papel: papelEnum.optional(),
      limit: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ input }) => {
      const q = normalizarNome(input.query);
      const rows = await db
        .select({
          id: pessoas.id,
          nome: pessoas.nome,
          nomeNormalizado: pessoas.nomeNormalizado,
          categoriaPrimaria: pessoas.categoriaPrimaria,
          confidence: pessoas.confidence,
        })
        .from(pessoas)
        .where(
          and(
            isNull(pessoas.mergedInto),
            sql`${pessoas.nomeNormalizado} ILIKE ${'%' + q + '%'}`,
          ),
        )
        .limit(input.limit);
      return rows;
    }),

  getByCpf: protectedProcedure
    .input(z.object({ cpf: z.string().min(11) }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(pessoas)
        .where(and(eq(pessoas.cpf, input.cpf), isNull(pessoas.mergedInto)));
      return row ?? null;
    }),

  // === PARTICIPAÇÕES ===
  addParticipacao: protectedProcedure
    .input(z.object({
      pessoaId: z.number(),
      processoId: z.number(),
      papel: papelEnum,
      lado: z.enum(["acusacao", "defesa", "neutro"]).optional(),
      subpapel: z.string().max(40).optional(),
      testemunhaId: z.number().optional(),
      resumoNestaCausa: z.string().optional(),
      observacoesNestaCausa: z.string().optional(),
      fonte: z.enum(["manual", "backfill", "ia-atendimento", "ia-denuncia", "import-pje"]).default("manual"),
      confidence: z.number().min(0).max(1).default(1.0),
    }))
    .mutation(async ({ input }) => {
      try {
        const [row] = await db
          .insert(participacoesProcesso)
          .values({
            pessoaId: input.pessoaId,
            processoId: input.processoId,
            papel: input.papel,
            lado: input.lado ?? null,
            subpapel: input.subpapel ?? null,
            testemunhaId: input.testemunhaId ?? null,
            resumoNestaCausa: input.resumoNestaCausa ?? null,
            observacoesNestaCausa: input.observacoesNestaCausa ?? null,
            fonte: input.fonte,
            confidence: String(input.confidence),
          } as any)
          .returning();
        return row;
      } catch (e: any) {
        if (e?.code === "23505") {
          throw new TRPCError({ code: "CONFLICT", message: "Pessoa já tem esse papel nesse processo" });
        }
        throw e;
      }
    }),

  updateParticipacao: protectedProcedure
    .input(z.object({
      id: z.number(),
      papel: papelEnum.optional(),
      lado: z.enum(["acusacao", "defesa", "neutro"]).nullable().optional(),
      subpapel: z.string().max(40).nullable().optional(),
      testemunhaId: z.number().nullable().optional(),
      resumoNestaCausa: z.string().nullable().optional(),
      observacoesNestaCausa: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const updates: any = { updatedAt: new Date() };
      for (const k of ["papel", "lado", "subpapel", "testemunhaId", "resumoNestaCausa", "observacoesNestaCausa"] as const) {
        if (input[k] !== undefined) updates[k] = input[k];
      }
      const [row] = await db
        .update(participacoesProcesso)
        .set(updates)
        .where(eq(participacoesProcesso.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  removeParticipacao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(participacoesProcesso).where(eq(participacoesProcesso.id, input.id));
      return { ok: true };
    }),

  getParticipacoesDoProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(participacoesProcesso)
        .where(eq(participacoesProcesso.processoId, input.processoId))
        .orderBy(asc(participacoesProcesso.papel));
    }),

  // === MERGE / DEDUP ===
  suggestMerges: protectedProcedure
    .input(z.object({
      pessoaId: z.number().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      if (input.pessoaId) {
        const [p] = await db.select().from(pessoas).where(eq(pessoas.id, input.pessoaId));
        if (!p) return [];
        const candidates = await db
          .select()
          .from(pessoas)
          .where(
            and(
              eq(pessoas.nomeNormalizado, p.nomeNormalizado),
              sql`${pessoas.id} != ${input.pessoaId}`,
              isNull(pessoas.mergedInto),
            ),
          )
          .limit(input.limit);

        const excluded = await db.select().from(pessoasDistinctsConfirmed);
        const excludedIds = new Set(
          excluded
            .filter((r) => r.pessoaAId === input.pessoaId || r.pessoaBId === input.pessoaId)
            .map((r) => (r.pessoaAId === input.pessoaId ? r.pessoaBId : r.pessoaAId)),
        );
        return candidates.filter((c) => !excludedIds.has(c.id));
      }

      // Sem pessoaId: top pares globais por nome_normalizado duplicado
      const rows = await db.execute(sql`
        SELECT p1.id AS a, p2.id AS b, p1.nome_normalizado AS nome
        FROM pessoas p1
        JOIN pessoas p2 ON p1.nome_normalizado = p2.nome_normalizado
          AND p1.id < p2.id
          AND p1.merged_into IS NULL AND p2.merged_into IS NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM pessoas_distincts_confirmed
          WHERE pessoa_a_id = p1.id AND pessoa_b_id = p2.id
        )
        LIMIT ${input.limit}
      `);
      return (rows as any).rows ?? rows;
    }),

  merge: protectedProcedure
    .input(z.object({ fromId: z.number(), intoId: z.number(), reason: z.string().min(3) }))
    .mutation(async ({ input, ctx }) => {
      if (input.fromId === input.intoId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "fromId = intoId" });
      }
      await db
        .update(participacoesProcesso)
        .set({ pessoaId: input.intoId, updatedAt: new Date() })
        .where(eq(participacoesProcesso.pessoaId, input.fromId));

      const [row] = await db
        .update(pessoas)
        .set({
          mergedInto: input.intoId,
          mergeReason: input.reason,
          mergedAt: new Date(),
          mergedBy: ctx.user?.id ?? null,
          updatedAt: new Date(),
        })
        .where(eq(pessoas.id, input.fromId))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return { ok: true };
    }),

  unmerge: protectedProcedure
    .input(z.object({ pessoaId: z.number() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(pessoas)
        .set({
          mergedInto: null,
          mergeReason: null,
          mergedAt: null,
          mergedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(pessoas.id, input.pessoaId))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  markAsDistinct: protectedProcedure
    .input(z.object({ pessoaAId: z.number(), pessoaBId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const [a, b] = input.pessoaAId < input.pessoaBId
        ? [input.pessoaAId, input.pessoaBId]
        : [input.pessoaBId, input.pessoaAId];
      await db
        .insert(pessoasDistinctsConfirmed)
        .values({
          pessoaAId: a,
          pessoaBId: b,
          confirmadoPor: ctx.user?.id ?? null,
        } as any)
        .onConflictDoNothing();
      return { ok: true };
    }),
});
