import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db } from "@/lib/db";
import {
  atendimentos,
  assistidos,
  processos,
  assistidosProcessos,
  users,
  plaudConfig,
  plaudRecordings,
} from "@/lib/db/schema";
import { eq, desc, and, like, or, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  getActiveConfig,
  createConfig,
  updateConfig,
  linkRecordingToAtendimento,
  unlinkRecordingFromAtendimento,
  getUnlinkedRecordings,
  getRecordingsByAssistido,
  getRecordingStats,
  getRecentRecordings,
  extractKeyPointsWithAI,
  processApprovedRecording,
} from "@/lib/services/plaud-api";

export const atendimentosRouter = router({
  // ==========================================
  // CRUD DE ATENDIMENTOS
  // ==========================================

  /**
   * Lista atendimentos com filtros
   */
  list: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number().optional(),
        processoId: z.number().optional(),
        status: z.string().optional(),
        tipo: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];

      if (input.assistidoId) {
        conditions.push(eq(atendimentos.assistidoId, input.assistidoId));
      }
      if (input.processoId) {
        conditions.push(eq(atendimentos.processoId, input.processoId));
      }
      if (input.status) {
        conditions.push(eq(atendimentos.status, input.status));
      }
      if (input.tipo) {
        conditions.push(eq(atendimentos.tipo, input.tipo));
      }

      const result = await db
        .select({
          atendimento: atendimentos,
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
            cpf: assistidos.cpf,
          },
          atendidoPor: {
            id: users.id,
            name: users.name,
          },
        })
        .from(atendimentos)
        .leftJoin(assistidos, eq(atendimentos.assistidoId, assistidos.id))
        .leftJoin(users, eq(atendimentos.atendidoPorId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(atendimentos.dataAtendimento))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    }),

  /**
   * Busca atendimento por ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [result] = await db
        .select({
          atendimento: atendimentos,
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
            cpf: assistidos.cpf,
            telefone: assistidos.telefone,
            statusPrisional: assistidos.statusPrisional,
          },
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            area: processos.area,
          },
          atendidoPor: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(atendimentos)
        .leftJoin(assistidos, eq(atendimentos.assistidoId, assistidos.id))
        .leftJoin(processos, eq(atendimentos.processoId, processos.id))
        .leftJoin(users, eq(atendimentos.atendidoPorId, users.id))
        .where(eq(atendimentos.id, input.id))
        .limit(1);

      return result;
    }),

  /**
   * Cria novo atendimento
   */
  create: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number(),
        processoId: z.number().optional(),
        casoId: z.number().optional(),
        dataAtendimento: z.string().transform((s) => new Date(s)),
        tipo: z.string(),
        local: z.string().optional(),
        assunto: z.string().optional(),
        resumo: z.string().optional(),
        status: z.string().default("agendado"),
        workspaceId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [created] = await db
        .insert(atendimentos)
        .values({
          ...input,
          atendidoPorId: ctx.user.id,
        })
        .returning();

      return created;
    }),

  /**
   * Atualiza atendimento
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        assistidoId: z.number().optional(),
        processoId: z.number().optional().nullable(),
        casoId: z.number().optional().nullable(),
        dataAtendimento: z
          .string()
          .transform((s) => new Date(s))
          .optional(),
        duracao: z.number().optional().nullable(),
        tipo: z.string().optional(),
        local: z.string().optional().nullable(),
        assunto: z.string().optional().nullable(),
        resumo: z.string().optional().nullable(),
        status: z.string().optional(),
        acompanhantes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(atendimentos)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(atendimentos.id, id))
        .returning();

      return updated;
    }),

  /**
   * Remove atendimento
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(atendimentos).where(eq(atendimentos.id, input.id));
      return { success: true };
    }),

  // ==========================================
  // TRANSCRIÇÕES E GRAVAÇÕES
  // ==========================================

  /**
   * Atualiza transcrição manualmente
   */
  updateTranscription: protectedProcedure
    .input(
      z.object({
        atendimentoId: z.number(),
        transcricao: z.string(),
        transcricaoResumo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(atendimentos)
        .set({
          transcricao: input.transcricao,
          transcricaoResumo: input.transcricaoResumo,
          transcricaoStatus: "completed",
          updatedAt: new Date(),
        })
        .where(eq(atendimentos.id, input.atendimentoId))
        .returning();

      return updated;
    }),

  /**
   * Extrai pontos-chave da transcrição com IA
   */
  extractKeyPoints: protectedProcedure
    .input(z.object({ atendimentoId: z.number() }))
    .mutation(async ({ input }) => {
      // Busca o atendimento
      const [atendimento] = await db
        .select()
        .from(atendimentos)
        .where(eq(atendimentos.id, input.atendimentoId))
        .limit(1);

      if (!atendimento || !atendimento.transcricao) {
        throw new Error("Atendimento sem transcrição");
      }

      const keyPoints = await extractKeyPointsWithAI(
        input.atendimentoId,
        atendimento.transcricao
      );

      return keyPoints;
    }),

  // ==========================================
  // INTEGRAÇÃO PLAUD
  // ==========================================

  /**
   * Busca configuração ativa do Plaud
   */
  getPlaudConfig: adminProcedure.query(async ({ ctx }) => {
    const config = await getActiveConfig(ctx.user.workspaceId ?? undefined);
    return config;
  }),

  /**
   * Cria/atualiza configuração do Plaud
   */
  savePlaudConfig: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        apiKey: z.string().optional(),
        apiSecret: z.string().optional(),
        deviceId: z.string().optional(),
        deviceName: z.string().optional(),
        deviceModel: z.string().optional(),
        defaultLanguage: z.string().default("pt-BR"),
        autoTranscribe: z.boolean().default(true),
        autoSummarize: z.boolean().default(true),
        autoUploadToDrive: z.boolean().default(true),
        driveFolderId: z.string().optional(),
        isActive: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.id) {
        return await updateConfig(input.id, {
          ...input,
          updatedAt: new Date(),
        });
      }

      return await createConfig({
        ...input,
        workspaceId: ctx.user.workspaceId,
        createdById: ctx.user.id,
      });
    }),

  /**
   * Inicia gravação no Plaud — cria atendimento em estado "awaiting_plaud"
   * para auto-vinculação quando o webhook do Plaud chegar.
   */
  startPlaudRecording: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number(),
        processoId: z.number().optional().nullable(),
        casoId: z.number().optional().nullable(),
        tipo: z.string().default("presencial"),
        descricao: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const workspaceId = ctx.user.workspaceId;

      // 1. Limpar qualquer "awaiting_plaud" anterior do mesmo workspace
      if (workspaceId) {
        await db
          .update(atendimentos)
          .set({ transcricaoStatus: "pending", updatedAt: new Date() })
          .where(
            and(
              eq(atendimentos.transcricaoStatus, "awaiting_plaud"),
              eq(atendimentos.workspaceId, workspaceId)
            )
          );
      }

      // 2. Criar atendimento com status "awaiting_plaud"
      const [atendimento] = await db
        .insert(atendimentos)
        .values({
          assistidoId: input.assistidoId,
          processoId: input.processoId ?? null,
          casoId: input.casoId ?? null,
          workspaceId,
          dataAtendimento: new Date(),
          tipo: input.tipo,
          descricao: input.descricao,
          status: "realizado",
          transcricaoStatus: "awaiting_plaud",
          atendidoPorId: ctx.user.id,
        })
        .returning();

      return { atendimentoId: atendimento.id };
    }),

  /**
   * Lista gravações não vinculadas
   */
  unlinkedRecordings: protectedProcedure.query(async ({ ctx }) => {
    const config = await getActiveConfig(ctx.user.workspaceId ?? undefined);
    if (!config) return [];

    return await getUnlinkedRecordings(config.id);
  }),

  /**
   * Lista gravações recentes
   */
  recentRecordings: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      return await getRecentRecordings(input.limit);
    }),

  /**
   * Vincula gravação a atendimento
   */
  linkRecording: protectedProcedure
    .input(
      z.object({
        recordingId: z.number(),
        atendimentoId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await linkRecordingToAtendimento(input.recordingId, input.atendimentoId);
    }),

  /**
   * Desvincula gravação de atendimento
   */
  unlinkRecording: protectedProcedure
    .input(z.object({ recordingId: z.number() }))
    .mutation(async ({ input }) => {
      return await unlinkRecordingFromAtendimento(input.recordingId);
    }),

  /**
   * Busca gravações de um assistido
   */
  recordingsByAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      return await getRecordingsByAssistido(input.assistidoId);
    }),

  /**
   * Estatísticas de gravações
   */
  recordingStats: adminProcedure.query(async ({ ctx }) => {
    const config = await getActiveConfig(ctx.user.workspaceId ?? undefined);
    if (!config) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        linked: 0,
        unlinked: 0,
        totalDuration: 0,
        averageDuration: 0,
      };
    }

    return await getRecordingStats(config.id);
  }),

  // ==========================================
  // BUSCA PARA VINCULAÇÃO
  // ==========================================

  /**
   * Busca assistidos para vincular em atendimento
   */
  searchAssistidos: protectedProcedure
    .input(z.object({ search: z.string() }))
    .query(async ({ input }) => {
      if (input.search.length < 2) return [];

      return await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          cpf: assistidos.cpf,
          statusPrisional: assistidos.statusPrisional,
        })
        .from(assistidos)
        .where(
          or(
            like(assistidos.nome, `%${input.search}%`),
            like(assistidos.cpf ?? "", `%${input.search}%`)
          )
        )
        .limit(10);
    }),

  /**
   * Busca processos de um assistido
   */
  searchProcessos: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      return await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          area: processos.area,
          situacao: processos.situacao,
        })
        .from(processos)
        .where(eq(processos.assistidoId, input.assistidoId))
        .orderBy(desc(processos.createdAt));
    }),

  // ==========================================
  // ESTATÍSTICAS
  // ==========================================

  /**
   * Estatísticas de atendimentos
   */
  stats: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number().optional(),
        periodo: z.enum(["semana", "mes", "ano"]).default("mes"),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];

      if (input.assistidoId) {
        conditions.push(eq(atendimentos.assistidoId, input.assistidoId));
      }

      // Calcula data de início do período
      const now = new Date();
      let startDate: Date;
      switch (input.periodo) {
        case "semana":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "mes":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "ano":
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      const result = await db
        .select({
          total: sql<number>`count(*)::int`,
          realizados: sql<number>`count(*) filter (where ${atendimentos.status} = 'realizado')::int`,
          agendados: sql<number>`count(*) filter (where ${atendimentos.status} = 'agendado')::int`,
          cancelados: sql<number>`count(*) filter (where ${atendimentos.status} = 'cancelado')::int`,
          comTranscricao: sql<number>`count(*) filter (where ${atendimentos.transcricaoStatus} = 'completed')::int`,
          duracaoMedia: sql<number>`avg(${atendimentos.duracao})::int`,
        })
        .from(atendimentos)
        .where(
          and(
            ...(conditions.length > 0 ? conditions : []),
            sql`${atendimentos.dataAtendimento} >= ${startDate}`
          )
        );

      return result[0];
    }),

  /**
   * Atendimentos por tipo (para gráfico)
   */
  byTipo: protectedProcedure.query(async () => {
    const result = await db
      .select({
        tipo: atendimentos.tipo,
        count: sql<number>`count(*)::int`,
      })
      .from(atendimentos)
      .groupBy(atendimentos.tipo);

    return result;
  }),

  /**
   * Atendimentos recentes de um assistido
   */
  recentByAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number(), limit: z.number().default(5) }))
    .query(async ({ input }) => {
      return await db
        .select({
          id: atendimentos.id,
          dataAtendimento: atendimentos.dataAtendimento,
          tipo: atendimentos.tipo,
          assunto: atendimentos.assunto,
          status: atendimentos.status,
          temTranscricao: sql<boolean>`${atendimentos.transcricao} is not null`,
          atendidoPor: users.name,
        })
        .from(atendimentos)
        .leftJoin(users, eq(atendimentos.atendidoPorId, users.id))
        .where(eq(atendimentos.assistidoId, input.assistidoId))
        .orderBy(desc(atendimentos.dataAtendimento))
        .limit(input.limit);
    }),

  // ==========================================
  // FLUXO DE APROVAÇÃO DE GRAVAÇÕES PLAUD
  // ==========================================

  /**
   * Lista gravações pendentes de revisão
   */
  pendingRecordings: protectedProcedure.query(async () => {
    return db.select().from(plaudRecordings)
      .where(eq(plaudRecordings.status, "pending_review"))
      .orderBy(desc(plaudRecordings.createdAt));
  }),

  /**
   * Rejeita e remove permanentemente uma gravação
   */
  rejectRecording: protectedProcedure
    .input(z.object({ recordingId: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(plaudRecordings)
        .where(eq(plaudRecordings.id, input.recordingId));
      return { success: true };
    }),

  /**
   * Aprova gravação: vincula a assistido/processo/atendimento,
   * salva metadados do interlocutor e dispara pipeline pós-aprovação
   */
  approveRecording: protectedProcedure
    .input(z.object({
      recordingId: z.number(),
      assistidoId: z.number(),
      processoId: z.number().optional(),
      atendimentoId: z.number().optional(),
      novoAtendimento: z.object({
        tipo: z.string(),
        descricao: z.string().optional(),
      }).optional(),
      interlocutor: z.object({
        tipo: z.enum(["assistido", "testemunha", "familiar", "vitima", "perito", "outro"]),
        observacao: z.string().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Find the pending recording
      const [recording] = await db.select().from(plaudRecordings)
        .where(and(
          eq(plaudRecordings.id, input.recordingId),
          eq(plaudRecordings.status, "pending_review")
        ))
        .limit(1);

      if (!recording) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Gravação não encontrada ou já processada" });
      }

      let atendimentoId = input.atendimentoId;

      // 2. Create new atendimento if needed
      if (!atendimentoId && input.novoAtendimento) {
        const [novo] = await db.insert(atendimentos).values({
          assistidoId: input.assistidoId,
          processoId: input.processoId || null,
          workspaceId: ctx.user.workspaceId,
          dataAtendimento: new Date(),
          tipo: input.novoAtendimento.tipo,
          descricao: input.novoAtendimento.descricao || null,
          status: "realizado",
          transcricaoStatus: "completed",
          atendidoPorId: ctx.user.id,
        }).returning();
        atendimentoId = novo.id;
      }

      // 3. Update recording with all links and metadata
      const interlocutorData = {
        ...(recording.rawPayload as Record<string, unknown> || {}),
        interlocutor: input.interlocutor,
      };

      await db.update(plaudRecordings).set({
        status: "completed",
        assistidoId: input.assistidoId,
        processoId: input.processoId || null,
        atendimentoId: atendimentoId || null,
        rawPayload: interlocutorData,
        updatedAt: new Date(),
      }).where(eq(plaudRecordings.id, input.recordingId));

      // 4. Update atendimento with transcription data if linked
      if (atendimentoId) {
        await db.update(atendimentos).set({
          plaudRecordingId: recording.plaudRecordingId,
          plaudDeviceId: recording.plaudDeviceId,
          transcricao: recording.transcription,
          transcricaoResumo: recording.summary,
          transcricaoStatus: "completed",
          updatedAt: new Date(),
        }).where(eq(atendimentos.id, atendimentoId));
      }

      // 5. Fire-and-forget: post-approval pipeline (Drive upload + enrichment)
      processApprovedRecording(
        input.recordingId,
        input.assistidoId,
        atendimentoId || null,
        input.processoId || null
      ).catch((err) => {
        console.error(`[Plaud] Erro no pipeline pós-aprovação:`, err);
      });

      return { success: true, recordingId: input.recordingId, atendimentoId };
    }),

  /**
   * Busca processos vinculados a um assistido via tabela de junção
   */
  processosByAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      const results = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          assunto: processos.assunto,
          vara: processos.vara,
          fase: processos.fase,
          area: processos.area,
          atribuicao: processos.atribuicao,
          papel: assistidosProcessos.papel,
          isPrincipal: assistidosProcessos.isPrincipal,
        })
        .from(assistidosProcessos)
        .innerJoin(processos, eq(assistidosProcessos.processoId, processos.id))
        .where(eq(assistidosProcessos.assistidoId, input.assistidoId))
        .orderBy(desc(assistidosProcessos.isPrincipal));

      return results;
    }),
});
