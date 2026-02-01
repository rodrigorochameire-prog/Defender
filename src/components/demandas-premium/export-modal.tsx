"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  File,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  Filter,
  Calendar,
  Settings,
  Eye,
  X
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  demandas: any[];
  demandasFiltradas: any[];
}

type ExportFormat = "excel" | "csv" | "pdf";
type ExportScope = "all" | "filtered";

const exportFields = [
  { key: "assistido", label: "Assistido", default: true },
  { key: "status", label: "Status", default: true },
  { key: "ato", label: "Tipo de Ato", default: true },
  { key: "atribuicao", label: "Atribuição", default: true },
  { key: "processos", label: "Processos", default: true },
  { key: "prazo", label: "Prazo", default: true },
  { key: "data", label: "Data Expedição", default: true },
  { key: "estadoPrisional", label: "Estado Prisional", default: true },
  { key: "providencias", label: "Providências", default: false },
  { key: "prioridade", label: "Prioridade", default: false },
  { key: "dataInclusao", label: "Data Inclusão", default: false },
];

export function ExportModal({ isOpen, onClose, demandas, demandasFiltradas }: ExportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [scope, setScope] = useState<ExportScope>("filtered");
  const [selectedFields, setSelectedFields] = useState<string[]>(
    exportFields.filter(f => f.default).map(f => f.key)
  );
  const [isExporting, setIsExporting] = useState(false);

  const dataToExport = useMemo(() => {
    return scope === "all" ? demandas : demandasFiltradas;
  }, [scope, demandas, demandasFiltradas]);

  const handleClose = () => {
    setStep(1);
    setFormat("excel");
    setScope("filtered");
    setSelectedFields(exportFields.filter(f => f.default).map(f => f.key));
    setIsExporting(false);
    onClose();
  };

  const toggleField = (fieldKey: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldKey) 
        ? prev.filter(k => k !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(exportFields.map(f => f.key));
  };

  const selectDefaultFields = () => {
    setSelectedFields(exportFields.filter(f => f.default).map(f => f.key));
  };

  const formatProcessos = (processos: any[]) => {
    if (!processos || processos.length === 0) return "";
    return processos.map(p => `${p.tipo}: ${p.numero}`).join("; ");
  };

  const prepareExportData = () => {
    return dataToExport.map(demanda => {
      const row: any = {};
      
      if (selectedFields.includes("assistido")) row["Assistido"] = demanda.assistido;
      if (selectedFields.includes("status")) row["Status"] = demanda.status;
      if (selectedFields.includes("ato")) row["Tipo de Ato"] = demanda.ato;
      if (selectedFields.includes("atribuicao")) row["Atribuição"] = demanda.atribuicao;
      if (selectedFields.includes("processos")) row["Processos"] = formatProcessos(demanda.processos);
      if (selectedFields.includes("prazo")) row["Prazo"] = demanda.prazo || "-";
      if (selectedFields.includes("data")) row["Data Expedição"] = demanda.data;
      if (selectedFields.includes("estadoPrisional")) row["Estado Prisional"] = demanda.estadoPrisional || "-";
      if (selectedFields.includes("providencias")) row["Providências"] = demanda.providencias || "-";
      if (selectedFields.includes("prioridade")) row["Prioridade"] = demanda.prioridade || "-";
      if (selectedFields.includes("dataInclusao")) row["Data Inclusão"] = demanda.dataInclusao || "-";
      
      return row;
    });
  };

  const exportToExcel = () => {
    const data = prepareExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Estilo para o cabeçalho
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "10B981" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }
    
    // Ajustar largura das colunas
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demandas");
    XLSX.writeFile(wb, `demandas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToCSV = () => {
    const data = prepareExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `demandas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4'); // 'p' = portrait (vertical)
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const now = new Date();
    
    // ============================================
    // PREPARAR DADOS
    // ============================================
    
    const data = prepareExportData();
    
    // Contar prazos para o footer
    const prazoCounts = { vencido: 0, urgente: 0, normal: 0 };
    dataToExport.forEach(demanda => {
      if (demanda.prazo) {
        try {
          const [dia, mes, ano] = demanda.prazo.split('/').map(Number);
          const prazo = new Date(2000 + ano, mes - 1, dia);
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          prazo.setHours(0, 0, 0, 0);
          
          const diffTime = prazo.getTime() - hoje.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0) prazoCounts.vencido++;
          else if (diffDays <= 7) prazoCounts.urgente++;
          else prazoCounts.normal++;
        } catch {
          prazoCounts.normal++;
        }
      }
    });
    
    // ============================================
    // HEADER SIMPLES E ELEGANTE
    // ============================================
    
    // Header com gradiente verde
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Gradiente sutil
    for (let i = 0; i < 8; i++) {
      const opacity = i / 8;
      doc.setFillColor(
        Math.round(16 + (14 - 16) * opacity),
        Math.round(185 + (184 - 185) * opacity),
        Math.round(129 + (166 - 129) * opacity)
      );
      doc.rect(0, 27 + i, pageWidth, 1, 'F');
    }
    
    // Logo
    doc.setFillColor(255, 255, 255);
    doc.circle(20, 17.5, 8, 'F');
    doc.setFillColor(16, 185, 129);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DP', 20, 20, { align: 'center' });
    
    // Título
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatorio de Demandas', 33, 15);
    
    // Subtítulo
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Defensoria Publica do Estado da Bahia', 33, 22);
    
    // Data e hora
    doc.setFontSize(8);
    doc.text(`Gerado em: ${now.toLocaleDateString('pt-BR')} as ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 33, 28);
    
    // Escopo do relatório
    const tipoRelatorio = scope === 'all' ? 'Todas as Demandas' : 'Demandas Filtradas';
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255, 0.8);
    doc.text(tipoRelatorio, pageWidth - 15, 17, { align: 'right' });
    doc.text(`Total: ${dataToExport.length} registro${dataToExport.length !== 1 ? 's' : ''}`, pageWidth - 15, 22, { align: 'right' });
    
    // ============================================
    // TABELA DE DEMANDAS
    // ============================================
    
    const tableStartY = 40;
    
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'bold');
    doc.text('[LISTA] Lista de Demandas', 15, tableStartY);
    
    // Preparar dados da tabela - TODOS os registros
    const tableData = dataToExport.map(demanda => {
      const row = [];
      if (selectedFields.includes('assistido')) row.push(demanda.assistido || '-');
      if (selectedFields.includes('status')) row.push(demanda.status || '-');
      if (selectedFields.includes('ato')) row.push(demanda.ato || '-');
      if (selectedFields.includes('atribuicao')) row.push(demanda.atribuicao || '-');
      if (selectedFields.includes('processos')) {
        // Formatar múltiplos processos em uma única célula
        const processosFormatted = demanda.processos
          .map(p => `${p.tipo}: ${p.numero}`)
          .join('\n');
        row.push(processosFormatted || '-');
      }
      if (selectedFields.includes('data')) row.push(demanda.data || '-');
      if (selectedFields.includes('prazo')) row.push(demanda.prazo || '-');
      if (selectedFields.includes('providencias')) row.push(demanda.providencias || '-');
      return row;
    });
    
    const tableHeaders = [];
    if (selectedFields.includes('assistido')) tableHeaders.push('Assistido');
    if (selectedFields.includes('status')) tableHeaders.push('Status');
    if (selectedFields.includes('ato')) tableHeaders.push('Ato');
    if (selectedFields.includes('atribuicao')) tableHeaders.push('Atribuicao');
    if (selectedFields.includes('processos')) tableHeaders.push('Processo');
    if (selectedFields.includes('data')) tableHeaders.push('Data Exp.');
    if (selectedFields.includes('prazo')) tableHeaders.push('Prazo');
    if (selectedFields.includes('providencias')) tableHeaders.push('Providencias');
    
    autoTable(doc, {
      startY: tableStartY + 3,
      head: [tableHeaders],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 6,
        cellPadding: 2,
        lineColor: [220, 220, 220],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { left: 15, right: 15 },
      tableWidth: 'auto',
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 'auto', halign: 'center' }
      }
    });
    
    // ============================================
    // FOOTER
    // ============================================
    
    const footerY = pageHeight - 10;
    
    // Linha separadora
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.3);
    doc.line(15, footerY - 3, pageWidth - 15, footerY - 3);
    
    // Informações
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Total: ${dataToExport.length} | Vencidas: ${prazoCounts.vencido} | Urgentes: ${prazoCounts.urgente} | Normais: ${prazoCounts.normal}`, 15, footerY);
    doc.setFont('helvetica', 'italic');
    doc.text('Sistema de Gestão de Demandas - Defensoria Pública', pageWidth / 2, footerY, { align: 'center' });
    doc.text('Documento Confidencial', pageWidth - 15, footerY, { align: 'right' });
    
    // ============================================
    // SALVAR ARQUIVO
    // ============================================
    
    const filename = `relatorio_demandas_${now.toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    // Simular delay para melhor UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      if (format === "excel") {
        exportToExcel();
      } else if (format === "csv") {
        exportToCSV();
      } else if (format === "pdf") {
        exportToPDF();
      }
      
      setTimeout(() => {
        setIsExporting(false);
        handleClose();
      }, 500);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      setIsExporting(false);
    }
  };

  const formatOptions: Array<{ value: ExportFormat; label: string; icon: any; description: string; color: string }> = [
    {
      value: "pdf",
      label: "PDF",
      icon: File,
      description: "Documento para impressão",
      color: "red"
    },
    {
      value: "excel",
      label: "Excel (XLSX)",
      icon: FileSpreadsheet,
      description: "Planilha completa com formatação",
      color: "emerald"
    },
    {
      value: "csv",
      label: "CSV",
      icon: FileText,
      description: "Compatível com qualquer planilha",
      color: "blue"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm max-h-[75vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Exportar Demandas
              </DialogTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Escolha o formato
              </p>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Modal para exportar demandas em diferentes formatos
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-1 px-4 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-medium transition-all ${
                  step >= s
                    ? "bg-zinc-700 dark:bg-zinc-300 text-white dark:text-zinc-900"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {step > s ? <CheckCircle2 className="w-2.5 h-2.5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-px mx-1 transition-all ${
                    step > s ? "bg-zinc-500" : "bg-zinc-200 dark:bg-zinc-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          {/* Step 1: Formato */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                {formatOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = format === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setFormat(option.value)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all text-left ${
                        isSelected
                          ? "border-zinc-400 bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-600"
                          : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"}`} />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{option.label}</p>
                        <p className="text-[10px] text-zinc-400">{option.description}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Scope Selection */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] font-medium text-zinc-400 mb-1.5">Dados a exportar</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setScope("filtered")}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      scope === "filtered"
                        ? "border-zinc-400 bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-600"
                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Filtrados</span>
                    <p className="text-[10px] text-zinc-400">{demandasFiltradas.length}</p>
                  </button>
                  <button
                    onClick={() => setScope("all")}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      scope === "all"
                        ? "border-zinc-400 bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-600"
                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Todas</span>
                    <p className="text-[10px] text-zinc-400">{demandas.length}</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Campos */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-500">Campos ({selectedFields.length})</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={selectDefaultFields} className="h-6 text-xs px-2">
                    Padrão
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectAllFields} className="h-6 text-xs px-2">
                    Todos
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {exportFields.map((field) => {
                  const isSelected = selectedFields.includes(field.key);
                  return (
                    <button
                      key={field.key}
                      onClick={() => toggleField(field.key)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />
                      )}
                      <span className="truncate">{field.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-zinc-500">Formato</p>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {formatOptions.find(f => f.value === format)?.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Registros</p>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">{dataToExport.length}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Campos</p>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">{selectedFields.length}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Data</p>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">{new Date().toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {exportFields
                  .filter(f => selectedFields.includes(f.key))
                  .map(field => (
                    <Badge key={field.key} variant="outline" className="text-[10px] px-1.5 py-0">
                      {field.label}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={step === 1 ? handleClose : () => setStep((s) => (s - 1) as 1 | 2 | 3)}
            disabled={isExporting}
            className="h-8 text-xs text-zinc-500 hover:text-zinc-700"
          >
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>

          {step < 3 ? (
            <Button
              size="sm"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              className="h-8 text-xs bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:hover:bg-zinc-300 dark:text-zinc-900 text-white"
              disabled={selectedFields.length === 0 && step === 2}
            >
              Próximo
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="h-8 text-xs bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:hover:bg-zinc-300 dark:text-zinc-900 text-white"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Exportar
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}