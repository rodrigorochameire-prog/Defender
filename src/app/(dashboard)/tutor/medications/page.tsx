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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Plus, 
  Pill,
  Calendar,
  Dog,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { BreedIcon } from "@/components/breed-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function TutorMedications() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  const { data: myPets } = trpc.pets.myPets.useQuery();
  const { data: medicationLibrary } = trpc.medications.library.useQuery();

  // Buscar medicamentos para cada pet
  const petMedicationsQueries = myPets?.map((pet) => ({
    petId: pet.id,
    petName: pet.name,
    photoUrl: pet.photoUrl,
    breed: pet.breed,
    query: trpc.medications.getPetMedications.useQuery({ petId: pet.id }),
  })) || [];

  const addMedication = trpc.medications.add.useMutation({
    onSuccess: () => {
      toast.success("Medicamento registrado com sucesso!");
      setIsAddDialogOpen(false);
      petMedicationsQueries.forEach(q => q.query.refetch());
    },
    onError: (error) => {
      toast.error("Erro ao registrar medicamento: " + error.message);
    },
  });

  const handleAddMedication = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const medicationId = formData.get("medicationId");
    const customMedName = formData.get("customMedName") as string;

    addMedication.mutate({
      petId: Number(formData.get("petId")),
      medicationId: medicationId && medicationId !== "custom" ? Number(medicationId) : undefined,
      customMedName: medicationId === "custom" ? customMedName : undefined,
      customMedType: medicationId === "custom" ? (formData.get("customMedType") as string) : undefined,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string || undefined,
      dosage: formData.get("dosage") as string,
      frequency: formData.get("frequency") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medicamentos</h1>
          <p className="text-muted-foreground mt-2">
            Controle de medicamentos dos seus pets
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Medicamento
        </Button>
      </div>

      {/* Pets e seus medicamentos */}
      {!myPets || myPets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dog className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Você ainda não tem pets cadastrados
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-4">
          {petMedicationsQueries.map(({ petId, petName, photoUrl, breed, query }) => {
            const medications = query.data || [];
            const activeCount = medications.filter(m => m.medication.isActive).length;

            return (
              <AccordionItem key={petId} value={String(petId)} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    {photoUrl ? (
                      <img 
                        src={photoUrl} 
                        alt={petName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <BreedIcon breed={breed} className="h-5 w-5 text-slate-500" />
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-medium">{petName}</p>
                      <p className="text-sm text-muted-foreground">
                        {medications.length} medicamentos registrados
                      </p>
                    </div>
                    {activeCount > 0 && (
                      <Badge className="ml-2 bg-green-500">
                        {activeCount} ativo{activeCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {query.isLoading ? (
                    <div className="flex justify-center py-8">
                      <Skeleton className="h-20 w-full rounded-[14px]" />
                    </div>
                  ) : medications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum medicamento registrado</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          setSelectedPetId(petId);
                          setIsAddDialogOpen(true);
                        }}
                      >
                        Adicionar medicamento
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 pb-4">
                      {medications.map(({ medication, library }) => {
                        const isActive = medication.isActive;
                        const hasEnded = medication.endDate && new Date(medication.endDate) < new Date();

                        return (
                          <Card key={medication.id} className={!isActive ? "opacity-60" : ""}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Pill className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{library?.name || "Medicamento"}</span>
                                    {isActive ? (
                                      <Badge className="bg-green-500 text-xs">Ativo</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">Finalizado</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Dosagem: {medication.dosage}
                                    {medication.frequency && ` • ${medication.frequency}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Início: {new Date(medication.startDate).toLocaleDateString("pt-BR")}
                                    {medication.endDate && (
                                      <> • Término: {new Date(medication.endDate).toLocaleDateString("pt-BR")}</>
                                    )}
                                  </p>
                                </div>
                                <div>
                                  {isActive && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        // TODO: Marcar como administrado
                                      }}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Administrar
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {medication.notes && (
                                <p className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                                  {medication.notes}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Add Medication Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddMedication}>
            <DialogHeader>
              <DialogTitle>Novo Medicamento</DialogTitle>
              <DialogDescription>
                Registre um medicamento para seu pet
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="petId">Pet *</Label>
                <Select name="petId" defaultValue={selectedPetId ? String(selectedPetId) : undefined} required>
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
                <Label htmlFor="medicationId">Medicamento *</Label>
                <Select name="medicationId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o medicamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">+ Outro (personalizado)</SelectItem>
                    {medicationLibrary?.map((med) => (
                      <SelectItem key={med.id} value={String(med.id)}>
                        {med.name} ({med.type})
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
                  placeholder="Ex: 2x ao dia, a cada 8 horas..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de Início *</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data de Término</Label>
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
    </div>
  );
}
