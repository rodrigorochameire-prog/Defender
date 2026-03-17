"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { NoticiaCard } from "./noticias-card";
import { NoticiaCardFeatured } from "./noticias-card-featured";
import { useDebounce } from "@/hooks/use-debounce";
import type { NoticiaJuridica } from "@/lib/db/schema";

const COR_FONTE: Record<string, string> = {
  "conjur": "#dc2626",
  "stj-noticias": "#1d4ed8",
  "stj-not-cias": "#1d4ed8",
  "ibccrim": "#7c3aed",
  "dizer-o-direito": "#059669",
};

function getCorFonte(fonte: string): string {
  const key = fonte.toLowerCase().replace(/\s+/g, "-");
  return COR_FONTE[key] ?? "#71717a";
}

export type CategoriaFeed = "legislativa" | "jurisprudencial" | "artigo" | "salvos";

interface NoticiasFeedProps {
  categoria: CategoriaFeed;
  onOpenReader?: (noticia: NoticiaJuridica) => void;
  onOpenSalvarCaso?: (noticia: NoticiaJuridica) => void;
}

export function NoticiasFeed({ categoria, onOpenReader, onOpenSalvarCaso }: NoticiasFeedProps) {
  const [busca, setBusca] = useState("");
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<NoticiaJuridica[]>([]);
  const debouncedBusca = useDebounce(busca, 400);
  const utils = trpc.useUtils();

  // Reset accumulated list when busca or categoria changes
  useEffect(() => {
    setCursor(undefined);
    setAccumulated([]);
  }, [debouncedBusca, categoria]);

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
    },
    {
      enabled: categoria !== "salvos",
    }
  );

  // Accumulate pages as user loads more
  useEffect(() => {
    if (feedQuery.data?.items) {
      if (cursor === undefined) {
        // First page — replace
        setAccumulated(feedQuery.data.items);
      } else {
        // Next page — append
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

  const noticias: NoticiaJuridica[] =
    categoria === "salvos"
      ? (favoritosQuery.data?.map(f => f.noticia) ?? [])
      : accumulated;

  const isLoading =
    categoria === "salvos" ? favoritosQuery.isLoading : (feedQuery.isLoading && cursor === undefined);

  const hasNextPage = feedQuery.data?.nextCursor != null;

  const handleLoadMore = () => {
    if (feedQuery.data?.nextCursor) {
      setCursor(feedQuery.data.nextCursor);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  const featuredNoticia = noticias[0];
  const restNoticias = noticias.slice(1);

  return (
    <div className="p-6 space-y-6">
      {/* Busca */}
      {categoria !== "salvos" && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Buscar notícias..."
            className="pl-9 pr-8"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          {busca && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              onClick={() => setBusca("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {noticias.length === 0 && (
        <div className="text-center py-20 text-zinc-400">
          <p className="text-lg font-medium mb-1">Nenhuma notícia encontrada</p>
          <p className="text-sm">
            {categoria === "salvos"
              ? "Use ⭐ nos cards para salvar notícias de referência"
              : "Tente buscar por outro termo ou aguarde o próximo scraping"}
          </p>
        </div>
      )}

      {/* Featured card */}
      {featuredNoticia && (
        <NoticiaCardFeatured
          noticia={featuredNoticia}
          corFonte={getCorFonte(featuredNoticia.fonte)}
          isFavorito={favoritosIds.includes(featuredNoticia.id)}
          onToggleFavorito={() => toggleFavorito.mutate({ noticiaId: featuredNoticia.id })}
          onSalvarNoCaso={() => onOpenSalvarCaso?.(featuredNoticia)}
          onClick={() => onOpenReader?.(featuredNoticia)}
        />
      )}

      {/* Grid 2 colunas */}
      {restNoticias.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {restNoticias.map(noticia => (
            <NoticiaCard
              key={noticia.id}
              noticia={noticia}
              corFonte={getCorFonte(noticia.fonte)}
              isFavorito={favoritosIds.includes(noticia.id)}
              onToggleFavorito={() => toggleFavorito.mutate({ noticiaId: noticia.id })}
              onSalvarNoCaso={() => onOpenSalvarCaso?.(noticia)}
              onClick={() => onOpenReader?.(noticia)}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasNextPage && categoria !== "salvos" && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={feedQuery.isFetching}
          >
            {feedQuery.isFetching ? "Carregando..." : "Carregar mais"}
          </Button>
        </div>
      )}
    </div>
  );
}
