"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { NoticiaCard } from "./noticias-card";
import { NoticiasPastasSidebar } from "./noticias-pastas-sidebar";
import { useDebounce } from "@/hooks/use-debounce";
import { isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from "date-fns";
import type { NoticiaJuridica } from "@/lib/db/schema";


export type CategoriaFeed = "legislativa" | "jurisprudencial" | "artigo" | "radar" | "institucional" | "salvos" | "recentes";

type GrupoData = {
  label: string;
  items: NoticiaJuridica[];
};

function getGrupoData(noticias: NoticiaJuridica[], useAprovadoEm: boolean): GrupoData[] {
  const grupos: Map<string, NoticiaJuridica[]> = new Map([
    ["Hoje", []],
    ["Ontem", []],
    ["Esta semana", []],
    ["Este mês", []],
    ["Anteriores", []],
  ]);

  for (const n of noticias) {
    const rawDate = useAprovadoEm
      ? (n.aprovadoEm ?? n.publicadoEm)
      : n.publicadoEm;
    if (!rawDate) { grupos.get("Anteriores")!.push(n); continue; }
    const date = typeof rawDate === "string" ? parseISO(rawDate) : rawDate;
    if (isToday(date)) grupos.get("Hoje")!.push(n);
    else if (isYesterday(date)) grupos.get("Ontem")!.push(n);
    else if (isThisWeek(date, { weekStartsOn: 1 })) grupos.get("Esta semana")!.push(n);
    else if (isThisMonth(date)) grupos.get("Este mês")!.push(n);
    else grupos.get("Anteriores")!.push(n);
  }

  return Array.from(grupos.entries())
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

interface NoticiasFeedProps {
  categoria: CategoriaFeed;
  selectedNoticiaId?: number;
  busca: string;
  fonteFilter: string | undefined;
  sidebarOpen?: boolean;
  onOpenReader?: (noticia: NoticiaJuridica, list: NoticiaJuridica[]) => void;
  onOpenSalvarCaso?: (noticia: NoticiaJuridica) => void;
}

export function NoticiasFeed({ categoria, selectedNoticiaId, busca, fonteFilter, sidebarOpen = true, onOpenReader, onOpenSalvarCaso }: NoticiasFeedProps) {
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
      categoria: (categoria === "salvos" || categoria === "recentes") ? undefined : categoria,
      busca: debouncedBusca || undefined,
      status: "aprovado",
      limit: 20,
      cursor,
      fonte: fonteFilter,
    },
    { enabled: categoria !== "salvos" && categoria !== "recentes" }
  );

  const recentesQuery = trpc.noticias.listRecentes.useQuery(undefined, {
    enabled: categoria === "recentes",
  });

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
        : categoria === "recentes"
          ? (recentesQuery.data ?? [])
          : accumulated;

  const isLoading =
    pastaAtiva !== null ? pastaQuery.isLoading
    : categoria === "salvos" ? favoritosQuery.isLoading
    : categoria === "recentes" ? recentesQuery.isLoading
    : (feedQuery.isLoading && cursor === undefined);

  const hasNextPage = feedQuery.data?.nextCursor != null;

  if (isLoading) {
    return (
      <div className="flex gap-4">
        {/* Sidebar placeholder */}
        {sidebarOpen && categoria !== "salvos" && categoria !== "recentes" && (
          <div className="w-36 shrink-0 space-y-1 pt-3 px-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 bg-muted rounded animate-pulse" />
            ))}
          </div>
        )}
        {/* Cards placeholder */}
        <div className="flex-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-border animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded ml-auto" />
              </div>
              <div className="h-4 w-full bg-muted rounded mb-1.5" />
              <div className={`h-4 bg-muted rounded ${i % 3 === 0 ? 'w-2/3' : 'w-4/5'}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full min-w-0">
      {/* Sidebar de Pastas */}
      {categoria !== "salvos" && categoria !== "recentes" && sidebarOpen && (
        <NoticiasPastasSidebar pastaAtiva={pastaAtiva} onSelectPasta={setPastaAtiva} />
      )}

      {/* Feed principal */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Empty state */}
        {noticias.length === 0 && !isLoading && (
          <div className="text-center py-24 text-muted-foreground">
            <p className="text-base font-medium mb-1">Nenhuma notícia encontrada</p>
            <p className="text-sm">
              {categoria === "salvos"
                ? "Use a estrela nos cards para salvar notícias de referência"
                : categoria === "recentes"
                  ? "Nenhuma notícia aprovada nas últimas 48 horas"
                  : "Tente buscar por outro termo ou aguarde o próximo scraping"}
            </p>
          </div>
        )}

        {/* Cards agrupados por data */}
        {noticias.length > 0 && (() => {
          const useAprovadoEm = categoria === "recentes";
          const grupos = getGrupoData(noticias, useAprovadoEm);
          return (
            <div>
              {grupos.map(({ label, items }) => (
                <div key={label}>
                  {/* Separador de grupo */}
                  <div className="flex items-center gap-2 px-5 py-2.5 sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
                      {label}
                    </span>
                    <span className="text-xs text-muted-foreground/50 shrink-0">{items.length}</span>
                    <div className="flex-1 h-px bg-muted" />
                  </div>
                  {/* Cards do grupo */}
                  {items.map(noticia => (
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
              ))}
            </div>
          );
        })()}

        {/* Load more */}
        {hasNextPage && categoria !== "salvos" && categoria !== "recentes" && pastaAtiva === null && (
          <div className="flex justify-center py-4">
            <button
              onClick={() => { if (feedQuery.data?.nextCursor) setCursor(feedQuery.data.nextCursor); }}
              disabled={feedQuery.isFetching}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {feedQuery.isFetching ? "Carregando..." : "Carregar mais"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
