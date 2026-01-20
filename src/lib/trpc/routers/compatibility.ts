/**
 * Compatibility Router - Matriz de Compatibilidade Social
 * 
 * Gerencia a matriz de compatibilidade entre pets
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import { db, pets } from "@/lib/db";
import { petCompatibility } from "@/lib/db/schema-enhanced";
import { eq, desc, and, or, isNull } from "drizzle-orm";

const compatibilitySchema = z.object({
  petId: z.number(),
  otherPetId: z.number(),
  compatibilityType: z.enum(["friend", "neutral", "avoid", "best_friend"]),
  notes: z.string().optional(),
});

interface Compatibility {
  id: number;
  petId: number;
  otherPetId: number;
  compatibilityType: string;
  notes: string | null;
  observedDate: string | null;
  createdById: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export const compatibilityRouter = router({
  /**
   * Obter compatibilidades de um pet
   */
  byPetId: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      return db.select()
        .from(petCompatibility)
        .where(or(
          eq(petCompatibility.petId, input.petId),
          eq(petCompatibility.otherPetId, input.petId)
        ))
        .orderBy(desc(petCompatibility.updatedAt));
    }),

  /**
   * Verificar compatibilidade entre dois pets
   */
  check: protectedProcedure
    .input(z.object({ 
      petId: z.number(), 
      otherPetId: z.number() 
    }))
    .query(async ({ input }) => {
      const [compatibility] = await db.select()
        .from(petCompatibility)
        .where(or(
          and(
            eq(petCompatibility.petId, input.petId),
            eq(petCompatibility.otherPetId, input.otherPetId)
          ),
          and(
            eq(petCompatibility.petId, input.otherPetId),
            eq(petCompatibility.otherPetId, input.petId)
          )
        ))
        .limit(1);

      if (!compatibility) {
        return { type: "unknown" as const, notes: null };
      }

      return {
        type: compatibility.compatibilityType,
        notes: compatibility.notes,
      };
    }),

  /**
   * Definir ou atualizar compatibilidade
   */
  set: adminProcedure
    .input(compatibilitySchema)
    .mutation(async ({ ctx, input }) => {
      // Garantir que petId < otherPetId para evitar duplicatas em direções opostas
      const [pet1, pet2] = input.petId < input.otherPetId 
        ? [input.petId, input.otherPetId]
        : [input.otherPetId, input.petId];

      // Verificar se já existe
      const [existing] = await db.select()
        .from(petCompatibility)
        .where(and(
          eq(petCompatibility.petId, pet1),
          eq(petCompatibility.otherPetId, pet2)
        ))
        .limit(1);

      if (existing) {
        // Atualizar
        const [updated] = await db.update(petCompatibility)
          .set({
            compatibilityType: input.compatibilityType,
            notes: input.notes,
            observedDate: new Date().toISOString().split("T")[0],
            updatedAt: new Date(),
          })
          .where(eq(petCompatibility.id, existing.id))
          .returning();
        return updated;
      } else {
        // Inserir
        const [created] = await db.insert(petCompatibility)
          .values({
            petId: pet1,
            otherPetId: pet2,
            compatibilityType: input.compatibilityType,
            notes: input.notes,
            observedDate: new Date().toISOString().split("T")[0],
            createdById: ctx.user.id,
          })
          .returning();
        return created;
      }
    }),

  /**
   * Remover compatibilidade
   */
  remove: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(petCompatibility)
        .where(eq(petCompatibility.id, input.id));
      return { success: true };
    }),

  /**
   * Matriz completa para dashboard
   */
  matrix: adminProcedure.query(async () => {
    // Buscar todos os pets ativos
    const allPets = await db.select()
      .from(pets)
      .where(and(
        eq(pets.approvalStatus, "approved"),
        isNull(pets.deletedAt)
      ));

    // Buscar todas as compatibilidades
    const allCompatibilities = await db.select()
      .from(petCompatibility);

    // Criar mapa de compatibilidades
    const compatMap: Record<string, Compatibility> = {};
    allCompatibilities.forEach((c: Compatibility) => {
      compatMap[`${c.petId}-${c.otherPetId}`] = c;
      compatMap[`${c.otherPetId}-${c.petId}`] = c; // Bidirecional
    });

    // Estatísticas
    const stats = {
      totalPets: allPets.length,
      totalRelations: allCompatibilities.length,
      friends: allCompatibilities.filter((c: Compatibility) => c.compatibilityType === "friend").length,
      bestFriends: allCompatibilities.filter((c: Compatibility) => c.compatibilityType === "best_friend").length,
      avoid: allCompatibilities.filter((c: Compatibility) => c.compatibilityType === "avoid").length,
      neutral: allCompatibilities.filter((c: Compatibility) => c.compatibilityType === "neutral").length,
    };

    return {
      pets: allPets.map(p => ({ id: p.id, name: p.name, breed: p.breed, photoUrl: p.photoUrl })),
      compatibilities: allCompatibilities,
      compatMap,
      stats,
    };
  }),

  /**
   * Sugerir pets compatíveis para um pet específico
   */
  suggestCompatible: adminProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      // Buscar pets marcados como friends ou best_friends
      const compatible = await db.select()
        .from(petCompatibility)
        .where(and(
          or(
            eq(petCompatibility.petId, input.petId),
            eq(petCompatibility.otherPetId, input.petId)
          ),
          or(
            eq(petCompatibility.compatibilityType, "friend"),
            eq(petCompatibility.compatibilityType, "best_friend")
          )
        ));

      // Buscar pets marcados como avoid
      const avoid = await db.select()
        .from(petCompatibility)
        .where(and(
          or(
            eq(petCompatibility.petId, input.petId),
            eq(petCompatibility.otherPetId, input.petId)
          ),
          eq(petCompatibility.compatibilityType, "avoid")
        ));

      // Obter IDs dos outros pets
      const compatibleIds = compatible.map((c: Compatibility) => 
        c.petId === input.petId ? c.otherPetId : c.petId
      );
      const avoidIds = avoid.map((c: Compatibility) => 
        c.petId === input.petId ? c.otherPetId : c.petId
      );

      return {
        compatibleIds,
        avoidIds,
      };
    }),
});
