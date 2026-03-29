"use client";

import { useState, useCallback, useMemo } from "react";
import { RefreshCw, Sparkles, Search, X, ChevronDown, Check, PanelLeft } from "lucide-react";
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

export type CategoriaTab = "legislativa" | "jurisprudencial" | "artigo" | "salvos" | "recentes" | "relatorios";

const CATEGORIA_PILLS: { value: CategoriaTab; label: string }[] = [
  { value: "recentes", label: "Recentes" },
  { value: "jurisprudencial", label: "Jurisprudencial" },
  { value: "legislativa", label: "Legislativa" },
  { value: "artigo", label: "Artigo" },
  { value: "salvos", label: "Salvos" },
  { value: "relatorios", label: "Relatórios" },
];

const CATEGORIAS_COM_SIDEBAR = new Set(["jurisprudencial", "legislativa", "artigo"]);


export default function NoticiasPage() {
  const [categoria, setCategoria] = useState<CategoriaTab>("recentes");
  const [triagemOpen, setTriagemOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("noticias-sidebar-open") !== "false";
  });
  const toggleSidebar = () => setSidebarOpen(prev => {
    const next = !prev;
    localStorage.setItem("noticias-sidebar-open", String(next));
    return next;
  });
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

      {/* Masthead editorial — Diário Criminal */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');`}</style>
      <header className="-mx-6 md:-mx-8 -mt-6 md:-mt-8 bg-[#6b1d1d] dark:bg-zinc-950 dark:border-b dark:border-zinc-800 text-white shrink-0">
        <div className="flex flex-col items-center py-4 px-4">
          <div className="flex items-center gap-3 mb-2 w-full max-w-lg">
            <div className="flex-1 h-px bg-white/20" />
            <div className="h-1 w-1 rounded-full bg-amber-400" />
            <div className="flex-1 h-px bg-white/20" />
          </div>
          <h1
            className="text-3xl sm:text-4xl font-semibold tracking-tight leading-none"
            style={{ fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif" }}
          >
            Diário Criminal
          </h1>
          <p className="mt-1.5 text-[10px] sm:text-xs tracking-[0.2em] uppercase text-zinc-400">
            Direito Penal &middot; Segurança Pública &middot; Tribunais &middot; Processo Penal
          </p>
          <div className="flex items-center gap-3 mt-2 w-full max-w-lg">
            <div className="flex-1 h-px bg-white/20" />
            <div className="h-1 w-1 rounded-full bg-amber-400" />
            <div className="flex-1 h-px bg-white/20" />
          </div>
        </div>
      </header>

      {/* Header — toolbar unificada */}
      <div className="border-b bg-white dark:bg-zinc-950 shrink-0 px-3 flex items-stretch gap-1.5" style={{ height: "44px" }}>

        {/* Toggle sidebar (só em categorias com pasta) */}
        {CATEGORIAS_COM_SIDEBAR.has(categoria) && (
          <>
            <button
              onClick={toggleSidebar}
              className={cn(
                "self-center h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors shrink-0",
                sidebarOpen
                  ? "text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              )}
              title={sidebarOpen ? "Ocultar pastas" : "Mostrar pastas"}
            >
              <PanelLeft className="h-3.5 w-3.5" />
            </button>
            <div className="w-px h-4 self-center bg-zinc-200 dark:bg-zinc-700 mx-0.5 shrink-0" />
          </>
        )}

        {/* Pills de categoria — tab style */}
        <div className="flex items-stretch gap-0 overflow-x-auto scrollbar-none">
          {CATEGORIA_PILLS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCategoria(value)}
              className={cn(
                "relative px-3.5 flex items-center text-sm font-medium transition-all whitespace-nowrap shrink-0",
                categoria === value
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              {label}
              {categoria === value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Separador vertical */}
        <div className="w-px h-4 self-center bg-zinc-200 dark:bg-zinc-700 mx-1 shrink-0" />

        {/* Busca inline */}
        <div className="relative self-center shrink-0">
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
              "self-center flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs transition-colors shrink-0",
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
        <div className="ml-auto self-center flex items-center gap-1 shrink-0">
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

        {/* Painel esquerdo: feed (full-width ou 420px) */}
        <div className={cn(
          "overflow-y-auto transition-all duration-300 ease-out",
          readerOpen
            ? "w-[420px] shrink-0 border-r border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/80"
            : "flex-1 bg-white dark:bg-zinc-950"
        )}>
          <div>
            {categoria === "relatorios" ? (
              <NoticiasRelatorio />
            ) : (
              <NoticiasFeed
                categoria={categoria as "legislativa" | "jurisprudencial" | "artigo" | "salvos" | "recentes"}
                selectedNoticiaId={noticiaReader?.id}
                busca={busca}
                fonteFilter={fonteFilter}
                sidebarOpen={sidebarOpen}
                onOpenReader={(noticia, list) => {
                  setNoticiaReader(noticia);
                  if (list) setNoticiasList(list);
                }}
                onOpenSalvarCaso={setNoticiaCaso}
              />
            )}
          </div>
        </div>

        {/* Painel direito: reader (só quando noticiaReader !== null) */}
        {readerOpen && (
          <div className="flex-1 overflow-hidden min-w-0 bg-white dark:bg-zinc-950">
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
