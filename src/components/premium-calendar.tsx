"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Search,
  Calendar as CalendarIcon,
  Syringe,
  Pill,
  Heart,
  AlertCircle,
  Clock,
  MapPin,
  LogIn,
  LogOut,
  Shield,
  LayoutGrid,
  List,
  CalendarDays,
  Sun,
  Moon,
  Dog,
  Sparkles,
  Bell,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";

// Event type configurations with colors and icons
const EVENT_TYPES = {
  vaccination: {
    label: "Vacinação",
    color: "bg-blue-500",
    lightColor: "bg-blue-50 dark:bg-blue-950",
    textColor: "text-white",
    borderColor: "border-blue-400",
    dotColor: "bg-blue-500",
    icon: Syringe,
  },
  medication: {
    label: "Medicamento",
    color: "bg-purple-500",
    lightColor: "bg-purple-50 dark:bg-purple-950",
    textColor: "text-white",
    borderColor: "border-purple-400",
    dotColor: "bg-purple-500",
    icon: Pill,
  },
  medical: {
    label: "Consulta",
    color: "bg-rose-500",
    lightColor: "bg-rose-50 dark:bg-rose-950",
    textColor: "text-white",
    borderColor: "border-rose-400",
    dotColor: "bg-rose-500",
    icon: Heart,
  },
  general: {
    label: "Geral",
    color: "bg-slate-500",
    lightColor: "bg-slate-50 dark:bg-slate-900",
    textColor: "text-white",
    borderColor: "border-slate-400",
    dotColor: "bg-slate-500",
    icon: CalendarIcon,
  },
  holiday: {
    label: "Feriado",
    color: "bg-emerald-500",
    lightColor: "bg-emerald-50 dark:bg-emerald-950",
    textColor: "text-white",
    borderColor: "border-emerald-400",
    dotColor: "bg-emerald-500",
    icon: Sun,
  },
  closure: {
    label: "Fechamento",
    color: "bg-orange-500",
    lightColor: "bg-orange-50 dark:bg-orange-950",
    textColor: "text-white",
    borderColor: "border-orange-400",
    dotColor: "bg-orange-500",
    icon: AlertCircle,
  },
  checkin: {
    label: "Check-in",
    color: "bg-teal-500",
    lightColor: "bg-teal-50 dark:bg-teal-950",
    textColor: "text-white",
    borderColor: "border-teal-400",
    dotColor: "bg-teal-500",
    icon: LogIn,
  },
  checkout: {
    label: "Check-out",
    color: "bg-amber-500",
    lightColor: "bg-amber-50 dark:bg-amber-950",
    textColor: "text-white",
    borderColor: "border-amber-400",
    dotColor: "bg-amber-500",
    icon: LogOut,
  },
  preventive: {
    label: "Preventivo",
    color: "bg-cyan-500",
    lightColor: "bg-cyan-50 dark:bg-cyan-950",
    textColor: "text-white",
    borderColor: "border-cyan-400",
    dotColor: "bg-cyan-500",
    icon: Shield,
  },
  training: {
    label: "Treinamento",
    color: "bg-indigo-500",
    lightColor: "bg-indigo-50 dark:bg-indigo-950",
    textColor: "text-white",
    borderColor: "border-indigo-400",
    dotColor: "bg-indigo-500",
    icon: Sparkles,
  },
  grooming: {
    label: "Banho/Tosa",
    color: "bg-pink-500",
    lightColor: "bg-pink-50 dark:bg-pink-950",
    textColor: "text-white",
    borderColor: "border-pink-400",
    dotColor: "bg-pink-500",
    icon: Sparkles,
  },
} as const;

type EventType = keyof typeof EVENT_TYPES;

export type CalendarEvent = {
  id: number;
  title: string;
  description?: string | null;
  eventDate: Date;
  endDate?: Date | null;
  eventType: EventType;
  petId?: number | null;
  petName?: string;
  location?: string | null;
  isAllDay: boolean;
  checkInDate?: Date | null;
  checkOutDate?: Date | null;
};

type ViewMode = "month" | "week" | "day" | "list";

type PremiumCalendarProps = {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onCreateEvent?: (event: Partial<CalendarEvent>) => void;
  pets?: Array<{ id: number; name: string }>;
  showCreateButton?: boolean;
};

