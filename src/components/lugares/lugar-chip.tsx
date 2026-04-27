"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LugarChipProps {
  lugarId?: number;
  enderecoCompleto?: string | null;
  bairro?: string | null;
  size?: "xs" | "sm" | "md";
  clickable?: boolean;
  onClick?: (resolved: { id?: number; enderecoCompleto?: string | null }) => void;
  className?: string;
}

export function LugarChip({
  lugarId, enderecoCompleto, bairro, size = "sm", clickable = true, onClick, className,
}: LugarChipProps) {
  const content = (
    <>
      <MapPin className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      <span className="truncate max-w-[200px]">{enderecoCompleto ?? "(sem endereço)"}</span>
      {bairro && (
        <span className="text-[9px] px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 opacity-80">
          {bairro}
        </span>
      )}
    </>
  );

  const base = cn(
    "inline-flex items-center gap-1 rounded-md",
    size === "xs" && "text-[10px] px-1 py-0.5",
    size === "sm" && "text-[11px] px-1.5 py-0.5",
    size === "md" && "text-xs px-2 py-1",
    "border border-neutral-200 dark:border-neutral-800",
    className,
  );

  if (!clickable || !onClick) {
    return <span className={base}>{content}</span>;
  }
  return (
    <button
      type="button"
      onClick={() => onClick({ id: lugarId, enderecoCompleto })}
      className={cn(base, "cursor-pointer hover:border-emerald-400")}
    >
      {content}
    </button>
  );
}
