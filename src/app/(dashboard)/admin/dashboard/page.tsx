"use client";

import { useState } from "react";
import { SwissCard, SwissCardContent, SwissCardHeader, SwissCardTitle, SwissCardDescription } from "@/components/ui/swiss-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  AlertTriangle,
  Clock, 
  Plus,
  ChevronRight,
  Scale,
  Gavel,
  FileText,
  Timer,
  Target,
  Briefcase,
  AlertOctagon,
  CheckCircle2,
  ArrowUpRight,
  BarChart3,
  Shield,
  Lock,
  Award,
  TrendingUp,
  Calculator,
  Layers,
  Building2,
  CalendarClock,
  CalendarDays,
  UserCheck,
  FileCheck2,
  ClipboardList,
  AlertCircle,
  ArrowRight,
  Percent,
  Bell,
  Activity,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { useAssignment, ASSIGNMENT_CONFIGS, Assignment } from "@/contexts/assignment-context";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Cores dinâmicas baseadas na atribuição
function useAssignmentColors() {
  const { config } = useAssignment();
  return {
    fatal: config.accentColor,
    urgente: "hsl(35, 75%, 55%)",
    andamento: "hsl(158, 50%, 45%)",
    arquivado: "hsl(160, 8%, 55%)",
    primary: config.accentColor,
  };
}

// Dados mockados para demonstração
const mockStats = {
  reusPresos: 42,
  prazosHoje: 8,
  prazosSemana: 23,
  prazosVencidos: 2,
  audienciasHoje: 3,
  audienciasSemana: 12,
  jurisMes: 4,
  demandas: {
    fila: 45,
    atender: 28,
    monitorar: 15,
    protocolado: 67,
  },
  totalAssistidos: 156,
  totalProcessos: 287,
  atendimentosHoje: 5,
  atendimentosSemana: 18,
  casosAtivos: 89,
  taxaCumprimento: 94,
  mediaTempoResposta: 3.2,
};

const mockPrazosUrgentes = [
  { id: 1, assistido: "Diego Bonfim Almeida", processo: "8012906-74.2025.8.05.0039", ato: "Resposta à Acusação", prazo: "Hoje", prioridade: "REU_PRESO", diasRestantes: 0 },
  { id: 2, assistido: "Maria Silva Santos", processo: "0001234-56.2025.8.05.0039", ato: "Alegações Finais", prazo: "Amanhã", prioridade: "URGENTE", diasRestantes: 1 },
  { id: 3, assistido: "José Carlos Oliveira", processo: "0005678-90.2025.8.05.0039", ato: "Memoriais", prazo: "Em 2 dias", prioridade: "ALTA", diasRestantes: 2 },
  { id: 4, assistido: "Ana Paula Costa", processo: "0009012-34.2025.8.05.0039", ato: "Recurso em Sentido Estrito", prazo: "Em 3 dias", prioridade: "NORMAL", diasRestantes: 3 },
  { id: 5, assistido: "Roberto Lima Silva", processo: "0007654-21.2025.8.05.0039", ato: "Contrarrazões", prazo: "Em 4 dias", prioridade: "NORMAL", diasRestantes: 4 },
];

const mockAudienciasProximas = [
  { id: 1, hora: "09:00", data: "Hoje", assistido: "Carlos Eduardo Lima", tipo: "Instrução", vara: "1ª Vara Criminal", status: "confirmada" },
  { id: 2, hora: "14:00", data: "Hoje", assistido: "Maria Fernanda Souza", tipo: "Custódia", vara: "CEAC", status: "confirmada" },
  { id: 3, hora: "16:00", data: "Hoje", assistido: "Pedro Henrique Alves", tipo: "Justificação", vara: "VEC", status: "pendente" },
  { id: 4, hora: "10:00", data: "Amanhã", assistido: "Luiza Pereira", tipo: "Instrução", vara: "2ª Vara Criminal", status: "confirmada" },
  { id: 5, hora: "14:30", data: "22/01", assistido: "Marcos Santos", tipo: "Conciliação", vara: "V. Doméstica", status: "pendente" },
];

