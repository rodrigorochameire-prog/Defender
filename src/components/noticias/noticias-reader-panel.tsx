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

  // Reset state quando muda de notícia
  useEffect(() => {
    setConteudoOverride(null);
    setIaExpanded(true);
  }, [noticiaInicial.id]);

  // Busca conteúdo automaticamente se não tiver
  useEffect(() => {
    if (!isLoading && !hasConteudo && !buscarConteudo.isPending && !buscarConteudo.isSuccess) {
      buscarConteudo.mutate({ noticiaId: noticiaInicial.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasConteudo, noticiaInicial.id]);

  // Atalhos de teclado
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Não captura se estiver em input/textarea
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
    <div className="flex flex-col h-full border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-5 py-3">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="font-medium text-xs capitalize"
              style={{ borderColor: corFonte, color: corFonte }}
            >
              {nomeFonte}
            </Badge>
            <Badge variant="secondary" className="capitalize text-xs">
              {noticia.categoria}
            </Badge>
            {noticia.publicadoEm && (
              <span className="text-xs text-zinc-400">
                {formatDistanceToNow(new Date(noticia.publicadoEm), { addSuffix: true, locale: ptBR })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {/* Navegação J/K */}
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={onPrevious} disabled={!hasPrevious}
              title="Anterior (K)"
            >
              <ChevronLeft className="h-4 w-4 text-zinc-400" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={onNext} disabled={!hasNext}
              title="Próxima (J)"
            >
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </Button>

            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />

            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={onToggleFavorito}
              title={isFavorito ? "Remover dos salvos (S)" : "Salvar (S)"}
            >
              <Star className={cn("h-4 w-4", isFavorito ? "fill-amber-500 text-amber-500" : "text-zinc-400")} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={noticia.urlOriginal} target="_blank" rel="noopener noreferrer" title="Abrir original">
                <ExternalLink className="h-4 w-4 text-zinc-400" />
              </a>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Fechar (Esc)">
              <X className="h-4 w-4 text-zinc-400" />
            </Button>
          </div>
        </div>

        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-3">
          {noticia.titulo}
        </h2>
      </div>

      {/* Conteúdo com scroll */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

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
                  <span className="text-xs text-zinc-400 font-normal line-clamp-1 max-w-[200px]">
                    — {analise.resumoExecutivo.substring(0, 70)}…
                  </span>
                )}
              </div>
              {iaExpanded
                ? <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
                : <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
              }
            </button>

            {iaExpanded && (
              <div className="px-4 py-4 space-y-4 bg-white dark:bg-zinc-900">

                {/* Síntese */}
                {analise.resumoExecutivo && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
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
                  <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2.5">
                    <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
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
                  <div className="border-l-2 border-blue-300 dark:border-blue-700 pl-3">
                    <div className="flex items-center justify-between mb-1">
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
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Artigo completo</span>
          <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
        </div>

        {/* Conteúdo do artigo */}
        <div>
          {(isLoading || buscarConteudo.isPending) ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className={cn("h-4 rounded", i % 3 === 2 ? "w-3/4" : "w-full")} />
              ))}
            </div>
          ) : hasConteudo ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none prose-zinc prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-headings:text-zinc-800 dark:prose-headings:text-zinc-200 prose-p:leading-relaxed prose-p:text-zinc-700 dark:prose-p:text-zinc-300"
              dangerouslySetInnerHTML={{ __html: conteudoEfetivo! }}
            />
          ) : noticia.resumo ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{noticia.resumo}</p>
              <a href={noticia.urlOriginal} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                <ExternalLink className="h-3.5 w-3.5" />
                Ler artigo completo no site original
              </a>
            </div>
          ) : (
            <a href={noticia.urlOriginal} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
              <ExternalLink className="h-3.5 w-3.5" />
              Ler artigo completo no site original
            </a>
          )}
        </div>
      </div>

      {/* Footer com ações */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-3 flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-xs text-zinc-500 gap-1.5"
          onClick={() => enriquecerComIA.mutate({ noticiaId: noticia.id })}
          disabled={enriquecerComIA.isPending}>
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
