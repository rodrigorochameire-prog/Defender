"use client";

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ChevronDown,
  LayoutGrid,
  List,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// ==========================================
// FILTER BAR - Barra de filtros padronizada
// ==========================================

interface FilterBarProps {
  // Busca
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  
  // Filtros rápidos (chips)
  quickFilters?: ReactNode;
  
  // Filtros avançados (dropdowns, selects)
  advancedFilters?: ReactNode;
  
  // View mode (grid/list)
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
  showViewToggle?: boolean;
  
  // Ordenação
  sortOptions?: Array<{ value: string; label: string }>;
  sortValue?: string;
  onSortChange?: (value: string) => void;
  
  // Ações
  actions?: ReactNode;
  
  // Filtros ativos
  activeFilters?: Array<{ key: string; label: string; value: string }>;
  onRemoveFilter?: (key: string) => void;
  onClearFilters?: () => void;
  
  // Estilo
  className?: string;
  variant?: "default" | "compact";
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  quickFilters,
  advancedFilters,
  viewMode,
  onViewModeChange,
  showViewToggle = false,
  sortOptions,
  sortValue,
  onSortChange,
  actions,
  activeFilters,
  onRemoveFilter,
  onClearFilters,
  className,
  variant = "default",
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveFilters = activeFilters && activeFilters.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Linha Principal - Compacta */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Busca */}
        {onSearchChange && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 h-9 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500/20"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Controles */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Ordenação */}
          {sortOptions && sortOptions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-1.5 h-9 px-3 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="hidden sm:inline text-zinc-600 dark:text-zinc-400">
                    {sortOptions.find(o => o.value === sortValue)?.label || "Ordenar"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onSortChange?.(option.value)}
                    className={cn(
                      "cursor-pointer text-xs",
                      sortValue === option.value && "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium"
                    )}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Filtros Avançados Toggle */}
          {advancedFilters && (
            <Button
              variant={showAdvanced ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={cn(
                "gap-1.5 h-9 px-3 rounded-lg text-xs font-medium",
                showAdvanced 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0" 
                  : "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveFilters && (
                <span className={cn(
                  "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                  showAdvanced 
                    ? "bg-white/20 text-white" 
                    : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                )}>
                  {activeFilters.length}
                </span>
              )}
            </Button>
          )}

          {/* View Toggle */}
          {showViewToggle && onViewModeChange && (
            <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
              <button
                className={cn(
                  "h-9 w-9 flex items-center justify-center transition-colors",
                  viewMode === "grid" 
                    ? "bg-emerald-600 text-white" 
                    : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                )}
                onClick={() => onViewModeChange("grid")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                className={cn(
                  "h-9 w-9 flex items-center justify-center transition-colors",
                  viewMode === "list" 
                    ? "bg-emerald-600 text-white" 
                    : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                )}
                onClick={() => onViewModeChange("list")}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Ações Customizadas */}
          {actions}
        </div>
      </div>

      {/* Filtros Rápidos (Chips) */}
      {quickFilters && (
        <div className="flex flex-wrap gap-1.5">
          {quickFilters}
        </div>
      )}

      {/* Filtros Avançados (Expansível) */}
      {advancedFilters && showAdvanced && (
        <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Filtros avançados</span>
            <button
              onClick={() => setShowAdvanced(false)}
              className="text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {advancedFilters}
          </div>
        </div>
      )}

      {/* Filtros Ativos - Mais discreto */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30">
          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex-shrink-0">
            Filtros:
          </span>
          
          <div className="flex flex-wrap gap-1.5 flex-1">
            {activeFilters.map((filter) => (
              <span
                key={filter.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800/50 text-xs"
              >
                <span className="text-zinc-500">{filter.label}:</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{filter.value}</span>
                <button
                  onClick={() => onRemoveFilter?.(filter.key)}
                  className="ml-0.5 text-zinc-400 hover:text-rose-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <button
            onClick={onClearFilters}
            className="text-[10px] text-zinc-400 hover:text-rose-500 transition-colors flex-shrink-0"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// FILTER SELECT - Select padronizado para filtros
// ==========================================

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterSelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: Array<{ value: string; label: string; icon?: ReactNode }>;
  className?: string;
  showLabel?: boolean;
}

export function FilterSelect({
  label,
  placeholder = "Selecione...",
  value,
  onValueChange,
  options,
  className,
  showLabel = true,
}: FilterSelectProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && label && (
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 text-xs border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-md">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              <div className="flex items-center gap-1.5">
                {option.icon}
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
