"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ExternalLink, Copy, Sparkles, X } from "lucide-react";
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
  noticia,
  corFonte,
  isFavorito,
  onToggleFavorito,
  onClose,
}: NoticiaReaderSheetProps) {
  const [analise, setAnalise] = useState<AnaliseIA | null>(
    noticia.analiseIa as AnaliseIA | null
  );

  const enriquecer = trpc.noticias.enriquecerComIA.useMutation({
    onSuccess: (data) => setAnalise(data as AnaliseIA),
    onError: () => toast.error("Erro ao analisar com IA"),
  });

  // Lazy enrichment: enriquecer ao abrir se não tiver análise
  useEffect(() => {
    if (!analise && !enriquecer.isPending) {
      enriquecer.mutate({ noticiaId: noticia.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticia.id]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
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
                <span className="text-sm text-zinc-400">
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
                    isFavorito ? "fill-amber-500 text-amber-500" : "text-zinc-400"
                  )}
                />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a href={noticia.urlOriginal} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 text-zinc-400" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-3 leading-snug">
            {noticia.titulo}
          </h2>
        </div>

        <div className="px-6 py-6 space-y-4">
          {/* Header blocos IA */}
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Análise com IA
            </span>
          </div>

          {/* Loading IA */}
          {enriquecer.isPending && !analise && (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          )}

          {/* Blocos IA */}
          {analise && (
            <div className="space-y-3">
              {/* Resumo executivo */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    Resumo Executivo
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyText(analise.resumoExecutivo, "Resumo")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {analise.resumoExecutivo}
                </p>
              </div>

              {/* Impacto prático */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    Impacto Prático
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyText(analise.impactoPratico, "Impacto prático")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {analise.impactoPratico}
                </p>
              </div>

              {/* Ratio decidendi */}
              {analise.ratioDecidendi && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                      Ratio Decidendi
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyText(analise.ratioDecidendi!, "Ratio decidendi")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 italic leading-relaxed">
                    &ldquo;{analise.ratioDecidendi}&rdquo;
                  </p>
                </div>
              )}

              {/* Casos aplicáveis */}
              {analise.casosAplicaveis.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                    Casos Aplicáveis
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {analise.casosAplicaveis.map(caso => (
                      <span
                        key={caso}
                        className="text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full px-3 py-1"
                      >
                        {caso}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conteúdo original */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-4">
              Conteúdo Original
            </p>
            {noticia.conteudo ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none prose-zinc prose-a:text-emerald-600 dark:prose-a:text-emerald-400"
                dangerouslySetInnerHTML={{ __html: noticia.conteudo }}
              />
            ) : noticia.resumo ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {noticia.resumo}
              </p>
            ) : (
              <a
                href={noticia.urlOriginal}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-600 hover:underline"
              >
                Ler artigo completo no site original →
              </a>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
