"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notebook, FileText, Shield } from "lucide-react";
import type { RegistroAudienciaData } from "../types";

interface TabAnotacoesProps {
  registro: RegistroAudienciaData;
  updateRegistro: (partial: Partial<RegistroAudienciaData>) => void;
}

export function TabAnotacoes({ registro, updateRegistro }: TabAnotacoesProps) {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Atendimento Prévio */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5">
          <div className="border-l-4 border-zinc-400 dark:border-zinc-600 pl-3 -ml-2 mb-3">
            <Label className="text-sm font-semibold mb-0.5 block text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-500" />
              Atendimento Prévio
            </Label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Pontos abordados com o assistido</p>
          </div>
          <Textarea
            value={registro.atendimentoReuAntes}
            onChange={(e) => updateRegistro({ atendimentoReuAntes: e.target.value })}
            placeholder="Descreva o atendimento prévio..."
            rows={8}
            className="text-sm bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>

        {/* Estratégias de Defesa */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5">
          <div className="border-l-4 border-zinc-400 dark:border-zinc-600 pl-3 -ml-2 mb-3">
            <Label className="text-sm font-semibold mb-0.5 block text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-zinc-500" />
              Estratégias de Defesa
            </Label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Linhas de defesa adotadas</p>
          </div>
          <Textarea
            value={registro.estrategiasDefesa}
            onChange={(e) => updateRegistro({ estrategiasDefesa: e.target.value })}
            placeholder="Descreva as estratégias adotadas..."
            rows={8}
            className="text-sm bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>
      </div>

      {/* Anotações Gerais */}
      <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5">
        <div className="border-l-4 border-zinc-400 dark:border-zinc-600 pl-3 -ml-2 mb-3">
          <Label className="text-sm font-semibold mb-0.5 block text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Notebook className="w-4 h-4 text-zinc-500" />
            Anotações Gerais da Audiência
          </Label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Observações e pontos de atenção</p>
        </div>
        <Textarea
          value={registro.anotacoesGerais}
          onChange={(e) => updateRegistro({ anotacoesGerais: e.target.value })}
          placeholder="Registre observações gerais, pontos de atenção..."
          rows={10}
          className="text-sm bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
        />
      </div>
    </div>
  );
}
