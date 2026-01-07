import * as db from "./db";
import { sendTextMessage } from "./whatsappService";

interface TutorInfo {
  phone: string;
  name: string;
}

/**
 * Get primary tutor info for a pet
 */
async function getPrimaryTutorForPet(petId: number): Promise<TutorInfo | null> {
  const database = await db.getDb();
  if (!database) return null;

  const { petTutors, users } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  // Get primary tutor relationship
  const tutorRelations = await database
    .select({
      tutorId: petTutors.tutor_id,
      isPrimary: petTutors.is_primary,
    })
    .from(petTutors)
    .where(eq(petTutors.pet_id, petId));

  if (tutorRelations.length === 0) return null;

  // Find primary tutor or use first one
  const primaryRelation = tutorRelations.find(r => r.isPrimary) || tutorRelations[0];

  // Get tutor details
  const tutors = await database
    .select({
      name: users.name,
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.id, primaryRelation.tutorId));

  if (tutors.length === 0 || !tutors[0].phone) return null;

  return {
    phone: tutors[0].phone,
    name: tutors[0].name || "Tutor",
  };
}

/**
 * Send health reminder to a pet owner via WhatsApp
 */
export async function sendHealthReminderToOwner(
  ownerPhone: string,
  ownerName: string,
  petName: string,
  reminderType: "vaccine" | "medication" | "flea" | "deworming",
  itemName: string,
  dueDate: Date,
  daysUntilDue: number
): Promise<{ success: boolean; error?: string }> {
  const templates = {
    vaccine: `Olá ${ownerName}! 🐾

Lembrete importante: A vacina *${itemName}* do seu pet *${petName}* vence em ${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'} (${dueDate.toLocaleDateString('pt-BR')}).

Por favor, agende a aplicação para manter a saúde do seu pet em dia! 💉

_TeteCare - Cuidando com amor_ ❤️`,

    medication: `Olá ${ownerName}! 🐾

Lembrete: O medicamento *${itemName}* do seu pet *${petName}* termina em ${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'} (${dueDate.toLocaleDateString('pt-BR')}).

Não esqueça de renovar a medicação se necessário! 💊

_TeteCare - Cuidando com amor_ ❤️`,

    flea: `Olá ${ownerName}! 🐾

Lembrete: O antipulgas *${itemName}* do seu pet *${petName}* vence em ${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'} (${dueDate.toLocaleDateString('pt-BR')}).

Agende a próxima aplicação para manter seu pet protegido! 🛡️

_TeteCare - Cuidando com amor_ ❤️`,

    deworming: `Olá ${ownerName}! 🐾

Lembrete: O vermífugo *${itemName}* do seu pet *${petName}* vence em ${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'} (${dueDate.toLocaleDateString('pt-BR')}).

Agende a próxima dose para manter seu pet saudável! 🐛

_TeteCare - Cuidando com amor_ ❤️`,
  };

  const message = templates[reminderType];
  
  return await sendTextMessage(ownerPhone, message, ownerName);
}

/**
 * Send all pending health reminders to pet owners
 */
