"use client";

import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Zap,
  Clock,
  HelpCircle,
  Lock,
  CalendarDays,
  LayoutList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AtribuicaoPills } from "@/components/demandas-premium/AtribuicaoPills";
import { getStatusConfig } from "@/config/demanda-status";

// ==========================================
// TYPES
// ==========================================

interface PrazosTabProps {
  demandas: any[];
  atribuicaoOptions: Array<{ value: string; label: string }>;
  selectedAtribuicoes: string[];
  handleAtribuicaoToggle: (value: string) => void;
  setSelectedAtribuicoes: (val: string[]) => void;
  /** Marca modo "Todas" explícito (sessionStorage) e zera o array. */
  onClearAtribuicoes?: () => void;
  atribuicaoCounts: Record<string, number>;
  onCardClick: (id: string | number) => void;
}

// Atribuição colors (duplicated here for simplicity)
const ATRIB_COLORS: Record<string, string> = {
  "Tribunal do Júri": "#22c55e",
  "Grupo Especial do Júri": "#f97316",
  "Violência Doméstica": "#f59e0b",
  "Execução Penal": "#3b82f6",
  "Substituição Criminal": "#8b5cf6",
  "Curadoria Especial": "#71717a",
};

// ==========================================
// HELPER: parse prazo to Date
// ==========================================

function parsePrazo(prazo: string): Date | null {
  try {
    const parts = prazo.split("/").map(Number);
    if (parts.length !== 3) return null;
    const [dd, mm, yy] = parts;
    const year = yy < 100 ? 2000 + yy : yy;
    return new Date(year, mm - 1, dd);
  } catch {
    return null;
  }
}

