"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Users, RefreshCw, Calendar,
  Gavel, User, FileText, Clock, CheckCircle2, XCircle,
  Loader2, AlertTriangle, Archive, Ban, Copy,
} from "lucide-react";
import Link from "next/link";
import { PautaImportModal, type SessaoParsed } from "./pauta-parser";

// ==========================================
// CONFIG
// ==========================================

const DEFENSORES = [
  { nome: "Dr. Rodrigo", short: "Rodrigo", bg: "bg-emerald-500", bgLight: "bg-emerald-500/5", text: "text-white", ring: "ring-emerald-500/20", icon: "text-emerald-200", initial: "R" },
  { nome: "Dra. Juliane", short: "Juliane", bg: "bg-violet-500", bgLight: "bg-violet-500/5", text: "text-white", ring: "ring-violet-500/20", icon: "text-violet-200", initial: "J" },
] as const;

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Tab = "proximas" | "historico";

// ==========================================
// PROPS
// ==========================================

interface PautaTabProps {
  ano: number;
}

// ==========================================
// COMPONENT
// ==========================================

export default function PautaTab({ ano }: PautaTabProps) {
  const [syncing, setSyncing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("proximas");

  const { data, isLoading, refetch } = trpc.juri.distribuicao.useQuery({ ano });
  const atribuirMutation = trpc.juri.atribuirDefensor.useMutation({
    onSuccess: () => refetch(),
  });
  const updateMutation = trpc.juri.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Sessão atualizada"); },
  });
  const importarMutation = trpc.juri.importarPauta.useMutation({
    onSuccess: (result) => {
      const parts = [];
      if (result.created > 0) parts.push(`${result.created} criada(s)`);
      if (result.updated > 0) parts.push(`${result.updated} atualizada(s)`);
      if (result.skipped > 0) parts.push(`${result.skipped} sem alteração`);
      toast.success(parts.join(", ") || "Nenhuma alteração");
      refetch();
    },
    onError: (err) => toast.error(`Erro ao importar: ${err.message}`),
  });

  const handleImportPauta = async (sessoes: SessaoParsed[]) => {
    await importarMutation.mutateAsync({
      sessoes: sessoes.map(s => ({
        dataSessao: s.data.toISOString(),
        horario: s.horario,
        processo: s.processo,
        assistidoNome: s.reus[0] || "Réu não identificado",
        reus: s.reus,
        situacao: s.situacao,
      })),
    });
  };

  // Split sessions: próximas (agendadas futuras) vs histórico (passadas + canceladas + adiadas)
  const { proximas, historico, sessoesPorMes, historicoMes } = useMemo(() => {
    if (!data?.sessoes) return { proximas: [], historico: [], sessoesPorMes: new Map(), historicoMes: new Map() };

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const prox: typeof data.sessoes = [];
    const hist: typeof data.sessoes = [];

    for (const s of data.sessoes) {
      const d = new Date(s.dataSessao);
      const isPast = d < now;
      const isInactive = s.status === "cancelada" || s.status === "adiada" || s.status === "realizada";

      if (isPast || isInactive) {
        hist.push(s);
      } else {
        prox.push(s);
      }
    }

    // Group by month
    const proxMes = new Map<number, typeof data.sessoes>();
    for (const s of prox) {
      const m = new Date(s.dataSessao).getMonth();
      if (!proxMes.has(m)) proxMes.set(m, []);
      proxMes.get(m)!.push(s);
    }

    const histMes = new Map<number, typeof data.sessoes>();
    for (const s of hist) {
      const m = new Date(s.dataSessao).getMonth();
      if (!histMes.has(m)) histMes.set(m, []);
      histMes.get(m)!.push(s);
    }

    return { proximas: prox, historico: hist, sessoesPorMes: proxMes, historicoMes: histMes };
  }, [data?.sessoes]);

  const contagem = data?.contagem ?? {};
  const totalRodrigo = contagem["Dr. Rodrigo"] ?? 0;
  const totalJuliane = contagem["Dra. Juliane"] ?? 0;
  const totalNaoAtribuido = contagem["Não atribuído"] ?? 0;
  const maxCount = Math.max(totalRodrigo, totalJuliane, 1);
  const balance = totalRodrigo - totalJuliane;

  const handleAtribuir = (sessaoId: number, defensorNome: string | null) => {
    atribuirMutation.mutate({ sessaoId, defensorNome });
  };

  const handleInativar = (sessaoId: number) => {
    updateMutation.mutate({ id: sessaoId, status: "CANCELADA" });
  };

  const handleReativar = (sessaoId: number) => {
    updateMutation.mutate({ id: sessaoId, status: "AGENDADA" });
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sheets/sync-plenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ano }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[Sync] HTTP", res.status, text);
        toast.error(`Erro ${res.status}: ${text.slice(0, 100) || "Falha na sincronização"}`);
        return;
      }
      const result = await res.json();
      if (result.ok) toast.success(`Planilha sincronizada (${result.synced} sessões)`);
      else toast.error(result.error || "Erro ao sincronizar");
    } catch (err) {
      console.error("[Sync] Error:", err);
      toast.error("Erro ao sincronizar com a planilha");
    } finally {
      setSyncing(false);
    }
  };

  const isUpdating = atribuirMutation.isPending;

  return (
    <>
      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm">
          <FileText className="w-3.5 h-3.5" />
          Importar Pauta
        </button>

        <button onClick={handleSync} disabled={syncing} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50 transition-all">
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Sync
        </button>
      </div>

      {/* Parity Bar - Compact */}
      <div className="mb-3">
        <div className="flex items-center gap-4 p-3 rounded-xl bg-card border border-border">
          {/* Rodrigo */}
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">R</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">Dr. Rodrigo</span>
                <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{totalRodrigo}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${(totalRodrigo / maxCount) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Balance indicator */}
          <div className="flex flex-col items-center shrink-0 px-3">
            <span className={cn(
              "text-base font-semibold tabular-nums",
              balance === 0 ? "text-muted-foreground/50" : Math.abs(balance) <= 1 ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400/70"
            )}>
              {balance === 0 ? "=" : balance > 0 ? `+${balance}` : balance}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50">
              {balance === 0 ? "Paridade" : "Diferença"}
            </span>
          </div>

          {/* Juliane */}
          <div className="flex items-center gap-2.5 flex-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold tabular-nums text-violet-600 dark:text-violet-400">{totalJuliane}</span>
                <span className="text-xs font-semibold text-foreground">Dra. Juliane</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-violet-500 transition-all duration-500 ml-auto" style={{ width: `${(totalJuliane / maxCount) * 100}%` }} />
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center text-white text-xs font-bold">J</div>
          </div>

          {/* Pending — shown in parent page header only */}
        </div>
      </div>

      {/* Tabs */}
      <div className="pb-2">
        <div className="flex items-center gap-0.5 p-1 rounded-xl bg-muted border border-border w-fit">
          <button
            onClick={() => setActiveTab("proximas")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              activeTab === "proximas"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            Próximas
            {proximas.length > 0 && (
              <span className={cn(
                "text-[9px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                activeTab === "proximas" ? "bg-white/20" : "bg-muted"
              )}>
                {proximas.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              activeTab === "historico"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background"
            )}
          >
            <Archive className="w-3.5 h-3.5" />
            Histórico
            {historico.length > 0 && (
              <span className={cn(
                "text-[9px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                activeTab === "historico" ? "bg-white/20" : "bg-muted"
              )}>
                {historico.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pb-8 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === "proximas" ? (
          proximas.length === 0 ? (
            <EmptyState ano={ano} message="Nenhuma sessão agendada" sub="Importe a pauta do PJe para começar" />
          ) : (
            <MonthSections
              sessoesPorMes={sessoesPorMes}
              onAtribuir={handleAtribuir}
              onInativar={handleInativar}
              onReativar={handleReativar}
              isUpdating={isUpdating}
              variant="active"
            />
          )
        ) : (
          historico.length === 0 ? (
            <EmptyState ano={ano} message="Nenhuma sessão no histórico" sub="Sessões passadas, canceladas e adiadas aparecem aqui" />
          ) : (
            <MonthSections
              sessoesPorMes={historicoMes}
              onAtribuir={handleAtribuir}
              onInativar={handleInativar}
              onReativar={handleReativar}
              isUpdating={isUpdating}
              variant="muted"
            />
          )
        )}
      </div>

      <PautaImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImportPauta} />
    </>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function EmptyState({ ano, message, sub }: { ano: number; message: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
        <Gavel className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground/80">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

const STATUS_STYLE: Record<string, { icon: typeof Calendar; color: string; badge: string }> = {
  agendada: { icon: Calendar, color: "text-muted-foreground", badge: "bg-muted text-muted-foreground ring-border" },
  realizada: { icon: CheckCircle2, color: "text-muted-foreground", badge: "bg-muted text-muted-foreground ring-border" },
  adiada: { icon: Clock, color: "text-muted-foreground", badge: "bg-muted text-muted-foreground ring-border" },
  cancelada: { icon: XCircle, color: "text-muted-foreground", badge: "bg-muted text-muted-foreground ring-border" },
};

function MonthSections({ sessoesPorMes, onAtribuir, onInativar, onReativar, isUpdating, variant }: {
  sessoesPorMes: Map<number, any[]>;
  onAtribuir: (id: number, nome: string | null) => void;
  onInativar: (id: number) => void;
  onReativar: (id: number) => void;
  isUpdating: boolean;
  variant: "active" | "muted";
}) {
  return (
    <>
      {MESES.map((mesNome, mesIdx) => {
        const sessoes = sessoesPorMes.get(mesIdx) ?? [];
        if (sessoes.length === 0) return null;

        const agendadas = sessoes.filter((s: any) => s.status === "agendada").length;

        return (
          <div key={mesIdx} className="space-y-1.5">
            <div className="flex items-center gap-2 pt-1">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{mesNome}</h2>
              <div className="flex-1 h-px bg-border/50" />
              {variant === "active" && agendadas > 0 && (
                <span className="text-[10px] font-semibold text-emerald-500 tabular-nums">{agendadas} ativa{agendadas !== 1 ? "s" : ""}</span>
              )}
              {variant === "muted" && (
                <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{sessoes.length}</span>
              )}
            </div>
            <div className="space-y-1.5">
              {sessoes.map((sessao: any) => (
                <SessionCard
                  key={sessao.id}
                  sessao={sessao}
                  onAtribuir={onAtribuir}
                  onInativar={onInativar}
                  onReativar={onReativar}
                  isUpdating={isUpdating}
                  muted={variant === "muted"}
                />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

/**
 * Retorna classes de cor baseado na proximidade e defensor atribuído.
 * - Rodrigo: tons de emerald (verde)
 * - Juliane: tons de violet (roxo)
 * - Não atribuído: tons de blue (azul)
 * Intensidade varia por proximidade: <=7d intenso, 8-30d médio, >30d neutro
 */
function getProximityStyle(diffDays: number, defensorNome: string | null) {
  // Determinar paleta de cor
  if (defensorNome === "Dr. Rodrigo") {
    // Emerald — 100-90-80
    if (diffDays <= 7) return {
      dateBg: "bg-emerald-500/10", dateText: "text-foreground",
      border: "border-emerald-300/40 dark:border-emerald-700/40", cardBg: "bg-emerald-50/40 dark:bg-emerald-950/10",
      bar: "bg-emerald-500",
      badge: diffDays === 0 ? "HOJE" : diffDays === 1 ? "AMANHÃ" : `${diffDays}d`,
      badgeStyle: "",
    };
    if (diffDays <= 30) return {
      dateBg: "", dateText: "text-foreground/85",
      border: "border-border", cardBg: "bg-card",
      bar: "bg-emerald-500/90", badge: null, badgeStyle: "",
    };
    return { dateBg: "", dateText: "text-foreground/75", border: "border-border/60", cardBg: "bg-card", bar: "bg-emerald-500/80", badge: null, badgeStyle: "" };
  }

  if (defensorNome === "Dra. Juliane") {
    // Violet — 100-90-80
    if (diffDays <= 7) return {
      dateBg: "bg-violet-500/10", dateText: "text-foreground",
      border: "border-violet-300/40 dark:border-violet-700/40", cardBg: "bg-violet-50/40 dark:bg-violet-950/10",
      bar: "bg-violet-500",
      badge: diffDays === 0 ? "HOJE" : diffDays === 1 ? "AMANHÃ" : `${diffDays}d`,
      badgeStyle: "",
    };
    if (diffDays <= 30) return {
      dateBg: "", dateText: "text-foreground/85",
      border: "border-border", cardBg: "bg-card",
      bar: "bg-violet-500/90", badge: null, badgeStyle: "",
    };
    return { dateBg: "", dateText: "text-foreground/75", border: "border-border/60", cardBg: "bg-card", bar: "bg-violet-500/80", badge: null, badgeStyle: "" };
  }

  // Não atribuído — tons neutros
  if (diffDays <= 7) return {
    dateBg: "bg-muted/50", dateText: "text-foreground/80",
    border: "border-border", cardBg: "bg-card",
    bar: "bg-zinc-400/60",
    badge: diffDays === 0 ? "HOJE" : diffDays === 1 ? "AMANHÃ" : `${diffDays}d`,
    badgeStyle: "",
  };
  if (diffDays <= 30) return {
    dateBg: "", dateText: "text-muted-foreground",
    border: "border-border", cardBg: "bg-card",
    bar: "bg-muted-foreground/30", badge: null, badgeStyle: "",
  };
  return { dateBg: "", dateText: "text-muted-foreground", border: "border-border/60", cardBg: "bg-card", bar: "bg-muted-foreground/20", badge: null, badgeStyle: "" };
}

function SessionCard({ sessao, onAtribuir, onInativar, onReativar, isUpdating, muted }: {
  sessao: any;
  onAtribuir: (id: number, nome: string | null) => void;
  onInativar: (id: number) => void;
  onReativar: (id: number) => void;
  isUpdating: boolean;
  muted: boolean;
}) {
  const d = new Date(sessao.dataSessao);
  const diaSemana = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  const dia = d.getDate();
  const mesAbrev = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  const statusCfg = STATUS_STYLE[sessao.status ?? "agendada"] ?? STATUS_STYLE.agendada;
  const StatusIcon = statusCfg.icon;
  const defensorAtual = DEFENSORES.find(def => def.nome === sessao.defensorNome);
  const isUnassigned = !sessao.defensorNome;
  const isCancelled = sessao.status === "cancelada";
  const isAdiada = sessao.status === "adiada";

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  const proximity = !muted && !isCancelled && !isAdiada ? getProximityStyle(diffDays, sessao.defensorNome) : null;

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all group relative",
      muted
        ? "bg-card/50 border-border/50"
        : proximity
          ? cn(proximity.cardBg, proximity.border)
          : "bg-card border-border",
      (isCancelled || isAdiada) && !muted && "opacity-60",
      isUnassigned && !muted && !isCancelled && "ring-1 ring-border"
    )}>
      {/* Left color bar — same color as date number */}
      <div className={cn(
        "w-1 h-10 rounded-full shrink-0",
        muted ? "bg-muted-foreground/30"
          : proximity?.bar || "bg-muted-foreground/30"
      )} />

      {/* Date block — bar and number share same color family */}
      <div className={cn(
        "flex flex-col items-center w-10 shrink-0 rounded-lg py-0.5",
        !muted && proximity?.dateBg
      )}>
        <span className={cn("text-[9px] uppercase leading-none font-medium opacity-70", muted ? "text-muted-foreground" : proximity?.dateText || "text-muted-foreground")}>{diaSemana}</span>
        <span className={cn(
          "text-lg font-bold tabular-nums leading-tight",
          muted ? "text-muted-foreground" : proximity?.dateText || "text-foreground"
        )}>
          {dia}
        </span>
        <span className={cn("text-[9px] capitalize opacity-60", muted ? "text-muted-foreground" : proximity?.dateText || "text-muted-foreground")}>{mesAbrev}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/assistidos?q=${encodeURIComponent(sessao.assistidoNome || "")}`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "text-[13px] font-semibold truncate hover:underline underline-offset-2 decoration-1",
              muted || isCancelled ? "text-muted-foreground" : "text-foreground",
              isCancelled && "line-through"
            )}
          >
            {sessao.assistidoNome || "Réu não informado"}
          </Link>
          {proximity?.badge && (
            <span className="text-[9px] font-medium text-muted-foreground shrink-0">
              {proximity.badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {sessao.processo?.numeroAutos && (
            <div className="flex items-center gap-1 group/proc">
              <Link
                href={`/admin/processos?q=${encodeURIComponent(sessao.processo.numeroAutos)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-mono tabular-nums text-muted-foreground truncate hover:text-emerald-500 transition-colors"
              >
                {sessao.processo.numeroAutos}
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(sessao.processo.numeroAutos);
                  toast.success("Processo copiado");
                }}
                title="Copiar número"
                className="text-muted-foreground/50 hover:text-emerald-500 opacity-0 group-hover/proc:opacity-100 transition-all"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          )}
          <span className={cn("flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md ring-1", statusCfg.badge)}>
            <StatusIcon className="w-2.5 h-2.5" />
            {sessao.status === "agendada" ? "Agendada" : sessao.status === "realizada" ? "Realizada" : sessao.status === "adiada" ? "Adiada" : "Cancelada"}
          </span>
        </div>
      </div>

      {/* Actions: Defender toggle + Inativar */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Defender toggle */}
        {!isCancelled && !isAdiada && (
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted border border-border">
            {DEFENSORES.map((def) => {
              const isActive = sessao.defensorNome === def.nome;
              // Switch opacity matches card proximity: 100-80-60
              const switchBg = isActive && proximity ? proximity.bar : isActive ? def.bg : "";
              return (
                <button
                  key={def.nome}
                  onClick={() => onAtribuir(sessao.id as number, isActive ? null : def.nome)}
                  disabled={isUpdating}
                  className={cn(
                    "flex items-center gap-1 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer",
                    isActive
                      ? cn(switchBg, def.text, "shadow-sm px-2 font-bold")
                      : "px-1.5 text-muted-foreground hover:text-foreground hover:bg-background",
                    isUpdating && "opacity-50 pointer-events-none"
                  )}
                >
                  <Gavel className={cn("w-3 h-3 shrink-0", isActive ? "" : "opacity-40")} />
                  {isActive && <span>{def.short}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Inativar / Reativar */}
        {!isCancelled && !isAdiada && (
          <button
            onClick={() => onInativar(sessao.id as number)}
            disabled={isUpdating}
            title="Inativar sessão"
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
          >
            <Ban className="w-3.5 h-3.5" />
          </button>
        )}
        {(isCancelled || isAdiada) && (
          <button
            onClick={() => onReativar(sessao.id as number)}
            disabled={isUpdating}
            title="Reativar sessão"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
