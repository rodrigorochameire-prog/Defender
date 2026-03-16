"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { RadarNoticiaCard } from "./radar-noticia-card";
import { RadarNoticiaSheet } from "./radar-noticia-sheet";
import { Radio, Newspaper } from "lucide-react";
import { toast } from "sonner";

interface FiltrosState {
  tipoCrime?: string;
  bairro?: string;
  fonte?: string;
  search?: string;
  dataInicio?: string;
  dataFim?: string;
  soMatches: boolean;
}

interface RadarFeedProps {
  filtros: FiltrosState;
}

export function RadarFeed({ filtros }: RadarFeedProps) {
  const [selectedNoticiaId, setSelectedNoticiaId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

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
          O Radar Criminal coletará automaticamente notícias policiais de Camaçari.
          As notícias aparecerão aqui após a primeira coleta.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Radio className="h-3.5 w-3.5 text-emerald-500" />
        {allNoticias.length} notícia{allNoticias.length > 1 ? "s" : ""}
      </div>

      {allNoticias.map((noticia) => (
        <RadarNoticiaCard
          key={noticia.id}
          noticia={{ ...noticia, matches: matchesPendentes?.[noticia.id] ?? [] } as any}
          onClick={() => {
            setSelectedNoticiaId(noticia.id);
            setSheetOpen(true);
          }}
          onQuickAction={handleQuickAction}
        />
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
      />
    </div>
  );
}
