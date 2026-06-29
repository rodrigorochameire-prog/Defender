"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PJeAgendaImportModal } from "@/components/agenda/pje-agenda-import-modal";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
  Shield,
  Gavel,
  Check,
  CalendarDays,
  ClipboardPaste,
  Download,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface AtualizarPautaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Atribuicao = "VVD_CAMACARI" | "JURI_CAMACARI";
type Mode = "pje" | "texto";

// Unidades selecionáveis (cores funcionais Padrão Defender v5)
const UNIDADES: {
  value: Atribuicao;
  label: string;
  icon: typeof Shield;
  hex: string;
}[] = [
  { value: "VVD_CAMACARI", label: "VVD", icon: Shield, hex: "#f59e0b" }, // amber-500
  { value: "JURI_CAMACARI", label: "Júri/EP", icon: Gavel, hex: "#059669" }, // emerald-600
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// staging.data_audiencia = BRT naïve armazenada como "UTC" (getUTC* = BRT).
// Por isso lemos a hora/dia via getUTC* + timeZone:"UTC" para exibir o BRT real.
const horaDe = (d: Date) =>
  `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

const diaKey = (d: Date) => d.toISOString().slice(0, 10);

const diaLabel = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  })
    .format(d)
    .replace(/\.$/, "");

// Cor funcional da atribuição derivada do texto do preview.
function corAtribuicao(atribuicao: string | null): string {
  const a = (atribuicao ?? "").toLowerCase();
  if (a.includes("viol") || a.includes("vvd")) return "#f59e0b"; // amber
  if (a.includes("júri") || a.includes("juri") || a.includes("exec")) return "#059669"; // emerald
  return "#a3a3a3"; // neutral
}

// Estilo do badge de situação.
function situacaoBadge(situacao: string | null): {
  label: string;
  className: string;
} {
  const s = (situacao ?? "designada").toLowerCase();
  if (s.includes("redesign"))
    return {
      label: "redesignada",
      className:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    };
  if (s.includes("cancel") || s.includes("não") || s.includes("nao"))
    return {
      label: s.includes("cancel") ? "cancelada" : "não realizada",
      className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    };
  return {
    label: s || "designada",
    className:
      "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  };
}

// Sigla curta do tipo a partir do título ("AIJ - Fulano - 000…") → "AIJ".
const siglaTipo = (titulo: string | null) =>
  (titulo ?? "").split(" - ")[0]?.trim() || "AUD";

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function AtualizarPautaModal({ isOpen, onClose }: AtualizarPautaModalProps) {
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<Mode>("pje");

  // Unidades — ambas selecionadas por padrão
  const [unidades, setUnidades] = useState<Set<Atribuicao>>(
    () => new Set<Atribuicao>(["VVD_CAMACARI", "JURI_CAMACARI"]),
  );

  // Período — De = hoje, Até = hoje + 60 dias
  const [since, setSince] = useState(() => toISODate(new Date()));
  const [until, setUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return toISODate(d);
  });

  // Job em andamento
  const [jobId, setJobId] = useState<number | null>(null);

  // Seleção local das linhas (id → bool). Inicializada quando o job completa.
  const [selection, setSelection] = useState<Record<number, boolean>>({});
  const initializedJobRef = useRef<number | null>(null);

  // Reset ao fechar
  useEffect(() => {
    if (!isOpen) {
      setMode("pje");
      setJobId(null);
      setSelection({});
      initializedJobRef.current = null;
    }
  }, [isOpen]);

  // -------------------------------------------------------------------------
  // tRPC
  // -------------------------------------------------------------------------
  const criarImportJob = trpc.pauta.criarImportJob.useMutation({
    onSuccess: (r) => {
      setJobId(r.taskId);
      initializedJobRef.current = null;
      setSelection({});
    },
    onError: (e) => toast.error("Falha ao iniciar a atualização", { description: e.message }),
  });

  const staging = trpc.pauta.listStaging.useQuery(
    { jobId: jobId ?? 0 },
    {
      enabled: jobId != null,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "pending" || status === "processing" ? 2500 : false;
      },
    },
  );

  const confirmarImport = trpc.pauta.confirmarImport.useMutation({
    onSuccess: (r) => {
      toast.success(
        `${r.importadas} importadas · ${r.atualizadas} atualizadas · ${r.reconciliadas} reconciliadas`,
      );
      utils.audiencias.list.invalidate();
      utils.audiencias.proximas.invalidate();
      utils.calendar.list.invalidate();
      onClose();
    },
    onError: (e) => toast.error("Falha ao importar", { description: e.message }),
  });

  // -------------------------------------------------------------------------
  // Derivados
  // -------------------------------------------------------------------------
  const status = staging.data?.status;
  const isRunning = status === "pending" || status === "processing";
  const isCompleted = status === "completed";
  const rows = staging.data?.rows ?? [];
  const reconciliarPrevisto = staging.data?.reconciliarPrevisto ?? 0;

  // Inicializa a seleção (tudo marcado por padrão) na primeira vez que o job completa.
  useEffect(() => {
    if (isCompleted && jobId != null && initializedJobRef.current !== jobId) {
      const next: Record<number, boolean> = {};
      for (const r of rows) next[r.id] = r.selected;
      setSelection(next);
      initializedJobRef.current = jobId;
    }
  }, [isCompleted, jobId, rows]);

  const isSelected = (id: number) => selection[id] ?? true;
  const selectedIds = rows.filter((r) => isSelected(r.id)).map((r) => r.id);

  const toggleRow = (id: number) =>
    setSelection((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));

  // Agrupamento por dia (ascendente = mais próximo primeiro)
  const grupos = useMemo(() => {
    const map = new Map<string, { date: Date; rows: typeof rows }>();
    for (const r of rows) {
      if (!r.dataAudiencia) continue;
      const d = new Date(r.dataAudiencia);
      if (Number.isNaN(d.getTime())) continue;
      const key = diaKey(d);
      if (!map.has(key)) map.set(key, { date: d, rows: [] });
      map.get(key)!.rows.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, g]) => ({ key, date: g.date, rows: g.rows }));
  }, [rows]);

  const toggleUnidade = (u: Atribuicao) =>
    setUnidades((prev) => {
      const next = new Set(prev);
      if (next.has(u)) next.delete(u);
      else next.add(u);
      return next;
    });

  const handleAtualizar = () => {
    if (unidades.size === 0) {
      toast.warning("Selecione ao menos uma unidade");
      return;
    }
    criarImportJob.mutate({ atribuicoes: Array.from(unidades), since, until });
  };

  // -------------------------------------------------------------------------
  // Modo "Colar texto" → delega ao fluxo manual existente (reuso do parser)
  // -------------------------------------------------------------------------
  const importBatch = trpc.audiencias.importBatch.useMutation({
    onSuccess: (result) => {
      toast.success(
        `${result.importados} importadas · ${result.atualizados} atualizadas`,
      );
      utils.audiencias.list.invalidate();
      utils.audiencias.proximas.invalidate();
      utils.calendar.list.invalidate();
    },
    onError: (e) => toast.error("Falha ao importar", { description: e.message }),
  });

  const handleTextoImport = async (eventos: any[]) => {
    if (eventos.length === 0) {
      toast.warning("Nenhum evento para importar.");
      return;
    }
    await importBatch.mutateAsync({ eventos });
  };

  // Em modo "texto", entregamos o fluxo manual já pronto (Dialog próprio).
  if (isOpen && mode === "texto") {
    return (
      <PJeAgendaImportModal
        isOpen
        onClose={onClose}
        onImport={handleTextoImport}
        title="Atualizar pauta — colar texto"
        description="Cole o texto da pauta de audiências do PJe. Para puxar automaticamente, feche e use o modo 'Do PJe'."
      />
    );
  }

  // -------------------------------------------------------------------------
  // Render (modo automático)
  // -------------------------------------------------------------------------
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-neutral-900 p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-neutral-200/60 dark:border-neutral-800">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
            <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </span>
            Atualizar pauta
          </DialogTitle>
          <DialogDescription className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Puxe a pauta de audiências direto do PJe ou cole o texto manualmente.
          </DialogDescription>
        </DialogHeader>

        {/* Segmented control monocromático */}
        <div className="px-5 pt-4">
          <div className="inline-flex p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 gap-0.5">
            {(
              [
                { value: "pje", label: "Do PJe (automático)", icon: Download },
                { value: "texto", label: "Colar texto", icon: ClipboardPaste },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = mode === opt.value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 cursor-pointer",
                    active
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 shadow-sm shadow-black/[0.06]"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Corpo rolável */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {/* Configuração (sempre visível até começar a rodar) */}
          {!isRunning && !isCompleted && (
            <div className="space-y-4">
              {/* Unidades */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  Unidades
                </p>
                <div className="flex flex-wrap gap-2">
                  {UNIDADES.map((u) => {
                    const Icon = u.icon;
                    const active = unidades.has(u.value);
                    return (
                      <button
                        type="button"
                        key={u.value}
                        onClick={() => toggleUnidade(u.value)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-150 cursor-pointer",
                          active
                            ? "text-white border-transparent shadow-sm"
                            : "bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border-neutral-200/80 dark:border-neutral-700 hover:border-neutral-300",
                        )}
                        style={active ? { backgroundColor: u.hex } : undefined}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {u.label}
                        {active && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Período */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  Período
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-neutral-400">De</span>
                    <input
                      type="date"
                      value={since}
                      onChange={(e) => setSince(e.target.value)}
                      className="h-9 px-3 text-[12px] tabular-nums bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-neutral-400">Até</span>
                    <input
                      type="date"
                      value={until}
                      onChange={(e) => setUntil(e.target.value)}
                      className="h-9 px-3 text-[12px] tabular-nums bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                    />
                  </label>
                  <span className="text-[10px] text-neutral-400 pb-2.5 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    próximos 60 dias
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Estado: rodando */}
          {isRunning && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-800">
              <Loader2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-spin shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-neutral-700 dark:text-neutral-200">
                  Raspando a pauta…
                </p>
                <p className="text-[11px] text-neutral-400">
                  {staging.data?.etapa || "Conectando ao PJe e coletando as audiências"}
                </p>
              </div>
            </div>
          )}

          {/* Estado: falhou */}
          {status === "failed" && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-[13px] text-red-700 dark:text-red-300">
                A atualização falhou. Tente novamente ou use o modo &ldquo;Colar texto&rdquo;.
              </p>
            </div>
          )}

          {/* Preview */}
          {isCompleted && (
            <div className="space-y-3">
              {/* Stats */}
              <div className="flex items-center gap-1.5 text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                  {rows.length}
                </span>
                encontradas
                <span className="text-neutral-300 dark:text-neutral-600">·</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {selectedIds.length}
                </span>
                selecionadas
                {reconciliarPrevisto > 0 && (
                  <>
                    <span className="text-neutral-300 dark:text-neutral-600">·</span>
                    <span className="text-amber-600 dark:text-amber-400">
                      reconciliar: {reconciliarPrevisto}
                    </span>
                  </>
                )}
              </div>

              {/* Callout reconciliação */}
              {reconciliarPrevisto > 0 && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
                    {reconciliarPrevisto} audiência(s) serão marcadas como{" "}
                    <strong>redesignada</strong> (slot antigo superado pela nova pauta).
                  </p>
                </div>
              )}

              {/* Lista agrupada por dia */}
              {rows.length === 0 ? (
                <div className="py-10 text-center text-[12px] text-neutral-400">
                  Nenhuma audiência encontrada no período.
                </div>
              ) : (
                <div className="space-y-4">
                  {grupos.map((g) => (
                    <div key={g.key} className="space-y-1.5">
                      {/* Divisor de dia */}
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex-1 h-px bg-neutral-200/70 dark:bg-neutral-800" />
                        <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 tabular-nums">
                          {diaLabel(g.date)}
                        </span>
                        <div className="flex-1 h-px bg-neutral-200/70 dark:bg-neutral-800" />
                      </div>

                      {/* Cards do dia */}
                      {g.rows.map((r) => {
                        const d = new Date(r.dataAudiencia!);
                        const cor = corAtribuicao(r.atribuicao);
                        const sit = situacaoBadge(r.situacao);
                        const checked = isSelected(r.id);
                        return (
                          <div
                            key={r.id}
                            className="flex items-stretch gap-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 shadow-sm shadow-black/[0.04] overflow-hidden"
                          >
                            {/* Barra lateral da atribuição */}
                            <div
                              className="w-1 shrink-0"
                              style={{ backgroundColor: cor }}
                            />

                            {/* Checkbox */}
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={checked}
                              onClick={() => toggleRow(r.id)}
                              className={cn(
                                "my-auto ml-1 w-4 h-4 rounded border flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0",
                                checked
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 hover:border-emerald-400",
                              )}
                              aria-label={r.assistido || r.processoNumero || "Audiência"}
                            >
                              {checked && <Check className="w-3 h-3" />}
                            </button>

                            {/* Conteúdo */}
                            <div className="flex-1 min-w-0 py-2 pr-3 space-y-0.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[12px] font-medium text-neutral-700 dark:text-neutral-200 tabular-nums shrink-0">
                                  {horaDe(d)}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 shrink-0">
                                  {siglaTipo(r.titulo)}
                                </span>
                                <span className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                                  {r.assistido || "Sem assistido"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[11px] text-neutral-400 truncate">
                                  {r.processoNumero || "—"}
                                </span>
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
                                    sit.className,
                                  )}
                                >
                                  {sit.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-neutral-200/60 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-150 cursor-pointer"
          >
            Cancelar
          </button>

          {isCompleted ? (
            <button
              type="button"
              onClick={() =>
                jobId != null &&
                confirmarImport.mutate({ jobId, selectedIds })
              }
              disabled={selectedIds.length === 0 || confirmarImport.isPending}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
            >
              {confirmarImport.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Importar {selectedIds.length} selecionadas
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAtualizar}
              disabled={isRunning || criarImportJob.isPending}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
            >
              {isRunning || criarImportJob.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Atualizar
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
