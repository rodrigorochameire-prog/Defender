import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/CustomSelect";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Calendar, CheckSquare } from "lucide-react";

interface AgendaExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventos: any[];
}

const formatOptions = [
  { value: "excel", label: "Excel (.xlsx)", icon: FileSpreadsheet },
  { value: "csv", label: "CSV (.csv)", icon: FileText },
  { value: "pdf", label: "PDF (.pdf)", icon: FileText },
  { value: "ical", label: "iCalendar (.ics)", icon: Calendar },
];

const periodoOptions = [
  { value: "todos", label: "Todos os eventos" },
  { value: "hoje", label: "Hoje" },
  { value: "proximos-7", label: "Próximos 7 dias" },
  { value: "proximos-30", label: "Próximos 30 dias" },
  { value: "mes-atual", label: "Mês atual" },
  { value: "personalizado", label: "Período personalizado" },
];

export function AgendaExportModal({ isOpen, onClose, eventos }: AgendaExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState("excel");
  const [selectedPeriodo, setSelectedPeriodo] = useState("todos");
  const [incluirCancelados, setIncluirCancelados] = useState(false);
  const [incluirConcluidos, setIncluirConcluidos] = useState(true);

  const handleExport = () => {
    // Filtrar eventos baseado nas opções
    let eventosParaExportar = [...eventos];

    if (!incluirCancelados) {
      eventosParaExportar = eventosParaExportar.filter((e) => e.status !== "cancelado");
    }

    if (!incluirConcluidos) {
      eventosParaExportar = eventosParaExportar.filter((e) => e.status !== "concluido");
    }

    // Simulação de exportação
    const formatLabel = formatOptions.find((f) => f.value === selectedFormat)?.label || "";
    
    toast.success(`Exportando ${eventosParaExportar.length} eventos`, {
      description: `Formato: ${formatLabel}`,
    });

    // Aqui viria a lógica real de exportação
    console.log("Exportando eventos:", {
      format: selectedFormat,
      periodo: selectedPeriodo,
      incluirCancelados,
      incluirConcluidos,
      eventos: eventosParaExportar,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Download className="w-6 h-6 text-emerald-600" />
            Exportar Agenda
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
            Selecione o formato e as opções de exportação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formato */}
          <div>
            <Label>Formato de Exportação</Label>
            <CustomSelect
              options={formatOptions}
              value={selectedFormat}
              onChange={setSelectedFormat}
              placeholder="Selecione o formato"
            />
          </div>

          {/* Período */}
          <div>
            <Label>Período</Label>
            <CustomSelect
              options={periodoOptions}
              value={selectedPeriodo}
              onChange={setSelectedPeriodo}
              placeholder="Selecione o período"
            />
          </div>

          {/* Opções */}
          <div className="space-y-3">
            <Label>Opções de Exportação</Label>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIncluirCancelados(!incluirCancelados)}
                className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    incluirCancelados
                      ? "bg-emerald-600 border-emerald-600"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {incluirCancelados && <CheckSquare className="w-4 h-4 text-white" />}
                </div>
                Incluir eventos cancelados
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIncluirConcluidos(!incluirConcluidos)}
                className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    incluirConcluidos
                      ? "bg-emerald-600 border-emerald-600"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {incluirConcluidos && <CheckSquare className="w-4 h-4 text-white" />}
                </div>
                Incluir eventos concluídos
              </button>
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <p className="text-sm text-emerald-900 dark:text-emerald-100">
              <span className="font-bold">{eventos.length}</span> eventos serão exportados
            </p>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}