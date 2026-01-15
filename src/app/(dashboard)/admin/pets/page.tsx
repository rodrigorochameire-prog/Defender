"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dog, 
  Check, 
  X, 
  Search,
  Filter,
  PawPrint,
  Clock,
  CheckCircle2,
  CreditCard,
  Calendar,
  Eye,
  MoreVertical,
  AlertCircle,
  ArrowUpRight,
  Plus,
  Edit,
  Trash2,
  Save,
  User,
  Phone,
  Mail,
  BarChart3,
  PieChart,
  TrendingUp,
  Heart,
  ListFilter,
} from "lucide-react";
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
  LineChart,
  Line,
} from "recharts";

const NEUTRAL_COLORS = ["#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { LoadingPage } from "@/components/shared/loading";
import { BreedIcon } from "@/components/breed-icons";
import { PetCard } from "@/components/pet-card";
import { DOG_BREEDS } from "@/lib/breeds";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";

export default function AdminPetsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pets");

  const utils = trpc.useUtils();
  const { data: pets, isLoading } = trpc.pets.list.useQuery();
  const { data: pendingPets } = trpc.pets.pending.useQuery();
  const { data: tutors } = trpc.users.tutors.useQuery();

  const approveMutation = trpc.pets.approve.useMutation({
    onSuccess: () => {
      toast.success("Pet aprovado com sucesso!");
      utils.pets.list.invalidate();
      utils.pets.pending.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectMutation = trpc.pets.reject.useMutation({
    onSuccess: () => {
      toast.success("Pet rejeitado");
      utils.pets.list.invalidate();
      utils.pets.pending.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createPetMutation = trpc.pets.adminCreate.useMutation({
    onSuccess: () => {
      toast.success("Pet criado com sucesso!");
      setIsCreateOpen(false);
      utils.pets.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePetMutation = trpc.pets.adminUpdate.useMutation({
    onSuccess: () => {
      toast.success("Pet atualizado com sucesso!");
      setIsEditOpen(false);
      setSelectedPet(null);
      utils.pets.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePetMutation = trpc.pets.adminDelete.useMutation({
    onSuccess: () => {
      toast.success("Pet excluído com sucesso!");
      setIsDeleteConfirmOpen(false);
      setSelectedPet(null);
      utils.pets.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const addCreditsMutation = trpc.pets.addCredits.useMutation({
    onSuccess: () => {
      toast.success("Créditos adicionados!");
      utils.pets.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Filtered pets
  const filteredPets = useMemo(() => {
    if (!pets) return [];
    return pets.filter((pet) => {
      const matchesSearch = 
        pet.name.toLowerCase().includes(search.toLowerCase()) ||
        pet.breed?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || pet.approvalStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pets, search, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!pets) return { total: 0, approved: 0, pending: 0, totalCredits: 0 };
    return {
      total: pets.length,
      approved: pets.filter(p => p.approvalStatus === "approved").length,
      pending: pets.filter(p => p.approvalStatus === "pending").length,
      totalCredits: pets.reduce((sum, p) => sum + (p.credits || 0), 0),
    };
  }, [pets]);

  // Analytics data
  const analyticsData = useMemo(() => {
    if (!pets || pets.length === 0) return {
      breedDistribution: [],
      statusDistribution: [],
      weightDistribution: [],
      ageDistribution: [],
      creditsDistribution: [],
      monthlyGrowth: [],
    };

    // Breed distribution
    const breedCount: Record<string, number> = {};
    pets.forEach(pet => {
      const breed = pet.breed || "Sem raça";
      breedCount[breed] = (breedCount[breed] || 0) + 1;
    });
    const breedDistribution = Object.entries(breedCount)
      .map(([name, value]) => ({ 
        name: name.length > 12 ? name.slice(0, 12) + '...' : name, 
        value 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Status distribution
    const statusDistribution = [
      { name: "Aprovados", value: stats.approved },
      { name: "Pendentes", value: stats.pending },
      { name: "Rejeitados", value: stats.total - stats.approved - stats.pending },
    ].filter(d => d.value > 0);

    // Weight distribution
    const small = pets.filter(p => p.weight && p.weight <= 10).length;
    const medium = pets.filter(p => p.weight && p.weight > 10 && p.weight <= 25).length;
    const large = pets.filter(p => p.weight && p.weight > 25 && p.weight <= 45).length;
    const giant = pets.filter(p => p.weight && p.weight > 45).length;
    const noWeight = pets.filter(p => !p.weight).length;
    const weightDistribution = [
      { name: "Pequeno (≤10kg)", value: small },
      { name: "Médio (10-25kg)", value: medium },
      { name: "Grande (25-45kg)", value: large },
      { name: "Gigante (>45kg)", value: giant },
      { name: "Não informado", value: noWeight },
    ].filter(d => d.value > 0);

    // Age distribution
    const now = new Date();
    const puppy = pets.filter(p => {
      if (!p.birthDate) return false;
      const age = (now.getTime() - new Date(p.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
      return age < 1;
    }).length;
    const young = pets.filter(p => {
      if (!p.birthDate) return false;
      const age = (now.getTime() - new Date(p.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
      return age >= 1 && age < 3;
    }).length;
    const adult = pets.filter(p => {
      if (!p.birthDate) return false;
      const age = (now.getTime() - new Date(p.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
      return age >= 3 && age < 8;
    }).length;
    const senior = pets.filter(p => {
      if (!p.birthDate) return false;
      const age = (now.getTime() - new Date(p.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
      return age >= 8;
    }).length;
    const noAge = pets.filter(p => !p.birthDate).length;
    const ageDistribution = [
      { name: "Filhote (<1a)", value: puppy },
      { name: "Jovem (1-3a)", value: young },
      { name: "Adulto (3-8a)", value: adult },
      { name: "Sênior (>8a)", value: senior },
      { name: "Não informado", value: noAge },
    ].filter(d => d.value > 0);

    // Credits distribution
    const noCredits = pets.filter(p => !p.credits || p.credits === 0).length;
    const lowCredits = pets.filter(p => p.credits && p.credits > 0 && p.credits <= 5).length;
    const medCredits = pets.filter(p => p.credits && p.credits > 5 && p.credits <= 15).length;
    const highCredits = pets.filter(p => p.credits && p.credits > 15).length;
    const creditsDistribution = [
      { name: "Sem créditos", value: noCredits },
      { name: "1-5 créditos", value: lowCredits },
      { name: "6-15 créditos", value: medCredits },
      { name: ">15 créditos", value: highCredits },
    ].filter(d => d.value > 0);

    // Monthly growth (últimos 6 meses)
    const monthlyGrowth = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const monthStr = date.toLocaleDateString("pt-BR", { month: "short" });
      const monthPets = pets.filter(p => {
        const created = new Date(p.createdAt);
        return created.getMonth() === date.getMonth() && 
               created.getFullYear() === date.getFullYear();
      }).length;
      return { month: monthStr, pets: monthPets };
    });

    return {
      breedDistribution,
      statusDistribution,
      weightDistribution,
      ageDistribution,
      creditsDistribution,
      monthlyGrowth,
    };
  }, [pets, stats]);

  const handleCreatePet = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tutorIdValue = formData.get("tutorId") as string;
    createPetMutation.mutate({
      name: formData.get("name") as string,
      species: "dog",
      breed: formData.get("breed") as string || undefined,
      birthDate: formData.get("birthDate") as string || undefined,
      weight: formData.get("weight") ? parseFloat(formData.get("weight") as string) : undefined,
      notes: formData.get("notes") as string || undefined,
      tutorId: tutorIdValue && tutorIdValue !== "none" ? parseInt(tutorIdValue) : undefined,
      credits: formData.get("credits") ? parseInt(formData.get("credits") as string) : 0,
      approvalStatus: "approved",
    });
  };

  const handleUpdatePet = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPet) return;
    const formData = new FormData(e.currentTarget);
    updatePetMutation.mutate({
      id: selectedPet.id,
      name: formData.get("name") as string,
      breed: formData.get("breed") as string || undefined,
      birthDate: formData.get("birthDate") as string || undefined,
      weight: formData.get("weight") ? parseFloat(formData.get("weight") as string) : undefined,
      notes: formData.get("notes") as string || undefined,
      credits: formData.get("credits") ? parseInt(formData.get("credits") as string) : undefined,
      approvalStatus: (formData.get("approvalStatus") as "pending" | "approved" | "rejected") || undefined,
    });
  };

  const handleQuickAddCredits = (petId: number, amount: number) => {
    addCreditsMutation.mutate({ petId, credits: amount });
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <PawPrint />
          </div>
          <div className="page-header-info">
            <h1>Gestão de Pets</h1>
            <p>Gerencie todos os pets cadastrados</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button onClick={() => setIsCreateOpen(true)} size="sm" className="btn-sm btn-primary">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Pet
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total</span>
            <PawPrint className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{stats.total}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Aprovados</span>
            <CheckCircle2 className="stat-card-icon green" />
          </div>
          <div className="stat-card-value">{stats.approved}</div>
        </div>

        <div className={`stat-card ${stats.pending > 0 ? 'highlight' : ''}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Pendentes</span>
            <Clock className={`stat-card-icon ${stats.pending > 0 ? 'amber' : 'muted'}`} />
          </div>
          <div className="stat-card-value">{stats.pending}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Créditos Totais</span>
            <CreditCard className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{stats.totalCredits}</div>
        </div>
      </div>

      {/* Main Tabs - Separando Pets e Análises */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="pets" className="gap-2">
            <ListFilter className="h-4 w-4" />
            Todos os Pets
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Análises
          </TabsTrigger>
        </TabsList>

        {/* Tab: Todos os Pets */}
        <TabsContent value="pets" className="space-y-4">
          {/* Pending Approvals */}
          {pendingPets && pendingPets.length > 0 && (
            <div className="section-card border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10">
              <div className="section-card-header">
                <div className="section-card-title">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  Aguardando Aprovação ({pendingPets.length})
                </div>
              </div>
              <div className="section-card-content">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {pendingPets.slice(0, 6).map((pet) => (
                    <div key={pet.id} className="flex items-center justify-between p-3 bg-card rounded-xl border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Dog className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{pet.name}</p>
                          <p className="text-xs text-muted-foreground">{pet.breed || "Sem raça"}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate({ id: pet.id })}
                          className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectMutation.mutate({ id: pet.id })}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou raça..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="approved">Aprovados</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="rejected">Rejeitados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pets Grid */}
          <div className="section-card">
            <div className="section-card-header">
              <div className="section-card-title">
                <Dog />
                Todos os Pets
                <Badge variant="secondary" className="ml-2">{filteredPets.length}</Badge>
              </div>
            </div>
            <div className="section-card-content">
              {filteredPets.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Dog /></div>
                  <p className="empty-state-text">Nenhum pet encontrado</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filteredPets.map((pet) => (
                    <PetCard
                      key={pet.id}
                      pet={pet}
                      variant="default"
                      showActions={true}
                      showCreditsBar={true}
                      href={`/admin/pets/${pet.id}`}
                      onViewDetails={() => { setSelectedPet(pet); setIsDetailOpen(true); }}
                      onEdit={() => { setSelectedPet(pet); setIsEditOpen(true); }}
                      onDelete={() => { setSelectedPet(pet); setIsDeleteConfirmOpen(true); }}
                      onApprove={() => approveMutation.mutate({ id: pet.id })}
                      onAddCredits={(amount) => handleQuickAddCredits(pet.id, amount)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Análises */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Métricas Resumidas */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Visão Geral dos Pets
              </CardTitle>
              <CardDescription>Estatísticas e métricas do cadastro</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Dog className="h-4 w-4 text-slate-500" />
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-slate-500" />
                    <span className="text-xs text-muted-foreground">Aprovados</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="text-xs text-muted-foreground">Pendentes</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="h-4 w-4 text-slate-500" />
                    <span className="text-xs text-muted-foreground">Raças</span>
                  </div>
                  <p className="text-2xl font-bold">{new Set(pets?.map(p => p.breed).filter(Boolean)).size || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-slate-500" />
                    <span className="text-xs text-muted-foreground">Créditos</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalCredits}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos Principais */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Distribuição por Raça */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Top Raças
                </CardTitle>
                <CardDescription className="text-xs">Raças mais frequentes</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.breedDistribution.length > 0 ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsData.breedDistribution}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                        <YAxis type="category" dataKey="name" width={90} stroke="#94a3b8" fontSize={10} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }} 
                        />
                        <Bar dataKey="value" name="Pets" fill="#64748b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados disponíveis
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status de Aprovação */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Status de Aprovação
                </CardTitle>
                <CardDescription className="text-xs">Distribuição por status</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.statusDistribution.length > 0 ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={analyticsData.statusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {analyticsData.statusDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={NEUTRAL_COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados disponíveis
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gráficos Secundários */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Distribuição por Peso */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Por Porte
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData.weightDistribution.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={analyticsData.weightDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name }) => (name ?? "").split(" ")[0]}
                          labelLine={false}
                        >
                          {analyticsData.weightDistribution.map((_, index) => (
                            <Cell key={`weight-${index}`} fill={NEUTRAL_COLORS[index % NEUTRAL_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distribuição por Idade */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Por Idade
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData.ageDistribution.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={analyticsData.ageDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name }) => (name ?? "").split(" ")[0]}
                          labelLine={false}
                        >
                          {analyticsData.ageDistribution.map((_, index) => (
                            <Cell key={`age-${index}`} fill={NEUTRAL_COLORS[index % NEUTRAL_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distribuição por Créditos */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Por Créditos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData.creditsDistribution.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={analyticsData.creditsDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name }) => (name ?? "").split(" ")[0]}
                          labelLine={false}
                        >
                          {analyticsData.creditsDistribution.map((_, index) => (
                            <Cell key={`credits-${index}`} fill={NEUTRAL_COLORS[index % NEUTRAL_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Crescimento Mensal */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Cadastros por Mês
              </CardTitle>
              <CardDescription>Novos pets cadastrados nos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.monthlyGrowth.some(m => m.pets > 0) ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.monthlyGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="pets" name="Novos Pets" fill="#475569" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Distribuição por Porte - Cards */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Dog className="h-5 w-5" />
                Distribuição por Peso (Detalhado)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {(() => {
                  const small = pets?.filter(p => p.weight && p.weight <= 10).length || 0;
                  const medium = pets?.filter(p => p.weight && p.weight > 10 && p.weight <= 25).length || 0;
                  const large = pets?.filter(p => p.weight && p.weight > 25 && p.weight <= 45).length || 0;
                  const giant = pets?.filter(p => p.weight && p.weight > 45).length || 0;
                  const total = small + medium + large + giant;
                  return [
                    { label: "Pequeno", subtitle: "até 10kg", value: small, percent: total > 0 ? (small / total * 100).toFixed(0) : 0 },
                    { label: "Médio", subtitle: "10-25kg", value: medium, percent: total > 0 ? (medium / total * 100).toFixed(0) : 0 },
                    { label: "Grande", subtitle: "25-45kg", value: large, percent: total > 0 ? (large / total * 100).toFixed(0) : 0 },
                    { label: "Gigante", subtitle: "+45kg", value: giant, percent: total > 0 ? (giant / total * 100).toFixed(0) : 0 },
                  ].map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-muted/30 text-center">
                      <p className="text-lg font-bold">{item.value}</p>
                      <p className="text-xs font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                      <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-500 rounded-full transition-all" 
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{item.percent}%</p>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Pet Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Pet</DialogTitle>
            <DialogDescription>Cadastre um pet diretamente no sistema</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePet} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breed">Raça</Label>
                <Select name="breed">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a raça" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOG_BREEDS.map((breed) => (
                      <SelectItem key={breed.value} value={breed.value}>
                        {breed.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input id="birthDate" name="birthDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input id="weight" name="weight" type="number" step="0.1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tutorId">Tutor</Label>
                <Select name="tutorId">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar tutor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem tutor</SelectItem>
                    {tutors?.map((tutor) => (
                      <SelectItem key={tutor.id} value={tutor.id.toString()}>
                        {tutor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credits">Créditos Iniciais</Label>
                <Input id="credits" name="credits" type="number" defaultValue="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPetMutation.isPending}>
                {createPetMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Pet Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Pet</DialogTitle>
            <DialogDescription>Atualize as informações do pet</DialogDescription>
          </DialogHeader>
          {selectedPet && (
            <form onSubmit={handleUpdatePet} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome *</Label>
                  <Input id="edit-name" name="name" defaultValue={selectedPet.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-breed">Raça</Label>
                  <Select name="breed" defaultValue={selectedPet.breed || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a raça" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOG_BREEDS.map((breed) => (
                        <SelectItem key={breed.value} value={breed.value}>
                          {breed.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-birthDate">Data de Nascimento</Label>
                  <Input id="edit-birthDate" name="birthDate" type="date" defaultValue={selectedPet.birthDate ? new Date(selectedPet.birthDate).toISOString().split("T")[0] : ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-weight">Peso (kg)</Label>
                  <Input id="edit-weight" name="weight" type="number" step="0.1" defaultValue={selectedPet.weight || ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-credits">Créditos</Label>
                  <Input id="edit-credits" name="credits" type="number" defaultValue={selectedPet.credits || 0} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select name="approvalStatus" defaultValue={selectedPet.approvalStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Aprovado</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Observações</Label>
                <Textarea id="edit-notes" name="notes" rows={2} defaultValue={selectedPet.notes || ""} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updatePetMutation.isPending}>
                  {updatePetMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o pet &quot;{selectedPet?.name}&quot;? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedPet && deletePetMutation.mutate({ id: selectedPet.id })}
              disabled={deletePetMutation.isPending}
            >
              {deletePetMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pet Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dog className="h-5 w-5 text-primary" />
              {selectedPet?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedPet && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Raça</p>
                  <p className="font-medium">{selectedPet.breed || "Não informada"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Espécie</p>
                  <p className="font-medium">Cachorro</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Nascimento</p>
                  <p className="font-medium">{selectedPet.birthDate ? formatDate(selectedPet.birthDate) : "Não informado"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Peso</p>
                  <p className="font-medium">{selectedPet.weight ? `${selectedPet.weight} kg` : "Não informado"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Créditos</p>
                  <p className="font-medium">{selectedPet.credits}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                  <Badge className={
                    selectedPet.approvalStatus === "approved" ? "badge-green" :
                    selectedPet.approvalStatus === "pending" ? "badge-amber" : "badge-rose"
                  }>
                    {selectedPet.approvalStatus === "approved" ? "Aprovado" :
                     selectedPet.approvalStatus === "pending" ? "Pendente" : "Rejeitado"}
                  </Badge>
                </div>
              </div>
              {selectedPet.notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Observações</p>
                  <p className="text-sm mt-1">{selectedPet.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setIsDetailOpen(false); setIsEditOpen(true); }}>
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </Button>
                <Button className="flex-1" onClick={() => handleQuickAddCredits(selectedPet.id, 10)}>
                  <CreditCard className="h-4 w-4 mr-2" /> +10 Créditos
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
