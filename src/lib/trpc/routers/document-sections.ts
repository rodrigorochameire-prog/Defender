import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db, driveDocumentSections, driveFiles, driveFileContents } from "@/lib/db";
import { eq, and, desc, asc, ilike, sql, inArray } from "drizzle-orm";

const TIPO_LABELS: Record<string, string> = {
  // v2 — nova taxonomia
  denuncia: "Denúncia",
  sentenca: "Sentença",
  depoimento_vitima: "Depoimento (Vítima)",
  depoimento_testemunha: "Depoimento (Testemunha)",
  depoimento_investigado: "Depoimento (Investigado)",
  decisao: "Decisão",
  pronuncia: "Pronúncia",
  laudo_pericial: "Laudo Pericial",
  laudo_necroscopico: "Laudo Necroscópico",
  laudo_local: "Laudo de Local",
  ata_audiencia: "Ata de Audiência",
  interrogatorio: "Interrogatório",
  alegacoes_mp: "Alegações Finais (MP)",
  alegacoes_defesa: "Alegações Finais (Defesa)",
  resposta_acusacao: "Resposta à Acusação",
  recurso: "Recurso",
  habeas_corpus: "Habeas Corpus",
  boletim_ocorrencia: "Boletim de Ocorrência",
  portaria_ip: "Portaria do IP",
  relatorio_policial: "Relatório Policial",
  auto_prisao: "Auto de Prisão",
  certidao_relevante: "Certidão",
  diligencias_422: "Diligências (Art. 422 CPP)",
  alegacoes: "Alegações Finais",
  documento_identidade: "Documento/Identidade",
  outros: "Outros",
  burocracia: "Burocracia",
  // legados
  depoimento: "Depoimento",
  certidao: "Certidão",
  laudo: "Laudo Pericial",
  inquerito: "Inquérito Policial",
  termo_inquerito: "Termo do Inquérito",
};

const TIPO_ICONS: Record<string, string> = {
  denuncia: "Gavel",
  sentenca: "Scale",
  depoimento_vitima: "UserCircle",
  depoimento_testemunha: "Users",
  depoimento_investigado: "UserCheck",
  decisao: "ScrollText",
  pronuncia: "Gavel",
  laudo_pericial: "Microscope",
  laudo_necroscopico: "Microscope",
  laudo_local: "MapPin",
  ata_audiencia: "CalendarDays",
  interrogatorio: "MessageSquare",
  alegacoes_mp: "BookMarked",
  alegacoes_defesa: "BookMarked",
  resposta_acusacao: "ShieldCheck",
  recurso: "BookOpen",
  habeas_corpus: "Unlock",
  boletim_ocorrencia: "Siren",
  portaria_ip: "FileSearch",
  relatorio_policial: "Shield",
  auto_prisao: "Crosshair",
  certidao_relevante: "FileCheck",
  diligencias_422: "ClipboardList",
  alegacoes: "BookMarked",
  documento_identidade: "Fingerprint",
  outros: "HelpCircle",
  burocracia: "Ban",
  // legados
  depoimento: "Users",
  certidao: "FileCheck",
  laudo: "Microscope",
  inquerito: "Shield",
  termo_inquerito: "FileSearch",
};

const reviewStatusEnum = z.enum(["pending", "approved", "rejected", "needs_review"]);

/** Shared metadata schema — passthrough allows new v2 fields (pessoas, cronologia, tesesDefensivas, etc.) */
const sectionMetadataSchema = z.object({
  partesmencionadas: z.array(z.string()).optional(),
  datasExtraidas: z.array(z.string()).optional(),
  artigosLei: z.array(z.string()).optional(),
  juiz: z.string().optional().nullable(),
  promotor: z.string().optional().nullable(),
  // v2 fields accepted via passthrough
  pessoas: z.array(z.any()).optional(),
  cronologia: z.array(z.any()).optional(),
  tesesDefensivas: z.array(z.any()).optional(),
  contradicoes: z.array(z.string()).optional(),
  pontosCriticos: z.array(z.string()).optional(),
}).passthrough();

const sectionTipoEnum = z.enum([
  // v2 — nova taxonomia com relevancia defensiva
  "denuncia",
  "sentenca",
  "depoimento_vitima",
  "depoimento_testemunha",
  "depoimento_investigado",
  "decisao",
  "pronuncia",
  "laudo_pericial",
  "laudo_necroscopico",
  "laudo_local",
  "ata_audiencia",
  "interrogatorio",
  "alegacoes_mp",
  "alegacoes_defesa",
  "resposta_acusacao",
  "recurso",
  "habeas_corpus",
  "boletim_ocorrencia",
  "portaria_ip",
  "relatorio_policial",
  "auto_prisao",
  "certidao_relevante",
  "diligencias_422",
  "alegacoes",
  "documento_identidade",
  "outros",
  "burocracia",
  // legados (backward compat)
  "depoimento",
  "laudo",
  "inquerito",
  "termo_inquerito",
  "certidao",
]);

