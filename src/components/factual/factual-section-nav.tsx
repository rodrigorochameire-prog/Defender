"use client";

import { useRef, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FactualSectionNavProps {
  secoes: string[];
  activeSecao?: string;
  onSelectSecao?: (secao: string) => void;
}

export function FactualSectionNav({
  secoes,
  activeSecao,
  onSelectSecao,
}: FactualSectionNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll the active pill into view when it changes
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const pill = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const pillRect = pill.getBoundingClientRect();

      if (
        pillRect.left < containerRect.left ||
        pillRect.right > containerRect.right
      ) {
        pill.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeSecao]);

  const handleClick = (secao: string) => {
    onSelectSecao?.(secao);

    // Smooth scroll to section
    const sectionId = `secao-${secao.toLowerCase().replace(/\s+/g, "-")}`;
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (secoes.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-none flex-1 min-w-0"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {secoes.map((secao) => {
        const isActive = activeSecao === secao;
        return (
          <Button
            key={secao}
            ref={isActive ? activeRef : undefined}
            variant="ghost"
            size="sm"
            onClick={() => handleClick(secao)}
            className={cn(
              "shrink-0 h-7 rounded-full px-3 text-xs font-medium transition-all duration-200",
              isActive
                ? "bg-[#1a1a2e] text-white hover:bg-[#1a1a2e]/90 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/30"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-muted"
            )}
          >
            {secao}
          </Button>
        );
      })}
    </div>
  );
}
