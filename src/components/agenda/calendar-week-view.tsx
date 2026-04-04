"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
  isWeekend,
  parseISO,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Gavel,
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
  XCircle,
  CalendarX2,
  Edit3,
  Trash2,
  ExternalLink,
  User,
  Copy,
  Plus,
  Scale,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getAtribuicaoColors } from "@/lib/config/atribuicoes";

interface CalendarWeekViewProps {
  eventos: any[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick: (evento: any) => void;
  onDateClick: (date: Date) => void;
  onCreateClick?: (date: Date, hour: number) => void;
  onEditEvento?: (evento: any) => void;
  onDeleteEvento?: (id: string) => void;
  /** Extra content rendered in the header (e.g. defensor avatars) */
  headerRight?: React.ReactNode;
}

// Ícones por tipo/atribuição
const atribuicaoIcons: Record<string, any> = {
  "Tribunal do Júri": Gavel,
  "Grupo Especial do Júri": Gavel,
  "Violência Doméstica": Home,
  "Execução Penal": Lock,
  "Criminal Geral": Folder,
  Substituição: RefreshCw,
  "Curadoria Especial": Shield,
};

// Verifica se o evento não ocorrerá (cancelado ou redesignado)
const isEventoCancelado = (status: string) =>
  status === "cancelado" || status === "cancelada" ||
  status === "remarcado" || status === "redesignado" || status === "reagendada";

// Cor neutra para eventos que não ocorrerão
const COR_EVENTO_CANCELADO = "#a1a1aa";

// Detectar "ADV" (advogado constituído) no prefixo do título
const detectarAdvogadoConstituido = (titulo: string): boolean => {
  const tipoRaw = titulo.split(" - ")[0]?.trim() || "";
  return /^ADV\b/i.test(tipoRaw);
};

// Extrair tipo de audiência do título, removendo prefixo "ADV"
const extrairTipoDoTitulo = (titulo: string): string => {
  const parts = titulo.split(" - ");
  if (parts.length >= 2) {
    return parts[0].trim().replace(/^ADV\s+/i, "");
  }
  return titulo.replace(/^ADV\s+/i, "");
};

// Mapa de abreviações → nome completo (tipo de audiência)
const tipoNomeCompleto: Record<string, string> = {
  "AIJ": "Instrução e Julgamento",
  "Júri": "Sessão do Tribunal do Júri",
  "Custódia": "Audiência de Custódia",
  "Justificação": "Audiência de Justificação",
  "PAP": "Produção Antecipada de Provas",
  "ANPP": "Acordo de Não Persecução Penal",
  "Admonitória": "Audiência Admonitória",
  "Concentrada": "Audiência Concentrada",
  "Conciliação": "Audiência de Conciliação",
};

// Horários do dia (6h às 22h)
const HORAS_DIA = Array.from({ length: 17 }, (_, i) => i + 6);

// Componente de Evento na Semana
function EventoSemana({
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
  const eventoCancelado = isEventoCancelado(evento.status);
  const displayColor = eventoCancelado ? COR_EVENTO_CANCELADO : solidColor;
  const hasRegistro = !!evento.registro;

  // Advogado constituído (detecta prefixo "ADV" no título)
  const temAdvogado = detectarAdvogadoConstituido(evento.titulo);

  // Tipo de audiência extraído e expandido
  const tipoAbrev = extrairTipoDoTitulo(evento.titulo);
  const tipoCompleto = tipoNomeCompleto[tipoAbrev] || tipoAbrev;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={`w-full text-left rounded-md transition-all duration-200 hover:shadow-md overflow-hidden group ${
            eventoCancelado ? "opacity-60" : ""
          }`}
          style={{
            backgroundColor: `${displayColor}20`,
            borderLeft: `3px solid ${displayColor}`,
          }}
        >
          <div className="px-2 py-1">
            <div className="flex items-center gap-1">
              {/* Ícone de cancelado/redesignado */}
              {evento.status === "cancelado" && (
                <XCircle className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
              )}
              {(evento.status === "remarcado" || evento.status === "redesignado") && (
                <CalendarX2 className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
              )}

              {/* Horário */}
              <span
                className={`text-[10px] font-bold shrink-0 ${eventoCancelado ? "line-through" : ""}`}
                style={{ color: displayColor }}
              >
                {evento.horarioInicio}
              </span>

              {/* Indicadores */}
              {temAdvogado && !eventoCancelado && (
                <Scale className="w-2.5 h-2.5 text-rose-500 shrink-0" />
              )}
              {!eventoCancelado && evento.prioridade === "urgente" && (
                <AlertTriangle className="w-2.5 h-2.5 text-red-500 shrink-0" />
              )}
              {hasRegistro && (
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
              )}
            </div>

            {/* Título */}
            <p
              className={`text-[10px] font-medium truncate leading-tight ${
                eventoCancelado
                  ? "text-neutral-400 dark:text-neutral-500 line-through"
                  : "text-neutral-700 dark:text-neutral-300"
              }`}
            >
              {evento.titulo.replace(/^ADV\s+/i, "")}
            </p>

            {/* Assistido */}
            {evento.assistido && (
              <p className="text-[9px] text-neutral-500 dark:text-neutral-400 truncate">
                {evento.assistido}
              </p>
            )}
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[320px] p-0 border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xl rounded-xl overflow-hidden bg-white dark:bg-neutral-900"
        side="right"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Seção 1: Header — tipo + ações ── */}
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
          {(() => {
            const AtribIcon = atribuicaoIcons[evento.atribuicao] || Folder;
            return (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: eventoCancelado ? undefined : `${displayColor}15` }}
              >
                <AtribIcon
                  className={`w-4 h-4 ${eventoCancelado ? "text-neutral-400 dark:text-neutral-500" : ""}`}
                  style={eventoCancelado ? undefined : { color: displayColor }}
                />
              </div>
            );
          })()}
          <div className="flex-1 min-w-0">
            {eventoCancelado && (
              <div className="flex items-center gap-1.5 mb-0.5">
                {(evento.status === "cancelado" || evento.status === "cancelada") ? (
                  <XCircle className="w-3 h-3 text-rose-500" />
                ) : (
                  <CalendarX2 className="w-3 h-3 text-amber-500" />
                )}
                <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                  {(evento.status === "cancelado" || evento.status === "cancelada") ? "Cancelada" : "Redesignada"}
                </span>
              </div>
            )}
            <h4
              className={`font-semibold text-[13px] leading-tight ${
                eventoCancelado
                  ? "text-neutral-400 dark:text-neutral-500 line-through"
                  : "text-neutral-900 dark:text-neutral-100"
              }`}
            >
              {tipoCompleto}
            </h4>
            {temAdvogado && !eventoCancelado && (
              <div className="flex items-center gap-1 mt-1">
                <Scale className="w-3 h-3 text-rose-500" />
                <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                  Advogado constituído
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {onEditEvento && (
              <button
                onClick={(e) => { e.stopPropagation(); onEditEvento(evento); }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Editar"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDeleteEvento && (
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm("Excluir este evento?")) onDeleteEvento(evento.id); }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Excluir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <PopoverClose
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </PopoverClose>
          </div>
        </div>

        {/* ── Seção 2: Assistido — destaque com fundo ── */}
        {evento.assistido && (
          <div className="mx-3 mb-2 px-3 py-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-neutral-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 leading-none mb-0.5">Assistido</p>
                {evento.assistidoId ? (
                  <a
                    href={`/admin/assistidos/${evento.assistidoId}`}
                    className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:text-neutral-600 dark:hover:text-neutral-300 hover:underline leading-tight block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {evento.assistido}
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
                    {evento.assistido}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Seção 3: Dados — processo, horário, local ── */}
        <div className="px-4 pt-1 pb-3 space-y-2">
          {evento.processo && (
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-neutral-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 leading-none mb-0.5">Processo</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-neutral-700 dark:text-neutral-300 truncate">{evento.processo}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(evento.processo); toast.success("Número copiado!"); }}
                    className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                    title="Copiar"
                  >
                    <Copy className="w-3 h-3 text-neutral-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 leading-none mb-0.5">Horário</p>
              <span className={`text-xs font-semibold ${eventoCancelado ? "text-neutral-400 line-through" : "text-neutral-900 dark:text-neutral-100"}`}>
                {evento.horarioInicio}{evento.horarioFim && ` – ${evento.horarioFim}`}
              </span>
            </div>
          </div>

          {evento.local && (
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 leading-none mb-0.5">Local</p>
                <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate block">{evento.local}</span>
              </div>
            </div>
          )}

          {hasRegistro && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Registro documentado</span>
            </div>
          )}
        </div>

        {/* ── Seção 4: Footer ── */}
        <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800/50">
          <Button
            size="sm"
            className="w-full h-8 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onEventClick(evento); }}
          >
            {hasRegistro ? (
              <><ExternalLink className="w-3 h-3 mr-1.5" />Ver Registro</>
            ) : (
              <><FileText className="w-3 h-3 mr-1.5" />Registrar</>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Componente Principal
export function CalendarWeekView({
  eventos,
  currentDate,
  onDateChange,
  onEventClick,
  onDateClick,
  onCreateClick,
  onEditEvento,
  onDeleteEvento,
  headerRight,
}: CalendarWeekViewProps) {
  // Calcular dias da semana
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Agrupar eventos por dia
  const eventosPorDia = useMemo(() => {
    const grouped: Record<string, any[]> = {};

    weekDays.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      grouped[dateStr] = eventos.filter((evento) => evento.data === dateStr);
    });

    return grouped;
  }, [eventos, weekDays]);

  // Função para obter posição vertical do evento baseado no horário
  const getEventPosition = (horarioInicio: string) => {
    if (!horarioInicio) return { top: 0, height: 60 };

    const [hours, minutes] = horarioInicio.split(":").map(Number);
    const startMinutes = (hours - 6) * 60 + minutes; // 6h é o início
    const top = (startMinutes / 60) * 60; // 60px por hora

    return { top: Math.max(0, top), height: 50 };
  };

  // Calcular estatísticas da semana
  const stats = useMemo(() => {
    let total = 0;
    let cancelados = 0;
    let urgentes = 0;

    Object.values(eventosPorDia).forEach((eventosdia) => {
      eventosdia.forEach((evento) => {
        total++;
        if (isEventoCancelado(evento.status)) cancelados++;
        if (evento.prioridade === "urgente") urgentes++;
      });
    });

    return { total, cancelados, urgentes };
  }, [eventosPorDia]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDateChange(subWeeks(currentDate, 1))}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="text-center min-w-[200px]">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {format(weekStart, "d", { locale: ptBR })} -{" "}
              {format(weekEnd, "d 'de' MMMM", { locale: ptBR })}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {stats.total} eventos{stats.urgentes > 0 ? ` · ${stats.urgentes} urgentes` : ""}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDateChange(addWeeks(currentDate, 1))}
            className="h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Optional extra content (defensor avatars, etc.) */}
        {headerRight && (
          <div className="flex-1 min-w-0 flex items-center justify-end">
            {headerRight}
          </div>
        )}

        <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())} className="h-7 text-xs shrink-0">
          Hoje
        </Button>
      </div>

      {/* Grade da Semana */}
      <Card className="overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {/* Header com dias da semana */}
        <div className="grid grid-cols-8 border-b border-neutral-200 dark:border-neutral-800">
          {/* Coluna de horários */}
          <div className="w-16 py-3 text-center text-xs font-medium text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
            <Clock className="w-4 h-4 mx-auto" />
          </div>

          {/* Dias da semana */}
          {weekDays.map((day, index) => {
            const isDayToday = isToday(day);
            const isWeekendDay = isWeekend(day);
            const eventCount = eventosPorDia[format(day, "yyyy-MM-dd")]?.length || 0;

            return (
              <div
                key={index}
                className={`py-3 text-center border-r border-neutral-200 dark:border-neutral-800 last:border-r-0 ${
                  isWeekendDay ? "bg-neutral-50/50 dark:bg-neutral-900/50" : ""
                }`}
              >
                <p
                  className={`text-xs font-medium uppercase ${
                    isWeekendDay ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  {format(day, "EEE", { locale: ptBR })}
                </p>
                <div
                  className={`inline-flex items-center justify-center w-8 h-8 mt-1 rounded-full text-sm font-semibold ${
                    isDayToday
                      ? "bg-emerald-600 text-white"
                      : isWeekendDay
                        ? "text-neutral-400"
                        : "text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {format(day, "d")}
                </div>
                {eventCount > 0 && (
                  <p className="text-[10px] text-neutral-400 mt-0.5">{eventCount} evento{eventCount > 1 && "s"}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Corpo com horários e eventos */}
        <div className="max-h-[600px] overflow-y-auto">
          {/* Seção "Dia inteiro" */}
          <div className="grid grid-cols-8 border-b border-neutral-200 dark:border-neutral-800 min-h-[40px]">
            <div className="w-16 px-2 py-2 text-[10px] text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
              Dia todo
            </div>
            {weekDays.map((day, index) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const allDayEvents = eventosPorDia[dateStr]?.filter((e) => !e.horarioInicio) || [];

              return (
                <div
                  key={index}
                  className={`p-1 border-r border-neutral-200 dark:border-neutral-800 last:border-r-0 ${
                    isWeekend(day) ? "bg-neutral-50/50 dark:bg-neutral-900/50" : ""
                  }`}
                  onClick={() => onDateClick(day)}
                >
                  {allDayEvents.map((evento) => (
                    <EventoSemana
                      key={evento.id}
                      evento={evento}
                      onEventClick={onEventClick}
                      onEditEvento={onEditEvento}
                      onDeleteEvento={onDeleteEvento}
                    />
                  ))}
                </div>
              );
            })}
          </div>

          {/* Grade de horários */}
          {HORAS_DIA.map((hora) => (
            <div key={hora} className="grid grid-cols-8 border-b border-neutral-100 dark:border-neutral-800/50 min-h-[60px]">
              {/* Coluna de horário */}
              <div className="w-16 px-2 py-1 text-[10px] text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
                {String(hora).padStart(2, "0")}:00
              </div>

              {/* Células dos dias */}
              {weekDays.map((day, dayIndex) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const eventosHora = eventosPorDia[dateStr]?.filter((evento) => {
                  if (!evento.horarioInicio) return false;
                  const [h] = evento.horarioInicio.split(":").map(Number);
                  return h === hora;
                }) || [];
                const isEmpty = eventosHora.length === 0;

                return (
                  <div
                    key={dayIndex}
                    className={`group relative p-0.5 border-r border-neutral-100 dark:border-neutral-800/50 last:border-r-0 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors ${
                      isWeekend(day) ? "bg-neutral-50/30 dark:bg-neutral-900/30" : ""
                    } ${isToday(day) ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""}`}
                    onClick={() => {
                      if (isEmpty && onCreateClick) {
                        onCreateClick(day, hora);
                      } else {
                        onDateClick(day);
                      }
                    }}
                  >
                    <div className="space-y-0.5">
                      {eventosHora.map((evento) => (
                        <EventoSemana
                          key={evento.id}
                          evento={evento}
                          onEventClick={onEventClick}
                          onEditEvento={onEditEvento}
                          onDeleteEvento={onDeleteEvento}
                        />
                      ))}
                    </div>
                    {/* Quick-create ghost placeholder on empty slots */}
                    {isEmpty && onCreateClick && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded bg-emerald-50/30 dark:bg-emerald-950/20 border border-dashed border-emerald-300/50 dark:border-emerald-700/40">
                        <div className="flex items-center gap-0.5">
                          <Plus className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1">Nova audiência</span>
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
    </div>
  );
}
