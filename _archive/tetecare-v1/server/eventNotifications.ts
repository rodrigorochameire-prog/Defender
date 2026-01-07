/**
 * Event Notifications Service
 * Sends automated WhatsApp reminders 24h before calendar events
 */

import { getDb } from "./db";

interface EventReminder {
  eventId: number;
  eventTitle: string;
  eventType: string;
  eventDate: Date;
  petId: number | null;
  petName: string | null;
  tutorId: number;
  tutorName: string;
  tutorPhone: string | null;
}

/**
 * Get events happening in the next 24-48 hours that need reminders
 */
export async function getUpcomingEventsForReminders(): Promise<EventReminder[]> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { calendarEvents, pets, users, petTutors } = await import("../drizzle/schema");
  const { eq, and, between } = await import("drizzle-orm");
  const dbInstance = await getDb();
  if (!dbInstance) return [];

  // Get events in the next 24-48h window that haven't sent reminders yet
  const events = await dbInstance
    .select({
      eventId: calendarEvents.id,
      eventTitle: calendarEvents.title,
      eventType: calendarEvents.event_type,
      eventDate: calendarEvents.event_date,
      petId: calendarEvents.pet_id,
      petName: pets.name,
      tutorId: users.id,
      tutorName: users.name,
      tutorPhone: users.phone,
      reminderSent: calendarEvents.reminder_sent,
    })
    .from(calendarEvents)
    .leftJoin(pets, eq(calendarEvents.pet_id, pets.id))
    .leftJoin(petTutors, eq(pets.id, petTutors.pet_id))
    .leftJoin(users, eq(petTutors.tutor_id, users.id))
    .where(
      and(
        between(calendarEvents.event_date, tomorrow, dayAfterTomorrow),
        eq(calendarEvents.reminder_sent, false)
      )
    );

  return events.filter((e) => e.tutorId !== null) as EventReminder[];
}

/**
 * Send WhatsApp reminder for a calendar event
 */
export async function sendEventReminder(reminder: EventReminder): Promise<boolean> {
  try {
    const { whatsappMessages } = await import("../drizzle/schema");
    const dbInstance = await getDb();
    if (!dbInstance) return false;

    // Format event date
    const eventDate = new Date(reminder.eventDate);
    const formattedDate = eventDate.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = eventDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Build message content
    const eventTypeLabels: Record<string, string> = {
      vaccination: "Vacinação",
      medication: "Medicamento",
      medical: "Consulta Médica",
      checkin: "Check-in",
      checkout: "Check-out",
      preventive: "Preventivo",
      general: "Evento",
      holiday: "Feriado",
      closure: "Fechamento",
    };

    const eventTypeLabel = eventTypeLabels[reminder.eventType] || reminder.eventType;
    const petInfo = reminder.petName ? ` para ${reminder.petName}` : "";

    const messageContent = `🔔 *Lembrete: ${eventTypeLabel}${petInfo}*

📅 *Data:* ${formattedDate}
🕐 *Horário:* ${formattedTime}
📝 *Evento:* ${reminder.eventTitle}

Não esqueça! Estamos aguardando você na Tetê Care.

_Esta é uma mensagem automática. Não é necessário responder._`;

    // Queue WhatsApp message
    await dbInstance.insert(whatsappMessages).values({
      recipientPhone: reminder.tutorPhone || "",
      recipientName: reminder.tutorName,
      messageContent,
      status: "queued",
    });

    // Mark reminder as sent
    const { calendarEvents } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    await dbInstance
      .update(calendarEvents)
      .set({ reminder_sent: true })
      .where(eq(calendarEvents.id, reminder.eventId));

    console.log(`✅ Reminder sent for event ${reminder.eventId} to ${reminder.tutorName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send reminder for event ${reminder.eventId}:`, error);
    return false;
  }
}

/**
 * Process all pending event reminders
 * Should be called daily by a cron job
 */
export async function processEventReminders(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  console.log("🔄 Processing event reminders...");

  const reminders = await getUpcomingEventsForReminders();
  console.log(`📋 Found ${reminders.length} events needing reminders`);

  let sent = 0;
  let failed = 0;

  for (const reminder of reminders) {
    const success = await sendEventReminder(reminder);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  console.log(`✅ Reminders processed: ${sent} sent, ${failed} failed`);

  return {
    processed: reminders.length,
    sent,
    failed,
  };
}
