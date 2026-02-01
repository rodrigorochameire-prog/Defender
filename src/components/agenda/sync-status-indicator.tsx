import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Clock,
  Zap,
} from "lucide-react";

interface SyncStatusIndicatorProps {
  status: "synced" | "pending" | "syncing" | "conflict" | "error" | "offline";
  lastSync?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function SyncStatusIndicator({
  status,
  lastSync,
  showLabel = false,
  size = "md",
}: SyncStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "synced":
        return {
          icon: CheckCircle2,
          color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
          label: "Sincronizado",
          description: lastSync
            ? `Última sync: ${new Date(lastSync).toLocaleTimeString("pt-BR")}`
            : "Atualizado",
        };
      case "pending":
        return {
          icon: Clock,
          color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
          label: "Pendente",
          description: "Aguardando sincronização",
        };
      case "syncing":
        return {
          icon: RefreshCw,
          color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
          label: "Sincronizando",
          description: "Atualizando dados...",
          animate: true,
        };
      case "conflict":
        return {
          icon: AlertTriangle,
          color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
          label: "Conflito",
          description: "Requer atenção",
        };
      case "error":
        return {
          icon: CloudOff,
          color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
          label: "Erro",
          description: "Falha na sincronização",
        };
      case "offline":
        return {
          icon: CloudOff,
          color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
          label: "Offline",
          description: "Sem conexão",
        };
      default:
        return {
          icon: Cloud,
          color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
          label: "Desconhecido",
          description: "",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  if (!showLabel) {
    return (
      <div className="relative group">
        <Icon
          className={`${sizeClasses[size]} ${config.color.split(" ")[1]} ${
            config.animate ? "animate-spin" : ""
          }`}
        />
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
          <div className="bg-zinc-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {config.label}
            {config.description && (
              <div className="text-zinc-400 text-[10px]">{config.description}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Badge variant="secondary" className={`${config.color} gap-1.5`}>
      <Icon className={`${sizeClasses[size]} ${config.animate ? "animate-spin" : ""}`} />
      <span className="text-xs font-semibold">{config.label}</span>
    </Badge>
  );
}
