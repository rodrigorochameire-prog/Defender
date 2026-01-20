"use client";

import { useState, useMemo } from "react";
import { SwissCard, SwissCardContent } from "@/components/shared/swiss-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  AlertTriangle,
  Clock,
  Timer,
  Calendar,
  Search,
  CheckCircle2,
  ChevronRight,
  AlertOctagon,
  Lock,
  Scale,
  Gavel,
  Shield,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format, differenceInDays, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  VIOLENCIA_DOMESTICA: { 
    border: "border-l-violet-600 dark:border-l-violet-500",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-400",
    hoverBg: "hover:bg-violet-50 dark:hover:bg-violet-900/20",
    indicator: "bg-violet-600"
  },
  EXECUCAO_PENAL: { 
    border: "border-l-blue-600 dark:border-l-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
    indicator: "bg-blue-600"
  },
  SUBSTITUICAO: { 
    border: "border-l-rose-600 dark:border-l-rose-500",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400",
    hoverBg: "hover:bg-rose-50 dark:hover:bg-rose-900/20",
    indicator: "bg-rose-600"
  },
};

// Ícones para cada atribuição
const ATRIBUICAO_ICONS: Record<string, React.ReactNode> = {
  all: <Clock className="w-3.5 h-3.5" />,
  JURI: <Gavel className="w-3.5 h-3.5" />,
  VIOLENCIA_DOMESTICA: <Shield className="w-3.5 h-3.5" />,
  EXECUCAO_PENAL: <Lock className="w-3.5 h-3.5" />,
  SUBSTITUICAO: <Scale className="w-3.5 h-3.5" />,
};

const ATRIBUICAO_OPTIONS = [
  { value: "all", label: "Todos os Prazos", shortLabel: "Todos" },
  { value: "JURI", label: "Júri", shortLabel: "Júri" },
  { value: "VIOLENCIA_DOMESTICA", label: "VVD", shortLabel: "VVD" },
  { value: "EXECUCAO_PENAL", label: "Exec. Penal", shortLabel: "EP" },
  { value: "SUBSTITUICAO", label: "Substituição", shortLabel: "Subst." },
];

// Dados mockados
const mockPrazos = [
  { 
    id: 1, 
    assistido: "Diego Bonfim Almeida",
    processo: "8012906-74.2025.8.05.0039",
    ato: "Resposta à Acusação",
    prazo: "2026-01-15",
    status: "2_ATENDER",
    area: "JURI",
    reuPreso: true,
    providencias: "Requerer diligências, verificar câmeras de segurança",
  },
  { 
    id: 4, 
    assistido: "Ana Paula Costa",
    processo: "0009012-34.2025.8.05.0039",
    ato: "Pedido de Relaxamento",
    prazo: "2026-01-14",
    status: "2_ATENDER",
    area: "VIOLENCIA_DOMESTICA",
    reuPreso: true,
    providencias: "Prisão ilegal, prazo expirado",
  },
  { 
    id: 8, 
    assistido: "Lucas Oliveira",
    processo: "0008901-23.2025.8.05.0039",
    ato: "Habeas Corpus",
    prazo: "2026-01-15",
    status: "2_ATENDER",
    area: "JURI",
    reuPreso: true,
    providencias: "Liberdade provisória com medidas",
  },
  { 
    id: 2, 
    assistido: "Maria Silva Santos",
    processo: "0001234-56.2025.8.05.0039",
    ato: "Alegações Finais",
    prazo: "2026-01-16",
    status: "5_FILA",
    area: "JURI",
    reuPreso: false,
    providencias: "Analisar provas, preparar tese de absolvição",
  },
  { 
    id: 7, 
    assistido: "Pedro Santos",
    processo: "0002345-67.2025.8.05.0039",
    ato: "Contrarrazões",
    prazo: "2026-01-17",
    status: "5_FILA",
    area: "EXECUCAO_PENAL",
    reuPreso: false,
    providencias: null,
  },
  { 
    id: 3, 
    assistido: "José Carlos Oliveira",
    processo: "0005678-90.2025.8.05.0039",
    ato: "Agravo em Execução",
    prazo: "2026-01-18",
    status: "4_MONITORAR",
    area: "EXECUCAO_PENAL",
    reuPreso: true,
    providencias: "Aguardando decisão do agravo",
  },
];

