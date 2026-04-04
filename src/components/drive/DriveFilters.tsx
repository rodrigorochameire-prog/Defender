"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDriveContext } from "./DriveContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  FileText,
  Image,
  Music,
  FolderOpen,
  FileSpreadsheet,
  ChevronDown,
  X,
  Sparkles,
  Clock,
  Filter,
} from "lucide-react";

// ─── Filter Options ─────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "image", label: "Imagem", icon: Image },
  { value: "audio", label: "Audio", icon: Music },
  { value: "folder", label: "Pasta", icon: FolderOpen },
  { value: "document", label: "Google Docs", icon: FileSpreadsheet },
] as const;

const DATE_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: null, label: "Todos" },
] as const;

const ENRICHMENT_OPTIONS = [
  { value: "completed", label: "Extraido", dotClass: "bg-emerald-500" },
  { value: "processing", label: "Processando", dotClass: "bg-amber-500" },
  { value: "pending", label: "Pendente", dotClass: "bg-neutral-500" },
  { value: "failed", label: "Falhou", dotClass: "bg-red-500" },
] as const;

// ─── Active Filter Badge ────────────────────────────────────────────

function FilterBadge({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
      {label}
      <button
        onClick={onRemove}
        className="hover:text-emerald-300 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function DriveFilters() {
  const ctx = useDriveContext();
  const { filters } = ctx;

  const hasActiveFilters = !!(
    filters.type ||
    filters.dateRange ||
    filters.enrichmentStatus
  );

  const activeFilterLabels = useMemo(() => {
    const labels: { key: string; label: string }[] = [];
    if (filters.type) {
      const opt = TYPE_OPTIONS.find((o) => o.value === filters.type);
      if (opt) labels.push({ key: "type", label: opt.label });
    }
    if (filters.dateRange) {
      const opt = DATE_OPTIONS.find((o) => o.value === filters.dateRange);
      if (opt) labels.push({ key: "dateRange", label: opt.label });
    }
    if (filters.enrichmentStatus) {
      const opt = ENRICHMENT_OPTIONS.find(
        (o) => o.value === filters.enrichmentStatus
      );
      if (opt) labels.push({ key: "enrichmentStatus", label: opt.label });
    }
    return labels;
  }, [filters]);

  const clearAll = () => {
    ctx.setFilters({ type: null, dateRange: null, enrichmentStatus: null });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />

      {/* Type Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700/50",
              "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
              filters.type && "border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            )}
          >
            Tipo
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-44 p-1 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
        >
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = filters.type === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() =>
                  ctx.setFilters({ type: isActive ? null : opt.value })
                }
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-md transition-colors duration-150",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* Date Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700/50",
              "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
              filters.dateRange && "border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            )}
          >
            <Clock className="h-3 w-3 mr-1" />
            Data
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-40 p-1 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
        >
          {DATE_OPTIONS.map((opt) => {
            const isActive = filters.dateRange === opt.value;
            return (
              <button
                key={opt.value ?? "all"}
                onClick={() => ctx.setFilters({ dateRange: opt.value })}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-md transition-colors duration-150",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
                {opt.label}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* Enrichment Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700/50",
              "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
              filters.enrichmentStatus &&
                "border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            )}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Enrichment
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-44 p-1 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
        >
          {ENRICHMENT_OPTIONS.map((opt) => {
            const isActive = filters.enrichmentStatus === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() =>
                  ctx.setFilters({
                    enrichmentStatus: isActive ? null : opt.value,
                  })
                }
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-md transition-colors duration-150",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                <span
                  className={cn("h-2 w-2 rounded-full shrink-0", opt.dotClass)}
                />
                {opt.label}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {activeFilterLabels.map((f) => (
        <FilterBadge
          key={f.key}
          label={f.label}
          onRemove={() => ctx.setFilters({ [f.key]: null })}
        />
      ))}

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="text-[11px] text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors underline underline-offset-2"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
