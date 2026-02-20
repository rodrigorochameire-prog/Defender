import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { processos, assistidos, assistidosProcessos, audiencias, movimentacoes, demandas, calendarEvents, driveFiles, users } from "@/lib/db/schema";
import { eq, ilike, or, desc, asc, sql, and, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { TRPCError } from "@trpc/server";
import { getWorkspaceScope } from "../workspace";

export const processosRouter = router({
  // Listar todos os processos
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        area: z.string().optional(),
        isJuri: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, area, isJuri, limit = 50, offset = 0 } = input || {};
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      
      let conditions = [];
      
      if (search) {
        conditions.push(
          or(
            ilike(processos.numeroAutos, `%${search}%`),
            ilike(processos.assunto, `%${search}%`)
          )
        );
      }
      
      if (area && area !== "all") {
        conditions.push(eq(processos.area, area as any));
      }
      
      if (isJuri !== undefined) {
        conditions.push(eq(processos.isJuri, isJuri));
      }

      if (!isAdmin) {
        conditions.push(eq(processos.workspaceId, workspaceId));
      }
      
      const result = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          comarca: processos.comarca,
          vara: processos.vara,
          area: processos.area,
          classeProcessual: processos.classeProcessual,
          assunto: processos.assunto,
          isJuri: processos.isJuri,
          assistidoId: processos.assistidoId,
          situacao: processos.situacao,
          createdAt: processos.createdAt,
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
            statusPrisional: assistidos.statusPrisional,
          },
        })
        .from(processos)
        .leftJoin(assistidos, eq(processos.assistidoId, assistidos.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(processos.createdAt))
        .limit(limit)
        .offset(offset);
      
      return result;
    }),

  // Buscar processo por ID (enriquecido)
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      const baseConditions = [eq(processos.id, input.id)];
      if (!isAdmin) {
        baseConditions.push(eq(processos.workspaceId, workspaceId));
      }

      // Alias para assistidos na query de demandas (evita conflito de nome com o join de partes)
      const assistidosDemanda = alias(assistidos, "assistidos_demanda");

      const [baseRows, assistidosRows, audienciasRows, demandasRows, driveFilesRows] =
        await Promise.all([
          // Base
          db
            .select()
            .from(processos)
            .where(and(...baseConditions))
            .limit(1),

          // Partes (assistidos vinculados via assistidosProcessos)
          db
            .select({
              id: assistidos.id,
              nome: assistidos.nome,
              cpf: assistidos.cpf,
              papel: assistidosProcessos.papel,
              isPrincipal: assistidosProcessos.isPrincipal,
              statusPrisional: assistidos.statusPrisional,
            })
            .from(assistidosProcessos)
            .innerJoin(assistidos, eq(assistidosProcessos.assistidoId, assistidos.id))
            .where(
              and(
                eq(assistidosProcessos.processoId, input.id),
                isNull(assistidos.deletedAt),
              ),
            ),

          // Audiências
          db
            .select({
              id: audiencias.id,
              dataAudiencia: audiencias.dataAudiencia,
              tipo: audiencias.tipo,
              local: audiencias.local,
              status: audiencias.status,
              resultado: audiencias.resultado,
            })
            .from(audiencias)
            .where(eq(audiencias.processoId, input.id))
            .orderBy(desc(audiencias.dataAudiencia)),

          // Demandas — todos defensores (sem filtro por defensorId)
          db
            .select({
              id: demandas.id,
              ato: demandas.ato,
              tipoAto: demandas.tipoAto,
              status: demandas.status,
              prazo: demandas.prazo,
              assistidoId: demandas.assistidoId,
              assistidoNome: assistidosDemanda.nome,
              defensorId: demandas.defensorId,
              defensorNome: users.name,
            })
            .from(demandas)
            .leftJoin(users, eq(demandas.defensorId, users.id))
            .leftJoin(assistidosDemanda, eq(demandas.assistidoId, assistidosDemanda.id))
            .where(
              and(
                eq(demandas.processoId, input.id),
                isNull(demandas.deletedAt),
              ),
            )
            .orderBy(asc(demandas.prazo)),

          // Drive files (processoId = input.id)
          db
            .select({
              id: driveFiles.id,
              name: driveFiles.name,
              mimeType: driveFiles.mimeType,
              webViewLink: driveFiles.webViewLink,
              lastModifiedTime: driveFiles.lastModifiedTime,
              isFolder: driveFiles.isFolder,
              parentFileId: driveFiles.parentFileId,
              driveFolderId: driveFiles.driveFolderId,
            })
            .from(driveFiles)
            .where(eq(driveFiles.processoId, input.id))
            .orderBy(desc(driveFiles.lastModifiedTime))
            .limit(100),
        ]);

      if (baseRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Processo não encontrado" });
      }

      const base = baseRows[0]!;

      // Processos vinculados (mesmo casoId, exceto o atual)
      const processosVinculados = base.casoId
        ? await db
            .select({
              id: processos.id,
              numeroAutos: processos.numeroAutos,
              vara: processos.vara,
              assunto: processos.assunto,
            })
            .from(processos)
            .where(
              and(
                eq(processos.casoId, base.casoId),
                ne(processos.id, input.id),
                isNull(processos.deletedAt),
              ),
            )
        : [];

      return {
        ...base,
        assistidos: assistidosRows,
        audiencias: audienciasRows,
        demandas: demandasRows,
        driveFiles: driveFilesRows,
        processosVinculados,
      };
    }),

  // Criar novo processo
  create: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number(),
        numeroAutos: z.string().min(1),
        comarca: z.string().optional(),
        vara: z.string().optional(),
        area: z.enum([
          "JURI", "EXECUCAO_PENAL", "VIOLENCIA_DOMESTICA", 
          "SUBSTITUICAO", "CURADORIA", "FAMILIA", "CIVEL", "FAZENDA_PUBLICA"
        ]),
        classeProcessual: z.string().optional(),
        assunto: z.string().optional(),
        isJuri: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const assistido = await db.query.assistidos.findFirst({
        where: eq(assistidos.id, input.assistidoId),
      });

      if (!assistido) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assistido não encontrado" });
      }

      if (!assistido.workspaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assistido sem workspace atribuído.",
        });
      }

      if (!isAdmin && assistido.workspaceId !== workspaceId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem acesso ao workspace deste assistido.",
        });
      }

      const [novoProcesso] = await db
        .insert(processos)
        .values({
          ...input,
          workspaceId: assistido.workspaceId,
        })
        .returning();
      
      return novoProcesso;
    }),

  // Atualizar processo
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        numeroAutos: z.string().min(1).optional(),
        comarca: z.string().optional(),
        vara: z.string().optional(),
        area: z.enum([
          "JURI", "EXECUCAO_PENAL", "VIOLENCIA_DOMESTICA", 
          "SUBSTITUICAO", "CURADORIA", "FAMILIA", "CIVEL", "FAZENDA_PUBLICA"
        ]).optional(),
        classeProcessual: z.string().optional(),
        assunto: z.string().optional(),
        isJuri: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      
      const [atualizado] = await db
        .update(processos)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          isAdmin
            ? eq(processos.id, id)
            : and(eq(processos.id, id), eq(processos.workspaceId, workspaceId))
        )
        .returning();
      
      return atualizado;
    }),

  // Excluir processo (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      const [excluido] = await db
        .update(processos)
        .set({ deletedAt: new Date() })
        .where(
          isAdmin
            ? eq(processos.id, input.id)
            : and(eq(processos.id, input.id), eq(processos.workspaceId, workspaceId))
        )
        .returning();
      
      return excluido;
    }),

  // Estatísticas
  stats: protectedProcedure.query(async ({ ctx }) => {
    const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
    const baseCondition = isAdmin ? undefined : eq(processos.workspaceId, workspaceId);

    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(processos)
      .where(baseCondition);
    
    const juris = await db
      .select({ count: sql<number>`count(*)` })
      .from(processos)
      .where(
        baseCondition
          ? and(baseCondition, eq(processos.isJuri, true))
          : eq(processos.isJuri, true)
      );
    
    return {
      total: Number(total[0]?.count || 0),
      juris: Number(juris[0]?.count || 0),
    };
  }),

  // Timeline do processo - busca atos principais
  timeline: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      const { processoId } = input;
      
      // Buscar audiências do processo
      const audienciasResult = await db
        .select({
          id: audiencias.id,
          data: audiencias.dataAudiencia,
          tipo: audiencias.tipo,
          titulo: audiencias.titulo,
          status: audiencias.status,
          local: audiencias.local,
        })
        .from(audiencias)
        .where(eq(audiencias.processoId, processoId))
        .orderBy(desc(audiencias.dataAudiencia));
      
      // Buscar movimentações do processo
      const movimentacoesResult = await db
        .select({
          id: movimentacoes.id,
          data: movimentacoes.dataMovimentacao,
          tipo: movimentacoes.tipo,
          descricao: movimentacoes.descricao,
        })
        .from(movimentacoes)
        .where(eq(movimentacoes.processoId, processoId))
        .orderBy(desc(movimentacoes.dataMovimentacao));
      
      // Buscar demandas do processo
      const demandasResult = await db
        .select({
          id: demandas.id,
          data: demandas.dataExpedicao,
          tipo: demandas.tipo,
          status: demandas.status,
          providencias: demandas.providencias,
        })
        .from(demandas)
        .where(and(
          eq(demandas.processoId, processoId),
          isNull(demandas.deletedAt)
        ))
        .orderBy(desc(demandas.dataExpedicao));
      
      // Buscar eventos do calendário relacionados ao processo
      const eventosResult = await db
        .select({
          id: calendarEvents.id,
          data: calendarEvents.eventDate,
          tipo: calendarEvents.eventType,
          titulo: calendarEvents.title,
        })
        .from(calendarEvents)
        .where(eq(calendarEvents.processoId, processoId))
        .orderBy(desc(calendarEvents.eventDate));
      
      // Consolidar todos os atos em uma timeline única
      const timeline: Array<{
        id: number;
        data: Date;
        tipo: string;
        categoria: "audiencia" | "movimentacao" | "demanda" | "evento";
        titulo: string;
        descricao?: string;
        status?: string;
      }> = [];
      
      // Adicionar audiências
      audienciasResult.forEach(a => {
        timeline.push({
          id: a.id,
          data: a.data,
          tipo: a.tipo || "audiencia",
          categoria: "audiencia",
          titulo: a.titulo || `Audiência de ${a.tipo || "instrução"}`,
          status: a.status || undefined,
        });
      });
      
      // Adicionar movimentações
      movimentacoesResult.forEach(m => {
        timeline.push({
          id: m.id,
          data: m.data,
          tipo: m.tipo || "movimentacao",
          categoria: "movimentacao",
          titulo: m.descricao,
          descricao: m.tipo || undefined,
        });
      });
      
      // Adicionar demandas importantes (apenas as com status relevante)
      demandasResult.forEach(d => {
        timeline.push({
          id: d.id,
          data: d.data,
          tipo: d.tipo || "demanda",
          categoria: "demanda",
          titulo: d.providencias || `Demanda - ${d.tipo || "geral"}`,
          status: d.status || undefined,
        });
      });
      
      // Adicionar eventos do calendário
      eventosResult.forEach(e => {
        timeline.push({
          id: e.id,
          data: e.data,
          tipo: e.tipo || "evento",
          categoria: "evento",
          titulo: e.titulo || "Evento",
        });
      });
      
      // Ordenar por data (mais recente primeiro)
      timeline.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      
      // Retornar os 10 atos mais recentes/importantes
      return timeline.slice(0, 10);
    }),
});
