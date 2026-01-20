import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, documentos, processos, assistidos, demandas } from "@/lib/db";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { safeAsync, Errors } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getWorkspaceScope, resolveWorkspaceId } from "../workspace";

export const documentsRouter = router({
  /**
   * Lista documentos de um processo
   */
  byProcesso: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        categoria: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
        const processo = await db.query.processos.findFirst({
          where: eq(processos.id, input.processoId),
        });

        if (!processo) {
          throw Errors.notFound("Processo");
        }

        if (!isAdmin && processo.workspaceId !== workspaceId) {
          throw Errors.forbidden("Você não tem acesso a este processo.");
        }

        let conditions = [eq(documentos.processoId, input.processoId)];

        if (input.categoria) {
          conditions.push(eq(documentos.categoria, input.categoria));
        }

        if (!isAdmin) {
          conditions.push(eq(documentos.workspaceId, workspaceId));
        }

        const result = await db
          .select()
          .from(documentos)
          .where(and(...conditions))
          .orderBy(desc(documentos.createdAt));

        return result;
      }, "Erro ao buscar documentos");
    }),

  /**
   * Lista documentos de um assistido
   */
  byAssistido: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number(),
        categoria: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
        const assistido = await db.query.assistidos.findFirst({
          where: eq(assistidos.id, input.assistidoId),
        });

        if (!assistido) {
          throw Errors.notFound("Assistido");
        }

        if (!isAdmin && assistido.workspaceId !== workspaceId) {
          throw Errors.forbidden("Você não tem acesso a este assistido.");
        }

        let conditions = [eq(documentos.assistidoId, input.assistidoId)];

        if (input.categoria) {
          conditions.push(eq(documentos.categoria, input.categoria));
        }

        if (!isAdmin) {
          conditions.push(eq(documentos.workspaceId, workspaceId));
        }

        const result = await db
          .select()
          .from(documentos)
          .where(and(...conditions))
          .orderBy(desc(documentos.createdAt));

        return result;
      }, "Erro ao buscar documentos");
    }),

  /**
   * Upload de documento
   */
  upload: protectedProcedure
    .input(
      z.object({
        processoId: z.number().optional(),
        assistidoId: z.number().optional(),
        demandaId: z.number().optional(),
        titulo: z.string().min(1).max(200),
        descricao: z.string().optional(),
        categoria: z.enum([
          "peca",
          "procuracao",
          "documento_pessoal",
          "comprovante",
          "decisao",
          "sentenca",
          "recurso",
          "outro"
        ]),
        tipoPeca: z.string().optional(),
        fileUrl: z.string().url(),
        fileName: z.string().optional(),
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
        isTemplate: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const { isAdmin, workspaceId: userWorkspaceId } = getWorkspaceScope(ctx.user);
        let targetWorkspaceId = resolveWorkspaceId(ctx.user);
        const relatedWorkspaces = new Set<number>();

        if (input.processoId) {
          const processo = await db.query.processos.findFirst({
            where: eq(processos.id, input.processoId),
          });

          if (!processo?.workspaceId) {
            throw Errors.badRequest("Processo sem workspace atribuído.");
          }

          relatedWorkspaces.add(processo.workspaceId);
        }

        if (input.assistidoId) {
          const assistido = await db.query.assistidos.findFirst({
            where: eq(assistidos.id, input.assistidoId),
          });

          if (!assistido?.workspaceId) {
            throw Errors.badRequest("Assistido sem workspace atribuído.");
          }

          relatedWorkspaces.add(assistido.workspaceId);
        }

        if (input.demandaId) {
          const demanda = await db.query.demandas.findFirst({
            where: eq(demandas.id, input.demandaId),
          });

          if (!demanda?.workspaceId) {
            throw Errors.badRequest("Demanda sem workspace atribuído.");
          }

          relatedWorkspaces.add(demanda.workspaceId);
        }

        if (relatedWorkspaces.size > 1) {
          throw Errors.badRequest("Processo, assistido e demanda precisam do mesmo workspace.");
        }

        if (relatedWorkspaces.size === 1) {
          targetWorkspaceId = Array.from(relatedWorkspaces)[0];
        }

        if (!targetWorkspaceId) {
          throw Errors.badRequest("Defina um workspace para fazer upload do documento.");
        }

        if (!isAdmin && targetWorkspaceId !== userWorkspaceId) {
          throw Errors.forbidden("Você não tem acesso a esse workspace.");
        }

        const [documento] = await db
          .insert(documentos)
          .values({
            processoId: input.processoId || null,
            assistidoId: input.assistidoId || null,
            demandaId: input.demandaId || null,
            uploadedById: ctx.user.id,
            workspaceId: targetWorkspaceId,
            titulo: input.titulo,
            descricao: input.descricao || null,
            categoria: input.categoria,
            tipoPeca: input.tipoPeca || null,
            fileUrl: input.fileUrl,
            fileName: input.fileName || null,
            mimeType: input.mimeType || null,
            fileSize: input.fileSize || null,
            isTemplate: input.isTemplate || false,
          })
          .returning();

        return documento;
      }, "Erro ao fazer upload do documento");
    }),

  /**
   * Atualiza documento
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        titulo: z.string().min(1).max(200).optional(),
        descricao: z.string().optional(),
        categoria: z.enum([
          "peca",
          "procuracao",
          "documento_pessoal",
          "comprovante",
          "decisao",
          "sentenca",
          "recurso",
          "outro"
        ]).optional(),
        tipoPeca: z.string().optional(),
        isTemplate: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
        const { id, ...data } = input;
        const existing = await db.query.documentos.findFirst({
          where: eq(documentos.id, id),
        });

        if (!existing) {
          throw Errors.notFound("Documento");
        }

        if (!isAdmin && existing.workspaceId !== workspaceId) {
          throw Errors.forbidden("Você não tem acesso a este documento.");
        }

        const updateData: Record<string, unknown> = { updatedAt: new Date() };

        if (data.titulo !== undefined) updateData.titulo = data.titulo;
        if (data.descricao !== undefined) updateData.descricao = data.descricao;
        if (data.categoria !== undefined) updateData.categoria = data.categoria;
        if (data.tipoPeca !== undefined) updateData.tipoPeca = data.tipoPeca;
        if (data.isTemplate !== undefined) updateData.isTemplate = data.isTemplate;

        const [documento] = await db
          .update(documentos)
          .set(updateData)
          .where(eq(documentos.id, id))
          .returning();

        return documento;
      }, "Erro ao atualizar documento");
    }),

  /**
   * Remove documento
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
        const existing = await db.query.documentos.findFirst({
          where: eq(documentos.id, input.id),
        });

        if (!existing) {
          throw Errors.notFound("Documento");
        }

        if (!isAdmin && existing.workspaceId !== workspaceId) {
          throw Errors.forbidden("Você não tem acesso a este documento.");
        }

        // TODO: Remover arquivo do storage
        await db.delete(documentos).where(eq(documentos.id, input.id));
        return { success: true };
      }, "Erro ao remover documento");
    }),

  /**
   * Lista todos os documentos (admin)
   */
  list: adminProcedure
    .input(
      z.object({
        categoria: z.string().optional(),
        isTemplate: z.boolean().optional(),
        limit: z.number().default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let conditions: ReturnType<typeof eq>[] = [];

        if (input?.categoria) {
          conditions.push(eq(documentos.categoria, input.categoria));
        }

        if (input?.isTemplate !== undefined) {
          conditions.push(eq(documentos.isTemplate, input.isTemplate));
        }

        const result = await db
          .select({
            documento: documentos,
            processo: {
              id: processos.id,
              numeroAutos: processos.numeroAutos,
            },
            assistido: {
              id: assistidos.id,
              nome: assistidos.nome,
            },
          })
          .from(documentos)
          .leftJoin(processos, eq(documentos.processoId, processos.id))
          .leftJoin(assistidos, eq(documentos.assistidoId, assistidos.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(documentos.createdAt))
          .limit(input?.limit || 50);

        return result;
      }, "Erro ao listar documentos");
    }),

  /**
   * Lista templates de peças
   */
  templates: protectedProcedure
    .input(
      z.object({
        tipoPeca: z.string().optional(),
        limit: z.number().default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let conditions = [eq(documentos.isTemplate, true)];

        if (input?.tipoPeca) {
          conditions.push(eq(documentos.tipoPeca, input.tipoPeca));
        }

        const result = await db
          .select()
          .from(documentos)
          .where(and(...conditions))
          .orderBy(desc(documentos.createdAt))
          .limit(input?.limit || 50);

        return result;
      }, "Erro ao listar templates");
    }),

  /**
   * Estatísticas de documentos
   */
  stats: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documentos);

      const [templates] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documentos)
        .where(eq(documentos.isTemplate, true));

      return {
        total: total?.count || 0,
        templates: templates?.count || 0,
      };
    }, "Erro ao buscar estatísticas de documentos");
  }),

  /**
   * Gera URL assinada para upload direto ao Storage
   */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        processoId: z.number().optional(),
        categoria: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const supabase = getSupabaseAdmin();
        
        // Gerar nome único para o arquivo
        const fileExt = input.fileName.split(".").pop()?.toLowerCase() || "bin";
        const folder = input.processoId ? `processos/${input.processoId}` : "geral";
        const filePath = `${folder}/${input.categoria}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Criar URL assinada para upload
        const { data, error } = await supabase.storage
          .from("documents")
          .createSignedUploadUrl(filePath);

        if (error) {
          throw Errors.internal(`Erro ao gerar URL de upload: ${error.message}`);
        }

        return {
          signedUrl: data.signedUrl,
          path: data.path,
          token: data.token,
        };
      }, "Erro ao gerar URL de upload");
    }),

  /**
   * Upload de arquivo via servidor
   */
  uploadFile: protectedProcedure
    .input(
      z.object({
        processoId: z.number().optional(),
        categoria: z.string(),
        fileName: z.string(),
        fileBase64: z.string(), // Arquivo em base64
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const supabase = getSupabaseAdmin();
        
        // Gerar nome único para o arquivo
        const fileExt = input.fileName.split(".").pop()?.toLowerCase() || "bin";
        const folder = input.processoId ? `processos/${input.processoId}` : "geral";
        const filePath = `${folder}/${input.categoria}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Converter base64 para buffer
        const base64Data = input.fileBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Upload usando service key (sem RLS)
        const { data, error } = await supabase.storage
          .from("documents")
          .upload(filePath, buffer, {
            contentType: input.mimeType,
            upsert: false,
          });

        if (error) {
          throw Errors.internal(`Erro no upload: ${error.message}`);
        }

        // Gerar URL pública
        const { data: urlData } = supabase.storage
          .from("documents")
          .getPublicUrl(data.path);

        return {
          url: urlData.publicUrl,
          path: data.path,
          fileName: input.fileName,
          mimeType: input.mimeType,
          fileSize: buffer.length,
        };
      }, "Erro ao fazer upload do arquivo");
    }),
});
