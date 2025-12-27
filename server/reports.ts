import * as db from "./db";

interface PetReport {
  petInfo: any;
  period: { start: Date; end: Date };
  logs: any[];
  vaccinations: any[];
  medications: any[];
  statistics: {
    totalDays: number;
    daycareVisits: number;
    averageMood: string;
    weightChange: number | null;
  };
}

/**
 * Generate comprehensive pet behavior report
 */
export async function generateBehaviorReport(petId: number, startDate: Date, endDate: Date): Promise<PetReport> {
  const pet = await db.getPetById(petId);
  if (!pet) throw new Error("Pet not found");

  const allLogs = await db.getPetLogs(petId);
  const logs = allLogs.filter((log: any) => {
    const logDate = new Date(log.logDate);
    return logDate >= startDate && logDate <= endDate;
  });

  const daycareVisits = logs.filter((log: any) => log.source === "daycare").length;
  
  // Calculate average mood
  const moodCounts: Record<string, number> = {};
  logs.forEach((log: any) => {
    if (log.mood) {
      moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
    }
  });
  const mostCommonMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  // Calculate weight change
  const logsWithWeight = logs.filter((log: any) => log.weight).sort((a: any, b: any) => 
    new Date(a.logDate).getTime() - new Date(b.logDate).getTime()
  );
  const weightChange = logsWithWeight.length >= 2
    ? ((logsWithWeight[logsWithWeight.length - 1]?.weight || 0) - (logsWithWeight[0]?.weight || 0)) / 1000 // Convert to kg
    : null;

  const vaccinations = await db.getPetVaccinations(petId);
  const medications = await db.getPetMedications(petId);

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    petInfo: pet,
    period: { start: startDate, end: endDate },
    logs,
    vaccinations,
    medications,
    statistics: {
      totalDays,
      daycareVisits,
      averageMood: mostCommonMood,
      weightChange,
    },
  };
}

/**
 * Generate health report
 */
export async function generateHealthReport(petId: number): Promise<any> {
  const pet = await db.getPetById(petId);
  if (!pet) throw new Error("Pet not found");

  const vaccinations = await db.getPetVaccinations(petId);
  const medications = await db.getPetMedications(petId);
  const logs = await db.getPetLogs(petId);

  // Get weight history
  const weightHistory = logs
    .filter((log: any) => log.weight)
    .map((log: any) => ({
      date: log.logDate,
      weight: log.weight / 1000, // Convert to kg
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Upcoming vaccinations
  const now = new Date();
  const upcomingVaccinations = vaccinations.filter((v: any) => {
    if (!v.vaccination.nextDueDate) return false;
    return new Date(v.vaccination.nextDueDate) > now;
  });

  // Active medications
  const activeMedications = medications.filter((m: any) => m.medication.isActive);

  return {
    petInfo: pet,
    vaccinations: {
      total: vaccinations.length,
      upcoming: upcomingVaccinations,
      completed: vaccinations.filter((v: any) => v.vaccination.applicationDate),
    },
    medications: {
      total: medications.length,
      active: activeMedications,
    },
    weightHistory,
    lastCheckup: logs.length > 0 ? logs[0].log_date : null,
  };
}

/**
 * Generate financial report for tutor
 */
export async function generateFinancialReport(tutorId: number, startDate: Date, endDate: Date): Promise<any> {
  const tutorPets = await db.getPetsByTutorId(tutorId);
  const pets = tutorPets.map((tp: any) => tp.pet);

  const report: any = {
    period: { start: startDate, end: endDate },
    pets: [],
    totals: {
      creditsUsed: 0,
      creditsPurchased: 0,
      totalSpent: 0,
    },
  };

  for (const pet of pets) {
    const credits = await db.getPetCredits(pet.id);
    const creditsInPeriod = credits.filter((c: any) => {
      const date = new Date(c.createdAt);
      return date >= startDate && date <= endDate;
    });

    const purchased = creditsInPeriod.filter((c: any) => c.packageDays > 0);
    const used = creditsInPeriod.filter((c: any) => c.remainingDays < c.packageDays);

    const totalPurchased = purchased.reduce((sum: number, c: any) => sum + c.packageDays, 0);
    const totalUsed = purchased.reduce((sum: number, c: any) => sum + (c.packageDays - c.remainingDays), 0);
    const totalSpent = purchased.reduce((sum: number, c: any) => sum + c.packagePrice, 0);

    report.pets.push({
      name: pet.name,
      creditsPurchased: totalPurchased,
      creditsUsed: totalUsed,
      creditsRemaining: pet.credits || 0,
      totalSpent,
    });

    report.totals.creditsPurchased += totalPurchased;
    report.totals.creditsUsed += totalUsed;
    report.totals.totalSpent += totalSpent;
  }

  return report;
}

/**
 * Format report data as text (for now, can be extended to PDF)
 */
export function formatReportAsText(report: PetReport): string {
  let text = `RELATÓRIO DE COMPORTAMENTO - ${report.petInfo.name}\n`;
  text += `=`.repeat(50) + `\n\n`;
  text += `Período: ${report.period.start.toLocaleDateString("pt-BR")} a ${report.period.end.toLocaleDateString("pt-BR")}\n\n`;
  
  text += `ESTATÍSTICAS:\n`;
  text += `- Total de dias no período: ${report.statistics.totalDays}\n`;
  text += `- Visitas à creche: ${report.statistics.daycareVisits}\n`;
  text += `- Humor predominante: ${report.statistics.averageMood}\n`;
  if (report.statistics.weightChange !== null) {
    text += `- Variação de peso: ${report.statistics.weightChange > 0 ? "+" : ""}${report.statistics.weightChange.toFixed(2)}kg\n`;
  }
  text += `\n`;

  text += `RESUMO DE ATIVIDADES:\n`;
  report.logs.slice(0, 10).forEach((log: any) => {
    text += `\n${new Date(log.logDate).toLocaleDateString("pt-BR")} (${log.source === "daycare" ? "Creche" : "Casa"}):\n`;
    if (log.mood) text += `  - Humor: ${log.mood}\n`;
    if (log.behavior) text += `  - Comportamento: ${log.behavior}\n`;
    if (log.activities) text += `  - Atividades: ${log.activities}\n`;
  });

  return text;
}
