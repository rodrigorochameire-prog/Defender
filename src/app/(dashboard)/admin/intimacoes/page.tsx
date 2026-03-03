"use client";

import { useState, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  Gavel,
  Inbox,
  Layers,
  Plus,
  RefreshCw,
  Settings,
  Send,
  Shield,
  Users,
  WifiOff,
  Zap,
} from "lucide-react";
import { format, differenceInDays, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { KPICardPremium, KPIGrid } from "@/components/shared/kpi-card-premium";
import { SolarStatusBar } from "@/components/solar/solar-status-bar";
import { SolarBatchOperations } from "@/components/solar/solar-batch-operations";
import { SolarSyncFases } from "@/components/solar/solar-sync-fases";
import { SolarLogs } from "@/components/solar/solar-logs";
import { ProtocolarTab } from "@/components/solar/protocolar-tab";
import { AssistidosSyncTab } from "@/components/solar/assistidos-sync-tab";

// ──────────────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────────────

type Urgencia = "vencida" | "urgente" | "atencao" | "ok" | "sem-prazo";
type FilterUrgencia = "todos" | "vencidas" | "urgentes" | "atencao";
type FilterFonte = "todos" | "vvd" | "solar";

interface ItemMatinal {
  id: string;
  tipo: "vvd" | "solar";
  descricao: string;
  processo?: string;
  parte?: string;
  tipoVVD?: string;
  tipoSolar?: string;
  prazo?: string | null;
  status: string;
  urgencia: Urgencia;
  diasRestantes?: number | null;
  onDarCiencia?: () => void;
  darCienciaLoading?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function calcUrgencia(prazo: string | null | undefined): Urgencia {
  if (!prazo) return "sem-prazo";
  try {
    const dias = differenceInDays(parseISO(prazo), startOfDay(new Date()));
    if (dias < 0) return "vencida";
    if (dias <= 2) return "urgente";
    if (dias <= 5) return "atencao";
    return "ok";
  } catch {
    return "sem-prazo";
  }
}

function calcDias(prazo: string | null | undefined): number | null {
  if (!prazo) return null;
  try {
    return differenceInDays(parseISO(prazo), startOfDay(new Date()));
  } catch {
    return null;
  }
}

const URGENCIA_ORDER: Record<Urgencia, number> = {
  vencida: 0,
  urgente: 1,
  atencao: 2,
  ok: 3,
  "sem-prazo": 4,
};

function UrgenciaBadge({ urgencia, dias }: { urgencia: Urgencia; dias?: number | null }) {
  if (urgencia === "vencida") {
    return (
      <Badge className="bg-red-600 text-white text-xs">
        Vencido{dias != null ? ` (${Math.abs(dias)}d)` : ""}
      </Badge>
    );
  }
  if (urgencia === "urgente") {
    return (
      <Badge className="bg-red-500 text-white text-xs">
        Urgente{dias != null ? ` (${dias}d)` : ""}
      </Badge>
    );
  }
  if (urgencia === "atencao") {
    return <Badge className="bg-amber-500 text-white text-xs">{dias}d</Badge>;
  }
  if (urgencia === "sem-prazo") {
    return <Badge variant="outline" className="text-xs">Sem prazo</Badge>;
  }
  return <Badge className="bg-emerald-500 text-white text-xs">{dias}d</Badge>;
}

function TipoVVDBadge({ tipo }: { tipo: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    CIENCIA: {
      label: "Ciência",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      icon: <Eye className="h-3 w-3" />,
    },
    PETICIONAR: {
      label: "Peticionar",
      className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      icon: <FileText className="h-3 w-3" />,
    },
    AUDIENCIA: {
      label: "Audiência",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      icon: <Gavel className="h-3 w-3" />,
    },
    CUMPRIMENTO: {
      label: "Cumprimento",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      icon: <Check className="h-3 w-3" />,
    },
  };
  const badge = map[tipo] ?? { label: tipo, className: "", icon: null };
  return (
    <Badge className={cn("flex items-center gap-1 text-xs", badge.className)}>
      {badge.icon}
      {badge.label}
    </Badge>
  );
}

function TipoSolarBadge({ tipo }: { tipo: string }) {
  const map: Record<string, string> = {
    Urgente: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    "Intimação": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    "Citação": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    "Notificação": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    "Vista para manifestação":
      "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    "Pauta de julgamento/audiência":
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    "Fórum de conciliação": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  };
  const className =
    map[tipo] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  return <Badge className={cn("text-xs", className)}>{tipo}</Badge>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Filter pills config
// ──────────────────────────────────────────────────────────────────────────────

const URGENCIA_FILTERS: { value: FilterUrgencia; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "vencidas", label: "Vencidas" },
  { value: "urgentes", label: "Urgentes" },
  { value: "atencao", label: "Atenção" },
];

const FONTE_FILTERS: { value: FilterFonte; label: string; color: string }[] = [
  { value: "todos", label: "Todas fontes", color: "" },
  { value: "vvd", label: "VVD", color: "text-purple-600 border-purple-300 dark:text-purple-400" },
  { value: "solar", label: "Solar", color: "text-indigo-600 border-indigo-300 dark:text-indigo-400" },
];

// ──────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ──────────────────────────────────────────────────────────────────────────────

export default function SolarHubPage() {
  const router = useRouter();

  // ── Filter state ────────────────────────────────────────────────────────
  const [filterUrgencia, setFilterUrgencia] = useState<FilterUrgencia>("todos");
  const [filterFonte, setFilterFonte] = useState<FilterFonte>("todos");

  // ── Queries ─────────────────────────────────────────────────────────────

  const {
    data: intimacoesData,
    isLoading: loadingVVD,
    refetch: refetchVVD,
  } = trpc.vvd.listIntimacoes.useQuery({
    tipoIntimacao: "todos",
    status: "pendente",
    limit: 100,
  });

  const {
    data: avisosData,
    isLoading: loadingSolar,
    refetch: refetchSolar,
  } = trpc.solar.avisos.useQuery(undefined, {
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // ── Mutações ────────────────────────────────────────────────────────────

  const darCienciaMutation = trpc.vvd.darCiencia.useMutation({
    onSuccess: () => {
      toast.success("Ciência registrada!");
      void refetchVVD();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // ── Processar itens ─────────────────────────────────────────────────────

  const intimacoes = intimacoesData ?? [];

  const itensVVD: ItemMatinal[] = useMemo(
    () =>
      intimacoes.map((i) => {
        const urgencia = calcUrgencia(i.prazo ?? null);
        const dias = calcDias(i.prazo ?? null);
        return {
          id: `vvd-${i.id}`,
          tipo: "vvd" as const,
          descricao: i.ato ?? "Intimação VVD",
          processo: i.processo?.numeroAutos ?? undefined,
          parte: i.autor?.nome ?? undefined,
          tipoVVD: i.tipoIntimacao,
          prazo: i.prazo ?? null,
          status: i.status ?? "pendente",
          urgencia,
          diasRestantes: dias,
          onDarCiencia:
            i.tipoIntimacao === "CIENCIA" && i.status === "pendente"
              ? () => darCienciaMutation.mutate({ id: i.id })
              : undefined,
          darCienciaLoading: darCienciaMutation.isPending,
        };
      }),
    [intimacoes, darCienciaMutation.isPending],
  );

  const avisosSolar = avisosData?.avisos ?? [];

  const itensSolar: ItemMatinal[] = useMemo(
    () =>
      avisosSolar.map((a, idx) => {
        const urgencia = calcUrgencia(a.prazo ?? null);
        const dias = calcDias(a.prazo ?? null);
        return {
          id: `solar-${idx}`,
          tipo: "solar" as const,
          descricao: a.descricao ?? "Aviso Solar",
          processo: a.numero_processo ?? undefined,
          tipoSolar: a.tipo ?? undefined,
          prazo: a.prazo ?? null,
          status: "pendente",
          urgencia,
          diasRestantes: dias,
        };
      }),
    [avisosSolar],
  );

  // ── Mesclar, filtrar e ordenar ──────────────────────────────────────────

  const todosItens: ItemMatinal[] = useMemo(
    () =>
      [...itensVVD, ...itensSolar].sort(
        (a, b) => URGENCIA_ORDER[a.urgencia] - URGENCIA_ORDER[b.urgencia],
      ),
    [itensVVD, itensSolar],
  );

  const itensFiltrados = useMemo(() => {
    let items = todosItens;

    // Filtro por urgência
    if (filterUrgencia === "vencidas") {
      items = items.filter((i) => i.urgencia === "vencida");
    } else if (filterUrgencia === "urgentes") {
      items = items.filter((i) => i.urgencia === "urgente" || i.urgencia === "vencida");
    } else if (filterUrgencia === "atencao") {
      items = items.filter(
        (i) => i.urgencia === "atencao" || i.urgencia === "urgente" || i.urgencia === "vencida",
      );
    }

    // Filtro por fonte
    if (filterFonte !== "todos") {
      items = items.filter((i) => i.tipo === filterFonte);
    }

    return items;
  }, [todosItens, filterUrgencia, filterFonte]);

  // ── Contadores (sempre sobre todosItens, sem filtros) ───────────────────

  const contadores = useMemo(
    () => ({
      total: todosItens.length,
      vencidas: todosItens.filter((i) => i.urgencia === "vencida").length,
      urgentes: todosItens.filter((i) => i.urgencia === "urgente").length,
      solar: itensSolar.length,
    }),
    [todosItens, itensSolar],
  );

  const isLoading = loadingVVD || loadingSolar;

  function handleRefresh() {
    void refetchVVD();
    void refetchSolar();
    toast.info("Atualizando dados...");
  }

  function handleCriarDemanda(item: ItemMatinal) {
    const params = new URLSearchParams();
    params.set("action", "new");
    if (item.processo) params.set("processo", item.processo);
    if (item.descricao) params.set("ato", item.descricao);
    if (item.prazo) params.set("prazo", item.prazo);
    params.set("fonte", item.tipo);
    router.push(`/admin/demandas?${params.toString()}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">

      {/* ── StatusBar ────────────────────────────────────────────────────── */}
      <SolarStatusBar
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        vencidas={contadores.vencidas}
      />

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="caixa" className="w-full">

        {/* Tab triggers */}
        <div className="px-4 md:px-6 pt-4 bg-zinc-100 dark:bg-[#0f0f11] overflow-x-auto scrollbar-none">
          <TabsList className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm h-9 p-0.5 rounded-lg w-full min-w-max">
            <TabsTrigger
              value="caixa"
              className="text-xs gap-1.5 rounded-md data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900"
            >
              <Inbox className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Caixa de Entrada</span>
              <span className="sm:hidden">Caixa</span>
              {contadores.total > 0 && (
                <Badge
                  variant="outline"
                  className="ml-0.5 h-4 px-1 text-[9px] rounded-full border-current"
                >
                  {contadores.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="batch"
              className="text-xs gap-1.5 rounded-md data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900"
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Operações Batch</span>
              <span className="sm:hidden">Batch</span>
            </TabsTrigger>
            <TabsTrigger
              value="fases"
              className="text-xs gap-1.5 rounded-md data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Fases &rarr; Solar</span>
              <span className="sm:hidden">Fases</span>
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="text-xs gap-1.5 rounded-md data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logs & Stats</span>
              <span className="sm:hidden">Logs</span>
            </TabsTrigger>
            <TabsTrigger
              value="assistidos-sync"
              className="text-xs gap-1.5 rounded-md data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Assistidos</span>
              <span className="sm:hidden">Assist.</span>
            </TabsTrigger>
            <TabsTrigger
              value="protocolar"
              className="text-xs gap-1.5 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white dark:data-[state=active]:bg-emerald-600 dark:data-[state=active]:text-white"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Protocolar</span>
              <span className="sm:hidden">Proto</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Tab: Caixa de Entrada ──────────────────────────────────────── */}
        <TabsContent value="caixa" className="mt-0">
          <div className="p-4 md:p-6 space-y-5">

            {/* Stats Ribbon — compact inline KPIs */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 text-xs overflow-x-auto scrollbar-none shadow-sm">
              {[
                { icon: Bell, value: contadores.total, label: "pendentes" },
                { icon: AlertTriangle, value: contadores.vencidas, label: "vencidas", onClick: () => setFilterUrgencia(filterUrgencia === "vencidas" ? "todos" : "vencidas"), active: filterUrgencia === "vencidas", alert: contadores.vencidas > 0 },
                { icon: Zap, value: contadores.urgentes, label: "urgentes", onClick: () => setFilterUrgencia(filterUrgencia === "urgentes" ? "todos" : "urgentes"), active: filterUrgencia === "urgentes", alert: contadores.urgentes > 0 },
                { icon: Shield, value: contadores.solar, label: "solar", onClick: () => setFilterFonte(filterFonte === "solar" ? "todos" : "solar"), active: filterFonte === "solar" },
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
              <div className="flex-1" />
              <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px] tabular-nums whitespace-nowrap">{contadores.total} intimações</span>
            </div>

            {/* Filtros */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                {/* Urgência pills */}
                {URGENCIA_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilterUrgencia(f.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                      filterUrgencia === f.value
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700",
                    )}
                  >
                    {f.label}
                    {f.value === "vencidas" && contadores.vencidas > 0 && (
                      <span className="ml-1 text-[9px] opacity-70">({contadores.vencidas})</span>
                    )}
                    {f.value === "urgentes" && contadores.urgentes > 0 && (
                      <span className="ml-1 text-[9px] opacity-70">({contadores.urgentes})</span>
                    )}
                  </button>
                ))}

                {/* Separator */}
                <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-1" />

                {/* Fonte pills */}
                {FONTE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilterFonte(f.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                      filterFonte === f.value
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Filtro ativo count */}
              {(filterUrgencia !== "todos" || filterFonte !== "todos") && (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>
                    {itensFiltrados.length} de {todosItens.length}
                  </span>
                  <button
                    onClick={() => {
                      setFilterUrgencia("todos");
                      setFilterFonte("todos");
                    }}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>

            {/* ── Tabela ──────────────────────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Caixa de Entrada</span>
                    <Badge variant="outline">{itensFiltrados.length}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-normal">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                      VVD
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                      Solar
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="rounded-b-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Urgência</TableHead>
                        <TableHead className="w-[70px]">Fonte</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="hidden md:table-cell">Processo</TableHead>
                        <TableHead className="hidden lg:table-cell">Parte</TableHead>
                        <TableHead className="hidden md:table-cell w-[110px]">Prazo</TableHead>
                        <TableHead className="w-[180px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <RefreshCw className="h-5 w-5 animate-spin mx-auto text-zinc-400" />
                            <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
                          </TableCell>
                        </TableRow>
                      ) : itensFiltrados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-16">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-400 opacity-60" />
                            <p className="font-medium text-zinc-700 dark:text-zinc-300">
                              {filterUrgencia !== "todos" || filterFonte !== "todos"
                                ? "Nenhum item com esses filtros"
                                : "Nenhuma pendência!"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {filterUrgencia !== "todos" || filterFonte !== "todos"
                                ? "Tente limpar os filtros para ver todos os itens."
                                : "Todas as intimações estão em dia."}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        itensFiltrados.map((item) => (
                          <TableRow
                            key={item.id}
                            className={cn(
                              item.urgencia === "vencida" &&
                                "bg-red-50 dark:bg-red-950/10 border-l-2 border-l-red-500",
                              item.urgencia === "urgente" &&
                                "bg-red-50/50 dark:bg-red-950/5 border-l-2 border-l-orange-400",
                              item.urgencia === "atencao" && "border-l-2 border-l-amber-400",
                            )}
                          >
                            {/* Urgência */}
                            <TableCell>
                              <UrgenciaBadge urgencia={item.urgencia} dias={item.diasRestantes} />
                            </TableCell>

                            {/* Fonte */}
                            <TableCell>
                              {item.tipo === "vvd" ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-purple-600 border-purple-300 dark:text-purple-400"
                                >
                                  VVD
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-indigo-600 border-indigo-300 dark:text-indigo-400"
                                >
                                  Solar
                                </Badge>
                              )}
                            </TableCell>

                            {/* Descrição */}
                            <TableCell>
                              <div className="space-y-1">
                                <p
                                  className="text-sm font-medium max-w-[260px] truncate"
                                  title={item.descricao}
                                >
                                  {item.descricao}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {item.tipoVVD && <TipoVVDBadge tipo={item.tipoVVD} />}
                                  {item.tipoSolar && <TipoSolarBadge tipo={item.tipoSolar} />}
                                </div>
                              </div>
                            </TableCell>

                            {/* Processo */}
                            <TableCell className="hidden md:table-cell">
                              {item.processo ? (
                                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                                  {item.processo}
                                </code>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>

                            {/* Parte */}
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-sm text-zinc-700 dark:text-zinc-300 max-w-[140px] truncate block">
                                {item.parte ?? "—"}
                              </span>
                            </TableCell>

                            {/* Prazo */}
                            <TableCell className="hidden md:table-cell">
                              {item.prazo ? (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-xs">
                                    {format(parseISO(item.prazo), "dd/MM/yy", { locale: ptBR })}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>

                            {/* Ações */}
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {item.onDarCiencia && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={item.onDarCiencia}
                                    disabled={item.darCienciaLoading}
                                    className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                  >
                                    <Check className="h-3.5 w-3.5 mr-1" />
                                    Ciência
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleCriarDemanda(item)}
                                  title="Criar demanda a partir deste aviso"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Demanda
                                </Button>
                                {item.tipo === "solar" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() =>
                                      window.open(
                                        "https://solar.defensoria.ba.def.br/processo/intimacao/painel/",
                                        "_blank",
                                      )
                                    }
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Solar
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* ── Solar indisponível ──────────────────────────────────────── */}
            {!loadingSolar && avisosData?.error && (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/10">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <WifiOff className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Solar indisponível
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        {avisosData.error}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void refetchSolar()}
                        className="mt-2 h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Tentar novamente
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Tab: Operações Batch ──────────────────────────────────────── */}
        <TabsContent value="batch" className="mt-0">
          <div className="p-4 md:p-6">
            <SolarBatchOperations />
          </div>
        </TabsContent>

        {/* ── Tab: Fases → Solar ──────────────────────────────────────── */}
        <TabsContent value="fases" className="mt-0">
          <div className="p-4 md:p-6">
            <SolarSyncFases />
          </div>
        </TabsContent>

        {/* ── Tab: Logs & Stats ─────────────────────────────────────── */}
        <TabsContent value="logs" className="mt-0">
          <div className="p-4 md:p-6">
            <SolarLogs />
          </div>
        </TabsContent>

        {/* ── Tab: Assistidos × Solar ──────────────────────────────── */}
        <TabsContent value="assistidos-sync" className="mt-0">
          <div className="p-4 md:p-6">
            <AssistidosSyncTab />
          </div>
        </TabsContent>

        {/* ── Tab: Protocolar ─────────────────────────────────────── */}
        <TabsContent value="protocolar" className="mt-0">
          <div className="p-4 md:p-6">
            <ProtocolarTab />
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
