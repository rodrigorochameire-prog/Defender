"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Target,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  subWeeks,
  eachDayOfInterval,
  eachWeekOfInterval,
  isSameDay,
  isSameWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface RelatorioProdutividadeProps {
  defensorId?: number;
  showComparativo?: boolean;
}

const CORES_GRAFICO = [
  "#10B981", // green
  "#3B82F6", // blue
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
];

export function RelatorioProdutividade({
  defensorId,
  showComparativo = true,
}: RelatorioProdutividadeProps) {
  const [periodo, setPeriodo] = useState<"semana" | "mes" | "trimestre">("mes");
  const [tabAtiva, setTabAtiva] = useState("visao-geral");

  // Buscar demandas
  const { data: demandas, isLoading: loadingDemandas } = trpc.demandas.list.useQuery({});

  // Buscar assistidos
  const { data: assistidos, isLoading: loadingAssistidos } = trpc.assistidos.list.useQuery({});

  // Buscar atendimentos
  const { data: atendimentos, isLoading: loadingAtendimentos } = trpc.atendimentos?.list?.useQuery({}) || { data: [] };

  const isLoading = loadingDemandas || loadingAssistidos;

  // Calcular período de análise
  const periodoAnalise = useMemo(() => {
    const hoje = new Date();
    let inicio: Date;
    let fim: Date = hoje;
    let periodoAnteriorInicio: Date;
    let periodoAnteriorFim: Date;

    switch (periodo) {
      case "semana":
        inicio = startOfWeek(hoje, { locale: ptBR });
        fim = endOfWeek(hoje, { locale: ptBR });
        periodoAnteriorInicio = startOfWeek(subWeeks(hoje, 1), { locale: ptBR });
        periodoAnteriorFim = endOfWeek(subWeeks(hoje, 1), { locale: ptBR });
        break;
      case "trimestre":
        inicio = subMonths(startOfMonth(hoje), 2);
        periodoAnteriorInicio = subMonths(inicio, 3);
        periodoAnteriorFim = subMonths(fim, 3);
        break;
      case "mes":
      default:
        inicio = startOfMonth(hoje);
        fim = endOfMonth(hoje);
        periodoAnteriorInicio = startOfMonth(subMonths(hoje, 1));
        periodoAnteriorFim = endOfMonth(subMonths(hoje, 1));
    }

    return { inicio, fim, periodoAnteriorInicio, periodoAnteriorFim };
  }, [periodo]);

  // Métricas principais
  const metricas = useMemo(() => {
    if (!demandas) return null;

    const { inicio, fim, periodoAnteriorInicio, periodoAnteriorFim } = periodoAnalise;

    // Demandas do período atual
    const demandasPeriodo = demandas.filter((d) => {
      const criacao = new Date(d.createdAt);
      return criacao >= inicio && criacao <= fim;
    });

    // Demandas do período anterior (para comparação)
    const demandasPeriodoAnterior = demandas.filter((d) => {
      const criacao = new Date(d.createdAt);
      return criacao >= periodoAnteriorInicio && criacao <= periodoAnteriorFim;
    });

    // Concluídas no período
    const concluidas = demandas.filter((d) => {
      if (!["CONCLUIDO", "7_PROTOCOLADO", "7_CIENCIA"].includes(d.status || "")) return false;
      const update = new Date(d.updatedAt);
      return update >= inicio && update <= fim;
    });

    const concluidasAnterior = demandas.filter((d) => {
      if (!["CONCLUIDO", "7_PROTOCOLADO", "7_CIENCIA"].includes(d.status || "")) return false;
      const update = new Date(d.updatedAt);
      return update >= periodoAnteriorInicio && update <= periodoAnteriorFim;
    });

    // Pendentes
    const pendentes = demandas.filter(
      (d) => !["CONCLUIDO", "7_PROTOCOLADO", "7_CIENCIA", "ARQUIVADO"].includes(d.status || "")
    );

    // Calcular tempo médio de resolução
    const temposResolucao = concluidas
      .filter((d) => d.createdAt && d.updatedAt)
      .map((d) => {
        const criacao = new Date(d.createdAt);
        const conclusao = new Date(d.updatedAt);
        return Math.ceil((conclusao.getTime() - criacao.getTime()) / (1000 * 60 * 60 * 24));
      });
    const tempoMedioResolucao =
      temposResolucao.length > 0
        ? Math.round(temposResolucao.reduce((a, b) => a + b, 0) / temposResolucao.length)
        : 0;

    // Variações
    const variacaoCriadas =
      demandasPeriodoAnterior.length > 0
        ? ((demandasPeriodo.length - demandasPeriodoAnterior.length) /
            demandasPeriodoAnterior.length) *
          100
        : 0;

    const variacaoConcluidas =
      concluidasAnterior.length > 0
        ? ((concluidas.length - concluidasAnterior.length) / concluidasAnterior.length) * 100
        : 0;

    return {
      criadas: demandasPeriodo.length,
      criadasAnterior: demandasPeriodoAnterior.length,
      variacaoCriadas,
      concluidas: concluidas.length,
      concluidasAnterior: concluidasAnterior.length,
      variacaoConcluidas,
      pendentes: pendentes.length,
      tempoMedioResolucao,
      taxaConclusao: demandasPeriodo.length > 0 ? (concluidas.length / demandasPeriodo.length) * 100 : 0,
    };
  }, [demandas, periodoAnalise]);

  // Dados para gráfico de evolução
  const dadosEvolucao = useMemo(() => {
    if (!demandas) return [];

    const { inicio, fim } = periodoAnalise;
    const dias = eachDayOfInterval({ start: inicio, end: fim });

    return dias.map((dia) => {
      const criadas = demandas.filter((d) => isSameDay(new Date(d.createdAt), dia)).length;
      const concluidas = demandas.filter(
        (d) =>
          ["CONCLUIDO", "7_PROTOCOLADO", "7_CIENCIA"].includes(d.status || "") &&
          isSameDay(new Date(d.updatedAt), dia)
      ).length;

      return {
        data: format(dia, "dd/MM", { locale: ptBR }),
        criadas,
        concluidas,
      };
    });
  }, [demandas, periodoAnalise]);

  // Dados para gráfico por status
  const dadosPorStatus = useMemo(() => {
    if (!demandas) return [];

    const statusCount: Record<string, number> = {};
    demandas.forEach((d) => {
      const status = d.status || "SEM_STATUS";
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.replace(/_/g, " "),
      value: count,
    }));
  }, [demandas]);

  // Dados por tipo de ato
  const dadosPorAto = useMemo(() => {
    if (!demandas) return [];

    const atoCount: Record<string, number> = {};
    demandas.forEach((d) => {
      const ato = d.ato || "Outros";
      atoCount[ato] = (atoCount[ato] || 0) + 1;
    });

    return Object.entries(atoCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ato, count]) => ({
        ato,
        quantidade: count,
      }));
  }, [demandas]);

  const renderVariacao = (valor: number) => {
    if (valor > 0) {
      return (
        <span className="text-green-600 text-xs flex items-center gap-1">
          <ArrowUp className="h-3 w-3" />
          +{valor.toFixed(1)}%
        </span>
      );
    } else if (valor < 0) {
      return (
        <span className="text-red-600 text-xs flex items-center gap-1">
          <ArrowDown className="h-3 w-3" />
          {valor.toFixed(1)}%
        </span>
      );
    }
    return <span className="text-gray-500 text-xs">0%</span>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com filtro de período */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Relatorio de Produtividade
          </h3>
          <p className="text-sm text-muted-foreground">
            Periodo: {format(periodoAnalise.inicio, "dd/MM/yyyy", { locale: ptBR })} a{" "}
            {format(periodoAnalise.fim, "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as typeof periodo)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Esta Semana</SelectItem>
              <SelectItem value="mes">Este Mes</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {metricas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Demandas Criadas</p>
                  <p className="text-2xl font-bold">{metricas.criadas}</p>
                  {showComparativo && renderVariacao(metricas.variacaoCriadas)}
                </div>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Demandas Concluidas</p>
                  <p className="text-2xl font-bold text-green-600">{metricas.concluidas}</p>
                  {showComparativo && renderVariacao(metricas.variacaoConcluidas)}
                </div>
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-amber-600">{metricas.pendentes}</p>
                </div>
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Medio</p>
                  <p className="text-2xl font-bold">{metricas.tempoMedioResolucao} dias</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Taxa de conclusão */}
      {metricas && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Taxa de Conclusao do Periodo</span>
              <span className="text-lg font-bold text-green-600">
                {metricas.taxaConclusao.toFixed(1)}%
              </span>
            </div>
            <Progress value={metricas.taxaConclusao} className="h-3 [&>div]:bg-green-500" />
            <p className="text-xs text-muted-foreground mt-2">
              {metricas.concluidas} de {metricas.criadas} demandas concluidas no periodo
            </p>
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
        <TabsList>
          <TabsTrigger value="visao-geral">Evolucao</TabsTrigger>
          <TabsTrigger value="status">Por Status</TabsTrigger>
          <TabsTrigger value="tipos">Por Tipo de Ato</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolucao Diaria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dadosEvolucao}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="criadas"
                    name="Criadas"
                    stroke="#3B82F6"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="concluidas"
                    name="Concluidas"
                    stroke="#10B981"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuicao por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dadosPorStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {dadosPorStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tipos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 10 Tipos de Ato</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosPorAto} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="ato"
                    type="category"
                    tick={{ fontSize: 10 }}
                    width={150}
                  />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
