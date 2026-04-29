import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, withTransaction } from "@/lib/db";
import {
  atendimentos,
  assistidos,
  processos,
  assistidosProcessos,
  users,
  plaudConfig,
  plaudRecordings,
} from "@/lib/db/schema";
import { eq, desc, and, like, or, isNull, sql, inArray } from "drizzle-orm";
import { getParceirosIds } from "@/lib/trpc/comarca-scope";
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
import { autoVincularAtendimentoADemandas } from "./demanda-eventos";

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
        status: z.union([z.string(), z.array(z.string())]).optional(),
        tipo: z.union([z.string(), z.array(z.string())]).optional(),
        interlocutor: z.enum(["assistido", "familiar", "testemunha", "outro"]).optional(),
        hasRecording: z.boolean().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const conditions = [];

      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin) {
        const parceirosIds = await getParceirosIds(ctx.user.id);
        const defensoresVisiveis = [ctx.user.id, ...parceirosIds];
        conditions.push(inArray(atendimentos.autorId, defensoresVisiveis));
      }

      if (input.assistidoId) {
        conditions.push(eq(atendimentos.assistidoId, input.assistidoId));
      }
      if (input.processoId) {
        conditions.push(eq(atendimentos.processoId, input.processoId));
      }
      if (input.status) {
        const statuses = Array.isArray(input.status) ? input.status : [input.status];
        conditions.push(inArray(atendimentos.status, statuses));
      }
      if (input.tipo) {
        const tipos = Array.isArray(input.tipo) ? input.tipo : [input.tipo];
        conditions.push(inArray(atendimentos.tipo, tipos));
      }
      if (input.interlocutor) {
        conditions.push(eq(atendimentos.interlocutor, input.interlocutor));
      }
      if (input.hasRecording) {
        conditions.push(
          or(
            sql`${atendimentos.audioUrl} IS NOT NULL`,
            sql`${atendimentos.plaudRecordingId} IS NOT NULL`
          )!
        );
      }
      if (input.dateFrom) {
        conditions.push(sql`${atendimentos.dataRegistro} >= ${new Date(input.dateFrom)}`);
      }
      if (input.dateTo) {
        conditions.push(sql`${atendimentos.dataRegistro} <= ${new Date(input.dateTo)}`);
      }

      const result = await db
        .select({
          atendimento: {
            id: atendimentos.id,
            assistidoId: atendimentos.assistidoId,
            processoId: atendimentos.processoId,
            casoId: atendimentos.casoId,
            dataRegistro: atendimentos.dataRegistro,
            duracao: atendimentos.duracao,
            tipo: atendimentos.tipo,
            local: atendimentos.local,
            assunto: atendimentos.assunto,
            resumo: atendimentos.conteudo,
            acompanhantes: atendimentos.acompanhantes,
            status: atendimentos.status,
            enrichmentStatus: atendimentos.enrichmentStatus,
            transcricaoStatus: atendimentos.transcricaoStatus,
            autorId: atendimentos.autorId,
            pontosChave: atendimentos.pontosChave,
            plaudRecordingId: atendimentos.plaudRecordingId,
            audioUrl: atendimentos.audioUrl,
            audioDriveFileId: atendimentos.audioDriveFileId,
            interlocutor: atendimentos.interlocutor,
            createdAt: atendimentos.createdAt,
            updatedAt: atendimentos.updatedAt,
          },
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
        .leftJoin(users, eq(atendimentos.autorId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(atendimentos.dataRegistro))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(atendimentos)
        .leftJoin(assistidos, eq(atendimentos.assistidoId, assistidos.id))
        .leftJoin(users, eq(atendimentos.autorId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return { items: result, total: countResult?.count ?? 0 };
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
        .leftJoin(users, eq(atendimentos.autorId, users.id))
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
        dataRegistro: z.string().transform((s) => new Date(s)),
        tipo: z.string(),
        local: z.string().optional(),
        assunto: z.string().optional(),
        conteudo: z.string().optional(),
        duracao: z.number().optional(),
        acompanhantes: z.string().optional(),
        status: z.string().default("agendado"),
        interlocutor: z.enum(["assistido", "familiar", "testemunha", "outro"]).default("assistido"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [created] = await db
        .insert(atendimentos)
        .values({
          ...input,
          autorId: ctx.user.id,
        })
        .returning();

      if (created.processoId) {
        await autoVincularAtendimentoADemandas({
          atendimentoId: created.id,
          processoId: created.processoId,
          autorId: ctx.user.id,
          resumoBase: created.assunto || "Atendimento",
        });
      }

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
        dataRegistro: z
          .string()
          .transform((s) => new Date(s))
          .optional(),
        duracao: z.number().optional().nullable(),
        tipo: z.string().optional(),
        local: z.string().optional().nullable(),
        assunto: z.string().optional().nullable(),
        conteudo: z.string().optional().nullable(),
        status: z.string().optional(),
        acompanhantes: z.string().optional().nullable(),
        interlocutor: z.enum(["assistido", "familiar", "testemunha", "outro"]).optional(),
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
      // Busca apenas a transcrição (evita carregar JSONB pesados: enrichmentData, pontosChave etc.)
      const [atendimento] = await db
        .select({
          id: atendimentos.id,
          transcricao: atendimentos.transcricao,
        })
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
    const config = await getActiveConfig();
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

      // 1. Limpar qualquer "awaiting_plaud" anterior
      await db
        .update(atendimentos)
        .set({ transcricaoStatus: "pending", updatedAt: new Date() })
        .where(eq(atendimentos.transcricaoStatus, "awaiting_plaud"));

      // 2. Criar atendimento com status "awaiting_plaud"
      const [atendimento] = await db
        .insert(atendimentos)
        .values({
          assistidoId: input.assistidoId,
          processoId: input.processoId ?? null,
          casoId: input.casoId ?? null,
          dataRegistro: new Date(),
          tipo: input.tipo,
          assunto: input.descricao,
          status: "realizado",
          transcricaoStatus: "awaiting_plaud",
          autorId: ctx.user.id,
        } as any)
        .returning();

      return { atendimentoId: atendimento.id };
    }),

  /**
   * Lista gravações não vinculadas
   */
  unlinkedRecordings: protectedProcedure.query(async ({ ctx }) => {
    const config = await getActiveConfig();
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
    const config = await getActiveConfig();
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
            sql`${atendimentos.dataRegistro} >= ${startDate}`
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
          dataRegistro: atendimentos.dataRegistro,
          tipo: atendimentos.tipo,
          assunto: atendimentos.assunto,
          status: atendimentos.status,
          temTranscricao: sql<boolean>`${atendimentos.transcricao} is not null`,
          atendidoPor: users.name,
        })
        .from(atendimentos)
        .leftJoin(users, eq(atendimentos.autorId, users.id))
        .where(eq(atendimentos.assistidoId, input.assistidoId))
        .orderBy(desc(atendimentos.dataRegistro))
        .limit(input.limit);
    }),

  // ==========================================
  // FLUXO DE APROVAÇÃO DE GRAVAÇÕES PLAUD
  // ==========================================

  /**
   * Lista gravações pendentes de revisão
   */
  pendingRecordings: protectedProcedure.query(async () => {
    return db
      .select({
        id: plaudRecordings.id,
        configId: plaudRecordings.configId,
        plaudRecordingId: plaudRecordings.plaudRecordingId,
        plaudDeviceId: plaudRecordings.plaudDeviceId,
        title: plaudRecordings.title,
        duration: plaudRecordings.duration,
        recordedAt: plaudRecordings.recordedAt,
        fileSize: plaudRecordings.fileSize,
        status: plaudRecordings.status,
        errorMessage: plaudRecordings.errorMessage,
        // Inclui resumo e transcrição para preview, mas exclui rawPayload (pesado)
        transcription: plaudRecordings.transcription,
        summary: plaudRecordings.summary,
        atendimentoId: plaudRecordings.atendimentoId,
        assistidoId: plaudRecordings.assistidoId,
        processoId: plaudRecordings.processoId,
        driveFileId: plaudRecordings.driveFileId,
        driveFileUrl: plaudRecordings.driveFileUrl,
        createdAt: plaudRecordings.createdAt,
        updatedAt: plaudRecordings.updatedAt,
      })
      .from(plaudRecordings)
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
      }).optional(),
      tipoGravacao: z.enum(["conversa", "audiencia", "outro"]).optional(),
      subtipoGravacao: z.string().optional(),
      depoentes: z.array(z.object({
        nome: z.string(),
        tipo: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Steps 1-4 wrapped in a transaction for atomicity
      const { recording, atendimentoId } = await withTransaction(async (tx) => {
        // 1. Find the pending recording (select only needed fields, skip speakers JSONB)
        const [rec] = await tx
          .select({
            id: plaudRecordings.id,
            plaudRecordingId: plaudRecordings.plaudRecordingId,
            plaudDeviceId: plaudRecordings.plaudDeviceId,
            duration: plaudRecordings.duration,
            transcription: plaudRecordings.transcription,
            summary: plaudRecordings.summary,
            rawPayload: plaudRecordings.rawPayload,
          })
          .from(plaudRecordings)
          .where(and(
            eq(plaudRecordings.id, input.recordingId),
            eq(plaudRecordings.status, "pending_review")
          ))
          .limit(1);

        if (!rec) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Gravação não encontrada ou já processada" });
        }

        let atenId = input.atendimentoId;

        // 2. Create new atendimento if needed
        if (!atenId && input.novoAtendimento) {
          const [novo] = await tx.insert(atendimentos).values({
            assistidoId: input.assistidoId,
            processoId: input.processoId || null,
            dataRegistro: new Date(),
            tipo: input.novoAtendimento.tipo,
            assunto: input.novoAtendimento.descricao || null,
            status: "realizado",
            transcricaoStatus: "completed",
            autorId: ctx.user.id,
          } as any).returning();
          atenId = novo.id;
        }

        // 3. Update recording with all links and metadata
        const interlocutorData = {
          ...(rec.rawPayload as Record<string, unknown> || {}),
          ...(input.interlocutor && { interlocutor: input.interlocutor }),
          ...(input.tipoGravacao && { tipoGravacao: input.tipoGravacao }),
          ...(input.subtipoGravacao && { subtipoGravacao: input.subtipoGravacao }),
          ...(input.depoentes && { depoentes: input.depoentes }),
        };

        await tx.update(plaudRecordings).set({
          status: "completed",
          assistidoId: input.assistidoId,
          processoId: input.processoId || null,
          atendimentoId: atenId || null,
          rawPayload: interlocutorData,
          updatedAt: new Date(),
        }).where(eq(plaudRecordings.id, input.recordingId));

        // 4. Update atendimento with transcription data + duration if linked
        if (atenId) {
          await tx.update(atendimentos).set({
            plaudRecordingId: rec.plaudRecordingId,
            plaudDeviceId: rec.plaudDeviceId,
            transcricao: rec.transcription,
            transcricaoResumo: rec.summary,
            transcricaoStatus: "completed",
            duracao: rec.duration || null,
            updatedAt: new Date(),
          }).where(eq(atendimentos.id, atenId));
        }

        return { recording: rec, atendimentoId: atenId };
      });

      // 5. Fire-and-forget: post-approval pipeline (Drive upload + enrichment)
      // Kept outside transaction — non-critical async work
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
   * Re-executa o pipeline pós-aprovação para uma gravação já aprovada.
   * Útil quando o pipeline original falhou silenciosamente.
   */
  reprocessRecording: protectedProcedure
    .input(z.object({ recordingId: z.number() }))
    .mutation(async ({ input }) => {
      // Busca apenas campos necessários (exclui transcription, rawPayload, speakers)
      const [recording] = await db
        .select({
          id: plaudRecordings.id,
          assistidoId: plaudRecordings.assistidoId,
          atendimentoId: plaudRecordings.atendimentoId,
          processoId: plaudRecordings.processoId,
        })
        .from(plaudRecordings)
        .where(eq(plaudRecordings.id, input.recordingId))
        .limit(1);

      if (!recording) {
        throw new Error("Gravação não encontrada");
      }

      if (!recording.assistidoId) {
        throw new Error("Gravação não possui assistido vinculado");
      }

      const result = await processApprovedRecording(
        recording.id,
        recording.assistidoId,
        recording.atendimentoId || null,
        recording.processoId || null
      );

      return result;
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

  // ==========================================
  // MAPA — Atendimentos georreferenciados
  // ==========================================

  /**
   * Retorna atendimentos para exibição no mapa.
   *
   * TODO: A tabela `assistidos` não possui campos de lat/lng de endereço
   * (apenas `endereco` como texto livre). Para exibir atendimentos no mapa
   * seria necessário geocodificar o endereço do assistido (via API externa)
   * ou adicionar campos lat/lng à tabela `assistidos`.
   *
   * Por ora retorna array vazio para manter a interface contratual.
   * Implementar quando campos geo forem adicionados à tabela `assistidos`.
   */
  mapa: protectedProcedure.query(async () => {
    return [];
  }),
});
