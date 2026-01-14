"use client";

import { useState, useMemo } from "react";
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
  ListFilter
} from "lucide-react";
import { BreedIcon } from "@/components/breed-icons";
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
} from "recharts";

const NEUTRAL_COLORS = ["#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

const moodOptions = [
  { value: "happy", label: "Feliz", icon: Smile, color: "text-emerald-600 dark:text-emerald-400" },
  { value: "calm", label: "Calmo", icon: Meh, color: "text-sky-600 dark:text-sky-400" },
  { value: "anxious", label: "Ansioso", icon: Frown, color: "text-amber-600 dark:text-amber-400" },
  { value: "tired", label: "Cansado", icon: Meh, color: "text-muted-foreground" },
  { value: "agitated", label: "Agitado", icon: Frown, color: "text-primary" },
];

const stoolOptions = [
  { value: "normal", label: "Normal" },
  { value: "soft", label: "Mole" },
  { value: "hard", label: "Duro" },
  { value: "diarrhea", label: "Diarreia" },
  { value: "none", label: "Não fez" },
];

const appetiteOptions = [
  { value: "good", label: "Bom" },
  { value: "moderate", label: "Moderado" },
  { value: "poor", label: "Ruim" },
  { value: "none", label: "Não comeu" },
];

export default function AdminLogs() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [sourceFilter, setSourceFilter] = useState<"all" | "home" | "daycare">("all");
  const [activeTab, setActiveTab] = useState("logs");
  const [petFilter, setPetFilter] = useState<string>("all");

  const { data: logs, isLoading, refetch } = trpc.logs.list.useQuery({
    source: sourceFilter === "all" ? undefined : sourceFilter,
    date: selectedDate,
    limit: 50,
  });

  const { data: recentLogs } = trpc.logs.list.useQuery({
    limit: 100,
  });

  const { data: pets } = trpc.pets.list.useQuery();
  const { data: stats } = trpc.logs.stats.useQuery();

  // Dados para infográficos
  const chartData = useMemo(() => {
    if (!recentLogs) return { mood: [], stool: [], appetite: [], timeline: [], byPet: [] };

    // Contagem por humor
    const moodCount: Record<string, number> = {};
    const stoolCount: Record<string, number> = {};
    const appetiteCount: Record<string, number> = {};
    const petCount: Record<string, number> = {};

    recentLogs.forEach(item => {
      if (item.log.mood) {
        moodCount[item.log.mood] = (moodCount[item.log.mood] || 0) + 1;
      }
      if (item.log.stool) {
        stoolCount[item.log.stool] = (stoolCount[item.log.stool] || 0) + 1;
      }
      if (item.log.appetite) {
        appetiteCount[item.log.appetite] = (appetiteCount[item.log.appetite] || 0) + 1;
      }
      if (item.pet?.name) {
        petCount[item.pet.name] = (petCount[item.pet.name] || 0) + 1;
      }
    });

    const moodLabels: Record<string, string> = {
      happy: "Feliz", calm: "Calmo", anxious: "Ansioso", tired: "Cansado", agitated: "Agitado"
    };
    const stoolLabels: Record<string, string> = {
      normal: "Normal", soft: "Mole", hard: "Duro", diarrhea: "Diarreia", none: "Não fez"
    };
    const appetiteLabels: Record<string, string> = {
      good: "Bom", moderate: "Moderado", poor: "Ruim", none: "Não comeu"
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
      .slice(0, 6);

    // Timeline dos últimos 7 dias
    const timeline = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split("T")[0];
      const dayLogs = recentLogs.filter(l => 
        new Date(l.log.logDate).toISOString().split("T")[0] === dateStr
      );
      return {
        date: date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" }),
        logs: dayLogs.length,
        creche: dayLogs.filter(l => l.log.source === "daycare").length,
        casa: dayLogs.filter(l => l.log.source === "home").length,
      };
    });

    return { mood, stool, appetite, timeline, byPet };
  }, [recentLogs]);

  // Filtrar logs por pet
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (petFilter === "all") return logs;
    return logs.filter(l => l.pet?.id === Number(petFilter));
  }, [logs, petFilter]);

  const addLog = trpc.logs.add.useMutation({
    onSuccess: () => {
      toast.success("Log registrado com sucesso!");
      setIsAddDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao registrar log: " + error.message);
    },
  });

  const handleAddLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addLog.mutate({
      petId: Number(formData.get("petId")),
      logDate: new Date(formData.get("logDate") as string),
      source: formData.get("source") as "home" | "daycare",
      mood: formData.get("mood") as any || undefined,
      stool: formData.get("stool") as any || undefined,
      appetite: formData.get("appetite") as any || undefined,
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

      {/* Stats */}
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
      </div>

      {/* Tabs */}
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
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Label>Data:</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>Fonte:</Label>
                  <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="daycare">Creche</SelectItem>
                      <SelectItem value="home">Casa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

          {/* Logs List */}
          {!filteredLogs || filteredLogs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Dog className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Nenhum log encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Registre o primeiro log do dia
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLogs.map((item) => {
            const moodOption = moodOptions.find(m => m.value === item.log.mood);
            const MoodIcon = moodOption?.icon || Meh;
            
            return (
              <Card key={item.log.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.pet?.photoUrl ? (
                        <img 
                          src={item.pet.photoUrl} 
                          alt={item.pet.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <BreedIcon breed={item.pet?.breed} className="h-5 w-5 text-slate-500" />
                        </div>
                      )}
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
                      <p className="text-xs text-muted-foreground">
                        {stoolOptions.find(s => s.value === item.log.stool)?.label || "N/A"}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="font-medium text-xs">Apetite</p>
                      <p className="text-xs text-muted-foreground">
                        {appetiteOptions.find(a => a.value === item.log.appetite)?.label || "N/A"}
                      </p>
                    </div>
                  </div>
                  {item.log.notes && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {item.log.notes}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Por: {item.createdBy?.name}
                  </p>
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
                Atividade nos Últimos 7 Dias
              </CardTitle>
              <CardDescription>Logs registrados por dia e fonte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="creche" name="Creche" fill="#475569" stackId="a" />
                    <Bar dataKey="casa" name="Casa" fill="#94a3b8" stackId="a" />
                  </BarChart>
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
                <CardDescription className="text-xs">Distribuição de humores registrados</CardDescription>
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
                  <Dog className="h-4 w-4" />
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
                <div className="h-[250px]">
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
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Log Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddLog}>
            <DialogHeader>
              <DialogTitle>Novo Log Diário</DialogTitle>
              <DialogDescription>
                Registre o estado de saúde do pet
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="petId">Pet *</Label>
                <Select name="petId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets?.map((pet) => (
                      <SelectItem key={pet.id} value={String(pet.id)}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="source">Fonte *</Label>
                  <Select name="source" defaultValue="daycare">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daycare">Creche</SelectItem>
                      <SelectItem value="home">Casa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mood">Humor</Label>
                <Select name="mood">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {moodOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                          {option.label}
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
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Notas adicionais..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addLog.isPending}>
                {addLog.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
