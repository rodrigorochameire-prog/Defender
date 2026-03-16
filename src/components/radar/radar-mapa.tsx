"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Map } from "lucide-react";

// Leaflet must be loaded client-side only
const LeafletMap = dynamic(() => import("./radar-mapa-leaflet"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[600px] rounded-xl" />,
});

interface FiltrosState {
  tipoCrime?: string;
  bairro?: string;
  fonte?: string;
  search?: string;
  dataInicio?: string;
  dataFim?: string;
  soMatches: boolean;
}

interface RadarMapaProps {
  filtros: FiltrosState;
  onSelectNoticia?: (id: number) => void;
}

export function RadarMapa({ filtros, onSelectNoticia }: RadarMapaProps) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState<string[]>([
    "homicidio", "tentativa_homicidio", "trafico", "roubo", "furto",
    "violencia_domestica", "sexual", "lesao_corporal", "porte_arma",
    "estelionato", "outros",
  ]);

  const { data, isLoading } = trpc.radar.mapData.useQuery({
    tipoCrime: filtros.tipoCrime,
    dataInicio: filtros.dataInicio,
    dataFim: filtros.dataFim,
  });

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((item) =>
      visibleLayers.includes(item.tipoCrime || "outros")
    );
  }, [data, visibleLayers]);

  const toggleLayer = (layer: string) => {
    setVisibleLayers((prev) =>
      prev.includes(layer)
        ? prev.filter((l) => l !== layer)
        : [...prev, layer]
    );
  };

  if (isLoading) {
    return <Skeleton className="w-full h-[600px] rounded-xl" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
          <Map className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Nenhuma ocorrência com coordenadas
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          O mapa será populado conforme notícias com geolocalização forem coletadas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controles */}
      <Card>
        <CardContent className="p-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch
              checked={showHeatmap}
              onCheckedChange={setShowHeatmap}
              className="cursor-pointer"
            />
            <Label className="text-xs">Heatmap</Label>
          </div>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: "homicidio", label: "Homicídio", color: "bg-red-500" },
              { key: "trafico", label: "Tráfico", color: "bg-purple-500" },
              { key: "roubo", label: "Roubo", color: "bg-blue-500" },
              { key: "violencia_domestica", label: "VD", color: "bg-pink-500" },
              { key: "sexual", label: "Sexual", color: "bg-fuchsia-500" },
              { key: "outros", label: "Outros", color: "bg-zinc-500" },
            ].map((layer) => (
              <button
                key={layer.key}
                onClick={() => toggleLayer(layer.key)}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs cursor-pointer transition-opacity ${
                  visibleLayers.includes(layer.key) ? "opacity-100" : "opacity-40"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${layer.color}`} />
                {layer.label}
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs text-zinc-400">
            {filteredData.length} ocorrência{filteredData.length !== 1 ? "s" : ""}
          </div>
        </CardContent>
      </Card>

      {/* Mapa */}
      <LeafletMap
        data={filteredData}
        showHeatmap={showHeatmap}
        onSelectNoticia={onSelectNoticia}
      />
    </div>
  );
}
