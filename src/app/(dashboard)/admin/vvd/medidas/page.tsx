"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  FileText,
  Filter,
  History,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  ShieldX,
  Timer,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import { KPICardPremium, KPIGrid } from "@/components/shared/kpi-card-premium";

// Tipos de MPU
const TIPOS_MPU = [
  { value: "afastamento_lar", label: "Afastamento do lar", icon: "home" },
  { value: "proibicao_aproximacao", label: "Proibição de aproximação", icon: "ban" },
  { value: "proibicao_contato", label: "Proibição de contato", icon: "phone-off" },
  { value: "proibicao_frequentacao", label: "Proibição de frequentação", icon: "map-pin" },
  { value: "restricao_visitas", label: "Restrição de visitas", icon: "users" },
  { value: "prestacao_alimentos", label: "Prestação de alimentos", icon: "wallet" },
  { value: "suspensao_posse_arma", label: "Suspensão de porte de arma", icon: "shield" },
  { value: "comparecimento_programa", label: "Comparecimento a programa", icon: "calendar" },
];

// Tipos de evento do histórico
const TIPOS_EVENTO = [
  { value: "deferimento", label: "Deferimento", color: "emerald" },
  { value: "indeferimento", label: "Indeferimento", color: "rose" },
  { value: "modulacao", label: "Modulação", color: "blue" },
  { value: "revogacao", label: "Revogação", color: "rose" },
  { value: "renovacao", label: "Renovação", color: "emerald" },
  { value: "descumprimento", label: "Descumprimento", color: "amber" },
];

