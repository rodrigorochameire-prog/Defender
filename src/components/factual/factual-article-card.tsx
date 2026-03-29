"use client";

import { useState } from "react";
import {
  Star,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FactualArticleCardProps {
  id: number;
  titulo: string;
  resumo: string;
  fonteNome: string;
  fonteUrl: string;
  destaque?: boolean;
  isFavorito?: boolean;
  onToggleFavorito?: (id: number) => void;
}

export function FactualArticleCard({
  id,
  titulo,
  resumo,
  fonteNome,
  fonteUrl,
  destaque = false,
  isFavorito = false,
  onToggleFavorito,
}: FactualArticleCardProps) {
  const [expanded, setExpanded] = useState(false);

  const paragraphs = resumo.split("\n\n").filter(Boolean);
  const firstParagraph = paragraphs[0] ?? "";
  const restParagraphs = paragraphs.slice(1);
  const hasMore = restParagraphs.length > 0;

  return (
    <article
      className={cn(
        "group relative rounded-lg border transition-colors duration-200",
        "border-zinc-200 bg-white hover:border-zinc-300",
        "dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700",
        destaque && "border-l-4 border-l-[#1a1a2e] dark:border-l-amber-500"
      )}
    >
      <div className="p-4 sm:p-5">
        {/* Header: title + favorite */}
        <div className="flex items-start justify-between gap-3">
          <h3
            className={cn(
              "leading-snug font-semibold",
              "text-zinc-900 dark:text-zinc-100",
              destaque
                ? "text-xl sm:text-2xl"
                : "text-base sm:text-lg"
            )}
            style={{
              fontFamily:
                "'Playfair Display', Georgia, 'Times New Roman', serif",
            }}
          >
            {titulo}
          </h3>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleFavorito?.(id)}
            className={cn(
              "shrink-0 h-8 w-8 p-0",
              isFavorito
                ? "text-amber-500 hover:text-amber-600"
                : "text-zinc-400 hover:text-amber-500"
            )}
            aria-label={isFavorito ? "Remover dos salvos" : "Salvar artigo"}
          >
            <Star
              className="h-4 w-4"
              fill={isFavorito ? "currentColor" : "none"}
            />
          </Button>
        </div>

        {/* Body */}
        <div className="mt-3">
          <p
            className={cn(
              "leading-relaxed",
              "text-zinc-700 dark:text-zinc-300",
              destaque ? "text-base" : "text-sm"
            )}
          >
            {firstParagraph}
          </p>

          {/* Expandable content */}
          {hasMore && (
            <div
              className={cn(
                "grid transition-all duration-300 ease-in-out",
                expanded
                  ? "grid-rows-[1fr] opacity-100 mt-3"
                  : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="space-y-3">
                  {restParagraphs.map((p, i) => (
                    <p
                      key={i}
                      className={cn(
                        "leading-relaxed",
                        "text-zinc-700 dark:text-zinc-300",
                        destaque ? "text-base" : "text-sm"
                      )}
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer: source + expand toggle */}
        <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <a
            href={fonteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
              "text-[#1a1a2e]/70 hover:text-[#1a1a2e]",
              "dark:text-zinc-400 dark:hover:text-amber-400"
            )}
          >
            <span>Ler na fonte</span>
            <span className="font-normal">&rarr;</span>
            <span>{fonteNome}</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((prev) => !prev)}
              className="h-7 gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {expanded ? (
                <>
                  Ler menos
                  <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Ler mais
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
