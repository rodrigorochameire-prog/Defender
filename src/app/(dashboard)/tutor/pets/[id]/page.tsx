"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PetAvatar } from "@/components/pet-avatar";
import {
  Dog,
  Calendar,
  Weight,
  Utensils,
  FileText,
  Pencil,
  Coins,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Syringe,
  Pill,
  GraduationCap,
  ClipboardList,
  FolderOpen,
  MessageSquare,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { LoadingPage } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { notFound } from "next/navigation";

interface PetPageProps {
  params: Promise<{ id: string }>;
}

export default function TutorPetDetailPage(props: PetPageProps) {
  const params = use(props.params);
  const petId = parseInt(params.id);

  const { data: pet, isLoading, error } = trpc.pets.byId.useQuery({ id: petId });

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error || !pet) {
    notFound();
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Aprovado
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="warning" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Pendente
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const PetIcon = Dog;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pet.name}
        description={pet.breed || "Cachorro"}
        backHref="/tutor/pets"
        actions={
          <Button asChild>
            <Link href={`/tutor/pets/${pet.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Principal */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <PetAvatar 
                  photoUrl={pet.photoUrl} 
                  breed={pet.breed} 
                  name={pet.name} 
                  size={64} 
                />
                <div className="flex-1">
                  <CardTitle className="text-2xl">{pet.name}</CardTitle>
                  <CardDescription>{pet.breed}</CardDescription>
                </div>
                {getStatusBadge(pet.approvalStatus)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {pet.birthDate && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Nascimento</p>
                      <p className="font-medium">{formatDate(pet.birthDate)}</p>
                    </div>
                  </div>
                )}

                {pet.weight && (
                  <div className="flex items-start gap-2">
                    <Weight className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Peso</p>
                      <p className="font-medium">{(pet.weight / 1000).toFixed(1)} kg</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Coins className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Créditos</p>
                    <p className="font-medium">{pet.credits} dias</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alimentação */}
          {(pet.foodBrand || pet.foodAmount) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Utensils className="h-5 w-5" />
                  Alimentação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {pet.foodBrand && (
                    <div>
                      <p className="text-sm text-muted-foreground">Marca da ração</p>
                      <p className="font-medium">{pet.foodBrand}</p>
                    </div>
                  )}
                  {pet.foodAmount && (
                    <div>
                      <p className="text-sm text-muted-foreground">Quantidade diária</p>
                      <p className="font-medium">{pet.foodAmount}g</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          {pet.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{pet.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Créditos */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Créditos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{pet.credits}</div>
              <p className="text-sm text-muted-foreground">dias de creche</p>
              <Separator className="my-4" />
              <Button asChild className="w-full">
                <Link href="/tutor/credits">Comprar Créditos</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/tutor/bookings">
                  <Clock className="h-4 w-4 mr-2" />
                  Fazer Reserva
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/tutor/calendar">
                  <Calendar className="h-4 w-4 mr-2" />
                  Ver Calendário
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Gestão de Saúde */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Saúde & Cuidados
              </CardTitle>
              <CardDescription>Acompanhe todos os registros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/tutor/vaccines">
                  <Syringe className="h-4 w-4 mr-2 text-blue-500" />
                  Vacinas
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/tutor/medications">
                  <Pill className="h-4 w-4 mr-2 text-purple-500" />
                  Medicamentos
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/tutor/training">
                  <GraduationCap className="h-4 w-4 mr-2 text-orange-500" />
                  Treinamento
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/tutor/logs">
                  <ClipboardList className="h-4 w-4 mr-2 text-green-500" />
                  Logs Diários
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/tutor/documents">
                  <FolderOpen className="h-4 w-4 mr-2 text-amber-500" />
                  Documentos
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Comunicação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Comunicação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/tutor/wall">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ver Mural
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Info do Cadastro */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informações</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <div className="flex justify-between">
                <span>Cadastrado em</span>
                <span>{formatDate(pet.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Última atualização</span>
                <span>{formatDate(pet.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
