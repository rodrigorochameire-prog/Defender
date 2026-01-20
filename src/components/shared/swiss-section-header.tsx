"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwissSectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SwissSectionHeader({
  label,
  title,
  description,
  actions,
  className,
}: SwissSectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        {label && (
          <p className="text-xs uppercase font-semibold tracking-[0.25em] text-slate-400">
            {label}
          </p>
        )}
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
