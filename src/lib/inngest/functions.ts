/**
 * Inngest Functions - Handlers de Tarefas Assíncronas
 * 
 * Cada função processa um tipo de evento com:
 * - Retentativas automáticas
 * - Backoff exponencial
 * - Logs de execução
 */

import { inngest } from "./client";
import { sendWhatsAppMessage } from "./whatsapp-helper";
import { generateWeeklyReport, analyzeBehaviorPatterns, optimizeRoomAssignments } from "./ai-functions";
import { metrics } from "@/lib/monitoring/axiom";

// ============================================
// WHATSAPP FUNCTIONS
// ============================================

export const sendWhatsAppMessageFn = inngest.createFunction(
  {
    id: "send-whatsapp-message",
    name: "Send WhatsApp Message",
    retries: 5,
  },
  { event: "whatsapp/send.message" },
  async ({ event, step }) => {
    const { to, message } = event.data;
    
    const result = await step.run("send-message", async () => {
      const start = Date.now();
      
      const response = await sendWhatsAppMessage(to, message);
      
      await metrics.logEvent("whatsapp_sent", {
        to,
        duration_ms: Date.now() - start,
        success: response.success,
        error: response.error,
      });
      
      if (!response.success) {
        throw new Error(response.error || "Failed to send message");
      }
      
      return response;
    });
    
    return { success: true, messageId: result?.messageId };
  }
);

// ============================================
// CHECK-IN/OUT NOTIFICATIONS
// ============================================

export const notifyCheckinFn = inngest.createFunction(
  {
    id: "notify-checkin",
    name: "Notify Check-in",
    retries: 5,
  },
  { event: "checkin/completed" },
  async ({ event, step }) => {
    const { petName, tutorPhone, timestamp } = event.data;
    
    if (!tutorPhone) {
      return { skipped: true, reason: "No phone number" };
    }
    
    await step.run("send-checkin-notification", async () => {
      const formattedTime = new Date(timestamp).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      
      await sendWhatsAppMessage(
        tutorPhone,
        `🐕 ${petName} chegou na creche às ${formattedTime}! Tenha um ótimo dia! 🌟`
      );
    });
    
    return { success: true };
  }
);

export const notifyCheckoutFn = inngest.createFunction(
  {
    id: "notify-checkout",
    name: "Notify Check-out",
    retries: 5,
  },
  { event: "checkout/completed" },
  async ({ event, step }) => {
    const { petName, tutorPhone, creditsRemaining, timestamp } = event.data;
    
    if (!tutorPhone) {
      return { skipped: true, reason: "No phone number" };
    }
    
    await step.run("send-checkout-notification", async () => {
      const formattedTime = new Date(timestamp).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      
      let message = `🏠 ${petName} está pronto para ir para casa! (${formattedTime})\n\n`;
      message += `💳 Créditos restantes: ${creditsRemaining}`;
      
      if (creditsRemaining <= 3) {
        message += `\n\n⚠️ Poucos créditos! Recarregue para garantir mais dias de diversão.`;
      }
      
      await sendWhatsAppMessage(tutorPhone, message);
    });
    
    return { success: true };
  }
);

// ============================================
// ALERT FUNCTIONS
// ============================================

export const alertLowCreditsFn = inngest.createFunction(
  {
    id: "alert-low-credits",
    name: "Alert Low Credits",
    retries: 5,
  },
  { event: "alert/low.credits" },
  async ({ event, step }) => {
    const { petName, tutorPhone, creditsRemaining } = event.data;
    
    if (!tutorPhone) {
      return { skipped: true, reason: "No phone number" };
    }
    
    await step.run("send-low-credits-alert", async () => {
      let message = `⚠️ Alerta de Créditos\n\n`;
      message += `${petName} tem apenas ${creditsRemaining} crédito(s) restante(s).\n\n`;
      message += `Recarregue agora para garantir que ${petName} continue aproveitando a creche! 🐕`;
      
      await sendWhatsAppMessage(tutorPhone, message);
    });
    
    return { success: true };
  }
);

