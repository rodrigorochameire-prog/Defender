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
    <div className="relative px-5 md:px-8 py-6 md:py-8 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
      {/* Subtle gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-transparent to-transparent dark:from-emerald-950/15 dark:via-transparent pointer-events-none" />
      <div className="relative flex items-center justify-between">
        {/* Header Padrão Defender */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg ring-4 ring-zinc-900/5 dark:ring-white/10">
            <Icon className="w-5.5 h-5.5 text-white dark:text-zinc-900" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">{title}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>
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
