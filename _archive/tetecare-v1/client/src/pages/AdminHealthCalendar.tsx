import { useState, useMemo, useCallback, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { format, parse, startOfWeek, getDay, addMonths, subMonths, startOfMonth, endOfMonth, isAfter, isBefore, addDays, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { trpc } from "@/lib/trpc";
import { CreateEventForms } from "@/components/CreateEventForms";
import { EditEventForms } from "@/components/EditEventForms";
import { BookingRequestsManager } from "@/components/BookingRequestsManager";
import { generateMonthlyReport } from "@/lib/exportMonthlyReport";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  Syringe,
  Pill,
  Shield,
  Bug,
  Search,
  AlertCircle,
  Clock,
  Dog,
  List,
  Grid3x3,
  Columns,
  LogIn,
  LogOut,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  X,
  CreditCard,
  Users,
  FileDown,
} from "lucide-react";

const locales = {
  "pt-BR": ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type EventType = 
  | "vaccine" 
  | "medication" 
  | "flea" 
  | "deworming" 
  | "checkin" 
  | "checkout" 
  | "payment-income" 
  | "payment-expense";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: EventType;
  petId?: number | null;
  petName?: string;
  notes?: string | null;
  status?: string | "overdue" | "upcoming" | "future";
  bookingId?: number;
  amount?: number;
  category?: string;
}

const EVENT_COLORS = {
  vaccine: {
    bg: "bg-blue-100",
    border: "border-blue-500",
    text: "text-blue-700",
    dot: "bg-blue-500",
    hex: "#3b82f6",
  },
  medication: {
    bg: "bg-purple-100",
    border: "border-purple-500",
    text: "text-purple-700",
    dot: "bg-purple-500",
    hex: "#8b5cf6",
  },
  flea: {
    bg: "bg-orange-100",
    border: "border-orange-500",
    text: "text-orange-700",
    dot: "bg-orange-500",
    hex: "#f59e0b",
  },
  deworming: {
    bg: "bg-green-100",
    border: "border-green-500",
    text: "text-green-700",
    dot: "bg-green-500",
    hex: "#10b981",
  },
  checkin: {
    bg: "bg-cyan-100",
    border: "border-cyan-500",
    text: "text-cyan-700",
    dot: "bg-cyan-500",
    hex: "#06b6d4",
  },
  checkout: {
    bg: "bg-indigo-100",
    border: "border-indigo-500",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
    hex: "#6366f1",
  },
  "payment-income": {
    bg: "bg-emerald-100",
    border: "border-emerald-500",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    hex: "#10b981",
  },
  "payment-expense": {
    bg: "bg-rose-100",
    border: "border-rose-500",
    text: "text-rose-700",
    dot: "bg-rose-500",
    hex: "#f43f5e",
  },
};

const TYPE_ICONS: Record<EventType, any> = {
  vaccine: Syringe,
  medication: Pill,
  flea: Bug,
  deworming: Shield,
  checkin: LogIn,
  checkout: LogOut,
  "payment-income": TrendingUp,
  "payment-expense": TrendingDown,
};

const TYPE_LABELS: Record<EventType, string> = {
  vaccine: "Vacina",
  medication: "Medicamento",
  flea: "Antipulgas",
  deworming: "Vermífugo",
  checkin: "Check-in",
  checkout: "Check-out",
  "payment-income": "Receita",
  "payment-expense": "Despesa",
};

export default function AdminHealthCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createEventType, setCreateEventType] = useState<EventType | null>(null);
  
  // Create DnD Calendar
  const DnDCalendar = useMemo(() => withDragAndDrop<CalendarEvent, object>(Calendar), []);

  // Filters
  const [selectedPet, setSelectedPet] = useState<number | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [occupancyFilter, setOccupancyFilter] = useState<string | null>(null);

  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);

  const { data: rawEvents = [], isLoading, refetch } = trpc.healthCalendar.getEvents.useQuery({
    startDate,
    endDate,
  });

  const { data: occupancyData = [] } = trpc.healthCalendar.getOccupancyStats.useQuery({
    startDate,
    endDate,
  });

  const { data: creditStats } = trpc.healthCalendar.getCreditStats.useQuery({
    startDate,
    endDate,
  });

  const { data: allPets } = trpc.pets.list.useQuery();
  const { data: vaccineLibrary } = trpc.vaccines.library.useQuery();
  const { data: medicationLibrary } = trpc.medications.library.useQuery();

  const deleteVaccinationMutation = trpc.healthCalendar.deleteVaccination.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMedicationMutation = trpc.healthCalendar.deleteMedication.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteBookingMutation = trpc.healthCalendar.deleteBooking.useMutation({
    onSuccess: () => refetch(),
  });

  const updateVaccinationMutation = trpc.vaccines.update.useMutation({
    onSuccess: () => refetch(),
  });

  const updateMedicationMutation = trpc.medications.update.useMutation({
    onSuccess: () => refetch(),
  });

  const updateBookingMutation = trpc.healthCalendar.updateBooking.useMutation({
    onSuccess: () => refetch(),
  });

  const updateTransactionMutation = trpc.healthCalendar.updateTransaction.useMutation({
    onSuccess: () => refetch(),
  });

  // Transform and filter events
  const events = useMemo(() => {
    const today = startOfDay(new Date());
    const upcomingThreshold = addDays(today, 7);

    return rawEvents
      .map((event): CalendarEvent => {
        const eventDate = startOfDay(new Date(event.start));
        let status: "overdue" | "upcoming" | "future" = "future";

        const healthTypes: EventType[] = ["vaccine", "medication", "flea", "deworming"];
        if (healthTypes.includes(event.type)) {
          if (isBefore(eventDate, today)) {
            status = "overdue";
          } else if (isBefore(eventDate, upcomingThreshold)) {
            status = "upcoming";
          }
        }

        return {
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
          status: (event as any).status || status,
        };
      })
      .filter((event) => {
        if (selectedPet && event.petId !== selectedPet) return false;
        if (selectedTypes.length > 0 && !selectedTypes.includes(event.type)) return false;
        
        if (selectedCategory) {
          const healthTypes: EventType[] = ["vaccine", "medication", "flea", "deworming"];
          const operationalTypes: EventType[] = ["checkin", "checkout"];
          const financialTypes: EventType[] = ["payment-income", "payment-expense"];
          
          if (selectedCategory === "health" && !healthTypes.includes(event.type)) return false;
          if (selectedCategory === "operational" && !operationalTypes.includes(event.type)) return false;
          if (selectedCategory === "financial" && !financialTypes.includes(event.type)) return false;
        }
        
        if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      });
  }, [rawEvents, selectedPet, selectedTypes, selectedCategory, searchQuery]);

  // Day events for selected day
  const dayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return events.filter((event) => isSameDay(new Date(event.start), selectedDay));
  }, [events, selectedDay]);

  // Occupancy map
  const occupancyMap = useMemo(() => {
    const map = new Map<string, number>();
    occupancyData.forEach((item) => {
      map.set(item.date, item.occupancy);
    });
    return map;
  }, [occupancyData]);

  // Statistics
  const stats = useMemo(() => {
    const healthTypes: EventType[] = ["vaccine", "medication", "flea", "deworming"];
    const operationalTypes: EventType[] = ["checkin", "checkout"];
    const financialTypes: EventType[] = ["payment-income", "payment-expense"];
    
    const health = events.filter((e) => healthTypes.includes(e.type)).length;
    const operational = events.filter((e) => operationalTypes.includes(e.type)).length;
    const financial = events.filter((e) => financialTypes.includes(e.type)).length;
    
    const overdue = events.filter((e) => e.status === "overdue").length;
    const upcoming = events.filter((e) => e.status === "upcoming").length;
    
    const checkins = events.filter((e) => e.type === "checkin").length;
    const checkouts = events.filter((e) => e.type === "checkout").length;
    
    const income = events
      .filter((e) => e.type === "payment-income")
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const expense = events
      .filter((e) => e.type === "payment-expense")
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const maxOccupancy = Math.max(...Array.from(occupancyMap.values()), 0);
    const avgOccupancy = occupancyMap.size > 0 
      ? Array.from(occupancyMap.values()).reduce((a, b) => a + b, 0) / occupancyMap.size 
      : 0;

    return { 
      health, 
      operational, 
      financial, 
      overdue, 
      upcoming, 
      total: events.length,
      checkins,
      checkouts,
      income,
      expense,
      balance: income - expense,
      maxOccupancy: Math.round(maxOccupancy),
      avgOccupancy: Math.round(avgOccupancy),
      creditsUsed: creditStats?.total || 0,
    };
  }, [events, occupancyMap, creditStats]);

  const toggleType = (type: EventType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const colors = EVENT_COLORS[event.type];
    let backgroundColor = colors.hex;
    let borderColor = colors.hex;

    if (event.status === "overdue") {
      backgroundColor = "#ef4444";
      borderColor = "#dc2626";
    } else if (event.status === "upcoming") {
      backgroundColor = "#eab308";
      borderColor = "#ca8a04";
    }

    return {
      style: {
        backgroundColor,
        borderLeft: `4px solid ${borderColor}`,
        color: "#fff",
        borderRadius: "4px",
        padding: "2px 4px",
        fontSize: "0.85rem",
      },
    };
  };

  const handleNavigate = (action: "PREV" | "NEXT" | "TODAY") => {
    if (action === "PREV") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (action === "NEXT") {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(new Date());
    }
  };

  const handleSelectSlot = (slotInfo: any) => {
    setSelectedDay(slotInfo.start);
  };

  // Handle event drag & drop
  const handleEventDrop = async ({ event, start, end }: any) => {
    try {
      const eventId = parseInt(event.id.split('-')[1]);
      const newStart = format(start, 'yyyy-MM-dd');
      const newEnd = end ? format(end, 'yyyy-MM-dd') : newStart;

      // Update based on event type
      if (event.type === 'vaccine') {
        await updateVaccinationMutation.mutateAsync({
          id: eventId,
          petId: event.petId,
          nextDueDate: new Date(newStart),
        });
      } else if (event.type === 'medication') {
        await updateMedicationMutation.mutateAsync({
          id: eventId,
          petId: event.petId,
          endDate: new Date(newEnd),
        });
      } else if (event.type === 'checkin') {
        await updateBookingMutation.mutateAsync({
          id: eventId,
          checkInDate: newStart,
          checkOutDate: newEnd,
        });
      } else if (event.type.startsWith('payment')) {
        await updateTransactionMutation.mutateAsync({
          id: eventId,
          amount: event.amount || 0,
          category: event.category || '',
          description: event.notes || '',
          transactionDate: newStart,
        });
      }

      refetch();
    } catch (error: any) {
      alert(`Erro ao reagendar evento: ${error.message}`);
    }
  };

  const handleEventResize = async ({ event, start, end }: any) => {
    // Same logic as drop
    await handleEventDrop({ event, start, end });
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (!confirm(`Deseja realmente deletar este evento?`)) return;

    try {
      const eventId = parseInt(event.id.split('-')[1]);
      
      if (event.type === "vaccine") {
        await deleteVaccinationMutation.mutateAsync({ id: eventId });
      } else if (event.type === "medication") {
        await deleteMedicationMutation.mutateAsync({ id: eventId });
      } else if (event.type === "checkin" || event.type === "checkout") {
        if (event.bookingId) {
          await deleteBookingMutation.mutateAsync({ id: event.bookingId });
        }
      }
      
      setSelectedEvent(null);
      setSelectedDay(null);
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Erro ao deletar evento");
    }
  };

  const dayPropGetter = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const occupancy = occupancyMap.get(dateKey) || 0;
    
    let className = "";
    if (occupancy > 0) {
      if (occupancy >= 8) {
        className = "bg-red-50";
      } else if (occupancy >= 5) {
        className = "bg-yellow-50";
      } else {
        className = "bg-green-50";
      }
    }

    return { className };
  };

  return (
    <AdminLayout>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendário Geral</h1>
          <p className="text-muted-foreground mt-1">
            Central completa de eventos: saúde, operacional e financeiro
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateMonthlyReport(events, stats, currentDate)}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exportar Mês
          </Button>
          
          <Button
            variant={view === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("month")}
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Mês
          </Button>
          <Button
            variant={view === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("week")}
          >
            <Columns className="h-4 w-4 mr-2" />
            Semana
          </Button>
          <Button
            variant={view === "agenda" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("agenda")}
          >
            <List className="h-4 w-4 mr-2" />
            Agenda
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <CalendarIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-all ${selectedCategory === "health" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setSelectedCategory(selectedCategory === "health" ? null : "health")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saúde</p>
              <p className="text-2xl font-bold text-blue-600">{stats.health}</p>
            </div>
            <Syringe className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-all ${selectedCategory === "operational" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setSelectedCategory(selectedCategory === "operational" ? null : "operational")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Operacional</p>
              <p className="text-2xl font-bold text-cyan-600">{stats.operational}</p>
            </div>
            <Dog className="h-8 w-8 text-cyan-500" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ocupação Máx</p>
              <p className="text-2xl font-bold text-orange-600">{stats.maxOccupancy} pets</p>
            </div>
            <Users className="h-8 w-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Créditos Usados</p>
              <p className="text-2xl font-bold text-purple-600">{stats.creditsUsed}</p>
            </div>
            <CreditCard className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className={`text-2xl font-bold ${stats.balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                R$ {(stats.balance / 100).toFixed(2)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Filtros</h3>
            {(selectedTypes.length > 0 || selectedCategory || selectedPet || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedTypes([]);
                  setSelectedCategory(null);
                  setSelectedPet(null);
                  setSearchQuery("");
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar evento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              className="w-full p-2 border rounded-lg"
              value={selectedPet || ""}
              onChange={(e) => setSelectedPet(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Todos os pets</option>
              {allPets?.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>

            <select
              className="w-full p-2 border rounded-lg"
              value={selectedCategory || ""}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
            >
              <option value="">Todas as categorias</option>
              <option value="health">Saúde</option>
              <option value="operational">Operacional</option>
              <option value="financial">Financeiro</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_LABELS) as EventType[]).map((type) => {
              const Icon = TYPE_ICONS[type];
              const isSelected = selectedTypes.includes(type);
              const colors = EVENT_COLORS[type];

              return (
                <Button
                  key={type}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleType(type)}
                  className={isSelected ? `${colors.bg} ${colors.text} hover:opacity-80` : ""}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {TYPE_LABELS[type]}
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Calendar and Day Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="p-6 lg:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleNavigate("PREV")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleNavigate("TODAY")}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleNavigate("NEXT")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <h2 className="text-xl font-semibold capitalize">
                {format(currentDate, "MMMM yyyy", { locale: ptBR })}
              </h2>

              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {events.length} {events.length === 1 ? "evento" : "eventos"}
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando eventos...
              </div>
            ) : (
              <div style={{ height: 600 }}>
                <DnDCalendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  view={view}
                  onView={setView}
                  date={currentDate}
                  onNavigate={setCurrentDate}
                  onSelectEvent={(event) => setSelectedEvent(event)}
                  onSelectSlot={handleSelectSlot}
                  onEventDrop={handleEventDrop}
                  onEventResize={handleEventResize}
                  selectable
                  resizable
                  draggableAccessor={() => true}
                  eventPropGetter={eventStyleGetter}
                  dayPropGetter={dayPropGetter}
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
                    showMore: (total) => `+ ${total} mais`,
                  }}
                  culture="pt-BR"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Day Agenda Panel */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {selectedDay ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR }) : "Selecione um dia"}
              </h3>
              {selectedDay && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDay(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {selectedDay && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {dayEvents.length} {dayEvents.length === 1 ? "evento" : "eventos"}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {/* Occupancy indicator */}
                {(() => {
                  const dateKey = format(selectedDay, "yyyy-MM-dd");
                  const occupancy = occupancyMap.get(dateKey) || 0;
                  if (occupancy > 0) {
                    return (
                      <div className="flex items-center gap-2 p-2 bg-cyan-50 rounded-lg">
                        <Users className="h-4 w-4 text-cyan-600" />
                        <span className="text-sm text-cyan-700">
                          Ocupação: {occupancy} {occupancy === 1 ? "pet" : "pets"}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Day events list */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {dayEvents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum evento neste dia
                    </div>
                  ) : (
                    dayEvents.map((event) => {
                      const Icon = TYPE_ICONS[event.type];
                      const colors = EVENT_COLORS[event.type];

                      return (
                        <div
                          key={event.id}
                          className={`p-3 rounded-lg border-l-4 ${colors.border} ${colors.bg} space-y-2`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${colors.text}`} />
                              <span className={`font-medium ${colors.text}`}>
                                {event.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setSelectedEvent(event)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDeleteEvent(event)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {event.petName && (
                            <div className="flex items-center gap-1 text-sm">
                              <Dog className="h-3 w-3" />
                              <span>{event.petName}</span>
                            </div>
                          )}

                          {event.notes && (
                            <p className="text-sm text-muted-foreground">
                              {event.notes}
                            </p>
                          )}

                          {event.status && ["overdue", "upcoming"].includes(event.status) && (
                            <Badge
                              variant={event.status === "overdue" ? "destructive" : "default"}
                              className="text-xs"
                            >
                              {event.status === "overdue" ? "Atrasado" : "Próximo"}
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {!selectedDay && (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Clique em um dia no calendário para ver os eventos</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && (
                <>
                  {(() => {
                    const Icon = TYPE_ICONS[selectedEvent.type];
                    return <Icon className="h-5 w-5" />;
                  })()}
                  {selectedEvent.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className={`${EVENT_COLORS[selectedEvent.type].bg} ${EVENT_COLORS[selectedEvent.type].text}`}>
                  {TYPE_LABELS[selectedEvent.type]}
                </Badge>
                {selectedEvent.status && ["overdue", "upcoming"].includes(selectedEvent.status) && (
                  <Badge
                    variant={selectedEvent.status === "overdue" ? "destructive" : "default"}
                  >
                    {selectedEvent.status === "overdue" ? "Atrasado" : "Próximo"}
                  </Badge>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {selectedEvent.petName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pet</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Dog className="h-4 w-4" />
                      <p className="font-medium">{selectedEvent.petName}</p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CalendarIcon className="h-4 w-4" />
                    <p className="font-medium">
                      {format(selectedEvent.start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {selectedEvent.amount !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="h-4 w-4" />
                      <p className="font-medium">
                        R$ {(selectedEvent.amount / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {selectedEvent.category && (
                  <div>
                    <p className="text-sm text-muted-foreground">Categoria</p>
                    <p className="font-medium mt-1">{selectedEvent.category}</p>
                  </div>
                )}
              </div>

              {selectedEvent.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="mt-1">{selectedEvent.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingEvent(selectedEvent);
                    setSelectedEvent(null);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleDeleteEvent(selectedEvent)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar
                </Button>
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione o tipo de evento que deseja criar:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setCreateEventType("vaccine");
                  setShowCreateDialog(false);
                }}
              >
                <Syringe className="h-4 w-4 mr-2" />
                Vacina
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setCreateEventType("medication");
                  setShowCreateDialog(false);
                }}
              >
                <Pill className="h-4 w-4 mr-2" />
                Medicamento
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setCreateEventType("checkin");
                  setShowCreateDialog(false);
                }}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Check-in
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setCreateEventType("payment-income");
                  setShowCreateDialog(false);
                }}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Receita
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setCreateEventType("payment-expense");
                  setShowCreateDialog(false);
                }}
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                Despesa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Event Forms */}
      <CreateEventForms
        open={!!createEventType}
        onClose={() => setCreateEventType(null)}
        eventType={createEventType as any}
        selectedDate={selectedDay}
        onSuccess={() => {
          refetch();
          setCreateEventType(null);
        }}
      />

      {/* Edit Event Forms */}
      <EditEventForms
        open={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        eventType={editingEvent?.type as any}
        eventData={editingEvent}
        onSuccess={() => {
          refetch();
          setEditingEvent(null);
        }}
      />

      {/* Booking Requests Management */}
      <BookingRequestsManager />
    </div>
    </AdminLayout>
  );
}