export async function sendAllHealthReminders(
  daysAhead: number = 7
): Promise<{
  totalSent: number;
  totalFailed: number;
  byType: {
    vaccines: number;
    medications: number;
    flea: number;
    deworming: number;
  };
  errors: string[];
}> {
  const results = {
    totalSent: 0,
    totalFailed: 0,
    byType: {
      vaccines: 0,
      medications: 0,
      flea: 0,
      deworming: 0,
    },
    errors: [] as string[],
  };

  try {
    // Get all upcoming reminders
    const vaccines = await db.getUpcomingVaccinationReminders(daysAhead);
    const medications = await db.getEndingMedicationReminders(daysAhead);
    const flea = await db.getUpcomingFleaTreatmentReminders(daysAhead);
    const deworming = await db.getUpcomingDewormingReminders(daysAhead);

    // Group reminders by owner phone
    const remindersByOwner = new Map<string, {
      name: string;
      reminders: Array<{
        type: "vaccine" | "medication" | "flea" | "deworming";
        petName: string;
        itemName: string;
        dueDate: Date;
        daysUntilDue: number;
      }>;
    }>();

    // Process vaccines
    for (const vaccine of vaccines) {
      const pet = await db.getPetById(vaccine.pet_id);
      if (!pet) continue;

      const tutor = await getPrimaryTutorForPet(vaccine.pet_id);
      if (!tutor) continue;

      if (!vaccine.next_due_date) continue;

      if (!remindersByOwner.has(tutor.phone)) {
        remindersByOwner.set(tutor.phone, {
          name: tutor.name,
          reminders: [],
        });
      }

      const daysUntilDue = Math.ceil((vaccine.next_due_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      remindersByOwner.get(tutor.phone)!.reminders.push({
        type: "vaccine",
        petName: pet.name,
        itemName: vaccine.vaccineName,
        dueDate: vaccine.next_due_date,
        daysUntilDue,
      });
    }

    // Process medications
    for (const medication of medications) {
      const pet = await db.getPetById(medication.pet_id);
      if (!pet) continue;

      const tutor = await getPrimaryTutorForPet(medication.pet_id);
      if (!tutor) continue;

      if (!medication.endDate) continue;

      if (!remindersByOwner.has(tutor.phone)) {
        remindersByOwner.set(tutor.phone, {
          name: tutor.name,
          reminders: [],
        });
      }

      const daysUntilDue = Math.ceil((medication.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      remindersByOwner.get(tutor.phone)!.reminders.push({
        type: "medication",
        petName: pet.name,
        itemName: medication.medicationName,
        dueDate: medication.endDate,
        daysUntilDue,
      });
    }

    // Process flea treatments
    for (const treatment of flea) {
      const pet = await db.getPetById(treatment.pet_id);
      if (!pet) continue;

      const tutor = await getPrimaryTutorForPet(treatment.pet_id);
      if (!tutor) continue;

      if (!remindersByOwner.has(tutor.phone)) {
        remindersByOwner.set(tutor.phone, {
          name: tutor.name,
          reminders: [],
        });
      }

      const daysUntilDue = Math.ceil((treatment.next_due_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      remindersByOwner.get(tutor.phone)!.reminders.push({
        type: "flea",
        petName: pet.name,
        itemName: treatment.productName,
        dueDate: treatment.next_due_date,
        daysUntilDue,
      });
    }

    // Process deworming
    for (const treatment of deworming) {
      const pet = await db.getPetById(treatment.pet_id);
      if (!pet) continue;

      const tutor = await getPrimaryTutorForPet(treatment.pet_id);
      if (!tutor) continue;

      if (!remindersByOwner.has(tutor.phone)) {
        remindersByOwner.set(tutor.phone, {
          name: tutor.name,
          reminders: [],
        });
      }

      const daysUntilDue = Math.ceil((treatment.next_due_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      remindersByOwner.get(tutor.phone)!.reminders.push({
        type: "deworming",
        petName: pet.name,
        itemName: treatment.productName,
        dueDate: treatment.next_due_date,
        daysUntilDue,
      });
    }

    // Send reminders to each owner
    for (const [phone, ownerData] of Array.from(remindersByOwner.entries())) {
      for (const reminder of ownerData.reminders) {
        const result = await sendHealthReminderToOwner(
          phone,
          ownerData.name,
          reminder.petName,
          reminder.type,
          reminder.itemName,
          reminder.dueDate,
          reminder.daysUntilDue
        );

        if (result.success) {
          results.totalSent++;
          if (reminder.type === "vaccine") results.byType.vaccines++;
          else if (reminder.type === "medication") results.byType.medications++;
          else if (reminder.type === "flea") results.byType.flea++;
          else if (reminder.type === "deworming") results.byType.deworming++;
        } else {
          results.totalFailed++;
          results.errors.push(`${phone} (${reminder.petName} - ${reminder.itemName}): ${result.error}`);
        }

        // Rate limiting: wait 1 second between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  } catch (error: any) {
    console.error("Error sending health reminders:", error);
    results.errors.push(`Erro geral: ${error.message}`);
    return results;
  }
}

/**
 * Send summary reminder to owner with all pending items
 */
export async function sendSummaryReminderToOwner(
  ownerPhone: string,
  ownerName: string,
  reminders: Array<{
    petName: string;
    type: string;
    itemName: string;
    dueDate: Date;
    daysUntilDue: number;
  }>
): Promise<{ success: boolean; error?: string }> {
  if (reminders.length === 0) {
    return { success: true };
  }

  const typeEmojis: Record<string, string> = {
    vaccine: "💉",
    medication: "💊",
    flea: "🛡️",
    deworming: "🐛",
  };

  let message = `Olá ${ownerName}! 🐾\n\n`;
  message += `Você tem *${reminders.length}* ${reminders.length === 1 ? 'lembrete' : 'lembretes'} de saúde:\n\n`;

  for (const reminder of reminders) {
    const emoji = typeEmojis[reminder.type] || "📋";
    message += `${emoji} *${reminder.petName}* - ${reminder.itemName}\n`;
    message += `   Vence em ${reminder.daysUntilDue} ${reminder.daysUntilDue === 1 ? 'dia' : 'dias'} (${reminder.dueDate.toLocaleDateString('pt-BR')})\n\n`;
  }

  message += `_TeteCare - Cuidando com amor_ ❤️`;

  return await sendTextMessage(ownerPhone, message, ownerName);
}
