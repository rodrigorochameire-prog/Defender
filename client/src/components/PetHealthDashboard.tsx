import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { trpc } from "../lib/trpc";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Activity, Heart, Pill, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PetHealthDashboardProps {
  petId: number;
  petName: string;
}

const COLORS = {
  happy: "#10b981",
  normal: "#3b82f6",
  anxious: "#f59e0b",
  sad: "#ef4444",
  aggressive: "#dc2626",
};

const MOOD_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#dc2626"];

export function PetHealthDashboard({ petId, petName }: PetHealthDashboardProps) {
  // Fetch data
  const { data: logs = [], isLoading: loadingLogs } = trpc.logs.getPetLogs.useQuery({ petId });
  const { data: medications = [], isLoading: loadingMeds } = trpc.medications.getPetMedications.useQuery({ petId });
  const { data: vaccines = [], isLoading: loadingVaccines } = trpc.vaccines.getPetVaccinations.useQuery({ petId });

  const isLoading = loadingLogs || loadingMeds || loadingVaccines;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Process weight data from logs
  const weightData = logs
    .filter((l: any) => l.weight)
    .sort((a: any, b: any) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime())
    .slice(-30) // Last 30 entries
    .map((l: any) => ({
      date: format(new Date(l.logDate), "dd/MM"),
      peso: (l.weight / 1000).toFixed(1),
    }));

  // Calculate weight trend
  const weightTrend = weightData.length >= 2 
    ? parseFloat(weightData[weightData.length - 1].peso) - parseFloat(weightData[0].peso)
    : 0;

  // Process mood distribution
  const moodCounts: Record<string, number> = {};
  logs.forEach((l: any) => {
    if (l.mood) {
      moodCounts[l.mood] = (moodCounts[l.mood] || 0) + 1;
    }
  });

  const moodData = Object.entries(moodCounts).map(([mood, count]) => ({
    name: mood === "happy" ? "Feliz" : 
          mood === "normal" ? "Normal" :
          mood === "anxious" ? "Ansioso" :
          mood === "sad" ? "Triste" : "Agressivo",
    value: count,
    color: COLORS[mood as keyof typeof COLORS] || "#gray",
  }));

  // Process appetite data (last 14 days)
  const appetiteData = logs
    .filter((l: any) => l.appetite)
    .sort((a: any, b: any) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime())
    .slice(-14)
    .map((l: any) => ({
      date: format(new Date(l.logDate), "dd/MM"),
      apetite: l.appetite === "excellent" ? 5 :
               l.appetite === "good" ? 4 :
               l.appetite === "normal" ? 3 :
               l.appetite === "poor" ? 2 : 1,
    }));

  // Calculate statistics
  const totalLogs = logs.length;
  const activeMedications = medications.filter((m: any) => !m.endDate || new Date(m.endDate) > new Date()).length;
  const upcomingVaccines = vaccines.filter((v: any) => v.nextDueDate && new Date(v.nextDueDate) > new Date()).length;
  
  const recentMood = logs.length > 0 && logs[0].mood 
    ? logs[0].mood 
    : "unknown";

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLogs}</div>
            <p className="text-xs text-muted-foreground">Logs de saúde registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medicamentos Ativos</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMedications}</div>
            <p className="text-xs text-muted-foreground">Tratamentos em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vacinas Próximas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingVaccines}</div>
            <p className="text-xs text-muted-foreground">Doses agendadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendência de Peso</CardTitle>
            {weightTrend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weightTrend >= 0 ? "+" : ""}{weightTrend.toFixed(1)} kg
            </div>
            <p className="text-xs text-muted-foreground">Últimos 30 registros</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weight Evolution Chart */}
        {weightData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Peso</CardTitle>
              <CardDescription>Últimos 30 registros de peso (kg)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="peso" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={{ fill: "#8884d8" }}
                    name="Peso (kg)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Mood Distribution Chart */}
        {moodData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Humor</CardTitle>
              <CardDescription>Análise comportamental geral</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={moodData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {moodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6">
        {/* Appetite Trend Chart */}
        {appetiteData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tendência de Apetite</CardTitle>
              <CardDescription>Últimos 14 dias (1=Muito Baixo, 5=Excelente)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={appetiteData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="apetite" fill="#10b981" name="Nível de Apetite" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* No Data Message */}
      {totalLogs === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Nenhum dado de saúde registrado ainda. Comece adicionando logs diários para visualizar métricas e gráficos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
