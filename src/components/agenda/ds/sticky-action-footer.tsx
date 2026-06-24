import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StickyActionFooterProps {
  /** Ações primárias/secundárias — alinhadas à direita. */
  children: ReactNode;
  /** Slot à esquerda — meta-informação (ex.: "3 selecionados", resumo). */
  leading?: ReactNode;
  className?: string;
}

/**
 * Rodapé de ações ancorado — backdrop blur + borda superior sutil, grudado no
 * fundo do container. Usado por sheets/modais/inboxes da Agenda para manter o
 * CTA acessível (essencial no mobile) sem competir com o conteúdo.
 */
export function StickyActionFooter({ children, leading, className }: StickyActionFooterProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 flex items-center gap-2 px-4 py-3",
        "bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md",
        "border-t border-neutral-200/60 dark:border-neutral-800/60",
        className
      )}
    >
      {leading && <div className="min-w-0 flex-1 text-xs text-muted-foreground">{leading}</div>}
      <div className={cn("flex items-center gap-2", !leading && "ml-auto")}>{children}</div>
    </div>
  );
}
