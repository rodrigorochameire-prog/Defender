import { DemandasTable } from "@/components/demandas/demandas-table";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";

export default function DemandasPage() {
  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página (PageLayout simplificado) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight flex items-center gap-2">
            Demandas & Prazos
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Gestão unificada de intimações do Júri e Execução Penal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-white border-stone-200 text-stone-600">
            <Upload className="w-4 h-4 mr-2" /> Importar CSV
          </Button>
          <Button variant="outline" className="bg-white border-stone-200 text-stone-600">
            <Download className="w-4 h-4 mr-2" /> Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <DemandasTable />
    </div>
  );
}
