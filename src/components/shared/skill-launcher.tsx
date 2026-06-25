"use client";

/**
 * SkillLauncher — superfície única para disparar as skills jurídicas do Defensor
 * sobre uma entidade (processo / assistido / caso). Lista as skills aplicáveis ao
 * contexto (atribuição + tipo de entidade), agrupadas por categoria, e dispara
 * cada uma pelo daemon via `useSkillTask` (claude -p, login Max, custo zero).
 *
 * Componente burro: toda a lógica de quais skills e qual payload vem de
 * `launcher-view` (testado em isolamento).
 */

import { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  Sparkles,
  ScanSearch,
  Scale,
  ShieldAlert,
  Gavel,
  DoorOpen,
  FileSearch,
  FileText,
  CalendarClock,
  PenLine,
  AudioLines,
  Mic,
  MessageSquareText,
  MessageCircleQuestion,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSkillTask } from "@/hooks/use-skill-task";
import {
  buildLauncherItems,
  groupByCategoria,
  type LauncherContext,
} from "@/lib/skills/launcher-view";

const ICONS: Record<string, LucideIcon> = {
  ScanSearch,
  Scale,
  ShieldAlert,
  Gavel,
  DoorOpen,
  FileSearch,
  FileText,
  CalendarClock,
  PenLine,
  AudioLines,
  Mic,
  MessageSquareText,
  MessageCircleQuestion,
};

interface SkillLauncherProps extends LauncherContext {
  className?: string;
  /** Chamado quando uma task conclui (para revalidar dados na página). */
  onComplete?: () => void;
}

export function SkillLauncher({
  entity,
  atribuicao,
  assistidoId,
  processoId,
  casoId,
  className,
  onComplete,
}: SkillLauncherProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const task = useSkillTask({
    onComplete: () => {
      toast.success("Skill concluída");
      onComplete?.();
    },
    onError: (msg) => toast.error(`Erro: ${msg}`),
  });

  const items = buildLauncherItems({
    entity,
    atribuicao,
    assistidoId,
    processoId,
    casoId,
  });
  const groups = groupByCategoria(items);

  const busy =
    task.state === "pending" ||
    task.state === "processing" ||
    task.isSubmitting;

  function handleTrigger(slug: string, triggerInput: Parameters<typeof task.trigger>[0]) {
    if (busy || task.state !== "idle") return;
    setActiveSlug(slug);
    task.trigger(triggerInput);
  }

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-neutral-200 dark:border-neutral-700 p-3 text-xs text-neutral-500 dark:text-neutral-400",
          className,
        )}
      >
        {assistidoId == null
          ? "Vincule um assistido para usar as ações de IA."
          : "Sem ações de IA para este contexto."}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
        Ações de IA
      </div>

      {busy && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-600/15 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{task.etapa || "Processando..."}</span>
        </div>
      )}

      {task.state === "completed" && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-600/15 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Concluído</span>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.category} className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {group.label}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon] ?? Sparkles;
              const isActive = activeSlug === item.slug && busy;
              return (
                <Button
                  key={item.slug}
                  type="button"
                  variant="outline"
                  size="sm"
                  title={item.description}
                  disabled={busy}
                  onClick={() => handleTrigger(item.slug, item.triggerInput)}
                  className={cn(
                    "h-8 gap-1.5 text-xs cursor-pointer transition-colors duration-200",
                    "hover:border-emerald-300 hover:text-emerald-700 dark:hover:border-emerald-500/50 dark:hover:text-emerald-300",
                  )}
                >
                  {isActive ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
