"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  Calendar,
  User,
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

// Atribuição palette — Padrão Defender v5
// Júri=emerald-600, VVD=amber-500, EP=sky-600, Criminal/Subst=zinc-700
const JURI  = { bar: "#059669", tint: "#05966910", time: "#047857" }; // emerald-600
const VVD   = { bar: "#f59e0b", tint: "#f59e0b10", time: "#b45309" }; // amber-500
const EP    = { bar: "#0284c7", tint: "#0284c710", time: "#0369a1" }; // sky-600
const ZINC  = { bar: "#3f3f46", tint: "#3f3f4610", time: "#52525b" }; // zinc-700

const ATRIBUICAO_COLORS: Record<string, typeof JURI> = {
  JURI_CAMACARI:              JURI,
  GRUPO_JURI:                 JURI,
  VVD_CAMACARI:               VVD,
  EXECUCAO_PENAL:             EP,
  CRIMINAL_CAMACARI:          ZINC,
  CRIMINAL_SIMOES_FILHO:      ZINC,
  CRIMINAL_LAURO_DE_FREITAS:  ZINC,
  CRIMINAL_CANDEIAS:          ZINC,
  CRIMINAL_ITAPARICA:         ZINC,
  SUBSTITUICAO:               ZINC,
  SUBSTITUICAO_CIVEL:         ZINC,
};

const DEFAULT_COLOR = { bar: "#a1a1aa", tint: "#a1a1aa10", time: "#52525b" };

