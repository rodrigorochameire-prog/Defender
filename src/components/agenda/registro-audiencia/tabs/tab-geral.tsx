"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  UserX,
  Calendar,
  Gavel,
  X,
  Scale,
} from "lucide-react";
import { resultadoOptionsPorAtribuicao, motivoNaoRealizacaoOptions, getDepoenteStyle } from "../constants";
import type { StatusAudiencia } from "../hooks/use-registro-form";
import type { Depoente, RegistroAudienciaData } from "../types";

interface TabGeralProps {
  registro: RegistroAudienciaData;
  updateRegistro: (partial: Partial<RegistroAudienciaData>) => void;
  statusAudiencia: StatusAudiencia;
  setStatusAudiencia: (s: StatusAudiencia) => void;
  decretoRevelia: boolean | null;
  setDecretoRevelia: (v: boolean | null) => void;
  evento: any;
  // Redesignação
  testemunhaIntimada: string;
  setTestemunhaIntimada: (v: string) => void;
  parteInsistiu: string;
  setParteInsistiu: (v: string) => void;
  depoentesRedesignacao: string[];
  setDepoentesRedesignacao: (v: string[]) => void;
  novaDataPopoverOpen: boolean;
  setNovaDataPopoverOpen: (v: boolean) => void;
  novoHorarioPopoverOpen: boolean;
  setNovoHorarioPopoverOpen: (v: boolean) => void;
}

