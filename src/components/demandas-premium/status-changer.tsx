"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import {
  ChevronRight,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  Archive,
  AlertCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type DemandaStatus =
  | "analisar"
  | "elaborando"
  | "protocolar"
  | "protocolado"
  | "arquivado";

interface StatusInfo {
  value: DemandaStatus;
  label: string;
  color: string;
  bgColor: string;
  icon: any;
  next?: DemandaStatus[];
}

const statusConfig: Record<DemandaStatus, StatusInfo> = {
  analisar: {
    value: "analisar",
    label: "Analisar",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950",
    icon: AlertCircle,
    next: ["elaborando", "arquivado"],
  },
  elaborando: {
    value: "elaborando",
    label: "Elaborando",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-950",
    icon: FileText,
    next: ["protocolar", "analisar", "arquivado"],
  },
  protocolar: {
    value: "protocolar",
    label: "Protocolar",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-950",
    icon: Send,
    next: ["protocolado", "elaborando"],
  },
  protocolado: {
    value: "protocolado",
    label: "Protocolado",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-950",
    icon: CheckCircle2,
    next: ["arquivado"],
  },
  arquivado: {
    value: "arquivado",
    label: "Arquivado",
    color: "text-zinc-600 dark:text-zinc-400",
    bgColor: "bg-zinc-100 dark:bg-zinc-800",
    icon: Archive,
    next: [],
  },
};

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

export function StatusChanger({
  currentStatus,
  demandaId,
  demandaTitulo,
  onStatusChange,
  compact = false,
}: StatusChangerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<DemandaStatus | null>(
    null
  );
  const [observation, setObservation] = useState("");
  const [loading, setLoading] = useState(false);

  const currentInfo = statusConfig[currentStatus];
  const nextStatuses = currentInfo.next || [];

  const handleQuickChange = async (newStatus: DemandaStatus) => {
    setSelectedStatus(newStatus);
    setShowDialog(true);
  };

  const handleConfirm = async () => {
    if (!selectedStatus) return;

    setLoading(true);
    try {
      await onStatusChange(selectedStatus, observation);
      toast.success("Status atualizado com sucesso!", {
        description: `${demandaTitulo} agora está em "${statusConfig[selectedStatus].label}"`,
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
                currentInfo.color,
                "hover:scale-105 transition-transform"
              )}
            >
              <currentInfo.icon className="w-3 h-3" />
              <span className="text-xs font-medium">{currentInfo.label}</span>
              <ChevronRight className="w-3 h-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mudar status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {nextStatuses.map((status) => {
              const info = statusConfig[status];
              return (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleQuickChange(status)}
                  className="gap-2 cursor-pointer"
                >
                  <info.icon className={cn("w-4 h-4", info.color)} />
                  <span>{info.label}</span>
                </DropdownMenuItem>
              );
            })}
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
                  {selectedStatus && statusConfig[selectedStatus].label}
                </span>
                .
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="observation">
                  Observação <span className="text-zinc-500">(opcional)</span>
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
        <div className={cn("p-2 rounded-lg", currentInfo.bgColor)}>
          <currentInfo.icon className={cn("w-5 h-5", currentInfo.color)} />
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Status atual
          </p>
          <p className={cn("text-sm font-semibold", currentInfo.color)}>
            {currentInfo.label}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      {nextStatuses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Ações rápidas
          </p>
          <div className="grid grid-cols-2 gap-2">
            {nextStatuses.map((status) => {
              const info = statusConfig[status];
              return (
                <motion.button
                  key={status}
                  onClick={() => handleQuickChange(status)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border-2 border-dashed transition-all",
                    "hover:scale-105 hover:shadow-md",
                    info.bgColor,
                    "border-zinc-200 dark:border-zinc-700 hover:border-current"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <info.icon className={cn("w-4 h-4", info.color)} />
                  <div className="text-left">
                    <p className={cn("text-sm font-medium", info.color)}>
                      {info.label}
                    </p>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 ml-auto", info.color)} />
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar mudança de status</DialogTitle>
            <DialogDescription>
              Você está mudando o status de &ldquo;{demandaTitulo}&rdquo; de{" "}
              <span className="font-medium">{currentInfo.label}</span> para{" "}
              <span className="font-medium">
                {selectedStatus && statusConfig[selectedStatus].label}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="observation">
                Observação <span className="text-zinc-500">(opcional)</span>
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
export function StatusFlow({ currentStatus }: { currentStatus: DemandaStatus }) {
  const allStatuses: DemandaStatus[] = [
    "analisar",
    "elaborando",
    "protocolar",
    "protocolado",
  ];

  const currentIndex = allStatuses.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-2">
      {allStatuses.map((status, index) => {
        const info = statusConfig[status];
        const isActive = index <= currentIndex;
        const isCurrent = status === currentStatus;

        return (
          <div key={status} className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                isActive
                  ? cn(info.bgColor, info.color, "border-current")
                  : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400",
                isCurrent && "ring-4 ring-emerald-500/20"
              )}
            >
              <info.icon className="w-4 h-4" />
            </motion.div>
            {index < allStatuses.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 transition-all",
                  isActive
                    ? "bg-emerald-500"
                    : "bg-zinc-200 dark:bg-zinc-700"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
