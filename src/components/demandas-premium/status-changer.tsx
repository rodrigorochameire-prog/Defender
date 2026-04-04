"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DEMANDA_STATUS,
  STATUS_GROUPS,
  STATUS_OPTIONS_BY_COLUMN,
  ALL_STATUS_OPTIONS,
  getStatusConfig,
  type StatusGroup,
} from "@/config/demanda-status";

// Re-export type para compatibilidade
export type DemandaStatus = string;

interface StatusChangerProps {
  currentStatus: DemandaStatus;
  demandaId: string;
  demandaTitulo: string;
  onStatusChange: (
    newStatus: DemandaStatus,
    observation?: string
  ) => Promise<void>;
  compact?: boolean;
}

// Transições sugeridas por grupo (ações rápidas contextuais)
const QUICK_TRANSITIONS: Record<StatusGroup, string[]> = {
  triagem: ["analisar", "elaborar", "urgente"],
  preparacao: ["protocolar", "revisar", "documentos"],
  diligencias: ["elaborar", "protocolar", "analisar"],
  saida: ["protocolado", "monitorar"],
  concluida: ["arquivado"],
  arquivado: [],
};

export function StatusChanger({
  currentStatus,
  demandaId,
  demandaTitulo,
  onStatusChange,
  compact = false,
}: StatusChangerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [observation, setObservation] = useState("");
  const [loading, setLoading] = useState(false);

  const currentInfo = getStatusConfig(currentStatus);
  const CurrentIcon = currentInfo.icon;

  // Quick transitions baseadas no grupo atual
  const quickStatuses = QUICK_TRANSITIONS[currentInfo.group] || [];

  const handleQuickChange = async (newStatus: string) => {
    setSelectedStatus(newStatus);
    setShowDialog(true);
  };

  const handleConfirm = async () => {
    if (!selectedStatus) return;

    setLoading(true);
    try {
      await onStatusChange(selectedStatus, observation);
      const newInfo = getStatusConfig(selectedStatus);
      toast.success("Status atualizado com sucesso!", {
        description: `${demandaTitulo} agora está em "${newInfo.label}"`,
      });
      setShowDialog(false);
      setObservation("");
      setSelectedStatus(null);
    } catch (error) {
      toast.error("Erro ao atualizar status", {
        description: "Tente novamente mais tarde",
      });
    } finally {
      setLoading(false);
    }
  };

  // Grouped menu items for the dropdown
  const groupOrder: Array<{ key: string; label: string; statuses: typeof ALL_STATUS_OPTIONS }> = [
    { key: "triagem", label: "Triagem", statuses: STATUS_OPTIONS_BY_COLUMN.triagem },
    { key: "em_andamento", label: "Em Andamento", statuses: STATUS_OPTIONS_BY_COLUMN.em_andamento },
    { key: "concluida", label: "Concluída", statuses: STATUS_OPTIONS_BY_COLUMN.concluida },
    { key: "arquivado", label: "Arquivado", statuses: STATUS_OPTIONS_BY_COLUMN.arquivado },
  ];

  if (compact) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-7 gap-1.5 border-dashed",
                "hover:scale-105 transition-transform"
              )}
              style={{ color: currentInfo.color }}
            >
              <CurrentIcon className="w-3 h-3" />
              <span className="text-xs font-medium">{currentInfo.label}</span>
              <ChevronRight className="w-3 h-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-y-auto">
            {groupOrder.map((group, gi) => (
              <DropdownMenuGroup key={group.key}>
                {gi > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-neutral-400">
                  {group.label}
                </DropdownMenuLabel>
                {group.statuses.map((opt) => {
                  const config = DEMANDA_STATUS[opt.value];
                  if (!config || opt.value === currentStatus) return null;
                  const Icon = config.icon;
                  return (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => handleQuickChange(opt.value)}
                      className="gap-2 cursor-pointer"
                    >
                      <span style={{ color: STATUS_GROUPS[config.group].color }}><Icon className="w-4 h-4" /></span>
                      <span>{opt.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Confirmation Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar mudança de status</DialogTitle>
              <DialogDescription>
                Você está mudando o status de &ldquo;{demandaTitulo}&rdquo; de{" "}
                <span className="font-medium">{currentInfo.label}</span> para{" "}
                <span className="font-medium">
                  {selectedStatus && getStatusConfig(selectedStatus).label}
                </span>
                .
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="observation">
                  Observação <span className="text-neutral-500">(opcional)</span>
                </Label>
                <Textarea
                  id="observation"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Adicione uma observação sobre esta mudança..."
                  className="mt-2 min-h-[100px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? "Salvando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full version with quick actions
  return (
    <div className="space-y-3">
      {/* Current Status */}
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${currentInfo.color}20` }}
        >
          <span style={{ color: currentInfo.color }}><CurrentIcon className="w-5 h-5" /></span>
        </div>
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Status atual
          </p>
          <p className="text-sm font-semibold" style={{ color: currentInfo.color }}>
            {currentInfo.label}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      {quickStatuses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Ações rápidas
          </p>
          <div className="grid grid-cols-2 gap-2">
            {quickStatuses.map((statusKey) => {
              const config = DEMANDA_STATUS[statusKey];
              if (!config || statusKey === currentStatus) return null;
              const Icon = config.icon;
              const groupColor = STATUS_GROUPS[config.group].color;
              return (
                <motion.button
                  key={statusKey}
                  onClick={() => handleQuickChange(statusKey)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border-2 border-dashed transition-all",
                    "hover:scale-105 hover:shadow-md",
                    "border-neutral-200 dark:border-neutral-700 hover:border-current"
                  )}
                  style={{ backgroundColor: `${groupColor}10` }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span style={{ color: groupColor }}><Icon className="w-4 h-4" /></span>
                  <div className="text-left">
                    <p className="text-sm font-medium" style={{ color: groupColor }}>
                      {config.label}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 ml-auto" style={{ color: groupColor }} />
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* All statuses dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full text-xs">
            Ver todos os status...
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 max-h-80 overflow-y-auto">
          {groupOrder.map((group, gi) => (
            <DropdownMenuGroup key={group.key}>
              {gi > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-neutral-400">
                {group.label}
              </DropdownMenuLabel>
              {group.statuses.map((opt) => {
                const config = DEMANDA_STATUS[opt.value];
                if (!config || opt.value === currentStatus) return null;
                const Icon = config.icon;
                return (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => handleQuickChange(opt.value)}
                    className="gap-2 cursor-pointer"
                  >
                    <span style={{ color: STATUS_GROUPS[config.group].color }}><Icon className="w-4 h-4" /></span>
                    <span>{opt.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar mudança de status</DialogTitle>
            <DialogDescription>
              Você está mudando o status de &ldquo;{demandaTitulo}&rdquo; de{" "}
              <span className="font-medium">{currentInfo.label}</span> para{" "}
              <span className="font-medium">
                {selectedStatus && getStatusConfig(selectedStatus).label}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="observation">
                Observação <span className="text-neutral-500">(opcional)</span>
              </Label>
              <Textarea
                id="observation"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Adicione uma observação sobre esta mudança..."
                className="mt-2 min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Status flow visualization
export function StatusFlow({ currentStatus }: { currentStatus: string }) {
  const stages: Array<{ key: StatusGroup; label: string }> = [
    { key: "triagem", label: "Triagem" },
    { key: "preparacao", label: "Preparação" },
    { key: "saida", label: "Saída" },
    { key: "concluida", label: "Concluída" },
  ];

  const currentConfig = getStatusConfig(currentStatus);
  const currentGroupIndex = stages.findIndex(s => s.key === currentConfig.group);

  return (
    <div className="flex items-center gap-2">
      {stages.map((stage, index) => {
        const groupConfig = STATUS_GROUPS[stage.key];
        const isActive = index <= currentGroupIndex;
        const isCurrent = stage.key === currentConfig.group;
        const Icon = groupConfig.icon;

        return (
          <div key={stage.key} className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                isActive
                  ? "border-current"
                  : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400",
                isCurrent && "ring-4 ring-emerald-500/20"
              )}
              style={isActive ? {
                backgroundColor: `${groupConfig.color}20`,
                color: groupConfig.color,
                borderColor: groupConfig.color,
              } : undefined}
            >
              <Icon className="w-4 h-4" />
            </motion.div>
            {index < stages.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 transition-all",
                  isActive
                    ? "bg-emerald-500"
                    : "bg-neutral-200 dark:bg-neutral-700"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
