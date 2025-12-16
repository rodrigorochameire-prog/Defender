import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Syringe, Bug, Pill as PillIcon, Calendar, Plus, Trash2, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import TutorLayout from "@/components/TutorLayout";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TutorPreventive() {
  const { data: pets, isLoading } = trpc.pets.list.useQuery();
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [fleaDialogOpen, setFleaDialogOpen] = useState(false);
  const [dewormingDialogOpen, setDewormingDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <TutorLayout>
        <div className="container max-w-7xl py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </TutorLayout>
    );
  }

  if (!pets || pets.length === 0) {
    return (
      <TutorLayout>
        <div className="container max-w-7xl py-8">
          <Card>
            <CardContent className="empty-state">
              <Syringe className="empty-state-icon" />
              <p className="empty-state-title">Nenhum pet cadastrado</p>
              <p className="empty-state-description">
                Entre em contato com a creche para cadastrar seu pet
              </p>
            </CardContent>
          </Card>
        </div>
      </TutorLayout>
    );
  }

  return (
    <TutorLayout>
      <div className="container max-w-7xl py-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <Syringe className="h-7 w-7 text-white" />
            </div>
            Cuidados Preventivos
          </h1>
          <p className="text-muted-foreground mt-2">
            Mantenha a saúde dos seus pets em dia com vacinas, antipulgas e vermífugos
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Syringe className="h-4 w-4" />
                Vacinas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Protegem contra doenças graves como raiva, cinomose e parvovirose
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700 dark:text-green-300">
                <Bug className="h-4 w-4" />
                Antipulgas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-green-600 dark:text-green-400">
                Previnem infestações e doenças transmitidas por pulgas e carrapatos
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <PillIcon className="h-4 w-4" />
                Vermífugos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Eliminam vermes intestinais que podem causar problemas de saúde
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pets List */}
        <div className="grid gap-6">
          {pets.map((pet) => (
            <PetPreventiveCard 
              key={pet.id} 
              pet={pet} 
              onAddFlea={() => {
                setSelectedPetId(pet.id);
                setFleaDialogOpen(true);
              }}
              onAddDeworming={() => {
                setSelectedPetId(pet.id);
                setDewormingDialogOpen(true);
              }}
            />
          ))}
        </div>

        {/* Add Flea Treatment Dialog */}
        <AddFleaTreatmentDialog 
          open={fleaDialogOpen}
          onOpenChange={setFleaDialogOpen}
          petId={selectedPetId}
        />

        {/* Add Deworming Treatment Dialog */}
        <AddDewormingDialog 
          open={dewormingDialogOpen}
          onOpenChange={setDewormingDialogOpen}
          petId={selectedPetId}
        />
      </div>
    </TutorLayout>
  );
}

