"use client";

import React, { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/shared/page-layout";
import { Button } from "@/components/ui/button";
import { Radio, Newspaper, Map, BarChart3, Link2, RefreshCw, Clock, Users, Globe, AlertTriangle, CheckCircle2 } from "lucide-react";
import { RadarFeed } from "@/components/radar/radar-feed";
import { RadarFiltros, type FiltrosState } from "@/components/radar/radar-filtros";
import { RadarMapa } from "@/components/radar/radar-mapa";
import { RadarEstatisticas } from "@/components/radar/radar-estatisticas";
import { RadarMatches } from "@/components/radar/radar-matches";
import { RadarReincidentes } from "@/components/radar/radar-reincidentes";
import { RadarFontes } from "@/components/radar/radar-fontes";
import { RadarNoticiaSheet } from "@/components/radar/radar-noticia-sheet";
import { RadarReincidentesPanel } from "@/components/radar/radar-reincidentes-panel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCrimeLabel } from "@/components/radar/radar-filtros";

export default function RadarCriminalPage() {
  const [activeTab, setActiveTab] = useState("feed");
  const [selectedNoticiaId, setSelectedNoticiaId] = useState<number | null>(null);
  const [matchesNoticiaFilter, setMatchesNoticiaFilter] = useState<number | null>(null);
  const [reincidentesOpen, setReincidentesOpen] = useState(false);

  const handleNavigateToMatches = (noticiaId: number) => {
    setSelectedNoticiaId(null);
    setActiveTab("matches");
    setMatchesNoticiaFilter(noticiaId);
  };

  // Filtros compartilhados entre tabs
  const [filtros, setFiltros] = useState<FiltrosState>({
    soMatches: false,
    relevanciaMin: 60,
  });

  const resetFiltros = () => setFiltros({ soMatches: false, relevanciaMin: 60 });

  const filtrosAtivos = useMemo(() => {
    return !!(
      filtros.tipoCrime ||
      filtros.bairro ||
      filtros.fonte ||
      filtros.circunstancia ||
      filtros.dataInicio ||
      filtros.dataFim ||
      filtros.soMatches ||
      filtros.search
    );
  }, [filtros]);

  const filtrosDescricao = useMemo(() => {
    const partes: string[] = [];
    if (filtros.tipoCrime) partes.push(getCrimeLabel(filtros.tipoCrime));
    if (filtros.bairro) partes.push(filtros.bairro);
    if (filtros.fonte) partes.push(filtros.fonte);
    if (filtros.circunstancia) partes.push(filtros.circunstancia);
    if (filtros.search) partes.push(`"${filtros.search}"`);
    if (filtros.soMatches) partes.push("Só DPE");
    if (filtros.dataInicio || filtros.dataFim) {
      partes.push([filtros.dataInicio, filtros.dataFim].filter(Boolean).join(" → "));
    }
    return partes.join(" · ");
  }, [filtros]);

  // Matches pendentes (badge na aba)
  const { data: matchesPendentesData } = trpc.radar.matchesPendentesCount.useQuery();
  const matchesPendentes = matchesPendentesData?.count ?? 0;

  // Saúde do enriquecimento (badge na aba + banner)
  const { data: healthData } = trpc.radar.enrichmentHealth.useQuery();
  const healthPending = Number(healthData?.pending ?? 0);

  // Total de notícias (query leve — sem GROUP BY)
  const { data: totalData, isLoading: statsLoading, isError: statsError } = trpc.radar.totalCount.useQuery();
  const totalNoticias = totalData?.total ?? 0;

  // Última coleta (fonte mais recente)
  const { data: fontes, isLoading: fontesLoading, isError: fontesError } = trpc.radar.fontesList.useQuery();
  const ultimaColeta = fontes
    ?.map((f) => f.ultimaColeta)
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

  const fontesAtivas = fontes?.filter((f) => f.ativo).length ?? 0;

  // Pipeline trigger — fire-and-forget: dispara e aguarda 12s antes de recarregar
  const utils = trpc.useUtils();
  const [pipelineRunning, setPipelineRunning] = React.useState(false);
  const triggerPipeline = trpc.radar.triggerPipeline.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Atualização iniciada", {
          description: "Buscando notícias em segundo plano... Os dados aparecerão em instantes.",
        });
        // Recarregar dados progressivamente enquanto o pipeline processa no Railway
        const delays = [8_000, 20_000, 40_000];
        delays.forEach((delay) => {
          setTimeout(() => {
            utils.radar.list.invalidate();
            utils.radar.stats.invalidate();
            utils.radar.fontesList.invalidate();
            utils.radar.mapData.invalidate();
            utils.radar.matchesPendentesCount.invalidate();
          }, delay);
        });
        setTimeout(() => setPipelineRunning(false), 45_000);
      } else {
        toast.error("Falha ao iniciar pipeline", { description: data.message });
        setPipelineRunning(false);
      }
    },
    onError: (error) => {
      // Timeout de 5s é esperado (fire-and-forget) — tratar como sucesso
      if (error.message.includes("timeout") || error.message.includes("signal")) {
        toast.success("Atualização iniciada", {
          description: "Buscando notícias em segundo plano...",
        });
        const delays = [15_000, 35_000, 60_000];
        delays.forEach((delay) => {
          setTimeout(() => {
            utils.radar.list.invalidate();
            utils.radar.stats.invalidate();
            utils.radar.fontesList.invalidate();
            utils.radar.mapData.invalidate();
            utils.radar.matchesPendentesCount.invalidate();
          }, delay);
        });
        setTimeout(() => setPipelineRunning(false), 65_000);
      } else {
        toast.error("Erro ao atualizar", { description: error.message });
        setPipelineRunning(false);
      }
    },
  });

  const handleTriggerPipeline = () => {
    setPipelineRunning(true);
    triggerPipeline.mutate();
  };

  return (
    <PageLayout
      header="Radar Criminal"
      icon={Radio}
      description="Monitoramento policial automático de Camaçari e região"
      actions={
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 cursor-pointer"
          onClick={handleTriggerPipeline}
          disabled={pipelineRunning || triggerPipeline.isPending}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${pipelineRunning || triggerPipeline.isPending ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">
            {pipelineRunning || triggerPipeline.isPending ? "Buscando..." : "Atualizar"}
          </span>
        </Button>
      }
      stats={
        <div className="flex flex-wrap items-center gap-2">
          {/* Total de notícias */}
          <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 text-xs text-zinc-600 dark:text-zinc-400">
            <Newspaper className="h-3 w-3 text-zinc-400" />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {statsLoading || statsError ? "—" : totalNoticias}
            </span>
            <span>notícias</span>
          </div>

          {/* Matches pendentes */}
          {matchesPendentes > 0 ? (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 text-xs text-amber-700 dark:text-amber-400">
              <Link2 className="h-3 w-3" />
              <span className="font-semibold">{matchesPendentes}</span>
              <span>matches pendentes</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              <span>Matches em dia</span>
            </div>
          )}

          {/* Enriquecimento pendente */}
          {healthPending > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 px-3 py-1 text-xs text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-semibold">{healthPending}</span>
              <span>aguardando IA</span>
            </div>
          )}

          {/* Fontes ativas */}
          <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 text-xs text-zinc-600 dark:text-zinc-400">
            <Globe className="h-3 w-3 text-zinc-400" />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {fontesLoading || fontesError ? "—" : fontesAtivas}
            </span>
            <span>fontes ativas</span>
          </div>

          {/* Última coleta */}
          {ultimaColeta && (
            <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 text-xs text-zinc-500 dark:text-zinc-400">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(ultimaColeta), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          )}
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <TabsList className="flex w-full sm:w-auto items-center">
            {/* Grupo primário: operacional */}
            <TabsTrigger value="feed" className="cursor-pointer gap-1.5">
              <Newspaper className="h-4 w-4" />
              <span className="hidden sm:inline">Feed</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="cursor-pointer gap-1.5">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Matches DPE {matchesPendentes > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {matchesPendentes}
                </span>
              )}</span>
            </TabsTrigger>

            {/* Separador: primário → contexto */}
            <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700 self-center" aria-hidden />

            {/* Grupo secundário: contexto */}
            <TabsTrigger value="mapa" className="cursor-pointer gap-1.5">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Mapa</span>
            </TabsTrigger>
            <TabsTrigger value="reincidentes" className="cursor-pointer gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Reincidentes</span>
            </TabsTrigger>

            {/* Separador: contexto → admin */}
            <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700 self-center" aria-hidden />

            {/* Grupo terciário: admin */}
            <TabsTrigger value="estatisticas" className="cursor-pointer gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Estatísticas</span>
            </TabsTrigger>
            <TabsTrigger value="fontes" className="cursor-pointer gap-1.5">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Fontes {healthPending > 0 && (
                <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {healthPending}
                </span>
              )}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Banner de filtros ativos */}
        {filtrosAtivos && (
          <div className="flex items-center gap-2 rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-medium">Filtros ativos:</span>
            <span className="truncate">{filtrosDescricao}</span>
            <button
              onClick={resetFiltros}
              className="ml-auto shrink-0 text-xs text-red-500 hover:text-red-600 font-medium cursor-pointer"
            >
              Limpar
            </button>
          </div>
        )}

        <TabsContent value="feed" className="space-y-4">
          {/* Botão mobile para abrir painel de reincidentes */}
          <button
            className="lg:hidden flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300 w-full justify-center cursor-pointer"
            onClick={() => setReincidentesOpen(true)}
          >
            <Users className="h-4 w-4" />
            Ver Alertas de Reincidentes
          </button>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-64 shrink-0 space-y-4">
              <RadarFiltros filtros={filtros} onChange={setFiltros} />
              {/* Painel de reincidentes — visível apenas em desktop */}
              <div className="hidden lg:block">
                <RadarReincidentesPanel />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <RadarFeed filtros={filtros} />
            </div>
          </div>

          {/* Sheet de reincidentes — mobile only */}
          <Sheet open={reincidentesOpen} onOpenChange={setReincidentesOpen}>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle>Alertas de Reincidentes</SheetTitle>
              </SheetHeader>
              <RadarReincidentesPanel />
            </SheetContent>
          </Sheet>
        </TabsContent>

        <TabsContent value="mapa">
          <RadarMapa filtros={filtros} onSelectNoticia={setSelectedNoticiaId} />
        </TabsContent>

        <TabsContent value="estatisticas">
          <RadarEstatisticas
            tipoCrime={filtros.tipoCrime}
            bairro={filtros.bairro}
          />
        </TabsContent>

        <TabsContent value="matches">
          <RadarMatches
            noticiaId={matchesNoticiaFilter ?? undefined}
            onClearFilter={() => setMatchesNoticiaFilter(null)}
          />
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
        onNavigateToMatches={handleNavigateToMatches}
      />
    </PageLayout>
  );
}