const mockAtendimentos = [
  { id: 1, hora: "08:30", assistido: "Ana Carolina Dias", tipo: "presencial", assunto: "Orientação processual" },
  { id: 2, hora: "10:00", assistido: "Francisco José", tipo: "telefone", assunto: "Andamento do processo" },
  { id: 3, hora: "11:30", assistido: "Joana Silva", tipo: "videoconferencia", assunto: "Preparação para audiência" },
  { id: 4, hora: "14:00", assistido: "Familiar de Ricardo Alves", tipo: "presencial", assunto: "Visita ao presídio" },
  { id: 5, hora: "15:30", assistido: "Marina Costa", tipo: "presencial", assunto: "Documentação" },
];

const mockJurisProximos = [
  { id: 1, data: "17/01", hora: "09:00", assistido: "Roberto Silva", crime: "Art. 121 §2º", defensor: "Dr. Rodrigo", comarca: "Camaçari" },
  { id: 2, data: "19/01", hora: "09:00", assistido: "Marcos Souza", crime: "Art. 121 c/c 14, II", defensor: "Dra. Juliane", comarca: "Salvador" },
  { id: 3, data: "24/01", hora: "09:00", assistido: "João Pedro Costa", crime: "Art. 121", defensor: "Dr. Rodrigo", comarca: "Camaçari" },
  { id: 4, data: "31/01", hora: "09:00", assistido: "Lucas Oliveira", crime: "Art. 121 §2º, I", defensor: "Dr. Marcos", comarca: "Lauro de Freitas" },
];

// Dados para gráficos
const mockDemandasPorStatus = [
  { name: "Atender", value: 28, color: "hsl(0, 65%, 55%)" },
  { name: "Fila", value: 45, color: "hsl(35, 70%, 55%)" },
  { name: "Monitorar", value: 15, color: "hsl(210, 60%, 55%)" },
  { name: "Protocolado", value: 67, color: "hsl(158, 55%, 42%)" },
];

const mockEvolucaoSemanal = [
  { dia: "Seg", protocolados: 12, recebidos: 8 },
  { dia: "Ter", protocolados: 15, recebidos: 11 },
  { dia: "Qua", protocolados: 9, recebidos: 14 },
  { dia: "Qui", protocolados: 18, recebidos: 10 },
  { dia: "Sex", protocolados: 22, recebidos: 7 },
  { dia: "Sáb", protocolados: 5, recebidos: 2 },
  { dia: "Dom", protocolados: 0, recebidos: 0 },
];

const mockPrazosPorArea = [
  { area: "Júri", quantidade: 12 },
  { area: "V. Doméstica", quantidade: 18 },
  { area: "Exec. Penal", quantidade: 8 },
  { area: "Substituição", quantidade: 25 },
];

