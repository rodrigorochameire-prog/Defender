"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  ListTodo,
  User,
  X,
  ChevronRight,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import {
  format,
  isToday,
  isTomorrow,
  startOfDay,
  differenceInDays,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// Atribuição palette — Padrão Defender v5
const JURI  = { bar: "#059669", tint: "#05966910", time: "#047857" };
const VVD   = { bar: "#f59e0b", tint: "#f59e0b10", time: "#b45309" };
const EP    = { bar: "#0284c7", tint: "#0284c710", time: "#0369a1" };
const ZINC  = { bar: "#3f3f46", tint: "#3f3f4610", time: "#52525b" };

const ATRIBUICAO_COLORS: Record<string, typeof JURI> = {
  JURI_CAMACARI:              JURI,
  GRUPO_JURI:                 JURI,
  VVD_CAMACARI:               VVD,
  EXECUCAO_PENAL:             EP,
  CRIMINAL_CAMACARI:          ZINC,
  CRIMINAL_SIMOES_FILHO:      ZINC,
  CRIMINAL_LAURO_DE_FREITAS:  ZINC,
  CRIMINAL_CANDEIAS:          ZINC,
  CRIMINAL_ITAPARICA:         ZINC,
  SUBSTITUICAO:               ZINC,
  SUBSTITUICAO_CIVEL:         ZINC,
};

const DEFAULT_COLOR = { bar: "#a1a1aa", tint: "#a1a1aa10", time: "#52525b" };

function getAtribuicaoColor(atribuicao?: string | null) {
  if (!atribuicao) return DEFAULT_COLOR;
  return ATRIBUICAO_COLORS[atribuicao] || DEFAULT_COLOR;
}

// Camadas de prioridade (ordem de urgência)
type Bucket = "VENCIDAS" | "HOJE" | "AMANHA" | "SEMANA" | "MES";

const BUCKET_LABELS: Record<Bucket, string> = {
  VENCIDAS: "Vencidas",
  HOJE: "Hoje",
  AMANHA: "Amanhã",
  SEMANA: "Esta semana",
  MES: "Este mês",
};

const BUCKET_ORDER: Bucket[] = ["VENCIDAS", "HOJE", "AMANHA", "SEMANA", "MES"];

function classify(prazo: string | null | undefined): Bucket | null {
  if (!prazo) return null;
  const today = startOfDay(new Date());
  const d = startOfDay(parseISO(prazo));
  const diff = differenceInDays(d, today);
  if (diff < 0) return "VENCIDAS";
  if (diff === 0) return "HOJE";
  if (diff === 1) return "AMANHA";
  if (diff <= 7) return "SEMANA";
  if (diff <= 30) return "MES";
  return null;
}

function formatRelativePrazo(prazo: string): string {
  const today = startOfDay(new Date());
  const d = startOfDay(parseISO(prazo));
  const diff = differenceInDays(d, today);
  if (diff < -1) return `há ${Math.abs(diff)} dias`;
  if (diff === -1) return "ontem";
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff <= 7) return `em ${diff} dias`;
  return format(d, "dd/MM", { locale: ptBR });
}

// Status terminais que nunca devem aparecer
const TERMINAL_STATUS = new Set([
  "CONCLUIDO",
  "ARQUIVADO",
  "7_PROTOCOLADO",
  "7_CIENCIA",
  "7_SEM_ATUACAO",
]);

// ============================================
// FLOATING BUTTON
// ============================================

export function FloatingDemandasButton() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === "/admin/demandas") return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed z-[51] flex items-center justify-center",
          "w-10 h-10 rounded-2xl shadow-md shadow-black/[0.08]",
          "bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm",
          "text-neutral-600 dark:text-neutral-300",
          "ring-1 ring-black/[0.06] dark:ring-white/[0.08]",
          "hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 hover:ring-emerald-300/30 dark:hover:ring-emerald-500/20",
          "transition-all duration-200 active:scale-95",
          "bottom-[11.5rem] right-4 sm:bottom-6 sm:right-[7.5rem]",
          "cursor-pointer"
        )}
        title="Demandas rápidas"
      >
        <ListTodo className="w-4 h-4" />
      </button>

      {isOpen && <DemandasQuickSheet onClose={() => setIsOpen(false)} />}
    </>
  );
}

// ============================================
// QUICK SHEET
// ============================================

