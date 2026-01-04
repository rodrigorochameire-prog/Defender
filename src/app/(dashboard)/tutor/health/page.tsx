"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Syringe,
  Pill,
  Shield,
  Plus,
  Calendar,
  Heart,
  AlertTriangle,
  Clock,
  Dog,
  CheckCircle,
  Bug,
  Leaf,
  Flame,
  Droplets,
  Package,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

const PREVENTIVE_TYPES: Array<{ value: string; label: string; icon: LucideIcon; color: string }> = [
  { value: "flea", label: "Antipulgas", icon: Bug, color: "text-amber-600" },
  { value: "deworming", label: "Vermífugo", icon: Droplets, color: "text-rose-600" },
  { value: "heartworm", label: "Cardioprotetor", icon: Heart, color: "text-red-500" },
  { value: "tick", label: "Carrapaticida", icon: Shield, color: "text-orange-600" },
];

const MEDICATION_TYPES: Array<{ value: string; label: string; icon: LucideIcon; color: string }> = [
  { value: "antibiotic", label: "Antibiótico", icon: Pill, color: "text-blue-600" },
  { value: "antiinflammatory", label: "Anti-inflamatório", icon: Flame, color: "text-orange-500" },
  { value: "analgesic", label: "Analgésico", icon: Syringe, color: "text-purple-600" },
  { value: "supplement", label: "Suplemento", icon: Leaf, color: "text-green-600" },
  { value: "other", label: "Outro", icon: Package, color: "text-slate-500" },
];

