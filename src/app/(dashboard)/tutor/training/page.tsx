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
  Star,
  Users,
  Brain,
  Zap,
  RefreshCw,
  type LucideIcon
} from "lucide-react";
import { PageSkeleton } from "@/components/shared/skeletons";

const categoryOptions: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "obedience", label: "Obediência", icon: Target },
  { value: "socialization", label: "Socialização", icon: Users },
  { value: "behavior", label: "Comportamento", icon: Brain },
  { value: "agility", label: "Agilidade", icon: Zap },
  { value: "tricks", label: "Truques", icon: Sparkles },
];

const statusOptions: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "learning", label: "Aprendendo", icon: BookOpen },
  { value: "practicing", label: "Praticando", icon: RefreshCw },
  { value: "mastered", label: "Dominado", icon: Star },
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
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <GraduationCap />
          </div>
          <div className="page-header-info">
            <h1>Treinamento</h1>
            <p>Acompanhe o progresso de adestramento do seu pet</p>
          </div>
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
        <PageSkeleton />
      ) : progress ? (
        <>
          {/* Stats Cards */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Total de Comandos</span>
                <Target className="stat-card-icon muted" />
              </div>
              <div className="stat-card-value">{progress.totalCommands}</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Dominados</span>
                <Trophy className="stat-card-icon green" />
              </div>
              <div className="stat-card-value">{progress.mastered}</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Praticando</span>
                <TrendingUp className="stat-card-icon blue" />
              </div>
              <div className="stat-card-value">{progress.practicing}</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Aprendendo</span>
                <BookOpen className="stat-card-icon primary" />
              </div>
              <div className="stat-card-value">{progress.learning}</div>
            </div>
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
                    const CategoryIcon = category?.icon || Target;
                    const StatusIcon = status?.icon || Star;
                    
                    return (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{cmd.command}</p>
                            <p className="text-xs text-muted-foreground">
                              Último treino: {new Date(cmd.lastTraining).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={cmd.status === "mastered" ? "success" : cmd.status === "practicing" ? "default" : "secondary"}
                          className="gap-1"
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status?.label}
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
                    const CategoryIcon = category?.icon || Target;
                    const StatusIcon = status?.icon || Star;
                    
                    return (
                      <div 
                        key={log.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{log.command}</span>
                              <Badge 
                                variant={log.status === "mastered" ? "success" : log.status === "practicing" ? "default" : "secondary"}
                                className="gap-1"
                              >
                                <StatusIcon className="h-3 w-3" />
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

