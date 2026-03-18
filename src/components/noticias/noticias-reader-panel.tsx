"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star, ExternalLink, Copy, Sparkles, X, ChevronDown, ChevronUp,
  Scale, ShieldCheck, Zap, ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { NoticiaJuridica } from "@/lib/db/schema";

type AnaliseIA = {
  resumoExecutivo: string;
  impactoPratico: string;
  ratioDecidendi?: string;
  casosAplicaveis: string[];
};

const LABEL_FONTE: Record<string, string> = {
  "conjur": "ConJur",
  "stj-noticias": "STJ Notícias",
  "stj-not-cias": "STJ Notícias",
  "ibccrim": "IBCCRIM",
  "dizer-o-direito": "Dizer o Direito",
  "tudo-de-penal": "Tudo de Penal",
  "canal-ciencias-criminais": "Canal Ciências Criminais",
  "canal-ciências-criminais": "Canal Ciências Criminais",
  "emporio-do-direito": "Empório do Direito",
  "empório-do-direito": "Empório do Direito",
  "stf-noticias": "STF Notícias",
  "stf-notícias": "STF Notícias",
  "jota": "JOTA",
};

const LABEL_CATEGORIA: Record<string, string> = {
  legislativa: "Legislativa",
  jurisprudencial: "Jurisprudencial",
  artigo: "Artigo",
};

