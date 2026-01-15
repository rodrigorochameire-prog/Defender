import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, pets, petTutors, documents } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { safeAsync, Errors } from "@/lib/errors";

import { getSupabaseAdmin } from "@/lib/supabase/client";



export const documentsRouter = router({
  /**
   * Lista documentos de um pet
   */
  byPet: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        category: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar acesso ao pet
        if (ctx.user.role !== "admin") {
          const relation = await db.query.petTutors.findFirst({
            where: and(
              eq(petTutors.petId, input.petId),
              eq(petTutors.tutorId, ctx.user.id)
            ),
          });

          if (!relation) {
            throw Errors.forbidden();
          }
        }

        let conditions = [eq(documents.petId, input.petId)];

        if (input.category) {
          conditions.push(eq(documents.category, input.category));
        }

        const result = await db
          .select()
          .from(documents)
          .where(and(...conditions))
          .orderBy(desc(documents.createdAt));

        return result;
      }, "Erro ao buscar documentos");
    }),

  /**
   * Upload de documento
   */
  upload: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        category: z.enum([
          "vaccination", 
          "exam", 
          "prescription", 
          "medical_record", 
          "preventive",
          "training",
          "behavior",
          "nutrition",
          "insurance",
          "identification",
          "contract",
          "photo",
          "other"
        ]),
        fileUrl: z.string().url(),
        fileName: z.string().optional(),
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
        eventDate: z.string().or(z.date()).optional(), // Para integrar com calendário
        expirationDate: z.string().or(z.date()).optional(), // Data de vencimento
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Log detalhado para debug
        console.log('[documents.upload] ctx.user:', JSON.stringify(ctx.user));
        console.log('[documents.upload] input:', JSON.stringify(input));
        // Verificar acesso ao pet
        if (ctx.user.role !== "admin") {
          const relation = await db.query.petTutors.findFirst({
            where: and(
              eq(petTutors.petId, input.petId),
              eq(petTutors.tutorId, ctx.user.id)
            ),
          });

          if (!relation) {
            throw Errors.forbidden();
          }
        }

        const [document] = await db
          .insert(documents)
          .values({
            petId: input.petId,
            uploadedById: ctx.user.id,
            title: input.title,
            description: input.description || null,
            category: input.category,
            fileUrl: input.fileUrl,
            fileName: input.fileName || null,
            mimeType: input.mimeType || null,
            fileSize: input.fileSize || null,
          })
          .returning();

        return document;
      }, "Erro ao fazer upload do documento");
    }),

  /**
   * Atualiza documento
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        category: z.enum([
          "vaccination", 
          "exam", 
          "prescription", 
          "medical_record", 
          "preventive",
          "training",
          "behavior",
          "nutrition",
          "insurance",
          "identification",
          "contract",
          "photo",
          "other"
        ]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};

        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.category !== undefined) updateData.category = data.category;

        const [document] = await db
          .update(documents)
          .set(updateData)
          .where(eq(documents.id, id))
          .returning();

        return document;
      }, "Erro ao atualizar documento");
    }),

  /**
   * Remove documento
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        // TODO: Remover arquivo do storage
        await db.delete(documents).where(eq(documents.id, input.id));
        return { success: true };
      }, "Erro ao remover documento");
    }),

  /**
   * Lista todos os documentos (admin)
   */
  list: adminProcedure
    .input(
      z.object({
        category: z.string().optional(),
        limit: z.number().default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let conditions: ReturnType<typeof eq>[] = [];

        if (input?.category) {
          conditions.push(eq(documents.category, input.category));
        }

        const result = await db
          .select({
            document: documents,
            pet: {
              id: pets.id,
              name: pets.name,
            },
          })
          .from(documents)
          .innerJoin(pets, eq(documents.petId, pets.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(documents.createdAt))
          .limit(input?.limit || 50);

        return result;
      }, "Erro ao listar documentos");
    }),

  /**
   * Estatísticas de documentos
   */
  stats: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents);

      const [byCategory] = await db
        .select({
          category: documents.category,
          count: sql<number>`count(*)::int`,
        })
        .from(documents)
        .groupBy(documents.category);

      return {
        total: total?.count || 0,
      };
    }, "Erro ao buscar estatísticas de documentos");
  }),

  /**
   * Gera URL assinada para upload direto ao Storage (usando service key)
   */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        category: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar acesso ao pet
        if (ctx.user.role !== "admin") {
          const relation = await db.query.petTutors.findFirst({
            where: and(
              eq(petTutors.petId, input.petId),
              eq(petTutors.tutorId, ctx.user.id)
            ),
          });

          if (!relation) {
            throw Errors.forbidden();
          }
        }

        const supabase = getSupabaseAdmin();
        
        // Gerar nome único para o arquivo
        const fileExt = input.fileName.split(".").pop()?.toLowerCase() || "bin";
        const filePath = `pets/${input.petId}/${input.category}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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
   * Upload de arquivo via servidor (usando service key - sem RLS)
   */
  uploadFile: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        category: z.string(),
        fileName: z.string(),
        fileBase64: z.string(), // Arquivo em base64
        mimeType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar acesso ao pet
        if (ctx.user.role !== "admin") {
          const relation = await db.query.petTutors.findFirst({
            where: and(
              eq(petTutors.petId, input.petId),
              eq(petTutors.tutorId, ctx.user.id)
            ),
          });

          if (!relation) {
            throw Errors.forbidden();
          }
        }

        const supabase = getSupabaseAdmin();
        
        // Gerar nome único para o arquivo
        const fileExt = input.fileName.split(".").pop()?.toLowerCase() || "bin";
        const filePath = `pets/${input.petId}/${input.category}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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
