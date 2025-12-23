import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, TrendingUp, Brain, Award, AlertCircle, Smile, Frown, Meh, Plus, Trash2, FileDown } from "lucide-react";
import { generateBehaviorReport } from "@/lib/pdfGenerator";
import { toast } from "sonner";

export default function AdminBehavior() {
  const { data: allPets = [], isLoading: loadingPets } = trpc.pets.list.useQuery();
  const pets = allPets; // Tutor sees all their pets
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [showBehaviorForm, setShowBehaviorForm] = useState(false);
  const [showTrainingForm, setShowTrainingForm] = useState(false);

  // Behavior form state
  const [behaviorDate, setBehaviorDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState<"daycare" | "home" | "walk" | "vet" | "other">("home");
  const [behaviorType, setBehaviorType] = useState<"positive" | "negative" | "neutral">("neutral");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [severity, setSeverity] = useState<string>("leve");

  // Training form state
  const [skill, setSkill] = useState("");
  const [currentLevel, setCurrentLevel] = useState(1);
  const [trainingNotes, setTrainingNotes] = useState("");

  const selectedPet = pets.find((p: any) => p.id === selectedPetId);

  const { data: behaviorRecords = [], refetch: refetchBehavior } = trpc.behavior.list.useQuery(
    { petId: selectedPetId ?? undefined },
    { enabled: !!selectedPetId }
  );

  const { data: trainingRecords = [], refetch: refetchTraining } = trpc.training.list.useQuery(
    { petId: selectedPetId ?? undefined },
    { enabled: !!selectedPetId }
  );

  const createBehavior = trpc.behavior.create.useMutation({
    onSuccess: () => {
      toast.success("Comportamento registrado com sucesso!");
      refetchBehavior();
      setShowBehaviorForm(false);
      resetBehaviorForm();
    },
    onError: (error) => {
      toast.error(`Erro ao registrar comportamento: ${error.message}`);
    },
  });

  const deleteBehavior = trpc.behavior.delete.useMutation({
    onSuccess: () => {
      toast.success("Registro deletado!");
      refetchBehavior();
    },
  });

  const createTraining = trpc.training.create.useMutation({
    onSuccess: () => {
      toast.success("Adestramento registrado com sucesso!");
      refetchTraining();
      setShowTrainingForm(false);
      resetTrainingForm();
    },
    onError: (error) => {
      toast.error(`Erro ao registrar adestramento: ${error.message}`);
    },
  });

  const updateTraining = trpc.training.update.useMutation({
    onSuccess: () => {
      toast.success("Progresso atualizado!");
      refetchTraining();
    },
  });

  const deleteTraining = trpc.training.delete.useMutation({
    onSuccess: () => {
      toast.success("Registro deletado!");
      refetchTraining();
    },
  });

  const resetBehaviorForm = () => {
    setBehaviorDate(new Date().toISOString().split("T")[0]);
    setLocation("home");
    setBehaviorType("neutral");
    setDescription("");
    setTags("");
    setSeverity("leve");
  };

  const resetTrainingForm = () => {
    setSkill("");
    setCurrentLevel(1);
    setTrainingNotes("");
  };

  const handleSubmitBehavior = () => {
    if (!selectedPetId || !description) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createBehavior.mutate({
      petId: selectedPetId,
      date: new Date(behaviorDate),
      location,
      behaviorType,
      description,
      tags: tags || undefined,
      severity: severity || undefined,
    });
  };

  const handleSubmitTraining = () => {
    if (!selectedPetId || !skill) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createTraining.mutate({
      petId: selectedPetId,
      skill,
      startDate: new Date(),
      currentLevel,
      notes: trainingNotes || undefined,
    });
  };

  const getBehaviorIcon = (type: string) => {
    switch (type) {
      case "positive":
        return <Smile className="h-5 w-5 text-green-500" />;
      case "negative":
        return <Frown className="h-5 w-5 text-red-500" />;
      default:
        return <Meh className="h-5 w-5 text-gray-500" />;
    }
  };

  const getLocationLabel = (loc: string) => {
    const labels: Record<string, string> = {
      daycare: "Creche",
      home: "Casa",
      walk: "Passeio",
      vet: "Veterinário",
      other: "Outro",
    };
    return labels[loc] || loc;
  };

  if (loadingPets) {
    return (
      <AdminLayout>
        <div className="container max-w-7xl py-8 animate-fade-in">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Carregando...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (pets.length === 0) {
    return (
      <AdminLayout>
        <div className="container max-w-7xl py-8 animate-fade-in">
          <div className="text-center py-12">
            <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum pet cadastrado</h3>
            <p className="text-muted-foreground">Cadastre um pet para começar a registrar comportamentos.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
    <div className="container max-w-7xl py-8 animate-fade-in">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Comportamento & Adestramento</h1>
          <p className="text-muted-foreground">
            Registre e acompanhe o comportamento do seu pet em diferentes ambientes
          </p>
        </div>
        {selectedPet && behaviorRecords.length > 0 && (
          <Button
            onClick={() => {
              generateBehaviorReport({
                petName: selectedPet.name,
                period: "Últimos 30 dias",
                records: behaviorRecords.map((r: any) => ({
                  date: r.date,
                  location: r.location,
                  behaviorType: r.behaviorType,
                  description: r.description,
                  severity: r.severity,
                })),
              });
              toast.success("Relatório PDF gerado com sucesso!");
            }}
            className="flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </Button>
        )}
      </div>

      {/* Pet Selection */}
      <Card className="p-6 mb-6">
        <Label className="mb-2 block">Selecione o Pet</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pets.map((pet: any) => (
            <button
              key={pet.id}
              onClick={() => setSelectedPetId(pet.id)}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                selectedPetId === pet.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                {pet.photoUrl ? (
                  <img src={pet.photoUrl} alt={pet.name} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{pet.name[0]}</span>
                  </div>
                )}
                <span className="font-medium">{pet.name}</span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {selectedPet && (
        <Tabs defaultValue="behavior" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="behavior">Registros de Comportamento</TabsTrigger>
            <TabsTrigger value="training">Adestramento</TabsTrigger>
          </TabsList>

          {/* Behavior Tab */}
          <TabsContent value="behavior" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Histórico de Comportamento</h2>
              <Button onClick={() => setShowBehaviorForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Registro
              </Button>
            </div>

            {behaviorRecords.length === 0 ? (
              <Card className="p-12 text-center">
                <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum registro ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Comece a registrar o comportamento de {selectedPet.name}
                </p>
                <Button onClick={() => setShowBehaviorForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Primeiro Registro
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {behaviorRecords.map((record) => (
                  <Card key={record.id} className="p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="mt-1">{getBehaviorIcon(record.behaviorType)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">
                              {new Date(record.date).toLocaleDateString("pt-BR")}
                            </span>
                            <Badge variant="outline" className="gap-1">
                              <MapPin className="h-3 w-3" />
                              {getLocationLabel(record.location)}
                            </Badge>
                            {record.severity && (
                              <Badge
                                variant={
                                  record.severity === "grave"
                                    ? "destructive"
                                    : record.severity === "moderado"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {record.severity}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{record.description}</p>
                          {record.tags && (
                            <div className="flex flex-wrap gap-2">
                              {record.tags.split(",").map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {tag.trim()}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBehavior.mutate({ id: record.id })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Progresso de Adestramento</h2>
              <Button onClick={() => setShowTrainingForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Habilidade
              </Button>
            </div>

            {trainingRecords.length === 0 ? (
              <Card className="p-12 text-center">
                <Award className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum adestramento registrado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece a acompanhar o progresso de {selectedPet.name}
                </p>
                <Button onClick={() => setShowTrainingForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Primeira Habilidade
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {trainingRecords.map((record) => (
                  <Card key={record.id} className="p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Award className="h-6 w-6 text-primary" />
                        <div>
                          <h3 className="font-semibold text-lg">{record.skill}</h3>
                          <p className="text-sm text-muted-foreground">
                            Iniciado em {new Date(record.startDate).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTraining.mutate({ id: record.id })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Nível atual</span>
                        <span className="font-semibold">{record.currentLevel}/10</span>
                      </div>
                      <Progress value={record.currentLevel * 10} className="h-2" />
                    </div>

                    {record.notes && (
                      <p className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
                        {record.notes}
                      </p>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={record.currentLevel <= 1}
                        onClick={() =>
                          updateTraining.mutate({
                            id: record.id,
                            currentLevel: record.currentLevel - 1,
                          })
                        }
                      >
                        -
                      </Button>
                      <Button
                        size="sm"
                        disabled={record.currentLevel >= 10}
                        onClick={() =>
                          updateTraining.mutate({
                            id: record.id,
                            currentLevel: record.currentLevel + 1,
                          })
                        }
                      >
                        +
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Behavior Form Dialog */}
      <Dialog open={showBehaviorForm} onOpenChange={setShowBehaviorForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Comportamento</DialogTitle>
          </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Data</Label>
            <Input
              type="date"
              value={behaviorDate}
              onChange={(e) => setBehaviorDate(e.target.value)}
            />
          </div>

          <div>
            <Label>Local</Label>
            <Select value={location} onValueChange={(v: any) => setLocation(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="home">Casa</SelectItem>
                <SelectItem value="daycare">Creche</SelectItem>
                <SelectItem value="walk">Passeio</SelectItem>
                <SelectItem value="vet">Veterinário</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo de Comportamento</Label>
            <Select value={behaviorType} onValueChange={(v: any) => setBehaviorType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">Positivo</SelectItem>
                <SelectItem value="neutral">Neutro</SelectItem>
                <SelectItem value="negative">Negativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Severidade</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leve">Leve</SelectItem>
                <SelectItem value="moderado">Moderado</SelectItem>
                <SelectItem value="grave">Grave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descrição *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o comportamento observado..."
              rows={4}
            />
          </div>

          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="agressividade, ansiedade, socialização"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSubmitBehavior} disabled={createBehavior.isPending} className="flex-1">
              {createBehavior.isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={() => setShowBehaviorForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      {/* Training Form Dialog */}
      <Dialog open={showTrainingForm} onOpenChange={setShowTrainingForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Habilidade de Adestramento</DialogTitle>
          </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Habilidade *</Label>
            <Input
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="Ex: Sentar, Deitar, Buscar..."
            />
          </div>

          <div>
            <Label>Nível Atual (1-10)</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={1}
                max={10}
                value={currentLevel}
                onChange={(e) => setCurrentLevel(Number(e.target.value))}
              />
              <Progress value={currentLevel * 10} className="flex-1" />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={trainingNotes}
              onChange={(e) => setTrainingNotes(e.target.value)}
              placeholder="Notas sobre o progresso..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSubmitTraining} disabled={createTraining.isPending} className="flex-1">
              {createTraining.isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={() => setShowTrainingForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
