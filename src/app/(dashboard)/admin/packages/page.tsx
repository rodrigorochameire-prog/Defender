"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wallet,
  Package,
  CreditCard,
  TrendingUp,
  Plus,
  Trash2,
  DollarSign,
  Users,
  AlertCircle,
  Dog,
  Search
} from "lucide-react";
import { toast } from "sonner";
import { LoadingPage } from "@/components/shared/loading";

export default function AdminPackagesPage() {
  const [activeTab, setActiveTab] = useState("packages");
  const [isCreatePackageDialogOpen, setIsCreatePackageDialogOpen] = useState(false);
  const [isAddCreditDialogOpen, setIsAddCreditDialogOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: packages, isLoading: packagesLoading } = trpc.packages.list.useQuery();
  const { data: pets, isLoading: petsLoading } = trpc.pets.list.useQuery();
  const utils = trpc.useUtils();

  const createPackage = trpc.packages.create.useMutation({
    onSuccess: () => {
      toast.success("Pacote criado com sucesso!");
      utils.packages.list.invalidate();
      setIsCreatePackageDialogOpen(false);
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const deletePackage = trpc.packages.delete.useMutation({
    onSuccess: () => {
      toast.success("Pacote removido!");
      utils.packages.list.invalidate();
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const handleCreatePackage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPackage.mutate({
      name: formData.get("name") as string,
      credits: parseInt(formData.get("credits") as string),
      priceInCents: parseInt(formData.get("price") as string) * 100,
      description: formData.get("description") as string || undefined,
      isActive: true,
    });
  };

  const handleDeletePackage = (id: number) => {
    if (confirm("Tem certeza que deseja remover este pacote?")) {
      deletePackage.mutate({ id });
    }
  };

  const filteredPets = pets?.filter(pet =>
    pet.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalCredits = pets?.reduce((sum, pet) => sum + (pet.credits || 0), 0) || 0;
  const petsWithLowCredits = pets?.filter(pet => (pet.credits || 0) < 5).length || 0;

  if (packagesLoading || petsLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Wallet />
          </div>
          <div className="page-header-info">
            <h1>Pacotes & Créditos</h1>
            <p>Gerencie planos e créditos dos pets</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button size="sm" className="btn-primary" onClick={() => setIsCreatePackageDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Pacote
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="packages" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Pacotes
          </TabsTrigger>
          <TabsTrigger value="credits" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Créditos
          </TabsTrigger>
        </TabsList>

        {/* Packages Tab */}
        <TabsContent value="packages" className="space-y-6">
          {/* Stats */}
          <div className="stats-grid grid-cols-3">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="title">Total de Pacotes</span>
                <Package className="icon text-primary" />
              </div>
              <div className="stat-card-value">{packages?.length || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="title">Pacotes Ativos</span>
                <TrendingUp className="icon text-green-500" />
              </div>
              <div className="stat-card-value">{packages?.filter(p => p.isActive).length || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="title">Total Créditos</span>
                <CreditCard className="icon text-blue-500" />
              </div>
              <div className="stat-card-value">{totalCredits}</div>
            </div>
          </div>

          {/* Packages Grid */}
          <Card className="section-card">
            <CardHeader className="section-card-header">
              <CardTitle className="section-card-title">
                <Package className="icon" />
                Pacotes de Créditos
              </CardTitle>
            </CardHeader>
            <CardContent className="section-card-content">
              {!packages || packages.length === 0 ? (
                <div className="empty-state">
                  <Package className="empty-state-icon" />
                  <p className="empty-state-text">Nenhum pacote cadastrado</p>
                  <Button className="mt-4 btn-primary" onClick={() => setIsCreatePackageDialogOpen(true)}>
                    Criar Pacote
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="p-5 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-lg">{pkg.name}</span>
                        <Badge className={pkg.isActive ? "badge-green" : "badge-neutral"}>
                          {pkg.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      {pkg.description && (
                        <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>
                      )}
                      <div className="text-3xl font-bold text-primary mb-3">
                        R$ {(pkg.priceInCents / 100).toFixed(2)}
                      </div>
                      <div className="flex items-center justify-between text-sm mb-4">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <CreditCard className="h-4 w-4" />
                          {pkg.credits} créditos
                        </span>
                        {pkg.discountPercent > 0 && (
                          <Badge className="badge-green">-{pkg.discountPercent}%</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleDeletePackage(pkg.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5 text-rose-500" />
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-6">
          {/* Stats */}
          <div className="stats-grid grid-cols-3">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="title">Total de Créditos</span>
                <CreditCard className="icon text-primary" />
              </div>
              <div className="stat-card-value">{totalCredits}</div>
              <p className="stat-card-description">Em todos os pets</p>
            </div>
            <div className={`stat-card ${petsWithLowCredits > 0 ? "alert" : ""}`}>
              <div className="stat-card-header">
                <span className="title">Créditos Baixos</span>
                <AlertCircle className={`icon ${petsWithLowCredits > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
              </div>
              <div className="stat-card-value">{petsWithLowCredits}</div>
              <p className="stat-card-description">Menos de 5 créditos</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="title">Pets Ativos</span>
                <Dog className="icon text-primary" />
              </div>
              <div className="stat-card-value">{pets?.length || 0}</div>
            </div>
          </div>

          {/* Credits Table */}
          <Card className="section-card">
            <CardHeader className="section-card-header">
              <CardTitle className="section-card-title">
                <CreditCard className="icon" />
                Gerenciar Créditos
              </CardTitle>
              <Button size="sm" className="btn-primary" onClick={() => setIsAddCreditDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="section-card-content space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pet</TableHead>
                      <TableHead>Créditos</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPets.map((pet) => (
                      <TableRow key={pet.id}>
                        <TableCell className="font-medium">{pet.name}</TableCell>
                        <TableCell>
                          <Badge className={(pet.credits || 0) > 10 ? "badge-green" : (pet.credits || 0) > 5 ? "badge-blue" : "badge-rose"}>
                            {pet.credits || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(pet.credits || 0) < 5 ? (
                            <span className="text-amber-600 text-sm flex items-center gap-1">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Baixo
                            </span>
                          ) : (
                            <span className="text-green-600 text-sm">OK</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Package Dialog */}
      <Dialog open={isCreatePackageDialogOpen} onOpenChange={setIsCreatePackageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Pacote</DialogTitle>
            <DialogDescription>Configure um novo pacote de créditos</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePackage} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Pacote</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" name="description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input id="price" name="price" type="number" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credits">Créditos</Label>
                <Input id="credits" name="credits" type="number" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreatePackageDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-primary" disabled={createPackage.isPending}>
                {createPackage.isPending ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Credits Dialog */}
      <Dialog open={isAddCreditDialogOpen} onOpenChange={setIsAddCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Créditos</DialogTitle>
            <DialogDescription>Adicione créditos para um pet</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="petId">Pet</Label>
              <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um pet" />
                </SelectTrigger>
                <SelectContent>
                  {pets?.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id.toString()}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">Quantidade</Label>
              <Input id="days" name="days" type="number" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddCreditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-primary">Adicionar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
