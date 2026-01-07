import * as db from "./db";
import { notifyOwner } from "./_core/notification";

/**
 * Replace template variables with actual values
 */
function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

/**
 * Get template and render with variables, or fallback to default message
 */
async function getRenderedTemplate(
  type: string,
  variables: Record<string, string>,
  fallbackTitle: string,
  fallbackMessage: string
): Promise<{ title: string; message: string }> {
  try {
    const template = await db.getNotificationTemplateByType(type);
    
    if (template && template.isActive) {
      return {
        title: renderTemplate(template.title, variables),
        message: renderTemplate(template.message, variables),
      };
    }
  } catch (error) {
    console.error(`[Template] Error loading template ${type}:`, error);
  }
  
  // Fallback to default
  return { title: fallbackTitle, message: fallbackMessage };
}

/**
 * Notification Service
 * Handles real-time notifications for tutors about important events
 */

export type NotificationType =
  | "vaccine_reminder"
  | "medication_reminder"
  | "credit_low"
  | "daily_update"
  | "check_in"
  | "check_out"
  | "daily_report"
  | "calendar_event"
  | "system"
  | "change_alert";

export type ResourceType = "medication" | "vaccine" | "preventive" | "pet_data" | "calendar";

interface NotificationData {
  userId: number;
  petId?: number;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: ResourceType;
  resourceId?: number;
}

/**
 * Create and send a notification to a tutor
 * Checks tutor preferences before sending
 */
export async function createNotification(data: NotificationData) {
  try {
    // Map notification types to preference types
    const typeMapping: Record<string, string> = {
      "check_in": "checkin_notification",
      "check_out": "checkout_notification",
      "daily_report": "daily_report",
      "medication_reminder": "medication_reminder",
      "credit_low": "credits_low",
      "calendar_event": "event_reminder",
    };
    
    const preferenceType = typeMapping[data.type];
    
    // Check if tutor wants to receive this type of notification
    if (preferenceType) {
      const shouldSend = await db.shouldSendNotification(data.userId, preferenceType);
      if (!shouldSend) {
        console.log(`[Notification] Skipped for user ${data.userId} (preference disabled): ${data.title}`);
        return { success: true, skipped: true };
      }
    }
    
    // Create notification in database
    await db.createNotification({
      user_id: data.userId,
      pet_id: data.petId,
      type: data.type,
      title: data.title,
      message: data.message,
      resource_type: data.resourceType,
      resource_id: data.resourceId,
      is_read: false,
      is_sent: true,
      sent_at: new Date(),
    });

    // Also notify via email (using existing notifyOwner for now)
    // In production, this would send email to the tutor
    console.log(`[Notification] Sent to user ${data.userId}: ${data.title}`);

    return { success: true };
  } catch (error) {
    console.error("[Notification Service] Error:", error);
    return { success: false, error };
  }
}

/**
 * Notify tutor when their pet checks in
 */
export async function notifyCheckIn(petId: number) {
  try {
    const pet = await db.getPetById(petId);
    if (!pet) return;

    // Get all tutors for this pet
    const tutors = await db.getPetTutors(petId);
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    for (const tutor of tutors) {
      const { title, message } = await getRenderedTemplate(
        "checkin_notification",
        {
          petName: pet.name,
          time,
          tutorName: tutor.tutor.name || "Tutor",
        },
        `${pet.name} chegou na creche! 🐾`,
        `${pet.name} fez check-in às ${time}. Tenha um ótimo dia!`
      );
      
      await createNotification({
        userId: tutor.tutor.id,
        petId,
        type: "check_in",
        title,
        message,
      });
    }
  } catch (error) {
    console.error("[Notification Service] Check-in error:", error);
  }
}

/**
 * Notify tutor when their pet checks out
 */
export async function notifyCheckOut(petId: number) {
  try {
    const pet = await db.getPetById(petId);
    if (!pet) return;

    const tutors = await db.getPetTutors(petId);
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    for (const tutor of tutors) {
      const { title, message } = await getRenderedTemplate(
        "checkout_notification",
        {
          petName: pet.name,
          time,
          tutorName: tutor.tutor.name || "Tutor",
        },
        `${pet.name} saiu da creche! 🏠`,
        `${pet.name} fez check-out às ${time}. Esperamos que tenha se divertido muito!`
      );
      
      await createNotification({
        userId: tutor.tutor.id,
        petId,
        type: "check_out",
        title,
        message,
      });
    }
  } catch (error) {
    console.error("[Notification Service] Check-out error:", error);
  }
}

/**
 * Notify tutor when a daily report is published
 */
