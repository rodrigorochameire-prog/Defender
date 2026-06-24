// ─── Dark header controls (padrão Demandas) ───────────────────────────────
import { cn } from "@/lib/utils";
import { TRIBUNAIS } from "./ds";
import type { EscopoModo } from "./logic";

export function DarkEscopoSwitch({ value, onChange }: { value: EscopoModo; onChange: (v: EscopoModo) => void }) {
  return (
    <div className="flex items-center rounded-lg bg-white/[0.08] ring-1 ring-white/[0.05] p-0.5 shrink-0">
      {([{ k: "meus", label: "Meus" }, { k: "todos", label: "Institucional" }] as const).map(o => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={cn(
            "text-[10.5px] px-2 py-1 rounded-md transition-all cursor-pointer font-medium",
            value === o.k ? "bg-white/90 text-neutral-800 shadow-sm" : "text-white/60 hover:text-white"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DarkTribunalPills({
  value, onChange, porTribunal,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  porTribunal?: { tribunal: string; total: number }[];
}) {
  const countOf = (k: string) => porTribunal?.find(t => t.tribunal === k)?.total ?? 0;
  return (
    <div className="flex items-center gap-1 shrink-0">
      {TRIBUNAIS.map(t => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(active ? undefined : t.key)}
            title={t.full}
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all duration-150 cursor-pointer ring-1 ring-inset shrink-0",
              active ? "bg-white/[0.14] text-white ring-white/20" : "ring-white/[0.06] text-white/55 hover:text-white hover:bg-white/[0.06]"
            )}
          >
            <span>{t.label}</span>
            <span className={cn("tabular-nums font-semibold", active ? "text-white/80" : "text-white/35")}>{countOf(t.key)}</span>
          </button>
        );
      })}
    </div>
  );
}
