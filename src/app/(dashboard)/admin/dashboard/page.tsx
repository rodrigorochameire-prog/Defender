"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Calendar, 
  AlertCircle, 
  Clock, 
  Activity, 
  Plus,
  BarChart3,
  PieChart,
  Download,
  Eye,
  AlertTriangle,
  ChevronRight,
  Scale,
  Gavel,
  FileText,
  Timer,
  Target,
  TrendingUp,
  Briefcase,
  UserCheck,
  AlertOctagon,
  CheckCircle2,
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
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from "recharts";

// Cores neutras para gráficos
const NEUTRAL_COLORS = ["#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

// Dados mockados para demonstração
const mockStats = {
  totalAssistidos: 156,
  reusPresos: 42,
  totalProcessos: 287,
  prazosHoje: 8,
  prazosUrgentes: 15,
  audienciasHoje: 3,
  jurisSemana: 2,
};

const mockPrazosUrgentes = [
  { id: 1, assistido: "Diego Bonfim Almeida", processo: "8012906-74.2025.8.05.0039", ato: "Resposta à Acusação", prazo: "Hoje", prioridade: "REU_PRESO" },
  { id: 2, assistido: "Maria Silva Santos", processo: "0001234-56.2025.8.05.0039", ato: "Alegações Finais", prazo: "Amanhã", prioridade: "URGENTE" },
  { id: 3, assistido: "José Carlos Oliveira", processo: "0005678-90.2025.8.05.0039", ato: "Memoriais", prazo: "Em 2 dias", prioridade: "ALTA" },
  { id: 4, assistido: "Ana Paula Costa", processo: "0009012-34.2025.8.05.0039", ato: "Recurso", prazo: "Em 3 dias", prioridade: "NORMAL" },
];

const mockAudienciasHoje = [
  { id: 1, hora: "09:00", assistido: "Carlos Eduardo", tipo: "Instrução", vara: "1ª Vara Criminal" },
  { id: 2, hora: "14:00", assistido: "Maria Fernanda", tipo: "Custódia", vara: "CEAC" },
  { id: 3, hora: "16:00", assistido: "Pedro Henrique", tipo: "Conciliação", vara: "Juizado Especial" },
];

const mockJurisSemana = [
  { id: 1, data: "17/01", assistido: "Roberto Silva", defensor: "Dr. Rodrigo", sala: "Plenário 1" },
  { id: 2, data: "19/01", assistido: "Marcos Souza", defensor: "Dra. Juliane", sala: "Plenário 2" },
];

const mockDemandasPorStatus = [
  { name: "Fila", value: 45, color: "#94a3b8" },
  { name: "Atender", value: 28, color: "#f97316" },
  { name: "Monitorar", value: 15, color: "#eab308" },
  { name: "Protocolado", value: 67, color: "#22c55e" },
];

const mockDemandasPorArea = [
  { name: "Júri", value: 32 },
  { name: "Exec. Penal", value: 45 },
  { name: "Viol. Dom.", value: 28 },
  { name: "Substituição", value: 18 },
  { name: "Curadoria", value: 12 },
];

const mockAtividadeSemanal = [
  { dia: "Seg", protocolados: 12, recebidos: 8 },
  { dia: "Ter", protocolados: 15, recebidos: 10 },
  { dia: "Qua", protocolados: 8, recebidos: 14 },
  { dia: "Qui", protocolados: 18, recebidos: 6 },
  { dia: "Sex", protocolados: 22, recebidos: 9 },
];

function getPrioridadeBadge(prioridade: string) {
  const configs: Record<string, { variant: "default" | "destructive" | "secondary" | "outline", label: string }> = {
    REU_PRESO: { variant: "destructive", label: "RÉU PRESO" },
    URGENTE: { variant: "destructive", label: "URGENTE" },
    ALTA: { variant: "default", label: "ALTA" },
    NORMAL: { variant: "secondary", label: "NORMAL" },
    BAIXA: { variant: "outline", label: "BAIXA" },
  };
  const config = configs[prioridade] || configs.NORMAL;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState("week");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral da Defensoria e gestão de processos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-2">
            <Eye className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Análises
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Atividade
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {/* Cards de Status Urgente */}
          <div className="grid gap-3 md:grid-cols-4">
            <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                      {mockStats.prazosHoje}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">Prazos Hoje</p>
                  </div>
                  <Timer className="h-8 w-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                      {mockStats.prazosUrgentes}
                    </p>
                    <p className="text-sm text-orange-600 dark:text-orange-400">Prazos Urgentes</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                      {mockStats.audienciasHoje}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Audiências Hoje</p>
                  </div>
                  <Briefcase className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                      {mockStats.jurisSemana}
                    </p>
                    <p className="text-sm text-purple-600 dark:text-purple-400">Júris na Semana</p>
                  </div>
                  <Gavel className="h-8 w-8 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards Principais */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Assistidos</CardTitle>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{mockStats.totalAssistidos}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Cadastrados no sistema
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Réus Presos</CardTitle>
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertOctagon className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{mockStats.reusPresos}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Prioridade máxima
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Processos</CardTitle>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <Scale className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{mockStats.totalProcessos}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Processos ativos
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Demandas em Fila</CardTitle>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">45</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Aguardando análise
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Prazos Urgentes e Audiências */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Prazos Urgentes */}
            <Card className="shadow-sm border-red-200 dark:border-red-900">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <Timer className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Prazos Urgentes</CardTitle>
                      <CardDescription className="mt-1">
                        Demandas com prazo próximo
                      </CardDescription>
                    </div>
                  </div>
                  <Link href="/admin/prazos">
                    <Button variant="outline" size="sm">Ver todos</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockPrazosUrgentes.map((prazo) => (
                    <Link key={prazo.id} href={`/admin/demandas/${prazo.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{prazo.assistido}</p>
                          <p className="text-xs text-muted-foreground truncate">{prazo.ato}</p>
                          <p className="text-xs text-muted-foreground font-mono">{prazo.processo}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-sm font-medium text-red-600">{prazo.prazo}</span>
                          {getPrioridadeBadge(prazo.prioridade)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Audiências de Hoje */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Briefcase className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Audiências de Hoje</CardTitle>
                      <CardDescription className="mt-1">
                        Compromissos agendados
                      </CardDescription>
                    </div>
                  </div>
                  <Link href="/admin/audiencias">
                    <Button variant="outline" size="sm">Ver todas</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {mockAudienciasHoje.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                      <Briefcase className="h-12 w-12 text-slate-400" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground mb-2">Sem audiências hoje</p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Não há audiências agendadas para hoje
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mockAudienciasHoje.map((audiencia) => (
                      <Link key={audiencia.id} href={`/admin/audiencias/${audiencia.id}`}>
                        <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className="text-lg font-bold text-primary">{audiencia.hora}</p>
                            </div>
                            <div>
                              <p className="font-medium">{audiencia.assistido}</p>
                              <p className="text-xs text-muted-foreground">{audiencia.vara}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">{audiencia.tipo}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Júris da Semana */}
          {mockJurisSemana.length > 0 && (
            <Card className="shadow-sm border-purple-200 dark:border-purple-900">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Gavel className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Sessões do Júri</CardTitle>
                      <CardDescription className="mt-1">
                        Plenários agendados esta semana
                      </CardDescription>
                    </div>
                  </div>
                  <Link href="/admin/juri">
                    <Button variant="outline" size="sm">Ver todos</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {mockJurisSemana.map((juri) => (
                    <Link key={juri.id} href={`/admin/juri/${juri.id}`}>
                      <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer bg-purple-50/50 dark:bg-purple-950/20">
                        <div className="flex items-center gap-4">
                          <div className="text-center bg-purple-100 dark:bg-purple-900/50 rounded-lg px-3 py-2">
                            <p className="text-lg font-bold text-purple-600">{juri.data}</p>
                          </div>
                          <div>
                            <p className="font-medium">{juri.assistido}</p>
                            <p className="text-xs text-muted-foreground">{juri.defensor} • {juri.sala}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações Rápidas */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              <CardDescription>
                Acesso rápido às funcionalidades principais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Link href="/admin/assistidos/novo">
                  <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                    <Users className="h-6 w-6" />
                    <span>Novo Assistido</span>
                  </Button>
                </Link>
                <Link href="/admin/demandas/nova">
                  <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                    <FileText className="h-6 w-6" />
                    <span>Nova Demanda</span>
                  </Button>
                </Link>
                <Link href="/admin/calendar">
                  <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                    <Calendar className="h-6 w-6" />
                    <span>Calendário</span>
                  </Button>
                </Link>
                <Link href="/admin/kanban">
                  <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                    <Target className="h-6 w-6" />
                    <span>Kanban</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Análises */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Demandas por Status */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Demandas por Status
                </CardTitle>
                <CardDescription>Distribuição atual das demandas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={mockDemandasPorStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {mockDemandasPorStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Demandas por Área */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Demandas por Área
                </CardTitle>
                <CardDescription>Distribuição por área de atuação</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockDemandasPorArea} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={80} 
                        stroke="#94a3b8" 
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="value" fill="#64748b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Atividade Semanal */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Atividade Semanal
              </CardTitle>
              <CardDescription>Demandas protocoladas vs recebidas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockAtividadeSemanal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="dia" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="protocolados" 
                      name="Protocolados"
                      stroke="#22c55e" 
                      fill="#22c55e" 
                      fillOpacity={0.3}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="recebidos" 
                      name="Recebidos"
                      stroke="#f97316" 
                      fill="#f97316" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Atividade */}
        <TabsContent value="activity" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Resumo de Atividades */}
            <Card className="shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Resumo de Atividades</CardTitle>
                <CardDescription>Visão consolidada do período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Demandas Concluídas</p>
                        <p className="text-sm text-muted-foreground">Esta semana</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-green-600">67</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Audiências Realizadas</p>
                        <p className="text-sm text-muted-foreground">Esta semana</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">12</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <UserCheck className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Atendimentos</p>
                        <p className="text-sm text-muted-foreground">Esta semana</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">28</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Indicadores */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Indicadores</CardTitle>
                <CardDescription>Métricas de performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Taxa de Cumprimento</span>
                      <span className="font-medium text-green-600">94%</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: '94%' }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Prazos em Dia</span>
                      <span className="font-medium">87%</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: '87%' }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Atendimentos Realizados</span>
                      <span className="font-medium">78%</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full transition-all"
                        style={{ width: '78%' }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
