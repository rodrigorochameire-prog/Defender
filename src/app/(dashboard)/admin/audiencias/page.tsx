"use client";

import { useState, useMemo } from "react";
import { AudienciasHub } from "@/components/casos/audiencias-hub";
import { SwissCard, SwissCardContent } from "@/components/shared/swiss-card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
  Lock,
  Gavel,
  Shield,
  Scale,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssignment } from "@/contexts/assignment-context";
import { isToday, isTomorrow, addDays, isPast } from "date-fns";

// ==========================================
// CONSTANTES - DESIGN SUÍÇO
// ==========================================

// Cores alinhadas com os workspaces
const ATRIBUICAO_COLORS: Record<string, { 
  border: string; 
  bg: string; 
  text: string;
  hoverBg: string;
  indicator: string;
}> = {
  all: { 
    border: "border-l-zinc-400", 
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-700 dark:text-zinc-300",
    hoverBg: "hover:bg-zinc-100 dark:hover:bg-zinc-800",
    indicator: "bg-zinc-600"
  },
  JURI: { 
    border: "border-l-emerald-600 dark:border-l-emerald-500", 
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
    indicator: "bg-emerald-600"
  },
  VVD: { 
    border: "border-l-violet-600 dark:border-l-violet-500",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-400",
    hoverBg: "hover:bg-violet-50 dark:hover:bg-violet-900/20",
    indicator: "bg-violet-600"
  },
  EXECUCAO: { 
    border: "border-l-blue-600 dark:border-l-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
    indicator: "bg-blue-600"
  },
  CRIMINAL: { 
    border: "border-l-rose-600 dark:border-l-rose-500",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400",
    hoverBg: "hover:bg-rose-50 dark:hover:bg-rose-900/20",
    indicator: "bg-rose-600"
  },
};

// Ícones para cada atribuição
const ATRIBUICAO_ICONS: Record<string, React.ReactNode> = {
  all: <Calendar className="w-3.5 h-3.5" />,
  JURI: <Gavel className="w-3.5 h-3.5" />,
  VVD: <Shield className="w-3.5 h-3.5" />,
  EXECUCAO: <Lock className="w-3.5 h-3.5" />,
  CRIMINAL: <Scale className="w-3.5 h-3.5" />,
};

const ATRIBUICAO_OPTIONS = [
  { value: "all", label: "Todas as Audiências", shortLabel: "Todas" },
  { value: "JURI", label: "Júri", shortLabel: "Júri" },
  { value: "VVD", label: "VVD", shortLabel: "VVD" },
  { value: "EXECUCAO", label: "Execução", shortLabel: "Exec." },
  { value: "CRIMINAL", label: "Criminal", shortLabel: "Crim." },
];

// ==========================================
// TIPOS
// ==========================================

interface Audiencia {
  id: number;
  dataAudiencia: Date;
  horario?: string | null;
  tipo: string;
  status: "A_DESIGNAR" | "DESIGNADA" | "REALIZADA" | "AGUARDANDO_ATA" | "CONCLUIDA" | "ADIADA" | "CANCELADA";
  sala?: string | null;
  local?: string | null;
  juiz?: string | null;
  promotor?: string | null;
  anotacoes?: string | null;
  resumoDefesa?: string | null;
  googleCalendarEventId?: string | null;
  casoId?: number | null;
  casoTitulo?: string | null;
  assistidoId?: number | null;
  assistidoNome?: string | null;
  assistidoFoto?: string | null;
  assistidoPreso?: boolean;
  processoId?: number | null;
  numeroAutos?: string | null;
  vara?: string | null;
  comarca?: string | null;
  defensorNome?: string | null;
}

// ==========================================
// DADOS MOCK
// ==========================================

