"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notebook } from "lucide-react";
import type { RegistroAudienciaData } from "../types";

interface TabAnotacoesProps {
  registro: RegistroAudienciaData;
  updateRegistro: (partial: Partial<RegistroAudienciaData>) => void;
}

export function TabAnotacoes({ registro, updateRegistro }: TabAnotacoesProps) {
  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      {/* Section Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center">
          <Notebook className="w-4 h-4 text-white dark:text-neutral-900" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Anotações</h3>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Registro de observações e estratégias</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Atendimento Prévio */}
        <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 p-3">
          <Label className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-2 block">
            Atendimento Prévio
          </Label>
          <Textarea
            value={registro.atendimentoReuAntes}
            onChange={(e) => updateRegistro({ atendimentoReuAntes: e.target.value })}
            placeholder="Descreva o atendimento prévio..."
            rows={5}
            className="text-sm bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
          />
        </div>

        {/* Estratégias de Defesa */}
        <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 p-3">
          <Label className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-2 block">
            Estratégias de Defesa
          </Label>
          <Textarea
            value={registro.estrategiasDefesa}
            onChange={(e) => updateRegistro({ estrategiasDefesa: e.target.value })}
            placeholder="Descreva as estratégias adotadas..."
            rows={5}
            className="text-sm bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
          />
        </div>
      </div>

      {/* Anotações Gerais */}
      <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 p-3">
        <Label className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-2 block">
          Anotações Gerais da Audiência
        </Label>
        <Textarea
          value={registro.anotacoesGerais}
          onChange={(e) => updateRegistro({ anotacoesGerais: e.target.value })}
          placeholder="Registre observações gerais, pontos de atenção..."
          rows={6}
          className="text-sm bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
        />
      </div>
    </div>
  );
}
