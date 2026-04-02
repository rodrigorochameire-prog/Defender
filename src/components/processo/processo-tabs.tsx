"use client";

import { Brain, ListTodo, Calendar, FolderOpen, Link2, Scale, Library, Baby, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

export type MainTab = "analise" | "demandas" | "agenda" | "documentos" | "vinculados" | "delitos" | "institutos" | "atos_infracionais" | "medidas";

const BASE_TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: "analise", label: "Análise", icon: Brain },
  { key: "demandas", label: "Demandas", icon: ListTodo },
  { key: "agenda", label: "Agenda", icon: Calendar },
  { key: "documentos", label: "Documentos", icon: FolderOpen },
  { key: "vinculados", label: "Vinculados", icon: Link2 },
];

const CRIMINAL_TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: "delitos", label: "Delitos", icon: Scale },
  { key: "institutos", label: "Institutos", icon: Library },
];

const INFANCIA_TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: "atos_infracionais", label: "Atos Infracionais", icon: Baby },
  { key: "medidas", label: "Medidas", icon: Shield },
];

interface ProcessoTabsProps {
  active: MainTab;
  onChange: (tab: MainTab) => void;
  counts?: Partial<Record<MainTab, number>>;
}

export function ProcessoTabs({ active, onChange, counts }: ProcessoTabsProps) {
  const { hasArea } = usePermissions();

  const isCriminalArea = hasArea("CRIMINAL") || hasArea("JURI") || hasArea("EXECUCAO_PENAL") || hasArea("VIOLENCIA_DOMESTICA");
  const isInfanciaArea = hasArea("INFANCIA_JUVENTUDE");

  const TABS = [
    ...BASE_TABS,
    ...(isCriminalArea ? CRIMINAL_TABS : []),
    ...(isInfanciaArea ? INFANCIA_TABS : []),
  ];

  return (
    <div className="flex items-center gap-0.5 mx-3 mt-3 mb-0 overflow-x-auto rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0",
              isActive
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-white/5"
            )}
          >
            <tab.icon className="h-3 w-3" />
            <span>{tab.label}</span>
            {counts?.[tab.key] !== undefined && counts[tab.key]! > 0 && (
              <span className={cn(
                "text-[9px] min-w-[18px] text-center px-1 py-px rounded-full font-medium",
                isActive
                  ? "bg-white/20 text-white/70 dark:bg-zinc-700 dark:text-zinc-300"
                  : "bg-zinc-200/60 dark:bg-white/10 text-zinc-400 dark:text-zinc-500"
              )}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
