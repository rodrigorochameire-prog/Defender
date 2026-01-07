import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, Smile, Droplet, Activity, UtensilsCrossed, GlassWater } from "lucide-react";
import { toast } from "sonner";

interface HealthBehaviorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pets: Array<{ id: number; name: string }>;
  onSuccess?: () => void;
}

const moodOptions = [
  { value: "feliz", label: "😊 Feliz", icon: "😊" },
  { value: "ansioso", label: "😰 Ansioso", icon: "😰" },
  { value: "calmo", label: "😌 Calmo", icon: "😌" },
  { value: "agitado", label: "😤 Agitado", icon: "😤" },
  { value: "letargico", label: "😴 Letárgico", icon: "😴" },
  { value: "agressivo", label: "😠 Agressivo", icon: "😠" },
];

const stoolOptions = [
  { value: "perfeitas", label: "👌 Perfeitas" },
  { value: "normal", label: "✅ Normal" },
  { value: "levemente_moles", label: "🟡 Levemente Moles" },
  { value: "moles", label: "🟠 Moles" },
  { value: "pastosas", label: "🟤 Pastosas" },
  { value: "diarreia", label: "💧 Diarreia" },
  { value: "ressecadas", label: "🪨 Ressecadas" },
  { value: "constipacao", label: "🔒 Constipação" },
  { value: "com_sangue", label: "🩸 Com Sangue" },
  { value: "muco", label: "🧪 Muco" },
];

const behaviorOptions = [
  { value: "ativo", label: "⚡ Ativo" },
  { value: "brincalhao", label: "🎾 Brincalhão" },
  { value: "sociavel", label: "🤝 Sociável" },
  { value: "calmo", label: "😌 Calmo" },
  { value: "relaxado", label: "🧘 Relaxado" },
  { value: "curioso", label: "🔍 Curioso" },
  { value: "timido", label: "😳 Tímido" },
  { value: "protetor", label: "🛡️ Protetor" },
  { value: "destrutivo", label: "💥 Destrutivo" },
  { value: "letargico", label: "😴 Letárgico" },
  { value: "agressivo", label: "😠 Agressivo" },
  { value: "assustado", label: "😨 Assustado" },
];

const appetiteOptions = [
  { value: "normal", label: "✅ Normal" },
  { value: "aumentado", label: "⬆️ Aumentado" },
  { value: "diminuido", label: "⬇️ Diminuído" },
  { value: "recusou", label: "❌ Recusou" },
];

const waterOptions = [
  { value: "normal", label: "✅ Normal" },
  { value: "aumentado", label: "⬆️ Aumentado" },
  { value: "diminuido", label: "⬇️ Diminuído" },
  { value: "recusou", label: "❌ Recusou" },
];

export function HealthBehaviorModal({ open, onOpenChange, pets, onSuccess }: HealthBehaviorModalProps) {
  const [petId, setPetId] = useState<string>("");
  const [mood, setMood] = useState<string>("");
  const [stool, setStool] = useState<string>("");
  const [behavior, setBehavior] = useState<string>("");
  const [appetite, setAppetite] = useState<string>("");
  const [waterIntake, setWaterIntake] = useState<string>("");
  const [notes, setNotes] = useState("");

  const createMutation = trpc.healthBehaviorLogs.create.useMutation({
    onSuccess: () => {
      toast.success("Registro salvo com sucesso!");
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao salvar registro");
    },
  });

  const resetForm = () => {
    setPetId("");
    setMood("");
    setStool("");
    setBehavior("");
    setAppetite("");
    setWaterIntake("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!petId) {
      toast.error("Selecione um pet");
      return;
    }

    // At least one field must be filled
    if (!mood && !stool && !behavior && !appetite && !waterIntake && !notes) {
      toast.error("Preencha pelo menos um campo");
      return;
    }

    createMutation.mutate({
      petId: parseInt(petId),
      mood: mood as any,
      stool: stool as any,
      behavior: behavior as any,
      appetite: appetite as any,
      waterIntake: waterIntake as any,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Registro Rápido de Saúde</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pet Selection */}
          <div className="space-y-2">
            <Label htmlFor="pet" className="text-base font-semibold">
              Pet *
            </Label>
            <Select value={petId} onValueChange={setPetId}>
              <SelectTrigger id="pet">
                <SelectValue placeholder="Selecione o pet" />
              </SelectTrigger>
              <SelectContent>
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id.toString()}>
                    {pet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mood */}
            <div className="space-y-2">
              <Label htmlFor="mood" className="flex items-center gap-2 text-base font-semibold">
                <Smile className="h-5 w-5 text-purple-500" />
                Humor
              </Label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger id="mood">
                  <SelectValue placeholder="Como está o humor?" />
                </SelectTrigger>
                <SelectContent>
                  {moodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stool */}
            <div className="space-y-2">
              <Label htmlFor="stool" className="flex items-center gap-2 text-base font-semibold">
                <Droplet className="h-5 w-5 text-yellow-500" />
                Fezes
              </Label>
              <Select value={stool} onValueChange={setStool}>
                <SelectTrigger id="stool">
                  <SelectValue placeholder="Como estão as fezes?" />
                </SelectTrigger>
                <SelectContent>
                  {stoolOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Behavior */}
            <div className="space-y-2">
              <Label htmlFor="behavior" className="flex items-center gap-2 text-base font-semibold">
                <Activity className="h-5 w-5 text-blue-500" />
                Comportamento
              </Label>
              <Select value={behavior} onValueChange={setBehavior}>
                <SelectTrigger id="behavior">
                  <SelectValue placeholder="Como está o comportamento?" />
                </SelectTrigger>
                <SelectContent>
                  {behaviorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Appetite */}
            <div className="space-y-2">
              <Label htmlFor="appetite" className="flex items-center gap-2 text-base font-semibold">
                <UtensilsCrossed className="h-5 w-5 text-orange-500" />
                Apetite
              </Label>
              <Select value={appetite} onValueChange={setAppetite}>
                <SelectTrigger id="appetite">
                  <SelectValue placeholder="Como está o apetite?" />
                </SelectTrigger>
                <SelectContent>
                  {appetiteOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Water Intake */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="water" className="flex items-center gap-2 text-base font-semibold">
                <GlassWater className="h-5 w-5 text-cyan-500" />
                Ingestão de Água
              </Label>
              <Select value={waterIntake} onValueChange={setWaterIntake}>
                <SelectTrigger id="water">
                  <SelectValue placeholder="Como está a ingestão de água?" />
                </SelectTrigger>
                <SelectContent>
                  {waterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-semibold">
              Observações Adicionais
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva qualquer observação adicional sobre o pet..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Registro
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
