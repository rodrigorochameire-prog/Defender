"use client";

import { useState, useEffect } from "react";
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
  FileEdit,
  Search,
  Scale,
  Phone,
  Clipboard,
  MessageCircle,
  Copy,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

// ─── Templates de instrução ───────────────────────────────────────
const INSTRUCAO_TEMPLATES = [
  { label: "Minuta", icon: FileEdit, text: "Elaborar minuta de {ato} para o processo {processo}." },
  { label: "Diligência", icon: Search, text: "Realizar diligência no processo {processo}: " },
  { label: "Análise", icon: Scale, text: "Analisar o processo {processo} e preparar resumo." },
  { label: "Protocolar", icon: Send, text: "Protocolar {ato} no processo {processo}." },
  { label: "Atendimento", icon: Phone, text: "Agendar atendimento com {assistido}." },
];

// ─── WhatsApp message generator ───────────────────────────────────
export function gerarMensagemWhatsApp(params: {
  destinatarioNome: string;
  processoNumero?: string;
  assistidoNome?: string;
  ato?: string;
  instrucoes: string;
}): string {
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const primeiroNome = params.destinatarioNome.split(" ")[0];

  let msg = `${saudacao}, ${primeiroNome}!`;

  if (params.processoNumero) {
    msg += `\n\nProcesso: *${params.processoNumero}*`;
  }
  if (params.assistidoNome) {
    msg += `\nAssistido: ${params.assistidoNome}`;
  }
  if (params.ato) {
    msg += `\nAto: ${params.ato}`;
  }

  msg += `\n\n${params.instrucoes}`;

  return msg;
}

