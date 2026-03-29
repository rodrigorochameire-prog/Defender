// src/components/processo/analise-hub.tsx
"use client";

import { useState } from "react";
import { PILL_STYLE } from "@/lib/config/design-tokens";
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
}

export function AnaliseHub(props: AnaliseHubProps) {
  const [subTab, setSubTab] = useState<AnaliseSubTab>("resumo");

  return (
    <div className="px-6 py-4">
      {/* Pills */}
      <div className={PILL_STYLE.bar}>
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={cn(PILL_STYLE.item, subTab === tab.key && PILL_STYLE.active)}
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
        />
      )}
      {subTab === "partes" && <AnalisePartes pessoas={props.pessoas} />}
      {subTab === "depoimentos" && <AnaliseDepoimentos depoimentos={props.depoimentos} />}
      {subTab === "timeline" && <AnaliseTimeline cronologia={props.cronologia} />}
      {subTab === "teses" && (
        <AnaliseTeses teses={props.teses} nulidades={props.nulidades} matrizGuerra={props.matrizGuerra} />
      )}
      {subTab === "mapa" && <AnaliseMapa locais={props.locais} />}
    </div>
  );
}
