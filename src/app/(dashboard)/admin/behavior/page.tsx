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
  Brain,
  Smile,
  Frown,
  Zap,
  Heart,
  Dog,
  Calendar
} from "lucide-react";
import { BreedIcon } from "@/components/breed-icons";
import { toast } from "sonner";
import { BehaviorSkeleton } from "@/components/shared/skeletons";

const socializationOptions = [
  { value: "excellent", label: "Excelente", color: "text-green-600" },
  { value: "good", label: "Bom", color: "text-blue-600" },
  { value: "moderate", label: "Moderado", color: "text-yellow-600" },
  { value: "poor", label: "Ruim", color: "text-red-600" },
];

const energyOptions = [
  { value: "high", label: "Alta", color: "text-orange-600" },
  { value: "normal", label: "Normal", color: "text-blue-600" },
  { value: "low", label: "Baixa", color: "text-gray-600" },
];

const anxietyOptions = [
  { value: "none", label: "Nenhuma", color: "text-green-600" },
  { value: "mild", label: "Leve", color: "text-yellow-600" },
  { value: "moderate", label: "Moderada", color: "text-orange-600" },
  { value: "severe", label: "Severa", color: "text-red-600" },
];

export default function AdminBehavior() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: logs, isLoading, refetch } = trpc.behavior.list.useQuery({
    date: selectedDate,
    limit: 50,
  });
  const { data: pets } = trpc.pets.list.useQuery();

  const addLog = trpc.behavior.add.useMutation({
    onSuccess: () => {
      toast.success("Registro de comportamento salvo!");
      setIsAddDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao salvar registro: " + error.message);
    },
  });

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

      {/* Date Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label>Data:</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      {!logs || logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhum registro nesta data
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
        <div className="grid gap-4 md:grid-cols-2">
          {logs.map((item) => {
            const socialOpt = socializationOptions.find(s => s.value === item.socialization);
            const energyOpt = energyOptions.find(e => e.value === item.energy);
            const anxietyOpt = anxietyOptions.find(a => a.value === item.anxiety);

            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
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
                        <CardTitle className="text-base">{item.pet?.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(item.logDate).toLocaleDateString("pt-BR")}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {item.socialization && (
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        <span>Socialização:</span>
                        <Badge variant="outline" className={socialOpt?.color}>
                          {socialOpt?.label}
                        </Badge>
                      </div>
                    )}
                    {item.energy && (
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <span>Energia:</span>
                        <Badge variant="outline" className={energyOpt?.color}>
                          {energyOpt?.label}
                        </Badge>
                      </div>
                    )}
                    {item.anxiety && (
                      <div className="flex items-center gap-2">
                        <Frown className="h-4 w-4 text-muted-foreground" />
                        <span>Ansiedade:</span>
                        <Badge variant="outline" className={anxietyOpt?.color}>
                          {anxietyOpt?.label}
                        </Badge>
                      </div>
                    )}
                  </div>
                  {item.activities && item.activities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.activities.map((activity: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {activity}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <p className="mt-3 text-sm text-muted-foreground border-t pt-2">
                      {item.notes}
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

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
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
                      {pets?.map((pet) => (
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
                          {opt.label}
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
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ansiedade</Label>
                  <Select name="anxiety">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {anxietyOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Obediência</Label>
                  <Select name="obedience">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excelente</SelectItem>
                      <SelectItem value="good">Boa</SelectItem>
                      <SelectItem value="needs_work">Precisa melhorar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Como foi o dia do pet?"
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
