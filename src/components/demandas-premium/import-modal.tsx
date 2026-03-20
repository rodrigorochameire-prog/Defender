"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, AlertCircle, Download, FileText } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TipoTemplate, getTemplateHeaders, getTemplateExampleRow, TEMPLATE_CONFIGS } from "@/config/templates";
import { resolveImportStatus } from "@/lib/pje-parser";
import * as XLSX from "xlsx";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => void;
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [templateType, setTemplateType] = useState<TipoTemplate>(TipoTemplate.JURI);
  const [etapa, setEtapa] = useState<"upload" | "revisar">("upload");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [expandedProv, setExpandedProv] = useState<Set<number>>(new Set());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleParse = async () => {
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (json.length < 2) {
            alert("Arquivo vazio ou inválido");
            return;
          }

          const headers = json[0] as string[];
          const templateConfig = TEMPLATE_CONFIGS[templateType];
          const columnKeys = templateConfig.columns.map(c => c.key);

          const importedData = json.slice(1).map((line: any[], index) => {
            const values = line;
            const row: any = {
              id: `imported-${Date.now()}-${index}`,
            };

            values.forEach((value, i) => {
              const key = columnKeys[i];
              if (key && value) {
                const valueStr = String(value).trim();

                // Mapear para estrutura de demanda
                if (key === "processos") {
                  // Campo processos deve ser um array de objetos
                  row.processos = [{ tipo: "AP", numero: valueStr }];
                } else if (key === "estadoPrisional") {
                  // Normalizar estado prisional
                  row.estadoPrisional = valueStr.toLowerCase().replace(/\s+/g, '_');
                } else if (key === "status") {
                  // Normalizar status
                  row.status = valueStr.toLowerCase().replace(/\s+/g, '_');
                } else if (key === "data") {
                  // Garantir formato de data
                  row.data = valueStr;
                } else {
                  row[key] = valueStr;
                }
              }
            });

            // Adicionar campos obrigatórios padrão se não existirem
            if (!row.atribuicao) {
              row.atribuicao = "Criminal Geral";
            }
            if (!row.status) {
              row.status = "fila";
            }
            if (!row.processos) {
              row.processos = [{ tipo: "AP", numero: "" }];
            }
            if (!row.data) {
              row.data = new Date().toISOString().split("T")[0];
            }
            if (!row.estadoPrisional) {
              row.estadoPrisional = "solto";
            }

            return row;
          });

          setParsedRows(importedData);
          setEtapa("revisar");
        };
        reader.readAsBinaryString(file);
      } catch (error) {
        console.error("Erro ao importar:", error);
        alert("Erro ao processar o arquivo");
      }
    }
  };

  const handleConfirmImport = () => {
    const resolvedRows = parsedRows.map((r) => ({
      ...r,
      status: resolveImportStatus(r.status),
    }));
    onImport(resolvedRows);
    // Reset
    setEtapa("upload");
    setParsedRows([]);
    setFile(null);
    setExpandedProv(new Set());
  };

  const handleDownloadTemplate = (format: 'xlsx' | 'ods') => {
    const templateConfig = TEMPLATE_CONFIGS[templateType];
    if (!templateConfig) {
      console.error('Template não encontrado:', templateType);
      return;
    }

    const headers = getTemplateHeaders(templateType);
    const exampleRow = getTemplateExampleRow(templateType);

    // Criar workbook
    const wb = XLSX.utils.book_new();

    // Criar dados para a planilha principal
    const wsData = [
      headers,
      exampleRow,
      // 10 linhas em branco para preenchimento
      ...Array(10).fill(headers.map(() => "")),
    ];

    // Criar worksheet principal
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Configurar larguras de colunas
    const colWidths = templateConfig.columns.map(col => {
      const widthNum = parseInt(col.width);
      return { wch: Math.max(10, Math.floor(widthNum / 8)) }; // Converter px para caracteres
    });
    ws['!cols'] = colWidths;

    // Criar uma aba separada com as listas de validação
    const validationSheetData: any[] = [];
    const validationHeaders: string[] = [];

    // Coletar todas as opções de dropdown
    templateConfig.columns.forEach((col, index) => {
      if (col.type === 'dropdown' && col.options && col.options.length > 0) {
        validationHeaders.push(`Lista_${col.label.replace(/\s+/g, '_')}`);
        col.options.forEach((option, optionIndex) => {
          if (!validationSheetData[optionIndex]) {
            validationSheetData[optionIndex] = [];
          }
          validationSheetData[optionIndex][index] = option;
        });
      }
    });

    // Se houver validações, criar aba de validação
    if (validationHeaders.length > 0) {
      const validationData = [validationHeaders, ...validationSheetData];
      const wsValidation = XLSX.utils.aoa_to_sheet(validationData);
      XLSX.utils.book_append_sheet(wb, wsValidation, "Listas_Validacao");
    }

    // Adicionar worksheet principal ao workbook
    XLSX.utils.book_append_sheet(wb, ws, "Demandas");

    // Gerar arquivo
    const templateName = templateConfig.name.replace(/\s+/g, '_').toLowerCase();
    const fileName = `modelo_${templateName}.${format}`;

    // Salvar arquivo
    XLSX.writeFile(wb, fileName, { bookType: format });
  };

  const selectedTemplate = TEMPLATE_CONFIGS[templateType];

  // Verificação de segurança
  if (!selectedTemplate) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
            <Upload className="w-4 h-4 md:w-5 md:h-5" />
            Importar Demandas
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Importe demandas a partir de um arquivo Excel (.xlsx) ou CSV usando um template específico.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 md:py-6 space-y-4 md:space-y-6">
          {etapa === "upload" && (
            <>
              {/* Template Selection */}
              <div className="space-y-2">
                <Label htmlFor="template-select" className="text-xs md:text-sm font-semibold">
                  Selecione o Template
                </Label>
                <Select value={templateType} onValueChange={(value) => setTemplateType(value as TipoTemplate)}>
                  <SelectTrigger id="template-select" className="w-full text-xs md:text-sm">
                    <SelectValue placeholder="Escolha um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_CONFIGS).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col items-start">
                          <span className="font-semibold text-xs md:text-sm">{config.name}</span>
                          <span className="text-[10px] md:text-xs text-zinc-500">{config.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template Info */}
              <div className="p-3 md:p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex gap-2 md:gap-3">
                  <FileSpreadsheet className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs md:text-sm text-emerald-800 dark:text-emerald-200 min-w-0">
                    <p className="font-semibold mb-1 md:mb-2 text-xs md:text-sm">{selectedTemplate.name}</p>
                    <p className="text-emerald-700 dark:text-emerald-300 mb-1 md:mb-2 text-[10px] md:text-xs">
                      {selectedTemplate.description}
                    </p>
                    <div className="text-[9px] md:text-xs text-emerald-600 dark:text-emerald-400">
                      <strong>Colunas esperadas:</strong>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedTemplate.columns.map((c, i) => (
                          <span key={i} className="inline-block px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-[9px] md:text-[10px]">
                            {c.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex gap-2 md:gap-3">
                  <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs md:text-sm text-blue-800 dark:text-blue-200 min-w-0">
                    <p className="font-semibold mb-1 md:mb-2 text-xs md:text-sm">Instruções de Importação</p>
                    <ul className="list-disc list-inside space-y-0.5 md:space-y-1 text-blue-700 dark:text-blue-300 text-[10px] md:text-xs">
                      <li>O arquivo deve ser Excel (.xlsx) ou CSV</li>
                      <li>A primeira linha deve conter os nomes das colunas</li>
                      <li>Use o modelo baixado para garantir o formato correto</li>
                      <li>Datas devem estar no formato DD/MM/AA</li>
                      <li>Processos devem seguir o padrão CNJ: 0000000-00.0000.0.00.0000</li>
                      <li className="font-semibold text-blue-800 dark:text-blue-200">A aba &ldquo;Listas_Validacao&rdquo; contém as opções para os menus suspensos</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* File Upload Area */}
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-4 md:p-8 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                <div className="text-center space-y-2 md:space-y-4">
                  <div className="flex justify-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6 md:w-8 md:h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1 truncate px-2">
                      {file ? file.name : "Selecione um arquivo"}
                    </p>
                    <p className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400">
                      ou arraste e solte aqui
                    </p>
                  </div>
                  <label className="inline-block">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span className="cursor-pointer text-xs">
                        <Upload className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                        Escolher Arquivo
                      </span>
                    </Button>
                  </label>
                </div>
              </div>

              {/* Download Template */}
              <div className="flex flex-col sm:flex-row justify-center gap-2 md:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs"
                  onClick={() => handleDownloadTemplate('xlsx')}
                >
                  <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  Excel (.xlsx)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs"
                  onClick={() => handleDownloadTemplate('ods')}
                >
                  <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  LibreOffice (.ods)
                </Button>
              </div>
            </>
          )}

          {etapa === "revisar" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {parsedRows.length} demandas identificadas — revise antes de importar
                </p>
                <button
                  onClick={() => { setEtapa("upload"); setExpandedProv(new Set()); }}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  ← Voltar
                </button>
              </div>

              <div className="max-h-[350px] overflow-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50 sticky top-0 border-b border-zinc-200 dark:border-zinc-700">
                    <tr>
                      <th className="w-8 px-2 py-1.5 text-center text-zinc-500 font-medium">#</th>
                      <th className="px-2 py-1.5 text-left text-zinc-500 font-medium min-w-[140px]">Assistido</th>
                      <th className="px-2 py-1.5 text-left text-zinc-500 font-medium min-w-[120px]">Processo</th>
                      <th className="px-2 py-1.5 text-left text-zinc-500 font-medium min-w-[120px]">Ato</th>
                      <th className="px-2 py-1.5 text-left text-zinc-500 font-medium w-20">Prazo</th>
                      <th className="px-2 py-1.5 text-left text-zinc-500 font-medium w-20">Status</th>
                      <th className="px-2 py-1.5 text-center text-zinc-500 font-medium w-8">
                        <FileText className="h-3 w-3 inline" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {parsedRows.map((row, i) => (
                      <React.Fragment key={i}>
                        <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="px-2 py-1.5 text-center text-zinc-400 font-mono text-[10px]">{i + 1}</td>
                          <td className="px-2 py-1.5 text-zinc-800 dark:text-zinc-200 font-medium truncate max-w-[140px]">
                            {row.assistido || "—"}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-zinc-500 text-[10px] truncate">
                            {row.processos?.[0]?.numero || "—"}
                          </td>
                          <td className="px-2 py-1.5 text-zinc-600 dark:text-zinc-400 truncate">{row.ato || "—"}</td>
                          <td className="px-2 py-1.5 text-zinc-500 text-[10px]">{row.prazo || "—"}</td>
                          <td className="px-2 py-1.5 text-zinc-500 text-[10px]">{row.status || "—"}</td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              onClick={() => setExpandedProv((prev) => {
                                const next = new Set(prev);
                                next.has(i) ? next.delete(i) : next.add(i);
                                return next;
                              })}
                              aria-expanded={expandedProv.has(i)}
                              title={row.providencias?.trim() ? "Ver/editar providências" : "Adicionar providências"}
                              className={`rounded p-0.5 transition-colors ${
                                row.providencias?.trim()
                                  ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                                  : "text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400"
                              }`}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                        {expandedProv.has(i) && (
                          <tr>
                            <td colSpan={7} className="px-3 pb-2 pt-0 bg-zinc-50/70 dark:bg-zinc-800/30">
                              <div className="flex items-start gap-2">
                                <FileText className="h-3 w-3 text-zinc-400 mt-1.5 flex-shrink-0" />
                                <textarea
                                  autoFocus
                                  rows={2}
                                  defaultValue={row.providencias ?? ""}
                                  onBlur={(e) => {
                                    const newRows = [...parsedRows];
                                    newRows[i] = { ...newRows[i], providencias: e.target.value };
                                    setParsedRows(newRows);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                      setExpandedProv((prev) => {
                                        const next = new Set(prev);
                                        next.delete(i);
                                        return next;
                                      });
                                    }
                                  }}
                                  placeholder="Providências para esta demanda..."
                                  className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 rounded px-2 py-1 outline-none resize-none w-full"
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => { setEtapa("upload"); setExpandedProv(new Set()); }}>
                  Voltar
                </Button>
                <Button size="sm" onClick={handleConfirmImport}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar {parsedRows.length} demanda{parsedRows.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions — only shown in upload step */}
        {etapa === "upload" && (
          <div className="flex justify-end gap-2 pt-3 md:pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="text-xs md:text-sm">
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleParse}
              disabled={!file}
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar Demandas
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
