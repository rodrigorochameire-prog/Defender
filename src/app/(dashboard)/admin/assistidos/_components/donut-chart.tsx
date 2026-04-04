"use client";

import React from "react";

export function DonutChart({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div className="text-xs text-neutral-400">Sem dados</div>;

  let cumPercent = 0;
  const gradientParts = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const start = cumPercent;
      const pct = (d.value / total) * 100;
      cumPercent += pct;
      return `${d.color} ${start}% ${cumPercent}%`;
    });

  return (
    <div className="flex items-center gap-4">
      <div
        className="w-24 h-24 rounded-full shrink-0"
        style={{
          background: `conic-gradient(${gradientParts.join(", ")})`,
          mask: "radial-gradient(circle at center, transparent 40%, black 41%)",
          WebkitMask: "radial-gradient(circle at center, transparent 40%, black 41%)",
        }}
      />
      <div className="space-y-1">
        {data
          .filter((d) => d.value > 0)
          .map((d) => (
            <div key={d.label} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-neutral-600 dark:text-neutral-400">{d.label}</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">{d.value}</span>
              <span className="text-neutral-400 text-[10px]">({Math.round((d.value / total) * 100)}%)</span>
            </div>
          ))}
      </div>
    </div>
  );
}
