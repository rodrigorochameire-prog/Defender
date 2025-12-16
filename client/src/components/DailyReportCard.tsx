import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Smile, 
  Frown, 
  Meh, 
  Heart, 
  Activity, 
  Utensils, 
  Calendar,
  User,
  Sparkles
} from "lucide-react";

interface DailyReportCardProps {
  log: {
    id: number;
    logDate: Date;
    mood: string | null;
    stool: string | null;
    appetite: string | null;
    foodConsumed: string | null;
    activities: string | null;
    behavior: string | null;
    notes: string | null;
    source: "home" | "daycare";
    createdAt: Date;
  };
  petName: string;
  showSource?: boolean;
}

const moodIcons: Record<string, { icon: typeof Smile; color: string; label: string }> = {
  feliz: { icon: Smile, color: "text-green-500", label: "Feliz" },
  calmo: { icon: Meh, color: "text-blue-500", label: "Calmo" },
  ansioso: { icon: Activity, color: "text-yellow-500", label: "Ansioso" },
  triste: { icon: Frown, color: "text-gray-500", label: "Triste" },
  agitado: { icon: Sparkles, color: "text-orange-500", label: "Agitado" },
};

const appetiteLabels: Record<string, { label: string; color: string }> = {
  normal: { label: "Normal", color: "bg-green-100 text-green-800" },
  aumentado: { label: "Aumentado", color: "bg-blue-100 text-blue-800" },
  diminuido: { label: "Diminuído", color: "bg-yellow-100 text-yellow-800" },
  nao_comeu: { label: "Não comeu", color: "bg-red-100 text-red-800" },
};

const stoolLabels: Record<string, { label: string; color: string }> = {
  normal: { label: "Normal", color: "bg-green-100 text-green-800" },
  diarreia: { label: "Diarreia", color: "bg-red-100 text-red-800" },
  constipado: { label: "Constipado", color: "bg-yellow-100 text-yellow-800" },
  nao_fez: { label: "Não fez", color: "bg-gray-100 text-gray-800" },
};

const foodConsumedLabels: Record<string, { label: string; color: string }> = {
  all: { label: "Tudo", color: "bg-green-100 text-green-800" },
  half: { label: "Metade", color: "bg-yellow-100 text-yellow-800" },
  little: { label: "Pouco", color: "bg-orange-100 text-orange-800" },
  none: { label: "Nada", color: "bg-red-100 text-red-800" },
};

export function DailyReportCard({ log, petName, showSource = false }: DailyReportCardProps) {
  const moodData = log.mood ? moodIcons[log.mood] : null;
  const MoodIcon = moodData?.icon;

  return (
    <Card className="shadow-card border-border/50 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {new Date(log.logDate).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Relatório diário de {petName}
              </p>
            </div>
          </div>
          {showSource && (
            <Badge variant={log.source === "daycare" ? "default" : "secondary"}>
              {log.source === "daycare" ? "Creche" : "Casa"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mood */}
        {moodData && MoodIcon && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <MoodIcon className={`h-6 w-6 ${moodData.color}`} />
            <div className="flex-1">
              <p className="text-sm font-medium">Humor</p>
              <p className="text-xs text-muted-foreground">{moodData.label}</p>
            </div>
          </div>
        )}

        {/* Appetite & Food Consumed */}
        <div className="grid grid-cols-2 gap-3">
          {log.appetite && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Heart className="h-5 w-5 text-pink-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Apetite</p>
                <Badge variant="secondary" className={`mt-1 ${appetiteLabels[log.appetite]?.color || ""}`}>
                  {appetiteLabels[log.appetite]?.label || log.appetite}
                </Badge>
              </div>
            </div>
          )}

          {log.foodConsumed && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Utensils className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Consumo</p>
                <Badge variant="secondary" className={`mt-1 ${foodConsumedLabels[log.foodConsumed]?.color || ""}`}>
                  {foodConsumedLabels[log.foodConsumed]?.label || log.foodConsumed}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Stool */}
        {log.stool && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Fezes</p>
            <Badge variant="secondary" className={stoolLabels[log.stool]?.color || ""}>
              {stoolLabels[log.stool]?.label || log.stool}
            </Badge>
          </div>
        )}

        {/* Activities */}
        {log.activities && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Atividades</p>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{log.activities}</p>
          </div>
        )}

        {/* Behavior */}
        {log.behavior && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Comportamento</p>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{log.behavior}</p>
          </div>
        )}

        {/* Notes */}
        {log.notes && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-medium mb-2 text-primary">Observações da Equipe</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{log.notes}</p>
          </div>
        )}

        {/* Timestamp */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Registrado em {new Date(log.createdAt).toLocaleString("pt-BR")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
