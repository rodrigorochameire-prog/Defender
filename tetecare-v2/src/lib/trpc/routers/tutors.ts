import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import { db, users, petTutors, pets } from "@/lib/db";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import { safeAsync, Errors } from "@/lib/errors";

export const tutorsRouter = router({
  /**
   * Lista todos os tutores (admin)
   */
  list: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let result = await db
          .select()
          .from(users)
          .where(eq(users.role, "user"))
          .orderBy(desc(users.createdAt));

        if (input?.search) {
          const search = input.search.toLowerCase();
          result = result.filter(
            (t) =>
              t.name.toLowerCase().includes(search) ||
              t.email.toLowerCase().includes(search)
          );
        }

        // Buscar pets de cada tutor
        const tutorsWithPets = await Promise.all(
          result.map(async (tutor) => {
            const tutorPets = await db
              .select({
                pet: {
                  id: pets.id,
                  name: pets.name,
                  photoUrl: pets.photoUrl,
                },
                isPrimary: petTutors.isPrimary,
              })
              .from(petTutors)
              .innerJoin(pets, eq(petTutors.petId, pets.id))
              .where(eq(petTutors.tutorId, tutor.id));

            return {
              ...tutor,
              pets: tutorPets.map(p => ({ ...p.pet, isPrimary: p.isPrimary })),
            };
          })
        );

        return tutorsWithPets;
      }, "Erro ao listar tutores");
    }),

  /**
   * Busca tutor por ID
   */
  byId: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const tutor = await db.query.users.findFirst({
          where: eq(users.id, input.id),
        });

        if (!tutor) {
          throw Errors.notFound("Tutor");
        }

        // Buscar pets
        const tutorPets = await db
          .select({
            pet: pets,
            isPrimary: petTutors.isPrimary,
          })
          .from(petTutors)
          .innerJoin(pets, eq(petTutors.petId, pets.id))
          .where(eq(petTutors.tutorId, input.id));

        return {
          ...tutor,
          pets: tutorPets.map(p => ({ ...p.pet, isPrimary: p.isPrimary })),
        };
      }, "Erro ao buscar tutor");
    }),

  /**
   * Busca tutores de um pet
   */
  byPet: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const result = await db
          .select({
            tutor: {
              id: users.id,
              name: users.name,
              email: users.email,
              phone: users.phone,
            },
            isPrimary: petTutors.isPrimary,
          })
          .from(petTutors)
          .innerJoin(users, eq(petTutors.tutorId, users.id))
          .where(eq(petTutors.petId, input.petId));

        return result.map(r => ({ ...r.tutor, isPrimary: r.isPrimary }));
      }, "Erro ao buscar tutores do pet");
    }),

  /**
   * Vincula tutor a um pet
   */
  linkToPet: adminProcedure
    .input(
      z.object({
        tutorId: z.number(),
        petId: z.number(),
        isPrimary: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        // Verificar se já existe
        const existing = await db.query.petTutors.findFirst({
          where: and(
            eq(petTutors.tutorId, input.tutorId),
            eq(petTutors.petId, input.petId)
          ),
        });

        if (existing) {
          throw Errors.badRequest("Tutor já está vinculado a este pet");
        }

        // Se for primário, remover primário dos outros
        if (input.isPrimary) {
          await db
            .update(petTutors)
            .set({ isPrimary: false })
            .where(eq(petTutors.petId, input.petId));
        }

        // Criar vínculo
        const [relation] = await db
          .insert(petTutors)
          .values({
            tutorId: input.tutorId,
            petId: input.petId,
            isPrimary: input.isPrimary,
          })
          .returning();

        return relation;
      }, "Erro ao vincular tutor ao pet");
    }),

  /**
   * Remove vínculo de tutor com pet
   */
  unlinkFromPet: adminProcedure
    .input(
      z.object({
        tutorId: z.number(),
        petId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        await db
          .delete(petTutors)
          .where(
            and(
              eq(petTutors.tutorId, input.tutorId),
              eq(petTutors.petId, input.petId)
            )
          );

        return { success: true };
      }, "Erro ao desvincular tutor do pet");
    }),

  /**
   * Define tutor primário
   */
  setPrimary: adminProcedure
    .input(
      z.object({
        tutorId: z.number(),
        petId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        // Remover primário dos outros
        await db
          .update(petTutors)
          .set({ isPrimary: false })
          .where(eq(petTutors.petId, input.petId));

        // Definir novo primário
        await db
          .update(petTutors)
          .set({ isPrimary: true })
          .where(
            and(
              eq(petTutors.tutorId, input.tutorId),
              eq(petTutors.petId, input.petId)
            )
          );

        return { success: true };
      }, "Erro ao definir tutor primário");
    }),

  /**
   * Estatísticas de tutores (admin)
   */
  stats: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, "user"));

      const [verified] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.role, "user"), eq(users.emailVerified, true)));

      return {
        total: total.count,
        verified: verified.count,
        unverified: total.count - verified.count,
      };
    }, "Erro ao buscar estatísticas de tutores");
  }),
});
