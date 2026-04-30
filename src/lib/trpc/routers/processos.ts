import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { processos, assistidos, assistidosProcessos, audiencias, movimentacoes, demandas, calendarEvents, driveFiles, users, testemunhas, casos } from "@/lib/db/schema";
import { eq, ilike, or, desc, asc, sql, and, isNull, isNotNull, ne, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { TRPCError } from "@trpc/server";
import { getComarcaId, getParceirosIds } from "@/lib/trpc/comarca-scope";
import { getDefensoresVisiveis } from "@/lib/trpc/defensor-scope";
import { classifyTipoProcesso, isReferenceTipo } from "@/lib/utils/processo-classification";

export const processosRouter = router({
  // Listar todos os processos
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        area: z.string().optional(),
        isJuri: z.boolean().optional(),
        verComarca: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, area, isJuri, limit = 50, offset = 0 } = input || {};
      const isAdmin = ctx.user.role === "admin";
      
      const conditions: any[] = [isNull(processos.deletedAt)];

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
        const verComarca = input?.verComarca ?? false;
        if (verComarca) {
          // Layer 3: toda a comarca
          conditions.push(eq(processos.comarcaId, getComarcaId(ctx.user)));
        } else {
          // Layer 1 + 2: próprios + parceiros
          const parceirosIds = await getParceirosIds(ctx.user.id);
          const defensoresVisiveis = [ctx.user.id, ...parceirosIds];
          // Guard: inArray requires non-empty array (always safe — has at least ctx.user.id)
          const defensorFilter = inArray(processos.defensorId, defensoresVisiveis);
          // L1b/L1c: processos em que o user é defensor 2G ou defensor Brasília (via defensorBaId)
          const defensorBaId = ctx.user.defensorBaId ?? null;
          const l1b = defensorBaId != null ? eq(processos.defensor2gId, defensorBaId) : null;
          const l1c = defensorBaId != null ? eq(processos.defensorBrasiliaId, defensorBaId) : null;
          const l1 = [defensorFilter, l1b, l1c].filter(Boolean) as NonNullable<typeof defensorFilter>[];
          const l1Combined = l1.length > 1 ? or(...l1)! : l1[0]!;
          // Also include processos without assigned defensor that belong to the comarca
          const semDefensorFilter = and(
            isNull(processos.defensorId),
            eq(processos.comarcaId, getComarcaId(ctx.user))
          );
          conditions.push(or(l1Combined, semDefensorFilter)!);
        }
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

      const baseConditions: any[] = [eq(processos.id, input.id)];
      if (!isAdmin) {
        // Same visibility logic as list(): own + parceiros + unassigned in comarca
        const parceirosIds = await getParceirosIds(ctx.user.id);
        const defensoresVisiveis = [ctx.user.id, ...parceirosIds];
        const defensorFilter = inArray(processos.defensorId, defensoresVisiveis);
        const semDefensorFilter = and(
          isNull(processos.defensorId),
          eq(processos.comarcaId, getComarcaId(ctx.user))
        );
        baseConditions.push(or(defensorFilter, semDefensorFilter)!);
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
              ativo: assistidosProcessos.ativo,
              observacoes: assistidosProcessos.observacoes,
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

      // Case info + sibling processes
      let casoInfo: { id: number; titulo: string } | null = null;
      let processosVinculados: {
        id: number;
        numeroAutos: string | null;
        tipoProcesso: string | null;
        isReferencia: boolean | null;
        processoOrigemId: number | null;
        classeProcessual: string | null;
        assistidosNomes: string[];
      }[] = [];

      if (base.casoId) {
        const casoRows = await db
          .select({ id: casos.id, titulo: casos.titulo })
          .from(casos)
          .where(eq(casos.id, base.casoId))
          .limit(1);
        casoInfo = casoRows[0] ?? null;

        const siblings = await db
          .select({
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            tipoProcesso: processos.tipoProcesso,
            isReferencia: processos.isReferencia,
            processoOrigemId: processos.processoOrigemId,
            classeProcessual: processos.classeProcessual,
          })
          .from(processos)
          .where(
            and(
              eq(processos.casoId, base.casoId),
              ne(processos.id, input.id),
              isNull(processos.deletedAt),
            ),
          );

        const siblingIds = siblings.map((s) => s.id);
        const siblingAssistidos = siblingIds.length > 0
          ? await db
              .select({
                processoId: assistidosProcessos.processoId,
                nome: assistidos.nome,
              })
              .from(assistidosProcessos)
              .innerJoin(assistidos, eq(assistidosProcessos.assistidoId, assistidos.id))
              .where(
                and(
                  inArray(assistidosProcessos.processoId, siblingIds),
                  eq(assistidosProcessos.ativo, true),
                  isNull(assistidos.deletedAt),
                ),
              )
          : [];

        processosVinculados = siblings.map((s) => ({
          ...s,
          assistidosNomes: siblingAssistidos
            .filter((sa) => sa.processoId === s.id)
            .map((sa) => sa.nome),
        }));
      }

      return {
        ...base,
        assistidos: assistidosRows,
        audiencias: audienciasRows,
        demandas: demandasRows,
        driveFiles: driveFilesRows,
        casoInfo,
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
        instancia: z.enum(['PRIMEIRA','SEGUNDA','STJ','STF','SEEU']).default('PRIMEIRA'),
        classeRecursal: z.enum(['APELACAO','AGRAVO_EXECUCAO','RESE','HC','EMBARGOS','REVISAO_CRIMINAL','CORREICAO_PARCIAL','MS','RESP','RE','AGRAVO_RESP','AGRAVO_RE','RECLAMACAO','HC_STJ','HC_STF']).optional(),
        processoOrigemId: z.number().optional(),
        defensor2gId: z.number().optional(),
        defensorBrasiliaId: z.number().optional(),
        camara: z.string().optional(),
        relator: z.string().optional(),
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

      const tipo = classifyTipoProcesso(input.classeProcessual ?? null);

      const [novoProcesso] = await db
        .insert(processos)
        .values({
          ...input,
          comarcaId: getComarcaId(ctx.user),
          tipoProcesso: tipo,
          isReferencia: isReferenceTipo(tipo),
          instancia: input.instancia,
          classeRecursal: input.classeRecursal ?? null,
          processoOrigemId: input.processoOrigemId ?? null,
          defensor2gId: input.defensor2gId ?? null,
          defensorBrasiliaId: input.defensorBrasiliaId ?? null,
          camara: input.camara ?? null,
          relator: input.relator ?? null,
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
          comarcaId: getComarcaId(ctx.user),
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
          comarcaId: getComarcaId(ctx.user),
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
        localDoFatoEndereco: z.string().nullable().optional(),
        localDoFatoLat: z.string().nullable().optional(),
        localDoFatoLng: z.string().nullable().optional(),
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

  // Atualizar apenas localização do fato (usado no painel inline)
  updateLocalDoFato: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        localDoFatoEndereco: z.string().nullable(),
        localDoFatoLat: z.string().nullable(),
        localDoFatoLng: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [atualizado] = await db
        .update(processos)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(processos.id, id))
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
    const baseCondition = and(
      isNull(processos.deletedAt),
      isAdmin ? undefined : eq(processos.comarcaId, getComarcaId(ctx.user))
    );

    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(processos)
      .where(baseCondition);

    const juris = await db
      .select({ count: sql<number>`count(*)` })
      .from(processos)
      .where(and(baseCondition, eq(processos.isJuri, true)));
    
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
          titulo: `Demanda - ${d.tipo || "geral"}`,
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
          createdAt: processos.createdAt,
          assunto: processos.assunto,
          fase: processos.fase,
          situacao: processos.situacao,
        })
        .from(processos)
        .innerJoin(assistidos, and(eq(processos.assistidoId, assistidos.id), isNull(assistidos.deletedAt)))
        .where(and(...conditions))
        .orderBy(desc(processos.createdAt));

      return result;
    }),

  // Buscar processos por número para autocompletar (processo de origem)
  searchByNumero: protectedProcedure
    .input(z.object({ q: z.string().min(3) }))
    .query(async ({ input }) => {
      return db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          instancia: processos.instancia,
          classeProcessual: processos.classeProcessual,
          assistidoNome: assistidos.nome,
        })
        .from(processos)
        .leftJoin(assistidos, eq(assistidos.id, processos.assistidoId))
        .where(ilike(processos.numeroAutos, `%${input.q}%`))
        .limit(10);
    }),

  // Enriquecer processo com dados do DataJud (CNJ)
  enrichFromDatajud: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      if (!process.env.DATAJUD_API_KEY) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DATAJUD_API_KEY não configurada" });
      }

      const [processo] = await db
        .select()
        .from(processos)
        .where(eq(processos.id, input.id));

      if (!processo) throw new TRPCError({ code: "NOT_FOUND", message: "Processo não encontrado" });

      const numero = (processo.numeroAutos ?? "").replace(/\s/g, "");

      const response = await fetch(
        "https://api-publica.datajud.cnj.jus.br/api_publica_tjba/_search",
        {
          method: "POST",
          headers: {
            Authorization: `ApiKey ${process.env.DATAJUD_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: { match: { numeroProcesso: numero } },
          }),
        }
      );

      if (!response.ok) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao consultar DataJud" });
      }

      const data = await response.json();
      const hit = data?.hits?.hits?.[0]?._source;

      if (!hit) {
        return { found: false, message: "Processo não encontrado no DataJud (pode haver latência de dias)", data: null, updated: [] };
      }

      // Mapear campos DataJud → schema (só preenche se vazio)
      const updates: Record<string, string | undefined> = {};

      if (hit.classe?.nome && !processo.classeProcessual) {
        updates.classeProcessual = hit.classe.nome;
      }
      if (hit.assuntos?.length > 0 && !processo.assunto) {
        updates.assunto = hit.assuntos.map((a: { nome: string }) => a.nome).join("; ");
      }
      if (hit.orgaoJulgador?.nome && !processo.vara) {
        updates.vara = hit.orgaoJulgador.nome;
      }

      if (Object.keys(updates).length > 0) {
        await db.update(processos)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(processos.id, input.id));
      }

      return {
        found: true,
        updated: Object.keys(updates),
        data: {
          classe: hit.classe?.nome ?? null,
          assuntos: hit.assuntos?.map((a: { nome: string }) => a.nome) ?? [],
          orgaoJulgador: hit.orgaoJulgador?.nome ?? null,
          tribunal: hit.tribunal ?? null,
          dataUltimaAtualizacao: hit.dataHoraUltimaAtualizacao ?? null,
          totalMovimentos: hit.movimentos?.length ?? 0,
        },
        message: null,
      };
    }),

  listByCaso: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      return await db.select().from(processos)
        .where(and(eq(processos.casoId, input.casoId), eq(processos.workspaceId, wid)));
    }),

  /**
   * Cria um processo incidental vinculado a um processo principal. Garante
   * que ambos compartilhem o mesmo `casoId` (cria caso se necessário) e que
   * o novo processo aponte ao principal via `processoOrigemId`.
   *
   * Se `moverDemandaId` for informado, transfere a demanda do processo
   * principal para o recém-criado.
   */
  criarVinculado: protectedProcedure
    .input(
      z.object({
        processoOrigemId: z.number(),
        numeroAutos: z
          .string()
          .min(15, "Número dos autos inválido")
          .max(30, "Número dos autos inválido"),
        tipoProcesso: z.enum(["REVOGACAO", "HC", "RECURSO", "MPU", "IP", "PEDIDO"]),
        classeProcessual: z.string().optional(),
        assunto: z.string().optional(),
        moverDemandaId: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      const { mapAreaParaAtribuicao } = await import("@/lib/processos/tipos");

      return await db.transaction(async (tx) => {
        const [origem] = await tx
          .select()
          .from(processos)
          .where(and(eq(processos.id, input.processoOrigemId), eq(processos.workspaceId, wid)))
          .limit(1);

        if (!origem) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Processo de origem não encontrado" });
        }

        // Garantir caso comum
        let casoId = origem.casoId;
        if (!casoId) {
          const [assistido] = await tx
            .select({ nome: assistidos.nome })
            .from(assistidos)
            .where(eq(assistidos.id, origem.assistidoId))
            .limit(1);

          const [novoCaso] = await tx
            .insert(casos)
            .values({
              titulo: `${assistido?.nome ?? "Caso"} — ${origem.area}`,
              atribuicao: mapAreaParaAtribuicao(origem.area) as any,
              assistidoId: origem.assistidoId,
              defensorId: ctx.user.id,
              status: "ativo",
            })
            .returning({ id: casos.id });
          casoId = novoCaso.id;

          await tx
            .update(processos)
            .set({ casoId })
            .where(eq(processos.id, origem.id));
        }

        const [novoProc] = await tx
          .insert(processos)
          .values({
            assistidoId: origem.assistidoId,
            numeroAutos: input.numeroAutos,
            comarca: origem.comarca,
            comarcaId: origem.comarcaId,
            vara: origem.vara,
            area: origem.area,
            classeProcessual: input.classeProcessual ?? null,
            assunto: input.assunto ?? null,
            tipoProcesso: input.tipoProcesso,
            processoOrigemId: origem.id,
            casoId,
            defensorId: ctx.user.id,
            situacao: "ativo",
            workspaceId: wid,
          })
          .returning();

        if (input.moverDemandaId) {
          await tx
            .update(demandas)
            .set({ processoId: novoProc.id, updatedAt: new Date() })
            .where(eq(demandas.id, input.moverDemandaId));
        }

        return novoProc;
      });
    }),

  /**
   * Retorna processos vinculados a um caso (mesmo casoId) ou, em fallback,
   * via processoOrigemId. Hierarquia: principal (processoOrigemId=null)
   * primeiro, incidentais depois, ordenados por id.
   */
  vinculados: protectedProcedure
    .input(z.object({
      processoId: z.number().optional(),
      casoId: z.number().optional(),
      excluirId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (!input.processoId && !input.casoId) return [];
      const wid = ctx.user.workspaceId ?? 1;

      let casoId = input.casoId;
      if (!casoId && input.processoId) {
        const [p] = await db
          .select({ casoId: processos.casoId })
          .from(processos)
          .where(and(eq(processos.id, input.processoId), eq(processos.workspaceId, wid)))
          .limit(1);
        casoId = p?.casoId ?? undefined;
      }

      const baseColumns = {
        id: processos.id,
        numeroAutos: processos.numeroAutos,
        tipoProcesso: processos.tipoProcesso,
        processoOrigemId: processos.processoOrigemId,
        classeProcessual: processos.classeProcessual,
        situacao: processos.situacao,
        isReferencia: processos.isReferencia,
      } as const;

      let rows: Array<{
        id: number;
        numeroAutos: string | null;
        tipoProcesso: string | null;
        processoOrigemId: number | null;
        classeProcessual: string | null;
        situacao: string | null;
        isReferencia: boolean | null;
      }>;

      if (casoId) {
        rows = await db
          .select(baseColumns)
          .from(processos)
          .where(and(
            eq(processos.casoId, casoId),
            eq(processos.workspaceId, wid),
            isNull(processos.deletedAt),
            input.excluirId ? ne(processos.id, input.excluirId) : undefined,
          ));
      } else if (input.processoId) {
        // Fallback via processoOrigemId
        rows = await db
          .select(baseColumns)
          .from(processos)
          .where(and(
            or(
              eq(processos.processoOrigemId, input.processoId),
              eq(processos.id, input.processoId),
            ),
            eq(processos.workspaceId, wid),
            isNull(processos.deletedAt),
            input.excluirId ? ne(processos.id, input.excluirId) : undefined,
          ));
      } else {
        rows = [];
      }

      return rows.sort((a, b) => {
        if (a.processoOrigemId === null && b.processoOrigemId !== null) return -1;
        if (b.processoOrigemId === null && a.processoOrigemId !== null) return 1;
        return a.id - b.id;
      });
    }),
});
