import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { processos, assistidos, assistidosProcessos, audiencias, movimentacoes, demandas, calendarEvents, driveFiles, users, testemunhas } from "@/lib/db/schema";
import { eq, ilike, or, desc, asc, sql, and, isNull, isNotNull, ne, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { TRPCError } from "@trpc/server";
import { getDefensoresVisiveis } from "@/lib/trpc/defensor-scope";

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
      const isAdmin = ctx.user.role === "admin";
      
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
      }
      
      const defensorAlias = alias(users, "defensor");

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
          defensorId: processos.defensorId,
          situacao: processos.situacao,
          createdAt: processos.createdAt,
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
            statusPrisional: assistidos.statusPrisional,
            photoUrl: assistidos.photoUrl,
          },
          defensorNome: defensorAlias.name,
        })
        .from(processos)
        .leftJoin(assistidos, eq(processos.assistidoId, assistidos.id))
        .leftJoin(defensorAlias, eq(processos.defensorId, defensorAlias.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(processos.createdAt))
        .limit(limit)
        .offset(offset);

      return result;
    }),

  // Listar processos de um assistido específico
  listByAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      const result = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          assunto: processos.assunto,
          area: processos.area,
          situacao: processos.situacao,
          comarca: processos.comarca,
          vara: processos.vara,
        })
        .from(processos)
        .where(eq(processos.assistidoId, input.assistidoId))
        .orderBy(desc(processos.createdAt));

      return result;
    }),

  // Buscar processo por ID (enriquecido)
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin";

      const baseConditions = [eq(processos.id, input.id)];
      if (!isAdmin) {
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
              enrichmentStatus: driveFiles.enrichmentStatus,
              documentType: driveFiles.documentType,
              categoria: driveFiles.categoria,
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
      const isAdmin = ctx.user.role === "admin";
      // Busca apenas campos necessários (exclui analysisData JSONB e outros campos pesados)
      const [assistido] = await db
        .select({
          id: assistidos.id,
          driveFolderId: assistidos.driveFolderId,
        })
        .from(assistidos)
        .where(eq(assistidos.id, input.assistidoId))
        .limit(1);

      if (!assistido) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assistido não encontrado" });
      }

      const [novoProcesso] = await db
        .insert(processos)
        .values({
          ...input,
        })
        .returning();

      // Drive lifecycle: auto-criar subpasta do processo (fire-and-forget)
      if (assistido.driveFolderId) {
        (async () => {
          try {
            const { createOrFindProcessoFolder, isGoogleDriveConfigured } =
              await import("@/lib/services/google-drive");
            if (!isGoogleDriveConfigured()) return;

            const folder = await createOrFindProcessoFolder(
              assistido.driveFolderId!,
              novoProcesso.numeroAutos,
            );
            if (folder) {
              await db
                .update(processos)
                .set({
                  driveFolderId: folder.id,
                  linkDrive: folder.webViewLink,
                  updatedAt: new Date(),
                })
                .where(eq(processos.id, novoProcesso.id));
            }
          } catch (error) {
            console.error(`[Drive] Erro ao criar pasta para processo ${novoProcesso.id}:`, error);
          }
        })();
      }

      return novoProcesso;
    }),

  // Extrair dados de processo a partir de PDF via IA
  extractFromPdf: protectedProcedure
    .input(
      z.object({
        file: z.string(), // base64 encoded PDF
        assistidoId: z.number().optional(),
        deep: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const { extractFromPdf: extract, isPdfExtractionConfigured } = await import("@/lib/ai/pdf-extraction");

      if (!isPdfExtractionConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Extração de PDF não configurada. Verifique a API key do Gemini.",
        });
      }

      const result = await extract(input.file, { deep: input.deep });

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Erro ao extrair dados do PDF",
        });
      }

      return result;
    }),

  // Criar assistido rapidamente (inline, para modal Plaud)
  quickCreateAssistido: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        atribuicaoPrimaria: z.enum([
          "JURI_CAMACARI", "VVD_CAMACARI", "EXECUCAO_PENAL",
          "SUBSTITUICAO", "SUBSTITUICAO_CIVEL", "GRUPO_JURI"
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin";

      // Create the assistido with minimal data
      const [novoAssistido] = await db
        .insert(assistidos)
        .values({
          nome: input.nome,
          atribuicaoPrimaria: input.atribuicaoPrimaria,
          statusPrisional: "SOLTO",
        })
        .returning();

      // Fire-and-forget: create Drive folder
      (async () => {
        try {
          const { createOrFindAssistidoFolder, mapAtribuicaoToFolderKey, isGoogleDriveConfigured } =
            await import("@/lib/services/google-drive");
          if (!isGoogleDriveConfigured()) return;

          const folderKey = mapAtribuicaoToFolderKey(input.atribuicaoPrimaria);
          if (!folderKey) return;

          const folder = await createOrFindAssistidoFolder(folderKey, input.nome);
          if (folder) {
            await db
              .update(assistidos)
              .set({
                driveFolderId: folder.id,
                updatedAt: new Date(),
              })
              .where(eq(assistidos.id, novoAssistido.id));
          }
        } catch (error) {
          console.error(`[Drive] Erro ao criar pasta para assistido ${novoAssistido.id}:`, error);
        }
      })();

      return novoAssistido;
    }),

  // Quick-create processo minimal (from FileLinkDialog)
  quickCreateProcesso: protectedProcedure
    .input(
      z.object({
        numero: z.string().min(5),
        assistidoId: z.number(),
        atribuicao: z.enum([
          "JURI_CAMACARI", "VVD_CAMACARI", "EXECUCAO_PENAL",
          "SUBSTITUICAO", "SUBSTITUICAO_CIVEL", "GRUPO_JURI",
        ]),
        area: z.enum([
          "JURI", "EXECUCAO_PENAL", "VIOLENCIA_DOMESTICA",
          "SUBSTITUICAO", "CURADORIA", "FAMILIA", "CIVEL", "FAZENDA_PUBLICA",
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {

      // Derive area from atribuicao if not provided
      const area = input.area || (() => {
        switch (input.atribuicao) {
          case "JURI_CAMACARI":
          case "GRUPO_JURI":
            return "JURI" as const;
          case "VVD_CAMACARI":
            return "VIOLENCIA_DOMESTICA" as const;
          case "EXECUCAO_PENAL":
            return "EXECUCAO_PENAL" as const;
          case "SUBSTITUICAO_CIVEL":
            return "CIVEL" as const;
          default:
            return "SUBSTITUICAO" as const;
        }
      })();

      const [novoProcesso] = await db
        .insert(processos)
        .values({
          assistidoId: input.assistidoId,
          atribuicao: input.atribuicao,
          numeroAutos: input.numero,
          area,
          fase: "conhecimento",
          situacao: "ativo",
        })
        .returning();

      // Fire-and-forget: create Drive folder for processo
      (async () => {
        try {
          const [assistido] = await db
            .select({ driveFolderId: assistidos.driveFolderId, nome: assistidos.nome })
            .from(assistidos)
            .where(eq(assistidos.id, input.assistidoId))
            .limit(1);

          if (!assistido?.driveFolderId) return;

          const { createOrFindProcessoFolder, isGoogleDriveConfigured } =
            await import("@/lib/services/google-drive");
          if (!isGoogleDriveConfigured()) return;

          const folder = await createOrFindProcessoFolder(
            assistido.driveFolderId,
            input.numero
          );
          if (folder) {
            await db
              .update(processos)
              .set({
                driveFolderId: folder.id,
                linkDrive: folder.webViewLink || null,
              })
              .where(eq(processos.id, novoProcesso.id));
          }
        } catch (error) {
          console.error(`[Drive] Erro ao criar pasta para processo ${novoProcesso.id}:`, error);
        }
      })();

      return novoProcesso;
    }),

  // Atualizar processo
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        numeroAutos: z.string().min(1).optional(),
        numeroAntigo: z.string().nullable().optional(),
        comarca: z.string().nullable().optional(),
        vara: z.string().nullable().optional(),
        area: z.enum([
          "JURI", "EXECUCAO_PENAL", "VIOLENCIA_DOMESTICA",
          "SUBSTITUICAO", "CURADORIA", "FAMILIA", "CIVEL", "FAZENDA_PUBLICA"
        ]).optional(),
        classeProcessual: z.string().nullable().optional(),
        assunto: z.string().nullable().optional(),
        valorCausa: z.number().nullable().optional(),
        parteContraria: z.string().nullable().optional(),
        advogadoContrario: z.string().nullable().optional(),
        fase: z.string().nullable().optional(),
        situacao: z.string().nullable().optional(),
        isJuri: z.boolean().optional(),
        dataSessaoJuri: z.string().nullable().optional(), // ISO date string
        resultadoJuri: z.string().nullable().optional(),
        observacoes: z.string().nullable().optional(),
        linkDrive: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, dataSessaoJuri, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      // Convert ISO date string to Date object for timestamp column
      if (dataSessaoJuri !== undefined) {
        data.dataSessaoJuri = dataSessaoJuri ? new Date(dataSessaoJuri) : null;
      }
      const isAdmin = ctx.user.role === "admin";
      
      const [atualizado] = await db
        .update(processos)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          isAdmin
            ? eq(processos.id, id)
            : eq(processos.id, id)
        )
        .returning();
      
      return atualizado;
    }),

  // Excluir processo (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin";

      const [excluido] = await db
        .update(processos)
        .set({ deletedAt: new Date() })
        .where(
          isAdmin
            ? eq(processos.id, input.id)
            : eq(processos.id, input.id)
        )
        .returning();
      
      return excluido;
    }),

  // Estatísticas
  stats: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.user.role === "admin";
    const baseCondition = undefined;

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
          tipo: demandas.tipoAto,
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
        if (!d.data) return;
        timeline.push({
          id: d.id,
          data: new Date(d.data),
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

  /**
   * Status da instrução de um processo.
   * Quem foi ouvido, quem falta, intimações, desistências, intercorrências por audiência.
   */
  instrucaoStatus: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      // 1. Get all testemunhas for this processo
      const testemunhasList = await db
        .select({
          id: testemunhas.id,
          nome: testemunhas.nome,
          tipo: testemunhas.tipo,
          status: testemunhas.status,
          audienciaId: testemunhas.audienciaId,
          resumoDepoimento: testemunhas.resumoDepoimento,
          observacoes: testemunhas.observacoes,
        })
        .from(testemunhas)
        .where(eq(testemunhas.processoId, input.processoId))
        .orderBy(testemunhas.ordemInquiricao, testemunhas.nome);

      // 2. Get all audiencias for this processo
      const audienciasList = await db
        .select({
          id: audiencias.id,
          dataAudiencia: audiencias.dataAudiencia,
          tipo: audiencias.tipo,
          status: audiencias.status,
          resultado: audiencias.resultado,
          observacoes: audiencias.observacoes,
          local: audiencias.local,
        })
        .from(audiencias)
        .where(eq(audiencias.processoId, input.processoId))
        .orderBy(desc(audiencias.dataAudiencia));

      // 3. Classify testemunhas
      const ouvidas = testemunhasList.filter(t => t.status === "OUVIDA");
      const pendentes = testemunhasList.filter(t => t.status === "ARROLADA" || t.status === "INTIMADA");
      const desistidas = testemunhasList.filter(t => t.status === "DESISTIDA");
      const naoLocalizadas = testemunhasList.filter(t => t.status === "NAO_LOCALIZADA");
      const cartaPrecatoria = testemunhasList.filter(t => t.status === "CARTA_PRECATORIA");

      // 4. Build intercorrências from audiencias
      type Intercorrencia = {
        audienciaId: number;
        data: string;
        tipo: string;
        descricao: string;
      };

      const intercorrencias: Intercorrencia[] = [];
      for (const aud of audienciasList) {
        if (aud.status === "adiada") {
          intercorrencias.push({
            audienciaId: aud.id,
            data: aud.dataAudiencia.toISOString(),
            tipo: "adiamento",
            descricao: aud.resultado || aud.observacoes || "Audiencia adiada",
          });
        } else if (aud.status === "cancelada") {
          intercorrencias.push({
            audienciaId: aud.id,
            data: aud.dataAudiencia.toISOString(),
            tipo: "cancelamento",
            descricao: aud.resultado || aud.observacoes || "Audiencia cancelada",
          });
        }
        // Check for intercorrências in observações (e.g., réu não apresentado, falta de transporte)
        if (aud.observacoes && aud.status === "realizada") {
          const lower = aud.observacoes.toLowerCase();
          if (lower.includes("intercorrencia") || lower.includes("incidente") || lower.includes("nao apresentado") || lower.includes("não apresentado")) {
            intercorrencias.push({
              audienciaId: aud.id,
              data: aud.dataAudiencia.toISOString(),
              tipo: "intercorrencia",
              descricao: aud.observacoes,
            });
          }
        }
      }

      return {
        testemunhas: {
          total: testemunhasList.length,
          ouvidas: ouvidas.map(t => ({ id: t.id, nome: t.nome, tipo: t.tipo })),
          pendentes: pendentes.map(t => ({ id: t.id, nome: t.nome, tipo: t.tipo, status: t.status })),
          desistidas: desistidas.map(t => ({ id: t.id, nome: t.nome, tipo: t.tipo })),
          naoLocalizadas: naoLocalizadas.map(t => ({ id: t.id, nome: t.nome, tipo: t.tipo })),
          cartaPrecatoria: cartaPrecatoria.map(t => ({ id: t.id, nome: t.nome, tipo: t.tipo })),
        },
        audiencias: {
          total: audienciasList.length,
          realizadas: audienciasList.filter(a => a.status === "realizada").length,
          adiadas: audienciasList.filter(a => a.status === "adiada").length,
          proxima: audienciasList.find(a => a.status === "agendada" && new Date(a.dataAudiencia) > new Date()),
        },
        intercorrencias,
      };
    }),

  // ==========================================
  // MAPA — Processos georreferenciados
  // ==========================================

  /**
   * Retorna processos com coordenadas do local do fato para exibição no mapa.
   * Filtra por defensor visível ao usuário (usando defensor-scope).
   * Apenas processos com localDoFatoLat e localDoFatoLng preenchidos.
   */
  mapa: protectedProcedure
    .input(
      z.object({
        atribuicao: z.string().optional(),
        defensoresIds: z.array(z.number()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const defensoresVisiveis = getDefensoresVisiveis(ctx.user);

      const conditions = [
        isNotNull(processos.localDoFatoLat),
        isNotNull(processos.localDoFatoLng),
        isNull(processos.deletedAt),
      ];

      if (input.atribuicao) {
        conditions.push(eq(processos.atribuicao, input.atribuicao as any));
      }

      if (input.defensoresIds && input.defensoresIds.length > 0) {
        conditions.push(inArray(processos.defensorId, input.defensoresIds));
      } else if (defensoresVisiveis !== "all") {
        conditions.push(inArray(processos.defensorId, defensoresVisiveis));
      }

      const result = await db
        .select({
          id: processos.id,
          numeroProcesso: processos.numeroAutos,
          atribuicao: processos.atribuicao,
          localDoFatoLat: processos.localDoFatoLat,
          localDoFatoLng: processos.localDoFatoLng,
          localDoFatoEndereco: processos.localDoFatoEndereco,
          assistidoNome: assistidos.nome,
          assistidoId: assistidos.id,
        })
        .from(processos)
        .innerJoin(assistidos, and(eq(processos.assistidoId, assistidos.id), isNull(assistidos.deletedAt)))
        .where(and(...conditions))
        .orderBy(desc(processos.createdAt));

      return result;
    }),
});
