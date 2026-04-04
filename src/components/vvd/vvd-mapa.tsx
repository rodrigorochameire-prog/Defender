"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// Leaflet must be loaded client-side only
const LeafletMap = dynamic(() => import("./vvd-mapa-leaflet"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});

type FiltroMpu = "todas" | "ativas" | "sem_mpu";

function StatusBadge({ status }: { status: string | null }) {
  if (status === "ativa") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
        Ativa
      </span>
    );
  }
  if (status === "inativa") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600 dark:bg-muted dark:text-muted-foreground">
        Inativa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
      Sem MPU
    </span>
  );
}

function LayerToggle({
  label,
  active,
  onToggle,
  dotColor,
  dotVariant = "circle",
  count,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  dotColor: string;
  dotVariant?: "circle" | "ring";
  count?: number;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer w-full text-left",
        active
          ? "bg-neutral-100 dark:bg-muted text-neutral-900 dark:text-foreground"
          : "text-neutral-400 dark:text-muted-foreground hover:bg-neutral-50 dark:hover:bg-muted/50"
      )}
    >
      {dotVariant === "ring" ? (
        <span
          className="w-3 h-3 rounded-full flex-shrink-0 border-2"
          style={{ borderColor: active ? dotColor : "#a1a1aa", background: "transparent" }}
        />
      ) : (
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: active ? dotColor : "#a1a1aa" }}
        />
      )}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto text-[10px] text-neutral-400 dark:text-muted-foreground">
          {count}
        </span>
      )}
    </button>
  );
}

