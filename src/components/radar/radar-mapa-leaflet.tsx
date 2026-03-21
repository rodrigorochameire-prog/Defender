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
  spiderfyDistanceMultiplier?: number;
  showCoverageOnHover?: boolean;
  zoomToBoundsOnClick?: boolean;
  iconCreateFunction?: (cluster: MarkerCluster) => L.DivIcon;
}

interface MarkerCluster {
  getChildCount: () => number;
  getAllChildMarkers: () => L.Marker[];
}

// ─── Semantic color system (white fill + colored ring) ─────────────────────
const CRIME_COLORS: Record<string, string> = {
  // Tribunal do Júri — green-400
  homicidio: "#4ade80",
  tentativa_homicidio: "#4ade80",
  feminicidio: "#4ade80",
  // Violência doméstica — amber-400
  violencia_domestica: "#fbbf24",
  // Execução penal — blue-400
  execucao_penal: "#60a5fa",
  // Demais — 400-range
  trafico: "#f87171",
  roubo: "#fb923c",
  lesao_corporal: "#f472b6",
  sexual: "#c084fc",
  furto: "#fcd34d",
  porte_arma: "#e879f9",
  estelionato: "#818cf8",
  outros: "#a1a1aa",
};

const CRIME_LABELS: Record<string, string> = {
  homicidio: "Homicídio",
  tentativa_homicidio: "Tentativa de Homicídio",
  feminicidio: "Feminicídio",
  trafico: "Tráfico",
  roubo: "Roubo",
  furto: "Furto",
  violencia_domestica: "Violência Doméstica",
  sexual: "Sexual",
  lesao_corporal: "Lesão Corporal",
  porte_arma: "Porte de Arma",
  estelionato: "Estelionato",
  execucao_penal: "Execução Penal",
  outros: "Outros",
};

// Heatmap weights — gravidade da ocorrência
const CRIME_WEIGHTS: Record<string, number> = {
  homicidio: 5,
  tentativa_homicidio: 5,
  feminicidio: 5,
  sexual: 4,
  trafico: 3,
  roubo: 3,
  violencia_domestica: 2,
  lesao_corporal: 2,
  execucao_penal: 2,
  furto: 1,
  porte_arma: 1,
  estelionato: 1,
  outros: 1,
};

// Crimes julgados pelo Tribunal do Júri — marcador com anel + pulso
const JURY_CRIMES = new Set(["homicidio", "tentativa_homicidio", "feminicidio"]);

// ─── Marker size by risk tier ──────────────────────────────────────────────
function getMarkerSize(tipoCrime: string): number {
  if (JURY_CRIMES.has(tipoCrime)) return 18;
  if (tipoCrime === "violencia_domestica") return 15;
  if (tipoCrime === "trafico" || tipoCrime === "roubo") return 13;
  if (["lesao_corporal", "sexual", "furto"].includes(tipoCrime)) return 12;
  return 10;
}

const MARKER_SHADOW = "0 2px 6px rgba(0,0,0,0.14),0 0 0 1px rgba(0,0,0,0.04)";

interface MarkerOptionsWithTipo extends L.MarkerOptions {
  tipoCrime?: string;
  dataFato?: string | Date | null;
}

