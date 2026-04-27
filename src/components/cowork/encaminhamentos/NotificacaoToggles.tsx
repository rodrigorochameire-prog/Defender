"use client";

import { Bell, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NotificacaoState {
  ombuds: boolean;
  whatsapp: boolean;
  email: boolean;
}

function Toggle({
  active,
  onToggle,
  icon,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-medium cursor-pointer transition-all",
        active
          ? "bg-neutral-900 text-white border-neutral-900"
          : "bg-white dark:bg-neutral-900 text-muted-foreground border-neutral-200 dark:border-neutral-700",
      )}
    >
      <span
        className={cn(
          "w-7 h-4 rounded-full relative transition-all",
          active ? "bg-emerald-500" : "bg-neutral-300",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all",
            active ? "left-3.5" : "left-0.5",
          )}
        />
      </span>
      {icon}
      {label}
    </button>
  );
}

export function NotificacaoToggles({
  value,
  onChange,
}: {
  value: NotificacaoState;
  onChange: (v: NotificacaoState) => void;
}) {
  return (
    <div className="p-3 rounded-lg bg-neutral-50/60 dark:bg-neutral-800/40 border border-neutral-200/40 dark:border-neutral-700/40">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Bell className="w-3 h-3" /> Notificar por
      </div>
      <div className="flex gap-2 flex-wrap">
        <Toggle
          active={value.ombuds}
          onToggle={() => onChange({ ...value, ombuds: !value.ombuds })}
          icon={<Bell className="w-3 h-3" />}
          label="OMBUDS"
        />
        <Toggle
          active={value.whatsapp}
          onToggle={() => onChange({ ...value, whatsapp: !value.whatsapp })}
          icon={<span className="text-[10px] font-bold">W</span>}
          label="WhatsApp"
        />
        <Toggle
          active={value.email}
          onToggle={() => onChange({ ...value, email: !value.email })}
          icon={<Mail className="w-3 h-3" />}
          label="Email"
        />
      </div>
    </div>
  );
}
