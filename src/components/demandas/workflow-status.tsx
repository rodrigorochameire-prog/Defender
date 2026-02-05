"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit,
  Eye,
  FileCheck,
  FileText,
  Flame,
  Inbox,
  Loader2,
  Send,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMANDA_STATUS, STATUS_GROUPS, type StatusGroup } from "@/config/demanda-status";

interface WorkflowStatusProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => Promise<void>;
  isLoading?: boolean;
  compact?: boolean;
  showWorkflow?: boolean;
  reuPreso?: boolean;
}

// Definir fluxo de trabalho padrão
const WORKFLOW_STEPS: { status: string; label: string; group: StatusGroup }[] = [
  { status: "urgente", label: "Urgente", group: "urgente" },
  { status: "analisar", label: "Analisar", group: "preparacao" },
  { status: "elaborar", label: "Elaborar", group: "preparacao" },
  { status: "revisar", label: "Revisar", group: "preparacao" },
  { status: "protocolar", label: "Protocolar", group: "delegacao" },
  { status: "protocolado", label: "Protocolado", group: "concluida" },
];

// Transições permitidas (status atual -> próximos status possíveis)
const TRANSICOES_PERMITIDAS: Record<string, string[]> = {
  // Urgente pode ir para qualquer status de preparação
  urgente: ["analisar", "atender", "elaborar", "investigar", "fila"],

  // Preparação
  analisar: ["elaborar", "investigar", "buscar", "fila", "sem_atuacao", "constituiu_advogado"],
  atender: ["elaborar", "fila", "resolvido", "sem_atuacao", "constituiu_advogado"],
  buscar: ["analisar", "elaborar", "fila"],
  investigar: ["analisar", "elaborar", "documentos", "testemunhas"],
  elaborar: ["elaborando", "revisar", "protocolar"],
  elaborando: ["revisar", "protocolar"],
  revisar: ["revisando", "protocolar", "elaborar"],
  revisando: ["protocolar", "elaborar"],

  // Delegação
  protocolar: ["protocolado", "monitorar", "amanda", "taissa", "emilly"],

  // Monitoramento
  amanda: ["protocolado", "monitorar", "ciencia"],
  taissa: ["protocolado", "monitorar", "ciencia"],
  emilly: ["protocolado", "monitorar", "ciencia"],
  monitorar: ["protocolado", "ciencia", "fila"],

  // Fila
  fila: ["urgente", "analisar", "atender", "elaborar"],

  // Diligencias
  documentos: ["elaborar", "fila"],
  testemunhas: ["elaborar", "fila"],

  // Concluída (pode reabrir em casos excepcionais)
  protocolado: ["solar", "ciencia"],
  solar: ["ciencia"],
  ciencia: [],
  resolvido: [],
  constituiu_advogado: [],
  sem_atuacao: [],
};

// Atalhos rápidos para ações comuns
const ATALHOS_RAPIDOS = [
  { status: "elaborar", label: "Elaborar", icon: Edit },
  { status: "protocolar", label: "Protocolar", icon: Send },
  { status: "protocolado", label: "Concluir", icon: CheckCircle2 },
];