export default function MonitoramentoMPUPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVencimento, setFilterVencimento] = useState<"todos" | "vencidas" | "7dias" | "30dias" | "ativas">("todos");
  const [selectedProcesso, setSelectedProcesso] = useState<any>(null);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [showNovoEventoModal, setShowNovoEventoModal] = useState(false);

  // Form do novo evento
  const [novoEvento, setNovoEvento] = useState({
    tipoEvento: "" as string,
    dataEvento: format(new Date(), "yyyy-MM-dd"),
    descricao: "",
    medidasVigentes: "",
    novaDataVencimento: "",
    novaDistancia: "",
  });

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.vvd.stats.useQuery();

  const { data: processosData, isLoading: processosLoading, refetch: refetchProcessos } = trpc.vvd.listProcessos.useQuery({
    search: searchTerm || undefined,
    mpuAtiva: filterVencimento === "ativas" ? true : undefined,
    mpuProximaVencer: filterVencimento === "30dias" ? true : undefined,
    limit: 100,
  });

  // Mutation para adicionar evento no histórico
  const addHistoricoMutation = trpc.vvd.addHistorico.useMutation({
    onSuccess: () => {
      toast.success("Evento registrado com sucesso!");
      setShowNovoEventoModal(false);
      setNovoEvento({
        tipoEvento: "",
        dataEvento: format(new Date(), "yyyy-MM-dd"),
        descricao: "",
        medidasVigentes: "",
        novaDataVencimento: "",
        novaDistancia: "",
      });
      refetchProcessos();
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Query para buscar detalhes do processo selecionado
  const { data: processoDetalhes, isLoading: loadingDetalhes } = trpc.vvd.getProcessoById.useQuery(
    { id: selectedProcesso?.id },
    { enabled: !!selectedProcesso?.id }
  );

  const processos = processosData?.processos || [];

  // Filtrar por vencimento
  const processosFiltrados = useMemo(() => {
    let filtered = processos;

    if (filterVencimento === "vencidas") {
      filtered = processos.filter(p => {
        if (!p.dataVencimentoMPU || !p.mpuAtiva) return false;
        return differenceInDays(parseISO(p.dataVencimentoMPU), new Date()) < 0;
      });
    } else if (filterVencimento === "7dias") {
      filtered = processos.filter(p => {
        if (!p.dataVencimentoMPU || !p.mpuAtiva) return false;
        const dias = differenceInDays(parseISO(p.dataVencimentoMPU), new Date());
        return dias >= 0 && dias <= 7;
      });
    } else if (filterVencimento === "30dias") {
      filtered = processos.filter(p => {
        if (!p.dataVencimentoMPU || !p.mpuAtiva) return false;
        const dias = differenceInDays(parseISO(p.dataVencimentoMPU), new Date());
        return dias >= 0 && dias <= 30;
      });
    } else if (filterVencimento === "ativas") {
      filtered = processos.filter(p => p.mpuAtiva);
    }

    return filtered;
  }, [processos, filterVencimento]);

  // Estatísticas de MPUs
  const mpuStats = useMemo(() => {
    const ativas = processos.filter(p => p.mpuAtiva);
    const vencidas = ativas.filter(p => {
      if (!p.dataVencimentoMPU) return false;
      return differenceInDays(parseISO(p.dataVencimentoMPU), new Date()) < 0;
    });
    const vencendo7dias = ativas.filter(p => {
      if (!p.dataVencimentoMPU) return false;
      const dias = differenceInDays(parseISO(p.dataVencimentoMPU), new Date());
      return dias >= 0 && dias <= 7;
    });
    const vencendo30dias = ativas.filter(p => {
      if (!p.dataVencimentoMPU) return false;
      const dias = differenceInDays(parseISO(p.dataVencimentoMPU), new Date());
      return dias > 7 && dias <= 30;
    });

    return {
      total: processos.length,
      ativas: ativas.length,
      vencidas: vencidas.length,
      vencendo7dias: vencendo7dias.length,
      vencendo30dias: vencendo30dias.length,
    };
  }, [processos]);

  // Helpers
  const getDiasRestantes = (dataVencimento: string | null) => {
    if (!dataVencimento) return null;
    return differenceInDays(parseISO(dataVencimento), new Date());
  };

  const getStatusBadge = (diasRestantes: number | null, mpuAtiva: boolean) => {
    if (!mpuAtiva) {
      return (
        <Badge variant="outline" className="text-zinc-400">
          <ShieldX className="w-3 h-3 mr-1" />
          Inativa
        </Badge>
      );
    }
    if (diasRestantes === null) {
      return (
        <Badge variant="outline">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Sem prazo
        </Badge>
      );
    }
    if (diasRestantes < 0) {
      return (
        <Badge className="bg-rose-500 hover:bg-rose-600">
          <ShieldAlert className="w-3 h-3 mr-1" />
          Vencida ({Math.abs(diasRestantes)}d)
        </Badge>
      );
    }
    if (diasRestantes <= 7) {
      return (
        <Badge className="bg-rose-500 hover:bg-rose-600 animate-pulse">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {diasRestantes}d restantes
        </Badge>
      );
    }
    if (diasRestantes <= 30) {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600">
          <Clock className="w-3 h-3 mr-1" />
          {diasRestantes}d restantes
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500 hover:bg-emerald-600">
        <ShieldCheck className="w-3 h-3 mr-1" />
        {diasRestantes}d
      </Badge>
    );
  };

  const handleAddEvento = () => {
    if (!selectedProcesso?.id || !novoEvento.tipoEvento) {
      toast.error("Selecione o tipo de evento");
      return;
    }

    addHistoricoMutation.mutate({
      processoVVDId: selectedProcesso.id,
      tipoEvento: novoEvento.tipoEvento as any,
      dataEvento: novoEvento.dataEvento,
      descricao: novoEvento.descricao || undefined,
      medidasVigentes: novoEvento.medidasVigentes || undefined,
      novaDataVencimento: novoEvento.novaDataVencimento || undefined,
      novaDistancia: novoEvento.novaDistancia ? parseInt(novoEvento.novaDistancia) : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/vvd">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Monitoramento de MPUs
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Medidas Protetivas de Urgência - Acompanhamento e Histórico
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetchStats();
              refetchProcessos();
            }}
            className="h-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards - Foco em MPU */}
        <KPIGrid columns={5}>
          <KPICardPremium
            title="Total Processos"
            value={mpuStats.total}
            icon={FileText}
            gradient="zinc"
          />
          <KPICardPremium
            title="MPUs Ativas"
            value={mpuStats.ativas}
            icon={ShieldCheck}
            gradient="emerald"
            onClick={() => setFilterVencimento("ativas")}
          />
          <KPICardPremium
            title="Vencidas"
            value={mpuStats.vencidas}
            icon={ShieldAlert}
            gradient={mpuStats.vencidas > 0 ? "rose" : "zinc"}
            onClick={() => setFilterVencimento("vencidas")}
          />
          <KPICardPremium
            title="Vence em 7 dias"
            value={mpuStats.vencendo7dias}
            icon={AlertTriangle}
            gradient={mpuStats.vencendo7dias > 0 ? "rose" : "zinc"}
            onClick={() => setFilterVencimento("7dias")}
          />
          <KPICardPremium
            title="Vence em 30 dias"
            value={mpuStats.vencendo30dias}
            icon={Clock}
            gradient={mpuStats.vencendo30dias > 0 ? "amber" : "zinc"}
            onClick={() => setFilterVencimento("30dias")}
          />
        </KPIGrid>

        {/* Alertas de MPUs Críticas */}
        {(mpuStats.vencidas > 0 || mpuStats.vencendo7dias > 0) && (
          <Card className="border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-rose-800 dark:text-rose-200">
                    Atenção: MPUs requerem ação imediata!
                  </p>
                  <p className="text-sm text-rose-600 dark:text-rose-300">
                    {mpuStats.vencidas > 0 && `${mpuStats.vencidas} vencida(s)`}
                    {mpuStats.vencidas > 0 && mpuStats.vencendo7dias > 0 && " • "}
                    {mpuStats.vencendo7dias > 0 && `${mpuStats.vencendo7dias} vencendo em 7 dias`}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700"
                  onClick={() => setFilterVencimento("vencidas")}
                >
                  Ver Urgentes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros e Lista */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Processos com MPU</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou número..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={filterVencimento} onValueChange={(v) => setFilterVencimento(v as any)}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativas">MPU Ativa</SelectItem>
                    <SelectItem value="vencidas">Vencidas</SelectItem>
                    <SelectItem value="7dias">Vence em 7 dias</SelectItem>
                    <SelectItem value="30dias">Vence em 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Autor (Assistido)</TableHead>
                    <TableHead>Vítima</TableHead>
                    <TableHead>Processo</TableHead>
                    <TableHead>Crime</TableHead>
                    <TableHead>Status MPU</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Distância</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processosLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : processosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        Nenhum processo encontrado com os filtros aplicados
                      </TableCell>
                    </TableRow>
                  ) : (
                    processosFiltrados.map((processo) => {
                      const diasRestantes = getDiasRestantes(processo.dataVencimentoMPU);
                      const isUrgente = diasRestantes !== null && diasRestantes <= 7;

                      return (
                        <TableRow
                          key={processo.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            isUrgente && processo.mpuAtiva && "bg-rose-50/50 dark:bg-rose-950/20"
                          )}
                          onClick={() => {
                            setSelectedProcesso(processo);
                            setShowHistoricoModal(true);
                          }}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{processo.autor?.nome || "Sem autor"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">-</span>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {processo.numeroAutos}
                            </code>
                          </TableCell>
                          <TableCell>
                            {processo.crime ? (
                              <Badge variant="outline">{processo.crime}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(diasRestantes, processo.mpuAtiva || false)}
                          </TableCell>
                          <TableCell>
                            {processo.dataVencimentoMPU ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {format(parseISO(processo.dataVencimentoMPU), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {processo.distanciaMinima ? (
                              <Badge variant="outline">
                                <MapPin className="w-3 h-3 mr-1" />
                                {processo.distanciaMinima}m
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProcesso(processo);
                                        setShowHistoricoModal(true);
                                      }}
                                    >
                                      <History className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver histórico</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProcesso(processo);
                                        setShowNovoEventoModal(true);
                                      }}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Registrar evento</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Histórico */}
      <Dialog open={showHistoricoModal} onOpenChange={setShowHistoricoModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico da MPU
            </DialogTitle>
            <DialogDescription>
              {selectedProcesso?.autor?.nome} - {selectedProcesso?.numeroAutos}
            </DialogDescription>
          </DialogHeader>

          {loadingDetalhes ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : processoDetalhes ? (
            <div className="space-y-4">
              {/* Status Atual */}
              <Card className={cn(
                "border-2",
                processoDetalhes.mpuAtiva
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                  : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/30"
              )}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Status Atual</p>
                      <div className="flex items-center gap-2 mt-1">
                        {processoDetalhes.mpuAtiva ? (
                          <Badge className="bg-emerald-500">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <ShieldX className="w-3 h-3 mr-1" />
                            Inativa
                          </Badge>
                        )}
                        {processoDetalhes.distanciaMinima && (
                          <Badge variant="outline">
                            <MapPin className="w-3 h-3 mr-1" />
                            {processoDetalhes.distanciaMinima}m
                          </Badge>
                        )}
                      </div>
                    </div>
                    {processoDetalhes.dataVencimentoMPU && (
                      <div className="text-right">
                        <p className="text-sm font-medium">Vencimento</p>
                        <p className="text-lg font-bold">
                          {format(parseISO(processoDetalhes.dataVencimentoMPU), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Timeline do Histórico */}
              <div>
                <h4 className="font-medium mb-3">Linha do Tempo</h4>
                <ScrollArea className="h-[300px]">
                  {processoDetalhes.historico && processoDetalhes.historico.length > 0 ? (
                    <div className="relative pl-4 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-4">
                      {processoDetalhes.historico.map((evento: any, idx: number) => {
                        const tipoInfo = TIPOS_EVENTO.find(t => t.value === evento.tipoEvento);
                        return (
                          <div key={idx} className="relative">
                            <div className={cn(
                              "absolute -left-[21px] w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900",
                              tipoInfo?.color === "emerald" && "bg-emerald-500",
                              tipoInfo?.color === "rose" && "bg-rose-500",
                              tipoInfo?.color === "blue" && "bg-blue-500",
                              tipoInfo?.color === "amber" && "bg-amber-500",
                              !tipoInfo && "bg-zinc-500"
                            )} />
                            <div className="ml-4 p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className={cn(
                                  tipoInfo?.color === "emerald" && "border-emerald-500 text-emerald-600",
                                  tipoInfo?.color === "rose" && "border-rose-500 text-rose-600",
                                  tipoInfo?.color === "blue" && "border-blue-500 text-blue-600",
                                  tipoInfo?.color === "amber" && "border-amber-500 text-amber-600"
                                )}>
                                  {tipoInfo?.label || evento.tipoEvento}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(evento.dataEvento), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              </div>
                              {evento.descricao && (
                                <p className="text-sm mt-2">{evento.descricao}</p>
                              )}
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {evento.novaDataVencimento && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Novo venc: {format(parseISO(evento.novaDataVencimento), "dd/MM/yyyy")}
                                  </Badge>
                                )}
                                {evento.novaDistancia && (
                                  <Badge variant="secondary" className="text-xs">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {evento.novaDistancia}m
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>Nenhum evento registrado</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              onClick={() => {
                setShowHistoricoModal(false);
                setShowNovoEventoModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Novo Evento */}
      <Dialog open={showNovoEventoModal} onOpenChange={setShowNovoEventoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Evento na MPU</DialogTitle>
            <DialogDescription>
              {selectedProcesso?.autor?.nome} - {selectedProcesso?.numeroAutos}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Evento *</Label>
              <Select
                value={novoEvento.tipoEvento}
                onValueChange={(v) => setNovoEvento({ ...novoEvento, tipoEvento: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_EVENTO.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data do Evento *</Label>
              <Input
                type="date"
                value={novoEvento.dataEvento}
                onChange={(e) => setNovoEvento({ ...novoEvento, dataEvento: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Detalhes do evento..."
                value={novoEvento.descricao}
                onChange={(e) => setNovoEvento({ ...novoEvento, descricao: e.target.value })}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nova Data de Vencimento</Label>
                <Input
                  type="date"
                  value={novoEvento.novaDataVencimento}
                  onChange={(e) => setNovoEvento({ ...novoEvento, novaDataVencimento: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nova Distância (metros)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 300"
                  value={novoEvento.novaDistancia}
                  onChange={(e) => setNovoEvento({ ...novoEvento, novaDistancia: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovoEventoModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddEvento}
              disabled={addHistoricoMutation.isPending}
            >
              {addHistoricoMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
