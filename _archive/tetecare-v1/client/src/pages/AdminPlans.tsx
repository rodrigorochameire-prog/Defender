import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Package, Plus, Edit, Trash2, Users, Calendar, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function AdminPlans() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const { data: plans, isLoading, error } = trpc.plans.list.useQuery();
  const utils = trpc.useUtils();

  if (error) {
    console.error("Error loading plans:", error);
  }

  const createPlan = trpc.plans.create.useMutation({
    onSuccess: () => {
      toast.success("Plano criado com sucesso!");
      utils.plans.list.invalidate();
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar plano: " + error.message);
    },
  });

  const updatePlan = trpc.plans.update.useMutation({
    onSuccess: () => {
      toast.success("Plano atualizado com sucesso!");
      utils.plans.list.invalidate();
      setIsEditDialogOpen(false);
      setEditingPlan(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar plano: " + error.message);
    },
  });

  const deletePlan = trpc.plans.delete.useMutation({
    onSuccess: () => {
      toast.success("Plano removido com sucesso!");
      utils.plans.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao remover plano: " + error.message);
    },
  });

  const handleCreatePlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createPlan.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: parseInt(formData.get("price") as string) * 100, // convert to cents
      credits: parseInt(formData.get("credits") as string),
      validityDays: parseInt(formData.get("validityDays") as string),
      benefits: formData.get("benefits") as string,
    });
  };

  const handleUpdatePlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updatePlan.mutate({
      id: editingPlan.id,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: parseInt(formData.get("price") as string) * 100,
      credits: parseInt(formData.get("credits") as string),
      validityDays: parseInt(formData.get("validityDays") as string),
      benefits: formData.get("benefits") as string,
      isActive: formData.get("isActive") === "on",
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este plano?")) {
      deletePlan.mutate({ id });
    }
  };

  const handleToggleActive = (plan: any) => {
    updatePlan.mutate({
      id: plan.id,
      isActive: !plan.isActive,
    });
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="container py-8">
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-red-600 font-medium mb-2">Erro ao carregar planos</p>
                <p className="text-sm text-muted-foreground">{error.message}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container py-8">
          <p>Carregando planos...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Planos de Assinatura</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie os planos disponíveis para os tutores
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Plano
          </Button>
        </div>

        {!plans || plans.length === 0 ? (
          <Card>
            <CardContent className="empty-state">
              <Package className="empty-state-icon" />
              <p className="empty-state-title">Nenhum plano cadastrado</p>
              <p className="empty-state-description">
                Crie planos de assinatura para oferecer aos tutores
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className="shadow-card border-border/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={plan.isActive ? "default" : "secondary"}>
                          {plan.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">
                        R$ {(plan.price / 100).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        / {plan.validityDays} dias
                      </p>
                    </div>
                  </div>
                  {plan.description && (
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{plan.credits}</p>
                        <p className="text-muted-foreground">Diárias</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{plan.validityDays}</p>
                        <p className="text-muted-foreground">Dias</p>
                      </div>
                    </div>
                  </div>

                  {plan.benefits && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Benefícios:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {plan.benefits}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setEditingPlan(plan);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant={plan.isActive ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleActive(plan)}
                    >
                      {plan.isActive ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(plan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Plan Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreatePlan}>
              <DialogHeader>
                <DialogTitle>Criar Novo Plano</DialogTitle>
                <DialogDescription>
                  Defina os detalhes do plano de assinatura
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Plano *</Label>
                    <Input id="name" name="name" required placeholder="Ex: Plano Mensal" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço (R$) *</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      required
                      placeholder="99.90"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="credits">Número de Diárias *</Label>
                    <Input
                      id="credits"
                      name="credits"
                      type="number"
                      required
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validityDays">Validade (dias) *</Label>
                    <Input
                      id="validityDays"
                      name="validityDays"
                      type="number"
                      required
                      placeholder="30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Descrição breve do plano"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="benefits">Benefícios</Label>
                  <Textarea
                    id="benefits"
                    name="benefits"
                    rows={4}
                    placeholder="Liste os benefícios do plano (um por linha)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createPlan.isPending}>
                  {createPlan.isPending ? "Criando..." : "Criar Plano"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Plan Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleUpdatePlan}>
              <DialogHeader>
                <DialogTitle>Editar Plano</DialogTitle>
                <DialogDescription>
                  Atualize os detalhes do plano de assinatura
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nome do Plano *</Label>
                    <Input
                      id="edit-name"
                      name="name"
                      required
                      defaultValue={editingPlan?.name}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Preço (R$) *</Label>
                    <Input
                      id="edit-price"
                      name="price"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingPlan ? editingPlan.price / 100 : ""}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-credits">Número de Diárias *</Label>
                    <Input
                      id="edit-credits"
                      name="credits"
                      type="number"
                      required
                      defaultValue={editingPlan?.credits}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-validityDays">Validade (dias) *</Label>
                    <Input
                      id="edit-validityDays"
                      name="validityDays"
                      type="number"
                      required
                      defaultValue={editingPlan?.validityDays}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Input
                    id="edit-description"
                    name="description"
                    defaultValue={editingPlan?.description || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-benefits">Benefícios</Label>
                  <Textarea
                    id="edit-benefits"
                    name="benefits"
                    rows={4}
                    defaultValue={editingPlan?.benefits || ""}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-isActive"
                    name="isActive"
                    defaultChecked={editingPlan?.isActive}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="edit-isActive">Plano ativo</Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingPlan(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updatePlan.isPending}>
                  {updatePlan.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
