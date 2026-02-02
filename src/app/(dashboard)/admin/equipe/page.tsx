// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  RefreshCw,
  Send,
  Scale,
  User,
  Eye,
  Lock,
  KeyRound,
  UserCheck,
  Copy,
  Check,
  X,
  Trash2,
  Edit,
  Loader2,
  Activity,
  FileText,
  TrendingUp,
  BarChart3,
  ListTodo,
  FolderOpen,
  Download,
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
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tipos
interface TeamMember {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  oab: string | null;
  comarca: string | null;
  workspaceId: number | null;
  workspaceName: string | null;
  createdAt: Date;
  emailVerified: boolean;
}

export default function EquipePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("visao-geral");
  const { user, canManageTeam, getRoleLabel, getRoleColor } = usePermissions();
  
  // Estados para modais
  const [selectedMembro, setSelectedMembro] = useState<TeamMember | null>(null);
  const [perfilModalOpen, setPerfilModalOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<number | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "estagiario" as string,
    oab: "",
    comarca: "Camaçari",
  });

  // tRPC queries
  const { data: membrosData, isLoading: isLoadingMembros, refetch: refetchMembros } = trpc.users.list.useQuery();
  const { data: statsData } = trpc.users.stats.useQuery();
  const { data: delegacoesEnviadas, isLoading: isLoadingDelegacoes } = trpc.delegacao.delegacoesEnviadas.useQuery({});
  const { data: estatisticasDelegacoes } = trpc.delegacao.estatisticas.useQuery();
  
  // Logs de atividade da equipe
  const { data: teamActivity, isLoading: isLoadingActivity } = trpc.activityLogs.teamStats.useQuery({ days: 30 });
  const { data: recentLogs, isLoading: isLoadingLogs } = trpc.activityLogs.recentTeamActivity.useQuery({ limit: 30, excludeAdmins: true });
  
  // tRPC mutations
  const createUserMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Membro adicionado com sucesso!");
      setAddModalOpen(false);
      resetForm();
      refetchMembros();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao adicionar membro");
    },
  });
  
  const updateUserMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Membro atualizado com sucesso!");
      setEditModalOpen(false);
      setSelectedMembro(null);
      refetchMembros();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar membro");
    },
  });
  
  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("Membro removido com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedMembro(null);
      refetchMembros();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao remover membro");
    },
  });

  const resetPasswordMutation = trpc.users.resetPassword.useMutation({
    onSuccess: (result) => {
      toast.success(`Senha de ${result.userName} redefinida com sucesso!`);
      setResetPasswordModalOpen(false);
      setSelectedMembro(null);
      setNewPassword("");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao redefinir senha");
    },
  });

  // Handlers
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "estagiario",
      oab: "",
      comarca: "Camaçari",
    });
  };
  
  const handleAddMembro = () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    createUserMutation.mutate({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone || undefined,
      role: formData.role as any,
      oab: formData.oab || undefined,
      comarca: formData.comarca || undefined,
    });
  };
  
  const handleEditMembro = () => {
    if (!selectedMembro) return;
    updateUserMutation.mutate({
      id: selectedMembro.id,
      name: formData.name,
      phone: formData.phone || undefined,
      role: formData.role as any,
      oab: formData.oab || undefined,
      comarca: formData.comarca || undefined,
    });
  };
  
  const handleDeleteMembro = () => {
    if (!selectedMembro) return;
    deleteUserMutation.mutate({ id: selectedMembro.id });
  };
  
  const openEditModal = (membro: TeamMember) => {
    setSelectedMembro(membro);
    setFormData({
      name: membro.name,
      email: membro.email,
      password: "",
      phone: membro.phone || "",
      role: membro.role,
      oab: membro.oab || "",
      comarca: membro.comarca || "",
    });
    setEditModalOpen(true);
  };
  
  const openDeleteDialog = (membro: TeamMember) => {
    setSelectedMembro(membro);
    setDeleteDialogOpen(true);
  };

  const openResetPasswordModal = (membro: TeamMember) => {
    setSelectedMembro(membro);
    setNewPassword("");
    setResetPasswordModalOpen(true);
  };

  const handleResetPassword = () => {
    if (!selectedMembro || !newPassword) {
      toast.error("Preencha a nova senha");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    resetPasswordMutation.mutate({
      userId: selectedMembro.id,
      newPassword,
    });
  };

  const handleCopiarEmail = (membro: TeamMember) => {
    navigator.clipboard.writeText(membro.email);
    setCopiedEmail(membro.id);
    toast.success("Email copiado!");
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Filtrar membros pela busca
  const membrosFiltered = useMemo(() => {
    if (!membrosData) return [];
    return membrosData.filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [membrosData, searchQuery]);

  // Estatísticas
  const estatisticas = useMemo(() => {
    if (!statsData) return {
      total: 0,
      online: 0,
      defensores: 0,
      servidores: 0,
      estagiarios: 0,
      delegacoesPendentes: 0,
      delegacoesEmAndamento: 0,
    };
    
    return {
      total: statsData.total,
      online: 0, // Não temos tracking de online
      defensores: statsData.defensores,
      servidores: statsData.servidores,
      estagiarios: statsData.estagiarios,
      delegacoesPendentes: estatisticasDelegacoes?.pendentes || 0,
      delegacoesEmAndamento: estatisticasDelegacoes?.emAndamento || 0,
    };
  }, [statsData, estatisticasDelegacoes]);

  // Labels de role
  const getRoleLabelLocal = (role: string): string => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      defensor: "Defensor(a)",
      servidor: "Servidor(a)",
      estagiario: "Estagiário(a)",
      triagem: "Triagem",
    };
    return labels[role] || role;
  };

  const getRoleColorLocal = (role: string): string => {
    const colors: Record<string, string> = {
      admin: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
      defensor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      servidor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      estagiario: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      triagem: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
    };
    return colors[role] || "bg-zinc-100 text-zinc-700";
  };

  // Loading state
  if (isLoadingMembros) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
        <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-xl" />
            <div>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-1" />
            </div>
          </div>
        </div>
        <div className="p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header - Padrão Defender */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <Users className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Gestão de membros e delegações</span>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative mr-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[140px] h-7 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-md"
              />
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600"
              title="Exportar"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button 
              size="sm" 
              className="h-7 px-2.5 ml-1 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
              onClick={() => {
                resetForm();
                setAddModalOpen(true);
              }}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              Novo Membro
            </Button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 md:p-6 space-y-6">

      {/* Stats Cards - Mobile-first */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="group relative p-5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs sm:text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 transition-colors">Total</p>
              <p className="text-2xl sm:text-xl font-semibold text-zinc-700 dark:text-zinc-300">{estatisticas.total}</p>
              <p className="text-xs sm:text-[10px] text-zinc-400">membros</p>
            </div>
            <div className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all">
              <Users className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-500 group-hover:text-emerald-600 transition-colors" />
            </div>
          </div>
        </div>

        <div className="group relative p-5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs sm:text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 transition-colors">Pendentes</p>
              <p className="text-2xl sm:text-xl font-semibold text-zinc-700 dark:text-zinc-300">{estatisticas.delegacoesPendentes}</p>
              <p className="text-xs sm:text-[10px] text-zinc-400">delegações</p>
            </div>
            <div className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all">
              <Clock className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-500 group-hover:text-emerald-600 transition-colors" />
            </div>
          </div>
        </div>

        <div className="group relative p-5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs sm:text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 transition-colors">Andamento</p>
              <p className="text-2xl sm:text-xl font-semibold text-zinc-700 dark:text-zinc-300">{estatisticas.delegacoesEmAndamento}</p>
              <p className="text-xs sm:text-[10px] text-zinc-400">em execução</p>
            </div>
            <div className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all">
              <RefreshCw className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-500 group-hover:text-emerald-600 transition-colors" />
            </div>
          </div>
        </div>

        <div className="group relative p-5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs sm:text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 transition-colors">Concluídas</p>
              <p className="text-2xl sm:text-xl font-semibold text-zinc-700 dark:text-zinc-300">{estatisticasDelegacoes?.concluidas || 0}</p>
              <p className="text-xs sm:text-[10px] text-zinc-400">este mês</p>
            </div>
            <div className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all">
              <CheckCircle2 className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-500 group-hover:text-emerald-600 transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <TabsTrigger 
            value="visao-geral" 
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "visao-geral" 
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md" 
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            <Users className="w-4 h-4 mr-2" />
            Membros
          </TabsTrigger>
          <TabsTrigger 
            value="delegacoes"
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "delegacoes" 
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md" 
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            <Send className="w-4 h-4 mr-2" />
            Delegações
          </TabsTrigger>
          <TabsTrigger 
            value="atividade"
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "atividade" 
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md" 
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            <Activity className="w-4 h-4 mr-2" />
            Atividade
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral (Membros) */}
        <TabsContent value="visao-geral" className="space-y-4">
          {membrosFiltered.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Users className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Nenhum membro encontrado
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                {searchQuery ? "Tente ajustar sua busca" : "Adicione membros à sua equipe"}
              </p>
              {canManageTeam() && !searchQuery && (
                <Button onClick={() => setAddModalOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Adicionar Membro
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {membrosFiltered.map((membro) => (
                <Card
                  key={membro.id}
                  className="group p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:shadow-zinc-900/10 dark:hover:shadow-white/5 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border-2 border-zinc-100 dark:border-zinc-800">
                        <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                          {membro.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{membro.name}</h3>
                        <Badge className={cn("text-[10px] font-medium", getRoleColorLocal(membro.role))}>
                          {getRoleLabelLocal(membro.role)}
                        </Badge>
                      </div>
                    </div>

                    {canManageTeam() && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => {
                            setSelectedMembro(membro);
                            setPerfilModalOpen(true);
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditModal(membro)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openResetPasswordModal(membro)}>
                            <Lock className="w-4 h-4 mr-2" />
                            Redefinir Senha
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(membro)}
                            className="text-rose-600 focus:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <Mail className="w-4 h-4" />
                      <span className="truncate flex-1">{membro.email}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleCopiarEmail(membro)}
                      >
                        {copiedEmail === membro.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    {membro.phone && (
                      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <Phone className="w-4 h-4" />
                        <span>{membro.phone}</span>
                      </div>
                    )}
                    {membro.comarca && (
                      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <Scale className="w-4 h-4" />
                        <span>{membro.comarca}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                    <span>Desde {format(new Date(membro.createdAt), "MMM yyyy", { locale: ptBR })}</span>
                    {membro.emailVerified ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Verificado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-200">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Delegações */}
        <TabsContent value="delegacoes" className="space-y-4">
          {isLoadingDelegacoes ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : !delegacoesEnviadas || delegacoesEnviadas.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Send className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Nenhuma delegação
              </h3>
              <p className="text-sm text-zinc-500">
                As delegações que você enviar aparecerão aqui
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {delegacoesEnviadas.map((delegacao) => (
                <Card
                  key={delegacao.id}
                  className="p-4 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        delegacao.status === "pendente" && "bg-amber-100 dark:bg-amber-900/30",
                        delegacao.status === "aceita" && "bg-blue-100 dark:bg-blue-900/30",
                        delegacao.status === "em_andamento" && "bg-blue-100 dark:bg-blue-900/30",
                        delegacao.status === "concluida" && "bg-emerald-100 dark:bg-emerald-900/30",
                      )}>
                        {delegacao.status === "pendente" && <Clock className="w-5 h-5 text-amber-600" />}
                        {delegacao.status === "aceita" && <UserCheck className="w-5 h-5 text-blue-600" />}
                        {delegacao.status === "em_andamento" && <RefreshCw className="w-5 h-5 text-blue-600" />}
                        {delegacao.status === "concluida" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {delegacao.instrucoes}
                        </p>
                        <p className="text-sm text-zinc-500">
                          Para: {delegacao.delegadoPara?.name} • {format(new Date(delegacao.dataDelegacao), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn(
                      delegacao.status === "pendente" && "bg-amber-100 text-amber-700",
                      delegacao.status === "aceita" && "bg-blue-100 text-blue-700",
                      delegacao.status === "em_andamento" && "bg-blue-100 text-blue-700",
                      delegacao.status === "concluida" && "bg-emerald-100 text-emerald-700",
                    )}>
                      {delegacao.status === "pendente" && "Pendente"}
                      {delegacao.status === "aceita" && "Aceita"}
                      {delegacao.status === "em_andamento" && "Em andamento"}
                      {delegacao.status === "concluida" && "Concluída"}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Atividade da Equipe */}
        <TabsContent value="atividade" className="space-y-6">
          {/* Cards de estatísticas por membro */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Produtividade da Equipe (30 dias)
            </h3>
            
            {isLoadingActivity ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
              </div>
            ) : teamActivity && teamActivity.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamActivity.map((member) => (
                  <Card
                    key={member.userId}
                    className="p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold">
                          {member.userName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">{member.userName}</h4>
                        <Badge className={cn("text-[9px]", getRoleColorLocal(member.userRole as string))}>
                          {getRoleLabelLocal(member.userRole as string)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30">
                        <div className="flex items-center gap-2 mb-1">
                          <ListTodo className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Demandas</span>
                        </div>
                        <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{member.demandas}</p>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Assistidos</span>
                        </div>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{member.assistidos}</p>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Scale className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">Processos</span>
                        </div>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{member.processos}</p>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/30">
                        <div className="flex items-center gap-2 mb-1">
                          <FolderOpen className="w-3.5 h-3.5 text-violet-600" />
                          <span className="text-[10px] text-violet-700 dark:text-violet-400 font-medium">Documentos</span>
                        </div>
                        <p className="text-xl font-bold text-violet-700 dark:text-violet-400">{member.documentos}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Total de ações</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                          {member.total}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center border-dashed">
                <Activity className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nenhuma atividade registrada
                </h3>
                <p className="text-sm text-zinc-500">
                  As atividades da equipe aparecerão aqui
                </p>
              </Card>
            )}
          </div>

          {/* Timeline de atividades recentes */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Atividades Recentes da Equipe
              </h3>
            </div>
            
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto">
              {isLoadingLogs ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : recentLogs && recentLogs.length > 0 ? (
                recentLogs.map((log) => {
                  const acaoIcons: Record<string, React.ReactNode> = {
                    CREATE: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
                    UPDATE: <Edit className="w-4 h-4 text-blue-500" />,
                    DELETE: <Trash2 className="w-4 h-4 text-rose-500" />,
                    COMPLETE: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
                    DELEGATE: <Send className="w-4 h-4 text-amber-500" />,
                    UPLOAD: <FolderOpen className="w-4 h-4 text-violet-500" />,
                  };
                  
                  const acaoLabels: Record<string, string> = {
                    CREATE: "criou",
                    UPDATE: "atualizou",
                    DELETE: "excluiu",
                    COMPLETE: "concluiu",
                    DELEGATE: "delegou",
                    UPLOAD: "enviou",
                    VIEW: "visualizou",
                    SYNC: "sincronizou",
                  };
                  
                  const entidadeLabels: Record<string, string> = {
                    demanda: "demanda",
                    assistido: "assistido",
                    processo: "processo",
                    documento: "documento",
                    audiencia: "audiência",
                    delegacao: "delegação",
                    caso: "caso",
                    jurado: "jurado",
                  };
                  
                  return (
                    <div key={log.id} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        {acaoIcons[log.acao] || <Activity className="w-4 h-4 text-zinc-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                          <span className="font-medium">{log.user?.name}</span>
                          {" "}
                          <span className="text-zinc-500">{acaoLabels[log.acao] || log.acao}</span>
                          {" "}
                          <span className="font-medium">{entidadeLabels[log.entidadeTipo] || log.entidadeTipo}</span>
                        </p>
                        {log.descricao && (
                          <p className="text-xs text-zinc-500 truncate">{log.descricao}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 flex-shrink-0">
                        {format(new Date(log.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <Activity className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                  <p className="text-sm text-zinc-500">Nenhuma atividade recente</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Adicionar Membro */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Membro</DialogTitle>
            <DialogDescription>
              Adicione um novo membro à sua equipe
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defensor">Defensor(a)</SelectItem>
                  <SelectItem value="servidor">Servidor(a)</SelectItem>
                  <SelectItem value="estagiario">Estagiário(a)</SelectItem>
                  <SelectItem value="triagem">Triagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddMembro} 
              disabled={createUserMutation.isPending}
              className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900"
            >
              {createUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Membro */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
            <DialogDescription>
              Atualize as informações do membro
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Função</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defensor">Defensor(a)</SelectItem>
                  <SelectItem value="servidor">Servidor(a)</SelectItem>
                  <SelectItem value="estagiario">Estagiário(a)</SelectItem>
                  <SelectItem value="triagem">Triagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-comarca">Comarca</Label>
              <Input
                id="edit-comarca"
                value={formData.comarca}
                onChange={(e) => setFormData({ ...formData, comarca: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEditMembro} 
              disabled={updateUserMutation.isPending}
              className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900"
            >
              {updateUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Ver Perfil */}
      <Dialog open={perfilModalOpen} onOpenChange={setPerfilModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Perfil do Membro</DialogTitle>
          </DialogHeader>
          {selectedMembro && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-xl">
                    {selectedMembro.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedMembro.name}</h3>
                  <Badge className={getRoleColorLocal(selectedMembro.role)}>
                    {getRoleLabelLocal(selectedMembro.role)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-zinc-400" />
                  <span>{selectedMembro.email}</span>
                </div>
                {selectedMembro.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-zinc-400" />
                    <span>{selectedMembro.phone}</span>
                  </div>
                )}
                {selectedMembro.comarca && (
                  <div className="flex items-center gap-3">
                    <Scale className="w-4 h-4 text-zinc-400" />
                    <span>{selectedMembro.comarca}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-zinc-400" />
                  <span>Desde {format(new Date(selectedMembro.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Redefinir Senha */}
      <Dialog open={resetPasswordModalOpen} onOpenChange={setResetPasswordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-500" />
              Redefinir Senha
            </DialogTitle>
            <DialogDescription>
              Defina uma nova senha para <strong>{selectedMembro?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha *</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending || newPassword.length < 6}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {resetPasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Redefinir Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog: Confirmar exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{selectedMembro?.name}</strong> da equipe?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMembro}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleteUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
