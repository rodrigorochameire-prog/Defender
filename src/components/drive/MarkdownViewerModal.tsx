"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X,
  FileText,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mic,
  Users,
  Clock,
  MessageSquare,
  ClipboardList,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

// ─── Types ──────────────────────────────────────────────────────────

interface PlaudMetadata {
  sub_type?: string;
  transcript?: string;
  transcript_plain?: string;
  speakers?: Array<{ id?: string; name?: string }> | string[];
  summary?: string;
  interlocutor?: { tipo?: string; observacao?: string };
  tipo_gravacao?: string;
  plaud_recording_id?: number;
  atendimento_id?: number;
  analysis?: {
    resumo_defesa?: string;
    pontos_favoraveis?: Array<{ ponto: string; relevancia?: string }>;
    pontos_desfavoraveis?: Array<{ ponto: string; relevancia?: string }>;
    contradicoes?: Array<{ fato_1: string; fato_2: string; analise: string }>;
    highlights?: Array<{ texto: string; tipo: string; motivo?: string }>;
    providencias?: string[];
  };
  progress?: { step?: string; percent?: number; detail?: string };
}

interface MarkdownViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileId?: string; // driveFileId for proxy fetch
  content?: string; // pre-loaded content (skip fetch)
  enrichmentData?: PlaudMetadata;
  webViewLink?: string;
}

// ─── Component ──────────────────────────────────────────────────────

export function MarkdownViewerModal({
  isOpen,
  onClose,
  fileName,
  fileId,
  content: preloadedContent,
  enrichmentData,
  webViewLink,
}: MarkdownViewerModalProps) {
  const [content, setContent] = useState<string | null>(preloadedContent || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPlaud = enrichmentData?.sub_type === "transcricao_plaud";
  const analysis = enrichmentData?.analysis;

  // Fetch content from Drive proxy
  useEffect(() => {
    if (!isOpen || preloadedContent || !fileId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/drive/proxy?fileId=${fileId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        setContent(text);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, fileId, preloadedContent]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      if (!preloadedContent) setContent(null);
      setError(null);
    }
  }, [isOpen, preloadedContent]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={cn(
          "relative flex bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden",
          "w-[95vw] h-[90vh] max-w-7xl",
        )}
      >
        {/* ── Main Content ── */}
        <div className={cn("flex-1 flex flex-col min-w-0", isPlaud && "border-r border-zinc-200 dark:border-zinc-700")}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-5 h-5 text-violet-500 shrink-0" />
              <h2 className="text-sm font-semibold truncate">{fileName}</h2>
              {isPlaud && <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px]">plaud</Badge>}
            </div>
            <div className="flex items-center gap-1">
              {webViewLink && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={webViewLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-red-500">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm">Erro ao carregar: {error}</p>
              </div>
            )}
            {content && !loading && (
              <article className="prose prose-zinc dark:prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </article>
            )}
          </div>
        </div>

        {/* ── Sidebar (Plaud metadata) ── */}
        {isPlaud && (
          <div className="w-80 shrink-0 flex flex-col overflow-y-auto bg-zinc-50 dark:bg-zinc-800/30">
            <div className="p-4 space-y-4">
              {/* Metadata chips */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Metadados</h3>
                <div className="flex flex-wrap gap-1.5">
                  {enrichmentData?.tipo_gravacao && (
                    <Badge variant="outline" className="text-[10px]">
                      <Mic className="w-3 h-3 mr-1" />
                      {enrichmentData.tipo_gravacao}
                    </Badge>
                  )}
                  {enrichmentData?.interlocutor?.tipo && (
                    <Badge variant="outline" className="text-[10px]">
                      <Users className="w-3 h-3 mr-1" />
                      {enrichmentData.interlocutor.tipo}
                    </Badge>
                  )}
                  {enrichmentData?.atendimento_id && (
                    <Badge variant="outline" className="text-[10px]">
                      <ClipboardList className="w-3 h-3 mr-1" />
                      Atendimento #{enrichmentData.atendimento_id}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Resumo IA */}
              {(analysis?.resumo_defesa || enrichmentData?.summary) && (
                <SidebarSection title="Resumo IA" icon={<Sparkles className="w-3.5 h-3.5" />} defaultOpen>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {analysis?.resumo_defesa || enrichmentData?.summary}
                  </p>
                </SidebarSection>
              )}

              {/* Pontos favoraveis */}
              {analysis?.pontos_favoraveis && analysis.pontos_favoraveis.length > 0 && (
                <SidebarSection title={`Pontos Favoraveis (${analysis.pontos_favoraveis.length})`} icon={<BookOpen className="w-3.5 h-3.5 text-emerald-500" />}>
                  <ul className="space-y-1">
                    {analysis.pontos_favoraveis.map((p, i) => (
                      <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex gap-1.5">
                        <span className="text-emerald-500 shrink-0">+</span>
                        {p.ponto}
                      </li>
                    ))}
                  </ul>
                </SidebarSection>
              )}

              {/* Pontos desfavoraveis */}
              {analysis?.pontos_desfavoraveis && analysis.pontos_desfavoraveis.length > 0 && (
                <SidebarSection title={`Pontos Desfavoraveis (${analysis.pontos_desfavoraveis.length})`} icon={<AlertCircle className="w-3.5 h-3.5 text-red-500" />}>
                  <ul className="space-y-1">
                    {analysis.pontos_desfavoraveis.map((p, i) => (
                      <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex gap-1.5">
                        <span className="text-red-500 shrink-0">-</span>
                        {p.ponto}
                      </li>
                    ))}
                  </ul>
                </SidebarSection>
              )}

              {/* Contradicoes */}
              {analysis?.contradicoes && analysis.contradicoes.length > 0 && (
                <SidebarSection title={`Contradicoes (${analysis.contradicoes.length})`} icon={<MessageSquare className="w-3.5 h-3.5 text-amber-500" />}>
                  <ul className="space-y-2">
                    {analysis.contradicoes.map((c, i) => (
                      <li key={i} className="text-xs space-y-0.5">
                        <p className="text-zinc-600 dark:text-zinc-400">1: {c.fato_1}</p>
                        <p className="text-zinc-600 dark:text-zinc-400">2: {c.fato_2}</p>
                        <p className="text-amber-600 dark:text-amber-400 italic">{c.analise}</p>
                      </li>
                    ))}
                  </ul>
                </SidebarSection>
              )}

              {/* Providencias */}
              {analysis?.providencias && analysis.providencias.length > 0 && (
                <SidebarSection title={`Providencias (${analysis.providencias.length})`} icon={<ClipboardList className="w-3.5 h-3.5 text-blue-500" />}>
                  <ul className="space-y-1">
                    {analysis.providencias.map((p, i) => (
                      <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex gap-1.5">
                        <span className="text-blue-500 shrink-0">{i + 1}.</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </SidebarSection>
              )}

              {/* Analysis in progress */}
              {enrichmentData?.progress && enrichmentData.progress.step !== "completed" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <div>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      {enrichmentData.progress.detail || "Analisando..."}
                    </p>
                    {enrichmentData.progress.percent && (
                      <div className="w-full h-1 bg-amber-200 rounded mt-1">
                        <div className="h-1 bg-amber-500 rounded" style={{ width: `${enrichmentData.progress.percent}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar Section ────────────────────────────────────────────────

function SidebarSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-left hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-md px-2 py-1.5 transition-colors">
        {icon}
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex-1">{title}</span>
        {open ? <ChevronUp className="w-3 h-3 text-zinc-400" /> : <ChevronDown className="w-3 h-3 text-zinc-400" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pt-1 pb-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
