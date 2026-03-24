"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// Pastel fills — synchronized with cadastro-mapa-leaflet.tsx
const ATRIBUICAO_COLORS: Record<string, string> = {
  JURI_CAMACARI:    "#4ade80",
  GRUPO_JURI:       "#86efac",
  VVD_CAMACARI:     "#fbbf24",
  EXECUCAO_PENAL:   "#60a5fa",
  SUBSTITUICAO:     "#fb923c",
  SUBSTITUICAO_CIVEL: "#a78bfa",
};

// Dark borders for chip dots
const ATRIBUICAO_BORDERS: Record<string, string> = {
  JURI_CAMACARI:    "#166534",
  GRUPO_JURI:       "#166534",
  VVD_CAMACARI:     "#78350f",
  EXECUCAO_PENAL:   "#1e3a8a",
  SUBSTITUICAO:     "#7c2d12",
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

// VVD usa losango no marcador — refletido na legenda da sidebar
const DIAMOND_ATRIBUICOES = new Set(["VVD_CAMACARI"]);
// Júri usa anel externo
const JURY_ATRIBUICOES = new Set(["JURI_CAMACARI", "GRUPO_JURI"]);

const ALL_ATRIBUICOES = Object.keys(ATRIBUICAO_COLORS);

const LeafletMap = dynamic(() => import("./cadastro-mapa-leaflet"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});

function loadPrefs() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("cadastro_map_prefs") || "{}");
  } catch {
    return {};
  }
}

function savePref(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    const current = loadPrefs();
    localStorage.setItem(
      "cadastro_map_prefs",
      JSON.stringify({ ...current, [key]: value })
    );
  } catch {}
}

function extractBairro(endereco: string | null): string | null {
  if (!endereco) return null;
  const parts = endereco.split(",").map((p) => p.trim());
  // Heurística: "Rua X, 123, Bairro, Cidade - UF"
  if (parts.length >= 3) return parts[2];
  if (parts.length >= 2) return parts[1];
  return null;
}

