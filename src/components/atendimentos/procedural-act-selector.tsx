"use client";

// Seletor de "Ato a praticar" premium (Fase 5.2): campo de busca + sugestões
// agrupadas por categoria, com texto livre preservado. Inline (sem portal/popover
// aninhado) — robusto e testável. A lógica de busca/agrupamento vem de filtrarAtos.

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { filtrarAtos } from "./gerar-demanda-logic";

export function ProceduralActSelector({
  atribuicao,
  value,
  onChange,
  autoFocus,
  placeholder,
  id,
}: {
  atribuicao: string;
  value: string;
  onChange: (ato: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
  id?: string;
}) {
  // O próprio valor é a query (combobox de texto livre): digitar filtra; clicar fixa.
  const grupos = useMemo(() => filtrarAtos(atribuicao, value), [atribuicao, value]);

  return (
    <div className="space-y-1.5">
      <Input
        id={id}
        role="combobox"
        aria-expanded={grupos.length > 0}
        aria-controls="ato-listbox"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder ?? "Buscar ou digitar o ato…"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-sm"
      />
      {grupos.length > 0 && (
        <div
          id="ato-listbox"
          role="listbox"
          aria-label="Atos sugeridos"
          className="max-h-44 overflow-y-auto rounded-lg border border-neutral-200/70 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800/60"
        >
          {grupos.map((g) => (
            <div key={g.group} className="py-1">
              <p className="px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                {g.group}
              </p>
              {g.options.map((o) => {
                const selecionado = value.trim().toLowerCase() === o.label.toLowerCase();
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={selecionado}
                    onClick={() => onChange(o.label)}
                    className={cn(
                      "w-full text-left px-2 py-1 text-[12.5px] rounded-md transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50",
                      selecionado
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
