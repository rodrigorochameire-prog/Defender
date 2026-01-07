import jsPDF from "jspdf";

interface HealthReportData {
  pet: {
    name: string;
    breed: string;
    birthDate: Date | null;
    weight: number | null;
    species: string;
  };
  vaccinations: Array<{
    vaccineName: string;
    vaccineDescription: string | null;
    applicationDate: Date;
    nextDueDate: Date | null;
    batchNumber: string | null;
    veterinarian: string | null;
    notes: string | null;
  }>;
  medications: Array<{
    medicationName: string;
    medicationType: string | null;
    startDate: Date;
    endDate: Date | null;
    dosage: string;
    frequency: string | null;
    notes: string | null;
  }>;
  preventives: {
    flea: Array<{
      productName: string;
      applicationDate: Date;
      nextDueDate: Date;
      notes: string | null;
    }>;
    deworming: Array<{
      productName: string;
      applicationDate: Date;
      nextDueDate: Date;
      notes: string | null;
    }>;
  };
}

export function generateHealthReportPDF(data: HealthReportData) {
  const doc = new jsPDF();
  
  let yPos = 20;
  const lineHeight = 7;
  const pageHeight = doc.internal.pageSize.height;
  const marginBottom = 20;
  
  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - marginBottom) {
      doc.addPage();
      yPos = 20;
    }
  };
  
  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Saúde", 105, yPos, { align: "center" });
  yPos += 10;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("TucoCare - Gestão de Creche de Pets", 105, yPos, { align: "center" });
  yPos += 15;
  
  // Pet Information
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Informações do Pet", 20, yPos);
  yPos += lineHeight;
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${data.pet.name}`, 20, yPos);
  yPos += lineHeight;
  doc.text(`Espécie: ${data.pet.species}`, 20, yPos);
  yPos += lineHeight;
  doc.text(`Raça: ${data.pet.breed}`, 20, yPos);
  yPos += lineHeight;
  
  if (data.pet.birthDate) {
    doc.text(`Data de Nascimento: ${new Date(data.pet.birthDate).toLocaleDateString("pt-BR")}`, 20, yPos);
    yPos += lineHeight;
  }
  
  if (data.pet.weight) {
    doc.text(`Peso: ${data.pet.weight} kg`, 20, yPos);
    yPos += lineHeight;
  }
  
  yPos += 5;
  
  // Vaccinations Section
  checkPageBreak(30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Histórico de Vacinação", 20, yPos);
  yPos += lineHeight + 2;
  
  if (data.vaccinations.length === 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Nenhuma vacinação registrada", 25, yPos);
    yPos += lineHeight + 3;
  } else {
    data.vaccinations.forEach((vac, idx) => {
      checkPageBreak(25);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. ${vac.vaccineName}`, 25, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`   Data de Aplicação: ${new Date(vac.applicationDate).toLocaleDateString("pt-BR")}`, 25, yPos);
      yPos += lineHeight - 1;
      
      if (vac.nextDueDate) {
        doc.text(`   Próxima Dose: ${new Date(vac.nextDueDate).toLocaleDateString("pt-BR")}`, 25, yPos);
        yPos += lineHeight - 1;
      }
      
      if (vac.batchNumber) {
        doc.text(`   Lote: ${vac.batchNumber}`, 25, yPos);
        yPos += lineHeight - 1;
      }
      
      if (vac.veterinarian) {
        doc.text(`   Veterinário: ${vac.veterinarian}`, 25, yPos);
        yPos += lineHeight - 1;
      }
      
      if (vac.notes) {
        doc.text(`   Observações: ${vac.notes}`, 25, yPos);
        yPos += lineHeight - 1;
      }
      
      yPos += 3;
    });
  }
  
  yPos += 3;
  
  // Medications Section
  checkPageBreak(30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Histórico de Medicamentos", 20, yPos);
  yPos += lineHeight + 2;
  
  if (data.medications.length === 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Nenhum medicamento registrado", 25, yPos);
    yPos += lineHeight + 3;
  } else {
    data.medications.forEach((med, idx) => {
      checkPageBreak(25);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. ${med.medicationName}`, 25, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      if (med.medicationType) {
        doc.text(`   Tipo: ${med.medicationType}`, 25, yPos);
        yPos += lineHeight - 1;
      }
      
      const endDateStr = med.endDate ? new Date(med.endDate).toLocaleDateString("pt-BR") : "Em andamento";
      doc.text(`   Período: ${new Date(med.startDate).toLocaleDateString("pt-BR")} a ${endDateStr}`, 25, yPos);
      yPos += lineHeight - 1;
      
      doc.text(`   Dosagem: ${med.dosage}`, 25, yPos);
      yPos += lineHeight - 1;
      
      if (med.frequency) {
        doc.text(`   Frequência: ${med.frequency}`, 25, yPos);
        yPos += lineHeight - 1;
      }
      
      if (med.notes) {
        doc.text(`   Observações: ${med.notes}`, 25, yPos);
        yPos += lineHeight - 1;
      }
      
      yPos += 3;
    });
  }
  
  yPos += 3;
  
  // Flea Treatments Section
  checkPageBreak(30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Histórico de Antipulgas", 20, yPos);
  yPos += lineHeight + 2;
  
  if (data.preventives.flea.length === 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Nenhum tratamento antipulgas registrado", 25, yPos);
    yPos += lineHeight + 3;
  } else {
    data.preventives.flea.forEach((flea, idx) => {
      checkPageBreak(20);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. ${flea.productName}`, 25, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`   Data de Aplicação: ${new Date(flea.applicationDate).toLocaleDateString("pt-BR")}`, 25, yPos);
      yPos += lineHeight - 1;
      
      doc.text(`   Próxima Aplicação: ${new Date(flea.nextDueDate).toLocaleDateString("pt-BR")}`, 25, yPos);
      yPos += lineHeight - 1;
      
      if (flea.notes) {
        doc.text(`   Observações: ${flea.notes}`, 25, yPos);
        yPos += lineHeight - 1;
      }
      
      yPos += 3;
    });
  }
  
  yPos += 3;
  
  // Deworming Section
  checkPageBreak(30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Histórico de Vermífugos", 20, yPos);
  yPos += lineHeight + 2;
  
  if (data.preventives.deworming.length === 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Nenhum tratamento vermífugo registrado", 25, yPos);
    yPos += lineHeight + 3;
  } else {
    data.preventives.deworming.forEach((dew, idx) => {
      checkPageBreak(20);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. ${dew.productName}`, 25, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`   Data de Aplicação: ${new Date(dew.applicationDate).toLocaleDateString("pt-BR")}`, 25, yPos);
      yPos += lineHeight - 1;
      
      doc.text(`   Próxima Aplicação: ${new Date(dew.nextDueDate).toLocaleDateString("pt-BR")}`, 25, yPos);
      yPos += lineHeight - 1;
      
      if (dew.notes) {
        doc.text(`   Observações: ${dew.notes}`, 25, yPos);
        yPos += lineHeight - 1;
      }
      
      yPos += 3;
    });
  }
  
  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Relatório gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
      105,
      pageHeight - 10,
      { align: "center" }
    );
    doc.text(`Página ${i} de ${totalPages}`, 105, pageHeight - 5, { align: "center" });
  }
  
  // Download PDF
  doc.save(`relatorio-saude-${data.pet.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