export const alertVaccineDueFn = inngest.createFunction(
  {
    id: "alert-vaccine-due",
    name: "Alert Vaccine Due",
    retries: 5,
  },
  { event: "alert/vaccine.due" },
  async ({ event, step }) => {
    const { petName, tutorPhone, vaccineName, dueDate } = event.data;
    
    if (!tutorPhone) {
      return { skipped: true, reason: "No phone number" };
    }
    
    await step.run("send-vaccine-alert", async () => {
      const formattedDate = new Date(dueDate).toLocaleDateString("pt-BR");
      
      let message = `💉 Lembrete de Vacina\n\n`;
      message += `A vacina "${vaccineName}" de ${petName} vence em ${formattedDate}.\n\n`;
      message += `Por favor, atualize a carteira de vacinação para continuar frequentando a creche.`;
      
      await sendWhatsAppMessage(tutorPhone, message);
    });
    
    return { success: true };
  }
);

export const alertLowStockFn = inngest.createFunction(
  {
    id: "alert-low-stock",
    name: "Alert Low Food Stock",
    retries: 5,
  },
  { event: "alert/low.stock" },
  async ({ event, step }) => {
    const { petName, tutorPhone, daysRemaining } = event.data;
    
    if (!tutorPhone) {
      return { skipped: true, reason: "No phone number" };
    }
    
    await step.run("send-low-stock-alert", async () => {
      let message = `🍽️ Alerta de Ração\n\n`;
      message += `A ração de ${petName} vai acabar em aproximadamente ${daysRemaining} dia(s).\n\n`;
      message += `Por favor, traga mais ração para garantir a alimentação adequada do seu pet! 🐕`;
      
      await sendWhatsAppMessage(tutorPhone, message);
    });
    
    return { success: true };
  }
);

// ============================================
// AI FUNCTIONS
// ============================================

export const generateWeeklyReportFn = inngest.createFunction(
  {
    id: "generate-weekly-report",
    name: "Generate Weekly Report with AI",
    retries: 3,
  },
  { event: "ai/generate.weekly.report" },
  async ({ event, step }) => {
    const { petId, tutorId, startDate, endDate } = event.data;
    
    const report = await step.run("generate-report", async () => {
      return await generateWeeklyReport(petId, startDate, endDate);
    });
    
    // Aqui poderia salvar o relatório no banco ou enviar por WhatsApp
    await metrics.logEvent("ai_report_generated", {
      petId,
      tutorId,
      reportLength: report.length,
    });
    
    return { success: true, report };
  }
);

export const analyzeBehaviorFn = inngest.createFunction(
  {
    id: "analyze-behavior",
    name: "Analyze Behavior Patterns with AI",
    retries: 3,
  },
  { event: "ai/analyze.behavior" },
  async ({ event, step }) => {
    const { petId, daysToAnalyze } = event.data;
    
    const analysis = await step.run("analyze-patterns", async () => {
      return await analyzeBehaviorPatterns(petId, daysToAnalyze);
    });
    
    await metrics.logEvent("ai_behavior_analyzed", {
      petId,
      hasAlerts: analysis.alerts.length > 0,
    });
    
    return { success: true, analysis };
  }
);

export const optimizeRoomsFn = inngest.createFunction(
  {
    id: "optimize-rooms",
    name: "Optimize Room Assignments with AI",
    retries: 3,
  },
  { event: "ai/optimize.rooms" },
  async ({ event, step }) => {
    const { date } = event.data;
    
    const suggestions = await step.run("optimize-assignments", async () => {
      return await optimizeRoomAssignments(date);
    });
    
    await metrics.logEvent("ai_rooms_optimized", {
      date,
      suggestionsCount: suggestions.length,
    });
    
    return { success: true, suggestions };
  }
);

// Exportar todas as funções para o handler
export const functions = [
  sendWhatsAppMessageFn,
  notifyCheckinFn,
  notifyCheckoutFn,
  alertLowCreditsFn,
  alertVaccineDueFn,
  alertLowStockFn,
  generateWeeklyReportFn,
  analyzeBehaviorFn,
  optimizeRoomsFn,
];
