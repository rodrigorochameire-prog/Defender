"use client";

import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

const TIPO_COR: Record<string, string> = {
  "arma-fogo": "bg-rose-100 text-rose-700 border-rose-200",
  "munição": "bg-rose-100 text-rose-700 border-rose-200",
  "droga": "bg-amber-100 text-amber-700 border-amber-200",
  "celular": "bg-blue-100 text-blue-700 border-blue-200",
  "veiculo": "bg-purple-100 text-purple-700 border-purple-200",
  "dinheiro": "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export interface ObjetoChipProps {
  objetoId?: number;
  tipo: string;
  descricao: string;
  size?: "xs" | "sm" | "md";
  clickable?: boolean;
  onClick?: (resolved: { id?: number; descricao: string }) => void;
  className?: string;
}

export function ObjetoChip({ objetoId, tipo, descricao, size = "sm", clickable = true, onClick, className }: ObjetoChipProps) {
  const cor = TIPO_COR[tipo] ?? "bg-neutral-100 text-neutral-700 border-neutral-200";
  const content = (
    <>
      <Package className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      <span className="truncate max-w-[180px]">{descricao}</span>
    </>
  );
  const base = cn(
    "inline-flex items-center gap-1 rounded-md border",
    size === "xs" && "text-[10px] px-1 py-0.5",
    size === "sm" && "text-[11px] px-1.5 py-0.5",
    size === "md" && "text-xs px-2 py-1",
    cor,
    className,
  );
  if (!clickable || !onClick) return <span className={base}>{content}</span>;
  return (
    <button type="button" onClick={() => onClick({ id: objetoId, descricao })} className={cn(base, "cursor-pointer")}>
      {content}
    </button>
  );
}
