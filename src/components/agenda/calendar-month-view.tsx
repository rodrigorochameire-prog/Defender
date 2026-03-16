"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DayEventsSheet } from "@/components/agenda/day-events-sheet";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
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
  Scale,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

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

// Extrair tipo de audiência do título, removendo prefixo "ADV"
const extrairTipoDoTitulo = (titulo: string): string => {
  const parts = titulo.split(" - ");
  let tipo = parts[0]?.trim().replace(/^ADV\s*/i, "").trim() || "";
  // Se o primeiro segmento era só "ADV", tentar o segundo segmento
  if (!tipo && parts.length >= 3) {
    tipo = parts[1]?.trim() || "";
  }
  // Tentar abreviar o tipo extraído
  if (tipo) {
    for (const [chave, abrev] of Object.entries({
      "Audiência de Instrução e Julgamento": "AIJ",
      "Instrução e Julgamento": "AIJ",
      "Audiência de Custódia": "Custódia",
      "Audiência de Justificação": "Justificação",
      "Sessão de Julgamento do Tribunal do Júri": "Júri",
      "Sessão do Tribunal do Júri": "Júri",
      "Tribunal do Júri": "Júri",
      "Produção Antecipada de Provas": "PAP",
      "Acordo de Não Persecução Penal": "ANPP",
      "Audiência Admonitória": "Admonitória",
      "Audiência Concentrada": "Concentrada",
      "Audiência de Conciliação": "Conciliação",
    })) {
      if (tipo.includes(chave)) return abrev;
    }
  }
  return tipo || "";
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

  // Advogado constituído (detecta prefixo "ADV" no título)
  const temAdvogado = detectarAdvogadoConstituido(evento.titulo);

  // Tipo de audiência extraído e expandido
  const tipoAbrev = extrairTipoDoTitulo(evento.titulo);
  const tipoCompleto = tipoNomeCompleto[tipoAbrev] || tipoAbrev;

  // Nome do assistido — completo, truncado via CSS
  const assistidoNome = evento.assistido || null;

  // Controlled popover — on mobile, bypass and go directly to event
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <Popover
      open={popoverOpen}
      onOpenChange={(newOpen) => {
        if (newOpen && typeof window !== "undefined" && window.innerWidth < 640) {
          onEventClick(evento);
          return;
        }
        setPopoverOpen(newOpen);
      }}
    >
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={`group w-full text-left rounded-xl transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
            eventoCancelado ? "opacity-45" : ""
          }`}
        >
          {/* Top-bar — fina com fade lateral */}
          <div
            className="h-[2px] w-full rounded-t-xl"
            style={{ background: `linear-gradient(90deg, ${displayColor}, ${displayColor}60)` }}
          />

          {/* Conteúdo do card */}
          <div className="px-1.5 sm:px-2 py-1 sm:py-1.5 bg-white dark:bg-zinc-800/90 border border-t-0 border-zinc-100 dark:border-zinc-700/30 rounded-b-xl group-hover:bg-zinc-50/80 dark:group-hover:bg-zinc-800 transition-colors">
            {/* Linha 1: horário + tipo + dots */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Status icons */}
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

              {/* Tipo — separado por dot sutil */}
              {tipoAbrev && !eventoCancelado && (
                <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 shrink-0 truncate">
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
              <p className="hidden sm:block text-[10px] font-medium text-zinc-600 dark:text-zinc-300 truncate leading-tight mt-0.5">
                {assistidoNome}
              </p>
            ) : !eventoCancelado ? (
              <p className="hidden sm:block text-[10px] text-zinc-400 dark:text-zinc-500 truncate leading-tight mt-0.5">
                {abreviarTitulo(evento.titulo)}
              </p>
            ) : null}
          </div>
        </button>
      </PopoverTrigger>
      
      <PopoverContent
        className="w-[340px] p-0 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl rounded-xl overflow-hidden bg-white dark:bg-zinc-900"
        side="right"
        align="start"
        collisionPadding={16}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Seção 1: Header — tipo + ações ── */}
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: eventoCancelado ? undefined : `${displayColor}15` }}
          >
            <AtribIcon
              className={`w-4 h-4 ${eventoCancelado ? "text-zinc-400 dark:text-zinc-500" : ""}`}
              style={eventoCancelado ? undefined : { color: displayColor }}
            />
          </div>
          <div className="flex-1 min-w-0">
            {eventoCancelado && (
              <div className="flex items-center gap-1.5 mb-0.5">
                {(evento.status === "cancelado" || evento.status === "cancelada") ? (
                  <XCircle className="w-3 h-3 text-rose-500" />
                ) : (
                  <CalendarX2 className="w-3 h-3 text-amber-500" />
                )}
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  {(evento.status === "cancelado" || evento.status === "cancelada") ? "Cancelada" : "Redesignada"}
                </span>
              </div>
            )}
            <h4
              className={`font-semibold text-[13px] leading-tight ${
                eventoCancelado
                  ? "text-zinc-400 dark:text-zinc-500 line-through"
                  : "text-zinc-900 dark:text-zinc-100"
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
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Editar"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDeleteEvento && (
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm("Excluir este evento?")) onDeleteEvento(evento.id); }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Excluir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <PopoverClose
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </PopoverClose>
          </div>
        </div>

        {/* ── Seção 2: Assistido — destaque com fundo ── */}
        {evento.assistido && (
          <div className="mx-3 mb-2 px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 leading-none mb-0.5">Assistido</p>
                {evento.assistidoId ? (
                  <a
                    href={`/admin/assistidos/${evento.assistidoId}`}
                    className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300 hover:underline leading-tight block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {evento.assistido}
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
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
              <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 leading-none mb-0.5">Processo</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate">{evento.processo}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(evento.processo); toast.success("Número copiado!"); }}
                    className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                    title="Copiar"
                  >
                    <Copy className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 leading-none mb-0.5">Horário</p>
              <span className={`text-xs font-semibold ${eventoCancelado ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"}`}>
                {evento.horarioInicio}{evento.horarioFim && ` – ${evento.horarioFim}`}
              </span>
            </div>
          </div>

          {evento.local && (
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 leading-none mb-0.5">Local</p>
                <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate block">{evento.local}</span>
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
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="flex-1 h-9 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onEventClick(evento); }}
            >
              {hasRegistro ? (
                <><ExternalLink className="w-3.5 h-3.5 mr-1.5" />Ver Registro</>
              ) : (
                <><FileText className="w-3.5 h-3.5 mr-1.5" />Registrar</>
              )}
            </Button>
            {onEditEvento && (
              <Button
                size="sm"
                variant="outline"
                className="h-9 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onEditEvento(evento); }}
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
  onCreateClick,
  onEditEvento,
  onDeleteEvento,
  onStatusChange,
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
      // Empty day: trigger quick-create if available, else fall back to date click
      if (onCreateClick) {
        onCreateClick(date);
      } else {
        onDateClick(date);
      }
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
                      group relative min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0
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
                        className="mt-1 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:underline transition-colors"
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
        onEditEvento={onEditEvento}
        onDeleteEvento={onDeleteEvento}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}
