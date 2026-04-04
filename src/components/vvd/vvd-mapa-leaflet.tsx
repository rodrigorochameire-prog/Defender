"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

const CAMACARI_CENTER: [number, number] = [-12.6976, -38.3244];
const CAMACARI_BOUNDS: [[number, number], [number, number]] = [
  [-12.58, -38.42],
  [-12.83, -38.25],
];
const INITIAL_ZOOM = 12;

interface VvdCaso {
  id: number;
  processoNumero: string | null;
  assistidoNome: string;
  assistidoId: number | null;
  localDoFatoLat: string | null;
  localDoFatoLng: string | null;
  agressorResidenciaLat: string | null;
  agressorResidenciaLng: string | null;
  agressorResidenciaEndereco: string | null;
  agressorTrabalhoLat: string | null;
  agressorTrabalhoLng: string | null;
  agressorTrabalhoEndereco: string | null;
  raioRestricaoMetros: number | null;
  statusMpu: string | null;
}

interface LayerSet {
  localFato: L.CircleMarker | null;
  residencia: L.CircleMarker | null;
  trabalho: L.CircleMarker | null;
  raio: L.Circle | null;
}

export interface VvdMapaProps {
  casos: VvdCaso[];
  showLocalFato: boolean;
  showAgressorResidencia: boolean;
  showAgressorTrabalho: boolean;
  showRaioRestricao: boolean;
}

export default function VvdMapaLeaflet({
  casos,
  showLocalFato,
  showAgressorResidencia,
  showAgressorTrabalho,
  showRaioRestricao,
}: VvdMapaProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<LayerSet[]>([]);

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
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = [];
    };
  }, []);

  // Update layers when casos or toggle states change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove all existing layers
    for (const layerSet of layersRef.current) {
      layerSet.localFato?.remove();
      layerSet.residencia?.remove();
      layerSet.trabalho?.remove();
      layerSet.raio?.remove();
    }
    layersRef.current = [];

    for (const caso of casos) {
      const layerSet: LayerSet = {
        localFato: null,
        residencia: null,
        trabalho: null,
        raio: null,
      };

      // 1. Local do fato
      if (showLocalFato && caso.localDoFatoLat && caso.localDoFatoLng) {
        const lat = parseFloat(caso.localDoFatoLat);
        const lng = parseFloat(caso.localDoFatoLng);
        if (!isNaN(lat) && !isNaN(lng)) {
          const marker = L.circleMarker([lat, lng], {
            radius: 7,
            fillColor: "#e11d48",
            color: "white",
            weight: 1.5,
            fillOpacity: 0.85,
          }).addTo(map);

          const processoStr = caso.processoNumero
            ? `<span style="font-family:monospace;font-size:11px;">${caso.processoNumero}</span>`
            : "";
          const assistidoLink = caso.assistidoId
            ? `<a href="/admin/assistidos/${caso.assistidoId}" style="color:#059669;text-decoration:none;font-size:12px;font-weight:600;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${caso.assistidoNome || "—"}</a>`
            : `<span style="font-size:12px;font-weight:600;">${caso.assistidoNome || "—"}</span>`;

          marker.bindPopup(`
            <div style="font-family:system-ui,sans-serif;max-width:240px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#e11d48;flex-shrink:0;"></span>
                <span style="font-size:10px;color:#e11d48;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Local do Fato</span>
              </div>
              <div style="margin-bottom:4px;">${assistidoLink}</div>
              ${processoStr}
            </div>
          `);

          layerSet.localFato = marker;
        }
      }

      // 2. Residência do agressor
      if (
        showAgressorResidencia &&
        caso.agressorResidenciaLat &&
        caso.agressorResidenciaLng
      ) {
        const lat = parseFloat(caso.agressorResidenciaLat);
        const lng = parseFloat(caso.agressorResidenciaLng);
        if (!isNaN(lat) && !isNaN(lng)) {
          const marker = L.circleMarker([lat, lng], {
            radius: 6,
            fillColor: "#737373",
            color: "white",
            weight: 1.5,
            fillOpacity: 0.75,
          }).addTo(map);

          const enderecoStr =
            caso.agressorResidenciaEndereco || "endereço não informado";

          marker.bindPopup(`
            <div style="font-family:system-ui,sans-serif;max-width:240px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#737373;flex-shrink:0;"></span>
                <span style="font-size:10px;color:#737373;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Residência do Agressor</span>
              </div>
              <div style="font-size:11px;color:#374151;">${enderecoStr}</div>
            </div>
          `);

          layerSet.residencia = marker;
        }
      }

      // 3. Local de trabalho do agressor
      if (
        showAgressorTrabalho &&
        caso.agressorTrabalhoLat &&
        caso.agressorTrabalhoLng
      ) {
        const lat = parseFloat(caso.agressorTrabalhoLat);
        const lng = parseFloat(caso.agressorTrabalhoLng);
        if (!isNaN(lat) && !isNaN(lng)) {
          const marker = L.circleMarker([lat, lng], {
            radius: 5,
            fillColor: "#a3a3a3",
            color: "white",
            weight: 1.5,
            fillOpacity: 0.7,
          }).addTo(map);

          const enderecoStr =
            caso.agressorTrabalhoEndereco || "endereço não informado";

          marker.bindPopup(`
            <div style="font-family:system-ui,sans-serif;max-width:240px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#a3a3a3;flex-shrink:0;"></span>
                <span style="font-size:10px;color:#a3a3a3;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Trabalho do Agressor</span>
              </div>
              <div style="font-size:11px;color:#374151;">${enderecoStr}</div>
            </div>
          `);

          layerSet.trabalho = marker;
        }
      }

      // 4. Raio de restrição — Centro: local do fato (onde a vítima precisa de proteção)
      // Fallback para residência do agressor se local do fato não estiver disponível
      const centroLat = caso.localDoFatoLat ?? caso.agressorResidenciaLat;
      const centroLng = caso.localDoFatoLng ?? caso.agressorResidenciaLng;
      if (
        showRaioRestricao &&
        caso.raioRestricaoMetros &&
        centroLat &&
        centroLng
      ) {
        const lat = parseFloat(centroLat);
        const lng = parseFloat(centroLng);
        if (!isNaN(lat) && !isNaN(lng)) {
          const circle = L.circle([lat, lng], {
            radius: caso.raioRestricaoMetros,
            color: "#e11d48",
            fillColor: "#e11d48",
            fillOpacity: 0.06,
            weight: 1.5,
            dashArray: "6,4",
          }).addTo(map);

          circle.bindTooltip(`${caso.raioRestricaoMetros}m`, {
            permanent: true,
            direction: "center",
            className: "leaflet-vvd-raio-tooltip",
          });

          layerSet.raio = circle;
        }
      }

      layersRef.current.push(layerSet);
    }
  }, [
    casos,
    showLocalFato,
    showAgressorResidencia,
    showAgressorTrabalho,
    showRaioRestricao,
  ]);

  return (
    <div className="isolate h-full w-full">
      <style>{`
        .leaflet-vvd-raio-tooltip {
          background: transparent;
          border: none;
          box-shadow: none;
          font-size: 10px;
          font-weight: 600;
          color: #e11d48;
          padding: 0;
        }
        .leaflet-vvd-raio-tooltip::before {
          display: none;
        }
      `}</style>
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}
