import { useState, useMemo } from "react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// Event type configurations with colors and icons (soft premium palette)
const EVENT_TYPES = {
  vaccination: {
    label: "Vacinação",
    color: "bg-blue-200",
    lightColor: "bg-blue-50",
    textColor: "text-gray-900",
    borderColor: "border-blue-100",
    icon: Syringe,
  },
  medication: {
    label: "Medicamento",
    color: "bg-purple-200",
    lightColor: "bg-purple-50",
    textColor: "text-gray-900",
    borderColor: "border-purple-100",
    icon: Pill,
  },
  medical: {
    label: "Consulta Médica",
    color: "bg-rose-200",
    lightColor: "bg-rose-50",
    textColor: "text-gray-900",
    borderColor: "border-rose-100",
    icon: Heart,
  },
  general: {
    label: "Geral",
    color: "bg-slate-200",
    lightColor: "bg-slate-50",
    textColor: "text-gray-900",
    borderColor: "border-slate-100",
    icon: CalendarIcon,
  },
  holiday: {
    label: "Feriado",
    color: "bg-emerald-200",
    lightColor: "bg-emerald-50",
    textColor: "text-gray-900",
    borderColor: "border-emerald-100",
    icon: CalendarIcon,
  },
  closure: {
    label: "Fechamento",
    color: "bg-orange-200",
    lightColor: "bg-orange-50",
    textColor: "text-gray-900",
    borderColor: "border-orange-100",
    icon: AlertCircle,
  },
  checkin: {
    label: "Check-in",
    color: "bg-teal-200",
    lightColor: "bg-teal-50",
    textColor: "text-gray-900",
    borderColor: "border-teal-100",
    icon: LogIn,
  },
  checkout: {
    label: "Check-out",
    color: "bg-amber-200",
    lightColor: "bg-amber-50",
    textColor: "text-gray-900",
    borderColor: "border-amber-100",
    icon: LogOut,
  },
  preventive: {
    label: "Preventivo",
    color: "bg-cyan-200",
    lightColor: "bg-cyan-50",
    textColor: "text-gray-900",
    borderColor: "border-cyan-100",
    icon: Shield,
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
  // Multi-day period fields
  checkInDate?: Date | null;
  checkOutDate?: Date | null;
  dailyCount?: number | null;
};

type ViewMode = "month" | "week" | "day";

type PremiumCalendarProps = {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onDayClick?: (date: Date) => void;
  onCreateEvent?: (event: Partial<CalendarEvent>) => void;
  onEventDrop?: (eventId: number, newDate: Date) => void;
  pets?: Array<{ id: number; name: string }>;
  showCreateButton?: boolean;
  role?: "admin" | "tutor";
};

export function PremiumCalendar({
  events,
  onEventClick,
  onDateClick,
  onDayClick,
  onCreateEvent,
  onEventDrop,
  pets = [],
  showCreateButton = true,
  role = "admin",
}: PremiumCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedEventType, setSelectedEventType] = useState<EventType | "all">("all");
  const [selectedPet, setSelectedPet] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    return filteredEvents.filter((event) => {
      const eventDate = new Date(event.eventDate);
      
      // Check if event is on this specific date
      const isOnDate = (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
      
      // Check if date falls within multi-day period
      const isInPeriod = event.checkInDate && event.checkOutDate && (() => {
        const checkIn = new Date(event.checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(event.checkOutDate);
        checkOut.setHours(0, 0, 0, 0);
        const current = new Date(date);
        current.setHours(0, 0, 0, 0);
        return current >= checkIn && current <= checkOut;
      })();
      
      return isOnDate || isInPeriod;
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

  const monthYear = currentDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const days = getDaysInMonth(currentDate);
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      {/* Header with filters and controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousMonth}
            className="h-10 w-10 rounded-xl hover:bg-primary/10 transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            onClick={goToToday}
            className="min-w-[120px] rounded-xl font-semibold hover:bg-primary/10 transition-all"
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            className="h-10 w-10 rounded-xl hover:bg-primary/10 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-bold capitalize ml-2">{monthYear}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-[200px] rounded-xl"
            />
          </div>

          {/* Event Type Filter */}
          <Select
            value={selectedEventType}
            onValueChange={(value) => setSelectedEventType(value as EventType | "all")}
          >
            <SelectTrigger className="w-[180px] rounded-xl">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(EVENT_TYPES).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", config.color)} />
                    {config.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Pet Filter */}
          {pets.length > 0 && (
            <Select
              value={selectedPet.toString()}
              onValueChange={(value) => setSelectedPet(value === "all" ? "all" : parseInt(value))}
            >
              <SelectTrigger className="w-[180px] rounded-xl">
                <SelectValue placeholder="Filtrar por pet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os pets</SelectItem>
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id.toString()}>
                    {pet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Create Event Button */}
          {showCreateButton && onCreateEvent && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl shadow-lg hover:shadow-xl transition-all">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Evento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Novo Evento</DialogTitle>
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
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Event Type Legend - Discrete chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(EVENT_TYPES).map(([key, config]) => {
          const Icon = config.icon;
          const count = filteredEvents.filter((e) => e.eventType === key).length;
          return (
            <div
              key={key}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all text-xs",
                config.lightColor,
                config.borderColor,
                "hover:shadow-sm"
              )}
            >
              <Icon className="h-3 w-3 text-gray-600" />
              <span className="font-medium text-gray-900">
                {config.label}
              </span>
              <span className="text-gray-600 ml-0.5">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <Card className="p-6 shadow-xl border-2">
        <div className="grid grid-cols-7 gap-2">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center font-bold text-sm text-muted-foreground py-3"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((date, index) => {
            const dayEvents = getEventsForDate(date);
            const isToday =
              date &&
              date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear();
            const isPast = date && date < today;

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[120px] p-2 rounded-xl border-2 transition-all cursor-pointer",
                  date ? "bg-card hover:bg-accent/5 hover:border-primary/30 hover:shadow-md" : "bg-muted/20",
                  isToday && "ring-2 ring-primary ring-offset-2 bg-primary/5",
                  isPast && "opacity-60"
                )}
                onClick={() => {
                  if (date) {
                    onDateClick?.(date);
                    onDayClick?.(date);
                  }
                }}
                onDragOver={(e) => {
                  if (date) {
                    e.preventDefault();
                    e.currentTarget.classList.add("ring-2", "ring-primary", "bg-primary/10");
                  }
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove("ring-2", "ring-primary", "bg-primary/10");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("ring-2", "ring-primary", "bg-primary/10");
                  if (date) {
                    const eventId = e.dataTransfer.getData("eventId");
                    if (eventId && onEventDrop) {
                      onEventDrop(parseInt(eventId), date);
                    }
                  }
                }}
              >
                {date && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isToday && "text-primary"
                        )}
                      >
                        {date.getDate()}
                      </span>
                      <div className="flex items-center gap-1">
                        {dayEvents.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="h-5 w-5 p-0 flex items-center justify-center text-xs"
                          >
                            {dayEvents.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => {
                        const config = EVENT_TYPES[event.eventType];
                        const Icon = config.icon;
                        
                        // Check if this is a multi-day period event
                        const isPeriodEvent = event.checkInDate && event.checkOutDate;
                        const isFirstDay = isPeriodEvent && (() => {
                          const checkIn = new Date(event.checkInDate!);
                          return checkIn.getDate() === date.getDate() &&
                                 checkIn.getMonth() === date.getMonth() &&
                                 checkIn.getFullYear() === date.getFullYear();
                        })();
                        const isLastDay = isPeriodEvent && (() => {
                          const checkOut = new Date(event.checkOutDate!);
                          return checkOut.getDate() === date.getDate() &&
                                 checkOut.getMonth() === date.getMonth() &&
                                 checkOut.getFullYear() === date.getFullYear();
                        })();
                        
                        return (
                          <div
                            key={event.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("eventId", event.id.toString());
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick?.(event);
                            }}
                            className={cn(
                              "px-2 py-1 rounded-lg text-xs font-medium cursor-move transition-all hover:scale-105 hover:shadow-md border",
                              config.lightColor,
                              config.textColor,
                              config.borderColor,
                              isPeriodEvent && "border-2 border-dashed"
                            )}
                          >
                            <div className="flex items-center gap-1">
                              <Icon className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {isFirstDay && "👉 "}
                                {event.title}
                                {isLastDay && " 🏁"}
                                {isPeriodEvent && !isFirstDay && !isLastDay && " 🟦"}
                              </span>
                            </div>
                            {isPeriodEvent && event.dailyCount && (
                              <div className="text-[10px] opacity-70 mt-0.5">
                                {event.dailyCount} {event.dailyCount === 1 ? 'diária' : 'diárias'}
                              </div>
                            )}
                            {!event.isAllDay && (
                              <div className="flex items-center gap-1 mt-0.5 opacity-70">
                                <Clock className="h-2.5 w-2.5" />
                                <span className="text-[10px]">
                                  {new Date(event.eventDate).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center py-1">
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
      </Card>
    </div>
  );
}

// Create Event Form Component
function CreateEventForm({
  onSubmit,
  pets,
}: {
  onSubmit: (event: Partial<CalendarEvent>) => void;
  pets: Array<{ id: number; name: string }>;
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: new Date().toISOString().slice(0, 16),
    eventType: "general" as EventType,
    petId: null as number | null,
    location: "",
    isAllDay: true,
    // Multi-day period fields
    checkInDate: "",
    checkOutDate: "",
  });
  
  // Calculate daily count when check-in/check-out dates change
  const dailyCount = useMemo(() => {
    if (!formData.checkInDate || !formData.checkOutDate) return null;
    const checkIn = new Date(formData.checkInDate);
    const checkOut = new Date(formData.checkOutDate);
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  }, [formData.checkInDate, formData.checkOutDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate period dates if provided
    if (formData.checkInDate && formData.checkOutDate) {
      const checkIn = new Date(formData.checkInDate);
      const checkOut = new Date(formData.checkOutDate);
      if (checkOut < checkIn) {
        alert("Data de check-out deve ser posterior à data de check-in");
        return;
      }
    }
    
    onSubmit({
      ...formData,
      eventDate: new Date(formData.eventDate),
      checkInDate: formData.checkInDate ? new Date(formData.checkInDate) : undefined,
      checkOutDate: formData.checkOutDate ? new Date(formData.checkOutDate) : undefined,
    } as any);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          className="rounded-xl"
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="rounded-xl"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="eventType">Tipo de Evento *</Label>
          <Select
            value={formData.eventType}
            onValueChange={(value) =>
              setFormData({ ...formData, eventType: value as EventType })
            }
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EVENT_TYPES).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {pets.length > 0 && (
          <div>
            <Label htmlFor="petId">Pet (opcional)</Label>
            <Select
              value={formData.petId?.toString() || "none"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  petId: value === "none" ? null : parseInt(value),
                })
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione um pet" />
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
        )}
      </div>

      <div>
        <Label htmlFor="eventDate">Data e Hora *</Label>
        <Input
          id="eventDate"
          type="datetime-local"
          value={formData.eventDate}
          onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
          required
          className="rounded-xl"
        />
      </div>

      <div>
        <Label htmlFor="location">Local</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="rounded-xl"
          placeholder="Ex: Clínica Veterinária"
        />
      </div>

      {/* Multi-day period section (for checkin events) */}
      {(formData.eventType === "checkin" || formData.eventType === "checkout") && (
        <div className="border-t pt-4 space-y-4">
          <div>
            <Label className="text-base font-semibold">Período de Diárias</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Configure o período de hospedagem (check-in a check-out)
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="checkInDate">Data de Check-in</Label>
              <Input
                id="checkInDate"
                type="date"
                value={formData.checkInDate}
                onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                className="rounded-xl"
              />
            </div>
            
            <div>
              <Label htmlFor="checkOutDate">Data de Check-out</Label>
              <Input
                id="checkOutDate"
                type="date"
                value={formData.checkOutDate}
                onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                className="rounded-xl"
                min={formData.checkInDate}
              />
            </div>
          </div>
          
          {dailyCount !== null && dailyCount > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                📅 Total: <span className="font-bold">{dailyCount} {dailyCount === 1 ? 'diária' : 'diárias'}</span>
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {new Date(formData.checkInDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a {new Date(formData.checkOutDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isAllDay"
          checked={formData.isAllDay}
          onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="isAllDay" className="cursor-pointer">
          Evento de dia inteiro
        </Label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" className="rounded-xl">
          Criar Evento
        </Button>
      </div>
    </form>
  );
}
