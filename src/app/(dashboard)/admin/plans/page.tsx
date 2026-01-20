import { Package, Construction } from "lucide-react";

export default function PlansPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Package />
          </div>
          <div className="page-header-info">
            <h1>Planos e Serviços</h1>
            <p>Gerencie os planos e pacotes oferecidos</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
          <Construction className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Em Desenvolvimento</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
          Aqui você poderá gerenciar planos, pacotes e preços dos serviços da creche.
        </p>
      </div>
    </div>
  );
}

