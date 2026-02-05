"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  Lock,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Timer,
  TrendingUp,
  User,
  Users,
  Building2,
  Scale,
  Gavel,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PainelReuPresoProps {
  defensorId?: number;
}

// Configuração de unidades prisionais
const UNIDADES_PRISIONAIS = [
  { value: "CADEIA_PUBLICA", label: "Cadeia Publica", icon: Building2, cor: "amber" },
  { value: "PENITENCIARIA", label: "Penitenciaria", icon: Lock, cor: "red" },
  { value: "COP", label: "COP", icon: Building2, cor: "orange" },
  { value: "HOSPITAL_CUSTODIA", label: "Hospital de Custodia", icon: Building2, cor: "purple" },
  { value: "DOMICILIAR", label: "Prisao Domiciliar", icon: MapPin, cor: "blue" },
  { value: "MONITORADO", label: "Monitoramento Eletronico", icon: Timer, cor: "green" },
];

// Limites legais de prisão preventiva (em dias)
const LIMITES_PRISAO = {
  custodia: 90, // Audiência de custódia - prazo razoável
  instrucao_simples: 180, // Instrução simples
  instrucao_complexa: 360, // Instrução complexa
  juri: 540, // Processos de júri
  excesso_claro: 730, // 2 anos - excesso claro
};

