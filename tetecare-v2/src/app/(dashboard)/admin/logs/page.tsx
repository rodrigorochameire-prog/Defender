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
  Plus, 
  Calendar,
  Smile,
  Frown,
  Meh,
  Dog,
  Home,
  Building2
} from "lucide-react";
import { toast } from "sonner";

const moodOptions = [
  { value: "happy", label: "Feliz", icon: Smile, color: "text-green-600" },
  { value: "calm", label: "Calmo", icon: Meh, color: "text-blue-600" },
  { value: "anxious", label: "Ansioso", icon: Frown, color: "text-yellow-600" },
  { value: "tired", label: "Cansado", icon: Meh, color: "text-gray-600" },
  { value: "agitated", label: "Agitado", icon: Frown, color: "text-red-600" },
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

  const { data: logs, isLoading, refetch } = trpc.logs.list.useQuery({
    source: sourceFilter === "all" ? undefined : sourceFilter,
    date: selectedDate,
    limit: 50,
  });

  const { data: pets } = trpc.pets.list.useQuery();
  const { data: stats } = trpc.logs.stats.useQuery();

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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs Diários</h1>
          <p className="text-muted-foreground mt-2">
            Registros de saúde e comportamento dos pets
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Log
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Logs de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.today || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Creche Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.daycareToday || 0}</div>
          </CardContent>
        </Card>
      </div>

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
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="daycare">Creche</SelectItem>
                  <SelectItem value="home">Casa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {!logs || logs.length === 0 ? (
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
          {logs.map((item) => {
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
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Dog className="h-5 w-5 text-primary" />
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
