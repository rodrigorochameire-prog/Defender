import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, Plus, Edit, Trash2, Check, X, Info } from "lucide-react";

const NOTIFICATION_TYPES = [
  { value: "vaccine_reminder_7d", label: "Lembrete de Vacina (7 dias)", variables: ["{{petName}}", "{{vaccineName}}", "{{dueDate}}", "{{tutorName}}"] },
  { value: "vaccine_reminder_1d", label: "Lembrete de Vacina (1 dia)", variables: ["{{petName}}", "{{vaccineName}}", "{{dueDate}}", "{{tutorName}}"] },
  { value: "medication_reminder", label: "Lembrete de Medicamento", variables: ["{{petName}}", "{{medicationName}}", "{{dosage}}", "{{time}}", "{{tutorName}}"] },
  { value: "checkin_notification", label: "Notificação de Check-in", variables: ["{{petName}}", "{{time}}", "{{tutorName}}"] },
  { value: "checkout_notification", label: "Notificação de Check-out", variables: ["{{petName}}", "{{time}}", "{{tutorName}}"] },
  { value: "daily_report", label: "Relatório Diário", variables: ["{{petName}}", "{{date}}", "{{mood}}", "{{activities}}", "{{tutorName}}"] },
  { value: "credits_low", label: "Créditos Baixos", variables: ["{{petName}}", "{{remainingCredits}}", "{{tutorName}}"] },
  { value: "event_reminder", label: "Lembrete de Evento", variables: ["{{petName}}", "{{eventTitle}}", "{{eventDate}}", "{{tutorName}}"] },
];

export default function AdminNotificationTemplates() {
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: templates, isLoading, refetch } = trpc.notificationTemplates.getAll.useQuery();
  const createMutation = trpc.notificationTemplates.create.useMutation();
  const updateMutation = trpc.notificationTemplates.update.useMutation();
  const deleteMutation = trpc.notificationTemplates.delete.useMutation();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await createMutation.mutateAsync({
        type: formData.get("type") as any,
        title: formData.get("title") as string,
        message: formData.get("message") as string,
        availableVariables: formData.get("availableVariables") as string,
        isActive: formData.get("isActive") === "on",
      });
      toast.success("Template criado com sucesso!");
      setIsCreateDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar template");
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await updateMutation.mutateAsync({
        id: editingTemplate.id,
        title: formData.get("title") as string,
        message: formData.get("message") as string,
        availableVariables: formData.get("availableVariables") as string,
        isActive: formData.get("isActive") === "on",
      });
      toast.success("Template atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar template");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este template?")) return;
    
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Template excluído com sucesso!");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir template");
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container max-w-7xl py-8 animate-fade-in">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Carregando templates...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container max-w-7xl py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Templates de Notificações</h1>
            <p className="text-muted-foreground mt-2">
              Personalize as mensagens automáticas enviadas aos tutores
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
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
                  <Input id="title" name="title" required placeholder="Ex: Lembrete de Vacina" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    placeholder="Use variáveis como {{petName}}, {{date}}, etc."
                  />
                  <p className="text-sm text-muted-foreground">
                    <Info className="inline h-3 w-3 mr-1" />
                    Variáveis disponíveis serão substituídas automaticamente
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availableVariables">Variáveis Disponíveis (JSON)</Label>
                  <Input
                    id="availableVariables"
                    name="availableVariables"
                    placeholder='["{{petName}}", "{{date}}"]'
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="isActive" name="isActive" defaultChecked />
                  <Label htmlFor="isActive">Template ativo</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar Template"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Templates</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templates?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Templates Ativos</CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {templates?.filter((t) => t.isActive).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Templates Inativos</CardTitle>
              <X className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {templates?.filter((t) => !t.isActive).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Templates List */}
        <div className="grid grid-cols-1 gap-6">
          {templates && templates.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Nenhum template cadastrado ainda.
                  <br />
                  Clique em "Novo Template" para começar.
                </p>
              </CardContent>
            </Card>
          )}

          {templates?.map((template) => {
            const typeInfo = NOTIFICATION_TYPES.find((t) => t.value === template.type);
            return (
              <Card key={template.id} className="hover-lift">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>{template.title}</CardTitle>
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <CardDescription>{typeInfo?.label || template.type}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTemplate(template);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Mensagem:</Label>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                        {template.message}
                      </p>
                    </div>
                    {typeInfo && (
                      <div>
                        <Label className="text-sm font-medium">Variáveis disponíveis:</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {typeInfo.variables.map((variable) => (
                            <Badge key={variable} variant="outline">
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Edit Dialog */}
        {editingTemplate && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Template</DialogTitle>
                <DialogDescription>
                  Atualize o template de notificação
                </DialogDescription>
              </DialogHeader>
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
                  <Label htmlFor="edit-message">Mensagem</Label>
                  <Textarea
                    id="edit-message"
                    name="message"
                    required
                    rows={6}
                    defaultValue={editingTemplate.message}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-availableVariables">Variáveis Disponíveis (JSON)</Label>
                  <Input
                    id="edit-availableVariables"
                    name="availableVariables"
                    defaultValue={editingTemplate.availableVariables || ""}
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

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingTemplate(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}
