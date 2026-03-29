"use client";

import { Brain, ListTodo, Calendar, FolderOpen, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type MainTab = "analise" | "demandas" | "agenda" | "documentos" | "vinculados";

const TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: "analise", label: "Análise", icon: Brain },
  { key: "demandas", label: "Demandas", icon: ListTodo },
  { key: "agenda", label: "Agenda", icon: Calendar },
  { key: "documentos", label: "Documentos", icon: FolderOpen },
  { key: "vinculados", label: "Vinculados", icon: Link2 },
];

interface ProcessoTabsProps {
  active: MainTab;
  onChange: (tab: MainTab) => void;
  counts?: Partial<Record<MainTab, number>>;
}

export function ProcessoTabs({ active, onChange, counts }: ProcessoTabsProps) {
  return (
    <div className="flex items-center gap-8 border-b border-zinc-100 dark:border-zinc-800/50 px-8">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "flex items-center gap-2 py-3.5 text-sm font-medium border-b-2 transition-colors",
            active === tab.key
              ? "text-zinc-900 dark:text-zinc-50 border-emerald-500"
              : "text-zinc-400 border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
          )}
        >
          <tab.icon className="h-4 w-4" />
          <span>{tab.label}</span>
          {counts?.[tab.key] !== undefined && counts[tab.key]! > 0 && (
            <span className={cn(
              "text-[10px] min-w-[18px] text-center px-1.5 py-0.5 rounded-full",
              active === tab.key
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
            )}>
              {counts[tab.key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
