"use client";

import { Star, Paperclip, ExternalLink } from "lucide-react";
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

interface NoticiaCardProps {
  noticia: NoticiaJuridica;
  corFonte: string;
  isFavorito: boolean;
  onToggleFavorito: () => void;
  onSalvarNoCaso: () => void;
  onClick: () => void;
}

export function NoticiaCard({
  noticia,
  corFonte,
  isFavorito,
  onToggleFavorito,
  onSalvarNoCaso,
  onClick,
}: NoticiaCardProps) {
  const analise = noticia.analiseIa as AnaliseIA | null;
  const tags = (noticia.tags as string[]) ?? [];

  return (
    <div
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Barra colorida da fonte */}
      <div className="h-1" style={{ backgroundColor: corFonte }} />

      <div className="p-4">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge
            variant="outline"
            className="text-xs font-medium capitalize"
            style={{ borderColor: corFonte, color: corFonte }}
          >
            {noticia.fonte.replace(/-/g, " ")}
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize">
            {noticia.categoria}
          </Badge>
          <span className="text-xs text-zinc-400 ml-auto">
            {noticia.publicadoEm
              ? formatDistanceToNow(new Date(noticia.publicadoEm), { addSuffix: true, locale: ptBR })
              : ""}
          </span>
        </div>

        {/* Título */}
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 mb-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
          {noticia.titulo}
        </h3>

        {/* Preview IA ou resumo */}
        {analise?.resumoExecutivo ? (
          <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-lg px-3 py-2 mb-3">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 italic line-clamp-2">
              {analise.resumoExecutivo}
            </p>
          </div>
        ) : noticia.resumo ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
            {noticia.resumo}
          </p>
        ) : null}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-3">
            {tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded px-1.5 py-0.5"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-zinc-400">+{tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Ações */}
        <div
          className="flex items-center gap-1"
          onClick={e => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleFavorito}
            title={isFavorito ? "Remover dos salvos" : "Salvar"}
          >
            <Star
              className={cn(
                "h-3.5 w-3.5",
                isFavorito ? "fill-amber-500 text-amber-500" : "text-zinc-400"
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onSalvarNoCaso}
            title="Vincular a caso"
          >
            <Paperclip className="h-3.5 w-3.5 text-zinc-400" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" asChild>
            <a
              href={noticia.urlOriginal}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir original"
            >
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
