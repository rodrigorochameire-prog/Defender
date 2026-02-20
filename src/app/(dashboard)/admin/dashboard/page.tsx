"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { DemandaCreateModal, type DemandaFormData } from "@/components/demandas-premium/demanda-create-modal";
import { DelegacaoModal } from "@/components/demandas/delegacao-modal";
import { PedidoTrabalhoModal } from "@/components/cowork/pedido-trabalho-modal";
import { ParecerModal } from "@/components/cowork/parecer-modal";
import { CoberturaModal } from "@/components/cowork/cobertura-modal";
import { MuralEquipe } from "@/components/cowork/mural-equipe";
import { ParecerRecebidoCard, usePareceresPendentesCount } from "@/components/cowork/parecer-recebido-card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getAtosPorAtribuicao } from "@/config/atos-por-atribuicao";
import { DEMANDA_STATUS, isStatusConcluido } from "@/config/demanda-status";
import { getAtribuicaoColors } from "@/lib/config/atribuicoes";
import { toast } from "sonner";
import {
  Users,
  AlertCircle,
  Calendar,
  Gavel,
  ArrowRight,
  FileText,
  Lock,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  User,
  Briefcase,
  Plus,
  Send,
  MessageSquare,
  CalendarDays,
  Search,
  ChevronsUpDown,
  X,
  PenLine,
  UserPlus,
  XCircle,
  RefreshCw,
  CircleCheck,
  ChevronDown,
  UserCheck,
  ArrowRightLeft,
  Eye,
  FileEdit,
  BookOpen,
  Shield,
} from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { format, parseISO, isToday, isTomorrow, isThisWeek, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useProfissional,
  type ProfissionalId,
  PROFISSIONAIS_CONFIG,
} from "@/contexts/profissional-context";
import { usePermissions, type UserRole } from "@/hooks/use-permissions";
import { DashboardPorPerfil } from "@/components/dashboard/dashboard-por-perfil";
import { PainelServidor } from "@/components/dashboard/painel-servidor";
import { KPICardPremium, KPIGrid } from "@/components/shared/kpi-card-premium";

// ============================================
// HELPERS
// ============================================

