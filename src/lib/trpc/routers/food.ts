import { router, protectedProcedure, adminProcedure } from "../init";
import { z } from "zod";
import {
  db,
  pets,
  petFoodPlans,
  petFoodInventory,
  petFoodHistory,
  petTreats,
  petNaturalFood,
} from "@/lib/db";
import { eq, desc, and, isNull, sql } from "drizzle-orm";

export const foodRouter = router({
  // ==========================================
  // PLANOS DE ALIMENTAÇÃO
  // ==========================================

  /**
   * Lista planos de alimentação de todos os pets (admin)
   */
  listPlans: adminProcedure.query(async () => {
    const plans = await db.query.petFoodPlans.findMany({
      where: eq(petFoodPlans.isActive, true),
      orderBy: [desc(petFoodPlans.createdAt)],
    });

    const allPets = await db.query.pets.findMany({
      orderBy: [desc(pets.name)],
    });

    return {
      plans,
      pets: allPets.map((pet) => ({
        id: pet.id,
        name: pet.name,
        photoUrl: pet.photoUrl,
        breed: pet.breed,
        weight: pet.weight,
      })),
    };
  }),

  /**
   * Obtém plano de alimentação de um pet específico
   */
  getPlanByPet: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      const plan = await db.query.petFoodPlans.findFirst({
        where: and(
          eq(petFoodPlans.petId, input.petId),
          eq(petFoodPlans.isActive, true)
        ),
      });

      return plan;
    }),

  /**
   * Cria ou atualiza plano de alimentação
   */
  upsertPlan: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        foodType: z.enum(["dry", "wet", "natural", "mixed"]),
        brand: z.string().min(1),
        productName: z.string().optional(),
        dailyAmount: z.number().min(1),
        portionsPerDay: z.number().min(1).max(6),
        portionTimes: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Desativa planos anteriores
      await db
        .update(petFoodPlans)
        .set({ isActive: false, endDate: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(petFoodPlans.petId, input.petId),
            eq(petFoodPlans.isActive, true)
          )
        );

      // Cria novo plano
      const [newPlan] = await db
        .insert(petFoodPlans)
        .values({
          petId: input.petId,
          foodType: input.foodType,
          brand: input.brand,
          productName: input.productName,
          dailyAmount: input.dailyAmount,
          portionsPerDay: input.portionsPerDay,
          portionTimes: input.portionTimes
            ? JSON.stringify(input.portionTimes)
            : null,
          notes: input.notes,
          createdById: ctx.user.id,
        })
        .returning();

      // Atualiza também os campos legados na tabela pets
      await db
        .update(pets)
        .set({
          foodBrand: input.brand,
          foodAmount: input.dailyAmount,
          updatedAt: new Date(),
        })
        .where(eq(pets.id, input.petId));

      return newPlan;
    }),

  // ==========================================
  // ESTOQUE / INVENTÁRIO
  // ==========================================

  /**
   * Lista estoque de ração de todos os pets
   */
  listInventory: adminProcedure.query(async () => {
    const inventory = await db.query.petFoodInventory.findMany({
      orderBy: [desc(petFoodInventory.receivedDate)],
    });

    return inventory;
  }),

  /**
   * Obtém estoque de um pet específico
   */
  getInventoryByPet: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      const inventory = await db.query.petFoodInventory.findMany({
        where: eq(petFoodInventory.petId, input.petId),
        orderBy: [desc(petFoodInventory.receivedDate)],
      });

      return inventory;
    }),

  /**
   * Adiciona estoque de ração
   */
  addInventory: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        brand: z.string().min(1),
        productName: z.string().optional(),
        quantityReceived: z.number().min(1),
        expirationDate: z.string().optional(),
        batchNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [newInventory] = await db
        .insert(petFoodInventory)
        .values({
          petId: input.petId,
          brand: input.brand,
          productName: input.productName,
          quantityReceived: input.quantityReceived,
          quantityRemaining: input.quantityReceived,
          expirationDate: input.expirationDate
            ? new Date(input.expirationDate)
            : undefined,
          batchNumber: input.batchNumber,
          notes: input.notes,
          createdById: ctx.user.id,
        })
        .returning();

      return newInventory;
    }),

  /**
   * Atualiza quantidade restante do estoque
   */
  updateInventory: protectedProcedure
    .input(
      z.object({
        inventoryId: z.number(),
        quantityRemaining: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(petFoodInventory)
        .set({
          quantityRemaining: input.quantityRemaining,
          updatedAt: new Date(),
        })
        .where(eq(petFoodInventory.id, input.inventoryId))
        .returning();

      return updated;
    }),

  // ==========================================
  // HISTÓRICO E REAÇÕES
  // ==========================================

  /**
   * Lista histórico de rações de um pet
   */
  getHistoryByPet: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      const history = await db.query.petFoodHistory.findMany({
        where: eq(petFoodHistory.petId, input.petId),
        orderBy: [desc(petFoodHistory.createdAt)],
      });

      return history;
    }),

  /**
   * Adiciona registro de histórico/reação
   */
  addHistory: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        foodPlanId: z.number().optional(),
        brand: z.string().min(1),
        productName: z.string().optional(),
        startDate: z.string(),
        endDate: z.string().optional(),
        acceptance: z
          .enum(["loved", "liked", "neutral", "disliked", "rejected"])
          .optional(),
        digestion: z.enum(["excellent", "good", "regular", "poor"]).optional(),
        stoolQuality: z
          .enum(["normal", "soft", "hard", "diarrhea"])
          .optional(),
        coatCondition: z
          .enum(["excellent", "good", "regular", "poor"])
          .optional(),
        energyLevel: z.enum(["high", "normal", "low"]).optional(),
        allergicReaction: z.boolean().optional(),
        allergicDetails: z.string().optional(),
        overallRating: z.number().min(1).max(5).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [newHistory] = await db
        .insert(petFoodHistory)
        .values({
          petId: input.petId,
          foodPlanId: input.foodPlanId,
          brand: input.brand,
          productName: input.productName,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          acceptance: input.acceptance,
          digestion: input.digestion,
          stoolQuality: input.stoolQuality,
          coatCondition: input.coatCondition,
          energyLevel: input.energyLevel,
          allergicReaction: input.allergicReaction,
          allergicDetails: input.allergicDetails,
          overallRating: input.overallRating,
          notes: input.notes,
          createdById: ctx.user.id,
        })
        .returning();

      return newHistory;
    }),

  // ==========================================
  // PETISCOS
  // ==========================================

  /**
   * Lista petiscos de um pet
   */
  getTreatsByPet: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      const treats = await db.query.petTreats.findMany({
        where: and(
          eq(petTreats.petId, input.petId),
          eq(petTreats.isActive, true)
        ),
        orderBy: [desc(petTreats.createdAt)],
      });

      return treats;
    }),

  /**
   * Adiciona petisco
   */
  addTreat: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        treatType: z.enum([
          "snack",
          "biscuit",
          "natural",
          "supplement",
          "other",
        ]),
        name: z.string().min(1),
        brand: z.string().optional(),
        purpose: z
          .enum(["reward", "training", "dental", "supplement", "enrichment"])
          .optional(),
        frequency: z
          .enum(["daily", "weekly", "occasionally", "training_only"])
          .optional(),
        maxPerDay: z.number().optional(),
        caloriesPerUnit: z.number().optional(),
        acceptance: z.enum(["loved", "liked", "neutral", "disliked"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [newTreat] = await db
        .insert(petTreats)
        .values({
          petId: input.petId,
          treatType: input.treatType,
          name: input.name,
          brand: input.brand,
          purpose: input.purpose,
          frequency: input.frequency,
          maxPerDay: input.maxPerDay,
          caloriesPerUnit: input.caloriesPerUnit,
          acceptance: input.acceptance,
          notes: input.notes,
          createdById: ctx.user.id,
        })
        .returning();

      return newTreat;
    }),

  /**
   * Remove petisco
   */
  removeTreat: protectedProcedure
    .input(z.object({ treatId: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .update(petTreats)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(petTreats.id, input.treatId));

      return { success: true };
    }),

  // ==========================================
  // ALIMENTAÇÃO NATURAL
  // ==========================================

  /**
   * Lista alimentação natural de um pet
   */
  getNaturalFoodByPet: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      const naturalFood = await db.query.petNaturalFood.findMany({
        where: and(
          eq(petNaturalFood.petId, input.petId),
          eq(petNaturalFood.isActive, true)
        ),
        orderBy: [desc(petNaturalFood.createdAt)],
      });

      return naturalFood;
    }),

  /**
   * Adiciona alimentação natural
   */
  addNaturalFood: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        mealType: z.enum(["barf", "cooked", "mixed", "supplement"]),
        name: z.string().min(1),
        ingredients: z.array(z.string()).optional(),
        proteinSource: z.string().optional(),
        portionSize: z.number().optional(),
        frequency: z.enum(["daily", "weekly", "occasionally"]).optional(),
        preparationNotes: z.string().optional(),
        acceptance: z.enum(["loved", "liked", "neutral", "disliked"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [newNaturalFood] = await db
        .insert(petNaturalFood)
        .values({
          petId: input.petId,
          mealType: input.mealType,
          name: input.name,
          ingredients: input.ingredients
            ? JSON.stringify(input.ingredients)
            : null,
          proteinSource: input.proteinSource,
          portionSize: input.portionSize,
          frequency: input.frequency,
          preparationNotes: input.preparationNotes,
          acceptance: input.acceptance,
          notes: input.notes,
          createdById: ctx.user.id,
        })
        .returning();

      return newNaturalFood;
    }),

  /**
   * Remove alimentação natural
   */
  removeNaturalFood: protectedProcedure
    .input(z.object({ naturalFoodId: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .update(petNaturalFood)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(petNaturalFood.id, input.naturalFoodId));

      return { success: true };
    }),

  // ==========================================
  // DASHBOARD / ESTATÍSTICAS
  // ==========================================

  /**
   * Obtém resumo completo de alimentação de um pet
   */
  getPetFoodSummary: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      const [pet, plan, inventoryItems, history, treats, naturalFood] =
        await Promise.all([
          db.query.pets.findFirst({
            where: eq(pets.id, input.petId),
          }),
          db.query.petFoodPlans.findFirst({
            where: and(
              eq(petFoodPlans.petId, input.petId),
              eq(petFoodPlans.isActive, true)
            ),
          }),
          db.query.petFoodInventory.findMany({
            where: eq(petFoodInventory.petId, input.petId),
            orderBy: [desc(petFoodInventory.receivedDate)],
          }),
          db.query.petFoodHistory.findMany({
            where: eq(petFoodHistory.petId, input.petId),
            orderBy: [desc(petFoodHistory.createdAt)],
            limit: 5,
          }),
          db.query.petTreats.findMany({
            where: and(
              eq(petTreats.petId, input.petId),
              eq(petTreats.isActive, true)
            ),
          }),
          db.query.petNaturalFood.findMany({
            where: and(
              eq(petNaturalFood.petId, input.petId),
              eq(petNaturalFood.isActive, true)
            ),
          }),
        ]);

      // Calcular estoque total disponível
      const totalStock = inventoryItems.reduce(
        (sum, item) => sum + (item.quantityRemaining || 0),
        0
      );

      // Calcular dias restantes
      const daysRemaining =
        plan && plan.dailyAmount > 0
          ? Math.floor(totalStock / plan.dailyAmount)
          : 0;

      return {
        pet,
        plan,
        inventory: {
          items: inventoryItems,
          totalStock,
          daysRemaining,
        },
        history,
        treats,
        naturalFood,
      };
    }),

  /**
   * Lista resumo de alimentação de todos os pets (admin)
   */
  listAllPetsFoodSummary: adminProcedure.query(async () => {
    const allPets = await db.query.pets.findMany({
      where: eq(pets.status, "active"),
      orderBy: [desc(pets.name)],
    });

    const summaries = await Promise.all(
      allPets.map(async (pet) => {
        const [plan, inventoryItems] = await Promise.all([
          db.query.petFoodPlans.findFirst({
            where: and(
              eq(petFoodPlans.petId, pet.id),
              eq(petFoodPlans.isActive, true)
            ),
          }),
          db.query.petFoodInventory.findMany({
            where: eq(petFoodInventory.petId, pet.id),
          }),
        ]);

        const totalStock = inventoryItems.reduce(
          (sum, item) => sum + (item.quantityRemaining || 0),
          0
        );

        const daysRemaining =
          plan && plan.dailyAmount > 0
            ? Math.floor(totalStock / plan.dailyAmount)
            : 0;

        return {
          pet: {
            id: pet.id,
            name: pet.name,
            photoUrl: pet.photoUrl,
            breed: pet.breed,
            weight: pet.weight,
          },
          plan,
          totalStock,
          daysRemaining,
          hasPlan: !!plan,
          isLowStock: daysRemaining > 0 && daysRemaining < 7,
          isCriticalStock: daysRemaining > 0 && daysRemaining < 3,
        };
      })
    );

    return summaries;
  }),

  // ==========================================
  // LEGADO - Manter compatibilidade
  // ==========================================

  /**
   * Lista alimentação de todos os pets (admin) - LEGADO
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
   * Atualiza alimentação de um pet - LEGADO
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
   * Obtém alimentação de um pet específico - LEGADO
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
