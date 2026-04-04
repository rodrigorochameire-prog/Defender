"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Circle,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  ListChecks,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Prioridade = "alta" | "media" | "baixa";

interface PontoRoteiro {
  id: string;
  texto: string;
  prioridade: Prioridade;
  coberto: boolean;
}

interface RoteiroSustentacaoProps {
  isDarkMode: boolean;
  faseSelecionada: { id: string; label: string };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "defender_cockpit_roteiro";

const PRIORIDADE_CONFIG: Record<
  Prioridade,
  { label: string; className: string }
> = {
  alta: {
    label: "Alta",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  },
  media: {
    label: "Media",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  baixa: {
    label: "Baixa",
    className:
      "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadPontos(): PontoRoteiro[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PontoRoteiro[]) : [];
  } catch {
    return [];
  }
}

function savePontos(pontos: PontoRoteiro[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pontos));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

function genId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoteiroSustentacao({
  isDarkMode,
  faseSelecionada,
}: RoteiroSustentacaoProps) {
  const [pontos, setPontos] = useState<PontoRoteiro[]>([]);
  const [novoTexto, setNovoTexto] = useState("");
  const [novaPrioridade, setNovaPrioridade] = useState<Prioridade>("media");
  const [mounted, setMounted] = useState(false);

  const isSustentacao = faseSelecionada.id.includes("sustentacao");

  // Load from localStorage on mount
  useEffect(() => {
    setPontos(loadPontos());
    setMounted(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (mounted) savePontos(pontos);
  }, [pontos, mounted]);

  // ------- Actions -------

  const addPonto = useCallback(() => {
    const text = novoTexto.trim();
    if (!text) return;
    setPontos((prev) => [
      ...prev,
      { id: genId(), texto: text, prioridade: novaPrioridade, coberto: false },
    ]);
    setNovoTexto("");
  }, [novoTexto, novaPrioridade]);

  const toggleCoberto = useCallback((id: string) => {
    setPontos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, coberto: !p.coberto } : p)),
    );
  }, []);

  const removePonto = useCallback((id: string) => {
    setPontos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const moveUp = useCallback((idx: number) => {
    if (idx <= 0) return;
    setPontos((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((idx: number) => {
    setPontos((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  // ------- Derived -------

  const total = pontos.length;
  const cobertos = pontos.filter((p) => p.coberto).length;
  const pct = total > 0 ? Math.round((cobertos / total) * 100) : 0;

  // ------- Render -------

  return (
    <div
      className={cn(
        "rounded-xl border bg-white",
        "border-neutral-200/80 dark:border-neutral-800/80 dark:bg-neutral-900",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Roteiro de Sustentacao
          </h3>
          {total > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] font-medium tabular-nums"
            >
              {cobertos}/{total} cobertos
            </Badge>
          )}
        </div>
        {isSustentacao && total > 0 && cobertos < total && (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-wider text-amber-500 font-medium">
              Em sustentacao
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Progresso
            </span>
            <span className="text-[10px] font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
              {pct}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Add new point */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Input
          placeholder="Novo ponto..."
          value={novoTexto}
          onChange={(e) => setNovoTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addPonto();
          }}
          className="h-8 text-sm"
        />
        <select
          value={novaPrioridade}
          onChange={(e) => setNovaPrioridade(e.target.value as Prioridade)}
          className={cn(
            "h-8 rounded-md border px-2 text-xs",
            "border-neutral-200 bg-white text-neutral-700",
            "dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
            "focus:outline-none focus:ring-1 focus:ring-emerald-600",
          )}
        >
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baixa">Baixa</option>
        </select>
        <Button
          size="sm"
          onClick={addPonto}
          disabled={!novoTexto.trim()}
          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Points list */}
      <div className="max-h-[360px] overflow-y-auto px-4 pb-3">
        {total === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ListChecks className="mb-2 h-8 w-8 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Nenhum ponto adicionado
            </p>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-1">
              Adicione os pontos que o defensor deve cobrir
            </p>
          </div>
        )}

        <ul className="space-y-1.5">
          {pontos.map((ponto, idx) => (
            <li
              key={ponto.id}
              className={cn(
                "group flex items-start gap-2 rounded-lg border-l-2 px-3 py-2 transition-colors",
                ponto.coberto
                  ? "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : "border-l-amber-400 bg-neutral-50/50 dark:bg-neutral-800/40",
                !ponto.coberto &&
                  isSustentacao &&
                  "animate-pulse [animation-duration:3s]",
              )}
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => toggleCoberto(ponto.id)}
                className="mt-0.5 shrink-0"
                aria-label={
                  ponto.coberto ? "Desmarcar como coberto" : "Marcar como coberto"
                }
              >
                {ponto.coberto ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 text-neutral-400 hover:text-emerald-600 transition-colors cursor-pointer" />
                )}
              </button>

              {/* Text + priority */}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm leading-snug",
                    ponto.coberto
                      ? "line-through text-neutral-400 dark:text-neutral-500"
                      : "text-neutral-900 dark:text-neutral-100",
                  )}
                >
                  {ponto.texto}
                </p>
                <Badge
                  variant="secondary"
                  className={cn(
                    "mt-1 text-[10px] px-1.5 py-0",
                    PRIORIDADE_CONFIG[ponto.prioridade].className,
                  )}
                >
                  {PRIORIDADE_CONFIG[ponto.prioridade].label}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className={cn(
                    "rounded p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors",
                    idx === 0 && "invisible",
                  )}
                  aria-label="Mover para cima"
                >
                  <ChevronUp className="h-3.5 w-3.5 text-neutral-500" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(idx)}
                  disabled={idx === total - 1}
                  className={cn(
                    "rounded p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors",
                    idx === total - 1 && "invisible",
                  )}
                  aria-label="Mover para baixo"
                >
                  <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
                </button>
                <button
                  type="button"
                  onClick={() => removePonto(ponto.id)}
                  className="rounded p-0.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                  aria-label="Remover ponto"
                >
                  <Trash2 className="h-3.5 w-3.5 text-neutral-400 hover:text-rose-500 transition-colors" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
