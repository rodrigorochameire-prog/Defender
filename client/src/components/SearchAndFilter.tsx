import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterOption {
  label: string;
  value: string;
}

interface SearchAndFilterProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: {
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }[];
  onClearFilters?: () => void;
}

export function SearchAndFilter({
  searchPlaceholder = "Buscar...",
  searchValue,
  onSearchChange,
  filters = [],
  onClearFilters,
}: SearchAndFilterProps) {
  const hasActiveFilters = filters.some(f => f.value !== "all" && f.value !== "");

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      {/* Search Input */}
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filtros:</span>
          </div>
          {filters.map((filter) => (
            <Select
              key={filter.label}
              value={filter.value}
              onValueChange={filter.onChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          {hasActiveFilters && onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-xs"
            >
              Limpar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
