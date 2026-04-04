"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Users,
  Send,
  Calendar,
  Clock,
  Loader2,
  CheckCircle2,
  FileEdit,
  Search,
  Scale,
  Phone,
  MessageCircle,
  Copy,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { gerarMensagemWhatsApp } from "./delegacao-modal";

// Templates (mesmos do modal individual)
const INSTRUCAO_TEMPLATES = [
  { label: "Minuta", icon: FileEdit, text: "Elaborar minutas para os processos delegados." },
  { label: "Diligência", icon: Search, text: "Realizar diligências nos processos delegados." },
  { label: "Análise", icon: Scale, text: "Analisar os processos e preparar resumos." },
  { label: "Protocolar", icon: Send, text: "Protocolar peças nos processos delegados." },
  { label: "Atendimento", icon: Phone, text: "Agendar atendimentos com os assistidos." },
];

interface DemandaResumo {
  id: number;
  ato?: string;
  processoNumero?: string;
  assistidoNome?: string;
}

interface DelegacaoBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandas: DemandaResumo[];
  onSuccess?: () => void;
}

export function DelegacaoBatchModal({
  open,
  onOpenChange,
  demandas,
  onSuccess,
}: DelegacaoBatchModalProps) {
  const [destinatarioId, setDestinatarioId] = useState<string>("");
  const [instrucoes, setInstrucoes] = useState("");
  const [prazoSugerido, setPrazoSugerido] = useState("");
  const [prioridade, setPrioridade] = useState<"NORMAL" | "URGENTE" | "BAIXA">("NORMAL");
  const [enviarWhatsApp, setEnviarWhatsApp] = useState(false);
  const [whatsAppMsg, setWhatsAppMsg] = useState("");
  const [editandoWhatsApp, setEditandoWhatsApp] = useState(false);

  const { data: membrosEquipe, isLoading: loadingMembros } = trpc.delegacao.membrosEquipe.useQuery(
    undefined,
    { enabled: open }
  );

  const criarEmLote = trpc.delegacao.criarEmLote.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} demanda(s) delegadas com sucesso!`, {
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Erro ao delegar em lote", { description: error.message });
    },
  });

  // Gerar preview WhatsApp
  useEffect(() => {
    if (enviarWhatsApp && !editandoWhatsApp) {
      const nomeDest = membrosEquipe?.find(m => m.id === parseInt(destinatarioId))?.name || "Colega";
      const hora = new Date().getHours();
      const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
      const primeiroNome = nomeDest.split(" ")[0];

      let msg = `${saudacao}, ${primeiroNome}!\n\nSegue(m) ${demandas.length} demanda(s) para você:\n`;

      demandas.slice(0, 5).forEach((d, i) => {
        msg += `\n${i + 1}. `;
        if (d.processoNumero) msg += `*${d.processoNumero}*`;
        if (d.assistidoNome) msg += ` - ${d.assistidoNome}`;
        if (d.ato) msg += ` (${d.ato})`;
      });

      if (demandas.length > 5) {
        msg += `\n... e mais ${demandas.length - 5} demanda(s)`;
      }

      if (instrucoes) {
        msg += `\n\n${instrucoes}`;
      }

      setWhatsAppMsg(msg);
    }
  }, [enviarWhatsApp, destinatarioId, instrucoes, demandas, membrosEquipe, editandoWhatsApp]);

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

    criarEmLote.mutate({
      demandaIds: demandas.map(d => d.id),
      destinatarioId: parseInt(destinatarioId),
      instrucoes: instrucoes.trim(),
      prazoSugerido: prazoSugerido || undefined,
      prioridade,
    });

    // Copiar WhatsApp se ativado
    if (enviarWhatsApp && whatsAppMsg.trim()) {
      try {
        await navigator.clipboard.writeText(whatsAppMsg);
        toast.success("Mensagem copiada para o clipboard!", {
          icon: <MessageCircle className="w-4 h-4 text-emerald-500" />,
        });
      } catch {}
    }
  };

  const handleTemplateClick = (tpl: typeof INSTRUCAO_TEMPLATES[0]) => {
    setInstrucoes(tpl.text);
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
    const labels: Record<string, string> = { servidor: "Servidor(a)", estagiario: "Estagiário(a)" };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      servidor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      estagiario: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    };
    return colors[role] || "bg-neutral-100 text-neutral-700";
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const MAX_VISIBLE = 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Users className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="text-lg">Delegar em Lote</span>
              <p className="text-xs font-normal text-neutral-500 mt-0.5">
                {demandas.length} demanda(s) selecionada(s)
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Lista resumida de demandas */}
          <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800 space-y-1.5">
            <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              Demandas selecionadas ({demandas.length})
            </p>
            {demandas.slice(0, MAX_VISIBLE).map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                <span className="truncate">
                  {d.ato && <span className="font-medium">{d.ato}</span>}
                  {d.processoNumero && <span className="font-mono text-[10px] ml-1.5 text-neutral-400">{d.processoNumero}</span>}
                  {d.assistidoNome && <span className="text-neutral-400 ml-1.5">({d.assistidoNome})</span>}
                </span>
              </div>
            ))}
            {demandas.length > MAX_VISIBLE && (
              <p className="text-[10px] text-violet-500 font-medium pl-3.5">
                ... e mais {demandas.length - MAX_VISIBLE} demanda(s)
              </p>
            )}
          </div>

          {/* Destinatário */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Delegar todas para <span className="text-rose-500">*</span>
            </Label>
            {loadingMembros ? (
              <div className="h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
              </div>
            ) : (
              <Select value={destinatarioId} onValueChange={setDestinatarioId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecione um membro da equipe..." />
                </SelectTrigger>
                <SelectContent>
                  {membrosEquipe?.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-600 dark:to-neutral-700 font-semibold">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.name}</span>
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 ml-auto", getRoleColor(member.role))}>
                          {getRoleLabel(member.role)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Templates + Instruções */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
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
                      "border border-neutral-200 dark:border-neutral-700",
                      "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400",
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
              placeholder="Instruções que serão aplicadas a todas as demandas..."
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
              className="min-h-[80px] resize-none rounded-xl"
            />
          </div>

          {/* Prazo e Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                Prazo Sugerido
              </Label>
              <Input
                type="date"
                value={prazoSugerido}
                onChange={(e) => setPrazoSugerido(e.target.value)}
                className="h-10 rounded-xl"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                Prioridade
              </Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as typeof prioridade)}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAIXA">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-neutral-400" />
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

          {/* WhatsApp toggle */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setEnviarWhatsApp(!enviarWhatsApp)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                enviarWhatsApp
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
                  : "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50 hover:border-neutral-300"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                enviarWhatsApp ? "bg-emerald-500 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500"
              )}>
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="text-left flex-1">
                <p className={cn("text-sm font-medium", enviarWhatsApp ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-600 dark:text-neutral-400")}>
                  Enviar via WhatsApp
                </p>
                <p className="text-[10px] text-neutral-400">Gera lista formatada das demandas</p>
              </div>
              <div className={cn("w-10 h-5 rounded-full relative transition-colors", enviarWhatsApp ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600")}>
                <div className={cn("w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-sm", enviarWhatsApp ? "translate-x-5" : "translate-x-0.5")} />
              </div>
            </button>

            {enviarWhatsApp && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Preview</p>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setEditandoWhatsApp(!editandoWhatsApp)} className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={handleCopyWhatsApp} className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <Textarea
                  value={whatsAppMsg}
                  onChange={(e) => setWhatsAppMsg(e.target.value)}
                  readOnly={!editandoWhatsApp}
                  className={cn("min-h-[100px] text-xs resize-none rounded-lg bg-white dark:bg-neutral-900", !editandoWhatsApp && "cursor-default opacity-80")}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={criarEmLote.isPending || !destinatarioId || !instrucoes.trim()}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/20"
          >
            {criarEmLote.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Delegando {demandas.length}...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1.5" />
                Delegar {demandas.length} Demanda(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
