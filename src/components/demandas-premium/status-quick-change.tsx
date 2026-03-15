"use client";

import { DEMANDA_STATUS, STATUS_GROUPS, ALL_STATUS_OPTIONS } from "@/config/demanda-status";

interface StatusQuickChangeProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  /** Show all statuses or just common ones */
  showAll?: boolean;
}

// Statuses mais usados no dia-a-dia (order intencional)
const COMMON_STATUSES = [
  "urgente", "atender", "fila",
  "analisar", "elaborar", "elaborando", "revisar",
  "documentos", "oficiar",
  "protocolar", "monitorar",
  "protocolado", "ciencia", "sem_atuacao",
];

export function StatusQuickChange({ currentStatus, onStatusChange, showAll = false }: StatusQuickChangeProps) {
  const statuses = showAll
    ? ALL_STATUS_OPTIONS.map(o => o.value)
    : COMMON_STATUSES;

  return (
    <div className="flex flex-wrap gap-1">
      {statuses.map((statusKey) => {
        const config = DEMANDA_STATUS[statusKey as keyof typeof DEMANDA_STATUS];
        if (!config) return null;

        const Icon = config.icon;
        const isActive = statusKey === currentStatus.toLowerCase();
        const groupColor = STATUS_GROUPS[config.group].color;

        return (
          <button
            key={statusKey}
            onClick={() => onStatusChange(statusKey)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
              isActive
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            <Icon className="w-3 h-3" />
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
