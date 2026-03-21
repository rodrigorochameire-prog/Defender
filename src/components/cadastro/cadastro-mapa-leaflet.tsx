"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

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

const ATRIBUICAO_COLORS: Record<string, string> = {
  JURI_CAMACARI: "#16a34a",
  GRUPO_JURI: "#ea580c",
  VVD_CAMACARI: "#d97706",
  EXECUCAO_PENAL: "#2563eb",
  SUBSTITUICAO: "#e11d48",
  SUBSTITUICAO_CIVEL: "#7c3aed",
};

const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Tribunal do Júri",
  GRUPO_JURI: "Grupo Especial do Júri",
  VVD_CAMACARI: "Violência Doméstica",
  EXECUCAO_PENAL: "Execução Penal",
  SUBSTITUICAO: "Substituição Criminal",
  SUBSTITUICAO_CIVEL: "Cível/Curadoria",
};

const FALLBACK_COLOR = "#71717a";

function getAtribuicaoColor(atribuicao: string | null | undefined): string {
  if (!atribuicao) return FALLBACK_COLOR;
  return ATRIBUICAO_COLORS[atribuicao] || FALLBACK_COLOR;
}

interface MarkerOptionsWithAtribuicao extends L.MarkerOptions {
  atribuicao?: string;
}

function createClusterIcon(cluster: MarkerCluster): L.DivIcon {
  const markers = cluster.getAllChildMarkers();
  const count = markers.length;

  // Count by atribuicao to find dominant
  const counts: Record<string, number> = {};
  for (const marker of markers) {
    const opts = marker.options as MarkerOptionsWithAtribuicao;
    const key = opts.atribuicao ?? "outros";
    counts[key] = (counts[key] || 0) + 1;
  }

  // Find dominant atribuicao
  let dominantKey = "outros";
  let maxCount = 0;
  for (const [key, c] of Object.entries(counts)) {
    if (c > maxCount) {
      maxCount = c;
      dominantKey = key;
    }
  }

  const color = ATRIBUICAO_COLORS[dominantKey] || FALLBACK_COLOR;

  const svg = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="17" fill="${color}" fill-opacity="0.9"/>
    <circle cx="18" cy="18" r="17" fill="none" stroke="white" stroke-width="1.5"/>
    <text x="18" y="22" text-anchor="middle" font-size="11" font-weight="bold" fill="white">${count}</text>
  </svg>`;

  return L.divIcon({ html: svg, className: "", iconSize: [36, 36], iconAnchor: [18, 18] });
}

const CAMACARI_CENTER: [number, number] = [-12.6976, -38.3244];
const CAMACARI_BOUNDS: [[number, number], [number, number]] = [
  [-12.58, -38.42],
  [-12.83, -38.25],
];
const INITIAL_ZOOM = 12;

interface ProcessoMapPoint {
  id: number;
  numeroProcesso: string;
  atribuicao: string | null;
  localDoFatoLat: string | null;
  localDoFatoLng: string | null;
  localDoFatoEndereco: string | null;
  assistidoNome: string | null;
  assistidoId: number | null;
}

interface Props {
  processos: ProcessoMapPoint[];
  showProcessos: boolean;
}

export default function CadastroMapaLeaflet({
  processos,
  showProcessos,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  // Initialize map once
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

    map.fitBounds(CAMACARI_BOUNDS);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Update markers when data or filters change
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old cluster group
    if (markersRef.current) {
      mapRef.current.removeLayer(markersRef.current);
      markersRef.current = null;
    }

    if (!showProcessos) return;

    const clusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 30,
      disableClusteringAtZoom: 15,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: createClusterIcon,
    } as MarkerClusterGroupOptions);

    processos.forEach((point) => {
      if (!point.localDoFatoLat || !point.localDoFatoLng) return;
      const lat = parseFloat(point.localDoFatoLat);
      const lng = parseFloat(point.localDoFatoLng);
      if (isNaN(lat) || isNaN(lng)) return;

      const atribuicaoKey = point.atribuicao ?? "";
      const color = getAtribuicaoColor(atribuicaoKey);
      const atribuicaoLabel = ATRIBUICAO_LABELS[atribuicaoKey] || atribuicaoKey || "Sem atribuição";

      const icon = L.divIcon({
        html: `<div style="background-color:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
        className: "",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([lat, lng], {
        icon,
        atribuicao: atribuicaoKey,
      } as MarkerOptionsWithAtribuicao);

      const enderecoStr = point.localDoFatoEndereco
        ? `<div style="font-size:11px;color:#6b7280;margin-bottom:4px;">${point.localDoFatoEndereco}</div>`
        : "";

      const assistidoLink = point.assistidoId
        ? `<a href="/admin/assistidos/${point.assistidoId}" style="font-size:11px;color:#059669;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${point.assistidoNome ?? "—"}</a>`
        : `<span style="font-size:11px;color:#6b7280;">${point.assistidoNome ?? "—"}</span>`;

      const popupHtml = `
        <div style="max-width:280px;font-family:system-ui,sans-serif;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${color};flex-shrink:0;"></span>
            <span style="font-size:10px;color:${color};font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">${atribuicaoLabel}</span>
          </div>
          <div style="font-size:12px;font-family:monospace;color:#111;font-weight:600;margin-bottom:4px;">${point.numeroProcesso}</div>
          <div style="margin-bottom:4px;">${assistidoLink}</div>
          ${enderecoStr}
          <a href="/admin/processos/${point.id}" style="
            display:block;
            margin-top:8px;
            width:100%;
            padding:7px 12px;
            background:#059669;
            color:white;
            border:none;
            border-radius:8px;
            font-size:12px;
            font-weight:600;
            cursor:pointer;
            text-align:center;
            text-decoration:none;
            box-sizing:border-box;
            transition:background 0.15s;
          " onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">Ver processo</a>
        </div>
      `;

      marker.bindPopup(popupHtml);
      clusterGroup.addLayer(marker);
    });

    markersRef.current = clusterGroup;
    clusterGroup.addTo(mapRef.current);
  }, [processos, showProcessos]);

  return (
    <div className="isolate h-full w-full">
      <div
        ref={mapContainerRef}
        className="h-full w-full"
      />
    </div>
  );
}
