"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { HistoricoSubTabs } from "../historico/historico-sub-tabs";
import { RegistroPreviewCard } from "../historico/registro-preview-card";
import { TimelineCard } from "../historico/timeline-card";
import { countCompletude } from "../historico/count-completude";
import type { RegistroAudienciaData } from "../types";

interface Props {
  registrosAnteriores: any[];
  registroAtual: RegistroAudienciaData;
  statusAtual?: string;
}

export function TabHistorico({ registrosAnteriores, registroAtual, statusAtual }: Props) {
  const [subTab, setSubTab] = useState<"edicao" | "anteriores">(
    registrosAnteriores.length === 0 ? "edicao" : "anteriores"
  );
  const [openIdx, setOpenIdx] = useState<number | null>(
    registrosAnteriores.length > 0 ? 0 : null
  );

  const completudeCount = countCompletude(registroAtual, statusAtual);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white dark:text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Histórico de Audiências
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {registrosAnteriores.length} registro{registrosAnteriores.length !== 1 ? "s" : ""} salvo{registrosAnteriores.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <HistoricoSubTabs
        active={subTab}
        onChange={setSubTab}
        anterioresCount={registrosAnteriores.length}
        completudeCount={completudeCount}
      />

      {subTab === "edicao" && (
        <RegistroPreviewCard
          registro={registroAtual}
          statusAudiencia={statusAtual}
          variant="preview"
        />
      )}

      {subTab === "anteriores" && (
        <>
          {registrosAnteriores.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 p-8 text-center">
              <BookOpen className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Nenhum registro ainda</p>
              <p className="text-xs text-neutral-500 mt-1">Preencha as abas e clique em Salvar Registro.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {registrosAnteriores.map((reg, idx) => (
                <TimelineCard
                  key={reg.historicoId ?? idx}
                  registro={reg}
                  isOpen={openIdx === idx}
                  onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
