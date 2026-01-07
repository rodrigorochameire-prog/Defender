import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Package, DollarSign, Percent, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

export default function AdminCreditPackages() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  const { data: packages, refetch } = trpc.creditPackages.listAll.useQuery();
  const utils = trpc.useUtils();

  const createPackage = trpc.creditPackages.create.useMutation({
    onSuccess: () => {
      toast.success("Pacote criado com sucesso!");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao criar pacote: " + error.message);
    },
  });

  const updatePackage = trpc.creditPackages.update.useMutation({
    onSuccess: () => {
      toast.success("Pacote atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setSelectedPackage(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar pacote: " + error.message);
    },
  });

  const deletePackage = trpc.creditPackages.delete.useMutation({
    onSuccess: () => {
      toast.success("Pacote desativado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao desativar pacote: " + error.message);
    },
  });

  const handleCreatePackage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createPackage.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      credits: Number(formData.get("credits")),
      priceInCents: Math.round(Number(formData.get("price")) * 100),
      discountPercent: Number(formData.get("discount")) || 0,
      displayOrder: Number(formData.get("displayOrder")) || 0,
    });
  };

  const handleUpdatePackage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPackage) return;
    
    const formData = new FormData(e.currentTarget);
    
    updatePackage.mutate({
      id: selectedPackage.id,
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      credits: Number(formData.get("credits")),
      priceInCents: Math.round(Number(formData.get("price")) * 100),
      discountPercent: Number(formData.get("discount")) || 0,
      displayOrder: Number(formData.get("displayOrder")) || 0,
      isActive: formData.get("isActive") === "on",
    });
  };

  const handleToggleActive = (pkg: any) => {
    updatePackage.mutate({
      id: pkg.id,
      isActive: !pkg.isActive,
    });
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const calculateFinalPrice = (priceInCents: number, discountPercent: number) => {
    const discount = (priceInCents * discountPercent) / 100;
    return priceInCents - discount;
  };

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pacotes de Créditos</h1>
            <p className="text-muted-foreground mt-2">
              Configure pacotes, preços e ofertas especiais para venda de créditos
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Novo Pacote
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pacotes</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{packages?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {packages?.filter(p => p.isActive).length || 0} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pacote Mais Popular</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {packages && packages.length > 0 ? packages[0].name : "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                {packages && packages.length > 0 ? `${packages[0].credits} créditos` : "Nenhum pacote"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Descontos Ativos</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {packages?.filter(p => p.isActive && p.discountPercent > 0).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Pacotes com desconto
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Packages Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pacotes Disponíveis</CardTitle>
            <CardDescription>
              Gerencie todos os pacotes de créditos disponíveis para venda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <ArrowUpDown className="h-4 w-4" />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Créditos</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Preço Final</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages && packages.length > 0 ? (
                  packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {pkg.displayOrder}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{pkg.name}</div>
                          {pkg.description && (
                            <div className="text-sm text-muted-foreground">
                              {pkg.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{pkg.credits} créditos</Badge>
                      </TableCell>
                      <TableCell>{formatPrice(pkg.priceInCents)}</TableCell>
                      <TableCell>
                        {pkg.discountPercent > 0 ? (
                          <Badge variant="destructive">{pkg.discountPercent}% OFF</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-bold">
                        {formatPrice(calculateFinalPrice(pkg.priceInCents, pkg.discountPercent))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={pkg.isActive}
                            onCheckedChange={() => handleToggleActive(pkg)}
                          />
                          <span className="text-sm">
                            {pkg.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedPackage(pkg);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Deseja realmente desativar este pacote?")) {
                                deletePackage.mutate({ id: pkg.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum pacote cadastrado. Crie o primeiro pacote para começar!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Package Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Pacote</DialogTitle>
              <DialogDescription>
                Configure um novo pacote de créditos para venda
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePackage} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Pacote *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Pacote Básico"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Descrição opcional do pacote"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credits">Créditos *</Label>
                  <Input
                    id="credits"
                    name="credits"
                    type="number"
                    min="1"
                    placeholder="10"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="100.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount">Desconto (%)</Label>
                  <Input
                    id="discount"
                    name="discount"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    defaultValue="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Ordem de Exibição</Label>
                  <Input
                    id="displayOrder"
                    name="displayOrder"
                    type="number"
                    min="0"
                    placeholder="0"
                    defaultValue="0"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createPackage.isPending}>
                  {createPackage.isPending ? "Criando..." : "Criar Pacote"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Package Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Pacote</DialogTitle>
              <DialogDescription>
                Atualize as informações do pacote
              </DialogDescription>
            </DialogHeader>
            {selectedPackage && (
              <form onSubmit={handleUpdatePackage} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome do Pacote *</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={selectedPackage.name}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={selectedPackage.description || ""}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-credits">Créditos *</Label>
                    <Input
                      id="edit-credits"
                      name="credits"
                      type="number"
                      min="1"
                      defaultValue={selectedPackage.credits}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Preço (R$) *</Label>
                    <Input
                      id="edit-price"
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={(selectedPackage.priceInCents / 100).toFixed(2)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-discount">Desconto (%)</Label>
                    <Input
                      id="edit-discount"
                      name="discount"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={selectedPackage.discountPercent}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-displayOrder">Ordem de Exibição</Label>
                    <Input
                      id="edit-displayOrder"
                      name="displayOrder"
                      type="number"
                      min="0"
                      defaultValue={selectedPackage.displayOrder}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isActive"
                    name="isActive"
                    defaultChecked={selectedPackage.isActive}
                  />
                  <Label htmlFor="edit-isActive">Pacote ativo</Label>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setSelectedPackage(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updatePackage.isPending}>
                    {updatePackage.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
