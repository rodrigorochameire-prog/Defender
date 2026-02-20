"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface InlineDropdownOption {
  value: string;
  label: string;
  color?: string;
  group?: string;
}

interface InlineDropdownProps {
  value: string;
  displayValue: React.ReactNode;
  options: InlineDropdownOption[];
  onChange: (value: string) => void;
  compact?: boolean;
  activateOnDoubleClick?: boolean;
  /** Show a persistent edit icon (ChevronDown) that opens dropdown on single click */
  showEditIcon?: boolean;
}

export function InlineDropdown({
  value,
  displayValue,
  options,
  onChange,
  compact = false,
  activateOnDoubleClick = false,
  showEditIcon = false,
}: InlineDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const groupedOptions = options.reduce((acc, opt) => {
    const group = opt.group || "default";
    if (!acc[group]) acc[group] = [];
    acc[group].push(opt);
    return acc;
  }, {} as Record<string, InlineDropdownOption[]>);

  const handleActivate = () => setIsOpen(!isOpen);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={activateOnDoubleClick && !showEditIcon ? undefined : handleActivate}
        onDoubleClick={activateOnDoubleClick && !showEditIcon ? handleActivate : undefined}
        className={`flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors group/btn ${
          compact ? "px-1 py-0.5 -mx-1" : "px-1.5 py-0.5 -mx-1.5"
        }`}
      >
        {displayValue}
        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-opacity ${
          showEditIcon ? "opacity-40 hover:opacity-100" : "opacity-0 group-hover/btn:opacity-100"
        }`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 min-w-[180px] max-h-64 overflow-y-auto py-1">
          {Object.entries(groupedOptions).map(([group, opts], gi) => (
            <div key={group}>
              {gi > 0 && <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />}
              {opts.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 transition-colors ${
                    opt.value === value
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {opt.color && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                  )}
                  <span className="flex-1">{opt.label}</span>
                  {opt.value === value && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
