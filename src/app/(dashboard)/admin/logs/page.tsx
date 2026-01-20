"use client";

import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Calendar,
  Smile,
  Frown,
  Meh,
  Dog,
  Home,
  Building2,
  BarChart3,
  TrendingUp,
  PieChart,
  Filter,
  Eye,
  Activity,
  Clock,
  ListFilter,
  CalendarDays,
  CalendarRange,
  FileText,
  Upload,
  Image,
  Paperclip,
  X,
  Loader2,
  Download,
  Trash2,
  Droplet,
  Utensils,
  Zap,
  AlertTriangle,
  Heart,
} from "lucide-react";
import { BreedIcon } from "@/components/breed-icons";
import { PetAvatar } from "@/components/pet-avatar";
import { toast } from "sonner";
import { LogsSkeleton } from "@/components/shared/skeletons";
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
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";

import {
  MOOD_STATUS,
  STOOL_QUALITY,
  URINE_QUALITY,
  PHYSICAL_INTEGRITY,
  NAP_QUALITY,
  GROUP_ROLE,
  ACTIVITIES_PERFORMED,
  CHECKOUT_OBSERVATIONS,
  APPETITE_STATUS,
  WATER_INTAKE,
} from "@/lib/constants/pet-options";

const NEUTRAL_COLORS = ["#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

const moodOptions = [
  { value: "happy", label: "Feliz", icon: Smile, color: "text-emerald-600 dark:text-emerald-400" },
  { value: "calm", label: "Calmo", icon: Meh, color: "text-sky-600 dark:text-sky-400" },
  { value: "playful", label: "Brincalhão", icon: Smile, color: "text-green-600" },
  { value: "anxious", label: "Ansioso", icon: Frown, color: "text-amber-600 dark:text-amber-400" },
  { value: "tired", label: "Cansado", icon: Meh, color: "text-muted-foreground" },
  { value: "agitated", label: "Agitado", icon: Frown, color: "text-primary" },
  { value: "fearful", label: "Medroso", icon: Frown, color: "text-orange-600" },
  { value: "aggressive", label: "Agressivo", icon: Frown, color: "text-red-700" },
  { value: "sick", label: "Doente", icon: Frown, color: "text-red-600" },
  { value: "apathetic", label: "Apático", icon: Meh, color: "text-gray-600" },
];

const stoolOptions = [
  { value: "normal", label: "Normal", color: "text-green-600" },
  { value: "soft", label: "Mole", color: "text-yellow-600" },
  { value: "hard", label: "Duro", color: "text-orange-600" },
  { value: "diarrhea", label: "Diarreia", color: "text-red-600" },
  { value: "bloody", label: "Com Sangue", color: "text-red-700" },
  { value: "mucus", label: "Com Muco", color: "text-amber-600" },
  { value: "none", label: "Não fez", color: "text-gray-500" },
];

// Opções detalhadas de qualidade fecal (Escala Bristol)
const stoolQualityOptions = STOOL_QUALITY.map(opt => ({
  value: opt.value,
  label: opt.label,
  color: opt.color === "green" ? "text-green-600" : 
         opt.color === "yellow" ? "text-yellow-600" : 
         opt.color === "orange" ? "text-orange-600" : 
         opt.color === "red" ? "text-red-600" : "text-gray-500",
  icon: opt.icon,
  description: opt.description,
}));

// Opções de urina
const urineQualityOptions = URINE_QUALITY.map(opt => ({
  value: opt.value,
  label: opt.label,
  color: opt.color === "green" ? "text-green-600" : 
         opt.color === "yellow" ? "text-yellow-600" : 
         opt.color === "orange" ? "text-orange-600" : 
         opt.color === "red" ? "text-red-600" : "text-gray-500",
  icon: opt.icon,
}));

// Opções de integridade física
const physicalIntegrityOptions = PHYSICAL_INTEGRITY.map(opt => ({
  value: opt.value,
  label: opt.label,
  color: opt.color === "green" ? "text-green-600" : 
         opt.color === "yellow" ? "text-yellow-600" : 
         opt.color === "orange" ? "text-orange-600" : 
         opt.color === "red" ? "text-red-600" : "text-gray-500",
  icon: opt.icon,
}));

// Opções de qualidade de descanso
const napQualityOptions = NAP_QUALITY.map(opt => ({
  value: opt.value,
  label: opt.label,
  color: opt.color === "green" ? "text-green-600" : 
         opt.color === "blue" ? "text-blue-600" : 
         opt.color === "orange" ? "text-orange-600" : "text-yellow-600",
  icon: opt.icon,
}));

// Opções de papel no grupo
const groupRoleOptions = GROUP_ROLE.map(opt => ({
  value: opt.value,
  label: opt.label,
  icon: opt.icon,
}));

// Opções de atividades
const activitiesOptions = ACTIVITIES_PERFORMED.map(opt => ({
  value: opt.value,
  label: opt.label,
  icon: opt.icon,
}));

// Opções de observações de checkout
const checkoutOptions = CHECKOUT_OBSERVATIONS.map(opt => ({
  value: opt.value,
  label: opt.label,
}));

const appetiteOptions = [
  { value: "excellent", label: "Excelente", color: "text-green-600" },
  { value: "good", label: "Bom", color: "text-emerald-600" },
  { value: "moderate", label: "Moderado", color: "text-yellow-600" },
  { value: "poor", label: "Ruim", color: "text-orange-600" },
  { value: "none", label: "Não comeu", color: "text-red-600" },
  { value: "stimulated", label: "Precisou de estímulo", color: "text-yellow-600" },
];

const energyOptions = [
  { value: "high", label: "Alta", color: "text-green-600" },
  { value: "normal", label: "Normal", color: "text-blue-600" },
  { value: "low", label: "Baixa", color: "text-yellow-600" },
  { value: "very_low", label: "Muito Baixa", color: "text-red-600" },
];

const waterOptions = [
  { value: "normal", label: "Normal", color: "text-blue-600" },
  { value: "increased", label: "Aumentado", color: "text-green-600" },
  { value: "decreased", label: "Reduzido", color: "text-yellow-600" },
  { value: "none", label: "Não bebeu", color: "text-red-600" },
];

const logTypeOptions = [
  { value: "general", label: "Geral", icon: ListFilter },
  { value: "health", label: "Saúde", icon: Heart },
  { value: "feeding", label: "Alimentação", icon: Utensils },
  { value: "exercise", label: "Exercício", icon: Zap },
  { value: "grooming", label: "Higiene", icon: Droplet },
  { value: "incident", label: "Incidente", icon: AlertTriangle },
];

const periodOptions = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "week", label: "Esta Semana" },
  { value: "month", label: "Este Mês" },
  { value: "year", label: "Este Ano" },
  { value: "custom", label: "Personalizado" },
];

