"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Calendar, ListTodo } from "lucide-react";
import { AgendaQuickSheet } from "./floating-agenda";
import { DemandasQuickSheet } from "./floating-demandas";

type ActiveSheet = "agenda" | "demandas" | null;

export function FloatingDock() {
  const [active, setActive] = useState<ActiveSheet>(null);
  const pathname = usePathname();

  // Esconde itens específicos quando já está na página
  const hideAgenda = pathname === "/admin/agenda";
  const hideDemandas = pathname === "/admin/demandas";

  // Se os dois estão escondidos, não renderiza o dock
  if (hideAgenda && hideDemandas) return null;

  return (
    <>
      {/* Dock — pílula vertical unificada, Padrão Defender v5 */}
      <div
        className={cn(
          "fixed z-[51] flex flex-col items-stretch",
          "bottom-[5rem] right-4 md:bottom-6 md:right-6",
          "rounded-2xl p-1 gap-0.5",
          "bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md",
          "shadow-lg shadow-black/[0.10]",
          "ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
        )}
      >
        {!hideDemandas && (
          <DockButton
            icon={ListTodo}
            label="Demandas"
            onClick={() => setActive("demandas")}
          />
        )}
        {!hideAgenda && !hideDemandas && (
          <div className="mx-2 h-px bg-neutral-200/80 dark:bg-neutral-700/60" />
        )}
        {!hideAgenda && (
          <DockButton
            icon={Calendar}
            label="Agenda"
            onClick={() => setActive("agenda")}
          />
        )}
      </div>

      {/* Sheets */}
      {active === "agenda" && <AgendaQuickSheet onClose={() => setActive(null)} />}
      {active === "demandas" && <DemandasQuickSheet onClose={() => setActive(null)} />}
    </>
  );
}

function DockButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "group relative w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer",
        "text-neutral-500 dark:text-neutral-400",
        "hover:bg-emerald-50 dark:hover:bg-emerald-900/30",
        "hover:text-emerald-600 dark:hover:text-emerald-400",
        "active:scale-95 transition-all duration-150"
      )}
    >
      <Icon className="w-[17px] h-[17px]" />
    </button>
  );
}
