"use client";

import { useState, useCallback } from "react";
import { Newspaper, RefreshCw, Sparkles, Filter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { NoticiasFeed } from "@/components/noticias/noticias-feed";
import { NoticiasTriagem } from "@/components/noticias/noticias-triagem";
import { NoticiaReaderPanel } from "@/components/noticias/noticias-reader-panel";
import { NoticiaSalvarCasoSheet } from "@/components/noticias/noticias-salvar-caso-sheet";
import { NoticiasRelatorio } from "@/components/noticias/noticias-relatorio";
import type { NoticiaJuridica } from "@/lib/db/schema";

export type CategoriaTab = "legislativa" | "jurisprudencial" | "artigo" | "salvos" | "relatorios";

const CATEGORIA_PILLS: { value: CategoriaTab; label: string }[] = [
  { value: "jurisprudencial", label: "Jurisprudencial" },
  { value: "legislativa", label: "Legislativa" },
  { value: "artigo", label: "Artigo" },
  { value: "salvos", label: "Salvos" },
  { value: "relatorios", label: "Relatórios" },
];

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

export default function NoticiasPage() {
  const [categoria, setCategoria] = useState<CategoriaTab>("jurisprudencial");
  const [triagemOpen, setTriagemOpen] = useState(false);
  const [noticiaReader, setNoticiaReader] = useState<NoticiaJuridica | null>(null);
  const [noticiaCaso, setNoticiaCaso] = useState<NoticiaJuridica | null>(null);
  // Lista de notícias atual para navegação J/K
  const [noticiasList, setNoticiasList] = useState<NoticiaJuridica[]>([]);

  const { data: pendentesCount } = trpc.noticias.countPendentes.useQuery();
  const buscarAgora = trpc.noticias.buscarAgora.useMutation();
  const { data: favoritosIds = [] } = trpc.noticias.getFavoritosIds.useQuery();
  const utils = trpc.useUtils();

  const toggleFavorito = trpc.noticias.toggleFavorito.useMutation({
    onSuccess: () => {
      utils.noticias.getFavoritosIds.invalidate();
      utils.noticias.listFavoritos.invalidate();
    },
  });

  const enriquecerBatch = trpc.noticias.enriquecerBatch.useMutation({
    onSuccess: (data) => {
      toast.success(`IA processou ${data.processadas} notícias (${data.erros} erros)`);
      utils.noticias.list.invalidate();
    },
    onError: () => toast.error("Erro ao enriquecer com IA"),
  });

  const handleBuscarAgora = useCallback(async () => {
    await buscarAgora.mutateAsync();
    utils.noticias.listPendentes.invalidate();
    utils.noticias.countPendentes.invalidate();
    utils.noticias.list.invalidate();
  }, [buscarAgora, utils]);

  const readerIndex = noticiaReader ? noticiasList.findIndex(n => n.id === noticiaReader.id) : -1;

  const handlePrevious = useCallback(() => {
    if (readerIndex > 0) setNoticiaReader(noticiasList[readerIndex - 1]);
  }, [readerIndex, noticiasList]);

  const handleNext = useCallback(() => {
    if (readerIndex < noticiasList.length - 1) setNoticiaReader(noticiasList[readerIndex + 1]);
  }, [readerIndex, noticiasList]);

  const readerOpen = noticiaReader !== null && categoria !== "relatorios";
  const corFonteReader = noticiaReader ? (COR_FONTE[noticiaReader.fonte.toLowerCase()] ?? "#71717a") : "#71717a";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header — uma linha limpa */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* Ícone */}
          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg shrink-0">
            <Newspaper className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>

          {/* Pills de categoria — scroll horizontal em telas pequenas */}
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none flex-1 min-w-0">
            {CATEGORIA_PILLS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setCategoria(value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0",
                  categoria === value
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Ações — sempre visíveis à direita */}
          <div className="flex items-center gap-1 shrink-0">
            {(pendentesCount ?? 0) > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTriagemOpen(true)}
                className="gap-1.5 h-7 text-xs"
              >
                <Filter className="h-3 w-3" />
                <span className="hidden sm:inline">Triagem</span>
                <Badge variant="danger" className="animate-pulse text-[10px] px-1.5 py-0">
                  {pendentesCount}
                </Badge>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => enriquecerBatch.mutate()}
              disabled={enriquecerBatch.isPending}
              title="Enriquecer com IA"
              className="h-7 w-7 p-0 text-zinc-400"
            >
              <Sparkles className={cn("h-3.5 w-3.5", enriquecerBatch.isPending && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBuscarAgora}
              disabled={buscarAgora.isPending}
              title="Buscar notícias agora"
              className="h-7 w-7 p-0 text-zinc-400"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", buscarAgora.isPending && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Feed — sempre largura total */}
      <div className="flex-1 overflow-y-auto">
        {categoria === "relatorios" ? (
          <NoticiasRelatorio />
        ) : (
          <NoticiasFeed
            categoria={categoria as "legislativa" | "jurisprudencial" | "artigo" | "salvos"}
            selectedNoticiaId={noticiaReader?.id}
            onOpenReader={(noticia, list) => {
              setNoticiaReader(noticia);
              if (list) setNoticiasList(list);
            }}
            onOpenSalvarCaso={setNoticiaCaso}
          />
        )}
      </div>

      {/* Reader Panel — drawer overlay da direita */}
      <Sheet open={readerOpen} onOpenChange={(open) => { if (!open) setNoticiaReader(null); }}>
        <SheetContent
          side="right"
          className="w-[75vw] sm:max-w-[75vw] p-0 flex flex-col gap-0 [&>button:first-child]:hidden"
        >
          {noticiaReader && (
            <NoticiaReaderPanel
              noticia={noticiaReader}
              corFonte={corFonteReader}
              isFavorito={favoritosIds.includes(noticiaReader.id)}
              onToggleFavorito={() => toggleFavorito.mutate({ noticiaId: noticiaReader.id })}
              onClose={() => setNoticiaReader(null)}
              onPrevious={handlePrevious}
              onNext={handleNext}
              hasPrevious={readerIndex > 0}
              hasNext={readerIndex < noticiasList.length - 1}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Triagem overlay */}
      {triagemOpen && (
        <NoticiasTriagem
          onClose={() => setTriagemOpen(false)}
          onUpdate={() => {
            utils.noticias.list.invalidate();
            utils.noticias.countPendentes.invalidate();
          }}
          onOpenReader={(noticia) => {
            setNoticiaReader(noticia as NoticiaJuridica);
            setTriagemOpen(false);
          }}
        />
      )}

      {/* Salvar no Caso Sheet */}
      {noticiaCaso && (
        <NoticiaSalvarCasoSheet
          noticia={noticiaCaso}
          onClose={() => setNoticiaCaso(null)}
        />
      )}
    </div>
  );
}
