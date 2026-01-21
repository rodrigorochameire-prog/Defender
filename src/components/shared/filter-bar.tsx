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
    <div className={cn("space-y-4", className)}>
      {/* Linha Principal */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Busca */}
        {onSearchChange && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 h-10"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Controles */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Ordenação */}
          {sortOptions && sortOptions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-10">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {sortOptions.find(o => o.value === sortValue)?.label || "Ordenar"}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onSortChange?.(option.value)}
                    className={cn(
                      "cursor-pointer",
                      sortValue === option.value && "bg-muted"
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
              className="gap-2 h-10"
            >
              <SlidersHorizontal className="w-4 h-4" />
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
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10 rounded-r-none"
                onClick={() => onViewModeChange("grid")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10 rounded-l-none"
                onClick={() => onViewModeChange("list")}
              >
                <List className="w-4 h-4" />
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
        <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Filtros Avançados</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {advancedFilters}
          </div>
        </div>
      )}

      {/* Filtros Ativos */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-xs font-medium text-primary flex-shrink-0">
            Filtros ativos:
          </span>
          
          <div className="flex flex-wrap gap-1.5 flex-1">
            {activeFilters.map((filter) => (
              <Badge
                key={filter.key}
                variant="secondary"
                className="gap-1.5 pr-1 bg-primary/10 text-primary hover:bg-primary/20 border-primary/30"
              >
                <span className="text-primary/70">{filter.label}:</span>
                <span className="font-medium">{filter.value}</span>
                <button
                  onClick={() => onRemoveFilter?.(filter.key)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
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
