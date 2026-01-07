import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { trpc } from "../lib/trpc";
import { DailyLogForm } from "./DailyLogForm";
import { toast } from "sonner";
import { 
  Calendar, Home, Building2, Smile, Activity, Utensils, FileText, 
  Edit, Trash2, Plus, Filter 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DailyLogsTimelineProps {
  petId: number;
  petName: string;
}

const MOOD_ICONS: Record<string, string> = {
  feliz: "😊",
  calmo: "😌",
  ansioso: "😰",
  triste: "😢",
  agitado: "😤",
};

const STOOL_ICONS: Record<string, string> = {
  normal: "✅",
  diarreia: "💧",
  constipado: "🚫",
  nao_fez: "❌",
};

const APPETITE_ICONS: Record<string, string> = {
  normal: "😊",
  aumentado: "😋",
  diminuido: "😐",
  nao_comeu: "😞",
};

export function DailyLogsTimeline({ petId, petName }: DailyLogsTimelineProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);
  const [locationFilter, setLocationFilter] = useState<"all" | "home" | "daycare">("all");
  const [periodFilter, setPeriodFilter] = useState<"7" | "30" | "90" | "all">("30");

  const utils = trpc.useUtils();

  // Calculate date range based on period filter
  const getDateRange = () => {
    if (periodFilter === "all") return {};
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(periodFilter));
    
    return { startDate, endDate };
  };

  const { data: logs = [], isLoading } = trpc.logs.getPetLogs.useQuery({
    petId,
    ...getDateRange(),
  });

  const deleteMutation = trpc.logs.delete.useMutation({
    onSuccess: () => {
      toast.success("Log excluído com sucesso!");
      utils.logs.getPetLogs.invalidate({ petId });
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir log: ${error.message}`);
    },
  });

  const handleEdit = (log: any) => {
    setEditingLog(log);
    setIsFormOpen(true);
  };

  const handleDelete = (logId: number) => {
    if (confirm("Tem certeza que deseja excluir este log?")) {
      deleteMutation.mutate({ id: logId });
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingLog(null);
  };

  // Filter logs by location
  const filteredLogs = logs.filter(log => {
    if (locationFilter === "all") return true;
    return log.source === locationFilter;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters and Add Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Logs Diários
              </CardTitle>
              <CardDescription>Histórico completo de registros do pet</CardDescription>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Log
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <Select value={locationFilter} onValueChange={(v: any) => setLocationFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os locais</SelectItem>
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

            <Select value={periodFilter} onValueChange={(v: any) => setPeriodFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {locationFilter !== "all" 
                  ? `Nenhum log registrado ${locationFilter === "home" ? "em casa" : "na creche"} neste período.`
                  : "Nenhum log registrado neste período."}
              </p>
              <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Log
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log: any) => (
            <Card key={log.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">
                        {format(new Date(log.logDate), "dd/MM")}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {format(new Date(log.logDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </CardTitle>
                        <Badge variant={log.source === "daycare" ? "default" : "secondary"}>
                          {log.source === "daycare" ? (
                            <>
                              <Building2 className="h-3 w-3 mr-1" />
                              Creche
                            </>
                          ) : (
                            <>
                              <Home className="h-3 w-3 mr-1" />
                              Casa
                            </>
                          )}
                        </Badge>
                      </div>
                      <CardDescription>
                        {format(new Date(log.logDate), "HH:mm")}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(log)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(log.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Health Indicators */}
                {(log.mood || log.stool || log.appetite) && (
                  <div className="flex items-center gap-6 p-3 bg-muted rounded-lg">
                    <Smile className="h-5 w-5 text-muted-foreground" />
                    {log.mood && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{MOOD_ICONS[log.mood]}</span>
                        <span className="text-sm capitalize">{log.mood}</span>
                      </div>
                    )}
                    {log.stool && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{STOOL_ICONS[log.stool]}</span>
                        <span className="text-sm capitalize">{log.stool.replace("_", " ")}</span>
                      </div>
                    )}
                    {log.appetite && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{APPETITE_ICONS[log.appetite]}</span>
                        <span className="text-sm capitalize">{log.appetite.replace("_", " ")}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Behavior */}
                {(log.behavior || log.behaviorNotes) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Activity className="h-4 w-4" />
                      Comportamento
                    </div>
                    {log.behavior && (
                      <Badge variant="outline">{log.behavior}</Badge>
                    )}
                    {log.behaviorNotes && (
                      <p className="text-sm text-muted-foreground pl-6">{log.behaviorNotes}</p>
                    )}
                  </div>
                )}

                {/* Activities */}
                {log.activities && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Activity className="h-4 w-4" />
                      Atividades
                    </div>
                    <div className="flex flex-wrap gap-2 pl-6">
                      {JSON.parse(log.activities).map((activity: string) => (
                        <Badge key={activity} variant="secondary">
                          {activity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feeding */}
                {(log.foodConsumed || log.feedingTime || log.feedingAmount || log.feedingAcceptance) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Utensils className="h-4 w-4" />
                      Alimentação
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pl-6 text-sm">
                      {log.feedingTime && (
                        <div>
                          <span className="text-muted-foreground">Horário:</span> {log.feedingTime}
                        </div>
                      )}
                      {log.feedingAmount && (
                        <div>
                          <span className="text-muted-foreground">Quantidade:</span> {log.feedingAmount}
                        </div>
                      )}
                      {log.foodConsumed && (
                        <div>
                          <span className="text-muted-foreground">Consumiu:</span> {log.foodConsumed === "all" ? "Tudo" : log.foodConsumed === "half" ? "Metade" : log.foodConsumed === "little" ? "Pouco" : "Nada"}
                        </div>
                      )}
                      {log.feedingAcceptance && (
                        <div>
                          <span className="text-muted-foreground">Aceitação:</span> {log.feedingAcceptance}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Weight */}
                {log.weight && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Peso:</span> {(log.weight / 1000).toFixed(1)} kg
                  </div>
                )}

                {/* Notes */}
                {log.notes && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Observações
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">{log.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Form Dialog */}
      <DailyLogForm
        petId={petId}
        petName={petName}
        open={isFormOpen}
        onOpenChange={handleFormClose}
        editLog={editingLog}
      />
    </div>
  );
}