// ─── Props do modal ───────────────────────────────────────────────
interface DelegacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistidoId?: number | null;
  assistidoNome?: string;
  processoId?: number | null;
  processoNumero?: string;
  demandaId?: number | null;
  demandaAto?: string;
  // Novos props
  destinatarioNome?: string;
  instrucaoSugerida?: string;
  showWhatsAppToggle?: boolean;
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
  destinatarioNome,
  instrucaoSugerida,
  showWhatsAppToggle = true,
  onDelegacaoSucesso,
}: DelegacaoModalProps) {
  const [destinatarioId, setDestinatarioId] = useState<string>("");
  const [instrucoes, setInstrucoes] = useState("");
  const [prazoSugerido, setPrazoSugerido] = useState("");
  const [prioridade, setPrioridade] = useState<"NORMAL" | "URGENTE" | "BAIXA">("NORMAL");
  const [enviarWhatsApp, setEnviarWhatsApp] = useState(false);
  const [whatsAppMsg, setWhatsAppMsg] = useState("");
  const [editandoWhatsApp, setEditandoWhatsApp] = useState(false);

  // Query para buscar membros da equipe
  const { data: membrosEquipe, isLoading: loadingMembros } = trpc.delegacao.membrosEquipe.useQuery(
    undefined,
    { enabled: open }
  );

  // Mutation para criar delegação
  const criarDelegacao = trpc.delegacao.criar.useMutation({
    onSuccess: () => {
      const nomeDest = membrosEquipe?.find(m => m.id === parseInt(destinatarioId))?.name;
      toast.success("Tarefa delegada com sucesso!", {
        description: `A delegação foi enviada para ${nomeDest}.`,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });

      // Limpar e fechar
      resetForm();
      onOpenChange(false);
      onDelegacaoSucesso?.();
    },
    onError: (error) => {
      toast.error("Erro ao delegar tarefa", {
        description: error.message,
      });
    },
  });

  // Mutation para enviar WhatsApp
  const sendWhatsApp = trpc.whatsappChat.sendMessage.useMutation({
    onSuccess: () => {
      toast.success("Mensagem WhatsApp enviada!", {
        icon: <MessageCircle className="w-4 h-4 text-emerald-500" />,
      });
    },
    onError: () => {
      // Fallback: copiar para clipboard
      navigator.clipboard.writeText(whatsAppMsg);
      toast.info("Não foi possível enviar via WhatsApp. Mensagem copiada!", {
        description: "Cole manualmente no WhatsApp.",
      });
    },
  });

  // Auto-select destinatário por nome quando membros carregarem
  useEffect(() => {
    if (destinatarioNome && membrosEquipe?.length && !destinatarioId) {
      const match = membrosEquipe.find(
        m => m.name.toLowerCase().includes(destinatarioNome.toLowerCase())
      );
      if (match) {
        setDestinatarioId(match.id.toString());
      }
    }
  }, [destinatarioNome, membrosEquipe, destinatarioId]);

  // Pre-fill instrução sugerida
  useEffect(() => {
    if (instrucaoSugerida && !instrucoes) {
      setInstrucoes(instrucaoSugerida);
    }
  }, [instrucaoSugerida]);

  // Atualizar preview WhatsApp quando contexto muda
  useEffect(() => {
    if (enviarWhatsApp && !editandoWhatsApp) {
      const nomeDest = membrosEquipe?.find(m => m.id === parseInt(destinatarioId))?.name || "Colega";
      setWhatsAppMsg(gerarMensagemWhatsApp({
        destinatarioNome: nomeDest,
        processoNumero: processoNumero || undefined,
        assistidoNome: assistidoNome || undefined,
        ato: demandaAto || undefined,
        instrucoes: instrucoes || "(instruções)",
      }));
    }
  }, [enviarWhatsApp, destinatarioId, instrucoes, processoNumero, assistidoNome, demandaAto, membrosEquipe, editandoWhatsApp]);

  const resetForm = () => {
    setDestinatarioId("");
    setInstrucoes("");
    setPrazoSugerido("");
    setPrioridade("NORMAL");
    setEnviarWhatsApp(false);
    setWhatsAppMsg("");
    setEditandoWhatsApp(false);
  };

  const handleSubmit = async () => {
    if (!destinatarioId) {
      toast.error("Selecione um destinatário");
      return;
    }

    if (!instrucoes.trim()) {
      toast.error("Adicione instruções para a delegação");
      return;
    }

    // Criar delegação
    criarDelegacao.mutate({
      demandaId: demandaId || undefined,
      destinatarioId: parseInt(destinatarioId),
      instrucoes: instrucoes.trim(),
      prazoSugerido: prazoSugerido || undefined,
      prioridade,
      assistidoId: assistidoId || undefined,
      processoId: processoId || undefined,
    });

    // Enviar WhatsApp se ativado
    if (enviarWhatsApp && whatsAppMsg.trim()) {
      // Tentar copiar a mensagem para clipboard como fallback garantido
      try {
        await navigator.clipboard.writeText(whatsAppMsg);
      } catch {}

      // O envio via Evolution API pode ser implementado aqui futuramente
      // Por agora, a mensagem é copiada para o clipboard
      toast.success("Mensagem copiada para o clipboard!", {
        description: "Cole no WhatsApp para enviar.",
        icon: <MessageCircle className="w-4 h-4 text-emerald-500" />,
      });
    }
  };

  const handleTemplateClick = (template: typeof INSTRUCAO_TEMPLATES[0]) => {
    let text = template.text;
    // Substituir placeholders pelo contexto disponível
    text = text.replace("{processo}", processoNumero || "___");
    text = text.replace("{assistido}", assistidoNome || "___");
    text = text.replace("{ato}", demandaAto || "___");
    setInstrucoes(text);
  };

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(whatsAppMsg);
      toast.success("Mensagem copiada!");
    } catch {
      toast.error("Erro ao copiar");
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
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
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

          {/* Templates de instrução */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Instruções <span className="text-rose-500">*</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {INSTRUCAO_TEMPLATES.map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => handleTemplateClick(tpl)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
                      "border border-zinc-200 dark:border-zinc-700",
                      "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
                      "hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700",
                      "dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400",
                      "transition-all cursor-pointer"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {tpl.label}
                  </button>
                );
              })}
            </div>
            <Textarea
              id="instrucoes"
              placeholder="Descreva detalhadamente o que precisa ser feito..."
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
              className="min-h-[100px] resize-none rounded-xl"
            />
            <p className="text-[10px] text-zinc-400">
              Clique num template acima ou escreva instruções personalizadas.
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

          {/* WhatsApp toggle + preview */}
          {showWhatsAppToggle && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setEnviarWhatsApp(!enviarWhatsApp)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                  enviarWhatsApp
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
                    : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50 hover:border-zinc-300"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  enviarWhatsApp
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
                )}>
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="text-left flex-1">
                  <p className={cn(
                    "text-sm font-medium",
                    enviarWhatsApp ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-400"
                  )}>
                    Enviar via WhatsApp
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    Gera mensagem pronta com saudação + processo + instruções
                  </p>
                </div>
                <div className={cn(
                  "w-10 h-5 rounded-full relative transition-colors",
                  enviarWhatsApp ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
                )}>
                  <div className={cn(
                    "w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-sm",
                    enviarWhatsApp ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </div>
              </button>

              {enviarWhatsApp && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Preview da Mensagem
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditandoWhatsApp(!editandoWhatsApp)}
                        className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-colors"
                        title={editandoWhatsApp ? "Bloquear edição" : "Editar mensagem"}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyWhatsApp}
                        className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-colors"
                        title="Copiar mensagem"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <Textarea
                    value={whatsAppMsg}
                    onChange={(e) => setWhatsAppMsg(e.target.value)}
                    readOnly={!editandoWhatsApp}
                    className={cn(
                      "min-h-[80px] text-xs resize-none rounded-lg bg-white dark:bg-zinc-900 border-emerald-200 dark:border-emerald-800",
                      !editandoWhatsApp && "cursor-default opacity-80"
                    )}
                  />
                </div>
              )}
            </div>
          )}
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
                {enviarWhatsApp ? "Delegar + WhatsApp" : "Delegar Tarefa"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
