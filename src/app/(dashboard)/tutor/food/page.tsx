"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  UtensilsCrossed,
  Package,
  Plus,
  Dog,
  Cookie,
  Leaf,
  History,
  Star,
  Clock,
  Scale,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Edit,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Info,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tipos
type FoodType = "dry" | "wet" | "natural" | "mixed";
type Acceptance = "loved" | "liked" | "neutral" | "disliked" | "rejected";
type TreatType = "snack" | "biscuit" | "natural" | "supplement" | "other";
type MealType = "barf" | "cooked" | "mixed" | "supplement";

// Labels
const foodTypeLabels: Record<FoodType, string> = {
  dry: "Ração Seca",
  wet: "Ração Úmida",
  natural: "Alimentação Natural",
  mixed: "Mista",
};

const acceptanceLabels: Record<Acceptance, { label: string; color: string; icon: typeof ThumbsUp }> = {
  loved: { label: "Adorou", color: "badge-green", icon: Heart },
  liked: { label: "Gostou", color: "badge-blue", icon: ThumbsUp },
  neutral: { label: "Neutro", color: "badge-neutral", icon: CheckCircle2 },
  disliked: { label: "Não gostou", color: "badge-amber", icon: ThumbsDown },
  rejected: { label: "Rejeitou", color: "badge-rose", icon: XCircle },
};

const treatTypeLabels: Record<TreatType, string> = {
  snack: "Snack",
  biscuit: "Biscoito",
  natural: "Natural",
  supplement: "Suplemento",
  other: "Outro",
};

const mealTypeLabels: Record<MealType, string> = {
  barf: "BARF (Crua)",
  cooked: "Cozida",
  mixed: "Mista",
  supplement: "Suplemento",
};

