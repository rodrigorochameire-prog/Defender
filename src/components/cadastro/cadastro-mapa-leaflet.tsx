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

// ─── Color system — paleta suavizada (400-500 range) ──────────────────────
const ATRIBUICAO_COLORS: Record<string, string> = {
  JURI_CAMACARI:    "#22c55e",  // green-500
  GRUPO_JURI:       "#f97316",  // orange-400
  VVD_CAMACARI:     "#f59e0b",  // amber-400
  EXECUCAO_PENAL:   "#60a5fa",  // blue-400
  SUBSTITUICAO:     "#fb7185",  // rose-400
  SUBSTITUICAO_CIVEL: "#a78bfa", // violet-400
};

const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Tribunal do Júri",
  GRUPO_JURI: "Grupo Especial do Júri",
  VVD_CAMACARI: "Violência Doméstica",
  EXECUCAO_PENAL: "Execução Penal",
  SUBSTITUICAO: "Substituição Criminal",
  SUBSTITUICAO_CIVEL: "Cível/Curadoria",
};

const FALLBACK_COLOR = "#94a3b8";  // slate-400

// Atribuições que vão a plenário — anel duplo
const JURY_ATRIBUICOES = new Set(["JURI_CAMACARI", "GRUPO_JURI"]);

// CSS injected once for pulse animations
const PULSE_CSS = `
  @keyframes cadastro-pulse {
    0%   { transform: translate(-50%,-50%) scale(1); opacity: 0.45; }
    70%  { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
    100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
  }
  .cadastro-pulse-ring {
    animation: cadastro-pulse 3.5s ease-out infinite;
  }
`;

interface MarkerOptionsWithAtribuicao extends L.MarkerOptions {
  atribuicao?: string;
}

