"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { Search, Loader2, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LEGISLACOES } from "@/config/legislacao";
import type { Legislacao, Artigo, NodoEstrutura } from "@/config/legislacao";
import { loadLegislacao } from "@/config/legislacao/loader";
import { ArtigoRenderer } from "@/components/legislacao/artigo-renderer";

// ==========================================
// LEGISLACAO TABS - Navegacao por lei com abas horizontais
// ==========================================

interface LegislacaoTabsProps {
  selectedLeiId?: string | null;
  scrollToArtigoId?: string | null;
}

/** Extracts all articles from a nested structure, preserving order */
function extractArtigos(nodes: (NodoEstrutura | Artigo)[]): Artigo[] {
  const artigos: Artigo[] = [];
  for (const node of nodes) {
    if (node.tipo === "artigo") {
      artigos.push(node as Artigo);
    } else {
      const estrutura = node as NodoEstrutura;
      if (estrutura.filhos) {
        artigos.push(...extractArtigos(estrutura.filhos));
      }
    }
  }
  return artigos;
}

/** Checks if an article matches a local search term */
function artigoMatchesSearch(artigo: Artigo, term: string): boolean {
  const lower = term.toLowerCase();
  if (artigo.caput.toLowerCase().includes(lower)) return true;
  for (const par of artigo.paragrafos) {
    if (par.texto.toLowerCase().includes(lower)) return true;
  }
  for (const inciso of artigo.incisos) {
    if (inciso.texto.toLowerCase().includes(lower)) return true;
    if (inciso.alineas) {
      for (const alinea of inciso.alineas) {
        if (alinea.texto.toLowerCase().includes(lower)) return true;
      }
    }
  }
  return false;
}

export function LegislacaoTabs({ selectedLeiId, scrollToArtigoId }: LegislacaoTabsProps) {
  const [activeLeiId, setActiveLeiId] = useState<string>(selectedLeiId || LEGISLACOES[0].id);
  const [leiData, setLeiData] = useState<Legislacao | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const articlesContainerRef = useRef<HTMLDivElement>(null);

  // Update active tab when selectedLeiId prop changes
  useEffect(() => {
    if (selectedLeiId && selectedLeiId !== activeLeiId) {
      setActiveLeiId(selectedLeiId);
    }
  }, [selectedLeiId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set pending scroll when prop changes
  useEffect(() => {
    if (scrollToArtigoId) {
      setPendingScrollId(scrollToArtigoId);
    }
  }, [scrollToArtigoId]);

  // Load law data when active tab changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLeiData(null);
    setLocalSearch("");

    loadLegislacao(activeLeiId).then((data) => {
      if (!cancelled) {
        setLeiData(data);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeLeiId]);

  // Scroll to article after data loads
  useEffect(() => {
    if (!pendingScrollId || !leiData || isLoading) return;

    // Small delay to let DOM render
    const timer = setTimeout(() => {
      const el = document.getElementById(`artigo-${pendingScrollId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Brief highlight effect
        el.classList.add("ring-2", "ring-emerald-500/50");
        setTimeout(() => el.classList.remove("ring-2", "ring-emerald-500/50"), 2000);
      }
      setPendingScrollId(null);
    }, 100);

    return () => clearTimeout(timer);
  }, [pendingScrollId, leiData, isLoading]);

  const activeMeta = LEGISLACOES.find((l) => l.id === activeLeiId);

  // Extract and filter articles
  const allArtigos = leiData ? extractArtigos(leiData.estrutura) : [];
  const searchTerm = localSearch.trim();
  const filteredArtigos = searchTerm.length >= 2
    ? allArtigos.filter((a) => artigoMatchesSearch(a, searchTerm))
    : allArtigos;

  const handleTabClick = useCallback((leiId: string) => {
    setActiveLeiId(leiId);
    setPendingScrollId(null);
  }, []);

  return (
    <div className="w-full">
      {/* Horizontal scrollable tabs */}
      <ScrollArea className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-t-lg">
        <div className="flex gap-1 p-2">
          {LEGISLACOES.map((lei) => {
            const isActive = lei.id === activeLeiId;
            return (
              <button
                key={lei.id}
                onClick={() => handleTabClick(lei.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0",
                  isActive
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <div
                  className="w-1 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: lei.cor }}
                />
                {lei.nomeAbreviado}
                {isActive && leiData && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {allArtigos.length}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Sticky sub-header */}
      {activeMeta && (
        <div className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2 h-6 rounded-full shrink-0"
                style={{ backgroundColor: activeMeta.cor }}
              />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {activeMeta.nome}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {activeMeta.referencia}
                  {leiData && ` \u2022 ${allArtigos.length} artigos`}
                  {searchTerm.length >= 2 && ` \u2022 ${filteredArtigos.length} encontrados`}
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder={`Buscar em ${activeMeta.nomeAbreviado}...`}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Articles content */}
      <div ref={articlesContainerRef} className="p-4">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6 mt-1.5" />
                <Skeleton className="h-4 w-4/6 mt-1.5" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !leiData && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <BookOpen className="w-10 h-10 mb-3 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium">Lei ainda nao disponivel</p>
            <p className="text-xs mt-1">Os dados desta lei serao adicionados em breve</p>
          </div>
        )}

        {!isLoading && leiData && filteredArtigos.length === 0 && searchTerm.length >= 2 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Search className="w-10 h-10 mb-3 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium">Nenhum artigo encontrado</p>
            <p className="text-xs mt-1">Tente outro termo de busca</p>
          </div>
        )}

        {!isLoading && leiData && filteredArtigos.length > 0 && (
          <div className="space-y-3">
            {filteredArtigos.map((artigo) => (
              <div key={artigo.id} id={`artigo-${artigo.id}`} className="transition-all duration-300 rounded-lg">
                <ArtigoRenderer
                  artigo={artigo}
                  leiAbreviado={activeMeta?.nomeAbreviado || ""}
                  searchHighlight={searchTerm.length >= 2 ? searchTerm : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