const MOCK_AUDIENCIAS: Audiencia[] = [
  {
    id: 1,
    dataAudiencia: new Date(),
    horario: "09:00",
    tipo: "INSTRUCAO",
    status: "DESIGNADA",
    sala: "3",
    local: "Fórum de Camaçari",
    juiz: "Dr. Carlos Mendes",
    promotor: "Dr. Fernando Costa",
    resumoDefesa: "Focar na nulidade da busca domiciliar sem mandado",
    casoId: 1,
    casoTitulo: "Homicídio Qualificado - Operação Reuso",
    assistidoId: 1,
    assistidoNome: "José Carlos Santos",
    assistidoPreso: true,
    processoId: 1,
    numeroAutos: "8002341-90.2025.8.05.0039",
    vara: "Vara do Júri",
    comarca: "Camaçari",
    defensorNome: "Dr. João Silva",
  },
  {
    id: 2,
    dataAudiencia: addDays(new Date(), 1),
    horario: "14:00",
    tipo: "CUSTODIA",
    status: "DESIGNADA",
    sala: "1",
    local: "Fórum de Camaçari",
    casoId: 2,
    casoTitulo: "Flagrante - Tráfico",
    assistidoId: 3,
    assistidoNome: "Maria Aparecida Silva",
    assistidoPreso: true,
    processoId: 3,
    numeroAutos: "8002500-10.2025.8.05.0039",
    vara: "Vara Criminal",
    comarca: "Camaçari",
    defensorNome: "Dra. Ana Paula",
  },
  {
    id: 3,
    dataAudiencia: addDays(new Date(), 3),
    horario: "10:00",
    tipo: "INSTRUCAO",
    status: "DESIGNADA",
    sala: "2",
    local: "Fórum de Camaçari",
    casoId: 1,
    casoTitulo: "Homicídio Qualificado - Operação Reuso",
    assistidoId: 2,
    assistidoNome: "Pedro Oliveira Lima",
    assistidoPreso: true,
    processoId: 2,
    numeroAutos: "8002342-75.2025.8.05.0039",
    vara: "Vara do Júri",
    comarca: "Camaçari",
    defensorNome: "Dr. João Silva",
  },
  {
    id: 4,
    dataAudiencia: addDays(new Date(), 7),
    horario: "09:30",
    tipo: "CONCILIACAO",
    status: "DESIGNADA",
    local: "CEJUSC Camaçari",
    assistidoId: 4,
    assistidoNome: "Carlos Eduardo",
    assistidoPreso: false,
    processoId: 4,
    numeroAutos: "8003100-50.2025.8.05.0039",
    vara: "Vara Cível",
    comarca: "Camaçari",
    defensorNome: "Dra. Maria Oliveira",
  },
  {
    id: 5,
    dataAudiencia: addDays(new Date(), -2),
    horario: "14:00",
    tipo: "INSTRUCAO",
    status: "REALIZADA",
    sala: "3",
    local: "Fórum de Camaçari",
    anotacoes: "Testemunha de acusação não compareceu. Juiz redesignou para nova data.",
    casoId: 3,
    casoTitulo: "Roubo Qualificado",
    assistidoId: 5,
    assistidoNome: "Roberto Silva",
    assistidoPreso: false,
    processoId: 5,
    numeroAutos: "8001200-30.2025.8.05.0039",
    vara: "Vara Criminal",
    comarca: "Camaçari",
    defensorNome: "Dr. João Silva",
  },
  {
    id: 6,
    dataAudiencia: addDays(new Date(), -1),
    horario: "10:00",
    tipo: "INSTRUCAO",
    status: "AGUARDANDO_ATA",
    sala: "2",
    local: "Fórum de Camaçari",
    assistidoId: 6,
    assistidoNome: "Antônio Pereira",
    assistidoPreso: true,
    processoId: 6,
    numeroAutos: "8001500-80.2025.8.05.0039",
    vara: "Vara do Júri",
    comarca: "Camaçari",
    defensorNome: "Dr. João Silva",
  },
  {
    id: 7,
    dataAudiencia: addDays(new Date(), 15),
    horario: "09:00",
    tipo: "PLENARIO_JURI",
    status: "DESIGNADA",
    sala: "Plenário",
    local: "Fórum de Camaçari",
    resumoDefesa: "Tese principal: legítima defesa. Quesito específico preparado.",
    casoId: 4,
    casoTitulo: "Tentativa de Homicídio - Brigas de Bar",
    assistidoId: 7,
    assistidoNome: "Fernando Costa",
    assistidoPreso: true,
    processoId: 7,
    numeroAutos: "8000800-20.2024.8.05.0039",
    vara: "Vara do Júri",
    comarca: "Camaçari",
    defensorNome: "Dr. João Silva",
  },
  {
    id: 8,
    dataAudiencia: addDays(new Date(), 10),
    horario: "14:30",
    tipo: "JUSTIFICACAO",
    status: "A_DESIGNAR",
    assistidoId: 8,
    assistidoNome: "Lucas Mendes",
    assistidoPreso: false,
    processoId: 8,
    numeroAutos: "8002800-15.2025.8.05.0039",
    vara: "Vara Criminal",
    comarca: "Camaçari",
  },
];

