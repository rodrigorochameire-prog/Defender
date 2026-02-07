"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  UserCheck,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Briefcase,
  FileText,
  MessageSquare,
  ArrowRight,
  Loader2,
  Inbox,
  SendHorizontal,
  RotateCcw,
  Play,
  Check,
  XCircle,
  Eye,
  Filter,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mapeamento de status para cores e labels
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendente: {
    label: "Pendente",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  aceita: {
    label: "Aceita",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: <Check className="w-3.5 h-3.5" />,
  },
  em_andamento: {
    label: "Em Andamento",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    icon: <Play className="w-3.5 h-3.5" />,
  },
  concluida: {
    label: "Concluída",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  devolvida: {
    label: "Devolvida",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    icon: <RotateCcw className="w-3.5 h-3.5" />,
  },
  cancelada: {
    label: "Cancelada",
    color: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

// Props do card de delegação
interface DelegacaoCardProps {
  delegacao: any;
  tipo: "recebida" | "enviada";
  onAtualizarStatus: (delegacaoId: number, status: string, observacoes?: string) => void;
  onVerDetalhes: (delegacao: any) => void;
  isUpdating: boolean;
}

function DelegacaoCard({
  delegacao,
  tipo,
  onAtualizarStatus,
  onVerDetalhes,
  isUpdating,
}: DelegacaoCardProps) {
  const statusConfig = STATUS_CONFIG[delegacao.status] || STATUS_CONFIG.pendente;
  const pessoa = tipo === "recebida" ? delegacao.delegadoDe : delegacao.delegadoPara;
  const label = tipo === "recebida" ? "De" : "Para";

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  };

  const dataFormatada = delegacao.dataDelegacao
    ? formatDistanceToNow(new Date(delegacao.dataDelegacao), {
        addSuffix: true,
        locale: ptBR,
      })
    : "";

  return (
    <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-zinc-100 dark:border-zinc-800">
      {/* Barra colorida no topo */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1 transition-opacity",
          statusConfig.color.includes("emerald") && "bg-emerald-500",
          statusConfig.color.includes("amber") && "bg-amber-500",
          statusConfig.color.includes("blue") && "bg-blue-500",
          statusConfig.color.includes("violet") && "bg-violet-500",
          statusConfig.color.includes("rose") && "bg-rose-500",
          statusConfig.color.includes("zinc") && "bg-zinc-400"
        )}
      />

      <div className="p-4 pt-5">
        {/* Header: Status + Data */}
        <div className="flex items-center justify-between mb-3">
          <Badge className={cn("gap-1 text-[10px] font-medium", statusConfig.color)}>
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>
          <span className="text-[10px] text-zinc-500">{dataFormatada}</span>
        </div>

        {/* Contexto: Assistido e Processo */}
        {delegacao.demanda && (
          <div className="mb-3 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 space-y-1.5">
            {delegacao.demanda.assistido && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate">
                  {delegacao.demanda.assistido.nome}
                </span>
              </div>
            )}
            {delegacao.demanda.processo && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-zinc-600 dark:text-zinc-400 font-mono text-[11px] truncate">
                  {delegacao.demanda.processo.numeroAutos}
                </span>
              </div>
            )}
            {delegacao.demanda.ato && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-zinc-600 dark:text-zinc-400 truncate">
                  {delegacao.demanda.ato}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Instruções */}
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            Instruções
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
            {delegacao.instrucoes}
          </p>
        </div>

        {/* Prazo Sugerido */}
        {delegacao.prazoSugerido && (
          <div className="flex items-center gap-2 text-sm mb-3">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-500">Prazo:</span>
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">
              {format(new Date(delegacao.prazoSugerido + "T12:00:00"), "dd/MM/yyyy")}
            </span>
          </div>
        )}

        {/* Pessoa (De/Para) */}
        <div className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Avatar className="h-7 w-7">
            <AvatarFallback
              className={cn(
                "text-[10px] font-semibold",
                tipo === "recebida"
                  ? "bg-gradient-to-br from-rose-500 to-pink-600 text-white"
                  : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
              )}
            >
              {getInitials(pessoa?.name || "")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-zinc-500">
              {tipo === "recebida" ? "Delegado por" : "Delegado para"}
            </p>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
              {pessoa?.name || "Usuário"}
            </p>
          </div>
          {tipo === "recebida" && (
            <ArrowRight className="w-4 h-4 text-zinc-400" />
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8 rounded-lg"
            onClick={() => onVerDetalhes(delegacao)}
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Detalhes
          </Button>

          {/* Ações baseadas no tipo e status */}
          {tipo === "recebida" && delegacao.status === "pendente" && (
            <Button
              size="sm"
              className="flex-1 text-xs h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onAtualizarStatus(delegacao.id, "aceita")}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Aceitar
                </>
              )}
            </Button>
          )}

          {tipo === "recebida" && delegacao.status === "aceita" && (
            <Button
              size="sm"
              className="flex-1 text-xs h-8 rounded-lg bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => onAtualizarStatus(delegacao.id, "em_andamento")}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1" />
                  Iniciar
                </>
              )}
            </Button>
          )}

          {tipo === "recebida" && delegacao.status === "em_andamento" && (
            <Button
              size="sm"
              className="flex-1 text-xs h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onAtualizarStatus(delegacao.id, "concluida")}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Concluir
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// Componente principal
export default function DelegacoesPage() {
  const [activeTab, setActiveTab] = useState<"recebidas" | "enviadas">("recebidas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [delegacaoDetalhes, setDelegacaoDetalhes] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [observacoes, setObservacoes] = useState("");

  const utils = trpc.useUtils();

  // Query para delegações recebidas
  const {
    data: delegacoesRecebidas = [],
    isLoading: loadingRecebidas,
    refetch: refetchRecebidas,
  } = trpc.delegacao.minhasDelegacoes.useQuery(
    { status: filtroStatus as any },
    { enabled: activeTab === "recebidas" }
  );

  // Query para delegações enviadas
  const {
    data: delegacoesEnviadas = [],
    isLoading: loadingEnviadas,
    refetch: refetchEnviadas,
  } = trpc.delegacao.delegacoesEnviadas.useQuery(
    { status: filtroStatus as any },
    { enabled: activeTab === "enviadas" }
  );

  // Query para estatísticas
  const { data: stats } = trpc.delegacao.estatisticas.useQuery();

  // Mutation para atualizar status
  const atualizarStatus = trpc.delegacao.atualizarStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      setUpdatingId(null);
      setDelegacaoDetalhes(null);
      setObservacoes("");
      utils.delegacao.minhasDelegacoes.invalidate();
      utils.delegacao.delegacoesEnviadas.invalidate();
      utils.delegacao.estatisticas.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status", { description: error.message });
      setUpdatingId(null);
    },
  });

  const handleAtualizarStatus = (delegacaoId: number, status: string, obs?: string) => {
    setUpdatingId(delegacaoId);
    atualizarStatus.mutate({
      delegacaoId,
      status: status as any,
      observacoes: obs,
    });
  };

  const delegacoes = activeTab === "recebidas" ? delegacoesRecebidas : delegacoesEnviadas;
  const isLoading = activeTab === "recebidas" ? loadingRecebidas : loadingEnviadas;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Padrão Defender */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <UserCheck className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Delegações</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Gerencie suas tarefas delegadas</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetchRecebidas();
              refetchEnviadas();
            }}
            className="gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="p-4 md:p-6">
        {/* Estatísticas - Padrão Defender (cores neutras) */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {/* Pendentes */}
            <div className="group relative p-3 md:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
              <div className="flex items-start justify-between gap-2 md:gap-3">
                <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1">
                  <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 dark:group-hover:text-emerald-400/70 transition-colors duration-300">
                    Pendentes
                  </p>
                  <p className="text-lg md:text-xl font-semibold text-zinc-700 dark:text-zinc-300">
                    {stats.pendentes}
                  </p>
                  <p className="text-[9px] md:text-[10px] text-zinc-400 dark:text-zinc-500">
                    aguardando ação
                  </p>
                </div>
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 dark:group-hover:border-emerald-700/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all duration-300">
                  <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300" />
                </div>
              </div>
            </div>

            {/* Em Andamento */}
            <div className="group relative p-3 md:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
              <div className="flex items-start justify-between gap-2 md:gap-3">
                <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1">
                  <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 dark:group-hover:text-emerald-400/70 transition-colors duration-300">
                    Em Andamento
                  </p>
                  <p className="text-lg md:text-xl font-semibold text-zinc-700 dark:text-zinc-300">
                    {stats.emAndamento}
                  </p>
                  <p className="text-[9px] md:text-[10px] text-zinc-400 dark:text-zinc-500">
                    sendo trabalhado
                  </p>
                </div>
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 dark:group-hover:border-emerald-700/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all duration-300">
                  <Play className="w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300" />
                </div>
              </div>
            </div>

            {/* Concluídas */}
            <div className="group relative p-3 md:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
              <div className="flex items-start justify-between gap-2 md:gap-3">
                <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1">
                  <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 dark:group-hover:text-emerald-400/70 transition-colors duration-300">
                    Concluídas
                  </p>
                  <p className="text-lg md:text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                    {stats.concluidas}
                  </p>
                  <p className="text-[9px] md:text-[10px] text-emerald-600 dark:text-emerald-500">
                    finalizadas
                  </p>
                </div>
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0 border border-emerald-200 dark:border-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="group relative p-3 md:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
              <div className="flex items-start justify-between gap-2 md:gap-3">
                <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1">
                  <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 dark:group-hover:text-emerald-400/70 transition-colors duration-300">
                    Total
                  </p>
                  <p className="text-lg md:text-xl font-semibold text-zinc-700 dark:text-zinc-300">
                    {stats.total}
                  </p>
                  <p className="text-[9px] md:text-[10px] text-zinc-400 dark:text-zinc-500">
                    delegações
                  </p>
                </div>
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 dark:group-hover:border-emerald-700/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all duration-300">
                  <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300" />
                </div>
              </div>
            </div>
          </div>
        )}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <TabsTrigger
                value="recebidas"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 rounded-lg px-4 gap-2"
              >
                <Inbox className="w-4 h-4" />
                Recebidas
                {delegacoesRecebidas.filter((d) => d.status === "pendente").length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-rose-100 text-rose-600 text-[10px]">
                    {delegacoesRecebidas.filter((d) => d.status === "pendente").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="enviadas"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 rounded-lg px-4 gap-2"
              >
                <SendHorizontal className="w-4 h-4" />
                Enviadas
              </TabsTrigger>
            </TabsList>

            {/* Filtro de status */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400" />
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[160px] h-9 rounded-lg">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="aceita">Aceitas</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluídas</SelectItem>
                  <SelectItem value="devolvida">Devolvidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="recebidas" className="mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              </div>
            ) : delegacoes.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Nenhuma delegação recebida
                </h3>
                <p className="text-sm text-zinc-500">
                  Quando você receber delegações de tarefas, elas aparecerão aqui.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {delegacoes.map((delegacao) => (
                  <DelegacaoCard
                    key={delegacao.id}
                    delegacao={delegacao}
                    tipo="recebida"
                    onAtualizarStatus={handleAtualizarStatus}
                    onVerDetalhes={setDelegacaoDetalhes}
                    isUpdating={updatingId === delegacao.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="enviadas" className="mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              </div>
            ) : delegacoes.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <SendHorizontal className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Nenhuma delegação enviada
                </h3>
                <p className="text-sm text-zinc-500">
                  Delegue tarefas a partir da tela de demandas alterando o status para um membro da equipe.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {delegacoes.map((delegacao) => (
                  <DelegacaoCard
                    key={delegacao.id}
                    delegacao={delegacao}
                    tipo="enviada"
                    onAtualizarStatus={handleAtualizarStatus}
                    onVerDetalhes={setDelegacaoDetalhes}
                    isUpdating={updatingId === delegacao.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={!!delegacaoDetalhes} onOpenChange={() => setDelegacaoDetalhes(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Eye className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <span className="text-lg">Detalhes da Delegação</span>
                <p className="text-xs font-normal text-zinc-500 mt-0.5">
                  #{delegacaoDetalhes?.id}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {delegacaoDetalhes && (
            <div className="space-y-4 py-4">
              {/* Status atual */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Status:</span>
                <Badge
                  className={cn(
                    "gap-1",
                    STATUS_CONFIG[delegacaoDetalhes.status]?.color
                  )}
                >
                  {STATUS_CONFIG[delegacaoDetalhes.status]?.icon}
                  {STATUS_CONFIG[delegacaoDetalhes.status]?.label}
                </Badge>
              </div>

              {/* Data da delegação */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Data:</span>
                <span className="text-sm font-medium">
                  {delegacaoDetalhes.dataDelegacao &&
                    format(new Date(delegacaoDetalhes.dataDelegacao), "dd/MM/yyyy HH:mm")}
                </span>
              </div>

              {/* Prazo */}
              {delegacaoDetalhes.prazoSugerido && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Prazo sugerido:</span>
                  <span className="text-sm font-medium">
                    {format(new Date(delegacaoDetalhes.prazoSugerido + "T12:00:00"), "dd/MM/yyyy")}
                  </span>
                </div>
              )}

              {/* Contexto */}
              {delegacaoDetalhes.demanda && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Contexto
                  </p>
                  {delegacaoDetalhes.demanda.assistido && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium">
                        {delegacaoDetalhes.demanda.assistido.nome}
                      </span>
                    </div>
                  )}
                  {delegacaoDetalhes.demanda.processo && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-violet-500" />
                      <span className="font-mono text-xs">
                        {delegacaoDetalhes.demanda.processo.numeroAutos}
                      </span>
                    </div>
                  )}
                  {delegacaoDetalhes.demanda.ato && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-amber-500" />
                      <span>{delegacaoDetalhes.demanda.ato}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Instruções */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Instruções
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                  {delegacaoDetalhes.instrucoes}
                </p>
              </div>

              {/* Observações (se houver) */}
              {delegacaoDetalhes.observacoes && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Observações
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                    {delegacaoDetalhes.observacoes}
                  </p>
                </div>
              )}

              {/* Campo para adicionar observações (se pendente ou em andamento) */}
              {activeTab === "recebidas" &&
                ["pendente", "aceita", "em_andamento"].includes(delegacaoDetalhes.status) && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Adicionar observação
                    </p>
                    <Textarea
                      placeholder="Escreva uma observação sobre o andamento..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      className="min-h-[80px] resize-none rounded-xl"
                    />
                  </div>
                )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDelegacaoDetalhes(null);
                setObservacoes("");
              }}
              className="rounded-xl"
            >
              Fechar
            </Button>

            {/* Ações baseadas no status */}
            {activeTab === "recebidas" && delegacaoDetalhes?.status === "pendente" && (
              <Button
                onClick={() =>
                  handleAtualizarStatus(delegacaoDetalhes.id, "aceita", observacoes || undefined)
                }
                disabled={atualizarStatus.isPending}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
              >
                {atualizarStatus.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1.5" />
                )}
                Aceitar Delegação
              </Button>
            )}

            {activeTab === "recebidas" && delegacaoDetalhes?.status === "aceita" && (
              <Button
                onClick={() =>
                  handleAtualizarStatus(delegacaoDetalhes.id, "em_andamento", observacoes || undefined)
                }
                disabled={atualizarStatus.isPending}
                className="rounded-xl bg-violet-600 hover:bg-violet-700"
              >
                {atualizarStatus.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-1.5" />
                )}
                Iniciar Trabalho
              </Button>
            )}

            {activeTab === "recebidas" && delegacaoDetalhes?.status === "em_andamento" && (
              <Button
                onClick={() =>
                  handleAtualizarStatus(delegacaoDetalhes.id, "concluida", observacoes || undefined)
                }
                disabled={atualizarStatus.isPending}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
              >
                {atualizarStatus.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                )}
                Marcar como Concluída
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
