import { DemandasView } from "@/components/demandas/demandas-view";
import { PageLayout } from "@/components/shared/page-layout";
import { FileText } from "lucide-react";

export default function DemandasPage() {
  return (
    <div className="p-6">
      <div className="space-y-5 max-w-[1600px] mx-auto">
        {/* Header com fundo */}
        <div className="pb-5 mb-5 border-b-2 border-border/70 bg-gradient-to-r from-muted/30 via-muted/10 to-transparent -mx-6 px-6 pt-4 rounded-t-xl">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            Demandas & Prazos
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mt-2 leading-relaxed">
            Gestão unificada de intimações com visualização em Lista, Grid ou Kanban
          </p>
        </div>
        
        <DemandasView />
      </div>
    </div>
  );
}
