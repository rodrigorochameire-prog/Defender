import { router, protectedProcedure, adminProcedure } from "../init";
import { z } from "zod";
import { db, pets } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export const foodRouter = router({
  /**
   * Lista alimentação de todos os pets (admin)
   */
  list: adminProcedure.query(async () => {
    const allPets = await db.query.pets.findMany({
      orderBy: [desc(pets.name)],
    });

    return allPets.map((pet) => ({
      id: pet.id,
      name: pet.name,
      photoUrl: pet.photoUrl,
      foodBrand: pet.foodBrand,
      foodAmount: pet.foodAmount,
      status: pet.status,
    }));
  }),

  /**
   * Atualiza alimentação de um pet
   */
  update: adminProcedure
    .input(
      z.object({
        petId: z.number(),
        foodBrand: z.string().optional(),
        foodAmount: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(pets)
        .set({
          foodBrand: input.foodBrand,
          foodAmount: input.foodAmount,
          updatedAt: new Date(),
        })
        .where(eq(pets.id, input.petId))
        .returning();

      return updated;
    }),

  /**
   * Obtém alimentação de um pet específico
   */
  byPet: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      const pet = await db.query.pets.findFirst({
        where: eq(pets.id, input.petId),
      });

      if (!pet) {
        return null;
      }

      return {
        id: pet.id,
        name: pet.name,
        foodBrand: pet.foodBrand,
        foodAmount: pet.foodAmount,
      };
    }),
});
