"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DayEventsPopup } from "@/components/agenda/day-events-popup";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buscarHistoricoPorProcesso, buscarHistoricoPorAssistido } from "@/lib/data/historico-audiencias";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  isWeekend,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Gavel,
  Users,
  Clock,
  Calendar as CalendarIcon,
  MapPin,
  AlertTriangle,
  Home,
  Lock,
  Folder,
  RefreshCw,
  Shield,
  CheckCircle2,
  FileText,
  History,
} from "lucide-react";

interface CalendarMonthViewProps {
  eventos: any[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick: (evento: any) => void;
  onDateClick: (date: Date) => void;
}

import { getAtribuicaoColors, ATRIBUICAO_COLORS } from "@/lib/config/atribuicoes";

// Ícones por tipo/atribuição
const atribuicaoIcons: Record<string, any> = {
  "Tribunal do Júri": Gavel,
  "Grupo Especial do Júri": Gavel,
  "Violência Doméstica": Home,
  "Execução Penal": Lock,
  "Criminal Geral": Folder,
  "Substituição": RefreshCw,
  "Curadoria Especial": Shield,
};

// Usar cores centralizadas
const atribuicaoColors = ATRIBUICAO_COLORS;
const defaultColors = getAtribuicaoColors("CRIMINAL");

// Função para abreviar título
const abreviarTitulo = (titulo: string): string => {
  const abreviacoes: Record<string, string> = {
    // AIJ - Instrução e Julgamento
    "Audiência de Instrução e Julgamento": "AIJ",
    "Instrução e Julgamento": "AIJ",
    // Custódia
    "Audiência de Custódia": "Custódia",
    // Justificação
    "Audiência de Justificação": "Justificação",
    // Júri
    "Sessão de Julgamento do Tribunal do Júri": "Júri",
    "Sessão do Tribunal do Júri": "Júri",
    "Tribunal do Júri": "Júri",
    "Sessão de Júri": "Júri",
    "Plenário do Júri": "Júri",
    // PAP
    "Produção Antecipada de Provas": "PAP",
    // ANPP
    "Acordo de Não Persecução Penal": "ANPP",
    // Admonitória
    "Audiência Admonitória": "Admonitória",
    // Oitiva Especial
    "Oitiva Especial": "Oitiva especial",
    // Retratação
    "Audiência de Retratação": "Retratação",
    // Outros
    "Audiência Concentrada": "Concentrada",
    "Audiência de Conciliação": "Conciliação",
  };

  if (abreviacoes[titulo]) return abreviacoes[titulo];
  
  for (const [chave, abrev] of Object.entries(abreviacoes)) {
    if (titulo.includes(chave)) return abrev;
  }
  
  return titulo.length > 15 ? titulo.substring(0, 15) + "…" : titulo;
};

// Componente de Evento Compacto - Visual sofisticado
function EventoCompacto({ 
  evento, 
  onEventClick 
}: { 
  evento: any;
  onEventClick: (evento: any) => void;
}) {
  // Usar atribuicaoKey se disponível, senão buscar por atribuicao (label)
  const colors = getAtribuicaoColors(evento.atribuicaoKey || evento.atribuicao);
  const solidColor = (colors as any).color || "#71717a";
  const hasRegistro = !!evento.registro;
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="group w-full text-left rounded-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden"
          style={{
            backgroundColor: `${solidColor}15`,
            borderLeft: `3px solid ${solidColor}`,
          }}
        >
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              {/* Horário com cor da atribuição */}
              <span 
                className="text-[10px] font-bold shrink-0"
                style={{ color: solidColor }}
              >
                {evento.horarioInicio}
              </span>
              
              {/* Indicador de prioridade urgente */}
              {evento.prioridade === "urgente" && (
                <AlertTriangle className="w-2.5 h-2.5 text-red-500 shrink-0" />
              )}
              
              {/* Indicador de registro salvo */}
              {hasRegistro && (
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
              )}
            </div>
            
            {/* Título */}
            <p className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 truncate leading-tight mt-0.5">
              {abreviarTitulo(evento.titulo)}
            </p>
          </div>
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0 border shadow-xl" 
        side="right" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-4 border-l-4 ${colors.border}`}>
          {/* Header */}
          <div className="mb-3">
            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              {evento.titulo}
            </h4>
            {evento.assistido && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {evento.assistidoId ? (
                  <a 
                    href={`/admin/assistidos/${evento.assistidoId}`}
                    className="hover:text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {evento.assistido}
                  </a>
                ) : (
                  evento.assistido
                )}
              </p>
            )}
          </div>

          {/* Detalhes */}
          <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span>{evento.horarioInicio}{evento.horarioFim && ` - ${evento.horarioFim}`}</span>
            </div>
            {evento.local && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{evento.local}</span>
              </div>
            )}
            {evento.processo && (
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span className="font-mono text-[10px]">{evento.processo}</span>
              </div>
            )}
          </div>

          {/* Status */}
          {hasRegistro && (
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium">Registro documentado</span>
              </div>
            </div>
          )}

          {/* Ação */}
          <Button
            size="sm"
            className="w-full mt-3"
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(evento);
            }}
          >
            {hasRegistro ? "Ver Detalhes" : "Registrar"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Componente Principal
export function CalendarMonthView({
  eventos,
  currentDate,
  onDateChange,
  onEventClick,
  onDateClick,
}: CalendarMonthViewProps) {
  const [popupDate, setPopupDate] = useState<Date | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  // Cálculo das datas do mês
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Construir grade do calendário
  const rows: Date[][] = [];
  let days: Date[] = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      days.push(day);
      day = addDays(day, 1);
    }
    rows.push(days);
    days = [];
  }

  const getEventosForDate = (date: Date) => {
    // Adicionar T12:00:00 para evitar problemas de timezone
    return eventos.filter((evento) => isSameDay(new Date(evento.data + "T12:00:00"), date));
  };

  const handleDayClick = (date: Date, event: React.MouseEvent) => {
    const dayEvents = getEventosForDate(date);
    if (dayEvents.length > 0) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setPopupPosition({ x: rect.left, y: rect.bottom + 8 });
      setPopupDate(date);
    } else {
      onDateClick(date);
    }
  };

  return (
    <div className="space-y-4">
      {/* ==========================================
          HEADER DO CALENDÁRIO
          ========================================== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onDateChange(subMonths(currentDate, 1))}
            className="h-9 w-9"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 min-w-[180px] text-center capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h2>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onDateChange(addMonths(currentDate, 1))}
            className="h-9 w-9"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onDateChange(new Date())}
          className="h-9"
        >
          Hoje
        </Button>
      </div>

      {/* ==========================================
          GRADE DO CALENDÁRIO
          ========================================== */}
      <Card className="overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {/* Cabeçalho - Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dayName, index) => (
            <div
              key={index}
              className={`
                py-3 text-center text-xs font-semibold uppercase tracking-wide
                ${index === 0 || index === 6 
                  ? "text-zinc-400 dark:text-zinc-500" 
                  : "text-zinc-600 dark:text-zinc-400"}
              `}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Corpo - Dias do Mês */}
        <div>
          {rows.map((week, weekIndex) => (
            <div 
              key={weekIndex} 
              className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
            >
              {week.map((date, dayIndex) => {
                const dayEvents = getEventosForDate(date);
                const isCurrentMonth = isSameMonth(date, monthStart);
                const isDayToday = isToday(date);
                const isWeekendDay = isWeekend(date);

                return (
                  <div
                    key={dayIndex}
                    onClick={(e) => handleDayClick(date, e)}
                    className={`
                      relative min-h-[120px] p-2 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0
                      transition-colors duration-150 cursor-pointer
                      ${isCurrentMonth 
                        ? isWeekendDay 
                          ? "bg-zinc-50/50 dark:bg-zinc-900/50" 
                          : "bg-white dark:bg-zinc-900"
                        : "bg-zinc-100/50 dark:bg-zinc-950/50"
                      }
                      ${isCurrentMonth && "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}
                    `}
                  >
                    {/* Número do Dia */}
                    <div className="flex items-start justify-between mb-2">
                      <div
                        className={`
                          flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                          transition-all duration-200
                          ${isDayToday 
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 ring-2 ring-zinc-900/20 dark:ring-zinc-100/20" 
                            : isCurrentMonth
                              ? isWeekendDay
                                ? "text-zinc-400 dark:text-zinc-500"
                                : "text-zinc-700 dark:text-zinc-300"
                              : "text-zinc-300 dark:text-zinc-600"
                          }
                        `}
                      >
                        {format(date, "d")}
                      </div>
                      
                      {/* Badge de contagem */}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Lista de Eventos */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((evento) => (
                        <EventoCompacto 
                          key={evento.id} 
                          evento={evento} 
                          onEventClick={onEventClick}
                        />
                      ))}
                    </div>

                    {/* Indicador de mais eventos */}
                    {dayEvents.length > 3 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDayClick(date, e);
                        }}
                        className="mt-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Ver todos
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* Popup de Eventos do Dia */}
      {popupDate && (
        <DayEventsPopup
          isOpen={!!popupDate}
          date={popupDate}
          eventos={getEventosForDate(popupDate)}
          position={popupPosition}
          onClose={() => setPopupDate(null)}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}
