"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function BarChartSimple({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d) => (
        <Tooltip key={d.label}>
          <TooltipTrigger asChild>
            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums">{d.value}</span>
              <div
                className="w-full rounded-t-md transition-all min-h-[2px]"
                style={{
                  height: `${Math.max((d.value / max) * 80, 2)}px`,
                  backgroundColor: d.color,
                }}
              />
              <span className="text-[9px] text-zinc-400 truncate max-w-[40px]">{d.label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{d.label}: {d.value}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
