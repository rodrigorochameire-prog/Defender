"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { DownloadCloud, RefreshCw, CheckSquare, Square } from "lucide-react";
import { GlassHeaderShell } from "@/components/layouts/header/glass-header-shell";
import { EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO } from "@/lib/config/design-tokens";
import { cn } from "@/lib/utils";
import {
  KpiChip,
  CarreiraCard,
  CarreiraListSkeleton,
} from "@/components/carreira";

// ----------- Decisão chip -----------------------------------------------------

type Decisao = "nova" | "ja_importada" | "atualizada";

const DECISAO_INFO: Record<Decisao, { label: string; cls: string }> = {
  nova: {
    label: "nova",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400",
  },
  atualizada: {
    label: "atualizada",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  ja_importada: {
    label: "já importada",
    cls: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  },
};

function DecisaoChip({ decisao }: { decisao: Decisao }) {
  const info = DECISAO_INFO[decisao] ?? DECISAO_INFO.nova;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
        info.cls
      )}
    >
      {info.label}
    </span>
  );
}

// ----------- Staging row type (from router) -----------------------------------

type StagingRow = {
  id: number;
  tipo: string;
  nSiga: string | null;
  numeroSolicitacao: string | null;
  payload: Record<string, unknown>;
  decisao: "nova" | "ja_importada" | "atualizada";
  matchedAusenciaId: number | null;
  importavel: boolean;
  selected: boolean;
};

// ----------- Grouped rows by tipo ---------------------------------------------

const TIPO_ORDER = ["licenca", "outra_ausencia", "ferias", "afastamento"];
const TIPO_LABEL: Record<string, string> = {
  licenca: "Licenças",
  outra_ausencia: "Outras ausências",
  ferias: "Férias",
  afastamento: "Afastamentos",
};

// ----------- View principal ---------------------------------------------------

