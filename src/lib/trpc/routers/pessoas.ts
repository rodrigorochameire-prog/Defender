import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { pessoas } from "@/lib/db/schema";
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
      // Participações serão populadas na Task 5 — por enquanto retorna vazio
      return { pessoa, participacoes: [] as any[] };
    }),
});
