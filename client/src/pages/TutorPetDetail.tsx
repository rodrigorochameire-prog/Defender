import { useState } from "react";
import TutorLayout from "@/components/TutorLayout";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dog,
  Calendar,
  Pill,
  Syringe,
  FileText,
  TrendingUp,
  ArrowLeft,
  Camera,
  Edit,
} from "lucide-react";
import { Link } from "wouter";
import WeightChart from "@/components/WeightChart";
import MoodChart from "@/components/MoodChart";
import FrequencyChart from "@/components/FrequencyChart";
import { PhotoUpload } from "@/components/PhotoUpload";
import { PhotoGallery } from "@/components/PhotoGallery";
import { PhotoGalleryTimeline } from "@/components/PhotoGalleryTimeline";
import { DailyReportCard } from "@/components/DailyReportCard";
import { DocumentViewer } from "@/components/DocumentViewer";
import { WhatsAppContactButton } from "@/components/WhatsAppContactButton";
import { toast } from "sonner";

export default function TutorPetDetail() {
  const [, params] = useRoute("/tutor/pets/:id");
  const petId = params?.id ? parseInt(params.id) : 0;
  const [activeTab, setActiveTab] = useState("overview");

  const { data: pet, isLoading } = trpc.pets.byId.useQuery({ id: petId });
  const { data: vaccinations } = trpc.vaccines.getPetVaccinations.useQuery({ petId });
  const { data: medications } = trpc.medications.getPetMedications.useQuery({ petId });
  const { data: logs } = trpc.logs.getPetLogs.useQuery({ petId });
  const { data: documents } = trpc.documents.getPetDocuments.useQuery({ petId });
  const { data: credits } = trpc.credits.getBalance.useQuery({ petId });

  if (isLoading) {
    return (
      <TutorLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </TutorLayout>
    );
  }

  if (!pet) {
    return (
      <TutorLayout>
      <Card>
        <CardContent className="empty-state">
          <Dog className="empty-state-icon" />
          <p className="empty-state-title">Pet não encontrado</p>
        </CardContent>
      </Card>
      </TutorLayout>
    );
  }

  return (
    <TutorLayout>
      <div className="container max-w-7xl py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tutor/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{pet.name}</h1>
          <p className="text-muted-foreground">{pet.breed || "Sem raça definida"}</p>
        </div>
        <Badge
          className={
            pet.status === "checked-in" ? "badge-checked-in" : "badge-checked-out"
          }
        >
          {pet.status === "checked-in" ? "Na creche" : "Em casa"}
        </Badge>
      </div>

      {/* Pet Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Photo */}
            <div className="flex flex-col items-center gap-3">
              <Avatar className="w-32 h-32">
                <AvatarImage src={pet.photoUrl || undefined} alt={pet.name} />
                <AvatarFallback className="text-4xl bg-gradient-primary text-white">
                  {pet.name[0]}
                </AvatarFallback>
              </Avatar>
              <PhotoUpload
                currentPhotoUrl={pet.photoUrl || undefined}
                petName={pet.name}
                onUploadComplete={(photoUrl: string, photoKey: string) => {
                  toast.success("Foto atualizada com sucesso!");
                  // Update pet photo via tRPC
                  window.location.reload();
                }}
              />
            </div>

            {/* Info Grid */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Idade</p>
                <p className="text-lg font-semibold">{pet.age || "N/A"}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Peso</p>
                <p className="text-lg font-semibold">
                  {pet.weight ? `${(pet.weight / 1000).toFixed(1)}kg` : "N/A"}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Ração</p>
                <p className="text-sm font-semibold truncate">
                  {pet.foodBrand || "N/A"}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Créditos</p>
                <p className="text-lg font-semibold">{credits || 0} dias</p>
              </div>
            </div>
          </div>

          {pet.notes && (
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-2">Observações:</p>
              <p className="text-sm text-muted-foreground">{pet.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="logs">Logs Diários</TabsTrigger>
          <TabsTrigger value="health">Saúde</TabsTrigger>
          <TabsTrigger value="gallery">Galeria</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Logs Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!logs || logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum log registrado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {logs.slice(0, 3).map((log) => (
                      <div key={log.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={log.source === "daycare" ? "default" : "secondary"}>
                            {log.source === "daycare" ? "Creche" : "Casa"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.logDate).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        {log.mood && (
                          <p className="text-sm">
                            <span className="font-medium">Humor:</span> {log.mood}
                          </p>
                        )}
                        {log.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <Link href={`/tutor/pets/${petId}/logs`}>
                  <Button variant="outline" className="w-full mt-4">
                    Ver Todos os Logs
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Active Medications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Medicamentos Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!medications || medications.filter(m => m.medication.isActive).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum medicamento ativo
                  </p>
                ) : (
                  <div className="space-y-3">
                    {medications
                      .filter(m => m.medication.isActive)
                      .slice(0, 3)
                      .map((med) => (
                        <div key={med.medication.id} className="p-3 border rounded-lg">
                          <p className="font-medium text-sm">{med.medicationInfo.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Dosagem: {med.medication.dosage}
                          </p>
                          {med.medication.frequency && (
                            <p className="text-xs text-muted-foreground">
                              Frequência: {med.medication.frequency}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                )}
                <Link href={`/tutor/pets/${petId}/medications`}>
                  <Button variant="outline" className="w-full mt-4">
                    Gerenciar Medicamentos
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Upcoming Vaccinations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Syringe className="h-4 w-4" />
                  Próximas Vacinas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!vaccinations || vaccinations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma vacina agendada
                  </p>
                ) : (
                  <div className="space-y-3">
                    {vaccinations
                      .filter(v => v.vaccination.nextDueDate && new Date(v.vaccination.nextDueDate) > new Date())
                      .slice(0, 3)
                      .map((vacc) => (
                        <div key={vacc.vaccination.id} className="p-3 border rounded-lg">
                          <p className="font-medium text-sm">{vacc.vaccine.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Próxima dose:{" "}
                            {vacc.vaccination.nextDueDate
                              ? new Date(vacc.vaccination.nextDueDate).toLocaleDateString("pt-BR")
                              : "N/A"}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
                <Link href={`/tutor/pets/${petId}/vaccines`}>
                  <Button variant="outline" className="w-full mt-4">
                    Ver Carteira de Vacinação
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Total de documentos</span>
                    <Badge>{documents?.length || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Carteiras de vacinação</span>
                    <Badge>
                      {documents?.filter(d => d.category === "vaccination_card").length || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Exames</span>
                    <Badge>
                      {documents?.filter(d => d.category === "exam").length || 0}
                    </Badge>
                  </div>
                </div>
                <Link href={`/tutor/pets/${petId}/documents`}>
                  <Button variant="outline" className="w-full mt-4">
                    Ver Todos os Documentos
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Logs Diários</CardTitle>
                <Link href={`/tutor/pets/${petId}/logs/new`}>
                  <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    Novo Log
                  </Button>
                </Link>
              </div>
              <CardDescription>
                Registre informações diárias sobre o comportamento e saúde do seu pet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!logs || logs.length === 0 ? (
                <div className="empty-state">
                  <FileText className="empty-state-icon" />
                  <p className="empty-state-title">Nenhum log registrado</p>
                  <p className="empty-state-description">
                    Comece a registrar informações diárias do seu pet
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <DailyReportCard
                      key={log.id}
                      log={log}
                      petName={pet.name}
                      showSource={true}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-6">
          {/* Charts */}
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <WeightChart petId={petId} />
              <MoodChart petId={petId} />
            </div>
            <FrequencyChart petId={petId} />
          </div>

          {/* Health Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Vaccinations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Vacinas</CardTitle>
                  <Link href={`/tutor/pets/${petId}/vaccines`}>
                    <Button size="sm" variant="outline">
                      Ver Todas
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {!vaccinations || vaccinations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma vacina registrada
                  </p>
                ) : (
                  <div className="space-y-2">
                    {vaccinations.slice(0, 5).map((vacc) => (
                      <div key={vacc.vaccination.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{vacc.vaccine.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Aplicada em: {new Date(vacc.vaccination.applicationDate).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        {vacc.vaccination.nextDueDate && (
                          <Badge variant="outline" className="text-xs">
                            {new Date(vacc.vaccination.nextDueDate).toLocaleDateString("pt-BR")}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Medicamentos</CardTitle>
                  <Link href={`/tutor/pets/${petId}/medications`}>
                    <Button size="sm" variant="outline">
                      Ver Todos
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {!medications || medications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum medicamento registrado
                  </p>
                ) : (
                  <div className="space-y-2">
                    {medications.slice(0, 5).map((med) => (
                      <div key={med.medication.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{med.medicationInfo.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Dosagem: {med.medication.dosage}
                          </p>
                        </div>
                        <Badge variant={med.medication.isActive ? "default" : "secondary"}>
                          {med.medication.isActive ? "Ativo" : "Finalizado"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <DocumentViewer petId={petId} />
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="space-y-4">
          <PhotoGalleryTimeline petId={petId} canUpload={true} canDelete={false} />
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          {/* Upcoming Vaccines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Syringe className="h-5 w-5" />
                Próximas Vacinas
              </CardTitle>
              <CardDescription>
                Vacinas agendadas para os próximos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!vaccinations || vaccinations.filter(v => v.vaccination.nextDueDate && new Date(v.vaccination.nextDueDate) > new Date() && new Date(v.vaccination.nextDueDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length === 0 ? (
                <div className="empty-state">
                  <Syringe className="empty-state-icon" />
                  <p className="empty-state-title">Nenhuma vacina agendada</p>
                  <p className="empty-state-description">
                    Todas as vacinas estão em dia
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vaccinations
                    ?.filter(v => v.vaccination.nextDueDate && new Date(v.vaccination.nextDueDate) > new Date() && new Date(v.vaccination.nextDueDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
                    .map((item) => (
                      <div key={item.vaccination.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{item.vaccine.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Próxima dose: {new Date(item.vaccination.nextDueDate!).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {Math.ceil((new Date(item.vaccination.nextDueDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendar Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Eventos do Calendário
              </CardTitle>
              <CardDescription>
                Eventos relacionados ao {pet.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Acesse o <Link href="/tutor/calendar" className="text-primary hover:underline">Calendário Completo</Link> para visualizar todos os eventos</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
      
      {/* Floating WhatsApp Contact Button */}
      <WhatsAppContactButton variant="floating" petName={pet.name} />
    </TutorLayout>
  );
}
