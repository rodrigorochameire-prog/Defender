"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, CheckCircle2, Pill, Shield, Syringe, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PremiumCalendar, CalendarEvent } from "@/components/premium-calendar";
import { LoadingPage } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TutorCalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

  const { data: eventsData, isLoading } = trpc.calendar.list.useQuery({
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  });

  const { data: petsData } = trpc.pets.myPets.useQuery();

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

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
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

      {/* Próximos Eventos */}
      {upcomingWeekEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos 7 Dias</CardTitle>
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

      {/* Premium Calendar - Tutor só visualiza, não cria eventos */}
      <PremiumCalendar
        events={events}
        onEventClick={handleEventClick}
        pets={pets}
        showCreateButton={false}
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

              <div className="flex justify-end pt-4">
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
