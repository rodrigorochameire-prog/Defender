"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AnaliseResumo } from "./analise-resumo";
import { AnalisePartes } from "./analise-partes";
import { AnaliseDepoimentos } from "./analise-depoimentos";
import { AnaliseTimeline } from "./analise-timeline";
import { AnaliseTeses } from "./analise-teses";
import { AnaliseMapa } from "./analise-mapa";
import { AnaliseProvas } from "./analise-provas";
import { AnaliseImputacoes } from "./analise-imputacoes";

export type AnaliseSubTab = "resumo" | "partes" | "depoimentos" | "timeline" | "teses" | "provas" | "imputacoes" | "mapa";

const SUB_TABS: { key: AnaliseSubTab; label: string }[] = [
  { key: "resumo", label: "Resumo" },
  { key: "partes", label: "Partes" },
  { key: "depoimentos", label: "Depoimentos" },
  { key: "timeline", label: "Timeline" },
  { key: "teses", label: "Teses & Nulidades" },
  { key: "provas", label: "Provas" },
  { key: "imputacoes", label: "Acusação" },
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
  // v7 fields
  inventarioProvas?: any[];
  mapaDocumental?: any[];
  laudos?: any[];
  imputacoes?: any[];
  acusacaoRadiografia?: any;
  // Attribution-specific
  ritoBifasico?: any;
  preparacaoPlenario?: any;
  cadeiaCustodia?: any;
  licitudeProva?: any;
  calculoPena?: any;
  cronogramaBeneficios?: any;
  mpu?: any;
  contextoRelacional?: any;
}

export function AnaliseHub(props: AnaliseHubProps) {
  const [subTab, setSubTab] = useState<AnaliseSubTab>("resumo");

  // Filter tabs: only show provas/imputacoes if data exists
  const hasProvas = (props.inventarioProvas?.length ?? 0) > 0 || (props.mapaDocumental?.length ?? 0) > 0 || (props.laudos?.length ?? 0) > 0;
  const hasImputacoes = (props.imputacoes?.length ?? 0) > 0 || props.acusacaoRadiografia
    || props.ritoBifasico || props.cadeiaCustodia || props.calculoPena || props.mpu || props.contextoRelacional;

  const visibleTabs = SUB_TABS.filter(tab => {
    if (tab.key === "provas" && !hasProvas) return false;
    if (tab.key === "imputacoes" && !hasImputacoes) return false;
    return true;
  });

  return (
    <div className="px-4 md:px-8 py-4 md:py-6">
      {/* Pills */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {visibleTabs.map((tab) => (
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
      {subTab === "provas" && (
        <AnaliseProvas
          inventarioProvas={props.inventarioProvas ?? []}
          mapaDocumental={props.mapaDocumental ?? []}
          laudos={props.laudos}
        />
      )}
      {subTab === "imputacoes" && (
        <AnaliseImputacoes
          imputacoes={props.imputacoes ?? []}
          acusacaoRadiografia={props.acusacaoRadiografia}
          ritoBifasico={props.ritoBifasico}
          preparacaoPlenario={props.preparacaoPlenario}
          cadeiaCustodia={props.cadeiaCustodia}
          licitudeProva={props.licitudeProva}
          calculoPena={props.calculoPena}
          cronogramaBeneficios={props.cronogramaBeneficios}
          mpu={props.mpu}
          contextoRelacional={props.contextoRelacional}
        />
      )}
      {subTab === "mapa" && <AnaliseMapa locais={props.locais} />}
    </div>
  );
}