export default function TutorHealthPage() {
  const [mainTab, setMainTab] = useState("vaccines");
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  
  // Dialogs
  const [isAddVaccineOpen, setIsAddVaccineOpen] = useState(false);
  const [isAddPreventiveOpen, setIsAddPreventiveOpen] = useState(false);
  const [isAddMedicationOpen, setIsAddMedicationOpen] = useState(false);

  // Queries
  const { data: myPets } = trpc.pets.myPets.useQuery();
  const { data: vaccineLibrary } = trpc.vaccines.library.useQuery();
  const { data: medicationLibrary } = trpc.medications.library.useQuery();

  // Pet specific queries
  const { data: petVaccinations, refetch: refetchVaccinations } = trpc.vaccines.getPetVaccinations.useQuery(
    { petId: parseInt(selectedPetId) },
    { enabled: !!selectedPetId }
  );
  const { data: petPreventives, refetch: refetchPreventives } = trpc.preventives.byPet.useQuery(
    { petId: parseInt(selectedPetId) },
    { enabled: !!selectedPetId }
  );
  const { data: petMedications, refetch: refetchMedications } = trpc.medications.getPetMedications.useQuery(
    { petId: parseInt(selectedPetId) },
    { enabled: !!selectedPetId }
  );

  // Mutations
  const addVaccination = trpc.vaccines.addVaccination.useMutation({
    onSuccess: () => {
      toast.success("Vacinação registrada!");
      setIsAddVaccineOpen(false);
      refetchVaccinations();
    },
    onError: (error) => toast.error(error.message),
  });

  const addPreventive = trpc.preventives.add.useMutation({
    onSuccess: () => {
      toast.success("Preventivo registrado!");
      setIsAddPreventiveOpen(false);
      refetchPreventives();
    },
    onError: (error) => toast.error(error.message),
  });

  const addMedication = trpc.medications.add.useMutation({
    onSuccess: () => {
      toast.success("Medicamento registrado!");
      setIsAddMedicationOpen(false);
      refetchMedications();
    },
    onError: (error) => toast.error(error.message),
  });

  // Handlers
  const handleAddVaccine = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addVaccination.mutate({
      petId: parseInt(selectedPetId),
      vaccineId: parseInt(formData.get("vaccineId") as string),
      applicationDate: formData.get("applicationDate") as string,
      nextDueDate: formData.get("nextDueDate") as string || undefined,
      veterinarian: formData.get("veterinarian") as string || undefined,
      clinic: formData.get("clinic") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleAddPreventive = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addPreventive.mutate({
      petId: parseInt(selectedPetId),
      type: formData.get("type") as "flea" | "deworming" | "heartworm" | "tick",
      productName: formData.get("productName") as string,
      applicationDate: formData.get("applicationDate") as string,
      nextDueDate: formData.get("nextDueDate") as string || undefined,
      dosage: formData.get("dosage") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleAddMedication = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addMedication.mutate({
      petId: parseInt(selectedPetId),
      customMedName: formData.get("customName") as string,
      customMedType: formData.get("customType") as string || "other",
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string || undefined,
      dosage: formData.get("dosage") as string,
      frequency: formData.get("frequency") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  // Auto-select first pet
  const firstPet = myPets?.[0];
  if (!selectedPetId && firstPet) {
    setSelectedPetId(firstPet.id.toString());
  }

  // Filter medications (excluding preventive types)
  const medicationsOnly = (petMedications || []).filter(
    (m: any) => !["flea", "deworming", "heartworm", "tick"].includes(m.library?.type)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-500" />
            Central de Saúde
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a saúde dos seus pets
          </p>
        </div>
      </div>

      {/* Pet Selector */}
      {myPets && myPets.length > 1 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Selecione o pet:</span>
              <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {myPets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id.toString()}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedPetId ? (
        <Card className="p-12 text-center">
          <Dog className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Selecione um pet para ver as informações de saúde</p>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vacinas</CardTitle>
                <Syringe className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{petVaccinations?.length || 0}</div>
                <p className="text-xs text-muted-foreground">registradas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Preventivos</CardTitle>
                <Shield className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{petPreventives?.length || 0}</div>
                <p className="text-xs text-muted-foreground">registrados</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medicamentos</CardTitle>
                <Pill className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{medicationsOnly.length}</div>
                <p className="text-xs text-muted-foreground">registrados</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
              <TabsTrigger value="vaccines" className="flex items-center gap-2">
                <Syringe className="h-4 w-4" />
                Vacinas
              </TabsTrigger>
              <TabsTrigger value="preventives" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Preventivos
              </TabsTrigger>
              <TabsTrigger value="medications" className="flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Medicamentos
              </TabsTrigger>
            </TabsList>

            {/* ========== VACINAS ========== */}
            <TabsContent value="vaccines" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Syringe className="h-5 w-5 text-blue-500" />
                      Carteira de Vacinação
                    </CardTitle>
                    <CardDescription>
                      Vacinas aplicadas e próximas doses
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsAddVaccineOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </CardHeader>
                <CardContent>
                  {petVaccinations && petVaccinations.length > 0 ? (
                    <div className="space-y-3">
                      {petVaccinations.map((item: any) => (
                        <div key={item.vaccination.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{item.vaccine?.name}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(item.vaccination.applicationDate).toLocaleDateString("pt-BR")}
                              </span>
                              {item.vaccination.veterinarian && (
                                <span>Dr. {item.vaccination.veterinarian}</span>
                              )}
                            </div>
                          </div>
                          {item.vaccination.nextDueDate && (
                            <Badge variant={new Date(item.vaccination.nextDueDate) < new Date() ? "destructive" : "outline"}>
                              <Clock className="h-3 w-3 mr-1" />
                              Próxima: {new Date(item.vaccination.nextDueDate).toLocaleDateString("pt-BR")}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Syringe className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Nenhuma vacina registrada</p>
                      <Button variant="link" onClick={() => setIsAddVaccineOpen(true)}>
                        Adicionar primeira vacina
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ========== PREVENTIVOS ========== */}
            <TabsContent value="preventives" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-500" />
                      Preventivos
                    </CardTitle>
                    <CardDescription>
                      Antipulgas, vermífugos, carrapaticidas
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsAddPreventiveOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </CardHeader>
                <CardContent>
                  {/* Quick Add Buttons */}
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    {PREVENTIVE_TYPES.map((type) => (
                      <div
                        key={type.value}
                        className="p-3 border rounded-lg text-center hover:bg-accent transition-colors cursor-pointer border-dashed"
                        onClick={() => setIsAddPreventiveOpen(true)}
                      >
                        <type.icon className={`h-6 w-6 ${type.color}`} />
                        <p className="text-xs font-medium mt-1">{type.label}</p>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  {petPreventives && petPreventives.length > 0 ? (
                    <div className="space-y-3">
                      {petPreventives.map((item: any) => {
                        const type = PREVENTIVE_TYPES.find(t => t.value === item.type);
                        const isOverdue = item.nextDueDate && new Date(item.nextDueDate) < new Date();
                        
                        return (
                          <div key={item.id} className={`flex items-center justify-between p-4 border rounded-lg ${isOverdue ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                            <div className="flex items-center gap-3">
                              {(() => {
                                const Icon = type?.icon || Shield;
                                return <Icon className={`h-6 w-6 ${type?.color || 'text-green-600'}`} />;
                              })()}
                              <div>
                                <p className="font-medium">{item.productName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(item.applicationDate).toLocaleDateString("pt-BR")}
                                  {item.dosage && ` • ${item.dosage}`}
                                </p>
                              </div>
                            </div>
                            {item.nextDueDate && (
                              <Badge variant={isOverdue ? "destructive" : "outline"}>
                                {isOverdue ? <AlertTriangle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                                {new Date(item.nextDueDate).toLocaleDateString("pt-BR")}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Nenhum preventivo registrado</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ========== MEDICAMENTOS ========== */}
            <TabsContent value="medications" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="h-5 w-5 text-purple-500" />
                      Medicamentos
                    </CardTitle>
                    <CardDescription>
                      Tratamentos e medicamentos em uso
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsAddMedicationOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </CardHeader>
                <CardContent>
                  {medicationsOnly.length > 0 ? (
                    <div className="space-y-3">
                      {medicationsOnly.map((item: any) => {
                        const type = MEDICATION_TYPES.find(t => t.value === item.library?.type);
                        
                        return (
                          <div key={item.medication.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {(() => {
                                const Icon = type?.icon || Pill;
                                return <Icon className={`h-6 w-6 ${type?.color || 'text-purple-600'}`} />;
                              })()}
                              <div>
                                <p className="font-medium">{item.library?.name || "Medicamento"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.medication.dosage}
                                  {item.medication.frequency && ` • ${item.medication.frequency}`}
                                </p>
                              </div>
                            </div>
                            <Badge variant={item.medication.isActive ? "default" : "secondary"}>
                              {item.medication.isActive ? "Ativo" : "Concluído"}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Pill className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Nenhum medicamento registrado</p>
                      <Button variant="link" onClick={() => setIsAddMedicationOpen(true)}>
                        Adicionar medicamento
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* ========== DIALOG: NOVA VACINA ========== */}
      <Dialog open={isAddVaccineOpen} onOpenChange={setIsAddVaccineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Syringe className="h-5 w-5 text-blue-500" />
              Registrar Vacinação
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddVaccine} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vaccineId">Vacina *</Label>
              <Select name="vaccineId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a vacina" />
                </SelectTrigger>
                <SelectContent>
                  {vaccineLibrary?.map((v: any) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicationDate">Data da Aplicação *</Label>
                <Input type="date" name="applicationDate" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextDueDate">Próxima Dose</Label>
                <Input type="date" name="nextDueDate" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="veterinarian">Veterinário</Label>
                <Input name="veterinarian" placeholder="Nome do veterinário" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic">Clínica</Label>
                <Input name="clinic" placeholder="Nome da clínica" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea name="notes" placeholder="Observações..." rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddVaccineOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addVaccination.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========== DIALOG: NOVO PREVENTIVO ========== */}
      <Dialog open={isAddPreventiveOpen} onOpenChange={setIsAddPreventiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Registrar Preventivo
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPreventive} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select name="type" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {PREVENTIVE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className={`h-4 w-4 ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productName">Nome do Produto *</Label>
              <Input name="productName" placeholder="Ex: NexGard, Bravecto..." required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicationDate">Data da Aplicação *</Label>
                <Input type="date" name="applicationDate" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextDueDate">Próxima Aplicação</Label>
                <Input type="date" name="nextDueDate" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dosage">Dosagem</Label>
              <Input name="dosage" placeholder="Ex: 1 comprimido" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea name="notes" placeholder="Observações..." rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddPreventiveOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addPreventive.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========== DIALOG: NOVO MEDICAMENTO ========== */}
      <Dialog open={isAddMedicationOpen} onOpenChange={setIsAddMedicationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-purple-500" />
              Registrar Medicamento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMedication} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customName">Nome do Medicamento *</Label>
              <Input name="customName" placeholder="Nome do medicamento" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customType">Tipo</Label>
              <Select name="customType" defaultValue="other">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEDICATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className={`h-4 w-4 ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dosage">Dosagem *</Label>
              <Input name="dosage" placeholder="Ex: 1 comprimido de 500mg" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data de Início *</Label>
                <Input type="date" name="startDate" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data de Término</Label>
                <Input type="date" name="endDate" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Input name="frequency" placeholder="Ex: 2x ao dia" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea name="notes" placeholder="Observações..." rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddMedicationOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addMedication.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

