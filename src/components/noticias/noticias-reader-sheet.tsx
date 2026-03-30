"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ExternalLink, Copy, Sparkles, X, ChevronDown, ChevronUp, Scale, ShieldCheck, Zap } from "lucide-react";
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

interface NoticiaReaderSheetProps {
  noticia: NoticiaJuridica;
  corFonte: string;
  isFavorito: boolean;
  onToggleFavorito: () => void;
  onClose: () => void;
}

export function NoticiaReaderSheet({
  noticia: noticiaInicial,
  corFonte,
  isFavorito,
  onToggleFavorito,
  onClose,
}: NoticiaReaderSheetProps) {
  const [iaExpanded, setIaExpanded] = useState(false);
  const [conteudoOverride, setConteudoOverride] = useState<string | null>(null);
  const utils = trpc.useUtils();

  // Fetch fresh data (conteudo is updated after approval enrichment)
  const { data: noticiaFresh, isLoading } = trpc.noticias.getById.useQuery(
    { id: noticiaInicial.id },
    { refetchOnWindowFocus: false }
  );

  const buscarConteudo = trpc.noticias.buscarConteudo.useMutation({
    onSuccess: (data) => {
      setConteudoOverride(data.conteudo);
      utils.noticias.getById.invalidate({ id: noticiaInicial.id });
    },
    onError: () => { /* silencioso — ainda mostramos resumo */ },
  });

  const noticia = noticiaFresh ?? noticiaInicial;
  const analise = noticia.analiseIa as AnaliseIA | null;
  const conteudoEfetivo = conteudoOverride ?? noticia.conteudo;
  const hasConteudo = conteudoEfetivo && conteudoEfetivo.length > 200;

  // Se não tem conteúdo após carregar, buscar automaticamente
  useEffect(() => {
    if (!isLoading && !hasConteudo && !buscarConteudo.isPending && !buscarConteudo.isSuccess) {
      buscarConteudo.mutate({ noticiaId: noticiaInicial.id });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasConteudo]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col">
        {/* Header fixo */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="font-medium capitalize"
                style={{ borderColor: corFonte, color: corFonte }}
              >
                {noticia.fonte.replace(/-/g, " ")}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {noticia.categoria}
              </Badge>
              {noticia.publicadoEm && (
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(noticia.publicadoEm), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onToggleFavorito}
                title={isFavorito ? "Remover dos salvos" : "Salvar"}
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    isFavorito ? "fill-amber-500 text-amber-500" : "text-muted-foreground"
                  )}
                />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a href={noticia.urlOriginal} target="_blank" rel="noopener noreferrer" title="Abrir original">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <h2
            className="text-lg font-bold text-zinc-900 dark:text-foreground mt-3 leading-snug"
            style={{ fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif" }}
          >
            {noticia.titulo}
          </h2>
        </div>

        <div className="px-6 py-5 space-y-5 flex-1">

          {/* AI insights — compact collapsible */}
          {analise && (
            <div className="border border-zinc-200 dark:border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setIaExpanded(!iaExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-muted/50 hover:bg-zinc-100 dark:hover:bg-muted transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-semibold text-zinc-700 dark:text-foreground/80 uppercase tracking-wide">
                    Análise IA
                  </span>
                  {!iaExpanded && analise.resumoExecutivo && (
                    <span className="text-xs text-zinc-500 dark:text-muted-foreground font-normal ml-1 line-clamp-1 max-w-xs">
                      — {analise.resumoExecutivo.substring(0, 80)}…
                    </span>
                  )}
                </div>
                {iaExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {iaExpanded && (
                <div className="px-4 py-4 space-y-4 bg-white dark:bg-background">
                  {/* Resumo executivo */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] font-semibold text-zinc-400 dark:text-muted-foreground/50 uppercase tracking-wider">
                        Resumo
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => copyText(analise.resumoExecutivo, "Resumo")}
                      >
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-foreground/80 leading-relaxed">
                      {analise.resumoExecutivo}
                    </p>
                  </div>

                  {/* Impacto + Ratio lado a lado se ambos existem */}
                  {analise.impactoPratico && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3 w-3 text-amber-500" />
                          <p className="text-[11px] font-semibold text-zinc-400 dark:text-muted-foreground/50 uppercase tracking-wider">
                            Impacto Prático
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => copyText(analise.impactoPratico, "Impacto")}
                        >
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-foreground/80 leading-relaxed">
                        {analise.impactoPratico}
                      </p>
                    </div>
                  )}

                  {/* Ratio Decidendi */}
                  {analise.ratioDecidendi && (
                    <div className="border-l-2 border-blue-300 dark:border-blue-700 pl-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Scale className="h-3 w-3 text-blue-500" />
                          <p className="text-[11px] font-semibold text-zinc-400 dark:text-muted-foreground/50 uppercase tracking-wider">
                            Ratio Decidendi
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => copyText(analise.ratioDecidendi!, "Ratio decidendi")}
                        >
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-muted-foreground italic leading-relaxed">
                        &ldquo;{analise.ratioDecidendi}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Casos aplicáveis */}
                  {analise.casosAplicaveis.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-zinc-400 dark:text-muted-foreground/50 uppercase tracking-wider mb-2">
                        Casos Aplicáveis
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {analise.casosAplicaveis.map(caso => (
                          <span
                            key={caso}
                            className="inline-flex items-center gap-1 text-xs bg-zinc-100 dark:bg-muted text-zinc-600 dark:text-foreground/80 rounded-full px-2.5 py-1"
                          >
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

          {/* Conteúdo principal */}
          <div>
            {(isLoading || buscarConteudo.isPending) ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-4 w-full rounded" />
              </div>
            ) : hasConteudo ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none prose-zinc prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-headings:text-zinc-800 dark:prose-headings:text-foreground prose-p:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: conteudoEfetivo! }}
              />
            ) : noticia.resumo ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-600 dark:text-muted-foreground leading-relaxed">
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
      </SheetContent>
    </Sheet>
  );
}
