"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Plus, 
  Dog,
  Home,
  Building2,
  Smile,
  Frown,
  Meh,
  Calendar
} from "lucide-react";
import { toast } from "sonner";

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

export default function TutorLogs() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>("");

  const { data: myPets } = trpc.pets.myPets.useQuery();

  // Buscar logs do pet selecionado
  const { data: logs, refetch } = trpc.logs.byPet.useQuery(
    { petId: Number(selectedPetId), limit: 30 },
    { enabled: !!selectedPetId }
  );

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
      source: "home",
      mood: formData.get("mood") as any || undefined,
      stool: formData.get("stool") as any || undefined,
      appetite: formData.get("appetite") as any || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

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
            <p>Registre o dia a dia dos seus pets</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="btn-sm btn-primary">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Log
          </Button>
        </div>
      </div>

      {/* Pet Selector */}
      {myPets && myPets.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label>Selecione o pet:</Label>
              <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Escolha um pet" />
                </SelectTrigger>
                <SelectContent>
                  {myPets.map((pet) => (
                    <SelectItem key={pet.id} value={String(pet.id)}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs List */}
      {!selectedPetId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dog className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Selecione um pet para ver os logs
            </p>
          </CardContent>
        </Card>
      ) : !logs || logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhum log registrado
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsAddDialogOpen(true)}
            >
              Registrar primeiro log
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((item) => {
            const moodOption = moodOptions.find(m => m.value === item.log.mood);
            const MoodIcon = moodOption?.icon || Meh;
            
            return (
              <Card key={item.log.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {new Date(item.log.logDate).getDate()}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase">
                          {new Date(item.log.logDate).toLocaleString("pt-BR", { month: "short" })}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={item.log.source === "daycare" ? "default" : "secondary"}>
                            {item.log.source === "daycare" ? (
                              <><Building2 className="h-3 w-3 mr-1" /> Creche</>
                            ) : (
                              <><Home className="h-3 w-3 mr-1" /> Casa</>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {item.log.mood && (
                            <div className="flex items-center gap-1">
                              <MoodIcon className={`h-4 w-4 ${moodOption?.color}`} />
                              <span>{moodOption?.label}</span>
                            </div>
                          )}
                          {item.log.stool && (
                            <span>Fezes: {stoolOptions.find(s => s.value === item.log.stool)?.label}</span>
                          )}
                          {item.log.appetite && (
                            <span>Apetite: {appetiteOptions.find(a => a.value === item.log.appetite)?.label}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.createdBy?.name}
                    </p>
                  </div>
                  {item.log.notes && (
                    <p className="mt-3 text-sm text-muted-foreground border-t pt-3">
                      {item.log.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Log Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddLog}>
            <DialogHeader>
              <DialogTitle>Novo Log Diário</DialogTitle>
              <DialogDescription>
                Registre como foi o dia do seu pet
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="petId">Pet *</Label>
                <Select name="petId" defaultValue={selectedPetId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pet" />
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
                <Label htmlFor="mood">Humor</Label>
                <Select name="mood">
                  <SelectTrigger>
                    <SelectValue placeholder="Como estava o humor?" />
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
                  placeholder="Como foi o dia? Algo especial aconteceu?"
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