export function WorkflowStatus({
  currentStatus,
  onStatusChange,
  isLoading = false,
  compact = false,
  showWorkflow = true,
  reuPreso = false,
}: WorkflowStatusProps) {
  const [localLoading, setLocalLoading] = useState(false);

  const normalizedStatus = currentStatus?.toLowerCase().replace(/\s+/g, "_") || "fila";
  const statusConfig = DEMANDA_STATUS[normalizedStatus as keyof typeof DEMANDA_STATUS];
  const groupConfig = statusConfig ? STATUS_GROUPS[statusConfig.group] : STATUS_GROUPS.fila;
  const Icon = statusConfig?.icon || Inbox;

  const handleStatusChange = async (newStatus: string) => {
    if (isLoading || localLoading) return;
    setLocalLoading(true);
    try {
      await onStatusChange(newStatus);
    } finally {
      setLocalLoading(false);
    }
  };

  // Obter próximos status permitidos
  const proximosStatus = TRANSICOES_PERMITIDAS[normalizedStatus] || [];

  // Agrupar status por grupo para o dropdown
  const statusPorGrupo: Record<StatusGroup, { status: string; config: typeof statusConfig }[]> = {
    urgente: [],
    preparacao: [],
    delegacao: [],
    monitoramento: [],
    fila: [],
    diligencias: [],
    concluida: [],
  };

  proximosStatus.forEach((status) => {
    const config = DEMANDA_STATUS[status as keyof typeof DEMANDA_STATUS];
    if (config) {
      statusPorGrupo[config.group].push({ status, config });
    }
  });

  // Versão compacta - apenas badge com dropdown
  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isLoading || localLoading}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 gap-1 font-medium text-xs",
              reuPreso && "ring-2 ring-red-500 ring-offset-1"
            )}
            style={{ backgroundColor: `${groupConfig.color}40`, color: groupConfig.color }}
          >
            {(isLoading || localLoading) ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Icon className="h-3 w-3" />
            )}
            {statusConfig?.label || currentStatus}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {Object.entries(statusPorGrupo).map(([grupo, items]) => {
            if (items.length === 0) return null;
            const grupoConfig = STATUS_GROUPS[grupo as StatusGroup];
            return (
              <div key={grupo}>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wide opacity-60">
                  {grupoConfig.label}
                </DropdownMenuLabel>
                {items.map(({ status, config }) => {
                  const ItemIcon = config.icon;
                  return (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className="gap-2"
                    >
                      <ItemIcon className="h-4 w-4" style={{ color: grupoConfig.color }} />
                      {config.label}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
              </div>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Versão completa com workflow visual
  return (
    <div className="space-y-4">
      {/* Status atual */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg font-medium",
            reuPreso && "ring-2 ring-red-500"
          )}
          style={{ backgroundColor: `${groupConfig.color}30`, color: groupConfig.color }}
        >
          <Icon className="h-5 w-5" />
          <span className="text-sm">{statusConfig?.label || currentStatus}</span>
        </div>

        {reuPreso && (
          <Badge variant="destructive" className="text-xs animate-pulse">
            RÉU PRESO
          </Badge>
        )}
      </div>

      {/* Workflow visual */}
      {showWorkflow && (
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {WORKFLOW_STEPS.map((step, index) => {
            const stepConfig = STATUS_GROUPS[step.group];
            const isActive = normalizedStatus === step.status;
            const isPast = WORKFLOW_STEPS.findIndex(s => s.status === normalizedStatus) > index;
            const StepIcon = DEMANDA_STATUS[step.status as keyof typeof DEMANDA_STATUS]?.icon || Inbox;

            return (
              <div key={step.status} className="flex items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => !isActive && handleStatusChange(step.status)}
                        disabled={isLoading || localLoading || isActive}
                        className={cn(
                          "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all",
                          isActive && "ring-2 ring-offset-2",
                          isPast && "opacity-50",
                          !isActive && !isPast && "hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        )}
                        style={{
                          backgroundColor: isActive ? `${stepConfig.color}30` : undefined,
                          ringColor: isActive ? stepConfig.color : undefined,
                        }}
                      >
                        <StepIcon
                          className={cn("h-4 w-4", isPast && "text-green-500")}
                          style={{ color: isActive ? stepConfig.color : undefined }}
                        />
                        <span className={cn(
                          "text-[10px] font-medium whitespace-nowrap",
                          isActive && "font-bold"
                        )}>
                          {step.label}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clique para mudar para {step.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {index < WORKFLOW_STEPS.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Atalhos rápidos */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-zinc-500 self-center">Atalhos:</span>
        {ATALHOS_RAPIDOS.map(({ status, label, icon: AtalhoIcon }) => {
          const canTransition = proximosStatus.includes(status);
          const isCurrentStatus = normalizedStatus === status;

          return (
            <Button
              key={status}
              size="sm"
              variant={isCurrentStatus ? "default" : "outline"}
              disabled={!canTransition || isLoading || localLoading || isCurrentStatus}
              onClick={() => handleStatusChange(status)}
              className={cn(
                "h-7 text-xs gap-1.5",
                canTransition && !isCurrentStatus && "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              )}
            >
              {(isLoading || localLoading) && status === normalizedStatus ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <AtalhoIcon className="h-3 w-3" />
              )}
              {label}
            </Button>
          );
        })}

        {/* Dropdown para mais opções */}
        {proximosStatus.length > 3 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                Mais opções
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {Object.entries(statusPorGrupo).map(([grupo, items]) => {
                if (items.length === 0) return null;
                const grupoConfig = STATUS_GROUPS[grupo as StatusGroup];
                return (
                  <div key={grupo}>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wide opacity-60">
                      {grupoConfig.label}
                    </DropdownMenuLabel>
                    {items.map(({ status, config }) => {
                      const ItemIcon = config.icon;
                      return (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          className="gap-2"
                        >
                          <ItemIcon className="h-4 w-4" style={{ color: grupoConfig.color }} />
                          {config.label}
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                  </div>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// Componente menor para uso em listas
export function StatusBadgeQuick({
  status,
  onStatusChange,
  isLoading,
  reuPreso,
}: {
  status: string;
  onStatusChange: (newStatus: string) => Promise<void>;
  isLoading?: boolean;
  reuPreso?: boolean;
}) {
  return (
    <WorkflowStatus
      currentStatus={status}
      onStatusChange={onStatusChange}
      isLoading={isLoading}
      compact={true}
      showWorkflow={false}
      reuPreso={reuPreso}
    />
  );
}
