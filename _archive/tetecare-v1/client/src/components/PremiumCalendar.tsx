import { useState, useMemo, useCallback } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
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
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  Sparkles,
  Dog,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Event type configurations with premium gradient colors
const EVENT_TYPES = {
  vaccination: {
    label: "Vacinação",
    gradient: "from-blue-500 to-indigo-600",
    lightBg: "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40",
    textColor: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-200 dark:border-blue-700",
    badgeBg: "bg-blue-100 dark:bg-blue-900/50",
    icon: Syringe,
    emoji: "💉",
  },
  medication: {
    label: "Medicamento",
    gradient: "from-violet-500 to-purple-600",
    lightBg: "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40",
    textColor: "text-violet-700 dark:text-violet-300",
    borderColor: "border-violet-200 dark:border-violet-700",
    badgeBg: "bg-violet-100 dark:bg-violet-900/50",
    icon: Pill,
    emoji: "💊",
  },
  medical: {
    label: "Consulta",
    gradient: "from-rose-500 to-pink-600",
    lightBg: "bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40",
    textColor: "text-rose-700 dark:text-rose-300",
    borderColor: "border-rose-200 dark:border-rose-700",
    badgeBg: "bg-rose-100 dark:bg-rose-900/50",
    icon: Heart,
    emoji: "🏥",
  },
  general: {
    label: "Geral",
    gradient: "from-slate-500 to-gray-600",
    lightBg: "bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/40 dark:to-gray-950/40",
    textColor: "text-slate-700 dark:text-slate-300",
    borderColor: "border-slate-200 dark:border-slate-700",
    badgeBg: "bg-slate-100 dark:bg-slate-900/50",
    icon: CalendarIcon,
    emoji: "📅",
  },
  holiday: {
    label: "Feriado",
    gradient: "from-emerald-500 to-green-600",
    lightBg: "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40",
    textColor: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-200 dark:border-emerald-700",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/50",
    icon: Sparkles,
    emoji: "🎉",
  },
  closure: {
    label: "Fechamento",
    gradient: "from-orange-500 to-amber-600",
    lightBg: "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40",
    textColor: "text-orange-700 dark:text-orange-300",
    borderColor: "border-orange-200 dark:border-orange-700",
    badgeBg: "bg-orange-100 dark:bg-orange-900/50",
    icon: AlertCircle,
    emoji: "🔒",
  },
  checkin: {
    label: "Check-in",
    gradient: "from-teal-500 to-cyan-600",
    lightBg: "bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/40",
    textColor: "text-teal-700 dark:text-teal-300",
    borderColor: "border-teal-200 dark:border-teal-700",
    badgeBg: "bg-teal-100 dark:bg-teal-900/50",
    icon: LogIn,
    emoji: "🐕",
  },
  checkout: {
    label: "Check-out",
    gradient: "from-amber-500 to-yellow-600",
    lightBg: "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40",
    textColor: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-200 dark:border-amber-700",
    badgeBg: "bg-amber-100 dark:bg-amber-900/50",
    icon: LogOut,
    emoji: "👋",
  },
  preventive: {
    label: "Preventivo",
    gradient: "from-sky-500 to-blue-600",
    lightBg: "bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/40",
    textColor: "text-sky-700 dark:text-sky-300",
    borderColor: "border-sky-200 dark:border-sky-700",
    badgeBg: "bg-sky-100 dark:bg-sky-900/50",
    icon: Shield,
    emoji: "🛡️",
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
  const [draggedEventId, setDraggedEventId] = useState<number | null>(null);

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
  const getDaysInMonth = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, []);

  // Get week days
  const getWeekDays = useCallback((date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, []);

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date | null) => {
    if (!date) return [];
    return filteredEvents.filter((event) => {
      const eventDate = new Date(event.eventDate);
      
      const isOnDate = (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
      
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
  }, [filteredEvents]);

  // Navigation
  const goToPrevious = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === "week") {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
    }
  };

  const goToNext = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === "week") {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getHeaderText = () => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    } else if (viewMode === "week") {
      const weekDays = getWeekDays(currentDate);
      const start = weekDays[0].getDate();
      const end = weekDays[6].getDate();
      return `${start} - ${end} de ${currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;
    } else {
      return currentDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
  };

  const days = viewMode === "month" ? getDaysInMonth(currentDate) : getWeekDays(currentDate);
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, eventId: number) => {
    setDraggedEventId(eventId);
    e.dataTransfer.setData("eventId", eventId.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, date: Date | null) => {
    if (date && draggedEventId) {
      e.preventDefault();
      e.currentTarget.classList.add("ring-2", "ring-primary", "bg-primary/10", "scale-[1.02]");
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("ring-2", "ring-primary", "bg-primary/10", "scale-[1.02]");
  };

  const handleDrop = (e: React.DragEvent, date: Date | null) => {
    e.preventDefault();
    e.currentTarget.classList.remove("ring-2", "ring-primary", "bg-primary/10", "scale-[1.02]");
    if (date && draggedEventId && onEventDrop) {
      onEventDrop(draggedEventId, date);
    }
    setDraggedEventId(null);
  };

  // Event stats
  const eventStats = useMemo(() => {
    const stats: Record<string, number> = {};
    Object.keys(EVENT_TYPES).forEach(key => {
      stats[key] = filteredEvents.filter(e => e.eventType === key).length;
    });
    return stats;
  }, [filteredEvents]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Premium Header with glass effect */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 p-6 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Navigation and Title */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/50 dark:bg-black/30 rounded-xl p-1 backdrop-blur-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevious}
                  className="h-10 w-10 rounded-lg hover:bg-white/80 dark:hover:bg-white/10 transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={goToToday}
                  className="min-w-[100px] rounded-lg font-semibold hover:bg-white/80 dark:hover:bg-white/10 transition-all"
                >
                  Hoje
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNext}
                  className="h-10 w-10 rounded-lg hover:bg-white/80 dark:hover:bg-white/10 transition-all"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold capitalize bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                {getHeaderText()}
              </h2>
            </div>

            {/* View Mode Toggle */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 bg-white/50 dark:bg-black/30 rounded-xl p-1 backdrop-blur-sm">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "month" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setViewMode("month")}
                      className={cn(
                        "h-9 w-9 rounded-lg transition-all",
                        viewMode === "month" && "shadow-lg"
                      )}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Visualização Mensal</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "week" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setViewMode("week")}
                      className={cn(
                        "h-9 w-9 rounded-lg transition-all",
                        viewMode === "week" && "shadow-lg"
                      )}
                    >
                      <CalendarRange className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Visualização Semanal</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "day" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setViewMode("day")}
                      className={cn(
                        "h-9 w-9 rounded-lg transition-all",
                        viewMode === "day" && "shadow-lg"
                      )}
                    >
                      <CalendarDays className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Visualização Diária</TooltipContent>
                </Tooltip>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[180px] rounded-xl bg-white/50 dark:bg-black/30 border-0 backdrop-blur-sm focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Filters */}
              <Select
                value={selectedEventType}
                onValueChange={(value) => setSelectedEventType(value as EventType | "all")}
              >
                <SelectTrigger className="w-[160px] rounded-xl bg-white/50 dark:bg-black/30 border-0 backdrop-blur-sm">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.entries(EVENT_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{config.emoji}</span>
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {pets.length > 0 && (
                <Select
                  value={selectedPet.toString()}
                  onValueChange={(value) => setSelectedPet(value === "all" ? "all" : parseInt(value))}
                >
                  <SelectTrigger className="w-[160px] rounded-xl bg-white/50 dark:bg-black/30 border-0 backdrop-blur-sm">
                    <Dog className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Pet" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
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
                    <Button className="rounded-xl shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Evento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Sparkles className="h-6 w-6 text-primary" />
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
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </motion.div>

        {/* Event Type Legend - Premium chips */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2"
        >
          {Object.entries(EVENT_TYPES).map(([key, config]) => {
            const Icon = config.icon;
            const count = eventStats[key] || 0;
            return (
              <motion.button
                key={key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedEventType(selectedEventType === key ? "all" : key as EventType)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all text-sm font-medium",
                  config.lightBg,
                  config.borderColor,
                  selectedEventType === key && "ring-2 ring-primary ring-offset-2",
                  "hover:shadow-md cursor-pointer"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", config.textColor)} />
                <span className={config.textColor}>{config.label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className={cn("h-5 min-w-[20px] px-1.5", config.badgeBg)}>
                    {count}
                  </Badge>
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4 md:p-6 shadow-2xl border-2 rounded-2xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-950/50 backdrop-blur-xl overflow-hidden">
            {viewMode === "day" ? (
              // Day View
              <DayView
                date={currentDate}
                events={getEventsForDate(currentDate)}
                onEventClick={onEventClick}
                onEventDrop={onEventDrop}
              />
            ) : (
              <>
                {/* Week day headers */}
                <div className={cn(
                  "grid gap-2 mb-4",
                  viewMode === "month" ? "grid-cols-7" : "grid-cols-7"
                )}>
                  {weekDays.map((day, index) => (
                    <div
                      key={day}
                      className={cn(
                        "text-center font-bold text-sm py-3 rounded-xl",
                        index === 0 || index === 6 
                          ? "text-rose-500 dark:text-rose-400" 
                          : "text-muted-foreground"
                      )}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className={cn(
                  "grid gap-2",
                  viewMode === "month" ? "grid-cols-7" : "grid-cols-7"
                )}>
                  <AnimatePresence mode="wait">
                    {days.map((date, index) => {
                      const dayEvents = date ? getEventsForDate(date) : [];
                      const isToday =
                        date &&
                        date.getDate() === today.getDate() &&
                        date.getMonth() === today.getMonth() &&
                        date.getFullYear() === today.getFullYear();
                      const isPast = date && date < today;
                      const isWeekend = date && (date.getDay() === 0 || date.getDay() === 6);

                      return (
                        <motion.div
                          key={`${date?.toISOString() || index}-${viewMode}`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: index * 0.01 }}
                          className={cn(
                            "min-h-[100px] md:min-h-[130px] p-2 md:p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer relative group",
                            date 
                              ? "bg-white dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-primary/40 hover:shadow-lg" 
                              : "bg-gray-100/50 dark:bg-gray-900/20 border-transparent",
                            isToday && "ring-2 ring-primary ring-offset-2 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/30",
                            isPast && !isToday && "opacity-50",
                            isWeekend && date && "bg-rose-50/30 dark:bg-rose-950/10"
                          )}
                          onClick={() => {
                            if (date) {
                              onDateClick?.(date);
                              onDayClick?.(date);
                            }
                          }}
                          onDragOver={(e) => handleDragOver(e, date)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, date)}
                        >
                          {date && (
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <span
                                  className={cn(
                                    "text-sm font-bold",
                                    isToday && "text-primary",
                                    isWeekend && !isToday && "text-rose-500 dark:text-rose-400"
                                  )}
                                >
                                  {date.getDate()}
                                </span>
                                {dayEvents.length > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="h-5 w-5 p-0 flex items-center justify-center text-xs bg-gradient-to-r from-primary/20 to-purple-500/20"
                                  >
                                    {dayEvents.length}
                                  </Badge>
                                )}
                              </div>
                              <div className="space-y-1">
                                {dayEvents.slice(0, viewMode === "week" ? 2 : 3).map((event) => (
                                  <EventCard
                                    key={event.id}
                                    event={event}
                                    date={date}
                                    compact
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEventClick?.(event);
                                    }}
                                    onDragStart={(e) => handleDragStart(e, event.id)}
                                  />
                                ))}
                                {dayEvents.length > (viewMode === "week" ? 2 : 3) && (
                                  <div className="text-xs text-muted-foreground text-center py-1 font-medium">
                                    +{dayEvents.length - (viewMode === "week" ? 2 : 3)} mais
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}

// Event Card Component
function EventCard({
  event,
  date,
  compact = false,
  onClick,
  onDragStart,
}: {
  event: CalendarEvent;
  date: Date;
  compact?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const config = EVENT_TYPES[event.eventType] || EVENT_TYPES.general;
  const Icon = config.icon;
  
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
    <motion.div
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "px-2 py-1.5 rounded-lg text-xs font-medium cursor-move transition-all border shadow-sm",
        config.lightBg,
        config.textColor,
        config.borderColor,
        "hover:shadow-md",
        isPeriodEvent && "border-dashed border-2"
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 flex-shrink-0" />
        <span className="truncate font-semibold">
          {isFirstDay && "→ "}
          {event.title}
          {isLastDay && " ←"}
        </span>
      </div>
      {!compact && isPeriodEvent && event.dailyCount && (
        <div className="text-[10px] opacity-80 mt-0.5 font-medium">
          {event.dailyCount} {event.dailyCount === 1 ? 'diária' : 'diárias'}
        </div>
      )}
      {!compact && !event.isAllDay && (
        <div className="flex items-center gap-1 mt-1 opacity-80">
          <Clock className="h-2.5 w-2.5" />
          <span className="text-[10px] font-medium">
            {new Date(event.eventDate).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// Day View Component
function DayView({
  date,
  events,
  onEventClick,
  onEventDrop,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventDrop?: (eventId: number, newDate: Date) => void;
}) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 to 20:00

  const getEventsForHour = (hour: number) => {
    return events.filter(event => {
      if (event.isAllDay) return false;
      const eventHour = new Date(event.eventDate).getHours();
      return eventHour === hour;
    });
  };

  const allDayEvents = events.filter(e => e.isAllDay);

  return (
    <div className="space-y-4">
      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="space-y-2 pb-4 border-b">
          <h3 className="text-sm font-semibold text-muted-foreground">Dia inteiro</h3>
          <div className="flex flex-wrap gap-2">
            {allDayEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                date={date}
                onClick={() => onEventClick?.(event)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hourly timeline */}
      <div className="space-y-0">
        {hours.map(hour => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div key={hour} className="flex border-t border-dashed first:border-t-0">
              <div className="w-16 md:w-20 py-3 text-xs text-muted-foreground font-medium">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1 py-2 min-h-[60px]">
                {hourEvents.length > 0 ? (
                  <div className="space-y-1">
                    {hourEvents.map(event => (
                      <EventCard
                        key={event.id}
                        event={event}
                        date={date}
                        onClick={() => onEventClick?.(event)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-full min-h-[40px] border border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-900/20" />
                )}
              </div>
            </div>
          );
        })}
      </div>
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
    endDate: "",
    eventType: "general" as EventType,
    petId: null as number | null,
    location: "",
    isAllDay: true,
    checkInDate: "",
    checkOutDate: "",
  });
  
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

    if (formData.endDate) {
      const start = new Date(formData.eventDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        alert("Data de término deve ser posterior à data de início");
        return;
      }
    }

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
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      checkInDate: formData.checkInDate ? new Date(formData.checkInDate) : undefined,
      checkOutDate: formData.checkOutDate ? new Date(formData.checkOutDate) : undefined,
    } as any);
  };

  const selectedTypeConfig = EVENT_TYPES[formData.eventType];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="title" className="text-sm font-semibold">Título *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          className="rounded-xl mt-1.5"
          placeholder="Ex: Vacinação V10"
        />
      </div>

      <div>
        <Label htmlFor="description" className="text-sm font-semibold">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="rounded-xl mt-1.5"
          rows={3}
          placeholder="Detalhes adicionais..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="eventType" className="text-sm font-semibold">Tipo *</Label>
          <Select
            value={formData.eventType}
            onValueChange={(value) =>
              setFormData({ ...formData, eventType: value as EventType })
            }
          >
            <SelectTrigger className="rounded-xl mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {Object.entries(EVENT_TYPES).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{config.emoji}</span>
                    {config.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {pets.length > 0 && (
          <div>
            <Label htmlFor="petId" className="text-sm font-semibold">Pet</Label>
            <Select
              value={formData.petId?.toString() || "none"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  petId: value === "none" ? null : parseInt(value),
                })
              }
            >
              <SelectTrigger className="rounded-xl mt-1.5">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none">Nenhum</SelectItem>
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="eventDate" className="text-sm font-semibold">Início *</Label>
          <Input
            id="eventDate"
            type="datetime-local"
            value={formData.eventDate}
            onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
            required
            className="rounded-xl mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="endDate" className="text-sm font-semibold">Término</Label>
          <Input
            id="endDate"
            type="datetime-local"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            min={formData.eventDate}
            className="rounded-xl mt-1.5"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="location" className="text-sm font-semibold">Local</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="rounded-xl mt-1.5 pl-10"
            placeholder="Ex: Clínica Veterinária"
          />
        </div>
      </div>

      {/* Multi-day period section */}
      {(formData.eventType === "checkin" || formData.eventType === "checkout") && (
        <div className={cn("border-2 rounded-xl p-4 space-y-4", selectedTypeConfig.lightBg, selectedTypeConfig.borderColor)}>
          <div>
            <Label className="text-base font-semibold flex items-center gap-2">
              {selectedTypeConfig.emoji} Período de Diárias
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Configure o período de hospedagem
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="checkInDate" className="text-sm font-semibold">Check-in</Label>
              <Input
                id="checkInDate"
                type="date"
                value={formData.checkInDate}
                onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                className="rounded-xl mt-1.5"
              />
            </div>
            
            <div>
              <Label htmlFor="checkOutDate" className="text-sm font-semibold">Check-out</Label>
              <Input
                id="checkOutDate"
                type="date"
                value={formData.checkOutDate}
                onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                className="rounded-xl mt-1.5"
                min={formData.checkInDate}
              />
            </div>
          </div>
          
          {dailyCount !== null && dailyCount > 0 && (
            <div className="bg-white/50 dark:bg-black/20 rounded-xl p-3">
              <p className="text-sm font-bold">
                📅 Total: {dailyCount} {dailyCount === 1 ? 'diária' : 'diárias'}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
        <input
          type="checkbox"
          id="isAllDay"
          checked={formData.isAllDay}
          onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
          className="rounded w-4 h-4"
        />
        <Label htmlFor="isAllDay" className="cursor-pointer font-medium">
          Evento de dia inteiro
        </Label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" className="rounded-xl bg-gradient-to-r from-primary to-purple-600 shadow-lg hover:shadow-xl transition-all">
          <Sparkles className="h-4 w-4 mr-2" />
          Criar Evento
        </Button>
      </div>
    </form>
  );
}