// ─── Individual marker icon — white ring style ─────────────────────────────
function createMarkerIcon(
  atribuicao: string,
  createdAt?: Date | string | null
): L.DivIcon {
  const color = ATRIBUICAO_COLORS[atribuicao] || FALLBACK_COLOR;

  // ── JÚRI: círculo branco + anel colorido + anel externo fino ──
  if (JURY_ATRIBUICOES.has(atribuicao)) {
    const isRecent = createdAt
      ? Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
      : false;
    // inner dot: 18px | inner ring: 2.5px colored | outer ring: 1px soft
    const inner = 18;
    const wrap = 32;
    const half = wrap / 2;
    const pulse = isRecent
      ? `<div class="cadastro-pulse-ring" style="position:absolute;top:50%;left:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:1.5px solid ${color};"></div>`
      : "";
    // outer thin ring
    const outerRing = `<div style="position:absolute;top:50%;left:50%;width:28px;height:28px;margin:-14px 0 0 -14px;border-radius:50%;border:1px solid ${color};opacity:0.28;"></div>`;
    const dot = `<div style="position:absolute;top:50%;left:50%;width:${inner}px;height:${inner}px;margin:-${inner/2}px 0 0 -${inner/2}px;border-radius:50%;background:#fff;border:2.5px solid ${color};box-shadow:0 2px 6px rgba(0,0,0,0.14),0 0 0 1px rgba(0,0,0,0.04);"></div>`;
    return L.divIcon({
      html: `<div style="position:relative;width:${wrap}px;height:${wrap}px;">${pulse}${outerRing}${dot}</div>`,
      className: "",
      iconSize: [wrap, wrap],
      iconAnchor: [half, half],
    });
  }

  // ── VVD: quadrado arredondado branco + borda âmbar ──
  if (atribuicao === "VVD_CAMACARI") {
    const sq = 15;
    const wrap = 24;
    const half = wrap / 2;
    return L.divIcon({
      html: `<div style="position:relative;width:${wrap}px;height:${wrap}px;display:flex;align-items:center;justify-content:center;">
        <div style="width:${sq}px;height:${sq}px;background:#fff;border-radius:3px;border:2.5px solid ${color};box-shadow:0 2px 6px rgba(0,0,0,0.14),0 0 0 1px rgba(0,0,0,0.04);"></div>
      </div>`,
      className: "",
      iconSize: [wrap, wrap],
      iconAnchor: [half, half],
    });
  }

  // ── Demais: círculo branco + anel colorido ──
  const sizes: Record<string, number> = {
    EXECUCAO_PENAL: 15,
    SUBSTITUICAO: 14,
    SUBSTITUICAO_CIVEL: 13,
  };
  const sz = sizes[atribuicao] ?? 13;
  const wrap = sz + 6;
  const half = wrap / 2;
  return L.divIcon({
    html: `<div style="position:relative;width:${wrap}px;height:${wrap}px;display:flex;align-items:center;justify-content:center;">
      <div style="width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;border:2.5px solid ${color};box-shadow:0 2px 6px rgba(0,0,0,0.13),0 0 0 1px rgba(0,0,0,0.04);"></div>
    </div>`,
    className: "",
    iconSize: [wrap, wrap],
    iconAnchor: [half, half],
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

  // Tamanho por densidade
  const size = count <= 4 ? 34 : count <= 9 ? 40 : 48;
  const fontSize = count <= 4 ? 11 : count <= 9 ? 12 : 13;
  const cx = size / 2;
  const r = size / 2 - 2;
  // Buraco maior — 42% do raio para visual mais clean
  const innerR = Math.round(r * 0.42);

  const atribCounts: Record<string, number> = {};
  let hasJury = false;
  for (const marker of markers) {
    const opts = marker.options as MarkerOptionsWithAtribuicao;
    const key: string = opts.atribuicao ?? "outros";
    atribCounts[key] = (atribCounts[key] || 0) + 1;
    if (JURY_ATRIBUICOES.has(key)) hasJury = true;
  }

  const types = Object.keys(atribCounts);
  const filterId = `cd${size}x${count}`;

  // Tipo único → anel sólido com buraco branco
  if (types.length === 1) {
    const color = ATRIBUICAO_COLORS[types[0]] || FALLBACK_COLOR;
    const isJury = JURY_ATRIBUICOES.has(types[0]);
    // Anel externo fino para Júri
    const juryOuterRing = isJury
      ? `<circle cx="${cx}" cy="${cx}" r="${r + 1.5}" fill="none" stroke="${color}" stroke-width="1" stroke-opacity="0.28"/>`
      : "";
    const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="${filterId}"><feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-opacity="0.14"/></filter></defs>
      ${juryOuterRing}
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="${color}" filter="url(#${filterId})"/>
      <circle cx="${cx}" cy="${cx}" r="${innerR}" fill="white"/>
      <text x="${cx}" y="${cx + fontSize * 0.38}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="#3f3f46" font-family="system-ui,sans-serif">${count}</text>
    </svg>`;
    return L.divIcon({
      html: svg,
      className: "",
      iconSize: [size, size],
      iconAnchor: [cx, cx],
    });
  }

  // Múltiplos tipos → donut pizza com arcos suavizados
  let currentAngle = 0;
  const paths: string[] = [];
  for (const [atrib, typeCount] of Object.entries(atribCounts)) {
    const sliceDeg = (typeCount / count) * 360;
    const endAngle = currentAngle + sliceDeg;
    const color = ATRIBUICAO_COLORS[atrib] || FALLBACK_COLOR;
    paths.push(
      `<path d="${arcPath(cx, cx, r, currentAngle, endAngle)}" fill="${color}"/>`
    );
    currentAngle = endAngle;
  }

  // Anel externo fino para Júri no cluster misto
  const juryOuterRing = hasJury
    ? `<circle cx="${cx}" cy="${cx}" r="${r + 1.5}" fill="none" stroke="#22c55e" stroke-width="1" stroke-opacity="0.25"/>`
    : "";

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="${filterId}"><feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-opacity="0.14"/></filter></defs>
    ${juryOuterRing}
    <g filter="url(#${filterId})">${paths.join("")}</g>
    <circle cx="${cx}" cy="${cx}" r="${innerR + 1}" fill="white"/>
    <circle cx="${cx}" cy="${cx}" r="${innerR}" fill="white"/>
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>
    <text x="${cx}" y="${cx + fontSize * 0.38}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="#3f3f46" font-family="system-ui,sans-serif">${count}</text>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size],
    iconAnchor: [cx, cx],
  });
}

// ─── Legend ────────────────────────────────────────────────────────────────
function buildLegendHTML(): string {
  const juryItems = ["JURI_CAMACARI", "GRUPO_JURI"];
  const otherItems = ["EXECUCAO_PENAL", "SUBSTITUICAO", "SUBSTITUICAO_CIVEL"];

  // Júri: círculo branco + anel colorido + anel externo fino
  const juryRows = juryItems
    .map((k) => {
      const color = ATRIBUICAO_COLORS[k];
      return `
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
      <div style="position:relative;width:22px;height:22px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:20px;height:20px;border-radius:50%;border:1px solid ${color};opacity:0.25;"></div>
        <div style="width:13px;height:13px;border-radius:50%;background:#fff;border:2px solid ${color};box-shadow:0 1px 4px rgba(0,0,0,0.12);"></div>
      </div>
      <span style="color:#374151;font-size:11px;">${ATRIBUICAO_LABELS[k]}</span>
    </div>`;
    })
    .join("");

  // VVD: quadrado arredondado branco
  const vdRow = `
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
      <div style="width:22px;height:22px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
        <div style="width:12px;height:12px;background:#fff;border-radius:2px;border:2px solid ${ATRIBUICAO_COLORS.VVD_CAMACARI};box-shadow:0 1px 4px rgba(0,0,0,0.12);"></div>
      </div>
      <span style="color:#374151;font-size:11px;">${ATRIBUICAO_LABELS.VVD_CAMACARI}</span>
    </div>`;

  // Demais: círculo branco menor
  const otherRows = otherItems
    .map((k) => {
      const color = ATRIBUICAO_COLORS[k];
      return `<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
      <div style="width:22px;height:22px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
        <div style="width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid ${color};box-shadow:0 1px 3px rgba(0,0,0,0.1);"></div>
      </div>
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
