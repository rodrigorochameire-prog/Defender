"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText,
  Download,
  Dog,
  Calendar,
  Smile,
  Frown,
  Meh,
  Activity,
  Syringe,
  BarChart3
} from "lucide-react";
import { BreedIcon } from "@/components/breed-icons";
import { PetAvatar } from "@/components/pet-avatar";
import { PageSkeleton } from "@/components/shared/skeletons";

const moodLabels: Record<string, string> = {
  happy: "Feliz",
  calm: "Calmo",
  anxious: "Ansioso",
  tired: "Cansado",
  agitated: "Agitado",
};

const stoolLabels: Record<string, string> = {
  normal: "Normal",
  soft: "Mole",
  hard: "Duro",
  diarrhea: "Diarreia",
  none: "Não fez",
};

const appetiteLabels: Record<string, string> = {
  good: "Bom",
  moderate: "Moderado",
  poor: "Ruim",
  none: "Não comeu",
};

export default function TutorReports() {
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const { data: myPets } = trpc.pets.myPets.useQuery();

  const { data: report, isLoading } = trpc.reports.petReport.useQuery(
    { 
      petId: Number(selectedPetId), 
      startDate, 
      endDate 
    },
    { enabled: !!selectedPetId }
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-2">
          Análise de saúde e comportamento dos seus pets
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Pet</Label>
              <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecione um pet" />
                </SelectTrigger>
                <SelectContent>
                  {myPets?.map((pet) => (
                    <SelectItem key={pet.id} value={String(pet.id)}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {!selectedPetId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Selecione um pet para gerar o relatório
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <PageSkeleton />
      ) : report ? (
        <div className="space-y-6">
          {/* Pet Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <PetAvatar
                  photoUrl={report.pet?.photoUrl}
                  breed={report.pet?.breed}
                  name={report.pet?.name}
                  size="xl"
                />
                <div>
                  <CardTitle className="text-2xl">{report.pet?.name}</CardTitle>
                  <CardDescription>
                    Relatório de {new Date(startDate).toLocaleDateString("pt-BR")} até {new Date(endDate).toLocaleDateString("pt-BR")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalLogs}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Dias na Creche</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{report.summary.daycareCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Dias em Casa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{report.summary.homeCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Vacinações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{report.summary.totalVaccinations}</div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Mood Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smile className="h-5 w-5" />
                  Análise de Humor
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(report.analysis.mood).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(report.analysis.mood).map(([mood, count]) => (
                      <div key={mood} className="flex items-center justify-between">
                        <span className="text-sm">{moodLabels[mood] || mood}</span>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stool Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Análise de Fezes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(report.analysis.stool).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(report.analysis.stool).map(([stool, count]) => (
                      <div key={stool} className="flex items-center justify-between">
                        <span className="text-sm">{stoolLabels[stool] || stool}</span>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Appetite Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Análise de Apetite
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(report.analysis.appetite).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(report.analysis.appetite).map(([appetite, count]) => (
                      <div key={appetite} className="flex items-center justify-between">
                        <span className="text-sm">{appetiteLabels[appetite] || appetite}</span>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Vaccinations */}
          {report.vaccinations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Syringe className="h-5 w-5" />
                  Vacinações no Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.vaccinations.map(({ vaccination, vaccine }) => (
                    <div key={vaccination.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{vaccine.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Dose {vaccination.doseNumber}
                          {vaccination.veterinarian && ` • ${vaccination.veterinarian}`}
                        </p>
                      </div>
                      <Badge>
                        {new Date(vaccination.applicationDate).toLocaleDateString("pt-BR")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Logs */}
          {report.logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Logs Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {report.logs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge variant={log.source === "daycare" ? "default" : "secondary"}>
                          {log.source === "daycare" ? "Creche" : "Casa"}
                        </Badge>
                        <div>
                          {log.mood && <span className="text-sm">{moodLabels[log.mood]}</span>}
                          {log.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{log.notes}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.logDate).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
