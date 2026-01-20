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
import { Calendar, AlertCircle, CheckCircle2, Pill, Shield, Syringe, RefreshCw, Edit, Clock, MapPin, Dog, Check, X, Save, Trash2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PremiumCalendar, CalendarEvent } from "@/components/premium-calendar";
import { LoadingPage } from "@/components/shared/loading";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Tipos de eventos acionáveis
const ACTIONABLE_EVENT_TYPES = ["vaccination", "medication", "medical", "preventive"];

export default function TutorCalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    eventDate: "",
    eventTime: "",
    location: "",
    isAllDay: false,
  });

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

  const { data: eventsData, isLoading, refetch } = trpc.calendar.list.useQuery({
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  });

  const { data: petsData } = trpc.pets.myPets.useQuery();

  // Mutations para cogestão
  const createEvent = trpc.calendar.create.useMutation({
    onSuccess: () => {
      toast.success("Evento criado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar evento: ${error.message}`);
    },
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
      // Verificar se é erro de permissão (evento criado pelo admin)
      if (error.message.includes("admin") || error.message.includes("permissão")) {
        toast.error("Você não pode excluir eventos criados pelo administrador");
      } else {
        toast.error(`Erro ao excluir evento: ${error.message}`);
      }
    },
  });

  // Transform events data
  const events: CalendarEvent[] =
    eventsData?.map((event: any) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      eventDate: new Date(event.eventDate),
      endDate: event.endDate ? new Date(event.endDate) : null,
      eventType: event.eventType as CalendarEvent["eventType"],
      petId: event.petId,
      petName: event.pet?.name,
      location: event.location,
      isAllDay: event.isAllDay ?? false,
    })) || [];

  // Transform pets data
  const pets =
    petsData?.map((pet: any) => ({
      id: pet.id,
      name: pet.name,
    })) || [];

  // Calculate stats
  const upcomingVaccinations = events.filter((e) => {
    const eventDate = new Date(e.eventDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return (
      e.eventType === "vaccination" &&
      eventDate >= now &&
      eventDate <= thirtyDaysFromNow
    );
  });

  const upcomingMedications = events.filter((e) => {
    const eventDate = new Date(e.eventDate);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return (
      e.eventType === "medication" &&
      eventDate >= now &&
      eventDate <= sevenDaysFromNow
    );
  });

  const upcomingPreventives = events.filter((e) => {
    const eventDate = new Date(e.eventDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return (
      e.eventType === "preventive" &&
      eventDate >= now &&
      eventDate <= thirtyDaysFromNow
    );
  });

  const todayEvents = events.filter((e) => {
    const eventDate = new Date(e.eventDate);
    return (
      eventDate.getDate() === now.getDate() &&
      eventDate.getMonth() === now.getMonth() &&
      eventDate.getFullYear() === now.getFullYear()
    );
  });

  // Próximos eventos da semana
  const upcomingWeekEvents = events.filter((e) => {
    const eventDate = new Date(e.eventDate);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return eventDate >= now && eventDate <= sevenDaysFromNow;
  }).slice(0, 8);

  // Handler para criar eventos
  const handleCreateEvent = (eventData: Record<string, unknown>) => {
    createEvent.mutate({
      title: eventData.title as string,
      description: (eventData.description as string) || undefined,
      eventDate: eventData.eventDate as string,
      endDate: (eventData.endDate as string) || undefined,
      eventType: eventData.eventType as string,
      petId: eventData.petId as number | undefined,
      isAllDay: (eventData.isAllDay as boolean) ?? false,
      notes: (eventData.notes as string) || undefined,
    });
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditMode(false);
    setIsEventDialogOpen(true);
  };

  // Funções de edição
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

  // Marcar como realizado
  const handleMarkAsCompleted = () => {
    if (!selectedEvent) return;
    updateEvent.mutate({
      id: selectedEvent.id,
      status: "completed",
    });
    setIsEventDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleMarkAsPending = () => {
    if (!selectedEvent) return;
    updateEvent.mutate({
      id: selectedEvent.id,
      status: "scheduled",
    });
    setIsEventDialogOpen(false);
    setSelectedEvent(null);
  };

  // Excluir evento (apenas se não foi criado pelo admin)
  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    deleteEvent.mutate({ id: selectedEvent.id });
  };

  const isActionableEvent = (eventType: string) => {
    return ACTIONABLE_EVENT_TYPES.includes(eventType);
  };

  if (isLoading) {
    return <LoadingPage />;
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
            <h1>Meu Calendário</h1>
            <p>Eventos e agendamentos dos seus pets</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Eventos Hoje</span>
            <Calendar className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{todayEvents.length}</div>
        </div>

        <div className={`stat-card ${upcomingVaccinations.length > 0 ? "highlight" : ""}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Vacinas</span>
            <Syringe className={`stat-card-icon ${upcomingVaccinations.length > 0 ? "amber" : "muted"}`} />
          </div>
          <div className="stat-card-value">{upcomingVaccinations.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Medicamentos</span>
            <Pill className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{upcomingMedications.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Preventivos</span>
            <Shield className="stat-card-icon green" />
          </div>
          <div className="stat-card-value">{upcomingPreventives.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Meus Pets</span>
            <Calendar className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{pets.length}</div>
        </div>
      </div>

      {/* Premium Calendar - EM DESTAQUE no topo */}
      <PremiumCalendar
        events={events}
        onEventClick={handleEventClick}
        onCreateEvent={handleCreateEvent}
        pets={pets}
        showCreateButton={true}
      />

      {/* Próximos 7 Dias - Lista complementar abaixo */}
      <div className="section-card">
        <div className="section-card-header">
          <div className="section-card-title">
            <Clock className="h-4 w-4" />
            Próximos 7 Dias
          </div>
          <span className="text-xs text-muted-foreground">{upcomingWeekEvents.length} eventos</span>
        </div>
        <div className="section-card-content">
          {upcomingWeekEvents.length === 0 ? (
            <div className="empty-state py-6">
              <div className="empty-state-icon"><Calendar /></div>
              <p className="empty-state-text">Nenhum evento nos próximos 7 dias</p>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {upcomingWeekEvents.map((event) => {
                const eventDate = new Date(event.eventDate);
                const isToday = eventDate.toDateString() === new Date().toDateString();
                const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                
                return (
                  <div 
                    key={event.id} 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm",
                      isToday ? "bg-primary/10 border-primary/30" : "bg-card hover:border-primary/30"
                    )}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex flex-col items-center justify-center text-center flex-shrink-0",
                      isToday ? "bg-primary text-white" : "bg-muted"
                    )}>
                      <span className="text-[10px] font-medium uppercase leading-none">
                        {format(eventDate, "MMM", { locale: ptBR })}
                      </span>
                      <span className="text-sm font-bold leading-none">
                        {format(eventDate, "dd")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {isToday ? "Hoje" : isTomorrow ? "Amanhã" : format(eventDate, "EEE", { locale: ptBR })}
                        {!event.isAllDay && ` • ${format(eventDate, "HH:mm")}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Event Detail Dialog - Com funcionalidades de edição e exclusão */}
      <Dialog open={isEventDialogOpen} onOpenChange={(open) => {
        setIsEventDialogOpen(open);
        if (!open) setIsEditMode(false);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {isEditMode ? "Editar Evento" : selectedEvent?.title}
              {selectedEvent?.status === "completed" && !isEditMode && (
                <Badge className="bg-green-500 text-white ml-2">
                  <Check className="h-3 w-3 mr-1" />
                  Realizado
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? "Edite as informações do evento" : "Detalhes e gerenciamento do evento"}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && !isEditMode && (
            <div className="space-y-4">
              {/* Status Banner para eventos acionáveis */}
              {isActionableEvent(selectedEvent.eventType) && (
                <div className={cn(
                  "p-3 rounded-lg flex items-center justify-between",
                  selectedEvent.status === "completed"
                    ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                    : "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800"
                )}>
                  <div className="flex items-center gap-2">
                    {selectedEvent.status === "completed" ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-green-700 dark:text-green-400 font-medium">
                          Marcado como realizado
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <span className="text-orange-700 dark:text-orange-400 font-medium">
                          Ação pendente
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
                      Marcar Realizado
                    </Button>
                  )}
                </div>
              )}

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
                {selectedEvent.petName && (
                  <div>
                    <p className="font-medium text-muted-foreground">Pet</p>
                    <p className="flex items-center gap-1">
                      <Dog className="h-4 w-4" />
                      {selectedEvent.petName}
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