// ==========================================
// CALENDAR VIEW
// ==========================================

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function CalendarView({
  demandas,
  onCardClick,
}: {
  demandas: any[];
  onCardClick: (id: string | number) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Build map of date → demandas
  const dateMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const d of demandas) {
      if (!d.prazo || d.arquivado) continue;
      const date = parsePrazo(d.prazo);
      if (!date) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(d);
    }
    return map;
  }, [demandas]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startOffset = firstDay.getDay(); // 0=Sun
    const daysInMonth = lastDay.getDate();

    const cells: Array<{ date: Date | null; key: string; count: number; isToday: boolean; isPast: boolean }> = [];

    // Empty cells before first day
    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: null, key: `empty-${i}`, count: 0, isToday: false, isPast: false });
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonth, day);
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const count = dateMap[key]?.length || 0;
      const isToday = date.getTime() === today.getTime();
      const isPast = date.getTime() < today.getTime();
      cells.push({ date, key, count, isToday, isPast });
    }

    return cells;
  }, [viewMonth, viewYear, dateMap, today]);

  // Selected day demandas
  const selectedDemandas = selectedDay ? (dateMap[selectedDay] || []) : [];

  const goToPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const goToNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
    setSelectedDay(null);
  };

  return (
    <div className="space-y-3">
      {/* Calendar header */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800/50">
          <button
            onClick={goToPrev}
            className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-neutral-500" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              onClick={goToToday}
              className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer"
            >
              Hoje
            </button>
          </div>
          <button
            onClick={goToNext}
            className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-neutral-100 dark:border-neutral-800/50">
          {WEEKDAY_LABELS.map((wd) => (
            <div key={wd} className="text-center py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell) => {
            if (!cell.date) {
              return <div key={cell.key} className="h-16 sm:h-20 border-b border-r border-neutral-50 dark:border-neutral-800/30" />;
            }

            const day = cell.date.getDate();
            const isSelected = cell.key === selectedDay;

            return (
              <button
                key={cell.key}
                onClick={() => setSelectedDay(cell.key === selectedDay ? null : cell.key)}
                className={`
                  h-16 sm:h-20 border-b border-r border-neutral-50 dark:border-neutral-800/30
                  flex flex-col items-center justify-start pt-1.5 gap-1 transition-all cursor-pointer
                  ${isSelected ? "bg-emerald-50/80 dark:bg-emerald-950/20" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/30"}
                  ${cell.isToday ? "ring-1 ring-inset ring-emerald-300/50 dark:ring-emerald-700/30" : ""}
                `}
              >
                <span className={`text-xs font-medium tabular-nums ${
                  cell.isToday
                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                    : cell.isPast
                      ? "text-neutral-300 dark:text-neutral-600"
                      : "text-neutral-700 dark:text-neutral-300"
                }`}>
                  {day}
                </span>
                {cell.count > 0 && (
                  <div className={`flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[9px] font-bold ${
                    cell.isPast
                      ? "bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                      : cell.isToday
                        ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                        : cell.count >= 3
                          ? "bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                  }`}>
                    {cell.count}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && selectedDemandas.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800/50">
            <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {(() => {
                const [y, m, d] = selectedDay.split("-").map(Number);
                return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
              })()}
            </span>
            <span className="text-[10px] font-mono tabular-nums text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
              {selectedDemandas.length}
            </span>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
            {selectedDemandas.map((d: any) => {
              const statusCfg = getStatusConfig(d.substatus || d.status);
              return (
                <div
                  key={d.id}
                  onClick={() => onCardClick(d.id)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">{d.assistido}</p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">{d.ato}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {d.estadoPrisional === "preso" && <Lock className="w-3 h-3 text-amber-500" />}
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: `${statusCfg?.color || "#71717a"}15`,
                        color: statusCfg?.color || "#71717a",
                      }}
                    >
                      {statusCfg?.label || d.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// LIST VIEW (original prazos layout)
// ==========================================

function ListView({
  demandas,
  selectedAtribuicoes,
  onCardClick,
}: {
  demandas: any[];
  selectedAtribuicoes: string[];
  onCardClick: (id: string | number) => void;
}) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const { sections, vencidas, hojeList, amanha, semana, semPrazo } = useMemo(() => {
    const comPrazo = demandas
      .filter((d) => d.prazo && !d.arquivado)
      .map((d) => {
        const date = parsePrazo(d.prazo);
        if (!date) return null;
        date.setHours(0, 0, 0, 0);
        const diff = Math.ceil((date.getTime() - hoje.getTime()) / 86400000);
        return { ...d, prazoDate: date, diff };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.diff - b.diff) as any[];

    const v = comPrazo.filter((d) => d.diff < 0);
    const h = comPrazo.filter((d) => d.diff === 0);
    const a = comPrazo.filter((d) => d.diff === 1);
    const s = comPrazo.filter((d) => d.diff >= 2 && d.diff <= 7);
    const q = comPrazo.filter((d) => d.diff > 7 && d.diff <= 15);
    const m = comPrazo.filter((d) => d.diff > 15 && d.diff <= 30);
    const f = comPrazo.filter((d) => d.diff > 30);
    const sp = demandas.filter((d) => !d.prazo && !d.arquivado);

    const secs = [
      { label: "Vencidas", items: v, color: "rose", icon: AlertTriangle },
      { label: "Hoje", items: h, color: "amber", icon: Zap },
      { label: "Amanhã", items: a, color: "yellow", icon: Clock },
      { label: "Esta semana", items: s, color: "emerald", icon: Clock },
      { label: "Próximos 15 dias", items: q, color: "sky", icon: Clock },
      { label: "Este mês", items: m, color: "zinc", icon: Clock },
      { label: "Futuro", items: f, color: "zinc", icon: Clock },
      { label: "Sem prazo", items: sp, color: "zinc", icon: HelpCircle },
    ].filter((sec) => sec.items.length > 0);

    return { sections: secs, vencidas: v, hojeList: h, amanha: a, semana: s, semPrazo: sp };
  }, [demandas, hoje]);

  const sectionIconColor = (color: string) => {
    switch (color) {
      case "rose": return "text-rose-500";
      case "amber": return "text-amber-500";
      case "yellow": return "text-yellow-500";
      case "emerald": return "text-emerald-500";
      case "sky": return "text-sky-500";
      default: return "text-neutral-400";
    }
  };

  return (
    <div className="space-y-3">
      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Vencidas", count: vencidas.length, color: "rose" },
          { label: "Hoje", count: hojeList.length, color: "amber" },
          { label: "7 dias", count: semana.length + amanha.length, color: "emerald" },
          { label: "Sem prazo", count: semPrazo.length, color: "zinc" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border bg-white dark:bg-neutral-900 ${
              kpi.color === "rose" && kpi.count > 0 ? "border-rose-200 dark:border-rose-800/50" :
              kpi.color === "amber" && kpi.count > 0 ? "border-amber-200 dark:border-amber-800/50" :
              "border-neutral-200/80 dark:border-neutral-800/80"
            }`}
          >
            <p className={`text-xl font-bold tabular-nums ${
              kpi.color === "rose" && kpi.count > 0 ? "text-rose-600 dark:text-rose-400" :
              kpi.color === "amber" && kpi.count > 0 ? "text-amber-600 dark:text-amber-400" :
              "text-neutral-900 dark:text-neutral-100"
            }`}>
              {kpi.count}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* Sections */}
      {sections.map((section) => {
        const SectionIcon = section.icon;
        return (
          <div key={section.label} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80">
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-neutral-100 dark:border-neutral-800/50">
              <SectionIcon className={`w-3.5 h-3.5 ${sectionIconColor(section.color)}`} />
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{section.label}</span>
              <span className="text-[10px] font-mono tabular-nums text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                {section.items.length}
              </span>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {section.items.slice(0, 15).map((d: any) => {
                const statusCfg = getStatusConfig(d.substatus || d.status);
                const atribColor = ATRIB_COLORS[d.atribuicao] || "#71717a";
                return (
                  <div
                    key={d.id}
                    onClick={() => onCardClick(d.id)}
                    className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                  >
                    {selectedAtribuicoes.length !== 1 && (
                      <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: atribColor }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">{d.assistido}</p>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">{d.ato}</p>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {d.estadoPrisional === "preso" && <Lock className="w-3 h-3 text-amber-500" />}
                      {d.prazo && (
                        <span className="text-[10px] font-mono tabular-nums text-neutral-500 hidden sm:inline">
                          {d.prazo}
                        </span>
                      )}
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap"
                        style={{
                          backgroundColor: `${statusCfg?.color || "#71717a"}15`,
                          color: statusCfg?.color || "#71717a",
                        }}
                      >
                        {statusCfg?.label || d.status}
                      </span>
                    </div>
                  </div>
                );
              })}
              {section.items.length > 15 && (
                <p className="text-[10px] text-center text-neutral-400 py-2">
                  +{section.items.length - 15} mais
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// PRAZOS TAB (main export)
// ==========================================

export function PrazosTab({
  demandas,
  atribuicaoOptions,
  selectedAtribuicoes,
  handleAtribuicaoToggle,
  setSelectedAtribuicoes,
  onClearAtribuicoes,
  atribuicaoCounts,
  onCardClick,
}: PrazosTabProps) {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  return (
    <div className="space-y-3">
      {/* Header: Atribuição pills + View toggle */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 px-3 py-2 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <AtribuicaoPills
            options={atribuicaoOptions}
            selectedValues={selectedAtribuicoes}
            onToggle={handleAtribuicaoToggle}
            onClear={onClearAtribuicoes ?? (() => setSelectedAtribuicoes([]))}
            counts={atribuicaoCounts}
          />
        </div>
        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-800 dark:text-neutral-200"
                : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            }`}
            title="Vista lista"
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              viewMode === "calendar"
                ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-800 dark:text-neutral-200"
                : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            }`}
            title="Vista calendário"
          >
            <CalendarDays className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "list" ? (
        <ListView
          demandas={demandas}
          selectedAtribuicoes={selectedAtribuicoes}
          onCardClick={onCardClick}
        />
      ) : (
        <CalendarView
          demandas={demandas}
          onCardClick={onCardClick}
        />
      )}
    </div>
  );
}
