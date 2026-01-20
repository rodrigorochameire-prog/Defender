"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, Plus, Edit, Trash2, Loader2 } from "lucide-react";

const NOTIFICATION_TYPES = [
  { value: "prazo_alerta", label: "Alerta de Prazo", variables: ["{{processoNumero}}", "{{prazo}}", "{{data}}", "{{assistidoNome}}"] },
  { value: "audiencia_lembrete", label: "Lembrete de Audiência", variables: ["{{processoNumero}}", "{{data}}", "{{hora}}", "{{local}}"] },
  { value: "juri_aviso", label: "Aviso de Júri", variables: ["{{processoNumero}}", "{{data}}", "{{hora}}", "{{sala}}", "{{defensorNome}}"] },
  { value: "movimentacao", label: "Movimentação Processual", variables: ["{{processoNumero}}", "{{descricao}}", "{{data}}"] },
  { value: "atendimento_agendado", label: "Atendimento Agendado", variables: ["{{assistidoNome}}", "{{data}}", "{{hora}}"] },
  { value: "aviso_geral", label: "Aviso Geral", variables: ["{{titulo}}", "{{mensagem}}"] },
];

export default function AdminNotificationTemplatesPage() {
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: templates, isLoading } = trpc.notificationTemplates.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.notificationTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Template criado com sucesso!");
      setIsCreateDialogOpen(false);
      utils.notificationTemplates.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar template");
    },
  });

  const updateMutation = trpc.notificationTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("Template atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
      utils.notificationTemplates.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar template");
    },
  });

  const deleteMutation = trpc.notificationTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template excluído com sucesso!");
      utils.notificationTemplates.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir template");
    },
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createMutation.mutate({
      type: formData.get("type") as string,
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      isActive: true,
    });
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateMutation.mutate({
      id: editingTemplate.id,
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      isActive: formData.get("isActive") === "on",
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este template?")) return;
    deleteMutation.mutate({ id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Bell />
          </div>
          <div className="page-header-info">
            <h1>Templates de Notificações</h1>
            <p>Personalize mensagens automáticas</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="btn-primary">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Novo Template
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Template</DialogTitle>
              <DialogDescription>
                Crie um template de notificação personalizado
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Notificação</Label>
                <select
                  id="type"
                  name="type"
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="">Selecione um tipo</option>
                  {NOTIFICATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" required placeholder="Ex: Alerta de Prazo" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Mensagem</Label>
                <Textarea
                  id="content"
                  name="content"
                  required
                  placeholder="Olá {{assistidoNome}}, o prazo {{prazo}} do processo {{processoNumero}} vence em {{data}}."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Use variáveis como {"{{processoNumero}}"}, {"{{data}}"}, etc.
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Criando..." : "Criar Template"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template: any) => (
          <div key={template.id} className="p-5 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="font-semibold">{template.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {template.type}
                </p>
              </div>
              <Badge className={template.isActive ? "badge-green" : "badge-neutral"}>
                {template.isActive ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
              {template.content}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingTemplate(template);
                  setIsEditDialogOpen(true);
                }}
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(template.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
            <DialogDescription>
              Atualize as informações do template
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Título</Label>
                <Input
                  id="edit-title"
                  name="title"
                  required
                  defaultValue={editingTemplate.title}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-content">Mensagem</Label>
                <Textarea
                  id="edit-content"
                  name="content"
                  required
                  defaultValue={editingTemplate.content}
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  name="isActive"
                  defaultChecked={editingTemplate.isActive}
                />
                <Label htmlFor="edit-isActive">Template ativo</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
