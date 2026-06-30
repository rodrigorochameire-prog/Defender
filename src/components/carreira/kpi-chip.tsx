import type React from "react";

export function KpiChip({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-white/[0.08] px-3 py-1.5">
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-white/70" /> : null}
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-semibold text-white">{value}</div>
        <div className="truncate text-[11px] text-white/60">{label}</div>
      </div>
    </div>
  );
}
