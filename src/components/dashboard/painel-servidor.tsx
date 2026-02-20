"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Briefcase,
  ClipboardList,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  FileEdit,
  UserCheck,
  Search,
  BookOpen,
  User,
  ChevronsUpDown,
  Check,
  Plus,
  MessageSquare,
  Calendar,
  ArrowRight,
  X,
  Lock,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ============================================
// TIPOS
// ============================================

interface PainelServidorProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

// ============================================
// CONSTANTES
// ============================================

const TIPO_ICONS: Record<string, any> = {
  minuta: FileEdit,
  atendimento: UserCheck,
  diligencia: Search,
  analise: BookOpen,
  outro: Send,
  delegacao_generica: Send,
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pendente: {
    label: "Pendente",
    color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  },
  aceita: {
    label: "Aceita",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  },
  em_andamento: {
    label: "Em andamento",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  },
  aguardando_revisao: {
    label: "Aguard. revisao",
    color: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
  },
  concluida: {
    label: "Concluida",
    color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  },
  revisado: {
    label: "Revisado",
    color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  },
  protocolado: {
    label: "Protocolado",
    color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  },
  devolvida: {
    label: "Devolvida",
    color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400",
  },
};

const PRIORIDADE_CONFIG: Record<string, { label: string; color: string }> = {
  URGENTE: {
    label: "Urgente",
    color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  NORMAL: {
    label: "Normal",
    color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
  },
  BAIXA: {
    label: "Baixa",
    color: "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-500 border-zinc-100 dark:border-zinc-700/50",
  },
};

// ============================================
// PAINEL DA SERVIDORA (AMANDA)
// ============================================

export function PainelServidor({ user }: PainelServidorProps) {
  // ------------------------------------------
  // QUERIES
  // ------------------------------------------

  // Delegacoes recebidas (meus pedidos)
  const {
    data: minhasDelegacoes = [],
    isLoading: loadingDelegacoes,
  } = trpc.delegacao.minhasDelegacoes.useQuery(undefined);

  // Demandas do dia (para historico)
  const {
    data: demandas = [],
    isLoading: loadingDemandas,
  } = trpc.demandas.list.useQuery({ limit: 100 });

  // Assistidos (para busca no registro rapido)
  const {
    data: assistidos = [],
    isLoading: loadingAssistidos,
  } = trpc.assistidos.list.useQuery({ limit: 100 });

  // Processos (para vincular no registro rapido)
  const { data: processos = [] } = trpc.processos.list.useQuery({ limit: 100 });

  // ------------------------------------------
  // MUTATIONS
  // ------------------------------------------

  const utils = trpc.useUtils();

  const atualizarStatusMutation = trpc.delegacao.atualizarStatus.useMutation({
    onSuccess: () => {
      utils.delegacao.minhasDelegacoes.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const createDemandaMutation = trpc.demandas.create.useMutation({
    onSuccess: () => {
      toast.success("Registro criado com sucesso!");
      utils.demandas.list.invalidate();
      setRegistroRapido({
        assistidoId: null,
        assistidoNome: "",
        tipo: "atendimento",
        descricao: "",
        processoId: null,
      });
    },
    onError: (error) => {
      toast.error("Erro ao registrar: " + error.message);
    },
  });

  // ------------------------------------------
  // ESTADO
  // ------------------------------------------

  const [registroRapido, setRegistroRapido] = useState<{
    assistidoId: number | null;
    assistidoNome: string;
    tipo: "atendimento" | "diligencia" | "outro";
    descricao: string;
    processoId: number | null;
  }>({
    assistidoId: null,
    assistidoNome: "",
    tipo: "atendimento",
    descricao: "",
    processoId: null,
  });
  const [assistidoSearchOpen, setAssistidoSearchOpen] = useState(false);
  const [assistidoSearchQuery, setAssistidoSearchQuery] = useState("");

  // ------------------------------------------
  // DADOS COMPUTADOS
  // ------------------------------------------

  // Separar delegacoes por status
  const delegacoesPendentes = useMemo(
    () =>
      minhasDelegacoes.filter(
        (d: any) => d.status === "pendente" || d.status === "aceita"
      ),
    [minhasDelegacoes]
  );

  const delegacoesEmAndamento = useMemo(
    () =>
      minhasDelegacoes.filter(
        (d: any) => d.status === "em_andamento" || d.status === "aguardando_revisao"
      ),
    [minhasDelegacoes]
  );

  const delegacoesConcluidas = useMemo(
    () =>
      minhasDelegacoes.filter(
        (d: any) =>
          d.status === "concluida" ||
          d.status === "revisado" ||
          d.status === "protocolado"
      ),
    [minhasDelegacoes]
  );

  // Delegacoes ativas (nao finalizadas) para a lista
  const delegacoesAtivas = useMemo(
    () =>
      minhasDelegacoes.filter(
        (d: any) =>
          !["concluida", "revisado", "protocolado", "devolvida", "cancelada"].includes(
            d.status
          )
      ),
    [minhasDelegacoes]
  );

  // Historico do dia: demandas criadas hoje
  const registrosHoje = useMemo(() => {
    return demandas.filter((d: any) => {
      const createdAt = d.createdAt ? new Date(d.createdAt) : null;
      return createdAt && isToday(createdAt);
    });
  }, [demandas]);

  // Busca de assistidos
  const assistidosFiltrados = useMemo(() => {
    const validos = assistidos.filter((a: any) => {
      const nome = (a.nome || "").toLowerCase();
      return (
        !nome.includes("nao identificado") &&
        !nome.includes("nao identificado") &&
        nome !== "" &&
        nome !== "-"
      );
    });
    if (!assistidoSearchQuery.trim()) return validos.slice(0, 10);
    const query = assistidoSearchQuery.toLowerCase();
    return validos
      .filter(
        (a: any) =>
          a.nome?.toLowerCase().includes(query) ||
          a.cpf?.includes(query) ||
          a.vulgo?.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [assistidos, assistidoSearchQuery]);

  // Processos do assistido selecionado
  const processosDoAssistido = useMemo(() => {
    if (!registroRapido.assistidoId) return [];
    return processos.filter(
      (p: any) => p.assistidoId === registroRapido.assistidoId
    );
  }, [registroRapido.assistidoId, processos]);

  // ------------------------------------------
  // HANDLERS
  // ------------------------------------------

  const handleStatusUpdate = (delegacaoId: number, novoStatus: string) => {
    atualizarStatusMutation.mutate({
      delegacaoId,
      status: novoStatus as any,
    });
    const label =
      STATUS_CONFIG[novoStatus]?.label || novoStatus;
    toast.success(`Status atualizado para "${label}"`);
  };

  const handleRegistroRapido = () => {
    if (!registroRapido.assistidoId || !registroRapido.descricao.trim()) {
      toast.error("Selecione um assistido e descreva o registro");
      return;
    }

    // Precisamos de um processoId para criar demanda
    // Se tem um processo selecionado, usa ele. Senao, pega o primeiro do assistido.
    const processoId =
      registroRapido.processoId || processosDoAssistido[0]?.id;

    if (!processoId) {
      toast.error(
        "Este assistido nao possui processos vinculados. Crie um processo primeiro."
      );
      return;
    }

    const tipoLabel =
      registroRapido.tipo === "atendimento"
        ? "Atendimento"
        : registroRapido.tipo === "diligencia"
        ? "Diligencia"
        : "Registro";

    createDemandaMutation.mutate({
      processoId,
      assistidoId: registroRapido.assistidoId,
      ato: `${tipoLabel}: ${registroRapido.descricao.trim().slice(0, 100)}`,
      status: "5_FILA",
      prioridade: "NORMAL",
      reuPreso: false,
    });
  };

  const isLoading = loadingDelegacoes || loadingDemandas || loadingAssistidos;

  // ------------------------------------------
  // RENDER
  // ------------------------------------------

  const firstName = user.name?.split(" ")[0] || "Servidor(a)";

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Ola, {firstName}!
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Seu painel de trabalho
                {delegacoesPendentes.length > 0 &&
                  ` \u00B7 ${delegacoesPendentes.length} pedido${
                    delegacoesPendentes.length > 1 ? "s" : ""
                  } pendente${delegacoesPendentes.length > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* ===== 1. MEUS PEDIDOS ===== */}
        <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Meus Pedidos
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {delegacoesPendentes.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                    {delegacoesPendentes.length} pendente
                    {delegacoesPendentes.length > 1 ? "s" : ""}
                  </span>
                )}
                {delegacoesEmAndamento.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                    {delegacoesEmAndamento.length} em andamento
                  </span>
                )}
                {delegacoesConcluidas.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                    {delegacoesConcluidas.length} concluido
                    {delegacoesConcluidas.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {loadingDelegacoes ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : delegacoesAtivas.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nenhum pedido pendente
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Seus pedidos de trabalho aparecerao aqui
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {delegacoesAtivas.map((deleg: any) => {
                  const TipoIcon =
                    TIPO_ICONS[deleg.tipo || "delegacao_generica"] || Send;
                  const status =
                    STATUS_CONFIG[deleg.status] || {
                      label: deleg.status,
                      color: "bg-zinc-100 text-zinc-600",
                    };
                  const prioridade =
                    PRIORIDADE_CONFIG[deleg.prioridade || "NORMAL"] ||
                    PRIORIDADE_CONFIG.NORMAL;
                  const assistidoName =
                    deleg.assistido?.nome ||
                    deleg.demanda?.assistido?.nome ||
                    "";
                  const prazo = deleg.prazoSugerido
                    ? format(new Date(deleg.prazoSugerido), "dd/MM", {
                        locale: ptBR,
                      })
                    : null;

                  return (
                    <div
                      key={deleg.id}
                      className={cn(
                        "px-3 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors",
                        deleg.prioridade === "URGENTE" &&
                          "bg-red-50/50 dark:bg-red-950/20 border-l-4 border-red-500"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <TipoIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {/* Tipo badge */}
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                              {deleg.tipo === "minuta"
                                ? "Minuta"
                                : deleg.tipo === "atendimento"
                                ? "Atendimento"
                                : deleg.tipo === "diligencia"
                                ? "Diligencia"
                                : deleg.tipo === "analise"
                                ? "Analise"
                                : "Tarefa"}
                            </span>
                            {deleg.prioridade === "URGENTE" && (
                              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                URGENTE
                              </span>
                            )}
                          </div>
                          {/* Instrucoes */}
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2">
                            {deleg.instrucoes || "Pedido de trabalho"}
                          </p>
                          {/* Meta info */}
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-400">
                            {assistidoName && (
                              <>
                                <User className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">
                                  {assistidoName}
                                </span>
                              </>
                            )}
                            {deleg.delegadoDe?.name && (
                              <>
                                <span className="mx-0.5">\u00B7</span>
                                <span>
                                  De: {deleg.delegadoDe.name.split(" ")[0]}
                                </span>
                              </>
                            )}
                            {prazo && (
                              <>
                                <span className="mx-0.5">\u00B7</span>
                                <Calendar className="w-3 h-3" />
                                <span>{prazo}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status badge + actions */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span
                            className={`text-[9px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${status.color}`}
                          >
                            {status.label}
                          </span>
                          {/* Quick action buttons */}
                          <div className="flex items-center gap-1">
                            {(deleg.status === "pendente" ||
                              deleg.status === "aceita") && (
                              <button
                                onClick={() =>
                                  handleStatusUpdate(deleg.id, "em_andamento")
                                }
                                disabled={atualizarStatusMutation.isPending}
                                className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span className="hidden sm:inline">
                                  Em andamento
                                </span>
                              </button>
                            )}
                            {(deleg.status === "em_andamento" ||
                              deleg.status === "aceita" ||
                              deleg.status === "pendente") && (
                              <button
                                onClick={() =>
                                  handleStatusUpdate(deleg.id, "concluida")
                                }
                                disabled={atualizarStatusMutation.isPending}
                                className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span className="hidden sm:inline">
                                  Concluido
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Link para ver todas */}
          {minhasDelegacoes.length > 0 && (
            <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800">
              <Link
                href="/admin/delegacoes"
                className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Ver todos os pedidos ({minhasDelegacoes.length}) \u2192
              </Link>
            </div>
          )}
        </Card>

        {/* ===== 2. REGISTRO RAPIDO SIMPLIFICADO ===== */}
        <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Registro Rapido
              </h3>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {/* Assistido search */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Assistido
              </label>
              <Popover
                open={assistidoSearchOpen}
                onOpenChange={setAssistidoSearchOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={assistidoSearchOpen}
                    className="w-full h-10 justify-between text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-700 focus:ring-emerald-500/20 transition-all duration-200"
                  >
                    {registroRapido.assistidoId ? (
                      <span className="flex items-center gap-2 truncate">
                        <User className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="truncate">
                          {registroRapido.assistidoNome}
                        </span>
                      </span>
                    ) : (
                      <span className="text-zinc-400 flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Buscar por nome...
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder="Digite o nome..."
                      value={assistidoSearchQuery}
                      onValueChange={setAssistidoSearchQuery}
                      className="h-10"
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-4 text-center">
                          <User className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                          <p className="text-sm text-zinc-500">
                            Nenhum assistido encontrado
                          </p>
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading="Assistidos">
                        {assistidosFiltrados.map((assistido: any) => (
                          <CommandItem
                            key={assistido.id}
                            value={assistido.nome}
                            onSelect={() => {
                              setRegistroRapido((prev) => ({
                                ...prev,
                                assistidoId: assistido.id,
                                assistidoNome: assistido.nome,
                                processoId: null,
                              }));
                              setAssistidoSearchOpen(false);
                              setAssistidoSearchQuery("");
                            }}
                            className="flex items-center gap-2 py-2"
                          >
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                {assistido.nome
                                  ?.split(" ")
                                  .map((n: string) => n[0])
                                  .slice(0, 2)
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {assistido.nome}
                              </p>
                            </div>
                            {registroRapido.assistidoId === assistido.id && (
                              <Check className="w-4 h-4 text-emerald-500" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {/* Clear button when selected */}
              {registroRapido.assistidoId && (
                <button
                  onClick={() =>
                    setRegistroRapido((prev) => ({
                      ...prev,
                      assistidoId: null,
                      assistidoNome: "",
                      processoId: null,
                    }))
                  }
                  className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors"
                >
                  Limpar selecao
                </button>
              )}
            </div>

            {/* Tipo (simplified) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Tipo
              </label>
              <div className="flex gap-1.5">
                {[
                  {
                    id: "atendimento" as const,
                    label: "Atendimento",
                    icon: MessageSquare,
                  },
                  {
                    id: "diligencia" as const,
                    label: "Diligencia",
                    icon: Search,
                  },
                  { id: "outro" as const, label: "Outro", icon: FileEdit },
                ].map((tipo) => {
                  const Icon = tipo.icon;
                  const isSelected = registroRapido.tipo === tipo.id;
                  return (
                    <button
                      key={tipo.id}
                      onClick={() =>
                        setRegistroRapido((prev) => ({
                          ...prev,
                          tipo: tipo.id,
                        }))
                      }
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors border",
                        isSelected
                          ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-500"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-3.5 h-3.5",
                          isSelected
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-400"
                        )}
                      />
                      {tipo.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Processo vinculado (se assistido selecionado e tem processos) */}
            {registroRapido.assistidoId && processosDoAssistido.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Processo vinculado
                </label>
                <select
                  value={registroRapido.processoId || ""}
                  onChange={(e) =>
                    setRegistroRapido((prev) => ({
                      ...prev,
                      processoId: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  className="w-full h-8 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 focus:ring-emerald-500/20 focus:border-emerald-300 dark:focus:border-emerald-700 transition-colors"
                >
                  <option value="">
                    {processosDoAssistido.length === 1
                      ? processosDoAssistido[0].numeroAutos ||
                        `Processo #${processosDoAssistido[0].id}`
                      : "Selecionar processo..."}
                  </option>
                  {processosDoAssistido.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.numeroAutos || `Processo #${p.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Descricao */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Descricao
              </label>
              <Textarea
                placeholder={
                  registroRapido.tipo === "atendimento"
                    ? "Descreva o atendimento realizado..."
                    : registroRapido.tipo === "diligencia"
                    ? "Descreva a diligencia realizada..."
                    : "Descreva o registro..."
                }
                value={registroRapido.descricao}
                onChange={(e) =>
                  setRegistroRapido((prev) => ({
                    ...prev,
                    descricao: e.target.value,
                  }))
                }
                rows={3}
                className="w-full text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 resize-none focus:ring-emerald-500/20 focus:border-emerald-300 dark:focus:border-emerald-700 transition-colors"
              />
            </div>

            {/* Submit */}
            <Button
              className="w-full h-10 text-sm font-medium bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={
                !registroRapido.assistidoId ||
                !registroRapido.descricao.trim() ||
                createDemandaMutation.isPending
              }
              onClick={handleRegistroRapido}
            >
              <Send className="w-4 h-4 mr-2" />
              {!registroRapido.assistidoId
                ? "Selecione um assistido"
                : !registroRapido.descricao.trim()
                ? "Adicione uma descricao"
                : createDemandaMutation.isPending
                ? "Registrando..."
                : "Registrar"}
            </Button>
          </div>
        </Card>

        {/* ===== 3. HISTORICO DO DIA ===== */}
        <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Hoje
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                  {registrosHoje.length} registro
                  {registrosHoje.length !== 1 ? "s" : ""}
                </span>
              </div>
              <Link href="/admin/demandas">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-zinc-500 hover:text-emerald-600"
                >
                  Ver todas <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[300px] overflow-y-auto">
            {loadingDemandas ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : registrosHoje.length === 0 ? (
              <div className="p-6 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm text-zinc-500">
                  Nenhum registro hoje ainda
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Use o Registro Rapido acima para comecar
                </p>
              </div>
            ) : (
              registrosHoje.map((demanda: any) => {
                const hora = demanda.createdAt
                  ? format(new Date(demanda.createdAt), "HH:mm")
                  : "--:--";

                return (
                  <Link
                    href={`/admin/demandas/${demanda.id}`}
                    key={demanda.id}
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <span className="text-[11px] font-mono text-zinc-400 w-10 flex-shrink-0">
                        {hora}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {demanda.assistido?.nome || "Sem assistido"}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {demanda.ato}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[9px] border-zinc-200 dark:border-zinc-700 text-zinc-500"
                      >
                        {demanda.status === "5_FILA"
                          ? "Fila"
                          : demanda.status === "2_ATENDER"
                          ? "Atender"
                          : demanda.status === "7_PROTOCOLADO"
                          ? "Protocolado"
                          : demanda.status}
                      </Badge>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Card>

        {/* ===== 4. ACESSO RAPIDO ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/admin/demandas">
            <Card className="p-4 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <ClipboardList className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Demandas
              </p>
            </Card>
          </Link>
          <Link href="/admin/assistidos">
            <Card className="p-4 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Assistidos
              </p>
            </Card>
          </Link>
          <Link href="/admin/drive">
            <Card className="p-4 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-800 transition-all cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FileEdit className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Drive
              </p>
            </Card>
          </Link>
          <Link href="/admin/agenda">
            <Card className="p-4 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-800 transition-all cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Agenda
              </p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
