import { useState, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { trpc } from "../lib/trpc";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from "lucide-react";
import { toast } from "sonner";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales: { "pt-BR": ptBR },
});

interface CalendarViewProps {
  onEventClick?: (event: any) => void;
  onNewEvent?: (date: Date) => void;
}

const EVENT_COLORS: Record<string, string> = {
  holiday: "bg-red-100 border-red-500 text-red-900",
  closure: "bg-gray-100 border-gray-500 text-gray-900",
  medical: "bg-blue-100 border-blue-500 text-blue-900",
  general: "bg-green-100 border-green-500 text-green-900",
  vaccination: "bg-purple-100 border-purple-500 text-purple-900",
  medication: "bg-orange-100 border-orange-500 text-orange-900",
};

const EVENT_LABELS: Record<string, string> = {
  holiday: "Feriado",
  closure: "Fechamento",
  medical: "Médico",
  general: "Geral",
  vaccination: "Vacinação",
  medication: "Medicação",
};

export function CalendarView({ onEventClick, onNewEvent }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [filterType, setFilterType] = useState<string>("all");

  // Calculate date range for API query
  const dateRange = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return { startDate: start, endDate: end };
  }, [currentDate]);

  const { data: events = [], isLoading } = trpc.calendar.getEvents.useQuery(dateRange);

  // Transform events for react-big-calendar
  const calendarEvents = useMemo(() => {
    const filtered = filterType === "all" 
      ? events 
      : events.filter((e: any) => e.eventType === filterType);

    return filtered.map((event: any) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.eventDate),
      end: event.endDate ? new Date(event.endDate) : new Date(event.eventDate),
      allDay: event.isAllDay,
      resource: event,
    }));
  }, [events, filterType]);

  const handleNavigate = useCallback((action: "PREV" | "NEXT" | "TODAY") => {
    if (action === "PREV") {
      setCurrentDate(prev => subMonths(prev, 1));
    } else if (action === "NEXT") {
      setCurrentDate(prev => addMonths(prev, 1));
    } else {
      setCurrentDate(new Date());
    }
  }, []);

  const handleSelectSlot = useCallback((slotInfo: any) => {
    onNewEvent?.(slotInfo.start);
  }, [onNewEvent]);

  const handleSelectEvent = useCallback((event: any) => {
    onEventClick?.(event.resource);
  }, [onEventClick]);

  // Custom event style
  const eventStyleGetter = useCallback((event: any) => {
    const eventType = event.resource.eventType;
    const colorClass = EVENT_COLORS[eventType] || EVENT_COLORS.general;
    
    return {
      className: `${colorClass} border-l-4 rounded px-2 py-1`,
    };
  }, []);

  // Count events by type
  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((event: any) => {
      counts[event.eventType] = (counts[event.eventType] || 0) + 1;
    });
    return counts;
  }, [events]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendário
              </CardTitle>
              <CardDescription>
                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleNavigate("TODAY")}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleNavigate("PREV")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleNavigate("NEXT")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {onNewEvent && (
                <Button onClick={() => onNewEvent(new Date())}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Evento
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Visualização:</span>
              <Select value={view} onValueChange={(v) => setView(v as View)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mensal</SelectItem>
                  <SelectItem value="week">Semanal</SelectItem>
                  <SelectItem value="day">Diária</SelectItem>
                  <SelectItem value="agenda">Agenda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Tipo:</span>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="holiday">Feriados</SelectItem>
                  <SelectItem value="closure">Fechamentos</SelectItem>
                  <SelectItem value="medical">Médicos</SelectItem>
                  <SelectItem value="general">Gerais</SelectItem>
                  <SelectItem value="vaccination">Vacinações</SelectItem>
                  <SelectItem value="medication">Medicações</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {Object.entries(EVENT_LABELS).map(([type, label]) => (
              <Badge
                key={type}
                variant="outline"
                className={`${EVENT_COLORS[type]} cursor-pointer`}
                onClick={() => setFilterType(type)}
              >
                {label} {eventCounts[type] ? `(${eventCounts[type]})` : ""}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          <div className="calendar-container" style={{ height: "600px" }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={currentDate}
              onNavigate={(date: Date) => setCurrentDate(date)}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              selectable
              culture="pt-BR"
              messages={{
                next: "Próximo",
                previous: "Anterior",
                today: "Hoje",
                month: "Mês",
                week: "Semana",
                day: "Dia",
                agenda: "Agenda",
                date: "Data",
                time: "Hora",
                event: "Evento",
                noEventsInRange: "Nenhum evento neste período",
                showMore: (total: number) => `+ ${total} mais`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      <style>{`
        .calendar-container .rbc-calendar {
          font-family: inherit;
        }
        .calendar-container .rbc-header {
          padding: 12px 4px;
          font-weight: 600;
          border-bottom: 2px solid hsl(var(--border));
        }
        .calendar-container .rbc-today {
          background-color: hsl(var(--accent));
        }
        .calendar-container .rbc-event {
          padding: 2px 4px;
          border-radius: 4px;
          border: none;
        }
        .calendar-container .rbc-event-label {
          font-size: 0.75rem;
        }
        .calendar-container .rbc-event-content {
          font-size: 0.875rem;
        }
        .calendar-container .rbc-toolbar button {
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border));
          padding: 6px 12px;
          border-radius: 6px;
        }
        .calendar-container .rbc-toolbar button:hover {
          background-color: hsl(var(--accent));
        }
        .calendar-container .rbc-toolbar button.rbc-active {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
      `}</style>
    </div>
  );
}
