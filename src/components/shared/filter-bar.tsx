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
    <div className={cn("space-y-5", className)}>
      {/* Linha Principal */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Busca */}
        {onSearchChange && (
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-12 h-12 text-base md:text-lg border-2 rounded-xl"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Controles */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Ordenação */}
          {sortOptions && sortOptions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-12 px-5 border-2 rounded-xl text-sm md:text-base font-semibold">
                  <SlidersHorizontal className="w-5 h-5" />
                  <span className="hidden sm:inline">
                    {sortOptions.find(o => o.value === sortValue)?.label || "Ordenar"}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[220px]">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onSortChange?.(option.value)}
                    className={cn(
                      "cursor-pointer text-sm md:text-base",
                      sortValue === option.value && "bg-muted font-semibold"
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
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="gap-2 h-12 px-5 border-2 rounded-xl text-sm md:text-base font-semibold"
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 px-1.5 min-w-[1.25rem] h-5">
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          )}

          {/* View Toggle */}
          {showViewToggle && onViewModeChange && (
            <div className="flex items-center border-2 border-border rounded-xl overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className="h-12 w-12 rounded-none"
                onClick={() => onViewModeChange("grid")}
              >
                <LayoutGrid className="w-5 h-5" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-12 w-12 rounded-none"
                onClick={() => onViewModeChange("list")}
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* Ações Customizadas */}
          {actions}
        </div>
      </div>

      {/* Filtros Rápidos (Chips) */}
      {quickFilters && (
        <div className="flex flex-wrap gap-2">
          {quickFilters}
        </div>
      )}

      {/* Filtros Avançados (Expansível) */}
      {advancedFilters && showAdvanced && (
        <div className="p-6 rounded-xl border-2 border-border bg-muted/30 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-base md:text-lg font-bold text-foreground">Filtros Avançados</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(false)}
              className="h-10 w-10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {advancedFilters}
          </div>
        </div>
      )}

      {/* Filtros Ativos */}
      {hasActiveFilters && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border-2 border-primary/30">
          <span className="text-sm md:text-base font-semibold text-primary flex-shrink-0">
            Filtros ativos:
          </span>
          
          <div className="flex flex-wrap gap-2 flex-1">
            {activeFilters.map((filter) => (
              <Badge
                key={filter.key}
                variant="secondary"
                className="gap-2 pr-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/30 px-3 py-1.5 text-sm md:text-base rounded-lg"
              >
                <span className="text-primary/70">{filter.label}:</span>
                <span className="font-semibold">{filter.value}</span>
                <button
                  onClick={() => onRemoveFilter?.(filter.key)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </Badge>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs text-muted-foreground hover:text-destructive flex-shrink-0"
          >
            Limpar todos
          </Button>
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
    <div className={cn("space-y-2", className)}>
      {showLabel && label && (
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
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