export function DemandasQuickSheet({ onClose }: { onClose: () => void }) {
  const { data: demandasData, isLoading } = trpc.demandas.prazosUrgentes.useQuery(
    { dias: 30 },
    { staleTime: 0, refetchOnMount: "always" }
  );

  // Classificar e agrupar por camada
  const { grouped, bucketCounts, totalAtivas } = useMemo(() => {
    const byBucket: Record<Bucket, any[]> = {
      VENCIDAS: [], HOJE: [], AMANHA: [], SEMANA: [], MES: [],
    };
    if (demandasData) {
      for (const d of demandasData) {
        if (TERMINAL_STATUS.has(d.status as string)) continue;
        const bucket = classify(d.prazo);
        if (!bucket) continue;
        byBucket[bucket].push(d);
      }
    }
    // Ordenar dentro de cada bucket: réu preso primeiro, depois prazo
    for (const b of BUCKET_ORDER) {
      byBucket[b].sort((a, b) => {
        if (a.reuPreso !== b.reuPreso) return a.reuPreso ? -1 : 1;
        if (a.status === "URGENTE" && b.status !== "URGENTE") return -1;
        if (b.status === "URGENTE" && a.status !== "URGENTE") return 1;
        return (a.prazo || "").localeCompare(b.prazo || "");
      });
    }
    const counts: Record<Bucket, number> = {
      VENCIDAS: byBucket.VENCIDAS.length,
      HOJE:     byBucket.HOJE.length,
      AMANHA:   byBucket.AMANHA.length,
      SEMANA:   byBucket.SEMANA.length,
      MES:      byBucket.MES.length,
    };
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { grouped: byBucket, bucketCounts: counts, totalAtivas: total };
  }, [demandasData]);

  // Filtros de atribuição
  const atribBucketCounts = useMemo(() => {
    const c: Record<string, number> = { JURI: 0, VVD: 0, EP: 0, OTHER: 0 };
    if (demandasData) {
      for (const d of demandasData) {
        if (TERMINAL_STATUS.has(d.status as string)) continue;
        const bucket = classify(d.prazo);
        if (!bucket) continue;
        const atrib = (d as any).processo?.atribuicao;
        if (atrib === "JURI_CAMACARI" || atrib === "GRUPO_JURI") c.JURI++;
        else if (atrib === "VVD_CAMACARI") c.VVD++;
        else if (atrib === "EXECUCAO_PENAL") c.EP++;
        else c.OTHER++;
      }
    }
    return c;
  }, [demandasData]);

  const [activeAtribs, setActiveAtribs] = useState<Set<string>>(new Set());
  const toggleAtrib = (k: string) => {
    setActiveAtribs((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const filterByAtrib = (d: any) => {
    if (activeAtribs.size === 0) return true;
    const atrib = d.processo?.atribuicao;
    if (atrib === "JURI_CAMACARI" || atrib === "GRUPO_JURI") return activeAtribs.has("JURI");
    if (atrib === "VVD_CAMACARI") return activeAtribs.has("VVD");
    if (atrib === "EXECUCAO_PENAL") return activeAtribs.has("EP");
    return activeAtribs.has("OTHER");
  };

  return createPortal(
    <div className="fixed inset-0 z-[999]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />

      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute bg-neutral-50 dark:bg-neutral-900 overflow-hidden flex flex-col",
          "shadow-2xl shadow-black/[0.12] ring-1 ring-black/[0.06] dark:ring-white/[0.06]",
          "inset-2 rounded-xl",
          "sm:inset-auto sm:top-3 sm:right-3 sm:bottom-3 sm:w-[400px] sm:rounded-2xl",
        )}
        style={{ animation: "fadeInRight 0.2s ease-out" }}
      >
        {/* Header — Padrão Defender */}
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200/60 dark:border-neutral-800/60">
          {/* Row 1 */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                <ListTodo className="w-[14px] h-[14px] text-neutral-500 dark:text-neutral-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200 tracking-tight leading-tight">
                  Demandas
                </h2>
                <p className="text-[9px] text-neutral-400 dark:text-neutral-500 tabular-nums leading-tight mt-0.5">
                  {bucketCounts.VENCIDAS > 0
                    ? `${bucketCounts.VENCIDAS} vencida${bucketCounts.VENCIDAS > 1 ? "s" : ""}`
                    : "Nenhuma vencida"}
                  {" · "}{totalAtivas} ativas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link
                href="/admin/demandas"
                onClick={onClose}
                className="h-7 px-2.5 rounded-md text-[10px] text-neutral-500 dark:text-neutral-400 font-medium flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Abrir
                <ExternalLink className="w-2.5 h-2.5" />
              </Link>
              <button
                onClick={onClose}
                className="h-7 w-7 flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Row 2 — filter pills discretos por atribuição */}
          <div className="flex items-center gap-1.5 px-5 pb-2.5 pt-1 overflow-x-auto scrollbar-none">
            <FilterPill label="Júri" count={atribBucketCounts.JURI} color={JURI} active={activeAtribs.has("JURI")} onClick={() => toggleAtrib("JURI")} />
            <FilterPill label="VVD" count={atribBucketCounts.VVD} color={VVD} active={activeAtribs.has("VVD")} onClick={() => toggleAtrib("VVD")} />
            <FilterPill label="EP" count={atribBucketCounts.EP} color={EP} active={activeAtribs.has("EP")} onClick={() => toggleAtrib("EP")} />
            {atribBucketCounts.OTHER > 0 && (
              <FilterPill label="Outros" count={atribBucketCounts.OTHER} color={ZINC} active={activeAtribs.has("OTHER")} onClick={() => toggleAtrib("OTHER")} />
            )}
            {activeAtribs.size > 0 && (
              <button
                onClick={() => setActiveAtribs(new Set())}
                className="ml-auto text-[9px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer shrink-0 font-medium"
              >
                limpar
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
            </div>
          ) : totalAtivas === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <ListTodo className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Nenhuma demanda ativa
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                Sem prazos nos próximos 30 dias
              </p>
            </div>
          ) : (
            <div>
              {BUCKET_ORDER.map((bucket) => {
                const list = grouped[bucket].filter(filterByAtrib);
                if (list.length === 0) return null;
                const isVencidas = bucket === "VENCIDAS";

                return (
                  <div key={bucket} className="pb-1">
                    {/* Bucket header */}
                    <div className="px-5 py-1.5 sticky top-0 z-10 bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur-[2px]">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wider",
                          isVencidas
                            ? "text-red-600 dark:text-red-400"
                            : bucket === "HOJE"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-neutral-400 dark:text-neutral-500"
                        )}>
                          {BUCKET_LABELS[bucket]}
                        </span>
                        <span className="text-[9px] text-neutral-300 dark:text-neutral-600 tabular-nums">
                          {list.length}
                        </span>
                      </div>
                    </div>

                    {/* Demandas */}
                    <div>
                      {list.map((d: any) => (
                        <DemandaRow key={d.id} demanda={d} bucket={bucket} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200/60 dark:border-neutral-800/60 px-5 py-2.5 bg-white dark:bg-neutral-900">
          <Link
            href="/admin/demandas"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[10px] font-medium text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
          >
            <ListTodo className="w-3 h-3" />
            Ver todas as demandas
            <ChevronRight className="w-2.5 h-2.5 opacity-40" />
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ============================================
// FILTER PILL (compartilhado visualmente com agenda)
// ============================================

function FilterPill({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: { bar: string; tint: string; time: string };
  active: boolean;
  onClick: () => void;
}) {
  const disabled = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 h-5 px-1.5 rounded-md text-[10px] tabular-nums transition-colors duration-150 cursor-pointer",
        disabled && "opacity-25 cursor-not-allowed",
        active
          ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-medium"
          : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60"
      )}
    >
      <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: color.bar }} />
      {label}
      <span className="text-neutral-400/80 dark:text-neutral-500/80">{count}</span>
    </button>
  );
}

// ============================================
// DEMANDA ROW
// ============================================

function DemandaRow({ demanda, bucket }: { demanda: any; bucket: Bucket }) {
  const color = getAtribuicaoColor(demanda.processo?.atribuicao);
  const isVencida = bucket === "VENCIDAS";
  const isUrgente = demanda.status === "URGENTE";
  const reuPreso = !!demanda.reuPreso;
  const relPrazo = demanda.prazo ? formatRelativePrazo(demanda.prazo) : null;

  return (
    <div
      className={cn(
        "group relative mx-3 mb-1.5 pl-4 pr-3 py-2.5 rounded-lg flex items-start gap-3",
        "bg-white dark:bg-neutral-800/40",
        "shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.03] dark:ring-white/[0.04]",
        "transition-all duration-150",
        "hover:shadow-md hover:shadow-black/[0.06] hover:-translate-y-px"
      )}
    >
      {/* Barra lateral colorida — atribuição */}
      <span
        aria-hidden
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
        style={{ backgroundColor: isVencida ? "#dc2626" : color.bar }}
      />

      {/* Data/prazo */}
      <div className="min-w-[44px] pt-px">
        {demanda.prazo && (
          <div className="flex flex-col leading-tight">
            <span
              className="text-[11px] font-mono font-bold tabular-nums"
              style={{ color: isVencida ? "#dc2626" : color.time }}
            >
              {format(parseISO(demanda.prazo), "dd/MM")}
            </span>
            <span className={cn(
              "text-[8.5px] font-medium tabular-nums mt-0.5",
              isVencida ? "text-red-500" : "text-neutral-400 dark:text-neutral-500"
            )}>
              {relPrazo}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {isUrgente && (
            <AlertTriangle className="w-3 h-3 shrink-0 text-red-500" />
          )}
          <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 truncate leading-tight">
            {demanda.ato || "Sem ato"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1">
          {demanda.assistido?.nome && (
            <span className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400 min-w-0">
              <User className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate max-w-[150px]">{demanda.assistido.nome}</span>
            </span>
          )}
          {demanda.processo?.numeroAutos && (
            <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-mono tabular-nums truncate max-w-[150px]">
              {demanda.processo.numeroAutos}
            </span>
          )}
        </div>

        {reuPreso && (
          <div className="mt-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-px rounded text-[9px] font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 ring-1 ring-red-200/60 dark:ring-red-900/40">
              <Lock className="w-2 h-2" />
              Réu preso
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
