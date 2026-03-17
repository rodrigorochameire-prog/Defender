"use client";

import { useState, useMemo } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  FileText,
  Users,
  Microscope,
  Gavel,
  ShieldCheck,
  BookMarked,
  Shield,
  CalendarDays,
  FileCheck,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Filter,
  UserCircle,
} from "lucide-react";

// ============================================================
// Types
// ============================================================

interface ProcessoTimelineProps {
  processoId: number;
  compact?: boolean;
}

type Relevancia = "critico" | "alto" | "medio" | "baixo";
type Grupo =
  | "depoimentos"
  | "laudos"
  | "decisoes"
  | "defesa"
  | "mp"
  | "investigacao"
  | "audiencias"
  | "documentos"
  | "outros";

interface GroupConfig {
  icon: LucideIcon;
  label: string;
  border: string;
  bg: string;
  text: string;
}

interface RelevanciaConfig {
  dot: string;
  badge: string;
  label: string;
}

// ============================================================
// Config maps
// ============================================================

const GROUP_CONFIG: Record<Grupo, GroupConfig> = {
  depoimentos: {
    icon: Users,
    label: "Depoimentos",
    border: "border-l-blue-500",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
  },
  laudos: {
    icon: Microscope,
    label: "Laudos",
    border: "border-l-purple-500",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
  },
  decisoes: {
    icon: Gavel,
    label: "Decisoes",
    border: "border-l-red-500",
    bg: "bg-red-500/10",
    text: "text-red-400",
  },
  defesa: {
    icon: ShieldCheck,
    label: "Defesa",
    border: "border-l-emerald-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
  },
  mp: {
    icon: BookMarked,
    label: "MP",
    border: "border-l-amber-500",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
  },
  investigacao: {
    icon: Shield,
    label: "Investigacao",
    border: "border-l-orange-500",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
  },
  audiencias: {
    icon: CalendarDays,
    label: "Audiencias",
    border: "border-l-indigo-500",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
  },
  documentos: {
    icon: FileCheck,
    label: "Documentos",
    border: "border-l-green-500",
    bg: "bg-green-500/10",
    text: "text-green-400",
  },
  outros: {
    icon: HelpCircle,
    label: "Outros",
    border: "border-l-zinc-500",
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
  },
};

const RELEVANCIA_CONFIG: Record<Relevancia, RelevanciaConfig> = {
  critico: {
    dot: "bg-red-500",
    badge: "bg-red-500/20 text-red-300 border-red-500/30",
    label: "Critico",
  },
  alto: {
    dot: "bg-amber-500",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    label: "Alto",
  },
  medio: {
    dot: "bg-blue-500",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    label: "Medio",
  },
  baixo: {
    dot: "bg-zinc-500",
    badge: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    label: "Baixo",
  },
};

const ALL_RELEVANCIAS: Relevancia[] = ["critico", "alto", "medio", "baixo"];

// ============================================================
// Helpers
// ============================================================

function extractPessoas(metadata: Record<string, unknown> | null): string[] {
  if (!metadata) return [];
  const pessoas = metadata.pessoas;
  if (Array.isArray(pessoas)) return pessoas.map(String);
  return [];
}

function extractContradicoes(
  metadata: Record<string, unknown> | null
): string[] {
  if (!metadata) return [];
  const c = metadata.contradicoes;
  if (Array.isArray(c)) return c.map(String);
  return [];
}

function extractTesesDefensivas(
  metadata: Record<string, unknown> | null
): string[] {
  if (!metadata) return [];
  const t = metadata.tesesDefensivas;
  if (Array.isArray(t)) return t.map(String);
  return [];
}

// ============================================================
// Component
// ============================================================

