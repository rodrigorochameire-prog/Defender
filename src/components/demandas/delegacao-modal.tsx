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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Tipos de membros da equipe
interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: "servidor" | "estagiario";
  funcao?: string;
  supervisorId?: number | null;
}

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
  onDelegacaoSucesso?: (data: DelegacaoData) => void;
}

// Dados da delegação
export interface DelegacaoData {
  destinatarioId: number;
  destinatarioNome: string;
  instrucoes: string;
  prazoSugerido?: string;
  prioridade: "NORMAL" | "URGENTE" | "BAIXA";
  assistidoId?: number | null;
  processoId?: number | null;
  demandaId?: number | null;
}

// Mock de membros da equipe (será substituído por query real)
const MOCK_TEAM_MEMBERS: TeamMember[] = [
  { id: 3, name: "Amanda", email: "amanda@defender.app", role: "servidor", funcao: "servidor_administrativo" },
  { id: 4, name: "Emilly", email: "emilly@defender.app", role: "estagiario", funcao: "estagiario_direito", supervisorId: 1 },
  { id: 5, name: "Taíssa", email: "taissa@defender.app", role: "estagiario", funcao: "estagiario_direito", supervisorId: 2 },
];

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!destinatarioId) {
      toast.error("Selecione um destinatário");
      return;
    }

    if (!instrucoes.trim()) {
      toast.error("Adicione instruções para a delegação");
      return;
    }

    setIsSubmitting(true);

    try {
      const destinatario = MOCK_TEAM_MEMBERS.find(m => m.id === parseInt(destinatarioId));
      
      const delegacaoData: DelegacaoData = {
        destinatarioId: parseInt(destinatarioId),
        destinatarioNome: destinatario?.name || "",
        instrucoes: instrucoes.trim(),
        prazoSugerido: prazoSugerido || undefined,
        prioridade,
        assistidoId,
        processoId,
        demandaId,
      };

      // TODO: Chamar API real aqui
      // await trpc.delegacao.criar.mutate(delegacaoData);

      toast.success(`Tarefa delegada para ${destinatario?.name}!`, {
        description: "A delegação foi registrada com sucesso.",
      });

      onDelegacaoSucesso?.(delegacaoData);
      
      // Limpar e fechar
      setDestinatarioId("");
      setInstrucoes("");
      setPrazoSugerido("");
      setPrioridade("NORMAL");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao delegar tarefa");
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            Delegar Tarefa
          </DialogTitle>
          <DialogDescription>
            Delegue uma atividade para um membro da sua equipe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Contexto da delegação */}
          {(assistidoNome || processoNumero || demandaAto) && (
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-1">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Contexto</p>
              {assistidoNome && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-700 dark:text-zinc-300">{assistidoNome}</span>
                </div>
              )}
              {processoNumero && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-700 dark:text-zinc-300 font-mono text-xs">{processoNumero}</span>
                </div>
              )}
              {demandaAto && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-700 dark:text-zinc-300">{demandaAto}</span>
                </div>
              )}
            </div>
          )}

          {/* Seletor de destinatário */}
          <div className="space-y-2">
            <Label htmlFor="destinatario" className="text-xs font-medium">
              Delegar para <span className="text-rose-500">*</span>
            </Label>
            <Select value={destinatarioId} onValueChange={setDestinatarioId}>
              <SelectTrigger id="destinatario" className="h-10">
                <SelectValue placeholder="Selecione um membro da equipe..." />
              </SelectTrigger>
              <SelectContent>
                {MOCK_TEAM_MEMBERS.map((member) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-zinc-200 dark:bg-zinc-700">
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", getRoleColor(member.role))}>
                        {getRoleLabel(member.role)}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Instruções */}
          <div className="space-y-2">
            <Label htmlFor="instrucoes" className="text-xs font-medium">
              Instruções <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="instrucoes"
              placeholder="Descreva o que precisa ser feito..."
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Prazo e Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prazo" className="text-xs font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Prazo Sugerido
              </Label>
              <Input
                id="prazo"
                type="date"
                value={prazoSugerido}
                onChange={(e) => setPrazoSugerido(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prioridade" className="text-xs font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Prioridade
              </Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as typeof prioridade)}>
                <SelectTrigger id="prioridade" className="h-9">
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
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Urgente
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !destinatarioId || !instrucoes.trim()}
            className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white"
          >
            {isSubmitting ? (
              <>Delegando...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1.5" />
                Delegar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
