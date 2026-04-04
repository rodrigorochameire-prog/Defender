"use client";

import { LucideIcon, ListTodo } from "lucide-react";
import { ReactNode } from "react";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
}

export function PageHeader({ icon: Icon = ListTodo, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="relative px-4 sm:px-5 md:px-8 py-5 sm:py-6 md:py-8 bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden">
      {/* Subtle gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-transparent to-transparent dark:from-emerald-950/15 dark:via-transparent pointer-events-none" />
      <div className="relative flex items-center justify-between gap-3">
        {/* Header Padrão Defender */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-neutral-900 dark:bg-white flex items-center justify-center shadow-lg ring-4 ring-neutral-900/5 dark:ring-white/10 shrink-0">
            <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white dark:text-neutral-900" />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight truncate">{title}</h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{subtitle}</p>
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