function CopyProcessButton({ processo }: { processo: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(processo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
      title="Copiar número do processo"
    >
      {copied ? (
        <Check className="w-3 h-3 text-emerald-600" />
      ) : (
        <Copy className="w-3 h-3 text-zinc-400 hover:text-zinc-600" />
      )}
    </button>
  );
}

function formatPrazo(prazo: string | Date | null): { texto: string; cor: string; diasRestantes: number | null; vencido: boolean } {
  if (!prazo) return { texto: "Sem prazo", cor: "gray", diasRestantes: null, vencido: false };

  const data = typeof prazo === "string" ? parseISO(prazo) : prazo;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazoData = new Date(data);
  prazoData.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((prazoData.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const diasVencidos = Math.abs(diffDays);
    return {
      texto: diasVencidos === 1 ? "1 dia atrás" : `${diasVencidos} dias atrás`,
      cor: "vencido",
      diasRestantes: diffDays,
      vencido: true
    };
  }

  if (diffDays === 0) return { texto: "HOJE", cor: "red", diasRestantes: 0, vencido: false };
  if (diffDays === 1) return { texto: "Amanhã", cor: "red", diasRestantes: 1, vencido: false };

  if (diffDays <= 3) return { texto: `${diffDays} dias`, cor: "red", diasRestantes: diffDays, vencido: false };
  if (diffDays <= 7) return { texto: `${diffDays} dias`, cor: "yellow", diasRestantes: diffDays, vencido: false };
  return { texto: format(data, "dd/MM", { locale: ptBR }), cor: "gray", diasRestantes: diffDays, vencido: false };
}

function ResponsavelBadge({ responsavelId }: { responsavelId: number | null }) {
  if (!responsavelId || !(responsavelId in PROFISSIONAIS_CONFIG)) return null;
  const config = PROFISSIONAIS_CONFIG[responsavelId];
  if (!config) return null;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${config.corBadge}`}>
      {config.nomeCurto}
    </span>
  );
}

// ============================================
// STATUS RÁPIDO PARA PRAZOS
// ============================================

const QUICK_STATUS_OPTIONS = [
  { status: "2_ATENDER", substatus: "elaborar", label: "Elaborar", icon: PenLine, group: "acao" },
  { status: "2_ATENDER", substatus: "elaborando", label: "Elaborando", icon: PenLine, group: "acao" },
  { status: "2_ATENDER", substatus: "revisar", label: "Revisar", icon: FileText, group: "acao" },
  { status: "2_ATENDER", substatus: "revisando", label: "Revisando", icon: FileText, group: "acao" },
  { status: "2_ATENDER", substatus: "protocolar", label: "Protocolar", icon: Send, group: "acao" },
  { status: "4_MONITORAR", substatus: "monitorar", label: "Monitorar", icon: Eye, group: "acao" },
  { status: "7_PROTOCOLADO", substatus: "protocolado", label: "Protocolado", icon: CheckCircle2, group: "concluir" },
  { status: "7_CIENCIA", substatus: "ciencia", label: "Ciência", icon: CheckCircle2, group: "concluir" },
  { status: "7_SEM_ATUACAO", substatus: "sem_atuacao", label: "Sem atuação", icon: XCircle, group: "concluir" },
] as const;

function QuickStatusButton({ demandaId, currentSubstatus, onUpdate }: {
  demandaId: number;
  currentSubstatus?: string | null;
  onUpdate: (id: number, status: string, substatus: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const currentLabel = currentSubstatus
    ? QUICK_STATUS_OPTIONS.find(o => o.substatus === currentSubstatus)?.label || currentSubstatus
    : "Status";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
          className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 text-zinc-600 dark:text-zinc-400 transition-colors whitespace-nowrap"
        >
          {currentLabel}
          <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="end" sideOffset={4}>
        <div className="space-y-0.5">
          <p className="text-[9px] font-medium text-zinc-400 uppercase tracking-wide px-2 pt-1">Ação</p>
          {QUICK_STATUS_OPTIONS.filter(o => o.group === "acao").map((opt) => {
            const Icon = opt.icon;
            const isActive = currentSubstatus === opt.substatus;
            return (
              <button
                key={opt.substatus}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUpdate(demandaId, opt.status, opt.substatus);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <Icon className="w-3 h-3" />
                {opt.label}
                {isActive && <Check className="w-3 h-3 ml-auto" />}
              </button>
            );
          })}
          <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
          <p className="text-[9px] font-medium text-zinc-400 uppercase tracking-wide px-2">Concluir</p>
          {QUICK_STATUS_OPTIONS.filter(o => o.group === "concluir").map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.substatus}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUpdate(demandaId, opt.status, opt.substatus);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-colors"
              >
                <Icon className="w-3 h-3" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// ============================================
// PARECERES RECEBIDOS SECTION
// ============================================

function ParecerRecebidoSection() {
  const count = usePareceresPendentesCount();
  if (count === 0) return null;
  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800">
      <div className="px-3 pt-2 pb-1 flex items-center gap-1.5">
        <p className="text-[9px] font-medium text-zinc-400 uppercase tracking-wide">
          Pareceres aguardando resposta
        </p>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
          {count}
        </span>
      </div>
      <div className="px-3 pb-3">
        <ParecerRecebidoCard />
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD COMPONENT
// ============================================

export default function DashboardJuriPage() {
  const { user, isLoading: loadingUser } = usePermissions();

  const {
    profissionalAtivo,
    isGrupoJuriEpVvd,
    isGrupoVarasCriminais,
    isVisaoGeral,
    atribuicaoAtual,
    profissionalJuriEP,
    profissionalVVD,
  } = useProfissional();

  const profissionalAtivoId = profissionalAtivo.id as ProfissionalId;

  // ==========================================
  // BUSCA DADOS REAIS DO BANCO DE DADOS
  // ==========================================

  const { data: demandas = [], isLoading: loadingDemandas } = trpc.demandas.list.useQuery({
    limit: 100,
  });

  const { data: assistidos = [], isLoading: loadingAssistidos } = trpc.assistidos.list.useQuery({
    limit: 100,
  });

  const { data: casos = [], isLoading: loadingCasos } = trpc.casos.list.useQuery({
    limit: 100,
  });

  const { data: jurisData, isLoading: loadingJuris } = trpc.juri.proximas.useQuery({});
  const juris = jurisData ?? [];

  const { data: processos = [] } = trpc.processos.list.useQuery({
    limit: 100,
  });

  // Delegações recebidas (para estagiários e servidores)
  const { data: minhasDelegacoes = [], isLoading: loadingDelegacoes } = trpc.delegacao.minhasDelegacoes.useQuery(
    undefined,
    { enabled: !!user && ["estagiario", "servidor"].includes(user.role) }
  );

  // Delegações enviadas (para defensores)
  const { data: delegacoesEnviadas = [], isLoading: loadingDelegacoesEnviadas } = trpc.delegacao.delegacoesEnviadas.useQuery(
    undefined,
    { enabled: !!user && ["defensor", "admin"].includes(user.role) }
  );

  const { data: currentUserData } = trpc.auth.me.useQuery();

  const isPerfilAlternativo = user && ["estagiario", "servidor", "triagem"].includes(user.role);
  const isDefensorCriminalGeral = user && user.role === "defensor" && isGrupoVarasCriminais;

  const { data: audienciasData, isLoading: loadingAudiencias } = trpc.audiencias.proximas.useQuery({});
  const audiencias = audienciasData ?? [];

  // ==========================================
  // MODAL DE CRIAÇÃO DE DEMANDA
  // ==========================================
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const utils = trpc.useUtils();
  const createDemandaMutation = trpc.demandas.create.useMutation({
    onSuccess: () => {
      toast.success("Demanda criada com sucesso!");
      utils.demandas.list.invalidate();
      setIsCreateModalOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar demanda: " + error.message);
    },
  });

  // Mutation para atualizar status rápido
  const updateDemandaMutation = trpc.demandas.update.useMutation({
    onSuccess: () => {
      utils.demandas.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const handleQuickStatusUpdate = (demandaId: number, status: string, substatus: string) => {
    updateDemandaMutation.mutate({
      id: demandaId,
      status: status as any,
      substatus
    });
    toast.success(`Status atualizado para "${substatus}"`);
  };

  const atribuicaoOptions = [
    { value: "Tribunal do Júri", label: "Tribunal do Júri" },
    { value: "Execução Penal", label: "Execução Penal" },
    { value: "Violência Doméstica", label: "Violência Doméstica" },
    { value: "Criminal Geral", label: "Criminal Geral" },
    { value: "Substituição Criminal", label: "Substituição Criminal" },
    { value: "Curadoria", label: "Curadoria" },
  ];

  const statusOptions = Object.entries(DEMANDA_STATUS).map(([key, config]) => ({
    value: key,
    label: config.label,
  }));

  const atoOptions = getAtosPorAtribuicao(atribuicaoAtual === "JURI_EP" ? "Júri" : "VVD");

  const handleSaveNewDemanda = (data: DemandaFormData) => {
    console.log("Criar demanda:", data);
  };

  // ==========================================
  // LÓGICA DE DADOS - APENAS MINHAS DEMANDAS
  // ==========================================

  const demandasFiltradas = useMemo(() => {
    if (isVisaoGeral) return demandas;
    return demandas.filter((d: any) =>
      d.responsavelId === profissionalAtivoId ||
      d.criadoPorId === profissionalAtivoId ||
      !d.responsavelId
    );
  }, [demandas, profissionalAtivoId, isVisaoGeral]);

  const jurisFiltrados = useMemo(() => {
    if (isVisaoGeral) return juris;
    if (atribuicaoAtual === "JURI_EP") return juris;
    return juris.filter((j: any) => j.responsavelId === profissionalAtivoId);
  }, [juris, profissionalAtivoId, atribuicaoAtual, isVisaoGeral]);

  const isLoading = loadingDemandas || loadingAssistidos || loadingCasos || loadingJuris;

  // Demandas ordenadas por prazo — CORRIGIDO: exclui concluídas/arquivadas
  const demandasPorPrazo = useMemo(() => {
    return [...demandasFiltradas]
      .filter((d: any) => {
        if (!d.prazo) return false;
        // Excluir demandas concluídas/arquivadas
        if (isStatusConcluido(d.status)) return false;
        return true;
      })
      .sort((a: any, b: any) => {
        const prazoA = a.prazo ? new Date(a.prazo) : new Date(9999, 11, 31);
        const prazoB = b.prazo ? new Date(b.prazo) : new Date(9999, 11, 31);
        return prazoA.getTime() - prazoB.getTime();
      })
      .slice(0, 20);
  }, [demandasFiltradas]);

  // Estatísticas de prazos — CORRIGIDO: exclui concluídas/arquivadas
  const estatisticasPrazos = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let vencidos = 0;
    let venceHoje = 0;
    let proximosDias = 0;
    let reuPresoVencido = 0;
    let reuPresoCritico = 0;

    demandasFiltradas.forEach((d: any) => {
      const prazo = d.prazo;
      if (!prazo) return;
      // Excluir demandas concluídas/arquivadas
      if (isStatusConcluido(d.status)) return;

      const dataPrazo = new Date(prazo);
      dataPrazo.setHours(0, 0, 0, 0);
      const diffDias = Math.ceil((dataPrazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDias < 0) {
        vencidos++;
        if (d.reuPreso) reuPresoVencido++;
      } else if (diffDias === 0) {
        venceHoje++;
        if (d.reuPreso) reuPresoCritico++;
      } else if (diffDias <= 7) {
        proximosDias++;
        if (d.reuPreso && diffDias <= 3) reuPresoCritico++;
      }
    });

    return { vencidos, venceHoje, proximosDias, reuPresoVencido, reuPresoCritico };
  }, [demandasFiltradas]);

  // Estado para filtro de júris por defensor
  const [filtroDefensorJuri, setFiltroDefensorJuri] = useState<"todos" | "rodrigo" | "juliane">("todos");

  const jurisProximos = useMemo(() => {
    let filtered = [...jurisFiltrados];
    if (filtroDefensorJuri === "rodrigo") {
      filtered = filtered.filter((j: any) =>
        j.defensorNome?.toLowerCase().includes("rodrigo") || j.responsavelId === 1
      );
    } else if (filtroDefensorJuri === "juliane") {
      filtered = filtered.filter((j: any) =>
        j.defensorNome?.toLowerCase().includes("juliane") || j.responsavelId === 2
      );
    }
    return filtered.slice(0, 4);
  }, [jurisFiltrados, filtroDefensorJuri]);

  const audienciasExibir = useMemo(() => {
    const hoje = new Date();
    const fimDaSemana = addDays(hoje, 7 - hoje.getDay());
    const audienciasSemana = audiencias.filter((a: any) => {
      const dataAud = a.dataHora ? new Date(a.dataHora) : null;
      return dataAud && dataAud >= hoje && dataAud <= fimDaSemana;
    });
    if (audienciasSemana.length < 5) return audiencias.slice(0, 10);
    return audienciasSemana.slice(0, 10);
  }, [audiencias]);

  const mostrandoAlemDaSemana = useMemo(() => {
    const hoje = new Date();
    const fimDaSemana = addDays(hoje, 7 - hoje.getDay());
    const audienciasSemana = audiencias.filter((a: any) => {
      const dataAud = a.dataHora ? new Date(a.dataHora) : null;
      return dataAud && dataAud >= hoje && dataAud <= fimDaSemana;
    });
    return audienciasSemana.length < 5;
  }, [audiencias]);

  // Estado para registro rápido
  const [atendimentoRapido, setAtendimentoRapido] = useState<{
    assistidoId: number | null;
    assistidoNome: string;
    tipo: "atendimento" | "diligencia" | "informacao" | "peticao" | "anotacao" | "delegacao";
    descricao: string;
    processoId: number | null;
    prazo: string;
  }>({ assistidoId: null, assistidoNome: "", tipo: "atendimento", descricao: "", processoId: null, prazo: "" });
  const [assistidoSearchOpen, setAssistidoSearchOpen] = useState(false);
  const [assistidoSearchQuery, setAssistidoSearchQuery] = useState("");
  const [showDetalhes, setShowDetalhes] = useState(false);

  const tiposRegistro = [
    { id: "atendimento", label: "Atendimento", icon: MessageSquare, color: "text-emerald-600", bgActive: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300" },
    { id: "diligencia", label: "Diligência", icon: Search, color: "text-zinc-600", bgActive: "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600" },
    { id: "informacao", label: "Info", icon: FileText, color: "text-zinc-600", bgActive: "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600" },
    { id: "peticao", label: "Petição", icon: FileText, color: "text-zinc-600", bgActive: "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600" },
    { id: "anotacao", label: "Nota", icon: PenLine, color: "text-zinc-600", bgActive: "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600" },
    { id: "delegacao", label: "Delegar", icon: UserPlus, color: "text-zinc-600", bgActive: "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600" },
  ] as const;

  const [delegacaoModalOpen, setDelegacaoModalOpen] = useState(false);
  const [pedidoTrabalhoModalOpen, setPedidoTrabalhoModalOpen] = useState(false);
  const [parecerModalOpen, setParecerModalOpen] = useState(false);
  const [coberturaModalOpen, setCoberturaModalOpen] = useState(false);
  const [muralSheetOpen, setMuralSheetOpen] = useState(false);

  const assistidoSelecionado = useMemo(() => {
    if (!atendimentoRapido.assistidoId) return null;
    return assistidos.find((a: any) => a.id === atendimentoRapido.assistidoId);
  }, [atendimentoRapido.assistidoId, assistidos]);

  // Processos do assistido selecionado (para "Detalhes opcionais")
  const processosDoAssistido = useMemo(() => {
    if (!atendimentoRapido.assistidoId) return [];
    return processos.filter((p: any) => p.assistidoId === atendimentoRapido.assistidoId);
  }, [atendimentoRapido.assistidoId, processos]);

  const assistidosFiltrados = useMemo(() => {
    const assistidosValidos = assistidos.filter((a: any) => {
      const nome = (a.nome || "").toLowerCase();
      return !nome.includes("não identificado") &&
             !nome.includes("nao identificado") &&
             nome !== "" &&
             nome !== "-";
    });
    if (!assistidoSearchQuery.trim()) return assistidosValidos.slice(0, 10);
    const query = assistidoSearchQuery.toLowerCase();
    return assistidosValidos
      .filter((a: any) =>
        a.nome?.toLowerCase().includes(query) ||
        a.cpf?.includes(query) ||
        a.vulgo?.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [assistidos, assistidoSearchQuery]);

  // Stats para KPI cards — reformulados
  const totalDemandas = demandasFiltradas.length;
  const emAndamento = demandasFiltradas.filter((d: any) =>
    !isStatusConcluido(d.status)
  ).length;
  const totalJuris = jurisFiltrados.length;

  const statsData = [
    {
      title: "Vencidos",
      value: isLoading ? "..." : estatisticasPrazos.vencidos.toString(),
      subtitle: estatisticasPrazos.vencidos > 0 ? "requerem atenção" : "nenhum pendente",
      icon: AlertCircle,
      gradient: "zinc" as const,
    },
    {
      title: "Esta Semana",
      value: isLoading ? "..." : (estatisticasPrazos.venceHoje + estatisticasPrazos.proximosDias).toString(),
      subtitle: `${estatisticasPrazos.venceHoje} hoje + ${estatisticasPrazos.proximosDias} próximos`,
      icon: Calendar,
      gradient: "zinc" as const,
    },
    {
      title: "Em Andamento",
      value: isLoading ? "..." : emAndamento.toString(),
      subtitle: `${totalDemandas} total`,
      icon: FileText,
      gradient: "zinc" as const,
    },
    {
      title: isDefensorCriminalGeral ? "Audiências" : "Próximos Júris",
      value: isLoading ? "..." : (isDefensorCriminalGeral ? audienciasExibir.length : totalJuris).toString(),
      subtitle: isDefensorCriminalGeral
        ? (audienciasExibir.length > 0 ? "agendadas" : "nenhuma")
        : (totalJuris > 0 ? "agendados" : "nenhum"),
      icon: isDefensorCriminalGeral ? CalendarDays : Gavel,
      gradient: "zinc" as const,
    },
  ];

  // Delegações ativas (enviadas pelo defensor)
  const delegacoesAtivas = useMemo(() => {
    return delegacoesEnviadas.filter((d: any) =>
      d.status === "pendente" || d.status === "aceita" || d.status === "em_andamento" || d.status === "aguardando_revisao"
    ).slice(0, 5);
  }, [delegacoesEnviadas]);

  // ==========================================
  // DASHBOARD POR PERFIL (estagiário, servidor, triagem)
  // ==========================================

  const supervisorName = useMemo(() => {
    if (!currentUserData || user?.role !== "estagiario") return undefined;
    const supervisorId = (currentUserData as any)?.supervisorId;
    if (!supervisorId) return undefined;
    const supervisor = profissionalAtivo?.id === supervisorId ? profissionalAtivo.nome : undefined;
    return supervisor || "Defensor";
  }, [currentUserData, user, profissionalAtivo]);

  const delegacoesFormatadas = useMemo(() => {
    return minhasDelegacoes.map((d: any) => ({
      id: d.id,
      titulo: d.instrucoes?.slice(0, 60) || "Tarefa delegada",
      instrucoes: d.instrucoes,
      status: d.status || "pendente",
      prazoSugerido: d.prazoSugerido,
      delegadoDeNome: d.delegadoDe?.name || "Defensor",
      assistidoNome: d.demanda?.assistido?.nome,
      processoNumero: d.demanda?.processo?.numeroAutos,
    }));
  }, [minhasDelegacoes]);

  // Painel dedicado para servidora (Amanda)
  if (!loadingUser && user?.role === "servidor") {
    return <PainelServidor user={user} />;
  }

  if (!loadingUser && isPerfilAlternativo) {
    return (
      <DashboardPorPerfil
        userRole={user?.role as UserRole || "defensor"}
        userName={user?.name}
        supervisorName={supervisorName}
        demandas={demandasFiltradas}
        delegacoes={delegacoesFormatadas}
        assistidos={assistidos}
        processos={processos}
        audiencias={audiencias}
        isLoading={loadingDemandas || loadingAssistidos || loadingDelegacoes}
      />
    );
  }

  // ==========================================
  // DASHBOARD PRINCIPAL (Defensores)
  // ==========================================

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">

      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <Briefcase className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Dashboard</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Painel de atividades</p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-7 px-2.5 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nova
          </Button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* ===== GRID: REGISTRO RÁPIDO + EQUIPE & COWORK ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-[5fr_3fr] gap-4 items-start">

        {/* ===== 1. REGISTRO RÁPIDO ===== */}
        <Card className="group/card relative bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300 hover:border-zinc-700">
          <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100">Registro Rápido</h3>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Atendimento</span>
            </div>
          </div>
          <div className="p-4 space-y-3">

            {/* Assistido */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Assistido</label>
              <Popover open={assistidoSearchOpen} onOpenChange={setAssistidoSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={assistidoSearchOpen}
                    className="w-full h-9 justify-between text-sm bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-100 focus:ring-emerald-500/20 transition-all duration-200"
                  >
                    {atendimentoRapido.assistidoId ? (
                      <span className="flex items-center gap-2 truncate">
                        <User className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="truncate text-zinc-100">{atendimentoRapido.assistidoNome}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-500 flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Buscar por nome, CPF ou vulgo...
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Digite o nome, CPF ou vulgo..."
                      value={assistidoSearchQuery}
                      onValueChange={setAssistidoSearchQuery}
                      className="h-10"
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-4 text-center">
                          <User className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                          <p className="text-sm text-zinc-500">Nenhum assistido encontrado</p>
                          <Link href="/admin/assistidos/novo">
                            <Button variant="link" size="sm" className="mt-2 text-emerald-600">
                              <Plus className="w-3 h-3 mr-1" />
                              Cadastrar novo
                            </Button>
                          </Link>
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading="Assistidos">
                        {assistidosFiltrados.map((assistido: any) => (
                          <CommandItem
                            key={assistido.id}
                            value={assistido.nome}
                            onSelect={() => {
                              setAtendimentoRapido(prev => ({
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
                              <AvatarImage src={assistido.photoUrl || ""} />
                              <AvatarFallback className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                {assistido.nome?.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{assistido.nome}</p>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                {assistido.vulgo && <span>({assistido.vulgo})</span>}
                                {assistido.situacaoPrisional === "PRESO" && (
                                  <Badge variant="outline" className="h-4 px-1 text-[9px] border-red-300 text-red-600">
                                    <Lock className="w-2.5 h-2.5 mr-0.5" />
                                    Preso
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {atendimentoRapido.assistidoId === assistido.id && (
                              <Check className="w-4 h-4 text-emerald-500" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Card do Assistido Selecionado */}
            {assistidoSelecionado && (
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarImage src={assistidoSelecionado.photoUrl || ""} />
                  <AvatarFallback className="text-[9px] bg-emerald-900 text-emerald-300">
                    {assistidoSelecionado.nome?.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-300 truncate">
                    {assistidoSelecionado.nome}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    {assistidoSelecionado.situacaoPrisional === "PRESO" && (
                      <span className="flex items-center gap-0.5 text-rose-400">
                        <Lock className="w-2 h-2" /> Preso
                      </span>
                    )}
                    {processosDoAssistido.length > 0 && (
                      <span className="text-emerald-500">
                        {processosDoAssistido.length} processo{processosDoAssistido.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-zinc-600 hover:text-rose-400 flex-shrink-0"
                  onClick={() => setAtendimentoRapido(prev => ({ ...prev, assistidoId: null, assistidoNome: "", processoId: null }))}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Tipo de Registro */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">Tipo</label>
              <div className="flex flex-wrap gap-1.5">
                {tiposRegistro.map((tipo) => {
                  const Icon = tipo.icon;
                  const isSelected = atendimentoRapido.tipo === tipo.id;
                  const isDelegacao = tipo.id === "delegacao";
                  return (
                    <button
                      key={tipo.id}
                      onClick={() => {
                        if (isDelegacao) {
                          setPedidoTrabalhoModalOpen(true);
                        } else {
                          setAtendimentoRapido(prev => ({ ...prev, tipo: tipo.id as typeof prev.tipo }));
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                        isSelected && !isDelegacao
                          ? `${tipo.bgActive} ${tipo.color} border border-transparent`
                          : isDelegacao
                            ? "border border-zinc-700 hover:border-rose-700 bg-zinc-900 text-rose-400 hover:bg-rose-900/20"
                            : "border border-zinc-800 hover:border-zinc-600 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                      }`}
                      title={tipo.label}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected && !isDelegacao ? tipo.color : isDelegacao ? "text-rose-400" : "text-zinc-500"}`} />
                      <span className="hidden sm:inline">{tipo.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">Descrição</label>
              <Textarea
                placeholder={
                  atendimentoRapido.tipo === "atendimento" ? "Descreva o atendimento realizado..." :
                  atendimentoRapido.tipo === "diligencia" ? "Descreva a diligência ou busca..." :
                  atendimentoRapido.tipo === "informacao" ? "Registre a informação obtida..." :
                  atendimentoRapido.tipo === "peticao" ? "Descreva a petição protocolada..." :
                  "Adicione sua anotação..."
                }
                value={atendimentoRapido.descricao}
                onChange={(e) => setAtendimentoRapido(prev => ({ ...prev, descricao: e.target.value }))}
                rows={3}
                className="w-full text-sm bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 resize-none focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
              />
            </div>

            {/* Detalhes opcionais (colapsável) */}
            <div>
              <button
                onClick={() => setShowDetalhes(!showDetalhes)}
                className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-600 hover:text-zinc-400 uppercase tracking-wide transition-colors"
              >
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showDetalhes ? "rotate-180" : ""}`} />
                Detalhes opcionais
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showDetalhes ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">Processo vinculado</label>
                    <select
                      value={atendimentoRapido.processoId || ""}
                      onChange={(e) => setAtendimentoRapido(prev => ({ ...prev, processoId: e.target.value ? Number(e.target.value) : null }))}
                      disabled={!atendimentoRapido.assistidoId || processosDoAssistido.length === 0}
                      className="w-full h-8 text-xs rounded-md border border-zinc-700 bg-zinc-800 text-zinc-300 px-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:opacity-40 transition-colors"
                    >
                      <option value="">
                        {!atendimentoRapido.assistidoId ? "Selecione um assistido primeiro" :
                         processosDoAssistido.length === 0 ? "Nenhum processo" :
                         "Selecionar processo..."}
                      </option>
                      {processosDoAssistido.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.numeroAutos || `Processo #${p.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">Prazo</label>
                    <input
                      type="date"
                      value={atendimentoRapido.prazo}
                      onChange={(e) => setAtendimentoRapido(prev => ({ ...prev, prazo: e.target.value }))}
                      className="w-full h-8 text-xs rounded-md border border-zinc-700 bg-zinc-800 text-zinc-300 px-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Submit */}
            <Button
              className="w-full h-9 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-none transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={!atendimentoRapido.assistidoId || !atendimentoRapido.descricao.trim()}
              onClick={() => {
                if (atendimentoRapido.assistidoId && atendimentoRapido.descricao.trim()) {
                  const tipoLabel = tiposRegistro.find(t => t.id === atendimentoRapido.tipo)?.label || "Registro";
                  toast.success(`${tipoLabel} de ${atendimentoRapido.assistidoNome} registrado!`);
                  setAtendimentoRapido({ assistidoId: null, assistidoNome: "", tipo: "atendimento", descricao: "", processoId: null, prazo: "" });
                  setShowDetalhes(false);
                } else {
                  toast.error("Selecione um assistido e descreva o registro");
                }
              }}
            >
              <Send className="w-3.5 h-3.5 mr-2" />
              {!atendimentoRapido.assistidoId
                ? "Selecione um assistido"
                : !atendimentoRapido.descricao.trim()
                ? "Adicione uma descrição"
                : `Registrar ${tiposRegistro.find(t => t.id === atendimentoRapido.tipo)?.label || "Registro"}`}
            </Button>
          </div>
        </Card>

        {/* ===== 2. EQUIPE & COWORK ===== */}
        <Card className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300 hover:border-zinc-700">
          <div className="px-4 py-3 border-b border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">Equipe & Cowork</h3>
                {delegacoesAtivas.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                    {delegacoesAtivas.length} ativa{delegacoesAtivas.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800"
                onClick={() => setPedidoTrabalhoModalOpen(true)}
              >
                <Send className="w-3 h-3 mr-1" />
                Delegar
              </Button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {/* Atalhos Cowork */}
            <div className="p-3 pb-2">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: FileEdit, label: "Pedir Minuta", desc: "Elaborar peça", onClick: () => { setPedidoTrabalhoModalOpen(true); } },
                  { icon: BookOpen, label: "Pedir Parecer", desc: "Consulta rápida", onClick: () => { setParecerModalOpen(true); } },
                  { icon: Shield, label: "Cobrir Colega", desc: "Cobertura temporária", onClick: () => { setCoberturaModalOpen(true); } },
                  { icon: MessageSquare, label: "Mural", desc: "Notas da equipe", onClick: () => { setMuralSheetOpen(true); } },
                ].map((feat, i) => {
                  const FeatIcon = feat.icon;
                  return (
                    <button
                      key={i}
                      onClick={feat.onClick}
                      className="p-2.5 rounded-lg border text-left transition-all duration-200 bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80 cursor-pointer group"
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <FeatIcon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                        <span className="text-[10px] font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">{feat.label}</span>
                      </div>
                      <p className="text-[9px] text-zinc-600">{feat.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pedidos ativos */}
            {loadingDelegacoesEnviadas ? (
              <div className="px-3 pb-3 space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ) : delegacoesAtivas.length === 0 ? (
              <div className="px-3 pb-4 text-center">
                <UserCheck className="w-7 h-7 mx-auto mb-1.5 text-zinc-700" />
                <p className="text-xs text-zinc-500">Nenhum pedido ativo</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">Delegue trabalho para sua equipe</p>
              </div>
            ) : (
              <div className="border-t border-zinc-800">
                <div className="px-3 pt-2 pb-1">
                  <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wide">Pedidos ativos</p>
                </div>
                <div className="divide-y divide-zinc-800/60">
                  {delegacoesAtivas.map((deleg: any) => {
                    const tipoIcons: Record<string, any> = {
                      minuta: FileEdit,
                      atendimento: UserCheck,
                      diligencia: Search,
                      analise: BookOpen,
                      outro: Send,
                      delegacao_generica: Send,
                    };
                    const TipoIcon = tipoIcons[deleg.tipo || "delegacao_generica"] || Send;

                    const statusConfig: Record<string, { label: string; color: string }> = {
                      pendente: { label: "Pendente", color: "bg-amber-500/15 text-amber-400" },
                      aceita: { label: "Aceita", color: "bg-blue-500/15 text-blue-400" },
                      em_andamento: { label: "Em andamento", color: "bg-zinc-700 text-zinc-300" },
                      aguardando_revisao: { label: "Aguard. revisão", color: "bg-violet-500/15 text-violet-400" },
                    };
                    const status = statusConfig[deleg.status] || { label: deleg.status, color: "bg-zinc-800 text-zinc-500" };

                    const assistidoName = deleg.assistido?.nome || deleg.demanda?.assistido?.nome || "";

                    return (
                      <div key={deleg.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-zinc-900/80 transition-colors">
                        <div className="w-7 h-7 rounded-md bg-zinc-800 flex items-center justify-center flex-shrink-0">
                          <TipoIcon className="w-3 h-3 text-zinc-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-300 truncate">
                            {deleg.instrucoes?.slice(0, 50) || "Pedido de trabalho"}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                            <span>{deleg.delegadoPara?.name || "Equipe"}</span>
                            {assistidoName && (
                              <>
                                <span>·</span>
                                <span className="truncate">{assistidoName}</span>
                              </>
                            )}
                            {deleg.prazoSugerido && (
                              <>
                                <span>·</span>
                                <span>{format(new Date(deleg.prazoSugerido), "dd/MM", { locale: ptBR })}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {delegacoesAtivas.length >= 5 && (
                  <div className="px-3 py-2 border-t border-zinc-800">
                    <Link href="/admin/delegacoes" className="text-[10px] text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
                      Ver todos os pedidos →
                    </Link>
                  </div>
                )}
              </div>
            )}
          {/* Pareceres aguardando resposta */}
          <ParecerRecebidoSection />
          </div>
        </Card>

        </div>{/* fim grid Registro + Equipe */}

        {/* ===== 3. KPI CARDS (todos zinc) ===== */}
        <KPIGrid columns={4}>
          {statsData.map((stat, index) => (
            <KPICardPremium
              key={index}
              title={stat.title}
              value={stat.value}
              subtitle={stat.subtitle}
              icon={stat.icon}
              gradient={stat.gradient}
              size="sm"
            />
          ))}
        </KPIGrid>

        {/* ===== 4. ALERTA CRÍTICO - Réu Preso com Prazo Vencido ===== */}
        {estatisticasPrazos.reuPresoVencido > 0 && (
          <Card className="border-red-500 bg-red-50 dark:bg-red-950/50 animate-pulse">
            <div className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/50">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-800 dark:text-red-200">
                    ATENÇÃO: {estatisticasPrazos.reuPresoVencido} prazo{estatisticasPrazos.reuPresoVencido > 1 ? "s" : ""} de RÉU PRESO vencido{estatisticasPrazos.reuPresoVencido > 1 ? "s" : ""}!
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    Prioridade máxima - verificar imediatamente
                  </p>
                </div>
                <Link href="/admin/demandas?filtro=reuPreso">
                  <Button size="sm" variant="destructive" className="h-8">
                    Ver agora
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* ===== 5. PRAZOS COM AÇÃO RÁPIDA ===== */}
        <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Prazos</h3>
                {estatisticasPrazos.vencidos > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-semibold">
                    {estatisticasPrazos.vencidos} vencido{estatisticasPrazos.vencidos > 1 ? "s" : ""}
                  </span>
                )}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                  {demandasPorPrazo.length} total
                </span>
              </div>
              <Link href="/admin/demandas">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-emerald-600">
                  Ver todas <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[360px] overflow-y-auto">
            {loadingDemandas ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : demandasPorPrazo.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm text-zinc-500">Nenhum prazo urgente</p>
              </div>
            ) : (
              demandasPorPrazo.map((demanda: any) => {
                const prazoInfo = formatPrazo(demanda.prazo);
                const isVencido = prazoInfo.vencido;
                const isReuPresoCritico = demanda.reuPreso && (isVencido || prazoInfo.diasRestantes === 0);
                const atribuicao = demanda.processo?.atribuicao;
                const atColors = getAtribuicaoColors(atribuicao);

                return (
                  <div key={demanda.id} className={cn(
                    "flex items-center gap-3 px-3 py-2.5 transition-colors border-l-2",
                    isReuPresoCritico
                      ? "bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 border-l-red-500"
                      : `${atColors.border} hover:bg-zinc-50 dark:hover:bg-zinc-800/50`
                  )}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isReuPresoCritico ? "bg-red-600 animate-pulse" :
                      isVencido ? "bg-rose-400" :
                      prazoInfo.cor === "red" ? "bg-red-500" :
                      prazoInfo.cor === "yellow" ? "bg-amber-500" : "bg-zinc-400"
                    }`} />
                    <Link href={`/admin/demandas/${demanda.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm font-medium truncate ${
                          isReuPresoCritico ? "text-red-700 dark:text-red-300" : "text-zinc-800 dark:text-zinc-200"
                        }`}>
                          {demanda.assistido?.nome || demanda.assistidoNome || "Sem assistido"}
                        </p>
                        {demanda.reuPreso && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                            <Lock className="w-2.5 h-2.5 mr-0.5" />
                            PRESO
                          </span>
                        )}
                        {atribuicao && (
                          <span className={cn("text-[9px] px-1 py-0.5 rounded-full font-medium", atColors.bgSolid, atColors.text)}>
                            {atColors.shortLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">{demanda.ato}</p>
                    </Link>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Botão de ação rápida de status */}
                      <QuickStatusButton
                        demandaId={demanda.id}
                        currentSubstatus={demanda.substatus}
                        onUpdate={handleQuickStatusUpdate}
                      />
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                        isReuPresoCritico
                          ? "bg-red-200 dark:bg-red-900/60 text-red-700 dark:text-red-300 animate-pulse"
                          : isVencido
                          ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                          : prazoInfo.cor === "red"
                          ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                          : prazoInfo.cor === "yellow"
                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                      }`}>
                        {prazoInfo.texto}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* ===== 6. AUDIÊNCIAS/JÚRIS (full-width) ===== */}
        {isDefensorCriminalGeral ? (
          /* Criminal Geral: Minhas Audiências */
          <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-zinc-500" />
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Minhas Audiências</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                    {audienciasExibir.length}
                  </span>
                </div>
                <Link href="/admin/agenda">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-emerald-600">
                    Ver agenda <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto">
              {loadingAudiencias ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : audienciasExibir.length === 0 ? (
                <div className="p-6 text-center">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                  <p className="text-sm text-zinc-500">Nenhuma audiência agendada</p>
                </div>
              ) : (
                audienciasExibir.map((aud: any) => {
                  const dataAud = aud.dataHora ? new Date(aud.dataHora) : null;
                  const isHoje = dataAud && isToday(dataAud);
                  const isAmanha = dataAud && isTomorrow(dataAud);
                  const diasRestantes = dataAud ? differenceInDays(dataAud, new Date()) : null;

                  return (
                    <Link href={`/admin/audiencias/${aud.id}`} key={aud.id}>
                      <div className="flex items-center gap-3 px-3 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                          isHoje ? "bg-rose-100 dark:bg-rose-900/30" :
                          isAmanha ? "bg-amber-100 dark:bg-amber-900/30" :
                          "bg-zinc-100 dark:bg-zinc-800"
                        }`}>
                          <span className={`text-sm font-bold ${
                            isHoje ? "text-rose-700 dark:text-rose-400" :
                            isAmanha ? "text-amber-700 dark:text-amber-400" :
                            "text-zinc-700 dark:text-zinc-300"
                          }`}>
                            {dataAud ? format(dataAud, "dd", { locale: ptBR }) : "--"}
                          </span>
                          <span className="text-[9px] text-zinc-500 uppercase">
                            {dataAud ? format(dataAud, "MMM", { locale: ptBR }) : ""}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            {aud.assistidoNome || aud.titulo || "Audiência"}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                            <span>{dataAud ? format(dataAud, "HH:mm") : "—"}</span>
                            <span>•</span>
                            <span className="truncate">{aud.tipo || aud.tipoAudiencia || "Audiência"}</span>
                          </div>
                        </div>
                        {aud.reuPreso && <Lock className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />}
                        {aud.status && (aud.status === "cancelada" || aud.status === "CANCELADA") && (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                        {aud.status && (aud.status === "reagendada" || aud.status === "REDESIGNADA") && (
                          <RefreshCw className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        )}
                        {aud.status && (aud.status === "realizada" || aud.status === "REALIZADA") && (
                          <CircleCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        )}
                        {diasRestantes !== null && (
                          <span className={`text-[10px] font-semibold px-2 py-1 rounded ${
                            diasRestantes <= 0 ? "bg-rose-500 text-white" :
                            diasRestantes <= 3 ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" :
                            diasRestantes <= 7 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                            "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                          }`}>
                            {diasRestantes <= 0 ? "HOJE" : diasRestantes === 1 ? "Amanhã" : `${diasRestantes} dias`}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </Card>
        ) : (
          /* Especializado: Próximos Júris + Audiências */
          <>
            <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-zinc-500" />
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Próximos Júris</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                      {jurisProximos.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5">
                      {[
                        { id: "todos", label: "Todos" },
                        { id: "rodrigo", label: "Dr. Rodrigo" },
                        { id: "juliane", label: "Dra. Juliane" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setFiltroDefensorJuri(opt.id as typeof filtroDefensorJuri)}
                          className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                            filtroDefensorJuri === opt.id
                              ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm"
                              : "text-zinc-500 hover:text-zinc-700"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <Link href="/admin/juri">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loadingJuris ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : jurisProximos.length === 0 ? (
                  <div className="p-6 text-center">
                    <Gavel className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                    <p className="text-sm text-zinc-500">Nenhum júri agendado</p>
                  </div>
                ) : (
                  jurisProximos.map((juri: any) => {
                    const dataSessao = juri.dataSessao ? new Date(juri.dataSessao) : null;
                    const diasRestantes = dataSessao ? differenceInDays(dataSessao, new Date()) : null;

                    return (
                      <Link href={`/admin/juri/${juri.id}`} key={juri.id}>
                        <div className="flex items-center gap-3 px-3 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                            diasRestantes !== null && diasRestantes <= 3 ? "bg-rose-100 dark:bg-rose-900/30" :
                            diasRestantes !== null && diasRestantes <= 7 ? "bg-amber-100 dark:bg-amber-900/30" :
                            "bg-zinc-100 dark:bg-zinc-800"
                          }`}>
                            <span className={`text-sm font-bold ${
                              diasRestantes !== null && diasRestantes <= 3 ? "text-rose-700 dark:text-rose-400" :
                              diasRestantes !== null && diasRestantes <= 7 ? "text-amber-700 dark:text-amber-400" :
                              "text-zinc-700 dark:text-zinc-300"
                            }`}>
                              {dataSessao ? format(dataSessao, "dd", { locale: ptBR }) : "--"}
                            </span>
                            <span className="text-[9px] text-zinc-500 uppercase">
                              {dataSessao ? format(dataSessao, "MMM", { locale: ptBR }) : ""}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                              {juri.assistidoNome || "Réu"}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                              <span>{juri.horario || "Horário a definir"}</span>
                              {juri.defensorNome && (
                                <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                                  {juri.defensorNome}
                                </span>
                              )}
                            </div>
                          </div>
                          {juri.status === "CANCELADA" && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                          {juri.status === "REDESIGNADA" && <RefreshCw className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                          {juri.status === "REALIZADA" && <CircleCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                          {diasRestantes !== null && (
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded ${
                              diasRestantes <= 0 ? "bg-rose-500 text-white" :
                              diasRestantes <= 3 ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" :
                              diasRestantes <= 7 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                              "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                            }`}>
                              {diasRestantes <= 0 ? "HOJE" : diasRestantes === 1 ? "Amanhã" : `${diasRestantes} dias`}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </Card>

            {/* AUDIÊNCIAS DA SEMANA */}
            <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-zinc-500" />
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      {mostrandoAlemDaSemana ? "Próximas Audiências" : "Audiências da Semana"}
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                      {audienciasExibir.length}
                    </span>
                  </div>
                  <Link href="/admin/agenda">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-emerald-600">
                      Ver agenda <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto">
                {loadingAudiencias ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : audienciasExibir.length === 0 ? (
                  <div className="p-6 text-center">
                    <CalendarDays className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                    <p className="text-sm text-zinc-500">Nenhuma audiência agendada</p>
                  </div>
                ) : (
                  audienciasExibir.map((aud: any, index: number) => {
                    const dataAud = aud.dataHora ? new Date(aud.dataHora) : null;
                    const isHoje = dataAud && isToday(dataAud);
                    const isAmanha = dataAud && isTomorrow(dataAud);
                    const estaSemana = dataAud && isThisWeek(dataAud, { weekStartsOn: 0 });

                    const dataAnterior = index > 0 && audienciasExibir[index - 1].dataHora
                      ? new Date(audienciasExibir[index - 1].dataHora) : null;
                    const mostrarSeparadorData = !dataAnterior ||
                      (dataAud && format(dataAud, "yyyy-MM-dd") !== format(dataAnterior, "yyyy-MM-dd"));

                    return (
                      <div key={aud.id}>
                        {mostrarSeparadorData && dataAud && (
                          <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50">
                            <span className={`text-[10px] font-medium uppercase tracking-wide ${
                              isHoje ? "text-emerald-600 dark:text-emerald-400" :
                              isAmanha ? "text-amber-600 dark:text-amber-400" :
                              "text-zinc-500"
                            }`}>
                              {isHoje ? "Hoje" :
                               isAmanha ? "Amanhã" :
                               estaSemana ? format(dataAud, "EEEE", { locale: ptBR }) :
                               format(dataAud, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                        <Link href={`/admin/audiencias/${aud.id}`}>
                          <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${
                              aud.processo?.atribuicao === "JURI" ? "bg-emerald-500" :
                              aud.processo?.atribuicao === "VD" ? "bg-amber-500" :
                              aud.processo?.atribuicao === "EP" ? "bg-zinc-500" :
                              "bg-zinc-400"
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                {aud.assistidoNome || aud.titulo || "Audiência"}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                                <span>{dataAud ? format(dataAud, "HH:mm") : "—"}</span>
                                <span>•</span>
                                <span className="truncate">{aud.tipo || aud.tipoAudiencia || "Audiência"}</span>
                              </div>
                            </div>
                            {aud.reuPreso && <Lock className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />}
                            {aud.status && (aud.status === "cancelada" || aud.status === "CANCELADA") && (
                              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            )}
                            {aud.status && (aud.status === "reagendada" || aud.status === "REDESIGNADA") && (
                              <RefreshCw className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            )}
                            {aud.status && (aud.status === "realizada" || aud.status === "REALIZADA") && (
                              <CircleCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            )}
                          </div>
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Modais */}
      <DemandaCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveNewDemanda}
        assistidosOptions={[]}
        atribuicaoOptions={atribuicaoOptions}
        atoOptions={atoOptions}
        statusOptions={statusOptions}
      />

      <DelegacaoModal
        open={delegacaoModalOpen}
        onOpenChange={setDelegacaoModalOpen}
        assistidoId={atendimentoRapido.assistidoId}
        assistidoNome={atendimentoRapido.assistidoNome}
        onDelegacaoSucesso={() => {
          setAtendimentoRapido({ assistidoId: null, assistidoNome: "", tipo: "atendimento", descricao: "", processoId: null, prazo: "" });
          utils.delegacao.delegacoesEnviadas.invalidate();
        }}
      />

      <PedidoTrabalhoModal
        open={pedidoTrabalhoModalOpen}
        onOpenChange={setPedidoTrabalhoModalOpen}
        onSucesso={() => {
          utils.delegacao.delegacoesEnviadas.invalidate();
        }}
      />

      <ParecerModal
        open={parecerModalOpen}
        onOpenChange={setParecerModalOpen}
      />

      <CoberturaModal
        open={coberturaModalOpen}
        onOpenChange={setCoberturaModalOpen}
      />

      <Sheet open={muralSheetOpen} onOpenChange={setMuralSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="p-4 pb-0">
            <SheetTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              Mural da Equipe
            </SheetTitle>
          </SheetHeader>
          <div className="p-4 pt-3 h-full overflow-hidden">
            <MuralEquipe />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
