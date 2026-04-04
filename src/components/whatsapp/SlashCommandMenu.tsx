"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Clock,
  FileText,
  FolderOpen,
  PenLine,
  Scale,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Static command registry
// ---------------------------------------------------------------------------

interface CommandDef {
  name: string;
  description: string;
  icon: React.ElementType;
  arg: boolean; // whether this command accepts a trailing argument
}

const COMMANDS: CommandDef[] = [
  { name: "nota",      description: "Criar anotação no processo",       icon: PenLine,    arg: true  },
  { name: "prazo",     description: "Ver prazos abertos",               icon: Clock,      arg: false },
  { name: "audiencia", description: "Próxima audiência",                icon: Calendar,   arg: false },
  { name: "processo",  description: "Abrir processo",                   icon: Scale,      arg: false },
  { name: "drive",     description: "Últimos arquivos do Drive",        icon: FolderOpen, arg: false },
  { name: "modelo",    description: "Enviar template de mensagem",      icon: FileText,   arg: false },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SlashCommandMenuProps {
  filter: string;
  onExecute: (command: string, arg?: string) => void;
  onClose: () => void;
  // Legacy prop kept for backward compat (template flow handled externally now)
  onSelect?: (content: string) => void;
  contactId: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SlashCommandMenu({
  filter,
  onExecute,
  onClose,
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fuzzy-filter on name OR description, case-insensitive
  const lowerFilter = filter.toLowerCase();
  const filtered = COMMANDS.filter((cmd) => {
    if (!filter) return true;
    return (
      cmd.name.toLowerCase().includes(lowerFilter) ||
      cmd.description.toLowerCase().includes(lowerFilter)
    );
  });

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? Math.max(filtered.length - 1, 0) : prev - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          const cmd = filtered[selectedIndex];
          // If command accepts an arg, pass any text after the command name
          const arg = extractArg(filter, cmd.name);
          onExecute(cmd.name, arg);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex, filter, onExecute, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (filtered.length === 0) {
    return (
      <div
        ref={menuRef}
        className="rounded-lg border border-neutral-200 dark:border-border shadow-lg bg-white dark:bg-card overflow-hidden"
      >
        <div className="py-3 text-center text-sm text-neutral-500 dark:text-muted-foreground">
          Nenhum comando encontrado
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="rounded-lg border border-neutral-200 dark:border-border shadow-lg bg-white dark:bg-card overflow-hidden"
    >
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-muted-foreground border-b border-neutral-100 dark:border-border">
        Comandos
      </div>
      <ul className="py-1">
        {filtered.map((cmd, idx) => {
          const Icon = cmd.icon;
          const isSelected = idx === selectedIndex;
          return (
            <li
              key={cmd.name}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                isSelected
                  ? "bg-muted text-white"
                  : "hover:bg-neutral-100 dark:hover:bg-muted text-neutral-800 dark:text-foreground"
              }`}
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => {
                const arg = extractArg(filter, cmd.name);
                onExecute(cmd.name, arg);
              }}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-white" : "text-neutral-500 dark:text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${isSelected ? "text-white" : ""}`}>
                  /{cmd.name}
                </span>
                <span className={`ml-2 text-xs ${isSelected ? "text-foreground" : "text-neutral-500 dark:text-muted-foreground"}`}>
                  {cmd.description}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Given the raw filter string (text after the slash) and a command name,
 * extract any trailing argument. E.g. filter="nota Reunião amanhã", name="nota"
 * → "Reunião amanhã"
 */
function extractArg(filter: string, commandName: string): string | undefined {
  const lower = filter.toLowerCase();
  if (lower.startsWith(commandName)) {
    const rest = filter.slice(commandName.length).trim();
    return rest || undefined;
  }
  return undefined;
}
