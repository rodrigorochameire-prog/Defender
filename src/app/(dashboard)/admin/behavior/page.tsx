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
  Brain,
  Smile,
  Frown,
  Zap,
  Heart,
  Dog,
  Calendar,
  BarChart3,
  TrendingUp,
  PieChart,
  ListFilter,
  Filter,
  Eye,
  Upload,
  Image,
  FileText,
  Video,
  Paperclip,
  X,
  Loader2,
  Users,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { BreedIcon } from "@/components/breed-icons";
import { PetAvatar } from "@/components/pet-avatar";
import { toast } from "sonner";
import { BehaviorSkeleton } from "@/components/shared/skeletons";
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

const NEUTRAL_COLORS = ["#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

const socializationOptions = [
  { value: "excellent", label: "Excelente", color: "text-green-600", score: 4 },
  { value: "good", label: "Bom", color: "text-blue-600", score: 3 },
  { value: "moderate", label: "Moderado", color: "text-yellow-600", score: 2 },
  { value: "poor", label: "Ruim", color: "text-red-600", score: 1 },
];

const energyOptions = [
  { value: "high", label: "Alta", color: "text-orange-600", score: 3 },
  { value: "normal", label: "Normal", color: "text-blue-600", score: 2 },
  { value: "low", label: "Baixa", color: "text-gray-600", score: 1 },
];

const obedienceOptions = [
  { value: "excellent", label: "Excelente", color: "text-green-600", score: 3 },
  { value: "good", label: "Boa", color: "text-blue-600", score: 2 },
  { value: "needs_work", label: "Precisa Melhorar", color: "text-yellow-600", score: 1 },
];

const anxietyOptions = [
  { value: "none", label: "Nenhuma", color: "text-green-600", score: 4 },
  { value: "mild", label: "Leve", color: "text-yellow-600", score: 3 },
  { value: "moderate", label: "Moderada", color: "text-orange-600", score: 2 },
  { value: "severe", label: "Severa", color: "text-red-600", score: 1 },
];

const aggressionOptions = [
  { value: "none", label: "Nenhuma", color: "text-green-600", score: 4 },
  { value: "mild", label: "Leve", color: "text-yellow-600", score: 3 },
  { value: "moderate", label: "Moderada", color: "text-orange-600", score: 2 },
  { value: "severe", label: "Severa", color: "text-red-600", score: 1 },
];

const activityOptions = [
  "Brincou com outros cães",
  "Brincou sozinho",
  "Explorou ambiente",
  "Nadou na piscina",
  "Descansou bastante",
  "Participou de atividade em grupo",
  "Correu no gramado",
  "Brincou de buscar",
];

const periodOptions = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Esta Semana" },
  { value: "month", label: "Este Mês" },
  { value: "custom", label: "Personalizado" },
];

