"use client";

import { cn } from "@/lib/utils";

interface FactualSectionProps {
  nome: string;
  children: React.ReactNode;
}

export function FactualSection({ nome, children }: FactualSectionProps) {
  return (
    <section
      id={`secao-${nome.toLowerCase().replace(/\s+/g, "-")}`}
      className="scroll-mt-24"
    >
      {/* Section divider */}
      <div className="flex items-center gap-4 mb-6 mt-10 first:mt-0">
        <h2
          className={cn(
            "shrink-0 text-xs font-semibold tracking-[0.2em] uppercase",
            "text-[#1a1a2e] dark:text-amber-400"
          )}
          style={{ fontVariant: "small-caps" }}
        >
          {nome}
        </h2>
        <div
          className={cn(
            "flex-1 h-px",
            "bg-[#1a1a2e]/20 dark:bg-border"
          )}
        />
      </div>

      {/* Articles */}
      <div className="space-y-6">{children}</div>
    </section>
  );
}
