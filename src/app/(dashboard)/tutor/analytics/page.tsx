"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Heart, Brain, Calendar, Loader2, Dog } from "lucide-react";

export default function TutorAnalyticsPage() {
  const { data: pets = [], isLoading: loadingPets } = trpc.pets.myPets.useQuery();
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  const selectedPet = pets.find((p) => p.id === selectedPetId);

  // Mock data para gráficos (será implementado com dados reais)
  const weightHistory = [
    { date: "2024-12-01", weight: 12.5 },
    { date: "2024-12-15", weight: 12.8 },
    { date: "2025-01-01", weight: 13.0 },
  ];

  const frequencyStats = [
    { month: "Out", frequency: 12 },
    { month: "Nov", frequency: 15 },
    { month: "Dez", frequency: 10 },
  ];

  const behaviorStats = {
    positive: 8,
    negative: 2,
    neutral: 5,
  };

  const weightTrend = weightHistory.length >= 2
    ? weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight
    : 0;

  if (loadingPets) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
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
          {pets.length === 0 ? (
            <div className="text-center py-8">
              <Dog className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum pet cadastrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pets.map((pet) => (
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
                    {pet.photoUrl ? (
                      <img
                        src={pet.photoUrl}
                        alt={pet.name}
                        className="w-12 h-12 rounded-full mx-auto mb-2 object-cover"
                      />
                    ) : (
                      <div className="text-2xl mb-2">🐕</div>
                    )}
                    <p className="font-semibold">{pet.name}</p>
                    <p className="text-xs text-muted-foreground">{pet.breed}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
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
                    <p className="text-2xl font-bold">
                      {behaviorStats.positive + behaviorStats.negative + behaviorStats.neutral}
                    </p>
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
                    <p className="text-2xl font-bold">Feliz</p>
                  </div>
                  <Heart className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weight Evolution */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Peso</CardTitle>
              <CardDescription>Acompanhe o ganho ou perda de peso ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weightHistory.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="font-bold">{entry.weight} kg</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Frequency Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Frequência Mensal na Creche</CardTitle>
              <CardDescription>Número de dias por mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {frequencyStats.map((stat, index) => (
                  <div key={index} className="text-center p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">{stat.month}</p>
                    <p className="text-2xl font-bold">{stat.frequency}</p>
                    <p className="text-xs text-muted-foreground">dias</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Behavior Stats */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Comportamentos</CardTitle>
                <CardDescription>Tipos de comportamento registrados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>Positivos</span>
                    </div>
                    <span className="font-bold">{behaviorStats.positive}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span>Negativos</span>
                    </div>
                    <span className="font-bold">{behaviorStats.negative}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-500" />
                      <span>Neutros</span>
                    </div>
                    <span className="font-bold">{behaviorStats.neutral}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Próximos Eventos</CardTitle>
                <CardDescription>Vacinas e preventivos pendentes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum evento pendente</p>
                </div>
              </CardContent>
            </Card>
          </div>
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
  );
}
