/**
 * System Alerts Router
 * 
 * Gerencia alertas automáticos do sistema para o gestor
 */

import { z } from "zod";
import { router, adminProcedure } from "../init";
import { db, pets, petVaccinations } from "@/lib/db";
import { systemAlerts } from "@/lib/db/schema-enhanced";
import { eq, desc, and, lt, isNull, sql } from "drizzle-orm";

interface Alert {
  id: number;
  alertType: string;
  severity: string | null;
  relatedType: string | null;
  relatedId: number | null;
  title: string;
  description: string | null;
  isResolved: boolean | null;
  resolvedAt: Date | null;
  resolvedById: number | null;
  resolutionNotes: string | null;
  createdAt: Date | null;
}

export const alertsRouter = router({
  /**
   * Listar alertas não resolvidos
   */
  pending: adminProcedure.query(async () => {
    return db.select()
      .from(systemAlerts)
      .where(eq(systemAlerts.isResolved, false))
      .orderBy(desc(systemAlerts.createdAt));
  }),

  /**
   * Contar alertas por severidade
   */
  countBySeverity: adminProcedure.query(async () => {
    const alerts = await db.select()
      .from(systemAlerts)
      .where(eq(systemAlerts.isResolved, false));

    return {
      critical: alerts.filter((a: Alert) => a.severity === "critical").length,
      high: alerts.filter((a: Alert) => a.severity === "high").length,
      medium: alerts.filter((a: Alert) => a.severity === "medium").length,
      low: alerts.filter((a: Alert) => a.severity === "low").length,
      total: alerts.length,
    };
  }),

  /**
   * Criar alerta manualmente
   */
  create: adminProcedure
    .input(z.object({
      alertType: z.string(),
      severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      relatedType: z.string().optional(),
      relatedId: z.number().optional(),
      title: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [alert] = await db.insert(systemAlerts).values(input).returning();
      return alert;
    }),

  /**
   * Resolver alerta
   */
  resolve: adminProcedure
    .input(z.object({
      id: z.number(),
      resolutionNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [alert] = await db.update(systemAlerts)
        .set({
          isResolved: true,
          resolvedAt: new Date(),
          resolvedById: ctx.user.id,
          resolutionNotes: input.resolutionNotes,
        })
        .where(eq(systemAlerts.id, input.id))
        .returning();
      return alert;
    }),

  /**
   * Gerar alertas automáticos (verificar inconsistências)
   */
  generateAutomaticAlerts: adminProcedure.mutation(async () => {
    const alertsGenerated: Array<{ type: string; count: number }> = [];

    // 1. Pets com créditos negativos
    const petsWithNegativeCredits = await db.select()
      .from(pets)
      .where(and(
        lt(pets.credits, 0),
        isNull(pets.deletedAt)
      ));

    for (const pet of petsWithNegativeCredits) {
      // Verificar se já existe alerta não resolvido
      const [existing] = await db.select()
        .from(systemAlerts)
        .where(and(
          eq(systemAlerts.alertType, "negative_credits"),
          eq(systemAlerts.relatedId, pet.id),
          eq(systemAlerts.isResolved, false)
        ))
        .limit(1);

      if (!existing) {
        await db.insert(systemAlerts).values({
          alertType: "negative_credits",
          severity: "high",
          relatedType: "pet",
          relatedId: pet.id,
          title: `${pet.name} com créditos negativos`,
          description: `O pet ${pet.name} está com ${pet.credits} créditos. Necessário regularizar.`,
        });
      }
    }
    alertsGenerated.push({ type: "negative_credits", count: petsWithNegativeCredits.length });

    // 2. Pets com estoque de ração baixo (menos de 3 dias)
    const petsWithLowStock = await db.select()
      .from(pets)
      .where(and(
        isNull(pets.deletedAt),
        sql`${pets.foodStockGrams} IS NOT NULL AND ${pets.foodAmount} IS NOT NULL AND ${pets.foodStockGrams} < ${pets.foodAmount} * 3`
      ));

    for (const pet of petsWithLowStock) {
      const [existing] = await db.select()
        .from(systemAlerts)
        .where(and(
          eq(systemAlerts.alertType, "low_food_stock"),
          eq(systemAlerts.relatedId, pet.id),
          eq(systemAlerts.isResolved, false)
        ))
        .limit(1);

      if (!existing) {
        const daysRemaining = pet.foodStockGrams && pet.foodAmount 
          ? Math.floor(pet.foodStockGrams / pet.foodAmount)
          : 0;

        await db.insert(systemAlerts).values({
          alertType: "low_food_stock",
          severity: daysRemaining <= 1 ? "high" : "medium",
          relatedType: "pet",
          relatedId: pet.id,
          title: `Ração de ${pet.name} acabando`,
          description: `Estoque de ração para aproximadamente ${daysRemaining} dia(s)`,
        });
      }
    }
    alertsGenerated.push({ type: "low_food_stock", count: petsWithLowStock.length });

    return {
      success: true,
      alertsGenerated,
      totalNewAlerts: alertsGenerated.reduce((sum, a) => sum + a.count, 0),
    };
  }),

  /**
   * Histórico de alertas resolvidos
   */
  resolved: adminProcedure
    .input(z.object({
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      return db.select()
        .from(systemAlerts)
        .where(eq(systemAlerts.isResolved, true))
        .orderBy(desc(systemAlerts.resolvedAt))
        .limit(input.limit);
    }),
});
