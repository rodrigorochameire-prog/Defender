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

// --- Status options ---
const statusOptions: {
  key: StatusAudiencia;
  label: string;
  icon: typeof CheckCircle2;
  activeBg: string;
  activeText: string;
  activeIcon: string;
}[] = [
  {
    key: "concluida",
    label: "Concluída",
    icon: CheckCircle2,
    activeBg: "bg-emerald-50 dark:bg-emerald-950/30",
    activeText: "text-emerald-700 dark:text-emerald-400",
    activeIcon: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "redesignada",
    label: "Redesignada",
    icon: AlertTriangle,
    activeBg: "bg-zinc-100 dark:bg-zinc-800/50",
    activeText: "text-zinc-800 dark:text-zinc-200",
    activeIcon: "text-zinc-700 dark:text-zinc-300",
  },
  {
    key: "suspensa",
    label: "Suspensa",
    icon: Clock,
    activeBg: "bg-zinc-100 dark:bg-zinc-800/50",
    activeText: "text-zinc-700 dark:text-zinc-300",
    activeIcon: "text-zinc-600 dark:text-zinc-400",
  },
];

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
    <div className="space-y-3 max-w-5xl mx-auto">
      {/* ── Status + Comparecimento ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Status — segmented control */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-2 text-zinc-400 dark:text-zinc-500">
            Status da Audiência
          </p>
          <div className="flex rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
            {statusOptions.map((s, idx) => {
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
                    "flex-1 px-2 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer",
                    idx < statusOptions.length - 1 && "border-r border-zinc-200/80 dark:border-zinc-800/80",
                    isActive
                      ? `${s.activeBg} ${s.activeText}`
                      : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? s.activeIcon : "text-zinc-400 dark:text-zinc-500")} />
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparecimento — segmented control */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-2 text-zinc-400 dark:text-zinc-500">
            Comparecimento do Assistido
          </p>
          <div className="flex rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
            <button
              type="button"
              onClick={() => { updateRegistro({ assistidoCompareceu: true }); setDecretoRevelia(null); }}
              className={cn(
                "flex-1 px-3 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer border-r border-zinc-200/80 dark:border-zinc-800/80",
                registro.assistidoCompareceu
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                  : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              )}
            >
              <UserCheck className={cn("w-3.5 h-3.5 shrink-0", registro.assistidoCompareceu ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400")} />
              Presente
            </button>
            <button
              type="button"
              onClick={() => { updateRegistro({ assistidoCompareceu: false }); setDecretoRevelia(null); }}
              className={cn(
                "flex-1 px-3 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer",
                !registro.assistidoCompareceu
                  ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400"
                  : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              )}
            >
              <UserX className={cn("w-3.5 h-3.5 shrink-0", !registro.assistidoCompareceu ? "text-rose-600 dark:text-rose-400" : "text-zinc-400")} />
              Ausente
            </button>
          </div>

          {/* Revelia — inline toggle */}
          {!registro.assistidoCompareceu && (
            <div className="mt-2.5 flex items-center gap-2.5 animate-in fade-in-50 slide-in-from-top-2">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                Revelia?
              </span>
              <div className="flex rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden flex-1">
                <button
                  type="button"
                  onClick={() => setDecretoRevelia(true)}
                  className={cn(
                    "flex-1 px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border-r border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-center gap-1",
                    decretoRevelia === true
                      ? "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                      : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <Gavel className="w-3 h-3 shrink-0" />
                  Sim, decretou
                </button>
                <button
                  type="button"
                  onClick={() => setDecretoRevelia(false)}
                  className={cn(
                    "flex-1 px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1",
                    decretoRevelia === false
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <X className="w-3 h-3 shrink-0" />
                  Não decretou
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Redesignação ── */}
      {statusAudiencia === "redesignada" && (
        <div className="space-y-3 animate-in fade-in-50 slide-in-from-top-2">
          {/* Motivo */}
          <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500">
                Motivo da Redesignação
              </p>
              <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 border-zinc-300 dark:border-zinc-700 text-zinc-500">
                Obrigatório
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {motivoNaoRealizacaoOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = registro.motivoNaoRealizacao === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateRegistro({ motivoNaoRealizacao: opt.value })}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                      isActive
                        ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-400")} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <Textarea
              value={registro.motivoRedesignacao || ""}
              onChange={(e) => updateRegistro({ motivoRedesignacao: e.target.value })}
              placeholder="Detalhe o motivo da redesignação (opcional)"
              rows={2}
              className="text-sm bg-white dark:bg-zinc-950"
            />

            {/* Witness details */}
            {registro.motivoNaoRealizacao === "ausencia-testemunha" && (
              <div className="mt-3 space-y-2.5 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Detalhes sobre a Testemunha</p>

                {registro.depoentes && registro.depoentes.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 text-zinc-400 dark:text-zinc-500">
                      Depoentes que motivaram
                    </p>
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {registro.depoentes.map((depoente, idx) => {
                        const isSelected = depoentesRedesignacao.includes(depoente.nome);
                        const depoenteStyle = getDepoenteStyle(depoente.tipo);
                        return (
                          <label
                            key={idx}
                            className={cn(
                              "px-2.5 py-2 rounded-lg border text-xs font-semibold cursor-pointer flex items-center gap-2.5 transition-all",
                              isSelected
                                ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800"
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
                            <span className="text-zinc-700 dark:text-zinc-300">{depoente.nome}</span>
                            <Badge className={`${depoenteStyle.bg} ${depoenteStyle.text} text-[10px] px-1.5 py-0`}>{depoenteStyle.label}</Badge>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Intimada + Parte insistiu — side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 text-zinc-400 dark:text-zinc-500">
                      Testemunha intimada?
                    </p>
                    <div className="flex rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
                      {[
                        { value: "nao-intimada", label: "Não intimada" },
                        { value: "nao-compareceu", label: "Intimada, não compareceu" },
                      ].map((opt, idx) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTestemunhaIntimada(opt.value)}
                          className={cn(
                            "flex-1 px-2 py-1.5 text-[10px] font-semibold transition-all cursor-pointer leading-tight",
                            idx === 0 && "border-r border-zinc-200/80 dark:border-zinc-800/80",
                            testemunhaIntimada === opt.value
                              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                              : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 text-zinc-400 dark:text-zinc-500">
                      Parte que insistiu
                    </p>
                    <div className="flex rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
                      {[
                        { value: "mp", label: "Ministério Público" },
                        { value: "defesa", label: "Defesa" },
                      ].map((opt, idx) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setParteInsistiu(opt.value)}
                          className={cn(
                            "flex-1 px-2 py-1.5 text-[10px] font-semibold transition-all cursor-pointer",
                            idx === 0 && "border-r border-zinc-200/80 dark:border-zinc-800/80",
                            parteInsistiu === opt.value
                              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                              : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nova Data e Horário */}
          <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500">
                Nova Data e Horário
              </p>
              <span className="ml-auto text-[10px] text-zinc-400 dark:text-zinc-500">Opcional</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block text-zinc-600 dark:text-zinc-400">Nova Data</Label>
                <Popover open={novaDataPopoverOpen} onOpenChange={setNovaDataPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal text-sm h-8 bg-white dark:bg-zinc-950 cursor-pointer", !registro.dataRedesignacao && "text-zinc-500 dark:text-zinc-400")}
                    >
                      <Calendar className="mr-2 h-3.5 w-3.5" />
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
                <Label className="text-xs font-semibold mb-1.5 block text-zinc-600 dark:text-zinc-400">Novo Horário</Label>
                <input
                  type="time"
                  value={registro.horarioRedesignacao || ""}
                  onChange={(e) => updateRegistro({ horarioRedesignacao: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm h-8 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
                />
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {["08:00", "09:00", "10:00", "13:00", "14:00", "15:00"].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => updateRegistro({ horarioRedesignacao: h })}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-semibold rounded-md border transition-all cursor-pointer",
                        registro.horarioRedesignacao === h
                          ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300"
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

      {/* ── Resultado ── */}
      {statusAudiencia === "concluida" && (
        <>
          <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <Scale className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500">
                Resultado da Audiência
              </p>
              <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 border-zinc-300 dark:border-zinc-700 text-zinc-500">
                Obrigatório
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {resultadosDisponiveis.map((opt) => {
                const Icon = opt.icon;
                const isActive = registro.resultado === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateRegistro({ resultado: opt.value, motivoRedesignacao: opt.value !== "redesignada" ? undefined : registro.motivoRedesignacao })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                      isActive
                        ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-400")} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tipo de Extinção */}
          {registro.resultado === "extincao" && (
            <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3 animate-in fade-in-50 slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-2">
                <X className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500">
                  Tipo de Extinção
                </p>
              </div>
              <Textarea
                value={registro.tipoExtincao || ""}
                onChange={(e) => updateRegistro({ tipoExtincao: e.target.value })}
                placeholder="Especifique qual foi o tipo de extinção"
                rows={3}
                className="text-sm bg-white dark:bg-zinc-950"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
