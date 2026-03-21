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

// ─── Color system — pastel fill + dark border (mirrors radar palette) ──────
const ATRIBUICAO_FILLS: Record<string, string> = {
  JURI_CAMACARI:    "#4ade80",  // green-400
  GRUPO_JURI:       "#86efac",  // green-300
  VVD_CAMACARI:     "#fbbf24",  // amber-400
  EXECUCAO_PENAL:   "#60a5fa",  // blue-400
  SUBSTITUICAO:     "#fb923c",  // orange-400
  SUBSTITUICAO_CIVEL: "#a78bfa", // violet-400
};

const ATRIBUICAO_BORDERS: Record<string, string> = {
  JURI_CAMACARI:    "#166534",  // green-800
  GRUPO_JURI:       "#166534",  // green-800
  VVD_CAMACARI:     "#78350f",  // amber-900
  EXECUCAO_PENAL:   "#1e3a8a",  // blue-900
  SUBSTITUICAO:     "#7c2d12",  // orange-900
  SUBSTITUICAO_CIVEL: "#4c1d95", // violet-900
};

const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Tribunal do Júri",
  GRUPO_JURI: "Grupo Especial do Júri",
  VVD_CAMACARI: "Violência Doméstica",
  EXECUCAO_PENAL: "Execução Penal",
  SUBSTITUICAO: "Substituição Criminal",
  SUBSTITUICAO_CIVEL: "Cível/Curadoria",
};

const FALLBACK_FILL   = "#a1a1aa";
const FALLBACK_BORDER = "#3f3f46";

const JURY_ATRIBUICOES  = new Set(["JURI_CAMACARI", "GRUPO_JURI"]);
const DIAMOND_ATRIBUICOES = new Set(["VVD_CAMACARI"]);

// ─── Pulse CSS ────────────────────────────────────────────────────────────
const PULSE_CSS = `
  @keyframes cadastro-pulse {
    0%   { transform: translate(-50%,-50%) scale(1); opacity: 0.4; }
    70%  { transform: translate(-50%,-50%) scale(2); opacity: 0; }
    100% { transform: translate(-50%,-50%) scale(2); opacity: 0; }
  }
  .cadastro-pulse-ring {
    animation: cadastro-pulse 3s ease-out infinite;
  }
`;

