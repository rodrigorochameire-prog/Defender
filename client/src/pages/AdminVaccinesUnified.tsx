import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Syringe, Plus, Search, Filter, Edit, History, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RecentChangeIndicator } from "@/components/RecentChangeIndicator";

export default function AdminVaccinesUnified() {
  const [activeTab, setActiveTab] = useState("library");
  
  // Library state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Applications state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all"); // all, 7days, 30days, 90days
  const [petFilter, setPetFilter] = useState("all"); // all or petId
  const [editingVaccine, setEditingVaccine] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Queries
  const { data: library, refetch: refetchLibrary } = trpc.vaccines.library.useQuery();
  const { data: pets, refetch: refetchPets } = trpc.pets.list.useQuery();
  const { data: allChanges } = trpc.changeHistory.getRecentChanges.useQuery({ limit: 200 });

  // Mutations
  const addToLibrary = trpc.vaccines.addToLibrary.useMutation({
    onSuccess: () => {
      toast.success("Vacina adicionada à biblioteca!");
      setIsAddDialogOpen(false);
      refetchLibrary();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar vacina");
    },
  });

  const updateVaccine = trpc.vaccines.update.useMutation({
    onSuccess: () => {
      toast.success("Vacinação atualizada!");
      setIsEditDialogOpen(false);
      setEditingVaccine(null);
      refetchPets();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar vacinação");
    },
  });

  const deleteVaccine = trpc.vaccines.delete.useMutation({
    onSuccess: () => {
      toast.success("Vacinação removida!");
      refetchPets();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover vacinação");
    },
  });

  const handleAddToLibrary = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addToLibrary.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      intervalDays: formData.get("intervalDays") ? parseInt(formData.get("intervalDays") as string) : undefined,
      dosesRequired: 1,
    });
  };

  const handleUpdateVaccine = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const nextDueDateStr = formData.get("nextDueDate") as string;
    updateVaccine.mutate({
      id: editingVaccine.id,
      petId: editingVaccine.petId,
      nextDueDate: nextDueDateStr ? new Date(nextDueDateStr) : undefined,
      veterinarian: formData.get("veterinarian") as string || undefined,
      clinic: formData.get("clinic") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleDeleteVaccine = (id: number, petId: number) => {
    if (confirm("Tem certeza que deseja remover esta vacinação?")) {
      deleteVaccine.mutate({ id, petId });
    }
  };

  // Get all vaccinations from all pets
  const allVaccinations = pets?.flatMap((pet: any) => 
    (pet.vaccinations || []).map((vacc: any) => ({
      ...vacc,
      petName: pet.name,
      petId: pet.id,
    }))
  ) || [];

  // Filter vaccinations
  const filteredVaccinations = allVaccinations.filter((vacc: any) => {
    const matchesSearch = vacc.vaccine?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vacc.petName.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === "overdue") {
      matchesStatus = vacc.nextDueDate && new Date(vacc.nextDueDate) < new Date();
    } else if (statusFilter === "upcoming") {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      matchesStatus = vacc.nextDueDate && 
                     new Date(vacc.nextDueDate) >= today && 
                     new Date(vacc.nextDueDate) <= thirtyDaysFromNow;
    } else if (statusFilter === "uptodate") {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      matchesStatus = !vacc.nextDueDate || new Date(vacc.nextDueDate) > thirtyDaysFromNow;
    }
    
    const matchesPet = petFilter === "all" || vacc.petId.toString() === petFilter;
    
    // Period filter
    let matchesPeriod = true;
    if (periodFilter !== "all" && vacc.applicationDate) {
      const appDate = new Date(vacc.applicationDate);
      const now = new Date();
      const daysAgo = Math.floor((now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (periodFilter === "7days") matchesPeriod = daysAgo <= 7;
      else if (periodFilter === "30days") matchesPeriod = daysAgo <= 30;
      else if (periodFilter === "90days") matchesPeriod = daysAgo <= 90;
    }
    
    return matchesSearch && matchesStatus && matchesPet && matchesPeriod;
  });

  // Calculate statistics
  const stats = {
    total: allVaccinations.length,
    overdue: allVaccinations.filter((v: any) => v.nextDueDate && new Date(v.nextDueDate) < new Date()).length,
    upcoming: allVaccinations.filter((v: any) => {
      if (!v.nextDueDate) return false;
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      return new Date(v.nextDueDate) >= today && new Date(v.nextDueDate) <= thirtyDaysFromNow;
    }).length,
    uptodate: allVaccinations.filter((v: any) => {
      if (!v.nextDueDate) return true;
      const thirtyDaysFromNow = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
      return new Date(v.nextDueDate) > thirtyDaysFromNow;
    }).length,
  };

  const getStatusBadge = (nextDueDate: string | null) => {
    if (!nextDueDate) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Em dia</Badge>;
    }
    
    const today = new Date();
    const dueDate = new Date(nextDueDate);
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    if (dueDate < today) {
      return <Badge variant="destructive">Atrasada</Badge>;
    } else if (dueDate <= thirtyDaysFromNow) {
      return <Badge variant="default" className="bg-orange-500">Próxima (30 dias)</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Em dia</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Vacinas</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie a biblioteca de vacinas e aplicações
            </p>
          </div>
          <Syringe className="h-12 w-12 text-primary" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="library">
              <Syringe className="h-4 w-4 mr-2" />
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="applications">
              <History className="h-4 w-4 mr-2" />
              Aplicações
            </TabsTrigger>
          </TabsList>

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Biblioteca de Vacinas</CardTitle>
                    <CardDescription>
                      Vacinas pré-cadastradas para uso rápido
                    </CardDescription>
                  </div>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Vacina
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleAddToLibrary}>
                        <DialogHeader>
                          <DialogTitle>Adicionar Vacina à Biblioteca</DialogTitle>
                          <DialogDescription>
                            Cadastre uma nova vacina para uso futuro
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Nome da Vacina *</Label>
                            <Input
                              id="name"
                              name="name"
                              placeholder="Ex: V10, Antirrábica"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea
                              id="description"
                              name="description"
                              placeholder="Descrição da vacina e o que protege..."
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="intervalDays">Intervalo Recomendado (dias)</Label>
                            <Input
                              id="intervalDays"
                              name="intervalDays"
                              type="number"
                              placeholder="Ex: 365 (anual)"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit">Adicionar</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {!library || library.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Syringe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma vacina cadastrada na biblioteca</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Intervalo (dias)</TableHead>
                        <TableHead>Comum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {library.map((vaccine: any) => (
                        <TableRow key={vaccine.id}>
                          <TableCell className="font-medium">{vaccine.name}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {vaccine.description || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {vaccine.recommendedIntervalDays || "-"}
                          </TableCell>
                          <TableCell>
                            {vaccine.isCommon ? (
                              <Badge variant="default">Comum</Badge>
                            ) : (
                              <Badge variant="outline">Personalizada</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Aplicações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Atrasadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Próximas (30 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{stats.upcoming}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Em Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.uptodate}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Aplicações de Vacinas</CardTitle>
                <CardDescription>
                  Todas as vacinas aplicadas nos pets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por vacina ou pet..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={statusFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("all")}
                    >
                      Todas
                    </Button>
                    <Button
                      variant={statusFilter === "overdue" ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("overdue")}
                    >
                      Atrasadas
                    </Button>
                    <Button
                      variant={statusFilter === "upcoming" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("upcoming")}
                      className={statusFilter === "upcoming" ? "bg-orange-500 hover:bg-orange-600" : ""}
                    >
                      Próximas
                    </Button>
                    <Button
                      variant={statusFilter === "uptodate" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("uptodate")}
                      className={statusFilter === "uptodate" ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      Em Dia
                    </Button>
                  </div>
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Períodos</SelectItem>
                      <SelectItem value="7days">Últimos 7 dias</SelectItem>
                      <SelectItem value="30days">Últimos 30 dias</SelectItem>
                      <SelectItem value="90days">Últimos 90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={petFilter} onValueChange={setPetFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Pets</SelectItem>
                      {pets?.map((pet: any) => (
                        <SelectItem key={pet.id} value={pet.id.toString()}>
                          {pet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Table */}
                {filteredVaccinations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Syringe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma aplicação encontrada</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pet</TableHead>
                        <TableHead>Vacina</TableHead>
                        <TableHead>Dose</TableHead>
                        <TableHead>Aplicação</TableHead>
                        <TableHead>Próxima Dose</TableHead>
                        <TableHead>Veterinário</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVaccinations.map((vacc: any) => {
                        const changeInfo = allChanges?.find(
                          (c: any) => c.resourceType === "vaccine" && c.resourceId === vacc.id
                        );
                        
                        return (
                          <TableRow key={vacc.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col gap-1">
                                {vacc.petName}
                                {changeInfo ? (
                                  <RecentChangeIndicator changes={[changeInfo]} resourceType="vaccine" />
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>{vacc.vaccine?.name || "-"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {vacc.doseNumber || "-"}
                            </TableCell>
                            <TableCell>
                              {new Date(vacc.applicationDate).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              {vacc.nextDueDate ? (
                                <div className="flex items-center gap-2">
                                  {new Date(vacc.nextDueDate).toLocaleDateString("pt-BR")}
                                  {new Date(vacc.nextDueDate) < new Date() && (
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {vacc.veterinarian || "-"}
                            </TableCell>
                            <TableCell>{getStatusBadge(vacc.nextDueDate)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingVaccine(vacc);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteVaccine(vacc.id, vacc.petId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <form onSubmit={handleUpdateVaccine}>
              <DialogHeader>
                <DialogTitle>Editar Vacinação</DialogTitle>
                <DialogDescription>
                  Atualize as informações da vacinação
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nextDueDate">Próxima Dose</Label>
                  <Input
                    id="nextDueDate"
                    name="nextDueDate"
                    type="date"
                    defaultValue={editingVaccine?.nextDueDate ? new Date(editingVaccine.nextDueDate).toISOString().split('T')[0] : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="veterinarian">Veterinário</Label>
                  <Input
                    id="veterinarian"
                    name="veterinarian"
                    placeholder="Nome do veterinário"
                    defaultValue={editingVaccine?.veterinarian || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic">Clínica</Label>
                  <Input
                    id="clinic"
                    name="clinic"
                    placeholder="Nome da clínica"
                    defaultValue={editingVaccine?.clinic || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Observações sobre a vacinação..."
                    rows={3}
                    defaultValue={editingVaccine?.notes || ""}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