export default function TutorFoodPage() {
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("food");

  // Dialogs
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isAddHistoryOpen, setIsAddHistoryOpen] = useState(false);
  const [isAddTreatOpen, setIsAddTreatOpen] = useState(false);
  const [isAddNaturalOpen, setIsAddNaturalOpen] = useState(false);

  // Queries
  const { data: pets, isLoading: loadingPets } = trpc.pets.myPets.useQuery();
  const { data: petSummary, refetch: refetchPetSummary } = trpc.food.getPetFoodSummary.useQuery(
    { petId: selectedPetId! },
    { enabled: !!selectedPetId }
  );

  // Mutations
  const upsertPlan = trpc.food.upsertPlan.useMutation({
    onSuccess: () => {
      toast.success("Plano de alimentação salvo!");
      setIsAddPlanOpen(false);
      if (selectedPetId) refetchPetSummary();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const addInventory = trpc.food.addInventory.useMutation({
    onSuccess: () => {
      toast.success("Estoque registrado!");
      setIsAddStockOpen(false);
      if (selectedPetId) refetchPetSummary();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const addHistory = trpc.food.addHistory.useMutation({
    onSuccess: () => {
      toast.success("Registro de reação salvo!");
      setIsAddHistoryOpen(false);
      if (selectedPetId) refetchPetSummary();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const addTreat = trpc.food.addTreat.useMutation({
    onSuccess: () => {
      toast.success("Petisco adicionado!");
      setIsAddTreatOpen(false);
      if (selectedPetId) refetchPetSummary();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const addNaturalFood = trpc.food.addNaturalFood.useMutation({
    onSuccess: () => {
      toast.success("Alimentação natural adicionada!");
      setIsAddNaturalOpen(false);
      if (selectedPetId) refetchPetSummary();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  // Handlers
  const handleAddPlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPetId) return;
    const formData = new FormData(e.currentTarget);
    const times = formData.get("portionTimes") as string;

    upsertPlan.mutate({
      petId: selectedPetId,
      foodType: formData.get("foodType") as FoodType,
      brand: formData.get("brand") as string,
      productName: (formData.get("productName") as string) || undefined,
      dailyAmount: Number(formData.get("dailyAmount")),
      portionsPerDay: Number(formData.get("portionsPerDay")),
      portionTimes: times ? times.split(",").map((t) => t.trim()) : undefined,
      notes: (formData.get("notes") as string) || undefined,
    });
  };

  const handleAddStock = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPetId) return;
    const formData = new FormData(e.currentTarget);

    addInventory.mutate({
      petId: selectedPetId,
      brand: formData.get("brand") as string,
      productName: (formData.get("productName") as string) || undefined,
      quantityReceived: Number(formData.get("quantity")) * 1000, // kg para g
      expirationDate: (formData.get("expirationDate") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    });
  };

  const handleAddHistory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPetId) return;
    const formData = new FormData(e.currentTarget);

    addHistory.mutate({
      petId: selectedPetId,
      brand: formData.get("brand") as string,
      productName: (formData.get("productName") as string) || undefined,
      startDate: formData.get("startDate") as string,
      endDate: (formData.get("endDate") as string) || undefined,
      acceptance: (formData.get("acceptance") as Acceptance) || undefined,
      digestion: (formData.get("digestion") as any) || undefined,
      stoolQuality: (formData.get("stoolQuality") as any) || undefined,
      energyLevel: (formData.get("energyLevel") as any) || undefined,
      allergicReaction: formData.get("allergicReaction") === "true",
      overallRating: formData.get("overallRating") ? Number(formData.get("overallRating")) : undefined,
      notes: (formData.get("notes") as string) || undefined,
    });
  };

  const handleAddTreat = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPetId) return;
    const formData = new FormData(e.currentTarget);

    addTreat.mutate({
      petId: selectedPetId,
      treatType: formData.get("treatType") as TreatType,
      name: formData.get("name") as string,
      brand: (formData.get("brand") as string) || undefined,
      purpose: (formData.get("purpose") as any) || undefined,
      frequency: (formData.get("frequency") as any) || undefined,
      maxPerDay: formData.get("maxPerDay") ? Number(formData.get("maxPerDay")) : undefined,
      acceptance: (formData.get("acceptance") as any) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    });
  };

  const handleAddNatural = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPetId) return;
    const formData = new FormData(e.currentTarget);
    const ingredients = formData.get("ingredients") as string;

    addNaturalFood.mutate({
      petId: selectedPetId,
      mealType: formData.get("mealType") as MealType,
      name: formData.get("name") as string,
      ingredients: ingredients ? ingredients.split(",").map((i) => i.trim()) : undefined,
      proteinSource: (formData.get("proteinSource") as string) || undefined,
      portionSize: formData.get("portionSize") ? Number(formData.get("portionSize")) : undefined,
      frequency: (formData.get("frequency") as any) || undefined,
      acceptance: (formData.get("acceptance") as any) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    });
  };

  if (loadingPets) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pets || pets.length === 0) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-header-icon">
              <UtensilsCrossed />
            </div>
            <div className="page-header-info">
              <h1>Gestão de Alimentação</h1>
              <p>Controle a alimentação dos seus pets</p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <Dog className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium">Nenhum pet cadastrado</p>
            <p className="text-muted-foreground mt-1">
              Cadastre um pet para gerenciar informações de alimentação
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Seleciona o primeiro pet se nenhum estiver selecionado
  if (!selectedPetId && pets.length > 0) {
    setSelectedPetId(pets[0].id);
  }

  const selectedPet = pets.find((p) => p.id === selectedPetId);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <UtensilsCrossed />
          </div>
          <div className="page-header-info">
            <h1>Gestão de Alimentação</h1>
            <p>Controle a alimentação dos seus pets</p>
          </div>
        </div>
      </div>

      {/* Seletor de Pet */}
      {pets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {pets.map((pet) => (
            <Button
              key={pet.id}
              variant={selectedPetId === pet.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPetId(pet.id)}
              className="flex items-center gap-2 flex-shrink-0"
            >
              {pet.photoUrl ? (
                <div className="relative w-6 h-6 rounded-full overflow-hidden">
                  <Image src={pet.photoUrl} alt={pet.name} fill className="object-cover" />
                </div>
              ) : (
                <Dog className="h-4 w-4" />
              )}
              {pet.name}
            </Button>
          ))}
        </div>
      )}

      {/* Card do Pet Selecionado */}
      {selectedPet && (
        <Card className="section-card">
          <CardHeader className="section-card-header">
            <div className="flex items-center gap-4">
              {selectedPet.photoUrl ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-border">
                  <Image src={selectedPet.photoUrl} alt={selectedPet.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Dog className="h-8 w-8 text-primary" />
                </div>
              )}
              <div>
                <CardTitle className="text-xl">{selectedPet.name}</CardTitle>
                <CardDescription>{selectedPet.breed || "Raça não informada"}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Tabs de Conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="food" className="gap-1.5">
            <UtensilsCrossed className="h-4 w-4" />
            <span className="hidden sm:inline">Ração</span>
          </TabsTrigger>
          <TabsTrigger value="treats" className="gap-1.5">
            <Cookie className="h-4 w-4" />
            <span className="hidden sm:inline">Petiscos</span>
          </TabsTrigger>
          <TabsTrigger value="natural" className="gap-1.5">
            <Leaf className="h-4 w-4" />
            <span className="hidden sm:inline">Natural</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba Ração */}
        <TabsContent value="food" className="space-y-4 mt-4">
          {/* Plano Atual */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-primary" />
                  Plano de Alimentação
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsAddPlanOpen(true)}>
                  {petSummary?.plan ? (
                    <>
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Editar
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Configurar
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {petSummary?.plan ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Marca</p>
                      <p className="font-medium">{petSummary.plan.brand}</p>
                      {petSummary.plan.productName && (
                        <p className="text-sm text-muted-foreground">{petSummary.plan.productName}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo</p>
                      <p className="font-medium">{foodTypeLabels[petSummary.plan.foodType as FoodType]}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Quantidade Diária</p>
                      <p className="font-medium text-lg">{petSummary.plan.dailyAmount}g</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Porções por Dia</p>
                      <p className="font-medium text-lg">{petSummary.plan.portionsPerDay}x</p>
                    </div>
                  </div>

                  {petSummary.plan.portionTimes && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Horários das Refeições</p>
                      <div className="flex gap-2 flex-wrap">
                        {JSON.parse(petSummary.plan.portionTimes).map((time: string, i: number) => (
                          <Badge key={i} variant="outline" className="gap-1 text-base py-1.5 px-3">
                            <Clock className="h-4 w-4" />
                            {time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {petSummary.plan.notes && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Info className="h-4 w-4" />
                        {petSummary.plan.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground mb-4">Nenhum plano de alimentação definido</p>
                  <Button onClick={() => setIsAddPlanOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Plano de Alimentação
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Controle de Estoque */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Controle de Estoque
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsAddStockOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Registrar Entrega
                </Button>
              </div>
              <CardDescription>
                Informe quando entregar ração na creche para controle do estoque
              </CardDescription>
            </CardHeader>
            <CardContent>
              {petSummary?.inventory && petSummary.inventory.items.length > 0 ? (
                <div className="space-y-4">
                  {/* Alerta de Estoque Baixo */}
                  {petSummary.inventory.daysRemaining > 0 && petSummary.inventory.daysRemaining < 7 && (
                    <div className={`flex items-start gap-3 p-4 rounded-lg border ${
                      petSummary.inventory.daysRemaining < 3
                        ? "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900"
                        : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900"
                    }`}>
                      <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        petSummary.inventory.daysRemaining < 3 ? "text-rose-500" : "text-amber-500"
                      }`} />
                      <div>
                        <p className={`font-medium ${
                          petSummary.inventory.daysRemaining < 3 ? "text-rose-700 dark:text-rose-400" : "text-amber-700 dark:text-amber-400"
                        }`}>
                          {petSummary.inventory.daysRemaining < 3 ? "Estoque Crítico!" : "Estoque Baixo"}
                        </p>
                        <p className={`text-sm mt-1 ${
                          petSummary.inventory.daysRemaining < 3 ? "text-rose-600 dark:text-rose-300" : "text-amber-600 dark:text-amber-300"
                        }`}>
                          Restam apenas {petSummary.inventory.daysRemaining} dias de ração. 
                          Por favor, entregue mais ração na creche.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Resumo Visual */}
                  <div className="flex items-center gap-6 p-4 rounded-lg bg-muted/50">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{(petSummary.inventory.totalStock / 1000).toFixed(1)}</p>
                      <p className="text-sm text-muted-foreground">kg disponíveis</p>
                    </div>
                    <div className="h-14 w-px bg-border" />
                    <div className="text-center">
                      <p className={`text-3xl font-bold ${
                        petSummary.inventory.daysRemaining < 3
                          ? "text-rose-500"
                          : petSummary.inventory.daysRemaining < 7
                          ? "text-amber-500"
                          : "text-green-500"
                      }`}>
                        {petSummary.inventory.daysRemaining}
                      </p>
                      <p className="text-sm text-muted-foreground">dias restantes</p>
                    </div>
                    <div className="flex-1">
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            petSummary.inventory.daysRemaining > 14
                              ? "bg-green-500"
                              : petSummary.inventory.daysRemaining > 7
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{
                            width: `${Math.min((petSummary.inventory.daysRemaining / 30) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        Previsão: ~30 dias de estoque ideal
                      </p>
                    </div>
                  </div>

                  {/* Últimas Entregas */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Últimas Entregas</p>
                    {petSummary.inventory.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium text-sm">{item.brand}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(item.receivedDate), "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{(item.quantityRemaining / 1000).toFixed(1)} kg</p>
                          <p className="text-xs text-muted-foreground">
                            restante de {(item.quantityReceived / 1000).toFixed(1)} kg
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground mb-4">Nenhuma entrega de ração registrada</p>
                  <Button onClick={() => setIsAddStockOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Primeira Entrega
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dicas de Alimentação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Dicas de Alimentação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                Mantenha a ração em local fresco e seco, protegida da luz solar
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                Respeite a quantidade diária recomendada para evitar sobrepeso
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                Divida a porção diária em 2-3 refeições para melhor digestão
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                Faça a transição gradual ao mudar de marca ou tipo de ração
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Petiscos */}
        <TabsContent value="treats" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cookie className="h-4 w-4 text-amber-500" />
                    Petiscos e Snacks
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Informe os petiscos que seu pet pode receber na creche
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsAddTreatOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {petSummary?.treats && petSummary.treats.length > 0 ? (
                <div className="grid gap-3">
                  {petSummary.treats.map((treat) => (
                    <div key={treat.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <Cookie className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium">{treat.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {treat.brand && `${treat.brand} • `}
                            {treatTypeLabels[treat.treatType as TreatType]}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {treat.maxPerDay && (
                          <Badge variant="outline">Máx {treat.maxPerDay}/dia</Badge>
                        )}
                        {treat.acceptance && (
                          <Badge className={acceptanceLabels[treat.acceptance as Acceptance].color}>
                            {acceptanceLabels[treat.acceptance as Acceptance].label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Cookie className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground mb-4">Nenhum petisco cadastrado</p>
                  <Button onClick={() => setIsAddTreatOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Petisco
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Alimentação Natural */}
        <TabsContent value="natural" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-green-500" />
                    Alimentação Natural
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Receitas e alimentos naturais permitidos
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsAddNaturalOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {petSummary?.naturalFood && petSummary.naturalFood.length > 0 ? (
                <div className="grid gap-3">
                  {petSummary.naturalFood.map((food) => (
                    <div key={food.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Leaf className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium">{food.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {mealTypeLabels[food.mealType as MealType]}
                            {food.proteinSource && ` • ${food.proteinSource}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {food.portionSize && (
                          <Badge variant="outline">{food.portionSize}g</Badge>
                        )}
                        {food.acceptance && (
                          <Badge className={acceptanceLabels[food.acceptance as Acceptance].color}>
                            {acceptanceLabels[food.acceptance as Acceptance].label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Leaf className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground mb-4">Nenhuma alimentação natural cadastrada</p>
                  <Button onClick={() => setIsAddNaturalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Alimentação Natural
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Histórico */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Histórico de Rações
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Registre como seu pet reagiu a cada ração
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsAddHistoryOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Registrar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {petSummary?.history && petSummary.history.length > 0 ? (
                <div className="space-y-3">
                  {petSummary.history.map((record) => (
                    <div key={record.id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{record.brand}</p>
                          {record.productName && (
                            <p className="text-sm text-muted-foreground">{record.productName}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(record.startDate), "dd/MM/yyyy", { locale: ptBR })}
                            {record.endDate && ` - ${format(new Date(record.endDate), "dd/MM/yyyy", { locale: ptBR })}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {record.overallRating && (
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < record.overallRating!
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-muted-foreground/30"
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                          {record.acceptance && (
                            <Badge className={acceptanceLabels[record.acceptance as Acceptance].color}>
                              {acceptanceLabels[record.acceptance as Acceptance].label}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {record.notes && (
                        <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                          {record.notes}
                        </p>
                      )}
                      {record.allergicReaction && (
                        <div className="flex items-center gap-2 mt-3 p-2 rounded bg-rose-50 dark:bg-rose-950/30">
                          <AlertCircle className="h-4 w-4 text-rose-500" />
                          <span className="text-sm text-rose-600 dark:text-rose-400">
                            Reação alérgica reportada
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground mb-4">Nenhum histórico registrado</p>
                  <Button onClick={() => setIsAddHistoryOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Primeira Ração
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog - Novo Plano */}
      <Dialog open={isAddPlanOpen} onOpenChange={setIsAddPlanOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddPlan}>
            <DialogHeader>
              <DialogTitle>Plano de Alimentação</DialogTitle>
              <DialogDescription>Configure a ração e quantidade diária do {selectedPet?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca *</Label>
                  <Input
                    id="brand"
                    name="brand"
                    placeholder="Ex: Royal Canin"
                    defaultValue={petSummary?.plan?.brand}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="foodType">Tipo *</Label>
                  <Select name="foodType" defaultValue={petSummary?.plan?.foodType || "dry"} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dry">Ração Seca</SelectItem>
                      <SelectItem value="wet">Ração Úmida</SelectItem>
                      <SelectItem value="natural">Natural</SelectItem>
                      <SelectItem value="mixed">Mista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">Produto (opcional)</Label>
                <Input
                  id="productName"
                  name="productName"
                  placeholder="Ex: Golden Retriever Adult"
                  defaultValue={petSummary?.plan?.productName || ""}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dailyAmount">Quantidade Diária (g) *</Label>
                  <Input
                    id="dailyAmount"
                    name="dailyAmount"
                    type="number"
                    placeholder="400"
                    defaultValue={petSummary?.plan?.dailyAmount}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portionsPerDay">Porções por Dia *</Label>
                  <Select name="portionsPerDay" defaultValue={petSummary?.plan?.portionsPerDay?.toString() || "2"} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1x ao dia</SelectItem>
                      <SelectItem value="2">2x ao dia</SelectItem>
                      <SelectItem value="3">3x ao dia</SelectItem>
                      <SelectItem value="4">4x ao dia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="portionTimes">Horários (separados por vírgula)</Label>
                <Input
                  id="portionTimes"
                  name="portionTimes"
                  placeholder="08:00, 18:00"
                  defaultValue={
                    petSummary?.plan?.portionTimes
                      ? JSON.parse(petSummary.plan.portionTimes).join(", ")
                      : ""
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  placeholder="Informações adicionais..."
                  defaultValue={petSummary?.plan?.notes || ""}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddPlanOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsertPlan.isPending}>
                {upsertPlan.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog - Registrar Entrega de Ração */}
      <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddStock}>
            <DialogHeader>
              <DialogTitle>Registrar Entrega de Ração</DialogTitle>
              <DialogDescription>
                Informe a quantidade de ração entregue na creche para o {selectedPet?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca *</Label>
                  <Input
                    id="brand"
                    name="brand"
                    placeholder="Ex: Royal Canin"
                    defaultValue={petSummary?.plan?.brand}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade (kg) *</Label>
                  <Input id="quantity" name="quantity" type="number" step="0.1" placeholder="15" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">Produto (opcional)</Label>
                <Input
                  id="productName"
                  name="productName"
                  placeholder="Nome do produto"
                  defaultValue={petSummary?.plan?.productName || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expirationDate">Data de Validade</Label>
                <Input id="expirationDate" name="expirationDate" type="date" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" name="notes" rows={2} placeholder="Informações adicionais..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddStockOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addInventory.isPending}>
                {addInventory.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog - Registrar Histórico/Reação */}
      <Dialog open={isAddHistoryOpen} onOpenChange={setIsAddHistoryOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleAddHistory}>
            <DialogHeader>
              <DialogTitle>Registrar Reação à Ração</DialogTitle>
              <DialogDescription>Como o {selectedPet?.name} reagiu a esta ração?</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca *</Label>
                  <Input id="brand" name="brand" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productName">Produto</Label>
                  <Input id="productName" name="productName" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data Início *</Label>
                  <Input id="startDate" name="startDate" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data Fim</Label>
                  <Input id="endDate" name="endDate" type="date" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Aceitação</Label>
                <Select name="acceptance">
                  <SelectTrigger>
                    <SelectValue placeholder="Como reagiu?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loved">Adorou</SelectItem>
                    <SelectItem value="liked">Gostou</SelectItem>
                    <SelectItem value="neutral">Neutro</SelectItem>
                    <SelectItem value="disliked">Não gostou</SelectItem>
                    <SelectItem value="rejected">Rejeitou</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Digestão</Label>
                  <Select name="digestion">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excelente</SelectItem>
                      <SelectItem value="good">Boa</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="poor">Ruim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Qualidade das Fezes</Label>
                  <Select name="stoolQuality">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="soft">Mole</SelectItem>
                      <SelectItem value="hard">Duro</SelectItem>
                      <SelectItem value="diarrhea">Diarreia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nível de Energia</Label>
                <Select name="energyLevel">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Alto</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Baixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Avaliação Geral</Label>
                <Select name="overallRating">
                  <SelectTrigger>
                    <SelectValue placeholder="1 a 5 estrelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 - Excelente</SelectItem>
                    <SelectItem value="4">4 - Muito Bom</SelectItem>
                    <SelectItem value="3">3 - Bom</SelectItem>
                    <SelectItem value="2">2 - Regular</SelectItem>
                    <SelectItem value="1">1 - Ruim</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="allergicReaction" name="allergicReaction" value="true" className="rounded" />
                <Label htmlFor="allergicReaction" className="text-sm font-normal cursor-pointer">
                  Apresentou reação alérgica
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" name="notes" rows={2} placeholder="Detalhes adicionais sobre a reação..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddHistoryOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addHistory.isPending}>
                {addHistory.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog - Adicionar Petisco */}
      <Dialog open={isAddTreatOpen} onOpenChange={setIsAddTreatOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddTreat}>
            <DialogHeader>
              <DialogTitle>Adicionar Petisco</DialogTitle>
              <DialogDescription>Registre um petisco permitido para o {selectedPet?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" name="name" placeholder="Nome do petisco" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="treatType">Tipo *</Label>
                  <Select name="treatType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="snack">Snack</SelectItem>
                      <SelectItem value="biscuit">Biscoito</SelectItem>
                      <SelectItem value="natural">Natural</SelectItem>
                      <SelectItem value="supplement">Suplemento</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Marca</Label>
                <Input id="brand" name="brand" placeholder="Marca do petisco" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Finalidade</Label>
                  <Select name="purpose">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reward">Recompensa</SelectItem>
                      <SelectItem value="training">Treinamento</SelectItem>
                      <SelectItem value="dental">Saúde Dental</SelectItem>
                      <SelectItem value="supplement">Suplemento</SelectItem>
                      <SelectItem value="enrichment">Enriquecimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPerDay">Máximo por Dia</Label>
                  <Input id="maxPerDay" name="maxPerDay" type="number" placeholder="5" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select name="frequency">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="occasionally">Ocasionalmente</SelectItem>
                    <SelectItem value="training_only">Só para Treino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Aceitação</Label>
                <Select name="acceptance">
                  <SelectTrigger>
                    <SelectValue placeholder="Como reagiu?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loved">Adorou</SelectItem>
                    <SelectItem value="liked">Gostou</SelectItem>
                    <SelectItem value="neutral">Neutro</SelectItem>
                    <SelectItem value="disliked">Não gostou</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddTreatOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addTreat.isPending}>
                {addTreat.isPending ? "Salvando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog - Adicionar Alimentação Natural */}
      <Dialog open={isAddNaturalOpen} onOpenChange={setIsAddNaturalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddNatural}>
            <DialogHeader>
              <DialogTitle>Alimentação Natural</DialogTitle>
              <DialogDescription>Registre uma alimentação natural para o {selectedPet?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" name="name" placeholder="Nome da receita" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mealType">Tipo *</Label>
                  <Select name="mealType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barf">BARF (Crua)</SelectItem>
                      <SelectItem value="cooked">Cozida</SelectItem>
                      <SelectItem value="mixed">Mista</SelectItem>
                      <SelectItem value="supplement">Suplemento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proteinSource">Fonte de Proteína Principal</Label>
                <Input id="proteinSource" name="proteinSource" placeholder="Ex: Frango, Carne bovina" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ingredients">Ingredientes (separados por vírgula)</Label>
                <Textarea
                  id="ingredients"
                  name="ingredients"
                  rows={2}
                  placeholder="Frango, Cenoura, Abobrinha, Arroz..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="portionSize">Porção (g)</Label>
                  <Input id="portionSize" name="portionSize" type="number" placeholder="200" />
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select name="frequency">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="occasionally">Ocasionalmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Aceitação</Label>
                <Select name="acceptance">
                  <SelectTrigger>
                    <SelectValue placeholder="Como reagiu?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loved">Adorou</SelectItem>
                    <SelectItem value="liked">Gostou</SelectItem>
                    <SelectItem value="neutral">Neutro</SelectItem>
                    <SelectItem value="disliked">Não gostou</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações / Modo de Preparo</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddNaturalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addNaturalFood.isPending}>
                {addNaturalFood.isPending ? "Salvando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
