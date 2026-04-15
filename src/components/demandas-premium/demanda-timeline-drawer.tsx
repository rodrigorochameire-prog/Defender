"use client";

/**
 * Drawer lateral com histórico unificado de uma demanda:
 * entradas de audit_logs (ações do usuário) + sync_log (sincronizações
 * banco↔planilha). Feed cronológico para responder "por que esse campo
 * mudou?" sem precisar rodar scripts de investigação.
 */

import { useMemo } from "react";
import { X, History, User, Database, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface DemandaTimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  demandaId: number | null;
  assistidoNome?: string;
}

interface TimelineEntry {
  kind: "audit" | "sync";
  id: number;
  when: Date;
  icon: React.ReactNode;
  title: string;
  detail: string;
  source?: string;
}

function formatRel(d: Date): string {
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `há ${dd}d`;
  return d.toLocaleDateString("pt-BR");
}

export function DemandaTimelineDrawer({
  isOpen,
  onClose,
  demandaId,
  assistidoNome,
}: DemandaTimelineDrawerProps) {
  const { data, isLoading } = trpc.demandas.timeline.useQuery(
    { demandaId: demandaId ?? 0 },
    { enabled: isOpen && !!demandaId },
  );

  const entries = useMemo<TimelineEntry[]>(() => {
    if (!data) return [];
    const out: TimelineEntry[] = [];
    for (const a of data.audit) {
      const meta = (a.metadata ?? {}) as Record<string, unknown>;
      const metaStr = Object.entries(meta)
        .filter(([k]) => k !== "previous")
        .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
        .join(" · ");
      out.push({
        kind: "audit",
        id: a.id,
        when: new Date(a.created_at),
        icon: <User className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />,
        title: `${a.who ?? "Sistema"} · ${a.action}`,
        detail: metaStr || "—",
      });
    }
    for (const s of data.sync) {
      const isPlanilha = s.origem === "PLANILHA";
      out.push({
        kind: "sync",
        id: s.id,
        when: new Date(s.created_at),
        icon: isPlanilha ? (
          <FileSpreadsheet className="w-3 h-3 text-emerald-500/80" />
        ) : (
          <Database className="w-3 h-3 text-sky-500/80" />
        ),
        title: `${isPlanilha ? "Planilha → Banco" : s.origem === "MOVE" ? "Movimentação" : "Banco → Planilha"} · ${s.campo}`,
        detail: `"${s.valor_banco ?? "—"}" ↔ "${s.valor_planilha ?? "—"}"`,
        source: s.conflito ? "conflito" : undefined,
      });
    }
    return out.sort((a, b) => b.when.getTime() - a.when.getTime());
  }, [data]);

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.4)", zIndex: 99990 }}
        onClick={onClose}
      />
      <div
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "420px", zIndex: 99991 }}
        className="bg-white dark:bg-neutral-900 shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-l-[4px] border-l-neutral-300 dark:border-l-neutral-600 border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <History className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-foreground tracking-tight">Histórico</h2>
              <p className="text-[10px] text-muted-foreground truncate max-w-[300px]">
                {assistidoNome ? `${assistidoNome} · ` : ""}demanda #{demandaId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && (
            <div className="text-[11px] text-muted-foreground text-center py-8">Carregando...</div>
          )}
          {!isLoading && entries.length === 0 && (
            <div className="text-[11px] text-muted-foreground text-center py-8">
              Nenhuma entrada de histórico.
            </div>
          )}
          {entries.map((e) => (
            <div
              key={`${e.kind}-${e.id}`}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-neutral-50/50 dark:bg-neutral-800/30 border border-transparent hover:border-neutral-200/80 dark:hover:border-neutral-700/60 transition-all"
            >
              <div className="mt-0.5 shrink-0">{e.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] font-medium text-foreground/90 truncate">{e.title}</span>
                  {e.source === "conflito" && (
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 break-all">{e.detail}</p>
                <p className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-0.5 tabular-nums">
                  {formatRel(e.when)} · {e.when.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
