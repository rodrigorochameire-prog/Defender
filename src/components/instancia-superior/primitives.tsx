// ─── Shared presentational primitives — Instância Superior ────────────────
import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ title, icon: Icon, children, action }: {
  title: string; icon?: React.ElementType; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#1c1c1f] rounded-xl border border-neutral-200/70 dark:border-white/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200/50 dark:border-white/[0.04]">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-muted-foreground/70 leading-relaxed py-4 text-center">{children}</p>;
}

export function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1.5 block">{children}</label>;
}

export function Dot() {
  return <span className="text-neutral-300 dark:text-neutral-600">·</span>;
}

export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn(
      "text-[11px] px-2 py-1 rounded-md border transition-colors flex items-center gap-1 cursor-pointer",
      active ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
        : "border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
    )}>{children}</button>
  );
}

export function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 block mb-1.5">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

export function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="text-[9px] uppercase tracking-widest font-semibold text-neutral-400 block">{label}</span>
      <span className="text-[13px] text-foreground/85">{value || "—"}</span>
    </div>
  );
}

export function TagRow({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 block mb-1.5">{label}</span>
      <div className="flex flex-wrap gap-1">
        {tags.map((t, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/[0.06] text-foreground/70">{t}</span>)}
      </div>
    </div>
  );
}
