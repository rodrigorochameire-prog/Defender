"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Calendar, ListTodo, MessageSquarePlus, X } from "lucide-react";
import { AgendaQuickSheet } from "./floating-agenda";
import { DemandasQuickSheet } from "./floating-demandas";
import { FeedbackPanel } from "./feedback-panel";
import { useDialogOpen } from "@/hooks/use-dialog-open";
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";

type ActiveSheet = "agenda" | "demandas" | null;

export function FloatingDock() {
  const [active, setActive] = useState<ActiveSheet>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const pathname = usePathname();
  const dialogOpen = useDialogOpen();
  const hidden = useHideOnScroll();

  // Esconde itens específicos quando já está na página
  const hideAgenda = pathname === "/admin/agenda";
  const hideDemandas = pathname === "/admin/demandas";

  // Esconde o cluster enquanto um sheet/dialog está aberto (evita sobreposição
  // com a barra de ação do painel lateral). Quando o próprio dock abre um
  // quick-sheet ou o feedback, mantém montado.
  if (dialogOpen && !active && !feedbackOpen) return null;

  const pinned = feedbackOpen || !!active;

  return (
    <>
      {/* Cluster flutuante — feedback + dock numa pílula única (Padrão Defender v5).
          Some ao rolar para baixo, reaparece ao subir/perto do topo. */}
      <div
        className={cn(
          "fixed z-[52] flex flex-col items-end gap-2",
          "bottom-[5rem] right-4 md:bottom-6 md:right-6",
          "transition-all duration-300 ease-out",
          hidden && !pinned
            ? "translate-y-[140%] opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100"
        )}
      >
        {/* Painel de feedback — abre acima da pílula (flex-col) */}
        {feedbackOpen && <FeedbackPanel onClose={() => setFeedbackOpen(false)} />}

        {/* Pílula vertical unificada */}
        <div
          className={cn(
            "flex flex-col items-stretch",
            "rounded-2xl p-1 gap-0.5",
            "bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md",
            "shadow-lg shadow-black/[0.10]",
            "ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
          )}
        >
          {/* Feedback — sempre presente */}
          <DockButton
            icon={feedbackOpen ? X : MessageSquarePlus}
            label={feedbackOpen ? "Fechar feedback" : "Enviar feedback"}
            active={feedbackOpen}
            onClick={() => setFeedbackOpen((v) => !v)}
          />

          {!hideDemandas && (
            <>
              <div className="mx-2 h-px bg-neutral-200/80 dark:bg-neutral-700/60" />
              <DockButton
                icon={ListTodo}
                label="Demandas"
                onClick={() => setActive("demandas")}
              />
            </>
          )}
          {!hideAgenda && (
            <>
              <div className="mx-2 h-px bg-neutral-200/80 dark:bg-neutral-700/60" />
              <DockButton
                icon={Calendar}
                label="Agenda"
                onClick={() => setActive("agenda")}
              />
            </>
          )}
        </div>
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
  active = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "group relative w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer",
        "transition-all duration-150 active:scale-95",
        active
          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          : cn(
              "text-neutral-500 dark:text-neutral-400",
              "hover:bg-emerald-50 dark:hover:bg-emerald-900/30",
              "hover:text-emerald-600 dark:hover:text-emerald-400"
            )
      )}
    >
      <Icon className="w-[17px] h-[17px]" />
    </button>
  );
}
