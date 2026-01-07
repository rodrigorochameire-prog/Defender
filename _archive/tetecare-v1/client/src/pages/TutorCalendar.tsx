import { useState } from "react";
import TutorLayout from "@/components/TutorLayout";
import { PremiumCalendar, CalendarEvent } from "@/components/PremiumCalendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, Dog, Trash2, TrendingUp, AlertCircle, CheckCircle2, Edit, X, Save, Download } from "lucide-react";

export default function TutorCalendar() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CalendarEvent>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get date range for current month (extended to show more events)
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

  // Fetch events
  const { data: eventsData, refetch } = trpc.calendar.getEvents.useQuery({
    startDate,
    endDate,
  });

  // Fetch all pets for filter
  const { data: petsData } = trpc.pets.list.useQuery();

  // Mutations
  const createEvent = trpc.calendar.add.useMutation({
    onSuccess: () => {
      toast.success("Evento criado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar evento: ${error.message}`);
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

  const updateEvent = trpc.calendar.update.useMutation({
    onSuccess: () => {
      toast.success("Evento atualizado com sucesso!");
      setIsEditMode(false);
      setIsEventDialogOpen(false);
      setSelectedEvent(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar evento: ${error.message}`);
    },
  });

  const exportMutation = trpc.calendar.exportToICal.useMutation({
    onSuccess: (data) => {
      // Create blob and download
      const blob = new Blob([data.icalContent], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tucocare-calendar.ics';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Calendário exportado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao exportar: ${error.message}`);
    },
  });

  // Transform events data
  const events: CalendarEvent[] =
    eventsData?.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      eventDate: new Date(event.eventDate),
      endDate: event.endDate ? new Date(event.endDate) : null,
      eventType: event.eventType as CalendarEvent["eventType"],
      petId: event.petId,
      petName: undefined,
      location: event.location,
      isAllDay: event.isAllDay,
    })) || [];

  // Transform pets data
  const pets =
    petsData?.map((pet: any) => ({
      id: pet.id,
      name: pet.name,
    })) || [];

  // Calculate stats
  const thisMonthEvents = events.filter((e) => {
    const eventDate = new Date(e.eventDate);
    return (
      eventDate.getMonth() === now.getMonth() &&
      eventDate.getFullYear() === now.getFullYear()
    );
  });

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

  const todayEvents = events.filter((e) => {
    const eventDate = new Date(e.eventDate);
    return (
      eventDate.getDate() === now.getDate() &&
      eventDate.getMonth() === now.getMonth() &&
      eventDate.getFullYear() === now.getFullYear()
    );
  });

  // Get events for selected date
  const selectedDateEvents = selectedDate
    ? events.filter((e) => {
        const eventDate = new Date(e.eventDate);
        return (
          eventDate.getDate() === selectedDate.getDate() &&
          eventDate.getMonth() === selectedDate.getMonth() &&
          eventDate.getFullYear() === selectedDate.getFullYear()
        );
      }).sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())
    : [];

  const handleCreateEvent = (eventData: Partial<CalendarEvent>) => {
    createEvent.mutate({
      title: eventData.title!,
      description: eventData.description || undefined,
      eventDate: eventData.eventDate!,
      endDate: eventData.endDate || undefined,
      eventType: eventData.eventType!,
      petId: eventData.petId || undefined,
      location: eventData.location || undefined,
      isAllDay: eventData.isAllDay!,
    });
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditMode(false);
    setIsEventDialogOpen(true);
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    deleteEvent.mutate({
      id: selectedEvent.id,
      petId: selectedEvent.petId || undefined,
      title: selectedEvent.title,
    });
  };

  const handleEditClick = () => {
    if (!selectedEvent) return;
    setEditForm({
      title: selectedEvent.title,
      description: selectedEvent.description || "",
      eventDate: selectedEvent.eventDate,
      endDate: selectedEvent.endDate || undefined,
      eventType: selectedEvent.eventType,
      petId: selectedEvent.petId || undefined,
      location: selectedEvent.location || "",
      isAllDay: selectedEvent.isAllDay,
    });
    setIsEditMode(true);
  };

  const handleSaveEdit = () => {
    if (!selectedEvent || !editForm.title) return;
    updateEvent.mutate({
      id: selectedEvent.id,
      title: editForm.title,
      description: editForm.description || undefined,
      eventDate: editForm.eventDate,
      endDate: editForm.endDate || undefined,
      eventType: editForm.eventType,
      petId: editForm.petId || undefined,
      location: editForm.location || undefined,
      isAllDay: editForm.isAllDay,
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditForm({});
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleExportToICal = () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
    exportMutation.mutate({ startDate, endDate });
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vaccination: "Vacinação",
      medication: "Medicamento",
      medical: "Consulta Médica",
      general: "Geral",
      holiday: "Feriado",
      closure: "Fechamento",
      checkin: "Check-in",
      checkout: "Check-out",
      preventive: "Preventivo",
    };
    return labels[type] || type;
  };

  return (
    <TutorLayout>
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Calendário Geral</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todos os eventos, vacinas, medicamentos e compromissos da creche
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Eventos este Mês
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{thisMonthEvents.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Agendados para {now.toLocaleDateString("pt-BR", { month: "long" })}</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Vacinas Próximas
                </CardTitle>
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{upcomingVaccinations.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Próximos 30 dias</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Eventos Hoje
                </CardTitle>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{todayEvents.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Agendados para hoje</p>
            </CardContent>
          </Card>
        </div>

        {/* Export Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={handleExportToICal}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              "Exportando..."
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar para Google Calendar
              </>
            )}
          </Button>
        </div>

        {/* Premium Calendar */}
        <PremiumCalendar
          events={events}
          onEventClick={handleEventClick}
          onCreateEvent={handleCreateEvent}
          onDayClick={handleDayClick}
          pets={pets}
          showCreateButton={true}
          role="tutor"
        />

        {/* Day Agenda - Shows when a date is selected */}
        {selectedDate && (
          <Card className="border-2 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle className="text-2xl">
                      Agenda do Dia
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedDate.toLocaleDateString("pt-BR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDate(null)}
                  className="rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Nenhum evento agendado para este dia
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Clique em "Novo Evento" para adicionar um compromisso
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateEvents.map((event, index) => {
                    const typeColors: Record<string, string> = {
                      vaccination: "border-blue-500 bg-blue-50 dark:bg-blue-950/20",
                      medication: "border-purple-500 bg-purple-50 dark:bg-purple-950/20",
                      medical: "border-red-500 bg-red-50 dark:bg-red-950/20",
                      general: "border-gray-500 bg-gray-50 dark:bg-gray-950/20",
                      holiday: "border-green-500 bg-green-50 dark:bg-green-950/20",
                      closure: "border-orange-500 bg-orange-50 dark:bg-orange-950/20",
                      checkin: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
                      checkout: "border-amber-500 bg-amber-50 dark:bg-amber-950/20",
                      preventive: "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20",
                    };

                    return (
                      <div
                        key={event.id}
                        className={`p-4 rounded-xl border-l-4 ${typeColors[event.eventType]} hover:shadow-md transition-all cursor-pointer`}
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              {!event.isAllDay && (
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                  <Clock className="h-4 w-4" />
                                  {event.eventDate.toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {getEventTypeLabel(event.eventType)}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-lg">{event.title}</h3>
                            {event.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {event.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              {event.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {event.location}
                                </div>
                              )}
                              {event.petId && (
                                <div className="flex items-center gap-1">
                                  <Dog className="h-3.5 w-3.5" />
                                  Pet ID: {event.petId}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                                handleEditClick();
                                setIsEventDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Event Details/Edit Dialog */}
        <Dialog open={isEventDialogOpen} onOpenChange={(open) => {
          setIsEventDialogOpen(open);
          if (!open) {
            setIsEditMode(false);
            setEditForm({});
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <Calendar className="h-6 w-6 text-primary" />
                {isEditMode ? "Editar Evento" : selectedEvent?.title}
              </DialogTitle>
              <DialogDescription>
                {isEditMode ? "Modifique as informações do evento" : "Detalhes do evento"}
              </DialogDescription>
            </DialogHeader>

            {selectedEvent && !isEditMode && (
              <div className="space-y-6">
                {/* View Mode */}
                <div>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {getEventTypeLabel(selectedEvent.eventType)}
                  </Badge>
                </div>

                {selectedEvent.description && (
                  <div className="bg-muted/50 p-4 rounded-xl">
                    <h3 className="font-semibold mb-2">Descrição</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}

                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      {selectedEvent.eventDate.toLocaleDateString("pt-BR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    {!selectedEvent.isAllDay ? (
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Horário: {selectedEvent.eventDate.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    ) : (
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Dia inteiro</p>
                    )}
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-xl border-2 border-purple-200 dark:border-purple-800">
                    <MapPin className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-purple-900 dark:text-purple-100">
                      {selectedEvent.location}
                    </span>
                  </div>
                )}

                {selectedEvent.petId && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border-2 border-green-200 dark:border-green-800">
                    <Dog className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900 dark:text-green-100">
                      Pet ID: {selectedEvent.petId}
                      {selectedEvent.petName && ` - ${selectedEvent.petName}`}
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsEventDialogOpen(false)}
                    className="rounded-xl"
                  >
                    Fechar
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleEditClick}
                    className="rounded-xl"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteEvent}
                    disabled={deleteEvent.isPending}
                    className="rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteEvent.isPending ? "Excluindo..." : "Excluir"}
                  </Button>
                </div>
              </div>
            )}

            {/* Edit Form */}
            {isEditMode && selectedEvent && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-title">Título *</Label>
                    <Input
                      id="edit-title"
                      value={editForm.title || ""}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="rounded-xl mt-1.5"
                      placeholder="Ex: Vacinação Antirrábica"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-description">Descrição</Label>
                    <Textarea
                      id="edit-description"
                      value={editForm.description || ""}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="rounded-xl mt-1.5"
                      rows={3}
                      placeholder="Detalhes adicionais sobre o evento..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-type">Tipo de Evento *</Label>
                    <Select
                      value={editForm.eventType}
                      onValueChange={(value) =>
                        setEditForm({ ...editForm, eventType: value as CalendarEvent["eventType"] })
                      }
                    >
                      <SelectTrigger className="rounded-xl mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Geral</SelectItem>
                        <SelectItem value="vaccination">Vacinação</SelectItem>
                        <SelectItem value="medication">Medicamento</SelectItem>
                        <SelectItem value="preventive">Preventivo</SelectItem>
                        <SelectItem value="medical">Consulta Médica</SelectItem>
                        <SelectItem value="checkin">Check-in</SelectItem>
                        <SelectItem value="checkout">Check-out</SelectItem>
                        <SelectItem value="holiday">Feriado</SelectItem>
                        <SelectItem value="closure">Fechamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-pet">Pet (opcional)</Label>
                    <Select
                      value={editForm.petId?.toString() || "none"}
                      onValueChange={(value) =>
                        setEditForm({
                          ...editForm,
                          petId: value === "none" ? undefined : Number(value),
                        })
                      }
                    >
                      <SelectTrigger className="rounded-xl mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum pet</SelectItem>
                        {pets.map((pet) => (
                          <SelectItem key={pet.id} value={pet.id.toString()}>
                            {pet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-date">Data e Hora de Início *</Label>
                    <Input
                      id="edit-date"
                      type="datetime-local"
                      value={
                        editForm.eventDate
                          ? new Date(
                              editForm.eventDate.getTime() -
                                editForm.eventDate.getTimezoneOffset() * 60000
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setEditForm({ ...editForm, eventDate: new Date(e.target.value) })
                      }
                      className="rounded-xl mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-end-date">Data e Hora de Término (Opcional)</Label>
                    <Input
                      id="edit-end-date"
                      type="datetime-local"
                      value={
                        editForm.endDate
                          ? new Date(
                              editForm.endDate.getTime() -
                                editForm.endDate.getTimezoneOffset() * 60000
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setEditForm({ ...editForm, endDate: e.target.value ? new Date(e.target.value) : undefined })
                      }
                      className="rounded-xl mt-1.5"
                    />
                    <p className="text-sm text-muted-foreground mt-1.5">
                      Para eventos que duram vários dias (ex: hospedagem, viagem)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="edit-location">Local</Label>
                    <Input
                      id="edit-location"
                      value={editForm.location || ""}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      placeholder="Ex: Clínica Veterinária"
                      className="rounded-xl mt-1.5"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="edit-allday"
                      checked={editForm.isAllDay || false}
                      onCheckedChange={(checked) =>
                        setEditForm({ ...editForm, isAllDay: checked as boolean })
                      }
                    />
                    <Label htmlFor="edit-allday" className="cursor-pointer">
                      Evento de dia inteiro
                    </Label>
                  </div>
                </div>

                {/* Edit Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={handleCancelEdit} className="rounded-xl">
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={updateEvent.isPending || !editForm.title}
                    className="rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateEvent.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TutorLayout>
  );
}
