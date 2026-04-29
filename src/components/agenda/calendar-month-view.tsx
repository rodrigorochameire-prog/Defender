"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DayEventsSheet } from "@/components/agenda/day-events-sheet";
import { extrairTipo } from "@/components/agenda/extrair-tipo";
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
  Calendar as CalendarIcon,
  AlertTriangle,
  Home,
  Lock,
  Folder,
  RefreshCw,
  Shield,
  FileText,
  History,
  XCircle,
  CalendarX2,
  Scale,
  Plus,
} from "lucide-react";

interface CalendarMonthViewProps {
  eventos: any[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick: (evento: any) => void;
  onDateClick: (date: Date) => void;
  onCreateClick?: (date: Date) => void;
  onEditEvento?: (evento: any) => void;
  onDeleteEvento?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
  onArchiveEvento?: (id: string) => void;
  onEventDoubleClick?: (evento: any) => void;
  /** Abre o modal de detalhes completo (Tela cheia) — opcional, distinto do onEventClick que abre o sheet. */
  onOpenModal?: (evento: any) => void;
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

const STATUS_CHIP_COLOR: Record<string, string> = {
  agendada: "#a1a1aa",
  confirmada: "#a1a1aa",
  pendente: "#a1a1aa",
  realizada: "#22c55e",
  concluida: "#22c55e",
  "concluída": "#22c55e",
  reagendada: "#f59e0b",
  redesignada: "#f59e0b",
  redesignado: "#f59e0b",
  remarcado: "#f59e0b",
  cancelada: "#ef4444",
  cancelado: "#ef4444",
};

function getChipStatusColor(status?: string): string {
  return STATUS_CHIP_COLOR[status?.toLowerCase() ?? ""] ?? "#a1a1aa";
}

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

  // Strip "ADV" prefix before abbreviating
  const tituloClean = titulo.replace(/^ADV\s+/i, "");

  if (abreviacoes[tituloClean]) return abreviacoes[tituloClean];

  for (const [chave, abrev] of Object.entries(abreviacoes)) {
    if (tituloClean.includes(chave)) return abrev;
  }

  return tituloClean.length > 15 ? tituloClean.substring(0, 15) + "…" : tituloClean;
};

// Detectar "ADV" (advogado constituído) no prefixo do título
const detectarAdvogadoConstituido = (titulo: string): boolean => {
  const tipoRaw = titulo.split(" - ")[0]?.trim() || "";
  return /^ADV\b/i.test(tipoRaw);
};

// Verifica se o evento não ocorrerá (cancelado ou redesignado)
const isEventoCancelado = (status: string) =>
  status === "cancelado" || status === "cancelada" ||
  status === "remarcado" || status === "redesignado" || status === "reagendada";

// Cor neutra para eventos que não ocorrerão
const COR_EVENTO_CANCELADO = "#a1a1aa"; // neutral-400

// Componente de Evento Compacto — Top-bar + Ícone (Padrão Defender)
function EventoCompacto({
  evento,
  onEventClick,
  onEditEvento,
  onDeleteEvento,
  onEventDoubleClick,
}: {
  evento: any;
  onEventClick: (evento: any) => void;
  onEditEvento?: (evento: any) => void;
  onDeleteEvento?: (id: string) => void;
  onEventDoubleClick?: (evento: any) => void;
}) {
  const colors = getAtribuicaoColors(evento.atribuicaoKey || evento.atribuicao);
  const solidColor = (colors as any).color || "#71717a";
  const hasRegistro = !!evento.registro;
  const eventoCancelado = isEventoCancelado(evento.status);
  const displayColor = eventoCancelado ? COR_EVENTO_CANCELADO : solidColor;

  // Ícone da atribuição
  const AtribIcon = atribuicaoKeyIcons[evento.atribuicaoKey] || Folder;

  // Advogado constituído (detecta prefixo "ADV" no título)
  const temAdvogado = detectarAdvogadoConstituido(evento.titulo);

  // Tipo de audiência extraído (compartilhado com o sheet)
  const tipoAbrev = extrairTipo(evento.titulo);

  // Nome do assistido — completo, truncado via CSS
  const assistidoNome = evento.assistido || null;

  return (
        <button
          onClick={(e) => { e.stopPropagation(); onEventDoubleClick?.(evento); }}
          onDoubleClick={(e) => { e.stopPropagation(); onEventClick(evento); }}
          className={`group w-full text-left rounded transition-all duration-150 overflow-hidden cursor-pointer relative bg-neutral-50/60 hover:bg-neutral-100/80 ${
            eventoCancelado ? "opacity-40" : ""
          }`}
        >
          {/* Left attribution bar */}
          <div
            className="absolute left-0 top-[3px] bottom-[3px] w-[2px] rounded-r-sm opacity-50"
            style={{ backgroundColor: displayColor }}
          />

          {/* Conteúdo do card */}
          <div className="pl-[9px] pr-1.5 sm:pr-2 py-1 sm:py-1.5">
            {/* Linha 1: horário + tipo + dots */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Status icons */}
              {(evento.status === "cancelado" || evento.status === "cancelada") && (
                <XCircle className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
              )}
              {(evento.status === "remarcado" || evento.status === "redesignado" || evento.status === "reagendada") && (
                <CalendarX2 className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
              )}

              <span
                className={`text-[9px] sm:text-[10px] font-bold tabular-nums shrink-0 ${eventoCancelado ? "line-through" : ""}`}
                style={{ color: displayColor }}
              >
                {evento.horarioInicio}
              </span>

              {/* Tipo — separado por dot sutil */}
              {tipoAbrev && !eventoCancelado && (
                <span className="text-[9px] font-medium text-neutral-400 dark:text-neutral-500 shrink-0 truncate">
                  {tipoAbrev}
                </span>
              )}

              <span className="flex-1" />

              {/* Dot indicators */}
              <span className="hidden sm:flex items-center gap-0.5">
                {temAdvogado && !eventoCancelado && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400/80 shrink-0" title="Advogado constituído" />
                )}
                {!eventoCancelado && evento.prioridade === "urgente" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 shrink-0" title="Urgente" />
                )}
                {hasRegistro && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shrink-0" title="Registro feito" />
                )}
              </span>
            </div>

            {/* Linha 2: nome completo do assistido — truncate via CSS */}
            {assistidoNome && !eventoCancelado ? (
              <p className="hidden sm:block text-[10px] font-medium text-neutral-600 dark:text-neutral-300 truncate leading-tight mt-0.5">
                {assistidoNome}
              </p>
            ) : !eventoCancelado ? (
              <p className="hidden sm:block text-[10px] text-neutral-400 dark:text-neutral-500 truncate leading-tight mt-0.5">
                {abreviarTitulo(evento.titulo)}
              </p>
            ) : null}
          </div>
        </button>
  );
}

