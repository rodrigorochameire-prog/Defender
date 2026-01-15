import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { assistidos } from "@/lib/db/schema";
import { eq, ilike, or, desc, sql, and, isNull } from "drizzle-orm";

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
      
      // Construir condições
      const conditions = [isNull(assistidos.deletedAt)];
      
      if (search) {
        conditions.push(
          or(
            ilike(assistidos.nome, `%${search}%`),
            ilike(assistidos.cpf || "", `%${search}%`)
          )!
        );
      }
      
      if (statusPrisional && statusPrisional !== "all") {
        conditions.push(eq(assistidos.statusPrisional, statusPrisional as any));
      }
      
      const result = await db
        .select()
        .from(assistidos)
        .where(and(...conditions))
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
        nomePai: z.string().optional(),
        dataNascimento: z.string().optional(),
        naturalidade: z.string().optional(),
        nacionalidade: z.string().optional(),
        statusPrisional: z.enum([
          "SOLTO", "CADEIA_PUBLICA", "PENITENCIARIA", "COP", 
          "HOSPITAL_CUSTODIA", "DOMICILIAR", "MONITORADO"
        ]).default("SOLTO"),
        localPrisao: z.string().optional(),
        unidadePrisional: z.string().optional(),
        dataPrisao: z.string().optional(),
        telefone: z.string().optional(),
        telefoneContato: z.string().optional(),
        nomeContato: z.string().optional(),
        parentescoContato: z.string().optional(),
        endereco: z.string().optional(),
        observacoes: z.string().optional(),
        defensorId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [novoAssistido] = await db
        .insert(assistidos)
        .values({
          nome: input.nome,
          cpf: input.cpf || null,
          rg: input.rg || null,
          nomeMae: input.nomeMae || null,
          nomePai: input.nomePai || null,
          dataNascimento: input.dataNascimento || null,
          naturalidade: input.naturalidade || null,
          nacionalidade: input.nacionalidade || "Brasileira",
          statusPrisional: input.statusPrisional,
          localPrisao: input.localPrisao || null,
          unidadePrisional: input.unidadePrisional || null,
          dataPrisao: input.dataPrisao || null,
          telefone: input.telefone || null,
          telefoneContato: input.telefoneContato || null,
          nomeContato: input.nomeContato || null,
          parentescoContato: input.parentescoContato || null,
          endereco: input.endereco || null,
          observacoes: input.observacoes || null,
          defensorId: input.defensorId || ctx.user.id,
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
        nomePai: z.string().optional(),
        dataNascimento: z.string().optional(),
        naturalidade: z.string().optional(),
        nacionalidade: z.string().optional(),
        statusPrisional: z.enum([
          "SOLTO", "CADEIA_PUBLICA", "PENITENCIARIA", "COP", 
          "HOSPITAL_CUSTODIA", "DOMICILIAR", "MONITORADO"
        ]).optional(),
        localPrisao: z.string().optional(),
        unidadePrisional: z.string().optional(),
        dataPrisao: z.string().optional(),
        telefone: z.string().optional(),
        telefoneContato: z.string().optional(),
        nomeContato: z.string().optional(),
        parentescoContato: z.string().optional(),
        endereco: z.string().optional(),
        observacoes: z.string().optional(),
        defensorId: z.number().optional(),
        photoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      
      // Só incluir campos que foram enviados
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updateData[key] = value;
        }
      });
      
      const [atualizado] = await db
        .update(assistidos)
        .set(updateData)
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
    const total = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assistidos)
      .where(isNull(assistidos.deletedAt));
    
    // Contagem por status prisional (presos)
    const presos = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assistidos)
      .where(
        and(
          isNull(assistidos.deletedAt),
          or(
            eq(assistidos.statusPrisional, "CADEIA_PUBLICA"),
            eq(assistidos.statusPrisional, "PENITENCIARIA"),
            eq(assistidos.statusPrisional, "COP"),
            eq(assistidos.statusPrisional, "HOSPITAL_CUSTODIA")
          )
        )
      );
    
    // Contagem soltos
    const soltos = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assistidos)
      .where(
        and(
          isNull(assistidos.deletedAt),
          or(
            eq(assistidos.statusPrisional, "SOLTO"),
            eq(assistidos.statusPrisional, "DOMICILIAR"),
            eq(assistidos.statusPrisional, "MONITORADO")
          )
        )
      );
    
    return {
      total: Number(total[0]?.count || 0),
      presos: Number(presos[0]?.count || 0),
      soltos: Number(soltos[0]?.count || 0),
    };
  }),
});
