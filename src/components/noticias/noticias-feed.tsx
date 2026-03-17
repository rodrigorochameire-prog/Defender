"use client";

import { useState, useEffect } from "react";
import { Search, X, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { NoticiaCard } from "./noticias-card";
import { NoticiaCardFeatured } from "./noticias-card-featured";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { NoticiaJuridica } from "@/lib/db/schema";

const COR_FONTE: Record<string, string> = {
  "conjur": "#dc2626",
  "stj-noticias": "#1d4ed8",
  "stj-not-cias": "#1d4ed8",
  "ibccrim": "#7c3aed",
  "dizer-o-direito": "#059669",
  "tudo-de-penal": "#b45309",
  "canal-ciencias-criminais": "#7c2d12",
  "canal-ciências-criminais": "#7c2d12",
  "emporio-do-direito": "#4338ca",
  "empório-do-direito": "#4338ca",
  "stf-noticias": "#dc2626",
  "stf-notícias": "#dc2626",
};

const NOME_FONTE: Record<string, string> = {
  "conjur": "ConJur",
  "stj-noticias": "STJ Notícias",
  "ibccrim": "IBCCRIM",
  "dizer-o-direito": "Dizer o Direito",
  "tudo-de-penal": "Tudo de Penal",
  "canal-ciencias-criminais": "Canal CC",
  "emporio-do-direito": "Empório",
  "stf-noticias": "STF",
};

const FONTES_DISPONIVEIS = [
  "conjur",
  "stj-noticias",
  "ibccrim",
  "dizer-o-direito",
  "tudo-de-penal",
  "canal-ciencias-criminais",
  "emporio-do-direito",
  "stf-noticias",
];

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
  const [fonteFilter, setFonteFilter] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const debouncedBusca = useDebounce(busca, 400);
  const utils = trpc.useUtils();

  // Reset accumulated list when busca, fonte or categoria changes
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

  const featuredNoticia = viewMode === "grid" ? noticias[0] : undefined;
  const restNoticias = viewMode === "grid" ? noticias.slice(1) : noticias;

  return (
    <div className="p-6 space-y-5">
      {/* Toolbar: busca + view toggle */}
      {categoria !== "salvos" && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
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

          {/* Contador */}
          <span className="text-xs text-zinc-400 whitespace-nowrap">
            {noticias.length} {noticias.length === 1 ? "notícia" : "notícias"}
            {feedQuery.isFetching && cursor !== undefined ? " ..." : ""}
          </span>

          {/* View toggle */}
          <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden ml-auto">
            <button
              className={cn(
                "p-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
              onClick={() => setViewMode("grid")}
              title="Modo magazine"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              className={cn(
                "p-1.5 transition-colors",
                viewMode === "list"
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
              onClick={() => setViewMode("list")}
              title="Modo lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filtro por fonte — pills horizontais */}
      {categoria !== "salvos" && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFonteFilter(undefined)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
              fonteFilter === undefined
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500"
            )}
          >
            Todas
          </button>
          {FONTES_DISPONIVEIS.map(fonte => {
            const cor = COR_FONTE[fonte] ?? "#71717a";
            const nome = NOME_FONTE[fonte] ?? fonte;
            const ativa = fonteFilter === fonte;
            return (
              <button
                key={fonte}
                onClick={() => setFonteFilter(ativa ? undefined : fonte)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  ativa
                    ? "text-white border-transparent"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500"
                )}
                style={ativa ? { backgroundColor: cor, borderColor: cor } : undefined}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ativa ? "rgba(255,255,255,0.8)" : cor }}
                />
                {nome}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {noticias.length === 0 && !isLoading && (
        <div className="text-center py-20 text-zinc-400">
          <p className="text-lg font-medium mb-1">Nenhuma notícia encontrada</p>
          <p className="text-sm">
            {categoria === "salvos"
              ? "Use a estrela nos cards para salvar notícias de referência"
              : "Tente buscar por outro termo ou aguarde o próximo scraping"}
          </p>
        </div>
      )}

      {/* Featured card (apenas no modo grid) */}
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

      {/* Grid 2 colunas / Lista single column */}
      {restNoticias.length > 0 && (
        <div className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 gap-4"
            : "flex flex-col gap-3"
        )}>
          {restNoticias.map(noticia => (
            <NoticiaCard
              key={noticia.id}
              noticia={noticia}
              corFonte={getCorFonte(noticia.fonte)}
              isFavorito={favoritosIds.includes(noticia.id)}
              onToggleFavorito={() => toggleFavorito.mutate({ noticiaId: noticia.id })}
              onSalvarNoCaso={() => onOpenSalvarCaso?.(noticia)}
              onClick={() => onOpenReader?.(noticia)}
              compact={viewMode === "list"}
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
