"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const ATRIBUICAO_COLORS: Record<string, string> = {
  JURI_CAMACARI: "#16a34a",
  GRUPO_JURI: "#ea580c",
  VVD_CAMACARI: "#d97706",
  EP: "#2563eb",
  SUBSTITUICAO: "#e11d48",
  SUBSTITUICAO_CIVEL: "#7c3aed",
};

const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Tribunal do Júri",
  GRUPO_JURI: "Grupo Especial do Júri",
  VVD_CAMACARI: "Violência Doméstica",
  EP: "Execução Penal",
  SUBSTITUICAO: "Substituição Criminal",
  SUBSTITUICAO_CIVEL: "Cível/Curadoria",
};

const ALL_ATRIBUICOES = Object.keys(ATRIBUICAO_COLORS);

// Leaflet must be loaded client-side only
const LeafletMap = dynamic(() => import("./cadastro-mapa-leaflet"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});

export function CadastroMapa() {
  const [atribuicoesVisiveis, setAtribuicoesVisiveis] = useState<string[]>(ALL_ATRIBUICOES);
  const [showProcessos, setShowProcessos] = useState(true);

  const { data, isLoading } = trpc.processos.mapa.useQuery({});

  const processosVisiveis = useMemo(() => {
    if (!data) return [];
    return data.filter((p) => {
      const key = p.atribuicao ?? "";
      if (atribuicoesVisiveis.length === 0) return true;
      return atribuicoesVisiveis.includes(key);
    });
  }, [data, atribuicoesVisiveis]);

  const toggleAtribuicao = (atribuicao: string) => {
    setAtribuicoesVisiveis((prev) =>
      prev.includes(atribuicao)
        ? prev.filter((a) => a !== atribuicao)
        : [...prev, atribuicao]
    );
  };

  // Count by atribuicao for the sidebar
  const contagens = useMemo(() => {
    if (!data) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    data.forEach((p) => {
      const key = p.atribuicao ?? "outros";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [data]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Painel lateral esquerdo */}
      <aside className="w-[280px] flex-shrink-0 flex flex-col border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
            <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Mapa de Casos
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Camaçari, BA
            </p>
          </div>
        </div>

        {/* Contagem total */}
        <div className="px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {processosVisiveis.length}
              </span>{" "}
              processo{processosVisiveis.length !== 1 ? "s" : ""} visível{processosVisiveis.length !== 1 ? "s" : ""}
              {data && data.length !== processosVisiveis.length && (
                <span className="text-zinc-400 dark:text-zinc-500">
                  {" "}de {data.length}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Toggle processos */}
        <div className="px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
            Camadas
          </p>
          <button
            onClick={() => setShowProcessos((v) => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer w-full text-left",
              showProcessos
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                : "text-zinc-400 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            )}
          >
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: "#16a34a" }}
            />
            <span>Processos</span>
            {data && (
              <span className="ml-auto text-[10px] text-zinc-400 dark:text-zinc-500">
                {data.length}
              </span>
            )}
          </button>
          <button
            disabled
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all w-full text-left mt-1 text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
          >
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0 bg-zinc-200 dark:bg-zinc-700"
            />
            <span>Atendimentos</span>
            <span className="ml-auto text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 px-1 rounded">
              em breve
            </span>
          </button>
        </div>

        {/* Filtros por atribuição */}
        <div className="px-4 py-3 flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Atribuição
            </p>
            <button
              onClick={() =>
                setAtribuicoesVisiveis(
                  atribuicoesVisiveis.length === ALL_ATRIBUICOES.length
                    ? []
                    : ALL_ATRIBUICOES
                )
              }
              className="text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors"
            >
              {atribuicoesVisiveis.length === ALL_ATRIBUICOES.length ? "Limpar" : "Todos"}
            </button>
          </div>
          <div className="space-y-0.5">
            {ALL_ATRIBUICOES.map((atribuicao) => {
              const ativo = atribuicoesVisiveis.includes(atribuicao);
              const cor = ATRIBUICAO_COLORS[atribuicao] || "#71717a";
              const label = ATRIBUICAO_LABELS[atribuicao] || atribuicao;
              const count = contagens[atribuicao] ?? 0;

              return (
                <button
                  key={atribuicao}
                  onClick={() => toggleAtribuicao(atribuicao)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer w-full text-left",
                    ativo
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-400 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ativo ? cor : "#a1a1aa" }}
                  />
                  <span>{label}</span>
                  {count > 0 && (
                    <span className="ml-auto text-[10px] text-zinc-400 dark:text-zinc-500">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Mapa */}
      <div className="flex-1 min-w-0 h-full relative">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Carregando processos...
              </p>
            </div>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <div className="flex flex-col items-center gap-3 text-center max-w-xs">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <MapPin className="h-6 w-6 text-zinc-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Nenhum processo georreferenciado
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  O mapa será populado conforme processos com localização do fato forem cadastrados.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <LeafletMap
            processos={processosVisiveis}
            atribuicoesVisiveis={atribuicoesVisiveis}
            showProcessos={showProcessos}
          />
        )}
      </div>
    </div>
  );
}
