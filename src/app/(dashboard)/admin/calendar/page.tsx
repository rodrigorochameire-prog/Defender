"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp,
  Pill,
  Shield,
  Syringe,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PremiumCalendar, CalendarEvent } from "@/components/premium-calendar";
import { LoadingPage } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminCalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

  const { data: eventsData, isLoading, refetch } = trpc.calendar.list.useQuery({
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  });

  const { data: petsData } = trpc.pets.list.useQuery();

  const createEvent = trpc.calendar.create.useMutation({
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

  // Próximos 7 dias
  const upcomingWeekEvents = events.filter((e) => {
    const eventDate = new Date(e.eventDate);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return eventDate >= now && eventDate <= sevenDaysFromNow;
  }).slice(0, 10);

  const handleCreateEvent = (eventData: Record<string, unknown>) => {
    createEvent.mutate({
      title: eventData.title as string,
      description: (eventData.description as string) || undefined,
      eventDate: eventData.eventDate as string,
      endDate: (eventData.endDate as string) || undefined,
      eventType: eventData.eventType as string,
      petId: eventData.petId as number | undefined,
      isAllDay: (eventData.isAllDay as boolean) ?? false,
      // Campos opcionais
      notes: (eventData.notes as string) || undefined,
      priority: (eventData.priority as "low" | "normal" | "high" | "urgent") || undefined,
      reminderMinutes: (eventData.reminderMinutes as number) || undefined,
      isRecurring: (eventData.isRecurring as boolean) || false,
      recurrenceType: (eventData.recurrenceType as string) || undefined,
      recurrenceInterval: (eventData.recurrenceInterval as number) || undefined,
      recurrenceEndDate: (eventData.recurrenceEndDate as string) || undefined,
      recurrenceCount: (eventData.recurrenceCount as number) || undefined,
    });
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    deleteEvent.mutate({
      id: selectedEvent.id,
    });
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário"
        description="Gerencie eventos, vacinações e agendamentos"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              {todayEvents.length === 0 ? "Nenhum evento" : "eventos agendados"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthEvents.length}</div>
            <p className="text-xs text-muted-foreground">eventos no total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vacinações</CardTitle>
            <Syringe className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{upcomingVaccinations.length}</div>
            <p className="text-xs text-muted-foreground">próximos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medicamentos</CardTitle>
            <Pill className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{upcomingMedications.length}</div>
            <p className="text-xs text-muted-foreground">próximos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preventivos</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{upcomingPreventives.length}</div>
            <p className="text-xs text-muted-foreground">próximos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Próximos Eventos */}
      {upcomingWeekEvents.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Próximos 7 Dias</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingWeekEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.petName && `${event.petName} • `}
                        {format(new Date(event.eventDate), "EEEE, dd/MM", { locale: ptBR })}
                        {!event.isAllDay && ` às ${format(new Date(event.eventDate), "HH:mm")}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {event.eventType}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Calendar */}
      <PremiumCalendar
        events={events}
        onEventClick={handleEventClick}
        onCreateEvent={handleCreateEvent}
        pets={pets}
        showCreateButton={true}
      />

      {/* Event Detail Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              Detalhes do evento
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Data</p>
                  <p>
                    {format(new Date(selectedEvent.eventDate), "PPP", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Horário</p>
                  <p>
                    {selectedEvent.isAllDay
                      ? "Dia inteiro"
                      : format(new Date(selectedEvent.eventDate), "HH:mm")}
                  </p>
                </div>
                {selectedEvent.petName && (
                  <div>
                    <p className="font-medium text-muted-foreground">Pet</p>
                    <p>{selectedEvent.petName}</p>
                  </div>
                )}
                {selectedEvent.location && (
                  <div>
                    <p className="font-medium text-muted-foreground">Local</p>
                    <p>{selectedEvent.location}</p>
                  </div>
                )}
              </div>

              {selectedEvent.description && (
                <div>
                  <p className="font-medium text-muted-foreground text-sm">
                    Descrição
                  </p>
                  <p className="text-sm mt-1">{selectedEvent.description}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="destructive"
                  onClick={handleDeleteEvent}
                >
                  Excluir
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEventDialogOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
