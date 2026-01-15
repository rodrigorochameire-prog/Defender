"use client";

import { useState, useMemo, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Plus,
  Edit,
  Trash2,
  Grid3X3,
  List,
  LayoutDashboard,
  Syringe,
  Pill,
  Bug,
  LogIn,
  LogOut,
  UtensilsCrossed,
  FileText,
  Cake,
  AlertTriangle,
  PhoneCall,
  Package,
  Zap,
  Heart,
  ChevronRight,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";
import { LoadingPage } from "@/components/shared/loading";
import { BreedIcon } from "@/components/breed-icons";
import { DOG_BREEDS } from "@/lib/breeds";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Tipos de visualização
type ViewMode = "grid" | "list" | "status";
type SmartFilter = "all" | "lowCredits" | "noCredits" | "birthday" | "absent" | "lowStock" | "checkedIn";

// Componente de indicador de saúde (semáforo)
function HealthIndicator({ 
  type, 
  status, 
  label 
}: { 
  type: "vaccine" | "preventive" | "medication"; 
  status: "green" | "yellow" | "red" | "gray";
  label?: string;
}) {
  const colors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500", 
    red: "bg-red-500",
    gray: "bg-gray-300",
  };
  
  const icons = {
    vaccine: Syringe,
    preventive: Bug,
    medication: Pill,
  };
  
  const Icon = icons[type];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <div className={cn(
              "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-white",
              colors[status]
            )} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{label || type}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Componente de barra de créditos
function CreditBar({ credits, maxCredits = 20 }: { credits: number; maxCredits?: number }) {
  const percentage = Math.min((credits / maxCredits) * 100, 100);
  const getColor = () => {
    if (credits === 0) return "bg-red-500";
    if (credits <= 3) return "bg-orange-500";
    if (credits <= 5) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all", getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn(
        "text-xs font-semibold tabular-nums min-w-[2rem] text-right",
        credits === 0 ? "text-red-600" : credits <= 3 ? "text-orange-600" : "text-muted-foreground"
      )}>
        {credits}
      </span>
    </div>
  );
}

