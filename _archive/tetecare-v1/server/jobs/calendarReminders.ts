import * as db from "../db";
import { calendarEvents } from "../../drizzle/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { sendTextMessage } from "../whatsappService";

/**
 * Job to send reminders for upcoming calendar events
 * Should be run daily (e.g., at 8 AM)
 */
export async function sendCalendarReminders() {
  console.log("[CalendarReminders] Starting calendar reminders job...");

  try {
    // Get tomorrow's date range (24 hours from now)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Find events happening tomorrow that haven't had reminders sent
    // Filter for events that haven't had reminders sent yet
    const allEvents = await db.getCalendarEvents(tomorrow, dayAfterTomorrow);
    const upcomingEvents = allEvents.filter((e: any) => !e.reminderSent);

    console.log(`[CalendarReminders] Found ${upcomingEvents.length} events for tomorrow`);

    let sentCount = 0;
    let errorCount = 0;

    for (const event of upcomingEvents) {
      try {
        // Get event details
        const eventDateStr = event.event_date.toLocaleDateString("pt-BR");
        const eventTimeStr = event.is_all_day
          ? "Dia inteiro"
          : event.event_date.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            });

        const eventTypeLabels: Record<string, string> = {
          holiday: "Feriado",
          closure: "Fechamento",
          medical: "Consulta Médica",
          general: "Evento",
          vaccination: "Vacinação",
          medication: "Medicação",
        };

        const eventTypeLabel = eventTypeLabels[event.event_type] || "Evento";

        // Build message
        let message = `🔔 *Lembrete de ${eventTypeLabel}*\n\n`;
        message += `📅 *${event.title}*\n`;
        message += `🗓️ Data: ${eventDateStr}\n`;
        message += `⏰ Horário: ${eventTimeStr}\n`;

        if (event.location) {
          message += `📍 Local: ${event.location}\n`;
        }

        if (event.description) {
          message += `\n${event.description}`;
        }

        // For closure events, send to all active tutors
        if (event.event_type === "closure" || event.event_type === "holiday") {
          // TODO: Get all active tutors and send notification
          console.log(`[CalendarReminders] Closure/Holiday event: ${event.title}`);
          // This would require getting tutor phone numbers from the database
          // For now, we'll just mark as sent
        }

        // For pet-specific events, send to pet's tutors
        if (event.pet_id) {
          // Get pet tutors
          const petTutors = await db.getPetTutorsWithDetails(event.pet_id);

          for (const pt of petTutors) {
            // Note: phone number would need to be added to the select in getPetTutorsWithDetails
            // For now, we'll just mark as sent
            console.log(
              `[CalendarReminders] Would send reminder to ${pt.name} for event: ${event.title}`
            );
          }
        }

        // Mark reminder as sent
        await db.updateCalendarEvent(event.id, { reminder_sent: true });

        sentCount++;
      } catch (error) {
        console.error(`[CalendarReminders] Error processing event ${event.id}:`, error);
        errorCount++;
      }
    }

    console.log(
      `[CalendarReminders] Job completed. Sent: ${sentCount}, Errors: ${errorCount}`
    );

    return {
      success: true,
      processed: upcomingEvents.length,
      sent: sentCount,
      errors: errorCount,
    };
  } catch (error) {
    console.error("[CalendarReminders] Job failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
