import { useState } from "react";
import { useParams, Link } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PetPhotoUpload } from "@/components/PetPhotoUpload";
import { PetEditForm } from "@/components/PetEditForm";
import { PetTutorsManager } from "@/components/PetTutorsManager";
import { HealthTimeline } from "@/components/HealthTimeline";
import { PetHealthDashboard } from "@/components/PetHealthDashboard";
import { PhotoGalleryTimeline } from "@/components/PhotoGalleryTimeline";
import { DailyLogsTimeline } from "@/components/DailyLogsTimeline";
import { CreditBalance } from "@/components/CreditBalance";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentViewer } from "@/components/DocumentViewer";
import { generateHealthReportPDF } from "@/lib/healthReportPDF";
import { ArrowLeft, Edit, CheckCircle2, XCircle, Calendar, Weight, Utensils, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminPetDetail() {
  const params = useParams();
  const petId = parseInt(params.id as string);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: pet, isLoading, refetch } = trpc.pets.byId.useQuery({ id: petId });
  const { data: vaccines = [] } = trpc.vaccines.getPetVaccinations.useQuery({ petId });
  const { data: medications = [] } = trpc.medications.getPetMedications.useQuery({ petId });
  const { data: logs = [] } = trpc.logs.getPetLogs.useQuery({ petId });
  const utils = trpc.useUtils();

  const updatePhotoMutation = trpc.pets.updateAdmin.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!pet) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Pet não encontrado</p>
              <Link href="/admin/pets">
                <Button variant="link" className="mt-4">
                  Voltar para lista de pets
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const { data: healthHistory, isLoading: loadingHistory } = trpc.healthReports.getPetHealthHistory.useQuery({ petId });

  const handleDownloadPDF = () => {
    if (!healthHistory) {
      toast.error("Histórico de saúde não disponível");
      return;
    }

    try {
      generateHealthReportPDF(healthHistory as any);
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar relatório PDF");
    }
  };

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
    <AdminLayout>
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
              Editar Informações
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF} disabled={loadingHistory}>
              <Download className="h-4 w-4 mr-2" />
              {loadingHistory ? "Carregando..." : "Baixar Relatório PDF"}
            </Button>
          </div>
        </div>

        {/* Pet Overview Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-8">
              {/* Photo */}
              <PetPhotoUpload
                currentPhotoUrl={pet.photoUrl}
                petId={pet.id}
                petName={pet.name}
                onPhotoUpdated={(newUrl) => {
                  updatePhotoMutation.mutate({ id: pet.id, photoUrl: newUrl });
                }}
              />

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
        <Tabs defaultValue="metrics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
            <TabsTrigger value="logs">Logs Diários</TabsTrigger>
            <TabsTrigger value="health">Histórico</TabsTrigger>
            <TabsTrigger value="photos">Fotos</TabsTrigger>
            <TabsTrigger value="credits">Créditos</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="tutors">Tutores</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="space-y-4">
            <PetHealthDashboard petId={pet.id} petName={pet.name} />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <DailyLogsTimeline petId={pet.id} petName={pet.name} />
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <HealthTimeline petId={pet.id} petName={pet.name} />
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            <PhotoGalleryTimeline petId={pet.id} canUpload={true} canDelete={true} />
          </TabsContent>

          <TabsContent value="credits" className="space-y-4">
            <CreditBalance petId={pet.id} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="flex justify-end mb-4">
              <DocumentUpload petId={pet.id} onUploadSuccess={refetch} />
            </div>
            <DocumentViewer petId={pet.id} />
          </TabsContent>

          <TabsContent value="tutors" className="space-y-4">
            <PetTutorsManager petId={pet.id} petName={pet.name} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <PetEditForm
        pet={pet}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />
    </AdminLayout>
  );
}
