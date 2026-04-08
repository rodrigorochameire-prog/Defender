"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Activity, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DaemonPage() {
  const { data, isLoading, refetch } = trpc.system.daemonStatus.useQuery(undefined, {
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading || !data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Daemon de Análise IA</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const { daemon, queue, recent } = data;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Daemon de Análise IA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Worker que processa <code className="text-xs">claude_code_tasks</code> via Supabase Realtime no Mac Mini M4 Pro.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </button>
      </div>

      {/* Liveness */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Liveness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                daemon.alive ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-rose-100 dark:bg-rose-900/30",
              )}
            >
              <Activity
                className={cn(
                  "h-6 w-6",
                  daemon.alive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                )}
              />
            </div>
            <div>
              <p className="font-medium">
                {daemon.alive ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Ativo</span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400">Parado</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {daemon.lastSeen
                  ? `Último heartbeat: ${formatDistanceToNow(new Date(daemon.lastSeen), { locale: ptBR, addSuffix: true })}`
                  : "Nenhum heartbeat registrado"}
                {daemon.secondsSinceHeartbeat !== null && ` (${daemon.secondsSinceHeartbeat}s)`}
              </p>
            </div>
          </div>

          {daemon.metadata && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              {Object.entries(daemon.metadata).map(([k, v]) => (
                <div key={k} className="rounded border p-2">
                  <p className="text-muted-foreground">{k}</p>
                  <p className="font-mono mt-0.5">{String(v)}</p>
                </div>
              ))}
            </div>
          )}

          {!daemon.alive && (
            <div className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
              <p className="font-medium">Daemon parado.</p>
              <p className="mt-1">
                Reinicie no M4 Pro:{" "}
                <code className="font-mono">
                  launchctl unload ~/Library/LaunchAgents/com.ombuds.daemon.plist && launchctl load ~/Library/LaunchAgents/com.ombuds.daemon.plist
                </code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Pendentes" value={queue.pending} icon={Clock} tone="default" />
        <StatCard label="Processando" value={queue.processing} icon={RefreshCw} tone="blue" />
        <StatCard label="Concluídas" value={queue.completed} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Revisão manual" value={queue.needsReview} icon={AlertTriangle} tone="amber" />
        <StatCard
          label="Falhas 24h"
          value={queue.failedLast24h}
          icon={XCircle}
          tone={queue.failedLast24h > 0 ? "rose" : "default"}
        />
      </div>

      {/* Recent tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Últimas 20 tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma task registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Skill</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Etapa</th>
                    <th className="py-2 pr-3 font-medium">Criada</th>
                    <th className="py-2 pr-3 font-medium">Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((t) => {
                    const duracao =
                      t.startedAt && t.completedAt
                        ? Math.round(
                            (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / 1000,
                          ) + "s"
                        : t.startedAt
                          ? "em andamento"
                          : "—";
                    return (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-mono">{t.id}</td>
                        <td className="py-2 pr-3">{t.skill}</td>
                        <td className="py-2 pr-3">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground max-w-[200px] truncate">
                          {t.erro ? (
                            <span className="text-rose-600 dark:text-rose-400">{t.erro}</span>
                          ) : (
                            t.etapa ?? "—"
                          )}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {formatDistanceToNow(new Date(t.createdAt), { locale: ptBR, addSuffix: true })}
                        </td>
                        <td className="py-2 pr-3 font-mono text-muted-foreground">{duracao}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "default" | "blue" | "emerald" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    default: "text-muted-foreground",
    blue: "text-sky-600 dark:text-sky-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
          <Icon className={cn("h-5 w-5", tones[tone])} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "pending", className: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
    processing: { label: "processing", className: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
    completed: { label: "completed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    failed: { label: "failed", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
    needs_review: { label: "needs_review", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  };
  const entry = map[status] ?? { label: status, className: "bg-neutral-100 text-neutral-700" };
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium", entry.className)}>
      {entry.label}
    </span>
  );
}
