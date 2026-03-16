"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/shared/page-layout";
import { Button } from "@/components/ui/button";
import { Radio, Newspaper, Map, BarChart3, Link2, RefreshCw, Clock, Users, Globe } from "lucide-react";
import { RadarFeed } from "@/components/radar/radar-feed";
import { RadarFiltros, type FiltrosState } from "@/components/radar/radar-filtros";
import { RadarMapa } from "@/components/radar/radar-mapa";
import { RadarEstatisticas } from "@/components/radar/radar-estatisticas";
import { RadarMatches } from "@/components/radar/radar-matches";
import { RadarReincidentes } from "@/components/radar/radar-reincidentes";
import { RadarFontes } from "@/components/radar/radar-fontes";
import { RadarNoticiaSheet } from "@/components/radar/radar-noticia-sheet";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RadarCriminalPage() {
  const [activeTab, setActiveTab] = useState("feed");
  const [selectedNoticiaId, setSelectedNoticiaId] = useState<number | null>(null);

  // Filtros compartilhados entre tabs
  const [filtros, setFiltros] = useState<FiltrosState>({
    soMatches: false,
  });

  // Última coleta (fonte mais recente)
  const { data: fontes } = trpc.radar.fontesList.useQuery();
  const ultimaColeta = fontes
    ?.map((f) => f.ultimaColeta)
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

  // Pipeline trigger
  const utils = trpc.useUtils();
  const triggerPipeline = trpc.radar.triggerPipeline.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Pipeline concluído", {
          description: data.message || "Notícias atualizadas com sucesso",
        });
        utils.radar.list.invalidate();
        utils.radar.stats.invalidate();
        utils.radar.fontesList.invalidate();
        utils.radar.mapData.invalidate();
      } else {
        toast.error("Falha no pipeline", {
          description: data.message,
        });
      }
    },
    onError: (error) => {
      toast.error("Erro ao atualizar", {
        description: error.message,
      });
    },
  });

  return (
    <PageLayout
      actions={
        <div className="flex items-center gap-3">
          {/* Última coleta */}
          {ultimaColeta && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
              <Clock className="h-3 w-3" />
              <span>
                Atualizado{" "}
                {formatDistanceToNow(new Date(ultimaColeta), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          )}

          {/* Botão atualizar */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 cursor-pointer"
            onClick={() => triggerPipeline.mutate()}
            disabled={triggerPipeline.isPending}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${triggerPipeline.isPending ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {triggerPipeline.isPending ? "Atualizando..." : "Atualizar"}
            </span>
          </Button>

          <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span>Radar Criminal</span>
          </div>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-6">
            <TabsTrigger value="feed" className="cursor-pointer gap-1.5">
              <Newspaper className="h-4 w-4" />
              <span className="hidden sm:inline">Feed</span>
            </TabsTrigger>
            <TabsTrigger value="mapa" className="cursor-pointer gap-1.5">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Mapa</span>
            </TabsTrigger>
            <TabsTrigger value="estatisticas" className="cursor-pointer gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Estatísticas</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="cursor-pointer gap-1.5">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Matches DPE</span>
            </TabsTrigger>
            <TabsTrigger value="reincidentes" className="cursor-pointer gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Reincidentes</span>
            </TabsTrigger>
            <TabsTrigger value="fontes" className="cursor-pointer gap-1.5">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Fontes</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="feed" className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-64 shrink-0">
              <RadarFiltros filtros={filtros} onChange={setFiltros} />
            </div>
            <div className="flex-1 min-w-0">
              <RadarFeed filtros={filtros} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mapa">
          <RadarMapa filtros={filtros} onSelectNoticia={setSelectedNoticiaId} />
        </TabsContent>

        <TabsContent value="estatisticas">
          <RadarEstatisticas />
        </TabsContent>

        <TabsContent value="matches">
          <RadarMatches />
        </TabsContent>

        <TabsContent value="reincidentes">
          <RadarReincidentes />
        </TabsContent>

        <TabsContent value="fontes">
          <RadarFontes />
        </TabsContent>
      </Tabs>

      {/* Sheet de detalhes (aberto pelo mapa) */}
      <RadarNoticiaSheet
        noticiaId={selectedNoticiaId}
        open={!!selectedNoticiaId}
        onOpenChange={(open) => {
          if (!open) setSelectedNoticiaId(null);
        }}
      />
    </PageLayout>
  );
}
