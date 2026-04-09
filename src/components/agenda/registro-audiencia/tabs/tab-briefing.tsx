"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BriefingSection } from "@/components/briefing";
import { TabPreparacao } from "./tab-preparacao";
import type { Depoente } from "../types";

interface TabBriefingProps {
  evento: any;
  audienciaId: number | null;
  onImportarParaDepoentes?: (depoentes: Depoente[]) => void;
}

export function TabBriefing({ evento, audienciaId, onImportarParaDepoentes }: TabBriefingProps) {
  const [preparacaoOpen, setPreparacaoOpen] = useState(false);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Briefing Section (original content) */}
      <BriefingSection
        evento={evento}
        audienciaId={audienciaId ?? undefined}
        processoId={evento?.processoId ?? evento?.processo?.id}
        casoId={evento?.casoId}
      />

      {/* Preparacao Section (collapsible, absorbed from tab-preparacao) */}
      <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden">
        <button
          type="button"
          onClick={() => setPreparacaoOpen(!preparacaoOpen)}
          className="w-full flex items-center gap-2.5 px-4 py-3 bg-neutral-50/50 dark:bg-neutral-900/30 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer"
        >
          {preparacaoOpen ? (
            <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
          )}
          <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center shrink-0">
            <Wand2 className="w-4 h-4 text-white dark:text-neutral-900" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Preparacao da Audiencia
            </p>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
              Preview de depoentes e pipeline de preparacao
            </p>
          </div>
        </button>

        {preparacaoOpen && (
          <div className="border-t border-neutral-200/80 dark:border-neutral-800/80 p-4">
            <TabPreparacao
              audienciaId={audienciaId}
              evento={evento}
              onImportarParaDepoentes={onImportarParaDepoentes}
            />
          </div>
        )}
      </div>
    </div>
  );
}
