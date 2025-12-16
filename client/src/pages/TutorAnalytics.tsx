import { useState } from "react";
import TutorLayout from "@/components/TutorLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Activity, Heart, Brain, Calendar } from "lucide-react";

export default function TutorAnalytics() {
  const { data: allPets = [], isLoading: loadingPets } = trpc.pets.list.useQuery();
  const pets = allPets;
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  const selectedPet = pets.find((p: any) => p.id === selectedPetId);

  // Fetch analytics data
  const { data: weightHistory = [] } = trpc.pets.getWeightHistory.useQuery(
    { petId: selectedPetId! },
    { enabled: !!selectedPetId }
  );

  const { data: moodHistory = [] } = trpc.pets.getMoodHistory.useQuery(
    { petId: selectedPetId! },
    { enabled: !!selectedPetId }
  );

  const { data: frequencyStats = [] } = trpc.pets.getFrequencyStats.useQuery(
    { petId: selectedPetId! },
    { enabled: !!selectedPetId }
  );

  const { data: behaviorRecords = [] } = trpc.behavior.list.useQuery(
    { petId: selectedPetId ?? undefined },
    { enabled: !!selectedPetId }
  );

  // Process mood distribution
  const moodDistribution = moodHistory.reduce((acc: any, item: any) => {
    const mood = item.mood || "unknown";
    acc[mood] = (acc[mood] || 0) + 1;
    return acc;
  }, {});

  const moodData = Object.entries(moodDistribution).map(([name, value]) => ({
    name: name === "happy" ? "Feliz" : name === "calm" ? "Calmo" : name === "anxious" ? "Ansioso" : name === "playful" ? "Brincalhão" : "Desconhecido",
    value,
  }));

  const MOOD_COLORS = {
    Feliz: "#10b981",
    Calmo: "#3b82f6",
    Ansioso: "#f59e0b",
    Brincalhão: "#8b5cf6",
    Desconhecido: "#6b7280",
  };

  // Process behavior stats
  const behaviorStats = {
    positive: behaviorRecords.filter((b: any) => b.behaviorType === "positive").length,
    negative: behaviorRecords.filter((b: any) => b.behaviorType === "negative").length,
    neutral: behaviorRecords.filter((b: any) => b.behaviorType === "neutral").length,
  };

  const behaviorData = [
    { name: "Positivos", value: behaviorStats.positive, color: "#10b981" },
    { name: "Negativos", value: behaviorStats.negative, color: "#ef4444" },
    { name: "Neutros", value: behaviorStats.neutral, color: "#6b7280" },
  ];

  // Calculate weight trend
  const weightTrend = weightHistory.length >= 2
    ? weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight
    : 0;

  if (loadingPets) {
    return (
      <TutorLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </TutorLayout>
    );
  }

  return (
    <TutorLayout>
      <div className="container max-w-7xl py-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard Analítico</h1>
          <p className="text-muted-foreground">
            Acompanhe a evolução e estatísticas do seu pet
          </p>
        </div>

        {/* Pet Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Selecione o Pet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pets.map((pet: any) => (
                <button
                  key={pet.id}
                  onClick={() => setSelectedPetId(pet.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedPetId === pet.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🐕</div>
                    <p className="font-semibold">{pet.name}</p>
                    <p className="text-xs text-muted-foreground">{pet.breed}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedPet ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Peso Atual</p>
                      <p className="text-2xl font-bold">
                        {weightHistory.length > 0 ? `${weightHistory[weightHistory.length - 1].weight} kg` : "N/A"}
                      </p>
                    </div>
                    {weightTrend !== 0 && (
                      <div className={`flex items-center gap-1 ${weightTrend > 0 ? "text-green-600" : "text-red-600"}`}>
                        {weightTrend > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                        <span className="text-sm font-medium">{Math.abs(weightTrend).toFixed(1)} kg</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Frequência Mensal</p>
                      <p className="text-2xl font-bold">
                        {frequencyStats.length > 0 ? `${frequencyStats[frequencyStats.length - 1].frequency} dias` : "0 dias"}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Comportamentos</p>
                      <p className="text-2xl font-bold">{behaviorRecords.length}</p>
                    </div>
                    <Brain className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Humor Predominante</p>
                      <p className="text-2xl font-bold">
                        {moodData.length > 0 ? moodData.sort((a, b) => (b.value as number) - (a.value as number))[0].name : "N/A"}
                      </p>
                    </div>
                    <Heart className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weight Evolution Chart */}
            {weightHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Evolução de Peso</CardTitle>
                  <CardDescription>Acompanhe o ganho ou perda de peso ao longo do tempo</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={weightHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => new Date(date).toLocaleDateString("pt-BR", { month: "short", day: "numeric" })}
                      />
                      <YAxis label={{ value: "Peso (kg)", angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        labelFormatter={(date) => new Date(date).toLocaleDateString("pt-BR")}
                        formatter={(value: any) => [`${value} kg`, "Peso"]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="weight" stroke="#ff6600" strokeWidth={2} name="Peso (kg)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Frequency Chart */}
            {frequencyStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Frequência Mensal na Creche</CardTitle>
                  <CardDescription>Número de dias por mês</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={frequencyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis label={{ value: "Dias", angle: -90, position: "insideLeft" }} />
                      <Tooltip formatter={(value: any) => [`${value} dias`, "Frequência"]} />
                      <Legend />
                      <Bar dataKey="frequency" fill="#ff6600" name="Dias na creche" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Mood Distribution */}
              {moodData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição de Humor</CardTitle>
                    <CardDescription>Como seu pet tem se sentido</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={moodData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {moodData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={MOOD_COLORS[entry.name as keyof typeof MOOD_COLORS] || "#6b7280"} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Behavior Distribution */}
              {behaviorRecords.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Comportamentos Registrados</CardTitle>
                    <CardDescription>Distribuição por tipo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={behaviorData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {behaviorData.map((entry: any, index: number) => (
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

            {/* Recent Behaviors Timeline */}
            {behaviorRecords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Comportamentos Recentes</CardTitle>
                  <CardDescription>Últimos 10 registros</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {behaviorRecords.slice(0, 10).map((behavior: any) => (
                      <div key={behavior.id} className="flex items-start gap-4 p-4 rounded-lg border">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          behavior.behaviorType === "positive" ? "bg-green-500" :
                          behavior.behaviorType === "negative" ? "bg-red-500" : "bg-gray-500"
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium">{behavior.description}</p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(behavior.date).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {behavior.location === "daycare" ? "Creche" : 
                             behavior.location === "home" ? "Casa" :
                             behavior.location === "walk" ? "Passeio" : behavior.location}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium text-muted-foreground">
                Selecione um pet para visualizar as estatísticas
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </TutorLayout>
  );
}
