"use client";

import { useState, useEffect } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { NoticiaCard } from "./noticias-card";
import { NoticiasPastasSidebar } from "./noticias-pastas-sidebar";
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
  "jota": "#0f172a",
};

const NOME_FONTE: Record<string, string> = {
  "conjur": "ConJur",
  "stj-noticias": "STJ",
  "ibccrim": "IBCCRIM",
  "dizer-o-direito": "Dizer o Direito",
  "stf-noticias": "STF",
  "jota": "JOTA",
  "justificando": "Justificando",
  "cnj": "CNJ",
  "senado-federal": "Senado",
};

const FONTES_DISPONIVEIS = [
  "conjur", "stj-noticias", "ibccrim", "dizer-o-direito",
  "stf-noticias", "jota", "justificando", "cnj", "senado-federal",
];

function getCorFonte(fonte: string): string {
  const key = fonte.toLowerCase().replace(/\s+/g, "-");
  return COR_FONTE[key] ?? "#71717a";
}

export type CategoriaFeed = "legislativa" | "jurisprudencial" | "artigo" | "salvos";

interface NoticiasFeedProps {
  categoria: CategoriaFeed;
  selectedNoticiaId?: number;
  onOpenReader?: (noticia: NoticiaJuridica, list: NoticiaJuridica[]) => void;
  onOpenSalvarCaso?: (noticia: NoticiaJuridica) => void;
}

export function NoticiasFeed({ categoria, selectedNoticiaId, onOpenReader, onOpenSalvarCaso }: NoticiasFeedProps) {
  const [busca, setBusca] = useState("");
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<NoticiaJuridica[]>([]);
  const [fonteFilter, setFonteFilter] = useState<string | undefined>(undefined);
  const [pastaAtiva, setPastaAtiva] = useState<number | null>(null);
  const debouncedBusca = useDebounce(busca, 400);
  const utils = trpc.useUtils();

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
      <div className="p-4 flex gap-4">
        <div className="w-48 shrink-0 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="flex-1 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex gap-4 min-h-full">
      {/* Sidebar de Pastas */}
      {categoria !== "salvos" && (
        <NoticiasPastasSidebar pastaAtiva={pastaAtiva} onSelectPasta={setPastaAtiva} />
      )}

      {/* Feed principal */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Toolbar: busca + fonte */}
        {categoria !== "salvos" && pastaAtiva === null && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <Input
                placeholder="Buscar notícias..."
                className="pl-8 pr-8 h-7 text-sm"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
              {busca && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  onClick={() => setBusca("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <span className="text-xs text-zinc-400 whitespace-nowrap">
              {noticias.length} {noticias.length === 1 ? "notícia" : "notícias"}
            </span>
          </div>
        )}

        {/* Dropdown de fonte */}
        {categoria !== "salvos" && pastaAtiva === null && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs font-medium border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
              >
                {fonteFilter ? (
                  <>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: COR_FONTE[fonteFilter] ?? "#71717a" }}
                    />
                    {NOME_FONTE[fonteFilter] ?? fonteFilter}
                  </>
                ) : (
                  "Fonte"
                )}
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem
                onClick={() => setFonteFilter(undefined)}
                className="gap-2 text-sm cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-zinc-300 shrink-0" />
                Todas as fontes
                {!fonteFilter && <Check className="h-3.5 w-3.5 ml-auto text-emerald-500" />}
              </DropdownMenuItem>
              {FONTES_DISPONIVEIS.map(fonte => {
                const cor = COR_FONTE[fonte] ?? "#71717a";
                const nome = NOME_FONTE[fonte] ?? fonte;
                return (
                  <DropdownMenuItem
                    key={fonte}
                    onClick={() => setFonteFilter(fonteFilter === fonte ? undefined : fonte)}
                    className="gap-2 text-sm cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                    {nome}
                    {fonteFilter === fonte && <Check className="h-3.5 w-3.5 ml-auto text-emerald-500" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Empty state */}
        {noticias.length === 0 && !isLoading && (
          <div className="text-center py-20 text-zinc-400">
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
          <div className="space-y-3">
            {noticias.map(noticia => (
              <NoticiaCard
                key={noticia.id}
                noticia={noticia}
                corFonte={getCorFonte(noticia.fonte)}
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
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (feedQuery.data?.nextCursor) setCursor(feedQuery.data.nextCursor);
              }}
              disabled={feedQuery.isFetching}
            >
              {feedQuery.isFetching ? "Carregando..." : "Carregar mais"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