// ─── Create individual marker icon (white ring style) ─────────────────────
function createMarkerIcon(tipoCrime: string, dataFato?: string | Date | null): L.DivIcon {
  const ring = CRIME_COLORS[tipoCrime] || CRIME_COLORS.outros;
  const size = getMarkerSize(tipoCrime);

  if (JURY_CRIMES.has(tipoCrime)) {
    const isRecent = dataFato
      ? Date.now() - new Date(dataFato).getTime() < 72 * 60 * 60 * 1000
      : false;
    // Outer halo ring
    const haloSize = size + 10;
    const wrapSize = size + 14;
    const half = wrapSize / 2;
    const pulse = isRecent
      ? `<div class="radar-pulse-ring" style="position:absolute;top:50%;left:50%;width:${haloSize}px;height:${haloSize}px;margin:-${haloSize / 2}px 0 0 -${haloSize / 2}px;border-radius:50%;border:1.5px solid ${ring};opacity:0.45;"></div>`
      : `<div style="position:absolute;top:50%;left:50%;width:${haloSize}px;height:${haloSize}px;margin:-${haloSize / 2}px 0 0 -${haloSize / 2}px;border-radius:50%;border:1px solid ${ring};opacity:0.28;"></div>`;
    const dot = `<div style="position:absolute;top:50%;left:50%;width:${size}px;height:${size}px;margin:-${size / 2}px 0 0 -${size / 2}px;border-radius:50%;background:white;border:2.5px solid ${ring};box-shadow:${MARKER_SHADOW};"></div>`;
    return L.divIcon({
      html: `<div style="position:relative;width:${wrapSize}px;height:${wrapSize}px;">${pulse}${dot}</div>`,
      className: "",
      iconSize: [wrapSize, wrapSize],
      iconAnchor: [half, half],
    });
  }

  // VD: rounded square (white + colored border)
  if (tipoCrime === "violencia_domestica") {
    const wrapSize = size + 4;
    const half = wrapSize / 2;
    return L.divIcon({
      html: `<div style="position:relative;width:${wrapSize}px;height:${wrapSize}px;display:flex;align-items:center;justify-content:center;"><div style="width:${size}px;height:${size}px;background:white;border-radius:3px;border:2.5px solid ${ring};box-shadow:${MARKER_SHADOW};"></div></div>`,
      className: "",
      iconSize: [wrapSize, wrapSize],
      iconAnchor: [half, half],
    });
  }

  // Standard: white circle + colored ring
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:white;border:2px solid ${ring};box-shadow:${MARKER_SHADOW};"></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ─── Donut cluster icon ────────────────────────────────────────────────────
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

  // Scale size with count
  const size = count <= 10 ? 34 : count <= 50 ? 40 : 48;
  const fontSize = count <= 10 ? 11 : count <= 50 ? 12 : 13;
  const cx = size / 2;
  const r = size / 2 - 2;
  const innerR = Math.round(r * 0.42); // 42% hole

  // Count per tipoCrime
  const crimeCounts: Record<string, number> = {};
  let hasJury = false;
  for (const marker of markers) {
    const opts = marker.options as MarkerOptionsWithTipo;
    const tipo: string = opts.tipoCrime ?? "outros";
    crimeCounts[tipo] = (crimeCounts[tipo] || 0) + 1;
    if (JURY_CRIMES.has(tipo)) hasJury = true;
  }

  const types = Object.keys(crimeCounts);

  // Outer border ring for large clusters
  const outerStroke = size > 44
    ? `<circle cx="${cx}" cy="${cx}" r="${r + 1}" fill="none" stroke="#d4d4d8" stroke-width="1.5"/>`
    : "";

  // Unique filter IDs per cluster to avoid SVG filter collisions
  const filterId = `cd${size}x${count}`;

  // Single type: solid circle
  if (types.length === 1) {
    const color = CRIME_COLORS[types[0]] || CRIME_COLORS.outros;
    const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <filter id="${filterId}"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.18"/></filter>
      ${outerStroke}
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="${color}" fill-opacity="0.88" filter="url(#${filterId})"/>
      <circle cx="${cx}" cy="${cx}" r="${innerR}" fill="white"/>
      <text x="${cx}" y="${cx + fontSize * 0.4}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="#3f3f46" font-family="system-ui,sans-serif">${count}</text>
    </svg>`;
    return L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [cx, cx] });
  }

  // Multiple types: donut/pizza
  let currentAngle = 0;
  const paths: string[] = [];
  for (const [tipo, typeCount] of Object.entries(crimeCounts)) {
    const sliceDeg = (typeCount / count) * 360;
    const endAngle = currentAngle + sliceDeg;
    const color = CRIME_COLORS[tipo] || CRIME_COLORS.outros;
    paths.push(`<path d="${arcPath(cx, cx, r, currentAngle, endAngle)}" fill="${color}" fill-opacity="0.88"/>`);
    currentAngle = endAngle;
  }

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <filter id="${filterId}"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.15"/></filter>
    <g filter="url(#${filterId})">${paths.join("")}</g>
    ${outerStroke}
    <circle cx="${cx}" cy="${cx}" r="${innerR}" fill="white"/>
    <text x="${cx}" y="${cx + fontSize * 0.4}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="#3f3f46" font-family="system-ui,sans-serif">${count}</text>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: hasJury ? "cluster-has-jury" : "",
    iconSize: [size, size],
    iconAnchor: [cx, cx],
  });
}

// ─── Constants ─────────────────────────────────────────────────────────────
const CAMACARI_CENTER: [number, number] = [-12.6976, -38.3244];
// Bounds extended east to -38.17 to include orla (Arembepe, Monte Gordo, Barra do Jacuípe...)
// and north to -12.47 to include Barra de Pojuca / Imbassaí
const CAMACARI_BOUNDS: [[number, number], [number, number]] = [
  [-12.47, -38.47],
  [-12.83, -38.17],
];

// CSS injected once for pulse animations
const PULSE_CSS = `
  @keyframes radar-pulse {
    0% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; }
    70% { transform: translate(-50%,-50%) scale(2); opacity: 0; }
    100% { transform: translate(-50%,-50%) scale(2); opacity: 0; }
  }
  .radar-pulse-ring {
    animation: radar-pulse 3s ease-out infinite;
  }
`;

// ─── Grouped legend HTML ───────────────────────────────────────────────────
function buildLegendHTML(): string {
  const juryItems = ["homicidio", "tentativa_homicidio", "feminicidio"];
  const otherItems = [
    "trafico", "roubo", "lesao_corporal", "sexual",
    "furto", "porte_arma", "estelionato", "execucao_penal", "outros",
  ];

  const juryRows = juryItems.map((k) => {
    const ring = CRIME_COLORS[k];
    return `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
      <div style="position:relative;width:20px;height:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
        <div style="width:18px;height:18px;border-radius:50%;border:1px solid ${ring};opacity:0.28;position:absolute;"></div>
        <div style="width:11px;height:11px;border-radius:50%;background:white;border:2px solid ${ring};box-shadow:0 1px 4px rgba(0,0,0,0.12);"></div>
      </div>
      <span style="color:#374151;font-size:11px;">${CRIME_LABELS[k]}</span>
    </div>`;
  }).join("");

  const vdRing = CRIME_COLORS.violencia_domestica;
  const vdRow = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
      <div style="width:20px;height:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
        <div style="width:11px;height:11px;background:white;border-radius:3px;border:2px solid ${vdRing};box-shadow:0 1px 4px rgba(0,0,0,0.12);"></div>
      </div>
      <span style="color:#374151;font-size:11px;">Violência Doméstica</span>
    </div>`;

  const otherRows = otherItems.map((k) => {
    const ring = CRIME_COLORS[k] || CRIME_COLORS.outros;
    return `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
      <div style="width:8px;height:8px;border-radius:50%;background:white;flex-shrink:0;border:1.5px solid ${ring};box-shadow:0 1px 3px rgba(0,0,0,0.1);"></div>
      <span style="color:#6b7280;font-size:10px;">${CRIME_LABELS[k]}</span>
    </div>`;
  }).join("");

  return `
    <div style="font-family:system-ui,sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="font-weight:600;color:#52525b;font-size:11px;">Legenda</span>
        <button id="radar-legend-toggle" style="background:none;border:none;cursor:pointer;color:#9ca3af;font-size:16px;line-height:1;padding:0 2px;display:flex;align-items:center;">−</button>
      </div>
      <div id="radar-legend-content">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;margin-bottom:5px;">Tribunal do Júri</div>
        ${juryRows}
        <div style="border-top:1px solid #f3f4f6;margin:7px 0;"></div>
        ${vdRow}
        <div style="border-top:1px solid #f3f4f6;margin:7px 0;"></div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;margin-bottom:5px;">Outros Delitos</div>
        ${otherRows}
      </div>
    </div>
  `;
}

