import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Ação ÚNICA opcional. A Agenda evita repetição de CTA como pseudo-vazio. */
  action?: { label: string; onClick: () => void };
  /** Densidade reduzida para vazios inline (dentro de um card/coluna). */
  compact?: boolean;
  className?: string;
}

/**
 * Estado vazio elegante e discreto — substitui a repetição massiva de CTAs que
 * a Agenda usava como pseudo-empty-state. Ícone sóbrio, texto explicativo e, no
 * máximo, uma ação. `role="status"` para leitores de tela.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4 gap-2" : "py-14 px-6 gap-3",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800/60 text-neutral-400 dark:text-neutral-500",
          compact ? "w-10 h-10" : "w-12 h-12"
        )}
      >
        <Icon className={compact ? "w-5 h-5" : "w-6 h-6"} strokeWidth={1.75} />
      </div>
      <div className="space-y-1 max-w-xs">
        <p className="text-sm font-semibold text-foreground/80">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  );
}
