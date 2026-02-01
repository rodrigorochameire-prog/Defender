"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Shield,
  ShieldOff,
  Trash2,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  UserCheck,
  UserX,
  Crown,
  Briefcase,
  GraduationCap,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  defensor: "Defensor",
  estagiario: "Estagiário",
  servidor: "Servidor",
};

const roleIcons: Record<string, React.ReactNode> = {
  admin: <Crown className="h-3 w-3" />,
  defensor: <Briefcase className="h-3 w-3" />,
  estagiario: <GraduationCap className="h-3 w-3" />,
  servidor: <Building className="h-3 w-3" />,
};

const roleColors: Record<string, string> = {
  admin: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  defensor: "bg-teal-500/10 text-teal-500 border-teal-500/30",
  estagiario: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  servidor: "bg-purple-500/10 text-purple-500 border-purple-500/30",
};

export default function UsuariosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for creating new user
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "defensor" as "admin" | "defensor" | "estagiario" | "servidor",
    phone: "",
    oab: "",
    comarca: "",
  });

  const utils = trpc.useUtils();

  // Query users
  const { data: users, isLoading } = trpc.users.list.useQuery({
    role: roleFilter === "all" ? undefined : roleFilter as "admin" | "defensor" | "estagiario" | "servidor",
    search: searchTerm || undefined,
  });

  // Query stats
  const { data: stats } = trpc.users.stats.useQuery();

  // Mutations
  const createUserMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setIsCreateModalOpen(false);
      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "defensor",
        phone: "",
        oab: "",
        comarca: "",
      });
      utils.users.list.invalidate();
      utils.users.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar usuário");
    },
  });

  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário removido com sucesso!");
      setIsDeleteModalOpen(false);
      setSelectedUserId(null);
      utils.users.list.invalidate();
      utils.users.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao remover usuário");
    },
  });

  const promoteToAdminMutation = trpc.users.promoteToAdmin.useMutation({
    onSuccess: () => {
      toast.success("Usuário promovido a administrador!");
      utils.users.list.invalidate();
      utils.users.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao promover usuário");
    },
  });

  const demoteFromAdminMutation = trpc.users.demoteFromAdmin.useMutation({
    onSuccess: () => {
      toast.success("Permissão de administrador removida!");
      utils.users.list.invalidate();
      utils.users.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao remover permissão");
    },
  });

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (newUser.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setIsSubmitting(true);
    try {
      await createUserMutation.mutateAsync({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        phone: newUser.phone || undefined,
        oab: newUser.oab || undefined,
        comarca: newUser.comarca || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;

    setIsSubmitting(true);
    try {
      await deleteUserMutation.mutateAsync({ id: selectedUserId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header - Padrão Processos */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <Users className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Usuários</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">• {stats?.total ?? 0} cadastrados</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              className="h-7 px-2.5 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              Novo Usuário
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 md:p-6 space-y-4">
      
      {/* Stats Cards - Padrão Demandas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="group relative p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide">Total</p>
              <p className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">{stats?.total ?? 0}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <Users className="w-4 h-4 text-zinc-500" />
            </div>
          </div>
        </div>
        <div className="group relative p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide">Admins</p>
              <p className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">{stats?.admins ?? 0}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <Crown className="w-4 h-4 text-zinc-500" />
            </div>
          </div>
        </div>
        <div className="group relative p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide">Defensores</p>
              <p className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">{stats?.defensores ?? 0}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <Briefcase className="w-4 h-4 text-zinc-500" />
            </div>
          </div>
        </div>
        <div className="group relative p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide">Estagiários</p>
              <p className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">{stats?.estagiarios ?? 0}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <GraduationCap className="w-4 h-4 text-zinc-500" />
            </div>
          </div>
        </div>
        <div className="group relative p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide">Servidores</p>
              <p className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">{stats?.servidores ?? 0}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <Building className="w-4 h-4 text-zinc-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Padrão Demandas */}
      <Card className="border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Buscar por nome, email ou OAB..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-48 h-9 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
              <SelectValue placeholder="Todos os cargos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cargos</SelectItem>
              <SelectItem value="admin">Administradores</SelectItem>
              <SelectItem value="defensor">Defensores</SelectItem>
              <SelectItem value="estagiario">Estagiários</SelectItem>
              <SelectItem value="servidor">Servidores</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Users List - Padrão Demandas */}
      <Card className="border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Lista de Usuários</h3>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : users && users.length > 0 ? (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all bg-zinc-50/50 dark:bg-zinc-800/30"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-sm font-medium">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{user.name}</p>
                      {user.emailVerified && (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </span>
                      {user.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {user.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("gap-1 text-[10px]", roleColors[user.role])}
                    >
                      {roleIcons[user.role]}
                      {roleLabels[user.role]}
                    </Badge>

                    <span className="text-[10px] text-zinc-400 hidden md:block">
                      {format(new Date(user.createdAt), "dd/MM/yy", { locale: ptBR })}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.role !== "admin" ? (
                          <DropdownMenuItem
                            onClick={() => promoteToAdminMutation.mutate({ id: user.id })}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Promover a Admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => demoteFromAdminMutation.mutate({ id: user.id })}
                          >
                            <ShieldOff className="h-4 w-4 mr-2" />
                            Remover Admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setIsDeleteModalOpen(true);
                          }}
                          className="text-rose-500 focus:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover Usuário
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nenhum usuário encontrado</p>
              <p className="text-xs text-zinc-500">Ajuste os filtros ou adicione um novo usuário</p>
            </div>
          )}
        </div>
      </Card>

      </div>

      {/* Create User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário com acesso ao sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                placeholder="Nome do usuário"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Cargo</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) =>
                  setNewUser({ ...newUser, role: value as typeof newUser.role })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defensor">Defensor</SelectItem>
                  <SelectItem value="estagiario">Estagiário</SelectItem>
                  <SelectItem value="servidor">Servidor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oab">OAB</Label>
                <Input
                  id="oab"
                  placeholder="00000/UF"
                  value={newUser.oab}
                  onChange={(e) => setNewUser({ ...newUser, oab: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comarca">Comarca</Label>
              <Input
                id="comarca"
                placeholder="Comarca de atuação"
                value={newUser.comarca}
                onChange={(e) => setNewUser({ ...newUser, comarca: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Usuário
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remover Usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
