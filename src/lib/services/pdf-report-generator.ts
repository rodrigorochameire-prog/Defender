/**
 * PDF Report Generator
 *
 * Gera relatório resumido de todas as peças processuais encontradas em um PDF.
 * Usado pelo defensor para preparação de audiências.
 */

import { jsPDF } from "jspdf";
import "jspdf-autotable";

// Augment jsPDF for autoTable plugin
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

export interface ReportSection {
  tipo: string;
  titulo: string;
  paginaInicio: number;
  paginaFim: number;
  resumo?: string | null;
  confianca?: number;
  metadata?: {
    partesmencionadas?: string[];
    datasExtraidas?: string[];
    artigosLei?: string[];
    juiz?: string;
    promotor?: string;
  } | null;
}

export interface ReportData {
  fileName: string;
  totalPages: number;
  sections: ReportSection[];
  generatedAt?: Date;
}

const TIPO_LABELS: Record<string, string> = {
  denuncia: "Denúncia",
  sentenca: "Sentença",
  decisao: "Decisão",
  depoimento: "Depoimento",
  alegacoes: "Alegações Finais",
  certidao: "Certidão",
  laudo: "Laudo Pericial",
  inquerito: "Inquérito Policial",
  recurso: "Recurso",
  outros: "Outros",
};

const TIPO_COLORS: Record<string, [number, number, number]> = {
  denuncia: [220, 38, 38],
  sentenca: [147, 51, 234],
  decisao: [37, 99, 235],
  depoimento: [6, 182, 212],
  alegacoes: [245, 158, 11],
  certidao: [107, 114, 128],
  laudo: [16, 185, 129],
  inquerito: [249, 115, 22],
  recurso: [236, 72, 153],
  outros: [161, 161, 170],
};

/**
 * Gera relatório PDF com resumo de todas as peças processuais.
 */
export function generateSectionReport(data: ReportData): Uint8Array {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const now = data.generatedAt || new Date();

  // ─── Header ───
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text("DEFENSORIA PÚBLICA DO ESTADO DA BAHIA", margin, 12);
  doc.text(
    `Gerado em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    pageWidth - margin,
    12,
    { align: "right" }
  );

  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setLineWidth(0.5);
  doc.line(margin, 15, pageWidth - margin, 15);

  // ─── Title ───
  doc.setFontSize(14);
  doc.setTextColor(39, 39, 42); // zinc-800
  doc.text("RELATÓRIO DE PEÇAS PROCESSUAIS", margin, 24);

  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122); // zinc-500
  const fileNameTruncated =
    data.fileName.length > 80
      ? data.fileName.slice(0, 77) + "..."
      : data.fileName;
  doc.text(`Arquivo: ${fileNameTruncated}`, margin, 30);
  doc.text(
    `Total de páginas: ${data.totalPages} | Peças identificadas: ${data.sections.length}`,
    margin,
    35
  );

  // ─── Summary Table ───
  let currentY = 42;

  // Group by tipo for summary
  const grouped = new Map<string, ReportSection[]>();
  for (const sec of data.sections) {
    const group = grouped.get(sec.tipo) || [];
    group.push(sec);
    grouped.set(sec.tipo, group);
  }

  const summaryRows = Array.from(grouped.entries()).map(([tipo, secs]) => [
    TIPO_LABELS[tipo] || tipo,
    String(secs.length),
    secs.map((s) => `${s.paginaInicio}-${s.paginaFim}`).join(", "),
  ]);

  doc.autoTable({
    startY: currentY,
    head: [["Tipo de Peça", "Qtd", "Páginas"]],
    body: summaryRows,
    theme: "grid",
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [63, 63, 70],
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 15, halign: "center" },
      2: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // ─── Detailed Sections ───
  doc.setFontSize(11);
  doc.setTextColor(39, 39, 42);
  doc.text("DETALHAMENTO DAS PEÇAS", margin, currentY);
  currentY += 6;

  for (let i = 0; i < data.sections.length; i++) {
    const sec = data.sections[i];
    const color = TIPO_COLORS[sec.tipo] || [161, 161, 170];

    // Check if we need a new page
    if (currentY > 260) {
      doc.addPage();
      currentY = 15;
    }

    // Color bar + title
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, currentY - 3.5, 2, 14, "F");

    doc.setFontSize(9);
    doc.setTextColor(39, 39, 42);
    doc.setFont("helvetica", "bold");
    doc.text(
      `${i + 1}. ${sec.titulo}`,
      margin + 5,
      currentY
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(113, 113, 122);
    const tipoLabel = TIPO_LABELS[sec.tipo] || sec.tipo;
    doc.text(
      `${tipoLabel} | Páginas ${sec.paginaInicio}–${sec.paginaFim} | Confiança: ${sec.confianca ?? 0}%`,
      margin + 5,
      currentY + 4
    );

    currentY += 8;

    // Resumo
    if (sec.resumo) {
      doc.setFontSize(8);
      doc.setTextColor(63, 63, 70);
      const resumoLines = doc.splitTextToSize(sec.resumo, contentWidth - 8);
      doc.text(resumoLines, margin + 5, currentY);
      currentY += resumoLines.length * 3.5;
    }

    // Metadata chips
    const metadata = sec.metadata;
    if (metadata) {
      const chips: string[] = [];
      if (metadata.juiz) chips.push(`Juiz: ${metadata.juiz}`);
      if (metadata.promotor) chips.push(`Promotor: ${metadata.promotor}`);
      if (metadata.artigosLei?.length)
        chips.push(`Artigos: ${metadata.artigosLei.join(", ")}`);
      if (metadata.partesmencionadas?.length)
        chips.push(`Partes: ${metadata.partesmencionadas.join(", ")}`);
      if (metadata.datasExtraidas?.length)
        chips.push(`Datas: ${metadata.datasExtraidas.join(", ")}`);

      if (chips.length > 0) {
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 130);
        const metaText = chips.join(" | ");
        const metaLines = doc.splitTextToSize(metaText, contentWidth - 8);
        doc.text(metaLines, margin + 5, currentY + 1);
        currentY += metaLines.length * 3;
      }
    }

    currentY += 4;

    // Separator line
    doc.setDrawColor(228, 228, 231); // zinc-200
    doc.setLineWidth(0.2);
    doc.line(margin + 5, currentY - 2, pageWidth - margin, currentY - 2);
  }

  // ─── Footer ───
  const totalPagesDoc = doc.getNumberOfPages();
  for (let p = 1; p <= totalPagesDoc; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(161, 161, 170);
    doc.text(
      `Página ${p}/${totalPagesDoc} — OMBUDS | Defensoria Pública`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
