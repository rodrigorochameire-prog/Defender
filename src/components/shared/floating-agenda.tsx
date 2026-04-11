"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  X,
  ChevronRight,
  Gavel,
  CalendarDays,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  format,
  isToday,
  isTomorrow,
  startOfDay,
  endOfDay,
  addDays,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// Atribuição colors (subset from main config)
const ATRIBUICAO_COLORS: Record<string, string> = {
  JURI: "#f59e0b",
  VVD: "#ef4444",
  EXECUCAO: "#8b5cf6",
  SUBSTITUICAO: "#3b82f6",
  SUBSTITUICAO_CIVEL: "#06b6d4",
  CRIMINAL: "#3b82f6",
};

function getAtribuicaoColor(atribuicao?: string | null): string {
  if (!atribuicao) return "#71717a";
  return ATRIBUICAO_COLORS[atribuicao] || "#71717a";
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMin = differenceInMinutes(date, now);
  const diffHrs = differenceInHours(date, now);
  const diffDays = differenceInDays(startOfDay(date), startOfDay(now));

  if (diffMin < 0) return "agora";
  if (diffMin < 60) return `em ${diffMin}min`;
  if (diffHrs < 24) return `em ${diffHrs}h`;
  if (diffDays === 1) return "amanhã";
  if (diffDays < 7) return `em ${diffDays} dias`;
  return format(date, "dd/MM", { locale: ptBR });
}

// Group events by day
function groupByDay(events: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  for (const evt of events) {
    const date = evt.dataHora instanceof Date ? evt.dataHora : new Date(evt.dataHora);
    const key = format(date, "yyyy-MM-dd");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(evt);
  }
  return groups;
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

// ============================================
// FLOATING BUTTON
// ============================================

export function FloatingAgendaButton() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Don't show on the agenda page itself
  if (pathname === "/admin/agenda") return null;

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed z-[51] flex items-center justify-center",
          "w-10 h-10 rounded-2xl shadow-md shadow-black/[0.08]",
          "bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm",
          "text-neutral-600 dark:text-neutral-300",
          "ring-1 ring-black/[0.06] dark:ring-white/[0.08]",
          "hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 hover:ring-emerald-300/30 dark:hover:ring-emerald-500/20",
          "transition-all duration-200 active:scale-95",
          "bottom-[5.5rem] right-4 sm:bottom-6 sm:right-6",
          "cursor-pointer"
        )}
        title="Abrir agenda rápida"
      >
        <Calendar className="w-4.5 h-4.5" />
      </button>

      {/* Sheet */}
      {isOpen && <AgendaQuickSheet onClose={() => setIsOpen(false)} />}
    </>
  );
}

// ============================================
// AGENDA QUICK SHEET
// ============================================

