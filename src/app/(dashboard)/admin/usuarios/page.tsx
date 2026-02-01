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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 rounded-lg">
            <Users className="h-6 w-6 text-teal-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Usuários</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie os usuários do sistema
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-lg">
                <Users className="h-4 w-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total ?? "-"}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Crown className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.admins ?? "-"}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/10 rounded-lg">
                <Briefcase className="h-4 w-4 text-teal-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.defensores ?? "-"}</p>
                <p className="text-xs text-muted-foreground">Defensores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <GraduationCap className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.estagiarios ?? "-"}</p>
                <p className="text-xs text-muted-foreground">Estagiários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Building className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.servidores ?? "-"}</p>
                <p className="text-xs text-muted-foreground">Servidores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou OAB..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900/50 border-zinc-800"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-zinc-900/50 border-zinc-800">
            <SelectValue placeholder="Filtrar por cargo" />
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

      {/* Users List */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-zinc-900 rounded-lg">
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
                  className="flex items-center gap-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-sm">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{user.name}</p>
                      {user.emailVerified && (
                        <CheckCircle className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
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

                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={cn("gap-1", roleColors[user.role])}
                    >
                      {roleIcons[user.role]}
                      {roleLabels[user.role]}
                    </Badge>

                    {user.workspaceName && (
                      <Badge variant="secondary" className="hidden sm:flex">
                        {user.workspaceName}
                      </Badge>
                    )}

                    <span className="text-xs text-muted-foreground hidden md:block">
                      {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
                          className="text-red-500 focus:text-red-500"
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
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

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