export function SigaImportView() {
  const utils = trpc.useUtils();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState<{
    criadas: number;
    atualizadas: number;
    puladas: number;
  } | null>(null);

  const extrair = trpc.siga.extrair.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setImportResult(null);
      // Pre-select all importable rows that aren't "ja_importada" — handled after listStaging loads
    },
  });

  const staging = trpc.siga.listStaging.useQuery(
    { sessionId: sessionId ?? "" },
    { enabled: !!sessionId }
  );

  // Initialize selection when staging data first loads for a new sessionId
  const initializedSession = useRef<string | null>(null);
  useEffect(() => {
    if (
      staging.data &&
      sessionId &&
      initializedSession.current !== sessionId
    ) {
      initializedSession.current = sessionId;
      const rows = staging.data as StagingRow[];
      const initialSelected = new Set<number>(
        rows
          .filter((r) => r.importavel && r.decisao !== "ja_importada")
          .map((r) => r.id)
      );
      setSelected(initialSelected);
    }
  }, [staging.data, sessionId]);

  const confirmar = trpc.siga.confirmar.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      utils.siga.listStaging.invalidate({ sessionId: sessionId ?? "" });
    },
  });

  // Grouped rows
  const grouped = useMemo(() => {
    if (!staging.data) return [];
    const map = new Map<string, StagingRow[]>();
    for (const row of staging.data) {
      const list = map.get(row.tipo) ?? [];
      list.push(row as StagingRow);
      map.set(row.tipo, list);
    }
    return TIPO_ORDER.filter((t) => map.has(t)).map((t) => ({
      tipo: t,
      label: TIPO_LABEL[t] ?? t,
      rows: map.get(t)!,
    }));
  }, [staging.data]);

  // KPI counts
  const counts = useMemo(() => {
    const rows = (staging.data ?? []) as StagingRow[];
    return {
      total: rows.length,
      novas: rows.filter((r) => r.decisao === "nova").length,
      atualizadas: rows.filter((r) => r.decisao === "atualizada").length,
      jaImportadas: rows.filter((r) => r.decisao === "ja_importada").length,
    };
  }, [staging.data]);

  const handleToggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleImportar = () => {
    if (!sessionId) return;
    confirmar.mutate({
      sessionId,
      selectedIds: [...selected],
    });
  };

  const stats = sessionId ? (
    <div className="flex flex-wrap items-center gap-2">
      <KpiChip label="Total" value={counts.total} />
      <KpiChip label="Novas" value={counts.novas} />
      <KpiChip label="Atualizadas" value={counts.atualizadas} />
      <KpiChip label="Já importadas" value={counts.jaImportadas} />
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <GlassHeaderShell title="Importar SIGA" icon={DownloadCloud} stats={stats} />

      <div className="p-4 space-y-4">
        {/* Painel de controle */}
        <section className={cn(CARD_STYLE.base)}>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="space-y-1">
              <p className={cn(TYPO.caption)}>
                Sincronize as ausências registradas no SIGA com o OMBUDS.
              </p>
              {!sessionId && (
                <p className="text-[12px] text-muted-foreground">
                  Abra o SIGA no Chrome com depuração remota (porta 9222) e faça login antes de sincronizar.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={extrair.isPending}
                onClick={() => extrair.mutate()}
              >
                <RefreshCw className={cn("w-4 h-4 mr-1", extrair.isPending && "animate-spin")} />
                {extrair.isPending ? "Sincronizando…" : "Sincronizar com SIGA"}
              </Button>

              {sessionId && (
                <Button
                  size="sm"
                  disabled={selected.size === 0 || confirmar.isPending}
                  onClick={handleImportar}
                >
                  <DownloadCloud className="w-4 h-4 mr-1" />
                  {confirmar.isPending
                    ? "Importando…"
                    : `Importar selecionados (${selected.size})`}
                </Button>
              )}
            </div>
          </div>

          {extrair.error && (
            <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400">{extrair.error.message}</p>
          )}
          {confirmar.error && (
            <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400">{confirmar.error.message}</p>
          )}

          {importResult && (
            <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-[12px] text-emerald-800 dark:text-emerald-300">
              Importação concluída — {importResult.criadas} criadas,{" "}
              {importResult.atualizadas} atualizadas, {importResult.puladas} puladas.
            </div>
          )}
        </section>

        {/* Lista */}
        {!sessionId ? null : staging.isLoading ? (
          <CarreiraListSkeleton rows={3} />
        ) : staging.error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{staging.error.message}</p>
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={DownloadCloud}
            title="Nenhum dado encontrado no SIGA"
            description="Nenhuma licença, ausência, férias ou afastamento foi encontrado nesta sessão."
          />
        ) : (
          grouped.map(({ tipo, label, rows }) => (
            <section key={tipo} className={cn(CARD_STYLE.base, "space-y-3")}>
              <h2 className="text-sm font-semibold text-foreground">{label}</h2>

              <div className="space-y-2">
                {rows.map((row) => {
                  const payload = row.payload as Record<string, unknown>;
                  const dataInicio = payload.dataInicio as string | undefined;
                  const dataFim = payload.dataFim as string | undefined;
                  const motivo = payload.motivo as string | undefined;
                  const situacaoSiga = payload.situacaoSiga as string | undefined;

                  if (!row.importavel) {
                    // Férias / Afastamento: read-only
                    return (
                      <CarreiraCard key={row.id} accent="neutral" className="p-2 opacity-60">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="text-sm">
                              {dataInicio && dataFim ? `${dataInicio} – ${dataFim}` : "—"}
                              {motivo ? ` · ${motivo}` : ""}
                            </div>
                            {situacaoSiga && (
                              <div className={TYPO.caption}>SIGA: {situacaoSiga}</div>
                            )}
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                            importação v2
                          </span>
                        </div>
                      </CarreiraCard>
                    );
                  }

                  // Licença / Outra ausência: selectable via CarreiraCard
                  const isChecked = selected.has(row.id);
                  return (
                    <CarreiraCard
                      key={row.id}
                      selected={isChecked}
                      onClick={() => handleToggle(row.id)}
                      className="p-2"
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <button
                          type="button"
                          aria-label={isChecked ? "Desselecionar" : "Selecionar"}
                          className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(row.id);
                          }}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-sm">
                            {dataInicio && dataFim ? `${dataInicio} – ${dataFim}` : "—"}
                            {motivo ? ` · ${motivo}` : ""}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <DecisaoChip decisao={row.decisao} />

                            {row.nSiga && (
                              <span className="text-[11px] text-muted-foreground">
                                nSiga: {row.nSiga}
                              </span>
                            )}
                            {row.numeroSolicitacao && (
                              <span className="text-[11px] text-muted-foreground">
                                nº {row.numeroSolicitacao}
                              </span>
                            )}
                            {situacaoSiga && (
                              <span className="text-[11px] text-muted-foreground">
                                SIGA: {situacaoSiga}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CarreiraCard>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
