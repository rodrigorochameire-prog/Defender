import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Syringe,
  Pill,
  Shield,
  Star,
  LogIn,
  LogOut as LogOutIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface CalendarEvent {
  id: number;
  date: Date;
  type: "vaccine" | "medication" | "preventive" | "event" | "checkin" | "checkout";
  title: string;
  description?: string;
  petId?: number;
  petName?: string;
  status?: "pending" | "completed" | "overdue";
}

interface InteractiveCalendarProps {
  petId?: number; // If provided, show only events for this pet
  showFilters?: boolean;
}

export function InteractiveCalendar({ petId, showFilters = true }: InteractiveCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["all"]);
  const [selectedPetId, setSelectedPetId] = useState<number | undefined>(petId);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Fetch pets for filter
  const { data: pets = [] } = trpc.pets.list.useQuery();

  // Fetch all events for the current month
  const startOfMonth = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return date;
  }, [currentDate]);

  const endOfMonth = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return date;
  }, [currentDate]);

  // Fetch vaccines
  const { data: vaccines = [] } = trpc.vaccines.upcoming.useQuery(
    { daysAhead: 90 },
    { enabled: !selectedPetId || selectedTypes.includes("all") || selectedTypes.includes("vaccine") }
  );

  // Fetch active medications
  const { data: medications = [] } = trpc.medications.getActive.useQuery(
    { petId: selectedPetId },
    { enabled: selectedTypes.includes("all") || selectedTypes.includes("medication") }
  );

  // Fetch calendar events
  const { data: calendarEvents = [] } = trpc.calendar.getEvents.useQuery(
    {
      startDate: startOfMonth,
      endDate: endOfMonth,
    },
    { enabled: selectedTypes.includes("all") || selectedTypes.includes("event") }
  );

  // Fetch daily logs for check-ins/outs
  const { data: dailyLogs = [] } = trpc.logs.getPetLogs.useQuery(
    {
      petId: selectedPetId || 0,
      startDate: startOfMonth,
      endDate: endOfMonth,
    },
    { enabled: (selectedTypes.includes("all") || selectedTypes.includes("checkin") || selectedTypes.includes("checkout")) && !!selectedPetId }
  );

  // Transform data into calendar events
  const events = useMemo((): CalendarEvent[] => {
    const result: CalendarEvent[] = [];

    // Add vaccines
    if (selectedTypes.includes("all") || selectedTypes.includes("vaccine")) {
      vaccines.forEach((vaccine: any) => {
        if (!selectedPetId || vaccine.petId === selectedPetId) {
          if (vaccine.nextDose) {
            result.push({
              id: vaccine.id,
              date: new Date(vaccine.nextDose),
              type: "vaccine",
              title: `Vacina: ${vaccine.vaccineName}`,
              description: `Pet: ${vaccine.petName}`,
              petId: vaccine.petId,
              petName: vaccine.petName,
              status: new Date(vaccine.nextDose) < new Date() ? "overdue" : "pending",
            });
          }
        }
      });
    }

    // Add active medications
    if (selectedTypes.includes("all") || selectedTypes.includes("medication")) {
      medications.forEach((med: any) => {
        const petName = med.pet?.name || "Pet";
        const startDate = new Date(med.medication.startDate);
        const endDate = med.medication.endDate ? new Date(med.medication.endDate) : null;
        
        // Add medication to all days between start and end (or current month end)
        const medEndDate = endDate || endOfMonth;
        const currentDay = new Date(Math.max(startDate.getTime(), startOfMonth.getTime()));
        
        while (currentDay <= medEndDate && currentDay <= endOfMonth) {
          result.push({
            id: med.medication.id * 10000 + currentDay.getDate(),
            date: new Date(currentDay),
            type: "medication",
            title: `${med.medicationInfo.name}`,
            description: `Pet: ${petName} | Dosagem: ${med.medication.dosage}${med.medication.frequency ? ' | ' + med.medication.frequency : ''}`,
            petId: med.medication.petId,
            petName: petName,
            status: "pending",
          });
          currentDay.setDate(currentDay.getDate() + 1);
        }
      });
    }

    // Add calendar events
    if (selectedTypes.includes("all") || selectedTypes.includes("event")) {
      calendarEvents.forEach((event: any) => {
        if (!selectedPetId || event.petId === selectedPetId) {
          result.push({
            id: event.id,
            date: new Date(event.eventDate),
            type: "event",
            title: event.title,
            description: event.description || "",
            petId: event.petId,
            petName: event.petName,
            status: "pending",
          });
        }
      });
    }

    // Add check-ins and check-outs
    if (selectedTypes.includes("all") || selectedTypes.includes("checkin") || selectedTypes.includes("checkout")) {
      dailyLogs.forEach((log: any) => {
        if (!selectedPetId || log.petId === selectedPetId) {
          if (log.checkInTime) {
            result.push({
              id: log.id,
              date: new Date(log.date),
              type: "checkin",
              title: `Check-in: ${log.petName}`,
              description: `Horário: ${new Date(log.checkInTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
              petId: log.petId,
              petName: log.petName,
              status: "completed",
            });
          }
          if (log.checkOutTime) {
            result.push({
              id: log.id + 10000,
              date: new Date(log.date),
              type: "checkout",
              title: `Check-out: ${log.petName}`,
              description: `Horário: ${new Date(log.checkOutTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
              petId: log.petId,
              petName: log.petName,
              status: "completed",
            });
          }
        }
      });
    }

    return result;
  }, [vaccines, medications, calendarEvents, dailyLogs, selectedPetId, selectedTypes, startOfMonth, endOfMonth]);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = [];
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Add empty cells for days before month starts
    const startDayOfWeek = firstDay.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    }
    
    return days;
  }, [currentDate]);

  // Get events for a specific day
  const getEventsForDay = (date: Date | null): CalendarEvent[] => {
    if (!date) return [];
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const getWeekRange = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // End of week (Saturday)
    return { start, end };
  };

  const weekRange = getWeekRange();
  const weekRangeText = `${weekRange.start.getDate()} - ${weekRange.end.getDate()} de ${weekRange.end.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;

  // Event icon
  const getEventIcon = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "vaccine":
        return <Syringe className="h-3 w-3" />;
      case "medication":
        return <Pill className="h-3 w-3" />;
      case "preventive":
        return <Shield className="h-3 w-3" />;
      case "event":
        return <Star className="h-3 w-3" />;
      case "checkin":
        return <LogIn className="h-3 w-3" />;
      case "checkout":
        return <LogOutIcon className="h-3 w-3" />;
    }
  };

  // Event color
  const getEventColor = (event: CalendarEvent) => {
    if (event.status === "overdue") return "bg-red-500/20 text-red-700 border-red-300";
    switch (event.type) {
      case "vaccine":
        return "bg-blue-500/20 text-blue-700 border-blue-300";
      case "medication":
        return "bg-purple-500/20 text-purple-700 border-purple-300";
      case "preventive":
        return "bg-green-500/20 text-green-700 border-green-300";
      case "event":
        return "bg-yellow-500/20 text-yellow-700 border-yellow-300";
      case "checkin":
        return "bg-emerald-500/20 text-emerald-700 border-emerald-300";
      case "checkout":
        return "bg-orange-500/20 text-orange-700 border-orange-300";
    }
  };

  const monthName = currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("month")}
            >
              Mensal
            </Button>
            <Button
              variant={view === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("week")}
            >
              Semanal
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={view === "month" ? goToPreviousMonth : goToPreviousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold capitalize min-w-[200px] text-center">
              {view === "month" ? monthName : weekRangeText}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={view === "month" ? goToNextMonth : goToNextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              {view === "month" ? "Hoje" : "Esta Semana"}
            </Button>
          </div>

          {showFilters && (
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedPetId?.toString() || "all"} onValueChange={(v) => setSelectedPetId(v === "all" ? undefined : Number(v))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por pet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pets</SelectItem>
                  {pets.map((pet: any) => (
                    <SelectItem key={pet.id} value={pet.id.toString()}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTypes[0]} onValueChange={(v) => setSelectedTypes([v])}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo de evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="vaccine">Vacinas</SelectItem>
                  <SelectItem value="medication">Medicamentos</SelectItem>
                  <SelectItem value="preventive">Preventivos</SelectItem>
                  <SelectItem value="event">Eventos</SelectItem>
                  <SelectItem value="checkin">Check-ins</SelectItem>
                  <SelectItem value="checkout">Check-outs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline" className="bg-blue-500/20 text-blue-700 border-blue-300">
          <Syringe className="h-3 w-3 mr-1" /> Vacinas
        </Badge>
        <Badge variant="outline" className="bg-purple-500/20 text-purple-700 border-purple-300">
          <Pill className="h-3 w-3 mr-1" /> Medicamentos
        </Badge>
        <Badge variant="outline" className="bg-green-500/20 text-green-700 border-green-300">
          <Shield className="h-3 w-3 mr-1" /> Preventivos
        </Badge>
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 border-yellow-300">
          <Star className="h-3 w-3 mr-1" /> Eventos
        </Badge>
        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 border-emerald-300">
          <LogIn className="h-3 w-3 mr-1" /> Check-in
        </Badge>
        <Badge variant="outline" className="bg-orange-500/20 text-orange-700 border-orange-300">
          <LogOutIcon className="h-3 w-3 mr-1" /> Check-out
        </Badge>
      </div>

      {/* Calendar Grid */}
      <Card className="p-4">
        {view === "month" ? (
        <>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isToday =
              day &&
              day.getDate() === new Date().getDate() &&
              day.getMonth() === new Date().getMonth() &&
              day.getFullYear() === new Date().getFullYear();

            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 border rounded-lg ${
                  day ? "bg-card hover:bg-accent/50 cursor-pointer" : "bg-muted/30"
                } ${isToday ? "ring-2 ring-primary" : ""}`}
              >
                {day && (
                  <>
                    <div className="text-sm font-medium mb-1">{day.getDate()}</div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`w-full text-left text-xs px-1.5 py-0.5 rounded border flex items-center gap-1 ${getEventColor(event)}`}
                        >
                          {getEventIcon(event.type)}
                          <span className="truncate">{event.title}</span>
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground px-1.5">
                          +{dayEvents.length - 3} mais
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        </>
        ) : (
          /* Week View */
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Week header */}
              <div className="grid grid-cols-8 gap-px bg-border">
                <div className="bg-card p-2"></div>
                {Array.from({ length: 7 }).map((_, i) => {
                  const day = new Date(weekRange.start);
                  day.setDate(day.getDate() + i);
                  const isToday =
                    day.getDate() === new Date().getDate() &&
                    day.getMonth() === new Date().getMonth() &&
                    day.getFullYear() === new Date().getFullYear();
                  return (
                    <div
                      key={i}
                      className={`bg-card p-2 text-center ${
                        isToday ? "bg-primary/10" : ""
                      }`}
                    >
                      <div className="text-xs text-muted-foreground">
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][i]}
                      </div>
                      <div className={`text-lg font-semibold ${
                        isToday ? "text-primary" : ""
                      }`}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time slots */}
              <div className="grid grid-cols-8 gap-px bg-border max-h-[600px] overflow-y-auto">
                {Array.from({ length: 16 }).map((_, hourIndex) => {
                  const hour = 6 + hourIndex;
                  return (
                    <React.Fragment key={hour}>
                      {/* Hour label */}
                      <div className="bg-card p-2 text-xs text-muted-foreground text-right">
                        {hour}:00
                      </div>
                      {/* Day columns */}
                      {Array.from({ length: 7 }).map((_, dayIndex) => {
                        const day = new Date(weekRange.start);
                        day.setDate(day.getDate() + dayIndex);
                        const dayEvents = getEventsForDay(day);
                        
                        return (
                          <div
                            key={dayIndex}
                            className="bg-card p-1 min-h-[60px] hover:bg-accent/50 cursor-pointer relative"
                          >
                            {dayEvents.map((event) => (
                              <button
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`w-full text-left text-xs px-1.5 py-0.5 rounded border flex items-center gap-1 mb-1 ${
                                  getEventColor(event)
                                }`}
                              >
                                {getEventIcon(event.type)}
                                <span className="truncate">{event.title}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Event Details Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && getEventIcon(selectedEvent.type)}
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Data</p>
              <p className="text-sm text-muted-foreground">
                {selectedEvent?.date.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            {selectedEvent?.petName && (
              <div>
                <p className="text-sm font-medium">Pet</p>
                <p className="text-sm text-muted-foreground">{selectedEvent.petName}</p>
              </div>
            )}
            {selectedEvent?.description && (
              <div>
                <p className="text-sm font-medium">Descrição</p>
                <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
              </div>
            )}
            {selectedEvent?.status && (
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge variant={selectedEvent.status === "overdue" ? "destructive" : "default"}>
                  {selectedEvent.status === "overdue" ? "Atrasado" : selectedEvent.status === "completed" ? "Concluído" : "Pendente"}
                </Badge>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
