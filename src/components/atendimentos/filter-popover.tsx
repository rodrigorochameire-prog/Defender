"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Filter,
  MessageCircle,
  User,
  Phone,
  Video,
  Mail,
  Shield,
  Mic,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface FilterState {
  tipos: string[];
  statuses: string[];
  periodo: "all" | "week" | "month" | "year";
}

export const INITIAL_FILTERS: FilterState = {
  tipos: [],
  statuses: [],
  periodo: "all",
};

interface FilterPopoverProps {
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  total: number;
}

const TIPO_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle, iconClass: "text-green-500" },
  { value: "presencial", label: "Presencial", icon: User, iconClass: "" },
  { value: "telefone", label: "Telefone", icon: Phone, iconClass: "" },
  { value: "videoconferencia", label: "Videoconferência", icon: Video, iconClass: "" },
  { value: "email", label: "Email", icon: Mail, iconClass: "" },
  { value: "visita-carceraria", label: "Visita Carcerária", icon: Shield, iconClass: "" },
  { value: "plaud", label: "Plaud", icon: Mic, iconClass: "text-violet-500" },
];

const STATUS_OPTIONS = [
  { value: "realizado", label: "Realizado" },
  { value: "agendado", label: "Agendado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "nao-compareceu", label: "Não compareceu" },
];

const PERIODO_OPTIONS = [
  { value: "all" as const, label: "Todos" },
  { value: "week" as const, label: "Última semana" },
  { value: "month" as const, label: "Último mês" },
  { value: "year" as const, label: "Último ano" },
];

function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.tipos.length > 0) count++;
  if (filters.statuses.length > 0) count++;
  if (filters.periodo !== "all") count++;
  return count;
}

const chipBase = "text-[10px] px-2 py-1 rounded-md cursor-pointer transition-colors select-none";
const chipSelected = "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900";
const chipUnselected =
  "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700";

const sectionLabel =
  "uppercase text-[9px] tracking-wide font-semibold text-neutral-400 dark:text-neutral-500 mb-1";

export function FilterPopover({ filters, onApply, total }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterState>(filters);

  const activeCount = countActiveFilters(filters);
  const hasFilters = activeCount > 0;

  function handleOpen(isOpen: boolean) {
    if (isOpen) {
      // Re-sync draft from current applied filters when opening
      setDraft(filters);
    }
    setOpen(isOpen);
  }

  function toggleTipo(value: string) {
    setDraft((prev) => {
      const exists = prev.tipos.includes(value);
      const next = exists
        ? prev.tipos.filter((t) => t !== value)
        : [...prev.tipos, value];
      return { ...prev, tipos: next };
    });
  }

  function toggleStatus(value: string) {
    setDraft((prev) => {
      const exists = prev.statuses.includes(value);
      const next = exists
        ? prev.statuses.filter((s) => s !== value)
        : [...prev.statuses, value];
      return { ...prev, statuses: next };
    });
  }

  function setPeriodo(value: FilterState["periodo"]) {
    setDraft((prev) => ({ ...prev, periodo: value }));
  }

  function handleApply() {
    onApply(draft);
    setOpen(false);
  }

  function handleLimpar() {
    setDraft(INITIAL_FILTERS);
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
        {total} atendimentos
      </span>

      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-md border transition-colors",
              hasFilters
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-transparent"
                : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
            )}
          >
            <Filter className="w-3 h-3" />
            <span>Filtros</span>
            {hasFilters && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[9px] font-semibold leading-none">
                {activeCount}
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-[260px] p-0">
          <div className="p-3 space-y-3">
            {/* Tipo */}
            <div>
              <p className={sectionLabel}>Tipo</p>
              <div className="flex flex-wrap gap-1">
                {/* Todos chip */}
                <button
                  className={cn(
                    chipBase,
                    draft.tipos.length === 0 ? chipSelected : chipUnselected
                  )}
                  onClick={() => setDraft((prev) => ({ ...prev, tipos: [] }))}
                >
                  Todos
                </button>
                {TIPO_OPTIONS.map(({ value, label, icon: Icon, iconClass }) => (
                  <button
                    key={value}
                    className={cn(
                      chipBase,
                      "flex items-center gap-1",
                      draft.tipos.includes(value) ? chipSelected : chipUnselected
                    )}
                    onClick={() => toggleTipo(value)}
                  >
                    <Icon
                      className={cn(
                        "w-2.5 h-2.5",
                        draft.tipos.includes(value) ? "" : iconClass
                      )}
                    />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <p className={sectionLabel}>Status</p>
              <div className="flex flex-wrap gap-1">
                <button
                  className={cn(
                    chipBase,
                    draft.statuses.length === 0 ? chipSelected : chipUnselected
                  )}
                  onClick={() => setDraft((prev) => ({ ...prev, statuses: [] }))}
                >
                  Todos
                </button>
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    className={cn(
                      chipBase,
                      draft.statuses.includes(value) ? chipSelected : chipUnselected
                    )}
                    onClick={() => toggleStatus(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Período */}
            <div>
              <p className={sectionLabel}>Período</p>
              <div className="flex flex-wrap gap-1">
                {PERIODO_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    className={cn(
                      chipBase,
                      draft.periodo === value ? chipSelected : chipUnselected
                    )}
                    onClick={() => setPeriodo(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-100 dark:border-neutral-800 px-3 py-2 flex items-center justify-between">
            <button
              className="text-[10px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
              onClick={handleLimpar}
            >
              Limpar
            </button>
            <button
              className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[10px] px-3 py-1 rounded-md transition-colors hover:bg-neutral-700 dark:hover:bg-neutral-300"
              onClick={handleApply}
            >
              Aplicar
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
