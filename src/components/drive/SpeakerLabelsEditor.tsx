"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Users,
  Loader2,
  Check,
  Pencil,
  RefreshCw,
  Shield,
  Gavel,
  Scale,
  User,
  Eye,
  Microscope,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc/client";

// ---- Types ----

interface SpeakerLabelData {
  id: number;
  speakerKey: string;
  label: string;
  role: string | null;
  confidence: number | null;
  isManual: boolean;
}

interface SpeakerLabelsEditorProps {
  fileDbId: number;
  assistidoId: number;
}

// ---- Role Config ----

const ROLE_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  defensor: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", icon: Shield, label: "Defensor" },
  juiz: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Gavel, label: "Juiz" },
  promotor: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: Scale, label: "Promotor" },
  assistido: { color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", icon: User, label: "Assistido" },
  testemunha: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: Eye, label: "Testemunha" },
  perito: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", icon: Microscope, label: "Perito" },
  outro: { color: "bg-zinc-50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400", icon: HelpCircle, label: "Outro" },
};

const ROLE_OPTIONS = [
  { value: "defensor", label: "Defensor" },
  { value: "assistido", label: "Assistido" },
  { value: "juiz", label: "Juiz" },
  { value: "promotor", label: "Promotor" },
  { value: "testemunha", label: "Testemunha" },
  { value: "perito", label: "Perito" },
  { value: "outro", label: "Outro" },
];

// ---- Confidence Display ----

function ConfidenceIndicator({ confidence }: { confidence: number | null }) {
  if (confidence === null || confidence === undefined) return null;
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80 ? "text-emerald-500" :
    pct >= 50 ? "text-amber-500" :
    "text-red-500";
  return (
    <span className={cn("text-[10px] font-mono", color)}>
      {pct}%
    </span>
  );
}

// ---- Main Component ----

export function SpeakerLabelsEditor({ fileDbId, assistidoId }: SpeakerLabelsEditorProps) {
  const utils = trpc.useUtils();

  // Fetch labels
  const { data: labels, isLoading } = trpc.speakerLabels.getByFile.useQuery(
    { fileId: fileDbId },
    { staleTime: 30_000 },
  );

  // Mutations
  const updateMutation = trpc.speakerLabels.update.useMutation({
    onSuccess: () => {
      utils.speakerLabels.getByFile.invalidate({ fileId: fileDbId });
    },
  });

  const triggerMutation = trpc.speakerLabels.triggerDiarization.useMutation({
    onSuccess: () => {
      // Poll for results after a few seconds
      setTimeout(() => {
        utils.speakerLabels.getByFile.invalidate({ fileId: fileDbId });
      }, 5000);
      setTimeout(() => {
        utils.speakerLabels.getByFile.invalidate({ fileId: fileDbId });
      }, 15000);
    },
  });

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editRole, setEditRole] = useState("");

  const startEdit = (item: SpeakerLabelData) => {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditRole(item.role || "outro");
  };

  const saveEdit = () => {
    if (!editingId || !editLabel.trim() || !editRole) return;
    updateMutation.mutate(
      { id: editingId, label: editLabel.trim(), role: editRole },
      { onSuccess: () => setEditingId(null) },
    );
  };

  const cancelEdit = () => setEditingId(null);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
        <span className="text-xs text-zinc-500">Carregando speakers...</span>
      </div>
    );
  }

  // No labels yet
  if (!labels || labels.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-zinc-500">Nenhum speaker identificado.</p>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs cursor-pointer"
          onClick={() => triggerMutation.mutate({ fileId: fileDbId, assistidoId })}
          disabled={triggerMutation.isPending}
        >
          {triggerMutation.isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Identificando...
            </>
          ) : (
            <>
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Identificar Speakers
            </>
          )}
        </Button>
        {triggerMutation.isSuccess && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400">
            Processando em background... Atualize em alguns segundos.
          </p>
        )}
      </div>
    );
  }

  // Display labels
  return (
    <div className="space-y-2">
      <TooltipProvider>
        {labels.map((item) => {
          const roleConfig = ROLE_CONFIG[item.role || "outro"] || ROLE_CONFIG.outro;
          const RoleIcon = roleConfig.icon;
          const isEditing = editingId === item.id;

          if (isEditing) {
            return (
              <div key={item.id} className="space-y-1.5 p-2 rounded-md bg-zinc-100 dark:bg-zinc-800/50">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400 font-mono shrink-0 w-16">
                    {item.speakerKey}
                  </span>
                </div>
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="h-7 text-xs"
                  placeholder="Nome ou papel"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button
                    variant="default"
                    size="sm"
                    className="h-6 text-[10px] flex-1 cursor-pointer"
                    onClick={saveEdit}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3 mr-1" />
                    )}
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] cursor-pointer"
                    onClick={cancelEdit}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="flex items-center gap-1.5 group"
            >
              <span className="text-[10px] text-zinc-400 font-mono shrink-0 w-12 truncate">
                {item.speakerKey.replace("Speaker ", "S")}
              </span>
              <Badge
                className={cn(
                  "text-[10px] flex items-center gap-1 py-0.5 px-1.5 font-normal",
                  roleConfig.color,
                )}
              >
                <RoleIcon className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{item.label}</span>
              </Badge>
              <ConfidenceIndicator confidence={item.confidence} />
              {item.isManual && (
                <Tooltip>
                  <TooltipTrigger>
                    <Pencil className="w-2.5 h-2.5 text-emerald-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Editado manualmente</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <button
                onClick={() => startEdit(item)}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-auto cursor-pointer"
                title="Editar"
              >
                <Pencil className="w-3 h-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
              </button>
            </div>
          );
        })}
      </TooltipProvider>

      {/* Re-run button */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-[10px] h-6 text-zinc-400 hover:text-zinc-600 cursor-pointer"
        onClick={() => triggerMutation.mutate({ fileId: fileDbId, assistidoId })}
        disabled={triggerMutation.isPending}
      >
        {triggerMutation.isPending ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <RefreshCw className="w-3 h-3 mr-1" />
        )}
        Re-identificar
      </Button>
    </div>
  );
}
