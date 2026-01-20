"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Tipo genérico para opções
interface Option {
  value: string | number;
  label: string;
  icon?: string;
  color?: string;
  description?: string;
}

// ============================================
// SELECT SIMPLES COM ÍCONES
// ============================================

interface OptionSelectProps {
  options: readonly Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showIcon?: boolean;
}

export function OptionSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  disabled = false,
  className,
  showIcon = true,
}: OptionSelectProps) {
  const selectedOption = options.find(o => String(o.value) === value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder}>
          {selectedOption && (
            <span className="flex items-center gap-2">
              {showIcon && selectedOption.icon && (
                <span>{selectedOption.icon}</span>
              )}
              {selectedOption.label}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={String(option.value)} value={String(option.value)}>
            <span className="flex items-center gap-2">
              {showIcon && option.icon && <span>{option.icon}</span>}
              <span>{option.label}</span>
              {option.description && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({option.description})
                </span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============================================
// MULTI-SELECT COM BADGES
// ============================================

interface MultiSelectProps {
  options: readonly Option[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxDisplay?: number;
}

export function MultiSelect({
  options,
  values,
  onChange,
  placeholder = "Selecione...",
  disabled = false,
  className,
  maxDisplay = 3,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOptions = options.filter(o => values.includes(String(o.value)));

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter(v => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  const removeValue = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(values.filter(v => v !== value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !values.length && "text-muted-foreground",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {values.length === 0 ? (
              placeholder
            ) : values.length <= maxDisplay ? (
              selectedOptions.map(option => (
                <Badge
                  key={String(option.value)}
                  variant="secondary"
                  className="mr-1 mb-1"
                >
                  {option.icon && <span className="mr-1">{option.icon}</span>}
                  {option.label}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => removeValue(String(option.value), e)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span>{values.length} selecionados</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList>
            <CommandEmpty>Nenhum resultado.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={String(option.value)}
                  onSelect={() => toggleValue(String(option.value))}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      values.includes(String(option.value))
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {option.icon && <span className="mr-2">{option.icon}</span>}
                  <span>{option.label}</span>
                  {option.description && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {option.description}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// ESCALA 1-5 COM ÍCONES CLICÁVEIS
// ============================================

interface ScaleSelectProps {
  value?: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  labels?: { min: string; max: string };
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ScaleSelect({
  value,
  onChange,
  min = 1,
  max = 5,
  labels,
  disabled = false,
  className,
  size = "md",
}: ScaleSelectProps) {
  const sizes = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  const colors = [
    "bg-red-100 text-red-700 hover:bg-red-200",
    "bg-orange-100 text-orange-700 hover:bg-orange-200",
    "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
    "bg-green-100 text-green-700 hover:bg-green-200",
    "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  ];

  const activeColors = [
    "bg-red-500 text-white",
    "bg-orange-500 text-white",
    "bg-yellow-500 text-white",
    "bg-green-500 text-white",
    "bg-emerald-500 text-white",
  ];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1">
        {labels && (
          <span className="text-xs text-muted-foreground mr-2 w-20 text-right">
            {labels.min}
          </span>
        )}
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n, idx) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={cn(
              "rounded-full flex items-center justify-center font-medium transition-all",
              sizes[size],
              value === n ? activeColors[idx] : colors[idx],
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {n}
          </button>
        ))}
        {labels && (
          <span className="text-xs text-muted-foreground ml-2 w-20">
            {labels.max}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// QUICK STATUS ICONS (para staff no pátio)
// ============================================

interface QuickStatusOption {
  value: string;
  label: string;
  icon: string;
  color: "green" | "yellow" | "orange" | "red" | "blue" | "gray";
}

interface QuickStatusSelectProps {
  options: readonly QuickStatusOption[];
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickStatusSelect({
  options,
  value,
  onChange,
  disabled = false,
  className,
}: QuickStatusSelectProps) {
  const colorClasses = {
    green: "bg-green-100 hover:bg-green-200 border-green-300 text-green-700",
    yellow: "bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-700",
    orange: "bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-700",
    red: "bg-red-100 hover:bg-red-200 border-red-300 text-red-700",
    blue: "bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-700",
    gray: "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700",
  };

  const activeColorClasses = {
    green: "bg-green-500 border-green-600 text-white ring-2 ring-green-300",
    yellow: "bg-yellow-500 border-yellow-600 text-white ring-2 ring-yellow-300",
    orange: "bg-orange-500 border-orange-600 text-white ring-2 ring-orange-300",
    red: "bg-red-500 border-red-600 text-white ring-2 ring-red-300",
    blue: "bg-blue-500 border-blue-600 text-white ring-2 ring-blue-300",
    gray: "bg-gray-500 border-gray-600 text-white ring-2 ring-gray-300",
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all min-w-[70px]",
            value === option.value
              ? activeColorClasses[option.color]
              : colorClasses[option.color],
            disabled && "opacity-50 cursor-not-allowed"
          )}
          title={option.label}
        >
          <span className="text-2xl">{option.icon}</span>
          <span className="text-xs font-medium mt-1">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================
// TOGGLE CHIPS (para seleção múltipla visual)
// ============================================

interface ToggleChipsProps {
  options: readonly Option[];
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function ToggleChips({
  options,
  values,
  onChange,
  disabled = false,
  className,
  columns = 3,
}: ToggleChipsProps) {
  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter(v => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return (
    <div className={cn("grid gap-2", gridCols[columns], className)}>
      {options.map((option) => {
        const isSelected = values.includes(String(option.value));
        return (
          <button
            key={String(option.value)}
            type="button"
            disabled={disabled}
            onClick={() => toggleValue(String(option.value))}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border text-left transition-all text-sm",
              isSelected
                ? "bg-primary/10 border-primary text-primary font-medium"
                : "bg-muted/30 border-transparent hover:bg-muted/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {option.icon && <span>{option.icon}</span>}
            <span className="flex-1">{option.label}</span>
            {isSelected && <Check className="h-4 w-4" />}
          </button>
        );
      })}
    </div>
  );
}
