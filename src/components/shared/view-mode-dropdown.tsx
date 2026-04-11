"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// VIEW MODE DROPDOWN — Seletor de modo de visualização
// Usado em headers charcoal (Demandas: Kanban/Tabela/Lista;
// Agenda: Mês/Semana/Lista)
// ============================================================

export interface ViewModeOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface ViewModeDropdownProps {
  options: ViewModeOption[];
  value: string;
  onChange: (value: string) => void;
  variant?: "light" | "dark";
}

export function ViewModeDropdown({
  options,
  value,
  onChange,
  variant = "dark",
}: ViewModeDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption = options.find((o) => o.value === value) ?? options[0];
  const ActiveIcon = activeOption?.icon;

  // Click-outside handler
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleMouseDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open]);

  const isDark = variant === "dark";

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-1 rounded px-2 transition-colors",
          "h-[28px] w-[34px] justify-center",
          isDark
            ? "bg-white/[0.08] hover:bg-white/[0.14] text-white"
            : "bg-black/[0.06] hover:bg-black/[0.12] text-zinc-800"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={activeOption?.label}
      >
        {ActiveIcon && <ActiveIcon className="h-[14px] w-[14px] shrink-0" />}
        <ChevronDown
          className={cn(
            "shrink-0",
            isDark ? "text-white/60" : "text-zinc-500"
          )}
          style={{ width: 8, height: 8 }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute right-0 top-full z-50 mt-1 min-w-[128px] rounded-md border shadow-lg",
            "overflow-hidden py-1",
            isDark
              ? "bg-black/[0.75] backdrop-blur-sm border-white/[0.08]"
              : "bg-white border-zinc-200"
          )}
        >
          {options.map((option) => {
            const Icon = option.icon;
            const isActive = option.value === value;

            return (
              <button
                key={option.value}
                role="option"
                aria-selected={isActive}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                  isDark
                    ? cn(
                        "text-white/80",
                        isActive
                          ? "bg-white/[0.08]"
                          : "hover:bg-white/[0.05]"
                      )
                    : cn(
                        "text-zinc-700",
                        isActive
                          ? "bg-black/[0.06]"
                          : "hover:bg-black/[0.04]"
                      )
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left">{option.label}</span>
                {isActive && (
                  <Check
                    className={cn(
                      "h-3 w-3 shrink-0",
                      isDark ? "text-white/60" : "text-zinc-400"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
