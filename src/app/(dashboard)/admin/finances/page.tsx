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
  TrendingUp, 
  CreditCard, 
  DollarSign,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Wallet,
  Receipt,
  BarChart3,
  CircleDollarSign,
  Dog,
  Eye,
  PieChart,
  Download,
  Filter
} from "lucide-react";
import { LoadingPage } from "@/components/shared/loading";
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
  AreaChart,
  Area
} from "recharts";

const NEUTRAL_COLORS = ["#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

export default function AdminFinances() {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: summary, isLoading } = trpc.finances.summary.useQuery();
  const { data: monthlyReport } = trpc.finances.monthlyReport.useQuery({ year, month });

  // Dados simulados para gráficos de evolução mensal
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        month: d.toLocaleDateString("pt-BR", { month: "short" }),
        vendas: Math.floor(Math.random() * 5000) + 2000,
        reembolsos: Math.floor(Math.random() * 500) + 100,
        creditos: Math.floor(Math.random() * 200) + 50,
      });
    }

    // Distribuição por pacote
    const packageData = summary?.packages?.map(pkg => ({
      name: pkg.name,
      value: pkg.credits,
      price: pkg.priceInCents / 100,
    })) || [];

    return { months, packageData };
  }, [summary]);

  if (isLoading) {
    return <LoadingPage />;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <CircleDollarSign className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Finanças</h1>
            <p className="text-sm text-muted-foreground">Visão geral financeira da creche</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((name, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => (
                <SelectItem key={i} value={String(currentDate.getFullYear() - i)}>
                  {currentDate.getFullYear() - i}
                </SelectItem>
              ))}
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
          <TabsTrigger value="packages" className="gap-2">
            <Package className="h-4 w-4" />
            Pacotes
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats - Cores Neutras */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm hover:shadow-md transition-shadow col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Receita Estimada</CardTitle>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <DollarSign className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatCurrency(summary?.estimatedRevenue || 0)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Baseado em créditos ativos
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Créditos</CardTitle>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <CreditCard className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary?.totalCredits || 0}</div>
                <p className="text-xs text-muted-foreground mt-2">Em circulação</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pets Ativos</CardTitle>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <Dog className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary?.activePets || 0}</div>
                <p className="text-xs text-muted-foreground mt-2">Aprovados</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Report - Cores Neutras */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Relatório de {monthNames[month - 1]} {year}
              </CardTitle>
              <CardDescription>Resumo financeiro do período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Vendas */}
                <div className="p-5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Vendas</span>
                    <ArrowUpRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(monthlyReport?.purchases?.total || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {monthlyReport?.purchases?.count || 0} transações
                  </p>
                </div>

                {/* Reembolsos */}
                <div className="p-5 rounded-xl border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Reembolsos</span>
                    <ArrowDownRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(monthlyReport?.refunds?.total || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {monthlyReport?.refunds?.count || 0} transações
                  </p>
                </div>

                {/* Receita Líquida */}
                <div className="p-5 rounded-xl border bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Receita Líquida</span>
                    <TrendingUp className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(monthlyReport?.netRevenue || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Vendas - Reembolsos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Análises */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Métricas Detalhadas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Média Mensal</p>
                    <p className="text-lg font-bold">
                      {formatCurrency((chartData.months.reduce((acc, m) => acc + m.vendas, 0) / 6) * 100)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <CreditCard className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Créditos Vendidos</p>
                    <p className="text-lg font-bold">
                      {chartData.months.reduce((acc, m) => acc + m.creditos, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <ArrowDownRight className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa de Reembolso</p>
                    <p className="text-lg font-bold">
                      {((chartData.months.reduce((acc, m) => acc + m.reembolsos, 0) / 
                        chartData.months.reduce((acc, m) => acc + m.vendas, 0)) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Package className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pacotes Ativos</p>
                    <p className="text-lg font-bold">
                      {summary?.packages?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Evolução Mensal */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Evolução Mensal
                </CardTitle>
                <CardDescription>Vendas e reembolsos dos últimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.months}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => [`R$ ${Number(value || 0).toFixed(2)}`, '']}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="vendas" 
                        name="Vendas"
                        stroke="#475569" 
                        fill="#94a3b8" 
                        fillOpacity={0.3}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="reembolsos" 
                        name="Reembolsos"
                        stroke="#64748b" 
                        fill="#cbd5e1" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Créditos por Mês */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Créditos Vendidos
                </CardTitle>
                <CardDescription>Volume de créditos por mês</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.months}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="creditos" name="Créditos" fill="#64748b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distribuição por Pacote */}
          {chartData.packageData.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribuição por Pacote
                </CardTitle>
                <CardDescription>Créditos por tipo de pacote</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={chartData.packageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {chartData.packageData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={NEUTRAL_COLORS[index % NEUTRAL_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Pacotes */}
        <TabsContent value="packages" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Pacotes de Créditos
              </CardTitle>
              <CardDescription>
                {summary?.packages?.length || 0} pacotes disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!summary?.packages || summary.packages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                    <Package className="h-12 w-12 text-slate-400" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground">Nenhum pacote cadastrado</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {summary.packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="p-4 rounded-xl border bg-card hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold">{pkg.name}</span>
                        {pkg.discountPercent > 0 && (
                          <Badge variant="secondary">-{pkg.discountPercent}%</Badge>
                        )}
                      </div>
                      {pkg.description && (
                        <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                      )}
                      <div className="text-2xl font-bold mb-2">
                        {formatCurrency(pkg.priceInCents)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          <CreditCard className="h-3.5 w-3.5 inline mr-1" />
                          {pkg.credits} créditos
                        </span>
                        <Badge variant={pkg.isActive ? "secondary" : "outline"}>
                          {pkg.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
