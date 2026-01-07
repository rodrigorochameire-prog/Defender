import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { trpc } from "../lib/trpc";
import { Syringe, Pill, Shield, FileText, Calendar, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HealthTimelineProps {
  petId: number;
  petName: string;
}

type EventType = "all" | "vaccine" | "medication" | "log";
type TimeRange = "30" | "60" | "90" | "365" | "all";

export function HealthTimeline({ petId, petName }: HealthTimelineProps) {
  const [eventType, setEventType] = useState<EventType>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("90");

  // Fetch all health data
  const { data: vaccines = [], isLoading: loadingVaccines } = trpc.vaccines.getPetVaccinations.useQuery({ petId });
  const { data: medications = [], isLoading: loadingMeds } = trpc.medications.getPetMedications.useQuery({ petId });
  const { data: logs = [], isLoading: loadingLogs } = trpc.logs.getPetLogs.useQuery({ petId });

  const isLoading = loadingVaccines || loadingMeds || loadingLogs;

  // Combine and sort all events
  const allEvents = [
    ...vaccines.map((v: any) => ({
      type: "vaccine" as const,
      date: new Date(v.appliedDate),
      title: v.vaccineName,
      description: `Dose ${v.doseNumber}${v.nextDoseDate ? ` - Próxima dose: ${format(new Date(v.nextDoseDate), "dd/MM/yyyy")}` : ""}`,
      icon: Syringe,
      color: "text-blue-600 bg-blue-100",
      data: v,
    })),
    ...medications.map((m: any) => ({
      type: "medication" as const,
      date: new Date(m.startDate),
      title: m.medicationName,
      description: `${m.dosage} - ${m.frequency}${m.endDate ? ` até ${format(new Date(m.endDate), "dd/MM/yyyy")}` : ""}`,
      icon: Pill,
      color: "text-green-600 bg-green-100",
      data: m,
    })),

    ...logs
      .filter((l: any) => l.notes || l.mood || l.stool || l.appetite)
      .map((l: any) => ({
        type: "log" as const,
        date: new Date(l.logDate),
        title: `Log Diário - ${l.location === "daycare" ? "Creche" : "Casa"}`,
        description: l.notes || `Humor: ${l.mood || "N/A"}, Fezes: ${l.stool || "N/A"}, Apetite: ${l.appetite || "N/A"}`,
        icon: FileText,
        color: "text-gray-600 bg-gray-100",
        data: l,
      })),
  ];

  // Filter by event type
  const filteredByType = eventType === "all" 
    ? allEvents 
    : allEvents.filter(e => e.type === eventType);

  // Filter by time range
  const now = new Date();
  const cutoffDate = new Date();
  if (timeRange !== "all") {
    cutoffDate.setDate(now.getDate() - parseInt(timeRange));
  }

  const filteredEvents = timeRange === "all"
    ? filteredByType
    : filteredByType.filter(e => e.date >= cutoffDate);

  // Sort by date (most recent first)
  const sortedEvents = filteredEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Histórico de Saúde de {petName}</CardTitle>
            <CardDescription>Timeline completa de vacinas, medicamentos, preventivos e logs</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Eventos</SelectItem>
                <SelectItem value="vaccine">Vacinas</SelectItem>
                <SelectItem value="medication">Medicamentos</SelectItem>

                <SelectItem value="log">Logs Diários</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            Carregando histórico...
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum evento encontrado para os filtros selecionados</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

            {/* Events */}
            <div className="space-y-6">
              {sortedEvents.map((event, index) => {
                const Icon = event.icon;
                return (
                  <div key={`${event.type}-${index}`} className="relative pl-14">
                    {/* Icon */}
                    <div className={`absolute left-0 w-12 h-12 rounded-full ${event.color} flex items-center justify-center`}>
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <div className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{event.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(event.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </span>
                            <span className="capitalize px-2 py-0.5 rounded bg-accent">
                              {event.type === "vaccine" && "Vacina"}
                              {event.type === "medication" && "Medicamento"}
                              {event.type === "log" && "Log"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Additional details */}
                      {event.type === "medication" && event.data.notes && (
                        <div className="mt-3 pt-3 border-t text-sm">
                          <p className="text-muted-foreground">{event.data.notes}</p>
                        </div>
                      )}

                      {event.type === "vaccine" && event.data.notes && (
                        <div className="mt-3 pt-3 border-t text-sm">
                          <p className="text-muted-foreground">{event.data.notes}</p>
                        </div>
                      )}

                      {event.type === "log" && (
                        <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-4 text-sm">
                          {event.data.mood && (
                            <div>
                              <span className="text-muted-foreground">Humor:</span>
                              <span className="ml-2 font-medium capitalize">{event.data.mood}</span>
                            </div>
                          )}
                          {event.data.stool && (
                            <div>
                              <span className="text-muted-foreground">Fezes:</span>
                              <span className="ml-2 font-medium capitalize">{event.data.stool}</span>
                            </div>
                          )}
                          {event.data.appetite && (
                            <div>
                              <span className="text-muted-foreground">Apetite:</span>
                              <span className="ml-2 font-medium capitalize">{event.data.appetite}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
