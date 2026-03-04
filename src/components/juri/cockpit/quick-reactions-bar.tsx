"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComportamentoRegistro {
  id: string;
  juradoId: number;
  timestamp: string;
  fase: string;
  momento: string;
  tipo:
    | "reacao_facial"
    | "linguagem_corporal"
    | "interacao"
    | "atencao"
    | "posicionamento"
    | "verbal";
  descricao: string;
  interpretacao: "favoravel" | "neutro" | "desfavoravel" | "incerto";
  relevancia: 1 | 2 | 3;
}

interface JuradoSorteado {
  id: number;
  nome: string;
  genero: "M" | "F";
  profissao?: string;
  taxaAbsolvicao: number;
  cadeira: number;
  foto?: string;
  comportamentos: ComportamentoRegistro[];
}

interface QuickReactionsBarProps {
  conselhoSentenca: (JuradoSorteado | null)[];
  faseSelecionada: { id: string; label: string };
  isDarkMode: boolean;
  onAddComportamento: (
    cadeira: number,
    comportamento: Omit<ComportamentoRegistro, "id" | "timestamp">
  ) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(nome: string): string {
  return nome
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getTaxaDotColor(taxa: number): string {
  if (taxa >= 60) return "bg-emerald-500";
  if (taxa >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickReactionsBar({
  conselhoSentenca,
  faseSelecionada,
  isDarkMode,
  onAddComportamento,
}: QuickReactionsBarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeJuradoIdx, setActiveJuradoIdx] = useState<number | null>(null);
  const [quickNote, setQuickNote] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Count seated jurors
  const seatedJurors = conselhoSentenca.filter(
    (j): j is JuradoSorteado => j !== null
  );

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setActiveJuradoIdx(null);
        setQuickNote("");
      }
    }

    if (activeJuradoIdx !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [activeJuradoIdx]);

  // Focus input when popover opens
  useEffect(() => {
    if (activeJuradoIdx !== null) {
      // Small delay to let the popover render
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [activeJuradoIdx]);

  const handleReaction = useCallback(
    (
      cadeira: number,
      jurado: JuradoSorteado,
      interpretacao: "favoravel" | "neutro" | "desfavoravel"
    ) => {
      const labelMap = {
        favoravel: "favoravel",
        neutro: "neutra",
        desfavoravel: "desfavoravel",
      } as const;

      const descricao =
        quickNote.trim() ||
        `Reacao ${labelMap[interpretacao]} durante ${faseSelecionada.label}`;

      onAddComportamento(cadeira, {
        juradoId: jurado.id,
        fase: faseSelecionada.id,
        momento: faseSelecionada.label,
        tipo: "reacao_facial",
        descricao,
        interpretacao,
        relevancia: 2,
      });

      setActiveJuradoIdx(null);
      setQuickNote("");
    },
    [quickNote, faseSelecionada, onAddComportamento]
  );

  // Don't render if no jurors are seated
  if (seatedJurors.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-16 md:bottom-0 left-0 right-0 md:left-64",
        "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm",
        "border-t border-zinc-200 dark:border-zinc-800",
        "z-30 transition-all duration-300",
        isCollapsed ? "h-8" : "h-14"
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute -top-6 left-1/2 -translate-x-1/2",
          "flex h-6 w-10 items-center justify-center",
          "rounded-t-lg border border-b-0 border-zinc-200 dark:border-zinc-800",
          "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm",
          "text-zinc-400 dark:text-zinc-500",
          "hover:text-zinc-600 dark:hover:text-zinc-300",
          "cursor-pointer transition-colors duration-200"
        )}
      >
        {isCollapsed ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Collapsed state: just a thin label */}
      {isCollapsed ? (
        <div className="flex h-full items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Reacoes Rapidas ({seatedJurors.length} jurados)
          </span>
        </div>
      ) : (
        /* Expanded state: avatars row */
        <div className="flex h-full items-center justify-center gap-3 px-4">
          {/* Phase indicator */}
          <span className="hidden sm:inline text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mr-1">
            {faseSelecionada.label}
          </span>

          {/* Juror avatars */}
          {conselhoSentenca.map((jurado, idx) => {
            if (!jurado) {
              // Empty chair
              return (
                <div
                  key={`empty-${idx}`}
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center",
                    "rounded-full border-2 border-dashed border-zinc-200 dark:border-zinc-700",
                    "text-[10px] text-zinc-300 dark:text-zinc-600"
                  )}
                >
                  {idx + 1}
                </div>
              );
            }

            const behaviorCount = jurado.comportamentos.length;
            const isActive = activeJuradoIdx === idx;

            return (
              <div key={jurado.id} className="relative">
                {/* Avatar button */}
                <button
                  onClick={() => {
                    setActiveJuradoIdx(isActive ? null : idx);
                    setQuickNote("");
                  }}
                  className={cn(
                    "relative cursor-pointer transition-all duration-200",
                    isActive && "scale-110"
                  )}
                >
                  <Avatar
                    className={cn(
                      "h-9 w-9 border-2",
                      isActive
                        ? "ring-2 ring-emerald-400 border-emerald-400 dark:ring-emerald-500 dark:border-emerald-500"
                        : "border-zinc-200 dark:border-zinc-700 hover:ring-2 hover:ring-emerald-400 dark:hover:ring-emerald-500"
                    )}
                  >
                    {jurado.foto ? (
                      <AvatarImage
                        src={jurado.foto}
                        alt={jurado.nome}
                      />
                    ) : null}
                    <AvatarFallback
                      className={cn(
                        "text-[10px] font-semibold",
                        "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      )}
                    >
                      {getInitials(jurado.nome)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Chair number badge */}
                  <span
                    className={cn(
                      "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center",
                      "rounded-full text-[8px] font-bold",
                      "bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900",
                      "border border-white dark:border-zinc-900"
                    )}
                  >
                    {jurado.cadeira}
                  </span>

                  {/* Taxa absolvicao dot */}
                  <span
                    className={cn(
                      "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full",
                      "border border-white dark:border-zinc-900",
                      getTaxaDotColor(jurado.taxaAbsolvicao)
                    )}
                  />

                  {/* Behavior count badge */}
                  {behaviorCount > 0 && (
                    <span
                      className={cn(
                        "absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center",
                        "rounded-full text-[8px] font-bold",
                        "bg-blue-500 text-white",
                        "border border-white dark:border-zinc-900"
                      )}
                    >
                      {behaviorCount > 9 ? "9+" : behaviorCount}
                    </span>
                  )}
                </button>

                {/* Reaction Popover */}
                {isActive && (
                  <div
                    ref={popoverRef}
                    className={cn(
                      "absolute bottom-full left-1/2 -translate-x-1/2 mb-3",
                      "w-52 rounded-xl shadow-xl",
                      "bg-white dark:bg-zinc-900",
                      "border border-zinc-200 dark:border-zinc-800",
                      "p-3 z-50"
                    )}
                  >
                    {/* Arrow */}
                    <div
                      className={cn(
                        "absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full",
                        "w-0 h-0",
                        "border-l-[6px] border-l-transparent",
                        "border-r-[6px] border-r-transparent",
                        "border-t-[6px] border-t-zinc-200 dark:border-t-zinc-800"
                      )}
                    />
                    <div
                      className={cn(
                        "absolute bottom-[1px] left-1/2 -translate-x-1/2 translate-y-full",
                        "w-0 h-0",
                        "border-l-[5px] border-l-transparent",
                        "border-r-[5px] border-r-transparent",
                        "border-t-[5px] border-t-white dark:border-t-zinc-900"
                      )}
                    />

                    {/* Juror name */}
                    <p className="mb-2 truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {jurado.nome}
                    </p>

                    {/* Quick description input */}
                    <input
                      ref={inputRef}
                      type="text"
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      placeholder={`Reacao durante ${faseSelecionada.label}...`}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setActiveJuradoIdx(null);
                          setQuickNote("");
                        }
                      }}
                      className={cn(
                        "mb-3 w-full rounded-lg border px-2.5 py-1.5 text-[11px]",
                        "border-zinc-200 bg-zinc-50 text-zinc-700",
                        "placeholder:text-zinc-400",
                        "focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300/30",
                        "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                        "dark:placeholder:text-zinc-500",
                        "dark:focus:border-emerald-600 dark:focus:ring-emerald-600/20",
                        "transition-all duration-200"
                      )}
                    />

                    {/* Reaction buttons */}
                    <div className="flex items-center justify-center gap-2">
                      {/* Favorable */}
                      <button
                        onClick={() =>
                          handleReaction(
                            jurado.cadeira,
                            jurado,
                            "favoravel"
                          )
                        }
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          "bg-emerald-50 text-emerald-600",
                          "hover:bg-emerald-100 hover:text-emerald-700",
                          "dark:bg-emerald-950/30 dark:text-emerald-400",
                          "dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300",
                          "cursor-pointer transition-all duration-200",
                          "active:scale-95"
                        )}
                        title="Favoravel"
                      >
                        <ThumbsUp className="h-5 w-5" />
                      </button>

                      {/* Neutral */}
                      <button
                        onClick={() =>
                          handleReaction(jurado.cadeira, jurado, "neutro")
                        }
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          "bg-amber-50 text-amber-600",
                          "hover:bg-amber-100 hover:text-amber-700",
                          "dark:bg-amber-950/30 dark:text-amber-400",
                          "dark:hover:bg-amber-950/50 dark:hover:text-amber-300",
                          "cursor-pointer transition-all duration-200",
                          "active:scale-95"
                        )}
                        title="Neutro"
                      >
                        <Minus className="h-5 w-5" />
                      </button>

                      {/* Unfavorable */}
                      <button
                        onClick={() =>
                          handleReaction(
                            jurado.cadeira,
                            jurado,
                            "desfavoravel"
                          )
                        }
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          "bg-rose-50 text-rose-600",
                          "hover:bg-rose-100 hover:text-rose-700",
                          "dark:bg-rose-950/30 dark:text-rose-400",
                          "dark:hover:bg-rose-950/50 dark:hover:text-rose-300",
                          "cursor-pointer transition-all duration-200",
                          "active:scale-95"
                        )}
                        title="Desfavoravel"
                      >
                        <ThumbsDown className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