export async function notifyDailyReport(petId: number, reportSummary: string) {
  try {
    const pet = await db.getPetById(petId);
    if (!pet) return;

    const tutors = await db.getPetTutors(petId);
    const date = new Date().toLocaleDateString("pt-BR");

    for (const tutor of tutors) {
      const { title, message } = await getRenderedTemplate(
        "daily_report",
        {
          petName: pet.name,
          date,
          mood: reportSummary,
          activities: reportSummary,
          tutorName: tutor.tutor.name || "Tutor",
        },
        `Relatório diário de ${pet.name} disponível! 📋`,
        `Um novo relatório sobre o dia de ${pet.name} na creche foi publicado. ${reportSummary}`
      );
      
      await createNotification({
        userId: tutor.tutor.id,
        petId,
        type: "daily_report",
        title,
        message,
      });
    }
  } catch (error) {
    console.error("[Notification Service] Daily report error:", error);
  }
}

/**
 * Notify tutor about upcoming calendar event
 */
export async function notifyCalendarEvent(petId: number, eventTitle: string, eventDate: Date) {
  try {
    const pet = await db.getPetById(petId);
    if (!pet) return;

    const tutors = await db.getPetTutors(petId);
    const dateStr = eventDate.toLocaleDateString("pt-BR");

    for (const tutor of tutors) {
      const { title, message } = await getRenderedTemplate(
        "event_reminder",
        {
          petName: pet.name,
          eventTitle,
          eventDate: dateStr,
          tutorName: tutor.tutor.name || "Tutor",
        },
        `Lembrete: ${eventTitle} 📅`,
        `${pet.name} tem "${eventTitle}" agendado para ${dateStr}. Não esqueça!`
      );
      
      await createNotification({
        userId: tutor.tutor.id,
        petId,
        type: "calendar_event",
        title,
        message,
      });
    }
  } catch (error) {
    console.error("[Notification Service] Calendar event error:", error);
  }
}

/**
 * Notify tutor about medication reminder
 */
export async function notifyMedicationReminder(petId: number, medicationName: string, dosage?: string, time?: string) {
  try {
    const pet = await db.getPetById(petId);
    if (!pet) return;

    const tutors = await db.getPetTutors(petId);

    for (const tutor of tutors) {
      const { title, message } = await getRenderedTemplate(
        "medication_reminder",
        {
          petName: pet.name,
          medicationName,
          dosage: dosage || "conforme prescrito",
          time: time || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          tutorName: tutor.tutor.name || "Tutor",
        },
        `Hora do medicamento de ${pet.name}! 💊`,
        `Não esqueça de administrar ${medicationName} para ${pet.name}.`
      );
      
      await createNotification({
        userId: tutor.tutor.id,
        petId,
        type: "medication_reminder",
        title,
        message,
      });
    }
  } catch (error) {
    console.error("[Notification Service] Medication reminder error:", error);
  }
}

/**
 * Notify tutor about low credits
 */
export async function notifyLowCredits(petId: number, remainingCredits: number) {
  try {
    const pet = await db.getPetById(petId);
    if (!pet) return;

    const tutors = await db.getPetTutors(petId);

    for (const tutor of tutors) {
      const { title, message } = await getRenderedTemplate(
        "credits_low",
        {
          petName: pet.name,
          remainingCredits: remainingCredits.toString(),
          tutorName: tutor.tutor.name || "Tutor",
        },
        `Créditos baixos para ${pet.name}! ⚠️`,
        `${pet.name} tem apenas ${remainingCredits} crédito(s) restante(s). Recarregue para continuar usando a creche.`
      );
      
      await createNotification({
        userId: tutor.tutor.id,
        petId,
        type: "credit_low",
        title,
        message,
      });
    }
  } catch (error) {
    console.error("[Notification Service] Low credits error:", error);
  }
}

/**
 * Send change alert notification
 * Notifies user when someone else modifies their pet's data
 */
export async function sendChangeAlertNotification(options: {
  userId: number;
  petName: string;
  resourceType: ResourceType;
  resourceName: string;
  changedBy: string;
  changedByRole: "admin" | "tutor";
  resourceId: number;
  petId: number;
}): Promise<void> {
  const resourceTypeMap: Record<ResourceType, string> = {
    medication: "medicamento",
    vaccine: "vacina",
    preventive: "preventivo",
    pet_data: "dados",
    calendar: "evento do calendário",
  };
  
  const roleMap = {
    admin: "administrador",
    tutor: "tutor",
  };
  
  const resourceLabel = resourceTypeMap[options.resourceType] || options.resourceType;
  const roleLabel = roleMap[options.changedByRole];
  
  await createNotification({
    userId: options.userId,
    type: "change_alert",
    title: `${resourceLabel.charAt(0).toUpperCase() + resourceLabel.slice(1)} de ${options.petName} atualizado`,
    message: `O ${roleLabel} ${options.changedBy} fez alterações em ${options.resourceName} de ${options.petName}.`,
    petId: options.petId,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
  });
}
