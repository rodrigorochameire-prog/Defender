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
          "w-11 h-11 rounded-full shadow-lg",
          "bg-zinc-900 dark:bg-zinc-700 text-white",
          "hover:bg-emerald-600 dark:hover:bg-emerald-600",
          "transition-all duration-200 active:scale-95",
          "bottom-[5.5rem] right-4 sm:bottom-6 sm:right-6",
          "cursor-pointer"
        )}
        title="Abrir agenda rápida"
      >
        <Calendar className="w-5 h-5" />
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
          "absolute bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col",
          // Mobile: full screen with small margin
          "inset-2 rounded-2xl",
          // Desktop: right panel
          "sm:inset-auto sm:top-3 sm:right-3 sm:bottom-3 sm:w-[420px] sm:rounded-2xl",
        )}
        style={{ animation: "fadeInRight 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                Agenda Rápida
              </h2>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {todayCount > 0
                  ? `${todayCount} evento${todayCount > 1 ? "s" : ""} hoje`
                  : "Nenhum evento hoje"
                }
                {" · "}{allEvents.length} próximos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/agenda"
              onClick={onClose}
              className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1"
            >
              Abrir completa
              <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
            </div>
          ) : allEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <Calendar className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Nenhum evento agendado
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Próximos 30 dias sem compromissos
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {Array.from(grouped.entries()).map(([dateKey, events]) => {
                const dayLabel = getDayLabel(dateKey);
                const isCurrentDay = isToday(new Date(dateKey + "T12:00:00"));

                return (
                  <div key={dateKey}>
                    {/* Day header */}
                    <div
                      className={cn(
                        "px-5 py-2 sticky top-0 z-10",
                        isCurrentDay
                          ? "bg-emerald-50/80 dark:bg-emerald-950/20"
                          : "bg-zinc-50/80 dark:bg-zinc-800/30",
                        "backdrop-blur-sm"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "text-[11px] font-bold uppercase tracking-wider",
                            isCurrentDay
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-zinc-500 dark:text-zinc-400"
                          )}
                        >
                          {dayLabel}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                          {events.length} evento{events.length > 1 ? "s" : ""}
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

        {/* Footer */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-3">
          <Link
            href="/admin/agenda"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            Ver agenda completa
            <ChevronRight className="w-3 h-3 opacity-50" />
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
        "px-5 py-2.5 flex items-start gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group",
        isPast && "opacity-50"
      )}
    >
      {/* Time + color indicator */}
      <div className="flex flex-col items-center gap-1 pt-0.5 min-w-[44px]">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        {event.hora ? (
          <span className="text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-300">
            {event.hora}
          </span>
        ) : (
          <span className="text-[10px] text-zinc-400">dia todo</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isAudiencia && (
            <Gavel className="w-3 h-3 text-amber-500 flex-shrink-0" />
          )}
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
            {event.titulo}
          </p>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
          {event.assistido && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
              <User className="w-2.5 h-2.5" />
              {event.assistido}
            </span>
          )}
          {event.processo && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
              <FileText className="w-2.5 h-2.5" />
              {event.processo.length > 20
                ? event.processo.slice(0, 20) + "..."
                : event.processo}
            </span>
          )}
          {event.local && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
              <MapPin className="w-2.5 h-2.5" />
              {event.local.length > 25
                ? event.local.slice(0, 25) + "..."
                : event.local}
            </span>
          )}
        </div>
      </div>

      {/* Relative time badge */}
      <div className="flex-shrink-0 pt-0.5">
        <span
          className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
            isPast
              ? "text-zinc-400 bg-zinc-100 dark:bg-zinc-800"
              : isToday(event.dataHora)
                ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30"
                : "text-zinc-500 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800"
          )}
        >
          {relTime}
        </span>
      </div>
    </div>
  );
}
