"use client";

import { cn } from "@/lib/utils";

export interface DistribuicaoEntry {
  /** Rótulo da entrada (ex.: "Dr. Rodrigo"). */
  label: string;
  /** Contagem desta entrada. */
  value: number;
  /** Classe Tailwind da cor do segmento/avatar (ex.: "bg-emerald-500"). */
  colorClass: string;
  /** Inicial exibida no avatar (ex.: "R"). Default: primeira letra do label. */
  initial?: string;
  /** Classe opcional para o número da contagem (ex.: "text-emerald-700"). */
  countClass?: string;
}

export interface DistribuicaoBarProps {
  entries: DistribuicaoEntry[];
  className?: string;
}

/**
 * Barra de distribuição proporcional reutilizável (F3-E) — extraída da paridade
 * inline do Júri. Cada segmento tem cor e rótulo vindos das props (nada
 * hardcoded). Renderiza barras proporcionais ao maior valor, a contagem por
 * entrada e, para exatamente duas entradas, um indicador de equilíbrio.
 */
export function DistribuicaoBar({ entries, className }: DistribuicaoBarProps) {
  const maxCount = Math.max(...entries.map((e) => e.value), 1);

  // Layout espelhado (canônico do Júri) só faz sentido para 2 entradas.
  if (entries.length === 2) {
    const [a, b] = entries;
    const balance = a.value - b.value;
    return (
      <div
        className={cn(
          "flex items-center gap-4 p-3 rounded-xl bg-card border border-border",
          className
        )}
      >
        {/* Entrada A */}
        <div className="flex items-center gap-2.5 flex-1">
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold",
              a.colorClass
            )}
          >
            {a.initial ?? a.label.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">{a.label}</span>
              <span className={cn("text-sm font-bold tabular-nums", a.countClass)}>
                {a.value}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                data-distribuicao-bar
                className={cn("h-full rounded-full transition-all duration-500", a.colorClass)}
                style={{ width: `${(a.value / maxCount) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Indicador de equilíbrio */}
        <div className="flex flex-col items-center shrink-0 px-3">
          <span
            className={cn(
              "text-base font-semibold tabular-nums",
              balance === 0
                ? "text-muted-foreground/50"
                : Math.abs(balance) <= 1
                  ? "text-muted-foreground"
                  : "text-amber-600 dark:text-amber-400/70"
            )}
          >
            {balance === 0 ? "=" : balance > 0 ? `+${balance}` : balance}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50">
            {balance === 0 ? "Paridade" : "Diferença"}
          </span>
        </div>

        {/* Entrada B (espelhada) */}
        <div className="flex items-center gap-2.5 flex-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className={cn("text-sm font-bold tabular-nums", b.countClass)}>
                {b.value}
              </span>
              <span className="text-xs font-semibold text-foreground">{b.label}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                data-distribuicao-bar
                className={cn(
                  "h-full rounded-full transition-all duration-500 ml-auto",
                  b.colorClass
                )}
                style={{ width: `${(b.value / maxCount) * 100}%` }}
              />
            </div>
          </div>
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold",
              b.colorClass
            )}
          >
            {b.initial ?? b.label.charAt(0)}
          </div>
        </div>
      </div>
    );
  }

  // Layout empilhado para N entradas.
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 p-3 rounded-xl bg-card border border-border",
        className
      )}
    >
      {entries.map((e) => (
        <div key={e.label} className="flex items-center gap-2.5">
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0",
              e.colorClass
            )}
          >
            {e.initial ?? e.label.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">{e.label}</span>
              <span className={cn("text-sm font-bold tabular-nums", e.countClass)}>
                {e.value}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                data-distribuicao-bar
                className={cn("h-full rounded-full transition-all duration-500", e.colorClass)}
                style={{ width: `${(e.value / maxCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
