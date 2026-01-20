"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingPage } from "@/components/shared/loading";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

export default function AdminWorkspacesPage() {
  const utils = trpc.useUtils();
  const { data: workspaces, isLoading: workspacesLoading } = trpc.workspaces.list.useQuery();
  const { data: users, isLoading: usersLoading } = trpc.users.list.useQuery();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState({
    name: "",
    description: "",
  });
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  const createWorkspace = trpc.workspaces.create.useMutation({
    onSuccess: () => {
      toast.success("Workspace criado com sucesso!");
      utils.workspaces.list.invalidate();
      setWorkspaceForm({ name: "", description: "" });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateWorkspace = trpc.workspaces.update.useMutation({
    onSuccess: () => {
      utils.workspaces.list.invalidate();
      toast.success("Workspace atualizado.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateUser = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("Acesso atualizado.");
      setUpdatingUserId(null);
    },
    onError: (error) => {
      toast.error(error.message);
      setUpdatingUserId(null);
    },
  });

  const workspaceOptions = useMemo(() => {
    return workspaces ?? [];
  }, [workspaces]);

  if (workspacesLoading || usersLoading) {
    return <LoadingPage />;
  }

  const handleCreateWorkspace = () => {
    if (!workspaceForm.name.trim()) {
      toast.error("Informe o nome do workspace.");
      return;
    }

    createWorkspace.mutate({
      name: workspaceForm.name.trim(),
      description: workspaceForm.description.trim() || undefined,
    });
  };

  const handleWorkspaceToggle = (id: number, isActive: boolean) => {
    updateWorkspace.mutate({ id, isActive: !isActive });
  };

  const handleAssignWorkspace = (userId: number, value: string) => {
    setUpdatingUserId(userId);
    updateUser.mutate({
      id: userId,
      workspaceId: value === "none" ? null : Number(value),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspaces e Acessos"
        description="Crie universos de dados e defina quem pode acessar cada base."
      />

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Workspaces</CardTitle>
            <CardDescription>Ex.: 7º e 9º DP, Varas Criminais Comuns, etc.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Novo workspace</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar workspace</DialogTitle>
                <DialogDescription>
                  Use um nome que represente o universo de dados (ex.: 7º e 9º DP).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Nome</Label>
                  <Input
                    id="workspace-name"
                    value={workspaceForm.name}
                    onChange={(event) =>
                      setWorkspaceForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Ex.: 7º e 9º DP"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workspace-description">Descrição</Label>
                  <Textarea
                    id="workspace-description"
                    value={workspaceForm.description}
                    onChange={(event) =>
                      setWorkspaceForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Detalhes sobre a atuação ou equipe."
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreateWorkspace} disabled={createWorkspace.isLoading}>
                  {createWorkspace.isLoading ? "Salvando..." : "Criar workspace"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {workspaceOptions.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhum workspace criado ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspaceOptions.map((workspace) => (
                  <TableRow key={workspace.id}>
                    <TableCell>
                      <div className="font-medium">{workspace.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {workspace.description || "Sem descrição"}
                      </div>
                    </TableCell>
                    <TableCell>{workspace.memberCount ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={workspace.isActive ? "default" : "secondary"}>
                        {workspace.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWorkspaceToggle(workspace.id, workspace.isActive)}
                        disabled={updateWorkspace.isLoading}
                      >
                        {workspace.isActive ? "Desativar" : "Ativar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Controle de acesso por usuário</CardTitle>
          <CardDescription>
            Defina a qual workspace cada usuário terá acesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).map((user) => {
                const isUpdating = updatingUserId === user.id;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>
                      <Select
                        value={user.workspaceId ? String(user.workspaceId) : "none"}
                        onValueChange={(value) => handleAssignWorkspace(user.id, value)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-[240px]">
                          <SelectValue placeholder="Sem workspace" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem workspace</SelectItem>
                          {workspaceOptions.map((workspace) => (
                            <SelectItem key={workspace.id} value={String(workspace.id)}>
                              {workspace.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      {user.workspaceId ? (
                        <span className="inline-flex items-center gap-2 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-amber-600">
                          <XCircle className="h-4 w-4" />
                          Sem acesso
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
