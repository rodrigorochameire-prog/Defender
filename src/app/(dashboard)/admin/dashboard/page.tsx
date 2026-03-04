"use client";

import { useMemo, useState, useCallback, Fragment } from "react";
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
import { getAtribuicaoColors, ATRIBUICAO_OPTIONS, areaMatchesFilter } from "@/lib/config/atribuicoes";
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
  Sun,
  ExternalLink,
  Mic,
  Radio,
  Sparkles,
  Loader2,
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
// Avatar removido — busca agora usa dots de atribuição
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
import { AudioRecorderButton } from "@/components/shared/audio-recorder";
import { TranscriptViewer } from "@/components/shared/transcript-viewer";
import { EquipeCoworkCard } from "@/components/dashboard/equipe-cowork-card";

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

  const { data: demandas = [], isLoading: loadingDemandas } = trpc.demandas.list.useQuery(
    { limit: 20 },
    { enabled: !!user },
  );

  const { data: assistidos = [], isLoading: loadingAssistidos } = trpc.assistidos.list.useQuery(
    { limit: 20 },
    { enabled: !!user },
  );

  // Solar pendências (stats only, sem lista)
  const { data: solarSync } = trpc.solar.dashboardAssistidosSync.useQuery(
    { limit: 1, offset: 0 },
    { staleTime: 5 * 60 * 1000, enabled: !!user }
  );

  const { data: casos = [], isLoading: loadingCasos } = trpc.casos.list.useQuery(
    { limit: 20 },
    { enabled: !!user },
  );

  const { data: jurisData, isLoading: loadingJuris } = trpc.juri.proximas.useQuery(
    {},
    { enabled: !!user },
  );
  const juris = jurisData ?? [];

  const { data: processos = [] } = trpc.processos.list.useQuery(
    { limit: 20 },
    { enabled: !!user },
  );

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

  // auth.me já é chamado no ProfissionalProvider — React Query dedup via cache key
  const { data: currentUserData } = trpc.auth.me.useQuery();

  const isPerfilAlternativo = user && ["estagiario", "servidor", "triagem"].includes(user.role);
  const isDefensorCriminalGeral = user && user.role === "defensor" && isGrupoVarasCriminais;

  const { data: audienciasData, isLoading: loadingAudiencias } = trpc.audiencias.proximas.useQuery(
    {},
    { enabled: !!user },
  );
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

  const atoOptions = getAtosPorAtribuicao(atribuicaoAtual === "JURI_EP" ? "Tribunal do Júri" : "Violência Doméstica");

  const handleSaveNewDemanda = (_data: DemandaFormData) => {
    // TODO: wire to demandas.create mutation
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
    local: string;
    assunto: string;
  }>({ assistidoId: null, assistidoNome: "", tipo: "atendimento", descricao: "", processoId: null, local: "", assunto: "" });
  const [assistidoSearchOpen, setAssistidoSearchOpen] = useState(false);
  const [assistidoSearchQuery, setAssistidoSearchQuery] = useState("");
  const [atribuicaoFilter, setAtribuicaoFilter] = useState<string>("all");
  const [showDetalhes, setShowDetalhes] = useState(false);

  // Transcrição de áudio
  const [audioTranscript, setAudioTranscript] = useState<string | null>(null);
  const [audioSummary, setAudioSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showTranscriptViewer, setShowTranscriptViewer] = useState(false);
  const [awaitingPlaud, setAwaitingPlaud] = useState(false);

  const createAtendimento = trpc.atendimentos.create.useMutation({
    onSuccess: (created) => {
      const tipoLabel = tiposRegistro.find(t => t.id === atendimentoRapido.tipo)?.label || "Registro";
      const nomeExibicao = atendimentoRapido.assistidoNome || "sem vínculo";
      toast.success(`${tipoLabel} registrado para ${nomeExibicao}`, {
        description: atendimentoRapido.assistidoId
          ? `Ver perfil do assistido`
          : undefined,
        action: atendimentoRapido.assistidoId
          ? { label: "Ver perfil", onClick: () => window.location.href = `/admin/assistidos/${atendimentoRapido.assistidoId}` }
          : undefined,
      });
      setAtendimentoRapido({ assistidoId: null, assistidoNome: "", tipo: "atendimento", descricao: "", processoId: null, local: "", assunto: "" });
      setShowDetalhes(false);
      setAudioTranscript("");
      setAudioSummary("");
      utils.atendimentos.invalidate();
      utils.demandas.list.invalidate();
    },
    onError: (err) => {
      toast.error("Erro ao registrar", { description: err.message });
    },
  });

  const startPlaudRecording = trpc.atendimentos.startPlaudRecording.useMutation({
    onSuccess: () => {
      setAwaitingPlaud(true);
      window.open("plaud://record", "_blank");
      toast.info("Aguardando gravação do Plaud...", {
        description: "Inicie a gravação no Plaud Desktop. A transcrição será vinculada automaticamente ao assistido.",
        duration: 8000,
      });
    },
    onError: (err) => {
      toast.error("Erro ao iniciar gravação Plaud", { description: err.message });
    },
  });

  const handleTranscriptReady = useCallback((text: string) => {
    setAudioTranscript(text);
    setAtendimentoRapido((prev) => ({
      ...prev,
      descricao: prev.descricao
        ? `${prev.descricao}\n\n--- Transcrição ---\n${text}`
        : text,
    }));
    toast.success("Transcrição concluída e inserida na descrição");
  }, []);

  const handleSummarize = useCallback(async () => {
    if (!audioTranscript) return;
    setIsSummarizing(true);
    try {
      const res = await fetch("/api/ai/summarize-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: audioTranscript,
          assistidoNome: atendimentoRapido.assistidoNome || undefined,
        }),
      });
      if (!res.ok) throw new Error("Falha ao gerar resumo");
      const data = await res.json();
      setAudioSummary(data.summary || "");
      toast.success("Resumo jurídico gerado");
    } catch {
      toast.error("Erro ao gerar resumo jurídico");
    } finally {
      setIsSummarizing(false);
    }
  }, [audioTranscript, atendimentoRapido.assistidoNome]);

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
    // Filtrar por atribuição
    const filtradosPorAtribuicao = atribuicaoFilter === "all"
      ? assistidosValidos
      : assistidosValidos.filter((a: any) => areaMatchesFilter(a.atribuicaoPrimaria, atribuicaoFilter));
    if (!assistidoSearchQuery.trim()) return filtradosPorAtribuicao.slice(0, 10);
    const query = assistidoSearchQuery.toLowerCase();
    return filtradosPorAtribuicao
      .filter((a: any) =>
        a.nome?.toLowerCase().includes(query) ||
        a.cpf?.includes(query) ||
        a.vulgo?.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [assistidos, assistidoSearchQuery, atribuicaoFilter]);

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

      {/* Header — Premium hero-style */}
      <div className="relative px-5 md:px-8 py-6 md:py-8 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
        {/* Subtle gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-transparent to-transparent dark:from-emerald-950/20 dark:via-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg ring-4 ring-zinc-900/5 dark:ring-white/10">
              <Briefcase className="w-5.5 h-5.5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">Dashboard</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Painel de atividades e acompanhamento</p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-9 px-4 bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-emerald-500 dark:hover:text-white text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Demanda
          </Button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="p-5 md:p-8 space-y-6 md:space-y-8">

        {/* ===== 1. REGISTRO RÁPIDO (full-width, stacked rows) ===== */}
        <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-apple dark:shadow-apple-dark transition-all duration-200 hover:shadow-apple-hover dark:hover:shadow-apple-dark-hover">
          {/* Accent top bar */}
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-md">
              <Plus className="w-4 h-4 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">Registro Rápido</h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Atendimento, diligência ou anotação</p>
            </div>
          </div>

          <div className="p-5 space-y-4">

            {/* Row 1 — Assistido + Tipo lado a lado */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-1.5">
              {/* Row 1 — Busca de Assistido */}
              <Popover open={assistidoSearchOpen} onOpenChange={setAssistidoSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={assistidoSearchOpen}
                    className={cn(
                      "w-full h-9 justify-between text-sm transition-all duration-200",
                      atendimentoRapido.assistidoId
                        ? cn(
                            getAtribuicaoColors(assistidoSelecionado?.atribuicaoPrimaria).bg,
                            getAtribuicaoColors(assistidoSelecionado?.atribuicaoPrimaria).border.replace("border-l-", "border-"),
                            "hover:opacity-90"
                          )
                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-700"
                    )}
                  >
                    {atendimentoRapido.assistidoId ? (
                      <span className="flex items-center gap-2 truncate">
                        <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", getAtribuicaoColors(assistidoSelecionado?.atribuicaoPrimaria).dot)} />
                        <span className={cn("truncate font-medium", getAtribuicaoColors(assistidoSelecionado?.atribuicaoPrimaria).text)}>{atendimentoRapido.assistidoNome}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-400 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5" />
                        Nome, CPF ou vulgo...
                      </span>
                    )}
                    {atendimentoRapido.assistidoId ? (
                      <span
                        role="button"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setAtendimentoRapido(prev => ({ ...prev, assistidoId: null, assistidoNome: "", processoId: null }));
                        }}
                        className="ml-2 h-4 w-4 shrink-0 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </span>
                    ) : (
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  {/* Chips de filtro por atribuição */}
                  <div className="flex gap-1 p-2 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto">
                    {ATRIBUICAO_OPTIONS.map((opt) => {
                      const colors = getAtribuicaoColors(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setAtribuicaoFilter(opt.value)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors",
                            atribuicaoFilter === opt.value
                              ? cn(colors.bgSolid, colors.text)
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                          )}
                        >
                          {opt.value !== "all" && <span className={cn("w-1.5 h-1.5 rounded-full", colors.dot)} />}
                          {opt.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                  <Command>
                    <CommandInput
                      placeholder="Digite o nome, CPF ou vulgo..."
                      value={assistidoSearchQuery}
                      onValueChange={setAssistidoSearchQuery}
                      className="h-10"
                      autoFocus
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
                        {assistidosFiltrados.map((assistido: any) => {
                          const atribColors = getAtribuicaoColors(assistido.atribuicaoPrimaria);
                          return (
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
                            <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", atribColors.dot)} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{assistido.nome}</p>
                                <span className={cn("text-[9px] px-1 py-0.5 rounded flex-shrink-0", atribColors.bgSolid, atribColors.text)}>
                                  {atribColors.shortLabel}
                                </span>
                              </div>
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
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Row 2 — Recentes / Processo */}
              {atendimentoRapido.assistidoId ? (
                <select
                  value={atendimentoRapido.processoId || ""}
                  onChange={(e) => setAtendimentoRapido(prev => ({ ...prev, processoId: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full h-9 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 focus:ring-emerald-500/20 focus:border-emerald-300 dark:focus:border-emerald-700 transition-colors"
                >
                  <option value="">
                    {processosDoAssistido.length === 0 ? "Sem processos vinculados" : "Processo (opcional)"}
                  </option>
                  {processosDoAssistido.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.numeroAutos || `Processo #${p.id}`}
                    </option>
                  ))}
                </select>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-9 justify-between text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:border-emerald-300"
                    >
                      <span className="flex items-center gap-2">
                        <CalendarDays className="w-3.5 h-3.5" />
                        Audiências próximas
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-h-80 overflow-y-auto" align="start">
                    {audienciasExibir.length === 0 ? (
                      <div className="p-4 text-center">
                        <CalendarDays className="w-6 h-6 mx-auto mb-2 text-zinc-300" />
                        <p className="text-xs text-zinc-400">Nenhuma audiência próxima</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {(() => {
                          const hoje = new Date();
                          const fimSemana = addDays(hoje, 7 - hoje.getDay());
                          const estaSemana = audienciasExibir.filter((a: any) => {
                            const d = new Date(a.dataHora);
                            return d <= fimSemana;
                          });
                          const proximaSemana = audienciasExibir.filter((a: any) => {
                            const d = new Date(a.dataHora);
                            return d > fimSemana;
                          });
                          return (
                            <>
                              {estaSemana.length > 0 && (
                                <>
                                  <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide bg-zinc-50 dark:bg-zinc-800/50">
                                    Esta semana
                                  </div>
                                  {estaSemana.map((aud: any) => {
                                    const atribColors = getAtribuicaoColors(aud.processo?.atribuicao);
                                    return (
                                      <button
                                        key={aud.id}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors text-left"
                                        onClick={() => {
                                          if (aud.assistido?.id) {
                                            setAtendimentoRapido(prev => ({
                                              ...prev,
                                              assistidoId: aud.assistido.id,
                                              assistidoNome: aud.assistido.nome || "",
                                              processoId: aud.processo?.id || null,
                                            }));
                                          }
                                        }}
                                      >
                                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", atribColors.dot)} />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                                              {format(new Date(aud.dataHora), "dd/MM HH:mm", { locale: ptBR })}
                                            </span>
                                            <span className={cn("text-[9px] px-1 py-0.5 rounded", atribColors.bgSolid, atribColors.text)}>
                                              {atribColors.shortLabel}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-zinc-500 truncate">
                                            {aud.assistido?.nome || aud.titulo || "Sem assistido"}
                                          </p>
                                        </div>
                                        <span className="text-[10px] text-zinc-400 flex-shrink-0">{aud.tipo}</span>
                                      </button>
                                    );
                                  })}
                                </>
                              )}
                              {proximaSemana.length > 0 && (
                                <>
                                  <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
                                    Próxima semana
                                  </div>
                                  {proximaSemana.map((aud: any) => {
                                    const atribColors = getAtribuicaoColors(aud.processo?.atribuicao);
                                    return (
                                      <button
                                        key={aud.id}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors text-left"
                                        onClick={() => {
                                          if (aud.assistido?.id) {
                                            setAtendimentoRapido(prev => ({
                                              ...prev,
                                              assistidoId: aud.assistido.id,
                                              assistidoNome: aud.assistido.nome || "",
                                              processoId: aud.processo?.id || null,
                                            }));
                                          }
                                        }}
                                      >
                                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", atribColors.dot)} />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                                              {format(new Date(aud.dataHora), "dd/MM HH:mm", { locale: ptBR })}
                                            </span>
                                            <span className={cn("text-[9px] px-1 py-0.5 rounded", atribColors.bgSolid, atribColors.text)}>
                                              {atribColors.shortLabel}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-zinc-500 truncate">
                                            {aud.assistido?.nome || aud.titulo || "Sem assistido"}
                                          </p>
                                        </div>
                                        <span className="text-[10px] text-zinc-400 flex-shrink-0">{aud.tipo}</span>
                                      </button>
                                    );
                                  })}
                                </>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Tipo de Registro (estilo padronizado com Cowork) */}
            <div className="grid grid-cols-3 gap-1.5">
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
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200",
                      isDelegacao
                        ? cn(
                            "border border-rose-200 dark:border-rose-800/50",
                            "bg-rose-50/50 dark:bg-rose-900/10",
                            "hover:bg-rose-50 dark:hover:bg-rose-900/20",
                            "hover:border-rose-300 dark:hover:border-rose-700"
                          )
                        : isSelected
                          ? cn(
                              "border-2 border-emerald-400 dark:border-emerald-600",
                              "bg-emerald-50 dark:bg-emerald-900/20",
                              "shadow-sm shadow-emerald-500/10"
                            )
                          : cn(
                              "border border-zinc-200/80 dark:border-zinc-700",
                              "bg-white dark:bg-zinc-800/50",
                              "hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10",
                              "hover:border-emerald-200 dark:hover:border-emerald-800"
                            )
                    )}
                    title={tipo.label}
                  >
                    <Icon className={cn(
                      "w-3.5 h-3.5",
                      isDelegacao ? "text-rose-500 dark:text-rose-400"
                        : isSelected ? "text-emerald-600 dark:text-emerald-400"
                        : "text-zinc-400"
                    )} />
                    <span className={cn(
                      "text-xs font-medium",
                      isDelegacao ? "text-rose-600 dark:text-rose-400"
                        : isSelected ? "text-emerald-700 dark:text-emerald-300 font-semibold"
                        : "text-zinc-500 dark:text-zinc-400"
                    )}>{tipo.label}</span>
                  </button>
                );
              })}
            </div>
            </div>

            {/* Row 2 — Descrição + Gravação */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Descrição</label>
                <div className="flex items-center gap-0.5">
                  <AudioRecorderButton
                    compact
                    onTranscriptReady={handleTranscriptReady}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 hover:bg-violet-500/10",
                      awaitingPlaud
                        ? "text-amber-500 animate-pulse"
                        : "text-violet-500 hover:text-violet-400"
                    )}
                    title={awaitingPlaud ? "Aguardando gravação do Plaud..." : "Gravar com Plaud Desktop"}
                    disabled={startPlaudRecording.isPending}
                    onClick={() => {
                      if (atendimentoRapido.assistidoId) {
                        startPlaudRecording.mutate({
                          assistidoId: atendimentoRapido.assistidoId,
                          processoId: atendimentoRapido.processoId,
                          tipo: atendimentoRapido.tipo,
                          descricao: atendimentoRapido.descricao || undefined,
                        });
                      } else {
                        window.open("plaud://record", "_blank");
                        toast.info("Plaud Desktop", {
                          description: "Selecione um assistido antes para vincular automaticamente, ou grave e vincule depois em Integrações.",
                          duration: 6000,
                        });
                      }
                    }}
                  >
                    {startPlaudRecording.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Radio className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
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
                className="w-full text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 resize-none focus:ring-emerald-500/20 focus:border-emerald-300 dark:focus:border-emerald-700 transition-colors"
              />
              {/* Ações pós-transcrição */}
              {audioTranscript && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTranscriptViewer(true)}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Mic className="h-3 w-3" />
                    Ver transcrição
                  </button>
                  <button
                    type="button"
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    {isSummarizing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Resumo jurídico IA
                  </button>
                </div>
              )}
            </div>

            {/* Footer: Detalhes opcionais + Botão Submit */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
              <button
                onClick={() => setShowDetalhes(!showDetalhes)}
                className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 uppercase tracking-wide transition-colors"
              >
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showDetalhes ? "rotate-180" : ""}`} />
                Detalhes opcionais
              </button>

              <Button
                size="sm"
                className="h-8 px-4 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-none transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={!atendimentoRapido.descricao.trim() || !atendimentoRapido.assistidoId || createAtendimento.isPending}
                onClick={() => {
                  if (!atendimentoRapido.assistidoId) {
                    toast.error("Selecione um assistido para registrar");
                    return;
                  }
                  if (!atendimentoRapido.descricao.trim()) {
                    toast.error("Adicione uma descrição ao registro");
                    return;
                  }
                  createAtendimento.mutate({
                    assistidoId: atendimentoRapido.assistidoId,
                    tipo: atendimentoRapido.tipo,
                    resumo: atendimentoRapido.descricao.trim(),
                    dataAtendimento: new Date().toISOString(),
                    ...(atendimentoRapido.processoId ? { processoId: atendimentoRapido.processoId } : {}),
                    ...(atendimentoRapido.local ? { local: atendimentoRapido.local } : {}),
                    ...(atendimentoRapido.assunto ? { assunto: atendimentoRapido.assunto.trim() } : {}),
                    status: "realizado",
                  });
                }}
              >
                {createAtendimento.isPending ? (
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                ) : (
                  <Send className="w-3 h-3 mr-1.5" />
                )}
                {!atendimentoRapido.assistidoId
                  ? "Selecione um assistido"
                  : !atendimentoRapido.descricao.trim()
                    ? "Adicione uma descrição"
                    : createAtendimento.isPending
                      ? "Registrando..."
                      : `Registrar ${tiposRegistro.find(t => t.id === atendimentoRapido.tipo)?.label || "Registro"}`}
              </Button>
            </div>

            {/* Detalhes opcionais (colapsável) */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showDetalhes ? "max-h-40 opacity-100 mt-3" : "max-h-0 opacity-0"}`}>
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Local</label>
                  <select
                    value={atendimentoRapido.local}
                    onChange={(e) => setAtendimentoRapido(prev => ({ ...prev, local: e.target.value }))}
                    className="w-full h-8 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 focus:ring-emerald-500/20 focus:border-emerald-300 dark:focus:border-emerald-700 transition-colors"
                  >
                    <option value="">Não informado</option>
                    <option value="Presencial">Presencial</option>
                    <option value="Virtual">Virtual</option>
                    <option value="Telefone">Telefone</option>
                    <option value="Externo">Externo (diligência)</option>
                    <option value="Fórum">Fórum</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Assunto</label>
                  <input
                    type="text"
                    placeholder="Ex: Instrução, Acordo, Alvará..."
                    value={atendimentoRapido.assunto}
                    onChange={(e) => setAtendimentoRapido(prev => ({ ...prev, assunto: e.target.value }))}
                    className="w-full h-8 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 focus:ring-emerald-500/20 focus:border-emerald-300 dark:focus:border-emerald-700 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ===== 2. EQUIPE & COWORK ===== */}
        <EquipeCoworkCard
          delegacoesAtivas={delegacoesAtivas.length}
          muralNaoLidas={0}
          equipeMembros={3}
          coberturasAtivas={0}
          pareceresPendentes={0}
          pendentesCount={delegacoesAtivas.filter((d: any) => d.status === 'pendente').length}
          prazosEstaSemana={estatisticasPrazos.venceHoje + estatisticasPrazos.proximosDias}
          atividades={delegacoesAtivas.slice(0, 5).map((d: any, i: number) => ({
            id: d.id || i,
            texto: d.instrucoes?.slice(0, 60) || "Pedido de trabalho",
            tempo: d.createdAt ? format(new Date(d.createdAt), "dd/MM", { locale: ptBR }) : "",
            tipo: d.status === "aceita" ? "aceita" as const : "andamento" as const,
            autor: { nome: d.delegadoPara?.name || "Equipe", iniciais: (d.delegadoPara?.name || "E")[0] },
          }))}
          onPedidoTrabalho={() => setPedidoTrabalhoModalOpen(true)}
          onParecer={() => setParecerModalOpen(true)}
          onCobertura={() => setCoberturaModalOpen(true)}
          onMural={() => setMuralSheetOpen(true)}
        />

        {/* fim seção Registro + Equipe (agora stacked, sem grid) */}

        {/* ===== PENDÊNCIAS SOLAR (condicional) ===== */}
        {solarSync && (solarSync.stats.pending > 0 || solarSync.stats.errors > 0) && (
          <Card className="group/solar relative bg-white dark:bg-zinc-900 border border-amber-200/60 dark:border-amber-800/30 rounded-2xl overflow-hidden hover:border-amber-300 dark:hover:border-amber-700/50 transition-all duration-300 shadow-apple dark:shadow-apple-dark">
            <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">
                    Pendências Solar
                  </h3>
                </div>
                <Link href="/admin/intimacoes?tab=assistidos">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-amber-600">
                    Ver todos <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {/* Pendentes de exportação */}
                <div className="text-center p-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/10">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {solarSync.stats.pending}
                  </p>
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Pendentes
                  </p>
                </div>

                {/* Erros de exportação */}
                <div className="text-center p-2 rounded-lg bg-rose-50/50 dark:bg-rose-900/10">
                  <p className={cn(
                    "text-lg font-bold",
                    solarSync.stats.errors > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-zinc-400 dark:text-zinc-600"
                  )}>
                    {solarSync.stats.errors}
                  </p>
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Erros
                  </p>
                </div>

                {/* Cobertura */}
                <div className="text-center p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {solarSync.stats.total > 0
                      ? Math.round((solarSync.stats.exportedSolar / solarSync.stats.total) * 100)
                      : 0}%
                  </p>
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Cobertura
                  </p>
                </div>

                {/* Sem CPF */}
                <div className="text-center p-2 rounded-lg bg-zinc-50/50 dark:bg-zinc-800/50">
                  <p className={cn(
                    "text-lg font-bold",
                    solarSync.stats.noCpf > 0
                      ? "text-zinc-600 dark:text-zinc-400"
                      : "text-zinc-400 dark:text-zinc-600"
                  )}>
                    {solarSync.stats.noCpf}
                  </p>
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Sem CPF
                  </p>
                </div>
              </div>

              {/* Progress bar cobertura */}
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] text-zinc-400">
                    {solarSync.stats.exportedSolar}/{solarSync.stats.total} assistidos no Solar
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${solarSync.stats.total > 0
                        ? Math.round((solarSync.stats.exportedSolar / solarSync.stats.total) * 100)
                        : 0}%`,
                    }}
                  />
                </div>

                {/* Ações */}
                <div className="mt-2 flex justify-end">
                  <Link href="/admin/intimacoes?tab=assistidos&action=export">
                    <Button variant="outline" size="sm" className="h-7 text-xs text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:hover:border-amber-700 dark:hover:bg-amber-900/20">
                      <RefreshCw className="w-3 h-3 mr-1.5" />
                      Exportar em lote
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ===== STATS RIBBON ===== */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-5 rounded-full bg-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Resumo</h2>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 text-xs overflow-x-auto scrollbar-none shadow-sm">
            {statsData.map((stat, index) => {
              const Icon = stat.icon;
              const isAlert = stat.gradient === "rose" || stat.gradient === "amber";
              const hasValue = Number(String(stat.value).replace('%','')) > 0 && stat.value !== "...";
              return (
                <Fragment key={index}>
                  {index > 0 && <div className="w-px h-4 bg-zinc-200/60 dark:bg-zinc-700/60 flex-shrink-0" />}
                  <div className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-lg transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800",
                    isAlert && hasValue ? "bg-rose-50 dark:bg-rose-950/20" : ""
                  )}>
                    <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", isAlert && hasValue ? "text-rose-500 dark:text-rose-400" : "text-zinc-400 dark:text-zinc-500")} />
                    <span className={cn("font-bold tabular-nums", isAlert && hasValue ? "text-rose-600 dark:text-rose-400" : "text-zinc-800 dark:text-zinc-100")}>{stat.value}</span>
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">{stat.title.toLowerCase()}</span>
                  </div>
                </Fragment>
              );
            })}
            <div className="flex-1" />
            <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px] tabular-nums whitespace-nowrap">{totalDemandas} demandas</span>
          </div>
        </div>

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

        {/* ===== 5. PRAZOS + JÚRIS ===== */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-5 rounded-full bg-rose-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Prazos & Agenda</h2>
          </div>
        <div className={cn("grid gap-6", isDefensorCriminalGeral ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>

        {/* PRAZOS COM AÇÃO RÁPIDA */}
        <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-apple dark:shadow-apple-dark transition-all duration-200 hover:shadow-apple-hover dark:hover:shadow-apple-dark-hover">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                </div>
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">Prazos</h3>
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
                <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-emerald-600 transition-colors cursor-pointer">
                  Ver todas <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="divide-y divide-zinc-100/80 dark:divide-zinc-800/60 max-h-[420px] overflow-y-auto">
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

                // Cor da barra lateral de atribuição
                const barColor = isReuPresoCritico
                  ? "bg-red-500"
                  : atColors.bgSolid || "bg-zinc-300 dark:bg-zinc-600";

                return (
                  <Link
                    href={`/admin/demandas/${demanda.id}`}
                    key={demanda.id}
                    className={cn(
                      "flex items-stretch gap-0 transition-colors group",
                      isReuPresoCritico
                        ? "bg-red-50/60 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    )}
                  >
                    {/* Barra de cor de atribuição */}
                    <div className={cn("w-1.5 flex-shrink-0 rounded-r my-2 ml-0.5", barColor)} />

                    <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className={`text-[13px] font-semibold truncate leading-tight ${
                            isReuPresoCritico ? "text-red-700 dark:text-red-300" : "text-zinc-800 dark:text-zinc-200"
                          }`}>
                            {demanda.assistido?.nome || demanda.assistidoNome || "Sem assistido"}
                          </p>
                          {demanda.reuPreso && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 dark:bg-zinc-700 text-white flex-shrink-0">
                              <Lock className="w-2 h-2" />
                              Preso
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {atribuicao && (
                            <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0", atColors.bgSolid, atColors.text)}>
                              {atColors.shortLabel}
                            </span>
                          )}
                          <p className="text-[11px] text-zinc-400 truncate">{demanda.ato}</p>
                        </div>
                      </div>

                      {/* Direita: ação + prazo */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <QuickStatusButton
                          demandaId={demanda.id}
                          currentSubstatus={demanda.substatus}
                          onUpdate={handleQuickStatusUpdate}
                        />
                        <span className={cn(
                          "text-[11px] font-semibold px-2 py-1 rounded-md whitespace-nowrap tabular-nums",
                          isReuPresoCritico
                            ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                            : isVencido
                            ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                            : prazoInfo.cor === "red"
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                            : prazoInfo.cor === "yellow"
                            ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                        )}>
                          {prazoInfo.texto}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Card>

        {/* PRÓXIMOS JÚRIS — só especializado */}
        {!isDefensorCriminalGeral && (
          <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-apple dark:shadow-apple-dark transition-all duration-200 hover:shadow-apple-hover dark:hover:shadow-apple-dark-hover">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Gavel className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">Próximos Júris</h3>
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

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto">
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
        )}

        </div>{/* fim grid Prazos + Júris */}
        </div>{/* fim section Prazos & Agenda */}

        {/* ===== 6. AUDIÊNCIAS (full-width) ===== */}
        {isDefensorCriminalGeral ? (
          /* Criminal Geral: Minhas Audiências */
          <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-apple dark:shadow-apple-dark transition-all duration-200 hover:shadow-apple-hover dark:hover:shadow-apple-dark-hover">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">Minhas Audiências</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                    {audienciasExibir.length}
                  </span>
                </div>
                <Link href="/admin/agenda">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-emerald-600 transition-colors cursor-pointer">
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
                    <Link href={`/admin/audiencias/${aud.id}`} key={aud.id} className="flex items-stretch gap-0 transition-colors group hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      {/* Barra de atribuição */}
                      <div className={cn("w-1 group-hover:w-1.5 flex-shrink-0 rounded-r my-2 ml-0.5 transition-all duration-200", getAtribuicaoColors(aud.processo?.atribuicao).indicator)} />
                      <div className="flex items-center gap-3 px-3 py-3 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                          isHoje ? "bg-emerald-50 dark:bg-emerald-900/20" :
                          "bg-zinc-100 dark:bg-zinc-800"
                        }`}>
                          <span className={`text-sm font-mono font-bold tabular-nums ${
                            isHoje ? "text-emerald-700 dark:text-emerald-400" :
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
                            <span className="font-mono tabular-nums">{dataAud ? format(dataAud, "HH:mm") : "—"}</span>
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
                          <span className={`text-[10px] font-medium tabular-nums ${
                            diasRestantes <= 0 ? "text-emerald-600 dark:text-emerald-400 font-semibold" :
                            diasRestantes <= 3 ? "text-amber-600 dark:text-amber-400" :
                            "text-zinc-400 dark:text-zinc-500"
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
          /* Especializado: Audiências da Semana */
          <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-apple dark:shadow-apple-dark transition-all duration-200 hover:shadow-apple-hover dark:hover:shadow-apple-dark-hover">
              <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <CalendarDays className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    </div>
                    <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">
                      {mostrandoAlemDaSemana ? "Próximas Audiências" : "Audiências da Semana"}
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                      {audienciasExibir.length}
                    </span>
                  </div>
                  <Link href="/admin/agenda">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-emerald-600 transition-colors cursor-pointer">
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
                        <Link href={`/admin/audiencias/${aud.id}`} className="flex items-stretch gap-0 transition-colors group hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <div className={cn("w-1 group-hover:w-1.5 flex-shrink-0 rounded-r my-2 ml-0.5 transition-all duration-200", getAtribuicaoColors(aud.processo?.atribuicao).indicator)} />
                          <div className="flex items-center gap-3 px-3 py-2.5 flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                {aud.assistidoNome || aud.titulo || "Audiência"}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                                <span className="font-mono tabular-nums">{dataAud ? format(dataAud, "HH:mm") : "—"}</span>
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
          setAtendimentoRapido({ assistidoId: null, assistidoNome: "", tipo: "atendimento", descricao: "", processoId: null, local: "", assunto: "" });
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
            <SheetTitle className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tracking-tight flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              Mural da Equipe
            </SheetTitle>
          </SheetHeader>
          <div className="p-4 pt-3 h-full overflow-hidden">
            <MuralEquipe />
          </div>
        </SheetContent>
      </Sheet>

      {/* Transcript Viewer Modal */}
      {showTranscriptViewer && audioTranscript && (
        <TranscriptViewer
          open={showTranscriptViewer}
          onOpenChange={setShowTranscriptViewer}
          transcript={audioTranscript}
          summary={audioSummary}
          assistidoNome={atendimentoRapido.assistidoNome || undefined}
          onSummarize={handleSummarize}
          isSummarizing={isSummarizing}
        />
      )}
    </div>
  );
}
