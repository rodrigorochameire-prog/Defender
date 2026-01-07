import { useState } from "react";
import TutorLayout from "@/components/TutorLayout";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pill, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { RecentChangeIndicator } from "@/components/RecentChangeIndicator";
import { PeriodicitySelector, type PeriodicityConfig } from "@/components/PeriodicitySelector";
import { MedicationTimeEditor } from "@/components/MedicationTimeEditor";

export default function TutorMedications() {
  const [, params] = useRoute("/tutor/pets/:id/medications");
  const petId = params?.id ? parseInt(params.id) : 0;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMedicationId, setSelectedMedicationId] = useState<number | null>(null);
  const [customMedication, setCustomMedication] = useState<boolean>(false);
  const [administrationTimes, setAdministrationTimes] = useState<string[]>([]);
  const [periodicityConfig, setPeriodicityConfig] = useState<PeriodicityConfig>({
    periodicity: "daily",
    customInterval: undefined,
    weekDays: undefined,
    monthDays: undefined,
  });

  const { data: pet } = trpc.pets.byId.useQuery({ id: petId });
  const { data: medications, refetch } = trpc.medications.getPetMedications.useQuery({ petId });
  const { data: library } = trpc.medications.library.useQuery();
  const { data: petHistory } = trpc.changeHistory.getPetHistory.useQuery({ petId });
  
  // Helper to get recent changes for a specific medication
  const getRecentChanges = (medicationId: number) => {
    if (!petHistory) return [];
    return petHistory
      .filter((change: any) => 
        change.resourceType === "medication" && 
        change.resourceId === medicationId
      )
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  };

  const addMedication = trpc.medications.add.useMutation({
    onSuccess: () => {
      toast.success("Medicamento adicionado com sucesso!");
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao adicionar medicamento: " + error.message);
    },
  });

  const updateMedication = trpc.medications.update.useMutation({
    onSuccess: () => {
      toast.success("Medicamento atualizado!");
      refetch();
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });

  const scheduleNext = trpc.medications.scheduleNext.useMutation({
    onSuccess: (data) => {
      toast.success(`Próxima dose agendada para ${new Date(data.nextDate).toLocaleDateString('pt-BR')} - ${data.dosage}`);
      refetch();
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const medicationId = formData.get("medicationId") ? parseInt(formData.get("medicationId") as string) : undefined;
    const customMedName = formData.get("customMedName") as string;
    const customMedType = formData.get("customMedType") as string;
    const customMedDescription = formData.get("customMedDescription") as string;
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;
    const dosage = formData.get("dosage") as string;
    const frequency = formData.get("frequency") as string;
    const notes = formData.get("notes") as string;
    const dosageProgression = formData.get("dosageProgression") as string;
    const progressionRate = formData.get("progressionRate") as string;
    const progressionInterval = formData.get("progressionInterval") as string;
    const targetDosage = formData.get("targetDosage") as string;

    addMedication.mutate({
      petId,
      medicationId: customMedication ? undefined : medicationId,
      customMedName: customMedication ? customMedName : undefined,
      customMedType: customMedication ? customMedType : undefined,
      customMedDescription: customMedication ? customMedDescription : undefined,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      dosage,
      frequency: frequency || undefined,
      // Administration times
      administrationTimes: administrationTimes.length > 0 ? JSON.stringify(administrationTimes) : undefined,
      // Periodicity fields
      periodicity: periodicityConfig.periodicity,
      customInterval: periodicityConfig.customInterval,
      weekDays: periodicityConfig.weekDays,
      monthDays: periodicityConfig.monthDays,
      autoSchedule: false, // Can be enabled later
      // Dosage progression fields
      dosageProgression: dosageProgression as any || "stable",
      progressionRate: progressionRate || undefined,
      progressionInterval: progressionInterval ? parseInt(progressionInterval) : undefined,
      targetDosage: targetDosage || undefined,
      notes: notes || undefined,
    });
  };

  const activeMedications = medications?.filter(m => m.medication.isActive) || [];
  const completedMedications = medications?.filter(m => !m.medication.isActive) || [];

  return (
    <TutorLayout>
      <div className="container max-w-7xl py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/tutor/pets/${petId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Medicamentos</h1>
          <p className="text-muted-foreground">{pet?.name}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Medicamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Medicamento</DialogTitle>
              <DialogDescription>
                Registre um novo medicamento ou tratamento para o pet
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 px-1">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="customMed"
                    checked={customMedication}
                    onChange={(e) => setCustomMedication(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="customMed" className="cursor-pointer">
                    Medicamento personalizado (não está na lista)
                  </Label>
                </div>

                {!customMedication ? (
                  <div className="space-y-2">
                    <Label htmlFor="medicationId">Medicamento *</Label>
                    <Select
                      name="medicationId"
                      value={selectedMedicationId?.toString() || ""}
                      onValueChange={(value) => setSelectedMedicationId(parseInt(value))}
                      required={!customMedication}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o medicamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {library?.map((med) => (
                          <SelectItem key={med.id} value={med.id.toString()}>
                            {med.name} - {med.type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedMedicationId && (
                      <p className="text-xs text-muted-foreground">
                        {library?.find(m => m.id === selectedMedicationId)?.description}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="customMedName">Nome do Medicamento *</Label>
                      <Input
                        id="customMedName"
                        name="customMedName"
                        placeholder="Ex: Antibiótico XYZ"
                        required={customMedication}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customMedType">Tipo *</Label>
                      <Input
                        id="customMedType"
                        name="customMedType"
                        placeholder="Ex: Antibiótico, Anti-inflamatório, Suplemento, Especial"
                        required={customMedication}
                      />
                      <p className="text-xs text-muted-foreground">
                        Digite qualquer tipo que desejar
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customMedDescription">Descrição</Label>
                      <Textarea
                        id="customMedDescription"
                        name="customMedDescription"
                        rows={2}
                        placeholder="Informações adicionais sobre o medicamento"
                      />
                    </div>
                  </div>
                )}
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
                  <Input id="endDate" name="endDate" type="date" />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para tratamento contínuo
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dosage">Dosagem *</Label>
                <Input
                  id="dosage"
                  name="dosage"
                  placeholder="Ex: 1 comprimido, 5ml, 1 aplicação"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequência (Descrição)</Label>
                <Input
                  id="frequency"
                  name="frequency"
                  placeholder="Ex: 1x ao dia, a cada 12h, junto com a refeição"
                />
                <p className="text-xs text-muted-foreground">
                  Descrição adicional da frequência (opcional)
                </p>
              </div>

              <div className="border-t pt-4">
                <MedicationTimeEditor
                  times={administrationTimes}
                  onChange={setAdministrationTimes}
                />
              </div>

              <div className="border-t pt-4">
                <PeriodicitySelector
                  value={periodicityConfig}
                  onChange={setPeriodicityConfig}
                  showPreview={true}
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                <div>
                  <Label>Progressividade de Dose</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Configure ajustes graduais na dosagem ao longo do tratamento
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dosageProgression">Tipo de Ajuste</Label>
                  <select
                    id="dosageProgression"
                    name="dosageProgression"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="stable"
                  >
                    <option value="stable">Estável (sem ajustes)</option>
                    <option value="increase">↑ Progressiva (aumentar gradualmente)</option>
                    <option value="decrease">↓ Regressiva (diminuir gradualmente)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="progressionRate">Taxa de Ajuste</Label>
                    <Input
                      id="progressionRate"
                      name="progressionRate"
                      placeholder="Ex: 10%, 5mg, 0.5ml"
                    />
                    <p className="text-xs text-muted-foreground">
                      Valor ou porcentagem do ajuste
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="progressionInterval">A Cada (doses)</Label>
                    <Input
                      id="progressionInterval"
                      name="progressionInterval"
                      type="number"
                      min="1"
                      placeholder="Ex: 3"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ajustar a cada X doses
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetDosage">Dosagem Alvo (opcional)</Label>
                  <Input
                    id="targetDosage"
                    name="targetDosage"
                    placeholder="Ex: 20mg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Dosagem final desejada (o ajuste para ao atingir)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Instruções especiais, horários, etc."
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
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

      {/* Active Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Tratamentos Ativos
          </CardTitle>
          <CardDescription>
            Medicamentos em uso no momento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeMedications.length === 0 ? (
            <div className="empty-state">
              <Pill className="empty-state-icon" />
              <p className="empty-state-title">Nenhum tratamento ativo</p>
              <p className="empty-state-description">
                Adicione medicamentos que o pet está tomando atualmente
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeMedications.map((med) => (
                <div key={med.medication.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{med.medicationInfo.name}</h3>
                        <RecentChangeIndicator 
                          changes={getRecentChanges(med.medication.id)}
                          resourceType="medication"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">
                          {med.medicationInfo.type}
                        </Badge>
                        {med.medication.periodicity && med.medication.periodicity !== "daily" && (
                          <Badge variant="secondary" className="text-xs">
                            {med.medication.periodicity === "weekly" && "Semanal"}
                            {med.medication.periodicity === "monthly" && "Mensal"}
                            {med.medication.periodicity === "custom" && `${med.medication.customInterval || '?'} dias`}
                          </Badge>
                        )}
                        {med.medication.dosageProgression && med.medication.dosageProgression !== "stable" && (
                          <Badge variant="default" className="text-xs">
                            {med.medication.dosageProgression === "increase" ? "↑ Progressiva" : "↓ Regressiva"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => scheduleNext.mutate({ medicationId: med.medication.id, petId: petId })}
                        disabled={scheduleNext.isPending}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Agendar Próxima Dose
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateMedication.mutate({ id: med.medication.id, petId: petId, isActive: false })}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Finalizar
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Dosagem</p>
                      <p className="font-medium">{med.medication.dosage}</p>
                    </div>
                    {med.medication.frequency && (
                      <div>
                        <p className="text-muted-foreground">Frequência</p>
                        <p className="font-medium">{med.medication.frequency}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Início</p>
                      <p className="font-medium">
                        {new Date(med.medication.startDate).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {med.medication.endDate && (
                      <div>
                        <p className="text-muted-foreground">Término</p>
                        <p className="font-medium">
                          {new Date(med.medication.endDate).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    )}
                  </div>

                  {med.medication.notes && (
                    <div className="mt-3 p-3 bg-muted/30 rounded">
                      <p className="text-sm text-muted-foreground">{med.medication.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Medications */}
      {completedMedications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Tratamentos Finalizados
            </CardTitle>
            <CardDescription>
              Histórico de medicamentos já utilizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedMedications.map((med) => (
                <div key={med.medication.id} className="p-4 border rounded-lg opacity-75">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{med.medicationInfo.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Dosagem: {med.medication.dosage}
                        {med.medication.frequency && ` • ${med.medication.frequency}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(med.medication.startDate).toLocaleDateString("pt-BR")} -{" "}
                        {med.medication.endDate
                          ? new Date(med.medication.endDate).toLocaleDateString("pt-BR")
                          : "Contínuo"}
                      </p>
                    </div>
                    <Badge variant="secondary">Finalizado</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips Card */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">💡 Dicas de Medicação</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• Configure alarmes no celular para não esquecer os horários</p>
          <p>• Mantenha os medicamentos em local seguro e fora do alcance do pet</p>
          <p>• Anote qualquer reação adversa nas observações</p>
          <p>• Consulte sempre o veterinário antes de interromper um tratamento</p>
          <p>• Guarde as embalagens e bulas para referência futura</p>
        </CardContent>
      </Card>
      </div>
    </TutorLayout>
  );
}
