import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petId?: number;
}

export function ReportGenerator({ open, onOpenChange, petId }: ReportGeneratorProps) {
  const [reportType, setReportType] = useState<"behavior" | "health" | "financial">("behavior");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      toast.error("Por favor, selecione o período do relatório");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simular geração de relatório
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success("Relatório gerado com sucesso!");
      
      // Aqui você conectaria com o backend real
      // const report = await generateReport({ type: reportType, petId, startDate, endDate });
      // downloadPDF(report);
      
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Relatório
          </DialogTitle>
          <DialogDescription>
            Selecione o tipo de relatório e o período desejado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="reportType">Tipo de Relatório</Label>
            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <SelectTrigger id="reportType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="behavior">Comportamento</SelectItem>
                <SelectItem value="health">Saúde e Desenvolvimento</SelectItem>
                <SelectItem value="financial">Financeiro</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {reportType === "behavior" && "Análise de humor, atividades e comportamento do pet"}
              {reportType === "health" && "Histórico de vacinas, medicamentos e peso"}
              {reportType === "financial" && "Resumo de créditos, transações e gastos"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Preview Section */}
          <div className="rounded-lg border border-border/50 p-4 bg-muted/30">
            <p className="text-sm font-medium mb-2">Prévia do Relatório</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Tipo: {reportType === "behavior" ? "Comportamento" : reportType === "health" ? "Saúde" : "Financeiro"}</p>
              <p>• Período: {startDate && endDate ? `${new Date(startDate).toLocaleDateString("pt-BR")} até ${new Date(endDate).toLocaleDateString("pt-BR")}` : "Não selecionado"}</p>
              <p>• Formato: PDF</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !startDate || !endDate}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Gerar Relatório
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
