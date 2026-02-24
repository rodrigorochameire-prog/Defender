"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  Gavel,
  RefreshCw,
  Shield,
  Sun,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { format, differenceInDays, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { KPICardPremium, KPIGrid } from "@/components/shared/kpi-card-premium";

// ──────────────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────────────

type Urgencia = "vencida" | "urgente" | "atencao" | "ok" | "sem-prazo";

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
// Componente Principal
// ──────────────────────────────────────────────────────────────────────────────

export default function DashboardMatinalPage() {
  // ── Queries ──────────────────────────────────────────────────────────────

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

  const { data: solarStatus } = trpc.solar.status.useQuery(undefined, {
    retry: false,
    staleTime: 30 * 1000,
  });

  // ── Mutações ─────────────────────────────────────────────────────────────

  const darCienciaMutation = trpc.vvd.darCiencia.useMutation({
    onSuccess: () => {
      toast.success("Ciência registrada!");
      void refetchVVD();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // ── Processar itens VVD ───────────────────────────────────────────────────

  const intimacoes = intimacoesData ?? [];

  const itensVVD: ItemMatinal[] = intimacoes.map((i) => {
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
  });

  // ── Processar itens Solar ─────────────────────────────────────────────────

  const avisosSolar = avisosData?.avisos ?? [];

  const itensSolar: ItemMatinal[] = avisosSolar.map((a, idx) => {
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
  });

  // ── Mesclar e ordenar ─────────────────────────────────────────────────────

  const todosItens: ItemMatinal[] = [...itensVVD, ...itensSolar].sort(
    (a, b) => URGENCIA_ORDER[a.urgencia] - URGENCIA_ORDER[b.urgencia],
  );

  // ── Contadores ────────────────────────────────────────────────────────────

  const contadores = {
    total: todosItens.length,
    vencidas: todosItens.filter((i) => i.urgencia === "vencida").length,
    urgentes: todosItens.filter((i) => i.urgencia === "urgente").length,
    solar: itensSolar.length,
  };

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const hoje = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  const isLoading = loadingVVD || loadingSolar;

  function handleRefresh() {
    void refetchVVD();
    void refetchSolar();
    toast.info("Atualizando...");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 py-5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
              <Sun className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                  {saudacao}
                </h1>
                {contadores.vencidas > 0 && (
                  <Badge className="bg-red-600 text-white animate-pulse text-xs">
                    {contadores.vencidas} vencida{contadores.vencidas > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{hoje}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {solarStatus?.authenticated ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Solar</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="hidden sm:inline text-zinc-400">Solar offline</span>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8"
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* ── Conteúdo ───────────────────────────────────────────────────────── */}
      <div className="p-4 md:p-6 space-y-6">

        {/* KPIs */}
        <KPIGrid columns={4}>
          <KPICardPremium
            title="Total pendente"
            value={contadores.total}
            icon={Bell}
            gradient="zinc"
          />
          <KPICardPremium
            title="Vencidas"
            value={contadores.vencidas}
            icon={AlertTriangle}
            gradient={contadores.vencidas > 0 ? "rose" : "zinc"}
          />
          <KPICardPremium
            title="Urgentes (≤2d)"
            value={contadores.urgentes}
            icon={Zap}
            gradient={contadores.urgentes > 0 ? "rose" : "zinc"}
          />
          <KPICardPremium
            title="Avisos Solar"
            value={contadores.solar}
            icon={Shield}
            gradient="zinc"
          />
        </KPIGrid>

        {/* ── Tabela Unificada ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Agenda do dia</span>
                <Badge variant="outline">{todosItens.length}</Badge>
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
            <div className="rounded-b-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Urgência</TableHead>
                    <TableHead className="w-[70px]">Fonte</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden md:table-cell">Processo</TableHead>
                    <TableHead className="hidden lg:table-cell">Parte</TableHead>
                    <TableHead className="hidden md:table-cell w-[110px]">Prazo</TableHead>
                    <TableHead className="w-[130px]">Ações</TableHead>
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
                  ) : todosItens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-400 opacity-60" />
                        <p className="font-medium text-zinc-700 dark:text-zinc-300">
                          Nenhuma pendência hoje!
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Todas as intimações estão em dia.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    todosItens.map((item) => (
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
                            <code className="text-xs bg-muted px-2 py-0.5 rounded">
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

        {/* ── Solar indisponível ───────────────────────────────────────────── */}
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

        {!loadingSolar && !avisosData?.error && avisosSolar.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-5 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400 opacity-60" />
              <p className="text-sm text-muted-foreground">Nenhum aviso pendente no Solar</p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
