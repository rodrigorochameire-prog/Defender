import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import TutorLayout from "@/components/TutorLayout";

export default function TutorMedicationsOverview() {
  const { data: pets, isLoading: petsLoading } = trpc.pets.list.useQuery();

  if (petsLoading) {
    return (
      <TutorLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </TutorLayout>
    );
  }

  return (
    <TutorLayout>
      <div className="container py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Pill className="h-8 w-8 text-primary" />
            Medicamentos dos Pets
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os medicamentos e tratamentos dos seus pets
          </p>
        </div>

        {/* Pets List */}
        {!pets || pets.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="empty-state">
                <Pill className="empty-state-icon" />
                <p className="empty-state-title">Nenhum pet cadastrado</p>
                <p className="empty-state-description">
                  Cadastre seus pets para gerenciar os medicamentos
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pets.map((pet) => (
              <Card key={pet.id} className="shadow-card hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {pet.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {pet.name}
                          <Badge variant="outline">{pet.breed}</Badge>
                        </CardTitle>
                        <CardDescription>
                          Clique para ver os medicamentos e tratamentos
                        </CardDescription>
                      </div>
                    </div>
                    <Link href={`/tutor/pets/${pet.id}/medications`}>
                      <Button>
                        Ver Medicamentos
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-base">
              <CheckCircle2 className="h-5 w-5" />
              Gerenciamento de Medicamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Mantenha o controle de todos os medicamentos do seu pet. Clique em cada pet para:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Visualizar medicamentos ativos e histórico</li>
                <li>Registrar novos medicamentos prescritos</li>
                <li>Acompanhar dosagens e frequências</li>
                <li>Receber lembretes de administração</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </TutorLayout>
  );
}
