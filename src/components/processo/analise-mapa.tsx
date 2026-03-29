// src/components/processo/analise-mapa.tsx
"use client";

import { MapPin, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TYPO, CARD_STYLE } from "@/lib/config/design-tokens";

interface Local {
  tipo: string;
  descricao: string;
  endereco?: string;
  coordenadas?: { lat: number; lng: number };
  pessoa_relacionada?: string;
}

interface AnaliseMapaProps {
  locais: Local[];
}

const TIPO_ICONS: Record<string, string> = {
  FATO: "📍",
  RESIDENCIA: "🏠",
  TESTEMUNHA: "👤",
  CAMERA: "📹",
  ROTA: "🚗",
  OUTRO: "📌",
};

export function AnaliseMapa({ locais }: AnaliseMapaProps) {
  if (locais.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <MapPin className="h-10 w-10 mx-auto text-muted-foreground/30" />
        <p className={TYPO.body + " text-muted-foreground"}>
          Nenhum local identificado no caso.
        </p>
        <p className={TYPO.small + " text-muted-foreground"}>
          Execute uma análise com a skill Cowork para extrair locais dos autos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Placeholder do mapa — v2 terá integração com Mapbox/Leaflet */}
      <div className={`${CARD_STYLE.base} bg-zinc-50 dark:bg-zinc-900 h-64 flex items-center justify-center`}>
        <div className="text-center space-y-2">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className={TYPO.body + " text-muted-foreground"}>
            Mapa interativo (em desenvolvimento)
          </p>
          <p className={TYPO.small + " text-muted-foreground"}>
            {locais.length} local(is) identificado(s)
          </p>
        </div>
      </div>

      {/* Lista de locais */}
      <div className="space-y-2">
        <p className={TYPO.label}>Locais do Caso</p>
        {locais.map((local, i) => (
          <div key={i} className={CARD_STYLE.base + " flex items-start gap-3"}>
            <span className="text-lg shrink-0">{TIPO_ICONS[local.tipo] ?? "📌"}</span>
            <div>
              <p className={TYPO.h3}>{local.descricao}</p>
              {local.endereco && <p className={TYPO.body + " text-muted-foreground"}>{local.endereco}</p>}
              {local.pessoa_relacionada && (
                <p className={TYPO.small + " text-muted-foreground"}>Relacionado: {local.pessoa_relacionada}</p>
              )}
              {local.coordenadas && (
                <p className={TYPO.caption + " font-mono"}>
                  {local.coordenadas.lat.toFixed(4)}, {local.coordenadas.lng.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
