"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp,
  Gavel,
  Scale,
  Users,
  RefreshCw,
  Edit,
  Trash2,
  Clock,
  MapPin,
  Check,
  X,
  Save
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CalendarSkeleton } from "@/components/shared/skeletons";
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, FileText, Bell } from "lucide-react";

// Configuração dos tipos de eventos - contexto jurídico
const EVENT_TYPE_CONFIG = {
  prazo: { label: "Prazo", icon: AlertCircle, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30" },
  audiencia: { label: "Audiência", icon: Gavel, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  juri: { label: "Júri", icon: Scale, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  reuniao: { label: "Reunião", icon: Users, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  atendimento: { label: "Atendimento", icon: Users, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
  visita: { label: "Visita", icon: MapPin, color: "text-teal-600 dark:text-teal-400", bgColor: "bg-teal-100 dark:bg-teal-900/30" },
  lembrete: { label: "Lembrete", icon: Bell, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/30" },
  custom: { label: "Outro", icon: FileText, color: "text-slate-500 dark:text-slate-500", bgColor: "bg-slate-100 dark:bg-slate-900/30" },
};

export default function AdminCalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    eventDate: "",
    eventTime: "",
    location: "",
    isAllDay: false,
  });

  const now = new Date();
  const startDate = startOfMonth(subMonths(now, 1));
  const endDate = endOfMonth(addMonths(now, 2));

  const { data: eventsData, isLoading, refetch } = trpc.calendar.list.useQuery({
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  });

  const updateEvent = trpc.calendar.update.useMutation({
    onSuccess: () => {
      toast.success("Evento atualizado com sucesso!");
      setIsEditMode(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar evento: ${error.message}`);
    },
  });

  const deleteEvent = trpc.calendar.delete.useMutation({
    onSuccess: () => {
      toast.success("Evento excluído com sucesso!");
      setIsEventDialogOpen(false);
      setSelectedEvent(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir evento: ${error.message}`);
    },
  });

  // Transform events data
  const events = eventsData || [];

  // Função para iniciar edição
  const handleStartEdit = () => {
    if (!selectedEvent) return;
    setEditFormData({
      title: selectedEvent.title,
      description: selectedEvent.description || "",
      eventDate: format(new Date(selectedEvent.eventDate), "yyyy-MM-dd"),
      eventTime: format(new Date(selectedEvent.eventDate), "HH:mm"),
      location: selectedEvent.location || "",
      isAllDay: selectedEvent.isAllDay,
    });
    setIsEditMode(true);
  };

  // Função para salvar edição
  const handleSaveEdit = () => {
    if (!selectedEvent) return;

    const eventDate = new Date(editFormData.eventDate);
    if (editFormData.eventTime && !editFormData.isAllDay) {
      const [hours, minutes] = editFormData.eventTime.split(":");
      eventDate.setHours(parseInt(hours), parseInt(minutes));
    }

    updateEvent.mutate({
      id: selectedEvent.id,
      title: editFormData.title,
      description: editFormData.description || undefined,
      eventDate: eventDate.toISOString(),
      location: editFormData.location || undefined,
      isAllDay: editFormData.isAllDay,
    });
  };

  // Função para marcar como realizado
  const handleMarkAsCompleted = () => {
    if (!selectedEvent) return;
    updateEvent.mutate({
      id: selectedEvent.id,
      status: "completed",
    });
    setIsEventDialogOpen(false);
    setSelectedEvent(null);
  };

  // Função para desmarcar como realizado
  const handleMarkAsPending = () => {
    if (!selectedEvent) return;
    updateEvent.mutate({
      id: selectedEvent.id,
      status: "scheduled",
    });
    setIsEventDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsEditMode(false);
    setIsEventDialogOpen(true);
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    deleteEvent.mutate({
      id: selectedEvent.id,
    });
  };

  // Calculate stats
  const todayEvents = events.filter((e: any) => {
    const eventDate = new Date(e.eventDate);
    return isSameDay(eventDate, now);
  });

  const upcomingPrazos = events.filter((e: any) => {
    const eventDate = new Date(e.eventDate);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return e.eventType === "prazo" && eventDate >= now && eventDate <= sevenDaysFromNow;
  });

  const upcomingAudiencias = events.filter((e: any) => {
    const eventDate = new Date(e.eventDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return e.eventType === "audiencia" && eventDate >= now && eventDate <= thirtyDaysFromNow;
  });

  const upcomingJuri = events.filter((e: any) => {
    const eventDate = new Date(e.eventDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return e.eventType === "juri" && eventDate >= now && eventDate <= thirtyDaysFromNow;
  });

  // Próximos 7 dias
  const upcomingWeekEvents = events.filter((e: any) => {
    const eventDate = new Date(e.eventDate);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return eventDate >= now && eventDate <= sevenDaysFromNow;
  }).slice(0, 10);

  // Calendário do mês
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = [];
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    daysInMonth.push(new Date(d));
  }

  const getEventsForDay = (day: Date) => {
    return events.filter((e: any) => isSameDay(new Date(e.eventDate), day));
  };

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Calendar />
          </div>
          <div className="page-header-info">
            <h1>Calendário Jurídico</h1>
            <p>Prazos, audiências e eventos importantes</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Eventos Hoje</span>
            <Calendar className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{todayEvents.length}</div>
        </div>

        <div className={`stat-card ${upcomingPrazos.length > 0 ? "highlight" : ""}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Prazos (7d)</span>
            <AlertCircle className={`stat-card-icon ${upcomingPrazos.length > 0 ? "red" : "muted"}`} />
          </div>
          <div className="stat-card-value">{upcomingPrazos.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Audiências</span>
            <Gavel className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{upcomingAudiencias.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Júri</span>
            <Scale className="stat-card-icon purple" />
          </div>
          <div className="stat-card-value">{upcomingJuri.length}</div>
        </div>
      </div>

      {/* Calendário */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Hoje
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {/* Cabeçalho dos dias da semana */}
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
              <div key={day} className="text-center text-xs text-muted-foreground font-medium py-2">
                {day}
              </div>
            ))}
            
            {/* Células vazias para alinhar o primeiro dia */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-start-${i}`} className="aspect-square" />
            ))}
            
            {/* Dias do mês */}
            {daysInMonth.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, now);
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "aspect-square rounded-lg border p-1 flex flex-col cursor-pointer transition-all hover:bg-muted/50",
                    isToday && "ring-2 ring-primary bg-primary/5"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium",
                    isToday && "text-primary"
                  )}>
                    {day.getDate()}
                  </span>
                  <div className="flex-1 overflow-hidden mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((event: any) => {
                      const config = EVENT_TYPE_CONFIG[event.eventType as keyof typeof EVENT_TYPE_CONFIG] || EVENT_TYPE_CONFIG.custom;
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                          className={cn(
                            "text-xs px-1 rounded truncate cursor-pointer hover:opacity-80",
                            config.bgColor,
                            config.color
                          )}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayEvents.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Próximos Eventos */}
      {upcomingWeekEvents.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Próximos 7 Dias
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingWeekEvents.map((event: any) => {
                const eventConfig = EVENT_TYPE_CONFIG[event.eventType as keyof typeof EVENT_TYPE_CONFIG] || EVENT_TYPE_CONFIG.custom;
                const EventIcon = eventConfig.icon;
                const isCompleted = event.status === "completed";
                
                return (
                  <div 
                    key={event.id} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-all",
                      isCompleted && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    )}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        isCompleted ? "bg-green-200 dark:bg-green-700" : eventConfig.bgColor
                      )}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <EventIcon className={cn("h-5 w-5", eventConfig.color)} />
                        )}
                      </div>
                      <div>
                        <p className={cn(
                          "font-medium",
                          isCompleted && "line-through text-muted-foreground"
                        )}>
                          {event.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {event.processo?.numeroAutos && `${event.processo.numeroAutos} • `}
                          {format(new Date(event.eventDate), "EEEE, dd/MM", { locale: ptBR })}
                          {!event.isAllDay && ` às ${format(new Date(event.eventDate), "HH:mm")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCompleted && (
                        <Badge className="bg-green-600 hover:bg-green-700 text-white">
                          <Check className="h-3 w-3 mr-1" />
                          Concluído
                        </Badge>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {eventConfig.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={(open) => {
        setIsEventDialogOpen(open);
        if (!open) setIsEditMode(false);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && (() => {
                const config = EVENT_TYPE_CONFIG[selectedEvent.eventType as keyof typeof EVENT_TYPE_CONFIG] || EVENT_TYPE_CONFIG.custom;
                const Icon = config.icon;
                return <Icon className={cn("h-5 w-5", config.color)} />;
              })()}
              {isEditMode ? "Editar Evento" : selectedEvent?.title}
              {selectedEvent?.status === "completed" && !isEditMode && (
                <Badge className="bg-green-600 text-white ml-2">
                  <Check className="h-3 w-3 mr-1" />
                  Concluído
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? "Edite as informações do evento" : "Detalhes do evento"}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && !isEditMode && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className={cn(
                "p-3 rounded-lg flex items-center justify-between",
                selectedEvent.status === "completed"
                  ? "bg-green-100 dark:bg-green-800 border border-green-200 dark:border-green-700"
                  : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              )}>
                <div className="flex items-center gap-2">
                  {selectedEvent.status === "completed" ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="text-green-700 dark:text-green-300 font-medium">
                        Marcado como concluído
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        Pendente
                      </span>
                    </>
                  )}
                </div>
                {selectedEvent.status === "completed" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarkAsPending}
                    disabled={updateEvent.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Desmarcar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleMarkAsCompleted}
                    disabled={updateEvent.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Concluir
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Data</p>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedEvent.eventDate), "PPP", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Horário</p>
                  <p className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {selectedEvent.isAllDay
                      ? "Dia inteiro"
                      : format(new Date(selectedEvent.eventDate), "HH:mm")}
                  </p>
                </div>
                {selectedEvent.processo?.numeroAutos && (
                  <div>
                    <p className="font-medium text-muted-foreground">Processo</p>
                    <p className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {selectedEvent.processo.numeroAutos}
                    </p>
                  </div>
                )}
                {selectedEvent.location && (
                  <div>
                    <p className="font-medium text-muted-foreground">Local</p>
                    <p className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {selectedEvent.location}
                    </p>
                  </div>
                )}
              </div>

              {selectedEvent.description && (
                <div>
                  <p className="font-medium text-muted-foreground text-sm">
                    Descrição
                  </p>
                  <p className="text-sm mt-1 p-2 bg-muted rounded">{selectedEvent.description}</p>
                </div>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleStartEdit}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteEvent}
                  disabled={deleteEvent.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Formulário de Edição */}
          {selectedEvent && isEditMode && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Título</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="Nome do evento"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={editFormData.eventDate}
                    onChange={(e) => setEditFormData({ ...editFormData, eventDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={editFormData.eventTime}
                    onChange={(e) => setEditFormData({ ...editFormData, eventTime: e.target.value })}
                    disabled={editFormData.isAllDay}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-allday"
                  checked={editFormData.isAllDay}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, isAllDay: checked as boolean })}
                />
                <Label htmlFor="edit-allday">Dia inteiro</Label>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Local
                </Label>
                <Input
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  placeholder="Local do evento"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Detalhes do evento..."
                  rows={3}
                />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsEditMode(false)}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateEvent.isPending || !editFormData.title}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
