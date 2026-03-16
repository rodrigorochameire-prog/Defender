"use client";

import { useState, useMemo } from "react";
import { ExternalLink, Copy, Newspaper, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

// Map fonte colors
const FONTE_CORES: Record<string, string> = {
  "conjur": "#dc2626",
  "stj-notícias": "#1d4ed8",
  "ibccrim": "#7c3aed",
  "dizer-o-direito": "#059669",
};

type Props = {
  categoria: "legislativa" | "jurisprudencial" | "artigo";
};

export function NoticiasFeed({ categoria }: Props) {
  const [busca, setBusca] = useState("");
  const [debouncedBusca, setDebouncedBusca] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [cursor, setCursor] = useState<number | undefined>(undefined);

  // Debounce search
  // Use a simple timeout-based approach
  const handleSearchChange = (value: string) => {
    setBusca(value);
    // Reset cursor on new search
    setCursor(undefined);
    // Simple debounce using setTimeout
    const timer = setTimeout(() => setDebouncedBusca(value), 300);
    return () => clearTimeout(timer);
  };

  const { data, isLoading } = trpc.noticias.list.useQuery({
    categoria,
    busca: debouncedBusca || undefined,
    status: "aprovado",
    limit: 20,
    cursor,
  });

  const formatDate = (date: string | Date | null) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-6 py-3 border-b">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Buscar notícias..."
            value={busca}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <Newspaper className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Nenhuma notícia encontrada</p>
            <p className="text-sm">Notícias {categoria}s aparecerão aqui após aprovação</p>
          </div>
        ) : (
          <>
            {items.map((item) => {
              const isExpanded = expandedId === item.id;
              const fonteColor = FONTE_CORES[item.fonte] || "#71717a";
              const tags = (item.tags as string[]) || [];

              return (
                <div
                  key={item.id}
                  className={cn(
                    "border rounded-lg transition-all",
                    isExpanded
                      ? "border-emerald-500/30 shadow-md"
                      : "hover:border-emerald-500/20 hover:shadow-sm cursor-pointer"
                  )}
                >
                  {/* Card header — always visible */}
                  <div
                    className="p-4"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: fonteColor }}
                        >
                          {item.fonte}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {formatDate(item.publicadoEm)}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                      )}
                    </div>

                    <h3 className="font-semibold text-base mb-1 line-clamp-2">
                      {item.titulo}
                    </h3>

                    {!isExpanded && item.resumo && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {item.resumo}
                      </p>
                    )}

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expanded content */}
                  {isExpanded && item.conteudo && (
                    <div className="border-t px-4 py-4">
                      <div
                        className="prose prose-zinc dark:prose-invert prose-sm max-w-none mb-4"
                        dangerouslySetInnerHTML={{ __html: item.conteudo }}
                      />
                      <div className="flex items-center gap-2 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(item.urlOriginal, "_blank");
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Abrir Original
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(item.urlOriginal);
                          }}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copiar Link
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Load more */}
            {data?.nextCursor && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={() => setCursor(data.nextCursor)}
                >
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
