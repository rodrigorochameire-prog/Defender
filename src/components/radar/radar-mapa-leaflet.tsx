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
  disableClusteringAtZoom?: number;
  spiderfyOnMaxZoom?: boolean;
  showCoverageOnHover?: boolean;
  zoomToBoundsOnClick?: boolean;
  iconCreateFunction?: (cluster: MarkerCluster) => L.DivIcon;
}

interface MarkerCluster {
  getChildCount: () => number;
  getAllChildMarkers: () => L.Marker[];
}

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

interface MarkerOptionsWithTipo extends L.MarkerOptions {
  tipoCrime?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = polarToCartesian(cx, cy, r, startAngle);
  const e = polarToCartesian(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

function createDonutIcon(cluster: MarkerCluster): L.DivIcon {
  const markers = cluster.getAllChildMarkers();
  const count = markers.length;

  // Count occurrences per tipoCrime
  const crimeCounts: Record<string, number> = {};
  for (const marker of markers) {
    const opts = marker.options as MarkerOptionsWithTipo;
    const tipo: string = opts.tipoCrime ?? "outros";
    crimeCounts[tipo] = (crimeCounts[tipo] || 0) + 1;
  }

  const types = Object.keys(crimeCounts);

  // Single type: solid circle
  if (types.length === 1) {
    const color = CRIME_COLORS[types[0]] || CRIME_COLORS.outros;
    const svg = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="17" fill="${color}" fill-opacity="0.9"/>
      <circle cx="18" cy="18" r="17" fill="none" stroke="white" stroke-width="1.5"/>
      <text x="18" y="22" text-anchor="middle" font-size="11" font-weight="bold" fill="white">${count}</text>
    </svg>`;
    return L.divIcon({ html: svg, className: "", iconSize: [36, 36], iconAnchor: [18, 18] });
  }

  // Multiple types: donut/pizza SVG
  let currentAngle = 0;
  const paths: string[] = [];

  for (const [tipo, typeCount] of Object.entries(crimeCounts)) {
    const sliceDeg = (typeCount / count) * 360;
    const endAngle = currentAngle + sliceDeg;
    const color = CRIME_COLORS[tipo] || CRIME_COLORS.outros;
    paths.push(`<path d="${arcPath(18, 18, 17, currentAngle, endAngle)}" fill="${color}"/>`);
    currentAngle = endAngle;
  }

  const svg = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    ${paths.join("\n    ")}
    <circle cx="18" cy="18" r="10" fill="white"/>
    <circle cx="18" cy="18" r="17" fill="none" stroke="#d4d4d8" stroke-width="1"/>
    <text x="18" y="22" text-anchor="middle" font-size="11" font-weight="bold" fill="#18181b">${count}</text>
  </svg>`;

  return L.divIcon({ html: svg, className: "", iconSize: [36, 36], iconAnchor: [18, 18] });
}

const CAMACARI_CENTER: [number, number] = [-12.6976, -38.3244];
const CAMACARI_BOUNDS: [[number, number], [number, number]] = [
  [-12.58, -38.42],
  [-12.83, -38.25],
];
const INITIAL_ZOOM = 12;

const CRIME_LABELS: Record<string, string> = {
  homicidio: "Homicídio",
  tentativa_homicidio: "Tentativa de Homicídio",
  trafico: "Tráfico",
  roubo: "Roubo",
  furto: "Furto",
  violencia_domestica: "Violência Doméstica",
  sexual: "Sexual",
  lesao_corporal: "Lesão Corporal",
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
  armaMeio?: string | null;
  resumoIA?: string | null;
  envolvidos?: { nome: string | null; papel: string }[] | null;
}

interface LeafletMapProps {
  data: MapPoint[];
  showHeatmap: boolean;
  onSelectNoticia?: (id: number) => void;
  fullscreen?: boolean;
  resetViewTrigger?: number;
}

export default function RadarMapaLeaflet({ data, showHeatmap, onSelectNoticia, fullscreen, resetViewTrigger }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const heatRef = useRef<L.Layer | null>(null);
  const legendRef = useRef<any>(null);
  const heatLegendRef = useRef<any>(null);
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

    // Fit to Camaçari bounding box
    map.fitBounds(CAMACARI_BOUNDS);

    // Legenda de tipos de crime (visível apenas no modo de marcadores)
    const legend = (L.control as any)({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div");
      div.innerHTML = `
        <div style="
          background: white;
          border-radius: 8px;
          padding: 10px 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          font-family: system-ui, sans-serif;
          font-size: 11px;
          max-width: 160px;
        ">
          <div style="font-weight: 600; color: #374151; margin-bottom: 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Tipo de Crime</div>
          ${Object.entries(CRIME_COLORS).map(([key, color]) => `
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; flex-shrink: 0;"></span>
              <span style="color: #6b7280;">${CRIME_LABELS[key] || key}</span>
            </div>
          `).join("")}
        </div>
      `;
      return div;
    };
    legend.addTo(map);
    legendRef.current = legend;

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      heatRef.current = null;
      legendRef.current = null;
      heatLegendRef.current = null;
    };
  }, []);

  // Reset view to Camaçari bounds when trigger changes
  useEffect(() => {
    if (!mapRef.current || resetViewTrigger === undefined || resetViewTrigger === 0) return;
    mapRef.current.fitBounds(CAMACARI_BOUNDS);
  }, [resetViewTrigger]);

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
      maxClusterRadius: 20,
      disableClusteringAtZoom: 14,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: createDonutIcon,
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

      const marker = L.marker([lat, lng], { icon, tipoCrime: crimeKey } as MarkerOptionsWithTipo);

      const dateStr = point.dataFato
        ? new Date(point.dataFato).toLocaleDateString("pt-BR")
        : "";

      const envolvidosCount = Array.isArray(point.envolvidos) ? point.envolvidos.length : 0;
      const resumoTruncado = point.resumoIA
        ? (point.resumoIA.length > 120 ? point.resumoIA.slice(0, 120) + "…" : point.resumoIA)
        : "";

      const popupHtml = `
        <div style="max-width: 300px; font-family: system-ui, sans-serif;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${color}; flex-shrink: 0;"></span>
            <span style="font-size: 11px; color: ${color}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">${crimeLabel}</span>
          </div>
          <strong style="font-size: 13px; line-height: 1.4; display: block; margin-bottom: 6px; color: #111;">${point.titulo}</strong>
          ${resumoTruncado ? `<p style="font-size:11px;color:#555;line-height:1.5;margin-bottom:6px;font-style:italic;">${resumoTruncado}</p>` : ""}
          ${point.bairro ? `<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;"><span style="font-size:11px;color:#555;">&#128205; ${point.bairro}</span></div>` : ""}
          ${dateStr ? `<div style="margin-bottom:2px;"><span style="font-size:11px;color:#888;">&#128197; ${dateStr}</span></div>` : ""}
          ${point.armaMeio ? `<div style="margin-bottom:2px;"><span style="font-size:11px;color:#888;">&#128481; <em>${point.armaMeio}</em></span></div>` : ""}
          ${envolvidosCount > 0 ? `<div style="margin-bottom:4px;"><span style="font-size:11px;color:#888;">&#128101; ${envolvidosCount} envolvido${envolvidosCount > 1 ? "s" : ""}</span></div>` : ""}
          <button id="radar-popup-${point.id}" style="
            margin-top: 8px;
            width: 100%;
            padding: 7px 12px;
            background: #059669;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            letter-spacing: 0.02em;
            transition: background 0.15s;
          " onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">Ver detalhes →</button>
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

      // Hide crime legend — not meaningful in heatmap mode
      if (legendRef.current) legendRef.current.remove();

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

      // Add heatmap gradient legend
      if (!heatLegendRef.current) {
        const heatLegend = (L.control as any)({ position: "bottomleft" });
        heatLegend.onAdd = () => {
          const div = L.DomUtil.create("div");
          div.innerHTML = `
            <div style="
              background: white;
              border-radius: 8px;
              padding: 10px 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              font-family: system-ui, sans-serif;
              font-size: 11px;
              min-width: 140px;
            ">
              <div style="font-weight: 600; color: #374151; margin-bottom: 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Intensidade</div>
              <div style="
                height: 10px;
                border-radius: 5px;
                background: linear-gradient(to right, #3b82f6, #22c55e, #eab308, #f97316, #ef4444);
                margin-bottom: 4px;
              "></div>
              <div style="display: flex; justify-content: space-between; color: #9ca3af; font-size: 10px;">
                <span>Baixa</span>
                <span>Alta</span>
              </div>
            </div>
          `;
          return div;
        };
        heatLegend.addTo(mapRef.current);
        heatLegendRef.current = heatLegend;
      }
    } else {
      // Remove heat layer
      if (heatRef.current) {
        mapRef.current.removeLayer(heatRef.current);
        heatRef.current = null;
      }
      // Remove heatmap legend
      if (heatLegendRef.current) {
        heatLegendRef.current.remove();
        heatLegendRef.current = null;
      }
      // Show markers
      if (markersRef.current) markersRef.current.addTo(mapRef.current);

      // Restore crime legend
      if (legendRef.current) legendRef.current.addTo(mapRef.current);
    }
  }, [showHeatmap, data]);

  return (
    <div className="isolate">
      <div
        ref={mapContainerRef}
        className={`w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 ${
          fullscreen ? "h-[calc(100vh-8rem)]" : "h-[600px]"
        }`}
      />
    </div>
  );
}
