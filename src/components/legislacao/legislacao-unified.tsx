"use client";

import { useState, useCallback } from "react";
import { LeiSelectorPanel } from "./lei-selector-panel";
import { LegislacaoTree } from "./legislacao-tree";
import { LegislacaoSearch } from "./legislacao-search";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LEGISLACOES } from "@/config/legislacao";

const STORAGE_KEY_LEI = "legislacao:leiId";
const STORAGE_KEY_COLLAPSED = "legislacao:sidebarCollapsed";

function getInitialLeiId(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem(STORAGE_KEY_LEI) ?? LEGISLACOES[0]?.id ?? "";
  }
  return LEGISLACOES[0]?.id ?? "";
}

function getInitialCollapsed(): boolean {
  if (typeof window !== "undefined") {
    return localStorage.getItem(STORAGE_KEY_COLLAPSED) === "true";
  }
  return false;
}

export function LegislacaoUnified() {
  const [selectedLeiId, setSelectedLeiId] = useState<string>(getInitialLeiId);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(getInitialCollapsed);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [mobileLawSheetOpen, setMobileLawSheetOpen] = useState(false);

  const handleSelectLei = useCallback((id: string) => {
    setSelectedLeiId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_LEI, id);
    }
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_COLLAPSED, String(next));
      }
      return next;
    });
  }, []);

  const handleSearchResultClick = useCallback((leiId: string, _artigoId: string) => {
    handleSelectLei(leiId);
    setGlobalSearchOpen(false);
  }, [handleSelectLei]);

  return (
    <div className="flex h-full overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-border dark:bg-background">
      {/* Coluna 1 — Lei Selector (large desktop only) */}
      <div className="hidden lg:flex">
        <LeiSelectorPanel
          selectedLeiId={selectedLeiId}
          onSelect={handleSelectLei}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Colunas 2 + 3 — Árvore + Artigo */}
      <LegislacaoTree
        selectedLeiId={selectedLeiId}
        onOpenGlobalSearch={() => setGlobalSearchOpen(true)}
        onOpenLawSelector={() => setMobileLawSheetOpen(true)}
      />

      {/* Modal de busca global */}
      <Dialog open={globalSearchOpen} onOpenChange={setGlobalSearchOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Buscar em todas as leis
            </DialogTitle>
          </DialogHeader>
          <LegislacaoSearch onResultClick={handleSearchResultClick} />
        </DialogContent>
      </Dialog>

      {/* Mobile — Lei Selector Sheet */}
      <Sheet open={mobileLawSheetOpen} onOpenChange={setMobileLawSheetOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b border-zinc-200 dark:border-border px-4 py-3">
            <SheetTitle className="text-sm">Legislação</SheetTitle>
          </SheetHeader>
          <LeiSelectorPanel
            selectedLeiId={selectedLeiId}
            onSelect={(id) => {
              handleSelectLei(id);
              setMobileLawSheetOpen(false);
            }}
            collapsed={false}
            onToggleCollapse={() => {}}
            hideToggle
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
