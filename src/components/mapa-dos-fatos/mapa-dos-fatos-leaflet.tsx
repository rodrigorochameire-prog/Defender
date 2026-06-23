"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import {
  corPrincipal,
  corDoTipo,
  labelDoTipo,
} from "@/components/mapa-dos-fatos/tipos-config";

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

interface MarkerOptionsWithCor extends L.MarkerOptions {
  corMarcador?: string;
}

// ─── Tile layers (mesma config do mapa de cadastro) ───────────────────────
const TILE_LAYERS: Record<string, { url: string; attribution: string; subdomains?: string }> = {
  Voyager: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
  },
  Limpo: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
  },
  OSM: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  "Satélite": {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
  Escuro: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
  },
};

// ─── Individual marker icon — círculo colorido por tipo principal ─────────
function createMarkerIcon(cor: string): L.DivIcon {
  const sz = 15;
  const wrap = sz + 8;
  const half = wrap / 2;
  return L.divIcon({
    html: `<div style="position:relative;width:${wrap}px;height:${wrap}px;display:flex;align-items:center;justify-content:center;">
      <div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${cor};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
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
  const filterId = `mf${size}x${count}`;

  const corCounts: Record<string, number> = {};
  for (const marker of markers) {
    const opts = marker.options as MarkerOptionsWithCor;
    const key = opts.corMarcador ?? "#71717a";
    corCounts[key] = (corCounts[key] || 0) + 1;
  }
  const cores = Object.keys(corCounts);

  // Cor única → donut sólido
  if (cores.length === 1) {
    const fill = cores[0];
    return L.divIcon({
      html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="${filterId}"><feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-opacity="0.12"/></filter></defs>
        <circle cx="${cx}" cy="${cx}" r="${r}" fill="${fill}" filter="url(#${filterId})"/>
        <circle cx="${cx}" cy="${cx}" r="${innerR}" fill="white"/>
        <text x="${cx}" y="${cx + fontSize * 0.38}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="#404040" font-family="system-ui,sans-serif">${count}</text>
      </svg>`,
      className: "",
      iconSize: [size, size],
      iconAnchor: [cx, cx],
    });
  }

  // Multi-cor → donut pizza
  let currentAngle = 0;
  const paths: string[] = [];
  for (const [cor, typeCount] of Object.entries(corCounts)) {
    const sliceDeg = (typeCount / count) * 360;
    const endAngle = currentAngle + sliceDeg;
    paths.push(`<path d="${arcPath(cx, cx, r, currentAngle, endAngle)}" fill="${cor}"/>`);
    currentAngle = endAngle;
  }

  return L.divIcon({
    html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="${filterId}"><feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-opacity="0.12"/></filter></defs>
      <g filter="url(#${filterId})">${paths.join("")}</g>
      <circle cx="${cx}" cy="${cx}" r="${innerR + 1}" fill="white"/>
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>
      <text x="${cx}" y="${cx + fontSize * 0.38}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="#404040" font-family="system-ui,sans-serif">${count}</text>
    </svg>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [cx, cx],
  });
}

