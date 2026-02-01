"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface PageHeaderCompactProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * Header compacto padronizado para todas as páginas do Defender
 * Segue o padrão visual de Demandas/Dashboard
 */
export function PageHeaderCompact({ 
  icon: Icon, 
  title, 
  subtitle,
  actions 
}: PageHeaderCompactProps) {
  return (
    <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        {/* Ícone + Título */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
            <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
            {subtitle && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">• {subtitle}</span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-1.5">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
