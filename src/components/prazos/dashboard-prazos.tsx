"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Clock,
  Calendar,
  User,
  FileText,
  ExternalLink,
  RefreshCw,
  Filter,
  AlertCircle,
  CheckCircle2,
  Timer,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardPrazosProps {
  defensorId?: number;
  className?: string;
  compact?: boolean;
  maxItems?: number;
}

export function DashboardPrazos({
  defensorId,
  className,
  compact = false,
  maxItems = 20,
}: DashboardPrazosProps) {
  const [diasFiltro, setDiasFiltro] = useState(7);
  const [apenasReuPreso, setApenasReuPreso] = useState(false);
  const [tabAtiva, setTabAtiva] = useState("todos");

  // Buscar estatísticas
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } =
    trpc.prazos.estatisticasPrazos.useQuery({ defensorId });

  // Buscar prazos críticos
  const { data: prazos, isLoading: loadingPrazos, refetch: refetchPrazos } =
    trpc.prazos.prazosCriticos.useQuery({
      diasAFrente: diasFiltro,
      incluirVencidos: true,
      apenasReuPreso,
      defensorId,
      limit: maxItems,
    });

  const handleRefresh = () => {
    refetchStats();
    refetchPrazos();
  };

  // Filtrar por tab
  const prazosFiltrados = prazos?.filter((p) => {
    if (tabAtiva === "vencidos") return p.urgencia === "VENCIDO";
    if (tabAtiva === "hoje") return p.urgencia === "HOJE";
    if (tabAtiva === "criticos") return p.urgencia === "CRITICO" || p.urgencia === "ATENCAO";
    if (tabAtiva === "reuPreso") return p.demanda.reuPreso;
    return true;
  });

  const getUrgenciaConfig = (urgencia: string) => {
    switch (urgencia) {
      case "VENCIDO":
        return {
          color: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200",
          icon: AlertTriangle,
          label: "VENCIDO",
        };
      case "HOJE":
        return {
          color: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200",
          icon: AlertCircle,
          label: "VENCE HOJE",
        };
      case "CRITICO":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-200",
          icon: Timer,
          label: "CRÍTICO",
        };
      case "ATENCAO":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200",
          icon: Clock,
          label: "ATENÇÃO",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200",
          icon: CheckCircle2,
          label: "NORMAL",
        };
    }
  };

  // Versão compacta para sidebar ou widget
  if (compact) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Prazos Críticos
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingPrazos ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !prazos?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum prazo crítico
            </p>
          ) : (
            <div className="space-y-2">
              {prazos.slice(0, 5).map((item) => {
                const config = getUrgenciaConfig(item.urgencia);
                return (
                  <Link
                    key={item.demanda.id}
                    href={`/admin/demandas/${item.demanda.id}`}
                    className={cn(
                      "block p-2 rounded border text-xs hover:opacity-80 transition-opacity",
                      config.color
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate max-w-[150px]">
                        {item.demanda.ato}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.diasRestantes !== null
                          ? item.diasRestantes < 0
                            ? `${Math.abs(item.diasRestantes)}d atrás`
                            : item.diasRestantes === 0
                            ? "HOJE"
                            : `${item.diasRestantes}d`
                          : "-"}
                      </Badge>
                    </div>
                    <div className="text-[10px] opacity-75 truncate">
                      {item.assistido?.nome}
                    </div>
                  </Link>
                );
              })}
              {prazos.length > 5 && (
                <Link href="/admin/prazos">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    Ver todos ({prazos.length})
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Versão completa
  return (
    <div className={cn("space-y-6", className)}>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {stats?.vencidos || 0}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {stats?.vencendoHoje || 0}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">Vencem Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {stats?.proximosDias || 0}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">Próx. 7 dias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {stats?.reuPreso || 0}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">Réu Preso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {stats?.total || 0}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Pendente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta para réu preso vencido */}
      {stats?.reuPresoVencido && stats.reuPresoVencido > 0 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 animate-pulse" />
              <div>
                <p className="font-semibold text-red-800 dark:text-red-200">
                  ATENÇÃO: {stats.reuPresoVencido} prazo(s) de RÉU PRESO vencido(s)!
                </p>
                <p className="text-sm text-red-600 dark:text-red-300">
                  Prioridade máxima - verificar imediatamente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros e Lista */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Prazos
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={diasFiltro.toString()}
                onValueChange={(v) => setDiasFiltro(parseInt(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 dias</SelectItem>
                  <SelectItem value="5">5 dias</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={apenasReuPreso ? "default" : "outline"}
                size="sm"
                onClick={() => setApenasReuPreso(!apenasReuPreso)}
              >
                <User className="h-4 w-4 mr-1" />
                Réu Preso
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
              >
                <RefreshCw className={cn("h-4 w-4", loadingPrazos && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
            <TabsList className="mb-4">
              <TabsTrigger value="todos">
                Todos ({prazos?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="vencidos" className="text-red-600">
                Vencidos ({prazos?.filter((p) => p.urgencia === "VENCIDO").length || 0})
              </TabsTrigger>
              <TabsTrigger value="hoje" className="text-orange-600">
                Hoje ({prazos?.filter((p) => p.urgencia === "HOJE").length || 0})
              </TabsTrigger>
              <TabsTrigger value="criticos" className="text-yellow-600">
                Críticos
              </TabsTrigger>
              <TabsTrigger value="reuPreso" className="text-purple-600">
                Réu Preso ({prazos?.filter((p) => p.demanda.reuPreso).length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={tabAtiva} className="mt-0">
              {loadingPrazos ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !prazosFiltrados?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum prazo nesta categoria</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {prazosFiltrados.map((item) => {
                      const config = getUrgenciaConfig(item.urgencia);
                      const Icon = config.icon;

                      return (
                        <div
                          key={item.demanda.id}
                          className={cn(
                            "p-4 rounded-lg border transition-all hover:shadow-md",
                            config.color
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold">
                                    {item.demanda.ato}
                                  </span>
                                  {item.demanda.reuPreso && (
                                    <Badge variant="destructive" className="text-xs">
                                      RÉU PRESO
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {item.demanda.status}
                                  </Badge>
                                </div>
                                <p className="text-sm mt-1">
                                  <User className="h-3 w-3 inline mr-1" />
                                  {item.assistido?.nome || "Assistido não vinculado"}
                                </p>
                                {item.processo && (
                                  <p className="text-xs opacity-75">
                                    {item.processo.numeroAutos} - {item.processo.vara}, {item.processo.comarca}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-lg font-bold">
                                {item.demanda.prazo
                                  ? new Date(item.demanda.prazo).toLocaleDateString("pt-BR")
                                  : "-"}
                              </div>
                              <div className="text-sm font-medium">
                                {item.diasRestantes !== null
                                  ? item.diasRestantes < 0
                                    ? `${Math.abs(item.diasRestantes)} dias atrás`
                                    : item.diasRestantes === 0
                                    ? "HOJE"
                                    : `${item.diasRestantes} dias`
                                  : "-"}
                              </div>
                              <Link href={`/admin/demandas/${item.demanda.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2"
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Abrir
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
