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
  Shield,
  Bug,
  AlertCircle,
  Calendar,
  Dog,
  CheckCircle2,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingPage } from "@/components/shared/loading";
import { Checkbox } from "@/components/ui/checkbox";

const treatmentTypes = [
  { value: "flea", label: "Antipulgas", icon: Bug, color: "text-blue-600", bgColor: "bg-blue-100" },
  { value: "deworming", label: "Vermífugo", icon: Shield, color: "text-green-600", bgColor: "bg-green-100" },
  { value: "heartworm", label: "Dirofilariose", icon: Shield, color: "text-red-600", bgColor: "bg-red-100" },
];

export default function TutorPreventivesPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [addToCalendar, setAddToCalendar] = useState(true);
  const [reminderDays, setReminderDays] = useState(3);

  const { data: pets, isLoading: loadingPets } = trpc.pets.myPets.useQuery();
  
  // Buscar preventivos de cada pet
  const petIds = pets?.map(p => p.id) || [];
  const { data: preventivesData, refetch } = trpc.preventives.byPet.useQuery(
    { petId: selectedPetId || petIds[0] || 0 },
    { enabled: petIds.length > 0 || selectedPetId !== null }
  );

  const addTreatment = trpc.preventives.add.useMutation({
    onSuccess: () => {
      toast.success("Tratamento registrado com sucesso!");
      setIsAddDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao registrar: " + error.message);
    },
  });

  const handleAddTreatment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addTreatment.mutate({
      petId: Number(formData.get("petId")),
      type: formData.get("type") as "flea" | "deworming" | "heartworm",
      productName: formData.get("productName") as string,
      applicationDate: formData.get("applicationDate") as string,
      nextDueDate: formData.get("nextDueDate") as string || undefined,
      dosage: formData.get("dosage") as string || undefined,
      notes: formData.get("notes") as string || undefined,
      addToCalendar,
      reminderDaysBefore: reminderDays,
    });
  };

  // Organizar preventivos por status
  const now = new Date();
  const upcoming = preventivesData?.filter(t => t.nextDueDate && new Date(t.nextDueDate) > now) || [];
  const overdue = preventivesData?.filter(t => t.nextDueDate && new Date(t.nextDueDate) <= now) || [];
  const history = preventivesData?.filter(t => !t.nextDueDate) || [];

  if (loadingPets) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preventivos"
        description="Controle de antipulgas, vermífugos e outros tratamentos preventivos"
        icon={Shield}
      />

      {/* Seletor de Pet */}
      {pets && pets.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label>Selecione o pet:</Label>
              <Select 
                value={selectedPetId?.toString() || pets[0]?.id.toString()} 
                onValueChange={(v) => setSelectedPetId(Number(v))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id.toString()}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Tratamento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Em Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{upcoming.length}</div>
            <p className="text-xs text-muted-foreground">tratamentos agendados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdue.length}</div>
            <p className="text-xs text-muted-foreground">precisam de atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Histórico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{history.length}</div>
            <p className="text-xs text-muted-foreground">tratamentos realizados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Próximos ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className={overdue.length > 0 ? "text-red-600" : ""}>
            Atrasados ({overdue.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhum tratamento agendado
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar primeiro tratamento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((treatment) => {
                const daysUntil = Math.ceil(
                  (new Date(treatment.nextDueDate!).getTime() - now.getTime()) / 
                  (1000 * 60 * 60 * 24)
                );
                const typeInfo = treatmentTypes.find(t => t.value === treatment.type);
                const TypeIcon = typeInfo?.icon || Shield;

                return (
                  <Card key={treatment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full ${typeInfo?.bgColor} flex items-center justify-center`}>
                            <TypeIcon className={`h-5 w-5 ${typeInfo?.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base">{treatment.productName}</CardTitle>
                            <CardDescription className="text-xs">
                              {typeInfo?.label}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={daysUntil <= 7 ? "destructive" : "secondary"}>
                          {daysUntil} dias
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Próxima: {new Date(treatment.nextDueDate!).toLocaleDateString("pt-BR")}
                      </p>
                      {treatment.dosage && (
                        <p className="text-xs text-muted-foreground">
                          Dosagem: {treatment.dosage}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          {overdue.length === 0 ? (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
                <p className="text-lg font-medium text-green-700 dark:text-green-400">
                  Todos os tratamentos em dia! 🎉
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {overdue.map((treatment) => {
                const daysOverdue = Math.ceil(
                  (now.getTime() - new Date(treatment.nextDueDate!).getTime()) / 
                  (1000 * 60 * 60 * 24)
                );
                const typeInfo = treatmentTypes.find(t => t.value === treatment.type);

                return (
                  <Card key={treatment.id} className="border-red-200 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{treatment.productName}</CardTitle>
                            <CardDescription className="text-xs">
                              {typeInfo?.label}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="destructive">
                          {daysOverdue} dias atrasado
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Venceu em: {new Date(treatment.nextDueDate!).toLocaleDateString("pt-BR")}
                      </p>
                      <Button 
                        size="sm" 
                        className="mt-3 w-full"
                        onClick={() => {
                          // TODO: Implementar renovação
                          toast.info("Em breve: renovar tratamento");
                        }}
                      >
                        Renovar Tratamento
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {preventivesData && preventivesData.length > 0 ? (
            <div className="space-y-3">
              {preventivesData.map((treatment) => {
                const typeInfo = treatmentTypes.find(t => t.value === treatment.type);
                const TypeIcon = typeInfo?.icon || Shield;

                return (
                  <Card key={treatment.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full ${typeInfo?.bgColor} flex items-center justify-center`}>
                            <TypeIcon className={`h-4 w-4 ${typeInfo?.color}`} />
                          </div>
                          <div>
                            <p className="font-medium">{treatment.productName}</p>
                            <p className="text-sm text-muted-foreground">
                              Aplicado em: {new Date(treatment.applicationDate).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{typeInfo?.label}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhum tratamento registrado
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Treatment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddTreatment}>
            <DialogHeader>
              <DialogTitle>Registrar Tratamento Preventivo</DialogTitle>
              <DialogDescription>
                Registre antipulgas, vermífugo ou outro preventivo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="petId">Pet *</Label>
                <Select name="petId" required defaultValue={selectedPetId?.toString() || pets?.[0]?.id.toString()}>
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
                <Label htmlFor="type">Tipo *</Label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {treatmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className={`h-4 w-4 ${type.color}`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">Nome do Produto *</Label>
                <Input
                  id="productName"
                  name="productName"
                  placeholder="Ex: Bravecto, Nexgard, Drontal..."
                  required
                />
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
                  <Label htmlFor="nextDueDate">Próxima Dose</Label>
                  <Input
                    id="nextDueDate"
                    name="nextDueDate"
                    type="date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dosage">Dosagem</Label>
                <Input
                  id="dosage"
                  name="dosage"
                  placeholder="Ex: 1 comprimido, 1 pipeta..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  placeholder="Observações adicionais..."
                />
              </div>

              {/* Opções de Calendário */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="addToCalendar"
                    checked={addToCalendar}
                    onCheckedChange={(checked) => setAddToCalendar(checked as boolean)}
                  />
                  <Label htmlFor="addToCalendar" className="font-normal cursor-pointer">
                    Adicionar ao calendário automaticamente
                  </Label>
                </div>
                
                {addToCalendar && (
                  <div className="flex items-center gap-2 ml-6">
                    <Label htmlFor="reminderDays" className="text-sm whitespace-nowrap">
                      Lembrete
                    </Label>
                    <Select 
                      value={reminderDays.toString()} 
                      onValueChange={(v) => setReminderDays(Number(v))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 dia</SelectItem>
                        <SelectItem value="3">3 dias</SelectItem>
                        <SelectItem value="7">7 dias</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">antes da próxima dose</span>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addTreatment.isPending}>
                {addTreatment.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
