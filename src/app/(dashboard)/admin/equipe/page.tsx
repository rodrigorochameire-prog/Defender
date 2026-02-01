// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Calendar,
  Filter,
  MoreHorizontal,
  RefreshCw,
  Send,
  ChevronRight,
  Briefcase,
  Scale,
  FileText,
  TrendingUp,
  User,
  Settings,
  Eye,
  UserCheck,
  Link2,
  ExternalLink,
  Copy,
  Check,
  X,
  Trash2,
  Edit,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePermissions, type UserRole } from "@/hooks/use-permissions";
import { toast } from "sonner";
import { DelegacaoModal } from "@/components/demandas/delegacao-modal";

// Mock data para membros da equipe
const MOCK_TEAM_MEMBERS = [
  {
    id: 1,
    name: "Dr. Rodrigo",
    email: "rodrigo@defender.app",
    phone: "(71) 99999-1111",
    role: "defensor" as UserRole,
    funcao: "Defensor Público Titular",
    supervisorId: null,
    photoUrl: null,
    stats: { pendentes: 12, concluidas: 45, delegadas: 8 },
    status: "online",
    lastActivity: "Agora",
  },
  {
    id: 2,
    name: "Dra. Juliane",
    email: "juliane@defender.app",
    phone: "(71) 99999-2222",
    role: "defensor" as UserRole,
    funcao: "Defensora Pública Titular",
    supervisorId: null,
    photoUrl: null,
    stats: { pendentes: 8, concluidas: 52, delegadas: 5 },
    status: "online",
    lastActivity: "Agora",
  },
  {
    id: 3,
    name: "Amanda",
    email: "amanda@defender.app",
    phone: "(71) 99999-3333",
    role: "servidor" as UserRole,
    funcao: "Servidora Administrativa",
    supervisorId: null,
    photoUrl: null,
    stats: { pendentes: 4, concluidas: 28, delegadas: 0 },
    status: "online",
    lastActivity: "Há 5 min",
  },
  {
    id: 4,
    name: "Emilly",
    email: "emilly@defender.app",
    phone: "(71) 99999-4444",
    role: "estagiario" as UserRole,
    funcao: "Estagiária de Direito",
    supervisorId: 1, // Dr. Rodrigo
    photoUrl: null,
    stats: { pendentes: 3, concluidas: 15, delegadas: 0 },
    status: "away",
    lastActivity: "Há 30 min",
  },
  {
    id: 5,
    name: "Taíssa",
    email: "taissa@defender.app",
    phone: "(71) 99999-5555",
    role: "estagiario" as UserRole,
    funcao: "Estagiária de Direito",
    supervisorId: 2, // Dra. Juliane
    photoUrl: null,
    stats: { pendentes: 5, concluidas: 12, delegadas: 0 },
    status: "online",
    lastActivity: "Há 10 min",
  },
  {
    id: 6,
    name: "Gustavo",
    email: "gustavo@defender.app",
    phone: "(71) 99999-6666",
    role: "triagem" as UserRole,
    funcao: "Triagem e Atendimento",
    supervisorId: null,
    photoUrl: null,
    stats: { pendentes: 0, concluidas: 120, delegadas: 0 },
    status: "offline",
    lastActivity: "Ontem",
  },
];

// Mock de delegações pendentes
const MOCK_DELEGACOES = [
  {
    id: 1,
    demandaAto: "Resposta à Acusação",
    assistidoNome: "João Silva",
    processoNumero: "0001234-56.2024.8.05.0001",
    delegadoPara: "Emilly",
    delegadoPorId: 1,
    dataDelegacao: "2024-01-28",
    prazoSugerido: "2024-02-05",
    status: "pendente",
    prioridade: "NORMAL",
  },
  {
    id: 2,
    demandaAto: "Petição de Liberdade",
    assistidoNome: "Maria Santos",
    processoNumero: "0002345-67.2024.8.05.0001",
    delegadoPara: "Amanda",
    delegadoPorId: 1,
    dataDelegacao: "2024-01-27",
    prazoSugerido: "2024-02-01",
    status: "em_andamento",
    prioridade: "URGENTE",
  },
  {
    id: 3,
    demandaAto: "Alegações Finais",
    assistidoNome: "Carlos Oliveira",
    processoNumero: "0003456-78.2024.8.05.0001",
    delegadoPara: "Taíssa",
    delegadoPorId: 2,
    dataDelegacao: "2024-01-26",
    prazoSugerido: "2024-02-10",
    status: "concluida",
    prioridade: "NORMAL",
  },
];

