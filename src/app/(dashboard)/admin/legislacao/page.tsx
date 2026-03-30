"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Scale, Bookmark, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegislacaoUnified } from "@/components/legislacao/legislacao-unified";
import { DestaquesSheet } from "@/components/legislacao/destaques-sheet";
import { UpdateModal } from "@/components/legislacao/update-modal";

export default function LegislacaoPage() {
  const [destaquesOpen, setDestaquesOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-zinc-50/50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-border bg-white dark:bg-card shrink-0">
        <div className="px-6 py-4">
          <Breadcrumbs
            items={[{ label: "Dashboard", href: "/admin" }, { label: "Legislação" }]}
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Legislação
                </h1>
                <p className="text-sm text-zinc-500">
                  28 leis — consulta rápida com navegação hierárquica
                </p>
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
        </div>
      </div>

      {/* Interface unificada */}
      <div className="flex-1 overflow-hidden p-4">
        <LegislacaoUnified />
      </div>

      {/* Panels */}
      <DestaquesSheet
        open={destaquesOpen}
        onOpenChange={setDestaquesOpen}
        onNavigate={(leiId, artigoId) => {
          if (typeof window !== "undefined") {
            localStorage.setItem("legislacao:leiId", leiId);
            localStorage.setItem("legislacao:artigoId", artigoId);
          }
          setDestaquesOpen(false);
        }}
      />
      <UpdateModal open={updateOpen} onOpenChange={setUpdateOpen} />
    </div>
  );
}