// ─── Component interfaces ──────────────────────────────────────────────────
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

// ─── Component ─────────────────────────────────────────────────────────────
export default function RadarMapaLeaflet({ data, showHeatmap, onSelectNoticia, fullscreen, resetViewTrigger }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const heatRef = useRef<L.Layer | null>(null);
  const legendRef = useRef<any>(null);
  const heatLegendRef = useRef<any>(null);
  const onSelectNoticiaRef = useRef(onSelectNoticia);

  useEffect(() => { onSelectNoticiaRef.current = onSelectNoticia; }, [onSelectNoticia]);

  // Inject pulse CSS once on mount
  useEffect(() => {
    if (document.getElementById("radar-pulse-css")) return;
    const style = document.createElement("style");
    style.id = "radar-pulse-css";
    style.textContent = PULSE_CSS;
    document.head.appendChild(style);
    return () => { document.getElementById("radar-pulse-css")?.remove(); };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: CAMACARI_CENTER,
      zoom: 12,
      zoomControl: true,
    });

    // CartoDB Voyager — intermediate detail (default): shows neighborhood names + roads
    const tileLayers: Record<string, L.TileLayer> = {
      voyager: L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd", maxZoom: 20,
      }),
      positron: L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd", maxZoom: 20,
      }),
      osm: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }),
      dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd", maxZoom: 20,
      }),
    };
    tileLayers.voyager.addTo(map);

    // Tile switcher control — top-left
    const tileSwitcher = (L.control as any)({ position: "topleft" });
    tileSwitcher.onAdd = () => {
      const div = L.DomUtil.create("div");
      div.style.cssText = [
        "background:white", "border-radius:8px", "padding:4px",
        "box-shadow:0 2px 8px rgba(0,0,0,0.15)", "font-family:system-ui,sans-serif",
        "display:flex", "gap:2px", "border:1px solid #f3f4f6",
      ].join(";");
      const options = [
        { key: "voyager", label: "Padrão" },
        { key: "positron", label: "Limpo" },
        { key: "osm", label: "Detalhado" },
        { key: "dark", label: "Escuro" },
      ];
      let activeKey = "voyager";
      const buttons: Record<string, HTMLButtonElement> = {};
      const activeStyle = "background:#f4f4f5;color:#18181b;border-radius:5px;font-weight:600;";
      const inactiveStyle = "background:transparent;color:#71717a;border-radius:5px;font-weight:400;";
      options.forEach(({ key, label }) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        btn.style.cssText = `padding:3px 8px;font-size:10px;cursor:pointer;border:none;transition:all 0.15s;${key === "voyager" ? activeStyle : inactiveStyle}`;
        btn.addEventListener("click", () => {
          if (activeKey === key) return;
          map.removeLayer(tileLayers[activeKey]);
          tileLayers[key].addTo(map);
          activeKey = key;
          Object.entries(buttons).forEach(([k, b]) => {
            b.style.cssText = `padding:3px 8px;font-size:10px;cursor:pointer;border:none;transition:all 0.15s;${k === key ? activeStyle : inactiveStyle}`;
          });
        });
        buttons[key] = btn;
        div.appendChild(btn);
      });
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    tileSwitcher.addTo(map);

    map.fitBounds(CAMACARI_BOUNDS);

    // Legend — grouped, collapsible, bottom-right
    const legend = (L.control as any)({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div");
      div.style.cssText = [
        "background:white",
        "border-radius:10px",
        "padding:10px 12px",
        "box-shadow:0 4px 20px rgba(0,0,0,0.12),0 1px 4px rgba(0,0,0,0.06)",
        "font-family:system-ui,sans-serif",
        "max-width:180px",
        "border:1px solid #f3f4f6",
      ].join(";");
      div.innerHTML = buildLegendHTML();

      // Wire collapse toggle after render
      setTimeout(() => {
        const btn = div.querySelector("#radar-legend-toggle") as HTMLButtonElement | null;
        const content = div.querySelector("#radar-legend-content") as HTMLElement | null;
        if (btn && content) {
          btn.addEventListener("click", () => {
            const collapsed = content.style.display === "none";
            content.style.display = collapsed ? "" : "none";
            btn.textContent = collapsed ? "−" : "+";
          });
        }
      }, 0);

      L.DomEvent.disableClickPropagation(div);
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

  // Reset view to Camaçari
  useEffect(() => {
    if (!mapRef.current || !resetViewTrigger) return;
    mapRef.current.fitBounds(CAMACARI_BOUNDS);
  }, [resetViewTrigger]);

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current) return;

    if (markersRef.current) {
      mapRef.current.removeLayer(markersRef.current);
      markersRef.current = null;
    }

    // Critical crimes (Júri + VD): tight radius so they show individually sooner
    // No disableClusteringAtZoom → spiderfy handles overlapping markers at all zooms
    const criticalCluster = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 10,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 1.5,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: createDonutIcon,
    } as MarkerClusterGroupOptions);

    // Other crimes: standard clustering, spiderfy handles overlapping
    const clusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 22,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 1.5,
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
      const ring = CRIME_COLORS[crimeKey] || CRIME_COLORS.outros;
      const crimeLabel = CRIME_LABELS[crimeKey] || "Outros";

      const icon = createMarkerIcon(crimeKey, point.dataFato);
      const marker = L.marker([lat, lng], { icon, tipoCrime: crimeKey, dataFato: point.dataFato } as MarkerOptionsWithTipo);

      const dateStr = point.dataFato
        ? new Date(point.dataFato).toLocaleDateString("pt-BR")
        : "";
      const resumoTruncado = point.resumoIA
        ? (point.resumoIA.length > 120 ? point.resumoIA.slice(0, 120) + "…" : point.resumoIA)
        : "";
      const envolvidosCount = Array.isArray(point.envolvidos) ? point.envolvidos.length : 0;
      const isJury = JURY_CRIMES.has(crimeKey);
      const isVD = crimeKey === "violencia_domestica";

      const popupHtml = `
        <div style="max-width:280px;font-family:system-ui,sans-serif;overflow:hidden;">
          <div style="background:#18181b;padding:8px 12px;margin:-1px -1px 0;border-radius:0;">
            <div style="display:flex;align-items:center;gap:6px;">
              ${isVD
                ? `<div style="width:8px;height:8px;background:white;border-radius:2px;flex-shrink:0;border:1.5px solid ${ring};"></div>`
                : `<div style="width:8px;height:8px;border-radius:50%;background:white;flex-shrink:0;border:1.5px solid ${ring};"></div>`
              }
              <span style="font-size:10px;color:rgba(255,255,255,0.7);font-weight:500;letter-spacing:0.05em;">${crimeLabel}</span>
            </div>
          </div>
          <div style="padding:10px 12px;">
            <strong style="font-size:13px;line-height:1.4;display:block;margin-bottom:6px;color:#111;">${point.titulo}</strong>
            ${resumoTruncado ? `<p style="font-size:11px;color:#6b7280;line-height:1.5;margin-bottom:6px;font-style:italic;">${resumoTruncado}</p>` : ""}
            <div style="font-size:11px;color:#9ca3af;margin-bottom:8px;">${[point.bairro, dateStr].filter(Boolean).join(" · ")}</div>
            ${envolvidosCount > 0 ? `<div style="margin-bottom:8px;font-size:11px;color:#9ca3af;">${envolvidosCount} envolvido${envolvidosCount > 1 ? "s" : ""}</div>` : ""}
            <button id="radar-popup-${point.id}" style="width:100%;padding:6px 12px;background:#18181b;color:white;border:none;border-radius:6px;font-size:11px;font-weight:500;cursor:pointer;letter-spacing:0.02em;">Ver detalhes →</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 320 });
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

      // Júri + VD → dissolve earlier; others → standard cluster
      const isCritical = JURY_CRIMES.has(crimeKey) || crimeKey === "violencia_domestica";
      if (isCritical) {
        criticalCluster.addLayer(marker);
      } else {
        clusterGroup.addLayer(marker);
      }
    });

    // Store both clusters together
    const combinedGroup = L.layerGroup([criticalCluster, clusterGroup]);
    markersRef.current = combinedGroup;
    if (!showHeatmap) combinedGroup.addTo(mapRef.current);
  }, [data, showHeatmap]);

  // Toggle heatmap layer
  useEffect(() => {
    if (!mapRef.current) return;

    if (showHeatmap) {
      if (markersRef.current) mapRef.current.removeLayer(markersRef.current);
      if (legendRef.current) legendRef.current.remove();

      // Weighted heat points — higher weight = more intensity on map
      const heatPoints: [number, number, number][] = data
        .filter((p) => p.latitude && p.longitude)
        .map((p) => {
          const weight = CRIME_WEIGHTS[p.tipoCrime || "outros"] || 1;
          return [parseFloat(p.latitude!), parseFloat(p.longitude!), weight];
        });

      if (heatPoints.length > 0) {
        heatRef.current = (L as any).heatLayer(heatPoints, {
          radius: 28,
          blur: 18,
          maxZoom: 17,
          max: 5,
          minOpacity: 0.3,
          gradient: { 0.0: "#3b82f6", 0.25: "#06b6d4", 0.5: "#22c55e", 0.75: "#f59e0b", 1.0: "#dc2626" },
        });
        heatRef.current!.addTo(mapRef.current);
      }

      if (!heatLegendRef.current) {
        const heatLegend = (L.control as any)({ position: "bottomright" });
        heatLegend.onAdd = () => {
          const div = L.DomUtil.create("div");
          div.style.cssText = [
            "background:white",
            "border-radius:10px",
            "padding:10px 12px",
            "box-shadow:0 4px 20px rgba(0,0,0,0.12),0 1px 4px rgba(0,0,0,0.06)",
            "font-family:system-ui,sans-serif",
            "min-width:155px",
            "border:1px solid #f3f4f6",
          ].join(";");
          div.innerHTML = `
            <div style="font-weight:700;color:#111827;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Intensidade de Risco</div>
            <div style="height:8px;border-radius:4px;background:linear-gradient(to right,#3b82f6,#06b6d4,#22c55e,#f59e0b,#dc2626);margin-bottom:4px;"></div>
            <div style="display:flex;justify-content:space-between;color:#9ca3af;font-size:10px;margin-bottom:10px;"><span>Baixo</span><span>Alto</span></div>
            <div style="border-top:1px solid #f3f4f6;padding-top:7px;">
              <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px;">Peso por gravidade</div>
              ${[
                ["Homicídio / Feminicídio", "5×"],
                ["Sexual", "4×"],
                ["Tráfico / Roubo", "3×"],
                ["VD / Lesão / EP", "2×"],
                ["Demais", "1×"],
              ].map(([label, w]) =>
                `<div style="display:flex;justify-content:space-between;font-size:10px;color:#6b7280;margin-bottom:2px;"><span>${label}</span><span style="font-weight:600;">${w}</span></div>`
              ).join("")}
            </div>
          `;
          L.DomEvent.disableClickPropagation(div);
          return div;
        };
        heatLegend.addTo(mapRef.current);
        heatLegendRef.current = heatLegend;
      }
    } else {
      if (heatRef.current) { mapRef.current.removeLayer(heatRef.current); heatRef.current = null; }
      if (heatLegendRef.current) { heatLegendRef.current.remove(); heatLegendRef.current = null; }
      if (markersRef.current) markersRef.current.addTo(mapRef.current);
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
