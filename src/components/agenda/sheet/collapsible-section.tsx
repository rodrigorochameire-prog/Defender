"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "agenda-sheet-sections-open";

function readState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeState(id: string, open: boolean) {
  if (typeof window === "undefined") return;
  const current = readState();
  current[id] = open;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

interface Props {
  id: string;
  label: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  id, label, count, defaultOpen = false, children, className,
}: Props) {
  const [open, setOpen] = useState(() => {
    const persisted = readState()[id];
    return persisted !== undefined ? persisted : defaultOpen;
  });

  useEffect(() => {
    writeState(id, open);
  }, [id, open]);

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      data-section-id={id}
      className={cn(
        "rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden transition-shadow duration-200",
        className
      )}
    >
      <Collapsible.Trigger asChild>
        <button
          type="button"
          className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wide uppercase">
              {label}
            </span>
            {count !== undefined && count > 0 && (
              <span className="text-[9px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                {count}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-neutral-400 transition-transform duration-150 motion-reduce:transition-none",
              open && "rotate-180"
            )}
          />
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="px-4 pb-4 pt-1 motion-reduce:animate-none">
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
