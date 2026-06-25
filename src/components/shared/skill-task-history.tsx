"use client";

/**
 * SkillTaskHistory — histórico recente das skill tasks de uma entidade
 * (processo / assistido / caso). Mostra as execuções passadas das skills
 * (status + resumo do resultado), complementando o progresso ao vivo do
 * SkillLauncher. Lê de `analise.recentForEntity`; formatação em `task-history`.
 */

import { Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { toHistoryItems, type HistoryTone } from "@/lib/skills/task-history";

interface SkillTaskHistoryProps {
  assistidoId?: number;
  processoId?: number;
  casoId?: number;
  limit?: number;
  className?: string;
}

const TONE_CHIP: Record<HistoryTone, string> = {
  success:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-600/15 dark:text-emerald-300",
  danger: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  running: "bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400",
  muted: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

export function SkillTaskHistory({
  assistidoId,
  processoId,
  casoId,
  limit = 5,
  className,
}: SkillTaskHistoryProps) {
  const hasEntity =
    assistidoId != null || processoId != null || casoId != null;

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.analise.recentForEntity.useQuery(
    { assistidoId, processoId, casoId, limit },
    { enabled: hasEntity, refetchOnWindowFocus: false },
  );

  const refresh = () => utils.analise.recentForEntity.invalidate();
  const retry = trpc.analise.retryTask.useMutation({
    onSuccess: () => {
      toast.success("Skill re-enfileirada");
      refresh();
    },
    onError: (e) => toast.error(`Não deu para re-tentar: ${e.message}`),
  });
  const cancel = trpc.analise.cancelarTask.useMutation({
    onSuccess: () => {
      toast.info("Skill cancelada");
      refresh();
    },
    onError: (e) => toast.error(`Não deu para cancelar: ${e.message}`),
  });
  const busy = retry.isPending || cancel.isPending;

  if (!hasEntity) return null;

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-1 py-2 text-xs text-neutral-400",
          className,
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando histórico…
      </div>
    );
  }

  const items = toHistoryItems(data ?? [], Date.now());

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "px-1 py-2 text-xs text-neutral-400 dark:text-neutral-500",
          className,
        )}
      >
        Nenhuma execução ainda.
      </div>
    );
  }

  return (
    <ul className={cn("space-y-1.5", className)}>
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-md border border-neutral-200/70 px-2.5 py-1.5 dark:border-neutral-800/70"
        >
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-medium text-foreground/80">
              {item.skillLabel}
            </span>
            <span
              className={cn(
                "ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                TONE_CHIP[item.tone],
              )}
            >
              {item.statusLabel}
            </span>
            <span className="shrink-0 text-[10px] tabular-nums text-neutral-400">
              {item.when}
            </span>
            {(item.status === "failed" || item.status === "needs_review") && (
              <button
                type="button"
                title="Tentar de novo"
                disabled={busy}
                onClick={() => retry.mutate({ taskId: item.id })}
                className="shrink-0 rounded p-0.5 text-neutral-400 transition-colors hover:text-emerald-600 disabled:opacity-50 dark:hover:text-emerald-400"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
            {item.status === "pending" && (
              <button
                type="button"
                title="Cancelar"
                disabled={busy}
                onClick={() => cancel.mutate({ taskId: item.id })}
                className="shrink-0 rounded p-0.5 text-neutral-400 transition-colors hover:text-rose-600 disabled:opacity-50 dark:hover:text-rose-400"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {item.summary && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {item.summary}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
