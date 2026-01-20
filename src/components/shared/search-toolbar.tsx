"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, LayoutGrid, List, Filter, X, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ==========================================
// SEARCH TOOLBAR - Barra de busca padronizada
// Inclui: busca, toggle de visualização, filtros
// ==========================================

interface SearchToolbarProps {
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  // View Toggle
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
  showViewToggle?: boolean;
  
  // Filters
  filters?: React.ReactNode;
  activeFiltersCount?: number;
  onClearFilters?: () => void;
  
  // Actions
  actions?: React.ReactNode;
  
  // Styling
  className?: string;
  compact?: boolean;
}

export function SearchToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  viewMode,
  onViewModeChange,
  showViewToggle = true,
  filters,
  activeFiltersCount,
  onClearFilters,
  actions,
  className,
  compact = false,
}: SearchToolbarProps) {
  const [showFilters, setShowFilters] = React.useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "pl-10 pr-10 bg-background",
              compact ? "h-9" : "h-10"
            )}
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchChange("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Filter Toggle Button */}
          {filters && (
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size={compact ? "sm" : "default"}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFiltersCount && activeFiltersCount > 0 && (
                <Badge variant="secondary" className="h-5 w-5 p-0 justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          )}

          {/* View Toggle */}
          {showViewToggle && onViewModeChange && (
            <TooltipProvider>
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewModeChange("grid")}
                      className={cn(
                        "h-8 w-8 rounded-md",
                        viewMode === "grid"
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Visualização em Grid</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewModeChange("list")}
                      className={cn(
                        "h-8 w-8 rounded-md",
                        viewMode === "list"
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Visualização em Lista</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}

          {/* Actions */}
          {actions}
        </div>
      </div>

      {/* Filters Row */}
      {filters && showFilters && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg border">
          {filters}
          {activeFiltersCount && activeFiltersCount > 0 && onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground ml-auto"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// FILTER SELECT - Select padronizado para filtros
// ==========================================

interface FilterSelectProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  placeholder?: string;
  className?: string;
  width?: "sm" | "md" | "lg" | "auto";
}

export function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Selecione...",
  className,
  width = "md",
}: FilterSelectProps) {
  const widthClass = {
    sm: "w-[100px]",
    md: "w-[140px]",
    lg: "w-[180px]",
    auto: "w-auto min-w-[120px]",
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn("h-9 text-sm", widthClass[width])}>
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

// ==========================================
// TOOLBAR DIVIDER - Separador visual
// ==========================================

export function ToolbarDivider() {
  return <div className="hidden sm:block w-px h-6 bg-border" />;
}

// ==========================================
// QUICK FILTERS - Filtros rápidos inline
// ==========================================

interface QuickFiltersProps {
  filters: Array<{
    key: string;
    label: string;
    count?: number;
    active?: boolean;
  }>;
  onFilterClick: (key: string) => void;
  className?: string;
}

export function QuickFilters({ filters, onFilterClick, className }: QuickFiltersProps) {
  return (
    <div className={cn("flex items-center gap-1.5 overflow-x-auto pb-1", className)}>
      {filters.map((filter) => (
        <Button
          key={filter.key}
          variant={filter.active ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onFilterClick(filter.key)}
          className={cn(
            "h-7 px-2.5 text-xs font-medium gap-1.5 flex-shrink-0",
            filter.active && "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          {filter.label}
          {filter.count !== undefined && (
            <Badge
              variant={filter.active ? "default" : "secondary"}
              className="h-4 px-1 text-[10px] min-w-[16px] justify-center"
            >
              {filter.count}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
}

// ==========================================
// RESULTS INFO - Informação de resultados
// ==========================================

interface ResultsInfoProps {
  total: number;
  filtered?: number;
  label?: string;
  className?: string;
}

export function ResultsInfo({ total, filtered, label = "resultados", className }: ResultsInfoProps) {
  const showing = filtered ?? total;
  
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {filtered !== undefined && filtered !== total ? (
        <>
          Exibindo <span className="font-medium text-foreground">{showing}</span> de{" "}
          <span className="font-medium text-foreground">{total}</span> {label}
        </>
      ) : (
        <>
          <span className="font-medium text-foreground">{total}</span> {label}
        </>
      )}
    </p>
  );
}