export default function EquipePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("visao-geral");
  const { user, canManageTeam, getRoleLabel, getRoleColor } = usePermissions();
  
  // Estados para modais e ações
  const [delegacaoModalOpen, setDelegacaoModalOpen] = useState(false);
  const [selectedMembro, setSelectedMembro] = useState<typeof MOCK_TEAM_MEMBERS[0] | null>(null);
  const [perfilModalOpen, setPerfilModalOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<number | null>(null);

  // Handlers para ações
  const handleVerPerfil = (membro: typeof MOCK_TEAM_MEMBERS[0]) => {
    setSelectedMembro(membro);
    setPerfilModalOpen(true);
  };

  const handleEnviarEmail = (membro: typeof MOCK_TEAM_MEMBERS[0]) => {
    window.open(`mailto:${membro.email}`, "_blank");
    toast.success(`Abrindo email para ${membro.name}`);
  };

  const handleCopiarEmail = (membro: typeof MOCK_TEAM_MEMBERS[0]) => {
    navigator.clipboard.writeText(membro.email);
    setCopiedEmail(membro.id);
    toast.success("Email copiado!");
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleDelegarTarefa = (membro: typeof MOCK_TEAM_MEMBERS[0]) => {
    setSelectedMembro(membro);
    setDelegacaoModalOpen(true);
  };

  const handleLigar = (membro: typeof MOCK_TEAM_MEMBERS[0]) => {
    window.open(`tel:${membro.phone}`, "_blank");
    toast.success(`Ligando para ${membro.name}`);
  };

  // Filtrar membros pela busca
  const membrosFiltered = useMemo(() => {
    return MOCK_TEAM_MEMBERS.filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.funcao.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Estatísticas gerais
  const estatisticas = useMemo(() => {
    const total = MOCK_TEAM_MEMBERS.length;
    const online = MOCK_TEAM_MEMBERS.filter((m) => m.status === "online").length;
    const defensores = MOCK_TEAM_MEMBERS.filter((m) => m.role === "defensor").length;
    const servidores = MOCK_TEAM_MEMBERS.filter((m) => m.role === "servidor").length;
    const estagiarios = MOCK_TEAM_MEMBERS.filter((m) => m.role === "estagiario").length;
    const delegacoesPendentes = MOCK_DELEGACOES.filter((d) => d.status === "pendente").length;
    const delegacoesEmAndamento = MOCK_DELEGACOES.filter((d) => d.status === "em_andamento").length;

    return { total, online, defensores, servidores, estagiarios, delegacoesPendentes, delegacoesEmAndamento };
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      online: "bg-emerald-500",
      away: "bg-amber-500",
      offline: "bg-zinc-400",
    };
    return colors[status] || colors.offline;
  };

  const getDelegacaoStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      pendente: { label: "Pendente", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
      aceita: { label: "Aceita", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
      em_andamento: { label: "Em Andamento", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
      concluida: { label: "Concluída", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
      devolvida: { label: "Devolvida", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
    };
    return configs[status] || configs.pendente;
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      BAIXA: { label: "Baixa", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
      NORMAL: { label: "Normal", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
      URGENTE: { label: "Urgente", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
    };
    return configs[prioridade] || configs.NORMAL;
  };

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* Header - Sofisticado Preto e Branco */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <span className="tracking-tight">Equipe</span>
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 ml-14">
            Gerencie sua equipe e acompanhe as delegações
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar membro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[220px] h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
            />
          </div>
          {canManageTeam() && (
            <Button 
              size="sm" 
              className="h-10 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl font-medium shadow-lg"
              onClick={() => toast.info("Funcionalidade de adicionar membro em desenvolvimento")}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards - Design Sofisticado Preto e Branco */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="group relative p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-zinc-900/10 dark:hover:shadow-white/5 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-md">
              <Users className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tighter">{estatisticas.total}</p>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Membros</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {estatisticas.online} online
            </span>
          </div>
        </Card>

        <Card className="group relative p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-zinc-900/10 dark:hover:shadow-white/5 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/30">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tighter">{estatisticas.delegacoesPendentes}</p>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Pendentes</p>
            </div>
          </div>
        </Card>

        <Card className="group relative p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-zinc-900/10 dark:hover:shadow-white/5 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-md shadow-blue-500/30">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tighter">{estatisticas.delegacoesEmAndamento}</p>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Em Andamento</p>
            </div>
          </div>
        </Card>

        <Card className="group relative p-5 bg-zinc-900 dark:bg-white border-zinc-800 dark:border-zinc-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-md">
              <TrendingUp className="w-5 h-5 text-zinc-900 dark:text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white dark:text-zinc-900 tracking-tighter">
                {MOCK_TEAM_MEMBERS.reduce((acc, m) => acc + m.stats.concluidas, 0)}
              </p>
              <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Concluídas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs - Design Sofisticado Preto e Branco */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <TabsTrigger value="visao-geral" className="text-sm font-medium rounded-xl px-4 py-2.5 data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-zinc-900 data-[state=active]:shadow-md transition-all duration-200">
            <Users className="w-4 h-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="delegacoes" className="text-sm font-medium rounded-xl px-4 py-2.5 data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-zinc-900 data-[state=active]:shadow-md transition-all duration-200">
            <Send className="w-4 h-4 mr-2" />
            Delegações
            {estatisticas.delegacoesPendentes > 0 && (
              <Badge className="ml-2 h-5 px-2 text-[10px] bg-amber-500 text-white border-0 font-semibold">
                {estatisticas.delegacoesPendentes}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vinculos" className="text-sm font-medium rounded-xl px-4 py-2.5 data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-zinc-900 data-[state=active]:shadow-md transition-all duration-200">
            <Link2 className="w-4 h-4 mr-2" />
            Vínculos
          </TabsTrigger>
          {canManageTeam() && (
            <TabsTrigger value="configurar" className="text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm">
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Configurar
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {membrosFiltered.map((membro) => {
              const supervisor = MOCK_TEAM_MEMBERS.find((m) => m.id === membro.supervisorId);
              return (
                <Card
                  key={membro.id}
                  className="group relative p-5 bg-white dark:bg-zinc-900/80 border-zinc-100 dark:border-zinc-800/60 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-200/60 dark:hover:border-emerald-800/40 transition-all duration-300"
                >
                  {/* Accent gradient on hover */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="h-13 w-13 ring-2 ring-zinc-100 dark:ring-zinc-800">
                        <AvatarImage src={membro.photoUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800 text-zinc-600 dark:text-zinc-300 text-lg font-semibold">
                          {membro.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm",
                          getStatusColor(membro.status)
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[15px] text-zinc-900 dark:text-zinc-50 truncate">
                          {membro.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={cn("text-[9px] px-1.5 py-0", getRoleColor(membro.role))}
                        >
                          {getRoleLabel(membro.role)}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{membro.funcao}</p>
                      {supervisor && (
                        <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
                          <Link2 className="w-2.5 h-2.5" />
                          Vinculado a {supervisor.name}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleVerPerfil(membro)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEnviarEmail(membro)}>
                          <Mail className="w-4 h-4 mr-2" />
                          Enviar Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleLigar(membro)}>
                          <Phone className="w-4 h-4 mr-2" />
                          Ligar
                        </DropdownMenuItem>
                        {canManageTeam() && membro.role !== "defensor" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelegarTarefa(membro)}>
                              <Send className="w-4 h-4 mr-2" />
                              Delegar Tarefa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info("Configuração de acesso em desenvolvimento")}>
                              <Settings className="w-4 h-4 mr-2" />
                              Configurar Acesso
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{membro.stats.pendentes}</p>
                        <p className="text-[10px] text-zinc-500">Pendentes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{membro.stats.concluidas}</p>
                        <p className="text-[10px] text-zinc-500">Concluídas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{membro.stats.delegadas}</p>
                        <p className="text-[10px] text-zinc-500">Delegadas</p>
                      </div>
                    </div>
                  </div>

                  {/* Last Activity */}
                  <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {membro.lastActivity}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs text-emerald-600 hover:text-emerald-700 p-0"
                      onClick={() => handleVerPerfil(membro)}
                    >
                      Ver detalhes
                      <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab: Delegações */}
        <TabsContent value="delegacoes" className="space-y-4">
          <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-500" />
                Delegações Recentes
              </h3>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {MOCK_DELEGACOES.map((delegacao) => {
                const statusBadge = getDelegacaoStatusBadge(delegacao.status);
                const prioridadeBadge = getPrioridadeBadge(delegacao.prioridade);
                return (
                  <div
                    key={delegacao.id}
                    className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
                            {delegacao.demandaAto}
                          </span>
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", statusBadge.className)}>
                            {statusBadge.label}
                          </Badge>
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", prioridadeBadge.className)}>
                            {prioridadeBadge.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          {delegacao.assistidoNome} • <span className="font-mono">{delegacao.processoNumero}</span>
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Send className="w-3 h-3" />
                            Para: <span className="text-zinc-600 dark:text-zinc-300">{delegacao.delegadoPara}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Prazo: {new Date(delegacao.prazoSugerido).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => toast.info(`Visualizando delegação: ${delegacao.demandaAto}`)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Ver
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Vínculos */}
        <TabsContent value="vinculos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dr. Rodrigo */}
            <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">R</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Dr. Rodrigo</h3>
                  <p className="text-xs text-zinc-500">Defensor Público Titular</p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                  Equipe Vinculada
                </p>
                <div className="space-y-2">
                  {MOCK_TEAM_MEMBERS.filter((m) => m.supervisorId === 1).map((membro) => (
                    <div
                      key={membro.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                          {membro.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{membro.name}</p>
                        <p className="text-[10px] text-zinc-500">{membro.funcao}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[9px]", getRoleColor(membro.role))}>
                        {getRoleLabel(membro.role)}
                      </Badge>
                    </div>
                  ))}
                  {MOCK_TEAM_MEMBERS.filter((m) => m.supervisorId === 1).length === 0 && (
                    <p className="text-xs text-zinc-500 text-center py-4">Nenhum membro vinculado</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Dra. Juliane */}
            <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-violet-100 dark:bg-violet-900/30 text-violet-600">J</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Dra. Juliane</h3>
                  <p className="text-xs text-zinc-500">Defensora Pública Titular</p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                  Equipe Vinculada
                </p>
                <div className="space-y-2">
                  {MOCK_TEAM_MEMBERS.filter((m) => m.supervisorId === 2).map((membro) => (
                    <div
                      key={membro.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                          {membro.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{membro.name}</p>
                        <p className="text-[10px] text-zinc-500">{membro.funcao}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[9px]", getRoleColor(membro.role))}>
                        {getRoleLabel(membro.role)}
                      </Badge>
                    </div>
                  ))}
                  {MOCK_TEAM_MEMBERS.filter((m) => m.supervisorId === 2).length === 0 && (
                    <p className="text-xs text-zinc-500 text-center py-4">Nenhum membro vinculado</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Configurar */}
        {canManageTeam() && (
          <TabsContent value="configurar" className="space-y-4">
            <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Configurações da Equipe</h3>
                <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
                  Configure permissões, vínculos entre membros e políticas de delegação.
                </p>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <Button variant="outline" onClick={() => toast.info("Funcionalidade de adicionar membro em desenvolvimento")}>
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Adicionar Membro
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab("vinculos")}>
                    <Link2 className="w-4 h-4 mr-1.5" />
                    Gerenciar Vínculos
                  </Button>
                  <Button variant="outline" onClick={() => toast.info("Configuração de permissões em desenvolvimento")}>
                    <Shield className="w-4 h-4 mr-1.5" />
                    Permissões
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Modal de Perfil do Membro */}
      <Dialog open={perfilModalOpen} onOpenChange={setPerfilModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                  {selectedMembro?.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="font-semibold">{selectedMembro?.name}</span>
                <Badge variant="outline" className={cn("ml-2 text-[9px]", selectedMembro ? getRoleColor(selectedMembro.role) : "")}>
                  {selectedMembro ? getRoleLabel(selectedMembro.role) : ""}
                </Badge>
              </div>
            </DialogTitle>
            <DialogDescription>{selectedMembro?.funcao}</DialogDescription>
          </DialogHeader>

          {selectedMembro && (
            <div className="space-y-4 py-4">
              {/* Contato */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Contato</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleEnviarEmail(selectedMembro)}
                    className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors text-left"
                  >
                    <Mail className="w-4 h-4 text-zinc-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-zinc-500">Email</p>
                      <p className="text-xs font-medium truncate">{selectedMembro.email}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopiarEmail(selectedMembro); }}
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded"
                    >
                      {copiedEmail === selectedMembro.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-zinc-400" />
                      )}
                    </button>
                  </button>
                  <button
                    onClick={() => handleLigar(selectedMembro)}
                    className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors text-left"
                  >
                    <Phone className="w-4 h-4 text-zinc-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-zinc-500">Telefone</p>
                      <p className="text-xs font-medium">{selectedMembro.phone}</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Estatísticas do Mês</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <p className="text-2xl font-bold text-amber-600">{selectedMembro.stats.pendentes}</p>
                    <p className="text-[10px] text-zinc-500">Pendentes</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <p className="text-2xl font-bold text-emerald-600">{selectedMembro.stats.concluidas}</p>
                    <p className="text-[10px] text-zinc-500">Concluídas</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-2xl font-bold text-blue-600">{selectedMembro.stats.delegadas}</p>
                    <p className="text-[10px] text-zinc-500">Delegadas</p>
                  </div>
                </div>
              </div>

              {/* Vínculo */}
              {selectedMembro.supervisorId && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Vínculo</p>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <Link2 className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm">
                      Vinculado a <span className="font-medium">{MOCK_TEAM_MEMBERS.find(m => m.id === selectedMembro.supervisorId)?.name}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPerfilModalOpen(false)}>
              Fechar
            </Button>
            {selectedMembro && selectedMembro.role !== "defensor" && canManageTeam() && (
              <Button 
                onClick={() => {
                  setPerfilModalOpen(false);
                  handleDelegarTarefa(selectedMembro);
                }}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Delegar Tarefa
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Delegação */}
      <DelegacaoModal
        open={delegacaoModalOpen}
        onOpenChange={setDelegacaoModalOpen}
        onDelegacaoSucesso={(data) => {
          toast.success(`Tarefa delegada para ${data.destinatarioNome}!`);
          setDelegacaoModalOpen(false);
        }}
      />
    </div>
  );
}