// Componente Principal
export function CalendarMonthView({
  eventos,
  currentDate,
  onDateChange,
  onEventClick,
  onDateClick,
  onCreateClick,
  onEditEvento,
  onDeleteEvento,
  onStatusChange,
  onArchiveEvento,
  onEventDoubleClick,
  onOpenModal,
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
      // Empty day: trigger quick-create if available, else fall back to date click
      if (onCreateClick) {
        onCreateClick(date);
      } else {
        onDateClick(date);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
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
          <h2 className="font-serif text-xl font-semibold text-neutral-900 dark:text-neutral-100 capitalize leading-none">
            {format(currentDate, "MMMM", { locale: ptBR })}
          </h2>
          <span className="text-sm text-neutral-400 dark:text-neutral-500 font-normal tabular-nums">
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
      <Card className="overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex-1 min-h-0 flex flex-col">
        {/* Cabeçalho - Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dayName, index) => (
            <div
              key={index}
              className="py-3 text-center text-[9px] font-bold uppercase tracking-wider text-neutral-400"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Corpo - Dias do Mês */}
        <div className="flex-1 min-h-0 grid" style={{ gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))` }}>
          {rows.map((week, weekIndex) => (
            <div
              key={weekIndex}
              className="grid grid-cols-7 min-h-0"
            >
              {week.map((date, dayIndex) => {
                const dayEvents = getEventosForDate(date);
                const isCurrentMonth = isSameMonth(date, monthStart);
                const isDayToday = isToday(date);
                const isWeekendDay = isWeekend(date);
                const isOtherMonth = !isCurrentMonth;
                const hasEvents = dayEvents.length > 0;

                return (
                  <div
                    key={dayIndex}
                    onClick={(e) => handleDayClick(date, e)}
                    className={`
                      group relative min-h-0 overflow-hidden p-1 sm:p-2 transition-all duration-150 cursor-pointer flex flex-col
                      border-r border-b border-neutral-100/60 dark:border-neutral-800/40
                      ${isOtherMonth
                        ? "bg-neutral-50/30 dark:bg-neutral-900/20"
                        : "bg-white dark:bg-neutral-900"
                      }
                      ${isDayToday ? "shadow-[inset_0_0_0_1px_#a1a1aa] dark:shadow-[inset_0_0_0_1px_#525252] z-[1] relative" : ""}
                      ${isCurrentMonth && !isDayToday && "hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30"}
                    `}
                  >
                    {/* Número do Dia */}
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className={`
                          text-xs sm:text-sm w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center
                          ${isDayToday
                            ? "bg-neutral-700 text-white font-semibold"
                            : isOtherMonth
                              ? "text-neutral-300/70 font-normal"
                              : hasEvents
                                ? "text-neutral-600 font-semibold"
                                : "text-neutral-400/80 font-normal"
                          }
                        `}
                      >
                        {format(date, "d")}
                      </span>
                      
                      {/* Badge de contagem */}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Lista de Eventos */}
                    <div className="space-y-1 flex-1 min-h-0 overflow-hidden">
                      {dayEvents.slice(0, 3).map((evento) => (
                        <EventoCompacto
                          key={evento.id}
                          evento={evento}
                          onEventClick={onEventClick}
                          onEditEvento={onEditEvento}
                          onDeleteEvento={onDeleteEvento}
                          onEventDoubleClick={onEventDoubleClick}
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
                        className="mt-1 text-[10px] font-medium text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:underline transition-colors"
                      >
                        Ver todos
                      </button>
                    )}

                    {/* Quick-create ghost placeholder — only on current-month empty days */}
                    {isCurrentMonth && dayEvents.length === 0 && onCreateClick && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded bg-emerald-50/40 dark:bg-emerald-950/20 border border-dashed border-emerald-300/50 dark:border-emerald-700/40 pointer-events-none group-hover:pointer-events-auto">
                        <div className="flex items-center gap-1">
                          <Plus className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Nova audiência</span>
                        </div>
                      </div>
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
        onOpenModal={onOpenModal}
        onEditEvento={onEditEvento}
        onDeleteEvento={onDeleteEvento}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}
