"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  MessageSquarePlus,
  X,
  Bug,
  Lightbulb,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Console error capture (module-level, last 5 errors)
// ---------------------------------------------------------------------------

const consoleErrors: string[] = [];

if (typeof window !== "undefined") {
  window.onerror = (_msg, _source, _lineno, _colno, error) => {
    const entry = error?.message ?? String(_msg);
    consoleErrors.push(entry);
    if (consoleErrors.length > 5) consoleErrors.shift();
  };

  window.addEventListener("unhandledrejection", (event) => {
    const entry =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);
    consoleErrors.push(entry);
    if (consoleErrors.length > 5) consoleErrors.shift();
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedbackTipo = "BUG" | "SUGESTAO" | "DUVIDA";

const TIPO_CONFIG: {
  value: FeedbackTipo;
  label: string;
  icon: typeof Bug;
  color: string;
  selectedBg: string;
  selectedBorder: string;
  selectedText: string;
}[] = [
  {
    value: "BUG",
    label: "Bug",
    icon: Bug,
    color: "rose",
    selectedBg: "bg-rose-50 dark:bg-rose-950/30",
    selectedBorder: "border-rose-300 dark:border-rose-700",
    selectedText: "text-rose-700 dark:text-rose-400",
  },
  {
    value: "SUGESTAO",
    label: "Sugestão",
    icon: Lightbulb,
    color: "emerald",
    selectedBg: "bg-emerald-50 dark:bg-emerald-950/30",
    selectedBorder: "border-emerald-300 dark:border-emerald-700",
    selectedText: "text-emerald-700 dark:text-emerald-400",
  },
  {
    value: "DUVIDA",
    label: "Dúvida",
    icon: HelpCircle,
    color: "blue",
    selectedBg: "bg-blue-50 dark:bg-blue-950/30",
    selectedBorder: "border-blue-300 dark:border-blue-700",
    selectedText: "text-blue-700 dark:text-blue-400",
  },
];

const MAX_CHARS = 500;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeedbackFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [tipo, setTipo] = useState<FeedbackTipo | null>(null);
  const [mensagem, setMensagem] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  const createFeedback = trpc.feedbacks.create.useMutation({
    onSuccess: () => {
      toast.success("Feedback enviado, obrigado!");
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar feedback");
    },
  });

  function resetForm() {
    setTipo(null);
    setMensagem("");
  }

  function handleToggle() {
    if (isOpen) {
      setIsOpen(false);
      resetForm();
    } else {
      setIsOpen(true);
    }
  }

  function handleSubmit() {
    if (!tipo || !mensagem.trim()) return;

    createFeedback.mutate({
      tipo: tipo.toLowerCase() as "bug" | "sugestao" | "duvida",
      mensagem: mensagem.trim(),
      pagina: pathname,
      contexto: {
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent,
        consoleErrors: [...consoleErrors],
      },
    });
  }

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        resetForm();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  // Auto-focus textarea when popover opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let animation start
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Don't render on login page (must be after all hooks)
  if (pathname === "/login") return null;

  const canSubmit = !!tipo && mensagem.trim().length > 0;

  // Dock height depende de quantos ícones estão visíveis
  // 2 ícones = 82px · 1 ícone = 44px · 0 = dock hidden
  const dockItems =
    (pathname === "/admin/agenda" ? 0 : 1) +
    (pathname === "/admin/demandas" ? 0 : 1);

  // Desktop: dock at bottom-6 (24px). Feedback = 24 + dockH + 32 gap
  // Mobile: dock at bottom-[5rem] (80px). Feedback = 80 + dockH + 32 gap
  // (Gap aumentado de 16 → 32 pra criar separação visual clara entre o FAB
  // de feedback e o dock de agenda/demandas — antes pareciam sobrepostos.)
  const btnBottomClass =
    dockItems === 2
      ? "bottom-[12.125rem] md:bottom-[8.625rem]" // 194 / 138
      : dockItems === 1
      ? "bottom-[9.75rem] md:bottom-[6.25rem]"    // 156 / 100
      : "bottom-[5rem] md:bottom-6";              //  80 / 24

  const popoverBottomClass =
    dockItems === 2
      ? "bottom-[15.25rem] md:bottom-[11.75rem]"  // ~244 / 188
      : dockItems === 1
      ? "bottom-[12.875rem] md:bottom-[9.375rem]" // ~206 / 150
      : "bottom-[8.125rem] md:bottom-[4.625rem]"; // ~130 / 74

  return (
    <>
      {/* FAB Button — mesma linguagem do FloatingDock */}
      <button
        onClick={handleToggle}
        className={cn(
          "fixed z-[52] flex items-center justify-center",
          "w-10 h-10 rounded-2xl",
          "bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md",
          "shadow-lg shadow-black/[0.10] ring-1 ring-black/[0.06] dark:ring-white/[0.08]",
          "text-neutral-500 dark:text-neutral-400",
          "hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400",
          "transition-all duration-150 active:scale-95",
          btnBottomClass,
          "right-4 md:right-6",
          "cursor-pointer"
        )}
        title={isOpen ? "Fechar feedback" : "Enviar feedback"}
      >
        {isOpen ? (
          <X className="w-[17px] h-[17px]" />
        ) : (
          <MessageSquarePlus className="w-[17px] h-[17px]" />
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-[52]",
            popoverBottomClass,
            "right-4 md:right-6",
            "w-80 sm:w-96",
            "bg-white dark:bg-neutral-900 rounded-xl ring-1 ring-black/[0.06] dark:ring-white/[0.06] shadow-2xl shadow-black/[0.12]",
            "animate-in fade-in slide-in-from-bottom-2 duration-200"
          )}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              Enviar feedback
            </h3>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              Sua opinião ajuda a melhorar o OMBUDS
            </p>
          </div>

          {/* Type chips */}
          <div className="px-4 py-2 flex gap-2">
            {TIPO_CONFIG.map((t) => {
              const Icon = t.icon;
              const isSelected = tipo === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTipo(t.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                    isSelected
                      ? cn(t.selectedBg, t.selectedBorder, t.selectedText)
                      : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-750"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Textarea */}
          <div className="px-4 py-2">
            <textarea
              ref={textareaRef}
              value={mensagem}
              onChange={(e) =>
                setMensagem(e.target.value.slice(0, MAX_CHARS))
              }
              rows={3}
              maxLength={MAX_CHARS}
              placeholder="Descreva o que aconteceu ou o que poderia melhorar..."
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm resize-none",
                "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700",
                "text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
                "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500",
                "transition-colors"
              )}
            />
          </div>

          {/* Footer */}
          <div className="px-4 pb-4 pt-1 flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 tabular-nums">
              {mensagem.length}/{MAX_CHARS}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || createFeedback.isPending}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                canSubmit && !createFeedback.isPending
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
              )}
            >
              {createFeedback.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : null}
              Enviar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
