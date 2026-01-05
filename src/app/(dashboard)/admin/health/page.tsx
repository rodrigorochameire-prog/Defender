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

// Tipos de preventivos - cores suaves e minimalistas
const PREVENTIVE_TYPES: Array<{ value: string; label: string; icon: LucideIcon; color: string }> = [
  { value: "flea", label: "Antipulgas", icon: Sparkles, color: "text-amber-500/80" },
  { value: "deworming", label: "Vermífugo", icon: CircleDot, color: "text-rose-500/80" },
  { value: "heartworm", label: "Cardioprotetor", icon: Heart, color: "text-rose-400/80" },
  { value: "tick", label: "Carrapaticida", icon: ShieldCheck, color: "text-orange-500/80" },
];

// Tipos de medicamentos - cores suaves e minimalistas
const MEDICATION_TYPES: Array<{ value: string; label: string; icon: LucideIcon; color: string }> = [
  { value: "antibiotic", label: "Antibiótico", icon: Pill, color: "text-blue-500/80" },
  { value: "antiinflammatory", label: "Anti-inflamatório", icon: Activity, color: "text-amber-500/80" },
  { value: "analgesic", label: "Analgésico", icon: Syringe, color: "text-violet-500/80" },
  { value: "supplement", label: "Suplemento", icon: Leaf, color: "text-emerald-500/80" },
  { value: "other", label: "Outro", icon: Package, color: "text-slate-400/80" },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-500" />
            Central de Saúde
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie vacinas, medicamentos e preventivos dos pets
          </p>
        </div>
      </div>

      {/* Alertas */}
      {((overduePreventives?.length || 0) > 0 || (vaccineStats?.overdue || 0) > 0) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Atenção! Existem tratamentos atrasados</p>
              <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                {(vaccineStats?.overdue || 0) > 0 && (
                  <span>{vaccineStats?.overdue} vacina(s) vencida(s)</span>
                )}
                {(overduePreventives?.length || 0) > 0 && (
                  <span>{overduePreventives?.length} preventivo(s) vencido(s)</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vacinas Próximas</CardTitle>
            <Syringe className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{vaccineStats?.upcoming || 0}</div>
            <p className="text-xs text-muted-foreground">nos próximos 30 dias</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preventivos Próximos</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{preventiveStats?.upcoming || 0}</div>
            <p className="text-xs text-muted-foreground">nos próximos 30 dias</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Antipulgas</CardTitle>
            <Bug className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{preventiveStats?.flea || 0}</div>
            <p className="text-xs text-muted-foreground">registros</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vermífugos</CardTitle>
            <Droplets className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{preventiveStats?.deworming || 0}</div>
            <p className="text-xs text-muted-foreground">registros</p>
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
        <TabsContent value="vaccines" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Syringe className="h-5 w-5 text-blue-500" />
                  Vacinas
                </CardTitle>
                <CardDescription>
                  Gerencie a carteira de vacinação dos pets
                </CardDescription>
              </div>
              <Button onClick={() => setIsAddVaccineOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Vacina
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Próximas vacinas */}
              {upcomingVaccines && upcomingVaccines.length > 0 && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    Próximas Vacinas (30 dias)
                  </h4>
                  <div className="grid gap-2">
                    {upcomingVaccines.map((item: any) => (
                      <div key={item.vaccination.id} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50/50">
                        <div className="flex items-center gap-3">
                          {item.pet?.photoUrl ? (
                            <img src={item.pet.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Dog className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{item.pet?.name}</p>
                            <p className="text-sm text-muted-foreground">{item.vaccine?.name}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-yellow-700 border-yellow-500">
                          {new Date(item.vaccination.nextDueDate).toLocaleDateString("pt-BR")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Biblioteca de Vacinas */}
              <div>
                <h4 className="font-medium mb-3">Vacinas Cadastradas</h4>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar vacina..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {(vaccineLibrary || [])
                    .filter((v: any) => v.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((vaccine: any) => (
                      <div key={vaccine.id} className="p-3 border rounded-lg hover:bg-accent transition-colors">
                        <div className="font-medium">{vaccine.name}</div>
                        {vaccine.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{vaccine.description}</p>
                        )}
                        {vaccine.intervalDays && (
                          <Badge variant="secondary" className="mt-2">
                            A cada {vaccine.intervalDays} dias
                          </Badge>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== PREVENTIVOS ========== */}
        <TabsContent value="preventives" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  Preventivos
                </CardTitle>
                <CardDescription>
                  Antipulgas, vermífugos, carrapaticidas e cardioprotetores
                </CardDescription>
              </div>
              <Button onClick={() => setIsAddPreventiveOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Preventivo
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tipos de Preventivos */}
              <div className="grid gap-4 md:grid-cols-4">
                {PREVENTIVE_TYPES.map((type) => (
                  <Card key={type.value} className="border-dashed hover:border-solid hover:border-primary/50 transition-all cursor-pointer" 
                    onClick={() => {
                      setIsAddPreventiveOpen(true);
                    }}>
                    <CardContent className="flex flex-col items-center justify-center py-6">
                      <type.icon className={`h-8 w-8 mb-2 ${type.color}`} />
                      <p className="font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">Clique para registrar</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

              {/* Próximos e Atrasados */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Atrasados */}
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-3 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Atrasados
                  </h4>
                  {overduePreventives && overduePreventives.length > 0 ? (
                    <div className="space-y-2">
                      {overduePreventives.map((item: any) => (
                        <div key={item.treatment.id} className="flex items-center justify-between p-3 border border-destructive/30 rounded-lg bg-destructive/5">
                          <div className="flex items-center gap-3">
                            {item.pet?.photoUrl ? (
                              <img src={item.pet.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Dog className="h-4 w-4 text-primary" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm">{item.pet?.name}</p>
                              <p className="text-xs text-muted-foreground">{item.treatment.productName}</p>
                            </div>
                          </div>
                          <Badge variant="destructive" className="flex items-center gap-1">
                            {(() => {
                              const pType = PREVENTIVE_TYPES.find(t => t.value === item.treatment.type);
                              const Icon = pType?.icon || Shield;
                              return <Icon className="h-3 w-3" />;
                            })()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      Nenhum preventivo atrasado
                    </div>
                  )}
                </div>

                {/* Próximos */}
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-3 text-yellow-600">
                    <Clock className="h-4 w-4" />
                    Próximos (30 dias)
                  </h4>
                  {upcomingPreventives && upcomingPreventives.length > 0 ? (
                    <div className="space-y-2">
                      {upcomingPreventives.map((item: any) => (
                        <div key={item.treatment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {item.pet?.photoUrl ? (
                              <img src={item.pet.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Dog className="h-4 w-4 text-primary" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm">{item.pet?.name}</p>
                              <p className="text-xs text-muted-foreground">{item.treatment.productName}</p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {new Date(item.treatment.nextDueDate).toLocaleDateString("pt-BR")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      Nenhum preventivo agendado
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== MEDICAMENTOS ========== */}
        <TabsContent value="medications" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-purple-500" />
                  Medicamentos
                </CardTitle>
                <CardDescription>
                  Antibióticos, anti-inflamatórios, suplementos e outros tratamentos
                </CardDescription>
              </div>
              <Button onClick={() => setIsAddMedicationOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Medicamento
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tipos de Medicamentos */}
              <div className="grid gap-3 md:grid-cols-5">
                {MEDICATION_TYPES.map((type) => (
                  <div key={type.value} className="p-3 border rounded-lg text-center hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setIsAddMedicationOpen(true)}>
                    <type.icon className={`h-6 w-6 mx-auto ${type.color}`} />
                    <p className="text-sm font-medium mt-1">{type.label}</p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Medicamentos cadastrados */}
              <div>
                <h4 className="font-medium mb-3">Medicamentos Cadastrados</h4>
                {medicationsOnly.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Pill className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhum medicamento cadastrado</p>
                    <Button variant="link" onClick={() => setIsAddMedicationOpen(true)}>
                      Adicionar primeiro medicamento
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {medicationsOnly.map((med: any) => {
                      const type = MEDICATION_TYPES.find(t => t.value === med.type);
                      return (
                        <div key={med.id} className="p-3 border rounded-lg hover:bg-accent transition-colors">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const Icon = type?.icon || Pill;
                              return <Icon className={`h-4 w-4 ${type?.color || 'text-purple-600'}`} />;
                            })()}
                            <span className="font-medium">{med.name}</span>
                          </div>
                          {med.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{med.description}</p>
                          )}
                          {med.commonDosage && (
                            <Badge variant="secondary" className="mt-2">{med.commonDosage}</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
