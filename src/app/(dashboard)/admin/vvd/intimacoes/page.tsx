"use client";

import { useState } from "react";
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
      return <Badge variant="destructive">Vencido ({Math.abs(diasRestantes)} dias)</Badge>;
    }
    if (diasRestantes <= 2) {
      return <Badge className="bg-red-500 text-white">Urgente ({diasRestantes}d)</Badge>;
    }
    if (diasRestantes <= 5) {
      return <Badge className="bg-amber-500 text-white">{diasRestantes} dias</Badge>;
    }
    return <Badge className="bg-green-500 text-white">{diasRestantes} dias</Badge>;
  };

  const getTipoBadge = (tipo: string) => {
    const tipos: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      CIENCIA: {
        label: "Ciencia",
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        icon: <Eye className="h-3 w-3" />
      },
      PETICIONAR: {
        label: "Peticionar",
        className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
        icon: <FileText className="h-3 w-3" />
      },
      AUDIENCIA: {
        label: "Audiencia",
        className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        icon: <Gavel className="h-3 w-3" />
      },
      CUMPRIMENTO: {
        label: "Cumprimento",
        className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
        icon: <Check className="h-3 w-3" />
      },
    };
    const badge = tipos[tipo] || { label: tipo, className: "", icon: null };
    return (
      <Badge className={cn("flex items-center gap-1", badge.className)}>
        {badge.icon}
        {badge.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/vvd">
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            </Link>
            <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
              <Bell className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Intimações VVD</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Controle de prazos e ciências de violência doméstica</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 md:p-6 space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={cn(statusFiltro === "todos" && "ring-2 ring-purple-500")}>
          <CardContent className="pt-4 cursor-pointer" onClick={() => setStatusFiltro("todos")}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Bell className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contadores.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(statusFiltro === "pendente" && "ring-2 ring-blue-500")}>
          <CardContent className="pt-4 cursor-pointer" onClick={() => setStatusFiltro("pendente")}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{contadores.pendentes}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 cursor-pointer" onClick={() => {
            setTipoFiltro("CIENCIA");
            setStatusFiltro("pendente");
          }}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                <Eye className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-600">{contadores.ciencias}</p>
                <p className="text-xs text-muted-foreground">Dar Ciencia</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 cursor-pointer" onClick={() => {
            setTipoFiltro("PETICIONAR");
            setStatusFiltro("pendente");
          }}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-600">{contadores.peticionar}</p>
                <p className="text-xs text-muted-foreground">Peticionar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{contadores.urgentes}</p>
                <p className="text-xs text-muted-foreground">Urgentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Autor</TableHead>
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
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-30 text-green-500" />
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
                          {intimacao.autor?.nome || "-"}
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
                          {getStatusBadge(intimacao.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {intimacao.tipoIntimacao === "CIENCIA" && intimacao.status === "pendente" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDarCiencia(intimacao.id)}
                                disabled={darCienciaMutation.isPending}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Ciencia
                              </Button>
                            )}
                            {intimacao.tipoIntimacao === "PETICIONAR" && intimacao.status === "pendente" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Peticao
                              </Button>
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
    </div>
  );
}
