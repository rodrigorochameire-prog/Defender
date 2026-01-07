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
import { Shield, Plus, Search, Filter, Edit, Trash2, History, Bug, Worm } from "lucide-react";
import { toast } from "sonner";
import { RecentChangeIndicator } from "@/components/RecentChangeIndicator";

export default function AdminPreventivesUnified() {
  const [activeTab, setActiveTab] = useState("library");
  
  // Library state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  
  // Applications state
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all, flea, deworming
  const [periodFilter, setPeriodFilter] = useState("all"); // all, 7days, 30days, 90days
  const [petFilter, setPetFilter] = useState("all"); // all or petId
  const [editingPrev, setEditingPrev] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Queries
  const { data: library, refetch: refetchLibrary } = trpc.preventives.library.useQuery();
  const { data: pets, refetch: refetchPets } = trpc.pets.list.useQuery();
  const { data: allChanges } = trpc.changeHistory.getRecentChanges.useQuery({ limit: 200 });

  // Mutations
  const addToLibrary = trpc.preventives.addToLibrary.useMutation({
    onSuccess: () => {
      toast.success("Preventivo adicionado à biblioteca!");
      setIsAddDialogOpen(false);
      refetchLibrary();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar preventivo");
    },
  });

  const updateFlea = trpc.preventives.updateFlea.useMutation({
    onSuccess: () => {
      toast.success("Antipulgas atualizado!");
      setIsEditDialogOpen(false);
      setEditingPrev(null);
      refetchPets();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar antipulgas");
    },
  });

  const deleteFlea = trpc.preventives.deleteFlea.useMutation({
    onSuccess: () => {
      toast.success("Antipulgas removido!");
      refetchPets();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover antipulgas");
    },
  });

  const updateDeworming = trpc.preventives.updateDeworming.useMutation({
    onSuccess: () => {
      toast.success("Vermífugo atualizado!");
      setIsEditDialogOpen(false);
      setEditingPrev(null);
      refetchPets();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar vermífugo");
    },
  });

  const deleteDeworming = trpc.preventives.deleteDeworming.useMutation({
    onSuccess: () => {
      toast.success("Vermífugo removido!");
      refetchPets();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover vermífugo");
    },
  });

  const handleAddToLibrary = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addToLibrary.mutate({
      name: formData.get("name") as string,
      type: selectedType as "flea" | "deworming",
      manufacturer: formData.get("manufacturer") as string || undefined,
      intervalDays: formData.get("intervalDays") ? parseInt(formData.get("intervalDays") as string) : undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleUpdatePreventive = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      id: editingPrev.id,
      applicationDate: formData.get("applicationDate") as string,
      nextDueDate: formData.get("nextDueDate") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    };
    
    // Determine which mutation to use based on type
    if (editingPrev.type === "flea") {
      updateFlea.mutate(data);
    } else {
      updateDeworming.mutate(data);
    }
  };

  const handleDeletePreventive = (id: number, type: string) => {
    if (confirm("Tem certeza que deseja remover este preventivo?")) {
      if (type === "flea") {
        deleteFlea.mutate({ id });
      } else {
        deleteDeworming.mutate({ id });
      }
    }
  };

  // Get all preventives from all pets
  const allPreventives = pets?.flatMap((pet: any) => 
    (pet.preventives || []).map((prev: any) => ({
      ...prev,
      petName: pet.name,
      petId: pet.id,
    }))
  ) || [];

  // Filter preventives
  const filteredPreventives = allPreventives.filter((prev: any) => {
    const matchesSearch = prev.preventive?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prev.petName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || prev.preventive?.type === typeFilter;
    const matchesPet = petFilter === "all" || prev.petId.toString() === petFilter;
    
    // Period filter
    let matchesPeriod = true;
    if (periodFilter !== "all" && prev.applicationDate) {
      const appDate = new Date(prev.applicationDate);
      const now = new Date();
      const daysAgo = Math.floor((now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (periodFilter === "7days") matchesPeriod = daysAgo <= 7;
      else if (periodFilter === "30days") matchesPeriod = daysAgo <= 30;
      else if (periodFilter === "90days") matchesPeriod = daysAgo <= 90;
    }
    
    return matchesSearch && matchesType && matchesPet && matchesPeriod;
  });

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      flea_tick: "default",
      heartworm: "secondary",
      deworming: "outline",
      other: "outline",
    };
    
    const labels: Record<string, string> = {
      flea_tick: "Pulgas e Carrapatos",
      heartworm: "Vermes do Coração",
      deworming: "Vermífugo",
      other: "Outro",
    };
    
    const icons: Record<string, any> = {
      flea_tick: Bug,
      heartworm: Shield,
      deworming: Worm,
      other: Shield,
    };
    
    const Icon = icons[type] || Shield;
    
    return (
      <Badge variant={variants[type] || "outline"} className="gap-1">
        <Icon className="h-3 w-3" />
        {labels[type] || type}
      </Badge>
    );
  };

  const isOverdue = (nextDueDate: string | null) => {
    if (!nextDueDate) return false;
    return new Date(nextDueDate) < new Date();
  };

  return (
    <AdminLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Preventivos</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie a biblioteca de preventivos e aplicações
            </p>
          </div>
          <Shield className="h-12 w-12 text-primary" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="library">
              <Shield className="h-4 w-4 mr-2" />
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
                    <CardTitle>Biblioteca de Preventivos</CardTitle>
                    <CardDescription>
                      Produtos preventivos pré-cadastrados para uso rápido
                    </CardDescription>
                  </div>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Preventivo
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleAddToLibrary}>
                        <DialogHeader>
                          <DialogTitle>Adicionar Preventivo à Biblioteca</DialogTitle>
                          <DialogDescription>
                            Cadastre um novo produto preventivo para uso futuro
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Nome do Produto *</Label>
                            <Input
                              id="name"
                              name="name"
                              placeholder="Ex: Bravecto"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="type">Tipo *</Label>
                            <Select value={selectedType} onValueChange={setSelectedType} required>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="flea_tick">Pulgas e Carrapatos</SelectItem>
                                <SelectItem value="heartworm">Vermes do Coração</SelectItem>
                                <SelectItem value="deworming">Vermífugo</SelectItem>
                                <SelectItem value="other">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="manufacturer">Fabricante</Label>
                            <Input
                              id="manufacturer"
                              name="manufacturer"
                              placeholder="Ex: Bayer"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="intervalDays">Intervalo (dias)</Label>
                            <Input
                              id="intervalDays"
                              name="intervalDays"
                              type="number"
                              placeholder="Ex: 90"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="notes">Observações</Label>
                            <Textarea
                              id="notes"
                              name="notes"
                              placeholder="Observações sobre o produto..."
                              rows={3}
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
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum preventivo cadastrado na biblioteca</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fabricante</TableHead>
                        <TableHead>Intervalo (dias)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {library.map((prev: any) => (
                        <TableRow key={prev.id}>
                          <TableCell className="font-medium">{prev.name}</TableCell>
                          <TableCell>{getTypeBadge(prev.type)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {prev.manufacturer || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {prev.intervalDays || "-"}
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
            <Card>
              <CardHeader>
                <CardTitle>Aplicações de Preventivos</CardTitle>
                <CardDescription>
                  Todos os preventivos aplicados nos pets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por produto ou pet..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[220px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="flea_tick">Pulgas e Carrapatos</SelectItem>
                      <SelectItem value="heartworm">Vermes do Coração</SelectItem>
                      <SelectItem value="deworming">Vermífugo</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
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
                {filteredPreventives.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma aplicação encontrada</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pet</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data de Aplicação</TableHead>
                        <TableHead>Próxima Aplicação</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPreventives.map((prev: any) => {
                        const changeInfo = allChanges?.find(
                          (c: any) => c.entityType === "preventive" && c.entityId === prev.id
                        );
                        const overdue = isOverdue(prev.nextDueDate);
                        
                        return (
                          <TableRow key={prev.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col gap-1">
                                {prev.petName}
                                {changeInfo ? (
                                  <RecentChangeIndicator changes={[changeInfo]} resourceType="preventive" />
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>{prev.preventive?.name || "-"}</TableCell>
                            <TableCell>{getTypeBadge(prev.preventive?.type)}</TableCell>
                            <TableCell>
                              {new Date(prev.applicationDate).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              {prev.nextDueDate ? (
                                <div className="flex items-center gap-2">
                                  <span className={overdue ? "text-destructive font-medium" : ""}>
                                    {new Date(prev.nextDueDate).toLocaleDateString("pt-BR")}
                                  </span>
                                  {overdue && (
                                    <Badge variant="destructive" className="text-xs">
                                      Atrasado
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingPrev(prev);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeletePreventive(prev.id, prev.preventive?.type)}
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
            <form onSubmit={handleUpdatePreventive}>
              <DialogHeader>
                <DialogTitle>Editar Aplicação de Preventivo</DialogTitle>
                <DialogDescription>
                  Atualize as informações da aplicação
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-applicationDate">Data de Aplicação *</Label>
                  <Input
                    id="edit-applicationDate"
                    name="applicationDate"
                    type="date"
                    defaultValue={editingPrev?.applicationDate?.split("T")[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-nextDueDate">Próxima Aplicação</Label>
                  <Input
                    id="edit-nextDueDate"
                    name="nextDueDate"
                    type="date"
                    defaultValue={editingPrev?.nextDueDate?.split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Observações</Label>
                  <Textarea
                    id="edit-notes"
                    name="notes"
                    defaultValue={editingPrev?.notes}
                    placeholder="Observações sobre a aplicação..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
