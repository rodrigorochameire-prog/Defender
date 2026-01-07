import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * PDF Generator Service
 * Creates professional PDF reports for behavior, health, and financial data
 */

// Logo placeholder (base64 encoded small logo)
const LOGO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iI0ZGNjYwMCIvPjwvc3ZnPg==";

interface BehaviorData {
  petName: string;
  period: string;
  records: Array<{
    date: Date;
    location: string;
    behaviorType: string;
    description: string;
    severity?: string;
  }>;
}

interface HealthData {
  petName: string;
  breed?: string;
  age?: string;
  weight?: number;
  vaccinations: Array<{
    name: string;
    date: Date;
    nextDue?: Date;
  }>;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    startDate: Date;
  }>;
  recentLogs: Array<{
    date: Date;
    mood?: string;
    appetite?: string;
    notes?: string;
  }>;
}

interface FinancialData {
  tutorName: string;
  period: string;
  transactions: Array<{
    date: Date;
    description: string;
    amount: number;
    type: string;
  }>;
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
}

/**
 * Add header to PDF
 */
function addHeader(doc: jsPDF, title: string) {
  // Logo
  try {
    doc.addImage(LOGO_BASE64, "PNG", 15, 10, 15, 15);
  } catch (error) {
    console.warn("Could not add logo to PDF");
  }

  // Title
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text("TeteCare", 35, 20);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(title, 35, 26);

  // Date
  doc.setFontSize(10);
  doc.text(
    `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    15,
    35
  );

  // Line
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 40, 195, 40);

  return 45; // Return Y position after header
}

/**
 * Add footer to PDF
 */
function addFooter(doc: jsPDF, pageNumber: number) {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `TeteCare - Gestão de Creche de Pets | Página ${pageNumber}`,
    105,
    pageHeight - 10,
    { align: "center" }
  );
}

/**
 * Generate Behavior Report PDF
 */
export function generateBehaviorReport(data: BehaviorData): void {
  const doc = new jsPDF();
  let yPos = addHeader(doc, "Relatório de Comportamento");

  // Pet Info
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(`Pet: ${data.petName}`, 15, yPos + 5);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Período: ${data.period}`, 15, yPos + 12);

  yPos += 20;

  // Summary
  const positiveCount = data.records.filter((r) => r.behaviorType === "positive").length;
  const negativeCount = data.records.filter((r) => r.behaviorType === "negative").length;
  const neutralCount = data.records.filter((r) => r.behaviorType === "neutral").length;

  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("Resumo:", 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.text(`• Comportamentos positivos: ${positiveCount}`, 20, yPos);
  yPos += 6;
  doc.text(`• Comportamentos negativos: ${negativeCount}`, 20, yPos);
  yPos += 6;
  doc.text(`• Comportamentos neutros: ${neutralCount}`, 20, yPos);
  yPos += 10;

  // Records Table
  const tableData = data.records.map((record) => [
    format(new Date(record.date), "dd/MM/yyyy"),
    record.location,
    record.behaviorType,
    record.severity || "-",
    record.description,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Data", "Local", "Tipo", "Severidade", "Descrição"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [255, 102, 0] },
    styles: { fontSize: 9 },
    columnStyles: {
      4: { cellWidth: 60 },
    },
  });

  addFooter(doc, 1);

  // Save
  doc.save(`comportamento_${data.petName}_${Date.now()}.pdf`);
}

/**
 * Generate Health Report PDF
 */
export function generateHealthReport(data: HealthData): void {
  const doc = new jsPDF();
  let yPos = addHeader(doc, "Relatório de Saúde");

  // Pet Info
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(`Pet: ${data.petName}`, 15, yPos + 5);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  if (data.breed) doc.text(`Raça: ${data.breed}`, 15, yPos + 12);
  if (data.age) doc.text(`Idade: ${data.age}`, 80, yPos + 12);
  if (data.weight) doc.text(`Peso: ${data.weight} kg`, 140, yPos + 12);

  yPos += 25;

  // Vaccinations
  if (data.vaccinations.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("Vacinações:", 15, yPos);
    yPos += 7;

    const vaccineData = data.vaccinations.map((vac) => [
      vac.name,
      format(new Date(vac.date), "dd/MM/yyyy"),
      vac.nextDue ? format(new Date(vac.nextDue), "dd/MM/yyyy") : "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Vacina", "Data Aplicação", "Próxima Dose"]],
      body: vaccineData,
      theme: "striped",
      headStyles: { fillColor: [255, 102, 0] },
      styles: { fontSize: 9 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Medications
  if (data.medications.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("Medicamentos:", 15, yPos);
    yPos += 7;

    const medData = data.medications.map((med) => [
      med.name,
      med.dosage,
      med.frequency,
      format(new Date(med.startDate), "dd/MM/yyyy"),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Medicamento", "Dosagem", "Frequência", "Início"]],
      body: medData,
      theme: "striped",
      headStyles: { fillColor: [255, 102, 0] },
      styles: { fontSize: 9 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Recent Logs
  if (data.recentLogs.length > 0 && yPos < 250) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("Logs Recentes:", 15, yPos);
    yPos += 7;

    const logData = data.recentLogs.slice(0, 5).map((log) => [
      format(new Date(log.date), "dd/MM/yyyy"),
      log.mood || "-",
      log.appetite || "-",
      log.notes || "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Data", "Humor", "Apetite", "Notas"]],
      body: logData,
      theme: "striped",
      headStyles: { fillColor: [255, 102, 0] },
      styles: { fontSize: 9 },
    });
  }

  addFooter(doc, 1);

  // Save
  doc.save(`saude_${data.petName}_${Date.now()}.pdf`);
}

/**
 * Generate Complete Pet Health Report PDF (for veterinary visits)
 */
export function generatePetHealthReport(
  pet: {
    name: string;
    breed?: string;
    birthDate?: Date;
    weight?: number;
    foodBrand?: string;
    foodAmount?: number;
    notes?: string;
  },
  vaccines: Array<{
    vaccineName: string;
    applicationDate: Date;
    nextDueDate?: Date;
    doseNumber?: number;
    veterinarian?: string;
    clinic?: string;
    notes?: string;
  }>,
  medications: Array<{
    medicationName: string;
    startDate: Date;
    endDate?: Date;
    dosage?: string;
    frequency?: string;
    notes?: string;
  }>,
  logs: Array<{
    logDate: Date;
    location: string;
    mood?: string;
    stool?: string;
    appetite?: string;
    notes?: string;
  }>
): void {
  const doc = new jsPDF();
  let yPos = addHeader(doc, "Relatório Completo de Saúde");

  // Pet Information
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(`Pet: ${pet.name}`, 15, yPos + 5);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  let infoY = yPos + 12;
  
  if (pet.breed) {
    doc.text(`Raça: ${pet.breed}`, 15, infoY);
    infoY += 6;
  }
  
  if (pet.birthDate) {
    const age = calculateAge(pet.birthDate);
    doc.text(`Idade: ${age} (Nascimento: ${format(new Date(pet.birthDate), "dd/MM/yyyy")})`, 15, infoY);
    infoY += 6;
  }
  
  if (pet.weight) {
    doc.text(`Peso: ${(pet.weight / 1000).toFixed(1)} kg`, 15, infoY);
    infoY += 6;
  }
  
  if (pet.foodBrand) {
    doc.text(`Alimentação: ${pet.foodBrand}${pet.foodAmount ? ` - ${pet.foodAmount}g/dia` : ""}`, 15, infoY);
    infoY += 6;
  }
  
  if (pet.notes) {
    doc.text("Observações:", 15, infoY);
    infoY += 6;
    const splitNotes = doc.splitTextToSize(pet.notes, 180);
    doc.text(splitNotes, 15, infoY);
    infoY += splitNotes.length * 5;
  }
  
  yPos = infoY + 10;

  // Vaccines Section
  if (vaccines.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("Histórico de Vacinas:", 15, yPos);
    yPos += 7;
    
    const vaccineData = vaccines.map(v => [
      v.vaccineName,
      format(new Date(v.applicationDate), "dd/MM/yyyy"),
      v.nextDueDate ? format(new Date(v.nextDueDate), "dd/MM/yyyy") : "N/A",
      v.doseNumber?.toString() || "1",
      v.veterinarian || "N/A",
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [["Vacina", "Data Aplicação", "Próxima Dose", "Dose", "Veterinário"]],
      body: vaccineData,
      theme: "striped",
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 9 },
      margin: { left: 15, right: 15 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Medications Section
  if (medications.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("Histórico de Medicamentos:", 15, yPos);
    yPos += 7;
    
    const medicationData = medications.map(m => [
      m.medicationName,
      format(new Date(m.startDate), "dd/MM/yyyy"),
      m.endDate ? format(new Date(m.endDate), "dd/MM/yyyy") : "Em andamento",
      m.dosage || "N/A",
      m.frequency || "N/A",
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [["Medicamento", "Início", "Fim", "Dosagem", "Frequência"]],
      body: medicationData,
      theme: "striped",
      headStyles: { fillColor: [92, 184, 92] },
      styles: { fontSize: 9 },
      margin: { left: 15, right: 15 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Recent Logs Section (last 10)
  if (logs.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("Logs Recentes (Últimos 10):", 15, yPos);
    yPos += 7;
    
    const recentLogs = logs.slice(0, 10);
    const logData = recentLogs.map(l => [
      format(new Date(l.logDate), "dd/MM/yyyy"),
      l.location === "daycare" ? "Creche" : "Casa",
      l.mood || "N/A",
      l.stool || "N/A",
      l.appetite || "N/A",
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [["Data", "Local", "Humor", "Fezes", "Apetite"]],
      body: logData,
      theme: "striped",
      headStyles: { fillColor: [153, 153, 153] },
      styles: { fontSize: 9 },
      margin: { left: 15, right: 15 },
    });
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addFooter(doc, i);
  }

  // Save PDF
  doc.save(`relatorio-saude-${pet.name.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

function calculateAge(birthDate: Date): string {
  const birth = new Date(birthDate);
  const today = new Date();
  const ageInMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  const years = Math.floor(ageInMonths / 12);
  const months = ageInMonths % 12;
  
  if (years === 0) return `${months} ${months === 1 ? "mês" : "meses"}`;
  if (months === 0) return `${years} ${years === 1 ? "ano" : "anos"}`;
  return `${years} ${years === 1 ? "ano" : "anos"} e ${months} ${months === 1 ? "mês" : "meses"}`;
}

/**
 * Generate Financial Report PDF
 */
export function generateFinancialReport(data: FinancialData): void {
  const doc = new jsPDF();
  let yPos = addHeader(doc, "Relatório Financeiro");

  // Tutor Info
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(`Tutor: ${data.tutorName}`, 15, yPos + 5);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Período: ${data.period}`, 15, yPos + 12);

  yPos += 25;

  // Summary Box
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPos, 180, 30, "F");

  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text("Resumo Financeiro:", 20, yPos + 8);

  doc.setFontSize(10);
  doc.text(`Receitas: R$ ${(data.summary.totalIncome / 100).toFixed(2)}`, 20, yPos + 15);
  doc.text(`Despesas: R$ ${(data.summary.totalExpense / 100).toFixed(2)}`, 80, yPos + 15);
  doc.text(`Saldo: R$ ${(data.summary.balance / 100).toFixed(2)}`, 140, yPos + 15);

  yPos += 40;

  // Transactions Table
  const transactionData = data.transactions.map((tx) => [
    format(new Date(tx.date), "dd/MM/yyyy"),
    tx.description,
    tx.type,
    `R$ ${(tx.amount / 100).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Data", "Descrição", "Tipo", "Valor"]],
    body: transactionData,
    theme: "striped",
    headStyles: { fillColor: [255, 102, 0] },
    styles: { fontSize: 9 },
    columnStyles: {
      3: { halign: "right" },
    },
  });

  addFooter(doc, 1);

  // Save
  doc.save(`financeiro_${data.tutorName}_${Date.now()}.pdf`);
}