interface NoticiaReaderPanelProps {
  noticia: NoticiaJuridica;
  corFonte: string;
  isFavorito: boolean;
  onToggleFavorito: () => void;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function NoticiaReaderPanel({
  noticia: noticiaInicial,
  corFonte,
  isFavorito,
  onToggleFavorito,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: NoticiaReaderPanelProps) {
  const [iaExpanded, setIaExpanded] = useState(true);
  const [conteudoOverride, setConteudoOverride] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: noticiaFresh, isLoading } = trpc.noticias.getById.useQuery(
    { id: noticiaInicial.id },
    { refetchOnWindowFocus: false }
  );

  const buscarConteudo = trpc.noticias.buscarConteudo.useMutation({
    onSuccess: (data) => {
      setConteudoOverride(data.conteudo);
      utils.noticias.getById.invalidate({ id: noticiaInicial.id });
    },
  });

  const enriquecerComIA = trpc.noticias.enriquecerComIA.useMutation({
    onSuccess: () => {
      utils.noticias.getById.invalidate({ id: noticiaInicial.id });
      toast.success("Re-análise concluída");
    },
    onError: () => toast.error("Erro ao re-analisar"),
  });

  const noticia = noticiaFresh ?? noticiaInicial;
  const analise = noticia.analiseIa as AnaliseIA | null;
  const conteudoEfetivo = conteudoOverride ?? noticia.conteudo;
  const hasConteudo = conteudoEfetivo && conteudoEfetivo.length > 200;
  const nomeFonte = LABEL_FONTE[noticia.fonte.toLowerCase()] ?? noticia.fonte.replace(/-/g, " ");
  const nomeCategoria = LABEL_CATEGORIA[noticia.categoria] ?? noticia.categoria;

  useEffect(() => {
    setConteudoOverride(null);
    setIaExpanded(true);
  }, [noticiaInicial.id]);

  useEffect(() => {
    if (!isLoading && !hasConteudo && !buscarConteudo.isPending && !buscarConteudo.isSuccess) {
      buscarConteudo.mutate({ noticiaId: noticiaInicial.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasConteudo, noticiaInicial.id]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
    if (e.key === "Escape") onClose();
    if (e.key === "s" || e.key === "S") onToggleFavorito();
    if ((e.key === "j" || e.key === "J") && hasNext) onNext?.();
    if ((e.key === "k" || e.key === "K") && hasPrevious) onPrevious?.();
  }, [onClose, onToggleFavorito, hasNext, hasPrevious, onNext, onPrevious]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
      {/* Acento de cor da fonte no topo */}
      <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: corFonte }} />

      {/* Header */}
      <div className="px-8 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        {/* Linha 1: meta + ações */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="text-xs font-semibold"
              style={{ borderColor: corFonte, color: corFonte }}
            >
              {nomeFonte}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">
              {nomeCategoria}
            </Badge>
            {noticia.publicadoEm && (
              <span className="text-xs text-zinc-400">
                {formatDistanceToNow(new Date(noticia.publicadoEm), { addSuffix: true, locale: ptBR })}
              </span>
            )}
          </div>

          {/* Toolbar de ações */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost" size="icon" className="h-8 w-8"
              onClick={onPrevious} disabled={!hasPrevious}
              title="Anterior (K)"
            >
              <ChevronLeft className="h-4 w-4 text-zinc-400" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-8 w-8"
              onClick={onNext} disabled={!hasNext}
              title="Próxima (J)"
            >
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </Button>

            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />

            <Button
              variant="ghost" size="icon" className="h-8 w-8"
              onClick={onToggleFavorito}
              title={isFavorito ? "Remover dos salvos (S)" : "Salvar (S)"}
            >
              <Star className={cn("h-4 w-4", isFavorito ? "fill-amber-500 text-amber-500" : "text-zinc-400")} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href={noticia.urlOriginal} target="_blank" rel="noopener noreferrer" title="Abrir original">
                <ExternalLink className="h-4 w-4 text-zinc-400" />
              </a>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} title="Fechar (Esc)">
              <X className="h-4 w-4 text-zinc-400" />
            </Button>
          </div>
        </div>

        {/* Linha 2: título completo */}
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
          {noticia.titulo}
        </h2>
      </div>

      {/* Conteúdo com scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-6 space-y-6 max-w-4xl">

          {/* Caixa Resumo IA */}
          {analise && (
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setIaExpanded(!iaExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                    Resumo IA
                  </span>
                  {!iaExpanded && analise.resumoExecutivo && (
                    <span className="text-xs text-zinc-400 font-normal line-clamp-1 max-w-[300px]">
                      — {analise.resumoExecutivo.substring(0, 80)}…
                    </span>
                  )}
                </div>
                {iaExpanded
                  ? <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                }
              </button>

              {iaExpanded && (
                <div className="px-5 py-5 space-y-5 bg-white dark:bg-zinc-900">

                  {/* Síntese */}
                  {analise.resumoExecutivo && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Síntese</p>
                        <Button variant="ghost" size="icon" className="h-5 w-5"
                          onClick={() => copyText(analise.resumoExecutivo, "Síntese")}>
                          <Copy className="h-3 w-3 text-zinc-400" />
                        </Button>
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {analise.resumoExecutivo}
                      </p>
                    </div>
                  )}

                  {/* Impacto prático */}
                  {analise.impactoPratico && (
                    <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl px-4 py-3">
                      <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                          Impacto prático
                        </p>
                        <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                          {analise.impactoPratico}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0"
                        onClick={() => copyText(analise.impactoPratico, "Impacto")}>
                        <Copy className="h-3 w-3 text-emerald-500" />
                      </Button>
                    </div>
                  )}

                  {/* Ratio decidendi */}
                  {analise.ratioDecidendi && (
                    <div className="border-l-2 border-blue-300 dark:border-blue-700 pl-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Scale className="h-3 w-3 text-blue-500" />
                          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Ratio decidendi</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-5 w-5"
                          onClick={() => copyText(analise.ratioDecidendi!, "Ratio")}>
                          <Copy className="h-3 w-3 text-zinc-400" />
                        </Button>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 italic leading-relaxed">
                        &ldquo;{analise.ratioDecidendi}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Casos aplicáveis */}
                  {analise.casosAplicaveis.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Casos aplicáveis
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {analise.casosAplicaveis.map(caso => (
                          <span key={caso}
                            className="inline-flex items-center gap-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full px-2.5 py-1">
                            <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                            {caso}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Separador artigo */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest whitespace-nowrap">
              Artigo completo
            </span>
            <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
          </div>

          {/* Conteúdo do artigo — tipografia editorial */}
          <div className="max-w-[65ch] mx-auto pb-8">
            {(isLoading || buscarConteudo.isPending) ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className={cn("h-4 rounded", i % 4 === 3 ? "w-2/3" : "w-full")} />
                ))}
              </div>
            ) : hasConteudo ? (
              <div
                className={cn(
                  "prose prose-base dark:prose-invert max-w-none",
                  "prose-zinc",
                  // Tipografia editorial: serif no corpo
                  "[&_p]:font-[family-name:var(--font-serif)] [&_p]:text-[17px] [&_p]:leading-[1.85] [&_p]:text-zinc-700 dark:[&_p]:text-zinc-300",
                  "[&_li]:font-[family-name:var(--font-serif)] [&_li]:text-[17px] [&_li]:leading-[1.85]",
                  // Títulos sem-serif, bold
                  "prose-headings:font-sans prose-headings:font-bold prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100 prose-headings:tracking-tight",
                  // Links
                  "prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline",
                  // Blockquote
                  "prose-blockquote:border-l-emerald-400 prose-blockquote:text-zinc-600 dark:prose-blockquote:text-zinc-400",
                  // Strong
                  "prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100 prose-strong:font-semibold",
                )}
                dangerouslySetInnerHTML={{ __html: conteudoEfetivo! }}
              />
            ) : noticia.resumo ? (
              <div className="space-y-5">
                <p
                  className="font-[family-name:var(--font-serif)] text-[17px] leading-[1.85] text-zinc-700 dark:text-zinc-300"
                >
                  {noticia.resumo}
                </p>
                <a
                  href={noticia.urlOriginal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ler artigo completo no site original
                </a>
              </div>
            ) : (
              <a
                href={noticia.urlOriginal}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ler artigo completo no site original
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 px-8 py-3 flex items-center gap-2 shrink-0">
        <Button
          variant="ghost" size="sm" className="text-xs text-zinc-500 gap-1.5"
          onClick={() => enriquecerComIA.mutate({ noticiaId: noticia.id })}
          disabled={enriquecerComIA.isPending}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", enriquecerComIA.isPending && "animate-spin")} />
          Re-analisar IA
        </Button>
        <span className="text-[10px] text-zinc-300 dark:text-zinc-700 ml-auto">
          J próxima · K anterior · S salvar · Esc fechar
        </span>
      </div>
    </div>
  );
}
