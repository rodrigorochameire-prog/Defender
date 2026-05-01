"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notebook, MessageSquare, NotebookPen } from "lucide-react";
import type { RegistroAudienciaData } from "../types";
import { RegistrosTimeline } from "@/components/registros/registros-timeline";
import { NovoRegistroButton } from "@/components/registros/novo-registro-button";

interface TabAnotacoesProps {
  registro: RegistroAudienciaData;
  updateRegistro: (partial: Partial<RegistroAudienciaData>) => void;
  audienciaId?: number | null;
  assistidoId?: number;
}

export function TabAnotacoes({ registro, updateRegistro, audienciaId, assistidoId }: TabAnotacoesProps) {
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

      {/* Manifestações e Decisões (absorvido de tab-manifestacoes) */}
      <div className="flex items-center gap-2.5 mt-6 mb-3">
        <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white dark:text-neutral-900" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Manifestações e Decisões</h3>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Posicionamentos das partes em audiência</p>
        </div>
      </div>

      {/* Row 1: MP + Defesa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 p-3">
          <Label className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-2 block">
            Manifestação do MP
          </Label>
          <Textarea
            value={registro.manifestacaoMP}
            onChange={(e) => updateRegistro({ manifestacaoMP: e.target.value })}
            placeholder="Digite o conteúdo..."
            rows={5}
            className="text-sm bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
          />
        </div>

        <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 p-3">
          <Label className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-2 block">
            Manifestação da Defesa
          </Label>
          <Textarea
            value={registro.manifestacaoDefesa}
            onChange={(e) => updateRegistro({ manifestacaoDefesa: e.target.value })}
            placeholder="Digite o conteúdo..."
            rows={5}
            className="text-sm bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
          />
        </div>
      </div>

      {/* Row 2: Decisão Juiz */}
      <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 p-3">
        <Label className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-2 block">
          Decisões do Juiz
        </Label>
        <Textarea
          value={registro.decisaoJuiz}
          onChange={(e) => updateRegistro({ decisaoJuiz: e.target.value })}
          placeholder="Digite o conteúdo..."
          rows={5}
          className="text-sm bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
        />
      </div>

      {/* Registros tipados — timeline da audiência */}
      {audienciaId ? (
        <div className="mt-6 space-y-3 border-t border-neutral-200 dark:border-neutral-800 pt-4">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center">
              <NotebookPen className="w-4 h-4 text-white dark:text-neutral-900" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Registros</h3>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Anotações tipadas vinculadas a esta audiência</p>
            </div>
          </div>
          {assistidoId ? (
            <NovoRegistroButton
              assistidoId={assistidoId}
              audienciaId={audienciaId}
              tipoDefault="anotacao"
            />
          ) : null}
          <RegistrosTimeline
            audienciaId={audienciaId}
            emptyHint="Sem registros nesta audiência."
          />
        </div>
      ) : null}
    </div>
  );
}