export function PainelReuPreso({ defensorId }: PainelReuPresoProps) {
  const [busca, setBusca] = useState("");
  const [filtroUnidade, setFiltroUnidade] = useState<string>("todos");
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>("todos");
  const [tabAtiva, setTabAtiva] = useState("todos");

  // Buscar assistidos presos
  const { data: assistidos, isLoading, refetch } = trpc.assistidos.list.useQuery({
    statusPrisional: filtroUnidade !== "todos" ? filtroUnidade : undefined,
  });

  // Buscar demandas com réu preso
  const { data: demandas, isLoading: loadingDemandas } = trpc.demandas.list.useQuery({
    reuPreso: true,
  });

  // Filtrar apenas presos (não SOLTO)
  const assistidosPresos = useMemo(() => {
    if (!assistidos) return [];
    return assistidos.filter(
      (a) => a.statusPrisional && a.statusPrisional !== "SOLTO"
    );
  }, [assistidos]);

  // Calcular métricas
  const metricas = useMemo(() => {
    const hoje = new Date();
    let totalPresos = 0;
    let emExcesso = 0;
    let proximoExcesso = 0;
    let semDataPrisao = 0;

    const porUnidade: Record<string, number> = {};

    assistidosPresos.forEach((a) => {
      totalPresos++;

      // Contar por unidade
      const unidade = a.statusPrisional || "OUTRO";
      porUnidade[unidade] = (porUnidade[unidade] || 0) + 1;

      // Verificar tempo de prisão
      if (a.dataPrisao) {
        const diasPreso = differenceInDays(hoje, new Date(a.dataPrisao));
        if (diasPreso > LIMITES_PRISAO.excesso_claro) {
          emExcesso++;
        } else if (diasPreso > LIMITES_PRISAO.instrucao_simples) {
          proximoExcesso++;
        }
      } else {
        semDataPrisao++;
      }
    });

    return { totalPresos, emExcesso, proximoExcesso, semDataPrisao, porUnidade };
  }, [assistidosPresos]);

  // Filtrar e ordenar assistidos
  const assistidosFiltrados = useMemo(() => {
    let lista = [...assistidosPresos];

    // Filtro de busca
    if (busca) {
      const termoBusca = busca.toLowerCase();
      lista = lista.filter(
        (a) =>
          a.nome.toLowerCase().includes(termoBusca) ||
          a.cpf?.includes(termoBusca) ||
          a.unidadePrisional?.toLowerCase().includes(termoBusca)
      );
    }

    // Filtro de unidade
    if (filtroUnidade !== "todos") {
      lista = lista.filter((a) => a.statusPrisional === filtroUnidade);
    }

    // Filtro de urgência
    if (filtroUrgencia !== "todos") {
      const hoje = new Date();
      lista = lista.filter((a) => {
        if (!a.dataPrisao) return filtroUrgencia === "sem_data";
        const diasPreso = differenceInDays(hoje, new Date(a.dataPrisao));

        if (filtroUrgencia === "excesso") return diasPreso > LIMITES_PRISAO.excesso_claro;
        if (filtroUrgencia === "atencao") return diasPreso > LIMITES_PRISAO.instrucao_simples;
        if (filtroUrgencia === "normal") return diasPreso <= LIMITES_PRISAO.instrucao_simples;
        return true;
      });
    }

    // Ordenar por tempo de prisão (mais antigo primeiro)
    lista.sort((a, b) => {
      if (!a.dataPrisao && !b.dataPrisao) return 0;
      if (!a.dataPrisao) return 1;
      if (!b.dataPrisao) return -1;
      return new Date(a.dataPrisao).getTime() - new Date(b.dataPrisao).getTime();
    });

    return lista;
  }, [assistidosPresos, busca, filtroUnidade, filtroUrgencia]);

  // Demandas urgentes de réu preso
  const demandasUrgentes = useMemo(() => {
    if (!demandas) return [];
    const hoje = new Date();
    return demandas
      .filter((d) => {
        const prazo = d.prazoFinal || (d.prazo ? new Date(d.prazo) : null);
        if (!prazo) return false;
        const diasAte = differenceInDays(new Date(prazo), hoje);
        return diasAte <= 7;
      })
      .sort((a, b) => {
        const prazoA = a.prazoFinal || (a.prazo ? new Date(a.prazo) : new Date(9999, 11, 31));
        const prazoB = b.prazoFinal || (b.prazo ? new Date(b.prazo) : new Date(9999, 11, 31));
        return new Date(prazoA).getTime() - new Date(prazoB).getTime();
      })
      .slice(0, 10);
  }, [demandas]);

  const calcularStatusPrisao = (dataPrisao: string | null) => {
    if (!dataPrisao) return { status: "sem_data", label: "Sem data", cor: "gray", dias: 0 };

    const dias = differenceInDays(new Date(), new Date(dataPrisao));

    if (dias > LIMITES_PRISAO.excesso_claro) {
      return { status: "excesso", label: "EXCESSO DE PRAZO", cor: "red", dias };
    }
    if (dias > LIMITES_PRISAO.juri) {
      return { status: "critico", label: "Atencao: >18 meses", cor: "orange", dias };
    }
    if (dias > LIMITES_PRISAO.instrucao_simples) {
      return { status: "atencao", label: "Atencao: >6 meses", cor: "yellow", dias };
    }
    return { status: "normal", label: `${dias} dias`, cor: "green", dias };
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-200 dark:bg-purple-800">
                <Lock className="h-5 w-5 text-purple-700 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {isLoading ? "..." : metricas.totalPresos}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">Total de Presos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-200 dark:bg-red-800 animate-pulse">
                <AlertTriangle className="h-5 w-5 text-red-700 dark:text-red-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {isLoading ? "..." : metricas.emExcesso}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">Em Excesso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-200 dark:bg-amber-800">
                <Clock className="h-5 w-5 text-amber-700 dark:text-amber-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {isLoading ? "..." : metricas.proximoExcesso}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Requer Atencao</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-200 dark:bg-blue-800">
                <FileText className="h-5 w-5 text-blue-700 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {loadingDemandas ? "..." : demandasUrgentes.length}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Prazos Urgentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <AlertCircle className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {isLoading ? "..." : metricas.semDataPrisao}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Sem Data Prisao</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de excesso */}
      {metricas.emExcesso > 0 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/50">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/50 animate-pulse">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-red-800 dark:text-red-200">
                  ALERTA: {metricas.emExcesso} assistido(s) com EXCESSO DE PRAZO de prisao!
                </p>
                <p className="text-sm text-red-600 dark:text-red-300">
                  Prisao superior a 2 anos sem sentenca - verificar possibilidade de HC por excesso
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setFiltroUrgencia("excesso")}>
                Ver casos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assistidos Presos
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas unidades</SelectItem>
                  {UNIDADES_PRISIONAIS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroUrgencia} onValueChange={setFiltroUrgencia}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Urgencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="excesso">Excesso de prazo</SelectItem>
                  <SelectItem value="atencao">Requer atencao</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="sem_data">Sem data prisao</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
            <TabsList className="mb-4">
              <TabsTrigger value="todos">
                Todos ({assistidosFiltrados.length})
              </TabsTrigger>
              <TabsTrigger value="demandas" className="text-blue-600">
                Prazos Urgentes ({demandasUrgentes.length})
              </TabsTrigger>
              <TabsTrigger value="unidades">
                Por Unidade
              </TabsTrigger>
            </TabsList>

            {/* Lista de Presos */}
            <TabsContent value="todos">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : assistidosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhum assistido preso encontrado</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {assistidosFiltrados.map((assistido) => {
                      const statusPrisao = calcularStatusPrisao(assistido.dataPrisao);
                      const unidadeConfig = UNIDADES_PRISIONAIS.find(
                        (u) => u.value === assistido.statusPrisional
                      );
                      const UnidadeIcon = unidadeConfig?.icon || Building2;

                      return (
                        <Link href={`/admin/assistidos/${assistido.id}`} key={assistido.id}>
                          <Card
                            className={cn(
                              "transition-all hover:shadow-md cursor-pointer",
                              statusPrisao.status === "excesso" &&
                                "border-red-400 bg-red-50/50 dark:bg-red-950/20",
                              statusPrisao.status === "critico" &&
                                "border-orange-400 bg-orange-50/50 dark:bg-orange-950/20",
                              statusPrisao.status === "atencao" &&
                                "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                            )}
                          >
                            <CardContent className="py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      "p-2 rounded-full",
                                      statusPrisao.status === "excesso" && "bg-red-100 dark:bg-red-900",
                                      statusPrisao.status === "critico" && "bg-orange-100 dark:bg-orange-900",
                                      statusPrisao.status === "atencao" && "bg-amber-100 dark:bg-amber-900",
                                      statusPrisao.status === "normal" && "bg-green-100 dark:bg-green-900",
                                      statusPrisao.status === "sem_data" && "bg-gray-100 dark:bg-gray-800"
                                    )}
                                  >
                                    <User className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold">{assistido.nome}</p>
                                      {statusPrisao.status === "excesso" && (
                                        <Badge variant="destructive" className="text-xs animate-pulse">
                                          EXCESSO DE PRAZO
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                      <span className="flex items-center gap-1">
                                        <UnidadeIcon className="h-3 w-3" />
                                        {unidadeConfig?.label || assistido.statusPrisional}
                                      </span>
                                      {assistido.unidadePrisional && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {assistido.unidadePrisional}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  {/* Tempo de prisão */}
                                  <div className="text-right">
                                    <p
                                      className={cn(
                                        "text-sm font-semibold",
                                        statusPrisao.cor === "red" && "text-red-600",
                                        statusPrisao.cor === "orange" && "text-orange-600",
                                        statusPrisao.cor === "yellow" && "text-amber-600",
                                        statusPrisao.cor === "green" && "text-green-600",
                                        statusPrisao.cor === "gray" && "text-gray-500"
                                      )}
                                    >
                                      {statusPrisao.dias > 0
                                        ? `${statusPrisao.dias} dias preso`
                                        : statusPrisao.label}
                                    </p>
                                    {assistido.dataPrisao && (
                                      <p className="text-xs text-muted-foreground">
                                        Desde {format(new Date(assistido.dataPrisao), "dd/MM/yyyy", { locale: ptBR })}
                                      </p>
                                    )}
                                  </div>

                                  {/* Barra de progresso do tempo */}
                                  {statusPrisao.dias > 0 && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="w-20">
                                            <Progress
                                              value={Math.min((statusPrisao.dias / LIMITES_PRISAO.excesso_claro) * 100, 100)}
                                              className={cn(
                                                "h-2",
                                                statusPrisao.status === "excesso" && "[&>div]:bg-red-500",
                                                statusPrisao.status === "critico" && "[&>div]:bg-orange-500",
                                                statusPrisao.status === "atencao" && "[&>div]:bg-amber-500",
                                                statusPrisao.status === "normal" && "[&>div]:bg-green-500"
                                              )}
                                            />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{statusPrisao.dias} de {LIMITES_PRISAO.excesso_claro} dias (limite excesso)</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}

                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Demandas Urgentes */}
            <TabsContent value="demandas">
              {loadingDemandas ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : demandasUrgentes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhum prazo urgente de reu preso</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {demandasUrgentes.map((demanda) => {
                      const prazo = demanda.prazoFinal || (demanda.prazo ? new Date(demanda.prazo) : null);
                      const diasAte = prazo ? differenceInDays(new Date(prazo), new Date()) : null;

                      return (
                        <Link href={`/admin/demandas/${demanda.id}`} key={demanda.id}>
                          <Card
                            className={cn(
                              "hover:shadow-md transition-all cursor-pointer",
                              diasAte !== null && diasAte < 0 && "border-red-400 bg-red-50/50",
                              diasAte === 0 && "border-orange-400 bg-orange-50/50"
                            )}
                          >
                            <CardContent className="py-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-purple-100 text-purple-700">
                                      <Lock className="h-3 w-3 mr-1" />
                                      REU PRESO
                                    </Badge>
                                    <span className="font-medium">{demanda.ato}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {demanda.assistido?.nome || "Assistido nao vinculado"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge
                                    variant={
                                      diasAte !== null && diasAte < 0
                                        ? "destructive"
                                        : diasAte === 0
                                        ? "default"
                                        : "outline"
                                    }
                                    className={diasAte === 0 ? "bg-orange-500" : ""}
                                  >
                                    {diasAte !== null
                                      ? diasAte < 0
                                        ? `${Math.abs(diasAte)} dias atras`
                                        : diasAte === 0
                                        ? "HOJE"
                                        : `${diasAte} dias`
                                      : "Sem prazo"}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Por Unidade */}
            <TabsContent value="unidades">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {UNIDADES_PRISIONAIS.map((unidade) => {
                  const count = metricas.porUnidade[unidade.value] || 0;
                  const UnidadeIcon = unidade.icon;

                  return (
                    <Card
                      key={unidade.value}
                      className={cn(
                        "cursor-pointer hover:shadow-md transition-all",
                        filtroUnidade === unidade.value && "ring-2 ring-primary"
                      )}
                      onClick={() => {
                        setFiltroUnidade(unidade.value);
                        setTabAtiva("todos");
                      }}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-full",
                            unidade.cor === "amber" && "bg-amber-100 dark:bg-amber-900",
                            unidade.cor === "red" && "bg-red-100 dark:bg-red-900",
                            unidade.cor === "orange" && "bg-orange-100 dark:bg-orange-900",
                            unidade.cor === "purple" && "bg-purple-100 dark:bg-purple-900",
                            unidade.cor === "blue" && "bg-blue-100 dark:bg-blue-900",
                            unidade.cor === "green" && "bg-green-100 dark:bg-green-900"
                          )}>
                            <UnidadeIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-xs text-muted-foreground">{unidade.label}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
