"use client";

import { SwissCard, SwissCardContent, SwissCardHeader, SwissCardTitle, SwissCardDescription } from "@/components/ui/swiss-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Plus,
  Calendar,
  Target,
  AlertTriangle,
  Activity,
} from "lucide-react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { useAssignment } from "@/contexts/assignment-context";
import { cn } from "@/lib/utils";

// Mock data para demonstração
const mockDemandasStats = {
  total: 155,
  aguardandoAnalise: 28,
  emAndamento: 45,
  concluidas: 67,
  urgentes: 12,
  prazosProximos: 8,
};

const mockStatusDistribuicao = [
  { name: "Aguardando Análise", value: 28, color: "hsl(0, 65%, 55%)" },
  { name: "Em Andamento", value: 45, color: "hsl(35, 70%, 55%)" },
  { name: "Monitoramento", value: 15, color: "hsl(210, 60%, 55%)" },
  { name: "Concluídas", value: 67, color: "hsl(158, 55%, 42%)" },
];

const mockPrioridades = [
  { prioridade: "Urgente", quantidade: 12 },
  { prioridade: "Alta", quantidade: 25 },
  { prioridade: "Média", quantidade: 48 },
  { prioridade: "Baixa", quantidade: 70 },
];

const mockEvolucao = [
  { semana: "Sem 1", recebidas: 22, protocoladas: 18 },
  { semana: "Sem 2", recebidas: 28, protocoladas: 24 },
  { semana: "Sem 3", recebidas: 25, protocoladas: 22 },
  { semana: "Sem 4", recebidas: 30, protocoladas: 28 },
];

const mockDemandasUrgentes = [
  { id: 1, titulo: "Resposta à Acusação", assistido: "Diego Bonfim Almeida", prazo: "Hoje", prioridade: "URGENTE", area: "Júri" },
  { id: 2, titulo: "Alegações Finais", assistido: "Maria Silva Santos", prazo: "Amanhã", prioridade: "URGENTE", area: "VVD" },
  { id: 3, titulo: "Memoriais", assistido: "José Carlos Oliveira", prazo: "Em 2 dias", prioridade: "ALTA", area: "Execução" },
  { id: 4, titulo: "Recurso em Sentido Estrito", assistido: "Ana Paula Costa", prazo: "Em 3 dias", prioridade: "ALTA", area: "Substituição" },
  { id: 5, titulo: "Contrarrazões", assistido: "Roberto Lima Silva", prazo: "Em 4 dias", prioridade: "MEDIA", area: "Júri" },
];

const mockPrazosProximos = [
  { dia: "Hoje", quantidade: 8 },
  { dia: "Amanhã", quantidade: 6 },
  { dia: "2 dias", quantidade: 5 },
  { dia: "3 dias", quantidade: 4 },
  { dia: "4 dias", quantidade: 3 },
  { dia: "5 dias", quantidade: 2 },
  { dia: "+7 dias", quantidade: 15 },
];

