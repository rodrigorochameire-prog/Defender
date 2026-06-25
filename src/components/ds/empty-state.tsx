import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Variante conceitual do vazio: inicial-com-CTA / filtro-vazio (busca) / erro. */
export type EmptyStateVariant = "default" | "search" | "error";

/** Densidade vertical do estado vazio. */
export type EmptyStateSize = "sm" | "md" | "lg";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  /** Ícone opcional exibido antes do rótulo da ação. */
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Ação primária opcional. A Agenda evita repetição de CTA como pseudo-vazio. */
  action?: EmptyStateAction;
  /** Ação secundária opcional (ex.: "Limpar filtros"). */
  secondaryAction?: { label: string; onClick: () => void };
  /**
   * Variante conceitual — afeta a cor do ícone/halo:
   * - `default` → neutro (vazio inicial, convida a criar)
   * - `search`  → azul (filtro/busca sem resultados)
   * - `error`   → rose (falha ao carregar)
   */
  variant?: EmptyStateVariant;
  /** Densidade vertical. `md` é o padrão. */
  size?: EmptyStateSize;
  /**
   * Atalho de densidade reduzida para vazios inline (equivale a `size="sm"`).
   * Mantido por compatibilidade; se `size` for informado, ele prevalece.
   */
  compact?: boolean;
  className?: string;
}

const SIZE_STYLES: Record<
  EmptyStateSize,
  { container: string; iconWrapper: string; icon: string; title: string; description: string }
> = {
  sm: {
    container: "py-8 px-4 gap-2",
    iconWrapper: "w-10 h-10",
    icon: "w-5 h-5",
    title: "text-sm",
    description: "text-xs",
  },
  md: {
    container: "py-14 px-6 gap-3",
    iconWrapper: "w-12 h-12",
    icon: "w-6 h-6",
    title: "text-sm",
    description: "text-xs",
  },
  lg: {
    container: "py-16 px-6 gap-3",
    iconWrapper: "w-16 h-16",
    icon: "w-7 h-7",
    title: "text-base",
    description: "text-sm",
  },
};

const VARIANT_HALO: Record<EmptyStateVariant, string> = {
  default: "bg-neutral-100 dark:bg-neutral-800/60 text-neutral-400 dark:text-neutral-500",
  search: "bg-blue-50 dark:bg-blue-950/30 text-blue-500",
  error: "bg-rose-50 dark:bg-rose-950/30 text-rose-500",
};

/**
 * Estado vazio canônico e discreto — substitui a repetição massiva de CTAs que
 * a Agenda usava como pseudo-empty-state. Ícone sóbrio, texto explicativo e, no
 * máximo, duas ações. `role="status"` para leitores de tela.
 *
 * Superset único do projeto: cobre vazio inicial (`default` + CTA), busca sem
 * resultado (`search`) e falha de carregamento (`error`), em três densidades.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  size,
  compact = false,
  className,
}: EmptyStateProps) {
  const resolvedSize: EmptyStateSize = size ?? (compact ? "sm" : "md");
  const styles = SIZE_STYLES[resolvedSize];

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        styles.container,
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          styles.iconWrapper,
          VARIANT_HALO[variant]
        )}
      >
        <Icon className={styles.icon} strokeWidth={1.75} />
      </div>
      <div className="space-y-1 max-w-xs">
        <p className={cn("font-semibold text-foreground/80", styles.title)}>{title}</p>
        {description && (
          <p className={cn("text-muted-foreground leading-relaxed", styles.description)}>
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 mt-1">
          {action && (
            <Button variant="outline" size="sm" onClick={action.onClick}>
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
