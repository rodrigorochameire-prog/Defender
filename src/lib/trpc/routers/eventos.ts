/**
 * Router de Eventos
 *
 * Este router é um alias para o router de audiências, fornecendo uma interface
 * compatível com os componentes de UI (daily-progress, status-bar).
 *
 * Eventos são audiências, sessões de júri e outros compromissos agendados.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db, audiencias, processos, assistidos, sessoesJuri } from "@/lib/db";
import { eq, and, gte, lte, desc, asc, isNull, or, sql } from "drizzle-orm";

export const eventosRouter = router({
  /**
   * Listar eventos
   *
   * Combina audiências e sessões de júri em uma única lista de eventos
   * para uso nos componentes de UI (daily-progress, status-bar).
   */
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().default(0),
      dataInicio: z.string().optional(), // ISO string
      dataFim: z.string().optional(), // ISO string
      orderBy: z.enum(["data", "createdAt"]).optional().default("data"),
      orderDirection: z.enum(["asc", "desc"]).optional().default("asc"),
    }).optional())
    .query(async ({ input }) => {
      const {
        limit = 50,
        offset = 0,
        dataInicio,
        dataFim,
        orderBy = "data",
        orderDirection = "asc",
      } = input || {};

      // Buscar audiências
      const whereConditions = [];

      if (dataInicio) {
        whereConditions.push(gte(audiencias.dataAudiencia, new Date(dataInicio)));
      }

      if (dataFim) {
        whereConditions.push(lte(audiencias.dataAudiencia, new Date(dataFim)));
      }

      const orderFn = orderDirection === "asc" ? asc : desc;

      const audienciasResult = await db
        .select({
          id: audiencias.id,
          tipo: sql<string>`'audiencia'`.as("tipo"),
          titulo: audiencias.titulo,
          data: audiencias.dataAudiencia,
          local: audiencias.local,
          status: audiencias.status,
          processoId: audiencias.processoId,
          assistidoId: audiencias.assistidoId,
          processo: {
            id: processos.id,
            numero: processos.numeroAutos,
          },
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
          },
        })
        .from(audiencias)
        .leftJoin(processos, eq(audiencias.processoId, processos.id))
        .leftJoin(assistidos, eq(audiencias.assistidoId, assistidos.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(orderFn(audiencias.dataAudiencia))
        .limit(limit)
        .offset(offset);

      // Mapear para formato de evento
      const items = audienciasResult.map(a => ({
        id: a.id,
        tipo: "audiencia",
        titulo: a.titulo || `Audiência - ${a.processo?.numero || 'Processo'}`,
        data: a.data,
        local: a.local,
        status: a.status || "AGENDADO",
        processoId: a.processoId,
        assistidoId: a.assistidoId,
        processo: a.processo,
        assistido: a.assistido,
      }));

      return {
        items,
        total: items.length,
      };
    }),

  /**
   * Buscar evento por ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [audiencia] = await db
        .select({
          id: audiencias.id,
          tipo: sql<string>`'audiencia'`.as("tipo"),
          titulo: audiencias.titulo,
          data: audiencias.dataAudiencia,
          local: audiencias.local,
          status: audiencias.status,
          processoId: audiencias.processoId,
          assistidoId: audiencias.assistidoId,
        })
        .from(audiencias)
        .where(eq(audiencias.id, input.id))
        .limit(1);

      return audiencia || null;
    }),
});
