"use client";

import { Brain, Scale, Library, Baby, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

export type MainTab = "analise" | "delitos" | "institutos" | "atos_infracionais" | "medidas";

const BASE_TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: "analise", label: "Análise", icon: Brain },
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
}

export function ProcessoTabs({ active, onChange }: ProcessoTabsProps) {
  const { hasArea } = usePermissions();

  const isCriminalArea = hasArea("CRIMINAL") || hasArea("JURI") || hasArea("EXECUCAO_PENAL") || hasArea("VIOLENCIA_DOMESTICA");
  const isInfanciaArea = hasArea("INFANCIA_JUVENTUDE");

  const TABS = [
    ...BASE_TABS,
    ...(isCriminalArea ? CRIMINAL_TABS : []),
    ...(isInfanciaArea ? INFANCIA_TABS : []),
  ];

  return (
    <div className="flex items-center gap-0.5 mx-3 mt-3 mb-0 overflow-x-auto rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0",
              isActive
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-white/5"
            )}
          >
            <tab.icon className="h-3 w-3" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
