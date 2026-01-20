import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import { 
  db, 
  pets, 
  petSocialCircle, 
  petWeightHistory, 
  petFeedingLogs, 
  petTrainingSkills,
  petAlerts,
  calendarEvents,
  dailyLogs,
  petTutors,
} from "@/lib/db";
import { eq, and, desc, gte, lte, sql, or, ne, isNull } from "drizzle-orm";
import { safeAsync } from "@/lib/errors";
import { addDays, subDays, startOfDay, endOfDay } from "date-fns";

/**
 * Router de Gestão Avançada de Pets
 * Funcionalidades para o dia-a-dia da creche
 */
export const petManagementRouter = router({
  // ============================================
  // DASHBOARD STATUS CARDS
  // ============================================

  /**
   * Status cards para o dashboard
   */
  /**
   * Mapa de calor de ocupação
   */
  getOccupancyHeatmap: adminProcedure
    .input(z.object({
      year: z.number(),
      month: z.number().min(0).max(11),
    }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const startOfMonth = new Date(input.year, input.month, 1);
        const endOfMonth = new Date(input.year, input.month + 1, 0, 23, 59, 59);
        const daysInMonth = endOfMonth.getDate();

        // Buscar todos os check-ins do mês
        const checkins = await db
          .select({
            date: sql<string>`DATE(${calendarEvents.eventDate})`,
            count: sql<number>`count(*)::int`,
          })
          .from(calendarEvents)
          .where(
            and(
              eq(calendarEvents.eventType, "checkin"),
              gte(calendarEvents.eventDate, startOfMonth),
              lte(calendarEvents.eventDate, endOfMonth)
            )
          )
          .groupBy(sql`DATE(${calendarEvents.eventDate})`);

        // Buscar capacidade aproximada (pets aprovados)
        const approvedPets = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(pets)
          .where(
            and(
              eq(pets.approvalStatus, "approved"),
              isNull(pets.deletedAt)
            )
          );

        const maxCapacity = Math.max(approvedPets[0]?.count || 10, 10);
        
        // Criar mapa de ocupação por dia
        const heatmapData: { date: string; count: number; percentage: number; level: "empty" | "low" | "medium" | "high" | "full" }[] = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${input.year}-${String(input.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const checkin = checkins.find(c => c.date === dateStr);
          const count = checkin?.count || 0;
          const percentage = (count / maxCapacity) * 100;
          
          let level: "empty" | "low" | "medium" | "high" | "full" = "empty";
          if (percentage > 90) level = "full";
          else if (percentage > 70) level = "high";
          else if (percentage > 40) level = "medium";
          else if (percentage > 0) level = "low";

          heatmapData.push({
            date: dateStr,
            count,
            percentage,
            level,
          });
        }

        return {
          heatmap: heatmapData,
          maxCapacity,
          avgOccupancy: heatmapData.reduce((sum, d) => sum + d.percentage, 0) / heatmapData.length,
        };
      }, "Erro ao calcular mapa de calor");
    }),

  getDailyStatusCards: adminProcedure
    .query(async () => {
      return safeAsync(async () => {
        const today = new Date();
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);

        // Pets para entrar (agendados para hoje)
        const scheduledToday = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(calendarEvents)
          .where(
            and(
              eq(calendarEvents.eventType, "checkin"),
              gte(calendarEvents.eventDate, dayStart),
              lte(calendarEvents.eventDate, dayEnd)
            )
          );

        // Medicamentos para aplicar hoje
        const today_weekday = today.toLocaleDateString('en', { weekday: 'long' }).toLowerCase();
        const medicationsToday = await db
          .select({ count: sql<number>`count(DISTINCT pet_id)::int` })
          .from(sql`pet_medications`)
          .where(
            and(
              sql`is_active = true`,
              sql`(frequency = 'daily' OR (frequency = 'weekly' AND week_days ? ${today_weekday}))`
            )
          );

        // Pets com estoque baixo (menos de 3 dias)
        const lowStockPets = await db
          .select()
          .from(pets)
          .where(
            and(
              eq(pets.approvalStatus, "approved"),
              isNull(pets.deletedAt),
              sql`food_amount > 0`,
              sql`food_stock_grams IS NOT NULL`,
              sql`(food_stock_grams / food_amount) <= 3`
            )
          );

        // Pets com comportamento atípico (alertas ativos de comportamento)
        const behaviorAlerts = await db
          .select({ count: sql<number>`count(DISTINCT pet_id)::int` })
          .from(petAlerts)
          .where(
            and(
              eq(petAlerts.isActive, true),
              eq(petAlerts.alertType, "behavior"),
              gte(petAlerts.createdAt, subDays(today, 7)) // Últimos 7 dias
            )
          );

        return {
          petsScheduledToEnter: scheduledToday[0]?.count || 0,
          medicationsToApply: medicationsToday[0]?.count || 0,
          lowStockPets: lowStockPets.length,
          behaviorAlertsCount: behaviorAlerts[0]?.count || 0,
          lowStockDetails: lowStockPets.map(p => ({
            id: p.id,
            name: p.name,
            daysRemaining: p.foodAmount ? Math.floor((p.foodStockGrams || 0) / p.foodAmount) : 0,
          })),
        };
      }, "Erro ao buscar status do dia");
    }),
  // ============================================
  // ESTOQUE DE RAÇÃO
  // ============================================

  /**
   * Atualiza estoque de ração do pet
   */
  updateFoodStock: adminProcedure
    .input(z.object({
      petId: z.number(),
      stockGrams: z.number().min(0),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        await db
          .update(pets)
          .set({
            foodStockGrams: input.stockGrams,
            foodStockLastUpdate: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(pets.id, input.petId));

        return { success: true };
      }, "Erro ao atualizar estoque");
    }),

  /**
   * Calcula previsão de estoque
   */
  getFoodStockForecast: adminProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const pet = await db.query.pets.findFirst({
          where: eq(pets.id, input.petId),
        });

        if (!pet) throw new Error("Pet não encontrado");

        const dailyConsumption = pet.foodAmount || 0;
        const currentStock = pet.foodStockGrams || 0;

        if (dailyConsumption === 0) {
          return {
            currentStock,
            dailyConsumption: 0,
            daysRemaining: null,
            alertLevel: "unknown" as const,
          };
        }

        const daysRemaining = Math.floor(currentStock / dailyConsumption);
        
        let alertLevel: "ok" | "warning" | "critical" | "empty" = "ok";
        if (daysRemaining <= 0) alertLevel = "empty";
        else if (daysRemaining <= 2) alertLevel = "critical";
        else if (daysRemaining <= 5) alertLevel = "warning";

        return {
          currentStock,
          dailyConsumption,
          daysRemaining,
          alertLevel,
          lastUpdate: pet.foodStockLastUpdate,
        };
      }, "Erro ao calcular previsão de estoque");
    }),

  /**
   * Lista pets com estoque baixo
   */
  getLowStockPets: adminProcedure
    .input(z.object({ 
      maxDaysRemaining: z.number().default(5) 
    }).optional())
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const maxDays = input?.maxDaysRemaining || 5;

        const allPets = await db
          .select()
          .from(pets)
          .where(
            and(
              eq(pets.approvalStatus, "approved"),
              isNull(pets.deletedAt)
            )
          );

        const lowStockPets = allPets
          .filter(pet => {
            if (!pet.foodAmount || pet.foodAmount === 0) return false;
            const stock = pet.foodStockGrams || 0;
            const daysRemaining = Math.floor(stock / pet.foodAmount);
            return daysRemaining <= maxDays;
          })
          .map(pet => {
            const daysRemaining = pet.foodAmount 
              ? Math.floor((pet.foodStockGrams || 0) / pet.foodAmount)
              : 0;
            return {
              ...pet,
              daysRemaining,
              alertLevel: daysRemaining <= 0 ? "empty" as const : 
                         daysRemaining <= 2 ? "critical" as const : "warning" as const,
            };
          })
          .sort((a, b) => a.daysRemaining - b.daysRemaining);

        return lowStockPets;
      }, "Erro ao buscar pets com estoque baixo");
    }),

  /**
   * Registra alimentação (desconta do estoque)
   */
  logFeeding: adminProcedure
    .input(z.object({
      petId: z.number(),
      mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
      amountGrams: z.number().min(0),
      consumption: z.enum(["all", "most", "half", "little", "none"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Registrar log
        await db.insert(petFeedingLogs).values({
          petId: input.petId,
          feedingDate: new Date(),
          mealType: input.mealType,
          amountGrams: input.amountGrams,
          consumption: input.consumption,
          notes: input.notes,
          createdById: ctx.user.id,
        });

        // Descontar do estoque baseado no consumo
        const consumptionMultiplier = {
          all: 1,
          most: 0.8,
          half: 0.5,
          little: 0.25,
          none: 0,
        };

        const consumed = Math.round(input.amountGrams * consumptionMultiplier[input.consumption]);

        const pet = await db.query.pets.findFirst({
          where: eq(pets.id, input.petId),
        });

        if (pet?.foodStockGrams) {
          const newStock = Math.max(0, pet.foodStockGrams - consumed);
          await db
            .update(pets)
            .set({
              foodStockGrams: newStock,
              foodStockLastUpdate: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(pets.id, input.petId));
        }

        return { success: true, consumed };
      }, "Erro ao registrar alimentação");
    }),

  // ============================================
  // CÍRCULO SOCIAL
  // ============================================

  /**
   * Adiciona relação social entre pets
   */
  addSocialRelation: adminProcedure
    .input(z.object({
      petId: z.number(),
      relatedPetId: z.number(),
      relationshipType: z.enum(["friend", "neutral", "avoid", "incompatible"]),
      notes: z.string().optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Criar relação bidirecional
        await db.insert(petSocialCircle).values([
          {
            petId: input.petId,
            relatedPetId: input.relatedPetId,
            relationshipType: input.relationshipType,
            notes: input.notes,
            severity: input.severity,
            createdById: ctx.user.id,
          },
          {
            petId: input.relatedPetId,
            relatedPetId: input.petId,
            relationshipType: input.relationshipType,
            notes: input.notes,
            severity: input.severity,
            createdById: ctx.user.id,
          },
        ]);

        return { success: true };
      }, "Erro ao adicionar relação social");
    }),

  /**
   * Obtém círculo social do pet
   */
  getSocialCircle: adminProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const relations = await db
          .select({
            relation: petSocialCircle,
            relatedPet: {
              id: pets.id,
              name: pets.name,
              photoUrl: pets.photoUrl,
              species: pets.species,
            },
          })
          .from(petSocialCircle)
          .innerJoin(pets, eq(petSocialCircle.relatedPetId, pets.id))
          .where(eq(petSocialCircle.petId, input.petId));

        const friends = relations.filter(r => r.relation.relationshipType === "friend");
        const avoid = relations.filter(r => 
          r.relation.relationshipType === "avoid" || 
          r.relation.relationshipType === "incompatible"
        );

        return { friends, avoid, all: relations };
      }, "Erro ao buscar círculo social");
    }),

  /**
   * Verifica conflitos de agendamento
   */
  checkScheduleConflicts: adminProcedure
    .input(z.object({
      petId: z.number(),
      date: z.string().or(z.date()),
    }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const date = new Date(input.date);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        // Buscar pets que têm restrição com o pet
        const restrictions = await db
          .select()
          .from(petSocialCircle)
          .where(
            and(
              eq(petSocialCircle.petId, input.petId),
              or(
                eq(petSocialCircle.relationshipType, "avoid"),
                eq(petSocialCircle.relationshipType, "incompatible")
              )
            )
          );

        if (restrictions.length === 0) {
          return { hasConflicts: false, conflicts: [] };
        }

        const restrictedPetIds = restrictions.map(r => r.relatedPetId);

        // Verificar quais pets conflitantes estão agendados para o mesmo dia
        const scheduledConflicts = await db
          .select({
            event: calendarEvents,
            pet: pets,
          })
          .from(calendarEvents)
          .innerJoin(pets, eq(calendarEvents.petId, pets.id))
          .where(
            and(
              sql`${calendarEvents.petId} = ANY(${restrictedPetIds})`,
              eq(calendarEvents.eventType, "checkin"),
              gte(calendarEvents.eventDate, dayStart),
              lte(calendarEvents.eventDate, dayEnd)
            )
          );

        const conflicts = scheduledConflicts.map(c => {
          const restriction = restrictions.find(r => r.relatedPetId === c.pet.id);
          return {
            pet: c.pet,
            severity: restriction?.severity || "medium",
            relationshipType: restriction?.relationshipType,
            notes: restriction?.notes,
          };
        });

        return {
          hasConflicts: conflicts.length > 0,
          conflicts,
        };
      }, "Erro ao verificar conflitos");
    }),

  // ============================================
  // HISTÓRICO DE PESO
  // ============================================

  /**
   * Registra peso
   */
  logWeight: adminProcedure
    .input(z.object({
      petId: z.number(),
      weight: z.number().min(100).max(200000), // 100g a 200kg
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Registrar no histórico
        await db.insert(petWeightHistory).values({
          petId: input.petId,
          weight: input.weight,
          measuredAt: new Date(),
          notes: input.notes,
          createdById: ctx.user.id,
        });

        // Atualizar peso atual do pet
        await db
          .update(pets)
          .set({
            weight: input.weight,
            updatedAt: new Date(),
          })
          .where(eq(pets.id, input.petId));

        return { success: true };
      }, "Erro ao registrar peso");
    }),

  /**
   * Obtém histórico de peso
   */
  getWeightHistory: protectedProcedure
    .input(z.object({
      petId: z.number(),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar acesso (admin ou tutor do pet)
        if (ctx.user.role !== "admin") {
          const ownership = await db
            .select()
            .from(petTutors)
            .where(
              and(
                eq(petTutors.petId, input.petId),
                eq(petTutors.tutorId, ctx.user.id)
              )
            );
          if (ownership.length === 0) {
            throw new Error("Acesso negado");
          }
        }

        const history = await db
          .select()
          .from(petWeightHistory)
          .where(eq(petWeightHistory.petId, input.petId))
          .orderBy(desc(petWeightHistory.measuredAt))
          .limit(input.limit);

        // Calcular tendência
        let trend: "gaining" | "losing" | "stable" | "unknown" = "unknown";
        if (history.length >= 2) {
          const latest = history[0].weight;
          const previous = history[1].weight;
          const diff = latest - previous;
          const percentChange = (diff / previous) * 100;

          if (percentChange > 2) trend = "gaining";
          else if (percentChange < -2) trend = "losing";
          else trend = "stable";
        }

        return {
          history: history.map(h => ({
            ...h,
            weightKg: h.weight / 1000,
          })),
          trend,
        };
      }, "Erro ao buscar histórico de peso");
    }),

  // ============================================
  // HABILIDADES DE ADESTRAMENTO
  // ============================================

  /**
   * Atualiza habilidade de adestramento
   */
  updateTrainingSkill: adminProcedure
    .input(z.object({
      petId: z.number(),
      skillName: z.string().min(1),
      status: z.enum(["not_started", "learning", "inconsistent", "mastered"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar se já existe
        const existing = await db
          .select()
          .from(petTrainingSkills)
          .where(
            and(
              eq(petTrainingSkills.petId, input.petId),
              eq(petTrainingSkills.skillName, input.skillName)
            )
          );

        if (existing.length > 0) {
          // Atualizar
          await db
            .update(petTrainingSkills)
            .set({
              status: input.status,
              lastPracticed: new Date(),
              notes: input.notes,
              updatedAt: new Date(),
            })
            .where(eq(petTrainingSkills.id, existing[0].id));
        } else {
          // Criar
          await db.insert(petTrainingSkills).values({
            petId: input.petId,
            skillName: input.skillName,
            status: input.status,
            lastPracticed: new Date(),
            notes: input.notes,
            createdById: ctx.user.id,
          });
        }

        return { success: true };
      }, "Erro ao atualizar habilidade");
    }),

  /**
   * Obtém matriz de habilidades
   */
  getSkillsMatrix: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const skills = await db
          .select()
          .from(petTrainingSkills)
          .where(eq(petTrainingSkills.petId, input.petId))
          .orderBy(petTrainingSkills.skillName);

        // Habilidades padrão
        const defaultSkills = [
          "Senta", "Fica", "Deita", "Vem", "Junto", 
          "Deixa", "Não pula", "Lugar", "Espera", "Solta"
        ];

        const matrix = defaultSkills.map(name => {
          const skill = skills.find(s => s.skillName === name);
          return {
            name,
            status: skill?.status || "not_started",
            lastPracticed: skill?.lastPracticed,
            notes: skill?.notes,
          };
        });

        // Adicionar skills customizadas
        const customSkills = skills.filter(s => !defaultSkills.includes(s.skillName));
        customSkills.forEach(skill => {
          matrix.push({
            name: skill.skillName,
            status: skill.status,
            lastPracticed: skill.lastPracticed,
            notes: skill.notes,
          });
        });

        return matrix;
      }, "Erro ao buscar matriz de habilidades");
    }),

  // ============================================
  // ALERTAS
  // ============================================

  /**
   * Cria alerta
   */
  createAlert: adminProcedure
    .input(z.object({
      petId: z.number(),
      alertType: z.enum(["behavior", "health", "feeding", "social", "financial"]),
      severity: z.enum(["info", "warning", "critical"]),
      title: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const [alert] = await db
          .insert(petAlerts)
          .values({
            petId: input.petId,
            alertType: input.alertType,
            severity: input.severity,
            title: input.title,
            description: input.description,
            createdById: ctx.user.id,
          })
          .returning();

        return alert;
      }, "Erro ao criar alerta");
    }),

  /**
   * Resolve alerta
   */
  resolveAlert: adminProcedure
    .input(z.object({
      alertId: z.number(),
      resolutionNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        await db
          .update(petAlerts)
          .set({
            isActive: false,
            resolvedAt: new Date(),
            resolvedById: ctx.user.id,
            resolutionNotes: input.resolutionNotes,
          })
          .where(eq(petAlerts.id, input.alertId));

        return { success: true };
      }, "Erro ao resolver alerta");
    }),

  /**
   * Lista alertas ativos do pet
   */
  getActiveAlerts: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const alerts = await db
          .select()
          .from(petAlerts)
          .where(
            and(
              eq(petAlerts.petId, input.petId),
              eq(petAlerts.isActive, true)
            )
          )
          .orderBy(desc(petAlerts.createdAt));

        return alerts;
      }, "Erro ao buscar alertas");
    }),

  // ============================================
  // TIMELINE UNIFICADA
  // ============================================

  /**
   * Timeline unificada do pet
   */
  getUnifiedTimeline: protectedProcedure
    .input(z.object({
      petId: z.number(),
      limit: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar acesso
        if (ctx.user.role !== "admin") {
          const ownership = await db
            .select()
            .from(petTutors)
            .where(
              and(
                eq(petTutors.petId, input.petId),
                eq(petTutors.tutorId, ctx.user.id)
              )
            );
          if (ownership.length === 0) {
            throw new Error("Acesso negado");
          }
        }

        // Buscar diferentes tipos de eventos
        const [logs, events, weights, feedings, alerts] = await Promise.all([
          // Daily Logs
          db.select()
            .from(dailyLogs)
            .where(eq(dailyLogs.petId, input.petId))
            .orderBy(desc(dailyLogs.logDate))
            .limit(input.limit),
          
          // Eventos do calendário
          db.select()
            .from(calendarEvents)
            .where(eq(calendarEvents.petId, input.petId))
            .orderBy(desc(calendarEvents.eventDate))
            .limit(input.limit),
          
          // Histórico de peso
          db.select()
            .from(petWeightHistory)
            .where(eq(petWeightHistory.petId, input.petId))
            .orderBy(desc(petWeightHistory.measuredAt))
            .limit(10),
          
          // Logs de alimentação
          db.select()
            .from(petFeedingLogs)
            .where(eq(petFeedingLogs.petId, input.petId))
            .orderBy(desc(petFeedingLogs.feedingDate))
            .limit(20),
          
          // Alertas
          db.select()
            .from(petAlerts)
            .where(eq(petAlerts.petId, input.petId))
            .orderBy(desc(petAlerts.createdAt))
            .limit(10),
        ]);

        // Unificar e ordenar
        const timeline = [
          ...logs.map(l => ({
            type: "log" as const,
            date: l.logDate,
            data: l,
          })),
          ...events.map(e => ({
            type: "event" as const,
            date: e.eventDate,
            data: e,
          })),
          ...weights.map(w => ({
            type: "weight" as const,
            date: w.measuredAt,
            data: { ...w, weightKg: w.weight / 1000 },
          })),
          ...feedings.map(f => ({
            type: "feeding" as const,
            date: f.feedingDate,
            data: f,
          })),
          ...alerts.map(a => ({
            type: "alert" as const,
            date: a.createdAt,
            data: a,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
         .slice(0, input.limit);

        return timeline;
      }, "Erro ao buscar timeline");
    }),
});
