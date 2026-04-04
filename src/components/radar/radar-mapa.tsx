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

// Synchronized with radar-mapa-leaflet.tsx CRIME_COLORS (pastel palette)
const CRIME_COLORS: Record<string, string> = {
  homicidio: "#4ade80",
  tentativa_homicidio: "#4ade80",
  feminicidio: "#4ade80",
  violencia_domestica: "#fbbf24",
  execucao_penal: "#60a5fa",
  trafico: "#f87171",
  roubo: "#fb923c",
  lesao_corporal: "#f472b6",
  sexual: "#c084fc",
  furto: "#fdba74",
  porte_arma: "#e879f9",
  estelionato: "#a78bfa",
  outros: "#a3a3a3",
};

const CRIME_LABELS: Record<string, string> = {
  homicidio: "Homicídio",
  tentativa_homicidio: "Tentativa",
  feminicidio: "Feminicídio",
  trafico: "Tráfico",
  roubo: "Roubo",
  furto: "Furto",
  violencia_domestica: "VD",
  sexual: "Sexual",
  lesao_corporal: "Lesão",
  porte_arma: "Porte Arma",
  estelionato: "Estelionato",
  execucao_penal: "Exec. Penal",
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
  focusedNoticiaId?: number | null;
}

const ALL_LAYERS = [
  "homicidio", "tentativa_homicidio", "feminicidio",
  "violencia_domestica", "execucao_penal",
  "trafico", "roubo", "lesao_corporal", "sexual",
  "furto", "porte_arma", "estelionato", "outros",
];

function loadMapPrefs() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("radar_map_prefs") || "{}");
  } catch {
    return {};
  }
}

function saveMapPref(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    const current = loadMapPrefs();
    localStorage.setItem("radar_map_prefs", JSON.stringify({ ...current, [key]: value }));
  } catch {}
}

export function RadarMapa({ filtros, onSelectNoticia, focusedNoticiaId }: RadarMapaProps) {
  const [showHeatmap, setShowHeatmapState] = useState<boolean>(() => {
    const prefs = loadMapPrefs();
    return prefs.showHeatmap ?? false;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resetViewTrigger, setResetViewTrigger] = useState(0);
  const [visibleLayers, setVisibleLayersState] = useState<string[]>(() => {
    const prefs = loadMapPrefs();
    return Array.isArray(prefs.visibleLayers) ? prefs.visibleLayers : ALL_LAYERS;
  });

  const setShowHeatmap = (value: boolean) => {
    setShowHeatmapState(value);
    saveMapPref("showHeatmap", value);
  };

  const setVisibleLayers = (updater: string[] | ((prev: string[]) => string[])) => {
    setVisibleLayersState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveMapPref("visibleLayers", next);
      return next;
    });
  };

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

  // Click to isolate: first click shows only this type; if already isolated, restore all
  const toggleLayer = (layer: string) => {
    setVisibleLayers((prev) => {
      const isIsolated = prev.length === 1 && prev[0] === layer;
      return isIsolated ? ALL_LAYERS : [layer];
    });
  };

  if (isLoading) {
    return <Skeleton className="w-full h-[600px] rounded-xl" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
          <Map className="h-8 w-8 text-neutral-400" />
        </div>
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Nenhuma ocorrência com coordenadas
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          O mapa será populado conforme notícias com geolocalização forem coletadas.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 p-4 bg-white dark:bg-neutral-900 flex flex-col gap-3 overflow-auto"
          : "space-y-3"
      }
    >
      {/* Mini-stats por tipo de crime */}
      {crimeCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {crimeCounts.map(({ tipo, count }) => (
            <div
              key={tipo}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-sm"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: CRIME_COLORS[tipo] ?? "#737373" }}
              />
              <span className="text-neutral-700 dark:text-neutral-300">
                {CRIME_LABELS[tipo] ?? tipo}
              </span>
              <span className="text-neutral-400 font-normal">{count}</span>
            </div>
          ))}
          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
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
          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
          <div className="flex items-center gap-1 flex-wrap">
            {ALL_LAYERS.map((key) => {
              const color = CRIME_COLORS[key] ?? "#525252";
              const label = CRIME_LABELS[key] ?? key;
              const isActive = visibleLayers.includes(key);
              const isIsolated = visibleLayers.length === 1 && visibleLayers[0] === key;
              const isVD = key === "violencia_domestica";
              return (
                <button
                  key={key}
                  onClick={() => toggleLayer(key)}
                  title={isIsolated ? "Clique para mostrar todos" : `Clique para filtrar: ${label}`}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] cursor-pointer transition-all ${
                    isIsolated
                      ? "ring-1 ring-offset-1 font-semibold"
                      : isActive
                      ? "opacity-80 hover:opacity-100"
                      : "opacity-25 hover:opacity-50"
                  }`}
                  style={isIsolated ? { outline: `2px solid ${color}`, outlineOffset: "1px" } : undefined}
                >
                  {isVD ? (
                    <span
                      className="w-2 h-2 flex-shrink-0 rotate-45"
                      style={{ backgroundColor: color, borderRadius: "1px" }}
                    />
                  ) : (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  )}
                  {label}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-neutral-400">
              {filteredData.length} ocorrência{filteredData.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setResetViewTrigger((prev) => prev + 1)}
              className="rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
              title="Centralizar em Camaçari"
            >
              ⌖ Reset
            </button>
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
          resetViewTrigger={resetViewTrigger}
          focusedNoticiaId={focusedNoticiaId}
        />
      </div>
    </div>
  );
}
