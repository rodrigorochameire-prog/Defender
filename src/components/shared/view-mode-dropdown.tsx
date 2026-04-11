"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOption = options.find((o) => o.value === value) ?? options[0];
  const ActiveIcon = activeOption?.icon;

  // Click-outside handler
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
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
    <div className="relative">
      {/* Trigger button */}
      <button
        ref={btnRef}
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

      {/* Dropdown panel — portal to body */}
      {open && createPortal(
        <div
          ref={dropdownRef}
          role="listbox"
          className={cn(
            "fixed z-[9999] min-w-[140px] rounded-xl shadow-xl shadow-black/[0.12]",
            "overflow-hidden py-1",
            "bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 ring-1 ring-black/[0.04]"
          )}
          style={(() => { const r = btnRef.current?.getBoundingClientRect(); return r ? { top: r.bottom + 4, right: window.innerWidth - r.right } : {}; })()}
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
                  "flex w-full items-center gap-2 px-3 py-1.5 text-[13px] transition-colors cursor-pointer",
                  "text-neutral-700 dark:text-neutral-300",
                  isActive
                    ? "bg-neutral-100 dark:bg-white/[0.08]"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span className="flex-1 text-left">{option.label}</span>
                {isActive && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
