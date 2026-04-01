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
    <div className="flex items-center gap-1 border-b border-zinc-200/80 dark:border-zinc-800/60 px-6 lg:px-8 overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap shrink-0",
            active === tab.key
              ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-50 font-medium"
              : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          <tab.icon className="h-4 w-4" />
          <span>{tab.label}</span>
          {counts?.[tab.key] !== undefined && counts[tab.key]! > 0 && (
            <span className={cn(
              "text-[10px] min-w-[22px] text-center px-1.5 py-0.5 rounded-full font-medium",
              active === tab.key
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
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