export default function AdminBehavior() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("logs");
  
  // Filtros
  const [periodFilter, setPeriodFilter] = useState("week");
  const [customDate, setCustomDate] = useState(new Date().toISOString().split("T")[0]);
  const [petFilter, setPetFilter] = useState<string>("all");
  
  // Anexos
  const [attachments, setAttachments] = useState<File[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate date based on period filter
  const dateFilter = useMemo(() => {
    if (periodFilter === "custom") return customDate;
    if (periodFilter === "today") return new Date().toISOString().split("T")[0];
    return undefined; // For week/month, we get more data
  }, [periodFilter, customDate]);

  const { data: logs, isLoading, refetch } = trpc.behavior.list.useQuery({
    date: dateFilter,
    limit: 100,
  });

  const { data: allLogs } = trpc.behavior.list.useQuery({
    limit: 500,
  });

  const { data: pets } = trpc.pets.list.useQuery();

  // Filtrar logs por pet
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (petFilter === "all") return logs;
    return logs.filter(l => l.pet?.id === Number(petFilter));
  }, [logs, petFilter]);

  // Dados para infográficos
  const chartData = useMemo(() => {
    if (!allLogs) return { 
      socialization: [], energy: [], anxiety: [], byPet: [],
      radarData: [], timeline: [], alerts: 0
    };

    const socializationCount: Record<string, number> = {};
    const energyCount: Record<string, number> = {};
    const anxietyCount: Record<string, number> = {};
    const petCount: Record<string, number> = {};
    let alerts = 0;

    allLogs.forEach(log => {
      if (log.socialization) {
        socializationCount[log.socialization] = (socializationCount[log.socialization] || 0) + 1;
        if (log.socialization === "poor") alerts++;
      }
      if (log.energy) {
        energyCount[log.energy] = (energyCount[log.energy] || 0) + 1;
      }
      if (log.anxiety) {
        anxietyCount[log.anxiety] = (anxietyCount[log.anxiety] || 0) + 1;
        if (log.anxiety === "severe") alerts++;
      }
      if (log.aggression === "moderate" || log.aggression === "severe") alerts++;
      if (log.pet?.name) {
        petCount[log.pet.name] = (petCount[log.pet.name] || 0) + 1;
      }
    });

    const socialization = Object.entries(socializationCount).map(([key, value]) => ({
      name: socializationOptions.find(s => s.value === key)?.label || key,
      value
    }));

    const energy = Object.entries(energyCount).map(([key, value]) => ({
      name: energyOptions.find(e => e.value === key)?.label || key,
      value
    }));

    const anxiety = Object.entries(anxietyCount).map(([key, value]) => ({
      name: anxietyOptions.find(a => a.value === key)?.label || key,
      value
    }));

    const byPet = Object.entries(petCount)
      .map(([name, value]) => ({ name: name.length > 10 ? name.slice(0, 10) + '...' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Radar data (média de comportamento)
    const calcAvg = (options: any[], counts: Record<string, number>) => {
      let total = 0;
      let sum = 0;
      Object.entries(counts).forEach(([key, count]) => {
        const opt = options.find(o => o.value === key);
        if (opt) {
          sum += opt.score * count;
          total += count;
        }
      });
      return total > 0 ? (sum / total / 4) * 100 : 50;
    };

    const radarData = [
      { subject: "Socialização", value: calcAvg(socializationOptions, socializationCount) },
      { subject: "Obediência", value: 70 }, // Placeholder
      { subject: "Energia", value: calcAvg(energyOptions.map(e => ({ ...e, score: e.score + 1 })), energyCount) },
      { subject: "Calma", value: calcAvg(anxietyOptions, anxietyCount) },
      { subject: "Docilidade", value: 80 }, // Placeholder
    ];

    // Timeline dos últimos 14 dias
    const timeline = Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      const dateStr = date.toISOString().split("T")[0];
      const dayLogs = allLogs.filter(l => 
        new Date(l.logDate).toISOString().split("T")[0] === dateStr
      );
      return {
        date: date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" }),
        registros: dayLogs.length,
      };
    });

    return { socialization, energy, anxiety, byPet, radarData, timeline, alerts };
  }, [allLogs]);

  const addLog = trpc.behavior.add.useMutation({
    onSuccess: () => {
      toast.success("Registro de comportamento salvo!");
      setIsAddDialogOpen(false);
      setAttachments([]);
      setSelectedActivities([]);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao salvar registro: " + error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const validFiles = Array.from(files).filter(file => {
      const isValid = file.type.startsWith("image/") || 
                      file.type === "application/pdf" ||
                      file.type.startsWith("video/");
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`Arquivo ${file.name} é muito grande (máx. 50MB)`);
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

  const toggleActivity = (activity: string) => {
    setSelectedActivities(prev => 
      prev.includes(activity) 
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const handleAddLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addLog.mutate({
      petId: Number(formData.get("petId")),
      logDate: formData.get("logDate") as string,
      socialization: formData.get("socialization") as any || undefined,
      energy: formData.get("energy") as any || undefined,
      obedience: formData.get("obedience") as any || undefined,
      anxiety: formData.get("anxiety") as any || undefined,
      aggression: formData.get("aggression") as any || undefined,
      notes: formData.get("notes") as string || undefined,
      activities: selectedActivities.length > 0 ? selectedActivities : undefined,
    });
  };

  if (isLoading) {
    return <BehaviorSkeleton />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Brain />
          </div>
          <div className="page-header-info">
            <h1>Comportamento</h1>
            <p>Registros de comportamento dos pets</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="btn-sm btn-primary">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Registro
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total de Registros</span>
            <Brain className="stat-card-icon muted" />
          </div>
          <div className="stat-card-value">{allLogs?.length || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Pets Avaliados</span>
            <Dog className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{chartData.byPet.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Esta Semana</span>
            <Calendar className="stat-card-icon green" />
          </div>
          <div className="stat-card-value">{filteredLogs.length}</div>
        </div>

        <div className={`stat-card ${chartData.alerts > 0 ? 'highlight' : ''}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Alertas</span>
            <AlertTriangle className={`stat-card-icon ${chartData.alerts > 0 ? 'amber' : 'muted'}`} />
          </div>
          <div className="stat-card-value">{chartData.alerts}</div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="logs" className="gap-2">
            <ListFilter className="h-4 w-4" />
            Registros
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Análises
          </TabsTrigger>
        </TabsList>

        {/* Tab: Registros */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Label>Período:</Label>
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periodOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {periodFilter === "custom" && (
                  <div className="flex items-center gap-2">
                    <Label>Data:</Label>
                    <Input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Label>Pet:</Label>
                  <Select value={petFilter} onValueChange={setPetFilter}>
                    <SelectTrigger className="w-40">
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
              </div>
            </CardContent>
          </Card>

          {/* Logs */}
          {!filteredLogs || filteredLogs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhum registro encontrado
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  Registrar comportamento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLogs.map((item) => {
                const socialOpt = socializationOptions.find(s => s.value === item.socialization);
                const energyOpt = energyOptions.find(e => e.value === item.energy);
                const anxietyOpt = anxietyOptions.find(a => a.value === item.anxiety);

                return (
                  <Card 
                    key={item.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => { setSelectedLog(item); setIsViewDialogOpen(true); }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <PetAvatar
                            photoUrl={item.pet?.photoUrl}
                            breed={item.pet?.breed}
                            name={item.pet?.name}
                            size="md"
                          />
                          <div>
                            <CardTitle className="text-base">{item.pet?.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {new Date(item.logDate).toLocaleDateString("pt-BR")}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {item.socialization && (
                          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline" className={socialOpt?.color}>
                              {socialOpt?.label}
                            </Badge>
                          </div>
                        )}
                        {item.energy && (
                          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50">
                            <Zap className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline" className={energyOpt?.color}>
                              {energyOpt?.label}
                            </Badge>
                          </div>
                        )}
                        {item.anxiety && (
                          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50">
                            <Frown className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline" className={anxietyOpt?.color}>
                              {anxietyOpt?.label}
                            </Badge>
                          </div>
                        )}
                      </div>
                      {item.activities && item.activities.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {item.activities.slice(0, 3).map((activity: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {activity}
                            </Badge>
                          ))}
                          {item.activities.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{item.activities.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      {item.notes && (
                        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                          {item.notes}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Por: {item.createdBy?.name}
                        </p>
                        {(item as any).attachments && (
                          <Badge variant="outline" className="text-xs">
                            <Paperclip className="h-3 w-3 mr-1" />
                            Anexos
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

        {/* Tab: Análises */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Radar de Comportamento */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Perfil Comportamental Geral
              </CardTitle>
              <CardDescription>Média de todos os pets avaliados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={chartData.radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" fontSize={11} stroke="#94a3b8" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                    <Radar
                      name="Comportamento"
                      dataKey="value"
                      stroke="#475569"
                      fill="#64748b"
                      fillOpacity={0.5}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos de Distribuição */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Socialização */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Socialização
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.socialization.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={chartData.socialization}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name }) => name}
                          labelLine={false}
                        >
                          {chartData.socialization.map((_, index) => (
                            <Cell key={`soc-${index}`} fill={NEUTRAL_COLORS[index % NEUTRAL_COLORS.length]} />
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

            {/* Energia */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Energia
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.energy.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={chartData.energy}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name }) => name}
                          labelLine={false}
                        >
                          {chartData.energy.map((_, index) => (
                            <Cell key={`energy-${index}`} fill={NEUTRAL_COLORS[index % NEUTRAL_COLORS.length]} />
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

            {/* Ansiedade */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Frown className="h-4 w-4" />
                  Ansiedade
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.anxiety.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={chartData.anxiety}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name }) => name}
                          labelLine={false}
                        >
                          {chartData.anxiety.map((_, index) => (
                            <Cell key={`anx-${index}`} fill={NEUTRAL_COLORS[index % NEUTRAL_COLORS.length]} />
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

          {/* Timeline e Por Pet */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Timeline */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Registros por Dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.timeline.length > 0 ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.timeline}>
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
                        <Bar dataKey="registros" name="Registros" fill="#64748b" radius={[4, 4, 0, 0]} />
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

            {/* Por Pet */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Dog className="h-5 w-5" />
                  Registros por Pet
                </CardTitle>
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
                        <Bar dataKey="value" name="Registros" fill="#475569" radius={[0, 4, 4, 0]} />
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
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleAddLog}>
            <DialogHeader>
              <DialogTitle>Registro de Comportamento</DialogTitle>
              <DialogDescription>
                Registre o comportamento do pet na creche
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="petId">Pet *</Label>
                  <Select name="petId" required>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Socialização</Label>
                  <Select name="socialization">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {socializationOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className={opt.color}>{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Energia</Label>
                  <Select name="energy">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {energyOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className={opt.color}>{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Obediência</Label>
                  <Select name="obedience">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {obedienceOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className={opt.color}>{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ansiedade</Label>
                  <Select name="anxiety">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {anxietyOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className={opt.color}>{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Agressividade</Label>
                <Select name="aggression">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {aggressionOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={opt.color}>{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Atividades */}
              <div className="space-y-2">
                <Label>Atividades Realizadas</Label>
                <div className="flex flex-wrap gap-2">
                  {activityOptions.map((activity) => (
                    <Badge
                      key={activity}
                      variant={selectedActivities.includes(activity) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleActivity(activity)}
                    >
                      {activity}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Como foi o dia do pet? Algum comportamento específico?"
                  rows={3}
                />
              </div>

              {/* Anexos */}
              <div className="space-y-2">
                <Label>Fotos, Vídeos e Documentos</Label>
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
                  <p className="text-xs text-muted-foreground">Fotos, vídeos ou PDFs (máx. 50MB)</p>
                </div>

                {attachments.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        {file.type.startsWith("image/") ? (
                          <Image className="h-4 w-4 text-blue-500" />
                        ) : file.type.startsWith("video/") ? (
                          <Video className="h-4 w-4 text-purple-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-red-500" />
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
              <Button type="submit" disabled={addLog.isPending}>
                {addLog.isPending ? (
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

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Detalhes do Comportamento
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
                    {new Date(selectedLog.logDate).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Socialização</p>
                  <p className={`font-medium ${socializationOptions.find(s => s.value === selectedLog.socialization)?.color}`}>
                    {socializationOptions.find(s => s.value === selectedLog.socialization)?.label || "N/A"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Energia</p>
                  <p className={`font-medium ${energyOptions.find(e => e.value === selectedLog.energy)?.color}`}>
                    {energyOptions.find(e => e.value === selectedLog.energy)?.label || "N/A"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Obediência</p>
                  <p className={`font-medium ${obedienceOptions.find(o => o.value === selectedLog.obedience)?.color}`}>
                    {obedienceOptions.find(o => o.value === selectedLog.obedience)?.label || "N/A"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Ansiedade</p>
                  <p className={`font-medium ${anxietyOptions.find(a => a.value === selectedLog.anxiety)?.color}`}>
                    {anxietyOptions.find(a => a.value === selectedLog.anxiety)?.label || "N/A"}
                  </p>
                </div>
              </div>

              {selectedLog.activities && selectedLog.activities.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Atividades</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedLog.activities.map((activity: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {activity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.notes && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{selectedLog.notes}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2 border-t">
                Registrado por {selectedLog.createdBy?.name}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
