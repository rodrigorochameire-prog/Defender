"use client";

import { useState, useMemo } from "react";
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
  BarChart3,
  TrendingUp,
  PieChart,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from "recharts";

const NEUTRAL_COLORS = ["#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

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
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-slate-200 dark:bg-slate-800">
              <AlertTriangle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="font-medium text-sm text-slate-700 dark:text-slate-300">Tratamentos atrasados</p>
              <div className="flex gap-3 mt-0.5 text-xs text-slate-600/80 dark:text-slate-400/80">
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

      {/* Stats - Layout compacto e limpo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5 border-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Vacinas</span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Syringe className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{vaccineStats?.upcoming || 0}</div>
          <div className="text-xs text-muted-foreground">próximos 30 dias</div>
        </div>
        
        <div className="bg-card rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5 border-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Preventivos</span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Shield className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{preventiveStats?.upcoming || 0}</div>
          <div className="text-xs text-muted-foreground">próximos 30 dias</div>
        </div>
        
        <div className="bg-card rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5 border-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Antipulgas</span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Bug className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{preventiveStats?.flea || 0}</div>
          <div className="text-xs text-muted-foreground">registros</div>
        </div>
        
        <div className="bg-card rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5 border-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Vermífugos</span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Droplets className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{preventiveStats?.deworming || 0}</div>
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
          <TabsTrigger value="analytics" className="text-sm gap-1.5 px-3">
            <BarChart3 className="h-3.5 w-3.5" />
            Análises
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
            <div className="bg-card rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] border-0">
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                Próximas 30 dias
              </h4>
              <div className="space-y-2">
                {upcomingVaccines.slice(0, 5).map((item: any) => (
                  <div key={item.vaccination.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Dog className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.pet?.name}</p>
                        <p className="text-xs text-muted-foreground">{item.vaccine?.name}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {new Date(item.vaccination.nextDueDate).toLocaleDateString("pt-BR")}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Biblioteca de Vacinas */}
          <div className="bg-card rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] border-0">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold">Vacinas cadastradas</h4>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-sm rounded-lg"
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {(vaccineLibrary || [])
                .filter((v: any) => v.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((vaccine: any) => (
                  <div key={vaccine.id} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 hover:shadow-sm transition-all duration-200 cursor-pointer">
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
                className="flex flex-col items-center gap-3 p-5 bg-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-0.5 border-0"
              >
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <type.icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>

          {/* Listas lado a lado */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Atrasados */}
            <div className="bg-card rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] border-0">
              <h4 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <AlertTriangle className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                </div>
                Atrasados
              </h4>
              {overduePreventives && overduePreventives.length > 0 ? (
                <div className="space-y-2">
                  {overduePreventives.slice(0, 5).map((item: any) => (
                    <div key={item.treatment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Dog className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.pet?.name}</p>
                          <p className="text-xs text-muted-foreground">{item.treatment.productName}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <CheckCircle className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-medium">Tudo em dia!</p>
                  <p className="text-xs">Nenhum tratamento atrasado</p>
                </div>
              )}
            </div>

            {/* Próximos */}
            <div className="bg-card rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] border-0">
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                Próximos 30 dias
              </h4>
              {upcomingPreventives && upcomingPreventives.length > 0 ? (
                <div className="space-y-2">
                  {upcomingPreventives.slice(0, 5).map((item: any) => (
                    <div key={item.treatment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Dog className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.pet?.name}</p>
                          <p className="text-xs text-muted-foreground">{item.treatment.productName}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {new Date(item.treatment.nextDueDate).toLocaleDateString("pt-BR")}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mb-2 opacity-30" />
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
                className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-0.5 border-0"
              >
                <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <type.icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </div>
                <span className="text-xs font-medium">{type.label}</span>
              </button>
            ))}
          </div>

          {/* Medicamentos cadastrados */}
          <div className="bg-card rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] border-0">
            <h4 className="text-sm font-semibold mb-4">Cadastrados</h4>
            {medicationsOnly.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-muted-foreground">
                <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <Pill className="h-7 w-7 text-slate-400 dark:text-slate-500 opacity-50" />
                </div>
                <p className="text-sm font-medium">Nenhum medicamento</p>
                <Button variant="link" size="sm" onClick={() => setIsAddMedicationOpen(true)} className="mt-1">
                  Adicionar primeiro
                </Button>
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {medicationsOnly.map((med: any) => {
                  const type = MEDICATION_TYPES.find(t => t.value === med.type);
                  const Icon = type?.icon || Pill;
                  return (
                    <div key={med.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 hover:shadow-sm transition-all duration-200 cursor-pointer">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{med.name}</p>
                        {med.commonDosage && (
                          <p className="text-xs text-muted-foreground truncate">{med.commonDosage}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ========== ANÁLISES ========== */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Métricas de Saúde */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Syringe className="h-4 w-4 text-slate-500" />
                  <span className="text-xs text-muted-foreground">Vacinas</span>
                </div>
                <p className="text-2xl font-bold">{vaccineStats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">registradas</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-slate-500" />
                  <span className="text-xs text-muted-foreground">Preventivos</span>
                </div>
                <p className="text-2xl font-bold">
                  {(preventiveStats?.flea || 0) + (preventiveStats?.deworming || 0) + (preventiveStats?.tick || 0)}
                </p>
                <p className="text-xs text-muted-foreground">registrados</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span className="text-xs text-muted-foreground">Próximas</span>
                </div>
                <p className="text-2xl font-bold">{vaccineStats?.upcoming || 0}</p>
                <p className="text-xs text-muted-foreground">em 30 dias</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-slate-500" />
                  <span className="text-xs text-muted-foreground">Atrasadas</span>
                </div>
                <p className="text-2xl font-bold">{vaccineStats?.overdue || 0}</p>
                <p className="text-xs text-muted-foreground">precisam atenção</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Pill className="h-4 w-4 text-slate-500" />
                  <span className="text-xs text-muted-foreground">Medicamentos</span>
                </div>
                <p className="text-2xl font-bold">{medicationLibrary?.length || 0}</p>
                <p className="text-xs text-muted-foreground">cadastrados</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Gráfico de Vacinas por Status */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Status de Vacinas
                </CardTitle>
                <CardDescription>Distribuição por status de vacinação</CardDescription>
              </CardHeader>
              <CardContent>
                {vaccineStats ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={[
                            { name: "Em dia", value: Math.max(0, (vaccineStats.total || 0) - (vaccineStats.upcoming || 0) - (vaccineStats.overdue || 0)) },
                            { name: "Próximas", value: vaccineStats.upcoming || 0 },
                            { name: "Atrasadas", value: vaccineStats.overdue || 0 },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {[0, 1, 2].map((index) => (
                            <Cell key={`cell-${index}`} fill={NEUTRAL_COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    Carregando dados...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Preventivos por Tipo */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Preventivos por Tipo
                </CardTitle>
                <CardDescription>Registros por categoria de tratamento</CardDescription>
              </CardHeader>
              <CardContent>
                {preventiveStats ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: "Antipulgas", value: preventiveStats.flea || 0 },
                          { name: "Vermífugo", value: preventiveStats.deworming || 0 },
                          { name: "Carrapaticida", value: preventiveStats.tick || 0 },
                        ]}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                        <YAxis type="category" dataKey="name" width={100} stroke="#94a3b8" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="value" fill="#64748b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    Carregando dados...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Indicadores de Saúde */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Indicadores de Saúde
              </CardTitle>
              <CardDescription>Métricas consolidadas do período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Vacinas Totais</span>
                    <Syringe className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-2xl font-bold">{vaccineStats?.total || 0}</p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Em dia</span>
                      <span>{vaccineStats ? Math.round(((vaccineStats.total - (vaccineStats.overdue || 0)) / Math.max(1, vaccineStats.total)) * 100) : 0}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-500 rounded-full"
                        style={{ width: `${vaccineStats ? ((vaccineStats.total - (vaccineStats.overdue || 0)) / Math.max(1, vaccineStats.total)) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Preventivos</span>
                    <Shield className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-2xl font-bold">{(preventiveStats?.flea || 0) + (preventiveStats?.deworming || 0) + (preventiveStats?.tick || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {preventiveStats?.upcoming || 0} próximos 30 dias
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Pendências</span>
                    <AlertTriangle className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-2xl font-bold">
                    {(vaccineStats?.overdue || 0) + (overduePreventives?.length || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Vacinas + Preventivos atrasados
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Medicamentos</span>
                    <Pill className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-2xl font-bold">{medicationLibrary?.length || 0}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Cadastrados na biblioteca
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Próximos Eventos de Saúde */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Próximas Vacinas (30 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingVaccines && upcomingVaccines.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {upcomingVaccines.slice(0, 8).map((item: any) => (
                      <div key={item.vaccination.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Dog className="h-4 w-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.pet?.name}</p>
                            <p className="text-xs text-muted-foreground">{item.vaccine?.name}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {new Date(item.vaccination.nextDueDate).toLocaleDateString("pt-BR")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Syringe className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma vacina programada</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Próximos Preventivos (30 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingPreventives && upcomingPreventives.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {upcomingPreventives.slice(0, 8).map((item: any) => (
                      <div key={item.treatment.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.pet?.name}</p>
                            <p className="text-xs text-muted-foreground">{item.treatment.productName}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {new Date(item.treatment.nextDueDate).toLocaleDateString("pt-BR")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhum preventivo programado</p>
                  </div>
                )}
              </CardContent>
            </Card>
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
                          <type.icon className="h-4 w-4 text-muted-foreground" />
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
                          <type.icon className="h-4 w-4 text-muted-foreground" />
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
