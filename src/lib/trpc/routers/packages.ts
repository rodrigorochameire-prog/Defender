import { router, protectedProcedure, adminProcedure } from "../init";
import { z } from "zod";
import { db, creditPackages } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export const packagesRouter = router({
  /**
   * Lista todos os pacotes de créditos
   */
  list: protectedProcedure.query(async () => {
    const packages = await db.query.creditPackages.findMany({
      where: eq(creditPackages.isActive, true),
      orderBy: [desc(creditPackages.credits)],
    });

    return packages;
  }),

  /**
   * Lista todos os pacotes (incluindo inativos) - admin
   */
  listAll: adminProcedure.query(async () => {
    const packages = await db.query.creditPackages.findMany({
      orderBy: [desc(creditPackages.credits)],
    });

    return packages;
  }),

  /**
   * Criar novo pacote
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        credits: z.number().min(1),
        priceInCents: z.number().min(0),
        description: z.string().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const [created] = await db
        .insert(creditPackages)
        .values({
          name: input.name,
          credits: input.credits,
          priceInCents: input.priceInCents,
          description: input.description,
          isActive: input.isActive,
        })
        .returning();

      return created;
    }),

  /**
   * Atualizar pacote
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        credits: z.number().min(1).optional(),
        priceInCents: z.number().min(0).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [updated] = await db
        .update(creditPackages)
        .set(data)
        .where(eq(creditPackages.id, id))
        .returning();

      return updated;
    }),

  /**
   * Deletar pacote
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(creditPackages).where(eq(creditPackages.id, input.id));
      return { success: true };
    }),

  /**
   * Obter pacote por ID
   */
  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const pkg = await db.query.creditPackages.findFirst({
        where: eq(creditPackages.id, input.id),
      });

      return pkg;
    }),
});
