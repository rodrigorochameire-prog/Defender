"use client";

import { useState, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  AlertCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
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

// ─── Main component ─────────────────────────────────────────────────────────
export function AssistidoOverviewPanel({
  data,
  onDemandaClick,
}: AssistidoOverviewPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  // ── Próxima Audiência ────────────────────────────────────────────────────
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

  // ── Demanda Crítica ──────────────────────────────────────────────────────
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

  return (
    <div className="relative border-b border-border/40">
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="absolute top-3 right-4 p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors z-10"
        aria-label={collapsed ? "Expandir painel" : "Recolher painel"}
      >
        {collapsed ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </button>

      {!collapsed && (
        <div className="grid sm:grid-cols-2 gap-4 px-6 lg:px-8 py-5">
          {/* ── Audiência card ── */}
          <div
            className={cn(
              "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm",
              "rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer",
            )}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center",
                  proximaAudiencia
                    ? "bg-amber-50 dark:bg-amber-900/20"
                    : "bg-zinc-100 dark:bg-zinc-700/40",
                )}
              >
                <Calendar
                  className={cn(
                    "w-4 h-4",
                    proximaAudiencia
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground/50",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider font-semibold",
                  proximaAudiencia
                    ? "text-amber-800 dark:text-amber-400"
                    : "text-muted-foreground",
                )}
              >
                Próxima Audiência
              </span>
            </div>

            {proximaAudiencia ? (
              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">
                  {format(
                    new Date(proximaAudiencia.dataAudiencia!),
                    "dd 'de' MMM · HH'h'mm",
                    { locale: ptBR },
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                  {diasAteAudiencia !== null && (
                    <span
                      className={cn(
                        "font-medium",
                        diasAteAudiencia <= 3
                          ? "text-rose-600 dark:text-rose-400"
                          : diasAteAudiencia <= 7
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground",
                      )}
                    >
                      {diasAteAudiencia === 0
                        ? "Hoje"
                        : diasAteAudiencia === 1
                          ? "Amanhã"
                          : `Em ${diasAteAudiencia} dias`}
                    </span>
                  )}
                  {proximaAudiencia.tipo && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{proximaAudiencia.tipo}</span>
                    </>
                  )}
                  {proximaAudiencia.local && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-xs">{proximaAudiencia.local}</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sem audiência agendada
              </p>
            )}
          </div>

          {/* ── Demanda card ── */}
          <div
            onClick={
              demandaCritica
                ? () => onDemandaClick(demandaCritica.id)
                : undefined
            }
            className={cn(
              "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm",
              "rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer",
            )}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center",
                  demandaCritica
                    ? "bg-rose-50 dark:bg-rose-900/20"
                    : "bg-zinc-100 dark:bg-zinc-700/40",
                )}
              >
                <AlertCircle
                  className={cn(
                    "w-4 h-4",
                    demandaCritica
                      ? "text-rose-700 dark:text-rose-400"
                      : "text-muted-foreground/50",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider font-semibold",
                  demandaCritica
                    ? "text-rose-800 dark:text-rose-400"
                    : "text-muted-foreground",
                )}
              >
                Demanda Crítica
              </span>
            </div>

            {demandaCritica ? (
              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">
                  {demandaCritica.ato ?? demandaCritica.tipoAto ?? "Demanda"}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                  {demandaCritica.prazo && (
                    <span>
                      Prazo:{" "}
                      {format(new Date(demandaCritica.prazo), "dd 'de' MMM", {
                        locale: ptBR,
                      })}
                    </span>
                  )}
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline">
                    ver demanda →
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma demanda urgente
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