export const documentSectionsRouter = router({
  // Listar seções de um arquivo
  listByFile: protectedProcedure
    .input(z.object({ driveFileId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(driveDocumentSections)
        .where(eq(driveDocumentSections.driveFileId, input.driveFileId))
        .orderBy(asc(driveDocumentSections.paginaInicio));
    }),

  // Listar seções por processo (cross-file, para página de sistematização)
  listByProcesso: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      reviewStatus: reviewStatusEnum.optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(driveFiles.processoId, input.processoId),
      ];
      if (input.reviewStatus) {
        conditions.push(eq(driveDocumentSections.reviewStatus, input.reviewStatus));
      }

      return db
        .select({
          section: driveDocumentSections,
          fileName: driveFiles.name,
          fileId: driveFiles.id,
        })
        .from(driveDocumentSections)
        .innerJoin(driveFiles, eq(driveDocumentSections.driveFileId, driveFiles.id))
        .where(and(...conditions))
        .orderBy(asc(driveDocumentSections.paginaInicio));
    }),

  // Buscar seções por tipo (em todos os arquivos)
  listByTipo: protectedProcedure
    .input(z.object({
      tipo: sectionTipoEnum,
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      return db
        .select({
          section: driveDocumentSections,
          fileName: driveFiles.name,
          fileWebViewLink: driveFiles.webViewLink,
        })
        .from(driveDocumentSections)
        .innerJoin(driveFiles, eq(driveDocumentSections.driveFileId, driveFiles.id))
        .where(eq(driveDocumentSections.tipo, input.tipo))
        .orderBy(desc(driveDocumentSections.createdAt))
        .limit(input.limit);
    }),

  // Buscar seções por texto (título ou resumo)
  search: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      driveFileId: z.number().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const conditions = [
        ilike(driveDocumentSections.titulo, `%${input.query}%`),
      ];

      // Se filtrar por arquivo específico
      const whereConditions = input.driveFileId
        ? and(
            eq(driveDocumentSections.driveFileId, input.driveFileId),
            conditions[0]
          )
        : conditions[0];

      return db
        .select({
          section: driveDocumentSections,
          fileName: driveFiles.name,
        })
        .from(driveDocumentSections)
        .innerJoin(driveFiles, eq(driveDocumentSections.driveFileId, driveFiles.id))
        .where(whereConditions)
        .orderBy(desc(driveDocumentSections.confianca))
        .limit(input.limit);
    }),

  // Obter resumo de seções de um arquivo (contagem por tipo)
  getSummary: protectedProcedure
    .input(z.object({ driveFileId: z.number() }))
    .query(async ({ input }) => {
      const result = await db
        .select({
          tipo: driveDocumentSections.tipo,
          count: sql<number>`count(*)::int`,
          totalPages: sql<number>`sum(pagina_fim - pagina_inicio + 1)::int`,
        })
        .from(driveDocumentSections)
        .where(eq(driveDocumentSections.driveFileId, input.driveFileId))
        .groupBy(driveDocumentSections.tipo)
        .orderBy(asc(driveDocumentSections.tipo));

      return result;
    }),

  // Criar seção (usado pelo pipeline de extração)
  create: protectedProcedure
    .input(z.object({
      driveFileId: z.number(),
      tipo: sectionTipoEnum,
      titulo: z.string().min(1),
      paginaInicio: z.number().min(1),
      paginaFim: z.number().min(1),
      resumo: z.string().optional(),
      textoExtraido: z.string().optional(),
      confianca: z.number().min(0).max(100).default(0),
      metadata: sectionMetadataSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const [section] = await db
        .insert(driveDocumentSections)
        .values({
          driveFileId: input.driveFileId,
          tipo: input.tipo,
          titulo: input.titulo,
          paginaInicio: input.paginaInicio,
          paginaFim: input.paginaFim,
          resumo: input.resumo,
          textoExtraido: input.textoExtraido,
          confianca: input.confianca,
          metadata: input.metadata ?? {},
        })
        .returning();

      return section;
    }),

  // Criar múltiplas seções de uma vez (batch do pipeline)
  createMany: protectedProcedure
    .input(z.object({
      driveFileId: z.number(),
      sections: z.array(z.object({
        tipo: sectionTipoEnum,
        titulo: z.string().min(1),
        paginaInicio: z.number().min(1),
        paginaFim: z.number().min(1),
        resumo: z.string().optional(),
        textoExtraido: z.string().optional(),
        confianca: z.number().min(0).max(100).default(0),
        metadata: z.object({
          partesmencionadas: z.array(z.string()).optional(),
          datasExtraidas: z.array(z.string()).optional(),
          artigosLei: z.array(z.string()).optional(),
          juiz: z.string().optional(),
          promotor: z.string().optional(),
        }).optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      if (input.sections.length === 0) return [];

      const values = input.sections.map((s) => ({
        driveFileId: input.driveFileId,
        tipo: s.tipo,
        titulo: s.titulo,
        paginaInicio: s.paginaInicio,
        paginaFim: s.paginaFim,
        resumo: s.resumo,
        textoExtraido: s.textoExtraido,
        confianca: s.confianca,
        metadata: s.metadata ?? {},
      }));

      const result = await db
        .insert(driveDocumentSections)
        .values(values)
        .returning();

      return result;
    }),

  // Atualizar seção (edição manual pelo defensor)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      tipo: sectionTipoEnum.optional(),
      titulo: z.string().min(1).optional(),
      paginaInicio: z.number().min(1).optional(),
      paginaFim: z.number().min(1).optional(),
      resumo: z.string().optional(),
      confianca: z.number().min(0).max(100).optional(),
      reviewStatus: reviewStatusEnum.optional(),
      fichaData: z.record(z.unknown()).optional(),
      metadata: sectionMetadataSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (data.tipo !== undefined) updateData.tipo = data.tipo;
      if (data.titulo !== undefined) updateData.titulo = data.titulo;
      if (data.paginaInicio !== undefined) updateData.paginaInicio = data.paginaInicio;
      if (data.paginaFim !== undefined) updateData.paginaFim = data.paginaFim;
      if (data.resumo !== undefined) updateData.resumo = data.resumo;
      if (data.confianca !== undefined) updateData.confianca = data.confianca;
      if (data.reviewStatus !== undefined) updateData.reviewStatus = data.reviewStatus;
      if (data.fichaData !== undefined) updateData.fichaData = data.fichaData;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;

      const [section] = await db
        .update(driveDocumentSections)
        .set(updateData)
        .where(eq(driveDocumentSections.id, id))
        .returning();

      return section;
    }),

  // Deletar seção
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .delete(driveDocumentSections)
        .where(eq(driveDocumentSections.id, input.id));
      return { success: true };
    }),

  // Deletar todas seções de um arquivo (para re-processamento)
  deleteByFile: protectedProcedure
    .input(z.object({ driveFileId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await db
        .delete(driveDocumentSections)
        .where(eq(driveDocumentSections.driveFileId, input.driveFileId))
        .returning({ id: driveDocumentSections.id });
      return { deleted: result.length };
    }),

  // Classificar PDF diretamente (Download → Extração → Gemini → Salvar)
  triggerClassification: protectedProcedure
    .input(z.object({ driveFileId: z.number() }))
    .mutation(async ({ input }) => {
      // Get the Google Drive file ID
      const [file] = await db
        .select({ driveFileId: driveFiles.driveFileId })
        .from(driveFiles)
        .where(eq(driveFiles.id, input.driveFileId))
        .limit(1);

      if (!file) throw new Error("File not found");

      // Mark as processing
      await db
        .update(driveFiles)
        .set({ enrichmentStatus: "processing", updatedAt: new Date() })
        .where(eq(driveFiles.id, input.driveFileId));

      // Delete existing sections (re-process)
      await db
        .delete(driveDocumentSections)
        .where(eq(driveDocumentSections.driveFileId, input.driveFileId));

      try {
        // Step 1: Download PDF from Drive
        console.log(`[triggerClassification] Step 1: Downloading file ${file.driveFileId}...`);
        const { downloadFileContent } = await import("@/lib/services/google-drive");
        const content = await downloadFileContent(file.driveFileId);
        if (!content) throw new Error("Falha no download do arquivo");
        console.log(`[triggerClassification] Step 1 OK: Downloaded ${content.byteLength} bytes`);

        // Step 2: Extract text
        console.log(`[triggerClassification] Step 2: Extracting text...`);
        const { extractTextFromPdf, chunkPages } = await import("@/lib/services/pdf-extractor");
        const extraction = await extractTextFromPdf(Buffer.from(content));
        if (!extraction.success || extraction.pages.length === 0) {
          throw new Error(extraction.error || "Nenhum texto extraído");
        }
        console.log(`[triggerClassification] Step 2 OK: ${extraction.totalPages} pages, ${extraction.fullText.length} chars`);

        // Step 3: Classify sections with Gemini
        const { classifyFullDocument, isClassifierConfigured } = await import("@/lib/services/pdf-classifier");
        if (!isClassifierConfigured()) {
          throw new Error("Gemini API não configurada (GOOGLE_AI_API_KEY)");
        }
        const chunks = chunkPages(extraction.pages, 20);
        console.log(`[triggerClassification] Step 3: Classifying ${chunks.length} chunks with Gemini...`);
        const classification = await classifyFullDocument(chunks);
        console.log(`[triggerClassification] Step 3 result: success=${classification.success}, sections=${classification.sections.length}, error=${classification.error}`);

        if (!classification.success) {
          throw new Error(classification.error || "Falha na classificação");
        }

        // Step 4: Store sections (pode ser 0 para PDFs sem peças processuais)
        let insertedCount = 0;
        if (classification.sections.length > 0) {
          const values = classification.sections.map((s) => ({
            driveFileId: input.driveFileId,
            tipo: s.tipo,
            titulo: s.titulo,
            paginaInicio: s.paginaInicio,
            paginaFim: s.paginaFim,
            resumo: s.resumo,
            textoExtraido: extraction.pages
              .filter((p) => p.pageNumber >= s.paginaInicio && p.pageNumber <= s.paginaFim)
              .map((p) => p.text)
              .join("\n\n"),
            confianca: s.confianca,
            metadata: s.metadata,
          }));

          const inserted = await db
            .insert(driveDocumentSections)
            .values(values)
            .returning({ id: driveDocumentSections.id });
          insertedCount = inserted.length;
        }

        // Mark file as completed
        await db
          .update(driveFiles)
          .set({
            enrichmentStatus: "completed",
            enrichmentError: null,
            enrichedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(driveFiles.id, input.driveFileId));

        return {
          success: true,
          sectionsFound: classification.sections.length,
          sectionsStored: insertedCount,
          totalPages: extraction.totalPages,
        };
      } catch (error) {
        // Mark as failed
        const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
        await db
          .update(driveFiles)
          .set({
            enrichmentStatus: "failed",
            enrichmentError: errorMsg,
            updatedAt: new Date(),
          })
          .where(eq(driveFiles.id, input.driveFileId));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Classificação falhou: ${errorMsg}`,
        });
      }
    }),

  // ═══════════════════════════════════════════════
  // PROCESSAMENTO PROFUNDO (Deep Processing)
  // Para arquivos grandes (até 100MB): chunked multi-call
  // ═══════════════════════════════════════════════

  /**
   * Step 1: Download PDF + Extract text + Cache in driveFileContents.
   * Returns totalPages and totalChunks for the client to orchestrate step 2.
   */
  startDeepProcessing: protectedProcedure
    .input(z.object({ driveFileId: z.number() }))
    .mutation(async ({ input }) => {
      const startTime = Date.now();

      // 1. Get file info
      const [file] = await db
        .select({
          driveFileId: driveFiles.driveFileId,
          name: driveFiles.name,
          fileSize: driveFiles.fileSize,
        })
        .from(driveFiles)
        .where(eq(driveFiles.id, input.driveFileId))
        .limit(1);

      if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "Arquivo não encontrado" });

      // 2. Mark as processing
      await db
        .update(driveFiles)
        .set({ enrichmentStatus: "processing", enrichmentError: null, updatedAt: new Date() })
        .where(eq(driveFiles.id, input.driveFileId));

      // 3. Delete existing sections (re-process)
      await db
        .delete(driveDocumentSections)
        .where(eq(driveDocumentSections.driveFileId, input.driveFileId));

      try {
        // 4. Download PDF from Drive
        console.log(`[deepProcessing] Step 1: Downloading file ${file.driveFileId} (${file.name})...`);
        const { downloadFileContent } = await import("@/lib/services/google-drive");
        const content = await downloadFileContent(file.driveFileId);
        if (!content) throw new Error("Falha no download do arquivo");
        console.log(`[deepProcessing] Downloaded ${(content.byteLength / 1024 / 1024).toFixed(1)} MB in ${Date.now() - startTime}ms`);

        // 5. Extract text with unpdf
        console.log(`[deepProcessing] Step 2: Extracting text...`);
        const { extractTextFromPdf } = await import("@/lib/services/pdf-extractor");
        const extraction = await extractTextFromPdf(Buffer.from(content));
        if (!extraction.success || extraction.pages.length === 0) {
          throw new Error(extraction.error || "Nenhum texto extraído do PDF");
        }
        console.log(`[deepProcessing] Extracted ${extraction.totalPages} pages in ${Date.now() - startTime}ms`);

        // 6. Calculate chunks (10 pages per chunk for deep mode — safer for 60s timeout)
        const chunkSize = 10;
        const { chunkPages: computeChunks } = await import("@/lib/services/pdf-extractor");
        const totalChunks = computeChunks(extraction.pages, chunkSize).length;

        // 7. Cache extracted pages in driveFileContents
        // Delete existing cache
        await db
          .delete(driveFileContents)
          .where(eq(driveFileContents.driveFileId, input.driveFileId));

        await db.insert(driveFileContents).values({
          driveFileId: input.driveFileId,
          extractionStatus: "PROCESSING",
          contentText: extraction.fullText,
          extractedData: {
            pages: extraction.pages,
            totalChunks,
            processedChunks: 0,
            mode: "deep",
          },
          pageCount: extraction.totalPages,
          wordCount: extraction.fullText.split(/\s+/).length,
          processingTimeMs: Date.now() - startTime,
        });

        console.log(`[deepProcessing] Cached ${extraction.pages.length} pages. Ready for ${totalChunks} chunk batches.`);

        return {
          success: true,
          totalPages: extraction.totalPages,
          totalChunks,
          textLength: extraction.fullText.length,
          elapsedMs: Date.now() - startTime,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
        console.error(`[deepProcessing] startDeepProcessing failed:`, errorMsg);
        await db
          .update(driveFiles)
          .set({ enrichmentStatus: "failed", enrichmentError: errorMsg, updatedAt: new Date() })
          .where(eq(driveFiles.id, input.driveFileId));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Extração falhou: ${errorMsg}`,
        });
      }
    }),

  /**
   * Step 2+: Classify next batch of chunks from cached pages.
   * Called repeatedly by the client until isComplete === true.
   */
  processNextChunks: protectedProcedure
    .input(z.object({
      driveFileId: z.number(),
      batchSize: z.number().min(1).max(10).default(1),
    }))
    .mutation(async ({ input }) => {
      const startTime = Date.now();

      // 1. Read cached pages
      const [cached] = await db
        .select({
          extractedData: driveFileContents.extractedData,
        })
        .from(driveFileContents)
        .where(eq(driveFileContents.driveFileId, input.driveFileId))
        .limit(1);

      if (!cached?.extractedData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhum cache de extração encontrado. Execute startDeepProcessing primeiro.",
        });
      }

      const data = cached.extractedData as {
        pages: Array<{ pageNumber: number; text: string; lineCount: number }>;
        totalChunks: number;
        processedChunks: number;
        mode: string;
      };

      // Already complete?
      if (data.processedChunks >= data.totalChunks) {
        return {
          isComplete: true,
          processedChunks: data.processedChunks,
          totalChunks: data.totalChunks,
          newSections: 0,
          elapsedMs: 0,
        };
      }

      // 2. Build chunks from cached pages
      const { chunkPages } = await import("@/lib/services/pdf-extractor");
      const allChunks = chunkPages(data.pages, 10);

      // 3. Select next batch
      const startIdx = data.processedChunks;
      const endIdx = Math.min(data.processedChunks + input.batchSize, data.totalChunks);
      const batch = allChunks.slice(startIdx, endIdx);

      console.log(`[deepProcessing] Classifying chunks ${startIdx + 1}-${endIdx} of ${data.totalChunks}...`);

      // 4. Classify this batch
      const { classifyFullDocument, isClassifierConfigured } = await import("@/lib/services/pdf-classifier");
      if (!isClassifierConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Gemini API não configurada" });
      }

      const result = await classifyFullDocument(batch);

      // 5. Save new sections to DB (with inter-batch deduplication)
      let newSectionCount = 0;
      if (result.success && result.sections.length > 0) {
        // Fetch existing sections for this file to avoid inserting duplicates from overlap
        const existingSections = await db
          .select({
            tipo: driveDocumentSections.tipo,
            titulo: driveDocumentSections.titulo,
            paginaInicio: driveDocumentSections.paginaInicio,
            paginaFim: driveDocumentSections.paginaFim,
          })
          .from(driveDocumentSections)
          .where(eq(driveDocumentSections.driveFileId, input.driveFileId));

        // Filter out sections that overlap with existing ones of the same type
        const newSections = result.sections.filter((s) => {
          return !existingSections.some((existing) => {
            if (existing.tipo !== s.tipo) return false;
            // Check page overlap
            const overlaps = s.paginaInicio <= existing.paginaFim && existing.paginaInicio <= s.paginaFim;
            if (!overlaps) return false;
            // Check title similarity (simple substring check)
            const sTitleLower = s.titulo.toLowerCase();
            const eTitleLower = existing.titulo.toLowerCase();
            return sTitleLower.includes(eTitleLower.slice(0, 20)) ||
              eTitleLower.includes(sTitleLower.slice(0, 20));
          });
        });

        if (newSections.length < result.sections.length) {
          console.log(`[deepProcessing] Inter-batch dedup: ${result.sections.length - newSections.length} duplicates skipped`);
        }

        if (newSections.length > 0) {
          const values = newSections.map((s) => ({
            driveFileId: input.driveFileId,
            tipo: s.tipo,
            titulo: s.titulo,
            paginaInicio: s.paginaInicio,
            paginaFim: s.paginaFim,
            resumo: s.resumo,
            textoExtraido: data.pages
              .filter((p) => p.pageNumber >= s.paginaInicio && p.pageNumber <= s.paginaFim)
              .map((p) => p.text)
              .join("\n\n"),
            confianca: s.confianca,
            metadata: s.metadata,
          }));

          await db.insert(driveDocumentSections).values(values);
          newSectionCount = values.length;
        }
      }

      // 6. Update progress in cache
      const newProcessedChunks = endIdx;
      const isComplete = newProcessedChunks >= data.totalChunks;

      // Update extractedData without re-serializing full pages array — just update counters
      await db
        .update(driveFileContents)
        .set({
          extractedData: {
            ...data,
            processedChunks: newProcessedChunks,
          },
          extractionStatus: isComplete ? "COMPLETED" : "PROCESSING",
          updatedAt: new Date(),
        })
        .where(eq(driveFileContents.driveFileId, input.driveFileId));

      // 7. If complete, finalize
      if (isComplete) {
        console.log(`[deepProcessing] All ${data.totalChunks} chunks processed. Finalizing...`);

        // Mark file as completed
        await db
          .update(driveFiles)
          .set({
            enrichmentStatus: "completed",
            enrichmentError: null,
            enrichedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(driveFiles.id, input.driveFileId));

        // Clean up cached pages (keep metadata only, drop heavy pages array)
        await db
          .update(driveFileContents)
          .set({
            extractedData: {
              totalChunks: data.totalChunks,
              processedChunks: newProcessedChunks,
              mode: "deep",
              completed: true,
            },
            extractedAt: new Date(),
          })
          .where(eq(driveFileContents.driveFileId, input.driveFileId));
      }

      const elapsedMs = Date.now() - startTime;
      console.log(`[deepProcessing] Batch done: ${newSectionCount} sections, ${elapsedMs}ms, ${isComplete ? "COMPLETE" : `${newProcessedChunks}/${data.totalChunks}`}`);

      return {
        isComplete,
        processedChunks: newProcessedChunks,
        totalChunks: data.totalChunks,
        newSections: newSectionCount,
        tokensUsed: result.tokensUsed || 0,
        elapsedMs,
      };
    }),

  /**
   * Query: Get deep processing progress for a file.
   */
  getDeepProcessingStatus: protectedProcedure
    .input(z.object({ driveFileId: z.number() }))
    .query(async ({ input }) => {
      const [file] = await db
        .select({
          enrichmentStatus: driveFiles.enrichmentStatus,
          enrichmentError: driveFiles.enrichmentError,
          fileSize: driveFiles.fileSize,
        })
        .from(driveFiles)
        .where(eq(driveFiles.id, input.driveFileId))
        .limit(1);

      const [cached] = await db
        .select({
          extractedData: driveFileContents.extractedData,
          extractionStatus: driveFileContents.extractionStatus,
          pageCount: driveFileContents.pageCount,
        })
        .from(driveFileContents)
        .where(eq(driveFileContents.driveFileId, input.driveFileId))
        .limit(1);

      const sectionCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(driveDocumentSections)
        .where(eq(driveDocumentSections.driveFileId, input.driveFileId));

      const meta = cached?.extractedData as {
        totalChunks?: number;
        processedChunks?: number;
        mode?: string;
        completed?: boolean;
      } | null;

      return {
        enrichmentStatus: file?.enrichmentStatus || "pending",
        enrichmentError: file?.enrichmentError,
        fileSize: file?.fileSize || 0,
        pageCount: cached?.pageCount || 0,
        totalChunks: meta?.totalChunks || 0,
        processedChunks: meta?.processedChunks || 0,
        sectionsFound: sectionCount[0]?.count || 0,
        mode: meta?.mode || "simple",
        isComplete: meta?.completed || false,
        progress: meta?.totalChunks
          ? Math.round(((meta.processedChunks || 0) / meta.totalChunks) * 100)
          : 0,
      };
    }),

  // Trigger bookmark insertion via Inngest
  triggerBookmarks: protectedProcedure
    .input(z.object({ driveFileId: z.number() }))
    .mutation(async ({ input }) => {
      // Get the Google Drive file ID
      const [file] = await db
        .select({ driveFileId: driveFiles.driveFileId })
        .from(driveFiles)
        .where(eq(driveFiles.id, input.driveFileId))
        .limit(1);

      if (!file) throw new Error("File not found");

      try {
        const { inngest } = await import("@/lib/inngest/client");
        await inngest.send({
          name: "pdf/insert-bookmarks",
          data: {
            driveFileId: input.driveFileId,
            driveGoogleId: file.driveFileId,
          },
        });
      } catch (err) {
        console.warn("[Bookmarks] Inngest send failed (non-fatal):", err);
      }

      return { triggered: true };
    }),

  // Extract a section as a separate PDF and upload to Drive
  extractSectionToPdf: protectedProcedure
    .input(z.object({
      sectionId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // 1. Fetch section
      const [section] = await db
        .select()
        .from(driveDocumentSections)
        .where(eq(driveDocumentSections.id, input.sectionId))
        .limit(1);

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Seção não encontrada" });
      }

      // 2. Fetch parent file
      const [file] = await db
        .select()
        .from(driveFiles)
        .where(eq(driveFiles.id, section.driveFileId))
        .limit(1);

      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Arquivo não encontrado" });
      }

      // 3. Download original PDF from Drive
      const { downloadFileContent } = await import("@/lib/services/google-drive");
      const content = await downloadFileContent(file.driveFileId);

      if (!content) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao baixar PDF do Drive" });
      }

      const originalBuffer = Buffer.from(content);

      // 4. Extract pages with pdf-lib (DB uses 1-based, pdf-lib uses 0-based)
      const { PDFDocument } = await import("pdf-lib");
      const originalPdf = await PDFDocument.load(originalBuffer);
      const extractedPdf = await PDFDocument.create();

      const startIdx = section.paginaInicio - 1;
      const endIdx = section.paginaFim - 1;
      const pageIndices = Array.from(
        { length: endIdx - startIdx + 1 },
        (_, i) => startIdx + i
      );

      const copiedPages = await extractedPdf.copyPages(originalPdf, pageIndices);
      copiedPages.forEach((page) => extractedPdf.addPage(page));

      const extractedBytes = await extractedPdf.save();
      const extractedBuffer = Buffer.from(extractedBytes);

      // 5. Generate sanitized filename
      const tipoLabel = TIPO_LABELS[section.tipo] || section.tipo;
      const cleanTitle = section.titulo
        .replace(/[^\w\s\-áéíóúàãõâêôçÁÉÍÓÚÀÃÕÂÊÔÇ]/g, "")
        .trim();
      const fileName = `[${tipoLabel}] ${cleanTitle}.pdf`.substring(0, 200);

      // 6. Upload extracted PDF to same Drive folder
      const { uploadFileBuffer } = await import("@/lib/services/google-drive");
      const uploaded = await uploadFileBuffer(
        extractedBuffer,
        fileName,
        "application/pdf",
        file.driveFolderId,
      );

      if (!uploaded) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao fazer upload do PDF extraído" });
      }

      // 7. Register new file in DB
      const [newFile] = await db
        .insert(driveFiles)
        .values({
          driveFileId: uploaded.id,
          driveFolderId: file.driveFolderId,
          name: fileName,
          mimeType: "application/pdf",
          fileSize: extractedBuffer.length,
          webViewLink: uploaded.webViewLink || null,
          webContentLink: uploaded.webContentLink || null,
          enrichmentStatus: "completed",
          processoId: file.processoId,
          assistidoId: file.assistidoId,
          syncStatus: "synced",
          isFolder: false,
        })
        .returning();

      return {
        success: true,
        newFileId: newFile.id,
        fileName,
        webViewLink: uploaded.webViewLink || "",
        pageCount: pageIndices.length,
      };
    }),

  // Generate report data (sections with metadata for client-side PDF generation)
  getReportData: protectedProcedure
    .input(z.object({ driveFileId: z.number() }))
    .query(async ({ input }) => {
      const sections = await db
        .select({
          tipo: driveDocumentSections.tipo,
          titulo: driveDocumentSections.titulo,
          paginaInicio: driveDocumentSections.paginaInicio,
          paginaFim: driveDocumentSections.paginaFim,
          resumo: driveDocumentSections.resumo,
          confianca: driveDocumentSections.confianca,
          metadata: driveDocumentSections.metadata,
        })
        .from(driveDocumentSections)
        .where(eq(driveDocumentSections.driveFileId, input.driveFileId))
        .orderBy(asc(driveDocumentSections.paginaInicio));

      const [file] = await db
        .select({
          name: driveFiles.name,
          fileSize: driveFiles.fileSize,
        })
        .from(driveFiles)
        .where(eq(driveFiles.id, input.driveFileId))
        .limit(1);

      return {
        fileName: file?.name || "Unknown",
        sections,
      };
    }),

  // Check if OCR was applied for a file
  getOcrStatus: protectedProcedure
    .input(z.object({ driveFileId: z.number() }))
    .query(async ({ input }) => {
      const [content] = await db
        .select({ ocrApplied: driveFileContents.ocrApplied })
        .from(driveFileContents)
        .where(eq(driveFileContents.driveFileId, input.driveFileId))
        .limit(1);
      return { ocrApplied: content?.ocrApplied ?? false };
    }),

  // ═══════════════════════════════════════════════
  // SISTEMATIZAÇÃO — Review Flow (HITL)
  // ═══════════════════════════════════════════════

  // Aprovar seção — marca como revisada e gera ficha se não existe
  approveSection: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [section] = await db
        .update(driveDocumentSections)
        .set({ reviewStatus: "approved", updatedAt: new Date() })
        .where(eq(driveDocumentSections.id, input.id))
        .returning();

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Seção não encontrada" });
      }

      // Gerar ficha diretamente se fichaData está vazia e tem texto
      if (
        (!section.fichaData || Object.keys(section.fichaData).length === 0) &&
        section.textoExtraido &&
        section.textoExtraido.trim().length >= 20
      ) {
        try {
          const { generateFicha, isFichaGeneratorConfigured } = await import(
            "@/lib/services/pdf-ficha-generator"
          );

          if (isFichaGeneratorConfigured()) {
            const result = await generateFicha(
              section.textoExtraido,
              section.tipo,
              section.titulo || undefined,
            );

            // Salvar ficha no banco
            await db
              .update(driveDocumentSections)
              .set({ fichaData: result.fichaData, updatedAt: new Date() })
              .where(eq(driveDocumentSections.id, section.id));

            // Retornar section atualizado com fichaData
            return { ...section, fichaData: result.fichaData };
          }
        } catch (err) {
          // Não falhar a aprovação se a geração de ficha falhar
          console.warn(
            `[sistematizacao] Ficha generation failed for section ${section.id}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }

      return section;
    }),

  // Rejeitar seção
  rejectSection: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [section] = await db
        .update(driveDocumentSections)
        .set({ reviewStatus: "rejected", updatedAt: new Date() })
        .where(eq(driveDocumentSections.id, input.id))
        .returning();

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Seção não encontrada" });
      }
      return section;
    }),

  // Marcar como "precisa revisão"
  markNeedsReview: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [section] = await db
        .update(driveDocumentSections)
        .set({ reviewStatus: "needs_review", updatedAt: new Date() })
        .where(eq(driveDocumentSections.id, input.id))
        .returning();

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Seção não encontrada" });
      }
      return section;
    }),

  // Batch approve multiple sections
  batchApprove: protectedProcedure
    .input(z.object({ ids: z.array(z.number()).min(1) }))
    .mutation(async ({ input }) => {
      const updated = await db
        .update(driveDocumentSections)
        .set({ reviewStatus: "approved", updatedAt: new Date() })
        .where(inArray(driveDocumentSections.id, input.ids))
        .returning({ id: driveDocumentSections.id });

      return { approved: updated.length };
    }),

  // Batch extract approved sections to Drive
  extractApprovedToDrive: protectedProcedure
    .input(z.object({ driveFileId: z.number() }))
    .mutation(async ({ input }) => {
      // Get all approved sections for this file
      const approvedSections = await db
        .select()
        .from(driveDocumentSections)
        .where(
          and(
            eq(driveDocumentSections.driveFileId, input.driveFileId),
            eq(driveDocumentSections.reviewStatus, "approved")
          )
        )
        .orderBy(asc(driveDocumentSections.paginaInicio));

      if (approvedSections.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma seção aprovada para extrair" });
      }

      // Get parent file
      const [file] = await db
        .select()
        .from(driveFiles)
        .where(eq(driveFiles.id, input.driveFileId))
        .limit(1);

      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Arquivo não encontrado" });
      }

      // Download original PDF once
      const { downloadFileContent } = await import("@/lib/services/google-drive");
      const content = await downloadFileContent(file.driveFileId);
      if (!content) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao baixar PDF" });
      }

      const { PDFDocument } = await import("pdf-lib");
      const originalPdf = await PDFDocument.load(Buffer.from(content));
      const { uploadFileBuffer } = await import("@/lib/services/google-drive");

      const results: Array<{ sectionId: number; fileName: string; newFileId: number }> = [];

      for (const section of approvedSections) {
        try {
          const extractedPdf = await PDFDocument.create();
          const startIdx = section.paginaInicio - 1;
          const endIdx = section.paginaFim - 1;
          const pageIndices = Array.from(
            { length: endIdx - startIdx + 1 },
            (_, i) => startIdx + i
          );

          const copiedPages = await extractedPdf.copyPages(originalPdf, pageIndices);
          copiedPages.forEach((page) => extractedPdf.addPage(page));

          const extractedBytes = await extractedPdf.save();
          const extractedBuffer = Buffer.from(extractedBytes);

          const tipoLabel = TIPO_LABELS[section.tipo] || section.tipo;
          const cleanTitle = section.titulo
            .replace(/[^\w\s\-áéíóúàãõâêôçÁÉÍÓÚÀÃÕÂÊÔÇ]/g, "")
            .trim();
          const fileName = `[${tipoLabel}] ${cleanTitle} - pg${section.paginaInicio}-${section.paginaFim}.pdf`.substring(0, 200);

          const uploaded = await uploadFileBuffer(
            extractedBuffer,
            fileName,
            "application/pdf",
            file.driveFolderId,
          );

          if (uploaded) {
            const [newFile] = await db
              .insert(driveFiles)
              .values({
                driveFileId: uploaded.id,
                driveFolderId: file.driveFolderId,
                name: fileName,
                mimeType: "application/pdf",
                fileSize: extractedBuffer.length,
                webViewLink: uploaded.webViewLink || null,
                webContentLink: uploaded.webContentLink || null,
                enrichmentStatus: "completed",
                processoId: file.processoId,
                assistidoId: file.assistidoId,
                syncStatus: "synced",
                isFolder: false,
              })
              .returning();

            results.push({
              sectionId: section.id,
              fileName,
              newFileId: newFile.id,
            });
          }
        } catch (err) {
          console.error(`[extractApprovedToDrive] Error extracting section ${section.id}:`, err);
        }
      }

      return { extracted: results.length, total: approvedSections.length, results };
    }),

  // Get review progress for a file
  getReviewProgress: protectedProcedure
    .input(z.object({ driveFileId: z.number() }))
    .query(async ({ input }) => {
      const result = await db
        .select({
          reviewStatus: driveDocumentSections.reviewStatus,
          count: sql<number>`count(*)::int`,
        })
        .from(driveDocumentSections)
        .where(eq(driveDocumentSections.driveFileId, input.driveFileId))
        .groupBy(driveDocumentSections.reviewStatus);

      const statusCounts: Record<string, number> = {};
      let total = 0;
      for (const row of result) {
        statusCounts[row.reviewStatus] = row.count;
        total += row.count;
      }

      return {
        total,
        pending: statusCounts.pending || 0,
        approved: statusCounts.approved || 0,
        rejected: statusCounts.rejected || 0,
        needsReview: statusCounts.needs_review || 0,
        reviewed: (statusCounts.approved || 0) + (statusCounts.rejected || 0),
        percentReviewed: total > 0 ? Math.round(((statusCounts.approved || 0) + (statusCounts.rejected || 0)) / total * 100) : 0,
      };
    }),

  // Update ficha data for a section (from enrichment pipeline or manual edit)
  updateFicha: protectedProcedure
    .input(z.object({
      id: z.number(),
      fichaData: z.record(z.unknown()),
    }))
    .mutation(async ({ input }) => {
      const [section] = await db
        .update(driveDocumentSections)
        .set({
          fichaData: input.fichaData,
          updatedAt: new Date(),
        })
        .where(eq(driveDocumentSections.id, input.id))
        .returning();

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Seção não encontrada" });
      }
      return section;
    }),

  // Get type labels and icons (for frontend rendering)
  getTypeMetadata: protectedProcedure
    .query(() => {
      return { labels: TIPO_LABELS, icons: TIPO_ICONS };
    }),
});