function getAtribuicaoColor(atribuicao?: string | null) {
  if (!atribuicao) return DEFAULT_COLOR;
  return ATRIBUICAO_COLORS[atribuicao] || DEFAULT_COLOR;
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

export function AgendaQuickSheet({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const start = startOfDay(now).toISOString();
  const end = endOfDay(addDays(now, 30)).toISOString();

  // Fetch calendar events (next 30 days)
  const { data: calendarData, isLoading: isLoadingCalendar } =
    trpc.calendar.list.useQuery({ start, end }, { staleTime: 0, refetchOnMount: "always" });

  // Fetch audiencias (next 30 days) — sem limite artificial baixo
  const { data: audienciasData, isLoading: isLoadingAudiencias } =
    trpc.audiencias.proximas.useQuery(
      { dias: 30, limite: 200 },
      { staleTime: 0, refetchOnMount: "always" }
    );

  const isLoading = isLoadingCalendar || isLoadingAudiencias;

  // Merge and sort all events
  const allEvents = useMemo(() => {
    const events: any[] = [];

    // Audiencias PRIMEIRO — são a fonte de verdade.
    // PJe grava hora local rotulada como UTC; reinterpretar UTC como local.
    const audKeys = new Set<string>();
    if (audienciasData) {
      for (const aud of audienciasData) {
        const raw = new Date(aud.dataHora);
        const dataHora = new Date(
          raw.getUTCFullYear(),
          raw.getUTCMonth(),
          raw.getUTCDate(),
          raw.getUTCHours(),
          raw.getUTCMinutes(),
          raw.getUTCSeconds()
        );
        events.push({
          id: `aud-${aud.id}`,
          type: "audiencia",
          titulo: aud.titulo || `Audiência - ${aud.tipo || ""}`,
          dataHora,
          hora: format(dataHora, "HH:mm"),
          local: aud.local || null,
          assistido: aud.assistido?.nome || null,
          processo: aud.processo?.numero || null,
          atribuicao: aud.processo?.atribuicao || null,
          status: aud.status || "pendente",
          tipoEvento: aud.tipo || "audiencia",
        });
        if (aud.processo?.numero) {
          audKeys.add(`${aud.processo.numero}|${format(dataHora, "yyyy-MM-dd")}`);
        }
      }
    }

    // Calendar events — pular duplicatas (mesmo processo, mesmo dia que já tem audiência)
    if (calendarData) {
      for (const item of calendarData) {
        const evtDate = new Date(item.eventDate);
        const procNum = item.processo?.numeroAutos;
        if (procNum) {
          const key = `${procNum}|${format(evtDate, "yyyy-MM-dd")}`;
          if (audKeys.has(key)) continue;
        }
        const hasTime = evtDate.getHours() !== 0 || evtDate.getMinutes() !== 0;
        events.push({
          id: `cal-${item.id}`,
          type: "calendar",
          titulo: item.title,
          dataHora: evtDate,
          hora: hasTime ? format(evtDate, "HH:mm") : null,
          local: item.location || null,
          assistido: item.assistido?.nome || null,
          processo: procNum || null,
          atribuicao: item.processo?.atribuicao || null,
          status: item.status || "pendente",
          tipoEvento: item.eventType || null,
        });
      }
    }

    // Sort by date
    events.sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime());

    // Filter out past events (keep today's)
    const todayStart = startOfDay(now);
    return events.filter((e) => e.dataHora >= todayStart);
  }, [calendarData, audienciasData]);

  // Agrupa atribuições em "buckets" de filtro — Júri/VVD/EP/Outros
  const getBucket = (atrib?: string | null): "JURI" | "VVD" | "EP" | "OTHER" => {
    if (!atrib) return "OTHER";
    if (atrib === "JURI_CAMACARI" || atrib === "GRUPO_JURI") return "JURI";
    if (atrib === "VVD_CAMACARI") return "VVD";
    if (atrib === "EXECUCAO_PENAL") return "EP";
    return "OTHER";
  };

  const bucketCounts = useMemo(() => {
    const c: Record<string, number> = { JURI: 0, VVD: 0, EP: 0, OTHER: 0 };
    for (const e of allEvents) c[getBucket(e.atribuicao)]++;
    return c;
  }, [allEvents]);

  const [activeBuckets, setActiveBuckets] = useState<Set<string>>(new Set());
  const toggleBucket = (b: string) => {
    setActiveBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  };

  const filteredEvents = useMemo(() => {
    if (activeBuckets.size === 0) return allEvents;
    return allEvents.filter((e) => activeBuckets.has(getBucket(e.atribuicao)));
  }, [allEvents, activeBuckets]);

  const grouped = groupByDay(filteredEvents);
  const todayCount = grouped.get(format(now, "yyyy-MM-dd"))?.length || 0;

  return createPortal(
    <div className="fixed inset-0 z-[999]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />

      {/* Panel — Padrão Defender: card claro sobre neutral-50 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute bg-neutral-50 dark:bg-neutral-900 overflow-hidden flex flex-col",
          "shadow-2xl shadow-black/[0.12] ring-1 ring-black/[0.06] dark:ring-white/[0.06]",
          "inset-2 rounded-xl",
          "sm:inset-auto sm:top-3 sm:right-3 sm:bottom-3 sm:w-[400px] sm:rounded-2xl",
        )}
        style={{ animation: "fadeInRight 0.2s ease-out" }}
      >
        {/* Header — dois rows no estilo Padrão Defender */}
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200/60 dark:border-neutral-800/60">
          {/* Row 1 — título + ações */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                <CalendarDays className="w-[14px] h-[14px] text-neutral-500 dark:text-neutral-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200 tracking-tight leading-tight">
                  Agenda
                </h2>
                <p className="text-[9px] text-neutral-400 dark:text-neutral-500 tabular-nums leading-tight mt-0.5">
                  {todayCount > 0 ? `${todayCount} hoje` : "Nenhum hoje"}
                  {" · "}{filteredEvents.length} próximos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
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

          {/* Row 2 — filter pills discretos */}
          <div className="flex items-center gap-1.5 px-5 pb-2.5 pt-1 overflow-x-auto scrollbar-none">
            <FilterPill label="Júri" count={bucketCounts.JURI} color={JURI} active={activeBuckets.has("JURI")} onClick={() => toggleBucket("JURI")} />
            <FilterPill label="VVD" count={bucketCounts.VVD} color={VVD} active={activeBuckets.has("VVD")} onClick={() => toggleBucket("VVD")} />
            <FilterPill label="EP" count={bucketCounts.EP} color={EP} active={activeBuckets.has("EP")} onClick={() => toggleBucket("EP")} />
            {bucketCounts.OTHER > 0 && (
              <FilterPill label="Outros" count={bucketCounts.OTHER} color={ZINC} active={activeBuckets.has("OTHER")} onClick={() => toggleBucket("OTHER")} />
            )}
            {activeBuckets.size > 0 && (
              <button
                onClick={() => setActiveBuckets(new Set())}
                className="ml-auto text-[9px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer shrink-0 font-medium"
              >
                limpar
              </button>
            )}
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
            <div>
              {Array.from(grouped.entries()).map(([dateKey, events]) => {
                const dayLabel = getDayLabel(dateKey);
                const isCurrentDay = isToday(new Date(dateKey + "T12:00:00"));

                return (
                  <div key={dateKey} className="pb-1">
                    {/* Day header — sticky sobre neutral-50 */}
                    <div className="px-5 py-1.5 sticky top-0 z-10 bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur-[2px]">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wider",
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
                    <div>
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
        <div className="border-t border-neutral-200/60 dark:border-neutral-800/60 px-5 py-2.5 bg-white dark:bg-neutral-900">
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

// ============================================
// FILTER PILL
// ============================================

function FilterPill({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: { bar: string; tint: string; time: string };
  active: boolean;
  onClick: () => void;
}) {
  const disabled = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 h-5 px-1.5 rounded-md text-[10px] tabular-nums transition-colors duration-150 cursor-pointer",
        disabled && "opacity-25 cursor-not-allowed",
        active
          ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-medium"
          : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60"
      )}
    >
      <span
        className="w-1 h-1 rounded-full shrink-0"
        style={{ backgroundColor: color.bar }}
      />
      {label}
      <span className="text-neutral-400/80 dark:text-neutral-500/80">{count}</span>
    </button>
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
        "group relative mx-3 mb-1.5 pl-4 pr-3 py-2.5 rounded-lg flex items-start gap-3",
        "bg-white dark:bg-neutral-800/40",
        "shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.03] dark:ring-white/[0.04]",
        "transition-all duration-150",
        "hover:shadow-md hover:shadow-black/[0.06] hover:-translate-y-px",
        isPast && "opacity-40"
      )}
    >
      {/* Barra lateral — marcador funcional forte */}
      <span
        aria-hidden
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
        style={{ backgroundColor: color.bar }}
      />

      {/* Hora — colorida pela atribuição */}
      <div className="min-w-[40px] pt-px">
        {event.hora ? (
          <span
            className="text-[12px] font-mono font-bold tabular-nums"
            style={{ color: isPast ? undefined : color.time }}
          >
            {event.hora}
          </span>
        ) : (
          <span className="text-[9px] text-neutral-400 uppercase">dia todo</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {isAudiencia && (
            <Gavel className="w-3 h-3 shrink-0" style={{ color: color.bar }} />
          )}
          <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 truncate leading-tight">
            {event.titulo}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0 mt-1">
          {event.assistido && (
            <span className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400 min-w-0">
              <User className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate max-w-[150px]">{event.assistido}</span>
            </span>
          )}
          {event.processo && (
            <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-mono tabular-nums truncate max-w-[150px]">
              {event.processo}
            </span>
          )}
        </div>
      </div>

      {/* Relative time */}
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