function AgendaQuickSheet({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const start = startOfDay(now).toISOString();
  const end = endOfDay(addDays(now, 30)).toISOString();

  // Fetch calendar events (next 30 days)
  const { data: calendarData, isLoading: isLoadingCalendar } =
    trpc.calendar.list.useQuery({ start, end });

  // Fetch audiencias (next 30 days)
  const { data: audienciasData, isLoading: isLoadingAudiencias } =
    trpc.audiencias.proximas.useQuery({ dias: 30, limite: 50 });

  const isLoading = isLoadingCalendar || isLoadingAudiencias;

  // Merge and sort all events
  const allEvents = useMemo(() => {
    const events: any[] = [];

    // Calendar events (flat shape: ...event spread + processo + assistido)
    if (calendarData) {
      for (const item of calendarData) {
        const evtDate = new Date(item.eventDate);
        // Extract time from timestamp (if not midnight, it has a specific time)
        const hasTime = evtDate.getHours() !== 0 || evtDate.getMinutes() !== 0;
        events.push({
          id: `cal-${item.id}`,
          type: "calendar",
          titulo: item.title,
          dataHora: evtDate,
          hora: hasTime ? format(evtDate, "HH:mm") : null,
          local: item.location || null,
          assistido: item.assistido?.nome || null,
          processo: item.processo?.numeroAutos || null,
          atribuicao: item.processo?.atribuicao || null,
          status: item.status || "pendente",
          tipoEvento: item.eventType || null,
        });
      }
    }

    // Audiencias
    if (audienciasData) {
      for (const aud of audienciasData) {
        events.push({
          id: `aud-${aud.id}`,
          type: "audiencia",
          titulo: aud.titulo || `Audiência - ${aud.tipo || ""}`,
          dataHora: new Date(aud.dataHora),
          hora: format(new Date(aud.dataHora), "HH:mm"),
          local: aud.local || null,
          assistido: aud.assistido?.nome || null,
          processo: aud.processo?.numero || null,
          atribuicao: aud.processo?.atribuicao || null,
          status: aud.status || "pendente",
          tipoEvento: aud.tipo || "audiencia",
        });
      }
    }

    // Sort by date
    events.sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime());

    // Filter out past events (keep today's)
    const todayStart = startOfDay(now);
    return events.filter((e) => e.dataHora >= todayStart);
  }, [calendarData, audienciasData]);

  const grouped = groupByDay(allEvents);
  const todayCount = grouped.get(format(now, "yyyy-MM-dd"))?.length || 0;

  return createPortal(
    <div className="fixed inset-0 z-[999]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />

      {/* Panel — right side on desktop, full on mobile */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute bg-white dark:bg-neutral-900 shadow-xl shadow-black/[0.06] overflow-hidden flex flex-col border border-neutral-200/60 dark:border-neutral-800/60",
          "inset-2 rounded-xl",
          "sm:inset-auto sm:top-3 sm:right-3 sm:bottom-3 sm:w-[380px] sm:rounded-xl",
        )}
        style={{ animation: "fadeInRight 0.2s ease-out" }}
      >
        {/* Header — clean, minimal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800/60">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
            <div>
              <h2 className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200 tracking-tight">
                Agenda
              </h2>
              <p className="text-[9px] text-neutral-400 dark:text-neutral-500 tabular-nums">
                {todayCount > 0
                  ? `${todayCount} hoje`
                  : "Nenhum hoje"
                }
                {" · "}{allEvents.length} próximos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/admin/agenda"
              onClick={onClose}
              className="h-7 px-2.5 rounded-md text-[10px] text-neutral-500 dark:text-neutral-400 font-medium flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Abrir
              <ExternalLink className="w-2.5 h-2.5" />
            </Link>
            <button
              onClick={onClose}
              className="h-7 w-7 flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
            </div>
          ) : allEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <Calendar className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Nenhum evento agendado
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                Próximos 30 dias sem compromissos
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {Array.from(grouped.entries()).map(([dateKey, events]) => {
                const dayLabel = getDayLabel(dateKey);
                const isCurrentDay = isToday(new Date(dateKey + "T12:00:00"));

                return (
                  <div key={dateKey}>
                    {/* Day header — clean sticky */}
                    <div className="px-5 py-2 sticky top-0 z-10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-[2px]">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          isCurrentDay ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400 dark:text-neutral-500"
                        )}>
                          {dayLabel}
                        </span>
                        <span className="text-[9px] text-neutral-300 dark:text-neutral-600 tabular-nums">
                          {events.length}
                        </span>
                      </div>
                    </div>

                    {/* Events */}
                    <div className="py-1">
                      {events.map((evt: any) => (
                        <EventRow key={evt.id} event={evt} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — subtle */}
        <div className="border-t border-neutral-100 dark:border-neutral-800/60 px-5 py-2.5">
          <Link
            href="/admin/agenda"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[10px] font-medium text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
          >
            <Calendar className="w-3 h-3" />
            Ver agenda completa
            <ChevronRight className="w-2.5 h-2.5 opacity-40" />
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ============================================
// EVENT ROW
// ============================================

function EventRow({ event }: { event: any }) {
  const color = getAtribuicaoColor(event.atribuicao);
  const relTime = formatRelativeTime(event.dataHora);
  const isPast = event.dataHora < new Date();
  const isAudiencia = event.type === "audiencia";

  return (
    <div
      className={cn(
        "mx-3 mb-1 px-3 py-2.5 rounded-lg flex items-start gap-3 transition-colors",
        "hover:bg-neutral-50 dark:hover:bg-neutral-800/40",
        "border-l-2",
        isPast && "opacity-40"
      )}
      style={{ borderLeftColor: color }}
    >
      {/* Hora */}
      <div className="min-w-[38px] pt-px">
        {event.hora ? (
          <span className="text-[12px] font-mono font-bold text-neutral-800 dark:text-neutral-200 tabular-nums">
            {event.hora}
          </span>
        ) : (
          <span className="text-[9px] text-neutral-400 uppercase">dia todo</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 truncate leading-tight">
          {isAudiencia && <Gavel className="w-3 h-3 text-amber-500 inline mr-1 -mt-px" />}
          {event.titulo}
        </p>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0 mt-1">
          {event.assistido && (
            <span className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
              <User className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate max-w-[120px]">{event.assistido}</span>
            </span>
          )}
          {event.processo && (
            <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-mono tabular-nums truncate max-w-[140px]">
              {event.processo}
            </span>
          )}
          {event.local && (
            <span className="flex items-center gap-1 text-[9px] text-neutral-400 dark:text-neutral-500">
              <MapPin className="w-2 h-2 shrink-0" />
              <span className="truncate max-w-[100px]">{event.local}</span>
            </span>
          )}
        </div>
      </div>

      {/* Relative time — clean text */}
      <span className={cn(
        "text-[9px] font-medium tabular-nums shrink-0 pt-0.5",
        isPast ? "text-neutral-300 dark:text-neutral-600"
          : isToday(event.dataHora) ? "text-emerald-600 dark:text-emerald-400"
          : "text-neutral-400 dark:text-neutral-500"
      )}>
        {relTime}
      </span>
    </div>
  );
}
