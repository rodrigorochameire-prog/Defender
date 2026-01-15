import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { 
  db, 
  pets, 
  petTutors, 
  users, 
  dailyLogs, 
  behaviorLogs, 
  trainingLogs,
  petVaccinations,
  petMedications,
  preventiveTreatments,
  documents,
  calendarEvents,
  transactions,
  vaccineLibrary,
  medicationLibrary,
} from "@/lib/db";
import { eq, and, desc, sql, gte, or } from "drizzle-orm";
import { Errors, safeAsync } from "@/lib/errors";
import { petSchema, updatePetSchema, idSchema } from "@/lib/validations";
import { addCredits as creditEngineAddCredits } from "@/lib/services/credit-engine";

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
            weight: input.weight ? Math.round(input.weight * 1000) : null,
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
   * Adiciona créditos a um pet (admin) - Usa Credit Engine para transação atômica
   */
  addCredits: adminProcedure
    .input(
      z.object({
        petId: idSchema,
        credits: z.number().int().min(1).max(365),
        amountInCents: z.number().int().optional(),
        packageName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const existingPet = await db.query.pets.findFirst({
          where: eq(pets.id, input.petId),
        });

        if (!existingPet) {
          throw Errors.notFound("Pet");
        }

        // Usar Credit Engine para operação atômica
        const result = await creditEngineAddCredits(
          input.petId,
          input.credits,
          ctx.user!.id,
          {
            amountInCents: input.amountInCents,
            packageName: input.packageName,
          }
        );

        if (!result.success) {
          throw Errors.badRequest(result.error || "Erro ao adicionar créditos");
        }

        // Retornar pet atualizado
        const [updatedPet] = await db
          .select()
          .from(pets)
          .where(eq(pets.id, input.petId));

        return updatedPet;
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

  /**
   * Timeline Unificada - Histórico completo do pet
   * Combina logs diários, comportamento, treinamento, vacinas, preventivos, 
   * documentos e eventos de calendário em uma única timeline ordenada
   */
  getFullHistory: protectedProcedure
    .input(z.object({
      petId: idSchema,
      limit: z.number().min(10).max(100).default(50),
      cursor: z.number().optional(), // Para paginação infinita
      types: z.array(z.enum([
        "daily_log", "behavior", "training", "vaccine", 
        "medication", "preventive", "document", "calendar", "transaction"
      ])).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const { petId, limit, types } = input;

        // Verificar permissão (admin pode ver qualquer pet)
        if (ctx.user.role !== "admin") {
          const relation = await db.query.petTutors.findFirst({
            where: and(
              eq(petTutors.petId, petId),
              eq(petTutors.tutorId, ctx.user.id)
            ),
          });
          if (!relation) {
            throw Errors.forbidden();
          }
        }

        // Buscar dados de todas as tabelas em paralelo
        const [
          dailyLogsData,
          behaviorLogsData,
          trainingLogsData,
          vaccinationsData,
          medicationsData,
          preventivesData,
          documentsData,
          calendarData,
          transactionsData,
        ] = await Promise.all([
          // Daily Logs
          (!types || types.includes("daily_log")) 
            ? db.select({
                id: dailyLogs.id,
                date: dailyLogs.logDate,
                type: sql<string>`'daily_log'`,
                subtype: dailyLogs.logType,
                title: sql<string>`'Log Diário'`,
                description: dailyLogs.notes,
                mood: dailyLogs.mood,
                energy: dailyLogs.energy,
                appetite: dailyLogs.appetite,
                attachments: dailyLogs.attachments,
                createdAt: dailyLogs.createdAt,
              }).from(dailyLogs).where(eq(dailyLogs.petId, petId))
            : Promise.resolve([]),

          // Behavior Logs
          (!types || types.includes("behavior"))
            ? db.select({
                id: behaviorLogs.id,
                date: behaviorLogs.logDate,
                type: sql<string>`'behavior'`,
                subtype: sql<string>`'behavior'`,
                title: sql<string>`'Registro de Comportamento'`,
                description: behaviorLogs.notes,
                socialization: behaviorLogs.socialization,
                obedience: behaviorLogs.obedience,
                anxiety: behaviorLogs.anxiety,
                attachments: behaviorLogs.attachments,
                createdAt: behaviorLogs.createdAt,
              }).from(behaviorLogs).where(eq(behaviorLogs.petId, petId))
            : Promise.resolve([]),

          // Training Logs
          (!types || types.includes("training"))
            ? db.select({
                id: trainingLogs.id,
                date: trainingLogs.logDate,
                type: sql<string>`'training'`,
                subtype: trainingLogs.category,
                title: sql<string>`CONCAT('Treinamento: ', ${trainingLogs.command})`,
                description: trainingLogs.notes,
                status: trainingLogs.status,
                successRate: trainingLogs.successRate,
                attachments: trainingLogs.attachments,
                createdAt: trainingLogs.createdAt,
              }).from(trainingLogs).where(eq(trainingLogs.petId, petId))
            : Promise.resolve([]),

          // Vaccinations
          (!types || types.includes("vaccine"))
            ? db.select({
                id: petVaccinations.id,
                date: petVaccinations.applicationDate,
                type: sql<string>`'vaccine'`,
                subtype: sql<string>`'vaccination'`,
                title: vaccineLibrary.name,
                description: petVaccinations.notes,
                veterinarian: petVaccinations.veterinarian,
                clinic: petVaccinations.clinic,
                nextDueDate: petVaccinations.nextDueDate,
                documentUrl: petVaccinations.documentUrl,
                createdAt: petVaccinations.createdAt,
              })
              .from(petVaccinations)
              .leftJoin(vaccineLibrary, eq(petVaccinations.vaccineId, vaccineLibrary.id))
              .where(eq(petVaccinations.petId, petId))
            : Promise.resolve([]),

          // Medications
          (!types || types.includes("medication"))
            ? db.select({
                id: petMedications.id,
                date: petMedications.startDate,
                type: sql<string>`'medication'`,
                subtype: medicationLibrary.type,
                title: medicationLibrary.name,
                description: petMedications.notes,
                dosage: petMedications.dosage,
                frequency: petMedications.frequency,
                endDate: petMedications.endDate,
                isActive: petMedications.isActive,
                createdAt: petMedications.createdAt,
              })
              .from(petMedications)
              .leftJoin(medicationLibrary, eq(petMedications.medicationId, medicationLibrary.id))
              .where(eq(petMedications.petId, petId))
            : Promise.resolve([]),

          // Preventives
          (!types || types.includes("preventive"))
            ? db.select({
                id: preventiveTreatments.id,
                date: preventiveTreatments.applicationDate,
                type: sql<string>`'preventive'`,
                subtype: preventiveTreatments.type,
                title: preventiveTreatments.productName,
                description: preventiveTreatments.notes,
                nextDueDate: preventiveTreatments.nextDueDate,
                createdAt: preventiveTreatments.createdAt,
              }).from(preventiveTreatments).where(eq(preventiveTreatments.petId, petId))
            : Promise.resolve([]),

          // Documents
          (!types || types.includes("document"))
            ? db.select({
                id: documents.id,
                date: documents.createdAt,
                type: sql<string>`'document'`,
                subtype: documents.category,
                title: documents.title,
                description: documents.description,
                fileUrl: documents.fileUrl,
                fileName: documents.fileName,
                relatedModule: documents.relatedModule,
                relatedId: documents.relatedId,
                createdAt: documents.createdAt,
              }).from(documents).where(eq(documents.petId, petId))
            : Promise.resolve([]),

          // Calendar Events
          (!types || types.includes("calendar"))
            ? db.select({
                id: calendarEvents.id,
                date: calendarEvents.eventDate,
                type: sql<string>`'calendar'`,
                subtype: calendarEvents.eventType,
                title: calendarEvents.title,
                description: calendarEvents.description,
                status: calendarEvents.status,
                createdAt: calendarEvents.createdAt,
              }).from(calendarEvents).where(eq(calendarEvents.petId, petId))
            : Promise.resolve([]),

          // Transactions (Credit history)
          (!types || types.includes("transaction"))
            ? db.select({
                id: transactions.id,
                date: transactions.createdAt,
                type: sql<string>`'transaction'`,
                subtype: transactions.type,
                title: sql<string>`CASE 
                  WHEN ${transactions.type} = 'credit_purchase' THEN 'Compra de Créditos'
                  WHEN ${transactions.type} = 'credit_use' THEN 'Uso de Crédito'
                  ELSE 'Transação'
                END`,
                description: transactions.description,
                credits: transactions.credits,
                amount: transactions.amount,
                createdAt: transactions.createdAt,
              }).from(transactions).where(eq(transactions.petId, petId))
            : Promise.resolve([]),
        ]);

        // Combinar todos os itens em uma única timeline
        const allItems = [
          ...dailyLogsData.map(item => ({ ...item, sortDate: new Date(item.date) })),
          ...behaviorLogsData.map(item => ({ ...item, sortDate: new Date(item.date) })),
          ...trainingLogsData.map(item => ({ ...item, sortDate: new Date(item.date) })),
          ...vaccinationsData.map(item => ({ ...item, sortDate: new Date(item.date) })),
          ...medicationsData.map(item => ({ ...item, sortDate: new Date(item.date) })),
          ...preventivesData.map(item => ({ ...item, sortDate: new Date(item.date) })),
          ...documentsData.map(item => ({ ...item, sortDate: new Date(item.date) })),
          ...calendarData.map(item => ({ ...item, sortDate: new Date(item.date) })),
          ...transactionsData.map(item => ({ ...item, sortDate: new Date(item.date) })),
        ];

        // Ordenar por data (mais recente primeiro)
        allItems.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

        // Aplicar paginação
        const paginatedItems = allItems.slice(0, limit);

        // Calcular próximo cursor para paginação infinita
        const hasMore = allItems.length > limit;
        const nextCursor = hasMore ? paginatedItems.length : undefined;

        // Estatísticas resumidas
        const stats = {
          totalItems: allItems.length,
          byType: {
            daily_log: dailyLogsData.length,
            behavior: behaviorLogsData.length,
            training: trainingLogsData.length,
            vaccine: vaccinationsData.length,
            medication: medicationsData.length,
            preventive: preventivesData.length,
            document: documentsData.length,
            calendar: calendarData.length,
            transaction: transactionsData.length,
          },
        };

        return {
          items: paginatedItems,
          stats,
          hasMore,
          nextCursor,
        };
      }, "Erro ao buscar histórico do pet");
    }),
});
