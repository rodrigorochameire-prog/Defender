"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

const CAMACARI_CENTER: [number, number] = [-12.6976, -38.3244];
const INITIAL_ZOOM = 12;

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

interface MapPoint {
  id: number;
  titulo: string;
  tipoCrime: string | null;
  bairro: string | null;
  latitude: string | null;
  longitude: string | null;
  dataFato: string | Date | null;
}

interface LeafletMapProps {
  data: MapPoint[];
  showHeatmap: boolean;
}

export default function RadarMapaLeaflet({ data, showHeatmap }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: CAMACARI_CENTER,
      zoom: INITIAL_ZOOM,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();

    data.forEach((point) => {
      if (!point.latitude || !point.longitude) return;

      const lat = parseFloat(point.latitude);
      const lng = parseFloat(point.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const color = CRIME_COLORS[point.tipoCrime || "outros"] || CRIME_COLORS.outros;

      const icon = L.divIcon({
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
        className: "",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([lat, lng], { icon });

      const dateStr = point.dataFato
        ? new Date(point.dataFato).toLocaleDateString("pt-BR")
        : "";

      marker.bindPopup(`
        <div style="max-width: 250px;">
          <strong style="font-size: 13px;">${point.titulo}</strong>
          ${point.bairro ? `<br/><span style="color: #666; font-size: 11px;">${point.bairro}</span>` : ""}
          ${dateStr ? `<br/><span style="color: #999; font-size: 11px;">${dateStr}</span>` : ""}
        </div>
      `);

      markersRef.current!.addLayer(marker);
    });
  }, [data]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-[600px] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700"
    />
  );
}
