"use client";

import { Star, Paperclip, ExternalLink, Sparkles, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { NoticiaJuridica } from "@/lib/db/schema";

type AnaliseIA = {
  resumoExecutivo: string;
  impactoPratico: string;
  ratioDecidendi?: string;
  casosAplicaveis: string[];
};

interface NoticiaCardFeaturedProps {
  noticia: NoticiaJuridica;
  corFonte: string;
  isFavorito: boolean;
  onToggleFavorito: () => void;
  onSalvarNoCaso: () => void;
  onClick: () => void;
}

export function NoticiaCardFeatured({
  noticia,
  corFonte,
  isFavorito,
  onToggleFavorito,
  onSalvarNoCaso,
  onClick,
}: NoticiaCardFeaturedProps) {
  const analise = noticia.analiseIa as AnaliseIA | null;
  const tags = (noticia.tags as string[]) ?? [];

  return (
    <div
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-500/40 hover:shadow-lg transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Barra colorida */}
      <div className="h-1" style={{ backgroundColor: corFonte }} />

      <div className="px-6 py-5">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
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
          {analise?.resumoExecutivo && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <Sparkles className="h-3 w-3" />
              Análise IA disponível
            </span>
          )}
          <span className="text-sm text-zinc-400 ml-auto">
            {noticia.publicadoEm
              ? formatDistanceToNow(new Date(noticia.publicadoEm), { addSuffix: true, locale: ptBR })
              : ""}
          </span>
        </div>

        {/* Título grande */}
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
          {noticia.titulo}
        </h2>

        {/* Resumo — IA ou original */}
        {analise?.resumoExecutivo ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4 line-clamp-3">
            {analise.resumoExecutivo}
          </p>
        ) : noticia.resumo ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed line-clamp-3">
            {noticia.resumo}
          </p>
        ) : null}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-4">
            {tags.slice(0, 5).map(tag => (
              <span
                key={tag}
                className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Ações */}
        <div
          className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex-wrap"
          onClick={e => e.stopPropagation()}
        >
          <Button
            variant="outline"
            size="sm"
            className={cn(isFavorito && "border-amber-300 bg-amber-50 dark:bg-amber-900/20")}
            onClick={onToggleFavorito}
          >
            <Star
              className={cn(
                "h-4 w-4 mr-1.5",
                isFavorito ? "fill-amber-500 text-amber-500" : "text-zinc-400"
              )}
            />
            {isFavorito ? "Salvo" : "Salvar"}
          </Button>
          <Button variant="outline" size="sm" onClick={onSalvarNoCaso}>
            <Paperclip className="h-4 w-4 mr-1.5 text-zinc-400" />
            Vincular Caso
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={onClick}
          >
            Ler artigo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href={noticia.urlOriginal} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Original
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