export function VvdMapa() {
  const [showLocalFato, setShowLocalFato] = useState(true);
  const [showAgressorResidencia, setShowAgressorResidencia] = useState(true);
  const [showAgressorTrabalho, setShowAgressorTrabalho] = useState(true);
  const [showRaioRestricao, setShowRaioRestricao] = useState(true);
  const [filtroMpu, setFiltroMpu] = useState<FiltroMpu>("todas");

  const { data, isLoading } = trpc.vvd.mapa.useQuery();

  const casosVisiveis = useMemo(() => {
    if (!data) return [];
    if (filtroMpu === "todas") return data;
    if (filtroMpu === "ativas") return data.filter((c) => c.statusMpu === "ativa");
    if (filtroMpu === "sem_mpu") return data.filter((c) => c.statusMpu === null);
    return data;
  }, [data, filtroMpu]);

  const contagemComLocalizacao = useMemo(() => {
    return casosVisiveis.filter(
      (c) =>
        c.localDoFatoLat ||
        c.agressorResidenciaLat ||
        c.agressorTrabalhoLat
    ).length;
  }, [casosVisiveis]);

  const contagemLocalFato = useMemo(
    () => (data ? data.filter((c) => c.localDoFatoLat).length : 0),
    [data]
  );
  const contagemResidencia = useMemo(
    () => (data ? data.filter((c) => c.agressorResidenciaLat).length : 0),
    [data]
  );
  const contagemTrabalho = useMemo(
    () => (data ? data.filter((c) => c.agressorTrabalhoLat).length : 0),
    [data]
  );
  const contagemRaio = useMemo(
    () =>
      data
        ? data.filter((c) => c.raioRestricaoMetros && c.agressorResidenciaLat).length
        : 0,
    [data]
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Painel lateral esquerdo */}
      <aside className="hidden md:flex w-[280px] flex-shrink-0 flex-col border-r border-neutral-200/80 dark:border-border/80 bg-white dark:bg-card overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-neutral-200/80 dark:border-border/80">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40">
            <Shield className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-foreground">
              Mapa VVD — MPU
            </h2>
            <p className="text-xs text-neutral-500 dark:text-muted-foreground">
              Camaçari, BA
            </p>
          </div>
        </div>

        {/* Contagem */}
        <div className="px-4 py-3 border-b border-neutral-200/80 dark:border-border/80">
          {isLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <p className="text-xs text-neutral-500 dark:text-muted-foreground">
              <span className="font-semibold text-neutral-900 dark:text-foreground">
                {contagemComLocalizacao}
              </span>{" "}
              caso{contagemComLocalizacao !== 1 ? "s" : ""} com localização
            </p>
          )}
        </div>

        {/* Camadas */}
        <div className="px-4 py-3 border-b border-neutral-200/80 dark:border-border/80">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-muted-foreground mb-2">
            Camadas
          </p>
          <div className="space-y-0.5">
            <LayerToggle
              label="Local do Fato"
              active={showLocalFato}
              onToggle={() => setShowLocalFato((v) => !v)}
              dotColor="#e11d48"
              count={contagemLocalFato}
            />
            <LayerToggle
              label="Residência do Agressor"
              active={showAgressorResidencia}
              onToggle={() => setShowAgressorResidencia((v) => !v)}
              dotColor="#71717a"
              count={contagemResidencia}
            />
            <LayerToggle
              label="Trabalho do Agressor"
              active={showAgressorTrabalho}
              onToggle={() => setShowAgressorTrabalho((v) => !v)}
              dotColor="#a1a1aa"
              count={contagemTrabalho}
            />
            <LayerToggle
              label="Raio de Restrição"
              active={showRaioRestricao}
              onToggle={() => setShowRaioRestricao((v) => !v)}
              dotColor="#e11d48"
              dotVariant="ring"
              count={contagemRaio}
            />
          </div>
        </div>

        {/* Filtro por status MPU */}
        <div className="px-4 py-3 border-b border-neutral-200/80 dark:border-border/80">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-muted-foreground mb-2">
            Status MPU
          </p>
          <div className="flex gap-1">
            {(
              [
                { key: "todas", label: "Todas" },
                { key: "ativas", label: "Ativas" },
                { key: "sem_mpu", label: "Sem MPU" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFiltroMpu(key)}
                className={cn(
                  "flex-1 px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer",
                  filtroMpu === key
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de casos */}
        <div className="px-4 py-3 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-muted-foreground mb-2">
            Casos ({casosVisiveis.length})
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : casosVisiveis.length === 0 ? (
            <p className="text-xs text-neutral-400 dark:text-muted-foreground">
              {data && data.length > 0
                ? "Nenhum caso para este filtro."
                : "Nenhum caso encontrado"}
            </p>
          ) : (
            <div className="space-y-1">
              {casosVisiveis.map((caso) => (
                <div
                  key={caso.id}
                  className="px-3 py-2 rounded-lg bg-neutral-50 dark:bg-muted/50 border border-neutral-100 dark:border-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-neutral-900 dark:text-foreground leading-tight">
                      {caso.assistidoNome || "—"}
                    </span>
                    <StatusBadge status={caso.statusMpu} />
                  </div>
                  {caso.processoNumero && (
                    <span className="text-[10px] font-mono text-neutral-400 dark:text-muted-foreground">
                      {caso.processoNumero}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Mapa */}
      <div className="flex-1 min-w-0 h-full relative">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center bg-neutral-50 dark:bg-background">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
              <p className="text-xs text-neutral-500 dark:text-muted-foreground">
                Carregando casos...
              </p>
            </div>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center bg-neutral-50 dark:bg-background">
            <div className="flex flex-col items-center gap-3 text-center max-w-xs">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-muted">
                <MapPin className="h-6 w-6 text-neutral-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-900 dark:text-foreground">
                  Nenhum caso georreferenciado
                </h3>
                <p className="text-xs text-neutral-500 dark:text-muted-foreground mt-1">
                  O mapa será populado conforme casos com localização do agressor forem cadastrados.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <LeafletMap
            casos={casosVisiveis}
            showLocalFato={showLocalFato}
            showAgressorResidencia={showAgressorResidencia}
            showAgressorTrabalho={showAgressorTrabalho}
            showRaioRestricao={showRaioRestricao}
          />
        )}
      </div>
    </div>
  );
}
