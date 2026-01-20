/**
 * AI Router - Endpoints de Inteligência Artificial
 * 
 * Endpoints para:
 * - Gerar relatório semanal
 * - Analisar padrões comportamentais
 * - Otimizar distribuição de salas
 * - Disparar jobs de IA via Inngest
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import { inngest } from "@/lib/inngest/client";
import { 
  generateWeeklyReport, 
  analyzeBehaviorPatterns, 
  optimizeRoomAssignments 
} from "@/lib/inngest/ai-functions";
import { db } from "@/lib/db";
import { pets, behaviorLogs } from "@/lib/db/schema";
import { eq, desc, gte } from "drizzle-orm";

// Tipos para análise
interface BehaviorAlert {
  petId: number;
  petName: string;
  type: string;
  message: string;
}

interface DashboardSuggestion {
  type: string;
  message: string;
  priority: string;
}

export const aiRouter = router({
  // ============================================
  // RELATÓRIO SEMANAL
  // ============================================
  
  /**
   * Gerar relatório semanal para um pet (síncrono - aguarda resposta)
   */
  generateWeeklyReport: protectedProcedure
    .input(z.object({
      petId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { petId, startDate, endDate } = input;
      
      // Calcular datas padrão (última semana)
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate 
        ? new Date(startDate) 
        : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const report = await generateWeeklyReport(
        petId,
        start.toISOString(),
        end.toISOString()
      );
      
      return { report };
    }),

  /**
   * Agendar geração de relatório semanal (assíncrono via Inngest)
   */
  scheduleWeeklyReport: adminProcedure
    .input(z.object({
      petId: z.number(),
      tutorId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      await inngest.send({
        name: "ai/generate.weekly.report",
        data: input,
      });
      
      return { scheduled: true };
    }),

  // ============================================
  // ANÁLISE COMPORTAMENTAL
  // ============================================

  /**
   * Analisar padrões de comportamento de um pet
   */
  analyzeBehavior: adminProcedure
    .input(z.object({
      petId: z.number(),
      daysToAnalyze: z.number().min(3).max(30).default(7),
    }))
    .mutation(async ({ input }) => {
      const { petId, daysToAnalyze } = input;
      
      const analysis = await analyzeBehaviorPatterns(petId, daysToAnalyze);
      
      return analysis;
    }),

  /**
   * Obter análise comportamental de todos os pets (resumo)
   */
  getAllBehaviorAnalysis: adminProcedure
    .query(async () => {
      // Buscar pets aprovados
      const approvedPets = await db.query.pets.findMany({
        where: eq(pets.approvalStatus, "approved"),
      });

      // Analisar cada pet (limitar a 10 para não sobrecarregar)
      const analyses = await Promise.all(
        approvedPets.slice(0, 10).map(async (pet) => {
          try {
            return await analyzeBehaviorPatterns(pet.id, 7);
          } catch {
            return {
              petId: pet.id,
              petName: pet.name,
              overallTrend: "stable" as const,
              alerts: [],
              summary: "Dados insuficientes para análise",
            };
          }
        })
      );

      // Filtrar apenas os que precisam de atenção
      const needsAttention = analyses.filter(
        (a) => a.overallTrend === "attention_needed" || a.alerts.length > 0
      );

      return {
        total: analyses.length,
        needsAttention: needsAttention.length,
        analyses: needsAttention,
      };
    }),

  // ============================================
  // OTIMIZAÇÃO DE SALAS
  // ============================================

  /**
   * Obter sugestões de otimização de salas para um dia
   */
  getRoomSuggestions: adminProcedure
    .input(z.object({
      date: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const date = input.date || new Date().toISOString().split("T")[0];
      
      const suggestions = await optimizeRoomAssignments(date);
      
      return {
        date,
        suggestions,
        hasHighPriority: suggestions.some((s) => s.priority === "high"),
      };
    }),

  // ============================================
  // INSIGHTS DO DASHBOARD
  // ============================================

  /**
   * Obter insights de IA para o dashboard
   */
  getDashboardInsights: adminProcedure
    .query(async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // Buscar logs de comportamento recentes
      const recentBehaviors = await db.query.behaviorLogs.findMany({
        where: gte(behaviorLogs.logDate, startDate),
        orderBy: [desc(behaviorLogs.logDate)],
      });

      // Buscar todos os pets para referência
      const allPets = await db.query.pets.findMany({
        where: eq(pets.approvalStatus, "approved"),
      });
      
      const petsMap = new Map(allPets.map(p => [p.id, p]));

      // Agrupar por pet e calcular tendências simples
      const petBehaviors = new Map<number, typeof recentBehaviors>();
      for (const behavior of recentBehaviors) {
        const existing = petBehaviors.get(behavior.petId) || [];
        existing.push(behavior);
        petBehaviors.set(behavior.petId, existing);
      }

      // Identificar pets que precisam de atenção baseado em regras simples
      const alerts: BehaviorAlert[] = [];

      petBehaviors.forEach((behaviors, petId) => {
        const pet = petsMap.get(petId);
        if (!pet) return;

        // Verificar ansiedade crescente
        const anxietyLevels = behaviors
          .filter((b) => b.anxiety)
          .map((b) => {
            const level = b.anxiety;
            if (level === "severe") return 4;
            if (level === "moderate") return 3;
            if (level === "mild") return 2;
            return 1;
          });

        if (anxietyLevels.length >= 3) {
          const recentAvg = anxietyLevels.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
          if (recentAvg >= 2.5) {
            alerts.push({
              petId,
              petName: pet.name,
              type: "anxiety",
              message: `${pet.name} apresenta sinais de ansiedade nos últimos dias`,
            });
          }
        }

        // Verificar energia muito baixa consistente
        const energyLevels = behaviors
          .filter((b) => b.energy)
          .map((b) => b.energy);

        const lowEnergyCount = energyLevels.filter((e) => e === "low").length;
        if (lowEnergyCount >= 3) {
          alerts.push({
            petId,
            petName: pet.name,
            type: "energy",
            message: `${pet.name} tem apresentado energia baixa consistentemente`,
          });
        }
      });

      // Sugestões gerais
      const suggestions: DashboardSuggestion[] = [
        {
          type: "tip",
          message: "Considere atividades em grupo para pets com alta energia hoje",
          priority: "low",
        },
      ];

      // Adicionar sugestões baseadas nos dados
      const today = new Date().toISOString().split("T")[0];
      const roomSuggestions = await optimizeRoomAssignments(today);
      
      if (roomSuggestions.length > 0) {
        suggestions.push({
          type: "room",
          message: `${roomSuggestions.length} sugestões de redistribuição de salas disponíveis`,
          priority: roomSuggestions.some((s) => s.priority === "high") ? "high" : "medium",
        });
      }

      return {
        alerts,
        suggestions,
        lastUpdated: new Date().toISOString(),
      };
    }),

  // ============================================
  // QUICK ACTIONS
  // ============================================

  /**
   * Enviar relatório semanal para tutor
   */
  sendWeeklyReportToTutor: adminProcedure
    .input(z.object({
      petId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Buscar pet
      const pet = await db.query.pets.findFirst({
        where: eq(pets.id, input.petId),
      });

      if (!pet) {
        throw new Error("Pet não encontrado");
      }

      // Gerar relatório
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const report = await generateWeeklyReport(
        input.petId,
        startDate.toISOString(),
        endDate.toISOString()
      );

      // TODO: Implementar busca de tutor e envio via WhatsApp
      // Por enquanto, apenas retorna o relatório

      return { 
        success: true, 
        report,
        sentViaWhatsApp: false,
      };
    }),
});
