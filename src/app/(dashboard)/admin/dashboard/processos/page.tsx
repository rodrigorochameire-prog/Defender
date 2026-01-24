"use client";

import { SwissCard, SwissCardContent, SwissCardHeader, SwissCardTitle, SwissCardDescription } from "@/components/ui/swiss-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Scale, 
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Plus,
  Calendar,
  Gavel,
  FileSearch,
  Activity,
  Timer,
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
} from "recharts";
import { useAssignment } from "@/contexts/assignment-context";
import { cn } from "@/lib/utils";

// Mock data para demonstração
const mockProcessosStats = {
  total: 287,
  ativos: 245,
  aguardandoJulgamento: 32,
  concluidos: 42,
  prazosProximos: 15,
  audienciasSemana: 12,
};

const mockStatusDistribuicao = [
  { name: "Em Instrução", value: 85, color: "hsl(35, 70%, 55%)" },
  { name: "Aguardando Julgamento", value: 32, color: "hsl(0, 65%, 55%)" },
  { name: "Recurso", value: 48, color: "hsl(210, 60%, 55%)" },
  { name: "Execução", value: 80, color: "hsl(280, 55%, 55%)" },
  { name: "Concluído", value: 42, color: "hsl(158, 55%, 42%)" },
];

const mockPorArea = [
  { area: "Júri", quantidade: 68 },
  { area: "V. Doméstica", quantidade: 52 },
  { area: "Execução Penal", quantidade: 75 },
  { area: "Substituição", quantidade: 92 },
];

const mockTempoMedio = [
  { fase: "Recebimento", dias: 12 },
  { fase: "Instrução", dias: 180 },
  { fase: "Julgamento", dias: 45 },
  { fase: "Recurso", dias: 120 },
];

const mockEvolucao = [
  { mes: "Jul", novos: 22, concluidos: 18 },
  { mes: "Ago", novos: 28, concluidos: 24 },
  { mes: "Set", novos: 25, concluidos: 22 },
  { mes: "Out", novos: 30, concluidos: 28 },
  { mes: "Nov", novos: 26, concluidos: 32 },
  { mes: "Dez", novos: 32, concluidos: 35 },
];

const mockProcessosUrgentes = [
  { 
    id: 1, 
    numero: "8012906-74.2025.8.05.0039", 
    assistido: "Diego Bonfim Almeida", 
    status: "AGUARDANDO_JULGAMENTO",
    area: "Júri",
    proximaAudiencia: "25/01/2026",
    diasPrazo: 5,
  },
  { 
    id: 2, 
    numero: "0001234-56.2025.8.05.0039", 
    assistido: "Maria Silva Santos", 
    status: "PRAZO_PROXIMO",
    area: "V. Doméstica",
    proximaAudiencia: "27/01/2026",
    diasPrazo: 3,
  },
  { 
    id: 3, 
    numero: "0005678-90.2025.8.05.0039", 
    assistido: "José Carlos Oliveira", 
    status: "AGUARDANDO_JULGAMENTO",
    area: "Execução",
    proximaAudiencia: "28/01/2026",
    diasPrazo: 4,
  },
  { 
    id: 4, 
    numero: "0009012-34.2025.8.05.0039", 
    assistido: "Ana Paula Costa", 
    status: "EM_INSTRUCAO",
    area: "Substituição",
    proximaAudiencia: "30/01/2026",
    diasPrazo: 6,
  },
];

