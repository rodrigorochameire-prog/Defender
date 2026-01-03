import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, pets, petTutors } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { safeAsync, Errors } from "@/lib/errors";
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

// Schema para documentos
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull(),
  uploadedById: integer("uploaded_by_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // 'vaccination' | 'exam' | 'prescription' | 'other'
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 50 }),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
        category: z.enum(["vaccination", "exam", "prescription", "other"]),
        fileUrl: z.string().url(),
        fileType: z.string().optional(),
        fileSize: z.number().optional(),
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

        const [document] = await db
          .insert(documents)
          .values({
            petId: input.petId,
            uploadedById: ctx.user.id,
            title: input.title,
            description: input.description || null,
            category: input.category,
            fileUrl: input.fileUrl,
            fileType: input.fileType || null,
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
        category: z.enum(["vaccination", "exam", "prescription", "other"]).optional(),
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
});
