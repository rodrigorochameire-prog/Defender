"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  FileText,
  Users,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Eye,
  Ear,
  MessageCircle,
  MapPin,
  Calendar,
  Box,
  User,
  Lightbulb,
  Scale,
  Brain,
  Highlighter,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types for Sonnet Analysis ──

export interface DeponenteInfo {
  nome?: string | null;
  apelido?: string | null;
  classificacoes?: string[];
  relacao_com_fatos?: string;
  credibilidade_notas?: string;
}

interface PessoaEntity {
  nome: string;
  apelidos?: string[];
  papel?: string;
  caracteristicas?: string[];
  mencionado_por?: string[];
}

interface LocalEntity {
  nome: string;
  tipo?: string;
  descricao_ambiente?: string;
}

interface DateEntity {
  referencia: string;
  contexto: string;
}

interface ObjectEntity {
  descricao: string;
  contexto: string;
}

interface PercepcaoItem {
  fato: string;
  condicoes?: string;
  fonte?: string;
  timestamp_ref?: string;
  confiabilidade?: string;
  natureza?: string;
}

interface CondicoesPercepcao {
  iluminacao?: string | null;
  distancia?: string | null;
  estado_emocional?: string | null;
  tempo_exposicao?: string | null;
  obstaculos_visuais?: string | null;
  intoxicacao?: string | null;
}

interface PontoFavoravel {
  ponto: string;
  timestamp_ref?: string;
  relevancia?: string;
  tese_aplicavel?: string;
}

interface PontoDesfavoravel {
  ponto: string;
  timestamp_ref?: string;
  relevancia?: string;
}

interface Contradicao {
  fato_1: string;
  fato_2: string;
  analise: string;
}

interface HighlightItem {
  texto: string;
  tipo?: string;
  timestamp_ref?: string;
  motivo?: string;
}

export interface AnalysisData {
  depoente?: DeponenteInfo;
  entidades?: {
    pessoas?: PessoaEntity[];
    locais?: LocalEntity[];
    datas_horarios?: DateEntity[];
    objetos?: ObjectEntity[];
  };
  percepcao?: {
    viu_diretamente?: PercepcaoItem[];
    ouviu_dizer_especifico?: PercepcaoItem[];
    ouviu_dizer_boato?: PercepcaoItem[];
    condicoes_percepcao?: CondicoesPercepcao;
  };
  resumo_defesa?: string;
  pontos_favoraveis?: PontoFavoravel[];
  pontos_desfavoraveis?: PontoDesfavoravel[];
  contradicoes?: Contradicao[];
  highlights?: HighlightItem[];
  providencias?: string[];
}

// ── Component Props ──

type AnalysisTab = "transcricao" | "defesa" | "entidades" | "percepcao" | "destaques";

interface TranscriptViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcript: string;
  speakers?: string[];
  duration?: number;
  analysis?: AnalysisData | null;
  assistidoNome?: string;
  title?: string;
  summary?: string | null;
  onSummarize?: () => void;
  isSummarizing?: boolean;
}

// ── Helper: classification tag colors ──