// ==========================================
// PÁGINA PRINCIPAL - DESIGN SUÍÇO
// ==========================================

export default function AudienciasPage() {
  const { currentAssignment } = useAssignment();
  const [areaFilter, setAreaFilter] = useState("all");
  
  // Filtrar por workspace se necessário
  const audiencias = MOCK_AUDIENCIAS;

  // Estatísticas
  const stats = useMemo(() => {
    const hoje = audiencias.filter(a => isToday(a.dataAudiencia) && a.status === "DESIGNADA").length;
    const amanha = audiencias.filter(a => isTomorrow(a.dataAudiencia) && a.status === "DESIGNADA").length;
    const aguardandoAta = audiencias.filter(a => a.status === "AGUARDANDO_ATA").length;
    const reuPreso = audiencias.filter(a => a.assistidoPreso && a.status === "DESIGNADA").length;
    return { hoje, amanha, aguardandoAta, reuPreso };
  }, [audiencias]);

  const handleAudienciaUpdate = async (id: number, data: Partial<Audiencia>) => {
    console.log("Atualizando audiência", id, "com:", data);
    // Implementar via tRPC
  };

  const handleCreateTask = (audiencia: Audiencia, taskType: string) => {
    console.log("Criando tarefa", taskType, "para audiência", audiencia.id);
    // Implementar via tRPC - criar demanda
  };

  // Configuração visual da atribuição selecionada
  const atribuicaoColors = ATRIBUICAO_COLORS[areaFilter] || ATRIBUICAO_COLORS.all;

  return (
    <TooltipProvider>
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header - Design Suíço */}
        <div className="space-y-4">
          {/* Linha superior: Título */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 sm:p-2.5 rounded-lg flex-shrink-0",
                atribuicaoColors.bg
              )}>
                <Calendar className={cn("w-5 h-5 sm:w-6 sm:h-6", atribuicaoColors.text)} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Agenda de Audiências
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  Gestão centralizada de audiências e prazos
                </p>
              </div>
            </div>
          </div>

          {/* Seletor de Atribuição - Tabs com cores dos workspaces */}
          <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
            <div className="flex gap-1 sm:gap-1.5 min-w-max border-b border-zinc-200 dark:border-zinc-800 pb-px">
              {ATRIBUICAO_OPTIONS.map((option) => {
                const isActive = areaFilter === option.value;
                const optionColors = ATRIBUICAO_COLORS[option.value] || ATRIBUICAO_COLORS.all;
                const count = option.value === "all" 
                  ? audiencias.length 
                  : 0; // Em produção, filtrar por area
                
                return (
                  <button
                    key={option.value}
                    onClick={() => setAreaFilter(option.value)}
                    className={cn(
                      "relative px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 flex-shrink-0 rounded-t-md",
                      isActive 
                        ? cn("text-zinc-900 dark:text-zinc-100", optionColors.bg)
                        : cn("text-zinc-500 dark:text-zinc-400", optionColors.hoverBg)
                    )}
                  >
                    <span className={cn(isActive ? optionColors.text : "text-zinc-400")}>{ATRIBUICAO_ICONS[option.value]}</span>
                    <span className="hidden sm:inline">{option.label}</span>
                    <span className="sm:hidden">{option.shortLabel}</span>
                    <span className={cn(
                      "ml-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full",
                      isActive 
                        ? cn(optionColors.text, "bg-white/60 dark:bg-black/20")
                        : "text-zinc-400 bg-zinc-100 dark:bg-zinc-800"
                    )}>
                      {option.value === "all" ? audiencias.length : "-"}
                    </span>
                    {isActive && (
                      <span className={cn(
                        "absolute bottom-0 left-0 right-0 h-0.5 rounded-full",
                        optionColors.indicator
                      )} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats Cards - Design Suíço com borda lateral */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <SwissCard className={cn(
            "border-l-2",
            stats.hoje > 0 ? "border-l-rose-500" : "border-l-zinc-300"
          )}>
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <AlertCircle className={cn(
                    "w-4 h-4 sm:w-5 sm:h-5",
                    stats.hoje > 0 ? "text-rose-500" : "text-zinc-400"
                  )} />
                </div>
                <div>
                  <p className={cn(
                    "text-xl sm:text-2xl font-bold",
                    stats.hoje > 0 ? "text-rose-700 dark:text-rose-400" : "text-zinc-700 dark:text-zinc-300"
                  )}>
                    {stats.hoje}
                  </p>
                  <p className={cn(
                    "text-[10px] sm:text-xs",
                    stats.hoje > 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"
                  )}>
                    Hoje
                  </p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className={cn(
            "border-l-2",
            stats.amanha > 0 ? "border-l-amber-500" : "border-l-zinc-300"
          )}>
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Clock className={cn(
                    "w-4 h-4 sm:w-5 sm:h-5",
                    stats.amanha > 0 ? "text-amber-500" : "text-zinc-400"
                  )} />
                </div>
                <div>
                  <p className={cn(
                    "text-xl sm:text-2xl font-bold",
                    stats.amanha > 0 ? "text-amber-700 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"
                  )}>
                    {stats.amanha}
                  </p>
                  <p className={cn(
                    "text-[10px] sm:text-xs",
                    stats.amanha > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-500"
                  )}>
                    Amanhã
                  </p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className={cn(
            "border-l-2",
            stats.aguardandoAta > 0 ? "border-l-orange-500" : "border-l-zinc-300"
          )}>
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <CheckCircle2 className={cn(
                    "w-4 h-4 sm:w-5 sm:h-5",
                    stats.aguardandoAta > 0 ? "text-orange-500" : "text-zinc-400"
                  )} />
                </div>
                <div>
                  <p className={cn(
                    "text-xl sm:text-2xl font-bold",
                    stats.aguardandoAta > 0 ? "text-orange-700 dark:text-orange-400" : "text-zinc-700 dark:text-zinc-300"
                  )}>
                    {stats.aguardandoAta}
                  </p>
                  <p className={cn(
                    "text-[10px] sm:text-xs",
                    stats.aguardandoAta > 0 ? "text-orange-600 dark:text-orange-400" : "text-zinc-500"
                  )}>
                    Aguard. Ata
                  </p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className={cn(
            "border-l-2",
            stats.reuPreso > 0 ? "border-l-rose-500" : "border-l-zinc-300"
          )}>
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Lock className={cn(
                    "w-4 h-4 sm:w-5 sm:h-5",
                    stats.reuPreso > 0 ? "text-rose-500" : "text-zinc-400"
                  )} />
                </div>
                <div>
                  <p className={cn(
                    "text-xl sm:text-2xl font-bold",
                    stats.reuPreso > 0 ? "text-rose-700 dark:text-rose-400" : "text-zinc-700 dark:text-zinc-300"
                  )}>
                    {stats.reuPreso}
                  </p>
                  <p className={cn(
                    "text-[10px] sm:text-xs",
                    stats.reuPreso > 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"
                  )}>
                    Réu Preso
                  </p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
        </div>

        {/* Audiências Hub */}
        <AudienciasHub
          audiencias={audiencias as any}
          onAudienciaUpdate={handleAudienciaUpdate}
          onCreateTask={handleCreateTask}
        />
      </div>
    </TooltipProvider>
  );
}
