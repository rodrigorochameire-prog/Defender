"use client";

import { useState, Fragment } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Gavel,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

type TipoIntimacao = "CIENCIA" | "PETICIONAR" | "AUDIENCIA" | "CUMPRIMENTO" | "todos";
type StatusIntimacao = "pendente" | "ciencia_dada" | "respondida" | "arquivada" | "todos";

export default function IntimacoesVVDPage() {
  const [tipoFiltro, setTipoFiltro] = useState<TipoIntimacao>("todos");
  const [statusFiltro, setStatusFiltro] = useState<StatusIntimacao>("pendente");

  // Queries
  const { data: intimacoesData, isLoading, refetch } = trpc.vvd.listIntimacoes.useQuery({
    tipoIntimacao: tipoFiltro,
    status: statusFiltro === "todos" ? undefined : statusFiltro,
    limit: 100,
  });

  const darCienciaMutation = trpc.vvd.darCiencia.useMutation({
    onSuccess: () => {
      toast.success("Ciencia registrada com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao dar ciencia: ${error.message}`);
    },
  });

  const criarPeticaoMutation = trpc.vvd.criarPeticao.useMutation({
    onSuccess: (data) => {
      toast.success("Demanda criada com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar petição: ${error.message}`);
    },
  });

  // Audiência modal state
  const [audienciaModalOpen, setAudienciaModalOpen] = useState(false);
  const [audienciaIntimacaoId, setAudienciaIntimacaoId] = useState<number | null>(null);
  const [audienciaData, setAudienciaData] = useState("");
  const [audienciaTipo, setAudienciaTipo] = useState<"instrucao" | "conciliacao" | "justificacao" | "custodia" | "admonicao">("instrucao");
  const [audienciaLocal, setAudienciaLocal] = useState("");

  const criarAudienciaMutation = trpc.vvd.criarAudiencia.useMutation({
    onSuccess: (data) => {
      toast.success("Audiência criada com sucesso!");
      setAudienciaModalOpen(false);
      setAudienciaIntimacaoId(null);
      setAudienciaData("");
      setAudienciaTipo("instrucao");
      setAudienciaLocal("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar audiência: ${error.message}`);
    },
  });

  const handleAbrirModalAudiencia = (intimacaoId: number) => {
    setAudienciaIntimacaoId(intimacaoId);
    setAudienciaModalOpen(true);
  };

  const handleCriarAudiencia = () => {
    if (!audienciaIntimacaoId || !audienciaData) {
      toast.error("Informe a data/hora da audiência");
      return;
    }
    criarAudienciaMutation.mutate({
      intimacaoId: audienciaIntimacaoId,
      dataAudiencia: audienciaData,
      tipo: audienciaTipo,
      local: audienciaLocal || undefined,
    });
  };

  const intimacoes = intimacoesData || [];

  // Helpers
  const getDiasRestantes = (prazo: string | null) => {
    if (!prazo) return null;
    const dias = differenceInDays(parseISO(prazo), new Date());
    return dias;
  };

  const getPrazoBadge = (prazo: string | null) => {
    const diasRestantes = getDiasRestantes(prazo);
    if (diasRestantes === null) {
      return <Badge variant="outline">Sem prazo</Badge>;
    }
    if (diasRestantes < 0) {
      return <Badge variant="danger">Vencido ({Math.abs(diasRestantes)} dias)</Badge>;
    }
    if (diasRestantes <= 2) {
      return <Badge variant="outline" className="border-rose-300 text-rose-600 dark:border-rose-700 dark:text-rose-400">Urgente ({diasRestantes}d)</Badge>;
    }
    if (diasRestantes <= 5) {
      return <Badge variant="outline" className="border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400">{diasRestantes} dias</Badge>;
    }
    return <Badge variant="outline" className="border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400">{diasRestantes} dias</Badge>;
  };

  const getTipoBadge = (tipo: string) => {
    const tipos: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      CIENCIA: {
        label: "Ciência",
        className: "border-sky-300 text-sky-600 dark:border-sky-700 dark:text-sky-400",
        icon: <Eye className="h-3 w-3" />
      },
      PETICIONAR: {
        label: "Peticionar",
        className: "border-rose-300 text-rose-600 dark:border-rose-700 dark:text-rose-400",
        icon: <FileText className="h-3 w-3" />
      },
      AUDIENCIA: {
        label: "Audiência",
        className: "border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400",
        icon: <Gavel className="h-3 w-3" />
      },
      CUMPRIMENTO: {
        label: "Cumprimento",
        className: "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400",
        icon: <Check className="h-3 w-3" />
      },
    };
    const badge = tipos[tipo] || { label: tipo, className: "", icon: null };
    return (
      <Badge variant="outline" className={cn("flex items-center gap-1", badge.className)}>
        {badge.icon}
        {badge.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "danger" }> = {
      pendente: { label: "Pendente", variant: "default" },
      ciencia_dada: { label: "Ciencia Dada", variant: "secondary" },
      respondida: { label: "Respondida", variant: "secondary" },
      arquivada: { label: "Arquivada", variant: "outline" },
    };
    const badge = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  const handleDarCiencia = (id: number) => {
    darCienciaMutation.mutate({ id });
  };

  // Contadores
  const contadores = {
    total: intimacoes.length,
    pendentes: intimacoes.filter((i) => i.status === "pendente").length,
    ciencias: intimacoes.filter((i) => i.tipoIntimacao === "CIENCIA" && i.status === "pendente").length,
    peticionar: intimacoes.filter((i) => i.tipoIntimacao === "PETICIONAR" && i.status === "pendente").length,
    urgentes: intimacoes.filter((i) => {
      const dias = getDiasRestantes(i.prazo);
      return dias !== null && dias <= 2 && i.status === "pendente";
    }).length,
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Secundário - Padrão Defender */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/vvd">
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
            </Link>
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg shrink-0">
              <Bell className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Intimações VVD</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">Controle de prazos e ciências de violência doméstica</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
            <RefreshCw className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 md:p-6 space-y-6">

      {/* Stats Ribbon */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 text-xs overflow-x-auto scrollbar-none shadow-sm">
        {[
          { icon: Bell, value: contadores.total, label: "total", onClick: () => setStatusFiltro("todos"), active: statusFiltro === "todos" },
          { icon: Clock, value: contadores.pendentes, label: "pendentes", onClick: () => setStatusFiltro("pendente"), active: statusFiltro === "pendente", alert: contadores.pendentes > 0 },
          { icon: Eye, value: contadores.ciencias, label: "ciências", onClick: () => { setTipoFiltro("CIENCIA"); setStatusFiltro("pendente"); } },
          { icon: FileText, value: contadores.peticionar, label: "peticionar", onClick: () => { setTipoFiltro("PETICIONAR"); setStatusFiltro("pendente"); } },
          { icon: Shield, value: contadores.urgentes, label: "urgentes", alert: contadores.urgentes > 0 },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Fragment key={index}>
              {index > 0 && <div className="w-px h-4 bg-zinc-200/60 dark:bg-zinc-700/60 flex-shrink-0" />}
              <button
                onClick={stat.onClick}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-lg transition-colors",
                  stat.onClick && "cursor-pointer",
                  stat.active ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800",
                  stat.alert && !stat.active ? "bg-rose-50 dark:bg-rose-950/20" : ""
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", stat.alert ? "text-rose-500 dark:text-rose-400" : stat.active ? "text-emerald-500 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500")} />
                <span className={cn("font-bold tabular-nums", stat.alert ? "text-rose-600 dark:text-rose-400" : "text-zinc-800 dark:text-zinc-100")}>{stat.value}</span>
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">{stat.label}</span>
              </button>
            </Fragment>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as TipoIntimacao)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de intimacao" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="CIENCIA">Ciencia</SelectItem>
                <SelectItem value="PETICIONAR">Peticionar</SelectItem>
                <SelectItem value="AUDIENCIA">Audiencia</SelectItem>
                <SelectItem value="CUMPRIMENTO">Cumprimento</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as StatusIntimacao)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="ciencia_dada">Ciencia Dada</SelectItem>
                <SelectItem value="respondida">Respondida</SelectItem>
                <SelectItem value="arquivada">Arquivada</SelectItem>
              </SelectContent>
            </Select>
            {(tipoFiltro !== "todos" || statusFiltro !== "todos") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTipoFiltro("todos");
                  setStatusFiltro("todos");
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Intimacoes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>
              Intimacoes
              <Badge variant="outline" className="ml-2">{intimacoes.length}</Badge>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requerido</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Ato</TableHead>
                  <TableHead>Expedicao</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : intimacoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-30 text-emerald-500" />
                      <p>Nenhuma intimacao encontrada</p>
                      <p className="text-xs mt-1">
                        {statusFiltro === "pendente"
                          ? "Todas as intimacoes estao em dia!"
                          : "Altere os filtros para ver outras intimacoes"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  intimacoes.map((intimacao) => {
                    const diasRestantes = getDiasRestantes(intimacao.prazo);
                    const isUrgente = diasRestantes !== null && diasRestantes <= 2 && intimacao.status === "pendente";

                    return (
                      <TableRow
                        key={intimacao.id}
                        className={cn(
                          isUrgente && "bg-red-50 dark:bg-red-950/10"
                        )}
                      >
                        <TableCell className="font-medium">
                          {intimacao.requerido?.nome || "-"}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {intimacao.processo?.numeroAutos || "-"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="max-w-[200px] truncate block" title={intimacao.ato}>
                            {intimacao.ato}
                          </span>
                        </TableCell>
                        <TableCell>
                          {intimacao.dataExpedicao
                            ? format(parseISO(intimacao.dataExpedicao), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {intimacao.prazo ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {format(parseISO(intimacao.prazo), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                              {getPrazoBadge(intimacao.prazo)}
                            </div>
                          ) : (
                            intimacao.prazoDias ? (
                              <span className="text-sm text-muted-foreground">{intimacao.prazoDias} dias</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )
                          )}
                        </TableCell>
                        <TableCell>
                          {getTipoBadge(intimacao.tipoIntimacao)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(intimacao.status || "pendente")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {intimacao.tipoIntimacao === "CIENCIA" && intimacao.status === "pendente" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDarCiencia(intimacao.id)}
                                disabled={darCienciaMutation.isPending}
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Ciencia
                              </Button>
                            )}
                            {intimacao.tipoIntimacao === "PETICIONAR" && intimacao.status === "pendente" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => criarPeticaoMutation.mutate({ intimacaoId: intimacao.id })}
                                disabled={criarPeticaoMutation.isPending}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Petição
                              </Button>
                            )}
                            {intimacao.tipoIntimacao === "AUDIENCIA" && intimacao.status === "pendente" && !intimacao.audienciaId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAbrirModalAudiencia(intimacao.id)}
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                              >
                                <Gavel className="h-4 w-4 mr-1" />
                                Agendar
                              </Button>
                            )}
                            {intimacao.demandaId && (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                                Demanda #{intimacao.demandaId}
                              </Badge>
                            )}
                            {intimacao.audienciaId && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                <Calendar className="h-3 w-3 mr-1" />
                                Audiência #{intimacao.audienciaId}
                              </Badge>
                            )}
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

      {/* Modal Agendar Audiência */}
      <Dialog open={audienciaModalOpen} onOpenChange={setAudienciaModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-rose-600" />
              Agendar Audiência
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da audiência para criar o evento no calendário.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dataAudiencia">Data e Hora *</Label>
              <Input
                id="dataAudiencia"
                type="datetime-local"
                value={audienciaData}
                onChange={(e) => setAudienciaData(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tipoAudiencia">Tipo de Audiência</Label>
              <Select
                value={audienciaTipo}
                onValueChange={(v) => setAudienciaTipo(v as typeof audienciaTipo)}
              >
                <SelectTrigger id="tipoAudiencia">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instrucao">Instrução e Julgamento</SelectItem>
                  <SelectItem value="conciliacao">Conciliação</SelectItem>
                  <SelectItem value="justificacao">Justificação</SelectItem>
                  <SelectItem value="custodia">Custódia</SelectItem>
                  <SelectItem value="admonicao">Admonição</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="localAudiencia">Local</Label>
              <Input
                id="localAudiencia"
                placeholder="Vara de Violência Doméstica - Camaçari"
                value={audienciaLocal}
                onChange={(e) => setAudienciaLocal(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAudienciaModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCriarAudiencia}
              disabled={!audienciaData || criarAudienciaMutation.isPending}
              className="bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white"
            >
              {criarAudienciaMutation.isPending ? "Criando..." : "Agendar Audiência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
