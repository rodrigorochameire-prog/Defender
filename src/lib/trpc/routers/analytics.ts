import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import { 
  db, 
  pets, 
  petTutors, 
  users, 
  calendarEvents, 
  dailyLogs, 
  petVaccinations, 
  petMedications,
  medicationLibrary,
  bookingRequests,
  creditPackages,
} from "@/lib/db";
import { eq, and, desc, gte, lte, sql, lt, isNull, or, ne } from "drizzle-orm";
import { safeAsync } from "@/lib/errors";
import { 
  subDays, 
  startOfDay, 
  endOfDay, 
  startOfMonth, 
  endOfMonth, 
  addDays,
  format,
  eachDayOfInterval,
  getHours,
} from "date-fns";

// Capacidade máxima da creche (pode ser configurável no futuro)
const CRECHE_CAPACITY = 30;

export const analyticsRouter = router({
  // ============================================
  // MÉTRICAS PARA ADMINISTRADORES
  // ============================================

  /**
   * Taxa de ocupação diária (últimos 30 dias)
   * Gráfico de linha: ocupação vs capacidade
   */
  occupancyRate: adminProcedure
    .input(z.object({
      days: z.number().min(7).max(90).default(30),
    }).optional())
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const days = input?.days || 30;
        const startDate = subDays(new Date(), days);
        
        // Buscar eventos de check-in por dia
        const events = await db
          .select({
            date: sql<string>`DATE(${calendarEvents.eventDate})::text`,
            count: sql<number>`count(DISTINCT ${calendarEvents.petId})::int`,
          })
          .from(calendarEvents)
          .where(
            and(
              eq(calendarEvents.eventType, "checkin"),
              gte(calendarEvents.eventDate, startDate),
              or(
                eq(calendarEvents.status, "completed"),
                eq(calendarEvents.status, "scheduled")
              )
            )
          )
          .groupBy(sql`DATE(${calendarEvents.eventDate})`);

        // Criar array com todos os dias
        const dateRange = eachDayOfInterval({
          start: startDate,
          end: new Date(),
        });

        const occupancyData = dateRange.map(date => {
          const dateStr = format(date, "yyyy-MM-dd");
          const dayData = events.find(e => e.date === dateStr);
          const count = dayData?.count || 0;
          
          return {
            date: dateStr,
            count,
            capacity: CRECHE_CAPACITY,
            occupancyPercent: Math.round((count / CRECHE_CAPACITY) * 100),
          };
        });

        // Calcular média
        const avgOccupancy = occupancyData.reduce((acc, d) => acc + d.count, 0) / occupancyData.length;

        return {
          data: occupancyData,
          capacity: CRECHE_CAPACITY,
          avgOccupancy: Math.round(avgOccupancy * 10) / 10,
          avgOccupancyPercent: Math.round((avgOccupancy / CRECHE_CAPACITY) * 100),
        };
      }, "Erro ao calcular taxa de ocupação");
    }),

  /**
   * Churn Rate - Pets inativos
   * Pets que não frequentam há mais de X dias
   */
  churnRate: adminProcedure
    .input(z.object({
      inactiveDays: z.number().min(7).max(90).default(15),
    }).optional())
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const inactiveDays = input?.inactiveDays || 15;
        const cutoffDate = subDays(new Date(), inactiveDays);
        
        // Buscar todos os pets aprovados
        const allApprovedPets = await db
          .select({
            id: pets.id,
            name: pets.name,
            species: pets.species,
            photoUrl: pets.photoUrl,
            credits: pets.credits,
          })
          .from(pets)
          .where(
            and(
              eq(pets.approvalStatus, "approved"),
              isNull(pets.deletedAt)
            )
          );

        // Buscar último check-in de cada pet
        const lastCheckins = await db
          .select({
            petId: calendarEvents.petId,
            lastCheckin: sql<Date>`MAX(${calendarEvents.eventDate})`,
          })
          .from(calendarEvents)
          .where(eq(calendarEvents.eventType, "checkin"))
          .groupBy(calendarEvents.petId);

        const lastCheckinMap = new Map(
          lastCheckins.map(c => [c.petId, c.lastCheckin])
        );

        // Identificar pets inativos
        const inactivePets = allApprovedPets.filter(pet => {
          const lastCheckin = lastCheckinMap.get(pet.id);
          if (!lastCheckin) return true; // Nunca fez check-in
          return new Date(lastCheckin) < cutoffDate;
        });

        // Buscar informações do tutor para os inativos
        const inactivePetsWithTutors = await Promise.all(
          inactivePets.map(async (pet) => {
            const tutor = await db
              .select({
                id: users.id,
                name: users.name,
                email: users.email,
                phone: users.phone,
              })
              .from(petTutors)
              .innerJoin(users, eq(petTutors.tutorId, users.id))
              .where(eq(petTutors.petId, pet.id))
              .limit(1);

            return {
              ...pet,
              tutor: tutor[0] || null,
              lastCheckin: lastCheckinMap.get(pet.id) || null,
              daysSinceLastVisit: lastCheckinMap.get(pet.id) 
                ? Math.floor((Date.now() - new Date(lastCheckinMap.get(pet.id)!).getTime()) / (1000 * 60 * 60 * 24))
                : null,
            };
          })
        );

        // Calcular churn rate
        const churnRate = (inactivePets.length / allApprovedPets.length) * 100;

        return {
          inactivePets: inactivePetsWithTutors.sort((a, b) => 
            (b.daysSinceLastVisit || 999) - (a.daysSinceLastVisit || 999)
          ),
          totalActive: allApprovedPets.length - inactivePets.length,
          totalInactive: inactivePets.length,
          totalPets: allApprovedPets.length,
          churnRate: Math.round(churnRate * 10) / 10,
          inactiveDays,
        };
      }, "Erro ao calcular churn rate");
    }),

  /**
   * Mapa de calor de horários
   * Horários de pico de entrada e saída
   */
  peakHours: adminProcedure
    .input(z.object({
      days: z.number().min(7).max(90).default(30),
    }).optional())
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const days = input?.days || 30;
        const startDate = subDays(new Date(), days);

        // Buscar check-ins com horário
        const checkins = await db
          .select({
            eventDate: calendarEvents.eventDate,
          })
          .from(calendarEvents)
          .where(
            and(
              eq(calendarEvents.eventType, "checkin"),
              gte(calendarEvents.eventDate, startDate)
            )
          );

        // Agrupar por hora
        const hourCounts: Record<number, number> = {};
        for (let i = 6; i <= 20; i++) {
          hourCounts[i] = 0;
        }

        checkins.forEach(event => {
          const hour = getHours(new Date(event.eventDate));
          if (hour >= 6 && hour <= 20) {
            hourCounts[hour]++;
          }
        });

        const peakHoursData = Object.entries(hourCounts).map(([hour, count]) => ({
          hour: parseInt(hour),
          label: `${hour.padStart(2, "0")}:00`,
          count,
        }));

        // Encontrar pico
        const maxCount = Math.max(...Object.values(hourCounts));
        const peakHour = Object.entries(hourCounts).find(([_, c]) => c === maxCount)?.[0];

        return {
          data: peakHoursData,
          peakHour: peakHour ? parseInt(peakHour) : null,
          totalEvents: checkins.length,
        };
      }, "Erro ao calcular horários de pico");
    }),

  /**
   * Pets que requerem atenção
   * Vacinas vencendo, medicamentos para hoje, créditos baixos
   */
  petsRequiringAttention: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const today = new Date();
      const sevenDaysFromNow = addDays(today, 7);

      // Pets com vacinas vencendo em 7 dias
      const vaccinesDue = await db
        .select({
          petId: petVaccinations.petId,
          petName: pets.name,
          petPhoto: pets.photoUrl,
          nextDueDate: petVaccinations.nextDueDate,
          type: sql<string>`'vaccine'`,
        })
        .from(petVaccinations)
        .innerJoin(pets, eq(petVaccinations.petId, pets.id))
        .where(
          and(
            gte(petVaccinations.nextDueDate, startOfDay(today)),
            lte(petVaccinations.nextDueDate, sevenDaysFromNow),
            eq(pets.approvalStatus, "approved")
          )
        );

      // Pets com medicamentos para hoje
      const medicationsToday = await db
        .select({
          petId: petMedications.petId,
          petName: pets.name,
          petPhoto: pets.photoUrl,
          medicationName: medicationLibrary.name,
          type: sql<string>`'medication'`,
        })
        .from(petMedications)
        .innerJoin(pets, eq(petMedications.petId, pets.id))
        .innerJoin(medicationLibrary, eq(petMedications.medicationId, medicationLibrary.id))
        .where(
          and(
            eq(petMedications.isActive, true),
            gte(petMedications.endDate, today),
            eq(pets.approvalStatus, "approved")
          )
        );

      // Pets com menos de 3 créditos
      const lowCredits = await db
        .select({
          id: pets.id,
          name: pets.name,
          photoUrl: pets.photoUrl,
          credits: pets.credits,
          type: sql<string>`'low_credits'`,
        })
        .from(pets)
        .where(
          and(
            lt(pets.credits, 3),
            eq(pets.approvalStatus, "approved"),
            isNull(pets.deletedAt)
          )
        );

      // Combinar e formatar
      const attentionItems = [
        ...vaccinesDue.map(v => ({
          petId: v.petId,
          petName: v.petName,
          petPhoto: v.petPhoto,
          type: "vaccine" as const,
          priority: "high" as const,
          message: `Vacina vence em ${format(new Date(v.nextDueDate!), "dd/MM")}`,
        })),
        ...medicationsToday.map(m => ({
          petId: m.petId,
          petName: m.petName,
          petPhoto: m.petPhoto,
          type: "medication" as const,
          priority: "medium" as const,
          message: `Medicamento: ${m.medicationName}`,
        })),
        ...lowCredits.map(p => ({
          petId: p.id,
          petName: p.name,
          petPhoto: p.photoUrl,
          type: "low_credits" as const,
          priority: p.credits === 0 ? "high" as const : "low" as const,
          message: `Apenas ${p.credits} crédito(s)`,
        })),
      ];

      // Agrupar por pet
      const petMap = new Map<number, typeof attentionItems>();
      attentionItems.forEach(item => {
        const existing = petMap.get(item.petId) || [];
        existing.push(item);
        petMap.set(item.petId, existing);
      });

      const groupedByPet = Array.from(petMap.entries()).map(([petId, items]) => ({
        petId,
        petName: items[0].petName,
        petPhoto: items[0].petPhoto,
        alerts: items,
        alertCount: items.length,
      }));

      return {
        items: groupedByPet.sort((a, b) => b.alertCount - a.alertCount),
        summary: {
          vaccinesDue: vaccinesDue.length,
          medicationsToday: medicationsToday.length,
          lowCredits: lowCredits.length,
          totalAlerts: attentionItems.length,
          petsAffected: groupedByPet.length,
        },
      };
    }, "Erro ao buscar pets que requerem atenção");
  }),

  /**
   * Previsão de receita mensal
   * Baseado em transações reais + projeção
   */
  revenueProjection: adminProcedure
    .input(z.object({
      months: z.number().min(1).max(12).default(6),
    }).optional())
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const months = input?.months || 6;
        const now = new Date();
        
        // Buscar pacotes ativos para calcular preço médio
        const packages = await db
          .select()
          .from(creditPackages)
          .where(eq(creditPackages.isActive, true));

        const avgPricePerCredit = packages.length > 0
          ? packages.reduce((acc, p) => acc + (p.priceInCents / p.credits), 0) / packages.length
          : 5000; // R$50 default

        // Dados por mês
        const monthlyData = [];
        
        for (let i = months - 1; i >= 0; i--) {
          const monthStart = startOfMonth(subDays(now, i * 30));
          const monthEnd = endOfMonth(monthStart);
          const isPast = monthEnd < now;
          
          // Contar check-ins do mês (= créditos usados)
          const [monthEvents] = await db
            .select({
              count: sql<number>`count(*)::int`,
            })
            .from(calendarEvents)
            .where(
              and(
                eq(calendarEvents.eventType, "checkin"),
                gte(calendarEvents.eventDate, monthStart),
                lte(calendarEvents.eventDate, monthEnd)
              )
            );

          const creditsUsed = monthEvents?.count || 0;
          const revenue = creditsUsed * avgPricePerCredit;

          monthlyData.push({
            month: format(monthStart, "MMM/yy"),
            monthNumber: monthStart.getMonth() + 1,
            year: monthStart.getFullYear(),
            creditsUsed,
            revenue,
            revenueFormatted: `R$ ${(revenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            isProjection: !isPast,
          });
        }

        // Total e média
        const totalRevenue = monthlyData.reduce((acc, m) => acc + m.revenue, 0);
        const avgMonthlyRevenue = totalRevenue / monthlyData.length;

        return {
          data: monthlyData,
          totalRevenue,
          avgMonthlyRevenue,
          avgPricePerCredit,
        };
      }, "Erro ao calcular projeção de receita");
    }),

  // ============================================
  // MÉTRICAS PARA TUTORES
  // ============================================

  /**
   * Linha do tempo de bem-estar do pet
   * Baseado nos daily logs
   */
  petWellnessTimeline: protectedProcedure
    .input(z.object({
      petId: z.number(),
      days: z.number().min(7).max(90).default(30),
    }))
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar se o pet pertence ao tutor
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
          throw new Error("Pet não encontrado");
        }

        const startDate = subDays(new Date(), input.days);

        // Buscar daily logs
        const logs = await db
          .select({
            id: dailyLogs.id,
            logDate: dailyLogs.logDate,
            notes: dailyLogs.notes,
            mood: dailyLogs.mood,
            energy: dailyLogs.energy,
            attachments: dailyLogs.attachments,
          })
          .from(dailyLogs)
          .where(
            and(
              eq(dailyLogs.petId, input.petId),
              gte(dailyLogs.logDate, startDate)
            )
          )
          .orderBy(desc(dailyLogs.logDate));

        // Calcular estatísticas de humor
        const moodCounts = {
          positive: 0,
          neutral: 0,
          negative: 0,
        };

        logs.forEach(log => {
          if (log.mood === "happy" || log.mood === "excited") {
            moodCounts.positive++;
          } else if (log.mood === "calm" || log.mood === "neutral") {
            moodCounts.neutral++;
          } else if (log.mood === "sad" || log.mood === "anxious" || log.mood === "tired") {
            moodCounts.negative++;
          }
        });

        const totalMoods = moodCounts.positive + moodCounts.neutral + moodCounts.negative;

        return {
          logs,
          moodStats: {
            positive: moodCounts.positive,
            neutral: moodCounts.neutral,
            negative: moodCounts.negative,
            positivePercent: totalMoods > 0 ? Math.round((moodCounts.positive / totalMoods) * 100) : 0,
          },
          totalLogs: logs.length,
        };
      }, "Erro ao buscar timeline de bem-estar");
    }),

  /**
   * Evolução de peso do pet
   */
  petWeightHistory: protectedProcedure
    .input(z.object({
      petId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar se o pet pertence ao tutor
        const pet = await db
          .select()
          .from(pets)
          .innerJoin(petTutors, eq(pets.id, petTutors.petId))
          .where(
            and(
              eq(pets.id, input.petId),
              eq(petTutors.tutorId, ctx.user.id)
            )
          );

        if (pet.length === 0) {
          throw new Error("Pet não encontrado");
        }

        // Por enquanto retorna o peso atual
        // TODO: Criar tabela de histórico de peso
        const currentPet = pet[0].pets;

        return {
          currentWeight: currentPet.weight,
          currentWeightKg: currentPet.weight ? currentPet.weight / 1000 : null,
          history: [], // Será populado quando tivermos tabela de histórico
        };
      }, "Erro ao buscar histórico de peso");
    }),

  /**
   * Frequência mensal do pet
   */
  petFrequency: protectedProcedure
    .input(z.object({
      petId: z.number(),
      months: z.number().min(1).max(12).default(6),
    }))
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar ownership
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
          throw new Error("Pet não encontrado");
        }

        const now = new Date();
        const monthlyData = [];

        for (let i = input.months - 1; i >= 0; i--) {
          const monthStart = startOfMonth(subDays(now, i * 30));
          const monthEnd = endOfMonth(monthStart);

          const [monthEvents] = await db
            .select({
              count: sql<number>`count(*)::int`,
            })
            .from(calendarEvents)
            .where(
              and(
                eq(calendarEvents.petId, input.petId),
                eq(calendarEvents.eventType, "checkin"),
                gte(calendarEvents.eventDate, monthStart),
                lte(calendarEvents.eventDate, monthEnd)
              )
            );

          monthlyData.push({
            month: format(monthStart, "MMM/yy"),
            visits: monthEvents?.count || 0,
          });
        }

        const totalVisits = monthlyData.reduce((acc, m) => acc + m.visits, 0);
        const avgMonthlyVisits = totalVisits / input.months;

        return {
          data: monthlyData,
          totalVisits,
          avgMonthlyVisits: Math.round(avgMonthlyVisits * 10) / 10,
        };
      }, "Erro ao buscar frequência do pet");
    }),

  /**
   * Extrato detalhado de créditos
   * Conecta transactions com calendar_events
   */
  creditStatement: protectedProcedure
    .input(z.object({
      petId: z.number(),
      limit: z.number().min(10).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar ownership
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
          throw new Error("Pet não encontrado");
        }

        // Buscar eventos de check-in (débitos)
        const checkins = await db
          .select({
            id: calendarEvents.id,
            date: calendarEvents.eventDate,
            title: calendarEvents.title,
            status: calendarEvents.status,
          })
          .from(calendarEvents)
          .where(
            and(
              eq(calendarEvents.petId, input.petId),
              eq(calendarEvents.eventType, "checkin"),
              eq(calendarEvents.status, "completed")
            )
          )
          .orderBy(desc(calendarEvents.eventDate))
          .limit(input.limit);

        // Formatar extrato
        const statement = checkins.map(event => ({
          id: event.id,
          date: event.date,
          dateFormatted: format(new Date(event.date), "dd/MM/yyyy"),
          type: "debit" as const,
          description: event.title || "Dia de creche",
          credits: -1,
        }));

        // Buscar pet para saldo atual
        const [pet] = await db
          .select({ credits: pets.credits })
          .from(pets)
          .where(eq(pets.id, input.petId));

        return {
          statement,
          currentBalance: pet?.credits || 0,
        };
      }, "Erro ao buscar extrato de créditos");
    }),

  /**
   * Sugestão inteligente de pacote de créditos
   */
  smartTopUpSuggestion: protectedProcedure
    .input(z.object({
      petId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar ownership
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
          throw new Error("Pet não encontrado");
        }

        // Calcular média de visitas dos últimos 3 meses
        const threeMonthsAgo = subDays(new Date(), 90);
        
        const [avgVisits] = await db
          .select({
            count: sql<number>`count(*)::int`,
          })
          .from(calendarEvents)
          .where(
            and(
              eq(calendarEvents.petId, input.petId),
              eq(calendarEvents.eventType, "checkin"),
              gte(calendarEvents.eventDate, threeMonthsAgo)
            )
          );

        const monthlyAvg = (avgVisits?.count || 0) / 3;

        // Buscar saldo atual
        const [pet] = await db
          .select({ credits: pets.credits })
          .from(pets)
          .where(eq(pets.id, input.petId));

        const currentCredits = pet?.credits || 0;

        // Buscar pacotes disponíveis
        const packages = await db
          .select()
          .from(creditPackages)
          .where(eq(creditPackages.isActive, true))
          .orderBy(creditPackages.credits);

        // Calcular quantos meses o saldo atual dura
        const monthsRemaining = monthlyAvg > 0 ? currentCredits / monthlyAvg : 99;

        // Sugerir pacote baseado na frequência
        let suggestedPackage = packages[0]; // Default: menor pacote
        
        if (monthlyAvg >= 12) {
          // Frequência alta (3+ visitas/semana): sugerir pacote maior
          suggestedPackage = packages[packages.length - 1] || packages[0];
        } else if (monthlyAvg >= 8) {
          // Frequência média (2 visitas/semana): pacote médio
          suggestedPackage = packages[Math.floor(packages.length / 2)] || packages[0];
        }

        return {
          currentCredits,
          monthlyAvg: Math.round(monthlyAvg * 10) / 10,
          monthsRemaining: Math.round(monthsRemaining * 10) / 10,
          suggestedPackage,
          allPackages: packages,
          needsTopUp: currentCredits < 5 || monthsRemaining < 1,
        };
      }, "Erro ao calcular sugestão de recarga");
    }),
});
