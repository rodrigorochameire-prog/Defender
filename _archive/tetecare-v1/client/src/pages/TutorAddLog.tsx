import { useRoute, useLocation } from "wouter";
import TutorLayout from "@/components/TutorLayout";
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
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function TutorAddLog() {
  const [, params] = useRoute("/tutor/pets/:id/logs/new");
  const [, setLocation] = useLocation();
  const petId = params?.id ? parseInt(params.id) : 0;

  const { data: pet } = trpc.pets.byId.useQuery({ id: petId });

  const addLog = trpc.logs.add.useMutation({
    onSuccess: () => {
      toast.success("Log registrado com sucesso!");
      setLocation(`/tutor/pets/${petId}`);
    },
    onError: (error) => {
      toast.error("Erro ao registrar log: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const logDate = formData.get("logDate") as string;
    const mood = formData.get("mood") as string;
    const stool = formData.get("stool") as string | null;
    const appetite = formData.get("appetite") as string | null;
    const behavior = formData.get("behavior") as string;
    const activities = formData.get("activities") as string;
    const foodConsumed = formData.get("foodConsumed") as string;
    const notes = formData.get("notes") as string;

    addLog.mutate({
      petId,
      logDate: new Date(logDate),
      source: "home",
      mood: (mood as any) || undefined,
      stool: (stool as any) || undefined,
      appetite: (appetite as any) || undefined,
      behavior: behavior || undefined,
      activities: activities || undefined,
      foodConsumed: foodConsumed || undefined,
      notes: notes || undefined,
    });
  };

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Log Diário</h1>
          <p className="text-muted-foreground">{pet?.name}</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Registrar Informações Diárias</CardTitle>
          <CardDescription>
            Registre informações sobre humor, comportamento, alimentação e saúde do seu pet em casa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Data */}
            <div className="space-y-2">
              <Label htmlFor="logDate">Data do Registro *</Label>
              <Input
                id="logDate"
                name="logDate"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                max={new Date().toISOString().split("T")[0]}
                required
              />
              <p className="text-xs text-muted-foreground">
                Selecione a data a que se refere este registro (padrão: hoje)
              </p>
            </div>

            {/* Mood */}
            <div className="space-y-2">
              <Label htmlFor="mood">Humor</Label>
              <Select name="mood">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o humor" />
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

            {/* Stool */}
            <div className="space-y-2">
              <Label htmlFor="stool">Fezes</Label>
              <Select name="stool">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a condição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">✅ Normal</SelectItem>
                  <SelectItem value="diarreia">💧 Diarreia</SelectItem>
                  <SelectItem value="constipado">🚫 Constipado</SelectItem>
                  <SelectItem value="nao_fez">❌ Não fez</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Appetite */}
            <div className="space-y-2">
              <Label htmlFor="appetite">Apetite</Label>
              <Select name="appetite">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o apetite" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">🍽️ Normal</SelectItem>
                  <SelectItem value="aumentado">🍖 Aumentado</SelectItem>
                  <SelectItem value="diminuido">🥄 Diminuído</SelectItem>
                  <SelectItem value="nao_comeu">❌ Não comeu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Food Consumed */}
            <div className="space-y-2">
              <Label htmlFor="foodConsumed">Alimentação</Label>
              <Input
                id="foodConsumed"
                name="foodConsumed"
                placeholder="Ex: 200g de ração, 1 sachê de patê"
              />
              <p className="text-xs text-muted-foreground">
                Descreva o que e quanto o pet comeu hoje
              </p>
            </div>

            {/* Behavior */}
            <div className="space-y-2">
              <Label htmlFor="behavior">Comportamento</Label>
              <Textarea
                id="behavior"
                name="behavior"
                rows={3}
                placeholder="Descreva o comportamento do pet hoje..."
              />
            </div>

            {/* Activities */}
            <div className="space-y-2">
              <Label htmlFor="activities">Atividades</Label>
              <Textarea
                id="activities"
                name="activities"
                rows={3}
                placeholder="Descreva as atividades realizadas (passeios, brincadeiras, etc.)"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações Gerais</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Outras observações importantes..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link href={`/tutor/pets/${petId}`} className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={addLog.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {addLog.isPending ? "Salvando..." : "Salvar Log"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">💡 Dicas para um bom registro</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• Registre diariamente para acompanhar padrões de comportamento</p>
          <p>• Anote mudanças significativas no humor ou apetite</p>
          <p>• Descreva atividades para monitorar o nível de energia</p>
          <p>• Use as observações para compartilhar com o veterinário</p>
        </CardContent>
      </Card>
      </div>
    </TutorLayout>
  );
}
