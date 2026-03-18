"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { isToday, isYesterday, isThisWeek } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { RadarNoticiaCard } from "./radar-noticia-card";
import { RadarNoticiaSheet } from "./radar-noticia-sheet";
import { Radio, Newspaper, Download, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportNoticiasToCsv } from "@/lib/radar-export";
import { cn } from "@/lib/utils";

interface FiltrosState {
  tipoCrime?: string;
  bairro?: string;
  fonte?: string;
  search?: string;
  dataInicio?: string;
  dataFim?: string;
  soMatches: boolean;
  circunstancia?: string;
  relevanciaMin?: number;
}

interface RadarFeedProps {
  filtros: FiltrosState;
}

function groupByDate<T extends { dataFato?: Date | string | null; dataPublicacao?: Date | string | null; createdAt?: Date | string | null }>(
  noticias: T[]
): { label: string; items: T[] }[] {
  const groups: Record<string, T[]> = {
    "Hoje": [],
    "Ontem": [],
    "Esta semana": [],
    "Mais antigas": [],
  };

  noticias.forEach((n) => {
    const raw = n.dataFato || n.dataPublicacao || n.createdAt;
    if (!raw) {
      groups["Mais antigas"].push(n);
      return;
    }
    const d = new Date(raw as string | Date);
    if (isToday(d)) groups["Hoje"].push(n);
    else if (isYesterday(d)) groups["Ontem"].push(n);
    else if (isThisWeek(d, { weekStartsOn: 0 })) groups["Esta semana"].push(n);
    else groups["Mais antigas"].push(n);
  });

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export function RadarFeed({ filtros }: RadarFeedProps) {
  const [selectedNoticiaId, setSelectedNoticiaId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.radar.list.useInfiniteQuery(
    {
      tipoCrime: filtros.tipoCrime,
      bairro: filtros.bairro,
      fonte: filtros.fonte,
      search: filtros.search,
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
      soMatches: filtros.soMatches,
      circunstancia: filtros.circunstancia,
      relevanciaMin: filtros.relevanciaMin,
      limit: 20,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  const allNoticias = data?.pages.flatMap((page) => page.items) ?? [];

  // IDs das notícias que têm matches (para buscar detalhes dos pendentes)
  const noticiaIdsComMatch = allNoticias
    .filter((n) => ((n as any).matchCount ?? 0) > 0)
    .map((n) => n.id);

  const utils = trpc.useUtils();

  const { data: matchesPendentes } = trpc.radar.matchesPendentesByNoticias.useQuery(
    { noticiaIds: noticiaIdsComMatch },
    { enabled: noticiaIdsComMatch.length > 0 }
  );

  const confirmMutation = trpc.radar.confirmMatch.useMutation({
    onSuccess: () => {
      utils.radar.list.invalidate();
      utils.radar.matchesPendentesByNoticias.invalidate();
      toast.success("Match confirmado");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const dismissMutation = trpc.radar.dismissMatch.useMutation({
    onSuccess: () => {
      utils.radar.list.invalidate();
      utils.radar.matchesPendentesByNoticias.invalidate();
      toast.success("Match descartado");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  function handleQuickAction(matchId: number, action: "confirmar" | "descartar") {
    if (action === "confirmar") {
      confirmMutation.mutate({ id: matchId });
    } else {
      dismissMutation.mutate({ id: matchId });
    }
  }

  const emptyMessage = useMemo(() => {
    const partes: string[] = [];
    if (filtros.tipoCrime) partes.push(filtros.tipoCrime);
    if (filtros.bairro) partes.push(`em ${filtros.bairro}`);
    if (filtros.fonte) partes.push(`da fonte ${filtros.fonte}`);
    if (partes.length > 0) {
      return `Nenhuma notícia de ${partes.join(" ")} no período selecionado.`;
    }
    return "Nenhuma notícia encontrada. O Radar Criminal coletará notícias automaticamente.";
  }, [filtros.tipoCrime, filtros.bairro, filtros.fonte]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const hasActiveFilters = !!(filtros.tipoCrime || filtros.bairro || filtros.fonte || filtros.search || filtros.circunstancia);

  if (allNoticias.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
          <Newspaper className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Nenhuma notícia encontrada
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
          {emptyMessage}
        </p>
        {hasActiveFilters && (
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            Tente remover os filtros para ver mais resultados.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Radio className="h-3.5 w-3.5 text-emerald-500" />
          {allNoticias.length} notícia{allNoticias.length > 1 ? "s" : ""}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle de visualização */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("cards")}
              className={cn(
                "p-1.5 rounded-md transition-colors cursor-pointer",
                viewMode === "cards"
                  ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-800 dark:text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
              title="Modo cards"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md transition-colors cursor-pointer",
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-800 dark:text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
              title="Modo lista"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {allNoticias.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer"
              onClick={() => exportNoticiasToCsv(allNoticias)}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      {groupByDate(allNoticias).map(({ label, items: group }) => (
        <div key={label}>
          <div className="flex items-center gap-2 py-1">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {label}
              <span className="ml-1 text-zinc-300 dark:text-zinc-600">
                · {group.length} ocorrência{group.length !== 1 ? "s" : ""}
              </span>
            </span>
            <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
          </div>
          {group.map((noticia) => (
            <RadarNoticiaCard
              key={noticia.id}
              noticia={{ ...noticia, matches: matchesPendentes?.[noticia.id] ?? [] } as any}
              relevanciaScore={(noticia as any).relevanciaScore}
              onClick={() => {
                setSelectedNoticiaId(noticia.id);
                setSheetOpen(true);
              }}
              onQuickAction={handleQuickAction}
              viewMode={viewMode}
            />
          ))}
        </div>
      ))}

      {/* Sentinel para infinite scroll */}
      <div ref={sentinelRef} className="h-4" />

      {isFetchingNextPage && (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      )}

      <RadarNoticiaSheet
        noticiaId={selectedNoticiaId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSelectNoticia={setSelectedNoticiaId}
      />
    </div>
  );
}
