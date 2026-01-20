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
  Shield,
  Bug,
  AlertCircle,
  Calendar,
  Dog
} from "lucide-react";
import { BreedIcon } from "@/components/breed-icons";
import { PetAvatar } from "@/components/pet-avatar";
import { toast } from "sonner";

const treatmentTypes = [
  { value: "flea", label: "Antipulgas", icon: Bug },
  { value: "deworming", label: "Vermífugo", icon: Shield },
  { value: "heartworm", label: "Dirofilariose", icon: Shield },
];

export default function AdminPreventives() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: stats } = trpc.preventives.stats.useQuery();
  const { data: upcomingTreatments, refetch: refetchUpcoming } = trpc.preventives.upcoming.useQuery({ daysAhead: 30 });
  const { data: overdueTreatments, refetch: refetchOverdue } = trpc.preventives.overdue.useQuery();
  const { data: pets } = trpc.pets.list.useQuery();

  const addTreatment = trpc.preventives.add.useMutation({
    onSuccess: () => {
      toast.success("Tratamento registrado com sucesso!");
      setIsAddDialogOpen(false);
      refetchUpcoming();
      refetchOverdue();
    },
    onError: (error) => {
      toast.error("Erro ao registrar tratamento: " + error.message);
    },
  });

  const handleAddTreatment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addTreatment.mutate({
      petId: Number(formData.get("petId")),
      type: formData.get("type") as "flea" | "deworming" | "heartworm",
      productName: formData.get("productName") as string,
      applicationDate: formData.get("applicationDate") as string,
      nextDueDate: formData.get("nextDueDate") as string || undefined,
      dosage: formData.get("dosage") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Shield />
          </div>
          <div className="page-header-info">
            <h1>Preventivos</h1>
            <p>Antipulgas, vermífugos e outros</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="btn-sm btn-primary">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Registrar Tratamento
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total</span>
            <Shield className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{stats?.total || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Antipulgas</span>
            <Shield className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{stats?.flea || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Vermífugos</span>
            <Shield className="stat-card-icon green" />
          </div>
          <div className="stat-card-value">{stats?.deworming || 0}</div>
        </div>
        <div className={`stat-card ${(overdueTreatments?.length || 0) > 0 ? "highlight" : ""}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Atrasados</span>
            <AlertCircle className={`stat-card-icon ${(overdueTreatments?.length || 0) > 0 ? "amber" : "muted"}`} />
          </div>
          <div className="stat-card-value">{overdueTreatments?.length || 0}</div>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Próximos ({stats?.upcoming || 0})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="text-red-600">
            Atrasados ({stats?.overdue || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {!upcomingTreatments || upcomingTreatments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhum tratamento próximo
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingTreatments.map((item) => {
                const daysUntil = Math.ceil(
                  (new Date(item.treatment.nextDueDate!).getTime() - new Date().getTime()) / 
                  (1000 * 60 * 60 * 24)
                );
                const typeInfo = treatmentTypes.find(t => t.value === item.treatment.type);
                const TypeIcon = typeInfo?.icon || Shield;

                return (
                  <Card key={item.treatment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <PetAvatar
                            photoUrl={item.pet?.photoUrl}
                            breed={item.pet?.breed}
                            name={item.pet?.name}
                            size="md"
                          />
                          <div>
                            <CardTitle className="text-base">{item.pet?.name}</CardTitle>
                            <CardDescription className="text-xs flex items-center gap-1">
                              <TypeIcon className="h-3 w-3" />
                              {typeInfo?.label}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={daysUntil <= 7 ? "destructive" : "secondary"}>
                          {daysUntil} dias
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{item.treatment.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        Próxima: {new Date(item.treatment.nextDueDate!).toLocaleDateString("pt-BR")}
                      </p>
                      {item.treatment.dosage && (
                        <p className="text-xs text-muted-foreground">
                          Dosagem: {item.treatment.dosage}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          {!overdueTreatments || overdueTreatments.length === 0 ? (
            <Card className="border-slate-200 bg-slate-50 dark:bg-slate-900">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-slate-500 dark:text-slate-400 mb-4" />
                <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
                  Todos os tratamentos em dia!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {overdueTreatments.map((item) => {
                const daysOverdue = Math.ceil(
                  (new Date().getTime() - new Date(item.treatment.nextDueDate!).getTime()) / 
                  (1000 * 60 * 60 * 24)
                );
                const typeInfo = treatmentTypes.find(t => t.value === item.treatment.type);

                return (
                  <Card key={item.treatment.id} className="border-slate-300 dark:border-slate-700 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{item.pet?.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {typeInfo?.label}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="destructive">
                          {daysOverdue} dias atrasado
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{item.treatment.productName}</p>
                      <p className="text-sm text-red-600">
                        Venceu em: {new Date(item.treatment.nextDueDate!).toLocaleDateString("pt-BR")}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Treatment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddTreatment}>
            <DialogHeader>
              <DialogTitle>Registrar Tratamento Preventivo</DialogTitle>
              <DialogDescription>
                Registre antipulgas, vermífugo ou outro preventivo
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

              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {treatmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">Nome do Produto *</Label>
                <Input
                  id="productName"
                  name="productName"
                  placeholder="Ex: Bravecto, Nexgard..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="applicationDate">Data de Aplicação *</Label>
                  <Input
                    id="applicationDate"
                    name="applicationDate"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextDueDate">Próxima Dose</Label>
                  <Input
                    id="nextDueDate"
                    name="nextDueDate"
                    type="date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dosage">Dosagem</Label>
                <Input
                  id="dosage"
                  name="dosage"
                  placeholder="Ex: 1 comprimido"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addTreatment.isPending}>
                {addTreatment.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
