"use client";

import { cn } from "@/lib/utils";
import { TIPO_META, type EncaminhamentoTipo } from "./tipo-colors";

export function TipoEncaminhamentoSelector({
  value,
  onChange,
}: {
  value: EncaminhamentoTipo;
  onChange: (v: EncaminhamentoTipo) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {(Object.keys(TIPO_META) as EncaminhamentoTipo[]).map((t) => {
        const m = TIPO_META[t];
        const { Icon } = m;
        const selected = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              "p-2.5 rounded-lg border-[1.5px] transition-all cursor-pointer flex flex-col items-center gap-1",
              selected
                ? cn(m.chipBg, m.chipText, "border-current")
                : "border-transparent bg-neutral-50 dark:bg-neutral-800/40 text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
            )}
          >
            <div
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center",
                selected
                  ? cn(m.colorBar, "text-white")
                  : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold">{m.label}</span>
            <span className="text-[9px] text-center leading-tight opacity-70">{m.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