// ─── Tile switcher HTML ───────────────────────────────────────────────────
function buildTileSwitcherHTML(activeKey: string): string {
  const keys = Object.keys(TILE_LAYERS);
  const btns = keys
    .map((k) => {
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
        background:${isActive ? "#f5f5f5" : "transparent"};
        color:${isActive ? "#171717" : "#737373"};
        font-weight:${isActive ? "500" : "400"};
      "
    >${k}</button>`;
    })
    .join("");
  return `<div id="mapa-fatos-tile-switcher" style="display:flex;gap:2px;">${btns}</div>`;
}

// ─── Constants ────────────────────────────────────────────────────────────
const CAMACARI_CENTER: [number, number] = [-12.6976, -38.3244];
const CAMACARI_BOUNDS: [[number, number], [number, number]] = [
  [-12.58, -38.42],
  [-12.83, -38.25],
];
const INITIAL_ZOOM = 12;
const MAX_PROCESSOS_LINKS = 4;

interface LugarPoint {
  lugarId: number;
  latitude: number;
  longitude: number;
  endereco: string | null;
  bairro: string | null;
  tipos: string[];
  atribuicoes: string[];
  processoIds: number[];
  count: number;
}

interface Props {
  pontos: LugarPoint[];
  resetViewTrigger?: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function MapaDosFatosLeaflet({ pontos, resetViewTrigger }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const tilePairRef = useRef<{ key: string; layer: L.TileLayer } | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: CAMACARI_CENTER,
      zoom: INITIAL_ZOOM,
      zoomControl: true,
    });

    const defaultKey = "Voyager";
    const tileLayer = L.tileLayer(TILE_LAYERS[defaultKey].url, {
      attribution: TILE_LAYERS[defaultKey].attribution,
      subdomains: TILE_LAYERS[defaultKey].subdomains || "abc",
      maxZoom: 20,
    }).addTo(map);
    tilePairRef.current = { key: defaultKey, layer: tileLayer };

    map.fitBounds(CAMACARI_BOUNDS);

    // ── Tile switcher control ──────────────────────────────────────────
    const tileSwitcher = new L.Control({ position: "topleft" });
    tileSwitcher.onAdd = () => {
      const div = L.DomUtil.create("div");
      div.style.cssText =
        "background:rgba(255,255,255,0.95);backdrop-filter:blur(4px);padding:3px 4px;border-radius:8px;border:1px solid #e5e5e5;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-top:8px;";
      div.innerHTML = buildTileSwitcherHTML(defaultKey);

      div.addEventListener("click", (e) => {
        const target = (e.target as HTMLElement).closest("[data-tile]") as HTMLElement | null;
        if (!target) return;
        const key = target.getAttribute("data-tile")!;
        if (!TILE_LAYERS[key] || tilePairRef.current?.key === key) return;

        if (tilePairRef.current) map.removeLayer(tilePairRef.current.layer);
        const newLayer = L.tileLayer(TILE_LAYERS[key].url, {
          attribution: TILE_LAYERS[key].attribution,
          subdomains: TILE_LAYERS[key].subdomains || "abc",
          maxZoom: 20,
        }).addTo(map);
        tilePairRef.current = { key, layer: newLayer };

        div.innerHTML = buildTileSwitcherHTML(key);
      });

      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    tileSwitcher.addTo(map);

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

    const clusterGroup = (L as unknown as {
      markerClusterGroup: (opts: MarkerClusterGroupOptions) => L.LayerGroup;
    }).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 30,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 1.5,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: createDonutIcon,
    });

    pontos.forEach((point) => {
      const lat = point.latitude;
      const lng = point.longitude;
      if (isNaN(lat) || isNaN(lng)) return;

      const cor = corPrincipal(point.tipos);
      const icon = createMarkerIcon(cor);
      const marker = L.marker([lat, lng], {
        icon,
        corMarcador: cor,
      } as MarkerOptionsWithCor);

      // ── Popup ───────────────────────────────────────────────────────
      const enderecoLine = point.endereco
        ? `<div style="font-size:12px;font-weight:600;color:#171717;margin-bottom:2px;">${escapeHtml(point.endereco)}</div>`
        : `<div style="font-size:12px;font-weight:600;color:#171717;margin-bottom:2px;">Lugar sem endereço</div>`;

      const bairroLine = point.bairro
        ? `<div style="font-size:10px;color:#a3a3a3;margin-bottom:6px;">${escapeHtml(point.bairro)}</div>`
        : "";

      const tiposHtml = point.tipos
        .map((t) => {
          const c = corDoTipo(t);
          const l = labelDoTipo(t);
          return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${c};flex-shrink:0;"></span>
            <span style="font-size:10px;color:#525252;">${escapeHtml(l)}</span>
          </div>`;
        })
        .join("");
      const tiposBlock = point.tipos.length
        ? `<div style="margin-bottom:8px;">${tiposHtml}</div>`
        : "";

      const nProc = point.processoIds.length;
      const procLinks = point.processoIds
        .slice(0, MAX_PROCESSOS_LINKS)
        .map(
          (id) =>
            `<a href="/admin/processos/${id}" style="
              display:inline-block;
              padding:3px 8px;
              margin:0 4px 4px 0;
              background:#f5f5f5;
              color:#171717;
              border-radius:5px;
              font-size:10px;
              font-weight:500;
              text-decoration:none;
              font-family:ui-monospace,monospace;
            " onmouseover="this.style.background='#e5e5e5'" onmouseout="this.style.background='#f5f5f5'">#${id}</a>`
        )
        .join("");
      const maisProc =
        nProc > MAX_PROCESSOS_LINKS
          ? `<span style="font-size:10px;color:#a3a3a3;">+${nProc - MAX_PROCESSOS_LINKS}</span>`
          : "";
      const procBlock = nProc
        ? `<div style="font-size:10px;color:#737373;margin-bottom:4px;">${nProc} processo${nProc !== 1 ? "s" : ""}</div>
           <div>${procLinks}${maisProc}</div>`
        : `<div style="font-size:10px;color:#a3a3a3;">Sem processos vinculados</div>`;

      const popupHtml = `
        <div style="max-width:260px;font-family:system-ui,sans-serif;">
          ${enderecoLine}
          ${bairroLine}
          ${tiposBlock}
          ${procBlock}
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });
      clusterGroup.addLayer(marker);
    });

    markersRef.current = clusterGroup;
    clusterGroup.addTo(mapRef.current);
  }, [pontos]);

  return (
    <div className="isolate h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}
