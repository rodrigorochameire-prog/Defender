import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { sessoesJuri, processos } from "@/lib/db/schema";
import { eq, sql, gte, and } from "drizzle-orm";
import { addDays } from "date-fns";
import { TRPCError } from "@trpc/server";

export const juriRouter = router({
  // Listar todas as sessões do júri
  // Júris são filtrados pela atribuição, não por workspace
  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        defensor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { status, defensor, limit = 50, offset = 0 } = input || {};

      
      let conditions = [];
      
      if (status && status !== "all") {
        conditions.push(eq(sessoesJuri.status, status as any));
      }
      
      if (defensor) {
        conditions.push(eq(sessoesJuri.defensorNome, defensor));
      }

      // Júris são compartilhados (filtrados no frontend pela atribuição)
      
      const result = await db
        .select({
          id: sessoesJuri.id,
          dataSessao: sessoesJuri.dataSessao,
          defensorNome: sessoesJuri.defensorNome,
          assistidoNome: sessoesJuri.assistidoNome,
          status: sessoesJuri.status,
          resultado: sessoesJuri.resultado,
          observacoes: sessoesJuri.observacoes,
          processoId: sessoesJuri.processoId,
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
          },
        })
        .from(sessoesJuri)
        .leftJoin(processos, eq(sessoesJuri.processoId, processos.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sessoesJuri.dataSessao)
        .limit(limit)
        .offset(offset);
      
      return result;
    }),

  // Listar próximas sessões
  proximas: protectedProcedure
    .input(
      z.object({
        dias: z.number().optional(),
        limite: z.number().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { dias, limite } = input || {};

      const hoje = new Date();
      
      // Construir condições WHERE dinamicamente
      const whereConditions = [gte(sessoesJuri.dataSessao, hoje)];
      
      // Adicionar limite de dias apenas se especificado
      if (dias !== undefined) {
        const dataLimite = addDays(hoje, dias);
        whereConditions.push(sql`${sessoesJuri.dataSessao} <= ${dataLimite}`);
      }
      
      let query = db
        .select({
          id: sessoesJuri.id,
          dataSessao: sessoesJuri.dataSessao,
          defensorNome: sessoesJuri.defensorNome,
          assistidoNome: sessoesJuri.assistidoNome,
          status: sessoesJuri.status,
          horario: sessoesJuri.horario,
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
          },
        })
        .from(sessoesJuri)
        .leftJoin(processos, eq(sessoesJuri.processoId, processos.id))
        .where(and(...whereConditions))
        .orderBy(sessoesJuri.dataSessao);
      
      // Adicionar limite apenas se especificado
      if (limite !== undefined) {
        query = query.limit(limite) as any;
      }
      
      const result = await query;
      return result;
    }),

  // Buscar sessão por ID
  // Júris são compartilhados (filtrados no frontend pela atribuição)
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [sessao] = await db
        .select({
          id: sessoesJuri.id,
          processoId: sessoesJuri.processoId,
          dataSessao: sessoesJuri.dataSessao,
          horario: sessoesJuri.horario,
          sala: sessoesJuri.sala,
          defensorId: sessoesJuri.defensorId,
          defensorNome: sessoesJuri.defensorNome,
          assistidoNome: sessoesJuri.assistidoNome,
          status: sessoesJuri.status,
          resultado: sessoesJuri.resultado,
          penaAplicada: sessoesJuri.penaAplicada,
          observacoes: sessoesJuri.observacoes,
          registroCompleto: sessoesJuri.registroCompleto,
          juizPresidente: sessoesJuri.juizPresidente,
          promotor: sessoesJuri.promotor,
          duracaoMinutos: sessoesJuri.duracaoMinutos,
          localFato: sessoesJuri.localFato,
          tipoPenal: sessoesJuri.tipoPenal,
          tesePrincipal: sessoesJuri.tesePrincipal,
          reuPrimario: sessoesJuri.reuPrimario,
          reuIdade: sessoesJuri.reuIdade,
          vitimaGenero: sessoesJuri.vitimaGenero,
          vitimaIdade: sessoesJuri.vitimaIdade,
          usouAlgemas: sessoesJuri.usouAlgemas,
          incidentesProcessuais: sessoesJuri.incidentesProcessuais,
          createdAt: sessoesJuri.createdAt,
          updatedAt: sessoesJuri.updatedAt,
          // Join processo
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            comarca: processos.comarca,
            vara: processos.vara,
          },
        })
        .from(sessoesJuri)
        .leftJoin(processos, eq(sessoesJuri.processoId, processos.id))
        .where(eq(sessoesJuri.id, input.id));

      return sessao || null;
    }),

  // Criar nova sessão do júri
  create: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        dataSessao: z.string(),
        defensorNome: z.string(),
        assistidoNome: z.string(),
        status: z.enum(["AGENDADA", "REALIZADA", "ADIADA", "CANCELADA"]).default("AGENDADA"),
        resultado: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const processo = await db.query.processos.findFirst({
        where: eq(processos.id, input.processoId),
      });

      if (!processo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Processo não encontrado" });
      }

      const [novaSessao] = await db
        .insert(sessoesJuri)
        .values({
          ...input,
          dataSessao: new Date(input.dataSessao),
        })
        .returning();

      return novaSessao;
    }),

  // Atualizar sessão
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        dataSessao: z.string().optional(),
        defensorNome: z.string().optional(),
        status: z.enum(["AGENDADA", "REALIZADA", "ADIADA", "CANCELADA"]).optional(),
        resultado: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, dataSessao, ...data } = input;

      const updateData: any = {
        ...data,
        updatedAt: new Date(),
      };

      if (dataSessao) {
        updateData.dataSessao = new Date(dataSessao);
      }

      const [atualizado] = await db
        .update(sessoesJuri)
        .set(updateData)
        .where(eq(sessoesJuri.id, id))
        .returning();

      return atualizado;
    }),

  // Excluir sessão
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [excluido] = await db
        .delete(sessoesJuri)
        .where(eq(sessoesJuri.id, input.id))
        .returning();

      return excluido;
    }),

  // Estatísticas
  stats: protectedProcedure.query(async () => {
    const [result] = await db
      .select({
        total: sql<number>`count(*)`,
        agendadas: sql<number>`count(*) filter (where ${sessoesJuri.status} = 'agendada')`,
        realizadas: sql<number>`count(*) filter (where ${sessoesJuri.status} = 'realizada')`,
      })
      .from(sessoesJuri);

    return {
      total: Number(result?.total || 0),
      agendadas: Number(result?.agendadas || 0),
      realizadas: Number(result?.realizadas || 0),
    };
  }),
});
