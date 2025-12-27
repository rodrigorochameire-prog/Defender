import { getDb } from "../db";
import { petVaccinations, pets, petTutors, users, vaccineLibrary } from "../../drizzle/schema";
import { and, eq, gte, lte, isNotNull } from "drizzle-orm";
import { sendTextMessage } from "../whatsappService";

/**
 * Check for vaccines due in the next 7 days and send notifications
 * This should be run daily via cron job
 */
export async function checkUpcomingVaccines() {
  const db = await getDb();
  if (!db) {
    console.error("[VaccineNotifications] Database not available");
    return { success: false, error: "Database not available" };
  }

  try {
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    // Find vaccines due in the next 7 days
    const upcomingVaccines = await db
      .select({
        vaccination: petVaccinations,
        pet: pets,
        vaccine: vaccineLibrary,
      })
      .from(petVaccinations)
      .innerJoin(pets, eq(petVaccinations.pet_id, pets.id))
      .innerJoin(vaccineLibrary, eq(petVaccinations.vaccine_id, vaccineLibrary.id))
      .where(
        and(
          isNotNull(petVaccinations.next_due_date),
          gte(petVaccinations.next_due_date, today),
          lte(petVaccinations.next_due_date, sevenDaysFromNow)
        )
      );

    console.log(`[VaccineNotifications] Found ${upcomingVaccines.length} upcoming vaccines`);

    const notifications: Array<{ success: boolean; petName: string; vaccineName: string }> = [];

    // Send notification for each vaccine
    for (const { vaccination, pet, vaccine } of upcomingVaccines) {
      try {
        // Get primary tutor
        const tutorRelations = await db
          .select({
            tutor: users,
            isPrimary: petTutors.is_primary,
          })
          .from(petTutors)
          .innerJoin(users, eq(petTutors.tutor_id, users.id))
          .where(eq(petTutors.pet_id, pet.id))
          .orderBy(petTutors.is_primary); // Primary tutors first

        if (tutorRelations.length === 0) {
          console.warn(`[VaccineNotifications] No tutors found for pet ${pet.name}`);
          continue;
        }

        const primaryTutor = tutorRelations.find(t => t.isPrimary)?.tutor || tutorRelations[0].tutor;

        if (!primaryTutor.email) {
          console.warn(`[VaccineNotifications] No email for tutor of pet ${pet.name}`);
          continue;
        }

        // Format date
        const dueDate = new Date(vaccination.next_due_date!);
        const formattedDate = dueDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        // Calculate days until due
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Prepare message
        const message = `🔔 *Lembrete de Vacina*\n\n` +
          `Olá ${primaryTutor.name || "Tutor"}!\n\n` +
          `A vacina *${vaccine.name}* do seu pet *${pet.name}* está próxima do vencimento.\n\n` +
          `📅 Data prevista: ${formattedDate}\n` +
          `⏰ Faltam ${daysUntil} ${daysUntil === 1 ? "dia" : "dias"}\n\n` +
          `Por favor, agende a aplicação com antecedência para manter a saúde do seu pet em dia! 🐾`;

        // Try to send via WhatsApp
        let whatsappSent = false;
        try {
          const result = await sendTextMessage(
            primaryTutor.email, // Assuming email is used as phone identifier
            message,
            primaryTutor.name || undefined
          );
          whatsappSent = result.success;
        } catch (error) {
          console.error(`[VaccineNotifications] WhatsApp error for ${pet.name}:`, error);
        }

        // TODO: Add email fallback if WhatsApp fails
        // if (!whatsappSent) {
        //   await sendEmail({
        //     to: primaryTutor.email,
        //     subject: `Lembrete de Vacina - ${pet.name}`,
        //     body: message,
        //   });
        // }

        notifications.push({
          success: whatsappSent,
          petName: pet.name,
          vaccineName: vaccine.name,
        });

        console.log(
          `[VaccineNotifications] Notification ${whatsappSent ? "sent" : "failed"} for ${pet.name} - ${vaccine.name}`
        );
      } catch (error) {
        console.error(`[VaccineNotifications] Error processing vaccine for ${pet.name}:`, error);
        notifications.push({
          success: false,
          petName: pet.name,
          vaccineName: "Unknown",
        });
      }
    }

    return {
      success: true,
      totalVaccines: upcomingVaccines.length,
      notifications,
    };
  } catch (error) {
    console.error("[VaccineNotifications] Error checking vaccines:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Manual trigger for testing
 */
export async function triggerVaccineNotificationsManually() {
  console.log("[VaccineNotifications] Manual trigger started");
  const result = await checkUpcomingVaccines();
  console.log("[VaccineNotifications] Manual trigger completed:", result);
  return result;
}
