"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DayEventsSheet } from "@/components/agenda/day-events-sheet";
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
  XCircle,
  CalendarX2,
  Edit3,
  Trash2,
  ExternalLink,
  User,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

interface CalendarMonthViewProps {
  eventos: any[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick: (evento: any) => void;
  onDateClick: (date: Date) => void;
  onEditEvento?: (evento: any) => void;
  onDeleteEvento?: (id: string) => void;
  onArchiveEvento?: (id: string) => void;
  /** Extra content rendered inline in the header (defensor avatars, stats, etc.) */
  headerRight?: React.ReactNode;
}

import { getAtribuicaoColors, ATRIBUICAO_COLORS } from "@/lib/config/atribuicoes";

// Ícones por tipo/atribuição (labels)
const atribuicaoIcons: Record<string, any> = {
  "Tribunal do Júri": Gavel,
  "Grupo Especial do Júri": Gavel,
  "Violência Doméstica": Home,
  "Execução Penal": Lock,
  "Criminal Geral": Folder,
  "Substituição": RefreshCw,
  "Curadoria Especial": Shield,
};

// Ícones por atribuicaoKey (para cards do calendário)
const atribuicaoKeyIcons: Record<string, any> = {
  JURI: Gavel,
  VVD: Shield,
  EXECUCAO: Lock,
  SUBSTITUICAO: RefreshCw,
  SUBSTITUICAO_CIVEL: Folder,
  CRIMINAL: Folder,
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

// Verifica se o evento não ocorrerá (cancelado ou redesignado)
const isEventoCancelado = (status: string) =>
  status === "cancelado" || status === "cancelada" ||
  status === "remarcado" || status === "redesignado" || status === "reagendada";

// Cor neutra para eventos que não ocorrerão
const COR_EVENTO_CANCELADO = "#a1a1aa"; // zinc-400

// Componente de Evento Compacto — Top-bar + Ícone (Padrão Defender)
function EventoCompacto({
  evento,
  onEventClick,
  onEditEvento,
  onDeleteEvento,
}: {
  evento: any;
  onEventClick: (evento: any) => void;
  onEditEvento?: (evento: any) => void;
  onDeleteEvento?: (id: string) => void;
}) {
  const colors = getAtribuicaoColors(evento.atribuicaoKey || evento.atribuicao);
  const solidColor = (colors as any).color || "#71717a";
  const hasRegistro = !!evento.registro;
  const eventoCancelado = isEventoCancelado(evento.status);
  const displayColor = eventoCancelado ? COR_EVENTO_CANCELADO : solidColor;

  // Ícone da atribuição
  const AtribIcon = atribuicaoKeyIcons[evento.atribuicaoKey] || Folder;

  // Extrair nome do assistido abreviado (primeiro + último nome)
  const assistidoAbrev = evento.assistido
    ? evento.assistido.split(" ").length > 1
      ? `${evento.assistido.split(" ")[0]} ${evento.assistido.split(" ").pop()?.charAt(0)}.`
      : evento.assistido
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={`group w-full text-left rounded-lg transition-all duration-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
            eventoCancelado ? "opacity-50" : ""
          }`}
        >
          {/* Top-bar colorida */}
          <div
            className="h-[3px] w-full rounded-t-lg"
            style={{ backgroundColor: displayColor }}
          />

          {/* Conteúdo do card */}
          <div
            className="px-1 sm:px-1.5 py-0.5 sm:py-1 bg-white dark:bg-zinc-800/80 border border-t-0 border-zinc-200/60 dark:border-zinc-700/40 rounded-b-lg group-hover:border-zinc-300 dark:group-hover:border-zinc-600 transition-colors"
          >
            {/* Linha 1: ícone + horário + indicadores */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              <AtribIcon
                className="w-2.5 h-2.5 shrink-0 hidden sm:block"
                style={{ color: displayColor }}
              />

              {/* Status cancelado */}
              {(evento.status === "cancelado" || evento.status === "cancelada") && (
                <XCircle className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
              )}
              {(evento.status === "remarcado" || evento.status === "redesignado" || evento.status === "reagendada") && (
                <CalendarX2 className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
              )}

              <span
                className={`text-[9px] sm:text-[10px] font-bold tabular-nums shrink-0 ${eventoCancelado ? "line-through" : ""}`}
                style={{ color: displayColor }}
              >
                {evento.horarioInicio}
              </span>

              {/* Spacer */}
              <span className="flex-1" />

              {/* Indicadores (urgente, registro) — desktop only */}
              {!eventoCancelado && evento.prioridade === "urgente" && (
                <AlertTriangle className="w-2.5 h-2.5 text-rose-500 shrink-0 hidden sm:block" />
              )}
              {hasRegistro && (
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0 hidden sm:block" />
              )}
            </div>

            {/* Linha 2: tipo abreviado + assistido — hidden on mobile */}
            <p className={`hidden sm:block text-[10px] font-medium truncate leading-tight mt-0.5 ${
              eventoCancelado
                ? "text-zinc-400 dark:text-zinc-500 line-through"
                : "text-zinc-700 dark:text-zinc-200"
            }`}>
              {abreviarTitulo(evento.titulo)}
              {assistidoAbrev && !eventoCancelado && (
                <span className="text-zinc-400 dark:text-zinc-500 font-normal"> — {assistidoAbrev}</span>
              )}
            </p>
          </div>
        </button>
      </PopoverTrigger>
      
      <PopoverContent
        className="w-[340px] p-0 border-0 shadow-2xl rounded-xl overflow-hidden"
        side="right"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com cor da atribuição */}
        <div
          className="px-4 py-3"
          style={{ backgroundColor: `${displayColor}15` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Badge de status para cancelados */}
              {eventoCancelado && (
                <div className="flex items-center gap-1.5 mb-2">
                  {(evento.status === "cancelado" || evento.status === "cancelada") ? (
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <CalendarX2 className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                    {(evento.status === "cancelado" || evento.status === "cancelada") ? "Cancelada" : "Redesignada"}
                  </span>
                </div>
              )}

              {/* Título */}
              <h4
                className={`font-bold text-base leading-tight ${
                  eventoCancelado
                    ? "text-zinc-400 line-through"
                    : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {evento.titulo}
              </h4>

              {/* Assistido com link */}
              {evento.assistido && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  {evento.assistidoId ? (
                    <a
                      href={`/admin/assistidos/${evento.assistidoId}`}
                      className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {evento.assistido}
                    </a>
                  ) : (
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {evento.assistido}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Ações rápidas */}
            <div className="flex items-center gap-0.5">
              {onEditEvento && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditEvento(evento);
                  }}
                  className="p-1.5 rounded-lg hover:bg-zinc-200/80 dark:hover:bg-zinc-700 transition-colors"
                  title="Editar"
                >
                  <Edit3 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                </button>
              )}
              {onDeleteEvento && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Excluir este evento?")) {
                      onDeleteEvento(evento.id);
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="px-4 py-3 space-y-3 bg-white dark:bg-zinc-900">
          {/* Horário */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${displayColor}20` }}
            >
              <Clock className="w-4 h-4" style={{ color: displayColor }} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Horário</p>
              <p
                className={`text-sm font-semibold ${
                  eventoCancelado ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {evento.horarioInicio}
                {evento.horarioFim && ` - ${evento.horarioFim}`}
              </p>
            </div>
          </div>

          {/* Local */}
          {evento.local && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Local</p>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {evento.local}
                </p>
              </div>
            </div>
          )}

          {/* Processo */}
          {evento.processo && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <FileText className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Processo</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300 truncate">
                    {evento.processo}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(evento.processo);
                      toast.success("Número copiado!");
                    }}
                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Copiar número"
                  >
                    <Copy className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Indicador de Registro */}
          {hasRegistro && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Registro documentado
              </span>
            </div>
          )}
        </div>

        {/* Footer com ações */}
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(evento);
              }}
            >
              {hasRegistro ? (
                <>
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Ver Detalhes
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Registrar
                </>
              )}
            </Button>
            {onEditEvento && (
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditEvento(evento);
                }}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
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
  onEditEvento,
  onDeleteEvento,
  onArchiveEvento,
  headerRight,
}: CalendarMonthViewProps) {
  const [sheetDate, setSheetDate] = useState<Date | null>(null);

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
      setSheetDate(date);
    } else {
      onDateClick(date);
    }
  };

  return (
    <div className="space-y-4">
      {/* ==========================================
          HEADER DO CALENDÁRIO — linha única compacta
          ========================================== */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        {/* Month navigation */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDateChange(subMonths(currentDate, 1))}
          className="h-7 w-7 shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-baseline gap-1.5 shrink-0">
          <h2 className="font-serif text-xl font-semibold text-zinc-900 dark:text-zinc-100 capitalize leading-none">
            {format(currentDate, "MMMM", { locale: ptBR })}
          </h2>
          <span className="text-sm text-zinc-400 dark:text-zinc-500 font-normal tabular-nums">
            {format(currentDate, "yyyy")}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDateChange(addMonths(currentDate, 1))}
          className="h-7 w-7 shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Extra content: stats — hidden on mobile to avoid overlap */}
        {headerRight && (
          <div className="hidden sm:flex flex-1 min-w-0 items-center justify-end gap-2">
            {headerRight}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateChange(new Date())}
          className="h-6 px-2 text-[10px] shrink-0 rounded-md"
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
                      relative min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0
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
                          onEditEvento={onEditEvento}
                          onDeleteEvento={onDeleteEvento}
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
                        className="mt-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
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

      {/* Sheet lateral de eventos do dia */}
      <DayEventsSheet
        isOpen={!!sheetDate}
        date={sheetDate || new Date()}
        eventos={sheetDate ? getEventosForDate(sheetDate) : []}
        onClose={() => setSheetDate(null)}
        onEventClick={onEventClick}
        onEditEvento={onEditEvento}
        onDeleteEvento={onDeleteEvento}
      />
    </div>
  );
}
