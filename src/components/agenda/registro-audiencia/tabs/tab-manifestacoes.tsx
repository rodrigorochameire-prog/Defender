"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import type { RegistroAudienciaData } from "../types";

interface TabManifestacoesProps {
  registro: RegistroAudienciaData;
  updateRegistro: (partial: Partial<RegistroAudienciaData>) => void;
}

export function TabManifestacoes({ registro, updateRegistro }: TabManifestacoesProps) {
  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      {/* Section Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white dark:text-zinc-900" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Manifestações e Decisões</h3>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Posicionamentos das partes em audiência</p>
        </div>
      </div>

      {/* Row 1: MP + Defesa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
          <Label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2 block">
            Manifestação do MP
          </Label>
          <Textarea
            value={registro.manifestacaoMP}
            onChange={(e) => updateRegistro({ manifestacaoMP: e.target.value })}
            placeholder="Digite o conteúdo..."
            rows={5}
            className="text-sm bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>

        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
          <Label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2 block">
            Manifestação da Defesa
          </Label>
          <Textarea
            value={registro.manifestacaoDefesa}
            onChange={(e) => updateRegistro({ manifestacaoDefesa: e.target.value })}
            placeholder="Digite o conteúdo..."
            rows={5}
            className="text-sm bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>
      </div>

      {/* Row 2: Juiz + Encaminhamentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
          <Label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2 block">
            Decisões do Juiz
          </Label>
          <Textarea
            value={registro.decisaoJuiz}
            onChange={(e) => updateRegistro({ decisaoJuiz: e.target.value })}
            placeholder="Digite o conteúdo..."
            rows={5}
            className="text-sm bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>

        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
          <Label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2 block">
            Encaminhamentos
          </Label>
          <Textarea
            value={registro.encaminhamentos}
            onChange={(e) => updateRegistro({ encaminhamentos: e.target.value })}
            placeholder="Digite o conteúdo..."
            rows={5}
            className="text-sm bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>
      </div>
    </div>
  );
}
