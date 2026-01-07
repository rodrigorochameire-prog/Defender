import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { Calendar, Home, Building2, Smile, Activity, Utensils, FileText } from "lucide-react";

interface DailyLogFormProps {
  petId: number;
  petName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editLog?: any; // For editing existing logs
}

const ACTIVITIES = [
  { id: "passeio", label: "Passeio" },
  { id: "brincadeira", label: "Brincadeira" },
  { id: "banho", label: "Banho" },
  { id: "tosa", label: "Tosa" },
  { id: "treinamento", label: "Treinamento" },
  { id: "socializacao", label: "Socialização" },
  { id: "descanso", label: "Descanso" },
  { id: "veterinario", label: "Veterinário" },
];

export function DailyLogForm({ petId, petName, open, onOpenChange, onSuccess, editLog }: DailyLogFormProps) {
  const utils = trpc.useUtils();
  
  // Form state
  const [source, setSource] = useState<"home" | "daycare">(editLog?.source || "daycare");
  const [logDate, setLogDate] = useState(
    editLog?.logDate ? new Date(editLog.logDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  
  // Health indicators
  const [mood, setMood] = useState(editLog?.mood || "");
  const [stool, setStool] = useState(editLog?.stool || "");
  const [appetite, setAppetite] = useState(editLog?.appetite || "");
  
  // Behavior
  const [behavior, setBehavior] = useState(editLog?.behavior || "");
  const [behaviorNotes, setBehaviorNotes] = useState(editLog?.behaviorNotes || "");
  
  // Activities
  const [selectedActivities, setSelectedActivities] = useState<string[]>(
    editLog?.activities ? JSON.parse(editLog.activities) : []
  );
  
  // Feeding
  const [foodConsumed, setFoodConsumed] = useState(editLog?.foodConsumed || "");
  const [feedingTime, setFeedingTime] = useState(editLog?.feedingTime || "");
  const [feedingAmount, setFeedingAmount] = useState(editLog?.feedingAmount || "");
  const [feedingAcceptance, setFeedingAcceptance] = useState(editLog?.feedingAcceptance || "");
  
  // Other
  const [weight, setWeight] = useState(editLog?.weight ? (editLog.weight / 1000).toString() : "");
  const [notes, setNotes] = useState(editLog?.notes || "");

  const createMutation = trpc.logs.add.useMutation({
    onSuccess: () => {
      toast.success("Log diário criado com sucesso!");
      utils.logs.getPetLogs.invalidate({ petId });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar log: ${error.message}`);
    },
  });

  const updateMutation = trpc.logs.update.useMutation({
    onSuccess: () => {
      toast.success("Log diário atualizado com sucesso!");
      utils.logs.getPetLogs.invalidate({ petId });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar log: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSource("daycare");
    setLogDate(new Date().toISOString().slice(0, 16));
    setMood("");
    setStool("");
    setAppetite("");
    setBehavior("");
    setBehaviorNotes("");
    setSelectedActivities([]);
    setFoodConsumed("");
    setFeedingTime("");
    setFeedingAmount("");
    setFeedingAcceptance("");
    setWeight("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const logData = {
      petId,
      logDate: new Date(logDate),
      source,
      mood: mood || undefined,
      stool: stool || undefined,
      appetite: appetite || undefined,
      behavior: behavior || undefined,
      behaviorNotes: behaviorNotes || undefined,
      activities: selectedActivities.length > 0 ? JSON.stringify(selectedActivities) : undefined,
      foodConsumed: foodConsumed || undefined,
      feedingTime: feedingTime || undefined,
      feedingAmount: feedingAmount || undefined,
      feedingAcceptance: feedingAcceptance || undefined,
      weight: weight ? Math.round(parseFloat(weight) * 1000) : undefined,
      notes: notes || undefined,
    };

    if (editLog) {
      updateMutation.mutate({ id: editLog.id, ...logData });
    } else {
      createMutation.mutate(logData);
    }
  };

  const toggleActivity = (activityId: string) => {
    setSelectedActivities(prev =>
      prev.includes(activityId)
        ? prev.filter(id => id !== activityId)
        : [...prev, activityId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {editLog ? "Editar" : "Novo"} Log Diário - {petName}
          </DialogTitle>
          <DialogDescription>
            Registre as informações do dia do pet de forma completa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Local e Data */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Local e Data
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source">Local *</Label>
                <Select value={source} onValueChange={(v) => setSource(v as "home" | "daycare")}>
                  <SelectTrigger id="source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daycare">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Creche
                      </div>
                    </SelectItem>
                    <SelectItem value="home">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Casa
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logDate">Data e Hora *</Label>
                <Input
                  id="logDate"
                  type="datetime-local"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Indicadores de Saúde */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold flex items-center gap-2">
              <Smile className="h-4 w-4" />
              Indicadores de Saúde
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mood">Humor</Label>
                <Select value={mood} onValueChange={setMood}>
                  <SelectTrigger id="mood">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feliz">😊 Feliz</SelectItem>
                    <SelectItem value="calmo">😌 Calmo</SelectItem>
                    <SelectItem value="ansioso">😰 Ansioso</SelectItem>
                    <SelectItem value="triste">😢 Triste</SelectItem>
                    <SelectItem value="agitado">😤 Agitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stool">Fezes</Label>
                <Select value={stool} onValueChange={setStool}>
                  <SelectTrigger id="stool">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">✅ Normal</SelectItem>
                    <SelectItem value="diarreia">💧 Diarreia</SelectItem>
                    <SelectItem value="constipado">🚫 Constipado</SelectItem>
                    <SelectItem value="nao_fez">❌ Não fez</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appetite">Apetite</Label>
                <Select value={appetite} onValueChange={setAppetite}>
                  <SelectTrigger id="appetite">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">😊 Normal</SelectItem>
                    <SelectItem value="aumentado">😋 Aumentado</SelectItem>
                    <SelectItem value="diminuido">😐 Diminuído</SelectItem>
                    <SelectItem value="nao_comeu">😞 Não comeu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 3: Comportamento */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Comportamento
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="behavior">Tipo de Comportamento</Label>
                <Input
                  id="behavior"
                  placeholder="Ex: Brincalhão, Calmo, Agressivo..."
                  value={behavior}
                  onChange={(e) => setBehavior(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="behaviorNotes">Observações sobre Comportamento</Label>
                <Textarea
                  id="behaviorNotes"
                  placeholder="Descreva comportamentos específicos observados..."
                  value={behaviorNotes}
                  onChange={(e) => setBehaviorNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Atividades */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Atividades Realizadas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ACTIVITIES.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={activity.id}
                    checked={selectedActivities.includes(activity.id)}
                    onCheckedChange={() => toggleActivity(activity.id)}
                  />
                  <Label
                    htmlFor={activity.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {activity.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Alimentação */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              Alimentação
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="foodConsumed">Quantidade Consumida</Label>
                <Select value={foodConsumed} onValueChange={setFoodConsumed}>
                  <SelectTrigger id="foodConsumed">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tudo</SelectItem>
                    <SelectItem value="half">Metade</SelectItem>
                    <SelectItem value="little">Pouco</SelectItem>
                    <SelectItem value="none">Nada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedingTime">Horário</Label>
                <Input
                  id="feedingTime"
                  type="time"
                  value={feedingTime}
                  onChange={(e) => setFeedingTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedingAmount">Quantidade Oferecida</Label>
                <Input
                  id="feedingAmount"
                  placeholder="Ex: 200g, 1 xícara..."
                  value={feedingAmount}
                  onChange={(e) => setFeedingAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedingAcceptance">Aceitação</Label>
                <Select value={feedingAcceptance} onValueChange={setFeedingAcceptance}>
                  <SelectTrigger id="feedingAcceptance">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excelente">⭐ Excelente</SelectItem>
                    <SelectItem value="boa">👍 Boa</SelectItem>
                    <SelectItem value="regular">😐 Regular</SelectItem>
                    <SelectItem value="ruim">👎 Ruim</SelectItem>
                    <SelectItem value="recusou">❌ Recusou</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 6: Outros */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Informações Adicionais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 5.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas e Observações Gerais</Label>
              <Textarea
                id="notes"
                placeholder="Outras informações importantes sobre o dia..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editLog ? "Atualizar" : "Criar Log"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
