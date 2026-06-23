"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProcessoTipoBadge } from "./processo-tipo-badge";

interface Props {
  proc: {
    id: number;
    numeroAutos: string | null;
    tipoProcesso: string | null;
    classeProcessual?: string | null;
    situacao?: string | null;
  };
  hierarchy: "principal" | "incidental";
  isCurrent?: boolean;
  /** Variante visual: "dark" para uso no header (fundo escuro). Default "light". */
  variant?: "dark" | "light";
}

export function ProcessoVinculadoRow({ proc, hierarchy, isCurrent, variant = "light" }: Props) {
  const dark = variant === "dark";
  return (
    <Link
      href={`/admin/processos/${proc.id}`}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors group",
        hierarchy === "incidental" && "ml-4",
        dark
          ? cn("hover:bg-white/[0.06]", isCurrent && "bg-white/[0.08]")
          : cn("hover:bg-neutral-100 dark:hover:bg-neutral-900", isCurrent && "bg-neutral-100 dark:bg-neutral-900/60"),
      )}
    >
      <ProcessoTipoBadge tipo={proc.tipoProcesso} />
      <span
        className={cn(
          "text-[12px] font-mono",
          dark ? "text-white/80" : "text-neutral-700 dark:text-neutral-300",
        )}
      >
        {proc.numeroAutos ?? "s/n"}
      </span>
      {proc.classeProcessual && (
        <span
          className={cn(
            "text-[10px] truncate",
            dark ? "text-white/40" : "text-neutral-500 dark:text-neutral-500",
          )}
        >
          · {proc.classeProcessual}
        </span>
      )}
      <ChevronRight
        className={cn(
          "ml-auto h-3 w-3 transition-colors",
          dark
            ? "text-white/30 group-hover:text-white/60"
            : "text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-600 dark:group-hover:text-neutral-400",
        )}
      />
    </Link>
  );
}
