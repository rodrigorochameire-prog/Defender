import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db, driveDocumentSections, driveFiles } from "@/lib/db";
import { eq, and, desc, asc, ilike, sql, inArray } from "drizzle-orm";

const sectionTipoEnum = z.enum([
  "denuncia",
  "sentenca",
  "decisao",
  "depoimento",
  "alegacoes",
  "certidao",
  "laudo",
  "inquerito",
  "recurso",
  "outros",
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
      metadata: z.object({
        partesmencionadas: z.array(z.string()).optional(),
        datasExtraidas: z.array(z.string()).optional(),
        artigosLei: z.array(z.string()).optional(),
        juiz: z.string().optional(),
        promotor: z.string().optional(),
      }).optional(),
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
      metadata: z.object({
        partesmencionadas: z.array(z.string()).optional(),
        datasExtraidas: z.array(z.string()).optional(),
        artigosLei: z.array(z.string()).optional(),
        juiz: z.string().optional(),
        promotor: z.string().optional(),
      }).optional(),
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

      const { inngest } = await import("@/lib/inngest/client");
      await inngest.send({
        name: "pdf/insert-bookmarks",
        data: {
          driveFileId: input.driveFileId,
          driveGoogleId: file.driveFileId,
        },
      });

      return { triggered: true };
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
});
