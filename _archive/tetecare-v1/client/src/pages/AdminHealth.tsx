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
import {
  Syringe,
  Pill,
  Shield,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  History,
  Bug,
  Worm,
  AlertCircle,
  Calendar,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { RecentChangeIndicator } from "@/components/RecentChangeIndicator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminHealth() {
  const [mainTab, setMainTab] = useState("vaccines");
  const [subTab, setSubTab] = useState("library");

  // Common state
  const [searchTerm, setSearchTerm] = useState("");
  const [petFilter, setPetFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<string>("");

  // Queries
  const { data: vaccineLibrary, refetch: refetchVaccineLibrary } = trpc.vaccines.library.useQuery();
  const { data: medicationLibrary, refetch: refetchMedicationLibrary } = trpc.medications.library.useQuery();
  const { data: preventiveLibrary, refetch: refetchPreventiveLibrary } = trpc.preventives.library.useQuery();
  const { data: pets, refetch: refetchPets } = trpc.pets.list.useQuery();
  const { data: allChanges } = trpc.changeHistory.getRecentChanges.useQuery({ limit: 200 });

  // Vaccines Mutations
  const addVaccineToLibrary = trpc.vaccines.addToLibrary.useMutation({
    onSuccess: () => {
      toast.success("Vacina adicionada à biblioteca!");
      setIsAddDialogOpen(false);
      refetchVaccineLibrary();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar vacina");
    },
  });

  const updateVaccine = trpc.vaccines.update.useMutation({
    onSuccess: () => {
      toast.success("Vacinação atualizada!");
      setIsEditDialogOpen(false);
      setEditingItem(null);
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
  });

  // Medications Mutations
  const addMedicationToLibrary = trpc.medications.addToLibrary.useMutation({
    onSuccess: () => {
      toast.success("Medicamento adicionado à biblioteca!");
      setIsAddDialogOpen(false);
      refetchMedicationLibrary();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar medicamento");
    },
  });

  const updateMedication = trpc.medications.update.useMutation({
    onSuccess: () => {
      toast.success("Medicamento atualizado!");
      setIsEditDialogOpen(false);
      setEditingItem(null);
      refetchPets();
    },
  });

  const deleteMedication = trpc.medications.delete.useMutation({
    onSuccess: () => {
      toast.success("Medicamento removido!");
      refetchPets();
    },
  });

  // Preventives Mutations
  const addPreventiveToLibrary = trpc.preventives.addToLibrary.useMutation({
    onSuccess: () => {
      toast.success("Preventivo adicionado à biblioteca!");
      setIsAddDialogOpen(false);
      refetchPreventiveLibrary();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar preventivo");
    },
  });

  const updateFlea = trpc.preventives.updateFlea.useMutation({
    onSuccess: () => {
      toast.success("Antipulgas atualizado!");
      setIsEditDialogOpen(false);
      setEditingItem(null);
      refetchPets();
    },
  });

  const deleteFlea = trpc.preventives.deleteFlea.useMutation({
    onSuccess: () => {
      toast.success("Antipulgas removido!");
      refetchPets();
    },
  });

  const updateDeworming = trpc.preventives.updateDeworming.useMutation({
    onSuccess: () => {
      toast.success("Vermífugo atualizado!");
      setIsEditDialogOpen(false);
      setEditingItem(null);
      refetchPets();
    },
  });

  const deleteDeworming = trpc.preventives.deleteDeworming.useMutation({
    onSuccess: () => {
      toast.success("Vermífugo removido!");
      refetchPets();
    },
  });

  // Get all applications based on main tab
  const getAllApplications = () => {
    if (!pets) return [];

    let applications: any[] = [];

    if (mainTab === "vaccines") {
      pets.forEach(pet => {
        pet.vaccines?.forEach((vaccine: any) => {
          applications.push({
            ...vaccine,
            petName: pet.name,
            petId: pet.id,
            type: "vaccine"
          });
        });
      });
    } else if (mainTab === "medications") {
      pets.forEach(pet => {
        pet.medications?.forEach((med: any) => {
          applications.push({
            ...med,
            petName: pet.name,
            petId: pet.id,
            type: "medication"
          });
        });
      });
    } else if (mainTab === "preventives") {
      pets.forEach(pet => {
        pet.fleaTreatments?.forEach((flea: any) => {
          applications.push({
            ...flea,
            petName: pet.name,
            petId: pet.id,
            type: "flea",
            preventiveType: "flea"
          });
        });
        pet.dewormings?.forEach((deworming: any) => {
          applications.push({
            ...deworming,
            petName: pet.name,
            petId: pet.id,
            type: "deworming",
            preventiveType: "deworming"
          });
        });
      });
    }

    // Apply filters
    if (petFilter !== "all") {
      applications = applications.filter(app => app.petId === parseInt(petFilter));
    }

    if (searchTerm) {
      applications = applications.filter(app =>
        app.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.productName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (periodFilter !== "all") {
      const now = new Date();
      const daysMap: any = { "7days": 7, "30days": 30, "90days": 90 };
      const days = daysMap[periodFilter];

      applications = applications.filter(app => {
        const date = new Date(app.administeredAt || app.lastApplication || app.applicationDate);
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= days;
      });
    }

    return applications.sort((a, b) => {
      const dateA = new Date(a.administeredAt || a.lastApplication || a.applicationDate || 0);
      const dateB = new Date(b.administeredAt || b.lastApplication || b.applicationDate || 0);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const handleAddToLibrary = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (mainTab === "vaccines") {
      addVaccineToLibrary.mutate({
        name: formData.get("name") as string,
        description: formData.get("description") as string || undefined,
        intervalDays: formData.get("intervalDays") ? parseInt(formData.get("intervalDays") as string) : undefined,
        dosesRequired: 1,
      });
    } else if (mainTab === "medications") {
      addMedicationToLibrary.mutate({
        name: formData.get("name") as string,
        type: selectedType as "preventive" | "treatment" | "supplement",
        description: formData.get("description") as string || undefined,
        defaultDosage: formData.get("defaultDosage") as string || undefined,
      });
    } else if (mainTab === "preventives") {
      addPreventiveToLibrary.mutate({
        name: formData.get("name") as string,
        type: selectedType as "flea" | "deworming",
        description: formData.get("description") as string || undefined,
        intervalDays: formData.get("intervalDays") ? parseInt(formData.get("intervalDays") as string) : undefined,
      });
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (item: any) => {
    if (!confirm("Tem certeza que deseja remover este item?")) return;

    if (mainTab === "vaccines") {
      deleteVaccine.mutate({ id: item.id });
    } else if (mainTab === "medications") {
      deleteMedication.mutate({ id: item.id });
    } else if (mainTab === "preventives") {
      if (item.preventiveType === "flea") {
        deleteFlea.mutate({ id: item.id });
      } else {
        deleteDeworming.mutate({ id: item.id });
      }
    }
  };

  const getLibrary = () => {
    if (mainTab === "vaccines") return vaccineLibrary || [];
    if (mainTab === "medications") return medicationLibrary || [];
    if (mainTab === "preventives") return preventiveLibrary || [];
    return [];
  };

  const getMainIcon = () => {
    if (mainTab === "vaccines") return Syringe;
    if (mainTab === "medications") return Pill;
    if (mainTab === "preventives") return Shield;
    return Syringe;
  };

  const MainIcon = getMainIcon();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MainIcon className="h-8 w-8 text-primary" />
              Central de Saúde
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie vacinas, medicamentos e preventivos dos pets
            </p>
          </div>
        </div>

        <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="vaccines" className="flex items-center gap-2">
              <Syringe className="h-4 w-4" />
              Vacinas
            </TabsTrigger>
            <TabsTrigger value="medications" className="flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Medicamentos
            </TabsTrigger>
            <TabsTrigger value="preventives" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Preventivos
            </TabsTrigger>
          </TabsList>

          {/* Vaccines, Medications, Preventives */}
          {(mainTab === "vaccines" || mainTab === "medications" || mainTab === "preventives") && (
            <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="library">Biblioteca</TabsTrigger>
                <TabsTrigger value="applications">Aplicações</TabsTrigger>
                <TabsTrigger value="schedule">Cronograma</TabsTrigger>
              </TabsList>

              <TabsContent value="library" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Biblioteca de {
                        mainTab === "vaccines" ? "Vacinas" :
                        mainTab === "medications" ? "Medicamentos" : "Preventivos"
                      }</CardTitle>
                      <CardDescription>
                        Gerencie os itens disponíveis para aplicação
                      </CardDescription>
                    </div>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {getLibrary().map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground mt-1">{item.description}</div>
                            )}
                            <div className="flex gap-2 mt-2">
                              {item.type && (
                                <Badge variant="outline">{item.type}</Badge>
                              )}
                              {item.intervalDays && (
                                <Badge variant="secondary">
                                  Reaplicar a cada {item.intervalDays} dias
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="applications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Aplicações</CardTitle>
                    <CardDescription>
                      Visualize e gerencie todas as aplicações realizadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por pet ou item..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={petFilter} onValueChange={setPetFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Filtrar por pet" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os pets</SelectItem>
                          {pets?.map((pet) => (
                            <SelectItem key={pet.id} value={pet.id.toString()}>
                              {pet.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={periodFilter} onValueChange={setPeriodFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todo período</SelectItem>
                          <SelectItem value="7days">Últimos 7 dias</SelectItem>
                          <SelectItem value="30days">Últimos 30 dias</SelectItem>
                          <SelectItem value="90days">Últimos 90 dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pet</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Data</TableHead>
                            {mainTab === "vaccines" && <TableHead>Status</TableHead>}
                            {mainTab === "medications" && <TableHead>Tipo</TableHead>}
                            {mainTab === "preventives" && <TableHead>Tipo</TableHead>}
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getAllApplications().map((app) => (
                            <TableRow key={`${app.type}-${app.id}`}>
                              <TableCell className="font-medium">{app.petName}</TableCell>
                              <TableCell>{app.name || app.productName}</TableCell>
                              <TableCell>
                                {format(new Date(app.administeredAt || app.lastApplication || app.applicationDate), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              {mainTab === "vaccines" && (
                                <TableCell>
                                  <Badge variant={app.status === "completed" ? "default" : "secondary"}>
                                    {app.status === "completed" ? "Completo" : "Pendente"}
                                  </Badge>
                                </TableCell>
                              )}
                              {mainTab === "medications" && (
                                <TableCell>
                                  <Badge variant="outline">{app.type}</Badge>
                                </TableCell>
                              )}
                              {mainTab === "preventives" && (
                                <TableCell>
                                  <Badge variant="outline">
                                    {app.preventiveType === "flea" ? "Antipulgas" : "Vermífugo"}
                                  </Badge>
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(app)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(app)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Cronograma de Aplicações</CardTitle>
                    <CardDescription>
                      Próximas aplicações e alertas de vencimento
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <div className="text-center space-y-2">
                        <Calendar className="h-12 w-12 mx-auto opacity-50" />
                        <p>Visualização de cronograma integrada ao calendário principal</p>
                        <Button variant="link" onClick={() => window.location.href = "/admin/health-calendar"}>
                          Ir para Calendário
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </Tabs>

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Adicionar {
                  mainTab === "vaccines" ? "Vacina" :
                  mainTab === "medications" ? "Medicamento" : "Preventivo"
                }
              </DialogTitle>
              <DialogDescription>
                Adicione um novo item à biblioteca
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddToLibrary} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" required />
              </div>

              {(mainTab === "medications" || mainTab === "preventives") && (
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={selectedType} onValueChange={setSelectedType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {mainTab === "medications" ? (
                        <>
                          <SelectItem value="preventive">Preventivo</SelectItem>
                          <SelectItem value="treatment">Tratamento</SelectItem>
                          <SelectItem value="supplement">Suplemento</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="flea">Antipulgas</SelectItem>
                          <SelectItem value="deworming">Vermífugo</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea id="description" name="description" />
              </div>

              {(mainTab === "vaccines" || mainTab === "preventives") && (
                <div className="space-y-2">
                  <Label htmlFor="intervalDays">Intervalo de Reaplicação (dias)</Label>
                  <Input id="intervalDays" name="intervalDays" type="number" />
                </div>
              )}

              {mainTab === "medications" && (
                <div className="space-y-2">
                  <Label htmlFor="defaultDosage">Dosagem Padrão (opcional)</Label>
                  <Input id="defaultDosage" name="defaultDosage" />
                </div>
              )}

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
    </AdminLayout>
  );
}
