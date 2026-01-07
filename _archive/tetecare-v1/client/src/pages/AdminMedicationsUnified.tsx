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
import { Pill, Plus, Search, Filter, Edit, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { RecentChangeIndicator } from "@/components/RecentChangeIndicator";

export default function AdminMedicationsUnified() {
  const [activeTab, setActiveTab] = useState("library");
  
  // Library state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  
  // Treatments state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all"); // all, 7days, 30days, 90days
  const [petFilter, setPetFilter] = useState("all"); // all or petId
  const [editingMed, setEditingMed] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Queries
  const { data: library, refetch: refetchLibrary } = trpc.medications.library.useQuery();
  const { data: pets, refetch: refetchPets } = trpc.pets.list.useQuery();
  const { data: allChanges } = trpc.changeHistory.getRecentChanges.useQuery({ limit: 200 });

  // Mutations
  const addToLibrary = trpc.medications.addToLibrary.useMutation({
    onSuccess: () => {
      toast.success("Medicamento adicionado à biblioteca!");
      setIsAddDialogOpen(false);
      refetchLibrary();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar medicamento");
    },
  });

  const updateMedication = trpc.medications.update.useMutation({
    onSuccess: () => {
      toast.success("Medicamento atualizado!");
      setIsEditDialogOpen(false);
      setEditingMed(null);
      refetchPets();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar medicamento");
    },
  });

  const deleteMedication = trpc.medications.delete.useMutation({
    onSuccess: () => {
      toast.success("Medicamento removido!");
      refetchPets();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover medicamento");
    },
  });

  const handleAddToLibrary = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addToLibrary.mutate({
      name: formData.get("name") as string,
      type: selectedType as "preventive" | "treatment" | "supplement",
      description: formData.get("description") as string || undefined,
      commonDosage: formData.get("commonDosage") as string || undefined,
    });
  };

  const handleUpdateMedication = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;

    updateMedication.mutate({
      id: editingMed.id,
      petId: editingMed.petId,
      dosage: formData.get("dosage") as string,
      frequency: formData.get("frequency") as string,
      startDate: startDateStr ? new Date(startDateStr) : undefined,
      endDate: endDateStr ? new Date(endDateStr) : undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleDeleteMedication = (id: number, petId: number) => {
    if (confirm("Tem certeza que deseja remover este medicamento?")) {
      deleteMedication.mutate({ id, petId });
    }
  };

  // Get all medications from all pets
  const allMedications = pets?.flatMap((pet: any) => 
    (pet.medications || []).map((med: any) => ({
      ...med,
      petName: pet.name,
      petId: pet.id,
    }))
  ) || [];

  // Filter medications
  const filteredMedications = allMedications.filter((med: any) => {
    const matchesSearch = med.medication?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         med.petName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || med.status === statusFilter;
    const matchesType = typeFilter === "all" || med.medication?.type === typeFilter;
    const matchesPet = petFilter === "all" || med.petId.toString() === petFilter;
    
    // Period filter
    let matchesPeriod = true;
    if (periodFilter !== "all" && med.startDate) {
      const startDate = new Date(med.startDate);
      const now = new Date();
      const daysAgo = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (periodFilter === "7days") matchesPeriod = daysAgo <= 7;
      else if (periodFilter === "30days") matchesPeriod = daysAgo <= 30;
      else if (periodFilter === "90days") matchesPeriod = daysAgo <= 90;
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesPet && matchesPeriod;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      completed: "secondary",
      suspended: "destructive",
    };
    
    const labels: Record<string, string> = {
      active: "Ativo",
      completed: "Concluído",
      suspended: "Suspenso",
    };
    
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      antibiotic: "default",
      anti_inflammatory: "secondary",
      antiparasitic: "outline",
      supplement: "outline",
      other: "outline",
    };
    
    const labels: Record<string, string> = {
      antibiotic: "Antibiótico",
      anti_inflammatory: "Anti-inflamatório",
      antiparasitic: "Antiparasitário",
      supplement: "Suplemento",
      other: "Outro",
    };
    
    return <Badge variant={variants[type] || "outline"}>{labels[type] || type}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Medicamentos</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie a biblioteca de medicamentos e tratamentos ativos
            </p>
          </div>
          <Pill className="h-12 w-12 text-primary" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="library">
              <Pill className="h-4 w-4 mr-2" />
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="treatments">
              <History className="h-4 w-4 mr-2" />
              Tratamentos Ativos
            </TabsTrigger>
          </TabsList>

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Biblioteca de Medicamentos</CardTitle>
                    <CardDescription>
                      Medicamentos pré-cadastrados para uso rápido
                    </CardDescription>
                  </div>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Medicamento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleAddToLibrary}>
                        <DialogHeader>
                          <DialogTitle>Adicionar Medicamento à Biblioteca</DialogTitle>
                          <DialogDescription>
                            Cadastre um novo medicamento para uso futuro
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Nome do Medicamento *</Label>
                            <Input
                              id="name"
                              name="name"
                              placeholder="Ex: Amoxicilina"
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
                                <SelectItem value="antibiotic">Antibiótico</SelectItem>
                                <SelectItem value="anti_inflammatory">Anti-inflamatório</SelectItem>
                                <SelectItem value="antiparasitic">Antiparasitário</SelectItem>
                                <SelectItem value="supplement">Suplemento</SelectItem>
                                <SelectItem value="other">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea
                              id="description"
                              name="description"
                              placeholder="Descrição do medicamento..."
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="dosageInfo">Informações de Dosagem</Label>
                            <Textarea
                              id="dosageInfo"
                              name="dosageInfo"
                              placeholder="Ex: 10mg/kg a cada 12 horas"
                              rows={2}
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
                    <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum medicamento cadastrado na biblioteca</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Dosagem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {library.map((med: any) => (
                        <TableRow key={med.id}>
                          <TableCell className="font-medium">{med.name}</TableCell>
                          <TableCell>{getTypeBadge(med.type)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {med.description || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {med.dosageInfo || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treatments Tab */}
          <TabsContent value="treatments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tratamentos Ativos</CardTitle>
                <CardDescription>
                  Todos os medicamentos em uso pelos pets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por medicamento ou pet..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="antibiotic">Antibiótico</SelectItem>
                      <SelectItem value="anti_inflammatory">Anti-inflamatório</SelectItem>
                      <SelectItem value="antiparasitic">Antiparasitário</SelectItem>
                      <SelectItem value="supplement">Suplemento</SelectItem>
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
                {filteredMedications.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum tratamento encontrado</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pet</TableHead>
                        <TableHead>Medicamento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Dosagem</TableHead>
                        <TableHead>Frequência</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMedications.map((med: any) => {
                        const changeInfo = allChanges?.find(
                          (c: any) => c.entityType === "medication" && c.entityId === med.id
                        );
                        
                        return (
                          <TableRow key={med.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col gap-1">
                                {med.petName}
                                {changeInfo ? (
                                  <RecentChangeIndicator changes={[changeInfo]} resourceType="medication" />
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>{med.medication?.name || "-"}</TableCell>
                            <TableCell>{getTypeBadge(med.medication?.type)}</TableCell>
                            <TableCell>{med.dosage}</TableCell>
                            <TableCell>{med.frequency}</TableCell>
                            <TableCell className="text-sm">
                              {new Date(med.startDate).toLocaleDateString("pt-BR")}
                              {med.endDate && ` - ${new Date(med.endDate).toLocaleDateString("pt-BR")}`}
                            </TableCell>
                            <TableCell>{getStatusBadge(med.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingMed(med);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteMedication(med.id, med.petId)}
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
            <form onSubmit={handleUpdateMedication}>
              <DialogHeader>
                <DialogTitle>Editar Medicamento</DialogTitle>
                <DialogDescription>
                  Atualize as informações do tratamento
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-dosage">Dosagem *</Label>
                  <Input
                    id="edit-dosage"
                    name="dosage"
                    defaultValue={editingMed?.dosage}
                    placeholder="Ex: 10mg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-frequency">Frequência *</Label>
                  <Input
                    id="edit-frequency"
                    name="frequency"
                    defaultValue={editingMed?.frequency}
                    placeholder="Ex: A cada 12 horas"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-startDate">Data de Início *</Label>
                    <Input
                      id="edit-startDate"
                      name="startDate"
                      type="date"
                      defaultValue={editingMed?.startDate?.split("T")[0]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-endDate">Data de Término</Label>
                    <Input
                      id="edit-endDate"
                      name="endDate"
                      type="date"
                      defaultValue={editingMed?.endDate?.split("T")[0]}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Observações</Label>
                  <Textarea
                    id="edit-notes"
                    name="notes"
                    defaultValue={editingMed?.notes}
                    placeholder="Observações sobre o tratamento..."
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