function getPrioridadeStyle(prioridade: string) {
  switch (prioridade) {
    case "URGENTE":
      return { bg: "bg-red-50 dark:bg-red-950/50", text: "text-red-700 dark:text-red-400", dot: "bg-red-500", label: "URGENTE" };
    case "ALTA":
      return { bg: "bg-orange-50 dark:bg-orange-950/50", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500", label: "ALTA" };
    case "MEDIA":
      return { bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", label: "MÉDIA" };
    default:
      return { bg: "bg-zinc-50 dark:bg-zinc-900", text: "text-zinc-600 dark:text-zinc-400", dot: "bg-zinc-400", label: "BAIXA" };
  }
}

export default function DemandasDashboardPage() {
  const { config } = useAssignment();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 mb-5 border-b-2 border-border/50">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div 
            className="h-14 w-14 md:h-16 md:w-16 rounded-2xl flex items-center justify-center shadow-md"
            style={{
              background: `linear-gradient(145deg, ${config.accentColor}, ${config.accentColorDark})`,
            }}
          >
            <FileText className="h-7 w-7 md:h-8 md:w-8 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">Demandas</h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Gestão de solicitações e prazos processuais
            </p>
          </div>
        </div>
        <Link href="/admin/demandas/nova">
          <Button className="gap-2 shadow-md">
            <Plus className="h-4 w-4" />
            Nova Demanda
          </Button>
        </Link>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        <SwissCard className="border-l-[3px] border-l-blue-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">{mockDemandasStats.total}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Total</p>
          </SwissCardContent>
        </SwissCard>

        <SwissCard className="border-l-[3px] border-l-red-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">{mockDemandasStats.aguardandoAnalise}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Aguardando</p>
          </SwissCardContent>
        </SwissCard>

        <SwissCard className="border-l-[3px] border-l-orange-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-orange-600">{mockDemandasStats.emAndamento}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Em Andamento</p>
          </SwissCardContent>
        </SwissCard>

        <SwissCard className="border-l-[3px] border-l-emerald-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-emerald-600">{mockDemandasStats.concluidas}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Concluídas</p>
          </SwissCardContent>
        </SwissCard>

        <SwissCard className="border-l-[3px] border-l-rose-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <p className="text-3xl font-bold text-rose-600">{mockDemandasStats.urgentes}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Urgentes</p>
          </SwissCardContent>
        </SwissCard>

        <SwissCard className="border-l-[3px] border-l-amber-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-amber-600">{mockDemandasStats.prazosProximos}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Prazos Hoje</p>
          </SwissCardContent>
        </SwissCard>
      </div>

      {/* Gráficos de Análise */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribuição por Status */}
        <SwissCard className="border-2 border-border/60">
          <SwissCardHeader>
            <SwissCardTitle className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              Distribuição por Status
            </SwissCardTitle>
            <SwissCardDescription>
              Visão geral do fluxo de trabalho
            </SwissCardDescription>
          </SwissCardHeader>
          <SwissCardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockStatusDistribuicao}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {mockStatusDistribuicao.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid hsl(240, 6%, 88%)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {mockStatusDistribuicao.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                  <span className="text-xs font-semibold ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </SwissCardContent>
        </SwissCard>

        {/* Distribuição por Prioridade */}
        <SwissCard className="border-2 border-border/60">
          <SwissCardHeader>
            <SwissCardTitle className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Distribuição por Prioridade
            </SwissCardTitle>
            <SwissCardDescription>
              Classificação de urgência das demandas
            </SwissCardDescription>
          </SwissCardHeader>
          <SwissCardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockPrioridades} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 88%)" />
                  <XAxis type="number" stroke="hsl(240, 4%, 46%)" fontSize={12} />
                  <YAxis type="category" dataKey="prioridade" stroke="hsl(240, 4%, 46%)" fontSize={12} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid hsl(240, 6%, 88%)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="quantidade" fill={config.accentColor} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SwissCardContent>
        </SwissCard>
      </div>

      {/* Evolução Semanal */}
      <SwissCard className="border-2 border-border/60">
        <SwissCardHeader>
          <SwissCardTitle className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução Semanal
          </SwissCardTitle>
          <SwissCardDescription>
            Demandas recebidas vs protocoladas
          </SwissCardDescription>
        </SwissCardHeader>
        <SwissCardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockEvolucao}>
                <defs>
                  <linearGradient id="colorRecebidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(35, 70%, 55%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(35, 70%, 55%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProtocoladas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(158, 55%, 42%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(158, 55%, 42%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 88%)" />
                <XAxis dataKey="semana" stroke="hsl(240, 4%, 46%)" />
                <YAxis stroke="hsl(240, 4%, 46%)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid hsl(240, 6%, 88%)",
                    borderRadius: "8px",
                  }}
                />
                <Area type="monotone" dataKey="recebidas" stroke="hsl(35, 70%, 55%)" strokeWidth={2} fillOpacity={1} fill="url(#colorRecebidas)" />
                <Area type="monotone" dataKey="protocoladas" stroke="hsl(158, 55%, 42%)" strokeWidth={2} fillOpacity={1} fill="url(#colorProtocoladas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm text-muted-foreground">Recebidas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-muted-foreground">Protocoladas</span>
            </div>
          </div>
        </SwissCardContent>
      </SwissCard>

      {/* Prazos Próximos Timeline */}
      <SwissCard className="border-2 border-border/60">
        <SwissCardHeader>
          <SwissCardTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            Prazos nos Próximos Dias
          </SwissCardTitle>
          <SwissCardDescription>
            Timeline de vencimentos
          </SwissCardDescription>
        </SwissCardHeader>
        <SwissCardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockPrazosProximos}>
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
                <Bar dataKey="quantidade" fill="hsl(35, 70%, 55%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SwissCardContent>
      </SwissCard>

      {/* Demandas Urgentes */}
      <SwissCard className="border-2 border-border/60">
        <SwissCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <SwissCardTitle className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                Demandas Urgentes
              </SwissCardTitle>
              <SwissCardDescription>
                Requer atenção imediata
              </SwissCardDescription>
            </div>
            <Link href="/admin/demandas?urgente=true">
              <Button variant="ghost" size="sm">
                Ver Todas
              </Button>
            </Link>
          </div>
        </SwissCardHeader>
        <SwissCardContent>
          <div className="space-y-3">
            {mockDemandasUrgentes.map((demanda) => {
              const style = getPrioridadeStyle(demanda.prioridade);
              return (
                <Link key={demanda.id} href={`/admin/demandas/${demanda.id}`}>
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                    <div className={cn("w-1 h-12 rounded-full", style.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-base">{demanda.titulo}</p>
                        <Badge variant="outline" className={cn("text-xs font-bold", style.text)}>
                          {style.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{demanda.assistido}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="secondary" className="text-xs">{demanda.area}</Badge>
                        <span className={cn(
                          "text-xs font-semibold",
                          demanda.prazo === "Hoje" ? "text-red-600" : demanda.prazo === "Amanhã" ? "text-orange-600" : "text-muted-foreground"
                        )}>
                          Prazo: {demanda.prazo}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </SwissCardContent>
      </SwissCard>

      {/* Ações Rápidas */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Link href="/admin/demandas">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2">
            <FileText className="h-5 w-5" />
            <span className="text-sm font-semibold">Ver Todas</span>
          </Button>
        </Link>
        <Link href="/admin/demandas/nova">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2">
            <Plus className="h-5 w-5" />
            <span className="text-sm font-semibold">Nova Demanda</span>
          </Button>
        </Link>
        <Link href="/admin/prazos">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2">
            <Clock className="h-5 w-5" />
            <span className="text-sm font-semibold">Prazos</span>
          </Button>
        </Link>
        <Link href="/admin/kanban">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2">
            <Target className="h-5 w-5" />
            <span className="text-sm font-semibold">Kanban</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