function getPrioridadeStyle(prioridade: string) {
  switch (prioridade) {
    case "REU_PRESO":
      return { bg: "bg-red-50 dark:bg-red-950/50", text: "text-red-700 dark:text-red-400", dot: "bg-red-500", label: "RÉU PRESO" };
    case "URGENTE":
      return { bg: "bg-orange-50 dark:bg-orange-950/50", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500", label: "URGENTE" };
    case "ALTA":
      return { bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", label: "ALTA" };
    default:
      return { bg: "bg-zinc-50 dark:bg-zinc-900", text: "text-zinc-600 dark:text-zinc-400", dot: "bg-zinc-400", label: "NORMAL" };
  }
}

function getStatusAudienciaStyle(status: string) {
  switch (status) {
    case "confirmada":
      return { bg: "bg-emerald-50 dark:bg-emerald-950/50", text: "text-emerald-700 dark:text-emerald-400" };
    case "pendente":
      return { bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-700 dark:text-amber-400" };
    default:
      return { bg: "bg-zinc-50 dark:bg-zinc-900", text: "text-zinc-600 dark:text-zinc-400" };
  }
}

function getTipoAtendimentoIcon(tipo: string) {
  switch (tipo) {
    case "presencial":
      return <Users className="h-3.5 w-3.5" />;
    case "telefone":
      return <Bell className="h-3.5 w-3.5" />;
    case "videoconferencia":
      return <Calendar className="h-3.5 w-3.5" />;
    default:
      return <Users className="h-3.5 w-3.5" />;
  }
}

// Títulos específicos por atribuição
const DASHBOARD_TITLES: Record<string, { title: string; subtitle: string }> = {
  JURI_CAMACARI: {
    title: "Painel do Júri",
    subtitle: "Gestão de processos e plenários da Vara do Júri de Camaçari",
  },
  VVD_CAMACARI: {
    title: "Central Violência Doméstica",
    subtitle: "Proteção à mulher - Celeridade e acolhimento",
  },
  EXECUCAO_PENAL: {
    title: "Painel de Execução",
    subtitle: "Benefícios, progressões e incidentes",
  },
  SUBSTITUICAO: {
    title: "Central de Demandas",
    subtitle: "Gestão de substituições e prazos",
  },
  GRUPO_JURI: {
    title: "Grupo Especial do Júri",
    subtitle: "Plenários pelo Estado da Bahia",
  },
};

// Modo de visualização do dashboard
type DashboardMode = "all_workspaces" | "current_workspace";

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<"overview" | "analytics">("overview");
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>("current_workspace");
  const { currentAssignment, config } = useAssignment();
  
  const dashboardInfo = dashboardMode === "all_workspaces" 
    ? { title: "Central de Gestão", subtitle: "Visão integrada de todos os workspaces" }
    : (DASHBOARD_TITLES[currentAssignment] || DASHBOARD_TITLES.SUBSTITUICAO);

  return (
    <TooltipProvider>
    <div className="space-y-6 p-6">
      {/* Mode Selector - Todos vs Específico */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-border/50 bg-muted/10 -mx-6 px-6 pt-4 rounded-t-xl">
        <div className="flex items-center gap-1.5 p-2 bg-muted/60 dark:bg-muted/30 rounded-xl border-2 border-border/40">
          <UITooltip>
            <TooltipTrigger asChild>
              <Button
                variant={dashboardMode === "all_workspaces" ? "accent" : "ghost"}
                size="sm"
                onClick={() => setDashboardMode("all_workspaces")}
                className={`gap-2 rounded-lg transition-all font-semibold px-4 py-2.5 text-sm md:text-base ${
                  dashboardMode === "all_workspaces" 
                    ? "shadow-lg text-white" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="h-5 w-5" />
                <span className="hidden sm:inline">Central Integrada</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Gestão unificada de todos os workspaces</p>
            </TooltipContent>
          </UITooltip>
          
          <UITooltip>
            <TooltipTrigger asChild>
              <Button
                variant={dashboardMode === "current_workspace" ? "accent" : "ghost"}
                size="sm"
                onClick={() => setDashboardMode("current_workspace")}
                className={`gap-2 rounded-lg transition-all font-semibold px-4 py-2.5 text-sm md:text-base ${
                  dashboardMode === "current_workspace" 
                    ? "shadow-lg text-white" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="h-5 w-5" />
                <span className="hidden sm:inline">{config.shortName}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Painel do workspace atual: {config.name}</p>
            </TooltipContent>
          </UITooltip>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={activeView === "overview" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("overview")}
            className={`rounded-lg font-semibold px-5 py-2.5 text-sm md:text-base ${activeView === "overview" ? "text-white shadow-md" : ""}`}
          >
            Visão Geral
          </Button>
          <Button
            variant={activeView === "analytics" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("analytics")}
            className={`rounded-lg font-semibold px-5 py-2.5 text-sm md:text-base ${activeView === "analytics" ? "text-white shadow-md" : ""}`}
          >
            Análises
          </Button>
        </div>
      </div>

      {/* Header - COM FUNDO ORGANIZACIONAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 mb-5 border-b-2 border-border/50 bg-gradient-to-r from-muted/30 via-muted/10 to-transparent -mx-6 px-6 pt-4 rounded-t-xl">
        <div className="flex items-center gap-4">
          <div 
            className={`h-14 w-14 md:h-16 md:w-16 rounded-2xl flex items-center justify-center shadow-md transition-all ${
              dashboardMode === "all_workspaces" ? "ring-2 ring-offset-2 ring-offset-background" : ""
            }`}
            style={{
              background: dashboardMode === "all_workspaces" 
                ? `linear-gradient(145deg, hsl(158, 55%, 42%), hsl(158, 50%, 32%))`
                : `linear-gradient(145deg, ${config.accentColor}, ${config.accentColorDark})`,
              ["--tw-ring-color" as string]: config.accentColor,
            }}
          >
            {dashboardMode === "all_workspaces" ? (
              <Layers className="h-7 w-7 md:h-8 md:w-8 text-white" />
            ) : (
              <BarChart3 className="h-7 w-7 md:h-8 md:w-8 text-white" />
            )}
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">{dashboardInfo.title}</h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {dashboardInfo.subtitle}
            </p>
            <p className="text-sm text-muted-foreground/70">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>
      </div>

      {activeView === "overview" ? (
        <>
          {/* SEÇÃO 1: INDICADORES RÁPIDOS - EQUILIBRADOS */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {/* Prazos Hoje */}
            <SwissCard className="border-l-[3px] border-l-orange-500 dark:border-l-orange-400 group hover:shadow-md transition-all hover:scale-[1.01]">
              <SwissCardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Timer className="h-5 w-5 text-orange-600" />
                  </div>
                  <p className="text-3xl md:text-4xl font-bold text-orange-600 tracking-tight">{mockStats.prazosHoje}</p>
                </div>
                <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Prazos Hoje</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">{mockStats.prazosSemana} na semana</span>
                  {mockStats.prazosVencidos > 0 && (
                    <Badge className="text-xs px-1.5 py-0 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-0">
                      {mockStats.prazosVencidos} venc.
                    </Badge>
                  )}
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Audiências Hoje */}
            <SwissCard className="border-l-[3px] border-l-blue-500 dark:border-l-blue-400 group hover:shadow-md transition-all hover:scale-[1.01]">
              <SwissCardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-3xl md:text-4xl font-bold text-blue-600 tracking-tight">{mockStats.audienciasHoje}</p>
                </div>
                <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Audiências Hoje</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">{mockStats.audienciasSemana} na semana</span>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Atendimentos Hoje */}
            <SwissCard className="border-l-[3px] border-l-purple-500 dark:border-l-purple-400 group hover:shadow-md transition-all hover:scale-[1.01]">
              <SwissCardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <UserCheck className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-3xl md:text-4xl font-bold text-purple-600 tracking-tight">{mockStats.atendimentosHoje}</p>
                </div>
                <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Atendimentos</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">{mockStats.atendimentosSemana} na semana</span>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Júris do Mês */}
            <SwissCard className="border-l-[3px] border-l-emerald-500 dark:border-l-emerald-400 group hover:shadow-md transition-all hover:scale-[1.01]">
              <SwissCardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Gavel className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-3xl md:text-4xl font-bold text-emerald-600 tracking-tight">{mockStats.jurisMes}</p>
                </div>
                <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Júris no Mês</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">Sessões plenárias</span>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Taxa de Cumprimento */}
            <SwissCard className="border-l-[3px] border-l-teal-500 dark:border-l-teal-400 group hover:shadow-md transition-all hover:scale-[1.01]">
              <SwissCardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                    <CheckCircle2 className="h-5 w-5 text-teal-600" />
                  </div>
                  <p className="text-3xl md:text-4xl font-bold text-teal-600 tracking-tight">{mockStats.taxaCumprimento}%</p>
                </div>
                <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cumprimento</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">Prazos em dia</span>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Tempo Médio de Resposta */}
            <SwissCard className="border-l-[3px] border-l-slate-400 dark:border-l-slate-500 group hover:shadow-md transition-all hover:scale-[1.01]">
              <SwissCardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Activity className="h-5 w-5 text-slate-600" />
                  </div>
                  <p className="text-3xl md:text-4xl font-bold tracking-tight">{mockStats.mediaTempoResposta}d</p>
                </div>
                <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tempo Médio</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">Para protocolar</span>
                </div>
              </SwissCardContent>
            </SwissCard>
          </div>

          {/* SEÇÃO 2: PRIORIDADES DO DIA - Grid Principal */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Coluna 1: Prazos e Demandas Urgentes */}
            <SwissCard className="lg:col-span-2 border-2 border-border/60">
              <SwissCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-rose-600" />
                    </div>
                    <div>
                      <SwissCardTitle className="text-base md:text-lg font-bold">Prazos e Demandas Urgentes</SwissCardTitle>
                      <SwissCardDescription className="mt-1 text-sm">
                        Atenção imediata necessária
                      </SwissCardDescription>
                    </div>
                  </div>
                  <Link href="/admin/demandas?urgente=true">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-sm h-9 px-3">
                      Ver todos
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </SwissCardHeader>
              <SwissCardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {mockPrazosUrgentes.map((prazo) => {
                    const style = getPrioridadeStyle(prazo.prioridade);
                    return (
                      <Link key={prazo.id} href={`/admin/demandas/${prazo.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                          <div className={`w-1 h-10 rounded-full ${style.dot} flex-shrink-0`} />
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm md:text-base truncate">{prazo.assistido}</p>
                              <Badge variant="outline" className={`text-xs font-bold ${style.text} px-2 py-0.5`}>
                                {style.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{prazo.ato}</p>
                            <p className="text-xs font-mono text-muted-foreground/80 truncate">{prazo.processo}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold ${prazo.diasRestantes === 0 ? "text-red-600" : prazo.diasRestantes === 1 ? "text-orange-600" : "text-muted-foreground"}`}>
                              {prazo.prazo}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Coluna 2: Atendimentos do Dia */}
            <SwissCard className="border-2 border-border/60">
              <SwissCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <UserCheck className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                    </div>
                    <div>
                      <SwissCardTitle className="text-base md:text-lg font-bold">Atendimentos</SwissCardTitle>
                      <SwissCardDescription className="mt-1 text-sm">
                        {mockAtendimentos.length} agendados hoje
                      </SwissCardDescription>
                    </div>
                  </div>
                </div>
              </SwissCardHeader>
              <SwissCardContent className="p-4 pt-0">
                {mockAtendimentos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <UserCheck className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Sem atendimentos hoje</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mockAtendimentos.slice(0, 5).map((atendimento) => (
                      <div
                        key={atendimento.id}
                        className="flex items-center gap-2 sm:gap-3 p-3 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                      >
                        <div className="text-center min-w-[44px] bg-purple-100 dark:bg-purple-900/30 rounded-md py-1.5 px-2">
                          <p className="text-xs md:text-sm font-bold font-mono text-purple-700 dark:text-purple-300">{atendimento.hora}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm md:text-base truncate">{atendimento.assistido}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-muted-foreground">{getTipoAtendimentoIcon(atendimento.tipo)}</span>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">{atendimento.assunto}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SwissCardContent>
            </SwissCard>
          </div>

          {/* SEÇÃO 3: AUDIÊNCIAS E JÚRIS PRÓXIMOS */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Audiências Próximas */}
            <SwissCard className="border-2 border-border/60">
              <SwissCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <CalendarClock className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                    </div>
                    <div>
                      <SwissCardTitle className="text-base md:text-lg font-bold">Audiências Próximas</SwissCardTitle>
                      <SwissCardDescription className="mt-1 text-sm">
                        Compromissos agendados
                      </SwissCardDescription>
                    </div>
                  </div>
                  <Link href="/admin/audiencias">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-sm h-9 px-3">
                      Ver todas
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </SwissCardHeader>
              <SwissCardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {mockAudienciasProximas.map((audiencia) => {
                    const statusStyle = getStatusAudienciaStyle(audiencia.status);
                    const isToday = audiencia.data === "Hoje";
                    return (
                      <div
                        key={audiencia.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                          isToday 
                            ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30 hover:border-blue-400 dark:hover:border-blue-600" 
                            : "border-border/40 hover:border-primary/50 hover:bg-primary/5"
                        )}
                      >
                        <div className={cn(
                          "text-center min-w-[52px] rounded-lg py-1.5 px-2",
                          isToday ? "bg-blue-100 dark:bg-blue-900/50" : "bg-muted"
                        )}>
                          <p className={cn(
                            "text-xs font-semibold",
                            isToday ? "text-blue-600" : "text-muted-foreground"
                          )}>{audiencia.data}</p>
                          <p className={cn(
                            "text-sm font-bold",
                            isToday ? "text-blue-700 dark:text-blue-300" : ""
                          )}>{audiencia.hora}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm md:text-base truncate">{audiencia.assistido}</p>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">{audiencia.vara}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">
                            {audiencia.tipo}
                          </Badge>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-md font-medium",
                            statusStyle.bg, statusStyle.text
                          )}>
                            {audiencia.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Júris Próximos */}
            <SwissCard className="border-2 border-border/60">
              <SwissCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <Gavel className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
                    </div>
                    <div>
                      <SwissCardTitle className="text-base md:text-lg font-bold">Próximos Júris</SwissCardTitle>
                      <SwissCardDescription className="mt-1 text-sm">
                        Sessões plenárias do mês
                      </SwissCardDescription>
                    </div>
                  </div>
                  <Link href="/admin/juri">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-sm h-9 px-3">
                      Ver todos
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </SwissCardHeader>
              <SwissCardContent className="p-4 pt-0">
                <div className="grid gap-2 sm:grid-cols-2">
                  {mockJurisProximos.map((juri) => (
                    <Link key={juri.id} href={`/admin/juri/${juri.id}`}>
                      <div className="p-3 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm transition-all cursor-pointer group">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="bg-emerald-100 dark:bg-emerald-900/50 rounded-md px-2 py-1">
                              <p className="text-xs md:text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300">{juri.data}</p>
                            </div>
                            <span className="text-xs md:text-sm text-muted-foreground font-mono font-semibold">{juri.hora}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                        <p className="font-bold text-sm md:text-base truncate mt-2">{juri.assistido}</p>
                        <p className="text-xs md:text-sm text-muted-foreground truncate mt-0.5">{juri.crime}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">{juri.defensor}</p>
                          <Badge className="text-xs px-1.5 py-0 bg-white/60 dark:bg-zinc-900/40 text-muted-foreground border-0">{juri.comarca}</Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </SwissCardContent>
            </SwissCard>
          </div>

          {/* SEÇÃO 4: INFORMAÇÕES CONDENSADAS - PROPORCIONAIS */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {/* Réus Presos */}
            <SwissCard className="group hover:shadow-md transition-all hover:scale-[1.01] border-l-[3px] border-l-rose-500 dark:border-l-rose-400 border-2 border-border/60">
              <SwissCardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                    <Lock className="h-5 w-5 text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl md:text-3xl font-bold tracking-tight">{mockStats.reusPresos}</p>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Réus Presos</p>
                  </div>
                  <Link href="/admin/assistidos?preso=true">
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Casos Ativos */}
            <SwissCard className="group hover:shadow-md transition-all hover:scale-[1.01] border-l-[3px] border-l-blue-500 dark:border-l-blue-400 border-2 border-border/60">
              <SwissCardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl md:text-3xl font-bold tracking-tight">{mockStats.casosAtivos}</p>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Casos Ativos</p>
                  </div>
                  <Link href="/admin/casos">
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Total Assistidos */}
            <SwissCard className="group hover:shadow-md transition-all hover:scale-[1.01] border-l-[3px] border-l-purple-500 dark:border-l-purple-400 border-2 border-border/60">
              <SwissCardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl md:text-3xl font-bold tracking-tight">{mockStats.totalAssistidos}</p>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Assistidos</p>
                  </div>
                  <Link href="/admin/assistidos">
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Total Processos */}
            <SwissCard className="group hover:shadow-md transition-all hover:scale-[1.01] border-l-[3px] border-l-emerald-500 dark:border-l-emerald-400 border-2 border-border/60">
              <SwissCardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <Scale className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl md:text-3xl font-bold tracking-tight">{mockStats.totalProcessos}</p>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Processos</p>
                  </div>
                  <Link href="/admin/processos">
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </div>
              </SwissCardContent>
            </SwissCard>
          </div>

          {/* SEÇÃO 4.5: DASHBOARDS ESPECIALIZADOS */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Dashboard Assistidos */}
            <Link href="/admin/dashboard/assistidos">
              <SwissCard className="group hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-border/60 hover:border-purple-500 cursor-pointer">
                <SwissCardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Dashboard de Assistidos</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Análise completa de vulnerabilidades, distribuição regional e atividades
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Regiões
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Vulnerabilidades
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" />
                      Timeline
                    </span>
                  </div>
                </SwissCardContent>
              </SwissCard>
            </Link>

            {/* Dashboard Demandas */}
            <Link href="/admin/dashboard/demandas">
              <SwissCard className="group hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-border/60 hover:border-orange-500 cursor-pointer">
                <SwissCardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-orange-600" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Dashboard de Demandas</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Status, prioridades, prazos e evolução das demandas processuais
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      Status
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Prazos
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Evolução
                    </span>
                  </div>
                </SwissCardContent>
              </SwissCard>
            </Link>

            {/* Dashboard Processos */}
            <Link href="/admin/dashboard/processos">
              <SwissCard className="group hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-border/60 hover:border-emerald-500 cursor-pointer">
                <SwissCardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <Scale className="h-6 w-6 text-emerald-600" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Dashboard de Processos</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Fases processuais, prazos, audiências e timeline de andamentos
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Gavel className="h-3.5 w-3.5" />
                      Fases
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Audiências
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Áreas
                    </span>
                  </div>
                </SwissCardContent>
              </SwissCard>
            </Link>
          </div>

          {/* SEÇÃO 5: INFOGRÁFICOS - AMPLIADOS */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Gráfico de Pizza - Status das Demandas */}
            <SwissCard className="border-2 border-border/60">
              <SwissCardHeader className="pb-3">
                <SwissCardTitle className="text-base md:text-lg lg:text-xl font-bold flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  Status das Demandas
                </SwissCardTitle>
              </SwissCardHeader>
              <SwissCardContent className="p-3 sm:p-4">
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mockDemandasPorStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {mockDemandasPorStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid hsl(240, 6%, 88%)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {mockDemandasPorStatus.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                      <span className="text-xs font-semibold ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Gráfico de Linha - Evolução Semanal */}
            <SwissCard className="border-2 border-border/60">
              <SwissCardHeader className="pb-3">
                <SwissCardTitle className="text-base md:text-lg lg:text-xl font-bold flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  Evolução Semanal
                </SwissCardTitle>
              </SwissCardHeader>
              <SwissCardContent className="p-3 sm:p-4">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockEvolucaoSemanal}>
                      <defs>
                        <linearGradient id="colorProtocolados" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(158, 55%, 42%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(158, 55%, 42%)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRecebidos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(35, 70%, 55%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(35, 70%, 55%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 88%)" vertical={false} />
                      <XAxis dataKey="dia" stroke="hsl(240, 4%, 46%)" fontSize={10} tickLine={false} />
                      <YAxis stroke="hsl(240, 4%, 46%)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid hsl(240, 6%, 88%)",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Area type="monotone" dataKey="protocolados" stroke="hsl(158, 55%, 42%)" strokeWidth={2} fillOpacity={1} fill="url(#colorProtocolados)" />
                      <Area type="monotone" dataKey="recebidos" stroke="hsl(35, 70%, 55%)" strokeWidth={2} fillOpacity={1} fill="url(#colorRecebidos)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">Protocolados</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs text-muted-foreground">Recebidos</span>
                  </div>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Gráfico de Barras - Prazos por Área */}
            <SwissCard>
              <SwissCardHeader className="pb-2">
                <SwissCardTitle className="text-xs sm:text-sm flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  Prazos por Área
                </SwissCardTitle>
              </SwissCardHeader>
              <SwissCardContent className="p-3 sm:p-4">
                <div className="h-[180px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockPrazosPorArea} layout="vertical" margin={{ left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 88%)" horizontal={false} />
                      <XAxis type="number" stroke="hsl(240, 4%, 46%)" fontSize={10} tickLine={false} />
                      <YAxis type="category" dataKey="area" stroke="hsl(240, 4%, 46%)" fontSize={9} width={60} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid hsl(240, 6%, 88%)",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Bar dataKey="quantidade" fill="hsl(158, 55%, 42%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SwissCardContent>
            </SwissCard>
          </div>

          {/* SEÇÃO 6: AÇÕES RÁPIDAS - EQUILIBRADAS */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Link href="/admin/assistidos/novo">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2 hover:shadow-md">
                <Users className="h-5 w-5" />
                <span className="text-sm font-semibold">Novo Assistido</span>
              </Button>
            </Link>
            <Link href="/admin/demandas/nova">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2 hover:shadow-md">
                <FileText className="h-5 w-5" />
                <span className="text-sm font-semibold">Nova Demanda</span>
              </Button>
            </Link>
            <Link href="/admin/kanban">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2 hover:shadow-md">
                <Target className="h-5 w-5" />
                <span className="text-sm font-semibold">Kanban</span>
              </Button>
            </Link>
            <Link href="/admin/calendar">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2 hover:shadow-md">
                <CalendarDays className="h-5 w-5" />
                <span className="text-sm font-semibold">Calendário</span>
              </Button>
            </Link>
          </div>
        </>
      ) : (
        /* Analytics View - Padrão Swiss */
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Gráfico de Evolução */}
          <SwissCard className="lg:col-span-2">
            <SwissCardHeader className="pb-3 sm:pb-4">
              <SwissCardTitle className="text-sm sm:text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Evolução de Protocolos vs Recebimentos
              </SwissCardTitle>
              <SwissCardDescription>Últimos 7 dias</SwissCardDescription>
            </SwissCardHeader>
            <SwissCardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockEvolucaoSemanal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 88%)" />
                    <XAxis dataKey="dia" stroke="hsl(240, 4%, 46%)" fontSize={12} />
                    <YAxis stroke="hsl(240, 4%, 46%)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid hsl(240, 6%, 88%)",
                        borderRadius: "8px",
                      }}
                    />
                    <Line type="monotone" dataKey="protocolados" stroke="hsl(158, 55%, 42%)" strokeWidth={2} dot={{ fill: "hsl(158, 55%, 42%)" }} />
                    <Line type="monotone" dataKey="recebidos" stroke="hsl(35, 70%, 55%)" strokeWidth={2} dot={{ fill: "hsl(35, 70%, 55%)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-muted-foreground">Protocolados</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-muted-foreground">Recebidos</span>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>

          {/* Indicadores de Performance */}
          <SwissCard className="lg:col-span-2">
            <SwissCardHeader className="pb-3 sm:pb-4">
              <SwissCardTitle className="text-sm sm:text-base">Indicadores de Performance</SwissCardTitle>
              <SwissCardDescription>Métricas de eficiência operacional</SwissCardDescription>
            </SwissCardHeader>
            <SwissCardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">Taxa de Cumprimento</span>
                    <span className="font-semibold text-emerald-600 font-mono">94%</span>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: "94%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">Prazos em Dia</span>
                    <span className="font-semibold font-mono">87%</span>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "87%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">Atendimentos Realizados</span>
                    <span className="font-semibold font-mono">78%</span>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "78%" }} />
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="text-center p-3 sm:p-4 rounded-lg bg-slate-50/60 dark:bg-slate-900/40">
                  <p className="text-2xl sm:text-3xl font-bold">{mockStats.totalAssistidos}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Assistidos</p>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-lg bg-slate-50/60 dark:bg-slate-900/40">
                  <p className="text-2xl sm:text-3xl font-bold">{mockStats.totalProcessos}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Processos</p>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-lg bg-slate-50/60 dark:bg-slate-900/40">
                  <p className="text-2xl sm:text-3xl font-bold">{mockStats.demandas.protocolado}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Protocolados</p>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-lg bg-slate-50/60 dark:bg-slate-900/40">
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-600">94%</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Eficiência</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
