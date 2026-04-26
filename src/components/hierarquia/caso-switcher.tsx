"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { ChevronDown, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  assistidoId: number;
  activeCasoId: number;
}

export function CaseSwitcher({ assistidoId, activeCasoId }: Props) {
  const [open, setOpen] = useState(false);
  const { data: casos = [] } = trpc.casos.getCasosDoAssistido.useQuery({ assistidoId });

  const active = casos.find((c: any) => c.id === activeCasoId);
  const outros = casos.filter((c: any) => c.id !== activeCasoId);
  const hasMultiple = casos.length > 1;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => hasMultiple && setOpen((o) => !o)}
        disabled={!hasMultiple}
        aria-label={hasMultiple ? "Trocar caso" : undefined}
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded text-sm",
          hasMultiple ? "cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800" : "cursor-default opacity-90",
        )}
      >
        <Briefcase className="w-3 h-3" />
        <span className="font-medium truncate max-w-[260px]">{active?.titulo ?? "—"}</span>
        {hasMultiple && <ChevronDown className="w-3 h-3" />}
      </button>

      {open && hasMultiple && (
        <div className="absolute top-full left-0 mt-1 w-72 rounded border bg-white dark:bg-neutral-900 shadow-md py-1 z-50">
          {outros.map((c: any) => (
            <Link
              key={c.id}
              href={`/admin/assistidos/${assistidoId}/caso/${c.id}`}
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <div className="font-medium truncate">{c.titulo}</div>
              <div className="text-[10px] text-neutral-500">{c.status}{c.fase ? ` · ${c.fase}` : ""}</div>
            </Link>
          ))}
          <div className="border-t mt-1 pt-1">
            <Link
              href={`/admin/assistidos/${assistidoId}/casos`}
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              Ver todos + novo caso →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
