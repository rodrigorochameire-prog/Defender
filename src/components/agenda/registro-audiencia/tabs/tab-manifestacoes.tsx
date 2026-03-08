"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Scale, Shield, Gavel, ArrowRight } from "lucide-react";
import type { RegistroAudienciaData } from "../types";

interface TabManifestacoesProps {
  registro: RegistroAudienciaData;
  updateRegistro: (partial: Partial<RegistroAudienciaData>) => void;
}

export function TabManifestacoes({ registro, updateRegistro }: TabManifestacoesProps) {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Row 1: MP + Defesa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5">
          <div className="border-l-4 border-zinc-400 dark:border-zinc-600 pl-3 -ml-2 mb-3">
            <Label className="text-sm font-semibold mb-0.5 block text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-zinc-500" />
              Manifestação do MP
            </Label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Posicionamento do Ministério Público</p>
          </div>
          <Textarea
            value={registro.manifestacaoMP}
            onChange={(e) => updateRegistro({ manifestacaoMP: e.target.value })}
            placeholder="Digite o conteúdo..."
            rows={8}
            className="text-sm bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>

        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5">
          <div className="border-l-4 border-zinc-400 dark:border-zinc-600 pl-3 -ml-2 mb-3">
            <Label className="text-sm font-semibold mb-0.5 block text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-zinc-500" />
              Manifestação da Defesa
            </Label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Manifestação apresentada pela defesa</p>
          </div>
          <Textarea
            value={registro.manifestacaoDefesa}
            onChange={(e) => updateRegistro({ manifestacaoDefesa: e.target.value })}
            placeholder="Digite o conteúdo..."
            rows={8}
            className="text-sm bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>
      </div>

      {/* Row 2: Juiz + Encaminhamentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5">
          <div className="border-l-4 border-zinc-400 dark:border-zinc-600 pl-3 -ml-2 mb-3">
            <Label className="text-sm font-semibold mb-0.5 block text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Gavel className="w-4 h-4 text-zinc-500" />
              Decisões do Juiz
            </Label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Decisões proferidas em audiência</p>
          </div>
          <Textarea
            value={registro.decisaoJuiz}
            onChange={(e) => updateRegistro({ decisaoJuiz: e.target.value })}
            placeholder="Digite o conteúdo..."
            rows={8}
            className="text-sm bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>

        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5">
          <div className="border-l-4 border-zinc-400 dark:border-zinc-600 pl-3 -ml-2 mb-3">
            <Label className="text-sm font-semibold mb-0.5 block text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-zinc-500" />
              Encaminhamentos
            </Label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Próximos passos definidos</p>
          </div>
          <Textarea
            value={registro.encaminhamentos}
            onChange={(e) => updateRegistro({ encaminhamentos: e.target.value })}
            placeholder="Digite o conteúdo..."
            rows={8}
            className="text-sm bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>
      </div>
    </div>
  );
}
