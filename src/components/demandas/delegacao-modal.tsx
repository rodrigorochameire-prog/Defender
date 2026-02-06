"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  UserPlus,
  Send,
  Calendar,
  Clock,
  AlertCircle,
  User,
  Briefcase,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

// Props do modal
interface DelegacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistidoId?: number | null;
  assistidoNome?: string;
  processoId?: number | null;
  processoNumero?: string;
  demandaId?: number | null;
  demandaAto?: string;
  onDelegacaoSucesso?: () => void;
}

export function DelegacaoModal({
  open,
  onOpenChange,
  assistidoId,
  assistidoNome,
  processoId,
  processoNumero,
  demandaId,
  demandaAto,
  onDelegacaoSucesso,
}: DelegacaoModalProps) {
  const [destinatarioId, setDestinatarioId] = useState<string>("");
  const [instrucoes, setInstrucoes] = useState("");
  const [prazoSugerido, setPrazoSugerido] = useState("");
  const [prioridade, setPrioridade] = useState<"NORMAL" | "URGENTE" | "BAIXA">("NORMAL");

  // Query para buscar membros da equipe
  const { data: membrosEquipe, isLoading: loadingMembros } = trpc.delegacao.membrosEquipe.useQuery(
    undefined,
    { enabled: open }
  );

  // Mutation para criar delegação
  const criarDelegacao = trpc.delegacao.criar.useMutation({
    onSuccess: () => {
      toast.success("Tarefa delegada com sucesso!", {
        description: `A delegação foi enviada para ${membrosEquipe?.find(m => m.id === parseInt(destinatarioId))?.name}.`,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });

      // Limpar e fechar
      setDestinatarioId("");
      setInstrucoes("");
      setPrazoSugerido("");
      setPrioridade("NORMAL");
      onOpenChange(false);
      onDelegacaoSucesso?.();
    },
    onError: (error) => {
      toast.error("Erro ao delegar tarefa", {
        description: error.message,
      });
    },
  });

  const handleSubmit = async () => {
    if (!destinatarioId) {
      toast.error("Selecione um destinatário");
      return;
    }

    if (!instrucoes.trim()) {
      toast.error("Adicione instruções para a delegação");
      return;
    }

    criarDelegacao.mutate({
      demandaId: demandaId || undefined,
      destinatarioId: parseInt(destinatarioId),
      instrucoes: instrucoes.trim(),
      prazoSugerido: prazoSugerido || undefined,
      prioridade,
      assistidoId: assistidoId || undefined,
      processoId: processoId || undefined,
    });
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      servidor: "Servidor(a)",
      estagiario: "Estagiário(a)",
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      servidor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      estagiario: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <UserPlus className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="text-lg">Delegar Tarefa</span>
              <p className="text-xs font-normal text-zinc-500 mt-0.5">
                Delegue uma atividade para um membro da sua equipe
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Contexto da delegação */}
          {(assistidoNome || processoNumero || demandaAto) && (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Contexto</p>
              {assistidoNome && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">{assistidoNome}</span>
                </div>
              )}
              {processoNumero && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <Briefcase className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="text-zinc-700 dark:text-zinc-300 font-mono text-xs">{processoNumero}</span>
                </div>
              )}
              {demandaAto && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-zinc-700 dark:text-zinc-300">{demandaAto}</span>
                </div>
              )}
            </div>
          )}

          {/* Seletor de destinatário */}
          <div className="space-y-2">
            <Label htmlFor="destinatario" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Delegar para <span className="text-rose-500">*</span>
            </Label>
            {loadingMembros ? (
              <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              </div>
            ) : (
              <Select value={destinatarioId} onValueChange={setDestinatarioId}>
                <SelectTrigger id="destinatario" className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecione um membro da equipe..." />
                </SelectTrigger>
                <SelectContent>
                  {membrosEquipe?.length === 0 ? (
                    <div className="p-4 text-center text-sm text-zinc-500">
                      Nenhum membro da equipe encontrado
                    </div>
                  ) : (
                    membrosEquipe?.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-600 dark:to-zinc-700 font-semibold">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{member.name}</span>
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 ml-auto", getRoleColor(member.role))}>
                            {getRoleLabel(member.role)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Instruções */}
          <div className="space-y-2">
            <Label htmlFor="instrucoes" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Instruções <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="instrucoes"
              placeholder="Descreva detalhadamente o que precisa ser feito..."
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
              className="min-h-[120px] resize-none rounded-xl"
            />
            <p className="text-[10px] text-zinc-400">
              Seja claro e específico para facilitar a execução da tarefa.
            </p>
          </div>

          {/* Prazo e Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prazo" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Prazo Sugerido
              </Label>
              <Input
                id="prazo"
                type="date"
                value={prazoSugerido}
                onChange={(e) => setPrazoSugerido(e.target.value)}
                className="h-10 rounded-xl"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prioridade" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Prioridade
              </Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as typeof prioridade)}>
                <SelectTrigger id="prioridade" className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAIXA">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-400" />
                      Baixa
                    </span>
                  </SelectItem>
                  <SelectItem value="NORMAL">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Normal
                    </span>
                  </SelectItem>
                  <SelectItem value="URGENTE">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      Urgente
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={criarDelegacao.isPending || !destinatarioId || !instrucoes.trim()}
            className="rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 transition-all"
          >
            {criarDelegacao.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Delegando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1.5" />
                Delegar Tarefa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
