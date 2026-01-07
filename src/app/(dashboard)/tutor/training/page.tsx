"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  GraduationCap,
  Target,
  Trophy,
  BookOpen,
  Dog,
  Timer,
  TrendingUp,
  Sparkles,
  Star
} from "lucide-react";

const categoryOptions = [
  { value: "obedience", label: "Obediência", icon: "🎯", color: "bg-blue-100 text-blue-700" },
  { value: "socialization", label: "Socialização", icon: "🤝", color: "bg-green-100 text-green-700" },
  { value: "behavior", label: "Comportamento", icon: "🧠", color: "bg-purple-100 text-purple-700" },
  { value: "agility", label: "Agilidade", icon: "🏃", color: "bg-orange-100 text-orange-700" },
  { value: "tricks", label: "Truques", icon: "✨", color: "bg-pink-100 text-pink-700" },
];

const statusOptions = [
  { value: "learning", label: "Aprendendo", icon: "📚", color: "bg-yellow-100 text-yellow-700" },
  { value: "practicing", label: "Praticando", icon: "🔄", color: "bg-blue-100 text-blue-700" },
  { value: "mastered", label: "Dominado", icon: "⭐", color: "bg-green-100 text-green-700" },
];

export default function TutorTraining() {
  const [selectedPet, setSelectedPet] = useState<string | undefined>();

  const { data: pets } = trpc.pets.myPets.useQuery();

  const { data: progress, isLoading } = trpc.training.progress.useQuery(
    { petId: Number(selectedPet) },
    { enabled: !!selectedPet }
  );

  const firstPet = pets?.[0];

  // Auto-select first pet
  if (!selectedPet && firstPet) {
    setSelectedPet(firstPet.id.toString());
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            Treinamento
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o progresso de adestramento do seu pet
          </p>
        </div>
      </div>

      {/* Pet Selector */}
      {pets && pets.length > 1 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Selecione o pet:</span>
              <Select value={selectedPet} onValueChange={setSelectedPet}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id.toString()}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && selectedPet ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : progress ? (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Comandos</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{progress.totalCommands}</div>
                <p className="text-xs text-muted-foreground">comandos treinados</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dominados</CardTitle>
                <Trophy className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{progress.mastered}</div>
                <p className="text-xs text-muted-foreground">comandos dominados</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Praticando</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{progress.practicing}</div>
                <p className="text-xs text-muted-foreground">em prática</p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aprendendo</CardTitle>
                <BookOpen className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{progress.learning}</div>
                <p className="text-xs text-muted-foreground">novos comandos</p>
              </CardContent>
            </Card>
          </div>

          {/* Progress by Command */}
          {progress.progress.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Progresso por Comando
                </CardTitle>
                <CardDescription>
                  Veja o status de cada comando treinado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {progress.progress.map((cmd, idx) => {
                    const category = categoryOptions.find(c => c.value === cmd.category);
                    const status = statusOptions.find(s => s.value === cmd.status);
                    
                    return (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category?.icon}</span>
                          <div>
                            <p className="font-medium">{cmd.command}</p>
                            <p className="text-xs text-muted-foreground">
                              Último treino: {new Date(cmd.lastTraining).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <Badge className={status?.color || ""}>
                          {status?.icon} {status?.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Logs */}
          {progress.recentLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sessões Recentes</CardTitle>
                <CardDescription>
                  Últimas sessões de treinamento registradas pela creche
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {progress.recentLogs.map((log) => {
                    const category = categoryOptions.find(c => c.value === log.category);
                    const status = statusOptions.find(s => s.value === log.status);
                    
                    return (
                      <div 
                        key={log.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{category?.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{log.command}</span>
                              <Badge variant="outline" className={status?.color}>
                                {status?.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span>{new Date(log.logDate).toLocaleDateString("pt-BR")}</span>
                              {log.duration && (
                                <span className="flex items-center gap-1">
                                  <Timer className="h-3 w-3" />
                                  {log.duration} min
                                </span>
                              )}
                              {log.successRate !== null && (
                                <span className="flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  {log.successRate}% sucesso
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {log.notes && (
                          <p className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {log.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-12 text-center">
          <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum treinamento registrado</h3>
          <p className="text-muted-foreground">
            A creche ainda não registrou sessões de treinamento para seu pet
          </p>
        </Card>
      )}
    </div>
  );
}

