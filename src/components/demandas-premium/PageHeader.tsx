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
    <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        {/* Subtítulo com ícone */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
            <Icon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{subtitle}</span>
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-1">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
