"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Search, BookOpen, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LEGISLACOES } from "@/config/legislacao";
import type { LegislacaoMeta, Artigo, NodoEstrutura } from "@/config/legislacao";
import { loadLegislacao } from "@/config/legislacao/loader";

// ==========================================
// LEGISLACAO SEARCH - Busca global em todas as leis
// ==========================================

interface LegislacaoSearchProps {
  onResultClick: (leiId: string, artigoId: string) => void;
}

interface SearchResult {
  leiId: string;
  leiMeta: LegislacaoMeta;
  artigoId: string;
  artigoNumero: string;
  matchText: string;
  matchSource: "caput" | "paragrafo" | "inciso" | "alinea";
}

const MAX_INITIAL_RESULTS = 50;

/** Extracts all articles from a nested structure */
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

/** Highlights the search term in text, returning JSX */
function highlightTerm(text: string, term: string) {
  if (!term.trim()) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/60 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

/** Truncates text around the first match */
function truncateAroundMatch(text: string, term: string, contextChars = 80): string {
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const idx = lowerText.indexOf(lowerTerm);
  if (idx === -1) return text.slice(0, contextChars * 2) + (text.length > contextChars * 2 ? "..." : "");

  const start = Math.max(0, idx - contextChars);
  const end = Math.min(text.length, idx + term.length + contextChars);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return prefix + text.slice(start, end) + suffix;
}

export function LegislacaoSearch({ onResultClick }: LegislacaoSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [filterLeiId, setFilterLeiId] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setShowAll(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const searchTerm = query.trim().toLowerCase();
      const allResults: SearchResult[] = [];

      await Promise.all(
        LEGISLACOES.map(async (meta) => {
          const lei = await loadLegislacao(meta.id);
          if (!lei) return;

          const artigos = extractArtigos(lei.estrutura);
          for (const artigo of artigos) {
            // Search caput
            if (artigo.caput.toLowerCase().includes(searchTerm)) {
              allResults.push({
                leiId: meta.id,
                leiMeta: meta,
                artigoId: artigo.id,
                artigoNumero: artigo.numero,
                matchText: artigo.caput,
                matchSource: "caput",
              });
              continue; // One result per article
            }

            // Search paragrafos
            let found = false;
            for (const par of artigo.paragrafos) {
              if (par.texto.toLowerCase().includes(searchTerm)) {
                allResults.push({
                  leiId: meta.id,
                  leiMeta: meta,
                  artigoId: artigo.id,
                  artigoNumero: artigo.numero,
                  matchText: par.texto,
                  matchSource: "paragrafo",
                });
                found = true;
                break;
              }
            }
            if (found) continue;

            // Search incisos
            for (const inciso of artigo.incisos) {
              if (inciso.texto.toLowerCase().includes(searchTerm)) {
                allResults.push({
                  leiId: meta.id,
                  leiMeta: meta,
                  artigoId: artigo.id,
                  artigoNumero: artigo.numero,
                  matchText: inciso.texto,
                  matchSource: "inciso",
                });
                found = true;
                break;
              }
              // Search alineas
              if (inciso.alineas) {
                for (const alinea of inciso.alineas) {
                  if (alinea.texto.toLowerCase().includes(searchTerm)) {
                    allResults.push({
                      leiId: meta.id,
                      leiMeta: meta,
                      artigoId: artigo.id,
                      artigoNumero: artigo.numero,
                      matchText: alinea.texto,
                      matchSource: "alinea",
                    });
                    found = true;
                    break;
                  }
                }
              }
              if (found) break;
            }
          }
        })
      );

      setResults(allResults);
      setShowAll(false);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const filteredResults = filterLeiId
    ? results.filter((r) => r.leiId === filterLeiId)
    : results;

  const displayedResults = showAll
    ? filteredResults
    : filteredResults.slice(0, MAX_INITIAL_RESULTS);

  // Group results by lei for summary
  const resultsByLei = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.leiId] = (acc[r.leiId] || 0) + 1;
    return acc;
  }, {});

  const hasQuery = query.trim().length >= 2;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search input */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar em todas as 15 leis... (ex: homicidio, flagrante, audiencia)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12 h-12 text-base rounded-xl border-zinc-300 dark:border-border bg-white dark:bg-card focus-visible:ring-emerald-500"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Results area */}
      {hasQuery && !isSearching && results.length > 0 && (
        <div className="space-y-4">
          {/* Summary + filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-500 dark:text-muted-foreground">
              {filteredResults.length} resultado{filteredResults.length !== 1 ? "s" : ""}
              {filterLeiId && " (filtrado)"}
            </span>
            <div className="flex flex-wrap gap-1.5 ml-2">
              {filterLeiId && (
                <button
                  onClick={() => setFilterLeiId(null)}
                  className="text-xs px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-muted text-zinc-600 dark:text-foreground/80 hover:bg-zinc-300 dark:hover:bg-muted transition-colors cursor-pointer"
                >
                  Limpar filtro
                </button>
              )}
              {Object.entries(resultsByLei).map(([leiId, count]) => {
                const meta = LEGISLACOES.find((l) => l.id === leiId);
                if (!meta) return null;
                return (
                  <button
                    key={leiId}
                    onClick={() => setFilterLeiId(filterLeiId === leiId ? null : leiId)}
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border transition-colors cursor-pointer",
                      filterLeiId === leiId
                        ? "border-current font-medium"
                        : "border-zinc-200 dark:border-border hover:border-zinc-300 dark:hover:border-border"
                    )}
                    style={{
                      color: meta.cor,
                      borderColor: filterLeiId === leiId ? meta.cor : undefined,
                      backgroundColor: filterLeiId === leiId ? `${meta.cor}15` : undefined,
                    }}
                  >
                    {meta.nomeAbreviado} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Result list */}
          <div className="space-y-2">
            {displayedResults.map((result, idx) => (
              <button
                key={`${result.leiId}-${result.artigoId}-${idx}`}
                onClick={() => onResultClick(result.leiId, result.artigoId)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 transition-colors cursor-pointer",
                  "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50",
                  "dark:border-border dark:bg-card dark:hover:border-border dark:hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold shrink-0 border-current"
                    style={{ color: result.leiMeta.cor, borderColor: result.leiMeta.cor }}
                  >
                    {result.leiMeta.nomeAbreviado}
                  </Badge>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    Art. {result.artigoNumero}
                  </span>
                  <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                    {result.matchSource === "caput"
                      ? ""
                      : result.matchSource === "paragrafo"
                        ? "(paragrafo)"
                        : result.matchSource === "inciso"
                          ? "(inciso)"
                          : "(alinea)"}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-foreground/80 line-clamp-2 leading-relaxed">
                  {highlightTerm(truncateAroundMatch(result.matchText, query.trim()), query.trim())}
                </p>
              </button>
            ))}
          </div>

          {/* Show more */}
          {!showAll && filteredResults.length > MAX_INITIAL_RESULTS && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(true)}
                className="gap-2"
              >
                Mostrar mais ({filteredResults.length - MAX_INITIAL_RESULTS} restantes)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {hasQuery && !isSearching && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
          <Search className="w-10 h-10 mb-3 text-muted-foreground/50" />
          <p className="text-sm font-medium">Nenhum resultado encontrado</p>
          <p className="text-xs mt-1">Tente outro termo de busca</p>
        </div>
      )}

      {/* Loading skeleton */}
      {isSearching && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 dark:border-border p-3">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-1" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state: law cards grid */}
      {!hasQuery && !isSearching && (
        <div>
          <p className="text-sm text-zinc-500 dark:text-muted-foreground mb-4 text-center">
            Selecione uma lei para navegar ou digite para buscar
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {LEGISLACOES.map((lei) => (
              <button
                key={lei.id}
                onClick={() => onResultClick(lei.id, "")}
                className={cn(
                  "group/card flex flex-col items-start p-3 rounded-lg border transition-all cursor-pointer",
                  "border-zinc-200 bg-white hover:shadow-md hover:border-zinc-300",
                  "dark:border-border dark:bg-card dark:hover:border-border"
                )}
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center mb-2"
                  style={{ backgroundColor: `${lei.cor}15` }}
                >
                  <BookOpen className="w-4 h-4" style={{ color: lei.cor }} />
                </div>
                <span
                  className="text-sm font-bold"
                  style={{ color: lei.cor }}
                >
                  {lei.nomeAbreviado}
                </span>
                <span className="text-xs text-zinc-500 dark:text-muted-foreground mt-0.5 text-left leading-tight">
                  {lei.nome}
                </span>
                <span className="text-[10px] text-muted-foreground dark:text-muted-foreground mt-1">
                  {lei.referencia}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