// Componente de ação rápida
function QuickActionButton({ 
  icon: Icon, 
  label, 
  onClick,
  variant = "ghost",
  disabled = false,
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick: () => void;
  variant?: "ghost" | "default" | "destructive";
  disabled?: boolean;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={variant} 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            disabled={disabled}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Card de Pet otimizado
function PetCard({ 
  pet, 
  onViewDetails,
  onEdit,
  onDelete,
  onCheckIn,
  onCheckOut,
  onAddCredits,
  isCheckedIn,
  healthStatus,
}: { 
  pet: any;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onAddCredits: (amount: number) => void;
  isCheckedIn: boolean;
  healthStatus: { vaccine: "green" | "yellow" | "red" | "gray"; preventive: "green" | "yellow" | "red" | "gray" };
}) {
  const creditStatus = pet.credits === 0 ? "critical" : pet.credits <= 3 ? "warning" : "ok";
  
  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
      creditStatus === "critical" && "ring-2 ring-red-500/20",
      isCheckedIn && "bg-green-50/50 dark:bg-green-950/10 ring-2 ring-green-500/20",
    )}>
      {/* Status badge no canto */}
      {isCheckedIn && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-green-500 text-white text-xs">
            <Activity className="h-3 w-3 mr-1" />
            Na creche
          </Badge>
        </div>
      )}
      
      <CardContent className="p-4">
        {/* Header com foto e info básica */}
        <div className="flex items-start gap-3">
          {/* Avatar limpo - sem ícones sobrepostos */}
          <Link href={`/admin/pets/${pet.id}`} className="shrink-0">
            <BreedIcon breed={pet.breed} className="h-14 w-14 rounded-xl" />
          </Link>
          
          <div className="flex-1 min-w-0">
            <Link href={`/admin/pets/${pet.id}`}>
              <h3 className="font-bold text-base truncate hover:text-primary transition-colors">
                {pet.name}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground truncate">{pet.breed || "Sem raça definida"}</p>
            
            {/* Info compacta */}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {pet.weight && (
                <span>{(pet.weight / 1000).toFixed(1)}kg</span>
              )}
              {pet.birthDate && (
                <span>
                  {Math.floor((Date.now() - new Date(pet.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365))}a
                </span>
              )}
            </div>
            
            {/* Indicadores de saúde - linha separada */}
            <div className="flex items-center gap-2 mt-1.5">
              <HealthIndicator type="vaccine" status={healthStatus.vaccine} label="Vacinas" />
              <HealthIndicator type="preventive" status={healthStatus.preventive} label="Preventivos" />
              {pet.energyLevel && (
                <Badge variant="outline" className="text-xs h-5 px-1.5 ml-auto">
                  <Zap className="h-3 w-3 mr-0.5" />
                  {pet.energyLevel === "very_high" ? "+++" : 
                   pet.energyLevel === "high" ? "++" : 
                   pet.energyLevel === "medium" ? "+" : "○"}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Menu de ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onViewDetails}>
                <Eye className="h-4 w-4 mr-2" /> Ver perfil completo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAddCredits(5)}>
                <CreditCard className="h-4 w-4 mr-2" /> +5 Créditos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddCredits(10)}>
                <CreditCard className="h-4 w-4 mr-2" /> +10 Créditos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Barra de créditos */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Créditos</span>
            {creditStatus !== "ok" && (
              <span className={creditStatus === "critical" ? "text-red-600 font-medium" : "text-orange-600"}>
                {creditStatus === "critical" ? "Sem créditos!" : "Poucos créditos"}
              </span>
            )}
          </div>
          <CreditBar credits={pet.credits || 0} />
        </div>
        
        {/* Ações rápidas */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <div className="flex gap-1">
            {isCheckedIn ? (
              <QuickActionButton 
                icon={LogOut} 
                label="Check-out" 
                onClick={onCheckOut}
              />
            ) : (
              <QuickActionButton 
                icon={LogIn} 
                label="Check-in" 
                onClick={onCheckIn}
                disabled={(pet.credits || 0) === 0}
              />
            )}
            <QuickActionButton 
              icon={FileText} 
              label="Novo log" 
              onClick={() => window.location.href = `/admin/logs?petId=${pet.id}`}
            />
            <QuickActionButton 
              icon={UtensilsCrossed} 
              label="Registrar alimentação" 
              onClick={() => window.location.href = `/admin/food?petId=${pet.id}`}
            />
          </div>
          
          <Link href={`/admin/pets/${pet.id}`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
              Detalhes
              <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPetsPage() {
  // View mode persistence
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [smartFilter, setSmartFilter] = useState<SmartFilter>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Persistir preferência de visualização
  useEffect(() => {
    const saved = localStorage.getItem("pets-view-mode");
    if (saved && ["grid", "list", "status"].includes(saved)) {
      setViewMode(saved as ViewMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pets-view-mode", viewMode);
  }, [viewMode]);

  const utils = trpc.useUtils();
  const { data: pets, isLoading } = trpc.pets.list.useQuery();
  const { data: pendingPets } = trpc.pets.pending.useQuery();
  const { data: tutors } = trpc.users.tutors.useQuery();
  const { data: checkedInPets } = trpc.dashboard.checkedInPets.useQuery();
  const { data: lowStockPets } = trpc.petManagement.getLowStockPets.useQuery();

  // Mutations
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

  const checkinMutation = trpc.checkin.checkIn.useMutation({
    onSuccess: () => {
      toast.success("Check-in realizado!");
      utils.dashboard.checkedInPets.invalidate();
      utils.pets.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const checkoutMutation = trpc.checkin.checkOut.useMutation({
    onSuccess: () => {
      toast.success("Check-out realizado!");
      utils.dashboard.checkedInPets.invalidate();
      utils.pets.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Set de pets checked-in para busca rápida
  const checkedInPetIds = useMemo(() => {
    return new Set(checkedInPets?.map(p => p.id) || []);
  }, [checkedInPets]);

  // Set de pets com estoque baixo
  const lowStockPetIds = useMemo(() => {
    return new Set(lowStockPets?.map(p => p.id) || []);
  }, [lowStockPets]);

  // Filtered pets com smart filters
  const filteredPets = useMemo(() => {
    if (!pets) return [];
    
    let result = [...pets];
    
    // Filtro de busca
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(pet =>
        pet.name.toLowerCase().includes(searchLower) ||
        pet.breed?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filtro de status
    if (statusFilter !== "all") {
      result = result.filter(pet => pet.approvalStatus === statusFilter);
    }
    
    // Smart filters
    const now = new Date();
    const thisMonth = now.getMonth();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    
    switch (smartFilter) {
      case "lowCredits":
        result = result.filter(pet => (pet.credits || 0) > 0 && (pet.credits || 0) <= 3);
        break;
      case "noCredits":
        result = result.filter(pet => (pet.credits || 0) === 0);
        break;
      case "birthday":
        result = result.filter(pet => {
          if (!pet.birthDate) return false;
          const birthMonth = new Date(pet.birthDate).getMonth();
          return birthMonth === thisMonth;
        });
        break;
      case "absent":
        // Pets que não estão checked-in e foram criados há mais de 15 dias
        result = result.filter(pet => {
          if (checkedInPetIds.has(pet.id)) return false;
          const createdAt = new Date(pet.createdAt);
          return createdAt < fifteenDaysAgo;
        });
        break;
      case "lowStock":
        result = result.filter(pet => lowStockPetIds.has(pet.id));
        break;
      case "checkedIn":
        result = result.filter(pet => checkedInPetIds.has(pet.id));
        break;
    }
    
    return result;
  }, [pets, search, statusFilter, smartFilter, checkedInPetIds, lowStockPetIds]);

  // Agrupar por status para visualização "Status"
  const groupedByStatus = useMemo(() => {
    const checkedIn = filteredPets.filter(p => checkedInPetIds.has(p.id));
    const available = filteredPets.filter(p => !checkedInPetIds.has(p.id) && p.approvalStatus === "approved");
    const pending = filteredPets.filter(p => p.approvalStatus === "pending");
    
    return { checkedIn, available, pending };
  }, [filteredPets, checkedInPetIds]);

  // Stats
  const stats = useMemo(() => {
    if (!pets) return { total: 0, approved: 0, pending: 0, checkedIn: 0, lowCredits: 0, noCredits: 0 };
    return {
      total: pets.length,
      approved: pets.filter(p => p.approvalStatus === "approved").length,
      pending: pets.filter(p => p.approvalStatus === "pending").length,
      checkedIn: checkedInPets?.length || 0,
      lowCredits: pets.filter(p => (p.credits || 0) > 0 && (p.credits || 0) <= 3).length,
      noCredits: pets.filter(p => (p.credits || 0) === 0).length,
    };
  }, [pets, checkedInPets]);

  // Simular status de saúde (em produção, viria do backend)
  const getHealthStatus = (pet: any) => {
    // Simulação baseada em dados existentes
    const vaccineStatus = Math.random() > 0.3 ? "green" : Math.random() > 0.5 ? "yellow" : "red";
    const preventiveStatus = Math.random() > 0.3 ? "green" : Math.random() > 0.5 ? "yellow" : "red";
    return { 
      vaccine: vaccineStatus as "green" | "yellow" | "red", 
      preventive: preventiveStatus as "green" | "yellow" | "red" 
    };
  };

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
            <p>Painel de controle e inteligência</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button onClick={() => setIsCreateOpen(true)} size="sm" className="btn-sm btn-primary">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Pet
          </Button>
        </div>
      </div>

      {/* Stats Cards - Clicáveis como smart filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            smartFilter === "all" && "ring-2 ring-primary"
          )}
          onClick={() => setSmartFilter("all")}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Dog className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            smartFilter === "checkedIn" && "ring-2 ring-green-500"
          )}
          onClick={() => setSmartFilter("checkedIn")}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Na Creche</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.checkedIn}</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            smartFilter === "lowCredits" && "ring-2 ring-orange-500"
          )}
          onClick={() => setSmartFilter("lowCredits")}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-muted-foreground">Poucos Créditos</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-600">{stats.lowCredits}</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            smartFilter === "noCredits" && "ring-2 ring-red-500"
          )}
          onClick={() => setSmartFilter("noCredits")}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Sem Créditos</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.noCredits}</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            smartFilter === "birthday" && "ring-2 ring-pink-500"
          )}
          onClick={() => setSmartFilter("birthday")}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Cake className="h-4 w-4 text-pink-600" />
              <span className="text-xs text-muted-foreground">Aniversariantes</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-pink-600">
              {pets?.filter(p => p.birthDate && new Date(p.birthDate).getMonth() === new Date().getMonth()).length || 0}
            </p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            smartFilter === "lowStock" && "ring-2 ring-amber-500"
          )}
          onClick={() => setSmartFilter("lowStock")}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Estoque Baixo</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-600">{lowStockPets?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Alert */}
      {pendingPets && pendingPets.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium">{pendingPets.length} pet(s) aguardando aprovação</p>
                  <p className="text-sm text-muted-foreground">
                    {pendingPets.slice(0, 3).map(p => p.name).join(", ")}
                    {pendingPets.length > 3 && ` e mais ${pendingPets.length - 3}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {pendingPets.slice(0, 2).map(pet => (
                  <div key={pet.id} className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate({ id: pet.id })}
                      className="h-8 bg-green-500 hover:bg-green-600"
                    >
                      <Check className="h-3 w-3 mr-1" /> {pet.name}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou raça..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
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
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-3"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4 mr-1.5" />
            Grid
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-3"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4 mr-1.5" />
            Lista
          </Button>
          <Button
            variant={viewMode === "status" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-3"
            onClick={() => setViewMode("status")}
          >
            <LayoutDashboard className="h-4 w-4 mr-1.5" />
            Status
          </Button>
        </div>
      </div>

      {/* Active Filter Badge */}
      {smartFilter !== "all" && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            {smartFilter === "checkedIn" && <Activity className="h-3 w-3" />}
            {smartFilter === "lowCredits" && <AlertTriangle className="h-3 w-3" />}
            {smartFilter === "noCredits" && <AlertCircle className="h-3 w-3" />}
            {smartFilter === "birthday" && <Cake className="h-3 w-3" />}
            {smartFilter === "lowStock" && <Package className="h-3 w-3" />}
            {smartFilter === "absent" && <Clock className="h-3 w-3" />}
            {filteredPets.length} pets
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => setSmartFilter("all")} className="h-6 px-2 text-xs">
            Limpar filtro
          </Button>
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === "grid" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPets.map(pet => (
            <PetCard
              key={pet.id}
              pet={pet}
              isCheckedIn={checkedInPetIds.has(pet.id)}
              healthStatus={getHealthStatus(pet)}
              onViewDetails={() => window.location.href = `/admin/pets/${pet.id}`}
              onEdit={() => { setSelectedPet(pet); setIsEditOpen(true); }}
              onDelete={() => { setSelectedPet(pet); setIsDeleteConfirmOpen(true); }}
              onCheckIn={() => checkinMutation.mutate({ petId: pet.id })}
              onCheckOut={() => checkoutMutation.mutate({ petId: pet.id })}
              onAddCredits={(amount) => addCreditsMutation.mutate({ petId: pet.id, credits: amount })}
            />
          ))}
        </div>
      )}

      {viewMode === "list" && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pet</TableHead>
                <TableHead>Raça</TableHead>
                <TableHead className="text-center">Peso</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Créditos</TableHead>
                <TableHead className="text-center">Energia</TableHead>
                <TableHead className="text-center">Saúde</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPets.map(pet => {
                const isCheckedIn = checkedInPetIds.has(pet.id);
                const health = getHealthStatus(pet);
                return (
                  <TableRow key={pet.id} className={cn(isCheckedIn && "bg-green-50/50 dark:bg-green-950/10")}>
                    <TableCell>
                      <Link href={`/admin/pets/${pet.id}`} className="flex items-center gap-3 hover:text-primary">
                        <BreedIcon breed={pet.breed} className="h-8 w-8" />
                        <div>
                          <p className="font-medium">{pet.name}</p>
                          {isCheckedIn && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">
                              Na creche
                            </Badge>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{pet.breed || "-"}</TableCell>
                    <TableCell className="text-center">{pet.weight ? `${(pet.weight / 1000).toFixed(1)}kg` : "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={pet.approvalStatus === "approved" ? "default" : "secondary"}>
                        {pet.approvalStatus === "approved" ? "Aprovado" : pet.approvalStatus === "pending" ? "Pendente" : "Rejeitado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="w-20 mx-auto">
                        <CreditBar credits={pet.credits || 0} maxCredits={15} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {pet.energyLevel ? (
                        <Badge variant="outline" className="text-xs">
                          {pet.energyLevel === "very_high" ? "Muito Alta" : 
                           pet.energyLevel === "high" ? "Alta" : 
                           pet.energyLevel === "medium" ? "Média" : "Baixa"}
                        </Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <HealthIndicator type="vaccine" status={health.vaccine} label="Vacinas" />
                        <HealthIndicator type="preventive" status={health.preventive} label="Preventivos" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {isCheckedIn ? (
                          <Button size="sm" variant="outline" onClick={() => checkoutMutation.mutate({ petId: pet.id })} className="h-7 px-2">
                            <LogOut className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => checkinMutation.mutate({ petId: pet.id })} 
                            className="h-7 px-2"
                            disabled={(pet.credits || 0) === 0}
                          >
                            <LogIn className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedPet(pet); setIsEditOpen(true); }} className="h-7 px-2">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {viewMode === "status" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Na Creche */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Na Creche Hoje
                <Badge variant="secondary" className="ml-auto">{groupedByStatus.checkedIn.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {groupedByStatus.checkedIn.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum pet na creche</p>
              ) : (
                groupedByStatus.checkedIn.map(pet => (
                  <div key={pet.id} className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <Link href={`/admin/pets/${pet.id}`} className="flex items-center gap-2">
                      <BreedIcon breed={pet.breed} className="h-8 w-8" />
                      <div>
                        <p className="font-medium text-sm">{pet.name}</p>
                        <p className="text-xs text-muted-foreground">{pet.breed}</p>
                      </div>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => checkoutMutation.mutate({ petId: pet.id })} className="h-7">
                      <LogOut className="h-3 w-3 mr-1" /> Sair
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Disponíveis */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                Disponíveis
                <Badge variant="secondary" className="ml-auto">{groupedByStatus.available.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {groupedByStatus.available.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Todos os pets estão na creche!</p>
              ) : (
                groupedByStatus.available.map(pet => (
                  <div key={pet.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <Link href={`/admin/pets/${pet.id}`} className="flex items-center gap-2">
                      <BreedIcon breed={pet.breed} className="h-8 w-8" />
                      <div>
                        <p className="font-medium text-sm">{pet.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{pet.credits} créditos</span>
                          {(pet.credits || 0) <= 3 && (
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                          )}
                        </div>
                      </div>
                    </Link>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => checkinMutation.mutate({ petId: pet.id })} 
                      className="h-7"
                      disabled={(pet.credits || 0) === 0}
                    >
                      <LogIn className="h-3 w-3 mr-1" /> Entrar
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Pendentes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                Pendentes de Aprovação
                <Badge variant="secondary" className="ml-auto">{groupedByStatus.pending.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {groupedByStatus.pending.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum pet pendente</p>
              ) : (
                groupedByStatus.pending.map(pet => (
                  <div key={pet.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2">
                      <BreedIcon breed={pet.breed} className="h-8 w-8" />
                      <div>
                        <p className="font-medium text-sm">{pet.name}</p>
                        <p className="text-xs text-muted-foreground">{pet.breed}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => approveMutation.mutate({ id: pet.id })} className="h-7 bg-green-500 hover:bg-green-600">
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate({ id: pet.id })} className="h-7">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {filteredPets.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Dog className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhum pet encontrado</h3>
            <p className="text-muted-foreground mt-1">Tente ajustar os filtros ou cadastre um novo pet</p>
            <Button onClick={() => setIsCreateOpen(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" /> Cadastrar Pet
            </Button>
          </div>
        </Card>
      )}

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
                  <Input id="edit-weight" name="weight" type="number" step="0.1" defaultValue={selectedPet.weight ? selectedPet.weight / 1000 : ""} />
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
    </div>
  );
}
