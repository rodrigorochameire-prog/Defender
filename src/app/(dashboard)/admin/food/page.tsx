"use client";

import { useState, useMemo } from "react";
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
  TrendingDown,
  AlertTriangle,
  Plus,
  Dog,
  Cookie,
  Leaf,
  History,
  Star,
  Clock,
  Scale,
  Calendar,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ChevronRight,
  Edit,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart3,
  PieChart,
  TrendingUp,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingPage } from "@/components/shared/loading";
import Image from "next/image";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

export default function AdminFoodPage() {
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("food");
  
  // Dialogs
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isAddHistoryOpen, setIsAddHistoryOpen] = useState(false);
  const [isAddTreatOpen, setIsAddTreatOpen] = useState(false);
  const [isAddNaturalOpen, setIsAddNaturalOpen] = useState(false);
  const [isPetDetailOpen, setIsPetDetailOpen] = useState(false);

  // Queries
  const { data: summaries, isLoading, refetch } = trpc.food.listAllPetsFoodSummary.useQuery();
  const { data: petSummary, refetch: refetchPetSummary } = trpc.food.getPetFoodSummary.useQuery(
    { petId: selectedPetId! },
    { enabled: !!selectedPetId }
  );

  // Mutations
  const upsertPlan = trpc.food.upsertPlan.useMutation({
    onSuccess: () => {
      toast.success("Plano de alimentação salvo!");
      setIsAddPlanOpen(false);
      refetch();
      if (selectedPetId) refetchPetSummary();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const addInventory = trpc.food.addInventory.useMutation({
    onSuccess: () => {
      toast.success("Estoque adicionado!");
      setIsAddStockOpen(false);
      refetch();
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
    const formData = new FormData(e.currentTarget);
    const times = formData.get("portionTimes") as string;
    
    upsertPlan.mutate({
      petId: Number(formData.get("petId")),
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
    const formData = new FormData(e.currentTarget);
    
    addInventory.mutate({
      petId: Number(formData.get("petId")),
      brand: formData.get("brand") as string,
      productName: (formData.get("productName") as string) || undefined,
      quantityReceived: Number(formData.get("quantity")) * 1000, // kg para g
      expirationDate: (formData.get("expirationDate") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    });
  };

  const handleAddHistory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addHistory.mutate({
      petId: selectedPetId!,
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
    const formData = new FormData(e.currentTarget);
    
    addTreat.mutate({
      petId: selectedPetId!,
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
    const formData = new FormData(e.currentTarget);
    const ingredients = formData.get("ingredients") as string;
    
    addNaturalFood.mutate({
      petId: selectedPetId!,
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

  const openPetDetail = (petId: number) => {
    setSelectedPetId(petId);
    setIsPetDetailOpen(true);
  };

  // Stats
  const totalPets = summaries?.length || 0;
  const petsWithPlan = summaries?.filter((s) => s.hasPlan).length || 0;
  const lowStockPets = summaries?.filter((s) => s.isLowStock).length || 0;
  const criticalStockPets = summaries?.filter((s) => s.isCriticalStock).length || 0;

  if (isLoading) {
    return <LoadingPage />;
  }

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
            <p>Controle completo por pet</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button variant="outline" size="sm" onClick={() => setIsAddStockOpen(true)} className="btn-sm btn-outline">
            <Package className="h-3.5 w-3.5 mr-1.5" />
            Estoque
          </Button>
          <Button size="sm" onClick={() => setIsAddPlanOpen(true)} className="btn-sm btn-primary">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Plano
          </Button>
        </div>
      </div>

      {/* Stats - Premium */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5 border-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Total de Pets</span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Dog className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{totalPets}</div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5 border-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Com Plano Ativo</span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{petsWithPlan}</div>
        </div>

        <div className={`bg-card rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5 border-0 ${lowStockPets > 0 ? "ring-1 ring-slate-300 dark:ring-slate-700" : ""}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Estoque Baixo</span>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              <TrendingDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${lowStockPets > 0 ? "text-slate-700 dark:text-slate-300" : "text-foreground"}`}>{lowStockPets}</div>
          {lowStockPets > 0 && <p className="text-xs text-muted-foreground mt-1">Menos de 7 dias</p>}
        </div>

        <div className={`bg-card rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5 border-0 ${criticalStockPets > 0 ? "ring-1 ring-slate-400 dark:ring-slate-600" : ""}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Estoque Crítico</span>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              <AlertTriangle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${criticalStockPets > 0 ? "text-slate-900 dark:text-slate-100" : "text-foreground"}`}>{criticalStockPets}</div>
          {criticalStockPets > 0 && <p className="text-xs text-muted-foreground mt-1">Menos de 3 dias</p>}
        </div>
      </div>

      {/* Análises de Alimentação */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análises de Alimentação
          </CardTitle>
          <CardDescription>Visão geral do consumo e estoque</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Métricas Resumidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <UtensilsCrossed className="h-4 w-4 text-slate-500" />
                <span className="text-xs text-muted-foreground">Com Plano</span>
              </div>
              <p className="text-2xl font-bold">{summaries?.filter(s => s.hasPlan).length || 0}</p>
              <p className="text-xs text-muted-foreground">pets com plano ativo</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-slate-500" />
                <span className="text-xs text-muted-foreground">Estoque Baixo</span>
              </div>
              <p className="text-2xl font-bold">{summaries?.filter(s => s.isLowStock).length || 0}</p>
              <p className="text-xs text-muted-foreground">precisam de reposição</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <Cookie className="h-4 w-4 text-slate-500" />
                <span className="text-xs text-muted-foreground">Ração Úmida</span>
              </div>
              <p className="text-2xl font-bold">{summaries?.filter(s => s.plan?.foodType === "wet" || s.plan?.foodType === "mixed").length || 0}</p>
              <p className="text-xs text-muted-foreground">incluem ração úmida</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <Leaf className="h-4 w-4 text-slate-500" />
                <span className="text-xs text-muted-foreground">Natural</span>
              </div>
              <p className="text-2xl font-bold">{summaries?.filter(s => s.plan?.foodType === "natural").length || 0}</p>
              <p className="text-xs text-muted-foreground">alimentação natural</p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Distribuição por Tipo de Ração */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Tipos de Alimentação
              </h4>
              {summaries && summaries.length > 0 ? (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={(() => {
                          const typeCount: Record<string, number> = {};
                          summaries.forEach(s => {
                            if (s.plan) {
                              const type = s.plan.foodType || "dry";
                              typeCount[type] = (typeCount[type] || 0) + 1;
                            }
                          });
                          return Object.entries(typeCount).map(([name, value]) => ({
                            name: name === "dry" ? "Seca" : name === "wet" ? "Úmida" : name === "natural" ? "Natural" : "Mista",
                            value
                          }));
                        })()}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {[0, 1, 2, 3].map((index) => (
                          <Cell key={`cell-${index}`} fill={NEUTRAL_COLORS[index % NEUTRAL_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados disponíveis
                </div>
              )}
            </div>

            {/* Situação de Estoque */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Estoque por Pet
              </h4>
              {summaries && summaries.length > 0 ? (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={summaries
                        .filter(s => s.hasPlan)
                        .sort((a, b) => a.daysRemaining - b.daysRemaining)
                        .slice(0, 6)
                        .map(s => ({
                          name: s.pet.name.length > 8 ? s.pet.name.slice(0, 8) + '...' : s.pet.name,
                          dias: s.daysRemaining,
                          critico: s.isCriticalStock ? 1 : 0
                        }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                      <YAxis type="category" dataKey="name" width={70} stroke="#94a3b8" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value) => [`${value} dias`, 'Restante']}
                      />
                      <Bar dataKey="dias" name="Dias" fill="#64748b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados disponíveis
                </div>
              )}
            </div>
          </div>

          {/* Alertas de Estoque */}
          {summaries && summaries.filter(s => s.isCriticalStock || s.isLowStock).length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alertas de Reposição
              </h4>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {summaries
                  .filter(s => s.isCriticalStock || s.isLowStock)
                  .sort((a, b) => a.daysRemaining - b.daysRemaining)
                  .slice(0, 6)
                  .map(item => (
                    <div 
                      key={item.pet.id} 
                      className={`p-3 rounded-lg border ${
                        item.isCriticalStock 
                          ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600' 
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <Dog className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.pet.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.daysRemaining <= 0 ? 'Esgotado!' : `${item.daysRemaining} dias restantes`}
                          </p>
                        </div>
                        <Badge variant="outline" className={item.isCriticalStock ? 'border-slate-400 text-slate-600' : 'border-slate-300 text-slate-500'}>
                          {item.isCriticalStock ? 'Crítico' : 'Baixo'}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pets Grid - Premium */}
      <div className="bg-card rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] border-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Dog className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Alimentação por Pet</h3>
            <p className="text-xs text-muted-foreground">Clique em um pet para ver detalhes completos</p>
          </div>
        </div>
        <div>
          {summaries && summaries.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {summaries.map((item) => (
                <div
                  key={item.pet.id}
                  onClick={() => openPetDetail(item.pet.id)}
                  className={`rounded-xl p-4 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 ${
                    item.isCriticalStock
                      ? "bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
                      : item.isLowStock
                      ? "bg-slate-50 dark:bg-slate-800/50 ring-1 ring-slate-200 dark:ring-slate-700/50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                      : "bg-muted/30 hover:bg-muted/50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {item.pet.photoUrl ? (
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-white dark:ring-slate-800 shadow-sm">
                        <Image
                          src={item.pet.photoUrl}
                          alt={item.pet.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-white dark:ring-slate-800 shadow-sm">
                        <Dog className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{item.pet.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.plan ? item.plan.brand : "Sem plano definido"}
                      </p>
                      {item.plan && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Scale className="h-3 w-3" />
                            {item.plan.dailyAmount}g/dia
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.plan.portionsPerDay}x
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {item.hasPlan ? (
                        <>
                          <Badge className={item.isCriticalStock ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border-0" : item.isLowStock ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-0" : "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-0"}>
                            {item.daysRemaining > 0 ? `${item.daysRemaining} dias` : "Sem estoque"}
                          </Badge>
                          {item.totalStock > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {(item.totalStock / 1000).toFixed(1)} kg
                            </span>
                          )}
                        </>
                      ) : (
                        <Badge variant="outline" className="text-xs">Configurar</Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
                <Dog className="h-7 w-7 opacity-50" />
              </div>
              <p className="text-sm font-medium">Nenhum pet cadastrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Pet Detail Modal */}
      <Dialog open={isPetDetailOpen} onOpenChange={setIsPetDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center gap-4">
              {petSummary?.pet?.photoUrl ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-border">
                  <Image
                    src={petSummary.pet.photoUrl}
                    alt={petSummary.pet.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Dog className="h-8 w-8 text-primary" />
                </div>
              )}
              <div>
                <DialogTitle className="text-xl">{petSummary?.pet?.name}</DialogTitle>
                <DialogDescription>
                  {petSummary?.pet?.breed || "Raça não informada"}
                  {petSummary?.pet?.weight && ` • ${(petSummary.pet.weight / 1000).toFixed(1)} kg`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddPlanOpen(true)}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Editar
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
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Tipo</p>
                            <p className="font-medium">{foodTypeLabels[petSummary.plan.foodType as FoodType]}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Quantidade Diária</p>
                            <p className="font-medium">{petSummary.plan.dailyAmount}g</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Porções por Dia</p>
                            <p className="font-medium">{petSummary.plan.portionsPerDay}x</p>
                          </div>
                        </div>
                        {petSummary.plan.portionTimes && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Horários</p>
                            <div className="flex gap-2 flex-wrap">
                              {JSON.parse(petSummary.plan.portionTimes).map((time: string, i: number) => (
                                <Badge key={i} variant="outline" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  {time}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <UtensilsCrossed className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-muted-foreground">Nenhum plano definido</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => setIsAddPlanOpen(true)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Criar Plano
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Estoque */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        Controle de Estoque
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddStockOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Adicionar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {petSummary?.inventory && petSummary.inventory.items.length > 0 ? (
                      <div className="space-y-4">
                        {/* Resumo */}
                        <div className="flex items-center gap-6 p-4 rounded-lg bg-muted/50">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{(petSummary.inventory.totalStock / 1000).toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">kg disponíveis</p>
                          </div>
                          <div className="h-12 w-px bg-border" />
                          <div className="text-center">
                            <p className={`text-2xl font-bold ${
                              petSummary.inventory.daysRemaining < 3
                                ? "text-slate-900 dark:text-slate-100"
                                : petSummary.inventory.daysRemaining < 7
                                ? "text-slate-700 dark:text-slate-300"
                                : "text-slate-600 dark:text-slate-400"
                            }`}>
                              {petSummary.inventory.daysRemaining}
                            </p>
                            <p className="text-xs text-muted-foreground">dias restantes</p>
                          </div>
                          <div className="flex-1">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  petSummary.inventory.daysRemaining > 14
                                    ? "bg-slate-400 dark:bg-slate-500"
                                    : petSummary.inventory.daysRemaining > 7
                                    ? "bg-slate-500 dark:bg-slate-400"
                                    : "bg-slate-700 dark:bg-slate-300"
                                }`}
                                style={{
                                  width: `${Math.min((petSummary.inventory.daysRemaining / 30) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Lista de itens */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Entregas Recentes</p>
                          {petSummary.inventory.items.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <p className="font-medium text-sm">{item.brand}</p>
                                <p className="text-xs text-muted-foreground">
                                  Recebido em {format(new Date(item.receivedDate), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{(item.quantityRemaining / 1000).toFixed(1)} kg</p>
                                <p className="text-xs text-muted-foreground">
                                  de {(item.quantityReceived / 1000).toFixed(1)} kg
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-muted-foreground">Nenhum estoque registrado</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Petiscos */}
              <TabsContent value="treats" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Petiscos e snacks permitidos para este pet
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setIsAddTreatOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Adicionar
                  </Button>
                </div>

                {petSummary?.treats && petSummary.treats.length > 0 ? (
                  <div className="grid gap-3">
                    {petSummary.treats.map((treat) => (
                      <Card key={treat.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Cookie className="h-5 w-5 text-slate-500 dark:text-slate-400" />
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Cookie className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-muted-foreground">Nenhum petisco cadastrado</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Aba Alimentação Natural */}
              <TabsContent value="natural" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Alimentação natural e receitas caseiras
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setIsAddNaturalOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Adicionar
                  </Button>
                </div>

                {petSummary?.naturalFood && petSummary.naturalFood.length > 0 ? (
                  <div className="grid gap-3">
                    {petSummary.naturalFood.map((food) => (
                      <Card key={food.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Leaf className="h-5 w-5 text-slate-500 dark:text-slate-400" />
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Leaf className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-muted-foreground">Nenhuma alimentação natural cadastrada</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Aba Histórico */}
              <TabsContent value="history" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Histórico de rações e reações do pet
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setIsAddHistoryOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Registrar
                  </Button>
                </div>

                {petSummary?.history && petSummary.history.length > 0 ? (
                  <div className="space-y-3">
                    {petSummary.history.map((record) => (
                      <Card key={record.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{record.brand}</p>
                              {record.productName && (
                                <p className="text-sm text-muted-foreground">{record.productName}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
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
                                      className={`h-3.5 w-3.5 ${
                                        i < record.overallRating!
                                          ? "fill-slate-500 text-slate-500 dark:fill-slate-400 dark:text-slate-400"
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
                            <p className="text-sm text-muted-foreground mt-2 border-t pt-2">
                              {record.notes}
                            </p>
                          )}
                          {record.allergicReaction && (
                            <div className="flex items-center gap-2 mt-2 p-2 rounded bg-slate-100 dark:bg-slate-800">
                              <AlertCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                Reação alérgica reportada
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <History className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-muted-foreground">Nenhum histórico registrado</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog - Novo Plano */}
      <Dialog open={isAddPlanOpen} onOpenChange={setIsAddPlanOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddPlan}>
            <DialogHeader>
              <DialogTitle>Plano de Alimentação</DialogTitle>
              <DialogDescription>Configure a ração e quantidade diária</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="petId">Pet *</Label>
                <Select name="petId" defaultValue={selectedPetId?.toString()} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {summaries?.map((s) => (
                      <SelectItem key={s.pet.id} value={s.pet.id.toString()}>
                        {s.pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                  defaultValue={petSummary?.plan?.portionTimes ? JSON.parse(petSummary.plan.portionTimes).join(", ") : ""}
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

      {/* Dialog - Adicionar Estoque */}
      <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddStock}>
            <DialogHeader>
              <DialogTitle>Adicionar Estoque</DialogTitle>
              <DialogDescription>Registre a entrada de ração</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="petId">Pet *</Label>
                <Select name="petId" defaultValue={selectedPetId?.toString()} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {summaries?.map((s) => (
                      <SelectItem key={s.pet.id} value={s.pet.id.toString()}>
                        {s.pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca *</Label>
                  <Input id="brand" name="brand" placeholder="Ex: Royal Canin" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade (kg) *</Label>
                  <Input id="quantity" name="quantity" type="number" step="0.1" placeholder="15" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">Produto (opcional)</Label>
                <Input id="productName" name="productName" placeholder="Nome do produto" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expirationDate">Data de Validade</Label>
                <Input id="expirationDate" name="expirationDate" type="date" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" name="notes" rows={2} placeholder="Lote, fornecedor..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddStockOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addInventory.isPending}>
                {addInventory.isPending ? "Salvando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog - Registrar Histórico/Reação */}
      <Dialog open={isAddHistoryOpen} onOpenChange={setIsAddHistoryOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddHistory}>
            <DialogHeader>
              <DialogTitle>Registrar Reação à Ração</DialogTitle>
              <DialogDescription>Como o pet reagiu a esta ração?</DialogDescription>
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
                <Textarea id="notes" name="notes" rows={2} placeholder="Detalhes adicionais..." />
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
              <DialogDescription>Registre um petisco permitido para o pet</DialogDescription>
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
              <DialogDescription>Registre uma alimentação natural ou receita</DialogDescription>
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
