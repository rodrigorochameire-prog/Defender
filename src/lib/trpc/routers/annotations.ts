import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db, driveFileAnnotations } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

// Expanded color palette matching the frontend ANNOTATION_COLORS config
const annotationCorEnum = z.enum([
  "yellow", "red", "green", "blue", "purple",
  "pink", "teal", "indigo", "orange", "cyan",
]);

// Annotation types: highlight, note, underline, bookmark, ink (caneta livre)
const annotationTipoEnum = z.enum(["highlight", "note", "underline", "bookmark", "ink"]);

// Position schema: single-rect (legacy), multi-rect, ou ink (traços à mão livre).
// Ink guarda paths normalizados [0..1]: paths[traço][ponto] = [x, y].
const singleRectSchema = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() });
const inkSchema = z.object({
  paths: z.array(z.array(z.tuple([z.number(), z.number()]))),
  strokeWidth: z.number().optional(),
});
const posicaoSchema = z.union([
  singleRectSchema,
  z.object({ rects: z.array(singleRectSchema) }),
  inkSchema,
]).optional();

export const annotationsRouter = router({
  // List annotations for a file
  listByFile: protectedProcedure
    .input(z.object({
      driveFileId: z.number(),
      pagina: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(driveFileAnnotations.driveFileId, input.driveFileId)];
      if (input.pagina !== undefined) {
        conditions.push(eq(driveFileAnnotations.pagina, input.pagina));
      }

      const annotations = await db
        .select()
        .from(driveFileAnnotations)
        .where(and(...conditions))
        .orderBy(driveFileAnnotations.pagina, driveFileAnnotations.createdAt);

      return annotations;
    }),

  // Create annotation
  create: protectedProcedure
    .input(z.object({
      driveFileId: z.number(),
      tipo: annotationTipoEnum,
      pagina: z.number().min(1),
      cor: annotationCorEnum.default("yellow"),
      texto: z.string().optional(),
      textoSelecionado: z.string().optional(),
      posicao: posicaoSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const [annotation] = await db
        .insert(driveFileAnnotations)
        .values({
          driveFileId: input.driveFileId,
          userId,
          tipo: input.tipo,
          pagina: input.pagina,
          cor: input.cor,
          texto: input.texto,
          textoSelecionado: input.textoSelecionado,
          posicao: input.posicao as any,
        })
        .returning();

      return annotation;
    }),

  // Update annotation
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      texto: z.string().optional(),
      cor: annotationCorEnum.optional(),
      tipo: annotationTipoEnum.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const [existing] = await db
        .select()
        .from(driveFileAnnotations)
        .where(eq(driveFileAnnotations.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Anotacao nao encontrada" });
      }
      if (existing.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Voce so pode editar suas proprias anotacoes" });
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.texto !== undefined) updateData.texto = input.texto;
      if (input.cor !== undefined) updateData.cor = input.cor;
      if (input.tipo !== undefined) updateData.tipo = input.tipo;

      const [updated] = await db
        .update(driveFileAnnotations)
        .set(updateData)
        .where(eq(driveFileAnnotations.id, input.id))
        .returning();

      return updated;
    }),

  // Delete annotation
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const [existing] = await db
        .select()
        .from(driveFileAnnotations)
        .where(eq(driveFileAnnotations.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Anotacao nao encontrada" });
      }
      if (existing.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Voce so pode deletar suas proprias anotacoes" });
      }

      await db
        .delete(driveFileAnnotations)
        .where(eq(driveFileAnnotations.id, input.id));

      return { success: true };
    }),

  // Get summary (count by color and type)
  getSummary: protectedProcedure
    .input(z.object({ driveFileId: z.number() }))
    .query(async ({ input }) => {
      const annotations = await db
        .select()
        .from(driveFileAnnotations)
        .where(eq(driveFileAnnotations.driveFileId, input.driveFileId));

      const byColor: Record<string, number> = {};
      const byType: Record<string, number> = {};

      for (const a of annotations) {
        byColor[a.cor] = (byColor[a.cor] || 0) + 1;
        byType[a.tipo] = (byType[a.tipo] || 0) + 1;
      }

      return {
        total: annotations.length,
        byColor,
        byType,
      };
    }),
});
