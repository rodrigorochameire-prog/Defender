"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Mail,
  Save,
  Zap,
  CalendarClock,
  Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDepoenteStyle } from "../constants";
import type { Depoente, RegistroAudienciaData } from "../types";
import type { StatusAudiencia } from "../hooks/use-registro-form";

interface TabRapidoProps {
  registro: RegistroAudienciaData;
  updateRegistro: (patch: Partial<RegistroAudienciaData>) => void;
  statusAudiencia: StatusAudiencia;
  setStatusAudiencia: (s: StatusAudiencia) => void;
  handleUpdateDepoente: (d: Depoente) => void;
  handleSubmit: () => void;
  registroSalvo: boolean;
}

const STATUS_OPTIONS: Array<{
  value: StatusAudiencia;
  label: string;
  icon: typeof CheckCircle2;
  activeClass: string;
}> = [
  {
    value: "concluida",
    label: "Concluída",
    icon: CheckCircle2,
    activeClass:
      "bg-emerald-500 text-white border-emerald-500",
  },
  {
    value: "redesignada",
    label: "Redesignada",
    icon: CalendarClock,
    activeClass: "bg-amber-500 text-white border-amber-500",
  },
  {
    value: "suspensa",
    label: "Suspensa",
    icon: Pause,
    activeClass: "bg-rose-500 text-white border-rose-500",
  },
];

export function TabRapido({
  registro,
  statusAudiencia,
  setStatusAudiencia,
  handleUpdateDepoente,
  handleSubmit,
  registroSalvo,
}: TabRapidoProps) {
  // Track which depoente cards are expanded for the inline note (default closed)
  const [openNote, setOpenNote] = useState<Record<string, boolean>>({});
  const toggle = (id: string) =>
    setOpenNote((s) => ({ ...s, [id]: !s[id] }));

  const presentes = registro.depoentes.filter((d) => d.presente).length;
  const ausentes = registro.depoentes.length - presentes;

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Hero header */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-950 p-4 mb-3">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center">
            <Zap className="w-5 h-5 text-white dark:text-neutral-900" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Modo Rápido
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Captura essencial — toque para registrar presença e adicionar uma nota
            </p>
          </div>
        </div>

        {/* Status selector */}
        <div className="grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = statusAudiencia === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusAudiencia(opt.value)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-3 transition-all cursor-pointer active:scale-95",
                  active
                    ? opt.activeClass
                    : "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600",
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Counters */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="text-xs text-neutral-500">
          {registro.depoentes.length} depoente{registro.depoentes.length !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {presentes} presente{presentes !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            {ausentes} ausente{ausentes !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {registro.depoentes.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 p-8 text-center">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Nenhum depoente
          </p>
          <p className="text-xs text-neutral-500">
            Vá até a aba <strong>Preparação</strong> e clique em <strong>Importar p/ Depoentes</strong>, ou
            adicione manualmente na aba <strong>Depoentes</strong>.
          </p>
        </div>
      )}

      {/* Depoentes list — large touch targets */}
      <div className="space-y-2">
        {registro.depoentes.map((depoente) => {
          const style = getDepoenteStyle(depoente.tipo);
          const noteOpen = !!openNote[depoente.id];

          return (
            <div
              key={depoente.id}
              className={cn(
                "rounded-2xl border-2 bg-white dark:bg-neutral-950 overflow-hidden transition-all",
                depoente.presente
                  ? "border-emerald-300 dark:border-emerald-800"
                  : "border-neutral-200 dark:border-neutral-800",
              )}
            >
              {/* Top row: name + present toggle */}
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => toggle(depoente.id)}
                  className="flex-1 min-w-0 text-left px-4 py-3 cursor-pointer active:bg-neutral-50 dark:active:bg-neutral-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", style.dotColor)} />
                    <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                      {depoente.nome}
                    </p>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5 ml-4">
                    {style.label}
                    {depoente.intimado && " · intimado"}
                  </p>
                </button>

                {/* Big present/absent toggle */}
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateDepoente({
                      ...depoente,
                      presente: !depoente.presente,
                    })
                  }
                  className={cn(
                    "w-20 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95",
                    depoente.presente
                      ? "bg-emerald-500 text-white"
                      : "bg-rose-500 text-white",
                  )}
                >
                  {depoente.presente ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                  <span className="text-[10px] font-bold uppercase">
                    {depoente.presente ? "Presente" : "Ausente"}
                  </span>
                </button>
              </div>

              {/* Optional inline note (one field — depoimento literal) */}
              {noteOpen && (
                <div className="border-t border-neutral-200 dark:border-neutral-800 p-3 space-y-2 bg-neutral-50/50 dark:bg-neutral-900/30">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateDepoente({
                          ...depoente,
                          intimado: !depoente.intimado,
                        })
                      }
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer active:scale-95",
                        depoente.intimado
                          ? "bg-neutral-800 text-white dark:bg-white dark:text-neutral-900"
                          : "bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400",
                      )}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {depoente.intimado ? "Intimado" : "Marcar intimado"}
                    </button>
                  </div>
                  <Textarea
                    value={depoente.depoimentoLiteral || ""}
                    onChange={(e) =>
                      handleUpdateDepoente({
                        ...depoente,
                        depoimentoLiteral: e.target.value,
                      })
                    }
                    placeholder={
                      depoente.presente
                        ? "Trechos do depoimento, observações rápidas..."
                        : "Justificativa da ausência, próximos passos..."
                    }
                    rows={4}
                    className="text-sm border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 resize-none"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-16 left-0 right-0 px-4 z-10 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <Button
            type="button"
            onClick={handleSubmit}
            className="w-full h-12 text-sm font-semibold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 shadow-xl cursor-pointer active:scale-[0.98] transition-transform"
          >
            <Save className="w-4 h-4 mr-2" />
            {registroSalvo ? "Atualizar registro" : "Salvar registro"}
          </Button>
        </div>
      </div>
    </div>
  );
}
