"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { useAssignment } from "@/contexts/assignment-context";

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
  audienciasHoje: 3,
  jurisMes: 4,
  demandas: {
    fila: 45,
    atender: 28,
    monitorar: 15,
    protocolado: 67,
  },
  totalAssistidos: 156,
  totalProcessos: 287,
};

const mockPrazosUrgentes = [
  { id: 1, assistido: "Diego Bonfim Almeida", processo: "8012906-74.2025.8.05.0039", ato: "Resposta à Acusação", prazo: "Hoje", prioridade: "REU_PRESO", diasRestantes: 0 },
  { id: 2, assistido: "Maria Silva Santos", processo: "0001234-56.2025.8.05.0039", ato: "Alegações Finais", prazo: "Amanhã", prioridade: "URGENTE", diasRestantes: 1 },
  { id: 3, assistido: "José Carlos Oliveira", processo: "0005678-90.2025.8.05.0039", ato: "Memoriais", prazo: "Em 2 dias", prioridade: "ALTA", diasRestantes: 2 },
  { id: 4, assistido: "Ana Paula Costa", processo: "0009012-34.2025.8.05.0039", ato: "Recurso em Sentido Estrito", prazo: "Em 3 dias", prioridade: "NORMAL", diasRestantes: 3 },
];

const mockAudienciasHoje = [
  { id: 1, hora: "09:00", assistido: "Carlos Eduardo Lima", tipo: "Instrução", vara: "1ª Vara Criminal" },
  { id: 2, hora: "14:00", assistido: "Maria Fernanda Souza", tipo: "Custódia", vara: "CEAC" },
  { id: 3, hora: "16:00", assistido: "Pedro Henrique Alves", tipo: "Justificação", vara: "VEC" },
];

const mockJurisMes = [
  { id: 1, data: "17/01", assistido: "Roberto Silva", crime: "Art. 121 §2º", defensor: "Dr. Rodrigo" },
  { id: 2, data: "19/01", assistido: "Marcos Souza", crime: "Art. 121 c/c 14, II", defensor: "Dra. Juliane" },
  { id: 3, data: "24/01", assistido: "João Pedro Costa", crime: "Art. 121", defensor: "Dr. Rodrigo" },
  { id: 4, data: "31/01", assistido: "Lucas Oliveira", crime: "Art. 121 §2º, I", defensor: "Dr. Marcos" },
];

const mockDemandasPorArea = [
  { area: "Júri", value: 32 },
  { area: "Exec. Penal", value: 45 },
  { area: "VVD", value: 28 },
  { area: "Substituição", value: 18 },
  { area: "Curadoria", value: 12 },
  { area: "Família", value: 8 },
];

