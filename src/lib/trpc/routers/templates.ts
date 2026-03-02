import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db, documentTemplates } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

const categoryEnum = z.enum([
  "peticao",
  "hc",
  "alegacoes",
  "resposta",
  "recurso",
  "oficio",
  "outros",
]);

export const templatesRouter = router({
  // List all active templates
  list: protectedProcedure
    .input(
      z
        .object({
          category: categoryEnum.optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const conditions = [eq(documentTemplates.isActive, true)];
      if (input?.category) {
        conditions.push(eq(documentTemplates.category, input.category));
      }

      return db
        .select()
        .from(documentTemplates)
        .where(and(...conditions))
        .orderBy(documentTemplates.category, documentTemplates.name);
    }),

  // Create template
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        driveFileId: z.string().min(1),
        driveFolderId: z.string().optional(),
        category: categoryEnum,
        placeholders: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [template] = await db
        .insert(documentTemplates)
        .values({
          name: input.name,
          description: input.description,
          driveFileId: input.driveFileId,
          driveFolderId: input.driveFolderId,
          category: input.category,
          placeholders: input.placeholders || [],
          createdBy: ctx.user.id,
        })
        .returning();

      return template;
    }),

  // Update template
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        category: categoryEnum.optional(),
        placeholders: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;

      const [updated] = await db
        .update(documentTemplates)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(documentTemplates.id, id))
        .returning();

      if (!updated)
        throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  // Soft delete template
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .update(documentTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(documentTemplates.id, input.id));

      return { success: true };
    }),

  // Generate document from template (copy in Drive)
  generateFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        targetFolderId: z.string(),
        fileName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Fetch template
      const [template] = await db
        .select()
        .from(documentTemplates)
        .where(eq(documentTemplates.id, input.templateId))
        .limit(1);

      if (!template)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template não encontrado",
        });

      // 2. Copy file in Google Drive
      const { copyFileInDrive } = await import(
        "@/lib/services/google-drive"
      );

      const newFileName = input.fileName || template.name;
      const copied = await copyFileInDrive(
        template.driveFileId,
        input.targetFolderId,
        newFileName
      );

      if (!copied)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao copiar template no Drive",
        });

      return {
        success: true,
        fileId: copied.id,
        fileName: newFileName,
        webViewLink:
          copied.webViewLink ||
          `https://docs.google.com/document/d/${copied.id}/edit`,
      };
    }),
});
