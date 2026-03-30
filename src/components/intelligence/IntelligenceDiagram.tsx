"use client";

import { cn } from "@/lib/utils";
import { Network, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";

interface IntelligenceDiagramProps {
  assistidoId?: number;
  processoId?: number;
  casoId?: number | null;
  className?: string;
}

export function IntelligenceDiagram({
  assistidoId,
  processoId,
  casoId,
  className,
}: IntelligenceDiagramProps) {
  // For now, link to Palacio da Mente if caso exists
  // Future: auto-generate relationship diagram from case_personas

  if (!casoId) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-center",
          className,
        )}
      >
        <Network className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground mb-1">
          Diagrama de Relacionamentos
        </p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Gere uma analise primeiro para criar o caso e visualizar o diagrama de
          relacionamentos no Palacio da Mente.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Network className="h-3.5 w-3.5 text-violet-500" />
          Diagrama de Investigacao
        </h4>
        <Link
          href={`/admin/palacio?caso=${casoId}`}
          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
        >
          Abrir Palacio da Mente
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="rounded-xl border-2 border-dashed border-border bg-muted/50 p-8 flex flex-col items-center justify-center min-h-[200px]">
        <Network className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground mb-3 text-center max-w-sm">
          O diagrama de relacionamentos sera gerado automaticamente com as
          pessoas e fatos identificados na analise.
        </p>
        <Link
          href={`/admin/palacio?caso=${casoId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Criar Diagrama no Palacio
        </Link>
      </div>
    </div>
  );
}