export function ProcessoTimeline({
  processoId,
  compact = false,
}: ProcessoTimelineProps) {
  const [search, setSearch] = useState("");
  const [activeRelevancias, setActiveRelevancias] = useState<
    Set<Relevancia>
  >(new Set(["critico", "alto"]));

  const { data: sections, isLoading } =
    trpc.documentSections.timelineByProcessoId.useQuery({
      processoId,
      search: search.trim() || undefined,
    });

  // Client-side relevancia filtering + stats
  const { filtered, stats } = useMemo(() => {
    if (!sections) return { filtered: [], stats: { total: 0, contradicoes: 0, teses: 0 } };

    let totalContradicoes = 0;
    let totalTeses = 0;

    for (const s of sections) {
      totalContradicoes += extractContradicoes(s.metadata).length;
      totalTeses += extractTesesDefensivas(s.metadata).length;
    }

    const filteredSections = sections.filter((s) =>
      activeRelevancias.has(s.relevancia as Relevancia)
    );

    return {
      filtered: filteredSections,
      stats: {
        total: sections.length,
        contradicoes: totalContradicoes,
        teses: totalTeses,
      },
    };
  }, [sections, activeRelevancias]);

  // Toggle relevancia filter
  function toggleRelevancia(r: Relevancia) {
    setActiveRelevancias((prev) => {
      const next = new Set(prev);
      if (next.has(r)) {
        next.delete(r);
      } else {
        next.add(r);
      }
      return next;
    });
  }

  // Scroll to first contradiction
  function scrollToContradicoes() {
    // Ensure critico+alto are active since contradictions are typically high relevance
    setActiveRelevancias(new Set(["critico", "alto", "medio", "baixo"]));
    // Find first card with contradiction via DOM
    setTimeout(() => {
      const el = document.querySelector("[data-has-contradicao]");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  // Scroll to first thesis
  function scrollToTeses() {
    setActiveRelevancias(new Set(["critico", "alto", "medio", "baixo"]));
    setTimeout(() => {
      const el = document.querySelector("[data-has-tese]");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-3 h-3 rounded-full bg-zinc-700 animate-pulse mt-1.5 shrink-0" />
            <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <div className="h-4 w-2/3 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-full bg-zinc-800/60 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-zinc-800/40 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ---- Empty state ----
  if (!sections || sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-12 h-12 text-zinc-700 mb-3" />
        <p className="text-sm text-zinc-400">
          Nenhum documento classificado para este processo.
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Envie PDFs ao Drive e execute o classificador para gerar a timeline.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* ====== Header (hidden in compact) ====== */}
        {!compact && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Buscar por titulo ou conteudo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-800"
              />
            </div>

            {/* Relevancia filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              {ALL_RELEVANCIAS.map((r) => {
                const config = RELEVANCIA_CONFIG[r];
                const isActive = activeRelevancias.has(r);
                return (
                  <button
                    key={r}
                    onClick={() => toggleRelevancia(r)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all duration-150 cursor-pointer",
                      isActive
                        ? config.badge
                        : "bg-zinc-900 text-zinc-600 border-zinc-800 opacity-50"
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        isActive ? config.dot : "bg-zinc-700"
                      )}
                    />
                    {config.label}
                  </button>
                );
              })}
            </div>

            {/* Stats summary */}
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span>
                {stats.total} {stats.total === 1 ? "secao" : "secoes"}
              </span>
              {stats.contradicoes > 0 && (
                <span className="flex items-center gap-1 text-amber-400/80">
                  <AlertTriangle className="w-3 h-3" />
                  {stats.contradicoes}{" "}
                  {stats.contradicoes === 1 ? "contradicao" : "contradicoes"}
                </span>
              )}
              {stats.teses > 0 && (
                <span className="flex items-center gap-1 text-emerald-400/80">
                  <Lightbulb className="w-3 h-3" />
                  {stats.teses} {stats.teses === 1 ? "tese" : "teses"}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ====== Timeline body ====== */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[5px] top-0 bottom-0 w-[2px] bg-zinc-800" />

          <div className="space-y-3">
            {filtered.map((section) => {
              const grupo = (section.grupo as Grupo) || "outros";
              const relevancia =
                (section.relevancia as Relevancia) || "baixo";
              const groupCfg = GROUP_CONFIG[grupo] ?? GROUP_CONFIG.outros;
              const relCfg =
                RELEVANCIA_CONFIG[relevancia] ?? RELEVANCIA_CONFIG.baixo;
              const GroupIcon = groupCfg.icon;
              const pessoas = extractPessoas(section.metadata);
              const contradicoes = extractContradicoes(section.metadata);
              const teses = extractTesesDefensivas(section.metadata);
              const lowConfidence =
                section.confianca != null && section.confianca < 70;

              return (
                <div
                  key={section.id}
                  className="relative flex items-start gap-3 pl-0"
                  {...(contradicoes.length > 0
                    ? { "data-has-contradicao": true }
                    : {})}
                  {...(teses.length > 0 ? { "data-has-tese": true } : {})}
                >
                  {/* Relevancia dot on the timeline line */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "relative z-10 mt-2 w-3 h-3 rounded-full shrink-0 ring-2 ring-zinc-950",
                          relCfg.dot
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      Relevancia: {relCfg.label}
                    </TooltipContent>
                  </Tooltip>

                  {/* Card */}
                  <div
                    className={cn(
                      "flex-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 border-l-4 transition-colors duration-150 hover:bg-zinc-900/80",
                      groupCfg.border,
                      lowConfidence && "border-dashed"
                    )}
                  >
                    {/* Card header */}
                    <div className="flex items-start gap-2 mb-1.5">
                      <GroupIcon
                        className={cn("w-4 h-4 mt-0.5 shrink-0", groupCfg.text)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-medium text-zinc-200 truncate">
                            {section.titulo}
                          </h4>
                          <Badge
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4 border",
                              groupCfg.bg,
                              groupCfg.text,
                              "border-transparent"
                            )}
                          >
                            {groupCfg.label}
                          </Badge>
                          {lowConfidence && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-zinc-800 text-zinc-500 border-zinc-700">
                                  {section.confianca}%
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                Confianca baixa na classificacao
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-4 border shrink-0",
                          relCfg.badge
                        )}
                      >
                        {relCfg.label}
                      </Badge>
                    </div>

                    {/* Resumo (hidden in compact) */}
                    {!compact && section.resumo && (
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-2 ml-6">
                        {section.resumo}
                      </p>
                    )}

                    {/* Pessoas (hidden in compact) */}
                    {!compact && pessoas.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mb-2 ml-6">
                        <UserCircle className="w-3 h-3 text-zinc-600" />
                        {pessoas.map((p, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] text-zinc-500 bg-zinc-800/60 rounded px-1.5 py-0.5"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Contradiction alerts */}
                    {contradicoes.length > 0 && (
                      <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-2 mb-2 ml-6">
                        {contradicoes.map((c, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-1.5 text-xs text-amber-300"
                          >
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{c}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Defense thesis highlights */}
                    {teses.length > 0 && (
                      <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2 mb-2 ml-6">
                        {teses.map((t, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-1.5 text-xs text-emerald-300"
                          >
                            <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{t}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer: file name, page range, Drive link */}
                    <div className="flex items-center gap-2 text-[10px] text-zinc-600 ml-6 mt-1">
                      <FileText className="w-3 h-3" />
                      <span className="truncate max-w-[180px]">
                        {section.fileName}
                      </span>
                      <span className="font-mono">
                        p.{section.paginaInicio}
                        {section.paginaFim !== section.paginaInicio &&
                          `-${section.paginaFim}`}
                      </span>
                      {section.fileWebViewLink && (
                        <a
                          href={section.fileWebViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Drive</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ====== Footer (hidden in compact) ====== */}
        {!compact && (
          <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800/50">
            <span>
              {filtered.length} de {stats.total}{" "}
              {stats.total === 1 ? "secao" : "secoes"} (filtradas)
            </span>
            <div className="flex items-center gap-3">
              {stats.contradicoes > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={scrollToContradicoes}
                  className="text-amber-400/70 hover:text-amber-300 h-6 px-2"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Ver contradicoes
                </Button>
              )}
              {stats.teses > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={scrollToTeses}
                  className="text-emerald-400/70 hover:text-emerald-300 h-6 px-2"
                >
                  <Lightbulb className="w-3 h-3" />
                  Ver teses
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
