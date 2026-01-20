/**
 * Inspections Router - Inspeção de Check-in
 * 
 * Gerencia as inspeções físicas dos pets no momento do check-in
 */

import { z } from "zod";
import { router, adminProcedure } from "../init";
import { db } from "@/lib/db";
import { checkinInspections } from "@/lib/db/schema-enhanced";
import { eq, desc, and, gte, lte } from "drizzle-orm";

const inspectionSchema = z.object({
  petId: z.number(),
  calendarEventId: z.number().optional(),
  
  // Estado Físico
  skinCoatStatus: z.string().optional(),
  skinCoatNotes: z.string().optional(),
  earStatus: z.string().optional(),
  earNotes: z.string().optional(),
  eyeStatus: z.string().optional(),
  eyeNotes: z.string().optional(),
  pawStatus: z.string().optional(),
  pawNotes: z.string().optional(),
  
  // Observações
  checkinObservations: z.array(z.string()).optional(),
  generalNotes: z.string().optional(),
  photos: z.array(z.string()).optional(),
});

export const inspectionsRouter = router({
  /**
   * Criar nova inspeção de check-in
   */
  create: adminProcedure
    .input(inspectionSchema)
    .mutation(async ({ ctx, input }) => {
      const [inspection] = await db.insert(checkinInspections).values({
        petId: input.petId,
        calendarEventId: input.calendarEventId,
        skinCoatStatus: input.skinCoatStatus,
        skinCoatNotes: input.skinCoatNotes,
        earStatus: input.earStatus,
        earNotes: input.earNotes,
        eyeStatus: input.eyeStatus,
        eyeNotes: input.eyeNotes,
        pawStatus: input.pawStatus,
        pawNotes: input.pawNotes,
        checkinObservations: input.checkinObservations || [],
        generalNotes: input.generalNotes,
        photos: input.photos || [],
        createdById: ctx.user.id,
      }).returning();

      return inspection;
    }),

  /**
   * Buscar inspeções de um pet
   */
  byPetId: adminProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      return db.select()
        .from(checkinInspections)
        .where(eq(checkinInspections.petId, input.petId))
        .orderBy(desc(checkinInspections.inspectionDate))
        .limit(10);
    }),

  /**
   * Buscar última inspeção de um pet
   */
  lastByPetId: adminProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      const [inspection] = await db.select()
        .from(checkinInspections)
        .where(eq(checkinInspections.petId, input.petId))
        .orderBy(desc(checkinInspections.inspectionDate))
        .limit(1);
      return inspection || null;
    }),

  /**
   * Listar inspeções do dia
   */
  today: adminProcedure.query(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return db.select()
      .from(checkinInspections)
      .where(and(
        gte(checkinInspections.inspectionDate, today),
        lte(checkinInspections.inspectionDate, tomorrow)
      ))
      .orderBy(desc(checkinInspections.inspectionDate));
  }),
});
