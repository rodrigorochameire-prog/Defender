import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: string;
  petName?: string;
  notes?: string | null;
  status?: string;
  amount?: number;
  category?: string;
}

interface MonthlyStats {
  health: number;
  operational: number;
  financial: number;
  overdue: number;
  upcoming: number;
  total: number;
  checkins: number;
  checkouts: number;
  income: number;
  expense: number;
  balance: number;
  maxOccupancy: number;
  avgOccupancy: number;
  creditsUsed: number;
}

const TYPE_LABELS: Record<string, string> = {
  vaccine: "Vacina",
  medication: "Medicamento",
  flea: "Antipulgas",
  deworming: "Vermífugo",
  checkin: "Check-in",
  checkout: "Check-out",
  "payment-income": "Receita",
  "payment-expense": "Despesa",
};

export function generateMonthlyReport(
  events: CalendarEvent[],
  stats: MonthlyStats,
  monthDate: Date
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(239, 68, 68); // coral
  doc.text("TucoCare Pro", pageWidth / 2, yPosition, { align: "center" });
  
  yPosition += 10;
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("Relatório Mensal do Calendário", pageWidth / 2, yPosition, { align: "center" });
  
  yPosition += 8;
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  const monthName = format(monthDate, "MMMM 'de' yyyy", { locale: ptBR });
  doc.text(monthName.charAt(0).toUpperCase() + monthName.slice(1), pageWidth / 2, yPosition, { align: "center" });
  
  yPosition += 15;

  // Estatísticas Gerais
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("📊 Estatísticas Gerais", 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const generalStats = [
    `Total de Eventos: ${stats.total}`,
    `Eventos de Saúde: ${stats.health}`,
    `Eventos Operacionais: ${stats.operational}`,
    `Eventos Financeiros: ${stats.financial}`,
    `Eventos Atrasados: ${stats.overdue}`,
    `Eventos Próximos (7 dias): ${stats.upcoming}`,
  ];

  generalStats.forEach((stat) => {
    doc.text(stat, 25, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Estatísticas Operacionais
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("🐾 Operacional", 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const operationalStats = [
    `Check-ins: ${stats.checkins}`,
    `Check-outs: ${stats.checkouts}`,
    `Ocupação Máxima: ${stats.maxOccupancy} pets`,
    `Ocupação Média: ${stats.avgOccupancy} pets`,
    `Créditos Consumidos: ${stats.creditsUsed}`,
  ];

  operationalStats.forEach((stat) => {
    doc.text(stat, 25, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Estatísticas Financeiras
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("💰 Financeiro", 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const financialStats = [
    `Receitas: R$ ${stats.income.toFixed(2)}`,
    `Despesas: R$ ${stats.expense.toFixed(2)}`,
    `Saldo: R$ ${stats.balance.toFixed(2)}`,
  ];

  financialStats.forEach((stat) => {
    doc.text(stat, 25, yPosition);
    yPosition += 6;
  });

  yPosition += 10;

  // Lista de Eventos
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("📅 Eventos do Mês", 20, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  
  // Group events by type
  const eventsByType: Record<string, CalendarEvent[]> = {};
  events.forEach((event) => {
    if (!eventsByType[event.type]) {
      eventsByType[event.type] = [];
    }
    eventsByType[event.type].push(event);
  });

  Object.entries(eventsByType).forEach(([type, typeEvents]) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`${TYPE_LABELS[type] || type} (${typeEvents.length})`, 20, yPosition);
    yPosition += 6;

    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);

    typeEvents.slice(0, 10).forEach((event) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }

      const dateStr = format(new Date(event.start), "dd/MM/yyyy", { locale: ptBR });
      const petInfo = event.petName ? ` - ${event.petName}` : "";
      const amountInfo = event.amount ? ` - R$ ${event.amount.toFixed(2)}` : "";
      
      doc.text(`  • ${dateStr}: ${event.title}${petInfo}${amountInfo}`, 25, yPosition);
      yPosition += 5;
    });

    if (typeEvents.length > 10) {
      doc.setTextColor(100, 100, 100);
      doc.text(`  ... e mais ${typeEvents.length - 10} eventos`, 25, yPosition);
      yPosition += 5;
    }

    yPosition += 3;
  });

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  // Save
  const fileName = `relatorio-calendario-${format(monthDate, "yyyy-MM", { locale: ptBR })}.pdf`;
  doc.save(fileName);
}
