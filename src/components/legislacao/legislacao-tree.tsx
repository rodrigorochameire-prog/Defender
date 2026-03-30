"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  ArrowLeft,
  ArrowRight,
  Loader2,
  BookOpen,
  Search,
  X,
  ChevronsDownUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { LEGISLACOES } from "@/config/legislacao";
import type {
  Legislacao,
  NodoEstrutura,
  Artigo,
} from "@/config/legislacao/types";
import { loadLegislacao } from "@/config/legislacao/loader";
import { ArtigoRenderer } from "./artigo-renderer";

// ==========================================
// Helpers
// ==========================================

/** Collect all Artigo nodes in tree order */
function collectArtigosFromFilhos(nodes: (NodoEstrutura | Artigo)[]): Artigo[] {
  const result: Artigo[] = [];
  for (const node of nodes) {
    if (node.tipo === "artigo") {
      result.push(node);
    } else {
      result.push(...collectArtigosFromFilhos((node as NodoEstrutura).filhos));
    }
  }
  return result;
}

function collectArtigos(nodes: NodoEstrutura[]): Artigo[] {
  const result: Artigo[] = [];
  for (const node of nodes) {
    result.push(...collectArtigosFromFilhos(node.filhos));
  }
  return result;
}

/** Count articles under a structure node */
function countArtigos(node: NodoEstrutura): number {
  let count = 0;
  for (const child of node.filhos) {
    if (child.tipo === "artigo") {
      count++;
    } else {
      count += countArtigos(child as NodoEstrutura);
    }
  }
  return count;
}

/** Search for article in mixed children array */
function findInFilhos(
  filhos: (NodoEstrutura | Artigo)[],
  targetId: string
): string[] {
  for (const node of filhos) {
    if (node.tipo === "artigo") {
      if ((node as Artigo).id === targetId) {
        return [`Art. ${(node as Artigo).numero}`];
      }
    } else {
      const sub = findInFilhos((node as NodoEstrutura).filhos, targetId);
      if (sub.length > 0) {
        return [(node as NodoEstrutura).nome, ...sub];
      }
    }
  }
  return [];
}

/** Build breadcrumb path for a given article within the structure */
function buildBreadcrumb(
  estrutura: NodoEstrutura[],
  targetId: string
): string[] {
  for (const node of estrutura) {
    const sub = findInFilhos(node.filhos, targetId);
    if (sub.length > 0) {
      return [node.nome, ...sub];
    }
  }
  return [];
}

/** Build the node path key for expand tracking */
function nodePath(parentPath: string, nome: string): string {
  return parentPath ? `${parentPath}/${nome}` : nome;
}

// ==========================================
// localStorage keys
// ==========================================

const STORAGE_KEY_ARTIGO = "legislacao:artigoId";
const storageKeyExpanded = (leiId: string) => `legislacao:expanded:${leiId}`;

// ==========================================
// TreeNode component
// ==========================================

interface TreeNodeProps {
  node: NodoEstrutura;
  depth: number;
  path: string;
  expandedNodes: Set<string>;
  selectedArtigoId: string | null;
  onToggle: (path: string) => void;
  onSelectArtigo: (id: string) => void;
}