function getStatusStyle(status: string) {
  switch (status) {
    case "AGUARDANDO_JULGAMENTO":
      return { bg: "bg-red-50 dark:bg-red-950/50", text: "text-red-700 dark:text-red-400", label: "AGUARDANDO JULGAMENTO" };
    case "PRAZO_PROXIMO":
      return { bg: "bg-orange-50 dark:bg-orange-950/50", text: "text-orange-700 dark:text-orange-400", label: "PRAZO PRÓXIMO" };
    case "EM_INSTRUCAO":
      return { bg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-700 dark:text-blue-400", label: "EM INSTRUÇÃO" };
    default:
      return { bg: "bg-zinc-50 dark:bg-zinc-900", text: "text-zinc-600 dark:text-zinc-400", label: "ATIVO" };
  }
}

export default function ProcessosDashboardPage() {
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
            <Scale className="h-7 w-7 md:h-8 md:w-8 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">Processos</h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Gestão de processos judiciais e andamentos
            </p>
          </div>
        </div>
        <Link href="/admin/processos/novo">
          <Button className="gap-2 shadow-md">
            <Plus className="h-4 w-4" />
            Novo Processo
          </Button>
        </Link>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        <SwissCard className="border-l-[3px] border-l-emerald-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Scale className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-emerald-600">{mockProcessosStats.total}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Total</p>
          </SwissCardContent>
        </SwissCard>

        <SwissCard className="border-l-[3px] border-l-blue-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">{mockProcessosStats.ativos}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Ativos</p>
          </SwissCardContent>
        </SwissCard>

        <SwissCard className="border-l-[3px] border-l-red-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Gavel className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">{mockProcessosStats.aguardandoJulgamento}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Aguard. Julg.</p>
          </SwissCardContent>
        </SwissCard>

        <SwissCard className="border-l-[3px] border-l-teal-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
              </div>
              <p className="text-3xl font-bold text-teal-600">{mockProcessosStats.concluidos}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Concluídos</p>
          </SwissCardContent>
        </SwissCard>

        <SwissCard className="border-l-[3px] border-l-orange-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Timer className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-orange-600">{mockProcessosStats.prazosProximos}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Prazos Próx.</p>
          </SwissCardContent>
        </SwissCard>

        <SwissCard className="border-l-[3px] border-l-purple-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-600">{mockProcessosStats.audienciasSemana}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Audiências</p>
          </SwissCardContent>
        </SwissCard>
      </div>

      {/* Gráficos de Análise */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribuição por Status */}
        <SwissCard className="border-2 border-border/60">
          <SwissCardHeader>
            <SwissCardTitle className="flex items-center gap-3">
              <FileSearch className="h-5 w-5 text-primary" />
              Distribuição por Status
            </SwissCardTitle>
            <SwissCardDescription>
              Fases processuais em andamento
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

        {/* Distribuição por Área */}
        <SwissCard className="border-2 border-border/60">
          <SwissCardHeader>
            <SwissCardTitle className="flex items-center gap-3">
              <Gavel className="h-5 w-5 text-primary" />
              Processos por Área
            </SwissCardTitle>
            <SwissCardDescription>
              Distribuição entre atribuições
            </SwissCardDescription>
          </SwissCardHeader>
          <SwissCardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockPorArea}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 88%)" />
                  <XAxis dataKey="area" stroke="hsl(240, 4%, 46%)" fontSize={12} />
                  <YAxis stroke="hsl(240, 4%, 46%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid hsl(240, 6%, 88%)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="quantidade" fill={config.accentColor} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SwissCardContent>
        </SwissCard>
      </div>

      {/* Tempo Médio por Fase */}
      <SwissCard className="border-2 border-border/60">
        <SwissCardHeader>
          <SwissCardTitle className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            Tempo Médio por Fase Processual
          </SwissCardTitle>
          <SwissCardDescription>
            Duração média em dias de cada etapa
          </SwissCardDescription>
        </SwissCardHeader>
        <SwissCardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockTempoMedio} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 88%)" />
                <XAxis type="number" stroke="hsl(240, 4%, 46%)" fontSize={12} />
                <YAxis type="category" dataKey="fase" stroke="hsl(240, 4%, 46%)" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid hsl(240, 6%, 88%)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="dias" fill="hsl(210, 60%, 55%)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SwissCardContent>
      </SwissCard>

      {/* Evolução Mensal */}
      <SwissCard className="border-2 border-border/60">
        <SwissCardHeader>
          <SwissCardTitle className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução nos Últimos 6 Meses
          </SwissCardTitle>
          <SwissCardDescription>
            Novos processos vs processos concluídos
          </SwissCardDescription>
        </SwissCardHeader>
        <SwissCardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockEvolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 88%)" />
                <XAxis dataKey="mes" stroke="hsl(240, 4%, 46%)" />
                <YAxis stroke="hsl(240, 4%, 46%)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid hsl(240, 6%, 88%)",
                    borderRadius: "8px",
                  }}
                />
                <Line type="monotone" dataKey="novos" stroke="hsl(35, 70%, 55%)" strokeWidth={2} name="Novos Processos" />
                <Line type="monotone" dataKey="concluidos" stroke="hsl(158, 55%, 42%)" strokeWidth={2} name="Concluídos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm text-muted-foreground">Novos Processos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-muted-foreground">Concluídos</span>
            </div>
          </div>
        </SwissCardContent>
      </SwissCard>

      {/* Processos com Atenção Urgente */}
      <SwissCard className="border-2 border-border/60">
        <SwissCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <SwissCardTitle className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                Processos Prioritários
              </SwissCardTitle>
              <SwissCardDescription>
                Casos aguardando julgamento ou com prazos próximos
              </SwissCardDescription>
            </div>
            <Link href="/admin/processos">
              <Button variant="ghost" size="sm">
                Ver Todos
              </Button>
            </Link>
          </div>
        </SwissCardHeader>
        <SwissCardContent>
          <div className="space-y-3">
            {mockProcessosUrgentes.map((processo) => {
              const style = getStatusStyle(processo.status);
              return (
                <Link key={processo.id} href={`/admin/processos/${processo.id}`}>
                  <div className="flex items-center gap-4 p-4 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-base font-mono">{processo.numero}</p>
                        <Badge variant="outline" className={cn("text-xs font-bold", style.text)}>
                          {style.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{processo.assistido}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">{processo.area}</Badge>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Próxima audiência: {processo.proximaAudiencia}
                        </span>
                        <span className={cn(
                          "font-semibold",
                          processo.diasPrazo <= 3 ? "text-red-600" : processo.diasPrazo <= 5 ? "text-orange-600" : ""
                        )}>
                          {processo.diasPrazo} dias
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
        <Link href="/admin/processos">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2">
            <Scale className="h-5 w-5" />
            <span className="text-sm font-semibold">Ver Todos</span>
          </Button>
        </Link>
        <Link href="/admin/processos/novo">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2">
            <Plus className="h-5 w-5" />
            <span className="text-sm font-semibold">Novo Processo</span>
          </Button>
        </Link>
        <Link href="/admin/audiencias">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2">
            <Calendar className="h-5 w-5" />
            <span className="text-sm font-semibold">Audiências</span>
          </Button>
        </Link>
        <Link href="/admin/prazos">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2">
            <Clock className="h-5 w-5" />
            <span className="text-sm font-semibold">Prazos</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
