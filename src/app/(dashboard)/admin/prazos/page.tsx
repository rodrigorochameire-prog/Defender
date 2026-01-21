"use client";

import { useState, useMemo } from "react";
import { SwissCard, SwissCardContent } from "@/components/ui/swiss-card";
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
import { PrisonerIndicator } from "@/components/shared/prisoner-indicator";
import { format, differenceInDays, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

// ==========================================
// CONSTANTES - DESIGN SUÍÇO
// ==========================================

// Cores alinhadas com os workspaces
// Cores de atribuição NEUTRAS para reduzir poluição visual
const ATRIBUICAO_COLORS: Record<string, { 
  border: string; 
  bg: string; 
  text: string;
  hoverBg: string;
  indicator: string;
}> = {
  all: { 
    border: "border-l-zinc-300", 
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    hoverBg: "hover:bg-zinc-100 dark:hover:bg-zinc-800",
    indicator: "bg-zinc-500"
  },
  JURI: { 
    border: "border-l-zinc-400", 
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    hoverBg: "hover:bg-zinc-50 dark:hover:bg-zinc-800/80",
    indicator: "bg-zinc-500"
  },
  VIOLENCIA_DOMESTICA: { 
    border: "border-l-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    hoverBg: "hover:bg-zinc-50 dark:hover:bg-zinc-800/80",
    indicator: "bg-zinc-500"
  },
  EXECUCAO_PENAL: { 
    border: "border-l-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    hoverBg: "hover:bg-zinc-50 dark:hover:bg-zinc-800/80",
    indicator: "bg-zinc-500"
  },
  SUBSTITUICAO: { 
    border: "border-l-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    hoverBg: "hover:bg-zinc-50 dark:hover:bg-zinc-800/80",
    indicator: "bg-zinc-500"
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
      <div className="space-y-6 p-6">
        {/* Header - COM FUNDO */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 mb-5 border-b-2 border-border/70 bg-gradient-to-r from-muted/30 via-muted/10 to-transparent -mx-6 px-6 pt-4 rounded-t-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-md flex-shrink-0">
              <Clock className="w-7 h-7 md:w-8 md:h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                Prazos Urgentes
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Acompanhamento de prazos e demandas
              </p>
            </div>
          </div>
        </div>

          {/* Seletor de Atribuição - Tabs Premium */}
          <div className="overflow-x-auto scrollbar-hide -mx-6 px-3 sm:px-6">
            <div className="flex gap-0 min-w-max border-b-2 border-border/50 bg-muted/10 px-3 pt-2 rounded-t-lg">
              {ATRIBUICAO_OPTIONS.map((option) => {
                const isActive = areaFilter === option.value;
                const count = option.value === "all" 
                  ? mockPrazos.length 
                  : mockPrazos.filter(p => p.area === option.value).length;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => setAreaFilter(option.value)}
                    className={cn(
                      "relative px-4 py-2.5 text-sm font-medium transition-all duration-200 flex items-center gap-2 flex-shrink-0",
                      "border-b-2",
                      isActive 
                        ? "text-primary border-b-primary font-semibold"
                        : "text-muted-foreground border-b-transparent hover:text-foreground hover:border-b-border"
                    )}
                  >
                    <span className={cn(
                      "flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}>{ATRIBUICAO_ICONS[option.value]}</span>
                    <span className="hidden sm:inline">{option.label}</span>
                    <span className="sm:hidden">{option.shortLabel}</span>
                    <span className={cn(
                      "flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold",
                      isActive 
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        {/* Stats Cards - PROPORCIONAIS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SwissCard className="border-l-[3px] border-l-rose-600 border-2 border-border/60 hover:shadow-md transition-all hover:scale-[1.01]">
            <SwissCardContent className="p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 shadow-sm flex-shrink-0">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-rose-700 dark:text-rose-400 tracking-tight">{stats.vencidos}</p>
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider mt-0.5">Vencidos</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-[4px] border-l-rose-500 border-2 border-border/60 hover:shadow-lg transition-all hover:scale-[1.02]">
            <SwissCardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/30 shadow-sm flex-shrink-0">
                  <Timer className="w-6 h-6 md:w-7 md:h-7 text-rose-600" />
                </div>
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-rose-700 dark:text-rose-400 tracking-tight">{stats.hoje}</p>
                  <p className="text-sm md:text-base text-rose-600 dark:text-rose-400 font-semibold mt-1">Hoje</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-[4px] border-l-amber-500 border-2 border-border/60 hover:shadow-lg transition-all hover:scale-[1.02]">
            <SwissCardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 shadow-sm flex-shrink-0">
                  <Clock className="w-6 h-6 md:w-7 md:h-7 text-amber-600" />
                </div>
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-amber-700 dark:text-amber-400 tracking-tight">{stats.amanha}</p>
                  <p className="text-sm md:text-base text-amber-600 dark:text-amber-400 font-semibold mt-1">Amanhã</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-[4px] border-l-sky-500 border-2 border-border/60 hover:shadow-lg transition-all hover:scale-[1.02] hidden sm:block">
            <SwissCardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-3 rounded-xl bg-sky-100 dark:bg-sky-900/30 shadow-sm flex-shrink-0">
                  <Calendar className="w-6 h-6 md:w-7 md:w-7 text-sky-600" />
                </div>
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-sky-700 dark:text-sky-400 tracking-tight">{stats.semana}</p>
                  <p className="text-sm md:text-base text-sky-600 dark:text-sky-400 font-semibold mt-1">7 dias</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>

          <SwissCard className="border-l-[4px] border-l-rose-500 border-2 border-border/60 hover:shadow-lg transition-all hover:scale-[1.02] hidden lg:block">
            <SwissCardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/30 shadow-sm flex-shrink-0">
                  <Lock className="w-6 h-6 md:w-7 md:h-7 text-rose-600" />
                </div>
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-rose-700 dark:text-rose-400 tracking-tight">{stats.reuPreso}</p>
                  <p className="text-sm md:text-base text-rose-600 dark:text-rose-400 font-semibold mt-1">Réu Preso</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
        </div>

        {/* Filters - EQUILIBRADOS */}
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/30 border-2 border-border/40">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por assistido, processo ou ato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card border-2 border-border/60 h-10 text-sm md:text-base rounded-lg"
              />
            </div>

            <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
              <SelectTrigger className="w-[130px] sm:w-[160px] h-10 text-sm flex-shrink-0 border-2 rounded-lg">
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

        {/* Lista de Prazos - EQUILIBRADA */}
        <div className="space-y-3">
          {filteredPrazos.map((prazo) => {
            const prazoInfo = getPrazoInfo(prazo.prazo);
            const PrazoIcon = prazoInfo.icon;
            const areaColors = ATRIBUICAO_COLORS[prazo.area] || ATRIBUICAO_COLORS.all;
            
            return (
              <SwissCard 
                key={prazo.id} 
                className={cn(
                  "transition-all duration-200 hover:shadow-md hover:scale-[1.005]",
                  "border-l-[3px] border-2 border-border/60 hover:border-border",
                  prazo.reuPreso 
                    ? "border-l-rose-500 dark:border-l-rose-400" 
                    : "border-l-zinc-300 dark:border-l-zinc-600",
                  prazoInfo.urgent && "ring-1 ring-rose-200 dark:ring-rose-900/50"
                )}
              >
                <SwissCardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2 min-w-0">
                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className={cn(
                          "text-xs px-2.5 py-1 rounded-lg border-0 font-bold",
                          prazoInfo.className
                        )}>
                          <PrazoIcon className="w-3.5 h-3.5 mr-1" />
                          {prazoInfo.text}
                        </Badge>
                        
                        <PrisonerIndicator preso={prazo.reuPreso} size="sm" />
                        
                        <Badge className={cn(
                          "text-xs px-2.5 py-1 rounded-lg border-0 font-semibold",
                          areaColors.bg, areaColors.text
                        )}>
                          {ATRIBUICAO_OPTIONS.find(o => o.value === prazo.area)?.shortLabel || prazo.area}
                        </Badge>
                      </div>
                      
                      {/* Ato e Assistido */}
                      <div className="space-y-0.5">
                        <h3 className="font-bold text-base md:text-lg">{prazo.ato}</h3>
                        <p className="text-sm md:text-base text-muted-foreground">{prazo.assistido}</p>
                        <p className="text-xs md:text-sm font-mono text-muted-foreground/80">{prazo.processo}</p>
                      </div>
                      
                      {/* Providências */}
                      {prazo.providencias && (
                        <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-foreground">Providências:</span> {prazo.providencias}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Ações */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Link href={`/admin/demandas/${prazo.id}`}>
                        <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5 px-3 border-2">
                          Ver
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button size="sm" className="h-9 text-sm gap-1.5 px-3">
                        <CheckCircle2 className="w-4 h-4" />
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
            <SwissCard className="border-dashed border-2">
              <SwissCardContent className="text-center py-16">
                <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-5">
                  <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-emerald-500" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2">
                  Nenhum prazo urgente
                </h3>
                <p className="text-sm md:text-base text-muted-foreground">
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
