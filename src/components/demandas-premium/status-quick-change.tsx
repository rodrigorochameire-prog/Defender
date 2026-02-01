"use client";

import { Badge } from "@/components/ui/badge";
import { getStatusConfig, DEMANDA_STATUS } from "@/config/demanda-status";

interface StatusQuickChangeProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
}

export function StatusQuickChange({ currentStatus, onStatusChange }: StatusQuickChangeProps) {
  const statusConfig = getStatusConfig(currentStatus);
  const StatusIcon = statusConfig.icon;

  const quickStatuses = ["urgente", "analisar", "elaborar", "protocolar", "protocolado"];

  return (
    <div className="flex flex-wrap gap-1">
      {quickStatuses.map((statusKey) => {
        const config = DEMANDA_STATUS[statusKey as keyof typeof DEMANDA_STATUS];
        if (!config) return null;
        
        const Icon = config.icon;
        const isActive = statusKey === currentStatus.toLowerCase();
        
        return (
          <button
            key={statusKey}
            onClick={() => onStatusChange(statusKey)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${\
              isActive\
                ? "bg-emerald-600 text-white shadow-sm"\
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"\
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