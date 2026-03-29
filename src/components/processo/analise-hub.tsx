"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AnaliseResumo } from "./analise-resumo";
import { AnalisePartes } from "./analise-partes";
import { AnaliseDepoimentos } from "./analise-depoimentos";
import { AnaliseTimeline } from "./analise-timeline";
import { AnaliseTeses } from "./analise-teses";
import { AnaliseMapa } from "./analise-mapa";

export type AnaliseSubTab = "resumo" | "partes" | "depoimentos" | "timeline" | "teses" | "mapa";

const SUB_TABS: { key: AnaliseSubTab; label: string }[] = [
  { key: "resumo", label: "Resumo" },
  { key: "partes", label: "Partes" },
  { key: "depoimentos", label: "Depoimentos" },
  { key: "timeline", label: "Timeline" },
  { key: "teses", label: "Teses & Nulidades" },
  { key: "mapa", label: "Mapa" },
];

interface AnaliseHubProps {
  analysisData: any;
  pessoas: any[];
  depoimentos: any[];
  cronologia: any[];
  teses: any;
  nulidades: any[];
  matrizGuerra: any[];
  locais: any[];
  radarLiberdade: any;
  saneamento: any;
  kpis: any;
  resumo: string;
  crimePrincipal: string;
  estrategia: string;
  achados: string[];
  recomendacoes: string[];
  inconsistencias: string[];
  // Rich fields
  alertas?: any[];
  checklistTatico?: string[];
  orientacaoAssistido?: string;
  perspectivaPlenaria?: string;
  perguntasEstrategicas?: any[];
}

export function AnaliseHub(props: AnaliseHubProps) {
  const [subTab, setSubTab] = useState<AnaliseSubTab>("resumo");

  return (
    <div className="px-8 py-6">
      {/* Pills — espaçadas, maiores, visualmente distintas das abas */}
      <div className="flex items-center gap-2 mb-6">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={cn(
              "px-4 py-1.5 text-xs font-medium rounded-full transition-all",
              subTab === tab.key
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {subTab === "resumo" && (
        <AnaliseResumo
          radarLiberdade={props.radarLiberdade}
          kpis={props.kpis}
          resumo={props.resumo}
          crimePrincipal={props.crimePrincipal}
          estrategia={props.estrategia}
          achados={props.achados}
          recomendacoes={props.recomendacoes}
          inconsistencias={props.inconsistencias}
          saneamento={props.saneamento}
          alertas={props.alertas}
          checklistTatico={props.checklistTatico}
        />
      )}
      {subTab === "partes" && <AnalisePartes pessoas={props.pessoas} />}
      {subTab === "depoimentos" && <AnaliseDepoimentos depoimentos={props.depoimentos} />}
      {subTab === "timeline" && <AnaliseTimeline cronologia={props.cronologia} />}
      {subTab === "teses" && (
        <AnaliseTeses
          teses={props.teses}
          nulidades={props.nulidades}
          matrizGuerra={props.matrizGuerra}
          orientacaoAssistido={props.orientacaoAssistido}
          perspectivaPlenaria={props.perspectivaPlenaria}
          perguntasEstrategicas={props.perguntasEstrategicas}
          checklistTatico={props.checklistTatico}
        />
      )}
      {subTab === "mapa" && <AnaliseMapa locais={props.locais} />}
    </div>
  );
}
