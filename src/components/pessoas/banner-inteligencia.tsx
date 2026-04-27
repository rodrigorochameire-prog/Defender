"use client";

import { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronUp, X } from "lucide-react";
import { filterBannerPessoas } from "@/lib/pessoas/should-show-banner";
import { INTEL_CONFIG } from "@/lib/pessoas/intel-config";
import { computeDotLevel, type IntelSignal } from "@/lib/pessoas/compute-dot-level";
import { PessoaChip } from "./pessoa-chip";

interface Props {
  contextType: "processo" | "audiencia" | "atendimento";
  contextId: number;
  signals: IntelSignal[];
  getNome: (pessoaId: number) => string;
  onPessoaClick?: (pessoaId: number) => void;
}

function storageKey(t: string, id: number) {
  return `banner-inteligencia-dismissed-${t}-${id}`;
}

export function BannerInteligencia({ contextType, contextId, signals, getNome, onPessoaClick }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(contextType, contextId));
    if (!raw) return;
    const expireAt = Number(raw);
    if (!Number.isFinite(expireAt)) return;
    if (Date.now() < expireAt) setDismissed(true);
  }, [contextType, contextId]);

  const filtered = filterBannerPessoas(signals);
  if (dismissed || filtered.length === 0) return null;

  const handleDismiss = () => {
    const expireAt = Date.now() + INTEL_CONFIG.banner.dismissDurationDays * 86400_000;
    localStorage.setItem(storageKey(contextType, contextId), String(expireAt));
    setDismissed(true);
  };

  return (
    <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 border-l-[3px] border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-50/50 dark:from-emerald-950/30 dark:to-emerald-950/10">
      <div className="flex items-center gap-2 px-3 py-2">
        <Search className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
        <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex-1">
          Inteligência detectada ({filtered.length})
        </span>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Recolher detalhes" : "Expandir detalhes"}
          className="w-5 h-5 flex items-center justify-center cursor-pointer text-emerald-700 dark:text-emerald-400"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dispensar"
          className="w-5 h-5 flex items-center justify-center cursor-pointer text-emerald-700/60 dark:text-emerald-400/60 hover:text-emerald-700"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-emerald-200 dark:border-emerald-900 px-3 py-2 space-y-1.5">
          {filtered.slice(0, INTEL_CONFIG.banner.maxItems).map((s) => {
            const nome = getNome(s.pessoaId);
            const level = computeDotLevel(s);
            return (
              <div key={s.pessoaId} className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => onPessoaClick?.(s.pessoaId)}
                  className="cursor-pointer"
                >
                  <PessoaChip
                    pessoaId={s.pessoaId}
                    nome={nome}
                    papel={s.papelPrimario ?? undefined}
                    dotLevel={level}
                    size="xs"
                    clickable={false}
                  />
                </button>
                <span className="text-neutral-600 dark:text-neutral-400 flex-1 min-w-0 truncate">
                  {s.contradicoesConhecidas >= 1
                    ? `Contradição registrada em caso anterior`
                    : `${s.totalCasos} casos${s.sameComarcaCount > 0 ? ` (${s.sameComarcaCount} na comarca)` : ""}`}
                </span>
              </div>
            );
          })}
          {filtered.length > INTEL_CONFIG.banner.maxItems && (
            <div className="text-[10px] text-emerald-700/70 italic pt-1">
              + {filtered.length - INTEL_CONFIG.banner.maxItems} outros sinais
            </div>
          )}
        </div>
      )}
    </div>
  );
}
