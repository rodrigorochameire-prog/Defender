"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  FileEdit,
  UserCheck,
  Search,
  BookOpen,
  MoreHorizontal,
  Send,
  Calendar,
  Clock,
  Loader2,
  CheckCircle2,
  User,
  ChevronDown,
  Briefcase,
  ChevronsUpDown,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

// ==========================================
// TIPOS DE PEDIDO
// ==========================================
const TIPOS_PEDIDO_UI = [
  { id: "minuta" as const, label: "Minuta", icon: FileEdit, desc: "Elaboracao de peca processual", color: "emerald" },
  { id: "atendimento" as const, label: "Atendimento", icon: UserCheck, desc: "Atender um assistido", color: "blue" },
  { id: "diligencia" as const, label: "Diligencia", icon: Search, desc: "Buscar info ou documento", color: "amber" },
  { id: "analise" as const, label: "Analise", icon: BookOpen, desc: "Analisar caso ou documento", color: "violet" },
  { id: "outro" as const, label: "Outro", icon: MoreHorizontal, desc: "Atividade diversa", color: "zinc" },
];

type TipoPedido = typeof TIPOS_PEDIDO_UI[number]["id"];

// Placeholders contextuais por tipo
const PLACEHOLDERS: Record<TipoPedido, string> = {
  minuta: "Descreva a peca a ser elaborada (ex: resposta a acusacao, alegacoes finais, HC...)",
  atendimento: "Descreva o atendimento a realizar (ex: orientar sobre medida protetiva, pegar documentos...)",
  diligencia: "Descreva o que precisa ser buscado ou verificado...",
  analise: "Descreva o que precisa ser analisado (ex: verificar contraditoriedade, analisar provas...)",
  outro: "Descreva a atividade a ser realizada...",
};

const ORIENTACOES_PLACEHOLDER: Record<TipoPedido, string> = {
  minuta: "Ex: usar modelo X do Drive, ver audiencia de 15/01, fundamentar no art. 386...",
  atendimento: "Ex: verificar se tem medida protetiva vigente, orientar sobre retratacao...",
  diligencia: "Ex: buscar no cartorio da 2a vara, solicitar certidao de antecedentes...",
  analise: "Ex: comparar com depoimento da vitima, verificar cadeia de custodia...",
  outro: "Informacoes adicionais ou referencias...",
};

// Props do modal
interface PedidoTrabalhoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Contexto pre-preenchido (opcional)
  assistidoId?: number | null;
  assistidoNome?: string;
  processoId?: number | null;
  processoNumero?: string;
  demandaId?: number | null;
  tipoInicial?: TipoPedido;
  onSucesso?: () => void;
}