const TAG_COLORS: Record<string, string> = {
  testemunha_presencial: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  testemunha_ouvir_dizer_boato: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  testemunha_ouvir_dizer_fonte: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  testemunha_mera_conduta: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  testemunha_referida: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  vitima: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  policial_civil: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  policial_militar: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  familiar_vitima: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  familiar_reu: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  vizinho: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  informante: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  perito: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  correu: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

const TAG_LABELS: Record<string, string> = {
  testemunha_presencial: "Presencial",
  testemunha_ouvir_dizer_boato: "Ouvir Dizer (Boato)",
  testemunha_ouvir_dizer_fonte: "Ouvir Dizer (Fonte)",
  testemunha_mera_conduta: "Mera Conduta",
  testemunha_referida: "Referida",
  vitima: "Vítima",
  policial_civil: "Policial Civil",
  policial_militar: "Policial Militar",
  familiar_vitima: "Familiar Vítima",
  familiar_reu: "Familiar Réu",
  vizinho: "Vizinho",
  informante: "Informante",
  perito: "Perito",
  correu: "Corréu",
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}m`;
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

const RELEVANCIA_COLORS: Record<string, string> = {
  alta: "text-red-600 dark:text-red-400",
  media: "text-amber-600 dark:text-amber-400",
  baixa: "text-zinc-500 dark:text-zinc-400",
};

const HIGHLIGHT_TYPE_COLORS: Record<string, string> = {
  favoravel: "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20",
  desfavoravel: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
  hearsay: "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20",
  contradicao: "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20",
  admissao: "border-l-violet-500 bg-violet-50/50 dark:bg-violet-950/20",
  relevante: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
};

// ── Main Component ──

export function TranscriptViewer({
  open,
  onOpenChange,
  transcript,
  speakers,
  duration,
  analysis,
  assistidoNome,
  title,
}: TranscriptViewerProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisTab>("transcricao");

  const hasAnalysis = !!analysis && !!analysis.resumo_defesa;

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { key: AnalysisTab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: "transcricao", label: "Transcrição", icon: <FileText className="h-3.5 w-3.5" />, show: true },
    { key: "defesa", label: "Análise Defesa", icon: <Scale className="h-3.5 w-3.5" />, show: hasAnalysis },
    { key: "entidades", label: "Entidades", icon: <Users className="h-3.5 w-3.5" />, show: hasAnalysis },
    { key: "percepcao", label: "Percepção", icon: <Eye className="h-3.5 w-3.5" />, show: hasAnalysis },
    { key: "destaques", label: "Destaques", icon: <Highlighter className="h-3.5 w-3.5" />, show: hasAnalysis },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-500" />
            {title ?? "Transcrição de Áudio"}
            {assistidoNome && (
              <span className="text-sm font-normal text-zinc-500">
                — {assistidoNome}
              </span>
            )}
          </DialogTitle>

          {/* Quick info bar */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {duration && duration > 0 && (
              <Badge variant="outline" className="text-[10px] font-normal">
                {formatDuration(duration)}
              </Badge>
            )}
            {speakers && speakers.length > 0 && (
              <Badge variant="outline" className="text-[10px] font-normal">
                <Users className="h-2.5 w-2.5 mr-1" />
                {speakers.length} interlocutor{speakers.length > 1 ? "es" : ""}
              </Badge>
            )}
            {hasAnalysis && (
              <Badge className="text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-0">
                <Brain className="h-2.5 w-2.5 mr-1" />
                Analisado por IA
              </Badge>
            )}
            {analysis?.depoente?.classificacoes?.map((tag) => (
              <Badge
                key={tag}
                className={cn(
                  "text-[10px] font-medium border-0",
                  TAG_COLORS[tag] ?? "bg-zinc-100 text-zinc-600"
                )}
              >
                {TAG_LABELS[tag] ?? tag.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 pt-2 pb-0 shrink-0 overflow-x-auto">
          {tabs.filter((t) => t.show).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
                activeTab === t.key
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 p-5 pt-3">
          {/* Tab: Transcrição */}
          {activeTab === "transcricao" && (
            <div className="flex flex-col gap-2 h-full">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Transcrição Completa
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(transcript)}
                  className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-700"
                >
                  {copied ? (
                    <Check className="h-3 w-3 mr-1 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                  <div className="p-4">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono">
                      {transcript || (
                        <span className="text-zinc-400 italic font-sans">
                          Nenhum texto transcrito.
                        </span>
                      )}
                    </p>
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Tab: Análise Defesa */}
          {activeTab === "defesa" && analysis && (
            <ScrollArea className="max-h-[55vh]">
              <div className="space-y-4 pr-3">
                {/* Depoente Info */}
                {analysis.depoente && (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      Depoente
                    </h3>
                    <div className="space-y-1.5">
                      {analysis.depoente.nome && (
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {analysis.depoente.nome}
                          {analysis.depoente.apelido && (
                            <span className="text-zinc-500 font-normal"> ({analysis.depoente.apelido})</span>
                          )}
                        </p>
                      )}
                      {analysis.depoente.relacao_com_fatos && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          {analysis.depoente.relacao_com_fatos}
                        </p>
                      )}
                      {analysis.depoente.credibilidade_notas && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 italic">
                          Credibilidade: {analysis.depoente.credibilidade_notas}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Resumo Defesa */}
                {analysis.resumo_defesa && (
                  <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-4">
                    <h3 className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5" />
                      Resumo para Defesa
                    </h3>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {analysis.resumo_defesa}
                    </p>
                  </div>
                )}

                {/* Pontos Favoráveis */}
                {analysis.pontos_favoraveis && analysis.pontos_favoraveis.length > 0 && (
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 p-4">
                    <h3 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      Pontos Favoráveis ({analysis.pontos_favoraveis.length})
                    </h3>
                    <div className="space-y-2">
                      {analysis.pontos_favoraveis.map((p, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <span className="text-emerald-500 shrink-0 mt-0.5">+</span>
                          <div>
                            <p className="text-zinc-700 dark:text-zinc-300">{p.ponto}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {p.timestamp_ref && (
                                <span className="text-[10px] text-zinc-400 font-mono">[{p.timestamp_ref}]</span>
                              )}
                              {p.relevancia && (
                                <span className={cn("text-[10px] font-medium", RELEVANCIA_COLORS[p.relevancia] ?? "text-zinc-500")}>
                                  {p.relevancia}
                                </span>
                              )}
                              {p.tese_aplicavel && (
                                <Badge variant="outline" className="text-[9px] py-0 h-4">
                                  {p.tese_aplicavel.replace(/_/g, " ")}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pontos Desfavoráveis */}
                {analysis.pontos_desfavoraveis && analysis.pontos_desfavoraveis.length > 0 && (
                  <div className="rounded-lg border border-red-200 dark:border-red-800 p-4">
                    <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Pontos Desfavoráveis ({analysis.pontos_desfavoraveis.length})
                    </h3>
                    <div className="space-y-2">
                      {analysis.pontos_desfavoraveis.map((p, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <span className="text-red-500 shrink-0 mt-0.5">−</span>
                          <div>
                            <p className="text-zinc-700 dark:text-zinc-300">{p.ponto}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {p.timestamp_ref && (
                                <span className="text-[10px] text-zinc-400 font-mono">[{p.timestamp_ref}]</span>
                              )}
                              {p.relevancia && (
                                <span className={cn("text-[10px] font-medium", RELEVANCIA_COLORS[p.relevancia] ?? "text-zinc-500")}>
                                  {p.relevancia}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contradições */}
                {analysis.contradicoes && analysis.contradicoes.length > 0 && (
                  <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
                    <h3 className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Contradições ({analysis.contradicoes.length})
                    </h3>
                    <div className="space-y-3">
                      {analysis.contradicoes.map((c, i) => (
                        <div key={i} className="rounded-md border border-yellow-100 dark:border-yellow-900 bg-yellow-50/50 dark:bg-yellow-950/20 p-3 text-sm space-y-1">
                          <p className="text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">1.</span> {c.fato_1}
                          </p>
                          <p className="text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">2.</span> {c.fato_2}
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-400 italic mt-1">
                            {c.analise}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Providências */}
                {analysis.providencias && analysis.providencias.length > 0 && (
                  <div className="rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                    <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5" />
                      Providências Sugeridas
                    </h3>
                    <ul className="space-y-1.5">
                      {analysis.providencias.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                          <span className="text-blue-500 shrink-0 mt-0.5">→</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Tab: Entidades */}
          {activeTab === "entidades" && analysis?.entidades && (
            <ScrollArea className="max-h-[55vh]">
              <div className="space-y-4 pr-3">
                {/* Pessoas */}
                {analysis.entidades.pessoas && analysis.entidades.pessoas.length > 0 && (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      Pessoas ({analysis.entidades.pessoas.length})
                    </h3>
                    <div className="space-y-3">
                      {analysis.entidades.pessoas.map((p, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                            <User className="h-3.5 w-3.5 text-zinc-500" />
                          </div>
                          <div>
                            <p className="font-medium text-zinc-800 dark:text-zinc-200">
                              {p.nome}
                              {p.apelidos && p.apelidos.length > 0 && (
                                <span className="text-zinc-500 font-normal"> ({p.apelidos.join(", ")})</span>
                              )}
                            </p>
                            {p.papel && (
                              <Badge variant="outline" className="text-[9px] mt-0.5 py-0 h-4">
                                {p.papel}
                              </Badge>
                            )}
                            {p.caracteristicas && p.caracteristicas.length > 0 && (
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {p.caracteristicas.join(" · ")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Locais */}
                {analysis.entidades.locais && analysis.entidades.locais.length > 0 && (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      Locais ({analysis.entidades.locais.length})
                    </h3>
                    <div className="space-y-2">
                      {analysis.entidades.locais.map((l, i) => (
                        <div key={i} className="text-sm">
                          <p className="font-medium text-zinc-800 dark:text-zinc-200">{l.nome}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {l.tipo && (
                              <Badge variant="outline" className="text-[9px] py-0 h-4">
                                {l.tipo.replace(/_/g, " ")}
                              </Badge>
                            )}
                            {l.descricao_ambiente && (
                              <span className="text-xs text-zinc-500">{l.descricao_ambiente}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Datas/Horários */}
                {analysis.entidades.datas_horarios && analysis.entidades.datas_horarios.length > 0 && (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Datas e Horários
                    </h3>
                    <div className="space-y-1.5">
                      {analysis.entidades.datas_horarios.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                            {d.referencia}
                          </span>
                          <span className="text-zinc-600 dark:text-zinc-400">{d.contexto}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Objetos */}
                {analysis.entidades.objetos && analysis.entidades.objetos.length > 0 && (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Box className="h-3.5 w-3.5" />
                      Objetos
                    </h3>
                    <div className="space-y-1.5">
                      {analysis.entidades.objetos.map((o, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">{o.descricao}</span>
                          <span className="text-zinc-500"> — {o.contexto}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Tab: Percepção */}
          {activeTab === "percepcao" && analysis?.percepcao && (
            <ScrollArea className="max-h-[55vh]">
              <div className="space-y-4 pr-3">
                {/* Viu Diretamente */}
                {analysis.percepcao.viu_diretamente && analysis.percepcao.viu_diretamente.length > 0 && (
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 p-4">
                    <h3 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      Viu Diretamente ({analysis.percepcao.viu_diretamente.length})
                    </h3>
                    <div className="space-y-2">
                      {analysis.percepcao.viu_diretamente.map((item, i) => (
                        <div key={i} className="text-sm border-l-2 border-emerald-300 dark:border-emerald-700 pl-3">
                          <p className="text-zinc-700 dark:text-zinc-300">{item.fato}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {item.timestamp_ref && (
                              <span className="text-[10px] text-zinc-400 font-mono">[{item.timestamp_ref}]</span>
                            )}
                            {item.condicoes && (
                              <span className="text-[10px] text-zinc-500">{item.condicoes}</span>
                            )}
                            {item.confiabilidade && (
                              <Badge variant="outline" className="text-[9px] py-0 h-4">
                                {item.confiabilidade}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ouviu Dizer — Fonte Específica */}
                {analysis.percepcao.ouviu_dizer_especifico && analysis.percepcao.ouviu_dizer_especifico.length > 0 && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 p-4">
                    <h3 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Ear className="h-3.5 w-3.5" />
                      Ouviu Dizer — Fonte Identificada ({analysis.percepcao.ouviu_dizer_especifico.length})
                    </h3>
                    <div className="space-y-2">
                      {analysis.percepcao.ouviu_dizer_especifico.map((item, i) => (
                        <div key={i} className="text-sm border-l-2 border-amber-300 dark:border-amber-700 pl-3">
                          <p className="text-zinc-700 dark:text-zinc-300">{item.fato}</p>
                          {item.fonte && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                              Fonte: {item.fonte}
                            </p>
                          )}
                          {item.timestamp_ref && (
                            <span className="text-[10px] text-zinc-400 font-mono">[{item.timestamp_ref}]</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ouviu Dizer — Boato */}
                {analysis.percepcao.ouviu_dizer_boato && analysis.percepcao.ouviu_dizer_boato.length > 0 && (
                  <div className="rounded-lg border border-orange-200 dark:border-orange-800 p-4">
                    <h3 className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5" />
                      Ouviu Dizer — Boato / Fama Pública ({analysis.percepcao.ouviu_dizer_boato.length})
                    </h3>
                    <div className="space-y-2">
                      {analysis.percepcao.ouviu_dizer_boato.map((item, i) => (
                        <div key={i} className="text-sm border-l-2 border-orange-300 dark:border-orange-700 pl-3">
                          <p className="text-zinc-700 dark:text-zinc-300">{item.fato}</p>
                          {item.timestamp_ref && (
                            <span className="text-[10px] text-zinc-400 font-mono">[{item.timestamp_ref}]</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Condições de Percepção */}
                {analysis.percepcao.condicoes_percepcao && (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                      Condições de Percepção
                    </h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {[
                        { label: "Iluminação", value: analysis.percepcao.condicoes_percepcao.iluminacao },
                        { label: "Distância", value: analysis.percepcao.condicoes_percepcao.distancia },
                        { label: "Estado Emocional", value: analysis.percepcao.condicoes_percepcao.estado_emocional },
                        { label: "Tempo Exposição", value: analysis.percepcao.condicoes_percepcao.tempo_exposicao },
                        { label: "Obstáculos", value: analysis.percepcao.condicoes_percepcao.obstaculos_visuais },
                        { label: "Intoxicação", value: analysis.percepcao.condicoes_percepcao.intoxicacao },
                      ]
                        .filter((c) => c.value)
                        .map((c, i) => (
                          <div key={i} className="text-sm">
                            <span className="text-zinc-500 text-xs">{c.label}:</span>
                            <p className="text-zinc-700 dark:text-zinc-300 font-medium">{c.value}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Tab: Destaques (Highlights) */}
          {activeTab === "destaques" && analysis && (
            <ScrollArea className="max-h-[55vh]">
              <div className="space-y-4 pr-3">
                {/* Highlights */}
                {analysis.highlights && analysis.highlights.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Highlighter className="h-3.5 w-3.5" />
                      Trechos Relevantes ({analysis.highlights.length})
                    </h3>
                    {analysis.highlights.map((h, i) => (
                      <div
                        key={i}
                        className={cn(
                          "border-l-4 rounded-r-md p-3 text-sm",
                          HIGHLIGHT_TYPE_COLORS[h.tipo ?? "relevante"] ?? HIGHLIGHT_TYPE_COLORS.relevante
                        )}
                      >
                        <p className="text-zinc-700 dark:text-zinc-300 italic">
                          &ldquo;{h.texto}&rdquo;
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {h.tipo && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] py-0 h-4",
                                h.tipo === "favoravel" && "border-emerald-300 text-emerald-600",
                                h.tipo === "desfavoravel" && "border-red-300 text-red-600",
                                h.tipo === "hearsay" && "border-orange-300 text-orange-600",
                                h.tipo === "contradicao" && "border-yellow-300 text-yellow-600",
                                h.tipo === "admissao" && "border-violet-300 text-violet-600",
                              )}
                            >
                              {h.tipo}
                            </Badge>
                          )}
                          {h.timestamp_ref && (
                            <span className="text-[10px] text-zinc-400 font-mono">[{h.timestamp_ref}]</span>
                          )}
                        </div>
                        {h.motivo && (
                          <p className="text-xs text-zinc-500 mt-1">{h.motivo}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
