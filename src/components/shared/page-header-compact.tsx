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
    <div className="px-4 md:px-6 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        {/* Ícone + Título */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
            <Icon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</span>
            {subtitle && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">• {subtitle}</span>
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
