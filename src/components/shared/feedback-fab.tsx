"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MessageSquarePlus, X } from "lucide-react";
import { useDialogOpen } from "@/hooks/use-dialog-open";
import { FeedbackPanel } from "./feedback-panel";

/**
 * FAB de feedback para páginas FORA do app admin. Dentro de `/admin/*` o
 * FloatingDock já provê o feedback como item da pílula unificada, então este
 * componente se auto-oculta lá para não duplicar o botão.
 */
export function FeedbackFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const dialogOpen = useDialogOpen();

  // Login não tem feedback; em /admin o FloatingDock assume.
  if (pathname === "/login" || pathname.startsWith("/admin")) return null;
  // Esconde enquanto um sheet/dialog está aberto (o popover não é role="dialog").
  if (dialogOpen && !isOpen) return null;

  return (
    <div className="fixed z-[52] bottom-[5rem] right-4 md:bottom-6 md:right-6 flex flex-col items-end gap-2">
      {isOpen && <FeedbackPanel onClose={() => setIsOpen(false)} />}
      <button
        onClick={() => setIsOpen((v) => !v)}
        title={isOpen ? "Fechar feedback" : "Enviar feedback"}
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-2xl",
          "bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md",
          "shadow-lg shadow-black/[0.10] ring-1 ring-black/[0.06] dark:ring-white/[0.08]",
          "text-neutral-500 dark:text-neutral-400",
          "hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400",
          "transition-all duration-150 active:scale-95 cursor-pointer"
        )}
      >
        {isOpen ? (
          <X className="w-[17px] h-[17px]" />
        ) : (
          <MessageSquarePlus className="w-[17px] h-[17px]" />
        )}
      </button>
    </div>
  );
}
