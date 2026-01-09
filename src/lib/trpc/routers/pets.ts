import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, pets, petTutors, users } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { Errors, safeAsync } from "@/lib/errors";
import { petSchema, updatePetSchema, idSchema } from "@/lib/validations";

export const petsRouter = router({
  /**
   * Lista pets do tutor logado
   */
  myPets: protectedProcedure.query(async ({ ctx }) => {
    return safeAsync(async () => {
      const result = await db
        .select({
          pet: pets,
          relation: petTutors,
        })
        .from(pets)
        .innerJoin(petTutors, eq(pets.id, petTutors.petId))
        .where(eq(petTutors.tutorId, ctx.user.id))
        .orderBy(desc(pets.createdAt));

      return result.map((r) => ({
        ...r.pet,
        isPrimary: r.relation.isPrimary,
      }));
    }, "Erro ao buscar seus pets");
  }),

  /**
   * Lista todos os pets (admin) com tutores
   */
  list: adminProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          approvalStatus: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        // Query base
        let result = await db
          .select()
          .from(pets)
          .orderBy(desc(pets.createdAt));

        // Aplicar filtros se existirem
        if (input?.approvalStatus) {
          result = result.filter((p) => p.approvalStatus === input.approvalStatus);
        }

        if (input?.status) {
          result = result.filter((p) => p.status === input.status);
        }

        if (input?.search) {
          const search = input.search.toLowerCase();
          result = result.filter(
            (p) =>
              p.name.toLowerCase().includes(search) ||
              p.breed?.toLowerCase().includes(search)
          );
        }

        return result;
      }, "Erro ao listar pets");
    }),

  /**
   * Busca pet por ID com informações do tutor
   */
  byId: protectedProcedure
    .input(z.object({ id: idSchema }))
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const pet = await db.query.pets.findFirst({
          where: eq(pets.id, input.id),
        });

        if (!pet) {
          throw Errors.notFound("Pet");
        }

        // Se não for admin, verificar se é tutor do pet
        if (ctx.user.role !== "admin") {
          const relation = await db.query.petTutors.findFirst({
            where: and(
              eq(petTutors.petId, input.id),
              eq(petTutors.tutorId, ctx.user.id)
            ),
          });

          if (!relation) {
            throw Errors.forbidden();
          }
        }

        // Buscar tutores do pet
        const tutors = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            isPrimary: petTutors.isPrimary,
          })
          .from(petTutors)
          .innerJoin(users, eq(petTutors.tutorId, users.id))
          .where(eq(petTutors.petId, input.id));

        return { ...pet, tutors };
      }, "Erro ao buscar pet");
    }),

  /**
   * Cria um novo pet
   */
  create: protectedProcedure.input(petSchema).mutation(async ({ ctx, input }) => {
    return safeAsync(async () => {
      // Criar pet
      const [newPet] = await db
        .insert(pets)
        .values({
          name: input.name,
          breed: input.breed || null,
          species: input.species,
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
          weight: input.weight || null,
          notes: input.notes || null,
          foodBrand: input.foodBrand || null,
          foodAmount: input.foodAmount || null,
          // Admin cria pets já aprovados, tutores precisam de aprovação
          approvalStatus: ctx.user.role === "admin" ? "approved" : "pending",
        })
        .returning();

      // Associar ao tutor que criou
      await db.insert(petTutors).values({
        petId: newPet.id,
        tutorId: ctx.user.id,
        isPrimary: true,
      });

      return newPet;
    }, "Erro ao cadastrar pet");
  }),

  /**
   * Atualiza um pet
   */
  update: protectedProcedure
    .input(updatePetSchema)
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const { id, ...data } = input;

        // Verificar se pet existe
        const existingPet = await db.query.pets.findFirst({
          where: eq(pets.id, id),
        });

        if (!existingPet) {
          throw Errors.notFound("Pet");
        }

        // Verificar permissão
        if (ctx.user.role !== "admin") {
          const relation = await db.query.petTutors.findFirst({
            where: and(
              eq(petTutors.petId, id),
              eq(petTutors.tutorId, ctx.user.id)
            ),
          });

          if (!relation) {
            throw Errors.forbidden();
          }
        }

        // Preparar dados para update
        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.breed !== undefined) updateData.breed = data.breed;
        if (data.species !== undefined) updateData.species = data.species;
        if (data.weight !== undefined) updateData.weight = data.weight;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.foodBrand !== undefined) updateData.foodBrand = data.foodBrand;
        if (data.foodAmount !== undefined) updateData.foodAmount = data.foodAmount;
        if (data.birthDate !== undefined) {
          updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
        }

        const [updatedPet] = await db
          .update(pets)
          .set(updateData)
          .where(eq(pets.id, id))
          .returning();

        return updatedPet;
      }, "Erro ao atualizar pet");
    }),

  /**
   * Aprova um pet (admin)
   */
  approve: adminProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const existingPet = await db.query.pets.findFirst({
          where: eq(pets.id, input.id),
        });

        if (!existingPet) {
          throw Errors.notFound("Pet");
        }

        const [pet] = await db
          .update(pets)
          .set({
            approvalStatus: "approved",
            updatedAt: new Date(),
          })
          .where(eq(pets.id, input.id))
          .returning();

        // TODO: Enviar notificação para o tutor

        return pet;
      }, "Erro ao aprovar pet");
    }),

  /**
   * Rejeita um pet (admin)
   */
  reject: adminProcedure
    .input(
      z.object({
        id: idSchema,
        reason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const existingPet = await db.query.pets.findFirst({
          where: eq(pets.id, input.id),
        });

        if (!existingPet) {
          throw Errors.notFound("Pet");
        }

        const [pet] = await db
          .update(pets)
          .set({
            approvalStatus: "rejected",
            notes: input.reason || existingPet.notes,
            updatedAt: new Date(),
          })
          .where(eq(pets.id, input.id))
          .returning();

        // TODO: Enviar notificação para o tutor

        return pet;
      }, "Erro ao rejeitar pet");
    }),

  /**
   * Lista pets pendentes de aprovação (admin)
   */
  pending: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const pendingPets = await db
        .select()
        .from(pets)
        .where(eq(pets.approvalStatus, "pending"))
        .orderBy(desc(pets.createdAt));

      // Buscar tutores de cada pet
      const petsWithTutors = await Promise.all(
        pendingPets.map(async (pet) => {
          const tutors = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
            })
            .from(petTutors)
            .innerJoin(users, eq(petTutors.tutorId, users.id))
            .where(eq(petTutors.petId, pet.id));

          return { ...pet, tutors };
        })
      );

      return petsWithTutors;
    }, "Erro ao buscar pets pendentes");
  }),

  /**
   * Cria um pet como admin (pode associar a tutor existente)
   */
  adminCreate: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        species: z.string().default("dog"),
        breed: z.string().max(100).optional(),
        birthDate: z.string().optional(),
        weight: z.number().positive().optional(),
        notes: z.string().max(1000).optional(),
        tutorId: z.number().int().positive().optional(),
        credits: z.number().int().min(0).default(0),
        approvalStatus: z.enum(["approved", "pending", "rejected"]).default("approved"),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [newPet] = await db
          .insert(pets)
          .values({
            name: input.name,
            species: input.species,
            breed: input.breed || null,
            birthDate: input.birthDate ? new Date(input.birthDate) : null,
            weight: input.weight || null,
            notes: input.notes || null,
            credits: input.credits,
            approvalStatus: input.approvalStatus,
          })
          .returning();

        // Se tiver tutor, associar
        if (input.tutorId) {
          await db.insert(petTutors).values({
            petId: newPet.id,
            tutorId: input.tutorId,
            isPrimary: true,
          });
        }

        return newPet;
      }, "Erro ao criar pet");
    }),

  /**
   * Atualiza um pet como admin (mais controle)
   */
  adminUpdate: adminProcedure
    .input(
      z.object({
        id: idSchema,
        name: z.string().min(1).max(100).optional(),
        breed: z.string().max(100).optional(),
        birthDate: z.string().optional(),
        weight: z.number().positive().optional(),
        notes: z.string().max(1000).optional(),
        credits: z.number().int().min(0).optional(),
        approvalStatus: z.enum(["approved", "pending", "rejected"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const { id, ...data } = input;

        const existingPet = await db.query.pets.findFirst({
          where: eq(pets.id, id),
        });

        if (!existingPet) {
          throw Errors.notFound("Pet");
        }

        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.breed !== undefined) updateData.breed = data.breed;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.weight !== undefined) updateData.weight = data.weight;
        if (data.credits !== undefined) updateData.credits = data.credits;
        if (data.approvalStatus !== undefined) updateData.approvalStatus = data.approvalStatus;
        if (data.birthDate !== undefined) {
          updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
        }

        const [updatedPet] = await db
          .update(pets)
          .set(updateData)
          .where(eq(pets.id, id))
          .returning();

        return updatedPet;
      }, "Erro ao atualizar pet");
    }),

  /**
   * Deleta um pet como admin
   */
  adminDelete: adminProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const existingPet = await db.query.pets.findFirst({
          where: eq(pets.id, input.id),
        });

        if (!existingPet) {
          throw Errors.notFound("Pet");
        }

        // Deletar relações primeiro
        await db.delete(petTutors).where(eq(petTutors.petId, input.id));
        // Depois deletar o pet
        await db.delete(pets).where(eq(pets.id, input.id));

        return { success: true, deletedId: input.id };
      }, "Erro ao excluir pet");
    }),

  /**
   * Deleta um pet (admin)
   */
  delete: adminProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const existingPet = await db.query.pets.findFirst({
          where: eq(pets.id, input.id),
        });

        if (!existingPet) {
          throw Errors.notFound("Pet");
        }

        // Delete cascata já está configurado no schema
        await db.delete(pets).where(eq(pets.id, input.id));

        return { success: true, deletedId: input.id };
      }, "Erro ao excluir pet");
    }),

  /**
   * Adiciona créditos a um pet (admin)
   */
  addCredits: adminProcedure
    .input(
      z.object({
        petId: idSchema,
        credits: z.number().int().min(1).max(365),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const existingPet = await db.query.pets.findFirst({
          where: eq(pets.id, input.petId),
        });

        if (!existingPet) {
          throw Errors.notFound("Pet");
        }

        const [pet] = await db
          .update(pets)
          .set({
            credits: existingPet.credits + input.credits,
            updatedAt: new Date(),
          })
          .where(eq(pets.id, input.petId))
          .returning();

        return pet;
      }, "Erro ao adicionar créditos");
    }),

  /**
   * Estatísticas de pets (admin)
   */
  stats: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const [totalPets] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pets);

      const [approvedPets] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pets)
        .where(eq(pets.approvalStatus, "approved"));

      const [pendingPets] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pets)
        .where(eq(pets.approvalStatus, "pending"));

      const [dogs] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pets)
        .where(eq(pets.species, "dog"));

      const [cats] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pets)
        .where(eq(pets.species, "cat"));

      return {
        total: totalPets.count,
        approved: approvedPets.count,
        pending: pendingPets.count,
        dogs: dogs.count,
        cats: cats.count,
      };
    }, "Erro ao buscar estatísticas");
  }),
});
