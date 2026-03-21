"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { NoticiaCard } from "./noticias-card";
import { NoticiasPastasSidebar } from "./noticias-pastas-sidebar";
import { useDebounce } from "@/hooks/use-debounce";
import type { NoticiaJuridica } from "@/lib/db/schema";


export type CategoriaFeed = "legislativa" | "jurisprudencial" | "artigo" | "salvos";

interface NoticiasFeedProps {
  categoria: CategoriaFeed;
  selectedNoticiaId?: number;
  busca: string;
  fonteFilter: string | undefined;
  onOpenReader?: (noticia: NoticiaJuridica, list: NoticiaJuridica[]) => void;
  onOpenSalvarCaso?: (noticia: NoticiaJuridica) => void;
}

export function NoticiasFeed({ categoria, selectedNoticiaId, busca, fonteFilter, onOpenReader, onOpenSalvarCaso }: NoticiasFeedProps) {
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<NoticiaJuridica[]>([]);
  const [pastaAtiva, setPastaAtiva] = useState<number | null>(null);
  const debouncedBusca = useDebounce(busca, 400);
  const utils = trpc.useUtils();

  const { data: fontes = [] } = trpc.noticias.listFontes.useQuery();
  const fonteIdToCorMap = useMemo(
    () => Object.fromEntries(fontes.map(f => [f.id, f.cor ?? "#71717a"])),
    [fontes]
  );
  const fonteIdToNomeMap = useMemo(
    () => Object.fromEntries(fontes.map(f => [f.id, f.nome])),
    [fontes]
  );

  useEffect(() => {
    setCursor(undefined);
    setAccumulated([]);
  }, [debouncedBusca, categoria, fonteFilter]);

  const { data: favoritosIds = [] } = trpc.noticias.getFavoritosIds.useQuery();
  const toggleFavorito = trpc.noticias.toggleFavorito.useMutation({
    onSuccess: (data) => {
      toast.success(data.favoritado ? "Notícia salva" : "Removida dos salvos");
      utils.noticias.getFavoritosIds.invalidate();
      utils.noticias.listFavoritos.invalidate();
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const feedQuery = trpc.noticias.list.useQuery(
    {
      categoria: categoria === "salvos" ? undefined : categoria,
      busca: debouncedBusca || undefined,
      status: "aprovado",
      limit: 20,
      cursor,
      fonte: fonteFilter,
    },
    { enabled: categoria !== "salvos" }
  );

  useEffect(() => {
    if (feedQuery.data?.items) {
      if (cursor === undefined) {
        setAccumulated(feedQuery.data.items);
      } else {
        setAccumulated(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newItems = feedQuery.data.items.filter(n => !existingIds.has(n.id));
          return [...prev, ...newItems];
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedQuery.data]);

  const favoritosQuery = trpc.noticias.listFavoritos.useQuery(undefined, {
    enabled: categoria === "salvos",
  });

  const pastaQuery = trpc.noticias.listNoticiasDaPasta.useQuery(
    { pastaId: pastaAtiva! },
    { enabled: pastaAtiva !== null }
  );

  const noticias: NoticiaJuridica[] =
    pastaAtiva !== null
      ? (pastaQuery.data?.map(item => item.noticia) ?? [])
      : categoria === "salvos"
        ? (favoritosQuery.data?.map(f => f.noticia) ?? [])
        : accumulated;

  const isLoading =
    pastaAtiva !== null ? pastaQuery.isLoading
    : categoria === "salvos" ? favoritosQuery.isLoading
    : (feedQuery.isLoading && cursor === undefined);

  const hasNextPage = feedQuery.data?.nextCursor != null;

  if (isLoading) {
    return (
      <div className="flex gap-4">
        {/* Sidebar placeholder */}
        <div className="w-44 shrink-0 space-y-1 pt-2 px-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
        {/* Cards placeholder */}
        <div className="flex-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-800 rounded ml-auto" />
              </div>
              <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded mb-1.5" />
              <div className={`h-4 bg-zinc-100 dark:bg-zinc-800 rounded ${i % 3 === 0 ? 'w-2/3' : 'w-4/5'}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 min-h-full min-w-0">
      {/* Sidebar de Pastas */}
      {categoria !== "salvos" && (
        <NoticiasPastasSidebar pastaAtiva={pastaAtiva} onSelectPasta={setPastaAtiva} />
      )}

      {/* Feed principal */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Empty state */}
        {noticias.length === 0 && !isLoading && (
          <div className="text-center py-24 text-zinc-400">
            <p className="text-base font-medium mb-1">Nenhuma notícia encontrada</p>
            <p className="text-sm">
              {categoria === "salvos"
                ? "Use a estrela nos cards para salvar notícias de referência"
                : "Tente buscar por outro termo ou aguarde o próximo scraping"}
            </p>
          </div>
        )}

        {/* Cards em coluna única (sem featured) */}
        {noticias.length > 0 && (
          <div>
            {noticias.map(noticia => (
              <NoticiaCard
                key={noticia.id}
                noticia={noticia}
                corFonte={noticia.fonteId ? (fonteIdToCorMap[noticia.fonteId] ?? "#71717a") : "#71717a"}
                nomeFonte={noticia.fonteId ? (fonteIdToNomeMap[noticia.fonteId] ?? noticia.fonte.replace(/-/g, " ")) : noticia.fonte.replace(/-/g, " ")}
                isFavorito={favoritosIds.includes(noticia.id)}
                isSelected={selectedNoticiaId === noticia.id}
                onToggleFavorito={() => toggleFavorito.mutate({ noticiaId: noticia.id })}
                onSalvarNoCaso={() => onOpenSalvarCaso?.(noticia)}
                onClick={() => onOpenReader?.(noticia, noticias)}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasNextPage && categoria !== "salvos" && pastaAtiva === null && (
          <div className="flex justify-center py-4">
            <button
              onClick={() => { if (feedQuery.data?.nextCursor) setCursor(feedQuery.data.nextCursor); }}
              disabled={feedQuery.isFetching}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors disabled:opacity-50"
            >
              {feedQuery.isFetching ? "Carregando..." : "Carregar mais"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
