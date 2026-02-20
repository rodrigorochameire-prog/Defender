"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircleQuestion,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

// ==========================================
// PROPS
// ==========================================

interface ParecerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistidoId?: number | null;
  assistidoNome?: string;
  processoId?: number | null;
  processoNumero?: string;
  onSucesso?: () => void;
}

// ==========================================
// URGÊNCIA OPTIONS
// ==========================================

type Urgencia = "normal" | "urgente";

const URGENCIA_OPTIONS: { id: Urgencia; label: string; icon: typeof Clock; desc: string }[] = [
  { id: "normal", label: "Normal", icon: Clock, desc: "Sem pressa, responda quando puder" },
  { id: "urgente", label: "Urgente", icon: AlertTriangle, desc: "Preciso de resposta rapida" },
];

// ==========================================
// COMPONENT
// ==========================================

export function ParecerModal({
  open,
  onOpenChange,
  assistidoId,
  assistidoNome,
  processoId,
  processoNumero,
  onSucesso,
}: ParecerModalProps) {
  // Form state
  const [respondedorId, setRespondedorId] = useState<string>("");
  const [pergunta, setPergunta] = useState("");
  const [urgencia, setUrgencia] = useState<Urgencia>("normal");

  // Query: colegas disponíveis
  const { data: colegas, isLoading: loadingColegas } = trpc.parecer.colegas.useQuery(
    undefined,
    { enabled: open }
  );

  // Mutation
  const utils = trpc.useUtils();
  const solicitar = trpc.parecer.solicitar.useMutation({
    onSuccess: () => {
      const colegaNome = colegas?.find(c => c.id === parseInt(respondedorId))?.name || "colega";
      toast.success("Parecer solicitado!", {
        description: `Pedido enviado para ${colegaNome}.`,
        icon: <CheckCircle2 className="w-4 h-4 text-violet-500" />,
      });

      resetForm();
      onOpenChange(false);
      utils.parecer.meusPareceres.invalidate();
      onSucesso?.();
    },
    onError: (error) => {
      toast.error("Erro ao solicitar parecer", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setRespondedorId("");
    setPergunta("");
    setUrgencia("normal");
  };

  const handleSubmit = () => {
    if (!respondedorId) {
      toast.error("Selecione um colega para consultar");
      return;
    }
    if (!pergunta.trim()) {
      toast.error("Descreva sua pergunta");
      return;
    }

    solicitar.mutate({
      respondedorId: parseInt(respondedorId),
      pergunta: pergunta.trim(),
      urgencia,
      assistidoId: assistidoId || undefined,
      processoId: processoId || undefined,
    });
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      defensor: "Defensor(a)",
      servidor: "Servidor(a)",
      estagiario: "Estagiario(a)",
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      defensor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      servidor: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
      estagiario: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
    };
    return colors[role] || "bg-zinc-100 text-zinc-700";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <MessageCircleQuestion className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="text-lg">Pedir Parecer</span>
              <p className="text-xs font-normal text-zinc-500 mt-0.5">
                Consulte um colega sobre um caso sem transferir responsabilidade
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Colega a consultar */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Consultar colega <span className="text-rose-500">*</span>
            </Label>
            {loadingColegas ? (
              <div className="h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              </div>
            ) : (
              <Select value={respondedorId} onValueChange={setRespondedorId}>
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                  <SelectValue placeholder="Selecione um colega..." />
                </SelectTrigger>
                <SelectContent>
                  {colegas?.length === 0 ? (
                    <div className="p-4 text-center text-sm text-zinc-500">
                      Nenhum colega encontrado
                    </div>
                  ) : (
                    colegas?.map((colega) => (
                      <SelectItem key={colega.id} value={colega.id.toString()}>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[9px] bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-600 dark:to-zinc-700 font-semibold">
                              {getInitials(colega.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{colega.name}</span>
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 ml-auto", getRoleColor(colega.role))}>
                            {getRoleLabel(colega.role)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Contexto: Assistido e Processo (se fornecidos) */}
          {(assistidoNome || processoNumero) && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Contexto
              </Label>
              <div className="flex flex-wrap gap-2">
                {assistidoNome && (
                  <Badge variant="outline" className="text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                    Assistido: {assistidoNome}
                  </Badge>
                )}
                {processoNumero && (
                  <Badge variant="outline" className="text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 font-mono">
                    {processoNumero}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Urgência */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Urgencia
            </Label>
            <div className="flex gap-1.5">
              {URGENCIA_OPTIONS.map((opt) => {
                const UrgIcon = opt.icon;
                const isSelected = urgencia === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setUrgencia(opt.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border",
                      isSelected && opt.id === "normal"
                        ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400"
                        : isSelected && opt.id === "urgente"
                        ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400"
                        : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                    )}
                  >
                    <UrgIcon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pergunta */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Pergunta <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              placeholder="Descreva sua duvida ou questao..."
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              className="min-h-[120px] resize-none rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus:ring-violet-500/30"
            />
            <p className="text-[10px] text-zinc-400">
              Seja claro e objetivo. Inclua detalhes relevantes do caso para facilitar a resposta.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => { resetForm(); onOpenChange(false); }}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={solicitar.isPending || !respondedorId || !pergunta.trim()}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all"
          >
            {solicitar.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Solicitando...
              </>
            ) : (
              <>
                <MessageCircleQuestion className="w-4 h-4 mr-1.5" />
                Solicitar Parecer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
