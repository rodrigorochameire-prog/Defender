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

  // Don't render on login page
  if (pathname === "/login") return null;

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
      tipo,
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

  const canSubmit = !!tipo && mensagem.trim().length > 0;

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={handleToggle}
        className={cn(
          "fixed z-[52] flex items-center justify-center",
          "w-11 h-11 rounded-full shadow-lg",
          "bg-zinc-900 dark:bg-zinc-700 text-white",
          "hover:bg-emerald-600 dark:hover:bg-emerald-600",
          "transition-all duration-200 active:scale-95",
          "bottom-[8.5rem] right-4 sm:bottom-6 sm:right-[4.5rem]",
          "cursor-pointer"
        )}
        title={isOpen ? "Fechar feedback" : "Enviar feedback"}
      >
        {isOpen ? (
          <X className="w-5 h-5 transition-transform duration-200 rotate-0" />
        ) : (
          <MessageSquarePlus className="w-5 h-5 transition-transform duration-200" />
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-[52]",
            "bottom-[12rem] right-4 sm:bottom-[4.5rem] sm:right-[4.5rem]",
            "w-80 sm:w-96",
            "bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl",
            "animate-in fade-in slide-in-from-bottom-2 duration-200"
          )}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Enviar feedback
            </h3>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
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
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-750"
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
                "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
                "text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
                "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500",
                "transition-colors"
              )}
            />
          </div>

          {/* Footer */}
          <div className="px-4 pb-4 pt-1 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums">
              {mensagem.length}/{MAX_CHARS}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || createFeedback.isPending}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                canSubmit && !createFeedback.isPending
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
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
