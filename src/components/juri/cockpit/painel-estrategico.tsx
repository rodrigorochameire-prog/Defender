"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Shield,
  AlertCircle,
  AlertTriangle,
  Target,
  Quote,
  Users,
  Mic,
  PenLine,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Activity,
  Star,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComportamentoRegistro {
  id: string;
  juradoId: number;
  timestamp: string;
  fase: string;
  momento: string;
  tipo:
    | "reacao_facial"
    | "linguagem_corporal"
    | "interacao"
    | "atencao"
    | "posicionamento"
    | "verbal";
  descricao: string;
  interpretacao: "favoravel" | "neutro" | "desfavoravel" | "incerto";
  relevancia: 1 | 2 | 3;
}

interface JuradoSorteado {
  id: number;
  nome: string;
  genero: "M" | "F";
  profissao?: string;
  taxaAbsolvicao: number;
  cadeira: number;
  foto?: string;
  comportamentos: ComportamentoRegistro[];
}

interface Anotacao {
  id: string;
  categoria: string;
  texto: string;
  horario: string;
  fase: string;
  importante: boolean;
}

interface PainelEstrategicoProps {
  anotacoes: Anotacao[];
  conselhoSentenca: (JuradoSorteado | null)[];
  faseSelecionada: { id: string; label: string };
  isDarkMode: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  mp_argumento: Shield,
  mp_refutar: AlertCircle,
  defesa_usar: Target,
  contradicao: AlertTriangle,
  frase_impacto: Quote,
  jurado_reacao: Users,
  testemunha: Mic,
  geral: PenLine,
};

const CATEGORY_COLORS: Record<string, string> = {
  mp_argumento: "text-rose-500",
  mp_refutar: "text-orange-500",
  defesa_usar: "text-emerald-500",
  contradicao: "text-amber-500",
  frase_impacto: "text-purple-500",
  jurado_reacao: "text-blue-500",
  testemunha: "text-indigo-500",
  geral: "text-zinc-500",
};

const CATEGORY_LABELS: Record<string, string> = {
  mp_argumento: "MP",
  mp_refutar: "Refutar",
  defesa_usar: "Defesa",
  contradicao: "Contradicao",
  frase_impacto: "Impacto",
  jurado_reacao: "Jurado",
  testemunha: "Testemunha",
  geral: "Geral",
};

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------

