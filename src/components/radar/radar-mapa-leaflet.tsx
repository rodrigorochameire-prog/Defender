"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.heat";

// Type declarations for Leaflet plugins
declare module "leaflet" {
  function heatLayer(
    latlngs: [number, number, number?][],
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      max?: number;
      minOpacity?: number;
      gradient?: Record<number, string>;
    }
  ): L.Layer;
}

interface MarkerClusterGroupOptions {
  chunkedLoading?: boolean;
  maxClusterRadius?: number;
  spiderfyOnMaxZoom?: boolean;
  showCoverageOnHover?: boolean;
  zoomToBoundsOnClick?: boolean;
  iconCreateFunction?: (cluster: { getChildCount: () => number }) => L.DivIcon;
}

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

const CRIME_LABELS: Record<string, string> = {
  homicidio: "Homicidio",
  tentativa_homicidio: "Tentativa de Homicidio",
  trafico: "Trafico",
  roubo: "Roubo",
  furto: "Furto",
  violencia_domestica: "V. Domestica",
  sexual: "Sexual",
  lesao_corporal: "Lesao Corporal",
  porte_arma: "Porte de Arma",
  estelionato: "Estelionato",
  outros: "Outros",
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
  onSelectNoticia?: (id: number) => void;
}

export default function RadarMapaLeaflet({ data, showHeatmap, onSelectNoticia }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const heatRef = useRef<L.Layer | null>(null);
  const onSelectNoticiaRef = useRef(onSelectNoticia);

  // Keep callback ref in sync
  useEffect(() => {
    onSelectNoticiaRef.current = onSelectNoticia;
  }, [onSelectNoticia]);

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

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      heatRef.current = null;
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    if (markersRef.current) {
      mapRef.current.removeLayer(markersRef.current);
      markersRef.current = null;
    }

    // Create marker cluster group
    const clusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster: { getChildCount: () => number }) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 35 : count < 50 ? 45 : 55;
        return L.divIcon({
          html: `<div style="
            background: rgba(16, 185, 129, 0.85);
            color: white;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 600;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">${count}</div>`,
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    } as MarkerClusterGroupOptions);

    data.forEach((point) => {
      if (!point.latitude || !point.longitude) return;

      const lat = parseFloat(point.latitude);
      const lng = parseFloat(point.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const crimeKey = point.tipoCrime || "outros";
      const color = CRIME_COLORS[crimeKey] || CRIME_COLORS.outros;
      const crimeLabel = CRIME_LABELS[crimeKey] || CRIME_LABELS.outros;

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

      const popupHtml = `
        <div style="max-width: 280px; font-family: system-ui, sans-serif;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color};"></span>
            <span style="font-size: 11px; color: #888; font-weight: 500;">${crimeLabel}</span>
          </div>
          <strong style="font-size: 13px; line-height: 1.3; display: block; margin-bottom: 4px;">${point.titulo}</strong>
          ${point.bairro ? `<span style="font-size: 11px; color: #666;">📍 ${point.bairro}</span><br/>` : ""}
          ${dateStr ? `<span style="font-size: 11px; color: #999;">📅 ${dateStr}</span><br/>` : ""}
          <button id="radar-popup-${point.id}" style="
            margin-top: 8px;
            width: 100%;
            padding: 6px 12px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
          ">Ver detalhes →</button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on("popupopen", () => {
        setTimeout(() => {
          const btn = document.getElementById(`radar-popup-${point.id}`);
          if (btn) {
            btn.onclick = () => {
              onSelectNoticiaRef.current?.(point.id);
              mapRef.current?.closePopup();
            };
          }
        }, 10);
      });

      clusterGroup.addLayer(marker);
    });

    markersRef.current = clusterGroup;

    // Only add markers if heatmap is not active
    if (!showHeatmap) {
      clusterGroup.addTo(mapRef.current);
    }
  }, [data, showHeatmap]);

  // Toggle heatmap layer
  useEffect(() => {
    if (!mapRef.current) return;

    if (showHeatmap) {
      // Hide markers
      if (markersRef.current) mapRef.current.removeLayer(markersRef.current);

      // Create heat layer
      const heatPoints: [number, number, number][] = data
        .filter((p) => p.latitude && p.longitude)
        .map((p) => [parseFloat(p.latitude!), parseFloat(p.longitude!), 1]);

      if (heatPoints.length > 0) {
        heatRef.current = (L as any).heatLayer(heatPoints, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
        });
        heatRef.current!.addTo(mapRef.current);
      }
    } else {
      // Remove heat layer
      if (heatRef.current) {
        mapRef.current.removeLayer(heatRef.current);
        heatRef.current = null;
      }
      // Show markers
      if (markersRef.current) markersRef.current.addTo(mapRef.current);
    }
  }, [showHeatmap, data]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-[600px] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700"
    />
  );
}