function PetPreventiveCard({ pet, onAddFlea, onAddDeworming }: { 
  pet: any; 
  onAddFlea: () => void;
  onAddDeworming: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: fleaTreatments } = trpc.flea.list.useQuery({ petId: pet.id });
  const { data: dewormingTreatments } = trpc.deworming.list.useQuery({ petId: pet.id });

  const deleteFlea = trpc.flea.delete.useMutation({
    onSuccess: () => {
      utils.flea.list.invalidate({ petId: pet.id });
      toast.success("Antipulgas removido");
    },
  });

  const deleteDeworming = trpc.deworming.delete.useMutation({
    onSuccess: () => {
      utils.deworming.list.invalidate({ petId: pet.id });
      toast.success("Vermífugo removido");
    },
  });

  const getStatusBadge = (nextDueDate: Date) => {
    const now = new Date();
    const daysUntil = Math.floor((new Date(nextDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Atrasado</Badge>;
    } else if (daysUntil <= 7) {
      return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Próximo</Badge>;
    } else {
      return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle2 className="h-3 w-3" /> Em dia</Badge>;
    }
  };

  return (
    <Card className="shadow-card hover-lift">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-lg">
              {pet.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle>{pet.name}</CardTitle>
              <CardDescription>{pet.breed}</CardDescription>
            </div>
          </div>
          <Link href={`/tutor/pets/${pet.id}`}>
            <Button variant="outline" size="sm">
              Ver Detalhes
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="vaccines" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vaccines">
              <Syringe className="h-4 w-4 mr-2" />
              Vacinas
            </TabsTrigger>
            <TabsTrigger value="flea">
              <Bug className="h-4 w-4 mr-2" />
              Antipulgas
            </TabsTrigger>
            <TabsTrigger value="deworming">
              <PillIcon className="h-4 w-4 mr-2" />
              Vermífugos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vaccines" className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Gerenciar Vacinas</p>
                  <p className="text-sm text-muted-foreground">
                    Visualize e acompanhe o calendário de vacinação
                  </p>
                </div>
              </div>
              <Link href={`/tutor/pets/${pet.id}/vaccines`}>
                <Button size="sm">
                  Acessar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="flea" className="space-y-4 mt-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                {fleaTreatments?.length || 0} aplicações registradas
              </p>
              <Button size="sm" onClick={onAddFlea}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {fleaTreatments && fleaTreatments.length > 0 ? (
              <div className="space-y-3">
                {fleaTreatments.map((treatment) => (
                  <div key={treatment.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium">{treatment.productName}</p>
                          {getStatusBadge(treatment.nextDueDate)}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Aplicação: {format(new Date(treatment.applicationDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                          <p>Próxima dose: {format(new Date(treatment.nextDueDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                          {treatment.notes && <p className="italic">"{treatment.notes}"</p>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFlea.mutate({ id: treatment.id })}
                        disabled={deleteFlea.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-lg border-2 border-dashed border-border bg-muted/30 text-center">
                <Bug className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-1">Nenhuma aplicação registrada</p>
                <p className="text-sm text-muted-foreground">
                  Clique em "Adicionar" para registrar a primeira aplicação
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="deworming" className="space-y-4 mt-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                {dewormingTreatments?.length || 0} aplicações registradas
              </p>
              <Button size="sm" onClick={onAddDeworming}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {dewormingTreatments && dewormingTreatments.length > 0 ? (
              <div className="space-y-3">
                {dewormingTreatments.map((treatment) => (
                  <div key={treatment.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium">{treatment.productName}</p>
                          {getStatusBadge(treatment.nextDueDate)}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Aplicação: {format(new Date(treatment.applicationDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                          <p>Próxima dose: {format(new Date(treatment.nextDueDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                          {treatment.notes && <p className="italic">"{treatment.notes}"</p>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDeworming.mutate({ id: treatment.id })}
                        disabled={deleteDeworming.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-lg border-2 border-dashed border-border bg-muted/30 text-center">
                <PillIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-1">Nenhuma aplicação registrada</p>
                <p className="text-sm text-muted-foreground">
                  Clique em "Adicionar" para registrar a primeira aplicação
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function AddFleaTreatmentDialog({ open, onOpenChange, petId }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  petId: number | null;
}) {
  const [productName, setProductName] = useState("");
  const [applicationDate, setApplicationDate] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const createFlea = trpc.flea.create.useMutation({
    onSuccess: () => {
      if (petId) utils.flea.list.invalidate({ petId });
      toast.success("Antipulgas registrado com sucesso!");
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao registrar antipulgas");
    },
  });

  const resetForm = () => {
    setProductName("");
    setApplicationDate("");
    setNextDueDate("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId) return;

    createFlea.mutate({
      petId,
      productName,
      applicationDate: new Date(applicationDate),
      nextDueDate: new Date(nextDueDate),
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Antipulgas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="productName">Produto *</Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex: Bravecto, Nexgard, Simparic"
              required
            />
          </div>
          <div>
            <Label htmlFor="applicationDate">Data de Aplicação *</Label>
            <Input
              id="applicationDate"
              type="date"
              value={applicationDate}
              onChange={(e) => setApplicationDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="nextDueDate">Próxima Dose *</Label>
            <Input
              id="nextDueDate"
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createFlea.isPending}>
              {createFlea.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddDewormingDialog({ open, onOpenChange, petId }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  petId: number | null;
}) {
  const [productName, setProductName] = useState("");
  const [applicationDate, setApplicationDate] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const createDeworming = trpc.deworming.create.useMutation({
    onSuccess: () => {
      if (petId) utils.deworming.list.invalidate({ petId });
      toast.success("Vermífugo registrado com sucesso!");
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao registrar vermífugo");
    },
  });

  const resetForm = () => {
    setProductName("");
    setApplicationDate("");
    setNextDueDate("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId) return;

    createDeworming.mutate({
      petId,
      productName,
      applicationDate: new Date(applicationDate),
      nextDueDate: new Date(nextDueDate),
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Vermífugo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="productName">Produto *</Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex: Drontal, Endogard, Milbemax"
              required
            />
          </div>
          <div>
            <Label htmlFor="applicationDate">Data de Aplicação *</Label>
            <Input
              id="applicationDate"
              type="date"
              value={applicationDate}
              onChange={(e) => setApplicationDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="nextDueDate">Próxima Dose *</Label>
            <Input
              id="nextDueDate"
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createDeworming.isPending}>
              {createDeworming.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
