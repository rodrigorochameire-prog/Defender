"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  Timer,
  Calendar,
  Search,
  CheckCircle2,
  ChevronRight,
  AlertOctagon,
  Lock,
  Scale,
  Gavel,
  Shield,
  FileText,
  Flame,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isToday, isTomorrow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

// ==========================================
// ATRIBUICAO CONFIG — CORES FUNCIONAIS
// ==========================================

const ATRIBUICAO_CONFIG: Record<string, {
  label: string;
  shortLabel: string;
  color: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  "Tribunal do Júri": {
    label: "Tribunal do Júri",
    shortLabel: "Júri",
    color: "#22c55e",
    bgLight: "bg-emerald-100",
    bgDark: "dark:bg-emerald-900/30",
    textLight: "text-emerald-700",
    textDark: "dark:text-emerald-400",
    icon: Gavel,
  },
  "Grupo Especial do Júri": {
    label: "Grupo Esp. Júri",
    shortLabel: "GE Júri",
    color: "#f97316",
    bgLight: "bg-orange-100",
    bgDark: "dark:bg-orange-900/30",
    textLight: "text-orange-700",
    textDark: "dark:text-orange-400",
    icon: Gavel,
  },
  "Violência Doméstica": {
    label: "Violência Doméstica",
    shortLabel: "VVD",
    color: "#f59e0b",
    bgLight: "bg-amber-100",
    bgDark: "dark:bg-amber-900/30",
    textLight: "text-amber-700",
    textDark: "dark:text-amber-400",
    icon: Shield,
  },
  "Execução Penal": {
    label: "Execução Penal",
    shortLabel: "EP",
    color: "#3b82f6",
    bgLight: "bg-blue-100",
    bgDark: "dark:bg-blue-900/30",
    textLight: "text-blue-700",
    textDark: "dark:text-blue-400",
    icon: Lock,
  },
  "Substituição Criminal": {
    label: "Substituição Criminal",
    shortLabel: "Subst.",
    color: "#8b5cf6",
    bgLight: "bg-violet-100",
    bgDark: "dark:bg-violet-900/30",
    textLight: "text-violet-700",
    textDark: "dark:text-violet-400",
    icon: Scale,
  },
  "Curadoria Especial": {
    label: "Curadoria Especial",
    shortLabel: "Curad.",
    color: "#71717a",
    bgLight: "bg-zinc-100",
    bgDark: "dark:bg-zinc-800",
    textLight: "text-zinc-700",
    textDark: "dark:text-zinc-400",
    icon: FileText,
  },
};

// ==========================================
// HELPERS
// ==========================================

