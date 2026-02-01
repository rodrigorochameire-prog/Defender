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
} from "lucide-react";
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
  const [atendimentoRapido, setAtendimentoRapido] = useState({ assistido: "", descricao: "" });

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

          {/* REGISTRO RÁPIDO DE ATENDIMENTO */}
          <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-zinc-500" />
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Registro Rápido</h3>
              </div>
            </div>
            <div className="p-3 space-y-3">
              <Input
                placeholder="Nome do assistido..."
                value={atendimentoRapido.assistido}
                onChange={(e) => setAtendimentoRapido(prev => ({ ...prev, assistido: e.target.value }))}
                className="h-9 text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
              <Textarea
                placeholder="Descrição do atendimento..."
                value={atendimentoRapido.descricao}
                onChange={(e) => setAtendimentoRapido(prev => ({ ...prev, descricao: e.target.value }))}
                className="min-h-[80px] text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 resize-none"
              />
              <Button 
                size="sm" 
                className="w-full h-8 text-xs bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white"
                onClick={() => {
                  if (atendimentoRapido.assistido && atendimentoRapido.descricao) {
                    toast.success("Atendimento registrado!");
                    setAtendimentoRapido({ assistido: "", descricao: "" });
                  } else {
                    toast.error("Preencha todos os campos");
                  }
                }}
              >
                <Send className="w-3 h-3 mr-1.5" />
                Registrar
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