export default function AdminLogs() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  
  // Filtros avançados
  const [periodFilter, setPeriodFilter] = useState<string>("today");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "home" | "daycare">("all");
  const [petFilter, setPetFilter] = useState<string>("all");
  const [logTypeFilter, setLogTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("logs");
  
  // Attachments
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate date range based on period filter
  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (periodFilter) {
      case "today":
        return { start: today.toISOString().split("T")[0], end: today.toISOString().split("T")[0] };
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday.toISOString().split("T")[0], end: yesterday.toISOString().split("T")[0] };
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return { start: weekStart.toISOString().split("T")[0], end: today.toISOString().split("T")[0] };
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart.toISOString().split("T")[0], end: today.toISOString().split("T")[0] };
      case "year":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { start: yearStart.toISOString().split("T")[0], end: today.toISOString().split("T")[0] };
      case "custom":
        return { start: customStartDate, end: customEndDate || customStartDate };
      default:
        return { start: today.toISOString().split("T")[0], end: today.toISOString().split("T")[0] };
    }
  }, [periodFilter, customStartDate, customEndDate]);

  const { data: logs, isLoading, refetch } = trpc.logs.list.useQuery({
    source: sourceFilter === "all" ? undefined : sourceFilter,
    date: dateRange.start,
    limit: 200,
  });

  const { data: allLogs } = trpc.logs.list.useQuery({
    limit: 500,
  });

  const { data: pets } = trpc.pets.list.useQuery();
  const { data: stats } = trpc.logs.stats.useQuery();

  // Filtrar logs por pet e tipo
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(item => {
      const matchesPet = petFilter === "all" || item.pet?.id === Number(petFilter);
      const matchesType = logTypeFilter === "all" || (item.log as any).logType === logTypeFilter;
      return matchesPet && matchesType;
    });
  }, [logs, petFilter, logTypeFilter]);

  // Dados para infográficos avançados
  const chartData = useMemo(() => {
    if (!allLogs) return { 
      mood: [], stool: [], appetite: [], timeline: [], byPet: [], 
      energy: [], water: [], healthAlerts: 0, byLogType: [],
      weeklyTrend: [], monthlyComparison: []
    };

    // Contagens
    const moodCount: Record<string, number> = {};
    const stoolCount: Record<string, number> = {};
    const appetiteCount: Record<string, number> = {};
    const petCount: Record<string, number> = {};
    const energyCount: Record<string, number> = {};
    const waterCount: Record<string, number> = {};
    const logTypeCount: Record<string, number> = {};
    let healthAlerts = 0;

    allLogs.forEach(item => {
      if (item.log.mood) {
        moodCount[item.log.mood] = (moodCount[item.log.mood] || 0) + 1;
      }
      if (item.log.stool) {
        stoolCount[item.log.stool] = (stoolCount[item.log.stool] || 0) + 1;
        if (["diarrhea", "bloody", "mucus"].includes(item.log.stool)) {
          healthAlerts++;
        }
      }
      if (item.log.appetite) {
        appetiteCount[item.log.appetite] = (appetiteCount[item.log.appetite] || 0) + 1;
        if (item.log.appetite === "none" || item.log.appetite === "poor") {
          healthAlerts++;
        }
      }
      if (item.pet?.name) {
        petCount[item.pet.name] = (petCount[item.pet.name] || 0) + 1;
      }
      // Log type
      const logType = (item.log as any).logType || "general";
      logTypeCount[logType] = (logTypeCount[logType] || 0) + 1;
    });

    const moodLabels: Record<string, string> = {
      happy: "Feliz", calm: "Calmo", anxious: "Ansioso", tired: "Cansado", agitated: "Agitado", sick: "Doente"
    };
    const stoolLabels: Record<string, string> = {
      normal: "Normal", soft: "Mole", hard: "Duro", diarrhea: "Diarreia", bloody: "Sangue", mucus: "Muco", none: "Não fez"
    };
    const appetiteLabels: Record<string, string> = {
      excellent: "Excelente", good: "Bom", moderate: "Moderado", poor: "Ruim", none: "Não comeu"
    };
    const logTypeLabels: Record<string, string> = {
      general: "Geral", health: "Saúde", feeding: "Alimentação", exercise: "Exercício", grooming: "Higiene", incident: "Incidente"
    };

    const mood = Object.entries(moodCount).map(([key, value]) => ({
      name: moodLabels[key] || key, value
    }));

    const stool = Object.entries(stoolCount).map(([key, value]) => ({
      name: stoolLabels[key] || key, value
    }));

    const appetite = Object.entries(appetiteCount).map(([key, value]) => ({
      name: appetiteLabels[key] || key, value
    }));

    const byPet = Object.entries(petCount)
      .map(([name, value]) => ({ name: name.length > 10 ? name.slice(0, 10) + '...' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const byLogType = Object.entries(logTypeCount).map(([key, value]) => ({
      name: logTypeLabels[key] || key, value
    }));

    // Timeline dos últimos 14 dias
    const timeline = Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      const dateStr = date.toISOString().split("T")[0];
      const dayLogs = allLogs.filter(l => 
        new Date(l.log.logDate).toISOString().split("T")[0] === dateStr
      );
      return {
        date: date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" }),
        fullDate: dateStr,
        logs: dayLogs.length,
        creche: dayLogs.filter(l => l.log.source === "daycare").length,
        casa: dayLogs.filter(l => l.log.source === "home").length,
      };
    });

    // Weekly trend (últimas 4 semanas)
    const weeklyTrend = Array.from({ length: 4 }, (_, i) => {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      
      const weekLogs = allLogs.filter(l => {
        const logDate = new Date(l.log.logDate);
        return logDate >= weekStart && logDate <= weekEnd;
      });
      
      return {
        week: `Sem ${4 - i}`,
        total: weekLogs.length,
        creche: weekLogs.filter(l => l.log.source === "daycare").length,
        casa: weekLogs.filter(l => l.log.source === "home").length,
      };
    }).reverse();

    return { 
      mood, stool, appetite, timeline, byPet, 
      energy: [], water: [], healthAlerts, byLogType,
      weeklyTrend, monthlyComparison: []
    };
  }, [allLogs]);

  const addLog = trpc.logs.add.useMutation({
    onSuccess: () => {
      toast.success("Log registrado com sucesso!");
      setIsAddDialogOpen(false);
      setAttachments([]);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao registrar log: " + error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const validFiles = Array.from(files).filter(file => {
      const isValid = file.type.startsWith("image/") || 
                      file.type === "application/pdf" ||
                      file.type.startsWith("video/");
      if (!isValid) {
        toast.error(`Arquivo ${file.name} não é suportado`);
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Arquivo ${file.name} é muito grande (máx. 10MB)`);
        return false;
      }
      return isValid;
    });
    
    setAttachments(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Processar campos multi-select (checkboxes)
    const activitiesPerformed: string[] = [];
    const checkoutObservations: string[] = [];
    
    formData.getAll("activitiesPerformed").forEach(v => {
      if (v) activitiesPerformed.push(v as string);
    });
    formData.getAll("checkoutObservations").forEach(v => {
      if (v) checkoutObservations.push(v as string);
    });
    
    // TODO: Upload attachments first if any
    
    addLog.mutate({
      petId: Number(formData.get("petId")),
      logDate: new Date(formData.get("logDate") as string),
      source: formData.get("source") as "home" | "daycare",
      mood: formData.get("mood") as any || undefined,
      stool: formData.get("stool") as any || undefined,
      appetite: formData.get("appetite") as any || undefined,
      energy: formData.get("energy") as any || undefined,
      waterIntake: formData.get("waterIntake") as any || undefined,
      // Novos campos estruturados
      stoolQuality: formData.get("stoolQuality") as any || undefined,
      urineQuality: formData.get("urineQuality") as any || undefined,
      physicalIntegrity: formData.get("physicalIntegrity") as any || undefined,
      physicalNotes: formData.get("physicalNotes") as string || undefined,
      napQuality: formData.get("napQuality") as any || undefined,
      groupRole: formData.get("groupRole") as any || undefined,
      bestFriendPetId: formData.get("bestFriendPetId") ? Number(formData.get("bestFriendPetId")) : undefined,
      activitiesPerformed: activitiesPerformed.length > 0 ? activitiesPerformed : undefined,
      checkoutObservations: checkoutObservations.length > 0 ? checkoutObservations : undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  if (isLoading) {
    return <LogsSkeleton />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Calendar />
          </div>
          <div className="page-header-info">
            <h1>Logs Diários</h1>
            <p>Registros de saúde e comportamento</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="btn-sm btn-primary">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Log
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total de Logs</span>
            <Calendar className="stat-card-icon muted" />
          </div>
          <div className="stat-card-value">{stats?.total || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Logs de Hoje</span>
            <Smile className="stat-card-icon green" />
          </div>
          <div className="stat-card-value">{stats?.today || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Creche Hoje</span>
            <Building2 className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{stats?.daycareToday || 0}</div>
        </div>

        <div className={`stat-card ${chartData.healthAlerts > 0 ? 'highlight' : ''}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Alertas de Saúde</span>
            <AlertTriangle className={`stat-card-icon ${chartData.healthAlerts > 0 ? 'amber' : 'muted'}`} />
          </div>
          <div className="stat-card-value">{chartData.healthAlerts}</div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="logs" className="gap-2">
            <ListFilter className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Análises
          </TabsTrigger>
        </TabsList>

        {/* Tab: Logs */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filtros Avançados */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros Avançados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Período */}
                <div className="space-y-2">
                  <Label className="text-xs">Período</Label>
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="h-9">
                      <CalendarDays className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periodOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data Início (para período personalizado) */}
                {periodFilter === "custom" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">Data Início</Label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Data Fim</Label>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </>
                )}

                {/* Local */}
                <div className="space-y-2">
                  <Label className="text-xs">Local</Label>
                  <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
                    <SelectTrigger className="h-9">
                      <Home className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="daycare">
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" /> Creche
                        </span>
                      </SelectItem>
                      <SelectItem value="home">
                        <span className="flex items-center gap-2">
                          <Home className="h-4 w-4" /> Casa
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pet */}
                <div className="space-y-2">
                  <Label className="text-xs">Pet</Label>
                  <Select value={petFilter} onValueChange={setPetFilter}>
                    <SelectTrigger className="h-9">
                      <Dog className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Pets</SelectItem>
                      {pets?.filter(p => p.approvalStatus === "approved").map(pet => (
                        <SelectItem key={pet.id} value={String(pet.id)}>{pet.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de Log */}
                <div className="space-y-2">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={logTypeFilter} onValueChange={setLogTypeFilter}>
                    <SelectTrigger className="h-9">
                      <ListFilter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      {logTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <opt.icon className="h-4 w-4" />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs List */}
          {!filteredLogs || filteredLogs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Dog className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Nenhum log encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Ajuste os filtros ou registre o primeiro log
                </p>
                <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Log
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLogs.map((item) => {
                const moodOption = moodOptions.find(m => m.value === item.log.mood);
                const MoodIcon = moodOption?.icon || Meh;
                const stoolOption = stoolOptions.find(s => s.value === item.log.stool);
                const appetiteOption = appetiteOptions.find(a => a.value === item.log.appetite);
                
                return (
                  <Card 
                    key={item.log.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => { setSelectedLog(item); setIsViewDialogOpen(true); }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PetAvatar
                            photoUrl={item.pet?.photoUrl}
                            breed={item.pet?.breed}
                            name={item.pet?.name}
                            size="md"
                          />
                          <div>
                            <CardTitle className="text-base">{item.pet?.name || "Pet"}</CardTitle>
                            <CardDescription className="text-xs">
                              {new Date(item.log.logDate).toLocaleDateString("pt-BR")}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={item.log.source === "daycare" ? "default" : "secondary"}>
                          {item.log.source === "daycare" ? (
                            <><Building2 className="h-3 w-3 mr-1" /> Creche</>
                          ) : (
                            <><Home className="h-3 w-3 mr-1" /> Casa</>
                          )}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <MoodIcon className={`h-4 w-4 mx-auto mb-1 ${moodOption?.color || ""}`} />
                          <p className="text-xs text-muted-foreground">
                            {moodOption?.label || "N/A"}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="font-medium text-xs">Fezes</p>
                          <p className={`text-xs ${stoolOption?.color || "text-muted-foreground"}`}>
                            {stoolOption?.label || "N/A"}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="font-medium text-xs">Apetite</p>
                          <p className={`text-xs ${appetiteOption?.color || "text-muted-foreground"}`}>
                            {appetiteOption?.label || "N/A"}
                          </p>
                        </div>
                      </div>
                      {item.log.notes && (
                        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                          {item.log.notes}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Por: {item.createdBy?.name}
                        </p>
                        {(item.log as any).attachments && (
                          <Badge variant="outline" className="text-xs">
                            <Paperclip className="h-3 w-3 mr-1" />
                            {JSON.parse((item.log as any).attachments || "[]").length} anexos
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab: Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Timeline de Logs */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Atividade nos Últimos 14 Dias
              </CardTitle>
              <CardDescription>Logs registrados por dia e fonte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Area type="monotone" dataKey="creche" name="Creche" stackId="1" stroke="#475569" fill="#475569" fillOpacity={0.8} />
                    <Area type="monotone" dataKey="casa" name="Casa" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.8} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos de Distribuição */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Humor */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Smile className="h-4 w-4" />
                  Humor
                </CardTitle>
                <CardDescription className="text-xs">Distribuição de humores</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.mood.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={chartData.mood}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name }) => name}
                          labelLine={false}
                        >
                          {chartData.mood.map((_, index) => (
                            <Cell key={`mood-${index}`} fill={NEUTRAL_COLORS[index % NEUTRAL_COLORS.length]} />
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

            {/* Fezes */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Fezes
                </CardTitle>
                <CardDescription className="text-xs">Consistência das fezes</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.stool.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={chartData.stool}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name }) => name}
                          labelLine={false}
                        >
                          {chartData.stool.map((_, index) => (
                            <Cell key={`stool-${index}`} fill={NEUTRAL_COLORS[index % NEUTRAL_COLORS.length]} />
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

            {/* Apetite */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  Apetite
                </CardTitle>
                <CardDescription className="text-xs">Nível de apetite</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.appetite.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={chartData.appetite}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name }) => name}
                          labelLine={false}
                        >
                          {chartData.appetite.map((_, index) => (
                            <Cell key={`appetite-${index}`} fill={NEUTRAL_COLORS[index % NEUTRAL_COLORS.length]} />
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

          {/* Logs por Pet e Tendência Semanal */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Logs por Pet */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Logs por Pet
                </CardTitle>
                <CardDescription>Pets com mais registros</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.byPet.length > 0 ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.byPet} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                        <YAxis type="category" dataKey="name" width={80} stroke="#94a3b8" fontSize={11} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="value" name="Logs" fill="#64748b" radius={[0, 4, 4, 0]} />
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

            {/* Tendência Semanal */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarRange className="h-5 w-5" />
                  Tendência Semanal
                </CardTitle>
                <CardDescription>Comparativo das últimas 4 semanas</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.weeklyTrend.length > 0 ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.weeklyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }} 
                        />
                        <Legend />
                        <Bar dataKey="creche" name="Creche" fill="#475569" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="casa" name="Casa" fill="#94a3b8" radius={[4, 4, 0, 0]} />
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
          </div>

          {/* Por Tipo de Log */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ListFilter className="h-5 w-5" />
                Logs por Tipo
              </CardTitle>
              <CardDescription>Distribuição por categoria de log</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {logTypeOptions.map(opt => {
                  const count = chartData.byLogType.find(t => t.name === opt.label)?.value || 0;
                  const total = chartData.byLogType.reduce((sum, t) => sum + t.value, 0);
                  const percent = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
                  return (
                    <div key={opt.value} className="p-4 rounded-lg bg-muted/50 text-center">
                      <opt.icon className="h-6 w-6 mx-auto mb-2 text-slate-500" />
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{opt.label}</p>
                      <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-500 rounded-full transition-all" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Log Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleAddLog}>
            <DialogHeader>
              <DialogTitle>Novo Log Diário</DialogTitle>
              <DialogDescription>
                Registre o estado de saúde e comportamento do pet
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Pet e Data */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="petId">Pet *</Label>
                  <Select name="petId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets?.filter(p => p.approvalStatus === "approved").map((pet) => (
                        <SelectItem key={pet.id} value={String(pet.id)}>
                          {pet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logDate">Data *</Label>
                  <Input
                    id="logDate"
                    name="logDate"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </div>

              {/* Fonte e Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Local *</Label>
                  <Select name="source" defaultValue="daycare">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daycare">
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" /> Creche
                        </span>
                      </SelectItem>
                      <SelectItem value="home">
                        <span className="flex items-center gap-2">
                          <Home className="h-4 w-4" /> Casa
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logType">Tipo</Label>
                  <Select name="logType" defaultValue="general">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {logTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <opt.icon className="h-4 w-4" /> {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Humor e Energia */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mood">Humor</Label>
                  <Select name="mood">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {moodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <option.icon className={`h-4 w-4 ${option.color}`} />
                            {option.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="energy">Energia</Label>
                  <Select name="energy">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {energyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className={option.color}>{option.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fezes e Apetite */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stool">Fezes</Label>
                  <Select name="stool">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {stoolOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className={option.color}>{option.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appetite">Apetite</Label>
                  <Select name="appetite">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {appetiteOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className={option.color}>{option.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Água */}
              <div className="space-y-2">
                <Label htmlFor="waterIntake">Consumo de Água</Label>
                <Select name="waterIntake">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {waterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className={option.color}>{option.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* === SEÇÃO: BEM-ESTAR FÍSICO (NOVOS CAMPOS) === */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Bem-Estar Físico (Check-out)</h4>
                
                {/* Qualidade Fecal e Urinária */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stoolQuality">Qualidade Fecal (Bristol)</Label>
                    <Select name="stoolQuality">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {stoolQualityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>
                              {option.icon} {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="urineQuality">Qualidade Urinária</Label>
                    <Select name="urineQuality">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {urineQualityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>
                              {option.icon} {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Integridade Física e Descanso */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="physicalIntegrity">Integridade Física</Label>
                    <Select name="physicalIntegrity">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {physicalIntegrityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>
                              {option.icon} {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="napQuality">Qualidade do Descanso</Label>
                    <Select name="napQuality">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {napQualityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>
                              {option.icon} {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Notas de integridade física */}
                <div className="space-y-2 mt-4">
                  <Label htmlFor="physicalNotes">Descrição de Marcas/Lesões (se houver)</Label>
                  <Input
                    id="physicalNotes"
                    name="physicalNotes"
                    placeholder="Descreva qualquer marca ou lesão observada..."
                  />
                </div>
              </div>

              {/* === SEÇÃO: DINÂMICA SOCIAL === */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Dinâmica Social</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="groupRole">Papel no Grupo</Label>
                    <Select name="groupRole">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {groupRoleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.icon} {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bestFriendPetId">Melhor Amigo do Dia</Label>
                    <Select name="bestFriendPetId">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {pets?.filter(p => p.approvalStatus === "approved").map((pet) => (
                          <SelectItem key={pet.id} value={String(pet.id)}>
                            {pet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* === SEÇÃO: ATIVIDADES REALIZADAS === */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Atividades Realizadas</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {activitiesOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent cursor-pointer">
                      <input
                        type="checkbox"
                        name="activitiesPerformed"
                        value={option.value}
                        className="rounded"
                      />
                      <span className="text-sm">{option.icon} {option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* === SEÇÃO: OBSERVAÇÕES DE CHECK-OUT === */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Resumo do Dia</h4>
                <div className="grid grid-cols-2 gap-2">
                  {checkoutOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent cursor-pointer">
                      <input
                        type="checkbox"
                        name="checkoutObservations"
                        value={option.value}
                        className="rounded"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2 mt-4">
                <Label htmlFor="notes">Observações Adicionais</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Notas adicionais sobre o dia do pet..."
                  rows={3}
                />
              </div>

              {/* Anexos */}
              <div className="space-y-2">
                <Label>Anexos (Fotos, Documentos)</Label>
                <div 
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 cursor-pointer transition-all hover:border-primary/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    onChange={handleFileChange} 
                    accept="image/*,application/pdf,video/*" 
                    multiple
                    className="hidden" 
                  />
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Clique para adicionar arquivos</p>
                  <p className="text-xs text-muted-foreground">Imagens, PDFs ou vídeos (máx. 10MB)</p>
                </div>

                {attachments.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        {file.type.startsWith("image/") ? (
                          <Image className="h-4 w-4 text-blue-500" />
                        ) : file.type === "application/pdf" ? (
                          <FileText className="h-4 w-4 text-red-500" />
                        ) : (
                          <Paperclip className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => { e.stopPropagation(); removeAttachment(index); }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addLog.isPending || uploading}>
                {addLog.isPending || uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Log Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dog className="h-5 w-5" />
              Detalhes do Log
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <PetAvatar
                  photoUrl={selectedLog.pet?.photoUrl}
                  breed={selectedLog.pet?.breed}
                  name={selectedLog.pet?.name}
                  size="xl"
                />
                <div>
                  <h3 className="font-semibold text-lg">{selectedLog.pet?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedLog.log.logDate).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}
                  </p>
                  <Badge variant={selectedLog.log.source === "daycare" ? "default" : "secondary"} className="mt-1">
                    {selectedLog.log.source === "daycare" ? "Creche" : "Casa"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Humor</p>
                  <p className="font-medium">
                    {moodOptions.find(m => m.value === selectedLog.log.mood)?.label || "N/A"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Energia</p>
                  <p className="font-medium">
                    {energyOptions.find(e => e.value === (selectedLog.log as any).energy)?.label || "N/A"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Fezes</p>
                  <p className={`font-medium ${stoolOptions.find(s => s.value === selectedLog.log.stool)?.color}`}>
                    {stoolOptions.find(s => s.value === selectedLog.log.stool)?.label || "N/A"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Apetite</p>
                  <p className={`font-medium ${appetiteOptions.find(a => a.value === selectedLog.log.appetite)?.color}`}>
                    {appetiteOptions.find(a => a.value === selectedLog.log.appetite)?.label || "N/A"}
                  </p>
                </div>
              </div>

              {selectedLog.log.notes && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{selectedLog.log.notes}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2 border-t">
                Registrado por {selectedLog.createdBy?.name} em{" "}
                {new Date(selectedLog.log.createdAt).toLocaleString("pt-BR")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
