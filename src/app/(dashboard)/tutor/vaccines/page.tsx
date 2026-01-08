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
  Syringe,
  Calendar,
  Dog,
  CheckCircle2,
  Clock
} from "lucide-react";
import { BreedIcon } from "@/components/breed-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function TutorVaccines() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  const { data: myPets } = trpc.pets.myPets.useQuery();
  const { data: vaccineLibrary } = trpc.vaccines.library.useQuery();

  // Buscar vacinas para cada pet
  const petVaccinesQueries = myPets?.map((pet) => ({
    petId: pet.id,
    petName: pet.name,
    photoUrl: pet.photoUrl,
    breed: pet.breed,
    query: trpc.vaccines.getPetVaccinations.useQuery({ petId: pet.id }),
  })) || [];

  const addVaccination = trpc.vaccines.addVaccination.useMutation({
    onSuccess: () => {
      toast.success("Vacinação registrada com sucesso!");
      setIsAddDialogOpen(false);
      // Invalidar cache
      petVaccinesQueries.forEach(q => q.query.refetch());
    },
    onError: (error) => {
      toast.error("Erro ao registrar vacinação: " + error.message);
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vacinas</h1>
          <p className="text-muted-foreground mt-2">
            Carteira de vacinação dos seus pets
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Vacina
        </Button>
      </div>

      {/* Pets e suas vacinas */}
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
          {petVaccinesQueries.map(({ petId, petName, photoUrl, breed, query }) => {
            const vaccinations = query.data || [];
            const upcomingCount = vaccinations.filter(
              v => v.vaccination.nextDueDate && new Date(v.vaccination.nextDueDate) > new Date()
            ).length;

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
                        {vaccinations.length} vacinas registradas
                      </p>
                    </div>
                    {upcomingCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {upcomingCount} próximas
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {query.isLoading ? (
                    <div className="flex justify-center py-8">
                      <Skeleton className="h-20 w-full rounded-[14px]" />
                    </div>
                  ) : vaccinations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Syringe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma vacina registrada</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          setSelectedPetId(petId);
                          setIsAddDialogOpen(true);
                        }}
                      >
                        Registrar primeira vacina
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 pb-4">
                      {vaccinations.map(({ vaccination, vaccine }) => {
                        const isUpcoming = vaccination.nextDueDate && 
                          new Date(vaccination.nextDueDate) > new Date();
                        const isOverdue = vaccination.nextDueDate && 
                          new Date(vaccination.nextDueDate) < new Date();

                        return (
                          <Card key={vaccination.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Syringe className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{vaccine.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      Dose {vaccination.doseNumber}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Aplicada em: {new Date(vaccination.applicationDate).toLocaleDateString("pt-BR")}
                                  </p>
                                  {vaccination.veterinarian && (
                                    <p className="text-xs text-muted-foreground">
                                      Veterinário: {vaccination.veterinarian}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  {vaccination.nextDueDate && (
                                    <div className="flex items-center gap-1">
                                      {isOverdue ? (
                                        <Badge variant="destructive" className="text-xs">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Atrasada
                                        </Badge>
                                      ) : isUpcoming ? (
                                        <Badge variant="secondary" className="text-xs">
                                          <Calendar className="h-3 w-3 mr-1" />
                                          {new Date(vaccination.nextDueDate).toLocaleDateString("pt-BR")}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs text-green-600">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Em dia
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {vaccination.notes && (
                                <p className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                                  {vaccination.notes}
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

      {/* Add Vaccination Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddVaccination}>
            <DialogHeader>
              <DialogTitle>Registrar Vacinação</DialogTitle>
              <DialogDescription>
                Registre uma nova vacina para seu pet
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
                  <Label htmlFor="doseNumber">Dose</Label>
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic">Clínica</Label>
                  <Input
                    id="clinic"
                    name="clinic"
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
              <Button type="submit" disabled={addVaccination.isPending}>
                {addVaccination.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
