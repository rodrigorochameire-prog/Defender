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
  Syringe,
  AlertCircle,
  Calendar,
  Dog
} from "lucide-react";
import { toast } from "sonner";

export default function AdminVaccines() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddLibraryDialogOpen, setIsAddLibraryDialogOpen] = useState(false);

  const { data: vaccineLibrary } = trpc.vaccines.library.useQuery();
  const { data: upcomingVaccines, refetch: refetchUpcoming } = trpc.vaccines.upcoming.useQuery({ daysAhead: 30 });
  const { data: stats } = trpc.vaccines.stats.useQuery();
  const { data: pets } = trpc.pets.list.useQuery();

  const addVaccination = trpc.vaccines.addVaccination.useMutation({
    onSuccess: () => {
      toast.success("Vacinação registrada com sucesso!");
      setIsAddDialogOpen(false);
      refetchUpcoming();
    },
    onError: (error) => {
      toast.error("Erro ao registrar vacinação: " + error.message);
    },
  });

  const addToLibrary = trpc.vaccines.addToLibrary.useMutation({
    onSuccess: () => {
      toast.success("Vacina adicionada à biblioteca!");
      setIsAddLibraryDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao adicionar vacina: " + error.message);
    },
  });

  const handleAddVaccination = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addVaccination.mutate({
      petId: Number(formData.get("petId")),
      vaccineId: Number(formData.get("vaccineId")),
      applicationDate: formData.get("applicationDate") as string,
      nextDueDate: formData.get("nextDueDate") as string || undefined,
      doseNumber: Number(formData.get("doseNumber")) || 1,
      veterinarian: formData.get("veterinarian") as string || undefined,
      clinic: formData.get("clinic") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleAddToLibrary = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addToLibrary.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      intervalDays: Number(formData.get("intervalDays")) || undefined,
      dosesRequired: Number(formData.get("dosesRequired")) || 1,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vacinas</h1>
          <p className="text-muted-foreground mt-2">
            Gerenciamento de vacinações dos pets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAddLibraryDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Vacina
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Syringe className="mr-2 h-4 w-4" />
            Registrar Vacinação
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Vacinações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Próximas (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.upcoming || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.overdue || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Próximas Vacinas</TabsTrigger>
          <TabsTrigger value="library">Biblioteca de Vacinas</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {!upcomingVaccines || upcomingVaccines.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhuma vacina agendada
                </p>
                <p className="text-sm text-muted-foreground">
                  Todas as vacinas estão em dia!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingVaccines.map((item) => {
                const daysUntil = Math.ceil(
                  (new Date(item.vaccination.nextDueDate!).getTime() - new Date().getTime()) / 
                  (1000 * 60 * 60 * 24)
                );
                
                return (
                  <Card key={item.vaccination.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Dog className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{item.pet.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {item.vaccine.name}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={daysUntil <= 7 ? "destructive" : "secondary"}>
                          {daysUntil <= 0 ? "Hoje" : `${daysUntil} dias`}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm space-y-1">
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(item.vaccination.nextDueDate!).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-muted-foreground">
                          Dose {item.vaccination.doseNumber}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vaccineLibrary?.map((vaccine) => (
              <Card key={vaccine.id}>
                <CardHeader>
                  <CardTitle className="text-base">{vaccine.name}</CardTitle>
                  {vaccine.description && (
                    <CardDescription>{vaccine.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {vaccine.intervalDays && (
                      <p>Intervalo: {vaccine.intervalDays} dias</p>
                    )}
                    <p>Doses: {vaccine.dosesRequired}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Vaccination Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddVaccination}>
            <DialogHeader>
              <DialogTitle>Registrar Vacinação</DialogTitle>
              <DialogDescription>
                Registre uma nova vacinação para um pet
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
                <Label htmlFor="vaccineId">Vacina *</Label>
                <Select name="vaccineId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a vacina" />
                  </SelectTrigger>
                  <SelectContent>
                    {vaccineLibrary?.map((vaccine) => (
                      <SelectItem key={vaccine.id} value={String(vaccine.id)}>
                        {vaccine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <Label htmlFor="doseNumber">Número da Dose</Label>
                  <Input
                    id="doseNumber"
                    name="doseNumber"
                    type="number"
                    min="1"
                    defaultValue="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextDueDate">Próxima Dose</Label>
                <Input
                  id="nextDueDate"
                  name="nextDueDate"
                  type="date"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="veterinarian">Veterinário</Label>
                  <Input
                    id="veterinarian"
                    name="veterinarian"
                    placeholder="Nome do veterinário"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic">Clínica</Label>
                  <Input
                    id="clinic"
                    name="clinic"
                    placeholder="Nome da clínica"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Notas adicionais..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addVaccination.isPending}>
                {addVaccination.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add to Library Dialog */}
      <Dialog open={isAddLibraryDialogOpen} onOpenChange={setIsAddLibraryDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddToLibrary}>
            <DialogHeader>
              <DialogTitle>Nova Vacina na Biblioteca</DialogTitle>
              <DialogDescription>
                Adicione uma nova vacina à biblioteca
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Vacina *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="Ex: V10, Antirrábica..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Descrição da vacina..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="intervalDays">Intervalo (dias)</Label>
                  <Input
                    id="intervalDays"
                    name="intervalDays"
                    type="number"
                    min="1"
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dosesRequired">Doses Necessárias</Label>
                  <Input
                    id="dosesRequired"
                    name="dosesRequired"
                    type="number"
                    min="1"
                    defaultValue="1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddLibraryDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addToLibrary.isPending}>
                {addToLibrary.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
