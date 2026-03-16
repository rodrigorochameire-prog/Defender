"use client";

import { useState, useCallback } from "react";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Newspaper, Scale, Gavel, BookOpen, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { NoticiasFeed } from "@/components/noticias/noticias-feed";
import { NoticiasTriagem } from "@/components/noticias/noticias-triagem";

type Tab = "legislativa" | "jurisprudencial" | "artigo";

const TABS: { value: Tab; label: string; icon: typeof Scale }[] = [
  { value: "legislativa", label: "Legislativas", icon: Scale },
  { value: "jurisprudencial", label: "Jurisprudenciais", icon: Gavel },
  { value: "artigo", label: "Artigos", icon: BookOpen },
];

export default function NoticiasPage() {
  const [tab, setTab] = useState<Tab>("legislativa");
  const [triagemOpen, setTriagemOpen] = useState(true);

  const { data: pendentesCount } = trpc.noticias.countPendentes.useQuery();
  const buscarAgora = trpc.noticias.buscarAgora.useMutation();
  const utils = trpc.useUtils();

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
              onClick={handleBuscarAgora}
              disabled={buscarAgora.isPending}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", buscarAgora.isPending && "animate-spin")} />
              Buscar Agora
            </Button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-1 w-fit">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
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

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        <NoticiasFeed categoria={tab} />
      </div>
    </div>
  );
}