export function TabGeral({
  registro,
  updateRegistro,
  statusAudiencia,
  setStatusAudiencia,
  decretoRevelia,
  setDecretoRevelia,
  evento,
  testemunhaIntimada,
  setTestemunhaIntimada,
  parteInsistiu,
  setParteInsistiu,
  depoentesRedesignacao,
  setDepoentesRedesignacao,
  novaDataPopoverOpen,
  setNovaDataPopoverOpen,
  novoHorarioPopoverOpen,
  setNovoHorarioPopoverOpen,
}: TabGeralProps) {
  const resultadosDisponiveis = resultadoOptionsPorAtribuicao[evento.atribuicao] || resultadoOptionsPorAtribuicao["Criminal Geral"];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Status + Comparecimento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4">
          <Label className="text-xs font-semibold mb-3 block flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            Status da Audiência
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: "concluida" as const, label: "Concluída", icon: CheckCircle2, activeClasses: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30", activeIcon: "text-emerald-600" },
              { key: "redesignada" as const, label: "Redesignada", icon: AlertTriangle, activeClasses: "border-zinc-500 bg-zinc-100 dark:bg-zinc-800/50", activeIcon: "text-zinc-700 dark:text-zinc-300" },
              { key: "suspensa" as const, label: "Suspensa", icon: Clock, activeClasses: "border-zinc-400 bg-zinc-100 dark:bg-zinc-800/50", activeIcon: "text-zinc-600 dark:text-zinc-400" },
            ]).map((s) => {
              const Icon = s.icon;
              const isActive = statusAudiencia === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setStatusAudiencia(s.key);
                    if (s.key === "concluida") updateRegistro({ realizada: true, motivoNaoRealizacao: undefined });
                    if (s.key === "redesignada") updateRegistro({ realizada: false, resultado: "", motivoRedesignacao: undefined });
                    if (s.key === "suspensa") updateRegistro({ realizada: true, resultado: "suspensa" });
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all cursor-pointer",
                    isActive ? s.activeClasses : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <Icon className={cn("w-5 h-5 mx-auto mb-0.5", isActive ? s.activeIcon : "text-zinc-400")} />
                  <p className="font-semibold text-xs text-center">{s.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparecimento */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4">
          <Label className="text-xs font-semibold mb-3 block flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <UserCheck className="w-4 h-4 text-zinc-600 dark:text-zinc-500" />
            Comparecimento do Assistido
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { updateRegistro({ assistidoCompareceu: true }); setDecretoRevelia(null); }}
              className={cn(
                "p-3 rounded-xl border transition-all cursor-pointer",
                registro.assistidoCompareceu
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-200"
              )}
            >
              <UserCheck className={cn("w-6 h-6 mx-auto mb-1", registro.assistidoCompareceu ? "text-emerald-600" : "text-zinc-400")} />
              <p className="font-semibold text-sm text-center">Presente</p>
            </button>
            <button
              type="button"
              onClick={() => { updateRegistro({ assistidoCompareceu: false }); setDecretoRevelia(null); }}
              className={cn(
                "p-3 rounded-xl border transition-all cursor-pointer",
                !registro.assistidoCompareceu
                  ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-rose-200"
              )}
            >
              <UserX className={cn("w-6 h-6 mx-auto mb-1", !registro.assistidoCompareceu ? "text-rose-600" : "text-zinc-400")} />
              <p className="font-semibold text-sm text-center">Ausente</p>
            </button>
          </div>

          {/* Decreto de Revelia */}
          {!registro.assistidoCompareceu && (
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 animate-in fade-in-50 slide-in-from-top-2">
              <Label className="text-xs font-semibold mb-2 block text-zinc-700 dark:text-zinc-300">
                Foi decretada revelia?
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDecretoRevelia(true)}
                  className={cn(
                    "p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                    decretoRevelia === true
                      ? "border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  <Gavel className="inline w-3 h-3 mr-1" />
                  Sim, decretou revelia
                </button>
                <button
                  type="button"
                  onClick={() => setDecretoRevelia(false)}
                  className={cn(
                    "p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                    decretoRevelia === false
                      ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  <X className="inline w-3 h-3 mr-1" />
                  Não decretou revelia
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Redesignação */}
      {statusAudiencia === "redesignada" && (
        <div className="space-y-4 animate-in fade-in-50 slide-in-from-top-2">
          {/* Motivo */}
          <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5">
            <div className="border-l-4 border-zinc-400 dark:border-zinc-600 pl-3 -ml-2 mb-3">
              <Label className="text-sm font-semibold mb-0.5 block text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-zinc-600 dark:text-zinc-500" />
                Motivo da Redesignação
                <span className="ml-auto text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                  Obrigatório
                </span>
              </Label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Selecione ou descreva o motivo da redesignação</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-3">
              {motivoNaoRealizacaoOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateRegistro({ motivoNaoRealizacao: opt.value })}
                    className={cn(
                      "p-2.5 rounded-lg border text-left transition-all cursor-pointer",
                      registro.motivoNaoRealizacao === opt.value
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("w-4 h-4 shrink-0", registro.motivoNaoRealizacao === opt.value ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400")} />
                      <span className="text-xs font-semibold">{opt.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <Textarea
              value={registro.motivoRedesignacao || ""}
              onChange={(e) => updateRegistro({ motivoRedesignacao: e.target.value })}
              placeholder="Detalhe o motivo da redesignação (opcional)"
              rows={3}
              className="text-sm bg-white dark:bg-zinc-950"
            />

            {/* Witness details for redesignation */}
            {registro.motivoNaoRealizacao === "ausencia-testemunha" && (
              <div className="mt-4 space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <Label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Detalhes sobre a Testemunha</Label>

                {registro.depoentes && registro.depoentes.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold mb-2 block text-zinc-700 dark:text-zinc-300">
                      Quais depoentes motivaram a redesignação?
                    </Label>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                      {registro.depoentes.map((depoente, idx) => {
                        const isSelected = depoentesRedesignacao.includes(depoente.nome);
                        const depoenteStyle = getDepoenteStyle(depoente.tipo);
                        return (
                          <label
                            key={idx}
                            className={cn(
                              "p-3 rounded-lg border text-xs font-semibold text-left transition-all cursor-pointer flex items-center gap-3",
                              isSelected
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300"
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) setDepoentesRedesignacao([...depoentesRedesignacao, depoente.nome]);
                                else setDepoentesRedesignacao(depoentesRedesignacao.filter((n) => n !== depoente.nome));
                              }}
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-700 dark:text-zinc-300">{depoente.nome}</span>
                              <Badge className={`${depoenteStyle.bg} ${depoenteStyle.text} text-[10px] px-1.5 py-0`}>{depoenteStyle.label}</Badge>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs font-semibold mb-2 block text-zinc-700 dark:text-zinc-300">A testemunha foi intimada?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "nao-intimada", label: "Não foi intimada" },
                      { value: "nao-compareceu", label: "Foi intimada e não compareceu" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTestemunhaIntimada(opt.value)}
                        className={cn(
                          "p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                          testemunhaIntimada === opt.value
                            ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-2 block text-zinc-700 dark:text-zinc-300">Qual parte insistiu no depoimento?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "mp", label: "Ministério Público" },
                      { value: "defesa", label: "Defesa" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setParteInsistiu(opt.value)}
                        className={cn(
                          "p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                          parteInsistiu === opt.value
                            ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nova Data e Horário */}
          <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5">
            <div className="border-l-4 border-zinc-400 dark:border-zinc-600 pl-3 -ml-2 mb-3">
              <Label className="text-sm font-semibold mb-0.5 block text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-600 dark:text-zinc-500" />
                Nova Data e Horário da Audiência
                <span className="ml-auto text-xs font-normal text-zinc-500 dark:text-zinc-400">(Opcional)</span>
              </Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block text-zinc-700 dark:text-zinc-300">Nova Data</Label>
                <Popover open={novaDataPopoverOpen} onOpenChange={setNovaDataPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal text-sm bg-white dark:bg-zinc-950 cursor-pointer", !registro.dataRedesignacao && "text-zinc-500 dark:text-zinc-400")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {registro.dataRedesignacao ? format(new Date(registro.dataRedesignacao + "T12:00:00"), "PPP", { locale: ptBR }) : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={registro.dataRedesignacao ? new Date(registro.dataRedesignacao + "T12:00:00") : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, "0");
                          const d = String(date.getDate()).padStart(2, "0");
                          updateRegistro({ dataRedesignacao: `${y}-${m}-${d}` });
                          setNovaDataPopoverOpen(false);
                        }
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block text-zinc-700 dark:text-zinc-300">Novo Horário</Label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={registro.horarioRedesignacao || ""}
                    onChange={(e) => updateRegistro({ horarioRedesignacao: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {["08:00", "09:00", "10:00", "13:00", "14:00", "15:00"].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => updateRegistro({ horarioRedesignacao: h })}
                      className={cn(
                        "px-2 py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer",
                        registro.horarioRedesignacao === h
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resultado */}
      {statusAudiencia === "concluida" && (
        <>
          <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4">
            <Label className="text-xs font-semibold mb-3 block flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <Scale className="w-4 h-4 text-zinc-600 dark:text-zinc-500" />
              Resultado da Audiência *
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {resultadosDisponiveis.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateRegistro({ resultado: opt.value, motivoRedesignacao: opt.value !== "redesignada" ? undefined : registro.motivoRedesignacao })}
                    className={cn(
                      "p-2.5 rounded-lg border transition-all cursor-pointer",
                      registro.resultado === opt.value
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300"
                    )}
                  >
                    <Icon className={cn("w-5 h-5 mx-auto mb-1", registro.resultado === opt.value ? "text-emerald-600" : "text-zinc-400")} />
                    <p className="text-xs font-semibold text-center leading-tight">{opt.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tipo de Extinção */}
          {registro.resultado === "extincao" && (
            <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5">
              <div className="border-l-4 border-zinc-400 dark:border-zinc-600 pl-3 -ml-2 mb-3">
                <Label className="text-sm font-semibold mb-0.5 block text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <X className="w-4 h-4 text-zinc-600 dark:text-zinc-500" />
                  Tipo de Extinção
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Especifique qual foi o tipo de extinção</p>
              </div>
              <Textarea
                value={registro.tipoExtincao || ""}
                onChange={(e) => updateRegistro({ tipoExtincao: e.target.value })}
                rows={5}
                className="text-sm bg-white dark:bg-zinc-950"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
