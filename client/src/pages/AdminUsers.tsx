import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, ShieldCheck, Trash2, UserPlus, Users, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminUsers() {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: users, isLoading, refetch } = trpc.userManagement.list.useQuery();
  const { data: invites } = trpc.adminInvites.list.useQuery();

  const updateRole = trpc.userManagement.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Função do usuário atualizada com sucesso!");
      setIsPromoteDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar função: " + error.message);
    },
  });

  const sendInvite = trpc.adminInvites.create.useMutation({
    onSuccess: (data) => {
      toast.success("Convite enviado com sucesso!");
      toast.info("Link do convite copiado para a área de transferência");
      navigator.clipboard.writeText(data.inviteUrl);
      setIsInviteDialogOpen(false);
      setInviteEmail("");
    },
    onError: (error) => {
      toast.error("Erro ao enviar convite: " + error.message);
    },
  });

  const deleteUser = trpc.userManagement.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário removido com sucesso!");
      setIsDeleteDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao remover usuário: " + error.message);
    },
  });

  const handlePromote = (user: any) => {
    setSelectedUser(user);
    setIsPromoteDialogOpen(true);
  };

  const handleDelete = (user: any) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmPromote = () => {
    if (!selectedUser) return;
    const newRole = selectedUser.role === "admin" ? "user" : "admin";
    updateRole.mutate({ userId: selectedUser.id, role: newRole });
  };

  const confirmDelete = () => {
    if (!selectedUser) return;
    deleteUser.mutate({ userId: selectedUser.id });
  };

  const adminCount = users?.filter(u => u.role === "admin").length || 0;
  const userCount = users?.filter(u => u.role === "user").length || 0;

  return (
    <AdminLayout>
      <div className="container max-w-7xl py-8 space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie administradores e usuários da plataforma
            </p>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Mail className="mr-2 h-4 w-4" />
                Convidar Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Administrador</DialogTitle>
                <DialogDescription>
                  Envie um convite por email para adicionar um novo administrador
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="admin@exemplo.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                {invites && invites.length > 0 && (
                  <div className="space-y-2">
                    <Label>Convites Pendentes</Label>
                    <div className="space-y-1">
                      {invites.map((invite) => (
                        <div key={invite.id} className="text-sm text-muted-foreground">
                          {invite.email} - Expira em {format(new Date(invite.expiresAt), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => sendInvite.mutate({ email: inviteEmail })}
                  disabled={!inviteEmail || sendInvite.isPending}
                >
                  {sendInvite.isPending ? "Enviando..." : "Enviar Convite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Usuários Comuns</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Todos os Usuários</CardTitle>
            <CardDescription>
              Lista completa de usuários cadastrados na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando usuários...
              </div>
            ) : !users || users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Último Acesso</TableHead>
                      <TableHead>Cadastrado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.role === "admin" ? (
                            <Badge variant="default" className="gap-1">
                              <Shield className="h-3 w-3" />
                              Administrador
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Usuário</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.lastSignedIn
                            ? format(new Date(user.lastSignedIn), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePromote(user)}
                            >
                              {user.role === "admin" ? "Remover Admin" : "Promover a Admin"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Promote Dialog */}
        <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedUser?.role === "admin" ? "Remover Privilégios de Admin" : "Promover a Administrador"}
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.role === "admin"
                  ? `Tem certeza que deseja remover os privilégios de administrador de ${selectedUser?.name}? Eles voltarão a ser um usuário comum.`
                  : `Tem certeza que deseja promover ${selectedUser?.name} a administrador? Eles terão acesso total ao sistema.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPromoteDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmPromote}
                disabled={updateRole.isPending}
              >
                {updateRole.isPending ? "Processando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover Usuário</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover {selectedUser?.name}? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteUser.isPending}
              >
                {deleteUser.isPending ? "Removendo..." : "Remover"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
