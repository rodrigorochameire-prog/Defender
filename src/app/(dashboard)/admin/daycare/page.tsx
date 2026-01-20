"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Building2, 
  Search, 
  UserCheck, 
  UserX, 
  Clock,
  AlertTriangle,
  Syringe,
  Pill,
  Package,
  CreditCard,
  Dog,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Flag,
  Shield,
  Loader2,
  Users,
  Calendar,
  Zap,
  AlertCircle,
  Eye,
  Ear,
  Hand,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { PetAvatar } from "@/components/pet-avatar";

// Importar constantes de inspeção
import {
  SKIN_COAT_STATUS,
  EAR_STATUS,
  EYE_STATUS,
  PAW_STATUS,
  CHECKIN_OBSERVATIONS,
} from "@/lib/constants/pet-options";

// Tipos de alerta
type AlertType = "vaccine" | "medication" | "credits" | "stock" | "behavior" | "incompatibility";

interface PetAlert {
  type: AlertType;
  severity: "warning" | "critical";
  message: string;
  blocking?: boolean;
}

export default function DaycarePage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("presence");
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [isCheckinDialogOpen, setIsCheckinDialogOpen] = useState(false);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [bypassReason, setBypassReason] = useState("");
  const [showBypassDialog, setShowBypassDialog] = useState(false);
  
  // Estados para inspeção de check-in
  const [inspectionSkinCoat, setInspectionSkinCoat] = useState<string>("");
  const [inspectionEars, setInspectionEars] = useState<string>("");
  const [inspectionEyes, setInspectionEyes] = useState<string>("");
  const [inspectionPaws, setInspectionPaws] = useState<string>("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [checkinObservations, setCheckinObservations] = useState<string[]>([]);

  const utils = trpc.useUtils();

  // Queries
  const { data: approvedPets, isLoading: petsLoading } = trpc.pets.list.useQuery();
  const { data: checkedInPets } = trpc.dashboard.checkedInPets.useQuery();
  const { data: settings } = trpc.businessRules.listSettings.useQuery();
  const { data: allFlags } = trpc.businessRules.listFlags.useQuery({ activeOnly: true });
  const { data: vaccineStats } = trpc.vaccines.stats.useQuery();
  const { data: lowStockPets } = trpc.petManagement.getLowStockPets.useQuery();

  // Mutations
  const checkinMutation = trpc.checkin.checkIn.useMutation({
    onSuccess: () => {
      toast.success(`${selectedPet?.name} fez check-in!`);
      setIsCheckinDialogOpen(false);
      setSelectedPet(null);
      utils.dashboard.checkedInPets.invalidate();
      utils.pets.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const checkoutMutation = trpc.checkin.checkOut.useMutation({
    onSuccess: (data) => {
      toast.success(`${selectedPet?.name} fez check-out!`);
      setIsCheckoutDialogOpen(false);
      setSelectedPet(null);
      setCheckoutNotes("");
      utils.dashboard.checkedInPets.invalidate();
      utils.pets.list.invalidate();
      
      // Verificar se precisa avisar sobre créditos
      if (data?.credits !== undefined && data.credits <= 3) {
        toast.warning(`Atenção: ${selectedPet?.name} tem apenas ${data.credits} créditos restantes!`);
      }
    },
    onError: (error) => toast.error(error.message),
  });
  
  // Mutation para criar inspeção de check-in
  const createInspectionMutation = trpc.inspections.create.useMutation({
    onSuccess: () => {
      // Inspeção criada silenciosamente
    },
    onError: () => {
      // Ignora erros de inspeção
    },
  });

  // Configurações de thresholds
  const thresholds = useMemo(() => {
    const getSettingValue = (key: string, defaultValue: number | boolean) => {
      const setting = settings?.find(s => s.key === key);
      return setting ? setting.parsedValue : defaultValue;
    };

    return {
      vaccineWarningDays: getSettingValue("vaccine_warning_days", 7) as number,
      creditsWarning: getSettingValue("credits_warning", 3) as number,
      creditsCritical: getSettingValue("credits_critical", 1) as number,
      creditsBlockBooking: getSettingValue("credits_block_booking", 0) as number,
      foodStockWarningDays: getSettingValue("food_stock_warning_days", 5) as number,
      foodStockCriticalDays: getSettingValue("food_stock_critical_days", 2) as number,
      blockIncompatiblePets: getSettingValue("block_incompatible_pets", true) as boolean,
    };
  }, [settings]);

  // Set de pets com estoque baixo
  const lowStockPetIds = useMemo(() => new Set(lowStockPets?.map(p => p.id) || []), [lowStockPets]);

  // IDs de pets atualmente na creche
  const checkedInPetIds = useMemo(() => new Set(checkedInPets?.map(p => p.id) || []), [checkedInPets]);

  // Calcular alertas para um pet
  const getPetAlerts = (pet: any): PetAlert[] => {
    const alerts: PetAlert[] = [];

    // Alerta de créditos
    if (pet.credits <= thresholds.creditsCritical) {
      alerts.push({
        type: "credits",
        severity: "critical",
        message: `Apenas ${pet.credits} crédito(s)`,
        blocking: pet.credits <= thresholds.creditsBlockBooking,
      });
    } else if (pet.credits <= thresholds.creditsWarning) {
      alerts.push({
        type: "credits",
        severity: "warning",
        message: `Poucos créditos: ${pet.credits}`,
      });
    }

    // Alerta de estoque
    if (lowStockPetIds.has(pet.id)) {
      const stockPet = lowStockPets?.find(p => p.id === pet.id);
      if (stockPet) {
        alerts.push({
          type: "stock",
          severity: stockPet.daysRemaining <= thresholds.foodStockCriticalDays ? "critical" : "warning",
          message: stockPet.daysRemaining <= 0 ? "Sem ração!" : `Ração: ${stockPet.daysRemaining} dias`,
        });
      }
    }

    // TODO: Adicionar alertas de vacinas vencidas (precisa de query específica)
    // TODO: Adicionar alertas de incompatibilidade com pets já na creche

    return alerts;
  };

  // Filtrar pets aprovados que não estão na creche
  const petsNotCheckedIn = useMemo(() => {
    if (!approvedPets) return [];
    return approvedPets
      .filter(p => p.approvalStatus === "approved" && !checkedInPetIds.has(p.id))
      .filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.breed?.toLowerCase().includes(search.toLowerCase())
      );
  }, [approvedPets, checkedInPetIds, search]);

  // Handler de check-in
  const handleCheckin = (pet: any) => {
    const alerts = getPetAlerts(pet);
    const blockingAlerts = alerts.filter(a => a.blocking);

    if (blockingAlerts.length > 0) {
      setSelectedPet(pet);
      setShowBypassDialog(true);
    } else {
      setSelectedPet(pet);
      setIsCheckinDialogOpen(true);
    }
  };

  // Confirmar check-in (com ou sem bypass)
  const confirmCheckin = async (bypass = false) => {
    if (!selectedPet) return;

    // Primeiro faz o check-in
    checkinMutation.mutate({
      petId: selectedPet.id,
    });
    
    // Depois cria a inspeção de entrada (se houver dados)
    if (inspectionSkinCoat || inspectionEars || inspectionEyes || inspectionPaws || inspectionNotes) {
      try {
        await createInspectionMutation.mutateAsync({
          petId: selectedPet.id,
          skinCoatStatus: inspectionSkinCoat || "intact",
          earStatus: inspectionEars || "clean",
          eyeStatus: inspectionEyes || "clean",
          pawStatus: inspectionPaws || "normal",
          generalNotes: inspectionNotes || undefined,
          checkinObservations: checkinObservations.length > 0 ? checkinObservations : undefined,
        });
      } catch {
        // Ignora erro de inspeção - o check-in já foi feito
      }
    }
    
    // Limpar estados de inspeção
    setInspectionSkinCoat("");
    setInspectionEars("");
    setInspectionEyes("");
    setInspectionPaws("");
    setInspectionNotes("");
    setCheckinObservations([]);
    setShowBypassDialog(false);
    setBypassReason("");
  };

  // Handler de check-out
  const handleCheckout = (pet: any) => {
    setSelectedPet(pet);
    setIsCheckoutDialogOpen(true);
  };

  // Confirmar check-out
  const confirmCheckout = () => {
    if (!selectedPet) return;

    checkoutMutation.mutate({
      petId: selectedPet.id,
    });
  };

  // Estatísticas do dia
  const stats = useMemo(() => ({
    capacity: 20, // TODO: buscar da config
    present: checkedInPets?.length || 0,
    expected: 0, // TODO: buscar agendamentos do dia
    withAlerts: petsNotCheckedIn.filter(p => getPetAlerts(p).length > 0).length,
  }), [checkedInPets, petsNotCheckedIn]);

  const occupancyPercent = (stats.present / stats.capacity) * 100;

  if (petsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Controle de Presença</h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                  {stats.present}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">Na creche agora</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.capacity}</p>
                <p className="text-sm text-muted-foreground">Capacidade</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  occupancyPercent > 90 ? "bg-red-500" :
                  occupancyPercent > 70 ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.withAlerts > 0 ? "bg-amber-50 dark:bg-amber-950 border-amber-200" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.withAlerts}</p>
                <p className="text-sm text-muted-foreground">Com alertas</p>
              </div>
              <AlertTriangle className={`h-8 w-8 opacity-50 ${stats.withAlerts > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{petsNotCheckedIn.length}</p>
                <p className="text-sm text-muted-foreground">Aguardando</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="presence" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Presença
          </TabsTrigger>
          <TabsTrigger value="checkin" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Fazer Check-in
          </TabsTrigger>
        </TabsList>

        {/* TAB: PRESENÇA */}
        <TabsContent value="presence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Pets na Creche ({checkedInPets?.length || 0})
              </CardTitle>
              <CardDescription>
                Pets que fizeram check-in hoje
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!checkedInPets || checkedInPets.length === 0 ? (
                <div className="text-center py-12">
                  <Dog className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Nenhum pet na creche ainda</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {checkedInPets.map((pet) => {
                    const alerts = getPetAlerts(pet);
                    return (
                      <div 
                        key={pet.id} 
                        className={`p-4 rounded-lg border ${
                          alerts.some(a => a.severity === "critical") 
                            ? "border-red-200 bg-red-50 dark:bg-red-950/20" 
                            : alerts.length > 0 
                              ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                              : "bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <PetAvatar
                              photoUrl={pet.photoUrl}
                              breed={pet.breed}
                              name={pet.name}
                              size="md"
                            />
                            <div>
                              <Link href={`/admin/pets/${pet.id}`} className="font-semibold hover:underline">
                                {pet.name}
                              </Link>
                              <p className="text-xs text-muted-foreground">{pet.breed}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCheckout(pet)}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Saída
                          </Button>
                        </div>

                        {/* Alertas */}
                        {alerts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {alerts.map((alert, idx) => (
                              <Badge 
                                key={idx} 
                                variant={alert.severity === "critical" ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {alert.type === "credits" && <CreditCard className="h-3 w-3 mr-1" />}
                                {alert.type === "stock" && <Package className="h-3 w-3 mr-1" />}
                                {alert.type === "vaccine" && <Syringe className="h-3 w-3 mr-1" />}
                                {alert.message}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: CHECK-IN */}
        <TabsContent value="checkin" className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pet por nome ou raça..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pets Disponíveis para Check-in ({petsNotCheckedIn.length})
              </CardTitle>
              <CardDescription>
                Pets aprovados que ainda não estão na creche
              </CardDescription>
            </CardHeader>
            <CardContent>
              {petsNotCheckedIn.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="text-muted-foreground">
                    {search ? "Nenhum pet encontrado" : "Todos os pets já fizeram check-in!"}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {petsNotCheckedIn.map((pet) => {
                    const alerts = getPetAlerts(pet);
                    const hasBlockingAlert = alerts.some(a => a.blocking);

                    return (
                      <div 
                        key={pet.id} 
                        className={`p-4 rounded-lg border transition-all ${
                          hasBlockingAlert 
                            ? "border-red-300 bg-red-50 dark:bg-red-950/30" 
                            : alerts.length > 0 
                              ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                              : "bg-card hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <PetAvatar
                              photoUrl={pet.photoUrl}
                              breed={pet.breed}
                              name={pet.name}
                              size="md"
                            />
                            <div>
                              <Link href={`/admin/pets/${pet.id}`} className="font-semibold hover:underline">
                                {pet.name}
                              </Link>
                              <p className="text-xs text-muted-foreground">{pet.breed}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={hasBlockingAlert ? "destructive" : "default"}
                            onClick={() => handleCheckin(pet)}
                          >
                            {hasBlockingAlert && <AlertTriangle className="h-4 w-4 mr-1" />}
                            <UserCheck className="h-4 w-4 mr-1" />
                            Entrada
                          </Button>
                        </div>

                        {/* Info rápida */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {pet.credits} créditos
                          </span>
                          {pet.energyLevel && (
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {pet.energyLevel === "high" || pet.energyLevel === "very_high" ? "Alta energia" : "Baixa energia"}
                            </span>
                          )}
                        </div>

                        {/* Alertas */}
                        {alerts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {alerts.map((alert, idx) => (
                              <Badge 
                                key={idx} 
                                variant={alert.severity === "critical" ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {alert.type === "credits" && <CreditCard className="h-3 w-3 mr-1" />}
                                {alert.type === "stock" && <Package className="h-3 w-3 mr-1" />}
                                {alert.type === "vaccine" && <Syringe className="h-3 w-3 mr-1" />}
                                {alert.blocking && <XCircle className="h-3 w-3 mr-1" />}
                                {alert.message}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Confirmar Check-in */}
      <Dialog open={isCheckinDialogOpen} onOpenChange={setIsCheckinDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              Confirmar Check-in
            </DialogTitle>
            <DialogDescription>
              Registrar entrada de {selectedPet?.name} na creche
            </DialogDescription>
          </DialogHeader>

          {selectedPet && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Dog className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{selectedPet.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPet.breed}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-muted-foreground">Créditos</p>
                  <p className="font-semibold">{selectedPet.credits}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-muted-foreground">Energia</p>
                  <p className="font-semibold capitalize">{selectedPet.energyLevel || "N/A"}</p>
                </div>
              </div>

              {selectedPet.feedingInstructions && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Instruções de Alimentação:</p>
                  <p className="text-sm mt-1">{selectedPet.feedingInstructions}</p>
                </div>
              )}

              {selectedPet.severeAllergies && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Alergias Graves:
                  </p>
                  <p className="text-sm mt-1">{selectedPet.severeAllergies}</p>
                </div>
              )}
              
              {/* === INSPEÇÃO FÍSICA DE ENTRADA === */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Inspeção Física de Entrada
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Pele/Pelagem */}
                  <div className="space-y-1">
                    <Label className="text-xs">Pele/Pelagem</Label>
                    <Select value={inspectionSkinCoat} onValueChange={setInspectionSkinCoat}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {SKIN_COAT_STATUS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Ouvidos */}
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Ear className="h-3 w-3" /> Ouvidos
                    </Label>
                    <Select value={inspectionEars} onValueChange={setInspectionEars}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {EAR_STATUS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Olhos */}
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Eye className="h-3 w-3" /> Olhos
                    </Label>
                    <Select value={inspectionEyes} onValueChange={setInspectionEyes}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {EYE_STATUS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Patas */}
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Hand className="h-3 w-3" /> Patas
                    </Label>
                    <Select value={inspectionPaws} onValueChange={setInspectionPaws}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAW_STATUS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Observações de Entrada */}
                <div className="mt-3">
                  <Label className="text-xs">Observações de Chegada</Label>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {CHECKIN_OBSERVATIONS.map((opt) => (
                      <label 
                        key={opt.value}
                        className={`flex items-center gap-2 p-1.5 rounded border text-xs cursor-pointer ${
                          checkinObservations.includes(opt.value) 
                            ? "bg-primary/10 border-primary" 
                            : "hover:bg-accent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checkinObservations.includes(opt.value)}
                          onChange={() => {
                            if (checkinObservations.includes(opt.value)) {
                              setCheckinObservations(checkinObservations.filter(v => v !== opt.value));
                            } else {
                              setCheckinObservations([...checkinObservations, opt.value]);
                            }
                          }}
                          className="sr-only"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Notas adicionais */}
                <div className="mt-3">
                  <Label className="text-xs">Notas Adicionais</Label>
                  <Textarea
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="Observações sobre o estado do pet na chegada..."
                    rows={2}
                    className="text-sm mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckinDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => confirmCheckin()} disabled={checkinMutation.isPending}>
              {checkinMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Bypass de Bloqueio */}
      <Dialog open={showBypassDialog} onOpenChange={setShowBypassDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Alerta de Bloqueio
            </DialogTitle>
            <DialogDescription>
              Este pet possui alertas que normalmente bloqueariam a entrada
            </DialogDescription>
          </DialogHeader>

          {selectedPet && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200">
                <p className="font-semibold text-red-700 dark:text-red-300 mb-2">
                  Alertas para {selectedPet.name}:
                </p>
                <div className="space-y-2">
                  {getPetAlerts(selectedPet).map((alert, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>{alert.message}</span>
                      {alert.blocking && <Badge variant="destructive" className="text-xs">Bloqueante</Badge>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bypass-reason">Justificativa para liberar entrada *</Label>
                <Textarea
                  id="bypass-reason"
                  value={bypassReason}
                  onChange={(e) => setBypassReason(e.target.value)}
                  placeholder="Informe o motivo para liberar a entrada apesar dos alertas..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Esta justificativa ficará registrada no histórico
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBypassDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => confirmCheckin(true)} 
              disabled={!bypassReason || checkinMutation.isPending}
            >
              {checkinMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Liberar Entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Check-out */}
      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-blue-600" />
              Confirmar Check-out
            </DialogTitle>
            <DialogDescription>
              Registrar saída de {selectedPet?.name} da creche
            </DialogDescription>
          </DialogHeader>

          {selectedPet && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Dog className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{selectedPet.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPet.breed}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Créditos atuais</p>
                  <p className="text-2xl font-bold">{selectedPet.credits}</p>
                </div>
              </div>

              {selectedPet.credits <= 3 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Créditos baixos! Considere avisar o tutor.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="checkout-notes">Observações (opcional)</Label>
                <Textarea
                  id="checkout-notes"
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  placeholder="Alguma observação sobre o dia do pet..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmCheckout} disabled={checkoutMutation.isPending}>
              {checkoutMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Saída
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
