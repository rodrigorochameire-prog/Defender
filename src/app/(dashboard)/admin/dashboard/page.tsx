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
  
  const config = PROFISSIONAIS_CONFIG[responsavelId as keyof typeof PROFISSIONAIS_CONFIG];
  
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

  // Demandas ordenadas por prazo (mais urgentes primeiro)
  const demandasPorPrazo = useMemo(() => {
    return [...demandasFiltradas]
      .filter((d: any) => d.prazoFinal || d.prazo)
      .sort((a: any, b: any) => {
        const prazoA = a.prazoFinal ? new Date(a.prazoFinal) : a.prazo ? parseISO(a.prazo) : new Date(9999, 11, 31);
        const prazoB = b.prazoFinal ? new Date(b.prazoFinal) : b.prazo ? parseISO(b.prazo) : new Date(9999, 11, 31);
        return prazoA.getTime() - prazoB.getTime();
      })
      .slice(0, 5);
  }, [demandasFiltradas]);

  // Estado para registro rápido de atendimento
  const [atendimentoRapido, setAtendimentoRapido] = useState<{
    assistidoId: number | null;
    assistidoNome: string;
    descricao: string;
  }>({ assistidoId: null, assistidoNome: "", descricao: "" });
  const [assistidoSearchOpen, setAssistidoSearchOpen] = useState(false);
  const [assistidoSearchQuery, setAssistidoSearchQuery] = useState("");

  // Assistido selecionado para exibir detalhes
  const assistidoSelecionado = useMemo(() => {
    if (!atendimentoRapido.assistidoId) return null;
    return assistidos.find((a: any) => a.id === atendimentoRapido.assistidoId);
  }, [atendimentoRapido.assistidoId, assistidos]);

  // Filtrar assistidos pela busca
  const assistidosFiltrados = useMemo(() => {
    if (!assistidoSearchQuery.trim()) return assistidos.slice(0, 10);
    const query = assistidoSearchQuery.toLowerCase();
    return assistidos
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
      title: "Próximos Júris",
      value: totalJuris.toString(),
      subtitle: totalJuris > 0 ? "agendados" : "nenhum agendado",
      icon: Gavel,
      href: "/admin/juri",
    },
  ];

  // Dados para gráfico
  const dadosDonut = totalDemandas > 0 ? [
    { name: "Urgentes", value: demandasUrgentes, color: "#EF4444" },
    { name: "Normais", value: totalDemandas - demandasUrgentes, color: "#10B981" },
  ] : [
    { name: "Sem dados", value: 1, color: "#9CA3AF" },
  ];

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
        {/* STATS CARDS - Polimento premium com toques emerald */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Link href={stat.href} key={index}>
                <div className="group relative p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03] dark:hover:shadow-emerald-500/[0.05]">
                  {/* Linha superior sutil no hover */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
                  
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 dark:group-hover:text-emerald-400/70 transition-colors duration-300">
                        {stat.title}
                      </p>
                      {isLoading ? (
                        <Skeleton className="h-7 w-14" />
                      ) : (
                        <p className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
                          {stat.value}
                        </p>
                      )}
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {stat.subtitle}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 dark:group-hover:border-emerald-700/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all duration-300">
                      <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* PRAZOS URGENTES + REGISTRO RÁPIDO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* PRAZOS MAIS PRÓXIMOS - Simplificado */}
          <Card className="lg:col-span-2 group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
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

          {/* REGISTRO RÁPIDO DE ATENDIMENTO - APRIMORADO */}
          <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Registro Rápido</h3>
              </div>
            </div>
            <div className="p-3 space-y-3">
              {/* Seletor de Assistido com Autocomplete */}
              <Popover open={assistidoSearchOpen} onOpenChange={setAssistidoSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={assistidoSearchOpen}
                    className="w-full h-9 justify-between text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    {atendimentoRapido.assistidoId ? (
                      <span className="flex items-center gap-2 truncate">
                        <User className="w-3.5 h-3.5 text-emerald-500" />
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
                <PopoverContent className="w-[300px] p-0" align="start">
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
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
                  <div className="flex items-start gap-2.5">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={assistidoSelecionado.photoUrl || ""} />
                      <AvatarFallback className="text-xs bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300">
                        {assistidoSelecionado.nome?.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 truncate">
                          {assistidoSelecionado.nome}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-zinc-400 hover:text-red-500"
                          onClick={() => setAtendimentoRapido(prev => ({ ...prev, assistidoId: null, assistidoNome: "" }))}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-emerald-700 dark:text-emerald-400">
                        {assistidoSelecionado.telefone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />
                            {assistidoSelecionado.telefone}
                          </span>
                        )}
                        {assistidoSelecionado.cpf && (
                          <span>CPF: {assistidoSelecionado.cpf}</span>
                        )}
                        {assistidoSelecionado.situacaoPrisional === "PRESO" && (
                          <Badge variant="outline" className="h-4 px-1 text-[9px] border-red-400 text-red-600 bg-red-50 dark:bg-red-900/30">
                            <Lock className="w-2.5 h-2.5 mr-0.5" />
                            {assistidoSelecionado.localPrisao || "Preso"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/50">
                    <Link href={`/admin/assistidos/${assistidoSelecionado.id}`} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full h-6 text-[10px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/40">
                        <ExternalLink className="w-2.5 h-2.5 mr-1" />
                        Ver perfil
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Descrição do Atendimento */}
              <Textarea
                placeholder="Descrição do atendimento..."
                value={atendimentoRapido.descricao}
                onChange={(e) => setAtendimentoRapido(prev => ({ ...prev, descricao: e.target.value }))}
                className="min-h-[70px] text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 resize-none"
              />

              {/* Botão de Registrar */}
              <Button 
                size="sm" 
                className="w-full h-8 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
                disabled={!atendimentoRapido.assistidoId || !atendimentoRapido.descricao.trim()}
                onClick={() => {
                  if (atendimentoRapido.assistidoId && atendimentoRapido.descricao.trim()) {
                    toast.success(`Atendimento de ${atendimentoRapido.assistidoNome} registrado!`);
                    setAtendimentoRapido({ assistidoId: null, assistidoNome: "", descricao: "" });
                  } else {
                    toast.error("Selecione um assistido e descreva o atendimento");
                  }
                }}
              >
                <Send className="w-3 h-3 mr-1.5" />
                Registrar Atendimento
              </Button>
            </div>
          </Card>
        </div>

        {/* JÚRIS DO MÊS + AUDIÊNCIAS DA SEMANA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

          {/* JÚRIS DOS PRÓXIMOS 30 DIAS */}
          <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-zinc-500" />
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Júris do Mês</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                    {totalJuris}
                  </span>
                </div>
                <Link href="/admin/juri">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-emerald-600">
                    Ver todos <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[280px] overflow-y-auto">
              {loadingJuris ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : jurisFiltrados.length === 0 ? (
                <div className="p-6 text-center">
                  <Gavel className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                  <p className="text-sm text-zinc-500">Nenhum júri agendado</p>
                </div>
              ) : (
                jurisFiltrados.slice(0, 5).map((juri: any) => {
                  const dataSessao = juri.dataSessao ? new Date(juri.dataSessao) : null;
                  const diasRestantes = dataSessao ? differenceInDays(dataSessao, new Date()) : null;
                  
                  return (
                    <Link href={`/admin/juri/${juri.id}`} key={juri.id}>
                      <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            {dataSessao ? format(dataSessao, "dd", { locale: ptBR }) : "--"}
                          </span>
                          <span className="text-[9px] text-zinc-400 uppercase">
                            {dataSessao ? format(dataSessao, "MMM", { locale: ptBR }) : ""}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            {juri.assistidoNome || "Réu"}
                          </p>
                          <p className="text-[11px] text-zinc-400">{juri.horario || "Horário a definir"}</p>
                        </div>
                        {diasRestantes !== null && diasRestantes >= 0 && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            diasRestantes <= 3 ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                            diasRestantes <= 7 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                            "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                          }`}>
                            {diasRestantes === 0 ? "Hoje" : diasRestantes === 1 ? "Amanhã" : `${diasRestantes}d`}
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
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Audiências da Semana</h3>
                </div>
                <Link href="/admin/audiencias">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-emerald-600">
                    Ver todas <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[280px] overflow-y-auto">
              {/* Placeholder para audiências - você pode conectar com dados reais depois */}
              <div className="p-6 text-center">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                <p className="text-sm text-zinc-500">Nenhuma audiência esta semana</p>
                <p className="text-xs text-zinc-400 mt-1">As audiências aparecerão aqui</p>
              </div>
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
            <div className="grid grid-cols-2 gap-4">
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
            {atribuicaoAtual && (
              <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                    <Gavel className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">Atribuição</p>
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {atribuicaoAtual === "JURI_EP" ? "Tribunal do Júri / Exec. Penal" : "Violência Doméstica"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
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
    </div>
  );
}
