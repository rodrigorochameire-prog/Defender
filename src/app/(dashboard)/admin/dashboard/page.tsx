"use client";

import { useState } from "react";
import { SwissCard, SwissCardContent, SwissCardHeader, SwissCardTitle, SwissCardDescription } from "@/components/shared/swiss-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  Clock, 
  Scale,
  Gavel,
  FileText,
  Timer,
  Target,
  Briefcase,
  CheckCircle2,
  ArrowUpRight,
  BarChart3,
  Lock,
  TrendingUp,
  Layers,
  Building2,
  CalendarClock,
  CalendarDays,
  UserCheck,
  ClipboardList,
  AlertCircle,
  ArrowRight,
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
import { useAssignment } from "@/contexts/assignment-context";
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
      return { label: "RÉU PRESO", variant: "reuPreso" as const };
    case "URGENTE":
      return { label: "URGENTE", variant: "urgent" as const };
    case "ALTA":
      return { label: "ALTA", variant: "warning" as const };
    default:
      return { label: "NORMAL", variant: "secondary" as const };
  }
}

function getStatusAudienciaStyle(status: string) {
  switch (status) {
    case "confirmada":
      return "success";
    case "pendente":
      return "warning";
    default:
      return "secondary";
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
    <div className="p-6 space-y-8">
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
          <div className="h-14 w-14 rounded-xl flex items-center justify-center bg-primary text-primary-foreground shadow-md">
            {dashboardMode === "all_workspaces" ? (
              <Layers className="h-7 w-7" />
            ) : (
              <BarChart3 className="h-7 w-7" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{dashboardInfo.title}</h1>
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
          {/* SEÇÃO 1: INDICADORES RÁPIDOS - Padrão Swiss - Mais limpo */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {/* Prazos Hoje */}
            <div className="p-4 rounded-xl border bg-card hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prazos Hoje</p>
                <Timer className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{mockStats.prazosHoje}</p>
                <span className="text-xs text-muted-foreground">de {mockStats.prazosSemana}</span>
              </div>
            </div>

            {/* Audiências Hoje */}
            <div className="p-4 rounded-xl border bg-card hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Audiências</p>
                <Briefcase className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{mockStats.audienciasHoje}</p>
                <span className="text-xs text-muted-foreground">de {mockStats.audienciasSemana}</span>
              </div>
            </div>

            {/* Atendimentos Hoje */}
            <div className="p-4 rounded-xl border bg-card hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Atendimentos</p>
                <UserCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{mockStats.atendimentosHoje}</p>
                <span className="text-xs text-muted-foreground">de {mockStats.atendimentosSemana}</span>
              </div>
            </div>

            {/* Júris do Mês */}
            <div className="p-4 rounded-xl border bg-card hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Júris Mês</p>
                <Gavel className="h-4 w-4 text-purple-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{mockStats.jurisMes}</p>
                <span className="text-xs text-muted-foreground">sessões</span>
              </div>
            </div>

            {/* Taxa de Cumprimento */}
            <div className="p-4 rounded-xl border bg-card hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cumprimento</p>
                <CheckCircle2 className="h-4 w-4 text-teal-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{mockStats.taxaCumprimento}%</p>
                <span className="text-xs text-muted-foreground">em dia</span>
              </div>
            </div>

            {/* Tempo Médio de Resposta */}
            <div className="p-4 rounded-xl border bg-card hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tempo Médio</p>
                <Activity className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{mockStats.mediaTempoResposta}d</p>
                <span className="text-xs text-muted-foreground">resposta</span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: PRIORIDADES DO DIA - Grid Principal */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Coluna 1: Prazos e Demandas Urgentes */}
            <SwissCard className="lg:col-span-2">
              <SwissCardHeader className="pb-3 border-b-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <SwissCardTitle>Prazos e Demandas Urgentes</SwissCardTitle>
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
              <SwissCardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {mockPrazosUrgentes.map((prazo) => {
                    const style = getPrioridadeStyle(prazo.prioridade);
                    return (
                      <Link key={prazo.id} href={`/admin/demandas/${prazo.id}`} className="block hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4 p-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm truncate text-foreground">{prazo.assistido}</p>
                              <Badge variant={style.variant} className="px-1.5 py-0 text-[10px] h-5">
                                {style.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground/80">{prazo.ato}</span>
                              <span>•</span>
                              <span className="font-mono">{prazo.processo}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold ${prazo.diasRestantes === 0 ? "text-destructive" : prazo.diasRestantes === 1 ? "text-amber-600" : "text-muted-foreground"}`}>
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
              <SwissCardHeader className="pb-3 border-b-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                      <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <SwissCardTitle>Atendimentos</SwissCardTitle>
                    </div>
                  </div>
                </div>
              </SwissCardHeader>
              <SwissCardContent className="p-0">
                {mockAtendimentos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <UserCheck className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Sem atendimentos hoje</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {mockAtendimentos.slice(0, 5).map((atendimento) => (
                      <div
                        key={atendimento.id}
                        className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <div className="text-center min-w-[42px] bg-muted/50 rounded-md py-1 px-2 border border-border/50">
                          <p className="text-xs font-bold font-mono text-foreground">{atendimento.hora}</p>
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
              <SwissCardHeader className="pb-3 border-b-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                      <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <SwissCardTitle>Audiências Próximas</SwissCardTitle>
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
              <SwissCardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {mockAudienciasProximas.map((audiencia) => {
                    const statusVariant = getStatusAudienciaStyle(audiencia.status);
                    const isToday = audiencia.data === "Hoje";
                    return (
                      <div
                        key={audiencia.id}
                        className={cn(
                          "flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer",
                          isToday && "bg-blue-50/30 dark:bg-blue-900/10"
                        )}
                      >
                        <div className="text-center min-w-[48px]">
                          <p className={cn(
                            "text-[10px] font-medium uppercase tracking-wider mb-0.5",
                            isToday ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                          )}>{audiencia.data}</p>
                          <p className="text-sm font-bold text-foreground">{audiencia.hora}</p>
                        </div>
                        <div className="w-px h-8 bg-border/60 mx-1"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm truncate text-foreground">{audiencia.assistido}</p>
                            <Badge variant={statusVariant as any} className="text-[9px] px-1.5 py-0 h-5 font-normal">
                              {audiencia.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/70">{audiencia.tipo}</span>
                            <span>•</span>
                            <span>{audiencia.vara}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SwissCardContent>
            </SwissCard>

            {/* Júris Próximos */}
            <SwissCard>
              <SwissCardHeader className="pb-3 border-b-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                      <Gavel className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <SwissCardTitle>Próximos Júris</SwissCardTitle>
                    </div>
                  </div>
                  <Link href="/admin/juri">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-8">
                      Ver todas
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </SwissCardHeader>
              <SwissCardContent className="p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {mockJurisProximos.map((juri) => (
                    <Link key={juri.id} href={`/admin/juri/${juri.id}`}>
                      <div className="p-4 rounded-lg bg-card border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group h-full flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono bg-muted/30">
                              {juri.data}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">{juri.hora}</span>
                          </div>
                        </div>
                        <p className="font-semibold text-sm truncate text-foreground mb-1">{juri.assistido}</p>
                        <p className="text-xs text-muted-foreground truncate mb-3">{juri.crime}</p>
                        <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/40">
                          <p className="text-[10px] text-muted-foreground">{juri.defensor}</p>
                          <span className="text-[10px] font-medium text-foreground/70">{juri.comarca}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </SwissCardContent>
            </SwissCard>
          </div>

          {/* SEÇÃO 4: AÇÕES RÁPIDAS - Padrão Swiss */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Link href="/admin/assistidos/novo">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-muted/50 hover:border-primary/20 transition-all rounded-xl border-dashed">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium">Novo Assistido</span>
              </Button>
            </Link>
            <Link href="/admin/demandas/nova">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-muted/50 hover:border-primary/20 transition-all rounded-xl border-dashed">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium">Nova Demanda</span>
              </Button>
            </Link>
            <Link href="/admin/kanban">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-muted/50 hover:border-primary/20 transition-all rounded-xl border-dashed">
                <Target className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium">Kanban</span>
              </Button>
            </Link>
            <Link href="/admin/calendar">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-muted/50 hover:border-primary/20 transition-all rounded-xl border-dashed">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
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