export function CadastroMapa() {
  const searchParams = useSearchParams();
  const focusedProcessoId = useMemo(() => {
    const raw = searchParams.get("processo");
    return raw ? parseInt(raw, 10) : null;
  }, [searchParams]);

  const [atribuicoesVisiveis, setAtribuicoesVisiveisState] = useState<string[]>(
    () => {
      const prefs = loadPrefs();
      return Array.isArray(prefs.atribuicoesVisiveis)
        ? prefs.atribuicoesVisiveis
        : ALL_ATRIBUICOES;
    }
  );
  const [showProcessos, setShowProcessosState] = useState<boolean>(() => {
    const prefs = loadPrefs();
    return prefs.showProcessos ?? true;
  });
  const [showHeatmap, setShowHeatmapState] = useState<boolean>(() => {
    const prefs = loadPrefs();
    return prefs.showHeatmap ?? false;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resetViewTrigger, setResetViewTrigger] = useState(0);

  const setAtribuicoesVisiveis = (val: string[]) => {
    setAtribuicoesVisiveisState(val);
    savePref("atribuicoesVisiveis", val);
  };

  const setShowProcessos = (val: boolean) => {
    setShowProcessosState(val);
    savePref("showProcessos", val);
  };

  const setShowHeatmap = (val: boolean) => {
    setShowHeatmapState(val);
    savePref("showHeatmap", val);
  };

  const { data, isLoading } = trpc.processos.mapa.useQuery({});

  const processosVisiveis = useMemo(() => {
    if (!data) return [];
    return data.filter((p) => {
      const key = p.atribuicao ?? "";
      if (atribuicoesVisiveis.length === 0) return true;
      return atribuicoesVisiveis.includes(key);
    });
  }, [data, atribuicoesVisiveis]);

  // Contagem por atribuição (dados completos, não filtrados)
  const contagens = useMemo(() => {
    if (!data) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    data.forEach((p) => {
      const key = p.atribuicao ?? "outros";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [data]);

  const totalComCoordenadas = data?.length ?? 0;

  // Top bairros extraídos do endereço
  const topBairros = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    data.forEach((p) => {
      const bairro = extractBairro(p.localDoFatoEndereco);
      if (!bairro) return;
      counts[bairro] = (counts[bairro] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [data]);

  // Isolation click: 1st click isolates; 2nd click on same restores all
  const toggleAtribuicao = (atribuicao: string) => {
    const isIsolated =
      atribuicoesVisiveis.length === 1 && atribuicoesVisiveis[0] === atribuicao;
    setAtribuicoesVisiveis(isIsolated ? ALL_ATRIBUICOES : [atribuicao]);
  };

  const sidebar = (
    <aside className="w-[280px] flex-shrink-0 flex flex-col border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setResetViewTrigger((v) => v + 1)}
            className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-all cursor-pointer"
            title="Centralizar em Camaçari"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-all cursor-pointer"
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
      <div className="px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
        {isLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {processosVisiveis.length}
            </span>{" "}
            processo{processosVisiveis.length !== 1 ? "s" : ""} visível
            {processosVisiveis.length !== 1 ? "s" : ""}
            {data && data.length !== processosVisiveis.length && (
              <span className="text-zinc-400 dark:text-zinc-500">
                {" "}
                de {data.length}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Distribuição por atribuição */}
      <div className="px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
          Distribuição
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {ALL_ATRIBUICOES.filter((a) => (contagens[a] ?? 0) > 0)
              .sort((a, b) => (contagens[b] ?? 0) - (contagens[a] ?? 0))
              .map((atribuicao) => {
                const count = contagens[atribuicao] ?? 0;
                const pct =
                  totalComCoordenadas > 0
                    ? Math.round((count / totalComCoordenadas) * 100)
                    : 0;
                const cor = ATRIBUICAO_COLORS[atribuicao] || "#71717a";
                const label = ATRIBUICAO_LABELS[atribuicao] || atribuicao;
                return (
                  <div key={atribuicao}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate flex-1 mr-2">
                        {label}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                        {count}{" "}
                        <span className="text-zinc-300 dark:text-zinc-600">
                          {pct}%
                        </span>
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: cor,
                          opacity: 0.85,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Top bairros */}
      {topBairros.length > 0 && (
        <div className="px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
            Top Bairros
          </p>
          <div className="space-y-1.5">
            {topBairros.map(([bairro, count], i) => (
              <div key={bairro} className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-300 dark:text-zinc-600 w-3 flex-shrink-0 text-right">
                  {i + 1}.
                </span>
                <span className="text-[11px] text-zinc-600 dark:text-zinc-400 flex-1 truncate">
                  {bairro}
                </span>
                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camadas */}
      <div className="px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
          Camadas
        </p>
        <button
          onClick={() => setShowProcessos(!showProcessos)}
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
          <div className="w-3 h-3 rounded-sm flex-shrink-0 bg-zinc-200 dark:bg-zinc-700" />
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
          {atribuicoesVisiveis.length !== ALL_ATRIBUICOES.length && (
            <button
              onClick={() => setAtribuicoesVisiveis(ALL_ATRIBUICOES)}
              className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer transition-colors"
            >
              Mostrar todos
            </button>
          )}
        </div>
        <div className="space-y-0.5">
          {ALL_ATRIBUICOES.map((atribuicao) => {
            const ativo = atribuicoesVisiveis.includes(atribuicao);
            const isIsolated = atribuicoesVisiveis.length === 1 && atribuicoesVisiveis[0] === atribuicao;
            const cor = ATRIBUICAO_COLORS[atribuicao] || "#71717a";
            const label = ATRIBUICAO_LABELS[atribuicao] || atribuicao;
            const count = contagens[atribuicao] ?? 0;
            const isDiamond = DIAMOND_ATRIBUICOES.has(atribuicao);
            const isJury = JURY_ATRIBUICOES.has(atribuicao);

            return (
              <button
                key={atribuicao}
                onClick={() => toggleAtribuicao(atribuicao)}
                title={isIsolated ? "Clique para mostrar todos" : `Clique para isolar: ${label}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer w-full text-left",
                  isIsolated
                    ? "ring-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    : ativo
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
                style={isIsolated ? { outlineColor: cor } : undefined}
              >
                {/* Ícone miniatura refletindo forma do marcador */}
                <div className="relative flex-shrink-0 w-4 h-4 flex items-center justify-center">
                  {isDiamond ? (
                    <div
                      className="w-3 h-3"
                      style={{
                        backgroundColor: ativo ? cor : "#d4d4d8",
                        border: `1.5px solid ${ativo ? (ATRIBUICAO_BORDERS[atribuicao] || "#52525b") : "#a1a1aa"}`,
                        transform: "rotate(45deg)",
                        borderRadius: "1px",
                      }}
                    />
                  ) : isJury ? (
                    <>
                      <div
                        className="absolute w-3.5 h-3.5 rounded-full"
                        style={{
                          border: `1px solid ${ativo ? cor : "#a1a1aa"}`,
                          opacity: 0.3,
                        }}
                      />
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: ativo ? cor : "#d4d4d8",
                          border: `1.5px solid ${ativo ? (ATRIBUICAO_BORDERS[atribuicao] || "#52525b") : "#a1a1aa"}`,
                        }}
                      />
                    </>
                  ) : (
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: ativo ? cor : "#d4d4d8",
                        border: `1.5px solid ${ativo ? (ATRIBUICAO_BORDERS[atribuicao] || "#52525b") : "#a1a1aa"}`,
                      }}
                    />
                  )}
                </div>
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
  );

  // Mini-stats chips (top 5 atribuições by count)
  const topAtribuicoes = useMemo(() => {
    return ALL_ATRIBUICOES
      .filter((a) => (contagens[a] ?? 0) > 0)
      .sort((a, b) => (contagens[b] ?? 0) - (contagens[a] ?? 0))
      .slice(0, 5)
      .map((a) => ({ atribuicao: a, count: contagens[a] ?? 0 }));
  }, [contagens]);

  const mapArea = (
    <div className="flex-1 min-w-0 h-full flex flex-col">
      {/* Mini-stats bar */}
      {topAtribuicoes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900">
          {topAtribuicoes.map(({ atribuicao: a, count }) => {
            const fill   = ATRIBUICAO_COLORS[a]  || "#a1a1aa";
            const border = ATRIBUICAO_BORDERS[a] || "#52525b";
            const label  = ATRIBUICAO_LABELS[a]  || a;
            const isDiamondA = DIAMOND_ATRIBUICOES.has(a);
            const isIsolated = atribuicoesVisiveis.length === 1 && atribuicoesVisiveis[0] === a;
            return (
              <button
                key={a}
                onClick={() => toggleAtribuicao(a)}
                title={isIsolated ? "Clique para mostrar todos" : `Filtrar: ${label}`}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-zinc-900 border shadow-sm cursor-pointer transition-all",
                  isIsolated
                    ? "border-zinc-400 dark:border-zinc-500 ring-1 ring-offset-1"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                )}
                style={isIsolated ? { outlineColor: fill } : undefined}
              >
                {isDiamondA ? (
                  <span
                    className="w-2 h-2 flex-shrink-0"
                    style={{ backgroundColor: fill, border: `1.5px solid ${border}`, borderRadius: "1px", transform: "rotate(45deg)", display: "inline-block" }}
                  />
                ) : (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: fill, border: `1.5px solid ${border}` }}
                  />
                )}
                <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
                <span className="text-zinc-400 font-normal">{count}</span>
              </button>
            );
          })}
          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            {processosVisiveis.length} visíveis
          </div>
          {/* Heatmap toggle */}
          <div className="ml-auto flex items-center gap-1.5">
            <Switch
              id="heatmap-toggle"
              checked={showHeatmap}
              onCheckedChange={setShowHeatmap}
              className="cursor-pointer h-4 w-7"
            />
            <Label htmlFor="heatmap-toggle" className="text-xs text-zinc-500 cursor-pointer">
              Heatmap
            </Label>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 min-h-0 relative">
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
                  O mapa será populado conforme processos com localização do fato
                  forem cadastrados.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <LeafletMap
            processos={processosVisiveis}
            showProcessos={showProcessos}
            showHeatmap={showHeatmap}
            focusedProcessoId={focusedProcessoId}
            resetViewTrigger={resetViewTrigger}
          />
        )}
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex bg-white dark:bg-zinc-900">
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
