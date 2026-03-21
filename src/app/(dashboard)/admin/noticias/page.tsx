"use client";

import { useState, useCallback, useMemo } from "react";
import { RefreshCw, Sparkles, Search, X, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
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


export default function NoticiasPage() {
  const [categoria, setCategoria] = useState<CategoriaTab>("jurisprudencial");
  const [triagemOpen, setTriagemOpen] = useState(false);
  const [noticiaReader, setNoticiaReader] = useState<NoticiaJuridica | null>(null);
  const [noticiaCaso, setNoticiaCaso] = useState<NoticiaJuridica | null>(null);
  // Lista de notícias atual para navegação J/K
  const [noticiasList, setNoticiasList] = useState<NoticiaJuridica[]>([]);
  const [busca, setBusca] = useState("");
  const [fonteFilter, setFonteFilter] = useState<string | undefined>(undefined);

  const { data: pendentesCount } = trpc.noticias.countPendentes.useQuery();
  const { data: fontes = [] } = trpc.noticias.listFontes.useQuery();
  const fonteIdToCorMap = useMemo(
    () => Object.fromEntries(fontes.map(f => [f.id, f.cor ?? "#71717a"])),
    [fontes]
  );
  const fonteIdToNomeMap = useMemo(
    () => Object.fromEntries(fontes.map(f => [f.id, f.nome])),
    [fontes]
  );
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
    try {
      const results = await buscarAgora.mutateAsync();
      const totalNovos = results.reduce((s, r) => s + r.novos, 0);
      toast.success(`${totalNovos} nova${totalNovos !== 1 ? "s" : ""} notícia${totalNovos !== 1 ? "s" : ""} encontrada${totalNovos !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Erro ao buscar notícias");
    }
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
  const corFonteReader = noticiaReader?.fonteId ? (fonteIdToCorMap[noticiaReader.fonteId] ?? "#71717a") : "#71717a";
  const nomeFonteReader = noticiaReader?.fonteId ? (fonteIdToNomeMap[noticiaReader.fonteId] ?? noticiaReader.fonte.replace(/-/g, " ")) : (noticiaReader?.fonte.replace(/-/g, " ") ?? "");
  const fonteAtiva = fonteFilter ? fontes.find(f => f.nome.toLowerCase().replace(/\s+/g, "-") === fonteFilter) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header — toolbar unificada */}
      <div className="border-b bg-background shrink-0 px-3 h-11 flex items-center gap-1.5">

        {/* Pills de categoria */}
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
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

        {/* Separador vertical */}
        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1 shrink-0" />

        {/* Busca inline */}
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <Input
            placeholder="Buscar..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-8 h-7 text-xs w-40 focus:w-56 transition-all duration-200"
          />
          {busca && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              onClick={() => setBusca("")}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filtro de fonte */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs transition-colors shrink-0",
              fonteFilter
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            )}>
              {fonteAtiva ? (
                <>
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: fonteAtiva.cor ?? "#71717a" }}
                  />
                  {fonteAtiva.nome}
                </>
              ) : (
                "Fonte"
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem
              onClick={() => setFonteFilter(undefined)}
              className="gap-2 text-sm cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
              Todas as fontes
              {!fonteFilter && <Check className="h-3.5 w-3.5 ml-auto text-emerald-500" />}
            </DropdownMenuItem>
            {fontes.filter(f => f.ativo).map(f => {
              const slug = f.nome.toLowerCase().replace(/\s+/g, "-");
              return (
                <DropdownMenuItem
                  key={f.id}
                  onClick={() => setFonteFilter(fonteFilter === slug ? undefined : slug)}
                  className="gap-2 text-sm cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: f.cor ?? "#71717a" }} />
                  {f.nome}
                  {fonteFilter === slug && <Check className="h-3.5 w-3.5 ml-auto text-emerald-500" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Ações à direita */}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          {(pendentesCount ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTriagemOpen(true)}
              className="gap-1.5 h-7 text-xs"
            >
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

      {/* Body — split-pane dinâmico */}
      <div className="flex flex-1 overflow-hidden">

        {/* Painel esquerdo: feed (full-width ou 380px) */}
        <div className={cn(
          "overflow-y-auto transition-all duration-300 ease-out",
          readerOpen
            ? "w-[380px] shrink-0 border-r border-zinc-100 dark:border-zinc-800"
            : "flex-1"
        )}>
          {categoria === "relatorios" ? (
            <NoticiasRelatorio />
          ) : (
            <NoticiasFeed
              categoria={categoria as "legislativa" | "jurisprudencial" | "artigo" | "salvos"}
              selectedNoticiaId={noticiaReader?.id}
              busca={busca}
              fonteFilter={fonteFilter}
              onOpenReader={(noticia, list) => {
                setNoticiaReader(noticia);
                if (list) setNoticiasList(list);
              }}
              onOpenSalvarCaso={setNoticiaCaso}
            />
          )}
        </div>

        {/* Painel direito: reader (só quando noticiaReader !== null) */}
        {readerOpen && (
          <div className="flex-1 overflow-hidden min-w-0">
            <NoticiaReaderPanel
              noticia={noticiaReader!}
              corFonte={corFonteReader}
              nomeFonte={nomeFonteReader}
              isFavorito={favoritosIds.includes(noticiaReader!.id)}
              onToggleFavorito={() => toggleFavorito.mutate({ noticiaId: noticiaReader!.id })}
              onClose={() => setNoticiaReader(null)}
              onPrevious={handlePrevious}
              onNext={handleNext}
              hasPrevious={readerIndex > 0}
              hasNext={readerIndex < noticiasList.length - 1}
            />
          </div>
        )}
      </div>

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
