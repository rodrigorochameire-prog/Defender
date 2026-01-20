"use client";

import { useState } from "react";
import { SwissCard, SwissCardContent, SwissCardHeader, SwissCardTitle, SwissCardDescription } from "@/components/shared/swiss-card";
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
  { name: "Atender", value: 28, color: "hsl(var(--destructive))" },
  { name: "Fila", value: 45, color: "hsl(var(--warning))" },
  { name: "Monitorar", value: 15, color: "hsl(var(--info))" },
  { name: "Protocolado", value: 67, color: "hsl(var(--success))" },
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
      return { bg: "bg-destructive/10", text: "text-destructive", dot: "bg-destructive", label: "RÉU PRESO" };
    case "URGENTE":
      return { bg: "bg-warning/10", text: "text-warning-foreground", dot: "bg-warning", label: "URGENTE" };
    case "ALTA":
      return { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", label: "ALTA" };
    default:
      return { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground", label: "NORMAL" };
  }
}

function getStatusAudienciaStyle(status: string) {
  switch (status) {
    case "confirmada":
      return { bg: "bg-success/10", text: "text-success" };
    case "pendente":
      return { bg: "bg-warning/10", text: "text-warning-foreground" };
    default:
      return { bg: "bg-muted", text: "text-muted-foreground" };
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
    <div className="p-6 space-y-6">
      {/* Mode Selector - Todos vs Específico */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div className="flex items-center gap-1 p-1.5 bg-muted rounded-xl border border-border/50">
          <UITooltip>
            <TooltipTrigger asChild>
              <Button
                variant={dashboardMode === "all_workspaces" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDashboardMode("all_workspaces")}
                className="gap-2 rounded-lg transition-all font-semibold"
              >
                <Layers className="h-4 w-4" />
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
                variant={dashboardMode === "current_workspace" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDashboardMode("current_workspace")}
                className="gap-2 rounded-lg transition-all font-semibold"
              >
                <Building2 className="h-4 w-4" />
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
            className="rounded-lg font-semibold"
          >
            Visão Geral
          </Button>
          <Button
            variant={activeView === "analytics" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("analytics")}
            className="rounded-lg font-semibold"
          >
            Análises
          </Button>
        </div>
      </div>

      {/* Header - Dinâmico por atribuição */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-primary text-primary-foreground shadow-lg">
            {dashboardMode === "all_workspaces" ? (
              <Layers className="h-8 w-8" />
            ) : (
              <BarChart3 className="h-8 w-8" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{dashboardInfo.title}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {dashboardInfo.subtitle}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>
      </div>

      {activeView === "overview" ? (
        <>
          {/* SEÇÃO 1: INDICADORES RÁPIDOS - Padrão Swiss */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {/* Prazos Hoje */}
            <SwissCard className="border-l-[3px] border-l-warning group hover:shadow-md transition-shadow">
              <SwissCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{mockStats.prazosHoje}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prazos Hoje</p>
                  </div>
                  <Timer className="hidden sm:block h-6 w-6 text-warning" />
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">{mockStats.prazosSemana} na semana</span>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Audiências Hoje */}
            <SwissCard className="border-l-[3px] border-l-info group hover:shadow-md transition-shadow">
              <SwissCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{mockStats.audienciasHoje}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Audiências Hoje</p>
                  </div>
                  <Briefcase className="hidden sm:block h-6 w-6 text-info" />
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">{mockStats.audienciasSemana} na semana</span>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Atendimentos Hoje */}
            <SwissCard className="border-l-[3px] border-l-primary group hover:shadow-md transition-shadow">
              <SwissCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{mockStats.atendimentosHoje}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Atendimentos</p>
                  </div>
                  <UserCheck className="hidden sm:block h-6 w-6 text-primary" />
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">{mockStats.atendimentosSemana} na semana</span>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Júris do Mês */}
            <SwissCard className="border-l-[3px] border-l-primary group hover:shadow-md transition-shadow">
              <SwissCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{mockStats.jurisMes}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Júris no Mês</p>
                  </div>
                  <Gavel className="hidden sm:block h-6 w-6 text-primary" />
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">Sessões plenárias</span>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Taxa de Cumprimento */}
            <SwissCard className="border-l-[3px] border-l-success group hover:shadow-md transition-shadow">
              <SwissCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{mockStats.taxaCumprimento}%</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Cumprimento</p>
                  </div>
                  <CheckCircle2 className="hidden sm:block h-6 w-6 text-success" />
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">Prazos em dia</span>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Tempo Médio de Resposta */}
            <SwissCard className="border-l-[3px] border-l-muted-foreground group hover:shadow-md transition-shadow">
              <SwissCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{mockStats.mediaTempoResposta}d</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Tempo Médio</p>
                  </div>
                  <Activity className="hidden sm:block h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">Para protocolar</span>
                </div>
              </SwissCardContent>
            </SwissCard>
          </div>

          {/* SEÇÃO 2: PRIORIDADES DO DIA - Grid Principal */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Coluna 1: Prazos e Demandas Urgentes */}
            <SwissCard className="lg:col-span-2">
              <SwissCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <SwissCardTitle>Prazos e Demandas Urgentes</SwissCardTitle>
                      <SwissCardDescription className="mt-0.5">
                        Atenção imediata necessária
                      </SwissCardDescription>
                    </div>
                  </div>
                  <Link href="/admin/demandas?urgente=true">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-8">
                      Ver todos
                      <ArrowUpRight className="h-3.5 w-3.5" />
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
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${style.bg} hover:opacity-80 transition-all cursor-pointer`}>
                          <div className={`w-1 h-10 rounded-full ${style.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm truncate text-foreground">{prazo.assistido}</p>
                              <Badge variant="outline" className={`text-[10px] font-bold ${style.text} px-1.5 py-0 border-transparent bg-background/50`}>
                                {style.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{prazo.ato}</p>
                            <p className="text-[10px] font-mono text-muted-foreground/80 mt-0.5 truncate">{prazo.processo}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold ${prazo.diasRestantes === 0 ? "text-destructive" : prazo.diasRestantes === 1 ? "text-warning-foreground" : "text-muted-foreground"}`}>
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
            <SwissCard>
              <SwissCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <UserCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <SwissCardTitle>Atendimentos</SwissCardTitle>
                      <SwissCardDescription className="mt-0.5">
                        {mockAtendimentos.length} agendados hoje
                      </SwissCardDescription>
                    </div>
                  </div>
                </div>
              </SwissCardHeader>
              <SwissCardContent className="p-4 pt-0">
                {mockAtendimentos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <UserCheck className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Sem atendimentos hoje</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mockAtendimentos.slice(0, 5).map((atendimento) => (
                      <div
                        key={atendimento.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer"
                      >
                        <div className="text-center min-w-[42px] bg-primary/10 rounded-md py-1 px-2">
                          <p className="text-sm font-bold font-mono text-primary">{atendimento.hora}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-foreground">{atendimento.assistido}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-muted-foreground">{getTipoAtendimentoIcon(atendimento.tipo)}</span>
                            <p className="text-[10px] text-muted-foreground truncate">{atendimento.assunto}</p>
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
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Audiências Próximas */}
            <SwissCard>
              <SwissCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                      <CalendarClock className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <SwissCardTitle>Audiências Próximas</SwissCardTitle>
                      <SwissCardDescription className="mt-0.5">
                        Compromissos agendados
                      </SwissCardDescription>
                    </div>
                  </div>
                  <Link href="/admin/audiencias">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-8">
                      Ver todas
                      <ArrowUpRight className="h-3.5 w-3.5" />
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
                          "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                          isToday ? "bg-info/5" : "bg-muted/30 hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "text-center min-w-[52px] rounded-lg py-1.5 px-2",
                          isToday ? "bg-info/10" : "bg-muted"
                        )}>
                          <p className={cn(
                            "text-[10px] font-semibold",
                            isToday ? "text-info" : "text-muted-foreground"
                          )}>{audiencia.data}</p>
                          <p className={cn(
                            "text-sm font-bold",
                            isToday ? "text-info" : ""
                          )}>{audiencia.hora}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-foreground">{audiencia.assistido}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{audiencia.vara}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            {audiencia.tipo}
                          </Badge>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-medium",
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
            <SwissCard>
              <SwissCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Gavel className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <SwissCardTitle>Próximos Júris</SwissCardTitle>
                      <SwissCardDescription className="mt-0.5">
                        Sessões plenárias do mês
                      </SwissCardDescription>
                    </div>
                  </div>
                  <Link href="/admin/juri">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-8">
                      Ver todos
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </SwissCardHeader>
              <SwissCardContent className="p-4 pt-0">
                <div className="grid gap-3 sm:grid-cols-2">
                  {mockJurisProximos.map((juri) => (
                    <Link key={juri.id} href={`/admin/juri/${juri.id}`}>
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 hover:border-primary/30 transition-colors cursor-pointer group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="bg-primary/10 rounded-md px-2 py-0.5">
                              <p className="text-sm font-bold font-mono text-primary">{juri.data}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">{juri.hora}</span>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                        <p className="font-semibold text-sm truncate text-foreground">{juri.assistido}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{juri.crime}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-[10px] text-muted-foreground">{juri.defensor}</p>
                          <Badge className="text-[9px] px-1 py-0 bg-background text-muted-foreground border shadow-sm">{juri.comarca}</Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </SwissCardContent>
            </SwissCard>
          </div>

          {/* SEÇÃO 4: INFORMAÇÕES CONDENSADAS - Padrão Swiss */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {/* Réus Presos */}
            <SwissCard className="group hover:shadow-md transition-all border-l-[3px] border-l-destructive">
              <SwissCardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <Lock className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold text-foreground">{mockStats.reusPresos}</p>
                    <p className="text-xs text-muted-foreground">Réus Presos</p>
                  </div>
                  <Link href="/admin/assistidos?preso=true">
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Casos Ativos */}
            <SwissCard className="group hover:shadow-md transition-all border-l-[3px] border-l-info">
              <SwissCardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-5 w-5 text-info" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold text-foreground">{mockStats.casosAtivos}</p>
                    <p className="text-xs text-muted-foreground">Casos Ativos</p>
                  </div>
                  <Link href="/admin/casos">
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Total Assistidos */}
            <SwissCard className="group hover:shadow-md transition-all border-l-[3px] border-l-primary">
              <SwissCardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold text-foreground">{mockStats.totalAssistidos}</p>
                    <p className="text-xs text-muted-foreground">Assistidos</p>
                  </div>
                  <Link href="/admin/assistidos">
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Total Processos */}
            <SwissCard className="group hover:shadow-md transition-all border-l-[3px] border-l-primary">
              <SwissCardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Scale className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold text-foreground">{mockStats.totalProcessos}</p>
                    <p className="text-xs text-muted-foreground">Processos</p>
                  </div>
                  <Link href="/admin/processos">
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </div>
              </SwissCardContent>
            </SwissCard>
          </div>

          {/* SEÇÃO 5: INFOGRÁFICOS - Padrão Swiss */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Gráfico de Pizza - Status das Demandas */}
            <SwissCard>
              <SwissCardHeader className="pb-2">
                <SwissCardTitle className="text-sm flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Status das Demandas
                </SwissCardTitle>
              </SwissCardHeader>
              <SwissCardContent className="p-4">
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
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
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
            <SwissCard>
              <SwissCardHeader className="pb-2">
                <SwissCardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Evolução Semanal
                </SwissCardTitle>
              </SwissCardHeader>
              <SwissCardContent className="p-4">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockEvolucaoSemanal}>
                      <defs>
                        <linearGradient id="colorProtocolados" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRecebidos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          fontSize: "12px",
                        }}
                      />
                      <Area type="monotone" dataKey="protocolados" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorProtocolados)" />
                      <Area type="monotone" dataKey="recebidos" stroke="hsl(var(--warning))" strokeWidth={2} fillOpacity={1} fill="url(#colorRecebidos)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="text-xs text-muted-foreground">Protocolados</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                    <span className="text-xs text-muted-foreground">Recebidos</span>
                  </div>
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Gráfico de Barras - Prazos por Área */}
            <SwissCard>
              <SwissCardHeader className="pb-2">
                <SwissCardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Prazos por Área
                </SwissCardTitle>
              </SwissCardHeader>
              <SwissCardContent className="p-4">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockPrazosPorArea} layout="vertical" margin={{ left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                      <YAxis type="category" dataKey="area" stroke="hsl(var(--muted-foreground))" fontSize={9} width={60} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SwissCardContent>
            </SwissCard>
          </div>

          {/* SEÇÃO 6: AÇÕES RÁPIDAS - Padrão Swiss */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Link href="/admin/assistidos/novo">
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1.5 hover:bg-primary/5 hover:border-primary/50 transition-colors rounded-lg">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Novo Assistido</span>
              </Button>
            </Link>
            <Link href="/admin/demandas/nova">
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1.5 hover:bg-primary/5 hover:border-primary/50 transition-colors rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Nova Demanda</span>
              </Button>
            </Link>
            <Link href="/admin/kanban">
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1.5 hover:bg-primary/5 hover:border-primary/50 transition-colors rounded-lg">
                <Target className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Kanban</span>
              </Button>
            </Link>
            <Link href="/admin/calendar">
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1.5 hover:bg-primary/5 hover:border-primary/50 transition-colors rounded-lg">
                <CalendarDays className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Calendário</span>
              </Button>
            </Link>
          </div>
        </>
      ) : (
        /* Analytics View - Padrão Swiss */
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Gráfico de Evolução */}
          <SwissCard className="lg:col-span-2">
            <SwissCardHeader className="pb-4">
              <SwissCardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Evolução de Protocolos vs Recebimentos
              </SwissCardTitle>
              <SwissCardDescription>Últimos 7 dias</SwissCardDescription>
            </SwissCardHeader>
            <SwissCardContent className="p-4 pt-0">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockEvolucaoSemanal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Line type="monotone" dataKey="protocolados" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                    <Line type="monotone" dataKey="recebidos" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ fill: "hsl(var(--warning))" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">Protocolados</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm text-muted-foreground">Recebidos</span>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>

          {/* Indicadores de Performance */}
          <SwissCard className="lg:col-span-2">
            <SwissCardHeader className="pb-4">
              <SwissCardTitle className="text-base">Indicadores de Performance</SwissCardTitle>
              <SwissCardDescription>Métricas de eficiência operacional</SwissCardDescription>
            </SwissCardHeader>
            <SwissCardContent className="p-4 pt-0">
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Taxa de Cumprimento</span>
                    <span className="font-semibold text-success font-mono">94%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: "94%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Prazos em Dia</span>
                    <span className="font-semibold font-mono">87%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "87%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Atendimentos Realizados</span>
                    <span className="font-semibold font-mono">78%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-info rounded-full" style={{ width: "78%" }} />
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mt-6 pt-6 border-t border-border">
                <div className="text-center p-4 rounded-lg bg-muted/40">
                  <p className="text-3xl font-bold">{mockStats.totalAssistidos}</p>
                  <p className="text-sm text-muted-foreground mt-1">Assistidos</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/40">
                  <p className="text-3xl font-bold">{mockStats.totalProcessos}</p>
                  <p className="text-sm text-muted-foreground mt-1">Processos</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/40">
                  <p className="text-3xl font-bold">{mockStats.demandas.protocolado}</p>
                  <p className="text-sm text-muted-foreground mt-1">Protocolados</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/40">
                  <p className="text-3xl font-bold text-success">94%</p>
                  <p className="text-sm text-muted-foreground mt-1">Eficiência</p>
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
