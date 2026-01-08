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
  GraduationCap,
  Target,
  Trophy,
  BookOpen,
  Dog,
  Calendar,
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
import { BreedIcon } from "@/components/breed-icons";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/shared/skeletons";

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

const methodOptions = [
  { value: "positive_reinforcement", label: "Reforço Positivo" },
  { value: "clicker", label: "Clicker" },
  { value: "lure", label: "Isca/Lure" },
  { value: "capture", label: "Captura" },
];

export default function AdminTraining() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const { data: logs, isLoading, refetch } = trpc.training.list.useQuery({
    category: selectedCategory as any,
    limit: 50,
  });
  const { data: pets } = trpc.pets.list.useQuery();

  const addLog = trpc.training.add.useMutation({
    onSuccess: () => {
      toast.success("Registro de treinamento salvo!");
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
      command: formData.get("command") as string,
      category: formData.get("category") as any,
      status: formData.get("status") as any,
      successRate: formData.get("successRate") ? Number(formData.get("successRate")) : undefined,
      duration: formData.get("duration") ? Number(formData.get("duration")) : undefined,
      treats: formData.get("treats") ? Number(formData.get("treats")) : undefined,
      method: (formData.get("method") as any) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    });
  };

  if (isLoading) {
    return <TableSkeleton />;
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
            <p>Acompanhe o progresso de adestramento</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="btn-sm btn-primary">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Registro
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total de Sessões</span>
            <Target className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{logs?.length || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Dominados</span>
            <Trophy className="stat-card-icon green" />
          </div>
          <div className="stat-card-value">{logs?.filter(l => l.status === "mastered").length || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Em Prática</span>
            <TrendingUp className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{logs?.filter(l => l.status === "practicing").length || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Aprendendo</span>
            <BookOpen className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{logs?.filter(l => l.status === "learning").length || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!selectedCategory ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(undefined)}
            >
              Todos
            </Button>
            {categoryOptions.map((cat) => {
              const IconComponent = cat.icon;
              return (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                  className="gap-1.5"
                >
                  <IconComponent className="h-3.5 w-3.5" />
                  {cat.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Logs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {logs?.map((log) => {
          const category = categoryOptions.find(c => c.value === log.category);
          const status = statusOptions.find(s => s.value === log.status);
          const StatusIcon = status?.icon || Star;
          const CategoryIcon = category?.icon || Target;
          
          return (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {log.pet?.photoUrl ? (
                      <img
                        src={log.pet.photoUrl}
                        alt={log.pet.name}
                        className="h-12 w-12 rounded-full object-cover border-2 border-border"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <BreedIcon breed={log.pet?.breed} className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{log.pet?.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(log.logDate).toLocaleDateString("pt-BR")}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={log.status === "mastered" ? "success" : log.status === "practicing" ? "default" : "secondary"}
                    className="gap-1"
                  >
                    <StatusIcon className="h-3 w-3" />
                    {status?.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg">{log.command}</span>
                  <Badge variant="outline" className="gap-1">
                    <CategoryIcon className="h-3 w-3" />
                    {category?.label}
                  </Badge>
                </div>

                {log.successRate !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de Sucesso</span>
                      <span className="font-medium">{log.successRate}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${log.successRate}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-4 text-sm text-muted-foreground">
                  {log.duration && (
                    <div className="flex items-center gap-1">
                      <Timer className="h-4 w-4" />
                      {log.duration} min
                    </div>
                  )}
                  {log.treats !== null && log.treats > 0 && (
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-4 w-4" />
                      {log.treats} petiscos
                    </div>
                  )}
                </div>

                {log.notes && (
                  <p className="text-sm text-muted-foreground border-t pt-2 mt-2">
                    {log.notes}
                  </p>
                )}

                <div className="text-xs text-muted-foreground">
                  Por {log.createdBy?.name}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {logs?.length === 0 && (
        <Card className="p-12 text-center">
          <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum registro de treinamento</h3>
          <p className="text-muted-foreground mb-4">
            Comece a registrar o progresso de adestramento dos pets
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Registro
          </Button>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Novo Registro de Treinamento
            </DialogTitle>
            <DialogDescription>
              Registre uma sessão de treinamento para um pet
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddLog} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="petId">Pet *</Label>
                <Select name="petId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets?.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
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

            <div className="space-y-2">
              <Label htmlFor="command">Comando *</Label>
              <Input
                id="command"
                name="command"
                placeholder="Ex: Senta, Fica, Deita, Vem..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => {
                      const IconComponent = opt.icon;
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-muted-foreground" />
                            {opt.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select name="status" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => {
                      const IconComponent = opt.icon;
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-muted-foreground" />
                            {opt.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="successRate">Taxa de Sucesso (%)</Label>
                <Input
                  id="successRate"
                  name="successRate"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duração (min)</Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min="1"
                  placeholder="Minutos"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="treats">Petiscos</Label>
                <Input
                  id="treats"
                  name="treats"
                  type="number"
                  min="0"
                  placeholder="Qtd"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Método de Treinamento</Label>
              <Select name="method">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {methodOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Anotações sobre a sessão..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addLog.isPending}>
                {addLog.isPending ? "Salvando..." : "Salvar Registro"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

