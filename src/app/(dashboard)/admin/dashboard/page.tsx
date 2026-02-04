"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { DemandaCreateModal, type DemandaFormData } from "@/components/demandas-premium/demanda-create-modal";
import { DelegacaoModal } from "@/components/demandas/delegacao-modal";
import { getAtosPorAtribuicao } from "@/config/atos-por-atribuicao";
import { DEMANDA_STATUS } from "@/config/demanda-status";
import { toast } from "sonner";
import {
  Users,
  ListTodo,
  AlertCircle,
  Calendar,
  Gavel,
  Home,
  ArrowRight,
  FileText,
  TrendingUp,
  Lock,
  Flame,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  User,
  Filter,
  Scale,
  FolderOpen,
  Eye,
  EyeOff,
  Share2,
  Briefcase,
  Settings,
  Plus,
  Send,
  MessageSquare,
  CalendarDays,
  Search,
  ChevronsUpDown,
  X,
  Phone,
  ExternalLink,
  Info,
  PenLine,
  UserPlus,
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
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc/client";
import { format, parseISO, isToday, isTomorrow, isThisWeek, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  useProfissional,
  type ProfissionalId,
  PROFISSIONAIS_CONFIG,
} from "@/contexts/profissional-context";
import { CompartilharDemandaModal } from "@/components/shared/compartilhar-demanda-modal";
import { usePermissions, type UserRole } from "@/hooks/use-permissions";
import { DashboardPorPerfil } from "@/components/dashboard/dashboard-por-perfil";
import { RegistroRapidoAprimorado } from "@/components/dashboard/registro-rapido-aprimorado";

// ============================================
// CONFIGURAÇÕES DE ATRIBUIÇÃO
// ============================================

const ATRIBUICOES = {
  TODAS: { nome: "Todas", icon: Filter, cor: "zinc" },
  JURI_EP: { nome: "Júri + Exec. Penal", icon: Gavel, cor: "green" },
  VVD: { nome: "Violência Doméstica", icon: Home, cor: "amber" },
};

// ============================================
// COMPONENTE COPY BUTTON
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

// ============================================
// HELPERS
// ============================================

const statusBorderColors: { [key: string]: string } = {
  "URGENTE": "#DC2626",
  "2_ATENDER": "#EAB308",
  "4_MONITORAR": "#FB923C",
  "5_FILA": "#6B7280",
  "7_PROTOCOLADO": "#10B981",
  "7_CIENCIA": "#10B981",
  "CONCLUIDO": "#10B981",
};

const statusLabels: { [key: string]: string } = {
  "URGENTE": "Urgente",
  "2_ATENDER": "Atender",
  "4_MONITORAR": "Monitorar",
  "5_FILA": "Fila",
  "7_PROTOCOLADO": "Protocolado",
  "7_CIENCIA": "Ciência",
  "CONCLUIDO": "Concluído",
  "ARQUIVADO": "Arquivado",
};

function formatPrazo(prazo: string | Date | null): { texto: string; cor: string } {
  if (!prazo) return { texto: "Sem prazo", cor: "gray" };
  
  const data = typeof prazo === "string" ? parseISO(prazo) : prazo;
  
  if (isToday(data)) return { texto: "Hoje", cor: "red" };
  if (isTomorrow(data)) return { texto: "Amanhã", cor: "red" };
  
  const diffDays = Math.ceil((data.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 2) return { texto: format(data, "dd/MM", { locale: ptBR }), cor: "red" };
  if (diffDays <= 5) return { texto: format(data, "dd/MM", { locale: ptBR }), cor: "yellow" };
  return { texto: format(data, "dd/MM", { locale: ptBR }), cor: "gray" };
}

// ============================================
// COMPONENTE BADGE DE RESPONSÁVEL
// ============================================

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
// DASHBOARD COMPONENT
// ============================================

export default function DashboardJuriPage() {
  // Hook de permissões para detectar o perfil do usuário
  const { user, isLoading: loadingUser } = usePermissions();
  
  // Usar contexto de profissional
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
  const configAtivo = profissionalAtivo; // Alias para compatibilidade

  // ==========================================
  // BUSCA DADOS REAIS DO BANCO DE DADOS
  // ==========================================

  // Demandas
  const { data: demandas = [], isLoading: loadingDemandas } = trpc.demandas.list.useQuery({
    limit: 100,
  });

  // Assistidos
  const { data: assistidos = [], isLoading: loadingAssistidos } = trpc.assistidos.list.useQuery({
    limit: 100,
  });

  // Casos
  const { data: casos = [], isLoading: loadingCasos } = trpc.casos.list.useQuery({
    limit: 100,
  });

  // Júris (sessões do júri)
  const { data: jurisData, isLoading: loadingJuris } = trpc.juri.proximas.useQuery({
    dias: 60,
  });
  const juris = jurisData ?? [];

  // Processos (para registro rápido)
  const { data: processos = [] } = trpc.processos.list.useQuery({
    limit: 100,
  });

  // Delegações recebidas (para estagiários e servidores)
  const { data: minhasDelegacoes = [], isLoading: loadingDelegacoes } = trpc.delegacao.minhasDelegacoes.useQuery(
    undefined,
    { enabled: !!user && ["estagiario", "servidor"].includes(user.role) }
  );

  // Buscar dados do supervisor (para estagiários)
  const { data: currentUserData } = trpc.auth.me.useQuery();
  
  // ==========================================
  // VERIFICAR TIPO DE DASHBOARD (calculado, sem early return)
  // ==========================================
  
  // Para perfis não-defensor (estagiário, servidor, triagem), usar dashboard por perfil
  const isPerfilAlternativo = user && ["estagiario", "servidor", "triagem"].includes(user.role);

  // Verificar se é defensor de vara criminal (não-especializado) - usado para adaptar seções do dashboard
  const isDefensorCriminalGeral = user && user.role === "defensor" && isGrupoVarasCriminais;

  // Audiências (para o dashboard)
  const { data: audienciasData, isLoading: loadingAudiencias } = trpc.audiencias.proximas.useQuery({
    dias: 30,
    limite: 20,
  });
  const audiencias = audienciasData ?? [];

  // ==========================================
  // MODAL DE CRIAÇÃO DE DEMANDA
  // ==========================================
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Mutation para criar demanda
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

  // Opções para o formulário (valores devem corresponder às chaves do ATOS_POR_ATRIBUICAO)
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
    // TODO: Implementar criação de demanda com validação de assistido e processo
    console.log("Criar demanda:", data);
    // Por enquanto, apenas loga os dados
    // A mutation espera processoId e assistidoId obrigatórios
  };

  // ==========================================
  // LÓGICA SIMPLIFICADA - APENAS MINHAS DEMANDAS
  // ==========================================

  // Demandas: apenas do profissional ativo (ou todas se Geral)
  const demandasFiltradas = useMemo(() => {
    if (isVisaoGeral) return demandas;
    return demandas.filter((d: any) => 
      d.responsavelId === profissionalAtivoId || 
      d.criadoPorId === profissionalAtivoId ||
      !d.responsavelId
    );
  }, [demandas, profissionalAtivoId, isVisaoGeral]);

  // Júris: baseado na atribuição do mês
  const jurisFiltrados = useMemo(() => {
    if (isVisaoGeral) return juris;
    
    // Se está no Júri/EP este mês, vê os júris
    if (atribuicaoAtual === "JURI_EP") {
      return juris;
    }
    
    // Se está na VVD, não vê júris (ou vê só os que for designado)
    return juris.filter((j: any) => j.responsavelId === profissionalAtivoId);
  }, [juris, profissionalAtivoId, atribuicaoAtual, isVisaoGeral]);

  const isLoading = loadingDemandas || loadingAssistidos || loadingCasos || loadingJuris;

  // Demandas ordenadas por prazo (4 mais urgentes - incluindo vencidos)
  const demandasPorPrazo = useMemo(() => {
    return [...demandasFiltradas]
      .filter((d: any) => d.prazoFinal || d.prazo)
      .sort((a: any, b: any) => {
        const prazoA = a.prazoFinal ? new Date(a.prazoFinal) : a.prazo ? parseISO(a.prazo) : new Date(9999, 11, 31);
        const prazoB = b.prazoFinal ? new Date(b.prazoFinal) : b.prazo ? parseISO(b.prazo) : new Date(9999, 11, 31);
        return prazoA.getTime() - prazoB.getTime();
      })
      .slice(0, 4);
  }, [demandasFiltradas]);

  // Estado para filtro de júris por defensor
  const [filtroDefensorJuri, setFiltroDefensorJuri] = useState<"todos" | "rodrigo" | "juliane">("todos");

  // Próximos 4 júris com filtro por defensor
  const jurisProximos = useMemo(() => {
    let filtered = [...jurisFiltrados];
    
    if (filtroDefensorJuri === "rodrigo") {
      filtered = filtered.filter((j: any) => 
        j.defensorNome?.toLowerCase().includes("rodrigo") || 
        j.responsavelId === 1 // ID do Dr. Rodrigo
      );
    } else if (filtroDefensorJuri === "juliane") {
      filtered = filtered.filter((j: any) => 
        j.defensorNome?.toLowerCase().includes("juliane") || 
        j.responsavelId === 2 // ID da Dra. Juliane
      );
    }
    
    return filtered.slice(0, 4);
  }, [jurisFiltrados, filtroDefensorJuri]);

  // Audiências da semana (ou próximas 10 se menos de 5 na semana)
  const audienciasExibir = useMemo(() => {
    const hoje = new Date();
    const fimDaSemana = addDays(hoje, 7 - hoje.getDay()); // Domingo
    
    // Audiências da semana atual
    // O campo retornado pelo tRPC é dataHora, não data
    const audienciasSemana = audiencias.filter((a: any) => {
      const dataAud = a.dataHora ? new Date(a.dataHora) : null;
      return dataAud && dataAud >= hoje && dataAud <= fimDaSemana;
    });
    
    // Se menos de 5 na semana, pega as próximas 10
    if (audienciasSemana.length < 5) {
      return audiencias.slice(0, 10);
    }
    
    return audienciasSemana.slice(0, 10);
  }, [audiencias]);

  // Verificar se estamos mostrando audiências além da semana
  const mostrandoAlemDaSemana = useMemo(() => {
    const hoje = new Date();
    const fimDaSemana = addDays(hoje, 7 - hoje.getDay());
    const audienciasSemana = audiencias.filter((a: any) => {
      const dataAud = a.dataHora ? new Date(a.dataHora) : null;
      return dataAud && dataAud >= hoje && dataAud <= fimDaSemana;
    });
    return audienciasSemana.length < 5;
  }, [audiencias]);

  // ==========================================
  // INFOGRÁFICOS PARA DEFENSOR
  // ==========================================

  // Panorama de Réus (presos, monitorados, soltos)
  const panoramaReus = useMemo(() => {
    const presos = assistidos.filter((a: any) => 
      a.situacaoPrisional === "PRESO" || 
      ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(a.statusPrisional)
    ).length;
    const monitorados = assistidos.filter((a: any) => 
      a.situacaoPrisional === "MONITORADO" || 
      ["MONITORADO", "DOMICILIAR"].includes(a.statusPrisional)
    ).length;
    const soltos = assistidos.length - presos - monitorados;
    
    return { presos, monitorados, soltos, total: assistidos.length };
  }, [assistidos]);

  // Carga de Trabalho
  const cargaTrabalho = useMemo(() => {
    const hoje = new Date();
    
    // Prazos vencendo esta semana
    const prazosEstaSemana = demandasFiltradas.filter((d: any) => {
      if (!d.prazoFinal && !d.prazo) return false;
      const prazo = d.prazoFinal ? new Date(d.prazoFinal) : parseISO(d.prazo);
      return prazo >= hoje && prazo <= addDays(hoje, 7);
    }).length;
    
    // Prazos vencidos
    const prazosVencidos = demandasFiltradas.filter((d: any) => {
      if (!d.prazoFinal && !d.prazo) return false;
      const prazo = d.prazoFinal ? new Date(d.prazoFinal) : parseISO(d.prazo);
      return prazo < hoje && d.status !== "CONCLUIDO" && d.status !== "ARQUIVADO";
    }).length;
    
    // Demandas em andamento
    const emAndamento = demandasFiltradas.filter((d: any) => 
      d.status === "EM_ANDAMENTO" || d.status === "2_ATENDER" || d.status === "4_MONITORAR"
    ).length;
    
    // Concluídas este mês
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const concluidasMes = demandasFiltradas.filter((d: any) => {
      if (d.status !== "CONCLUIDO" && d.status !== "7_PROTOCOLADO") return false;
      const dataAtualizacao = d.updatedAt ? new Date(d.updatedAt) : null;
      return dataAtualizacao && dataAtualizacao >= inicioMes;
    }).length;

    return { prazosEstaSemana, prazosVencidos, emAndamento, concluidasMes };
  }, [demandasFiltradas]);

  // Estado para registro rápido de atendimento
  const [atendimentoRapido, setAtendimentoRapido] = useState<{
    assistidoId: number | null;
    assistidoNome: string;
    tipo: "atendimento" | "diligencia" | "informacao" | "peticao" | "anotacao" | "delegacao";
    descricao: string;
  }>({ assistidoId: null, assistidoNome: "", tipo: "atendimento", descricao: "" });
  const [assistidoSearchOpen, setAssistidoSearchOpen] = useState(false);
  const [assistidoSearchQuery, setAssistidoSearchQuery] = useState("");

  // Configuração dos tipos de registro (layout 3x2)
  const tiposRegistro = [
    // Linha 1
    { id: "atendimento", label: "Atendimento", icon: MessageSquare, color: "text-emerald-600", bgActive: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300" },
    { id: "diligencia", label: "Diligência", icon: Search, color: "text-blue-600", bgActive: "bg-blue-100 dark:bg-blue-900/30 border-blue-300" },
    { id: "informacao", label: "Info", icon: Info, color: "text-amber-600", bgActive: "bg-amber-100 dark:bg-amber-900/30 border-amber-300" },
    // Linha 2
    { id: "peticao", label: "Petição", icon: FileText, color: "text-purple-600", bgActive: "bg-purple-100 dark:bg-purple-900/30 border-purple-300" },
    { id: "anotacao", label: "Nota", icon: PenLine, color: "text-zinc-600", bgActive: "bg-zinc-100 dark:bg-zinc-800 border-zinc-300" },
    { id: "delegacao", label: "Delegar", icon: UserPlus, color: "text-rose-600", bgActive: "bg-rose-100 dark:bg-rose-900/30 border-rose-300" },
  ] as const;
  
  // Estado para modal de delegação
  const [delegacaoModalOpen, setDelegacaoModalOpen] = useState(false);

  // Assistido selecionado para exibir detalhes
  const assistidoSelecionado = useMemo(() => {
    if (!atendimentoRapido.assistidoId) return null;
    return assistidos.find((a: any) => a.id === atendimentoRapido.assistidoId);
  }, [atendimentoRapido.assistidoId, assistidos]);

  // Filtrar assistidos pela busca (excluindo "Não identificado")
  const assistidosFiltrados = useMemo(() => {
    // Primeiro exclui os não identificados
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

  // Stats calculados
  const totalDemandas = demandasFiltradas.length;
  const demandasEmPreparacao = demandasFiltradas.filter((d: any) => d.status === "PENDENTE" || d.status === "EM_ANDAMENTO").length;
  const demandasCriticas = demandasFiltradas.filter((d: any) => d.prioridade === "URGENTE" || d.prazoFinal).length;
  const demandasUrgentes = demandasFiltradas.filter((d: any) => d.prioridade === "REU_PRESO" || d.prioridade === "URGENTE" || d.reuPreso).length;
  const reusPresos = assistidos.filter((a: any) => a.situacaoPrisional === "PRESO" || a.reuPreso).length;
  const totalAssistidos = assistidos.length;
  const totalCasos = casos.length;
  const totalJuris = jurisFiltrados.length;

  // Porcentagens
  const percentEmPreparacao = totalDemandas > 0 ? Math.round((demandasEmPreparacao / totalDemandas) * 100) : 0;
  const percentCriticas = totalDemandas > 0 ? Math.round((demandasCriticas / totalDemandas) * 100) : 0;
  const percentPresos = totalAssistidos > 0 ? Math.round((reusPresos / totalAssistidos) * 100) : 0;

  // Stats para os cards
  const statsData = [
    {
      title: "Em Preparação",
      value: demandasEmPreparacao.toString(),
      subtitle: `${percentEmPreparacao}% do total`,
      icon: FileText,
      href: "/admin/demandas",
    },
    {
      title: "Prazos Críticos",
      value: demandasCriticas.toString(),
      subtitle: `${percentCriticas}% do total`,
      icon: AlertCircle,
      href: "/admin/demandas",
    },
    {
      title: "Réus Presos",
      value: `${percentPresos}%`,
      subtitle: `${reusPresos} de ${totalAssistidos} réus`,
      icon: Lock,
      href: "/admin/assistidos",
    },
    {
      title: isDefensorCriminalGeral ? "Audiências" : "Próximos Júris",
      value: isDefensorCriminalGeral ? audienciasExibir.length.toString() : totalJuris.toString(),
      subtitle: isDefensorCriminalGeral
        ? (audienciasExibir.length > 0 ? "agendadas" : "nenhuma agendada")
        : (totalJuris > 0 ? "agendados" : "nenhum agendado"),
      icon: isDefensorCriminalGeral ? CalendarDays : Gavel,
      href: isDefensorCriminalGeral ? "/admin/agenda" : "/admin/juri",
    },
  ];

  // Dados para gráfico
  const dadosDonut = totalDemandas > 0 ? [
    { name: "Urgentes", value: demandasUrgentes, color: "#EF4444" },
    { name: "Normais", value: totalDemandas - demandasUrgentes, color: "#10B981" },
  ] : [
    { name: "Sem dados", value: 1, color: "#9CA3AF" },
  ];

  // ==========================================
  // RENDERIZAR DASHBOARD POR PERFIL (se aplicável)
  // ==========================================
  
  // Resolver nome do supervisor para estagiários
  const supervisorName = useMemo(() => {
    if (!currentUserData || user?.role !== "estagiario") return undefined;
    const supervisorId = (currentUserData as any)?.supervisorId;
    if (!supervisorId) return undefined;
    // Procurar na lista de profissionais do contexto
    const supervisor = profissionalAtivo?.id === supervisorId
      ? profissionalAtivo.nome
      : undefined;
    return supervisor || "Defensor";
  }, [currentUserData, user, profissionalAtivo]);

  // Transformar delegações do tRPC para o formato esperado pelo DashboardPorPerfil
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

  // Para perfis não-defensor (estagiário, servidor, triagem), usar dashboard por perfil
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
  // DASHBOARD PRINCIPAL (Defensores Especializados - Júri/EP/VVD)
  // ==========================================
  
  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      
      {/* SUB-HEADER BRANCO */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <Briefcase className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Visão geral das atividades e métricas</span>
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
        {/* STATS CARDS - 2 colunas em mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Link href={stat.href} key={index}>
                <div className="group relative p-3 md:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03] dark:hover:shadow-emerald-500/[0.05]">
                  {/* Linha superior sutil no hover */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
                  
                  <div className="flex items-start justify-between gap-2 md:gap-3">
                    <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1">
                      <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 dark:group-hover:text-emerald-400/70 transition-colors duration-300">
                        {stat.title}
                      </p>
                      {isLoading ? (
                        <Skeleton className="h-6 md:h-7 w-10 md:w-12" />
                      ) : (
                        <p className="text-lg md:text-xl font-semibold text-zinc-700 dark:text-zinc-300">
                          {stat.value}
                        </p>
                      )}
                      <p className="text-[9px] md:text-[10px] text-zinc-400 dark:text-zinc-500">
                        {stat.subtitle}
                      </p>
                    </div>
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 dark:group-hover:border-emerald-700/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all duration-300">
                      <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* PRAZOS URGENTES */}
        <div className="space-y-4">
          {/* PRAZOS MAIS PRÓXIMOS - Linha completa */}
          <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Prazos Próximos</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                    {demandasPorPrazo.length}
                  </span>
                </div>
                <Link href="/admin/demandas">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-emerald-600">
                    Ver todas <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loadingDemandas ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : demandasPorPrazo.length === 0 ? (
                <div className="p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm text-zinc-500">Nenhum prazo urgente</p>
                </div>
              ) : (
                demandasPorPrazo.map((demanda: any) => {
                  const prazoInfo = formatPrazo(demanda.prazoFinal || demanda.prazo);
                  return (
                    <Link href={`/admin/demandas/${demanda.id}`} key={demanda.id}>
                      <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          prazoInfo.cor === "red" ? "bg-red-500" : 
                          prazoInfo.cor === "yellow" ? "bg-amber-500" : "bg-zinc-400"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            {demanda.assistido?.nome || demanda.assistidoNome || "Sem assistido"}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate">{demanda.ato}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {demanda.reuPreso && <Lock className="w-3 h-3 text-red-500" />}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            prazoInfo.cor === "red" ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" :
                            prazoInfo.cor === "yellow" ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400" :
                            "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                          }`}>
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

          {/* REGISTRO RÁPIDO DE ATENDIMENTO - LAYOUT HORIZONTAL */}
          <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Registro Rápido</h3>
              </div>
            </div>
            <div className="p-4">
              {/* Layout horizontal em telas grandes */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Coluna 1: Seletor de Assistido + Tipos inline */}
                <div className="lg:col-span-5 space-y-2">
                  <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Assistido</label>
                  <Popover open={assistidoSearchOpen} onOpenChange={setAssistidoSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={assistidoSearchOpen}
                        className="w-full h-9 justify-between text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      >
                        {atendimentoRapido.assistidoId ? (
                          <span className="flex items-center gap-2 truncate">
                            <User className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            <span className="truncate">{atendimentoRapido.assistidoNome}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-500 flex items-center gap-2">
                            <Search className="w-3.5 h-3.5" />
                            Buscar assistido...
                          </span>
                        )}
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Digite o nome ou CPF..." 
                      value={assistidoSearchQuery}
                      onValueChange={setAssistidoSearchQuery}
                      className="h-9"
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

                  {/* Card do Assistido Selecionado */}
                  {assistidoSelecionado && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 mt-2">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={assistidoSelecionado.photoUrl || ""} />
                        <AvatarFallback className="text-[8px] bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300">
                          {assistidoSelecionado.nome?.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-emerald-900 dark:text-emerald-100 truncate">
                          {assistidoSelecionado.nome}
                        </p>
                        <div className="flex items-center gap-1.5 text-[9px] text-emerald-600 dark:text-emerald-400">
                          {assistidoSelecionado.situacaoPrisional === "PRESO" && (
                            <span className="flex items-center gap-0.5 text-red-600">
                              <Lock className="w-2 h-2" />
                              Preso
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-zinc-400 hover:text-red-500 flex-shrink-0"
                        onClick={() => setAtendimentoRapido(prev => ({ ...prev, assistidoId: null, assistidoNome: "" }))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  {/* Tipo de Registro - Inline com labels, wraps em tela estreita */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Tipo</label>
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
                                setDelegacaoModalOpen(true);
                              } else {
                                setAtendimentoRapido(prev => ({ ...prev, tipo: tipo.id as typeof prev.tipo }));
                              }
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                              isSelected && !isDelegacao
                                ? `${tipo.bgActive} ${tipo.color}`
                                : isDelegacao
                                  ? "border border-rose-200 dark:border-rose-800 hover:border-rose-400 dark:hover:border-rose-600 bg-rose-50 dark:bg-rose-900/20 text-rose-500"
                                  : "border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-500"
                            }`}
                            title={tipo.label}
                          >
                            <Icon className={`w-3.5 h-3.5 ${isSelected && !isDelegacao ? tipo.color : isDelegacao ? "text-rose-500" : "text-zinc-400"}`} />
                            <span className="hidden sm:inline">{tipo.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Coluna 2: Descrição + Botão */}
                <div className="lg:col-span-7 space-y-1.5">
                  <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Descrição</label>
                  <div className="flex gap-2">
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
                      rows={2}
                      className="flex-1 text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 resize-none"
                    />
                    <Button
                      size="sm"
                      className="self-stretch px-4 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm flex-shrink-0"
                      disabled={!atendimentoRapido.assistidoId || !atendimentoRapido.descricao.trim()}
                      onClick={() => {
                        if (atendimentoRapido.assistidoId && atendimentoRapido.descricao.trim()) {
                          const tipoLabel = tiposRegistro.find(t => t.id === atendimentoRapido.tipo)?.label || "Registro";
                          toast.success(`${tipoLabel} de ${atendimentoRapido.assistidoNome} registrado!`);
                          setAtendimentoRapido({ assistidoId: null, assistidoNome: "", tipo: "atendimento", descricao: "" });
                        } else {
                          toast.error("Selecione um assistido e descreva o registro");
                        }
                      }}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* JÚRIS + AUDIÊNCIAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

          {/* PRÓXIMOS JÚRIS / MINHAS AUDIÊNCIAS (para criminal geral) */}
          {isDefensorCriminalGeral ? (
            /* Criminal Geral: Mostra Minhas Audiências no lugar dos Júris */
            <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-violet-500" />
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Minhas Audiências</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium">
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

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[300px] overflow-y-auto">
                {loadingAudiencias ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : audienciasExibir.length === 0 ? (
                  <div className="p-6 text-center">
                    <CalendarDays className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                    <p className="text-sm text-zinc-500">Nenhuma audiência agendada</p>
                    <p className="text-xs text-zinc-400 mt-1">As audiências aparecerão aqui</p>
                  </div>
                ) : (
                  audienciasExibir.map((aud: any, index: number) => {
                    // O campo retornado pelo tRPC é dataHora, não data
                    const dataAud = aud.dataHora ? new Date(aud.dataHora) : null;
                    const isHoje = dataAud && isToday(dataAud);
                    const isAmanha = dataAud && isTomorrow(dataAud);
                    const diasRestantes = dataAud ? differenceInDays(dataAud, new Date()) : null;

                    return (
                      <Link href={`/admin/audiencias/${aud.id}`} key={aud.id}>
                        <div className="flex items-center gap-3 px-3 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                            isHoje
                              ? "bg-rose-100 dark:bg-rose-900/30"
                              : isAmanha
                                ? "bg-amber-100 dark:bg-amber-900/30"
                                : "bg-violet-100 dark:bg-violet-900/30"
                          }`}>
                            <span className={`text-sm font-bold ${
                              isHoje
                                ? "text-rose-700 dark:text-rose-400"
                                : isAmanha
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-violet-700 dark:text-violet-400"
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
            /* Especializado: Mostra Próximos Júris */
            <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-violet-500" />
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Próximos Júris</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium">
                      {jurisProximos.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Filtro por defensor */}
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
                    <p className="text-xs text-zinc-400 mt-1">
                      {filtroDefensorJuri !== "todos" ? "Tente limpar o filtro" : ""}
                    </p>
                  </div>
                ) : (
                  jurisProximos.map((juri: any) => {
                    const dataSessao = juri.dataSessao ? new Date(juri.dataSessao) : null;
                    const diasRestantes = dataSessao ? differenceInDays(dataSessao, new Date()) : null;

                    return (
                      <Link href={`/admin/juri/${juri.id}`} key={juri.id}>
                        <div className="flex items-center gap-3 px-3 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                            diasRestantes !== null && diasRestantes <= 3
                              ? "bg-rose-100 dark:bg-rose-900/30"
                              : diasRestantes !== null && diasRestantes <= 7
                                ? "bg-amber-100 dark:bg-amber-900/30"
                                : "bg-violet-100 dark:bg-violet-900/30"
                          }`}>
                            <span className={`text-sm font-bold ${
                              diasRestantes !== null && diasRestantes <= 3
                                ? "text-rose-700 dark:text-rose-400"
                                : diasRestantes !== null && diasRestantes <= 7
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-violet-700 dark:text-violet-400"
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

          {/* AUDIÊNCIAS DA SEMANA / PRÓXIMAS */}
          <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {mostrandoAlemDaSemana ? "Próximas Audiências" : "Audiências da Semana"}
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
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

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[300px] overflow-y-auto">
              {loadingAudiencias ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : audienciasExibir.length === 0 ? (
                <div className="p-6 text-center">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                  <p className="text-sm text-zinc-500">Nenhuma audiência agendada</p>
                  <p className="text-xs text-zinc-400 mt-1">As audiências aparecerão aqui</p>
                </div>
              ) : (
                audienciasExibir.map((aud: any, index: number) => {
                  // O campo retornado pelo tRPC é dataHora, não data
                  const dataAud = aud.dataHora ? new Date(aud.dataHora) : null;
                  const isHoje = dataAud && isToday(dataAud);
                  const isAmanha = dataAud && isTomorrow(dataAud);
                  const estaSemana = dataAud && isThisWeek(dataAud, { weekStartsOn: 0 });
                  
                  // Agrupar visualmente por data
                  const dataAnterior = index > 0 && audienciasExibir[index - 1].dataHora 
                    ? new Date(audienciasExibir[index - 1].dataHora) : null;
                  const mostrarSeparadorData = !dataAnterior || 
                    (dataAud && format(dataAud, "yyyy-MM-dd") !== format(dataAnterior, "yyyy-MM-dd"));

                  return (
                    <div key={aud.id}>
                      {/* Separador de data */}
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
                            isHoje ? "bg-emerald-500" :
                            isAmanha ? "bg-amber-500" :
                            "bg-blue-400"
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
                          {aud.reuPreso && (
                            <Lock className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

      {/* ESTATÍSTICAS + INTELIGÊNCIA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* GRÁFICO DE DEMANDAS */}
        <Card className="group/card relative p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/[0.02]">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <TrendingUp className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Visão Geral</h3>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Distribuição de demandas</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-[180px]">
              <Skeleton className="h-28 w-28 rounded-full" />
            </div>
          ) : totalDemandas === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                <TrendingUp className="w-5 h-5 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Sem dados</p>
              <p className="text-xs mt-1 text-zinc-400 dark:text-zinc-500">Adicione demandas para estatísticas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={dadosDonut} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">
                    {dadosDonut.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex flex-col justify-center space-y-2">
                {dadosDonut.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{item.value}</span>
                  </div>
                ))}
                
                {totalDemandas > 0 && (
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 mt-1">
                    <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Taxa Urgência</p>
                    <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
                      {((demandasUrgentes / totalDemandas) * 100).toFixed(1)}%
                    </p>
                    <Progress value={(demandasUrgentes / totalDemandas) * 100} className="mt-1 h-1" />
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* INTELIGÊNCIA ESTRATÉGICA */}
        <Card className="group/card relative p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/[0.02]">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <Briefcase className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Inteligência</h3>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Dados compartilhados</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/40">
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                Assistidos e processos são compartilhados entre todos os defensores.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                </div>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Assistidos</span>
              </div>
              <span className="text-base font-semibold text-zinc-700 dark:text-zinc-300">{totalAssistidos}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <FolderOpen className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                </div>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Casos</span>
              </div>
              <span className="text-base font-semibold text-zinc-700 dark:text-zinc-300">{totalCasos}</span>
            </div>

            {/* Atribuição atual */}
            {(atribuicaoAtual || isDefensorCriminalGeral) && (
              <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                    <Gavel className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">Atribuição</p>
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {isDefensorCriminalGeral
                        ? (profissionalAtivo.vara || "Vara Criminal")
                        : atribuicaoAtual === "JURI_EP" ? "Tribunal do Júri / Exec. Penal" : "Violência Doméstica"
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* INFOGRÁFICOS PARA DEFENSOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* PANORAMA DE RÉUS */}
        <Card className="group/card relative p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center border border-rose-200 dark:border-rose-700">
              <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Panorama de Réus</h3>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Situação prisional dos assistidos</p>
            </div>
          </div>

          {panoramaReus.total === 0 ? (
            <div className="text-center py-6">
              <Users className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
              <p className="text-sm text-zinc-500">Nenhum assistido cadastrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Barra visual de proporção */}
              <div className="relative h-10 rounded-lg overflow-hidden flex">
                {panoramaReus.presos > 0 && (
                  <div 
                    className="h-full bg-gradient-to-b from-rose-500 to-rose-600 flex items-center justify-center transition-all"
                    style={{ width: `${(panoramaReus.presos / panoramaReus.total) * 100}%` }}
                  >
                    {panoramaReus.presos >= 2 && (
                      <span className="text-white text-xs font-bold">{panoramaReus.presos}</span>
                    )}
                  </div>
                )}
                {panoramaReus.monitorados > 0 && (
                  <div 
                    className="h-full bg-gradient-to-b from-amber-400 to-amber-500 flex items-center justify-center transition-all"
                    style={{ width: `${(panoramaReus.monitorados / panoramaReus.total) * 100}%` }}
                  >
                    {panoramaReus.monitorados >= 2 && (
                      <span className="text-white text-xs font-bold">{panoramaReus.monitorados}</span>
                    )}
                  </div>
                )}
                {panoramaReus.soltos > 0 && (
                  <div 
                    className="h-full bg-gradient-to-b from-emerald-400 to-emerald-500 flex items-center justify-center transition-all"
                    style={{ width: `${(panoramaReus.soltos / panoramaReus.total) * 100}%` }}
                  >
                    {panoramaReus.soltos >= 2 && (
                      <span className="text-white text-xs font-bold">{panoramaReus.soltos}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Legenda com valores */}
              <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200/50 dark:border-rose-800/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-3 h-3 text-rose-600" />
                    <span className="text-[10px] font-medium text-rose-700 dark:text-rose-400 uppercase">Presos</span>
                  </div>
                  <p className="text-xl font-bold text-rose-700 dark:text-rose-400">{panoramaReus.presos}</p>
                  <p className="text-[10px] text-rose-600/70 dark:text-rose-400/70">
                    {panoramaReus.total > 0 ? ((panoramaReus.presos / panoramaReus.total) * 100).toFixed(0) : 0}%
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 uppercase">Monitor.</span>
                  </div>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{panoramaReus.monitorados}</p>
                  <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                    {panoramaReus.total > 0 ? ((panoramaReus.monitorados / panoramaReus.total) * 100).toFixed(0) : 0}%
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 uppercase">Soltos</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{panoramaReus.soltos}</p>
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                    {panoramaReus.total > 0 ? ((panoramaReus.soltos / panoramaReus.total) * 100).toFixed(0) : 0}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* CARGA DE TRABALHO */}
        <Card className="group/card relative p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-700">
              <ListTodo className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Carga de Trabalho</h3>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Demandas e prazos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            {/* Prazos Vencidos */}
            <div className={`p-3 rounded-lg border ${
              cargaTrabalho.prazosVencidos > 0 
                ? "bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700" 
                : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-medium uppercase ${
                  cargaTrabalho.prazosVencidos > 0 ? "text-rose-600" : "text-zinc-500"
                }`}>Prazos Vencidos</span>
                {cargaTrabalho.prazosVencidos > 0 && (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                )}
              </div>
              <p className={`text-2xl font-bold ${
                cargaTrabalho.prazosVencidos > 0 ? "text-rose-600" : "text-zinc-700 dark:text-zinc-300"
              }`}>{cargaTrabalho.prazosVencidos}</p>
              <p className="text-[10px] text-zinc-400">demandas atrasadas</p>
            </div>

            {/* Prazos Esta Semana */}
            <div className={`p-3 rounded-lg border ${
              cargaTrabalho.prazosEstaSemana > 0 
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700" 
                : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-medium uppercase ${
                  cargaTrabalho.prazosEstaSemana > 0 ? "text-amber-600" : "text-zinc-500"
                }`}>Esta Semana</span>
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className={`text-2xl font-bold ${
                cargaTrabalho.prazosEstaSemana > 0 ? "text-amber-600" : "text-zinc-700 dark:text-zinc-300"
              }`}>{cargaTrabalho.prazosEstaSemana}</p>
              <p className="text-[10px] text-zinc-400">prazos vencendo</p>
            </div>

            {/* Em Andamento */}
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
              <span className="text-[10px] font-medium text-blue-600 uppercase">Em Andamento</span>
              <p className="text-2xl font-bold text-blue-600">{cargaTrabalho.emAndamento}</p>
              <p className="text-[10px] text-zinc-400">demandas ativas</p>
            </div>

            {/* Concluídas Este Mês */}
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-emerald-600 uppercase">Concluídas</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-600">{cargaTrabalho.concluidasMes}</p>
              <p className="text-[10px] text-zinc-400">este mês</p>
            </div>
          </div>

          {/* Barra de progresso geral */}
          {totalDemandas > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-zinc-500 uppercase">Taxa de Conclusão Mensal</span>
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {totalDemandas > 0 ? ((cargaTrabalho.concluidasMes / totalDemandas) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <Progress 
                value={(cargaTrabalho.concluidasMes / totalDemandas) * 100} 
                className="h-2"
              />
            </div>
          )}
        </Card>
      </div>
      </div>

      {/* Modal de Criação de Demanda */}
      <DemandaCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveNewDemanda}
        assistidosOptions={[]}
        atribuicaoOptions={atribuicaoOptions}
        atoOptions={atoOptions}
        statusOptions={statusOptions}
      />

      {/* Modal de Delegação */}
      <DelegacaoModal
        open={delegacaoModalOpen}
        onOpenChange={setDelegacaoModalOpen}
        assistidoId={atendimentoRapido.assistidoId}
        assistidoNome={atendimentoRapido.assistidoNome}
        onDelegacaoSucesso={(data) => {
          toast.success(`Tarefa delegada para ${data.destinatarioNome}!`);
          setAtendimentoRapido({ assistidoId: null, assistidoNome: "", tipo: "atendimento", descricao: "" });
        }}
      />
    </div>
  );
}
