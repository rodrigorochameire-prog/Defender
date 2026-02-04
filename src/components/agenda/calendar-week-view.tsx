"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
} from "lucide-react";
import { toast } from "sonner";
import { getAtribuicaoColors } from "@/lib/config/atribuicoes";

interface CalendarWeekViewProps {
  eventos: any[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick: (evento: any) => void;
  onDateClick: (date: Date) => void;
  onEditEvento?: (evento: any) => void;
  onDeleteEvento?: (id: string) => void;
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
                <XCircle className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
              )}
              {(evento.status === "remarcado" || evento.status === "redesignado") && (
                <CalendarX2 className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
              )}

              {/* Horário */}
              <span
                className={`text-[10px] font-bold shrink-0 ${eventoCancelado ? "line-through" : ""}`}
                style={{ color: displayColor }}
              >
                {evento.horarioInicio}
              </span>

              {/* Indicadores */}
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
                  ? "text-zinc-400 dark:text-zinc-500 line-through"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {evento.titulo}
            </p>

            {/* Assistido */}
            {evento.assistido && (
              <p className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate">
                {evento.assistido}
              </p>
            )}
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[320px] p-0 border-0 shadow-2xl rounded-xl overflow-hidden"
        side="right"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com cor da atribuição */}
        <div className="px-4 py-3" style={{ backgroundColor: `${displayColor}15` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {eventoCancelado && (
                <div className="flex items-center gap-1.5 mb-2">
                  {evento.status === "cancelado" ? (
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <CalendarX2 className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                    {evento.status === "cancelado" ? "Cancelado" : "Redesignado"}
                  </span>
                </div>
              )}

              <h4
                className={`font-bold text-sm leading-tight ${
                  eventoCancelado ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {evento.titulo}
              </h4>

              {evento.assistido && (
                <div className="flex items-center gap-1.5 mt-1">
                  <User className="w-3 h-3 text-zinc-400" />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{evento.assistido}</span>
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
                  <Edit3 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
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
                  <Trash2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="px-4 py-3 space-y-2 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {evento.horarioInicio}
              {evento.horarioFim && ` - ${evento.horarioFim}`}
            </span>
          </div>

          {evento.local && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{evento.local}</span>
            </div>
          )}

          {evento.processo && (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate">
                {evento.processo}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(evento.processo);
                  toast.success("Número copiado!");
                }}
                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Copy className="w-3 h-3 text-zinc-400" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <Button
            size="sm"
            className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(evento);
            }}
          >
            <ExternalLink className="w-3 h-3 mr-1.5" />
            {hasRegistro ? "Ver Detalhes" : "Registrar"}
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
  onEditEvento,
  onDeleteEvento,
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDateChange(subWeeks(currentDate, 1))}
            className="h-9 w-9"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="text-center min-w-[220px]">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {format(weekStart, "d", { locale: ptBR })} -{" "}
              {format(weekEnd, "d 'de' MMMM", { locale: ptBR })}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {stats.total} eventos · {stats.urgentes > 0 && `${stats.urgentes} urgentes`}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDateChange(addWeeks(currentDate, 1))}
            className="h-9 w-9"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())} className="h-9">
          Hoje
        </Button>
      </div>

      {/* Grade da Semana */}
      <Card className="overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {/* Header com dias da semana */}
        <div className="grid grid-cols-8 border-b border-zinc-200 dark:border-zinc-800">
          {/* Coluna de horários */}
          <div className="w-16 py-3 text-center text-xs font-medium text-zinc-400 border-r border-zinc-200 dark:border-zinc-800">
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
                className={`py-3 text-center border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 ${
                  isWeekendDay ? "bg-zinc-50/50 dark:bg-zinc-900/50" : ""
                }`}
              >
                <p
                  className={`text-xs font-medium uppercase ${
                    isWeekendDay ? "text-zinc-400" : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {format(day, "EEE", { locale: ptBR })}
                </p>
                <div
                  className={`inline-flex items-center justify-center w-8 h-8 mt-1 rounded-full text-sm font-semibold ${
                    isDayToday
                      ? "bg-emerald-600 text-white"
                      : isWeekendDay
                        ? "text-zinc-400"
                        : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {format(day, "d")}
                </div>
                {eventCount > 0 && (
                  <p className="text-[10px] text-zinc-400 mt-0.5">{eventCount} evento{eventCount > 1 && "s"}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Corpo com horários e eventos */}
        <div className="max-h-[600px] overflow-y-auto">
          {/* Seção "Dia inteiro" */}
          <div className="grid grid-cols-8 border-b border-zinc-200 dark:border-zinc-800 min-h-[40px]">
            <div className="w-16 px-2 py-2 text-[10px] text-zinc-400 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              Dia todo
            </div>
            {weekDays.map((day, index) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const allDayEvents = eventosPorDia[dateStr]?.filter((e) => !e.horarioInicio) || [];

              return (
                <div
                  key={index}
                  className={`p-1 border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 ${
                    isWeekend(day) ? "bg-zinc-50/50 dark:bg-zinc-900/50" : ""
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
            <div key={hora} className="grid grid-cols-8 border-b border-zinc-100 dark:border-zinc-800/50 min-h-[60px]">
              {/* Coluna de horário */}
              <div className="w-16 px-2 py-1 text-[10px] text-zinc-400 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
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

                return (
                  <div
                    key={dayIndex}
                    className={`relative p-0.5 border-r border-zinc-100 dark:border-zinc-800/50 last:border-r-0 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors ${
                      isWeekend(day) ? "bg-zinc-50/30 dark:bg-zinc-900/30" : ""
                    } ${isToday(day) ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""}`}
                    onClick={() => onDateClick(day)}
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
