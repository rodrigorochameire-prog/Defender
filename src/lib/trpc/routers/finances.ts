import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import { db, pets, petTutors, users, creditPackages } from "@/lib/db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { safeAsync } from "@/lib/errors";
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

// Schema para transações financeiras
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id"),
  userId: integer("user_id"),
  type: varchar("type", { length: 50 }).notNull(), // 'credit_purchase' | 'credit_use' | 'refund'
  amount: integer("amount").notNull(), // em centavos
  credits: integer("credits"),
  description: text("description"),
  stripePaymentId: varchar("stripe_payment_id", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financesRouter = router({
  /**
   * Resumo financeiro (admin)
   */
  summary: adminProcedure
    .input(
      z.object({
        startDate: z.string().or(z.date()).optional(),
        endDate: z.string().or(z.date()).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const startDate = input?.startDate ? new Date(input.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = input?.endDate ? new Date(input.endDate) : new Date();

        // Total de créditos em circulação
        const [totalCredits] = await db
          .select({ total: sql<number>`COALESCE(sum(credits), 0)::int` })
          .from(pets);

        // Estimativa de receita (R$50 por crédito)
        const estimatedRevenue = (totalCredits?.total || 0) * 5000;

        // Total de pets ativos
        const [activePets] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(pets)
          .where(eq(pets.approvalStatus, "approved"));

        // Pacotes de créditos ativos
        const packages = await db
          .select()
          .from(creditPackages)
          .where(eq(creditPackages.isActive, true))
          .orderBy(creditPackages.displayOrder);

        return {
          totalCredits: totalCredits?.total || 0,
          estimatedRevenue,
          activePets: activePets?.count || 0,
          packages,
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        };
      }, "Erro ao buscar resumo financeiro");
    }),

  /**
   * Lista transações
   */
  transactions: adminProcedure
    .input(
      z.object({
        petId: z.number().optional(),
        type: z.string().optional(),
        startDate: z.string().or(z.date()).optional(),
        endDate: z.string().or(z.date()).optional(),
        limit: z.number().default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let conditions: ReturnType<typeof eq>[] = [];

        if (input?.petId) {
          conditions.push(eq(transactions.petId, input.petId));
        }

        if (input?.type) {
          conditions.push(eq(transactions.type, input.type));
        }

        if (input?.startDate) {
          conditions.push(gte(transactions.createdAt, new Date(input.startDate)));
        }

        if (input?.endDate) {
          conditions.push(lte(transactions.createdAt, new Date(input.endDate)));
        }

        const result = await db
          .select({
            transaction: transactions,
            pet: {
              id: pets.id,
              name: pets.name,
            },
            user: {
              id: users.id,
              name: users.name,
            },
          })
          .from(transactions)
          .leftJoin(pets, eq(transactions.petId, pets.id))
          .leftJoin(users, eq(transactions.userId, users.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(transactions.createdAt))
          .limit(input?.limit || 50);

        return result;
      }, "Erro ao buscar transações");
    }),

  /**
   * Cria transação manual
   */
  createTransaction: adminProcedure
    .input(
      z.object({
        petId: z.number().optional(),
        userId: z.number().optional(),
        type: z.enum(["credit_purchase", "credit_use", "refund", "adjustment"]),
        amount: z.number().int(),
        credits: z.number().int().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [transaction] = await db
          .insert(transactions)
          .values({
            petId: input.petId || null,
            userId: input.userId || null,
            type: input.type,
            amount: input.amount,
            credits: input.credits || null,
            description: input.description || null,
          })
          .returning();

        // Se for compra de créditos, adicionar ao pet
        if (input.type === "credit_purchase" && input.petId && input.credits) {
          const pet = await db.query.pets.findFirst({
            where: eq(pets.id, input.petId),
          });

          if (pet) {
            await db
              .update(pets)
              .set({
                credits: (pet.credits || 0) + input.credits,
                updatedAt: new Date(),
              })
              .where(eq(pets.id, input.petId));
          }
        }

        return transaction;
      }, "Erro ao criar transação");
    }),

  /**
   * Relatório mensal
   */
  monthlyReport: adminProcedure
    .input(
      z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const startDate = new Date(input.year, input.month - 1, 1);
        const endDate = new Date(input.year, input.month, 0, 23, 59, 59);

        // Resumo do mês
        const [purchases] = await db
          .select({
            total: sql<number>`COALESCE(sum(amount), 0)::int`,
            count: sql<number>`count(*)::int`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.type, "credit_purchase"),
              gte(transactions.createdAt, startDate),
              lte(transactions.createdAt, endDate)
            )
          );

        const [refunds] = await db
          .select({
            total: sql<number>`COALESCE(sum(amount), 0)::int`,
            count: sql<number>`count(*)::int`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.type, "refund"),
              gte(transactions.createdAt, startDate),
              lte(transactions.createdAt, endDate)
            )
          );

        return {
          period: {
            year: input.year,
            month: input.month,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          purchases: {
            total: purchases?.total || 0,
            count: purchases?.count || 0,
          },
          refunds: {
            total: refunds?.total || 0,
            count: refunds?.count || 0,
          },
          netRevenue: (purchases?.total || 0) - (refunds?.total || 0),
        };
      }, "Erro ao gerar relatório mensal");
    }),
});
