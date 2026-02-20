"use client";

import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface InlineDatePickerProps {
  /** Display value in DD/MM/YYYY or DD/MM/YY format */
  value: string;
  /** Callback with ISO date string YYYY-MM-DD */
  onChange: (isoDate: string) => void;
  placeholder?: string;
  activateOnDoubleClick?: boolean;
  /** Show a persistent Calendar icon that opens picker on single click */
  showEditIcon?: boolean;
}

function parseBRDate(str: string): Date | undefined {
  if (!str) return undefined;
  try {
    const parts = str.split("/").map(Number);
    if (parts.length < 3) return undefined;
    const [dia, mes, ano] = parts;
    const fullYear = ano < 100 ? 2000 + ano : ano;
    const date = new Date(fullYear, mes - 1, dia);
    if (isNaN(date.getTime())) return undefined;
    return date;
  } catch {
    return undefined;
  }
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatBRDate(date: Date): string {
  return date.toLocaleDateString("pt-BR");
}

export function InlineDatePicker({
  value,
  onChange,
  placeholder = "—",
  activateOnDoubleClick = false,
  showEditIcon = false,
}: InlineDatePickerProps) {
  const [open, setOpen] = useState(false);
  const currentDate = parseBRDate(value);

  const handleOpen = () => setOpen(true);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={activateOnDoubleClick && !showEditIcon ? undefined : handleOpen}
          onDoubleClick={activateOnDoubleClick && !showEditIcon ? handleOpen : undefined}
          className="text-[11px] text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 transition-colors flex items-center gap-1 whitespace-nowrap group/date"
        >
          {value ? (
            <span>{value}</span>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500 italic">{placeholder}</span>
          )}
          <CalendarIcon className={`w-3 h-3 text-zinc-300 dark:text-zinc-600 transition-opacity ${
            showEditIcon ? "opacity-40 group-hover/date:opacity-100" : "opacity-0 group-hover/date:opacity-100"
          }`} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
        <Calendar
          mode="single"
          selected={currentDate}
          defaultMonth={currentDate || new Date()}
          onSelect={(date) => {
            if (date) {
              onChange(toISODate(date));
            }
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
