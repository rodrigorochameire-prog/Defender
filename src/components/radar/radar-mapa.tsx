"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Map, Maximize2, Minimize2 } from "lucide-react";

const CRIME_COLORS: Record<string, string> = {
  homicidio: "#ef4444",
  tentativa_homicidio: "#f97316",
  trafico: "#a855f7",
  roubo: "#3b82f6",
  furto: "#eab308",
  violencia_domestica: "#ec4899",
  sexual: "#d946ef",
  lesao_corporal: "#f59e0b",
  porte_arma: "#64748b",
  estelionato: "#14b8a6",
  outros: "#71717a",
};

const CRIME_LABELS: Record<string, string> = {
  homicidio: "Homicídio",
  tentativa_homicidio: "Tent. Homicídio",
  trafico: "Tráfico",
  roubo: "Roubo",
  furto: "Furto",
  violencia_domestica: "V. Doméstica",
  sexual: "Sexual",
  lesao_corporal: "Lesão Corporal",
  porte_arma: "Porte de Arma",
  estelionato: "Estelionato",
  outros: "Outros",
};

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
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  // Count items without coordinates from the full dataset
  const semCoordenadas = useMemo(() => {
    if (!data) return 0;
    return data.filter((item) => !item.latitude || !item.longitude).length;
  }, [data]);

  const crimeCounts = useMemo(() => {
    if (!filteredData.length) return [];
    const counts: Record<string, number> = {};
    filteredData.forEach((p) => {
      const key = p.tipoCrime || "outros";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tipo, count]) => ({ tipo, count }));
  }, [filteredData]);

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
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 p-4 bg-white dark:bg-zinc-900 flex flex-col gap-3 overflow-auto"
          : "space-y-3"
      }
    >
      {/* Mini-stats por tipo de crime */}
      {crimeCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {crimeCounts.map(({ tipo, count }) => (
            <div
              key={tipo}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: CRIME_COLORS[tipo] ?? "#71717a" }}
              />
              <span className="text-zinc-700 dark:text-zinc-300">
                {CRIME_LABELS[tipo] ?? tipo}
              </span>
              <span className="text-zinc-400 font-normal">{count}</span>
            </div>
          ))}
          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            {filteredData.length} total
          </div>
          {semCoordenadas > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              Sem coordenadas: {semCoordenadas}
            </Badge>
          )}
        </div>
      )}

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
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-zinc-400">
              {filteredData.length} ocorrência{filteredData.length !== 1 ? "s" : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="h-7 gap-1.5 text-xs cursor-pointer"
              title={isFullscreen ? "Sair da tela cheia" : "Ver mapa maior / Tela cheia"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  Reduzir
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  Tela cheia
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mapa */}
      <div className={isFullscreen ? "flex-1 min-h-0" : undefined}>
        <LeafletMap
          data={filteredData}
          showHeatmap={showHeatmap}
          onSelectNoticia={(id) => {
            setIsFullscreen(false);
            onSelectNoticia?.(id);
          }}
          fullscreen={isFullscreen}
        />
      </div>
    </div>
  );
}
