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
  ShieldCheck,
  Shield,
  Plus,
  Search,
  Calendar,
  Heart,
  AlertTriangle,
  Clock,
  Dog,
  CheckCircle,
  X,
  Sparkles,
  Leaf,
  Activity,
  CircleDot,
  Package,
  Bug,
  Droplets,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

// Tipos de preventivos - ícones minimalistas, cor única
const PREVENTIVE_TYPES: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "flea", label: "Antipulgas", icon: Bug },
  { value: "deworming", label: "Vermífugo", icon: Droplets },
  { value: "heartworm", label: "Cardioprotetor", icon: Heart },
  { value: "tick", label: "Carrapaticida", icon: ShieldCheck },
];

// Tipos de medicamentos - ícones minimalistas
const MEDICATION_TYPES: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "antibiotic", label: "Antibiótico", icon: Pill },
  { value: "antiinflammatory", label: "Anti-inflamatório", icon: Activity },
  { value: "analgesic", label: "Analgésico", icon: Syringe },
  { value: "supplement", label: "Suplemento", icon: Leaf },
  { value: "other", label: "Outro", icon: Package },
];

export default function AdminHealthPage() {
  const [mainTab, setMainTab] = useState("vaccines");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  
  // Dialogs
  const [isAddVaccineOpen, setIsAddVaccineOpen] = useState(false);
  const [isAddMedicationOpen, setIsAddMedicationOpen] = useState(false);
  const [isAddPreventiveOpen, setIsAddPreventiveOpen] = useState(false);

  // Queries
  const { data: pets } = trpc.pets.list.useQuery();
  const { data: vaccineLibrary, refetch: refetchVaccines } = trpc.vaccines.library.useQuery();
  const { data: medicationLibrary, refetch: refetchMedications } = trpc.medications.library.useQuery();
  const { data: vaccineStats } = trpc.vaccines.stats.useQuery();
  const { data: preventiveStats } = trpc.preventives.stats.useQuery();
  const { data: upcomingVaccines } = trpc.vaccines.upcoming.useQuery({ daysAhead: 30 });
  const { data: upcomingPreventives } = trpc.preventives.upcoming.useQuery({ daysAhead: 30 });
  const { data: overduePreventives } = trpc.preventives.overdue.useQuery();

  // Mutations
  const addVaccineToLibrary = trpc.vaccines.addToLibrary.useMutation({
    onSuccess: () => {
      toast.success("Vacina cadastrada com sucesso!");
      setIsAddVaccineOpen(false);
      refetchVaccines();
    },
    onError: (error) => toast.error(error.message),
  });

  const addMedicationToLibrary = trpc.medications.addToLibrary.useMutation({
    onSuccess: () => {
      toast.success("Medicamento cadastrado com sucesso!");
      setIsAddMedicationOpen(false);
      refetchMedications();
    },
    onError: (error) => toast.error(error.message),
  });

  const addVaccination = trpc.vaccines.addVaccination.useMutation({
    onSuccess: () => {
      toast.success("Vacinação registrada!");
      setIsAddVaccineOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const addPreventive = trpc.preventives.add.useMutation({
    onSuccess: () => {
      toast.success("Preventivo registrado!");
      setIsAddPreventiveOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const addMedication = trpc.medications.add.useMutation({
    onSuccess: () => {
      toast.success("Medicamento registrado!");
      setIsAddMedicationOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  // Handlers
  const handleAddVaccine = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const isNewVaccine = formData.get("vaccineType") === "new";
    
    if (isNewVaccine) {
      // Adiciona nova vacina à biblioteca e registra aplicação
      addVaccineToLibrary.mutate({
        name: formData.get("customName") as string,
        description: formData.get("description") as string || undefined,
        intervalDays: formData.get("intervalDays") ? parseInt(formData.get("intervalDays") as string) : undefined,
        dosesRequired: 1,
      });
    } else {
      // Registra aplicação de vacina existente
      addVaccination.mutate({
        petId: parseInt(formData.get("petId") as string),
        vaccineId: parseInt(formData.get("vaccineId") as string),
        applicationDate: formData.get("applicationDate") as string,
        nextDueDate: formData.get("nextDueDate") as string || undefined,
        veterinarian: formData.get("veterinarian") as string || undefined,
        clinic: formData.get("clinic") as string || undefined,
        notes: formData.get("notes") as string || undefined,
      });
    }
  };

  const handleAddPreventive = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addPreventive.mutate({
      petId: parseInt(formData.get("petId") as string),
      type: formData.get("type") as "flea" | "deworming" | "heartworm",
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
    const isCustom = formData.get("medicationType") === "custom";
    
    addMedication.mutate({
      petId: parseInt(formData.get("petId") as string),
      medicationId: !isCustom ? parseInt(formData.get("medicationId") as string) : undefined,
      customMedName: isCustom ? formData.get("customName") as string : undefined,
      customMedType: isCustom ? formData.get("customType") as string : undefined,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string || undefined,
      dosage: formData.get("dosage") as string,
      frequency: formData.get("frequency") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  // Filter medications library (excluding preventive types)
  const medicationsOnly = (medicationLibrary || []).filter(
    (m: any) => !["flea", "deworming", "heartworm", "tick"].includes(m.type)
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Heart />
          </div>
          <div className="page-header-info">
            <h1>Central de Saúde</h1>
            <p>Gerencie vacinas, medicamentos e preventivos</p>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {((overduePreventives?.length || 0) > 0 || (vaccineStats?.overdue || 0) > 0) && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-red-100 dark:bg-red-900/40">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-medium text-sm text-red-700 dark:text-red-300">Tratamentos atrasados</p>
              <div className="flex gap-3 mt-0.5 text-xs text-red-600/80 dark:text-red-400/80">
                {(vaccineStats?.overdue || 0) > 0 && (
                  <span>{vaccineStats?.overdue} vacina(s) vencida(s)</span>
                )}
                {(overduePreventives?.length || 0) > 0 && (
                  <span>{overduePreventives?.length} preventivo(s) vencido(s)</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats - Layout compacto */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Vacinas</span>
            <Syringe className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold">{vaccineStats?.upcoming || 0}</div>
          <div className="text-xs text-muted-foreground">próximos 30 dias</div>
        </div>
        
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Preventivos</span>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold">{preventiveStats?.upcoming || 0}</div>
          <div className="text-xs text-muted-foreground">próximos 30 dias</div>
        </div>
        
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Antipulgas</span>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold">{preventiveStats?.flea || 0}</div>
          <div className="text-xs text-muted-foreground">registros</div>
        </div>
        
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Vermífugos</span>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold">{preventiveStats?.deworming || 0}</div>
          <div className="text-xs text-muted-foreground">registros</div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-4">
        <TabsList className="h-9 p-1 bg-muted/60">
          <TabsTrigger value="vaccines" className="text-sm gap-1.5 px-3">
            <Syringe className="h-3.5 w-3.5" />
            Vacinas
          </TabsTrigger>
          <TabsTrigger value="preventives" className="text-sm gap-1.5 px-3">
            <Shield className="h-3.5 w-3.5" />
            Preventivos
          </TabsTrigger>
          <TabsTrigger value="medications" className="text-sm gap-1.5 px-3">
            <Pill className="h-3.5 w-3.5" />
            Medicamentos
          </TabsTrigger>
        </TabsList>

        {/* ========== VACINAS ========== */}
        <TabsContent value="vaccines" className="space-y-4">
          {/* Header com botão */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Vacinas</h3>
              <p className="text-sm text-muted-foreground">Carteira de vacinação dos pets</p>
            </div>
            <Button size="sm" onClick={() => setIsAddVaccineOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova
            </Button>
          </div>

          {/* Próximas vacinas */}
          {upcomingVaccines && upcomingVaccines.length > 0 && (
            <div className="bg-card border rounded-lg p-4">
              <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Próximas 30 dias
              </h4>
              <div className="space-y-2">
                {upcomingVaccines.slice(0, 5).map((item: any) => (
                  <div key={item.vaccination.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Dog className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{item.pet?.name}</p>
                        <p className="text-xs text-muted-foreground">{item.vaccine?.name}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.vaccination.nextDueDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Biblioteca de Vacinas */}
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Vacinas cadastradas</h4>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {(vaccineLibrary || [])
                .filter((v: any) => v.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((vaccine: any) => (
                  <div key={vaccine.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <p className="text-sm font-medium">{vaccine.name}</p>
                    {vaccine.intervalDays && (
                      <p className="text-xs text-muted-foreground mt-1">A cada {vaccine.intervalDays} dias</p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>

        {/* ========== PREVENTIVOS ========== */}
        <TabsContent value="preventives" className="space-y-4">
          {/* Header com botão */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Preventivos</h3>
              <p className="text-sm text-muted-foreground">Antipulgas, vermífugos, carrapaticidas e cardioprotetores</p>
            </div>
            <Button size="sm" onClick={() => setIsAddPreventiveOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Novo
            </Button>
          </div>

          {/* Tipos de Preventivos - Grid limpo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PREVENTIVE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setIsAddPreventiveOpen(true)}
                className="flex flex-col items-center gap-2 p-4 bg-card border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-all"
              >
                <type.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>

          {/* Listas lado a lado */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Atrasados */}
            <div className="bg-card border rounded-lg p-4">
              <h4 className="text-sm font-medium text-destructive flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4" />
                Atrasados
              </h4>
              {overduePreventives && overduePreventives.length > 0 ? (
                <div className="space-y-2">
                  {overduePreventives.slice(0, 5).map((item: any) => (
                    <div key={item.treatment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <Dog className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{item.pet?.name}</p>
                          <p className="text-xs text-muted-foreground">{item.treatment.productName}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mb-2 text-green-500/50" />
                  <p className="text-sm">Nenhum atrasado</p>
                </div>
              )}
            </div>

            {/* Próximos */}
            <div className="bg-card border rounded-lg p-4">
              <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Próximos 30 dias
              </h4>
              {upcomingPreventives && upcomingPreventives.length > 0 ? (
                <div className="space-y-2">
                  {upcomingPreventives.slice(0, 5).map((item: any) => (
                    <div key={item.treatment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <Dog className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{item.pet?.name}</p>
                          <p className="text-xs text-muted-foreground">{item.treatment.productName}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.treatment.nextDueDate).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-muted-foreground">
                  <p className="text-sm">Nenhum agendado</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ========== MEDICAMENTOS ========== */}
        <TabsContent value="medications" className="space-y-4">
          {/* Header com botão */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Medicamentos</h3>
              <p className="text-sm text-muted-foreground">Antibióticos, anti-inflamatórios, suplementos</p>
            </div>
            <Button size="sm" onClick={() => setIsAddMedicationOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Novo
            </Button>
          </div>

          {/* Tipos de Medicamentos - Grid limpo */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {MEDICATION_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setIsAddMedicationOpen(true)}
                className="flex flex-col items-center gap-2 p-3 bg-card border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-all"
              >
                <type.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">{type.label}</span>
              </button>
            ))}
          </div>

          {/* Medicamentos cadastrados */}
          <div className="bg-card border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3">Cadastrados</h4>
            {medicationsOnly.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Pill className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Nenhum medicamento</p>
                <Button variant="link" size="sm" onClick={() => setIsAddMedicationOpen(true)}>
                  Adicionar
                </Button>
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {medicationsOnly.map((med: any) => {
                  const type = MEDICATION_TYPES.find(t => t.value === med.type);
                  const Icon = type?.icon || Pill;
                  return (
                    <div key={med.id} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{med.name}</p>
                        {med.commonDosage && (
                          <p className="text-xs text-muted-foreground">{med.commonDosage}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ========== DIALOG: NOVA VACINA ========== */}
      <Dialog open={isAddVaccineOpen} onOpenChange={setIsAddVaccineOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Syringe className="h-5 w-5 text-blue-500" />
              Registrar Vacinação
            </DialogTitle>
            <DialogDescription>
              Registre uma vacinação ou adicione uma nova vacina à biblioteca
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddVaccine} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="petId">Pet *</Label>
                <Select name="petId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets?.map((pet: any) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vaccineType">Tipo</Label>
                <Select name="vaccineType" defaultValue="existing">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">Vacina existente</SelectItem>
                    <SelectItem value="new">Nova vacina (personalizada)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vaccineId">Vacina *</Label>
              <Select name="vaccineId">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione ou crie uma nova" />
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

            <div className="space-y-2">
              <Label htmlFor="customName">Ou digite o nome (nova vacina)</Label>
              <Input id="customName" name="customName" placeholder="Nome da vacina personalizada" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicationDate">Data da Aplicação *</Label>
                <Input type="date" id="applicationDate" name="applicationDate" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextDueDate">Próxima Dose</Label>
                <Input type="date" id="nextDueDate" name="nextDueDate" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="veterinarian">Veterinário</Label>
                <Input id="veterinarian" name="veterinarian" placeholder="Nome do veterinário" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic">Clínica</Label>
                <Input id="clinic" name="clinic" placeholder="Nome da clínica" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" name="notes" placeholder="Observações adicionais..." rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddVaccineOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addVaccination.isPending || addVaccineToLibrary.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========== DIALOG: NOVO PREVENTIVO ========== */}
      <Dialog open={isAddPreventiveOpen} onOpenChange={setIsAddPreventiveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Registrar Preventivo
            </DialogTitle>
            <DialogDescription>
              Antipulgas, vermífugos, carrapaticidas ou cardioprotetores
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPreventive} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="petId">Pet *</Label>
                <Select name="petId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets?.map((pet: any) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="productName">Nome do Produto *</Label>
              <Input id="productName" name="productName" placeholder="Ex: NexGard, Bravecto, Drontal..." required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicationDate">Data da Aplicação *</Label>
                <Input type="date" id="applicationDate" name="applicationDate" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextDueDate">Próxima Aplicação</Label>
                <Input type="date" id="nextDueDate" name="nextDueDate" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dosage">Dosagem</Label>
              <Input id="dosage" name="dosage" placeholder="Ex: 1 comprimido, 1 pipeta..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" name="notes" placeholder="Observações adicionais..." rows={2} />
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-purple-500" />
              Registrar Medicamento
            </DialogTitle>
            <DialogDescription>
              Antibióticos, anti-inflamatórios, suplementos e outros tratamentos
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMedication} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="petId">Pet *</Label>
                <Select name="petId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets?.map((pet: any) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicationType">Origem</Label>
                <Select name="medicationType" defaultValue="custom">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">Medicamento existente</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicationId">Medicamento da Biblioteca</Label>
              <Select name="medicationId">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {medicationsOnly.map((m: any) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customName">Nome do Medicamento</Label>
                <Input id="customName" name="customName" placeholder="Nome do medicamento" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customType">Tipo</Label>
                <Select name="customType">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="dosage">Dosagem *</Label>
              <Input id="dosage" name="dosage" placeholder="Ex: 1 comprimido de 500mg" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data de Início *</Label>
                <Input type="date" id="startDate" name="startDate" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data de Término</Label>
                <Input type="date" id="endDate" name="endDate" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Input id="frequency" name="frequency" placeholder="Ex: 2x ao dia, a cada 8h..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" name="notes" placeholder="Observações adicionais..." rows={2} />
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
