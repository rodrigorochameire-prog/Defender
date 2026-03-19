"use client";

import { useState, useCallback } from "react";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Scale, BookOpen, Search, TreePine, Bookmark, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LegislacaoSearch } from "@/components/legislacao/legislacao-search";
import { LegislacaoTabs } from "@/components/legislacao/legislacao-tabs";
import { LegislacaoTree } from "@/components/legislacao/legislacao-tree";
import { DestaquesSheet } from "@/components/legislacao/destaques-sheet";
import { UpdateModal } from "@/components/legislacao/update-modal";
import { LEGISLACOES } from "@/config/legislacao";

type NavigationMode = "search" | "tabs" | "tree";

const MODES: { value: NavigationMode; label: string; icon: typeof Search }[] = [
  { value: "search", label: "Busca Global", icon: Search },
  { value: "tabs", label: "Por Lei", icon: BookOpen },
  { value: "tree", label: "Árvore", icon: TreePine },
];

export default function LegislacaoPage() {
  const [mode, setMode] = useState<NavigationMode>("search");
  const [destaquesOpen, setDestaquesOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedLeiId, setSelectedLeiId] = useState<string | null>(null);
  const [scrollToArtigoId, setScrollToArtigoId] = useState<string | null>(null);

  const handleSearchResultClick = useCallback((leiId: string, artigoId: string) => {
    setSelectedLeiId(leiId);
    setScrollToArtigoId(artigoId);
    setMode("tabs");
  }, []);

  const handleDestaquesNavigate = useCallback((leiId: string, artigoId: string) => {
    setSelectedLeiId(leiId);
    setScrollToArtigoId(artigoId);
    setMode("tabs");
    setDestaquesOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-6 py-4">
          <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Legislação" }]} />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Legislação</h1>
                <p className="text-sm text-zinc-500">Consulta rápida de leis penais e complementares</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDestaquesOpen(true)}
                className="gap-2"
              >
                <Bookmark className="w-4 h-4" />
                Meus Destaques
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUpdateOpen(true)}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Mode switcher (custom buttons instead of Radix Tabs) */}
          <div className="mt-4 flex gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 w-fit">
            {MODES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  mode === value
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content by mode */}
      <div className="p-6">
        {mode === "search" && (
          <LegislacaoSearch onResultClick={handleSearchResultClick} />
        )}
        {mode === "tabs" && (
          <LegislacaoTabs selectedLeiId={selectedLeiId} scrollToArtigoId={scrollToArtigoId} />
        )}
        {mode === "tree" && (
          <div className="h-[calc(100vh-220px)]">
            <LegislacaoTree
              selectedLeiId={selectedLeiId ?? (LEGISLACOES[0]?.id ?? "")}
              onOpenGlobalSearch={() => setMode("search")}
            />
          </div>
        )}
      </div>

      {/* Panels */}
      <DestaquesSheet
        open={destaquesOpen}
        onOpenChange={setDestaquesOpen}
        onNavigate={handleDestaquesNavigate}
      />
      <UpdateModal
        open={updateOpen}
        onOpenChange={setUpdateOpen}
      />
    </div>
  );
}
