import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { assistidos } from "@/lib/db/schema";
import { eq, ilike, or, desc, sql } from "drizzle-orm";

export const assistidosRouter = router({
  // Listar todos os assistidos
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        statusPrisional: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const { search, statusPrisional, limit = 50, offset = 0 } = input || {};
      
      let query = db.select().from(assistidos);
      
      // Filtros
      const conditions = [];
      
      if (search) {
        conditions.push(
          or(
            ilike(assistidos.nome, `%${search}%`),
            ilike(assistidos.cpf, `%${search}%`)
          )
        );
      }
      
      if (statusPrisional && statusPrisional !== "all") {
        conditions.push(eq(assistidos.statusPrisional, statusPrisional as any));
      }
      
      if (conditions.length > 0) {
        query = query.where(conditions.length === 1 ? conditions[0] : sql`${conditions.join(" AND ")}`);
      }
      
      const result = await query
        .orderBy(desc(assistidos.createdAt))
        .limit(limit)
        .offset(offset);
      
      return result;
    }),

  // Buscar assistido por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [assistido] = await db
        .select()
        .from(assistidos)
        .where(eq(assistidos.id, input.id));
      
      return assistido || null;
    }),

  // Criar novo assistido
  create: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        cpf: z.string().optional(),
        rg: z.string().optional(),
        nomeMae: z.string().optional(),
        dataNascimento: z.string().optional(),
        statusPrisional: z.enum([
          "SOLTO", "CADEIA_PUBLICA", "PENITENCIARIA", "COP", 
          "HOSPITAL_CUSTODIA", "DOMICILIAR", "MONITORADO"
        ]).default("SOLTO"),
        localPrisao: z.string().optional(),
        unidadePrisional: z.string().optional(),
        telefone: z.string().optional(),
        endereco: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [novoAssistido] = await db
        .insert(assistidos)
        .values({
          ...input,
          dataNascimento: input.dataNascimento || null,
        })
        .returning();
      
      return novoAssistido;
    }),

  // Atualizar assistido
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(2).optional(),
        cpf: z.string().optional(),
        rg: z.string().optional(),
        nomeMae: z.string().optional(),
        dataNascimento: z.string().optional(),
        statusPrisional: z.enum([
          "SOLTO", "CADEIA_PUBLICA", "PENITENCIARIA", "COP", 
          "HOSPITAL_CUSTODIA", "DOMICILIAR", "MONITORADO"
        ]).optional(),
        localPrisao: z.string().optional(),
        unidadePrisional: z.string().optional(),
        telefone: z.string().optional(),
        endereco: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      
      const [atualizado] = await db
        .update(assistidos)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(assistidos.id, id))
        .returning();
      
      return atualizado;
    }),

  // Excluir assistido (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [excluido] = await db
        .update(assistidos)
        .set({ deletedAt: new Date() })
        .where(eq(assistidos.id, input.id))
        .returning();
      
      return excluido;
    }),

  // Estatísticas
  stats: protectedProcedure.query(async () => {
    const total = await db.select({ count: sql<number>`count(*)` }).from(assistidos);
    
    // Contagem por status prisional
    const presos = await db
      .select({ count: sql<number>`count(*)` })
      .from(assistidos)
      .where(
        or(
          eq(assistidos.statusPrisional, "CADEIA_PUBLICA"),
          eq(assistidos.statusPrisional, "PENITENCIARIA"),
          eq(assistidos.statusPrisional, "COP"),
          eq(assistidos.statusPrisional, "HOSPITAL_CUSTODIA")
        )
      );
    
    return {
      total: Number(total[0]?.count || 0),
      presos: Number(presos[0]?.count || 0),
    };
  }),
});
