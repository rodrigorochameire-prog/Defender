"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIPOS_LUGAR, TIPO_COR, TIPO_LABEL } from "@/components/mapa-dos-fatos/tipos-config";

// Atribuições — sincronizadas com o mapa de cadastro (processos.atribuicao).
const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Tribunal do Júri",
  GRUPO_JURI: "Grupo Especial do Júri",
  VVD_CAMACARI: "Violência Doméstica",
  EXECUCAO_PENAL: "Execução Penal",
  SUBSTITUICAO: "Substituição Criminal",
  SUBSTITUICAO_CIVEL: "Cível/Curadoria",
};

const ALL_ATRIBUICOES = Object.keys(ATRIBUICAO_LABELS);

const LeafletMap = dynamic(() => import("./mapa-dos-fatos-leaflet"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});

export function MapaDosFatos() {
  const [atribuicao, setAtribuicao] = useState<string | undefined>(undefined);
  const [showTipos, setShowTipos] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resetViewTrigger, setResetViewTrigger] = useState(0);

  const { data, isLoading } = trpc.lugares.mapDataByAtribuicao.useQuery({
    atribuicao,
    showTipos: showTipos.length > 0 ? showTipos : undefined,
  });

  const pontos = useMemo(() => data ?? [], [data]);

  // Contagem de lugares por tipo (sobre o conjunto retornado pela query)
  const contagemPorTipo = useMemo(() => {
    const counts: Record<string, number> = {};
    pontos.forEach((p) => {
      p.tipos.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }, [pontos]);

  const total = pontos.length;

  const toggleTipo = (tipo: string) => {
    setShowTipos((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
    );
  };

  const sidebar = (
    <aside className="hidden md:flex w-[280px] flex-shrink-0 flex-col border-r border-border bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
            <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Mapa dos Fatos
            </h2>
            <p className="text-xs text-muted-foreground">Camaçari, BA</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setResetViewTrigger((v) => v + 1)}
            className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            title="Centralizar em Camaçari"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Contagem total */}
      <div className="px-4 py-3 border-b border-border">
        {isLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{total}</span>{" "}
            lugar{total !== 1 ? "es" : ""} no mapa
          </p>
        )}
      </div>

      {/* Filtro por atribuição */}
      <div className="px-4 py-3 border-b border-border">
        <label
          htmlFor="mapa-fatos-atribuicao"
          className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2"
        >
          Atribuição
        </label>
        <select
          id="mapa-fatos-atribuicao"
          value={atribuicao ?? ""}
          onChange={(e) => setAtribuicao(e.target.value || undefined)}
          className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Todas</option>
          {ALL_ATRIBUICOES.map((a) => (
            <option key={a} value={a}>
              {ATRIBUICAO_LABELS[a]}
            </option>
          ))}
        </select>
      </div>

      {/* Filtros por tipo de lugar */}
      <div className="px-4 py-3 flex-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tipos de lugar
          </p>
          {showTipos.length > 0 && (
            <button
              onClick={() => setShowTipos([])}
              className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="space-y-0.5">
          {TIPOS_LUGAR.map((tipo) => {
            const ativo = showTipos.length === 0 || showTipos.includes(tipo);
            const cor = TIPO_COR[tipo];
            const label = TIPO_LABEL[tipo];
            const count = contagemPorTipo[tipo] ?? 0;
            return (
              <button
                key={tipo}
                onClick={() => toggleTipo(tipo)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer w-full text-left",
                  showTipos.includes(tipo)
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-black/10 dark:border-white/20"
                  style={{ backgroundColor: ativo ? cor : "#d4d4d4" }}
                />
                <span>{label}</span>
                {count > 0 && (
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );

  const mapArea = (
    <div className="flex-1 min-w-0 h-full flex flex-col">
      <div className="flex-1 min-h-0 relative">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center bg-muted/50">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <p className="text-xs text-muted-foreground">Carregando lugares...</p>
            </div>
          </div>
        ) : pontos.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center bg-muted/50">
            <div className="flex flex-col items-center gap-3 text-center max-w-xs">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                <MapPin className="h-6 w-6 text-neutral-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Nenhum lugar geocodificado ainda
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Rode o backfill/geocoding para popular o mapa dos fatos.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <LeafletMap pontos={pontos} resetViewTrigger={resetViewTrigger} />
        )}
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex bg-background">
        {sidebar}
        {mapArea}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {sidebar}
      {mapArea}
    </div>
  );
}
