import { DemandasView } from "@/components/demandas/demandas-view";
import { PageLayout } from "@/components/shared/page-layout";
import { FileText } from "lucide-react";

export default function DemandasPage() {
  return (
    <PageLayout
      header="Demandas & Prazos"
      description="Gestão unificada de intimações com visualização em Lista, Grid ou Kanban"
    >
      <DemandasView />
    </PageLayout>
  );
}
