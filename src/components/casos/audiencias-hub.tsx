"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Calendar as CalendarIcon,
  List,
  Columns3,
  Search,
  Filter,
  Clock,
  MapPin,
  User,
  FileText,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  Plus,
  ExternalLink,
  Scale,
  LayoutGrid,
  CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PrisonerIndicator, StatusPrisionalDot } from "@/components/shared/prisoner-indicator";
import { format, isToday, isTomorrow, isPast, differenceInDays, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

// ==========================================
// TIPOS
// ==========================================

interface Audiencia {
  id: number;
  dataAudiencia: Date;
  horario?: string | null;
  tipo: string;
  status: "A_DESIGNAR" | "DESIGNADA" | "REALIZADA" | "AGUARDANDO_ATA" | "CONCLUIDA" | "ADIADA" | "CANCELADA";
  sala?: string | null;
  local?: string | null;
  juiz?: string | null;
  promotor?: string | null;
  anotacoes?: string | null;
  resumoDefesa?: string | null;
  googleCalendarEventId?: string | null;
  // Relacionamentos
  casoId?: number | null;
  casoTitulo?: string | null;
  assistidoId?: number | null;
  assistidoNome?: string | null;
  assistidoFoto?: string | null;
  assistidoPreso?: boolean;
  processoId?: number | null;
  numeroAutos?: string | null;
  vara?: string | null;
  comarca?: string | null;
  defensorNome?: string | null;
}

interface AudienciasHubProps {
  audiencias: Audiencia[];
  onAudienciaClick?: (audiencia: Audiencia) => void;
  onAudienciaUpdate?: (id: number, data: Partial<Audiencia>) => Promise<void>;
  onCreateTask?: (audiencia: Audiencia, taskType: string) => void;
}

// ==========================================
// CONSTANTES
// ==========================================

const TIPOS_AUDIENCIA = {
  INSTRUCAO: { label: "Instrução", icon: "⚖️", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", dotColor: "bg-blue-500" },
  CUSTODIA: { label: "Custódia", icon: "🔒", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", dotColor: "bg-red-500" },
  CONCILIACAO: { label: "Conciliação", icon: "🤝", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", dotColor: "bg-green-500" },
  JUSTIFICACAO: { label: "Justificação", icon: "📋", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dotColor: "bg-amber-500" },
  ADMONICAO: { label: "Admonição", icon: "👨‍⚖️", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", dotColor: "bg-violet-500" },
  UNA: { label: "Una", icon: "📑", color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400", dotColor: "bg-slate-500" },
  PLENARIO_JURI: { label: "Plenário", icon: "🎭", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", dotColor: "bg-rose-500" },
  CONTINUACAO: { label: "Continuação", icon: "➡️", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400", dotColor: "bg-cyan-500" },
  OUTRA: { label: "Outra", icon: "📌", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400", dotColor: "bg-zinc-500" },
};

const STATUS_AUDIENCIA = {
  A_DESIGNAR: { label: "A Designar", color: "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400" },
  DESIGNADA: { label: "Designada", color: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  REALIZADA: { label: "Realizada", color: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  AGUARDANDO_ATA: { label: "Aguardando Ata", color: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  CONCLUIDA: { label: "Concluída", color: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  ADIADA: { label: "Adiada", color: "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  CANCELADA: { label: "Cancelada", color: "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const KANBAN_COLUMNS = [
  { id: "A_DESIGNAR", title: "A Designar", icon: Timer },
  { id: "DESIGNADA", title: "Designadas", icon: CalendarIcon },
  { id: "REALIZADA", title: "Realizadas", icon: CheckCircle2 },
  { id: "AGUARDANDO_ATA", title: "Aguardando Ata", icon: FileText },
  { id: "CONCLUIDA", title: "Concluídas", icon: CheckCircle2 },
];

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function DateIndicator({ date }: { date: Date }) {
  const today = new Date();
  const diffDays = differenceInDays(date, today);
  
  if (isPast(date) && !isToday(date)) {
    return (
      <span className="text-rose-600 dark:text-rose-400 font-medium text-xs">
        Passou
      </span>
    );
  }
  
  if (isToday(date)) {
    return (
      <Badge className="bg-rose-600 text-white text-xs px-1.5 py-0">
        HOJE
      </Badge>
    );
  }
  
  if (isTomorrow(date)) {
    return (
      <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0">
        AMANHÃ
      </Badge>
    );
  }
  
  if (diffDays <= 7) {
    return (
      <span className="text-amber-600 dark:text-amber-400 font-medium text-xs">
        {diffDays} dias
      </span>
    );
  }
  
  return null;
}

function AudienciaCard({ 
  audiencia, 
  onClick,
  compact = false 
}: { 
  audiencia: Audiencia; 
  onClick?: () => void;
  compact?: boolean;
}) {
  const tipoConfig = TIPOS_AUDIENCIA[audiencia.tipo as keyof typeof TIPOS_AUDIENCIA] || TIPOS_AUDIENCIA.OUTRA;
  const statusConfig = STATUS_AUDIENCIA[audiencia.status] || STATUS_AUDIENCIA.A_DESIGNAR;
  
  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-200",
        "bg-white dark:bg-zinc-950",
        "border border-zinc-200 dark:border-zinc-800",
        "hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md",
        audiencia.assistidoPreso ? "border-l-[3px] border-l-rose-500" : "border-l-[3px] border-l-emerald-500"
      )}
      onClick={onClick}
    >
      <div className={cn("p-3", compact && "p-2")}>
        {/* Topo: Data e Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {format(audiencia.dataAudiencia, "dd/MM/yyyy")}
            </span>
            {audiencia.horario && (
              <span className="text-xs text-zinc-400">
                {audiencia.horario}
              </span>
            )}
            <DateIndicator date={audiencia.dataAudiencia} />
          </div>
          <Badge variant="outline" className={cn("text-xs px-1.5 py-0", statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>

        {/* Tipo e Local */}
        <div className="flex items-center gap-2 mb-2">
          <Badge className={cn("text-xs", tipoConfig.color)}>
            {tipoConfig.icon} {tipoConfig.label}
          </Badge>
          {audiencia.sala && (
            <span className="text-xs text-zinc-500">
              Sala {audiencia.sala}
            </span>
          )}
        </div>

        {/* Assistido */}
        {audiencia.assistidoNome && (
          <div className="flex items-center gap-2 mb-2">
            <Avatar className={cn(
              "w-6 h-6 ring-2",
              audiencia.assistidoPreso ? "ring-rose-500" : "ring-emerald-500"
            )}>
              <AvatarImage src={audiencia.assistidoFoto || undefined} />
              <AvatarFallback className="text-xs bg-zinc-100 dark:bg-zinc-800">
                {audiencia.assistidoNome?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {audiencia.assistidoNome}
            </span>
            <PrisonerIndicator preso={audiencia.assistidoPreso ?? false} size="xs" />
          </div>
        )}

        {/* Processo */}
        {audiencia.numeroAutos && !compact && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            <Scale className="w-3 h-3" />
            <span className="truncate">{audiencia.numeroAutos}</span>
          </div>
        )}

        {/* Resumo da Defesa */}
        {audiencia.resumoDefesa && !compact && (
          <div className="mt-2 pt-2 border-t border-dashed border-zinc-100 dark:border-zinc-800">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 italic">
              &ldquo;{audiencia.resumoDefesa}&rdquo;
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

// ==========================================
// VISUALIZAÇÃO LISTA - SWISS DESIGN
// ==========================================

function ListView({ 
  audiencias, 
  onAudienciaClick 
}: { 
  audiencias: Audiencia[]; 
  onAudienciaClick?: (a: Audiencia) => void;
}) {
  // Mobile: Card view, Desktop: Table view
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
              <TableHead className="w-[100px] text-xs uppercase text-zinc-500 font-semibold tracking-wider">Data</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500 font-semibold tracking-wider">Tipo</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500 font-semibold tracking-wider">Assistido</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500 font-semibold tracking-wider">Processo</TableHead>
              <TableHead className="text-xs uppercase text-zinc-500 font-semibold tracking-wider">Local</TableHead>
              <TableHead className="w-[100px] text-xs uppercase text-zinc-500 font-semibold tracking-wider">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audiencias.map((audiencia) => {
              const tipoConfig = TIPOS_AUDIENCIA[audiencia.tipo as keyof typeof TIPOS_AUDIENCIA] || TIPOS_AUDIENCIA.OUTRA;
              const statusConfig = STATUS_AUDIENCIA[audiencia.status] || STATUS_AUDIENCIA.A_DESIGNAR;
              
              return (
                <TableRow 
                  key={audiencia.id}
                  className={cn(
                    "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors",
                    audiencia.assistidoPreso && "border-l-[3px] border-l-rose-500"
                  )}
                  onClick={() => onAudienciaClick?.(audiencia)}
                >
                  <TableCell className="py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs text-zinc-900 dark:text-zinc-100 font-medium">
                        {format(audiencia.dataAudiencia, "dd/MM/yy")}
                      </span>
                      {audiencia.horario && (
                        <span className="text-xs text-zinc-500 font-mono">{audiencia.horario}</span>
                      )}
                      <DateIndicator date={audiencia.dataAudiencia} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-xs px-1.5 py-0", tipoConfig.color)}>
                      {tipoConfig.icon} {tipoConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {audiencia.assistidoNome && (
                      <div className="flex items-center gap-2">
                        <Avatar className={cn(
                          "w-6 h-6 ring-1",
                          audiencia.assistidoPreso ? "ring-rose-500" : "ring-emerald-500"
                        )}>
                          <AvatarImage src={audiencia.assistidoFoto || undefined} />
                          <AvatarFallback className="text-xs font-medium">
                            {audiencia.assistidoNome?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate block max-w-[140px] font-medium">
                            {audiencia.assistidoNome}
                          </span>
                          <PrisonerIndicator preso={audiencia.assistidoPreso ?? false} size="xs" />
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-zinc-500 truncate max-w-[160px] block">
                      {audiencia.numeroAutos}
                    </span>
                    {audiencia.vara && (
                      <span className="text-xs text-zinc-400">{audiencia.vara}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {audiencia.local && (
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[100px]">{audiencia.local}</span>
                      </div>
                    )}
                    {audiencia.sala && (
                      <span className="text-xs text-zinc-400">Sala {audiencia.sala}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs px-1.5 py-0", statusConfig.color)}>
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
        {audiencias.map((audiencia) => {
          const tipoConfig = TIPOS_AUDIENCIA[audiencia.tipo as keyof typeof TIPOS_AUDIENCIA] || TIPOS_AUDIENCIA.OUTRA;
          const statusConfig = STATUS_AUDIENCIA[audiencia.status] || STATUS_AUDIENCIA.A_DESIGNAR;
          
          return (
            <div
              key={audiencia.id}
              className={cn(
                "p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors",
                audiencia.assistidoPreso && "border-l-[3px] border-l-rose-500"
              )}
              onClick={() => onAudienciaClick?.(audiencia)}
            >
              {/* Top: Date, Type, Status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs text-zinc-900 dark:text-zinc-100 font-medium">
                      {format(audiencia.dataAudiencia, "dd/MM")}
                    </span>
                    {audiencia.horario && (
                      <span className="text-xs text-zinc-500">{audiencia.horario}</span>
                    )}
                  </div>
                  <DateIndicator date={audiencia.dataAudiencia} />
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className={cn("text-[9px] px-1.5 py-0", tipoConfig.color)}>
                    {tipoConfig.icon}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", statusConfig.color)}>
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>

              {/* Middle: Assistido */}
              {audiencia.assistidoNome && (
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className={cn(
                    "w-7 h-7 ring-1",
                    audiencia.assistidoPreso ? "ring-rose-500" : "ring-emerald-500"
                  )}>
                    <AvatarImage src={audiencia.assistidoFoto || undefined} />
                    <AvatarFallback className="text-xs font-medium">
                      {audiencia.assistidoNome?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-zinc-900 dark:text-zinc-100 font-medium block truncate">
                      {audiencia.assistidoNome}
                    </span>
                    <span className="font-mono text-xs text-zinc-500 truncate block">
                      {audiencia.numeroAutos}
                    </span>
                  </div>
                  <PrisonerIndicator preso={audiencia.assistidoPreso ?? false} size="xs" />
                </div>
              )}

              {/* Bottom: Location */}
              {(audiencia.local || audiencia.sala) && (
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">
                    {audiencia.local}{audiencia.sala && ` • Sala ${audiencia.sala}`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ==========================================
// VISUALIZAÇÃO KANBAN
// ==========================================

function KanbanView({ 
  audiencias, 
  onAudienciaClick 
}: { 
  audiencias: Audiencia[]; 
  onAudienciaClick?: (a: Audiencia) => void;
}) {
  const groupedAudiencias = useMemo(() => {
    const groups: Record<string, Audiencia[]> = {};
    KANBAN_COLUMNS.forEach(col => {
      groups[col.id] = audiencias.filter(a => a.status === col.id);
    });
    return groups;
  }, [audiencias]);

  return (
    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 px-2 sm:px-0">
      {KANBAN_COLUMNS.map((column) => {
        const Icon = column.icon;
        const items = groupedAudiencias[column.id] || [];
        
        return (
          <div 
            key={column.id}
            className="flex-shrink-0 w-[260px] sm:w-[300px]"
          >
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <Icon className="w-4 h-4 text-zinc-500" />
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {column.title}
              </h3>
              <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-auto">
                {items.length}
              </Badge>
            </div>

            {/* Column Content */}
            <div className={cn(
              "space-y-2 min-h-[200px] p-2 rounded-lg",
              "bg-zinc-50 dark:bg-zinc-900/30",
              "border border-dashed border-zinc-200 dark:border-zinc-800"
            )}>
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-[100px] text-xs text-zinc-400">
                  Nenhuma audiência
                </div>
              ) : (
                items.map((audiencia) => (
                  <AudienciaCard
                    key={audiencia.id}
                    audiencia={audiencia}
                    onClick={() => onAudienciaClick?.(audiencia)}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// VISUALIZAÇÃO CALENDÁRIO - SWISS DESIGN
// ==========================================

function CalendarView({
  audiencias,
  onAudienciaClick,
}: {
  audiencias: Audiencia[];
  onAudienciaClick?: (a: Audiencia) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Get audiencias for a specific date
  const getAudienciasForDate = (date: Date) => {
    return audiencias.filter((a) => isSameDay(a.dataAudiencia, date));
  };

  // Navigation
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="p-3 sm:p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-8 px-3 text-xs"
          >
            Hoje
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h3 className="text-base sm:text-lg font-semibold capitalize">
          {format(currentDate, "MMMM yyyy", { locale: ptBR })}
        </h3>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day, i) => (
          <div
            key={day}
            className={cn(
              "text-center font-medium text-xs sm:text-xs py-2 uppercase tracking-wider",
              i === 0 || i === 6 ? "text-zinc-400" : "text-zinc-600 dark:text-zinc-400"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden">
        {calendarDays.map((date, index) => {
          const dayAudiencias = getAudienciasForDate(date);
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isCurrentDay = isToday(date);
          const hasPreso = dayAudiencias.some((a) => a.assistidoPreso);

          return (
            <div
              key={index}
              className={cn(
                "min-h-[70px] sm:min-h-[90px] p-1 sm:p-1.5 bg-white dark:bg-zinc-950 transition-colors",
                isCurrentMonth
                  ? "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  : "bg-zinc-50 dark:bg-zinc-900/50",
                isCurrentDay && "ring-2 ring-inset ring-blue-500"
              )}
            >
              {/* Date Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs sm:text-sm font-medium w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full",
                    isCurrentDay && "bg-blue-600 text-white",
                    !isCurrentMonth && "text-zinc-400"
                  )}
                >
                  {date.getDate()}
                </span>
                {hasPreso && (
                  <StatusPrisionalDot preso={true} size="xs" />
                )}
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayAudiencias.slice(0, 2).map((audiencia) => {
                  const tipoConfig = TIPOS_AUDIENCIA[audiencia.tipo as keyof typeof TIPOS_AUDIENCIA] || TIPOS_AUDIENCIA.OUTRA;
                  return (
                    <div
                      key={audiencia.id}
                      className={cn(
                        "px-1 py-0.5 rounded text-[8px] sm:text-xs truncate cursor-pointer transition-colors",
                        tipoConfig.color
                      )}
                      onClick={() => onAudienciaClick?.(audiencia)}
                    >
                      <span className="hidden sm:inline">{audiencia.horario ? `${audiencia.horario} ` : ""}</span>
                      <span className="font-medium">{audiencia.assistidoNome?.split(" ")[0] || tipoConfig.label}</span>
                    </div>
                  );
                })}
                {dayAudiencias.length > 2 && (
                  <div className="text-[8px] sm:text-xs text-zinc-400 px-1">
                    +{dayAudiencias.length - 2} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2 sm:gap-3 justify-center">
        {Object.entries(TIPOS_AUDIENCIA).slice(0, 5).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full", config.dotColor)} />
            <span className="text-[9px] sm:text-xs text-zinc-500">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// SIDE PEEK (Detalhes da Audiência)
// ==========================================

function AudienciaSidePeek({
  audiencia,
  open,
  onClose,
  onUpdate,
  onCreateTask,
}: {
  audiencia: Audiencia | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: (id: number, data: Partial<Audiencia>) => Promise<void>;
  onCreateTask?: (audiencia: Audiencia, taskType: string) => void;
}) {
  const [anotacoes, setAnotacoes] = useState(audiencia?.anotacoes || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!audiencia) return null;

  const tipoConfig = TIPOS_AUDIENCIA[audiencia.tipo as keyof typeof TIPOS_AUDIENCIA] || TIPOS_AUDIENCIA.OUTRA;
  const statusConfig = STATUS_AUDIENCIA[audiencia.status] || STATUS_AUDIENCIA.A_DESIGNAR;

  const handleSaveAnotacoes = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    try {
      await onUpdate(audiencia.id, { anotacoes });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[450px] sm:max-w-[450px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            {audiencia.assistidoFoto && (
              <Avatar className={cn(
                "w-12 h-12 ring-2",
                audiencia.assistidoPreso ? "ring-rose-500" : "ring-emerald-500"
              )}>
                <AvatarImage src={audiencia.assistidoFoto} />
                <AvatarFallback>{audiencia.assistidoNome?.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <SheetTitle className="text-left">
                {audiencia.assistidoNome || "Audiência"}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={cn("text-xs", tipoConfig.color)}>
                  {tipoConfig.icon} {tipoConfig.label}
                </Badge>
                <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="py-4 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase text-zinc-500 font-medium">Data</label>
              <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                {format(audiencia.dataAudiencia, "dd/MM/yyyy")}
              </p>
            </div>
            <div>
              <label className="text-xs uppercase text-zinc-500 font-medium">Horário</label>
              <p className="text-sm text-zinc-900 dark:text-zinc-100">
                {audiencia.horario || "-"}
              </p>
            </div>
            <div>
              <label className="text-xs uppercase text-zinc-500 font-medium">Local</label>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {audiencia.local || "-"}
              </p>
            </div>
            <div>
              <label className="text-xs uppercase text-zinc-500 font-medium">Sala</label>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {audiencia.sala || "-"}
              </p>
            </div>
          </div>

          {/* Processo */}
          {audiencia.numeroAutos && (
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <label className="text-xs uppercase text-zinc-500 font-medium">Processo</label>
              <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100 mt-1">
                {audiencia.numeroAutos}
              </p>
              {audiencia.vara && (
                <p className="text-xs text-zinc-500 mt-0.5">{audiencia.vara} - {audiencia.comarca}</p>
              )}
            </div>
          )}

          {/* Resumo da Defesa */}
          {audiencia.resumoDefesa && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <label className="text-xs uppercase text-amber-700 dark:text-amber-400 font-medium">
                Resumo da Defesa
              </label>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1 italic">
                &ldquo;{audiencia.resumoDefesa}&rdquo;
              </p>
            </div>
          )}

          {/* Participantes */}
          <div>
            <label className="text-xs uppercase text-zinc-500 font-medium mb-2 block">
              Participantes
            </label>
            <div className="space-y-2">
              {audiencia.juiz && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-500">Juiz:</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{audiencia.juiz}</span>
                </div>
              )}
              {audiencia.promotor && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-500">Promotor:</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{audiencia.promotor}</span>
                </div>
              )}
              {audiencia.defensorNome && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-500">Defensor:</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{audiencia.defensorNome}</span>
                </div>
              )}
            </div>
          </div>

          {/* Anotações / Ata */}
          <div>
            <label className="text-xs uppercase text-zinc-500 font-medium mb-2 block">
              Anotações da Audiência
            </label>
            <Textarea
              value={anotacoes}
              onChange={(e) => setAnotacoes(e.target.value)}
              placeholder="Registre o que ocorreu na audiência..."
              className="min-h-[120px] text-sm"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-zinc-400">
                As anotações são versionadas para auditoria.
              </p>
              <Button 
                size="sm" 
                onClick={handleSaveAnotacoes}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>

          {/* Ações */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <label className="text-xs uppercase text-zinc-500 font-medium mb-2 block">
              Gerar Tarefa
            </label>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onCreateTask?.(audiencia, "memoriais")}
              >
                <FileText className="w-4 h-4 mr-1" />
                Memoriais
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onCreateTask?.(audiencia, "recurso")}
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                Recurso
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onCreateTask?.(audiencia, "alegacoes")}
              >
                <FileText className="w-4 h-4 mr-1" />
                Alegações
              </Button>
            </div>
          </div>

          {/* Google Calendar Link */}
          {audiencia.googleCalendarEventId && (
            <a
              href={`https://calendar.google.com/calendar/event?eid=${audiencia.googleCalendarEventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Ver no Google Calendar
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL - SWISS DESIGN
// ==========================================

export function AudienciasHub({
  audiencias,
  onAudienciaClick,
  onAudienciaUpdate,
  onCreateTask,
}: AudienciasHubProps) {
  const [viewMode, setViewMode] = useState<"lista" | "kanban" | "calendario">("lista");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [selectedAudiencia, setSelectedAudiencia] = useState<Audiencia | null>(null);
  const [sidePeekOpen, setSidePeekOpen] = useState(false);

  const filteredAudiencias = useMemo(() => {
    return audiencias.filter((a) => {
      const matchesSearch = 
        !searchTerm ||
        a.assistidoNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.numeroAutos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.casoTitulo?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === "all" || a.status === filterStatus;
      const matchesTipo = filterTipo === "all" || a.tipo === filterTipo;

      return matchesSearch && matchesStatus && matchesTipo;
    });
  }, [audiencias, searchTerm, filterStatus, filterTipo]);

  // Stats
  const stats = useMemo(() => {
    const hoje = filteredAudiencias.filter(a => isToday(a.dataAudiencia)).length;
    const semana = filteredAudiencias.filter(a => {
      const dias = differenceInDays(a.dataAudiencia, new Date());
      return dias >= 0 && dias <= 7;
    }).length;
    const presos = filteredAudiencias.filter(a => a.assistidoPreso).length;
    return { hoje, semana, presos };
  }, [filteredAudiencias]);

  const handleAudienciaClick = (audiencia: Audiencia) => {
    setSelectedAudiencia(audiencia);
    setSidePeekOpen(true);
    onAudienciaClick?.(audiencia);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 px-2 sm:px-0">
        {/* Header - Swiss Design */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-sm">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg sm:text-xl text-zinc-900 dark:text-zinc-100">
                Agenda de Audiências
              </h2>
              <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span>{filteredAudiencias.length} audiências</span>
                {stats.hoje > 0 && (
                  <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-xs px-1.5 py-0">
                    {stats.hoje} hoje
                  </Badge>
                )}
                {stats.presos > 0 && (
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                    <StatusPrisionalDot preso={true} size="sm" /> {stats.presos} presos
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* View Toggle - Swiss Style */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("lista")}
                  className={cn(
                    "h-8 px-3 text-xs font-medium rounded-md transition-all",
                    viewMode === "lista" 
                      ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100" 
                      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  )}
                >
                  <List className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Lista</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Modo Lista</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("calendario")}
                  className={cn(
                    "h-8 px-3 text-xs font-medium rounded-md transition-all",
                    viewMode === "calendario" 
                      ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100" 
                      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  )}
                >
                  <CalendarDays className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Calendário</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Modo Calendário</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("kanban")}
                  className={cn(
                    "h-8 px-3 text-xs font-medium rounded-md transition-all",
                    viewMode === "kanban" 
                      ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100" 
                      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  )}
                >
                  <Columns3 className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Kanban</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Modo Kanban</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Filters - Responsive */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar por assistido, processo ou caso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-zinc-950 h-9 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(TIPOS_AUDIENCIA).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {val.icon} {val.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_AUDIENCIA).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {val.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content - Card Container */}
        <Card className="border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {viewMode === "lista" && (
            <ListView 
              audiencias={filteredAudiencias} 
              onAudienciaClick={handleAudienciaClick}
            />
          )}
          {viewMode === "calendario" && (
            <CalendarView 
              audiencias={filteredAudiencias} 
              onAudienciaClick={handleAudienciaClick}
            />
          )}
          {viewMode === "kanban" && (
            <div className="p-4 overflow-x-auto">
              <KanbanView 
                audiencias={filteredAudiencias} 
                onAudienciaClick={handleAudienciaClick}
              />
            </div>
          )}
        </Card>

        {/* Empty State */}
        {filteredAudiencias.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400">
              Nenhuma audiência encontrada com os filtros selecionados.
            </p>
          </div>
        )}

        {/* Side Peek */}
        <AudienciaSidePeek
          audiencia={selectedAudiencia}
          open={sidePeekOpen}
          onClose={() => setSidePeekOpen(false)}
          onUpdate={onAudienciaUpdate}
          onCreateTask={onCreateTask}
        />
      </div>
    </TooltipProvider>
  );
}
