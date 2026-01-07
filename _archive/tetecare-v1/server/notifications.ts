import { notifyOwner } from "./_core/notification";
import * as db from "./db";

/**
 * Send notification about upcoming vaccinations
 */
export async function notifyUpcomingVaccinations() {
  const pets = await db.getAllPets();
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const pet of pets) {
    const vaccinations = await db.getPetVaccinations(pet.id);
    const upcomingVaccines = vaccinations.filter((v: any) => {
      if (!v.vaccination.nextDueDate) return false;
      const dueDate = new Date(v.vaccination.nextDueDate);
      return dueDate >= now && dueDate <= thirtyDaysFromNow;
    });

    if (upcomingVaccines.length > 0) {
      const vaccineList = upcomingVaccines
        .map((v: any) => `- ${v.vaccine.name}: ${new Date(v.vaccination.nextDueDate).toLocaleDateString("pt-BR")}`)
        .join("\n");

      await notifyOwner({
        title: `Vacinas próximas - ${pet.name}`,
        content: `O pet ${pet.name} possui ${upcomingVaccines.length} vacina(s) agendada(s) para os próximos 30 dias:\n\n${vaccineList}\n\nLembre-se de agendar com o veterinário!`,
      });
    }
  }
}

/**
 * Send notification about medication reminders
 */
export async function notifyMedicationReminders() {
  const pets = await db.getAllPets();

  for (const pet of pets) {
    const medications = await db.getPetMedications(pet.id);
    const activeMedications = medications.filter((m: any) => m.medication.isActive);

    if (activeMedications.length > 0) {
      const medList = activeMedications
        .map((m: any) => `- ${m.medicationInfo.name}: ${m.medication.dosage} (${m.medication.frequency || "conforme prescrição"})`)
        .join("\n");

      await notifyOwner({
        title: `Lembretes de medicação - ${pet.name}`,
        content: `O pet ${pet.name} possui ${activeMedications.length} medicamento(s) ativo(s):\n\n${medList}\n\nNão esqueça de administrar conforme prescrito!`,
      });
    }
  }
}

/**
 * Send daily summary notification
 */
export async function notifyDailySummary() {
  const pets = await db.getAllPets();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkedInPets = pets.filter((p: any) => p.status === "checked-in");
  
  if (checkedInPets.length === 0) {
    return; // No pets checked in today
  }

  let summary = `Resumo do dia na creche:\n\n`;
  summary += `🐾 Pets presentes: ${checkedInPets.length}\n\n`;

  for (const pet of checkedInPets) {
    const logs = await db.getPetLogs(pet.id);
    const todayLogs = logs.filter((log: any) => {
      const logDate = new Date(log.logDate);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime() && log.source === "daycare";
    });

    if (todayLogs.length > 0) {
      const latestLog = todayLogs[0];
      summary += `**${pet.name}**:\n`;
      if (latestLog.mood) summary += `- Humor: ${latestLog.mood}\n`;
      if (latestLog.appetite) summary += `- Apetite: ${latestLog.appetite}\n`;
      if (latestLog.behavior) summary += `- Comportamento: ${latestLog.behavior}\n`;
      if (latestLog.activities) summary += `- Atividades: ${latestLog.activities}\n`;
      summary += `\n`;
    }
  }

  await notifyOwner({
    title: "Resumo Diário - TeteCare",
    content: summary,
  });
}

/**
 * Check and send all pending notifications
 */
export async function sendPendingNotifications() {
  try {
    await notifyUpcomingVaccinations();
    await notifyMedicationReminders();
    await notifyDailySummary();
    console.log("[Notifications] All pending notifications sent successfully");
  } catch (error) {
    console.error("[Notifications] Error sending notifications:", error);
  }
}
