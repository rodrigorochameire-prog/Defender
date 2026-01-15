"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
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
  Dog, 
  Users, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Pill, 
  Syringe, 
  Plus,
  BarChart3,
  PieChart,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  AlertTriangle,
  CreditCard,
  ChevronRight,
  PawPrint,
  Package,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { DashboardSkeleton } from "@/components/shared/skeletons";
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
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart
} from "recharts";

const NEUTRAL_COLORS = ["#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState("month");
  
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: checkedInPets, isLoading: petsLoading } = trpc.dashboard.checkedInPets.useQuery();
  const { data: vaccineStats } = trpc.vaccines.stats.useQuery();
  const { data: allPets } = trpc.pets.list.useQuery();
  const { data: petsAttention } = trpc.analytics.petsRequiringAttention.useQuery();
  const { data: dailyStatus } = trpc.petManagement.getDailyStatusCards.useQuery();
  const { data: lowStockPets } = trpc.petManagement.getLowStockPets.useQuery();

  // Dados calculados para gráficos
  const chartData = useMemo(() => {
    if (!allPets) return { breeds: [], status: [], timeline: [] };

    // Contagem por raça
    const breedCount: Record<string, number> = {};
    allPets.forEach(pet => {
      const breed = pet.breed || "Sem raça";
      breedCount[breed] = (breedCount[breed] || 0) + 1;
    });
    const breeds = Object.entries(breedCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Status de aprovação
    const statusCount = {
      approved: allPets.filter(p => p.approvalStatus === "approved").length,
      pending: allPets.filter(p => p.approvalStatus === "pending").length,
      rejected: allPets.filter(p => p.approvalStatus === "rejected").length,
    };
    const status = [
      { name: "Aprovados", value: statusCount.approved },
      { name: "Pendentes", value: statusCount.pending },
      { name: "Rejeitados", value: statusCount.rejected },
    ].filter(s => s.value > 0);

    // Dados de timeline simulados (últimos 7 dias)
    const timeline = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toLocaleDateString("pt-BR", { weekday: "short" }),
        checkins: Math.floor(Math.random() * 10) + 1,
        cadastros: Math.floor(Math.random() * 3),
      };
    });

    return { breeds, status, timeline };
  }, [allPets]);

  if (statsLoading || petsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral da creche e gestão de pets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs para diferentes visualizações */}
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
          {/* Cards de Status do Dia */}
          {dailyStatus && (
            <div className="grid gap-3 md:grid-cols-4">
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                        {dailyStatus.petsScheduledToEnter}
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Pets para entrar</p>
                    </div>
                    <Dog className="h-8 w-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                        {dailyStatus.medicationsToApply}
                      </p>
                      <p className="text-sm text-purple-600 dark:text-purple-400">Medicamentos hoje</p>
                    </div>
                    <Pill className="h-8 w-8 text-purple-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className={`${dailyStatus.lowStockPets > 0 
                ? "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800" 
                : "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-3xl font-bold ${dailyStatus.lowStockPets > 0 
                        ? "text-orange-700 dark:text-orange-300" 
                        : "text-green-700 dark:text-green-300"}`}>
                        {dailyStatus.lowStockPets}
                      </p>
                      <p className={`text-sm ${dailyStatus.lowStockPets > 0 
                        ? "text-orange-600 dark:text-orange-400" 
                        : "text-green-600 dark:text-green-400"}`}>
                        Estoques baixos
                      </p>
                    </div>
                    <Package className={`h-8 w-8 opacity-50 ${dailyStatus.lowStockPets > 0 
                      ? "text-orange-500" : "text-green-500"}`} />
                  </div>
                </CardContent>
              </Card>

              <Card className={`${dailyStatus.behaviorAlertsCount > 0 
                ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" 
                : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-3xl font-bold ${dailyStatus.behaviorAlertsCount > 0 
                        ? "text-red-700 dark:text-red-300" 
                        : "text-slate-700 dark:text-slate-300"}`}>
                        {dailyStatus.behaviorAlertsCount}
                      </p>
                      <p className={`text-sm ${dailyStatus.behaviorAlertsCount > 0 
                        ? "text-red-600 dark:text-red-400" 
                        : "text-slate-600 dark:text-slate-400"}`}>
                        Alertas comportamento
                      </p>
                    </div>
                    <Zap className={`h-8 w-8 opacity-50 ${dailyStatus.behaviorAlertsCount > 0 
                      ? "text-red-500" : "text-slate-500"}`} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Stats Cards - Cores Neutras */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pets</CardTitle>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <Dog className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalPets || 0}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Cadastrados na plataforma
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Na Creche</CardTitle>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.checkedIn || 0}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Pets presentes hoje
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Tutores</CardTitle>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalTutors || 0}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Cadastrados na plataforma
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.pendingApproval || 0}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Aguardando aprovação
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pets na Creche */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Pets na Creche</CardTitle>
                    <CardDescription className="mt-1">
                      Pets que fizeram check-in hoje
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {checkedInPets?.length || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {!checkedInPets || checkedInPets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                      <Dog className="h-12 w-12 text-slate-400" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground mb-2">Nenhum pet na creche</p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Faça o check-in dos pets quando chegarem
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {checkedInPets.slice(0, 5).map((pet) => (
                      <Link key={pet.id} href={`/admin/pets/${pet.id}`}>
                        <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-semibold">
                              {pet.name[0]}
                            </div>
                            <div>
                              <p className="font-medium">{pet.name}</p>
                              <p className="text-sm text-muted-foreground">{pet.breed || "Sem raça"}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">Na creche</Badge>
                        </div>
                      </Link>
                    ))}
                    {checkedInPets.length > 5 && (
                      <Link href="/admin/pets">
                        <Button variant="outline" className="w-full mt-4">
                          Ver todos ({checkedInPets.length})
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vacinas */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Estatísticas de Vacinas</CardTitle>
                    <CardDescription className="mt-1">
                      Visão geral das vacinações
                    </CardDescription>
                  </div>
                  <Syringe className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <p className="text-2xl font-bold">{vaccineStats?.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <p className="text-2xl font-bold">{vaccineStats?.upcoming || 0}</p>
                    <p className="text-xs text-muted-foreground">Próximas</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-slate-200 dark:bg-slate-700">
                    <p className="text-2xl font-bold">{vaccineStats?.overdue || 0}</p>
                    <p className="text-xs text-muted-foreground">Atrasadas</p>
                  </div>
                </div>
                <Link href="/admin/vaccines">
                  <Button variant="outline" className="w-full mt-4">
                    Ver todas as vacinas
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Pets com Estoque Baixo */}
          {lowStockPets && lowStockPets.length > 0 && (
            <Card className="shadow-sm border-orange-200 dark:border-orange-900">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Estoques de Ração Baixos</CardTitle>
                      <CardDescription className="mt-1">
                        Avisar tutores para reposição
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowStockPets.slice(0, 5).map((pet) => (
                    <Link key={pet.id} href={`/admin/pets/${pet.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {pet.photoUrl ? (
                              <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                            ) : (
                              <PawPrint className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{pet.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {pet.foodBrand || "Ração"} • {pet.foodStockGrams ? `${(pet.foodStockGrams / 1000).toFixed(1)} kg` : "0 kg"}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={pet.alertLevel === "empty" ? "destructive" : 
                                   pet.alertLevel === "critical" ? "destructive" : "secondary"}
                          className="gap-1"
                        >
                          {pet.daysRemaining <= 0 ? "Zerado" : `${pet.daysRemaining} dias`}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pets que Requerem Atenção */}
          {petsAttention && petsAttention.summary.petsAffected > 0 && (
            <Card className="shadow-sm border-amber-200 dark:border-amber-900">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Pets que Requerem Atenção</CardTitle>
                      <CardDescription className="mt-1">
                        {petsAttention.summary.totalAlerts} alertas pendentes
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {petsAttention.summary.vaccinesDue > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <Syringe className="h-3 w-3" />
                        {petsAttention.summary.vaccinesDue}
                      </Badge>
                    )}
                    {petsAttention.summary.medicationsToday > 0 && (
                      <Badge variant="default" className="gap-1">
                        <Pill className="h-3 w-3" />
                        {petsAttention.summary.medicationsToday}
                      </Badge>
                    )}
                    {petsAttention.summary.lowCredits > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <CreditCard className="h-3 w-3" />
                        {petsAttention.summary.lowCredits}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {petsAttention.items.slice(0, 5).map((item) => (
                    <Link key={item.petId} href={`/admin/pets/${item.petId}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {item.petPhoto ? (
                              <img src={item.petPhoto} alt={item.petName} className="w-full h-full object-cover" />
                            ) : (
                              <PawPrint className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{item.petName}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.alerts.slice(0, 2).map((alert, i) => (
                                <span key={i} className="text-xs text-muted-foreground">
                                  {alert.message}{i < Math.min(item.alerts.length, 2) - 1 && " • "}
                                </span>
                              ))}
                              {item.alerts.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{item.alerts.length - 2}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
                {petsAttention.items.length > 5 && (
                  <Link href="/admin/analytics">
                    <Button variant="outline" className="w-full mt-4">
                      Ver todos ({petsAttention.summary.petsAffected} pets)
                    </Button>
                  </Link>
                )}
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
                <Link href="/admin/pets/new">
                  <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                    <Dog className="h-6 w-6" />
                    <span>Novo Pet</span>
                  </Button>
                </Link>
                <Link href="/admin/logs">
                  <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                    <Clock className="h-6 w-6" />
                    <span>Registrar Log</span>
                  </Button>
                </Link>
                <Link href="/admin/calendar">
                  <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                    <Calendar className="h-6 w-6" />
                    <span>Calendário</span>
                  </Button>
                </Link>
                <Link href="/admin/finances">
                  <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                    <TrendingUp className="h-6 w-6" />
                    <span>Finanças</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Análises com Gráficos */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Gráfico de Raças */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Distribuição por Raça
                </CardTitle>
                <CardDescription>Top 6 raças cadastradas</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.breeds.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.breeds} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={100} 
                          stroke="#94a3b8" 
                          fontSize={12}
                          tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + '...' : value}
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
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Status */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Status de Aprovação
                </CardTitle>
                <CardDescription>Distribuição por status</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.status.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={chartData.status}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {chartData.status.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={NEUTRAL_COLORS[index % NEUTRAL_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Timeline */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Atividade nos Últimos 7 Dias
              </CardTitle>
              <CardDescription>Check-ins e novos cadastros</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
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
                      dataKey="checkins" 
                      name="Check-ins"
                      stroke="#475569" 
                      fill="#94a3b8" 
                      fillOpacity={0.3}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cadastros" 
                      name="Cadastros"
                      stroke="#64748b" 
                      fill="#cbd5e1" 
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
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Dog className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium">Pets Ativos</p>
                        <p className="text-sm text-muted-foreground">Com status aprovado</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">{allPets?.filter(p => p.approvalStatus === 'approved').length || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Calendar className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium">Check-ins Hoje</p>
                        <p className="text-sm text-muted-foreground">Pets presentes na creche</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">{checkedInPets?.length || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Syringe className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium">Vacinas Pendentes</p>
                        <p className="text-sm text-muted-foreground">Próximas ou atrasadas</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">{(vaccineStats?.upcoming || 0) + (vaccineStats?.overdue || 0)}</span>
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
                      <span className="text-sm text-muted-foreground">Taxa de Aprovação</span>
                      <span className="font-medium">
                        {allPets && allPets.length > 0 
                          ? Math.round((allPets.filter(p => p.approvalStatus === 'approved').length / allPets.length) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-500 rounded-full transition-all"
                        style={{ 
                          width: `${allPets && allPets.length > 0 
                            ? (allPets.filter(p => p.approvalStatus === 'approved').length / allPets.length) * 100
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Ocupação Diária</span>
                      <span className="font-medium">
                        {allPets && allPets.length > 0 
                          ? Math.round(((checkedInPets?.length || 0) / allPets.filter(p => p.approvalStatus === 'approved').length) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-400 rounded-full transition-all"
                        style={{ 
                          width: `${allPets && allPets.length > 0 
                            ? ((checkedInPets?.length || 0) / allPets.filter(p => p.approvalStatus === 'approved').length) * 100
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Vacinas em Dia</span>
                      <span className="font-medium">
                        {vaccineStats && vaccineStats.total > 0 
                          ? Math.round(((vaccineStats.total - (vaccineStats.overdue || 0)) / vaccineStats.total) * 100)
                          : 100}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-600 rounded-full transition-all"
                        style={{ 
                          width: `${vaccineStats && vaccineStats.total > 0 
                            ? ((vaccineStats.total - (vaccineStats.overdue || 0)) / vaccineStats.total) * 100
                            : 100}%` 
                        }}
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