function Section({
  title,
  icon: Icon,
  badge,
  badgeColor,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200/80 bg-white",
        "dark:border-zinc-800/80 dark:bg-zinc-900",
        "overflow-hidden transition-all duration-200"
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-3",
          "cursor-pointer transition-colors duration-200",
          "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        )}
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
        )}
        <Icon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {title}
        </span>
        {badge !== undefined && (
          <Badge
            className={cn(
              "ml-auto text-[10px] border",
              badgeColor ||
                "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
            )}
          >
            {badge}
          </Badge>
        )}
      </button>

      {/* Content */}
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PainelEstrategico({
  anotacoes,
  conselhoSentenca,
  faseSelecionada,
  isDarkMode,
}: PainelEstrategicoProps) {
  const feedRef = useRef<HTMLDivElement>(null);

  // Track which MP arguments have been refuted (local toggle state)
  const [refutados, setRefutados] = useState<Set<string>>(new Set());

  // ---- Derived data ----

  const mpArguments = useMemo(
    () => anotacoes.filter((a) => a.categoria === "mp_argumento"),
    [anotacoes]
  );

  const pendingRefutations = useMemo(
    () => anotacoes.filter((a) => a.categoria === "mp_refutar"),
    [anotacoes]
  );

  const contradictions = useMemo(
    () => anotacoes.filter((a) => a.categoria === "contradicao"),
    [anotacoes]
  );

  const refutedCount = refutados.size;
  const pendingCount = mpArguments.length - refutedCount;
  const refutationRate =
    mpArguments.length > 0
      ? Math.round((refutedCount / mpArguments.length) * 100)
      : 0;

  // Last 10 annotations, newest first
  const recentAnnotations = useMemo(() => {
    return [...anotacoes].reverse().slice(0, 10);
  }, [anotacoes]);

  // Scroll feed to top when a new annotation arrives
  const prevCountRef = useRef(anotacoes.length);
  useEffect(() => {
    if (anotacoes.length > prevCountRef.current && feedRef.current) {
      feedRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    prevCountRef.current = anotacoes.length;
  }, [anotacoes.length]);

  // Council pulse data
  const councilPulse = useMemo(() => {
    const seated = conselhoSentenca.filter(
      (j): j is JuradoSorteado => j !== null
    );
    return seated.map((jurado) => {
      const favorable = jurado.comportamentos.filter(
        (c) => c.interpretacao === "favoravel"
      ).length;
      const unfavorable = jurado.comportamentos.filter(
        (c) => c.interpretacao === "desfavoravel"
      ).length;
      const total = favorable + unfavorable;
      const ratio = total > 0 ? Math.round((favorable / total) * 100) : 50;
      return { jurado, favorable, unfavorable, total, ratio };
    });
  }, [conselhoSentenca]);

  // Overall projection
  const overallProjection = useMemo(() => {
    if (councilPulse.length === 0) return 50;
    const sumRatios = councilPulse.reduce((acc, p) => acc + p.ratio, 0);
    return Math.round(sumRatios / councilPulse.length);
  }, [councilPulse]);

  // Toggle refuted state
  const toggleRefuted = (anotacaoId: string) => {
    setRefutados((prev) => {
      const next = new Set(prev);
      if (next.has(anotacaoId)) {
        next.delete(anotacaoId);
      } else {
        next.add(anotacaoId);
      }
      return next;
    });
  };

  // ---- Render ----

  return (
    <div className="space-y-4">
      {/* ============================================================= */}
      {/* 1. ARGUMENT TRACKER                                           */}
      {/* ============================================================= */}
      <Section
        title="Tracker de Argumentos"
        icon={Shield}
        badge={`${mpArguments.length} arg.`}
        badgeColor="bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
      >
        {/* Scorecard */}
        <div
          className={cn(
            "mb-3 flex flex-wrap items-center gap-3 rounded-lg px-3 py-2.5",
            "bg-zinc-50 dark:bg-zinc-800/50"
          )}
        >
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-rose-500" />
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              MP: {mpArguments.length}
            </span>
          </div>
          <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              Refutados: {refutedCount}
            </span>
          </div>
          <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-amber-500" />
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              Pendentes: {pendingCount}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Taxa de refutacao
            </span>
            <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
              {refutationRate}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="flex h-full">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${refutationRate}%`,
                }}
              />
              <div
                className="h-full bg-rose-400 transition-all duration-500"
                style={{
                  width: `${100 - refutationRate}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* MP Arguments list */}
        {mpArguments.length === 0 ? (
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-3">
            Nenhum argumento do MP registrado.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Argumentos do MP
            </span>
            {mpArguments.map((arg) => {
              const isRefuted = refutados.has(arg.id);
              return (
                <div
                  key={arg.id}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border px-3 py-2",
                    isRefuted
                      ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                      : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/50"
                  )}
                >
                  <Checkbox
                    checked={isRefuted}
                    onCheckedChange={() => toggleRefuted(arg.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-xs leading-relaxed",
                        isRefuted
                          ? "line-through text-zinc-400 dark:text-zinc-500"
                          : "text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      {arg.texto}
                    </p>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                      {arg.horario} - {arg.fase}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pending refutations */}
        {pendingRefutations.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-orange-500 dark:text-orange-400">
              Pontos a Refutar
            </span>
            {pendingRefutations.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border-l-2 border-l-orange-400 border border-orange-200/80 px-3 py-2",
                  "bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800/50"
                )}
              >
                <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {item.texto}
                </p>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                  {item.horario}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ============================================================= */}
      {/* 2. CONTRADICTION ALERT                                         */}
      {/* ============================================================= */}
      <Section
        title="Alertas de Contradicao"
        icon={AlertTriangle}
        badge={
          contradictions.length > 0
            ? `${contradictions.length} contradicoes`
            : undefined
        }
        badgeColor="bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
        defaultOpen={contradictions.length > 0}
      >
        {contradictions.length === 0 ? (
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-3">
            Nenhuma contradicao identificada ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {contradictions.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border-l-2 border-l-amber-400 border px-3 py-2.5",
                  "border-amber-200/80 bg-amber-50/50",
                  "dark:border-amber-800/50 dark:bg-amber-950/20"
                )}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {item.texto}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-mono text-amber-600/70 dark:text-amber-400/60">
                        {item.horario}
                      </span>
                      <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                        {item.fase}
                      </Badge>
                      {item.importante && (
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ============================================================= */}
      {/* 3. LIVE ANNOTATIONS FEED                                       */}
      {/* ============================================================= */}
      <Section
        title="Feed de Anotacoes"
        icon={Activity}
        badge={anotacoes.length > 0 ? anotacoes.length : undefined}
      >
        {recentAnnotations.length === 0 ? (
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-3">
            Nenhuma anotacao registrada.
          </p>
        ) : (
          <div
            ref={feedRef}
            className="max-h-80 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin"
          >
            {recentAnnotations.map((anot) => {
              const Icon =
                CATEGORY_ICONS[anot.categoria] || PenLine;
              const colorClass =
                CATEGORY_COLORS[anot.categoria] || "text-zinc-500";
              const label =
                CATEGORY_LABELS[anot.categoria] || anot.categoria;

              return (
                <div
                  key={anot.id}
                  className={cn(
                    "flex items-start gap-2 rounded-lg px-3 py-2",
                    "border transition-all duration-200",
                    anot.importante
                      ? "border-amber-300 bg-amber-50/30 dark:border-amber-700/50 dark:bg-amber-950/10"
                      : "border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-800/30",
                    "hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60"
                  )}
                >
                  <Icon
                    className={cn("mt-0.5 h-3 w-3 flex-shrink-0", colorClass)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={cn(
                          "text-[9px] font-semibold uppercase tracking-wide",
                          colorClass
                        )}
                      >
                        {label}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
                        {anot.horario}
                      </span>
                      {anot.importante && (
                        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-2">
                      {anot.texto}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ============================================================= */}
      {/* 4. COUNCIL PULSE                                               */}
      {/* ============================================================= */}
      <Section
        title="Pulso do Conselho"
        icon={BarChart3}
        badge={
          overallProjection !== 50
            ? `${overallProjection}% favoravel`
            : undefined
        }
        badgeColor={
          overallProjection >= 60
            ? "bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
            : overallProjection <= 40
              ? "bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
              : "bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
        }
      >
        {councilPulse.length === 0 ? (
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-3">
            Nenhum jurado no conselho de sentenca.
          </p>
        ) : (
          <>
            {/* Overall projection bar */}
            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  Projecao geral
                </span>
                <span
                  className={cn(
                    "text-xs font-bold font-mono",
                    overallProjection >= 60
                      ? "text-emerald-600 dark:text-emerald-400"
                      : overallProjection <= 40
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-amber-600 dark:text-amber-400"
                  )}
                >
                  {overallProjection}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    overallProjection >= 60
                      ? "bg-emerald-500"
                      : overallProjection <= 40
                        ? "bg-rose-500"
                        : "bg-amber-500"
                  )}
                  style={{ width: `${overallProjection}%` }}
                />
              </div>
            </div>

            {/* Individual juror rows */}
            <div className="space-y-2">
              {councilPulse.map(
                ({ jurado, favorable, unfavorable, total, ratio }) => {
                  const firstName = jurado.nome.split(" ")[0];

                  return (
                    <div
                      key={jurado.id}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2",
                        "bg-zinc-50 dark:bg-zinc-800/40"
                      )}
                    >
                      {/* Chair badge */}
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold",
                          "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        {jurado.cadeira}
                      </span>

                      {/* Name */}
                      <span className="w-16 truncate text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                        {firstName}
                      </span>

                      {/* Mini bar */}
                      <div className="flex-1">
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                          {total > 0 ? (
                            <>
                              <div
                                className="h-full bg-emerald-500 transition-all duration-500"
                                style={{
                                  width: `${ratio}%`,
                                }}
                              />
                              <div
                                className="h-full bg-rose-400 transition-all duration-500"
                                style={{
                                  width: `${100 - ratio}%`,
                                }}
                              />
                            </>
                          ) : (
                            <div className="h-full w-full bg-zinc-200 dark:bg-zinc-700" />
                          )}
                        </div>
                      </div>

                      {/* Counts */}
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="h-2.5 w-2.5" />
                          {favorable}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] font-mono text-rose-500 dark:text-rose-400">
                          <TrendingDown className="h-2.5 w-2.5" />
                          {unfavorable}
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
