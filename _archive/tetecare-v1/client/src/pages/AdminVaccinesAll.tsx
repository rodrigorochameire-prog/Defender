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
import { Syringe, Search, AlertCircle, CheckCircle2, Edit, Save, X, ArrowLeft } from "lucide-react";
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

export default function AdminVaccinesAll() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingVacc, setEditingVacc] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: pets, refetch: refetchPets } = trpc.pets.list.useQuery();
  const { data: allChanges } = trpc.changeHistory.getRecentChanges.useQuery({ limit: 200 });
  
  const updateVaccination = trpc.vaccines.update.useMutation({
    onSuccess: () => {
      toast.success("Vacinação atualizada com sucesso!");
      setIsEditDialogOpen(false);
      setEditingVacc(null);
      refetchPets();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar vacinação: " + error.message);
    },
  });
  
  const handleEditClick = (vacc: any) => {
    setEditingVacc(vacc);
    setIsEditDialogOpen(true);
  };
  
  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const nextDueDate = formData.get("nextDueDate") as string;
    const veterinarian = formData.get("veterinarian") as string;
    const clinic = formData.get("clinic") as string;
    const notes = formData.get("notes") as string;
    
    updateVaccination.mutate({
      id: editingVacc.vaccination.id,
      petId: editingVacc.petId,
      nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
      veterinarian: veterinarian || undefined,
      clinic: clinic || undefined,
      notes: notes || undefined,
    });
  };

  // Get all vaccinations for all pets
  const petVaccinations = pets?.map(pet => {
    const { data: vaccinations } = trpc.vaccines.getPetVaccinations.useQuery({ petId: pet.id });
    return { pet, vaccinations: vaccinations || [] };
  }).filter(Boolean) || [];

  // Flatten all vaccinations with pet info
  const allVaccinations = petVaccinations.flatMap(({ pet, vaccinations }) =>
    vaccinations.map(vacc => ({
      ...vacc,
      petName: pet.name,
      petId: pet.id,
    }))
  );

  // Helper to check if vaccine is overdue
  const isOverdue = (nextDueDate: Date | null) => {
    if (!nextDueDate) return false;
    return new Date(nextDueDate) < new Date();
  };

  // Helper to check if vaccine is upcoming (within 30 days)
  const isUpcoming = (nextDueDate: Date | null) => {
    if (!nextDueDate) return false;
    const daysUntil = Math.ceil(
      (new Date(nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil > 0 && daysUntil <= 30;
  };

  // Filter vaccinations
  const filteredVaccinations = allVaccinations.filter(vacc => {
    const matchesSearch = 
      vacc.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vacc.vaccine.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "overdue" && isOverdue(vacc.vaccination.nextDueDate)) ||
      (statusFilter === "upcoming" && isUpcoming(vacc.vaccination.nextDueDate)) ||
      (statusFilter === "ok" && !isOverdue(vacc.vaccination.nextDueDate) && !isUpcoming(vacc.vaccination.nextDueDate));
    
    return matchesSearch && matchesStatus;
  });

  // Helper to get recent changes for a vaccination
  const getRecentChanges = (vaccinationId: number) => {
    if (!allChanges) return [];
    return allChanges
      .filter((change: any) => 
        change.resourceType === "preventive" && 
        change.resourceId === vaccinationId
      )
      .slice(0, 3);
  };

  // Count statistics
  const stats = {
    total: allVaccinations.length,
    overdue: allVaccinations.filter(v => isOverdue(v.vaccination.nextDueDate)).length,
    upcoming: allVaccinations.filter(v => isUpcoming(v.vaccination.nextDueDate)).length,
    ok: allVaccinations.filter(v => !isOverdue(v.vaccination.nextDueDate) && !isUpcoming(v.vaccination.nextDueDate)).length,
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Vacinas - Todos os Pets</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie vacinas de todos os pets cadastrados
            </p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/admin/vaccines")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Biblioteca
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Syringe className="h-10 w-10 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Atrasadas</p>
                  <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
                </div>
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Próximas (30d)</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.upcoming}</p>
                </div>
                <AlertCircle className="h-10 w-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Dia</p>
                  <p className="text-3xl font-bold text-green-600">{stats.ok}</p>
                </div>
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por pet ou vacina..."
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
                  <SelectItem value="overdue">Atrasadas</SelectItem>
                  <SelectItem value="upcoming">Próximas (30 dias)</SelectItem>
                  <SelectItem value="ok">Em dia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Vaccinations Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Syringe className="h-5 w-5" />
              Vacinas ({filteredVaccinations.length})
            </CardTitle>
            <CardDescription>
              Lista completa de vacinas de todos os pets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredVaccinations.length === 0 ? (
              <div className="text-center py-12">
                <Syringe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhuma vacina encontrada</p>
                <p className="text-sm text-muted-foreground">
                  Ajuste os filtros ou adicione vacinas aos pets
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                      <TableHead>Alterações</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVaccinations.map((vacc) => {
                      const overdue = isOverdue(vacc.vaccination.nextDueDate);
                      const upcoming = isUpcoming(vacc.vaccination.nextDueDate);
                      
                      return (
                        <TableRow key={vacc.vaccination.id}>
                          <TableCell className="font-medium">{vacc.petName}</TableCell>
                          <TableCell>{vacc.vaccine.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              Dose {vacc.vaccination.doseNumber || 1}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(vacc.vaccination.applicationDate).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            {vacc.vaccination.nextDueDate 
                              ? new Date(vacc.vaccination.nextDueDate).toLocaleDateString("pt-BR")
                              : "-"}
                          </TableCell>
                          <TableCell>{vacc.vaccination.veterinarian || "-"}</TableCell>
                          <TableCell>
                            {overdue && (
                              <Badge variant="destructive">Atrasada</Badge>
                            )}
                            {upcoming && !overdue && (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                Próxima
                              </Badge>
                            )}
                            {!overdue && !upcoming && (
                              <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                                Em dia
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <RecentChangeIndicator 
                              changes={getRecentChanges(vacc.vaccination.id)}
                              resourceType="vaccine"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditClick(vacc)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
            <DialogTitle>Editar Vacinação</DialogTitle>
            <DialogDescription>
              {editingVacc && (
                <span>
                  {editingVacc.vaccine.name} - {editingVacc.petName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {editingVacc && (
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nextDueDate">Próxima Dose</Label>
                  <Input
                    id="nextDueDate"
                    name="nextDueDate"
                    type="date"
                    defaultValue={
                      editingVacc.vaccination.nextDueDate
                        ? new Date(editingVacc.vaccination.nextDueDate).toISOString().split('T')[0]
                        : ""
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="veterinarian">Veterinário</Label>
                  <Input
                    id="veterinarian"
                    name="veterinarian"
                    type="text"
                    defaultValue={editingVacc.vaccination.veterinarian || ""}
                    placeholder="Nome do veterinário"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clinic">Clínica</Label>
                  <Input
                    id="clinic"
                    name="clinic"
                    type="text"
                    defaultValue={editingVacc.vaccination.clinic || ""}
                    placeholder="Nome da clínica"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    defaultValue={editingVacc.vaccination.notes || ""}
                    placeholder="Adicione observações sobre a vacinação..."
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
                <Button type="submit" disabled={updateVaccination.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateVaccination.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
