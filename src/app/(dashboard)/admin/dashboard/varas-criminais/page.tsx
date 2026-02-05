"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Scale,
  FolderOpen,
  Eye,
  Share2,
  Briefcase,
  Building2,
  Shield,
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
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  useProfissional, 
  type ProfissionalId,
} from "@/contexts/profissional-context";
import { CompartilharDemandaModal } from "@/components/shared/compartilhar-demanda-modal";
import { ProfissionalSwitch } from "@/components/shared/profissional-switch";

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
// HELPER: Formatar data de prazo
// ============================================

function formatarPrazo(dataString: string | null) {
  if (!dataString) return { texto: "-", cor: "gray" };
  
  const data = new Date(dataString);
  const diffDays = Math.ceil((data.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 2) return { texto: format(data, "dd/MM", { locale: ptBR }), cor: "red" };
  if (diffDays <= 5) return { texto: format(data, "dd/MM", { locale: ptBR }), cor: "yellow" };
  return { texto: format(data, "dd/MM", { locale: ptBR }), cor: "gray" };
}

// ============================================
// DASHBOARD VARAS CRIMINAIS
// ============================================

export default function DashboardVarasCriminaisPage() {
  const {
    profissionalAtivo,
    colegoConfig,
  } = useProfissional();

  const profissionalAtivoId = profissionalAtivo.id as ProfissionalId;

  // ==========================================
  // BUSCA DADOS REAIS DO BANCO DE DADOS
  // ==========================================

  // Demandas (apenas do profissional ativo)
  const { data: demandas = [], isLoading: loadingDemandas } = trpc.demandas.list.useQuery({
    limit: 100,
  });

  // Assistidos (todos - compartilhados)
  const { data: assistidos = [], isLoading: loadingAssistidos } = trpc.assistidos.list.useQuery({
    limit: 100,
  });

  // Casos (todos - compartilhados)
  const { data: casos = [], isLoading: loadingCasos } = trpc.casos.list.useQuery({
    limit: 100,
  });

  // Processos (todos - compartilhados)
  const { data: processos = [], isLoading: loadingProcessos } = trpc.processos.list.useQuery({
    limit: 100,
  });

  // Audiências
  const { data: audienciasData, isLoading: loadingAudiencias } = trpc.audiencias.list.useQuery({
    limit: 100, // Mostra últimas 100 audiências no dashboard
  });
  const audiencias = audienciasData ?? [];

  // Compartilhamentos recebidos
  const { data: compartilhamentosRecebidos = [] } = trpc.profissionais.getCompartilhamentos.useQuery({
    profissionalId: profissionalAtivoId,
  });

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
    { value: "Criminal Geral", label: "Criminal Geral" },
    { value: "Tribunal do Júri", label: "Tribunal do Júri" },
    { value: "Violência Doméstica", label: "Violência Doméstica" },
    { value: "Execução Penal", label: "Execução Penal" },
    { value: "Substituição Criminal", label: "Substituição Criminal" },
    { value: "Curadoria", label: "Curadoria" },
  ];

  const statusOptions = Object.entries(DEMANDA_STATUS).map(([key, config]) => ({
    value: key,
    label: config.label,
  }));

  const atoOptions = getAtosPorAtribuicao("Criminal Geral");

  const handleSaveNewDemanda = (data: DemandaFormData) => {
    // TODO: Implementar criação de demanda com validação de assistido e processo
    console.log("Criar demanda:", data);
    // Por enquanto, apenas loga os dados
    // A mutation espera processoId e assistidoId obrigatórios
  };

  // ==========================================
  // FILTROS DE DADOS - APENAS DO PROFISSIONAL
  // ==========================================

  // Demandas filtradas (apenas do profissional ativo)
  const minhasDemandas = useMemo(() => {
    return demandas.filter((d: any) => 
      d.responsavelId === profissionalAtivoId || 
      d.criadoPorId === profissionalAtivoId || 
      !d.responsavelId
    );
  }, [demandas, profissionalAtivoId]);

  // Demandas compartilhadas comigo
  const demandasCompartilhadas = useMemo(() => {
    const idsCompartilhados = compartilhamentosRecebidos
      .filter((c: any) => c.entidadeTipo === "demanda")
      .map((c: any) => c.entidadeId);
    
    return demandas.filter((d: any) => idsCompartilhados.includes(d.id));
  }, [demandas, compartilhamentosRecebidos]);

  // Minhas audiências
  const minhasAudiencias = useMemo(() => {
    return audiencias.filter((a: any) => 
      a.responsavelId === profissionalAtivoId || !a.responsavelId
    );
  }, [audiencias, profissionalAtivoId]);

  // ==========================================
  // ESTATÍSTICAS
  // ==========================================

  const totalMinhasDemandas = minhasDemandas.length;
  const demandasUrgentes = minhasDemandas.filter((d: any) => d.prioridade === "urgente" || d.prioridade === "alta").length;
  const demandasPendentes = minhasDemandas.filter((d: any) => d.status === "pendente" || d.status === "em_analise").length;
  const totalProcessos = processos.length;
  const totalAssistidos = assistidos.length;
  const totalCasos = casos.length;
  const totalAudiencias = minhasAudiencias.length;
  const totalCompartilhadas = demandasCompartilhadas.length;

  // Stats cards
  const statsCards = [
    {
      title: "Minhas Demandas",
      value: totalMinhasDemandas.toString(),
      subtitle: `${demandasUrgentes} urgentes`,
      icon: ListTodo,
      color: profissionalAtivo.cor,
      href: "/admin/demandas",
    },
    {
      title: "Compartilhadas",
      value: totalCompartilhadas.toString(),
      subtitle: "recebidas",
      icon: Share2,
      color: "blue",
      href: "/admin/demandas?compartilhadas=true",
    },
    {
      title: "Audiências",
      value: totalAudiencias.toString(),
      subtitle: "agendadas",
      icon: Calendar,
      color: "amber",
      href: "/admin/audiencias",
    },
    {
      title: "Meus Processos",
      value: totalProcessos.toString(),
      subtitle: "ativos",
      icon: Scale,
      color: "violet",
      href: "/admin/processos",
    },
  ];

  // Cores para gráfico
  const COLORS = {
    emerald: "#10B981",
    blue: "#3B82F6",
    purple: "#8B5CF6",
    orange: "#F97316",
    amber: "#F59E0B",
    red: "#EF4444",
    zinc: "#71717A",
  };

  // Dados para gráfico
  const dadosDonut = totalMinhasDemandas > 0 ? [
    { name: "Urgentes", value: demandasUrgentes, color: COLORS.red },
    { name: "Pendentes", value: demandasPendentes, color: COLORS.amber },
    { name: "Outras", value: totalMinhasDemandas - demandasUrgentes - demandasPendentes, color: COLORS.emerald },
  ] : [
    { name: "Sem dados", value: 1, color: COLORS.zinc },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* HEADER - VERSÃO SIMPLIFICADA */}
      <div className="bg-gradient-to-r from-zinc-50 via-white to-zinc-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 -mx-6 -mt-6 px-6 py-5 mb-6">
        <ProfissionalSwitch variant="full" showEscalaLink={false} />
        
        {/* MENSAGEM DE PRIVACIDADE */}
        <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30">
          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Suas demandas são privadas. Use o botão Compartilhar para enviar demandas específicas para {colegoConfig?.nomeCurto || "outro colega"}.
            Assistidos, casos e processos são compartilhados para inteligência de defesa.
          </p>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses: Record<string, string> = {
            emerald: "bg-emerald-600",
            blue: "bg-blue-600",
            purple: "bg-purple-600",
            orange: "bg-orange-600",
            amber: "bg-amber-600",
            violet: "bg-violet-600",
            zinc: "bg-zinc-600",
          };

          return (
            <Link key={index} href={stat.href}>
              <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group border-zinc-200 dark:border-zinc-800">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-lg ${colorClasses[stat.color]} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</p>
                  <p className="text-xs text-zinc-500">{stat.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{stat.subtitle}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA - Demandas */}
        <div className="lg:col-span-2 space-y-6">
          {/* MINHAS DEMANDAS */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-zinc-500" />
                  <h2 className="font-bold text-zinc-900 dark:text-zinc-50">Minhas Demandas</h2>
                  <Badge variant="secondary" className="text-xs">
                    {totalMinhasDemandas}
                  </Badge>
                </div>
                <Link href="/admin/demandas">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Ver todas
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loadingDemandas ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : minhasDemandas.length === 0 ? (
                <div className="p-8 text-center">
                  <ListTodo className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Nenhuma demanda pendente
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Adicione demandas para vê-las aqui
                  </p>
                  <Button size="sm" className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                    Criar demanda
                  </Button>
                </div>
              ) : (
                minhasDemandas.slice(0, 5).map((demanda: any) => {
                  const prazo = formatarPrazo(demanda.prazo);
                  const isUrgente = demanda.prioridade === "urgente" || demanda.prioridade === "alta";
                  
                  return (
                    <Link key={demanda.id} href={`/admin/demandas/${demanda.id}`}>
                      <div className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {isUrgente && (
                                <Flame className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                              )}
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                {demanda.titulo || demanda.descricao?.substring(0, 50) || "Sem título"}
                              </p>
                            </div>
                            {demanda.processo?.numero && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs text-zinc-400 font-mono truncate">
                                  {demanda.processo.numero}
                                </span>
                                <CopyProcessButton processo={demanda.processo.numero} />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Botão compartilhar */}
                            <CompartilharDemandaModal
                              entidadeTipo="demanda"
                              entidadeId={demanda.id}
                              entidadeTitulo={demanda.titulo || demanda.descricao?.substring(0, 50) || "Demanda"}
                              profissionalAtualId={profissionalAtivoId}
                              trigger={
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                  <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                                </Button>
                              }
                            />
                            
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] ${
                                prazo.cor === "red" ? "border-red-300 text-red-600 bg-red-50" :
                                prazo.cor === "yellow" ? "border-yellow-300 text-yellow-600 bg-yellow-50" :
                                "border-zinc-200 text-zinc-500"
                              }`}
                            >
                              <Clock className="w-2.5 h-2.5 mr-1" />
                              {prazo.texto}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </Card>

          {/* DEMANDAS COMPARTILHADAS COMIGO */}
          {totalCompartilhadas > 0 && (
            <Card className="border-zinc-200 dark:border-zinc-800">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-blue-500" />
                    <h2 className="font-bold text-zinc-900 dark:text-zinc-50">Compartilhadas Comigo</h2>
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                      {totalCompartilhadas}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {demandasCompartilhadas.slice(0, 3).map((demanda: any) => {
                  const prazo = formatarPrazo(demanda.prazo);
                  
                  return (
                    <Link key={demanda.id} href={`/admin/demandas/${demanda.id}`}>
                      <div className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                De: {colegoConfig?.nomeCurto || "Colega"}
                              </Badge>
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                {demanda.titulo || "Sem título"}
                              </p>
                            </div>
                          </div>

                          <Badge 
                            variant="outline" 
                            className={`text-[10px] ${
                              prazo.cor === "red" ? "border-red-300 text-red-600" :
                              prazo.cor === "yellow" ? "border-yellow-300 text-yellow-600" :
                              "border-zinc-200 text-zinc-500"
                            }`}
                          >
                            {prazo.texto}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* COLUNA DIREITA - Audiências e Estatísticas */}
        <div className="space-y-6">
          {/* GRÁFICO DE DEMANDAS */}
          <Card className="border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 mb-4">Visão Geral</h3>
            <div className="h-[180px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosDonut}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {dadosDonut.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {dadosDonut.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-zinc-500">{item.name}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* PRÓXIMAS AUDIÊNCIAS */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Minhas Audiências</h3>
                </div>
                <Link href="/admin/audiencias">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Ver todas
                  </Button>
                </Link>
              </div>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loadingAudiencias ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="p-3">
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))
              ) : minhasAudiencias.length === 0 ? (
                <div className="p-6 text-center">
                  <Calendar className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">Nenhuma audiência agendada</p>
                </div>
              ) : (
                minhasAudiencias.slice(0, 4).map((audiencia: any) => {
                  const data = audiencia.dataHora ? parseISO(audiencia.dataHora) : null;
                  const isHoje = data && isToday(data);
                  const isAmanha = data && isTomorrow(data);
                  
                  return (
                    <div key={audiencia.id} className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {isHoje && <Badge className="text-[10px] bg-red-100 text-red-700">Hoje</Badge>}
                        {isAmanha && <Badge className="text-[10px] bg-amber-100 text-amber-700">Amanhã</Badge>}
                        <span className="text-xs text-zinc-500">
                          {data ? format(data, "dd/MM • HH:mm", { locale: ptBR }) : "-"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {audiencia.tipo || audiencia.descricao || "Audiência"}
                      </p>
                      {audiencia.local && (
                        <p className="text-xs text-zinc-400 truncate">{audiencia.local}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* DADOS COMPARTILHADOS - CARD INFORMATIVO */}
          <Card className="border-zinc-200 dark:border-zinc-800 p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-violet-600" />
              <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Dados Integrados</h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
              Assistidos, casos e processos são compartilhados entre toda a equipe para inteligência de defesa.
            </p>
            <div className="space-y-2">
              <Link href="/admin/assistidos">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-600" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Assistidos</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{totalAssistidos}</Badge>
                </div>
              </Link>
              <Link href="/admin/casos">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-violet-600" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Casos</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{totalCasos}</Badge>
                </div>
              </Link>
              <Link href="/admin/processos">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-violet-600" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Processos</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{totalProcessos}</Badge>
                </div>
              </Link>
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
