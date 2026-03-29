// src/components/processo/processo-tabs.tsx
"use client";

import { Brain, ListTodo, Calendar, FolderOpen, Link2 } from "lucide-react";
import { TAB_STYLE } from "@/lib/config/design-tokens";
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
    <div className={TAB_STYLE.bar}>
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(TAB_STYLE.item, active === tab.key && TAB_STYLE.active)}
        >
          <div className="flex items-center gap-1.5">
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {counts?.[tab.key] !== undefined && counts[tab.key]! > 0 && (
              <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded-full">
                {counts[tab.key]}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
