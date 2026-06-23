"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Reusa o MapaDosFatosLeaflet (cluster donut, tile switcher, popups) do mapa-dos-fatos.
const LeafletMap = dynamic(
  () => import("@/components/mapa-dos-fatos/mapa-dos-fatos-leaflet"),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

interface EnderecoPonto {
  lugarId: number;
  latitude: number;
  longitude: number;
  endereco: string | null;
  bairro: string | null;
  tipos: string[];
  processoIds: number[];
  count: number;
}

/**
 * Mapa de endereços da pessoa (residências geocodificadas) reusando o Leaflet do
 * mapa-dos-fatos. Some graciosamente quando não há nenhum endereço geocodificado.
 */
export function MapaCard({
  enderecos,
  isLoading,
}: {
  enderecos: EnderecoPonto[];
  isLoading: boolean;
}) {
  // Adapta para o shape `LugarPoint` esperado pelo Leaflet (acrescenta `atribuicoes`).
  const pontos = enderecos
    .filter((e) => !Number.isNaN(e.latitude) && !Number.isNaN(e.longitude))
    .map((e) => ({ ...e, atribuicoes: [] as string[] }));

  // Sem dados geocodificados → não renderiza o cartão (skip gracioso).
  if (!isLoading && pontos.length === 0) return null;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-neutral-400" />
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Endereços {!isLoading && <span className="text-neutral-400">({pontos.length})</span>}
        </h2>
      </div>

      <div className="h-72 w-full overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <LeafletMap pontos={pontos} />
        )}
      </div>
    </section>
  );
}
