import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { demandas, processos, assistidos } from "@/lib/db/schema";
import { eq, ilike, or, desc, sql, lte, gte, and } from "drizzle-orm";

export const demandasRouter = router({
  // Listar todas as demandas
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        area: z.string().optional(),
        reuPreso: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const { search, status, area, reuPreso, limit = 50, offset = 0 } = input || {};
      
      let conditions = [];
      
      if (search) {
        conditions.push(
          ilike(demandas.ato, `%${search}%`)
        );
      }
      
      if (status && status !== "all") {
        conditions.push(eq(demandas.status, status as any));
      }
      
      if (reuPreso !== undefined) {
        conditions.push(eq(demandas.reuPreso, reuPreso));
      }
      
      const result = await db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          prazo: demandas.prazo,
          dataEntrada: demandas.dataEntrada,
          status: demandas.status,
          prioridade: demandas.prioridade,
          providencias: demandas.providencias,
          reuPreso: demandas.reuPreso,
          processoId: demandas.processoId,
          assistidoId: demandas.assistidoId,
          createdAt: demandas.createdAt,
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            area: processos.area,
          },
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
            statusPrisional: assistidos.statusPrisional,
          },
        })
        .from(demandas)
        .leftJoin(processos, eq(demandas.processoId, processos.id))
        .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
        .orderBy(demandas.prazo)
        .limit(limit)
        .offset(offset);
      
      return result;
    }),

  // Buscar demanda por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [demanda] = await db
        .select()
        .from(demandas)
        .where(eq(demandas.id, input.id));
      
      return demanda || null;
    }),

  // Listar prazos urgentes (próximos 7 dias)
  prazosUrgentes: protectedProcedure
    .input(
      z.object({
        dias: z.number().default(7),
      }).optional()
    )
    .query(async ({ input }) => {
      const { dias = 7 } = input || {};
      const hoje = new Date();
      const limite = new Date();
      limite.setDate(limite.getDate() + dias);
      
      const result = await db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          prazo: demandas.prazo,
          status: demandas.status,
          prioridade: demandas.prioridade,
          reuPreso: demandas.reuPreso,
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            area: processos.area,
          },
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
            statusPrisional: assistidos.statusPrisional,
          },
        })
        .from(demandas)
        .leftJoin(processos, eq(demandas.processoId, processos.id))
        .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
        .where(
          and(
            lte(demandas.prazo, limite.toISOString().split('T')[0]),
            or(
              eq(demandas.status, "2_ATENDER"),
              eq(demandas.status, "4_MONITORAR"),
              eq(demandas.status, "5_FILA"),
              eq(demandas.status, "URGENTE")
            )
          )
        )
        .orderBy(demandas.prazo);
      
      return result;
    }),

  // Criar nova demanda
  create: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        assistidoId: z.number(),
        ato: z.string().min(1),
        prazo: z.string().optional(),
        dataEntrada: z.string().optional(),
        status: z.enum([
          "2_ATENDER", "4_MONITORAR", "5_FILA", "7_PROTOCOLADO", 
          "7_CIENCIA", "7_SEM_ATUACAO", "URGENTE", "CONCLUIDO", "ARQUIVADO"
        ]).default("5_FILA"),
        prioridade: z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE", "REU_PRESO"]).default("NORMAL"),
        providencias: z.string().optional(),
        reuPreso: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const [novaDemanda] = await db
        .insert(demandas)
        .values({
          ...input,
          prazo: input.prazo || null,
          dataEntrada: input.dataEntrada || null,
        })
        .returning();
      
      return novaDemanda;
    }),

  // Atualizar demanda
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        ato: z.string().min(1).optional(),
        prazo: z.string().optional(),
        status: z.enum([
          "2_ATENDER", "4_MONITORAR", "5_FILA", "7_PROTOCOLADO", 
          "7_CIENCIA", "7_SEM_ATUACAO", "URGENTE", "CONCLUIDO", "ARQUIVADO"
        ]).optional(),
        prioridade: z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE", "REU_PRESO"]).optional(),
        providencias: z.string().optional(),
        reuPreso: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      
      const updateData: any = {
        ...data,
        updatedAt: new Date(),
      };
      
      // Se marcado como concluído, registrar data
      if (data.status === "CONCLUIDO") {
        updateData.concluidoEm = new Date();
      }
      
      const [atualizado] = await db
        .update(demandas)
        .set(updateData)
        .where(eq(demandas.id, id))
        .returning();
      
      return atualizado;
    }),

  // Excluir demanda (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [excluido] = await db
        .update(demandas)
        .set({ deletedAt: new Date() })
        .where(eq(demandas.id, input.id))
        .returning();
      
      return excluido;
    }),

  // Estatísticas
  stats: protectedProcedure.query(async () => {
    const total = await db.select({ count: sql<number>`count(*)` }).from(demandas);
    
    const atender = await db
      .select({ count: sql<number>`count(*)` })
      .from(demandas)
      .where(eq(demandas.status, "2_ATENDER"));
    
    const fila = await db
      .select({ count: sql<number>`count(*)` })
      .from(demandas)
      .where(eq(demandas.status, "5_FILA"));
    
    const protocolados = await db
      .select({ count: sql<number>`count(*)` })
      .from(demandas)
      .where(eq(demandas.status, "7_PROTOCOLADO"));
    
    const reuPreso = await db
      .select({ count: sql<number>`count(*)` })
      .from(demandas)
      .where(eq(demandas.reuPreso, true));
    
    return {
      total: Number(total[0]?.count || 0),
      atender: Number(atender[0]?.count || 0),
      fila: Number(fila[0]?.count || 0),
      protocolados: Number(protocolados[0]?.count || 0),
      reuPreso: Number(reuPreso[0]?.count || 0),
    };
  }),
});