export function PedidoTrabalhoModal({
  open,
  onOpenChange,
  assistidoId: initialAssistidoId,
  assistidoNome: initialAssistidoNome,
  processoId: initialProcessoId,
  processoNumero: initialProcessoNumero,
  demandaId,
  tipoInicial,
  onSucesso,
}: PedidoTrabalhoModalProps) {
  // Form state
  const [tipo, setTipo] = useState<TipoPedido>(tipoInicial || "minuta");
  const [destinatarioId, setDestinatarioId] = useState<string>("");
  const [instrucoes, setInstrucoes] = useState("");
  const [orientacoes, setOrientacoes] = useState("");
  const [prazoSugerido, setPrazoSugerido] = useState("");
  const [prioridade, setPrioridade] = useState<"NORMAL" | "URGENTE" | "BAIXA">("NORMAL");
  const [showOrientacoes, setShowOrientacoes] = useState(false);

  // Assistido state
  const [assistidoId, setAssistidoId] = useState<number | null>(initialAssistidoId || null);
  const [assistidoNome, setAssistidoNome] = useState(initialAssistidoNome || "");
  const [assistidoOpen, setAssistidoOpen] = useState(false);
  const [assistidoSearch, setAssistidoSearch] = useState("");

  // Processo state
  const [processoId, setProcessoId] = useState<number | null>(initialProcessoId || null);
  const [processoNumero, setProcessoNumero] = useState(initialProcessoNumero || "");

  // Queries
  const { data: membrosEquipe, isLoading: loadingMembros } = trpc.delegacao.membrosEquipe.useQuery(
    undefined,
    { enabled: open }
  );

  const { data: assistidos = [] } = trpc.assistidos.list.useQuery(
    undefined,
    { enabled: open }
  );

  const { data: processos = [] } = trpc.processos.list.useQuery(
    undefined,
    { enabled: open }
  );

  // Processos filtrados pelo assistido selecionado
  const processosDoAssistido = useMemo(() => {
    if (!assistidoId) return [];
    return processos.filter((p: any) => p.assistidoId === assistidoId);
  }, [assistidoId, processos]);

  // Assistidos filtrados pela busca
  const assistidosFiltrados = useMemo(() => {
    if (!assistidoSearch.trim()) return assistidos.slice(0, 20);
    const search = assistidoSearch.toLowerCase();
    return assistidos
      .filter((a: any) =>
        a.nome?.toLowerCase().includes(search) ||
        a.cpf?.includes(search) ||
        a.vulgo?.toLowerCase().includes(search)
      )
      .slice(0, 20);
  }, [assistidos, assistidoSearch]);

  // Mutation
  const utils = trpc.useUtils();
  const criarPedido = trpc.delegacao.criar.useMutation({
    onSuccess: () => {
      const tipoLabel = TIPOS_PEDIDO_UI.find(t => t.id === tipo)?.label || "Pedido";
      toast.success(`${tipoLabel} enviado com sucesso!`, {
        description: `Pedido enviado para ${membrosEquipe?.find(m => m.id === parseInt(destinatarioId))?.name}.`,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });

      // Reset e fechar
      resetForm();
      onOpenChange(false);
      utils.delegacao.delegacoesEnviadas.invalidate();
      onSucesso?.();
    },
    onError: (error) => {
      toast.error("Erro ao enviar pedido", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setTipo(tipoInicial || "minuta");
    setDestinatarioId("");
    setInstrucoes("");
    setOrientacoes("");
    setPrazoSugerido("");
    setPrioridade("NORMAL");
    setShowOrientacoes(false);
    if (!initialAssistidoId) {
      setAssistidoId(null);
      setAssistidoNome("");
    }
    if (!initialProcessoId) {
      setProcessoId(null);
      setProcessoNumero("");
    }
  };

  const handleSubmit = () => {
    if (!destinatarioId) {
      toast.error("Selecione um destinatario");
      return;
    }
    if (!instrucoes.trim()) {
      toast.error("Descreva o pedido");
      return;
    }

    criarPedido.mutate({
      tipo,
      demandaId: demandaId || undefined,
      destinatarioId: parseInt(destinatarioId),
      instrucoes: instrucoes.trim(),
      orientacoes: orientacoes.trim() || undefined,
      prazoSugerido: prazoSugerido || undefined,
      prioridade,
      assistidoId: assistidoId || undefined,
      processoId: processoId || undefined,
    });
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      servidor: "Servidor(a)",
      estagiario: "Estagiario(a)",
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
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

  const selectedTipo = TIPOS_PEDIDO_UI.find(t => t.id === tipo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Send className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="text-lg">Pedido de Trabalho</span>
              <p className="text-xs font-normal text-zinc-500 mt-0.5">
                Solicite uma atividade para um membro da equipe
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo de pedido */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Tipo de pedido
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_PEDIDO_UI.map((t) => {
                const TipoIcon = t.icon;
                const isSelected = tipo === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTipo(t.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border",
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                        : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                    )}
                  >
                    <TipoIcon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assistido (busca) */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Assistido <span className="text-rose-500">*</span>
            </Label>
            <Popover open={assistidoOpen} onOpenChange={setAssistidoOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 font-normal text-sm"
                >
                  {assistidoNome || "Buscar assistido por nome ou CPF..."}
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar por nome, CPF ou vulgo..."
                    value={assistidoSearch}
                    onValueChange={setAssistidoSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum assistido encontrado.</CommandEmpty>
                    <CommandGroup>
                      {assistidosFiltrados.map((a: any) => (
                        <CommandItem
                          key={a.id}
                          value={a.id.toString()}
                          onSelect={() => {
                            setAssistidoId(a.id);
                            setAssistidoNome(a.nome);
                            setAssistidoOpen(false);
                            setAssistidoSearch("");
                            // Reset processo se mudou de assistido
                            setProcessoId(null);
                            setProcessoNumero("");
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                              <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-medium truncate">{a.nome}</span>
                              {a.cpf && (
                                <span className="text-[10px] text-zinc-400 ml-2 font-mono">{a.cpf}</span>
                              )}
                            </div>
                            {a.reuPreso && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-50 text-red-600 border-red-200">
                                Preso
                              </Badge>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Processo (select dos processos do assistido) */}
          {assistidoId && processosDoAssistido.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Processo vinculado
              </Label>
              <Select
                value={processoId?.toString() || ""}
                onValueChange={(v) => {
                  const proc = processosDoAssistido.find((p: any) => p.id.toString() === v);
                  setProcessoId(proc?.id || null);
                  setProcessoNumero(proc?.numeroAutos || "");
                }}
              >
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                  <SelectValue placeholder="Selecionar processo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {processosDoAssistido.map((proc: any) => (
                    <SelectItem key={proc.id} value={proc.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="font-mono text-xs">{proc.numero}</span>
                        {proc.vara && (
                          <span className="text-[10px] text-zinc-400 truncate">{proc.vara}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Destinatario */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Para quem <span className="text-rose-500">*</span>
            </Label>
            {loadingMembros ? (
              <div className="h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              </div>
            ) : (
              <Select value={destinatarioId} onValueChange={setDestinatarioId}>
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                  <SelectValue placeholder="Selecione um membro da equipe..." />
                </SelectTrigger>
                <SelectContent>
                  {membrosEquipe?.length === 0 ? (
                    <div className="p-4 text-center text-sm text-zinc-500">
                      Nenhum membro encontrado
                    </div>
                  ) : (
                    membrosEquipe?.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[9px] bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-600 dark:to-zinc-700 font-semibold">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{member.name}</span>
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

          {/* Instrucoes */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              {tipo === "minuta" ? "Peca a elaborar" : "Descricao do pedido"} <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              placeholder={PLACEHOLDERS[tipo]}
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
              className="min-h-[100px] resize-none rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus:ring-emerald-500/30"
            />
          </div>

          {/* Orientacoes (colapsavel) */}
          <div>
            <button
              onClick={() => setShowOrientacoes(!showOrientacoes)}
              className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors uppercase tracking-wider"
            >
              <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", showOrientacoes && "rotate-180")} />
              Orientacoes e referencias
            </button>
            <div className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              showOrientacoes ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"
            )}>
              <Textarea
                placeholder={ORIENTACOES_PLACEHOLDER[tipo]}
                value={orientacoes}
                onChange={(e) => setOrientacoes(e.target.value)}
                className="min-h-[80px] resize-none rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs"
              />
            </div>
          </div>

          {/* Prazo e Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-zinc-400" />
                Prazo
              </Label>
              <Input
                type="date"
                value={prazoSugerido}
                onChange={(e) => setPrazoSugerido(e.target.value)}
                className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-zinc-400" />
                Prioridade
              </Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as typeof prioridade)}>
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
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
            onClick={() => { resetForm(); onOpenChange(false); }}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={criarPedido.isPending || !destinatarioId || !instrucoes.trim()}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
          >
            {criarPedido.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1.5" />
                Enviar {selectedTipo?.label || "Pedido"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
