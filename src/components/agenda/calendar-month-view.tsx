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
  isBefore,
  startOfDay,
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
  onDuplicateEvento?: (evento: any) => void;
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

  // Mini-card de 1 linha: horário (bold colorido) + tipo (sutil) + nome (truncado).
  // Caber 3+ cards em min-h-[112px] mesmo em mês de 6 semanas.
  const mainText = assistidoNome || abreviarTitulo(evento.titulo);
  return (
        <button
          onClick={(e) => { e.stopPropagation(); onEventDoubleClick?.(evento); }}
          onDoubleClick={(e) => { e.stopPropagation(); onEventClick(evento); }}
          title={`${evento.horarioInicio}${tipoAbrev ? ` · ${tipoAbrev}` : ""} — ${mainText}`}
          className={`group w-full text-left rounded transition-all duration-150 overflow-hidden cursor-pointer relative bg-neutral-50/60 hover:bg-neutral-100/80 ${
            eventoCancelado ? "opacity-40" : ""
          }`}
        >
          {/* Left attribution bar */}
          <div
            className="absolute left-0 top-[2px] bottom-[2px] w-[2px] rounded-r-sm opacity-60"
            style={{ backgroundColor: displayColor }}
          />

          <div className="pl-[9px] pr-1.5 py-0.5 flex items-center gap-1 sm:gap-1.5 min-w-0">
            {/* Status icons (cancelado / remarcado) */}
            {(evento.status === "cancelado" || evento.status === "cancelada") && (
              <XCircle className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
            )}
            {(evento.status === "remarcado" || evento.status === "redesignado" || evento.status === "reagendada") && (
              <CalendarX2 className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
            )}

            {/* Hora */}
            <span
              className={`text-[10px] font-bold tabular-nums shrink-0 ${eventoCancelado ? "line-through" : ""}`}
              style={{ color: displayColor }}
            >
              {evento.horarioInicio}
            </span>

            {/* Tipo — visível em md+; em sm o espaço é apertado e cede pro nome */}
            {tipoAbrev && !eventoCancelado && (
              <span className="hidden md:inline text-[9px] font-medium text-neutral-400 dark:text-neutral-500 shrink-0">
                {tipoAbrev}
              </span>
            )}

            {/* Nome (ou título abreviado) — toma o espaço restante e trunca */}
            {!eventoCancelado && (
              <span className="hidden sm:inline text-[10px] text-neutral-700 dark:text-neutral-300 truncate flex-1 min-w-0">
                {mainText}
              </span>
            )}

            {/* Dots de status (advogado / urgente / com registro) */}
            <span className="hidden sm:flex items-center gap-0.5 shrink-0">
              {temAdvogado && !eventoCancelado && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400/80" title="Advogado constituído" />
              )}
              {!eventoCancelado && evento.prioridade === "urgente" && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" title="Urgente" />
              )}
              {hasRegistro && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" title="Registro feito" />
              )}
            </span>
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
  onDuplicateEvento,
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
          HEADER DO CALENDÁRIO — compacto
          ========================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDateChange(subMonths(currentDate, 1))}
          className="h-6 w-6 shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        <div className="flex items-baseline gap-1 shrink-0">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 capitalize leading-none">
            {format(currentDate, "MMMM", { locale: ptBR })}
          </h2>
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-normal tabular-nums">
            {format(currentDate, "yyyy")}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDateChange(addMonths(currentDate, 1))}
          className="h-6 w-6 shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDateChange(new Date())}
          className="h-6 px-1.5 text-[10px] shrink-0 rounded-md text-neutral-500 hover:text-neutral-700"
        >
          Hoje
        </Button>

        {/* Extra content: stats por período — empurrados pra direita */}
        {headerRight && (
          <div className="hidden sm:flex flex-1 min-w-0 items-center justify-end gap-2">
            {headerRight}
          </div>
        )}
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
                // Dia anterior a hoje (mesmo dentro do mês corrente). Conteúdo não é
                // mais acionável, então perde peso visual em favor dos dias futuros.
                const isPastDay = !isDayToday && isBefore(date, startOfDay(new Date()));

                return (
                  <div
                    key={dayIndex}
                    onClick={(e) => handleDayClick(date, e)}
                    className={`
                      group relative min-h-[80px] sm:min-h-[112px] lg:min-h-[148px] overflow-hidden p-1 sm:p-2 transition-all duration-150 cursor-pointer flex flex-col
                      border-r border-b border-neutral-100/60 dark:border-neutral-800/40
                      ${isOtherMonth
                        ? "bg-neutral-50/30 dark:bg-neutral-900/20"
                        : isWeekendDay
                          ? "bg-neutral-50/40 dark:bg-neutral-900/30"
                          : "bg-white dark:bg-neutral-900"
                      }
                      ${isPastDay && isCurrentMonth ? "opacity-70" : ""}
                      ${isCurrentMonth && !isDayToday && "hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30"}
                    `}
                  >
                    {/* Número + dots de atribuição + badge "+N" clicável */}
                    <div className="flex items-center gap-1 mb-1 sm:mb-1.5">
                      <span
                        className={`
                          text-xs sm:text-sm w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 relative
                          ${isDayToday
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/40 font-semibold"
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

                      {/* Dots de atribuição: 1 ponto por atribuição única no dia,
                          colorido pelo ATRIBUICAO_COLORS. Máximo 4. */}
                      {hasEvents && (() => {
                        const seen = new Set<string>();
                        const keys: string[] = [];
                        for (const ev of dayEvents) {
                          const k = ev.atribuicaoKey || ev.atribuicao || "CRIMINAL";
                          if (!seen.has(k)) { seen.add(k); keys.push(k); }
                        }
                        return (
                          <div className="flex items-center gap-[3px] min-w-0 flex-1 opacity-80">
                            {keys.slice(0, 4).map((k) => {
                              const c = getAtribuicaoColors(k);
                              return (
                                <span
                                  key={k}
                                  className="w-1 h-1 rounded-full shrink-0"
                                  style={{ backgroundColor: (c as any).color || "#a1a1aa" }}
                                />
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Badge "+N" — único ponto de entrada para a sheet completa
                          do dia. Aparece a partir de 4 eventos (mostramos 3 inline). */}
                      {dayEvents.length > 3 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSheetDate(date);
                          }}
                          className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-colors cursor-pointer shrink-0"
                          title="Ver todos os eventos do dia"
                        >
                          +{dayEvents.length - 3}
                        </button>
                      )}
                    </div>

                    {/* Lista de Eventos — até 3 cards de 1 linha visíveis em todos
                        os breakpoints (cabe folgado em 112px, mesmo em mês de 6 semanas). */}
                    <div className="space-y-0.5 flex-1 min-h-0 overflow-hidden">
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
        onDuplicate={onDuplicateEvento}
      />
    </div>
  );
}