function getPrazoInfo(prazoStr: string) {
  const prazo = parseISO(prazoStr);
  const hoje = new Date();
  const dias = differenceInDays(prazo, hoje);
  
  if (isPast(prazo) && !isToday(prazo)) {
    return { 
      text: `Vencido`, 
      dias: Math.abs(dias),
      className: "text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400", 
      icon: AlertOctagon,
      urgent: true 
    };
  }
  if (isToday(prazo)) {
    return { 
      text: "Hoje", 
      dias: 0,
      className: "text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 font-bold", 
      icon: Timer,
      urgent: true 
    };
  }
  if (isTomorrow(prazo)) {
    return { 
      text: "Amanhã", 
      dias: 1,
      className: "text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400", 
      icon: Clock,
      urgent: true 
    };
  }
  if (dias <= 3) {
    return { 
      text: `${dias}d`, 
      dias,
      className: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400", 
      icon: Clock,
      urgent: false 
    };
  }
  if (dias <= 7) {
    return { 
      text: `${dias}d`, 
      dias,
      className: "text-sky-600 bg-sky-50 dark:bg-sky-900/20 dark:text-sky-400", 
      icon: Calendar,
      urgent: false 
    };
  }
  return { 
    text: format(prazo, "dd/MM", { locale: ptBR }), 
    dias,
    className: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400", 
    icon: Calendar,
    urgent: false 
  };
}

