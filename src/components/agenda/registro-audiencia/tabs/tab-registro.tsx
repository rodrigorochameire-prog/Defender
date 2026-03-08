"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Eye, CheckCircle2, Users, Calendar, Gavel, AlertTriangle,
  FileText, ChevronRight, Mail, Check, Target, BookOpen, Quote,
  Scale, Shield,
} from "lucide-react";
import { getDepoenteStyle } from "../constants";
import type { StatusAudiencia, TabKey } from "../hooks/use-registro-form";
import type { RegistroAudienciaData } from "../types";

interface TabRegistroProps {
  registro: RegistroAudienciaData;
  statusAudiencia: StatusAudiencia;
  completude: number;
  depoentesRedesignacao: string[];
  setActiveTab: (tab: TabKey) => void;
  evento: any;
}

export function TabRegistro({
  registro,
  statusAudiencia,
  completude,
  depoentesRedesignacao,
  setActiveTab,
  evento,
}: TabRegistroProps) {
  const completudeBadgeClass =
    completude >= 80
      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
      : completude >= 50
      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
      : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";

  return (
    <div className="space-y-3 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center">
              <Eye className="w-4 h-4 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Visualização do Registro
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Resumo de tudo que será salvo neste registro
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Completude:</span>
              <Badge className={completudeBadgeClass}>{completude}%</Badge>
            </div>
            <div className="w-32 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-500"
                style={{ width: `${completude}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Geral - 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <div className={`p-2.5 rounded-xl border ${
          statusAudiencia === "concluida"
            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
            : "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-700"
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className={`w-4 h-4 ${
              statusAudiencia === "concluida"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`} />
            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Status</Label>
          </div>
          <p className={`text-sm font-semibold ${
            statusAudiencia === "concluida"
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-zinc-700 dark:text-zinc-300"
          }`}>
            {statusAudiencia === "concluida" ? "Concluída" : statusAudiencia === "redesignada" ? "Redesignada" : "Suspensa"}
          </p>
        </div>

        <div className="p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Depoentes</Label>
          </div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {registro.depoentes.length} cadastrado(s)
          </p>
        </div>

        <div className="p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Data/Hora</Label>
          </div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {new Date(evento.data).toLocaleDateString("pt-BR")} • {evento.horarioInicio}
          </p>
        </div>
      </div>

      {/* Resultado */}
      {registro.resultado && (
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4">
          <Label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2 block">
            Resultado da Audiência
          </Label>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{registro.resultado}</p>
        </div>
      )}

      {/* Depoentes */}
      {registro.depoentes.length > 0 && (
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4">
          <Label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-3 block">
            Depoentes ({registro.depoentes.length})
          </Label>
          <div className="space-y-2.5">
            {registro.depoentes.map((dep) => {
              const style = getDepoenteStyle(dep.tipo);
              return (
                <div key={dep.id} className={`rounded-lg border ${style.border} overflow-hidden`}>
                  <div className={`p-3 border-b border-zinc-200 dark:border-zinc-800 ${style.bg}`}>
                    <div className="flex items-center gap-2">
                      <Badge className={`${style.bg} ${style.text} text-[10px]`}>{style.label}</Badge>
                      <span className={`text-sm font-semibold ${style.text}`}>{dep.nome}</span>
                    </div>
                  </div>

                  <div className="p-3 space-y-3 bg-white dark:bg-zinc-950">
                    {dep.estrategiaInquiricao && (
                      <div>
                        <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                          <Target className="w-3 h-3" /> Estratégia de Inquirição
                        </Label>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{dep.estrategiaInquiricao}</p>
                      </div>
                    )}
                    {dep.perguntasDefesa && (
                      <div>
                        <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                          <BookOpen className="w-3 h-3" /> Perguntas da Defesa
                        </Label>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{dep.perguntasDefesa}</p>
                      </div>
                    )}
                    {dep.depoimentoLiteral && (
                      <div>
                        <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                          <Quote className="w-3 h-3" /> Depoimento Literal
                        </Label>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                          &ldquo;{dep.depoimentoLiteral}&rdquo;
                        </p>
                      </div>
                    )}
                    {dep.analisePercepcoes && (
                      <div>
                        <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                          <Eye className="w-3 h-3" /> Análise e Percepções
                        </Label>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{dep.analisePercepcoes}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-zinc-400" />
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400">Intimado: {dep.intimado ? "Sim" : "Não"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-zinc-400" />
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400">Presente: {dep.presente ? "Sim" : "Não"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Redesignação */}
      {statusAudiencia === "redesignada" && (
        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4">
          <Label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-3 block">
            Informações de Redesignação
          </Label>
          <div className="space-y-2">
            {registro.motivoNaoRealizacao && (
              <div>
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Motivo:</Label>
                <p className="text-sm text-zinc-900 dark:text-zinc-100">{registro.motivoNaoRealizacao}</p>
              </div>
            )}
            {depoentesRedesignacao.length > 0 ? (
              <div>
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Depoentes que motivaram:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {depoentesRedesignacao.map((nome, idx) => (
                    <Badge key={idx} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs border-zinc-200 dark:border-zinc-700">
                      {nome}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-300 italic flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  Nenhum depoente selecionado como motivo
                </p>
              </div>
            )}
            {registro.dataRedesignacao && (
              <div>
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Nova Data:</Label>
                <p className="text-sm text-zinc-900 dark:text-zinc-100">
                  {new Date(registro.dataRedesignacao).toLocaleDateString("pt-BR")}
                  {registro.horarioRedesignacao && ` às ${registro.horarioRedesignacao}`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manifestações */}
      {(registro.manifestacaoMP || registro.manifestacaoDefesa || registro.decisaoJuiz) && (
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500">Manifestações e Decisões</Label>
          <div className="grid grid-cols-1 gap-2">
            {registro.manifestacaoMP && (
              <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                <Label className="text-xs font-semibold mb-1.5 block text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" /> Ministério Público
                </Label>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{registro.manifestacaoMP}</p>
              </div>
            )}
            {registro.manifestacaoDefesa && (
              <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                <Label className="text-xs font-semibold mb-1.5 block text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Defesa
                </Label>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{registro.manifestacaoDefesa}</p>
              </div>
            )}
            {registro.decisaoJuiz && (
              <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                <Label className="text-xs font-semibold mb-1.5 block text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Gavel className="w-3.5 h-3.5" /> Decisão do Juiz
                </Label>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{registro.decisaoJuiz}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Anotações */}
      {registro.anotacoesGerais && (
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4">
          <Label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2 block">
            Anotações Gerais
          </Label>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{registro.anotacoesGerais}</p>
        </div>
      )}

      {/* Campos Pendentes */}
      {(() => {
        const camposPendentes: { label: string; tab: TabKey }[] = [];
        if (!registro.resultado) camposPendentes.push({ label: "Resultado da Audiência", tab: "geral" });
        if (registro.depoentes.length === 0) camposPendentes.push({ label: "Adicionar Depoentes", tab: "depoentes" });
        if (!registro.manifestacaoMP) camposPendentes.push({ label: "Manifestação do MP", tab: "manifestacoes" });
        if (!registro.manifestacaoDefesa) camposPendentes.push({ label: "Manifestação da Defesa", tab: "manifestacoes" });
        if (!registro.decisaoJuiz) camposPendentes.push({ label: "Decisão do Juiz", tab: "manifestacoes" });
        if (!registro.anotacoesGerais) camposPendentes.push({ label: "Anotações Gerais", tab: "anotacoes" });
        if (statusAudiencia === "redesignada" && !registro.motivoNaoRealizacao)
          camposPendentes.push({ label: "Motivo da Redesignação", tab: "geral" });

        return camposPendentes.length > 0 ? (
          <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
            <Label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2 block flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Campos Recomendados ({camposPendentes.length})
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {camposPendentes.map((campo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveTab(campo.tab)}
                  className="px-2 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">{campo.label}</span>
                    <ChevronRight className="w-3 h-3 text-zinc-400 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Footer Info */}
      <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <FileText className="w-3.5 h-3.5" />
            <span>Resumo do registro atual</span>
          </div>
          <div className="text-zinc-500 dark:text-zinc-500">
            {new Date().toLocaleDateString("pt-BR")} • {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </div>
  );
}
