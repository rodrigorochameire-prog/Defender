"use client";

import { useState, useCallback } from "react";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Newspaper, Scale, Gavel, BookOpen, RefreshCw, Filter, BookmarkCheck, BarChart2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { NoticiasFeed } from "@/components/noticias/noticias-feed";
import { NoticiasTriagem } from "@/components/noticias/noticias-triagem";
import { NoticiaReaderSheet } from "@/components/noticias/noticias-reader-sheet";
import { NoticiaSalvarCasoSheet } from "@/components/noticias/noticias-salvar-caso-sheet";
import { NoticiasRelatorio } from "@/components/noticias/noticias-relatorio";
import type { NoticiaJuridica } from "@/lib/db/schema";

type Tab = "legislativa" | "jurisprudencial" | "artigo" | "salvos" | "relatorios";

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "legislativa", label: "Legislativas", icon: Scale },
  { value: "jurisprudencial", label: "Jurisprudenciais", icon: Gavel },
  { value: "artigo", label: "Artigos", icon: BookOpen },
  { value: "salvos", label: "Salvos", icon: BookmarkCheck },
  { value: "relatorios", label: "Relatórios", icon: BarChart2 },
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
  const [tab, setTab] = useState<Tab>("jurisprudencial");
  const [triagemOpen, setTriagemOpen] = useState(true);
  const [noticiaReader, setNoticiaReader] = useState<NoticiaJuridica | null>(null);
  const [noticiaCaso, setNoticiaCaso] = useState<NoticiaJuridica | null>(null);

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Newspaper className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <Breadcrumbs items={[
                { label: "Ferramentas" },
                { label: "Notícias Jurídicas" },
              ]} />
              <h1 className="text-lg font-semibold">Notícias Jurídicas</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(pendentesCount ?? 0) > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTriagemOpen(!triagemOpen)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Triagem
                <Badge variant="danger" className="ml-1.5 animate-pulse">
                  {pendentesCount}
                </Badge>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => enriquecerBatch.mutate()}
              disabled={enriquecerBatch.isPending}
              title="Enriquecer com IA todas as notícias aprovadas que ainda não têm análise"
            >
              <Sparkles className={cn("h-4 w-4 mr-1", enriquecerBatch.isPending && "animate-spin")} />
              Enriquecer IA
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBuscarAgora}
              disabled={buscarAgora.isPending}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", buscarAgora.isPending && "animate-spin")} />
              Buscar Agora
            </Button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-1 w-fit overflow-x-auto">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                tab === value
                  ? "bg-white dark:bg-zinc-700 shadow-sm text-emerald-700 dark:text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Triagem panel */}
      {triagemOpen && (pendentesCount ?? 0) > 0 && (
        <NoticiasTriagem
          onClose={() => setTriagemOpen(false)}
          onUpdate={() => {
            utils.noticias.list.invalidate();
            utils.noticias.countPendentes.invalidate();
          }}
        />
      )}

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        {tab === "relatorios" ? (
          <NoticiasRelatorio />
        ) : (
          <NoticiasFeed
            categoria={tab as "legislativa" | "jurisprudencial" | "artigo" | "salvos"}
            onOpenReader={setNoticiaReader}
            onOpenSalvarCaso={setNoticiaCaso}
          />
        )}
      </div>

      {/* Reader Sheet */}
      {noticiaReader && (
        <NoticiaReaderSheet
          noticia={noticiaReader}
          corFonte={COR_FONTE[noticiaReader.fonte.toLowerCase()] ?? "#71717a"}
          isFavorito={favoritosIds.includes(noticiaReader.id)}
          onToggleFavorito={() => toggleFavorito.mutate({ noticiaId: noticiaReader.id })}
          onClose={() => setNoticiaReader(null)}
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
