import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Pill, Search, Filter, History, Edit, Save, X, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { RecentChangeIndicator } from "@/components/RecentChangeIndicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AdminMedicationsAll() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editingMed, setEditingMed] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: pets, refetch: refetchPets } = trpc.pets.list.useQuery();
  const { data: allChanges } = trpc.changeHistory.getRecentChanges.useQuery({ limit: 200 });
  
  const updateMedication = trpc.medications.update.useMutation({
    onSuccess: () => {
      toast.success("Medicamento atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setEditingMed(null);
      refetchPets();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar medicamento: " + error.message);
    },
  });
  
  const handleEditClick = (med: any) => {
    setEditingMed(med);
    setIsEditDialogOpen(true);
  };
  
  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const isActive = formData.get("isActive") === "true";
    const endDate = formData.get("endDate") as string;
    const notes = formData.get("notes") as string;
    
    updateMedication.mutate({
      id: editingMed.medication.id,
      petId: editingMed.petId,
      isActive,
      endDate: endDate ? new Date(endDate) : undefined,
      notes: notes || undefined,
    });
  };

  // Get all medications for all pets
  const petMedications = pets?.map(pet => {
    const { data: medications } = trpc.medications.getPetMedications.useQuery({ petId: pet.id });
    return { pet, medications: medications || [] };
  }).filter(Boolean) || [];

  // Flatten all medications with pet info
  const allMedications = petMedications.flatMap(({ pet, medications }) =>
    medications.map(med => ({
      ...med,
      petName: pet.name,
      petId: pet.id,
    }))
  );

  // Filter medications
  const filteredMedications = allMedications.filter(med => {
    const matchesSearch = 
      med.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.medicationInfo.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && med.medication.isActive) ||
      (statusFilter === "inactive" && !med.medication.isActive);
    
    const matchesType = 
      typeFilter === "all" ||
      med.medicationInfo.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Helper to get recent changes for a medication
  const getRecentChanges = (medicationId: number) => {
    if (!allChanges) return [];
    return allChanges
      .filter((change: any) => 
        change.resourceType === "medication" && 
        change.resourceId === medicationId
      )
      .slice(0, 3);
  };

  // Count statistics
  const stats = {
    total: allMedications.length,
    active: allMedications.filter(m => m.medication.isActive).length,
    inactive: allMedications.filter(m => !m.medication.isActive).length,
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Medicamentos - Todos os Pets</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie medicamentos de todos os pets cadastrados
            </p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/admin/medications")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Biblioteca
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Pill className="h-10 w-10 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                </div>
                <Pill className="h-10 w-10 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Finalizados</p>
                  <p className="text-3xl font-bold text-muted-foreground">{stats.inactive}</p>
                </div>
                <Pill className="h-10 w-10 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por pet ou medicamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Finalizados</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="preventive">Preventivo</SelectItem>
                  <SelectItem value="treatment">Tratamento</SelectItem>
                  <SelectItem value="supplement">Suplemento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Medications Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Medicamentos ({filteredMedications.length})
            </CardTitle>
            <CardDescription>
              Lista completa de medicamentos de todos os pets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredMedications.length === 0 ? (
              <div className="text-center py-12">
                <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum medicamento encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Ajuste os filtros ou adicione medicamentos aos pets
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pet</TableHead>
                      <TableHead>Medicamento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Dosagem</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Alterações</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMedications.map((med) => (
                      <TableRow key={med.medication.id}>
                        <TableCell className="font-medium">{med.petName}</TableCell>
                        <TableCell>{med.medicationInfo.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {med.medicationInfo.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{med.medication.dosage}</TableCell>
                        <TableCell>{med.medication.frequency || "-"}</TableCell>
                        <TableCell>
                          {new Date(med.medication.startDate).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={med.medication.isActive ? "default" : "secondary"}>
                            {med.medication.isActive ? "Ativo" : "Finalizado"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <RecentChangeIndicator 
                            changes={getRecentChanges(med.medication.id)}
                            resourceType="medication"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditClick(med)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Medicamento</DialogTitle>
            <DialogDescription>
              {editingMed && (
                <span>
                  {editingMed.medicationInfo.name} - {editingMed.petName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {editingMed && (
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="isActive">Status</Label>
                  <Select 
                    name="isActive" 
                    defaultValue={editingMed.medication.isActive ? "true" : "false"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ativo</SelectItem>
                      <SelectItem value="false">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data Final</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    defaultValue={
                      editingMed.medication.endDate
                        ? new Date(editingMed.medication.endDate).toISOString().split('T')[0]
                        : ""
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    defaultValue={editingMed.medication.notes || ""}
                    placeholder="Adicione observações sobre o tratamento..."
                  />
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMedication.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateMedication.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
