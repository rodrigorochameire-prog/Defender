"use client";

import { useState, useMemo } from "react";
import { format, differenceInMonths, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  AlertCircle,
  Phone,
  Copy,
  Check,
  Plus,
  ChevronUp,
  ChevronDown,
  Scale,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Types derived from the tRPC getById return shape ──────────────────────

interface Audiencia {
  id: number;
  dataAudiencia: Date | string | null;
  tipo: string | null;
  local: string | null;
  status: string | null;
}

interface Demanda {
  id: number;
  ato: string | null;
  tipoAto: string | null;
  status: string | null;
  prazo: Date | string | null;
  processoId: number | null;
  defensorId: number | string | null;
  defensorNome: string | null;
}

interface Processo {
  id: number;
  numeroAutos: string | null;
  vara: string | null;
  assunto: string | null;
  fase: string | null;
  situacao: string | null;
  papel: string | null;
}

interface AssistidoData {
  id: number;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  statusPrisional: string | null;
  dataPrisao: string | Date | null;
  unidadePrisional: string | null;
  audiencias: Audiencia[];
  demandas: Demanda[];
  processos: Processo[];
}

interface AssistidoOverviewPanelProps {
  data: AssistidoData;
  onProcessoClick: (processoId: number) => void;
  onDemandaClick: (demandaId: number) => void;
}

// ─── Priority order for demandas ───────────────────────────────────────────
const DEMANDA_PRIORITY: Record<string, number> = {
  "1_URGENTE": 1,
  "2_VENCER": 2,
  "3_PROXIMO": 3,
  "5_FILA": 4,
  "4_REVISAO": 5,
  "6_REVISAO_FINAL": 6,
};

const EXCLUDED_STATUSES = new Set(["7_CONCLUIDO", "8_ARQUIVADO", "CONCLUIDO"]);

const PRESOS = new Set(["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"]);

// ─── CopyButton helper ──────────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(value).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }).catch(() => {});
    } catch {}
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 p-0.5 text-zinc-400 hover:text-emerald-600 transition-colors"
      title="Copiar"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export function AssistidoOverviewPanel({
  data,
  onProcessoClick,
  onDemandaClick,
}: AssistidoOverviewPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  // ── Card 1: Próxima Audiência ────────────────────────────────────────────
  const now = useMemo(() => new Date(), []);
  const proximaAudiencia = useMemo(
    () =>
      data.audiencias
        .filter((a) => {
          if (!a.dataAudiencia) return false;
          return new Date(a.dataAudiencia) > now;
        })
        .sort((a, b) => {
          const da = new Date(a.dataAudiencia!).getTime();
          const db = new Date(b.dataAudiencia!).getTime();
          return da - db;
        })[0] ?? null,
    [data.audiencias, now],
  );

  const diasAteAudiencia = proximaAudiencia?.dataAudiencia
    ? differenceInDays(new Date(proximaAudiencia.dataAudiencia), now)
    : null;

  // ── Card 2: Demanda Crítica ──────────────────────────────────────────────
  const demandaCritica = useMemo(
    () =>
      data.demandas
        .filter((d) => d.status && !EXCLUDED_STATUSES.has(d.status))
        .sort((a, b) => {
          const pa = DEMANDA_PRIORITY[a.status ?? ""] ?? 99;
          const pb = DEMANDA_PRIORITY[b.status ?? ""] ?? 99;
          return pa - pb;
        })[0] ?? null,
    [data.demandas],
  );

  const isDemandaUrgente =
    demandaCritica?.status === "1_URGENTE" ||
    (demandaCritica?.prazo != null && new Date(demandaCritica.prazo) < now);
  const isDemandaVencer = demandaCritica?.status === "2_VENCER";

  // ── Card 3: Dados rápidos / preso ───────────────────────────────────────
  const isPreso = data.statusPrisional
    ? PRESOS.has(data.statusPrisional)
    : false;

  const tempoPreso = useMemo<string | null>(() => {
    if (!isPreso || !data.dataPrisao) return null;
    const prisaoDate =
      typeof data.dataPrisao === "string"
        ? parseISO(data.dataPrisao)
        : data.dataPrisao;
    const meses = differenceInMonths(now, prisaoDate);
    if (meses >= 1) {
      return `${meses} ${meses === 1 ? "mês" : "meses"} preso`;
    }
    const dias = differenceInDays(now, prisaoDate);
    return `${dias} ${dias === 1 ? "dia" : "dias"} preso`;
  }, [data.dataPrisao, isPreso, now]);

  // ── Card 4: Processos ────────────────────────────────────────────────────
  const processosVisiveis = data.processos.slice(0, 3);
  const processosExtras = data.processos.length - processosVisiveis.length;

  return (
    <div className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
      {/* Toggle row */}
      <div className="px-6 lg:px-8 pt-3 pb-1.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500">
          Visão Geral
        </span>
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-controls="assistido-overview-content"
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          {collapsed ? (
            <>
              Expandir <ChevronDown className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Recolher <ChevronUp className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {!collapsed && (
        <div id="assistido-overview-content" className="px-6 lg:px-8 pb-4">
          {/* ── Hero cards: Audiência + Demanda (2 cols) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Próxima Audiência */}
            <div
              className={cn(
                "rounded-xl border p-4 transition-all",
                proximaAudiencia
                  ? "bg-white dark:bg-zinc-800/40 border-emerald-200 dark:border-emerald-700/40 hover:border-emerald-300 dark:hover:border-emerald-600/50"
                  : "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/80 dark:border-amber-800/30",
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  proximaAudiencia
                    ? "bg-emerald-100 dark:bg-emerald-900/30"
                    : "bg-amber-100 dark:bg-amber-900/30"
                )}>
                  <Calendar
                    className={cn(
                      "h-4 w-4",
                      proximaAudiencia
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400",
                    )}
                  />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Próxima Audiência
                </span>
              </div>

              {proximaAudiencia ? (
                <div className="space-y-1">
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {format(new Date(proximaAudiencia.dataAudiencia!), "dd 'de' MMM · HH'h'mm", {
                      locale: ptBR,
                    })}
                  </p>
                  {diasAteAudiencia !== null && (
                    <p className={cn(
                      "text-xs font-medium",
                      diasAteAudiencia <= 3 ? "text-rose-600 dark:text-rose-400"
                        : diasAteAudiencia <= 7 ? "text-amber-600 dark:text-amber-400"
                        : "text-zinc-500"
                    )}>
                      {diasAteAudiencia === 0 ? "Hoje" : diasAteAudiencia === 1 ? "Amanhã" : `Em ${diasAteAudiencia} dias`}
                    </p>
                  )}
                  {proximaAudiencia.tipo && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {proximaAudiencia.tipo}
                    </p>
                  )}
                  {proximaAudiencia.local && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {proximaAudiencia.local}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Sem audiência agendada
                    </p>
                  </div>
                  <Link
                    href={`/admin/agenda?assistidoId=${data.id}`}
                    className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 hover:underline transition-colors font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agendar audiência
                  </Link>
                </div>
              )}
            </div>

            {/* Card 2: Demanda Crítica */}
            <div
              className={cn(
                "rounded-xl border p-4 transition-all",
                isDemandaUrgente
                  ? "bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-800/30"
                  : isDemandaVencer
                  ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/80 dark:border-amber-800/30"
                  : "bg-white dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/40",
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  isDemandaUrgente
                    ? "bg-rose-100 dark:bg-rose-900/30"
                    : isDemandaVencer
                    ? "bg-amber-100 dark:bg-amber-900/30"
                    : "bg-zinc-100 dark:bg-zinc-800"
                )}>
                  <AlertCircle
                    className={cn(
                      "h-4 w-4",
                      isDemandaUrgente
                        ? "text-rose-600 dark:text-rose-400"
                        : isDemandaVencer
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-zinc-400",
                    )}
                  />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Demanda Crítica
                </span>
                {demandaCritica && (
                  <span
                    className={cn(
                      "ml-auto text-[10px] px-2 py-0.5 rounded-md font-medium",
                      isDemandaUrgente
                        ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                        : isDemandaVencer
                        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                        : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300",
                    )}
                  >
                    {demandaCritica.status?.replace(/^\d+_/, "") ?? "—"}
                  </span>
                )}
              </div>

              {demandaCritica ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {demandaCritica.ato ?? demandaCritica.tipoAto ?? "Demanda"}
                  </p>
                  {demandaCritica.prazo && (
                    <p
                      className={cn(
                        "text-xs",
                        isDemandaUrgente
                          ? "text-rose-600 dark:text-rose-400 font-semibold"
                          : "text-zinc-500",
                      )}
                    >
                      Prazo:{" "}
                      {format(new Date(demandaCritica.prazo), "dd 'de' MMM", { locale: ptBR })}
                    </p>
                  )}
                  <button
                    onClick={() => onDemandaClick(demandaCritica.id)}
                    aria-label={`Ver demanda: ${demandaCritica.ato ?? demandaCritica.tipoAto ?? "demanda"}`}
                    className={cn(
                      "text-xs font-medium hover:underline transition-colors",
                      isDemandaUrgente
                        ? "text-rose-700 dark:text-rose-400"
                        : isDemandaVencer
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-emerald-700 dark:text-emerald-400",
                    )}
                  >
                    ver demanda →
                  </button>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                  Nenhuma demanda urgente
                </p>
              )}
            </div>
          </div>

          {/* ── Secondary row: Dados Rápidos + Processos ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* Card 3: Dados Rápidos (only if meaningful) */}
            {(data.telefone || data.cpf || isPreso) && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/40 bg-white dark:bg-zinc-800/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Dados Rápidos
                  </span>
                </div>

                <div className="space-y-2.5">
                  {data.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-zinc-400 shrink-0" />
                      <a
                        href={`tel:${data.telefone}`}
                        className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline transition-colors"
                      >
                        {data.telefone}
                      </a>
                      <CopyButton value={data.telefone} />
                    </div>
                  )}

                  {data.cpf && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                        CPF {data.cpf}
                      </span>
                      <CopyButton value={data.cpf} />
                    </div>
                  )}

                  {isPreso && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-700/50 space-y-1">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-rose-500 shrink-0" />
                        {tempoPreso && (
                          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                            {tempoPreso}
                          </p>
                        )}
                      </div>
                      {data.unidadePrisional && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 pl-6">
                          {data.unidadePrisional}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Card 4: Processos */}
            {data.processos.length > 0 && (
              <div className={cn(
                "rounded-xl border border-zinc-200 dark:border-zinc-700/40 bg-white dark:bg-zinc-800/40 p-4",
                !data.telefone && !data.cpf && !isPreso && "sm:col-span-2"
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="h-4 w-4 text-zinc-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Processos
                  </span>
                  <span className="ml-auto text-xs text-zinc-400">
                    {data.processos.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {processosVisiveis.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onProcessoClick(p.id)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700/40 transition-colors group"
                    >
                      <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 shrink-0">
                        {p.numeroAutos ?? "Sem número"}
                      </span>
                      {p.assunto && (
                        <>
                          <span className="text-zinc-300 dark:text-zinc-600">·</span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-500 truncate">
                            {p.assunto}
                          </span>
                        </>
                      )}
                      {p.fase && (
                        <>
                          <span className="text-zinc-300 dark:text-zinc-600 shrink-0">·</span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
                            {p.fase}
                          </span>
                        </>
                      )}
                      <span className="ml-auto text-zinc-300 dark:text-zinc-600 group-hover:text-emerald-500 transition-colors shrink-0">
                        →
                      </span>
                    </button>
                  ))}

                  {processosExtras > 0 && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 pl-3 pt-1">
                      +{processosExtras} processo{processosExtras > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
