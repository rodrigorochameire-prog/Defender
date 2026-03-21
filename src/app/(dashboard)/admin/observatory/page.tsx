"use client";

import { useState } from "react";
import { AlertasCriticos } from "./_components/alertas-criticos";
import { ResumoRapido } from "./_components/resumo-rapido";
import { AdocaoDefensores } from "./_components/adocao-defensores";
import { VolumeTrabalho } from "./_components/volume-trabalho";
import { SaudeTecnica } from "./_components/saude-tecnica";

function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}

function getPeriodoDates(opcao: string) {
  const hoje = new Date();
  switch (opcao) {
    case "7d":
      return { inicio: toISO(new Date(Date.now() - 7 * 86400000)), fim: toISO(hoje) };
    case "30d":
      return { inicio: toISO(new Date(Date.now() - 30 * 86400000)), fim: toISO(hoje) };
    case "90d":
      return { inicio: toISO(new Date(Date.now() - 90 * 86400000)), fim: toISO(hoje) };
    case "6m":
      return { inicio: toISO(new Date(Date.now() - 180 * 86400000)), fim: toISO(hoje) };
    default:
      return { inicio: toISO(new Date(Date.now() - 30 * 86400000)), fim: toISO(hoje) };
  }
}

export default function ObservatoryPage() {
  const [periodo, setPeriodo] = useState("30d");
  const { inicio, fim } = getPeriodoDates(periodo);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Observatory</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Observabilidade da plataforma OMBUDS
          </p>
        </div>
        {/* Seletor de período */}
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {(["7d", "30d", "90d", "6m"] as const).map((op) => (
            <button
              key={op}
              onClick={() => setPeriodo(op)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                periodo === op
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {op === "7d" ? "7 dias" : op === "30d" ? "30 dias" : op === "90d" ? "90 dias" : "6 meses"}
            </button>
          ))}
        </div>
      </div>

      {/* Alertas críticos — tempo real, sem seletor */}
      <AlertasCriticos />

      {/* Resumo rápido — sempre 30 dias, independente do seletor */}
      <ResumoRapido />

      {/* Adoção — período selecionado */}
      <AdocaoDefensores inicio={inicio} fim={fim} />

      {/* Volume — período selecionado */}
      <VolumeTrabalho inicio={inicio} fim={fim} />

      {/* Saúde técnica — tempo real */}
      <SaudeTecnica />
    </div>
  );
}
