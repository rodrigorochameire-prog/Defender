"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, CheckCircle2, XCircle, Calendar, Weight, Utensils, Loader2, Syringe, Pill, FileText, Camera, Dog } from "lucide-react";
import { BreedIcon } from "@/components/breed-icons";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminPetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const petId = parseInt(params.id as string);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: pet, isLoading, refetch } = trpc.pets.byId.useQuery({ id: petId });
  
  // TODO: Implementar queries específicas para pet
  const petVaccines: any[] = [];
  const petMedications: any[] = [];
  const petLogs: any[] = [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <Dog className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Pet não encontrado</p>
            <Link href="/admin/pets">
              <Button variant="link" className="mt-4">
                Voltar para lista de pets
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const calculateAge = () => {
    if (!pet.birthDate) return "N/A";
    const birth = new Date(pet.birthDate);
    const today = new Date();
    const ageInMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    const years = Math.floor(ageInMonths / 12);
    const months = ageInMonths % 12;
    
    if (years === 0) return `${months} ${months === 1 ? "mês" : "meses"}`;
    if (months === 0) return `${years} ${years === 1 ? "ano" : "anos"}`;
    return `${years} ${years === 1 ? "ano" : "anos"} e ${months} ${months === 1 ? "mês" : "meses"}`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/pets">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{pet.name}</h1>
            <p className="text-muted-foreground">{pet.breed || "Raça não informada"}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={pet.status === "checked-in" ? "default" : "secondary"} className="text-sm">
            {pet.status === "checked-in" ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Na Creche
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-1" />
                Fora da Creche
              </>
            )}
          </Badge>
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* Pet Overview Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-8">
            {/* Photo */}
            <div className="flex-shrink-0">
              {pet.photoUrl ? (
                <img
                  src={pet.photoUrl}
                  alt={pet.name}
                  className="w-32 h-32 rounded-lg object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-primary/50" />
                </div>
              )}
            </div>

            {/* Info Grid */}
            <div className="flex-1 grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground flex items-center mb-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Idade
                </p>
                <p className="text-lg font-semibold">{calculateAge()}</p>
                {pet.birthDate && (
                  <p className="text-xs text-muted-foreground">
                    Nascimento: {format(new Date(pet.birthDate), "dd/MM/yyyy")}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground flex items-center mb-1">
                  <Weight className="h-4 w-4 mr-1" />
                  Peso
                </p>
                <p className="text-lg font-semibold">
                  {pet.weight ? `${(pet.weight / 1000).toFixed(1)} kg` : "N/A"}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground flex items-center mb-1">
                  <Utensils className="h-4 w-4 mr-1" />
                  Alimentação
                </p>
                <p className="text-lg font-semibold">{pet.foodBrand || "N/A"}</p>
                {pet.foodAmount && (
                  <p className="text-xs text-muted-foreground">{pet.foodAmount}g por dia</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {pet.notes && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-semibold mb-2">Observações</h3>
              <p className="text-sm text-muted-foreground">{pet.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Syringe className="h-4 w-4" />
            Saúde
          </TabsTrigger>
          <TabsTrigger value="medications" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Medicamentos
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vacinas</CardTitle>
              <CardDescription>Histórico de vacinação do pet</CardDescription>
            </CardHeader>
            <CardContent>
              {petVaccines.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhuma vacina registrada</p>
              ) : (
                <div className="space-y-3">
                  {petVaccines.map((vaccine: any) => (
                    <div key={vaccine.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{vaccine.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Aplicada em: {format(new Date(vaccine.administeredDate), "dd/MM/yyyy")}
                        </p>
                      </div>
                      {vaccine.nextDueDate && (
                        <Badge variant="outline">
                          Próxima: {format(new Date(vaccine.nextDueDate), "dd/MM/yyyy")}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medicamentos</CardTitle>
              <CardDescription>Medicamentos atuais e histórico</CardDescription>
            </CardHeader>
            <CardContent>
              {petMedications.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum medicamento registrado</p>
              ) : (
                <div className="space-y-3">
                  {petMedications.map((med: any) => (
                    <div key={med.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{med.name}</p>
                        <p className="text-sm text-muted-foreground">{med.dosage}</p>
                      </div>
                      <Badge variant={med.isActive ? "default" : "secondary"}>
                        {med.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logs Diários</CardTitle>
              <CardDescription>Registros de atividades e observações</CardDescription>
            </CardHeader>
            <CardContent>
              {petLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum log registrado</p>
              ) : (
                <div className="space-y-3">
                  {petLogs.slice(0, 10).map((log: any) => (
                    <div key={log.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.date), "dd/MM/yyyy")}
                        </p>
                        {log.mood && <Badge variant="outline">{log.mood}</Badge>}
                      </div>
                      {log.notes && <p className="text-sm">{log.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