const mockFunilPrazos = [
  { name: "Aberto", value: 45, fill: "hsl(240, 4%, 65%)" },
  { name: "Elaborando", value: 28, fill: "hsl(25, 70%, 55%)" },
  { name: "Revisão", value: 15, fill: "hsl(158, 50%, 45%)" },
  { name: "Protocolado", value: 67, fill: "hsl(158, 64%, 28%)" },
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

// Títulos específicos por atribuição
const DASHBOARD_TITLES: Record<string, { title: string; subtitle: string }> = {
  JURI_CAMACARI: {
    title: "Painel do Júri",
    subtitle: "Gestão de processos e plenários da Vara do Júri de Camaçari",
  },
  VVD_CAMACARI: {
    title: "Central VVD",
    subtitle: "Violência Doméstica - Proteção e celeridade",
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

export default function SalaDeGuerra() {
  const [activeView, setActiveView] = useState<"overview" | "analytics">("overview");
  const { currentAssignment, config } = useAssignment();
  
  const dashboardInfo = DASHBOARD_TITLES[currentAssignment] || DASHBOARD_TITLES.SUBSTITUICAO;

  return (
    <div className="space-y-6">
      {/* Header - Dinâmico por atribuição */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div 
            className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              background: `linear-gradient(145deg, ${config.accentColor}, ${config.accentColorDark})`,
            }}
          >
            <BarChart3 className="h-7 w-7 text-white" />
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
        <div className="flex items-center gap-2">
          <Button
            variant={activeView === "overview" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("overview")}
            style={{
              backgroundColor: activeView === "overview" ? config.accentColor : undefined,
            }}
          >
            Visão Geral
          </Button>
          <Button
            variant={activeView === "analytics" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("analytics")}
            style={{
              backgroundColor: activeView === "analytics" ? config.accentColor : undefined,
            }}
          >
            Análises
          </Button>
        </div>
      </div>

      {activeView === "overview" ? (
        <>
          {/* Cards de Alerta - Prioridade Zero */}
          <div className="grid gap-4 md:grid-cols-4">
            {/* Réus Presos */}
            <Card className="stat-card fatal">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-4xl font-bold">{mockStats.reusPresos}</p>
                    <p className="text-sm font-medium mt-1">Réus Presos</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prioridade máxima</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertOctagon className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prazos Hoje */}
            <Card className="stat-card urgente">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-4xl font-bold">{mockStats.prazosHoje}</p>
                    <p className="text-sm font-medium mt-1">Prazos Hoje</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{mockStats.prazosSemana} na semana</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Timer className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audiências Hoje */}
            <Card className="stat-card">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-4xl font-bold">{mockStats.audienciasHoje}</p>
                    <p className="text-sm font-medium mt-1">Audiências Hoje</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Compromissos agendados</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Júris do Mês */}
            <Card className="stat-card">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-4xl font-bold">{mockStats.jurisMes}</p>
                    <p className="text-sm font-medium mt-1">Júris no Mês</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Sessões plenárias</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Gavel className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Seção Principal */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Prazos Urgentes - 2 colunas */}
            <Card className="lg:col-span-2 section-card">
              <CardHeader className="pb-4 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Timer className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Prazos Urgentes</CardTitle>
                      <CardDescription className="mt-0.5">
                        Demandas que exigem atenção imediata
                      </CardDescription>
                    </div>
                  </div>
                  <Link href="/admin/prazos">
                    <Button variant="ghost" size="sm" className="gap-1">
                      Ver todos
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {mockPrazosUrgentes.map((prazo) => {
                    const style = getPrioridadeStyle(prazo.prioridade);
                    return (
                      <Link key={prazo.id} href={`/admin/demandas/${prazo.id}`}>
                        <div className={`flex items-center gap-4 p-4 rounded-xl ${style.bg} hover:opacity-90 transition-all cursor-pointer`}>
                          <div className={`w-1.5 h-12 rounded-full ${style.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold truncate">{prazo.assistido}</p>
                              <Badge variant="outline" className={`text-[10px] font-semibold ${style.text}`}>
                                {style.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{prazo.ato}</p>
                            <p className="text-xs font-mono text-muted-foreground mt-0.5">{prazo.processo}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${prazo.diasRestantes === 0 ? "text-red-600" : "text-muted-foreground"}`}>
                              {prazo.prazo}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Audiências de Hoje */}
            <Card className="section-card">
              <CardHeader className="pb-4 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Audiências Hoje</CardTitle>
                      <CardDescription className="mt-0.5">
                        {mockAudienciasHoje.length} compromissos
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {mockAudienciasHoje.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Briefcase className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Sem audiências hoje</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mockAudienciasHoje.map((audiencia) => (
                      <div
                        key={audiencia.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="text-center min-w-[50px]">
                          <p className="text-lg font-bold text-primary">{audiencia.hora}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{audiencia.assistido}</p>
                          <p className="text-xs text-muted-foreground truncate">{audiencia.vara}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {audiencia.tipo}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Júris do Mês */}
          <Card className="section-card">
            <CardHeader className="pb-4 border-b border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Gavel className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Sessões do Júri</CardTitle>
                    <CardDescription className="mt-0.5">
                      Plenários agendados para este mês
                    </CardDescription>
                  </div>
                </div>
                <Link href="/admin/juri">
                  <Button variant="ghost" size="sm" className="gap-1">
                    Ver todos
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {mockJurisMes.map((juri) => (
                  <Link key={juri.id} href={`/admin/juri/${juri.id}`}>
                    <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 hover:border-purple-300 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-center bg-purple-100 dark:bg-purple-900/50 rounded-lg px-3 py-1.5">
                          <p className="text-lg font-bold text-purple-600">{juri.data}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                      </div>
                      <p className="font-semibold text-sm">{juri.assistido}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{juri.crime}</p>
                      <p className="text-xs text-muted-foreground">{juri.defensor}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <div className="grid gap-3 md:grid-cols-4">
            <Link href="/admin/assistidos/novo">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-colors">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">Novo Assistido</span>
              </Button>
            </Link>
            <Link href="/admin/demandas/nova">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-colors">
                <FileText className="h-5 w-5" />
                <span className="text-sm font-medium">Nova Demanda</span>
              </Button>
            </Link>
            <Link href="/admin/kanban">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-colors">
                <Target className="h-5 w-5" />
                <span className="text-sm font-medium">Kanban</span>
              </Button>
            </Link>
            <Link href="/admin/calendar">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-colors">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-medium">Calendário</span>
              </Button>
            </Link>
          </div>
        </>
      ) : (
        /* Analytics View */
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Radar de Carga */}
          <Card className="section-card">
            <CardHeader className="pb-4 border-b border-border/30">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Radar de Carga
              </CardTitle>
              <CardDescription>Distribuição por área de atuação</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={mockDemandasPorArea}>
                    <PolarGrid stroke="hsl(240, 6%, 88%)" />
                    <PolarAngleAxis
                      dataKey="area"
                      tick={{ fill: "hsl(240, 4%, 46%)", fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, "auto"]}
                      tick={{ fill: "hsl(240, 4%, 46%)", fontSize: 10 }}
                    />
                    <Radar
                      name="Demandas"
                      dataKey="value"
                      stroke="hsl(158, 64%, 28%)"
                      fill="hsl(158, 64%, 28%)"
                      fillOpacity={0.3}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid hsl(240, 6%, 88%)",
                        borderRadius: "8px",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Funil de Prazos */}
          <Card className="section-card">
            <CardHeader className="pb-4 border-b border-border/30">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Funil de Prazos
              </CardTitle>
              <CardDescription>Status das demandas em andamento</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mockFunilPrazos}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 88%)" horizontal={false} />
                    <XAxis type="number" stroke="hsl(240, 4%, 46%)" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      stroke="hsl(240, 4%, 46%)"
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid hsl(240, 6%, 88%)",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {mockFunilPrazos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Indicadores de Performance */}
          <Card className="section-card lg:col-span-2">
            <CardHeader className="pb-4 border-b border-border/30">
              <CardTitle className="text-base">Indicadores de Performance</CardTitle>
              <CardDescription>Métricas de eficiência operacional</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Taxa de Cumprimento</span>
                    <span className="font-semibold text-emerald-600">94%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: "94%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Prazos em Dia</span>
                    <span className="font-semibold">87%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "87%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Atendimentos Realizados</span>
                    <span className="font-semibold">78%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "78%" }} />
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-4 mt-6 pt-6 border-t border-border/30">
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-3xl font-bold">{mockStats.totalAssistidos}</p>
                  <p className="text-sm text-muted-foreground mt-1">Assistidos</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-3xl font-bold">{mockStats.totalProcessos}</p>
                  <p className="text-sm text-muted-foreground mt-1">Processos</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-3xl font-bold">{mockStats.demandas.protocolado}</p>
                  <p className="text-sm text-muted-foreground mt-1">Protocolados (mês)</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-3xl font-bold text-emerald-600">94%</p>
                  <p className="text-sm text-muted-foreground mt-1">Eficiência</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
