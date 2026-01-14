import { Building2, Construction } from "lucide-react";

export default function DaycarePage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Building2 />
          </div>
          <div className="page-header-info">
            <h1>Creche</h1>
            <p>Configurações e informações da creche</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
          <Construction className="h-10 w-10 text-slate-500 dark:text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Em Desenvolvimento</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
          Aqui você poderá configurar horários de funcionamento, capacidade, 
          equipe e outras informações da creche.
        </p>
      </div>
    </div>
  );
}

