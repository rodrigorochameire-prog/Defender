"use client";

import { Star, Paperclip, ExternalLink, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
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

  const copyRatio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (analise?.ratioDecidendi) {
      navigator.clipboard.writeText(analise.ratioDecidendi);
      toast.success("Ratio decidendi copiado");
    }
  };

  return (
    <div
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-500/40 hover:shadow-lg transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Barra colorida mais grossa */}
      <div className="h-1.5" style={{ backgroundColor: corFonte }} />

      <div className="p-6">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
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
          <span className="text-sm text-zinc-400 ml-auto">
            {noticia.publicadoEm
              ? formatDistanceToNow(new Date(noticia.publicadoEm), { addSuffix: true, locale: ptBR })
              : ""}
          </span>
        </div>

        {/* Título grande */}
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
          {noticia.titulo}
        </h2>

        {/* Blocos IA */}
        {analise ? (
          <div className="space-y-3 mb-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">
                Resumo IA
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {analise.resumoExecutivo}
              </p>
            </div>

            {analise.ratioDecidendi && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                    Ratio Decidendi
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={copyRatio}
                    title="Copiar ratio"
                  >
                    <Copy className="h-3 w-3 text-blue-400" />
                  </Button>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 italic">
                  &ldquo;{analise.ratioDecidendi}&rdquo;
                </p>
              </div>
            )}

            {analise.casosAplicaveis.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {analise.casosAplicaveis.map(caso => (
                  <span
                    key={caso}
                    className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full px-2.5 py-1"
                  >
                    {caso}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : noticia.resumo ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
            {noticia.resumo}
          </p>
        ) : null}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-4">
            {tags.map(tag => (
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
          className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800"
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
          {analise?.ratioDecidendi && (
            <Button variant="outline" size="sm" onClick={copyRatio}>
              <Copy className="h-4 w-4 mr-1.5 text-zinc-400" />
              Copiar Ratio
            </Button>
          )}
          <Button variant="ghost" size="sm" className="ml-auto" asChild>
            <a href={noticia.urlOriginal} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Abrir Original
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