function TreeNode({
  node,
  depth,
  path,
  expandedNodes,
  selectedArtigoId,
  onToggle,
  onSelectArtigo,
}: TreeNodeProps) {
  const currentPath = nodePath(path, node.nome);
  const isExpanded = expandedNodes.has(currentPath);
  const articleCount = countArtigos(node);

  return (
    <div>
      {/* Structure node header */}
      <button
        type="button"
        onClick={() => onToggle(currentPath)}
        className={cn(
          "flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
          "hover:bg-zinc-100 dark:hover:bg-muted",
          "text-zinc-700 dark:text-foreground/80"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate font-medium">{node.nome}</span>
        <span className="ml-auto shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-muted">
          {articleCount}
        </span>
      </button>

      {/* Children (expanded) */}
      {isExpanded && (
        <div>
          {node.filhos.map((child, i) => {
            if (child.tipo === "artigo") {
              const artigo = child as Artigo;
              const isSelected = artigo.id === selectedArtigoId;
              return (
                <button
                  key={artigo.id}
                  type="button"
                  onClick={() => onSelectArtigo(artigo.id)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors",
                    isSelected
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-muted-foreground dark:hover:bg-muted"
                  )}
                  style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
                >
                  <FileText
                    className={cn(
                      "h-3 w-3 shrink-0",
                      isSelected
                        ? "text-emerald-500"
                        : "text-muted-foreground dark:text-muted-foreground"
                    )}
                  />
                  <span className="truncate">Art. {artigo.numero}</span>
                  {artigo.rubrica && (
                    <span className="ml-1 truncate text-[10px] text-muted-foreground">
                      {artigo.rubrica}
                    </span>
                  )}
                </button>
              );
            }

            return (
              <TreeNode
                key={`${currentPath}/${(child as NodoEstrutura).nome}-${i}`}
                node={child as NodoEstrutura}
                depth={depth + 1}
                path={currentPath}
                expandedNodes={expandedNodes}
                selectedArtigoId={selectedArtigoId}
                onToggle={onToggle}
                onSelectArtigo={onSelectArtigo}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// LegislacaoTree — main component
// ==========================================

interface LegislacaoTreeProps {
  selectedLeiId: string;
  onOpenGlobalSearch: () => void;
  onOpenLawSelector?: () => void;
}

export function LegislacaoTree({
  selectedLeiId,
  onOpenGlobalSearch,
  onOpenLawSelector,
}: LegislacaoTreeProps) {
  const [lei, setLei] = useState<Legislacao | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedArtigoId, setSelectedArtigoId] = useState<string | null>(null);

  // Inline search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);
  const [searchResults, setSearchResults] = useState<Artigo[]>([]);

  // Load law data when selection changes
  useEffect(() => {
    if (!selectedLeiId) return;
    let cancelled = false;

    setLoading(true);
    setSearchQuery("");
    setIsFiltering(false);

    // Restore expanded nodes for this law
    const savedExpanded =
      typeof window !== "undefined"
        ? localStorage.getItem(storageKeyExpanded(selectedLeiId))
        : null;
    const initialExpanded = savedExpanded
      ? new Set<string>(JSON.parse(savedExpanded) as string[])
      : new Set<string>();

    loadLegislacao(selectedLeiId).then((data) => {
      if (cancelled) return;
      setLei(data);
      setExpandedNodes(initialExpanded);

      // Restore selected article
      const savedArtigoId =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY_ARTIGO)
          : null;
      if (savedArtigoId) setSelectedArtigoId(savedArtigoId);
      else setSelectedArtigoId(null);

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedLeiId]);

  // Persist selected article to localStorage
  useEffect(() => {
    if (selectedArtigoId && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ARTIGO, selectedArtigoId);
    }
  }, [selectedArtigoId]);

  // Persist expanded nodes to localStorage
  useEffect(() => {
    if (selectedLeiId && typeof window !== "undefined") {
      localStorage.setItem(
        storageKeyExpanded(selectedLeiId),
        JSON.stringify(Array.from(expandedNodes))
      );
    }
  }, [expandedNodes, selectedLeiId]);

  // Flat list of all articles for prev/next navigation and inline search
  const allArtigos = useMemo(
    () => (lei ? collectArtigos(lei.estrutura) : []),
    [lei]
  );

  // Inline search effect
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !lei) {
      setIsFiltering(false);
      setSearchResults([]);
      return;
    }
    setIsFiltering(true);

    // Numeric search: instant (by article number prefix)
    const isNumeric = /^\d/.test(q);
    if (isNumeric) {
      setSearchResults(allArtigos.filter((a) => a.numero.startsWith(q)));
      return;
    }

    // Text search: debounced 300ms
    const timer = setTimeout(() => {
      setSearchResults(
        allArtigos.filter(
          (a) =>
            a.caput.toLowerCase().includes(q) ||
            a.paragrafos.some((p) => p.texto.toLowerCase().includes(q)) ||
            a.incisos.some((i) => i.texto.toLowerCase().includes(q))
        )
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, lei, allArtigos]);

  const selectedArtigo = useMemo(
    () => allArtigos.find((a) => a.id === selectedArtigoId) ?? null,
    [allArtigos, selectedArtigoId]
  );

  const selectedIndex = useMemo(
    () =>
      selectedArtigoId
        ? allArtigos.findIndex((a) => a.id === selectedArtigoId)
        : -1,
    [allArtigos, selectedArtigoId]
  );

  const leiMeta = useMemo(
    () => LEGISLACOES.find((l) => l.id === selectedLeiId),
    [selectedLeiId]
  );

  // Breadcrumb path
  const breadcrumb = useMemo(() => {
    if (!lei || !selectedArtigoId) return [];
    const path = buildBreadcrumb(lei.estrutura, selectedArtigoId);
    return [leiMeta?.nomeAbreviado ?? lei.nomeAbreviado, ...path];
  }, [lei, selectedArtigoId, leiMeta]);

  // Handlers
  const handleToggle = useCallback((path: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleSelectArtigo = useCallback(
    (id: string) => {
      setSelectedArtigoId(id);

      // Auto-expand parent nodes so the selected article is visible
      if (!lei) return;
      const path = buildBreadcrumb(lei.estrutura, id);
      if (path.length <= 1) return;

      setExpandedNodes((prev) => {
        const next = new Set(prev);
        // Rebuild the node paths from the breadcrumb (excluding the article itself)
        const parentNames = path.slice(0, -1);
        let accumulated = "";
        for (const name of parentNames) {
          accumulated = accumulated ? `${accumulated}/${name}` : name;
          next.add(accumulated);
        }
        return next;
      });
    },
    [lei]
  );

  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  const goToPrev = useCallback(() => {
    if (selectedIndex > 0) {
      handleSelectArtigo(allArtigos[selectedIndex - 1].id);
    }
  }, [selectedIndex, allArtigos, handleSelectArtigo]);

  const goToNext = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < allArtigos.length - 1) {
      handleSelectArtigo(allArtigos[selectedIndex + 1].id);
    }
  }, [selectedIndex, allArtigos, handleSelectArtigo]);

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      {/* ===== Left Sidebar (Tree) ===== */}
      <div
        className={cn(
          "flex flex-col border-r border-zinc-200 dark:border-border shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden",
          // Mobile: full width when no article, hidden when article selected
          // Desktop: shrinks slightly when article is open (focus effect)
          selectedArtigo
            ? "hidden md:flex md:w-56 lg:w-52"
            : "flex w-full md:w-64 lg:w-[17rem]"
        )}
      >
        {/* Search inline */}
        <div className="border-b border-zinc-200 dark:border-border p-2">
          {/* Mobile header: law selector button + search */}
          {onOpenLawSelector && (
            <div className="flex items-center gap-2 mb-2 lg:hidden">
              <button
                type="button"
                onClick={onOpenLawSelector}
                className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-border px-2 py-1 text-xs text-zinc-600 dark:text-muted-foreground hover:bg-zinc-50 dark:hover:bg-muted transition-colors cursor-pointer"
              >
                <span className="font-medium text-[11px]">Leis</span>
                <ChevronRight className="h-3 w-3" />
              </button>
              <span className="text-[10px] text-muted-foreground">
                {LEGISLACOES.find((l) => l.id === selectedLeiId)?.nomeAbreviado ?? ""}
              </span>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Artigo ou texto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-zinc-200 dark:border-border bg-zinc-50 dark:bg-card pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsFiltering(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <button
              type="button"
              onClick={onOpenGlobalSearch}
              className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Buscar em todas as leis →
            </button>
            {expandedNodes.size > 0 && (
              <button
                type="button"
                onClick={handleCollapseAll}
                title="Colapsar tudo"
                className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground/80 cursor-pointer transition-colors"
              >
                <ChevronsDownUp className="h-3 w-3" />
                Colapsar
              </button>
            )}
          </div>
        </div>

        {/* Tree or filtered results */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : isFiltering ? (
              /* Filtered results list */
              searchResults.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">
                  Nenhum artigo encontrado
                </p>
              ) : (
                <div className="space-y-0.5">
                  {searchResults.map((artigo) => (
                    <button
                      key={artigo.id}
                      type="button"
                      onClick={() => handleSelectArtigo(artigo.id)}
                      className={cn(
                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors cursor-pointer",
                        selectedArtigoId === artigo.id
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "hover:bg-zinc-100 dark:hover:bg-muted text-zinc-600 dark:text-muted-foreground"
                      )}
                    >
                      <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="font-medium">Art. {artigo.numero}</span>
                      {artigo.rubrica && (
                        <span className="truncate text-[10px] text-muted-foreground">
                          {artigo.rubrica}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )
            ) : lei && lei.estrutura.length > 0 ? (
              /* Hierarchical tree */
              <div className="space-y-0.5">
                {lei.estrutura.map((node, i) => (
                  <TreeNode
                    key={`root-${node.nome}-${i}`}
                    node={node}
                    depth={0}
                    path=""
                    expandedNodes={expandedNodes}
                    selectedArtigoId={selectedArtigoId}
                    onToggle={handleToggle}
                    onSelectArtigo={handleSelectArtigo}
                  />
                ))}
              </div>
            ) : !loading && lei ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Nenhuma estrutura encontrada
              </p>
            ) : !loading ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Lei não encontrada
              </p>
            ) : null}
          </div>
        </ScrollArea>

        {/* Article count footer */}
        {lei && (
          <div className="border-t border-zinc-200 dark:border-border px-3 py-2 text-[10px] text-muted-foreground">
            {allArtigos.length} artigos
          </div>
        )}
      </div>

      {/* ===== Right Content Panel ===== */}
      <div
        className={cn(
          "flex-1 flex-col overflow-hidden",
          // Mobile: only show when article is selected; desktop: always visible
          selectedArtigo ? "flex" : "hidden md:flex"
        )}
      >
        {selectedArtigo && leiMeta ? (
          <>
            {/* Breadcrumb + mobile back button */}
            <div className="flex items-center gap-1 border-b border-zinc-200 px-3 py-2 dark:border-border md:px-4">
              {/* Mobile back button */}
              <button
                type="button"
                onClick={() => setSelectedArtigoId(null)}
                className="mr-1 flex shrink-0 items-center gap-1 rounded-md p-1 text-xs text-muted-foreground hover:bg-zinc-100 hover:text-foreground dark:hover:bg-muted dark:hover:text-foreground transition-colors cursor-pointer md:hidden"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              {breadcrumb.map((segment, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground/30 dark:text-muted-foreground/50" />
                  )}
                  <span
                    className={cn(
                      "text-xs",
                      i === breadcrumb.length - 1
                        ? "font-medium text-emerald-700 dark:text-emerald-400"
                        : "text-zinc-500 dark:text-muted-foreground"
                    )}
                  >
                    {segment}
                  </span>
                </span>
              ))}
            </div>

            {/* Article content */}
            <ScrollArea className="flex-1">
              <div className="mx-auto max-w-2xl p-6">
                <ArtigoRenderer
                  artigo={selectedArtigo}
                  leiAbreviado={leiMeta.nomeAbreviado}
                  leiId={selectedLeiId}
                />
              </div>
            </ScrollArea>

            {/* Prev / Next navigation */}
            <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-2 dark:border-border">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                disabled={selectedIndex <= 0}
                onClick={goToPrev}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Anterior
              </Button>
              <span className="text-[10px] text-muted-foreground">
                {selectedIndex + 1} / {allArtigos.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                disabled={selectedIndex >= allArtigos.length - 1}
                onClick={goToNext}
              >
                Próximo
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Selecione um artigo
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Navegue pela estrutura da lei no painel lateral
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
