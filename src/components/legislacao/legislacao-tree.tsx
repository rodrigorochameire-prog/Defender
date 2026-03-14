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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
          "hover:bg-zinc-100 dark:hover:bg-zinc-800",
          "text-zinc-700 dark:text-zinc-300"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        )}
        <span className="truncate font-medium">{node.nome}</span>
        <span className="ml-auto shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
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
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  )}
                  style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
                >
                  <FileText
                    className={cn(
                      "h-3 w-3 shrink-0",
                      isSelected
                        ? "text-emerald-500"
                        : "text-zinc-400 dark:text-zinc-500"
                    )}
                  />
                  <span className="truncate">Art. {artigo.numero}</span>
                  {artigo.rubrica && (
                    <span className="ml-1 truncate text-[10px] text-zinc-400 dark:text-zinc-500">
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

export function LegislacaoTree() {
  const [selectedLeiId, setSelectedLeiId] = useState<string>(
    LEGISLACOES[0]?.id ?? ""
  );
  const [lei, setLei] = useState<Legislacao | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedArtigoId, setSelectedArtigoId] = useState<string | null>(null);

  // Load law data when selection changes
  useEffect(() => {
    if (!selectedLeiId) return;
    let cancelled = false;

    setLoading(true);
    setSelectedArtigoId(null);
    setExpandedNodes(new Set());

    loadLegislacao(selectedLeiId).then((data) => {
      if (cancelled) return;
      setLei(data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedLeiId]);

  // Flat list of all articles for prev/next navigation
  const allArtigos = useMemo(
    () => (lei ? collectArtigos(lei.estrutura) : []),
    [lei]
  );

  const selectedArtigo = useMemo(
    () => allArtigos.find((a) => a.id === selectedArtigoId) ?? null,
    [allArtigos, selectedArtigoId]
  );

  const selectedIndex = useMemo(
    () => (selectedArtigoId ? allArtigos.findIndex((a) => a.id === selectedArtigoId) : -1),
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
    <div className="flex h-full overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* ===== Left Sidebar ===== */}
      <div className="flex w-72 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
        {/* Law selector */}
        <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
          <Select value={selectedLeiId} onValueChange={setSelectedLeiId}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Selecione uma lei" />
            </SelectTrigger>
            <SelectContent>
              {LEGISLACOES.map((l) => (
                <SelectItem key={l.id} value={l.id} className="text-xs">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: l.cor }}
                    />
                    {l.nomeAbreviado} - {l.nome}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tree */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              </div>
            ) : lei && lei.estrutura.length > 0 ? (
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
              <p className="py-8 text-center text-xs text-zinc-400">
                Nenhuma estrutura encontrada
              </p>
            ) : !loading ? (
              <p className="py-8 text-center text-xs text-zinc-400">
                Lei nao encontrada
              </p>
            ) : null}
          </div>
        </ScrollArea>

        {/* Article count footer */}
        {lei && (
          <div className="border-t border-zinc-200 px-3 py-2 text-[10px] text-zinc-400 dark:border-zinc-800">
            {allArtigos.length} artigos
          </div>
        )}
      </div>

      {/* ===== Right Content Panel ===== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedArtigo && leiMeta ? (
          <>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
              {breadcrumb.map((segment, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && (
                    <ChevronRight className="h-3 w-3 text-zinc-300 dark:text-zinc-600" />
                  )}
                  <span
                    className={cn(
                      "text-xs",
                      i === breadcrumb.length - 1
                        ? "font-medium text-emerald-600 dark:text-emerald-400"
                        : "text-zinc-500 dark:text-zinc-400"
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
                />
              </div>
            </ScrollArea>

            {/* Prev / Next navigation */}
            <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
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
              <span className="text-[10px] text-zinc-400">
                {selectedIndex + 1} / {allArtigos.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                disabled={selectedIndex >= allArtigos.length - 1}
                onClick={goToNext}
              >
                Proximo
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-400">
            <BookOpen className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Selecione um artigo
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Navegue pela estrutura da lei no painel lateral
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
