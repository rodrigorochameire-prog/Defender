"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * FilterBar - Barra de Filtros Padronizada
 * 
 * Design limpo e consistente para filtros em todas as páginas.
 * 
 * Uso:
 * ```tsx
 * <FilterBar>
 *   <Input placeholder="Buscar..." className="w-64" />
 *   <Select>...</Select>
 *   <Button variant="outline">Limpar</Button>
 * </FilterBar>
 * ```
 */

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "w-full flex flex-wrap items-center gap-2",
        "bg-stone-100/50 dark:bg-zinc-800/50",
        "border border-stone-200 dark:border-zinc-700",
        "rounded-lg px-4 py-3",
        className
      )}
    >
      {children}
    </div>
  );
}