export default function PrazosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [periodoFilter, setPeriodoFilter] = useState("all");

  // Filtrar e ordenar
  const filteredPrazos = useMemo(() => {
    return mockPrazos
      .filter((prazo) => {
        const matchesSearch = 
          prazo.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prazo.processo.includes(searchTerm) ||
          prazo.ato.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesArea = areaFilter === "all" || prazo.area === areaFilter;
        
        if (periodoFilter === "all") return matchesSearch && matchesArea;
        
        const prazoDate = parseISO(prazo.prazo);
        const hoje = new Date();
        
        if (periodoFilter === "vencido") return matchesSearch && matchesArea && isPast(prazoDate) && !isToday(prazoDate);
        if (periodoFilter === "hoje") return matchesSearch && matchesArea && isToday(prazoDate);
        if (periodoFilter === "amanha") return matchesSearch && matchesArea && isTomorrow(prazoDate);
        if (periodoFilter === "semana") return matchesSearch && matchesArea && differenceInDays(prazoDate, hoje) <= 7;
        
        return matchesSearch && matchesArea;
      })
      .sort((a, b) => {
        // Réu preso primeiro
        if (a.reuPreso && !b.reuPreso) return -1;
        if (!a.reuPreso && b.reuPreso) return 1;
        // Depois por prazo
        return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
      });
  }, [searchTerm, areaFilter, periodoFilter]);

  const stats = useMemo(() => ({
    vencidos: mockPrazos.filter(p => isPast(parseISO(p.prazo)) && !isToday(parseISO(p.prazo))).length,
    hoje: mockPrazos.filter(p => isToday(parseISO(p.prazo))).length,
    amanha: mockPrazos.filter(p => isTomorrow(parseISO(p.prazo))).length,
    semana: mockPrazos.filter(p => {
      const dias = differenceInDays(parseISO(p.prazo), new Date());
      return dias > 1 && dias <= 7;
    }).length,
    reuPreso: mockPrazos.filter(p => p.reuPreso).length,
  }), []);

  // Configuração visual da atribuição selecionada
  const atribuicaoColors = ATRIBUICAO_COLORS[areaFilter] || ATRIBUICAO_COLORS.all;

  return (
    <TooltipProvider>
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header - Design Suíço */}
        <div className="space-y-4">
          {/* Linha superior: Título + Ações */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 sm:p-2.5 rounded-lg flex-shrink-0",
                atribuicaoColors.bg
              )}>
                <Clock className={cn("w-5 h-5 sm:w-6 sm:h-6", atribuicaoColors.text)} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Prazos Urgentes
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  Acompanhamento de prazos e demandas
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
                  ? mockPrazos.length 
                  : mockPrazos.filter(p => p.area === option.value).length;
                
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
                      {count}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          <SwissCard className="border-l-2 border-l-rose-600">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <AlertOctagon className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-400">{stats.vencidos}</p>
                  <p className="text-[10px] sm:text-xs text-rose-600 dark:text-rose-400">Vencidos</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-2 border-l-rose-500">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-400">{stats.hoje}</p>
                  <p className="text-[10px] sm:text-xs text-rose-600 dark:text-rose-400">Hoje</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-2 border-l-amber-500">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.amanha}</p>
                  <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400">Amanhã</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-2 border-l-sky-500 hidden sm:block">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-sky-700 dark:text-sky-400">{stats.semana}</p>
                  <p className="text-[10px] sm:text-xs text-sky-600 dark:text-sky-400">7 dias</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>

          <SwissCard className="border-l-2 border-l-rose-500 hidden lg:block">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-400">{stats.reuPreso}</p>
                  <p className="text-[10px] sm:text-xs text-rose-600 dark:text-rose-400">Réu Preso</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
        </div>

        {/* Filters - Design Suíço */}
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Buscar por assistido, processo ou ato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-zinc-950 h-9 text-sm"
              />
            </div>

            <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
              <SelectTrigger className="w-[120px] sm:w-[160px] h-9 text-xs sm:text-sm flex-shrink-0">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="vencido">Vencidos</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="amanha">Amanhã</SelectItem>
                <SelectItem value="semana">7 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de Prazos - Design Suíço */}
        <div className="space-y-3">
          {filteredPrazos.map((prazo) => {
            const prazoInfo = getPrazoInfo(prazo.prazo);
            const PrazoIcon = prazoInfo.icon;
            const areaColors = ATRIBUICAO_COLORS[prazo.area] || ATRIBUICAO_COLORS.all;
            
            return (
              <SwissCard 
                key={prazo.id} 
                className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  "border-l-[3px]",
                  prazo.reuPreso 
                    ? "border-l-rose-500 dark:border-l-rose-400" 
                    : "border-l-emerald-500 dark:border-l-emerald-400",
                  prazoInfo.urgent && "ring-1 ring-rose-200 dark:ring-rose-900/50"
                )}
              >
                <SwissCardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 space-y-2 min-w-0">
                      {/* Badges */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <Badge className={cn(
                          "text-[9px] sm:text-[10px] px-1.5 py-0 rounded-md border-0",
                          prazoInfo.className
                        )}>
                          <PrazoIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />
                          {prazoInfo.text}
                        </Badge>
                        
                        {prazo.reuPreso && (
                          <Badge className="text-[9px] sm:text-[10px] px-1.5 py-0 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-0 font-bold">
                            <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" /> Preso
                          </Badge>
                        )}
                        
                        <Badge className={cn(
                          "text-[9px] sm:text-[10px] px-1.5 py-0 rounded-md border-0",
                          areaColors.bg, areaColors.text
                        )}>
                          {ATRIBUICAO_OPTIONS.find(o => o.value === prazo.area)?.shortLabel || prazo.area}
                        </Badge>
                      </div>
                      
                      {/* Ato e Assistido */}
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">{prazo.ato}</h3>
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">{prazo.assistido}</p>
                        <p className="text-[10px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-500">{prazo.processo}</p>
                      </div>
                      
                      {/* Providências */}
                      {prazo.providencias && (
                        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                          <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Providências:</span> {prazo.providencias}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Ações */}
                    <div className="flex flex-col gap-1.5 sm:gap-2 flex-shrink-0">
                      <Link href={`/admin/demandas/${prazo.id}`}>
                        <Button variant="outline" size="sm" className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1">
                          Ver
                          <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </Button>
                      </Link>
                      <Button size="sm" className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1">
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        Concluir
                      </Button>
                    </div>
                  </div>
                </SwissCardContent>
              </SwissCard>
            );
          })}
          
          {/* Empty State */}
          {filteredPrazos.length === 0 && (
            <SwissCard className="border-dashed">
              <SwissCardContent className="text-center py-16">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nenhum prazo urgente
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Todos os prazos estão em dia!
                </p>
              </SwissCardContent>
            </SwissCard>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
