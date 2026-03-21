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

// ─── Color system (fills + dark borders) ──────────────────────────────────
const ATRIBUICAO_COLORS: Record<string, string> = {
  JURI_CAMACARI: "#16a34a",
  GRUPO_JURI: "#ea580c",
  VVD_CAMACARI: "#d97706",
  EXECUCAO_PENAL: "#2563eb",
  SUBSTITUICAO: "#e11d48",
  SUBSTITUICAO_CIVEL: "#7c3aed",
};

const ATRIBUICAO_BORDERS: Record<string, string> = {
  JURI_CAMACARI: "#14532d",
  GRUPO_JURI: "#7c2d12",
  VVD_CAMACARI: "#78350f",
  EXECUCAO_PENAL: "#1e3a8a",
  SUBSTITUICAO: "#881337",
  SUBSTITUICAO_CIVEL: "#4c1d95",
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
const FALLBACK_BORDER = "#3f3f46";

// Atribuições que vão a plenário — marcador com anel externo
const JURY_ATRIBUICOES = new Set(["JURI_CAMACARI", "GRUPO_JURI"]);

// ─── Marker size by atribuição tier ───────────────────────────────────────
function getMarkerSize(atribuicao: string): number {
  if (JURY_ATRIBUICOES.has(atribuicao)) return 16;
  if (atribuicao === "VVD_CAMACARI") return 14;
  if (atribuicao === "EXECUCAO_PENAL") return 12;
  if (atribuicao === "SUBSTITUICAO") return 10;
  return 8;
}

// CSS injected once for pulse animations
const PULSE_CSS = `
  @keyframes cadastro-pulse {
    0% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; }
    70% { transform: translate(-50%,-50%) scale(2); opacity: 0; }
    100% { transform: translate(-50%,-50%) scale(2); opacity: 0; }
  }
  .cadastro-pulse-ring {
    animation: cadastro-pulse 3s ease-out infinite;
  }
`;

interface MarkerOptionsWithAtribuicao extends L.MarkerOptions {
  atribuicao?: string;
}

// ─── Individual marker icon ────────────────────────────────────────────────
function createMarkerIcon(
  atribuicao: string,
  createdAt?: Date | string | null
): L.DivIcon {
  const fill = ATRIBUICAO_COLORS[atribuicao] || FALLBACK_COLOR;
  const border = ATRIBUICAO_BORDERS[atribuicao] || FALLBACK_BORDER;
  const size = getMarkerSize(atribuicao);

  // Júri: círculo com anel externo + pulse para processos recentes (< 7 dias)
  if (JURY_ATRIBUICOES.has(atribuicao)) {
    const isRecent = createdAt
      ? Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
      : false;
    const wrapSize = size + 10;
    const half = wrapSize / 2;
    const ringSize = size + 6;
    const ringHalf = ringSize / 2;
    const pulse = isRecent
      ? `<div class="cadastro-pulse-ring" style="position:absolute;top:50%;left:50%;width:${ringSize}px;height:${ringSize}px;margin:-${ringHalf}px 0 0 -${ringHalf}px;border-radius:50%;border:1.5px solid ${fill};opacity:0.5;"></div>`
      : `<div style="position:absolute;top:50%;left:50%;width:${ringSize}px;height:${ringSize}px;margin:-${ringHalf}px 0 0 -${ringHalf}px;border-radius:50%;border:1px solid ${fill};opacity:0.22;"></div>`;
    const dot = `<div style="position:absolute;top:50%;left:50%;width:${size}px;height:${size}px;margin:-${size / 2}px 0 0 -${size / 2}px;border-radius:50%;background:${fill};border:2px solid ${border};box-shadow:0 1px 3px rgba(0,0,0,0.18);"></div>`;
    return L.divIcon({
      html: `<div style="position:relative;width:${wrapSize}px;height:${wrapSize}px;">${pulse}${dot}</div>`,
      className: "",
      iconSize: [wrapSize, wrapSize],
      iconAnchor: [half, half],
    });
  }

  // VVD: losango (quadrado rotacionado)
  if (atribuicao === "VVD_CAMACARI") {
    const wrapSize = size + 4;
    const half = wrapSize / 2;
    return L.divIcon({
      html: `<div style="position:relative;width:${wrapSize}px;height:${wrapSize}px;display:flex;align-items:center;justify-content:center;"><div style="width:${size}px;height:${size}px;background:${fill};transform:rotate(45deg);border:2px solid ${border};box-shadow:0 1px 3px rgba(0,0,0,0.18);"></div></div>`,
      className: "",
      iconSize: [wrapSize, wrapSize],
      iconAnchor: [half, half],
    });
  }

  // Demais: círculo com borda escura
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${fill};border:1.5px solid ${border};box-shadow:0 1px 3px rgba(0,0,0,0.15);"></div>`,
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

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const s = polarToCartesian(cx, cy, r, startAngle);
  const e = polarToCartesian(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

function createDonutIcon(cluster: MarkerCluster): L.DivIcon {
  const markers = cluster.getAllChildMarkers();
  const count = markers.length;

  const size = count <= 10 ? 36 : count <= 50 ? 44 : 54;
  const fontSize = count <= 10 ? 11 : count <= 50 ? 12 : 14;
  const cx = size / 2;
  const r = size / 2 - 2;
  const innerR = size <= 36 ? 11 : size <= 44 ? 14 : 18;

  const atribCounts: Record<string, number> = {};
  let hasJury = false;
  for (const marker of markers) {
    const opts = marker.options as MarkerOptionsWithAtribuicao;
    const key: string = opts.atribuicao ?? "outros";
    atribCounts[key] = (atribCounts[key] || 0) + 1;
    if (JURY_ATRIBUICOES.has(key)) hasJury = true;
  }

  const types = Object.keys(atribCounts);

  const outerStroke =
    size > 44
      ? `<circle cx="${cx}" cy="${cx}" r="${r + 1}" fill="none" stroke="#d4d4d8" stroke-width="1.5"/>`
      : "";

  // Tipo único → círculo sólido
  if (types.length === 1) {
    const color = ATRIBUICAO_COLORS[types[0]] || FALLBACK_COLOR;
    const isJury = JURY_ATRIBUICOES.has(types[0]);
    const juryRing = isJury
      ? `<circle cx="${cx}" cy="${cx}" r="${r - 1}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.35"/>`
      : "";
    const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <filter id="cs${size}"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.22"/></filter>
      ${outerStroke}
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="${color}" fill-opacity="0.92" filter="url(#cs${size})"/>
      ${juryRing}
      <text x="${cx}" y="${cx + fontSize * 0.4}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="white" font-family="system-ui,sans-serif">${count}</text>
    </svg>`;
    return L.divIcon({
      html: svg,
      className: "",
      iconSize: [size, size],
      iconAnchor: [cx, cx],
    });
  }

  // Múltiplos tipos → donut/pizza
  let currentAngle = 0;
  const paths: string[] = [];
  for (const [atrib, typeCount] of Object.entries(atribCounts)) {
    const sliceDeg = (typeCount / count) * 360;
    const endAngle = currentAngle + sliceDeg;
    const color = ATRIBUICAO_COLORS[atrib] || FALLBACK_COLOR;
    paths.push(
      `<path d="${arcPath(cx, cx, r, currentAngle, endAngle)}" fill="${color}" fill-opacity="0.92"/>`
    );
    currentAngle = endAngle;
  }

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <filter id="cd${size}"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.18"/></filter>
    <g filter="url(#cd${size})">${paths.join("")}</g>
    ${outerStroke}
    <circle cx="${cx}" cy="${cx}" r="${innerR}" fill="white"/>
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="#e4e4e7" stroke-width="0.75"/>
    <text x="${cx}" y="${cx + fontSize * 0.4}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="#18181b" font-family="system-ui,sans-serif">${count}</text>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: hasJury ? "cluster-has-jury" : "",
    iconSize: [size, size],
    iconAnchor: [cx, cx],
  });
}

// ─── Legend ────────────────────────────────────────────────────────────────
function buildLegendHTML(): string {
  const juryItems = ["JURI_CAMACARI", "GRUPO_JURI"];
  const otherItems = ["VVD_CAMACARI", "EXECUCAO_PENAL", "SUBSTITUICAO", "SUBSTITUICAO_CIVEL"];

  const juryRows = juryItems
    .map((k) => {
      const fill = ATRIBUICAO_COLORS[k];
      return `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
      <div style="position:relative;width:20px;height:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
        <div style="width:18px;height:18px;border-radius:50%;border:1px solid ${fill};opacity:0.22;position:absolute;"></div>
        <div style="width:10px;height:10px;border-radius:50%;background:${fill};border:1.5px solid ${ATRIBUICAO_BORDERS[k]};"></div>
      </div>
      <span style="color:#374151;font-size:11px;">${ATRIBUICAO_LABELS[k]}</span>
    </div>`;
    })
    .join("");

  const vdRow = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
      <div style="width:20px;height:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
        <div style="width:11px;height:11px;background:${ATRIBUICAO_COLORS.VVD_CAMACARI};transform:rotate(45deg);border:1.5px solid ${ATRIBUICAO_BORDERS.VVD_CAMACARI};box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>
      </div>
      <span style="color:#374151;font-size:11px;">${ATRIBUICAO_LABELS.VVD_CAMACARI}</span>
    </div>`;

  const otherRows = otherItems
    .filter((k) => k !== "VVD_CAMACARI")
    .map((k) => {
      const fill = ATRIBUICAO_COLORS[k];
      const border = ATRIBUICAO_BORDERS[k];
      return `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
      <div style="width:7px;height:7px;border-radius:50%;background:${fill};flex-shrink:0;border:1px solid ${border};"></div>
      <span style="color:#6b7280;font-size:10px;">${ATRIBUICAO_LABELS[k]}</span>
    </div>`;
    })
    .join("");

  return `
    <div style="font-family:system-ui,sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="font-weight:600;color:#52525b;font-size:11px;">Legenda</span>
        <button id="cadastro-legend-toggle" style="background:none;border:none;cursor:pointer;color:#9ca3af;font-size:16px;line-height:1;padding:0 2px;display:flex;align-items:center;">−</button>
      </div>
      <div id="cadastro-legend-content">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;margin-bottom:5px;">Tribunal do Júri</div>
        ${juryRows}
        <div style="border-top:1px solid #f3f4f6;margin:7px 0;"></div>
        ${vdRow}
        <div style="border-top:1px solid #f3f4f6;margin:7px 0;"></div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;margin-bottom:5px;">Demais Atribuições</div>
        ${otherRows}
      </div>
    </div>
  `;
}

// ─── Constants ─────────────────────────────────────────────────────────────
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
  createdAt?: Date | string | null;
}

interface Props {
  processos: ProcessoMapPoint[];
  showProcessos: boolean;
  resetViewTrigger?: number;
}

export default function CadastroMapaLeaflet({
  processos,
  showProcessos,
  resetViewTrigger,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const legendRef = useRef<L.Control | null>(null);

  // Inject pulse CSS once
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "cadastro-pulse-css";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = PULSE_CSS;
      document.head.appendChild(style);
    }
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: CAMACARI_CENTER,
      zoom: INITIAL_ZOOM,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.fitBounds(CAMACARI_BOUNDS);

    // Legend control
    const legend = new L.Control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create(
        "div",
        "leaflet-bar leaflet-control"
      );
      div.style.cssText =
        "background:white;padding:10px 12px;border-radius:8px;box-shadow:0 1px 5px rgba(0,0,0,0.2);max-width:180px;";
      div.innerHTML = buildLegendHTML();

      // Toggle collapse
      div.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.id === "cadastro-legend-toggle") {
          const content = div.querySelector(
            "#cadastro-legend-content"
          ) as HTMLElement;
          if (content) {
            const isVisible = content.style.display !== "none";
            content.style.display = isVisible ? "none" : "block";
            target.textContent = isVisible ? "+" : "−";
          }
        }
      });

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
      legendRef.current = null;
    };
  }, []);

  // Reset view when triggered
  useEffect(() => {
    if (!mapRef.current || resetViewTrigger === undefined) return;
    mapRef.current.fitBounds(CAMACARI_BOUNDS);
  }, [resetViewTrigger]);

  // Update markers when data or filters change
  useEffect(() => {
    if (!mapRef.current) return;

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
      iconCreateFunction: createDonutIcon,
    } as MarkerClusterGroupOptions);

    processos.forEach((point) => {
      if (!point.localDoFatoLat || !point.localDoFatoLng) return;
      const lat = parseFloat(point.localDoFatoLat);
      const lng = parseFloat(point.localDoFatoLng);
      if (isNaN(lat) || isNaN(lng)) return;

      const atribuicaoKey = point.atribuicao ?? "";
      const atribuicaoLabel =
        ATRIBUICAO_LABELS[atribuicaoKey] || atribuicaoKey || "Sem atribuição";
      const color = ATRIBUICAO_COLORS[atribuicaoKey] || FALLBACK_COLOR;

      const icon = createMarkerIcon(atribuicaoKey, point.createdAt);

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

      const isRecent = point.createdAt
        ? Date.now() - new Date(point.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
        : false;

      const recentBadge = isRecent
        ? `<span style="display:inline-block;background:#dcfce7;color:#166534;font-size:9px;font-weight:600;padding:1px 5px;border-radius:4px;letter-spacing:0.04em;margin-bottom:4px;">RECENTE</span>`
        : "";

      const popupHtml = `
        <div style="max-width:280px;font-family:system-ui,sans-serif;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${color};flex-shrink:0;"></span>
            <span style="font-size:10px;color:${color};font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">${atribuicaoLabel}</span>
          </div>
          ${recentBadge}
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
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}