export function PremiumCalendar({
  events,
  onEventClick,
  onDateClick,
  onCreateEvent,
  pets = [],
  showCreateButton = true,
}: PremiumCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedEventType, setSelectedEventType] = useState<EventType | "all">("all");
  const [selectedPet, setSelectedPet] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (selectedEventType !== "all" && event.eventType !== selectedEventType) {
        return false;
      }
      if (selectedPet !== "all" && event.petId !== selectedPet) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.petName?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [events, selectedEventType, selectedPet, searchQuery]);

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Previous month days
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push(prevDate);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    // Next month days to complete the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  // Get week days
  const getWeekDays = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    return filteredEvents.filter((event) => {
      const eventDate = new Date(event.eventDate);
      return isSameDay(eventDate, date);
    });
  };

  // Navigation
  const goToPrevious = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, -7));
    } else if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const goToNext = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, 7));
    } else if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsDayDetailOpen(true);
    onDateClick?.(date);
  };

  // Get title based on view
  const getViewTitle = () => {
    if (viewMode === "month") {
      return format(currentDate, "MMMM yyyy", { locale: ptBR });
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(weekStart, "d MMM", { locale: ptBR })} - ${format(weekEnd, "d MMM yyyy", { locale: ptBR })}`;
    } else if (viewMode === "day") {
      return format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR });
    }
    return "Lista de Eventos";
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const monthDays = getDaysInMonth(currentDate);
  const weekDaysArray = getWeekDays(currentDate);

  // Upcoming events for sidebar
  const upcomingEvents = filteredEvents
    .filter((e) => isFuture(new Date(e.eventDate)) || isToday(new Date(e.eventDate)))
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="h-9 w-9 rounded-full hover:bg-primary/20 transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                onClick={goToToday}
                className="rounded-full px-4 font-medium hover:bg-primary/10 transition-all"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="h-9 w-9 rounded-full hover:bg-primary/20 transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-bold capitalize ml-2">{getViewTitle()}</h2>
            </div>

            {/* View Mode & Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted rounded-full p-1">
                <Button
                  variant={viewMode === "month" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("month")}
                  className="rounded-full h-8 px-3"
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Mês</span>
                </Button>
                <Button
                  variant={viewMode === "week" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("week")}
                  className="rounded-full h-8 px-3"
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Semana</span>
                </Button>
                <Button
                  variant={viewMode === "day" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("day")}
                  className="rounded-full h-8 px-3"
                >
                  <Sun className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Dia</span>
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-full h-8 px-3"
                >
                  <List className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Lista</span>
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-40 rounded-full h-9 bg-background"
                />
              </div>

              {/* Filters */}
              <Select
                value={selectedEventType}
                onValueChange={(value) => setSelectedEventType(value as EventType | "all")}
              >
                <SelectTrigger className="w-40 rounded-full h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(EVENT_TYPES).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {pets.length > 0 && (
                <Select
                  value={selectedPet.toString()}
                  onValueChange={(value) => setSelectedPet(value === "all" ? "all" : parseInt(value))}
                >
                  <SelectTrigger className="w-40 rounded-full h-9">
                    <Dog className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Pet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {pets.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Create Button */}
              {showCreateButton && onCreateEvent && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-full shadow-lg hover:shadow-xl transition-all gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Novo</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                        Criar Novo Evento
                      </DialogTitle>
                      <DialogDescription>
                        Adicione um novo evento ao calendário
                      </DialogDescription>
                    </DialogHeader>
                    <CreateEventForm
                      onSubmit={(event) => {
                        onCreateEvent(event);
                        setIsCreateDialogOpen(false);
                      }}
                      pets={pets}
                      initialDate={selectedDate}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Calendar Grid */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card className="shadow-lg overflow-hidden">
            {viewMode === "month" && (
              <MonthView
                days={monthDays}
                weekDays={weekDays}
                currentMonth={currentDate.getMonth()}
                getEventsForDate={getEventsForDate}
                onDateClick={handleDateClick}
                onEventClick={onEventClick}
              />
            )}
            {viewMode === "week" && (
              <WeekView
                days={weekDaysArray}
                getEventsForDate={getEventsForDate}
                onDateClick={handleDateClick}
                onEventClick={onEventClick}
              />
            )}
            {viewMode === "day" && (
              <DayView
                date={currentDate}
                events={getEventsForDate(currentDate)}
                onEventClick={onEventClick}
              />
            )}
            {viewMode === "list" && (
              <ListView
                events={filteredEvents}
                onEventClick={onEventClick}
              />
            )}
          </Card>
        </div>

        {/* Sidebar - Upcoming Events */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Resumo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Hoje</span>
                <Badge variant="secondary">{getEventsForDate(new Date()).length}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Esta semana</span>
                <Badge variant="secondary">
                  {filteredEvents.filter((e) => {
                    const eventDate = new Date(e.eventDate);
                    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
                    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
                    return eventDate >= weekStart && eventDate <= weekEnd;
                  }).length}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Este mês</span>
                <Badge variant="secondary">
                  {filteredEvents.filter((e) => {
                    const eventDate = new Date(e.eventDate);
                    return (
                      eventDate.getMonth() === new Date().getMonth() &&
                      eventDate.getFullYear() === new Date().getFullYear()
                    );
                  }).length}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum evento próximo
                </p>
              ) : (
                upcomingEvents.map((event) => {
                  const config = EVENT_TYPES[event.eventType] || EVENT_TYPES.general;
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => onEventClick?.(event)}
                    >
                      {(() => { const Icon = config.icon; return <Icon className="h-5 w-5" />; })()}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.eventDate), "d MMM, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Event Type Legend */}
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Legenda</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-1">
              {Object.entries(EVENT_TYPES).map(([key, config]) => (
                <div
                  key={key}
                  className="flex items-center gap-1.5 text-xs p-1 rounded hover:bg-accent cursor-pointer"
                  onClick={() => setSelectedEventType(key as EventType)}
                >
                  {(() => { const Icon = config.icon; return <Icon className="h-4 w-4" />; })()}
                  <span className="truncate">{config.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Day Detail Dialog */}
      <Dialog open={isDayDetailOpen} onOpenChange={setIsDayDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedDate && getEventsForDate(selectedDate).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum evento neste dia</p>
                {showCreateButton && (
                  <Button
                    variant="link"
                    onClick={() => {
                      setIsDayDetailOpen(false);
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    Criar evento
                  </Button>
                )}
              </div>
            ) : (
              selectedDate &&
              getEventsForDate(selectedDate).map((event) => {
                const config = EVENT_TYPES[event.eventType] || EVENT_TYPES.general;
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all hover:shadow-md",
                      config.lightColor
                    )}
                    onClick={() => {
                      setIsDayDetailOpen(false);
                      onEventClick?.(event);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {(() => { const Icon = config.icon; return <Icon className="h-5 w-5" />; })()}
                      <span className="font-medium">{event.title}</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {config.label}
                      </Badge>
                    </div>
                    {!event.isAllDay && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.eventDate), "HH:mm")}
                      </p>
                    )}
                    {event.petName && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Dog className="h-3 w-3" />
                        {event.petName}
                      </p>
                    )}
                    {event.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Month View Component
function MonthView({
  days,
  weekDays,
  currentMonth,
  getEventsForDate,
  onDateClick,
  onEventClick,
}: {
  days: (Date | null)[];
  weekDays: string[];
  currentMonth: number;
  getEventsForDate: (date: Date | null) => CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}) {
  return (
    <div className="p-4">
      {/* Week day headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day, i) => (
          <div
            key={day}
            className={cn(
              "text-center font-semibold text-sm py-2",
              i === 0 || i === 6 ? "text-muted-foreground" : ""
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) return <div key={index} />;
          
          const dayEvents = getEventsForDate(date);
          const isCurrentMonth = date.getMonth() === currentMonth;
          const isCurrentDay = isToday(date);
          const isPastDay = isPast(date) && !isToday(date);

          return (
            <div
              key={index}
              className={cn(
                "min-h-[100px] p-1.5 rounded-lg border transition-all cursor-pointer",
                isCurrentMonth 
                  ? "bg-card hover:bg-accent/50 hover:border-primary/50" 
                  : "bg-muted/30 text-muted-foreground",
                isCurrentDay && "ring-2 ring-primary ring-offset-1 bg-primary/5",
                isPastDay && isCurrentMonth && "opacity-70"
              )}
              onClick={() => onDateClick(date)}
            >
              <div
                className={cn(
                  "text-sm font-semibold mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                  isCurrentDay && "bg-primary text-primary-foreground"
                )}
              >
                {date.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((event) => {
                  const config = EVENT_TYPES[event.eventType] || EVENT_TYPES.general;
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate",
                        config.color,
                        config.textColor
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                    >
                      {(() => { const Icon = config.icon; return <Icon className="h-4 w-4" />; })()}
                      <span className="truncate">{event.title}</span>
                    </div>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-muted-foreground px-1">
                    +{dayEvents.length - 2} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({
  days,
  getEventsForDate,
  onDateClick,
  onEventClick,
}: {
  days: Date[];
  getEventsForDate: (date: Date) => CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}) {
  return (
    <div className="p-4">
      <div className="grid grid-cols-7 gap-2">
        {days.map((date) => {
          const dayEvents = getEventsForDate(date);
          const isCurrentDay = isToday(date);

          return (
            <div
              key={date.toISOString()}
              className={cn(
                "min-h-[300px] p-2 rounded-lg border transition-all cursor-pointer",
                "bg-card hover:bg-accent/50 hover:border-primary/50",
                isCurrentDay && "ring-2 ring-primary ring-offset-1 bg-primary/5"
              )}
              onClick={() => onDateClick(date)}
            >
              <div className="text-center mb-2">
                <div className="text-xs text-muted-foreground uppercase">
                  {format(date, "EEE", { locale: ptBR })}
                </div>
                <div
                  className={cn(
                    "text-lg font-bold w-10 h-10 flex items-center justify-center rounded-full mx-auto",
                    isCurrentDay && "bg-primary text-primary-foreground"
                  )}
                >
                  {date.getDate()}
                </div>
              </div>
              <div className="space-y-1">
                {dayEvents.map((event) => {
                  const config = EVENT_TYPES[event.eventType] || EVENT_TYPES.general;
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "p-2 rounded text-xs",
                        config.color,
                        config.textColor
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {(() => { const Icon = config.icon; return <Icon className="h-4 w-4" />; })()}
                        <span className="truncate font-medium">{event.title}</span>
                      </div>
                      {!event.isAllDay && (
                        <div className="opacity-80 mt-0.5">
                          {format(new Date(event.eventDate), "HH:mm")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Day View Component
function DayView({
  date,
  events,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <div className="text-lg font-bold">
          {format(date, "EEEE", { locale: ptBR })}
        </div>
        <div className="text-3xl font-bold text-primary">
          {format(date, "d")}
        </div>
        <div className="text-muted-foreground">
          {format(date, "MMMM yyyy", { locale: ptBR })}
        </div>
      </div>

      <div className="space-y-1 max-h-[500px] overflow-y-auto">
        {hours.map((hour) => {
          const hourEvents = events.filter((e) => {
            if (e.isAllDay) return hour === 0;
            const eventHour = new Date(e.eventDate).getHours();
            return eventHour === hour;
          });

          return (
            <div key={hour} className="flex gap-2">
              <div className="w-16 text-right text-sm text-muted-foreground py-2">
                {hour.toString().padStart(2, "0")}:00
              </div>
              <div className="flex-1 min-h-[40px] border-t py-1 space-y-1">
                {hourEvents.map((event) => {
                  const config = EVENT_TYPES[event.eventType] || EVENT_TYPES.general;
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "p-2 rounded text-sm cursor-pointer",
                        config.color,
                        config.textColor
                      )}
                      onClick={() => onEventClick?.(event)}
                    >
                      <div className="flex items-center gap-2">
                        {(() => { const Icon = config.icon; return <Icon className="h-4 w-4" />; })()}
                        <span className="font-medium">{event.title}</span>
                        {event.petName && (
                          <Badge variant="outline" className="ml-auto text-xs bg-white/20">
                            {event.petName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// List View Component
function ListView({
  events,
  onEventClick,
}: {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );

  // Group by date
  const groupedEvents: Record<string, CalendarEvent[]> = {};
  sortedEvents.forEach((event) => {
    const dateKey = format(new Date(event.eventDate), "yyyy-MM-dd");
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = [];
    }
    groupedEvents[dateKey].push(event);
  });

  return (
    <div className="p-4 max-h-[600px] overflow-y-auto">
      {Object.entries(groupedEvents).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p>Nenhum evento encontrado</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => {
            const date = new Date(dateKey);
            const isCurrentDay = isToday(date);

            return (
              <div key={dateKey}>
                <div className={cn(
                  "flex items-center gap-2 mb-2 pb-2 border-b",
                  isCurrentDay && "text-primary"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                    isCurrentDay ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {format(date, "d")}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {format(date, "EEEE", { locale: ptBR })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(date, "d 'de' MMMM", { locale: ptBR })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pl-12">
                  {dateEvents.map((event) => {
                    const config = EVENT_TYPES[event.eventType] || EVENT_TYPES.general;
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "p-3 rounded-lg cursor-pointer transition-all hover:shadow-md flex items-center gap-3",
                          config.lightColor
                        )}
                        onClick={() => onEventClick?.(event)}
                      >
                        {(() => { const Icon = config.icon; return <Icon className="h-6 w-6" />; })()}
                        <div className="flex-1">
                          <div className="font-medium">{event.title}</div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {!event.isAllDay && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(event.eventDate), "HH:mm")}
                              </span>
                            )}
                            {event.petName && (
                              <span className="flex items-center gap-1">
                                <Dog className="h-3 w-3" />
                                {event.petName}
                              </span>
                            )}
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">{config.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Create Event Form Component
function CreateEventForm({
  onSubmit,
  pets,
  initialDate,
}: {
  onSubmit: (event: Partial<CalendarEvent>) => void;
  pets: Array<{ id: number; name: string }>;
  initialDate?: Date | null;
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: initialDate ? format(initialDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    eventTime: "09:00",
    endDate: "",
    endTime: "",
    eventType: "general" as EventType,
    petId: "",
    location: "",
    isAllDay: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const eventDate = new Date(formData.eventDate);
    if (formData.eventTime && !formData.isAllDay) {
      const [hours, minutes] = formData.eventTime.split(":");
      eventDate.setHours(parseInt(hours), parseInt(minutes));
    }

    let endDate: Date | undefined;
    if (formData.endDate) {
      endDate = new Date(formData.endDate);
      if (formData.endTime && !formData.isAllDay) {
        const [hours, minutes] = formData.endTime.split(":");
        endDate.setHours(parseInt(hours), parseInt(minutes));
      }
    }

    onSubmit({
      title: formData.title,
      description: formData.description || undefined,
      eventDate,
      endDate,
      eventType: formData.eventType,
      petId: formData.petId ? parseInt(formData.petId) : undefined,
      location: formData.location || undefined,
      isAllDay: formData.isAllDay,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Nome do evento"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="eventType">Tipo *</Label>
          <Select
            value={formData.eventType}
            onValueChange={(value) =>
              setFormData({ ...formData, eventType: value as EventType })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EVENT_TYPES).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {(() => { const Icon = config.icon; return <Icon className="h-4 w-4 mr-2" />; })()}
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="petId">Pet</Label>
          <Select
            value={formData.petId}
            onValueChange={(value) => setFormData({ ...formData, petId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum</SelectItem>
              {pets.map((pet) => (
                <SelectItem key={pet.id} value={pet.id.toString()}>
                  {pet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="eventDate">Data *</Label>
          <Input
            id="eventDate"
            type="date"
            value={formData.eventDate}
            onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="eventTime">Hora</Label>
          <Input
            id="eventTime"
            type="time"
            value={formData.eventTime}
            onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
            disabled={formData.isAllDay}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="isAllDay"
          checked={formData.isAllDay}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, isAllDay: checked as boolean })
          }
        />
        <Label htmlFor="isAllDay">Dia inteiro</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Local</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Ex: Clínica Veterinária"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detalhes do evento..."
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button type="submit">Criar Evento</Button>
      </DialogFooter>
    </form>
  );
}
