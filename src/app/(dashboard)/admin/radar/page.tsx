"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/shared/page-layout";
import { Radio, Newspaper, Map, BarChart3, Link2 } from "lucide-react";
import { RadarFeed } from "@/components/radar/radar-feed";
import { RadarFiltros, type FiltrosState } from "@/components/radar/radar-filtros";
import { RadarMapa } from "@/components/radar/radar-mapa";
import { RadarEstatisticas } from "@/components/radar/radar-estatisticas";
import { RadarMatches } from "@/components/radar/radar-matches";

export default function RadarCriminalPage() {
  const [activeTab, setActiveTab] = useState("feed");

  // Filtros compartilhados entre tabs
  const [filtros, setFiltros] = useState<FiltrosState>({
    soMatches: false,
  });

  return (
    <PageLayout
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span>Radar Criminal</span>
          </div>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-4">
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
          <RadarMapa filtros={filtros} />
        </TabsContent>

        <TabsContent value="estatisticas">
          <RadarEstatisticas />
        </TabsContent>

        <TabsContent value="matches">
          <RadarMatches />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
