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
  Pill,
  Dog,
  Calendar,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

const medicationTypes = [
  { value: "flea", label: "Antipulgas" },
  { value: "deworming", label: "Vermífugo" },
  { value: "antibiotic", label: "Antibiótico" },
  { value: "antiinflammatory", label: "Anti-inflamatório" },
  { value: "supplement", label: "Suplemento" },
  { value: "other", label: "Outro" },
];

export default function AdminMedications() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddLibraryDialogOpen, setIsAddLibraryDialogOpen] = useState(false);

  const { data: medicationLibrary, refetch: refetchLibrary } = trpc.medications.library.useQuery();
  const { data: activeMedications, refetch: refetchActive } = trpc.medications.getActive.useQuery({});
  const { data: stats } = trpc.medications.stats.useQuery();
  const { data: pets } = trpc.pets.list.useQuery();

  const addMedication = trpc.medications.add.useMutation({
    onSuccess: () => {
      toast.success("Medicamento registrado com sucesso!");
      setIsAddDialogOpen(false);
      refetchActive();
    },
    onError: (error) => {
      toast.error("Erro ao registrar medicamento: " + error.message);
    },
  });

  const addToLibrary = trpc.medications.addToLibrary.useMutation({
    onSuccess: () => {
      toast.success("Medicamento adicionado à biblioteca!");
      setIsAddLibraryDialogOpen(false);
      refetchLibrary();
    },
    onError: (error) => {
      toast.error("Erro ao adicionar medicamento: " + error.message);
    },
  });

  const handleAddMedication = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addMedication.mutate({
      petId: Number(formData.get("petId")),
      medicationId: Number(formData.get("medicationId")),
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string || undefined,
      dosage: formData.get("dosage") as string,
      frequency: formData.get("frequency") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleAddToLibrary = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addToLibrary.mutate({
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      description: formData.get("description") as string || undefined,
      commonDosage: formData.get("commonDosage") as string || undefined,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medicamentos</h1>
          <p className="text-muted-foreground mt-2">
            Gerenciamento de medicamentos e tratamentos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAddLibraryDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Medicamento
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Pill className="mr-2 h-4 w-4" />
            Registrar Tratamento
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Tratamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tratamentos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Tratamentos Ativos</TabsTrigger>
          <TabsTrigger value="library">Biblioteca de Medicamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {!activeMedications || activeMedications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Pill className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhum tratamento ativo
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeMedications.map((item) => (
                <Card key={item.medication.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Pill className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{item.library?.name || "Medicamento"}</CardTitle>
                          <CardDescription className="text-xs">
                            {medicationTypes.find(t => t.value === item.library?.type)?.label}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-green-500">Ativo</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <p><strong>Dosagem:</strong> {item.medication.dosage}</p>
                      {item.medication.frequency && (
                        <p><strong>Frequência:</strong> {item.medication.frequency}</p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        Início: {new Date(item.medication.startDate).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {medicationLibrary?.map((med) => (
              <Card key={med.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {medicationTypes.find(t => t.value === med.type)?.label || med.type}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{med.name}</CardTitle>
                  {med.description && (
                    <CardDescription>{med.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {med.commonDosage && (
                    <p className="text-sm text-muted-foreground">
                      Dosagem comum: {med.commonDosage}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Treatment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddMedication}>
            <DialogHeader>
              <DialogTitle>Registrar Tratamento</DialogTitle>
              <DialogDescription>
                Registre um novo tratamento para um pet
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
                <Label htmlFor="medicationId">Medicamento *</Label>
                <Select name="medicationId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o medicamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicationLibrary?.map((med) => (
                      <SelectItem key={med.id} value={String(med.id)}>
                        {med.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dosage">Dosagem *</Label>
                <Input
                  id="dosage"
                  name="dosage"
                  placeholder="Ex: 1 comprimido, 5ml..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequência</Label>
                <Input
                  id="frequency"
                  name="frequency"
                  placeholder="Ex: 2x ao dia"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Início *</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Término</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                  />
                </div>
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
              <Button type="submit" disabled={addMedication.isPending}>
                {addMedication.isPending ? "Salvando..." : "Salvar"}
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
              <DialogTitle>Novo Medicamento na Biblioteca</DialogTitle>
              <DialogDescription>
                Adicione um novo medicamento à biblioteca
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Medicamento *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commonDosage">Dosagem Comum</Label>
                <Input
                  id="commonDosage"
                  name="commonDosage"
                  placeholder="Ex: 1 comp/10kg"
                />
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