function getPrazoInfo(prazoStr: string) {
  if (!prazoStr) return { text: "-", dias: 0, className: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400", icon: Calendar, urgent: false };

  // Parse DD/MM/YYYY or YYYY-MM-DD
  let prazoDate: Date;
  if (prazoStr.includes("/")) {
    const [dia, mes, ano] = prazoStr.split("/").map(Number);
    const fullYear = ano < 100 ? 2000 + ano : ano;
    prazoDate = new Date(fullYear, mes - 1, dia);
  } else {
    prazoDate = new Date(prazoStr + "T12:00:00");
  }

  if (isNaN(prazoDate.getTime())) return { text: prazoStr, dias: 0, className: "text-zinc-500 bg-zinc-100", icon: Calendar, urgent: false };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  prazoDate.setHours(0, 0, 0, 0);
  const dias = differenceInDays(prazoDate, hoje);

  if (dias < 0) {
    return { text: `${Math.abs(dias)}d atrás`, dias, className: "text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400", icon: AlertOctagon, urgent: true };
  }
  if (dias === 0) {
    return { text: "Hoje", dias: 0, className: "text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 font-bold", icon: Timer, urgent: true };
  }
  if (dias === 1) {
    return { text: "Amanhã", dias: 1, className: "text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock, urgent: true };
  }
  if (dias <= 3) {
    return { text: `${dias}d`, dias, className: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400", icon: Clock, urgent: false };
  }
  if (dias <= 7) {
    return { text: `${dias}d`, dias, className: "text-sky-600 bg-sky-50 dark:bg-sky-900/20 dark:text-sky-400", icon: Calendar, urgent: false };
  }
  return { text: format(prazoDate, "dd/MM", { locale: ptBR }), dias, className: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400", icon: Calendar, urgent: false };
}

// ==========================================
// PAGE COMPONENT
// ==========================================

export default function PrazosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [periodoFilter, setPeriodoFilter] = useState("all");

  // Real data from tRPC
  const { data: demandas = [], isLoading } = trpc.demandas.list.useQuery({});

  // Filter demandas that have a prazo set
  const prazos = useMemo(() => {
    return demandas
      .filter((d: any) => d.prazo && d.prazo !== "-" && d.prazo !== "")
      .map((d: any) => ({
        id: d.id,
        assistido: d.assistido || "Sem assistido",
        assistidoId: d.assistidoId,
        processo: d.processos?.[0]?.numero || "-",
        processoId: d.processoId,
        ato: d.ato || "-",
        prazo: d.prazo,
        status: d.status,
        atribuicao: d.atribuicao || "",
        reuPreso: d.estadoPrisional === "preso" || d.prioridade === "REU_PRESO",
        providencias: d.providencias || "",
        prioridade: d.prioridade,
      }));
  }, [demandas]);

  // Get unique atribuicoes for filter tabs
  const atribuicaoList = useMemo(() => {
    const unique = [...new Set(prazos.map((p: any) => p.atribuicao).filter(Boolean))];
    return unique.sort();
  }, [prazos]);

  // Filtered and sorted prazos
  const filteredPrazos = useMemo(() => {
    return prazos
      .filter((prazo: any) => {
        const matchesSearch =
          prazo.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prazo.processo.includes(searchTerm) ||
          prazo.ato.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesArea = areaFilter === "all" || prazo.atribuicao === areaFilter;

        if (!matchesSearch || !matchesArea) return false;

        if (periodoFilter === "all") return true;

        const info = getPrazoInfo(prazo.prazo);
        if (periodoFilter === "vencido") return info.dias < 0;
        if (periodoFilter === "hoje") return info.dias === 0;
        if (periodoFilter === "amanha") return info.dias === 1;
        if (periodoFilter === "semana") return info.dias >= 0 && info.dias <= 7;

        return true;
      })
      .sort((a: any, b: any) => {
        // Reu preso primeiro
        if (a.reuPreso && !b.reuPreso) return -1;
        if (!a.reuPreso && b.reuPreso) return 1;
        // Urgencia (dias menores primeiro)
        const infoA = getPrazoInfo(a.prazo);
        const infoB = getPrazoInfo(b.prazo);
        return infoA.dias - infoB.dias;
      });
  }, [prazos, searchTerm, areaFilter, periodoFilter]);

  // Stats
  const stats = useMemo(() => ({
    vencidos: prazos.filter((p: any) => getPrazoInfo(p.prazo).dias < 0).length,
    hoje: prazos.filter((p: any) => getPrazoInfo(p.prazo).dias === 0).length,
    amanha: prazos.filter((p: any) => getPrazoInfo(p.prazo).dias === 1).length,
    semana: prazos.filter((p: any) => { const d = getPrazoInfo(p.prazo).dias; return d >= 0 && d <= 7; }).length,
    reuPreso: prazos.filter((p: any) => p.reuPreso).length,
  }), [prazos]);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Padrao Defender */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
            <Clock className="w-5 h-5 text-white dark:text-zinc-900" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Prazos</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isLoading ? "Carregando..." : `${filteredPrazos.length} prazos ${areaFilter !== "all" ? `em ${ATRIBUICAO_CONFIG[areaFilter]?.shortLabel || areaFilter}` : ""}`}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-5">
        {/* Atribuicao Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setAreaFilter("all")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap",
              areaFilter === "all"
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            Todos
            <span className="ml-1 text-[10px] opacity-70">{prazos.length}</span>
          </button>
          {atribuicaoList.map((atrib: string) => {
            const config = ATRIBUICAO_CONFIG[atrib];
            if (!config) return null;
            const isActive = areaFilter === atrib;
            const count = prazos.filter((p: any) => p.atribuicao === atrib).length;
            const IconComp = config.icon;
            return (
              <button
                key={atrib}
                onClick={() => setAreaFilter(isActive ? "all" : atrib)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "text-white shadow-sm ring-1 ring-black/10"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                )}
                style={isActive ? { backgroundColor: config.color } : undefined}
              >
                <span
                  className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", !isActive && "ring-1 ring-inset ring-black/10")}
                  style={{ backgroundColor: isActive ? "rgba(255,255,255,0.9)" : config.color }}
                />
                {config.shortLabel}
                <span className="text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Stats Cards - Padrao Defender */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Vencidos", value: stats.vencidos, icon: AlertOctagon, urgent: stats.vencidos > 0 },
            { label: "Hoje", value: stats.hoje, icon: Timer, urgent: stats.hoje > 0 },
            { label: "Amanhã", value: stats.amanha, icon: Clock, urgent: false },
            { label: "7 dias", value: stats.semana, icon: Calendar, urgent: false },
            { label: "Réu Preso", value: stats.reuPreso, icon: Lock, urgent: stats.reuPreso > 0 },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "group relative p-3 md:p-4 rounded-xl bg-white dark:bg-zinc-900 border transition-all duration-300 cursor-pointer hover:shadow-lg",
                stat.urgent
                  ? "border-rose-200 dark:border-rose-800/50 hover:border-rose-300"
                  : "border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">{stat.label}</p>
                  <p className={cn(
                    "text-lg md:text-xl font-semibold",
                    stat.urgent ? "text-rose-600 dark:text-rose-400" : "text-zinc-700 dark:text-zinc-300"
                  )}>
                    {stat.value}
                  </p>
                </div>
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border",
                  stat.urgent
                    ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"
                    : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                )}>
                  <stat.icon className={cn("w-4 h-4", stat.urgent ? "text-rose-600 dark:text-rose-400" : "text-zinc-500 dark:text-zinc-400")} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Period Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar por assistido, processo ou ato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="vencido">Vencidos</SelectItem>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="amanha">Amanhã</SelectItem>
              <SelectItem value="semana">7 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        )}

        {/* Prazos List */}
        {!isLoading && (
          <div className="space-y-2">
            {filteredPrazos.map((prazo: any) => {
              const prazoInfo = getPrazoInfo(prazo.prazo);
              const PrazoIcon = prazoInfo.icon;
              const atribConfig = ATRIBUICAO_CONFIG[prazo.atribuicao];
              const atribColor = atribConfig?.color || "#71717a";

              return (
                <Card
                  key={prazo.id}
                  className={cn(
                    "relative overflow-hidden transition-all duration-200 hover:shadow-md group",
                    "border-zinc-100 dark:border-zinc-800",
                    prazoInfo.urgent && "ring-1 ring-rose-200/50 dark:ring-rose-900/30"
                  )}
                >
                  {/* Color bar left */}
                  <div
                    className="absolute left-0 inset-y-0 w-1"
                    style={{ backgroundColor: atribColor }}
                  />

                  <div className="p-4 pl-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2 min-w-0">
                        {/* Badges row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={cn("text-[10px] px-2 py-0.5 rounded-md border-0 font-bold gap-1", prazoInfo.className)}>
                            <PrazoIcon className="w-3 h-3" />
                            {prazoInfo.text}
                          </Badge>

                          {prazo.reuPreso && (
                            <Badge className="text-[10px] px-2 py-0.5 rounded-md border-0 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 gap-1">
                              <Lock className="w-3 h-3" />
                              Preso
                            </Badge>
                          )}

                          {atribConfig && (
                            <Badge className={cn("text-[10px] px-2 py-0.5 rounded-md border-0 font-medium gap-1", atribConfig.bgLight, atribConfig.bgDark, atribConfig.textLight, atribConfig.textDark)}>
                              <atribConfig.icon className="w-3 h-3" />
                              {atribConfig.shortLabel}
                            </Badge>
                          )}
                        </div>

                        {/* Ato + Assistido */}
                        <div className="space-y-0.5">
                          <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{prazo.ato}</h3>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">{prazo.assistido}</p>
                            {prazo.assistidoId && (
                              <Link href={`/admin/assistidos/${prazo.assistidoId}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <ExternalLink className="w-3 h-3 text-zinc-400 hover:text-emerald-500" />
                              </Link>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-500">{prazo.processo}</p>
                        </div>

                        {/* Providencias */}
                        {prazo.providencias && (
                          <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Prov:</span> {prazo.providencias}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Prazo date */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Prazo</p>
                          <p className="text-sm font-mono font-semibold text-zinc-700 dark:text-zinc-300">{prazo.prazo}</p>
                        </div>
                        <Link href={`/admin/demandas`}>
                          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 rounded-lg">
                            Ver <ChevronRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Empty State */}
            {filteredPrazos.length === 0 && !isLoading && (
              <Card className="p-12 text-center border-dashed">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Nenhum prazo encontrado
                </h3>
                <p className="text-sm text-zinc-500">
                  {searchTerm || areaFilter !== "all" ? "Ajuste os filtros para ver mais resultados." : "Todos os prazos estão em dia!"}
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        {!isLoading && filteredPrazos.length > 0 && (
          <div className="text-center py-2">
            <span className="text-[10px] text-zinc-400">
              {filteredPrazos.length} prazo{filteredPrazos.length !== 1 && "s"} · {filteredPrazos.filter((p: any) => p.reuPreso).length} réu preso
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