// ─── Tile layers ──────────────────────────────────────────────────────────
const TILE_LAYERS: Record<string, { url: string; attribution: string }> = {
  "Voyager": {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  "OSM": {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  "Satélite": {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
};

interface MarkerOptionsWithAtribuicao extends L.MarkerOptions {
  atribuicao?: string;
}

// ─── Relative date ────────────────────────────────────────────────────────
function formatRelDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  if (days < 30) return `há ${Math.floor(days / 7)} sem.`;
  if (days < 365) return `há ${Math.floor(days / 30)} mes.`;
  return `há ${Math.floor(days / 365)} ano${Math.floor(days / 365) > 1 ? "s" : ""}`;
}

// ─── Individual marker icon ───────────────────────────────────────────────
function createMarkerIcon(
  atribuicao: string,
  createdAt?: Date | string | null
): L.DivIcon {
  const fill   = ATRIBUICAO_FILLS[atribuicao]   || FALLBACK_FILL;
  const border = ATRIBUICAO_BORDERS[atribuicao] || FALLBACK_BORDER;

  // ── JÚRI: círculo fill pastel + borda escura + anel externo + pulse ──
  if (JURY_ATRIBUICOES.has(atribuicao)) {
    const isRecent = createdAt
      ? Date.now() - new Date(createdAt).getTime() < 14 * 24 * 60 * 60 * 1000
      : false;
    const sz = atribuicao === "JURI_CAMACARI" ? 22 : 20;
    const wrap = sz + 14;
    const half = wrap / 2;
    const outerR = sz + 5;
    const outerRingDiv = `<div style="position:absolute;top:50%;left:50%;width:${outerR}px;height:${outerR}px;margin:-${outerR/2}px 0 0 -${outerR/2}px;border-radius:50%;border:1px solid ${fill};opacity:0.3;"></div>`;
    const pulseDiv = isRecent
      ? `<div class="cadastro-pulse-ring" style="position:absolute;top:50%;left:50%;width:${sz+2}px;height:${sz+2}px;border-radius:50%;border:1.5px solid ${fill};"></div>`
      : "";
    const dotDiv = `<div style="position:absolute;top:50%;left:50%;width:${sz}px;height:${sz}px;margin:-${sz/2}px 0 0 -${sz/2}px;border-radius:50%;background:${fill};border:2px solid ${border};box-shadow:drop-shadow(0 1px 3px rgba(0,0,0,0.18));"></div>`;
    return L.divIcon({
      html: `<div style="position:relative;width:${wrap}px;height:${wrap}px;">${pulseDiv}${outerRingDiv}${dotDiv}</div>`,
      className: "",
      iconSize: [wrap, wrap],
      iconAnchor: [half, half],
    });
  }

  // ── VVD: losango fill âmbar + borda escura ──
  if (DIAMOND_ATRIBUICOES.has(atribuicao)) {
    const sq = 15;
    const wrap = 26;
    const half = wrap / 2;
    return L.divIcon({
      html: `<div style="position:relative;width:${wrap}px;height:${wrap}px;display:flex;align-items:center;justify-content:center;">
        <div style="width:${sq}px;height:${sq}px;background:${fill};border:2px solid ${border};transform:rotate(45deg);border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.18);"></div>
      </div>`,
      className: "",
      iconSize: [wrap, wrap],
      iconAnchor: [half, half],
    });
  }

  // ── Demais: círculo fill pastel + borda escura ──
  const sizes: Record<string, number> = {
    EXECUCAO_PENAL: 17,
    SUBSTITUICAO: 15,
    SUBSTITUICAO_CIVEL: 13,
  };
  const sz = sizes[atribuicao] ?? 13;
  const wrap = sz + 8;
  const half = wrap / 2;
  return L.divIcon({
    html: `<div style="position:relative;width:${wrap}px;height:${wrap}px;display:flex;align-items:center;justify-content:center;">
      <div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${fill};border:2px solid ${border};box-shadow:0 1px 3px rgba(0,0,0,0.18);"></div>
    </div>`,
    className: "",
    iconSize: [wrap, wrap],
    iconAnchor: [half, half],
  });
}

// ─── Donut cluster icon ───────────────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polarToCartesian(cx, cy, r, start);
  const e = polarToCartesian(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

function createDonutIcon(cluster: MarkerCluster): L.DivIcon {
  const markers = cluster.getAllChildMarkers();
  const count = markers.length;
  const size = count <= 4 ? 34 : count <= 9 ? 40 : 48;
  const fontSize = count <= 4 ? 11 : count <= 9 ? 12 : 13;
  const cx = size / 2;
  const r = size / 2 - 3;
  const innerR = Math.round(r * 0.45);
  const filterId = `cd${size}x${count}`;

  const atribCounts: Record<string, number> = {};
  let hasJury = false;
  for (const marker of markers) {
    const opts = marker.options as MarkerOptionsWithAtribuicao;
    const key = opts.atribuicao ?? "outros";
    atribCounts[key] = (atribCounts[key] || 0) + 1;
    if (JURY_ATRIBUICOES.has(key)) hasJury = true;
  }

  const types = Object.keys(atribCounts);

  const juryRing = hasJury
    ? `<circle cx="${cx}" cy="${cx}" r="${r + 2}" fill="none" stroke="#4ade80" stroke-width="1" stroke-opacity="0.3"/>`
    : "";

  // Single type → solid donut
  if (types.length === 1) {
    const fill = ATRIBUICAO_FILLS[types[0]] || FALLBACK_FILL;
    return L.divIcon({
      html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="${filterId}"><feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-opacity="0.12"/></filter></defs>
        ${juryRing}
        <circle cx="${cx}" cy="${cx}" r="${r}" fill="${fill}" filter="url(#${filterId})"/>
        <circle cx="${cx}" cy="${cx}" r="${innerR}" fill="white"/>
        <text x="${cx}" y="${cx + fontSize * 0.38}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="#3f3f46" font-family="system-ui,sans-serif">${count}</text>
      </svg>`,
      className: "",
      iconSize: [size, size],
      iconAnchor: [cx, cx],
    });
  }

  // Multi-type → donut pizza
  let currentAngle = 0;
  const paths: string[] = [];
  for (const [atrib, typeCount] of Object.entries(atribCounts)) {
    const sliceDeg = (typeCount / count) * 360;
    const endAngle = currentAngle + sliceDeg;
    const fill = ATRIBUICAO_FILLS[atrib] || FALLBACK_FILL;
    paths.push(`<path d="${arcPath(cx, cx, r, currentAngle, endAngle)}" fill="${fill}"/>`);
    currentAngle = endAngle;
  }

  return L.divIcon({
    html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="${filterId}"><feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-opacity="0.12"/></filter></defs>
      ${juryRing}
      <g filter="url(#${filterId})">${paths.join("")}</g>
      <circle cx="${cx}" cy="${cx}" r="${innerR + 1}" fill="white"/>
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>
      <text x="${cx}" y="${cx + fontSize * 0.38}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="#3f3f46" font-family="system-ui,sans-serif">${count}</text>
    </svg>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [cx, cx],
  });
}

// ─── Legend HTML ──────────────────────────────────────────────────────────
function buildLegendHTML(): string {
  const sections = [
    { label: "Tribunal do Júri", keys: ["JURI_CAMACARI", "GRUPO_JURI"] },
    { label: null,               keys: ["VVD_CAMACARI"] },
    { label: "Demais",           keys: ["EXECUCAO_PENAL", "SUBSTITUICAO", "SUBSTITUICAO_CIVEL"] },
  ];

  const rows = sections.map(({ label, keys }) => {
    const header = label
      ? `<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:#a1a1aa;margin-bottom:4px;margin-top:2px;">${label}</div>`
      : "";
    const items = keys.map((k) => {
      const fill   = ATRIBUICAO_FILLS[k]   || FALLBACK_FILL;
      const border = ATRIBUICAO_BORDERS[k] || FALLBACK_BORDER;
      const isVVD  = DIAMOND_ATRIBUICOES.has(k);
      const isJury = JURY_ATRIBUICOES.has(k);
      let dot: string;
      if (isVVD) {
        dot = `<div style="width:8px;height:8px;background:${fill};border:1.5px solid ${border};transform:rotate(45deg);border-radius:1px;flex-shrink:0;"></div>`;
      } else if (isJury) {
        dot = `<div style="position:relative;width:12px;height:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:11px;height:11px;border-radius:50%;border:1px solid ${fill};opacity:0.3;"></div>
          <div style="width:8px;height:8px;border-radius:50%;background:${fill};border:1.5px solid ${border};"></div>
        </div>`;
      } else {
        dot = `<div style="width:8px;height:8px;border-radius:50%;background:${fill};border:1.5px solid ${border};flex-shrink:0;"></div>`;
      }
      return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">${dot}<span style="color:#52525b;font-size:10px;">${ATRIBUICAO_LABELS[k]}</span></div>`;
    }).join("");
    return header + items;
  }).join(`<div style="border-top:1px solid #f4f4f5;margin:5px 0;"></div>`);

  return `
    <div style="font-family:system-ui,sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-weight:500;color:#71717a;font-size:10px;">Legenda</span>
        <button id="cadastro-legend-toggle" style="background:none;border:none;cursor:pointer;color:#a1a1aa;font-size:14px;line-height:1;padding:0 2px;">−</button>
      </div>
      <div id="cadastro-legend-content">${rows}</div>
    </div>
  `;
}

// ─── Tile switcher HTML ───────────────────────────────────────────────────
function buildTileSwitcherHTML(activeKey: string): string {
  const keys = Object.keys(TILE_LAYERS);
  const btns = keys.map((k) => {
    const isActive = k === activeKey;
    return `<button
      data-tile="${k}"
      style="
        padding:3px 9px;
        font-size:10px;
        border:none;
        border-radius:5px;
        cursor:pointer;
        font-family:system-ui,sans-serif;
        transition:background 0.12s;
        background:${isActive ? "#f4f4f5" : "transparent"};
        color:${isActive ? "#18181b" : "#71717a"};
        font-weight:${isActive ? "500" : "400"};
      "
    >${k}</button>`;
  }).join("");
  return `<div id="cadastro-tile-switcher" style="display:flex;gap:2px;">${btns}</div>`;
}

// ─── Constants ────────────────────────────────────────────────────────────
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
  assunto?: string | null;
  fase?: string | null;
  situacao?: string | null;
}

interface Props {
  processos: ProcessoMapPoint[];
  showProcessos: boolean;
  resetViewTrigger?: number;
}

export default function CadastroMapaLeaflet({ processos, showProcessos, resetViewTrigger }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<L.Map | null>(null);
  const markersRef      = useRef<L.LayerGroup | null>(null);
  const tilePairRef     = useRef<{ key: string; layer: L.TileLayer } | null>(null);

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

    // Default tile: Voyager
    const defaultKey = "Voyager";
    const tileLayer = L.tileLayer(TILE_LAYERS[defaultKey].url, {
      attribution: TILE_LAYERS[defaultKey].attribution,
      maxZoom: 19,
    }).addTo(map);
    tilePairRef.current = { key: defaultKey, layer: tileLayer };

    map.fitBounds(CAMACARI_BOUNDS);

    // ── Tile switcher control ──────────────────────────────────────────
    const tileSwitcher = new L.Control({ position: "topleft" });
    tileSwitcher.onAdd = () => {
      const div = L.DomUtil.create("div");
      div.style.cssText =
        "background:rgba(255,255,255,0.95);backdrop-filter:blur(4px);padding:3px 4px;border-radius:8px;border:1px solid #e4e4e7;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-top:8px;";
      div.innerHTML = buildTileSwitcherHTML(defaultKey);

      div.addEventListener("click", (e) => {
        const target = (e.target as HTMLElement).closest("[data-tile]") as HTMLElement | null;
        if (!target) return;
        const key = target.getAttribute("data-tile")!;
        if (!TILE_LAYERS[key] || tilePairRef.current?.key === key) return;

        if (tilePairRef.current) map.removeLayer(tilePairRef.current.layer);
        const newLayer = L.tileLayer(TILE_LAYERS[key].url, {
          attribution: TILE_LAYERS[key].attribution,
          maxZoom: 19,
        }).addTo(map);
        tilePairRef.current = { key, layer: newLayer };

        // Re-render buttons
        const switcher = document.getElementById("cadastro-tile-switcher");
        if (switcher) switcher.outerHTML = buildTileSwitcherHTML(key);
        div.innerHTML = buildTileSwitcherHTML(key);
      });

      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    tileSwitcher.addTo(map);

    // ── Legend control ─────────────────────────────────────────────────
    const legend = new L.Control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div");
      div.style.cssText =
        "background:rgba(255,255,255,0.96);backdrop-filter:blur(4px);padding:10px 12px;border-radius:8px;border:1px solid #f4f4f5;box-shadow:0 1px 5px rgba(0,0,0,0.1);max-width:190px;";
      div.innerHTML = buildLegendHTML();

      div.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.id === "cadastro-legend-toggle") {
          const content = div.querySelector("#cadastro-legend-content") as HTMLElement;
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

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      tilePairRef.current = null;
    };
  }, []);

  // Reset view
  useEffect(() => {
    if (!mapRef.current || resetViewTrigger === undefined) return;
    mapRef.current.fitBounds(CAMACARI_BOUNDS);
  }, [resetViewTrigger]);

  // Update markers
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
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 1.5,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: createDonutIcon,
    } as MarkerClusterGroupOptions);

    processos.forEach((point) => {
      if (!point.localDoFatoLat || !point.localDoFatoLng) return;
      const lat = parseFloat(point.localDoFatoLat);
      const lng = parseFloat(point.localDoFatoLng);
      if (isNaN(lat) || isNaN(lng)) return;

      const atribuicaoKey   = point.atribuicao ?? "";
      const atribuicaoLabel = ATRIBUICAO_LABELS[atribuicaoKey] || atribuicaoKey || "Sem atribuição";
      const fill            = ATRIBUICAO_FILLS[atribuicaoKey]  || FALLBACK_FILL;
      const border          = ATRIBUICAO_BORDERS[atribuicaoKey] || FALLBACK_BORDER;

      const icon = createMarkerIcon(atribuicaoKey, point.createdAt);
      const marker = L.marker([lat, lng], { icon, atribuicao: atribuicaoKey } as MarkerOptionsWithAtribuicao);

      // ── Popup ───────────────────────────────────────────────────────
      const relDate = formatRelDate(point.createdAt);
      const metaParts: string[] = [];
      if (point.fase)    metaParts.push(point.fase);
      if (point.situacao && point.situacao !== "ativo") metaParts.push(point.situacao);
      if (relDate)       metaParts.push(relDate);
      const metaLine = metaParts.length
        ? `<div style="font-size:10px;color:#a1a1aa;margin-top:1px;">${metaParts.join(" · ")}</div>`
        : "";

      const assuntoLine = point.assunto
        ? `<div style="font-size:10px;color:#71717a;margin-top:4px;line-height:1.4;">${point.assunto}</div>`
        : "";

      const enderecoLine = point.localDoFatoEndereco
        ? `<div style="font-size:10px;color:#a1a1aa;margin-top:3px;">${point.localDoFatoEndereco}</div>`
        : "";

      const assistidoLine = point.assistidoId
        ? `<a href="/admin/assistidos/${point.assistidoId}" style="font-size:11px;color:#18181b;font-weight:500;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${point.assistidoNome ?? "—"}</a>`
        : `<span style="font-size:11px;color:#52525b;">${point.assistidoNome ?? "—"}</span>`;

      const isRecent = point.createdAt
        ? Date.now() - new Date(point.createdAt).getTime() < 14 * 24 * 60 * 60 * 1000
        : false;
      const recentBadge = isRecent
        ? `<span style="display:inline-flex;align-items:center;background:#f0fdf4;color:#166534;font-size:9px;font-weight:600;padding:1px 6px;border-radius:4px;letter-spacing:0.04em;margin-left:6px;">NOVO</span>`
        : "";

      const popupHtml = `
        <div style="max-width:260px;font-family:system-ui,sans-serif;">
          <!-- Header unificado escuro -->
          <div style="background:#18181b;border-radius:6px 6px 0 0;padding:8px 10px;margin:-12px -14px 0;display:flex;align-items:center;gap:6px;">
            <div style="width:7px;height:7px;border-radius:50%;background:${fill};border:1.5px solid ${border};flex-shrink:0;"></div>
            <span style="font-size:10px;color:#d4d4d8;font-weight:500;">${atribuicaoLabel}</span>
            ${recentBadge}
          </div>
          <!-- Body -->
          <div style="padding-top:10px;">
            <div style="font-size:12px;font-family:ui-monospace,monospace;color:#18181b;font-weight:600;margin-bottom:3px;">${point.numeroProcesso}</div>
            <div style="margin-bottom:2px;">${assistidoLine}</div>
            ${metaLine}
            ${assuntoLine}
            ${enderecoLine}
            <a href="/admin/processos/${point.id}" style="
              display:block;
              margin-top:9px;
              width:100%;
              padding:6px 12px;
              background:#18181b;
              color:white;
              border-radius:6px;
              font-size:11px;
              font-weight:600;
              cursor:pointer;
              text-align:center;
              text-decoration:none;
              box-sizing:border-box;
              transition:background 0.12s;
            " onmouseover="this.style.background='#3f3f46'" onmouseout="this.style.background='#18181b'">Ver processo →</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });
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
