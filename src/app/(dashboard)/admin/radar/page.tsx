"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/shared/page-layout";
import { Button } from "@/components/ui/button";
import { Radio, Newspaper, Map, BarChart3, Link2, RefreshCw, Clock, Users, Globe, BarChart2, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { RadarFeed } from "@/components/radar/radar-feed";
import { RadarFiltros, type FiltrosState } from "@/components/radar/radar-filtros";
import { RadarMapa } from "@/components/radar/radar-mapa";
import { RadarEstatisticas } from "@/components/radar/radar-estatisticas";
import { RadarMatches } from "@/components/radar/radar-matches";
import { RadarReincidentes } from "@/components/radar/radar-reincidentes";
import { RadarFontes } from "@/components/radar/radar-fontes";
import { RadarNoticiaSheet } from "@/components/radar/radar-noticia-sheet";
import { RadarReincidentesPanel } from "@/components/radar/radar-reincidentes-panel";
import { RadarScopeSelector, type RadarScope } from "@/components/radar/radar-scope-selector";
import { RadarIntelligencePanel } from "@/components/radar/radar-intelligence-panel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCrimeLabel } from "@/components/radar/radar-filtros";

// Labels amigáveis por escopo
const SCOPE_LABELS: Record<RadarScope, string> = {
  camacari: "Camaçari",
  rms: "Região Metropolitana",
  salvador: "Salvador",
};

export default function RadarCriminalPage() {
  const [activeTab, setActiveTab] = useState("feed");
  const [selectedNoticiaId, setSelectedNoticiaId] = useState<number | null>(null);
  const [matchesNoticiaFilter, setMatchesNoticiaFilter] = useState<number | null>(null);
  const [focusedNoticiaId, setFocusedNoticiaId] = useState<number | null>(null);
  const [reincidentesOpen, setReincidentesOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false); // mobile intel panel

  // Scope — persiste no localStorage
  const [scope, setScope] = useState<RadarScope>("camacari");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("radar-scope") as RadarScope | null;
    if (saved && ["camacari", "rms", "salvador"].includes(saved)) setScope(saved);
    const col = localStorage.getItem("radar-sidebar-collapsed");
    if (col !== null) setSidebarCollapsed(col === "true");
  }, []);

  const handleScopeChange = (s: RadarScope) => {
    setScope(s);
    localStorage.setItem("radar-scope", s);
  };

  const handleSidebarToggle = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("radar-sidebar-collapsed", String(next));
  };

  const handleNavigateToMatches = (noticiaId: number) => {
    setSelectedNoticiaId(null);
    setActiveTab("matches");
    setMatchesNoticiaFilter(noticiaId);
  };

  const handleVerNoMapa = (noticiaId: number) => {
    setFocusedNoticiaId(noticiaId);
    setActiveTab("mapa");
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

  // Pipeline trigger — fire-and-forget com toast progressivo
  const utils = trpc.useUtils();
  const [pipelineRunning, setPipelineRunning] = React.useState(false);

  /** Mostra um toast que evolui por etapas enquanto o pipeline roda no Railway */
  function showProgressToast() {
    const toastId = "pipeline-progress";
    const steps = [
      { label: "Coletando notícias das fontes...", icon: "📡", delay: 0 },
      { label: "Analisando com IA (Claude)...", icon: "🧠", delay: 8_000 },
      { label: "Geocodificando localidades...", icon: "📍", delay: 20_000 },
      { label: "Cruzando assistidos DPE...", icon: "🔗", delay: 32_000 },
      { label: "Concluído! Feed atualizado.", icon: "✅", delay: 48_000 },
    ];

    steps.forEach(({ label, icon, delay }, idx) => {
      setTimeout(() => {
        const isLast = idx === steps.length - 1;
        if (isLast) {
          toast.success(`${icon} ${label}`, { id: toastId, duration: 4_000 });
        } else {
          toast.loading(`${icon} ${label}`, { id: toastId, duration: 60_000 });
        }
      }, delay);
    });

    // Recarregar dados progressivamente
    [8_000, 20_000, 40_000, 52_000].forEach((delay) => {
      setTimeout(() => {
        utils.radar.list.invalidate();
        utils.radar.stats.invalidate();
        utils.radar.fontesList.invalidate();
        utils.radar.mapData.invalidate();
        utils.radar.matchesPendentesCount.invalidate();
        utils.radar.totalCount.invalidate();
      }, delay);
    });

    setTimeout(() => setPipelineRunning(false), 55_000);
  }

  const triggerPipeline = trpc.radar.triggerPipeline.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        showProgressToast();
      } else {
        toast.error("Falha ao iniciar pipeline", { description: data.message });
        setPipelineRunning(false);
      }
    },
    onError: (error) => {
      // Timeout de 5s é esperado (fire-and-forget) — tratar como sucesso
      if (error.message.includes("timeout") || error.message.includes("signal")) {
        showProgressToast();
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
      compact
    >
      {/* Header compacto */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&display=swap');`}</style>
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3 min-w-0">
          <Radio className="w-4 h-4 text-neutral-400 shrink-0" />
          <h1
            className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 leading-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif" }}
          >
            Radar Criminal
          </h1>
          <span className="text-xs text-neutral-400">·</span>
          <span className="text-xs text-neutral-400">
            {statsLoading ? "—" : totalNoticias} notícias
          </span>
          {ultimaColeta && (
            <span className="hidden sm:inline text-xs text-neutral-400">
              · {formatDistanceToNow(new Date(ultimaColeta), { addSuffix: true, locale: ptBR })}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-xs gap-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer shrink-0"
          onClick={handleTriggerPipeline}
          disabled={pipelineRunning || triggerPipeline.isPending}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${pipelineRunning || triggerPipeline.isPending ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">
            {pipelineRunning || triggerPipeline.isPending ? "Buscando..." : "Atualizar"}
          </span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <div className="flex items-center gap-1">
          <TabsList className="flex w-full sm:w-auto items-center h-8 gap-0 bg-transparent p-0 border-b border-neutral-100 dark:border-neutral-800 rounded-none">
            <TabsTrigger value="feed" className="cursor-pointer gap-1.5 h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none text-neutral-500 dark:data-[state=active]:border-neutral-100 dark:data-[state=active]:text-neutral-100 px-3 text-[13px]">
              <Newspaper className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Feed</span>
            </TabsTrigger>
            <TabsTrigger value="mapa" className="cursor-pointer gap-1.5 h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none text-neutral-500 dark:data-[state=active]:border-neutral-100 dark:data-[state=active]:text-neutral-100 px-3 text-[13px]">
              <Map className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mapa</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="cursor-pointer gap-1.5 h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none text-neutral-500 dark:data-[state=active]:border-neutral-100 dark:data-[state=active]:text-neutral-100 px-3 text-[13px]">
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                Matches
                {matchesPendentes > 0 && (
                  <span className="ml-1.5 rounded-full bg-neutral-700 dark:bg-neutral-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {matchesPendentes}
                  </span>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger value="reincidentes" className="cursor-pointer gap-1.5 h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none text-neutral-500 dark:data-[state=active]:border-neutral-100 dark:data-[state=active]:text-neutral-100 px-3 text-[13px]">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reincidentes</span>
            </TabsTrigger>
            <TabsTrigger value="estatisticas" className="cursor-pointer gap-1.5 h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none text-neutral-500 dark:data-[state=active]:border-neutral-100 dark:data-[state=active]:text-neutral-100 px-3 text-[13px]">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Estatísticas</span>
            </TabsTrigger>
            <TabsTrigger value="fontes" className="cursor-pointer gap-1.5 h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none text-neutral-500 dark:data-[state=active]:border-neutral-100 dark:data-[state=active]:text-neutral-100 px-3 text-[13px]">
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                Fontes
                {healthPending > 0 && (
                  <span className="ml-1.5 rounded-full bg-neutral-700 dark:bg-neutral-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {healthPending}
                  </span>
                )}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Banner de filtros ativos */}
        {filtrosAtivos && (
          <div className="flex items-center gap-2 rounded-md bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700 px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="text-neutral-400 shrink-0">Filtros:</span>
            <span className="truncate text-neutral-700 dark:text-neutral-300">{filtrosDescricao}</span>
            <button
              onClick={resetFiltros}
              className="ml-auto shrink-0 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 font-medium cursor-pointer transition-colors"
            >
              × Limpar
            </button>
          </div>
        )}

        <TabsContent value="feed">
          {/* Mobile: scope selector + botões para sheets */}
          <div className="flex flex-col gap-2 mb-3 lg:hidden">
            <div className="flex items-center justify-between gap-2">
              <RadarScopeSelector value={scope} onChange={handleScopeChange} />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                  onClick={() => setIntelOpen(true)}
                >
                  <BarChart2 className="h-3.5 w-3.5" />Inteligência
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300 cursor-pointer"
                  onClick={() => setReincidentesOpen(true)}
                >
                  <Users className="h-3.5 w-3.5" />Reincidentes
                </button>
              </div>
            </div>
          </div>

          {/* Desktop layout: sidebar colapsável + feed */}
          <div className="hidden lg:flex gap-0 relative">

            {/* Sidebar colapsável — overflow-hidden apenas no wrapper de conteúdo */}
            <div className={cn(
              "shrink-0 transition-[width] duration-200 ease-in-out",
              sidebarCollapsed ? "w-10" : "w-72"
            )}>
              {/* Wrapper com overflow-hidden para clipar o conteúdo ao colapsar */}
              <div className="overflow-hidden w-full">
                {/* Conteúdo expandido */}
                <div className={cn(
                  "pr-4 space-y-4 transition-opacity duration-150",
                  sidebarCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
                )}>
                  {/* Scope selector no topo da sidebar */}
                  <RadarScopeSelector value={scope} onChange={handleScopeChange} fullWidth />

                  {/* Inteligência primeiro */}
                  <RadarIntelligencePanel scope={scope} onSelectTipoCrime={(tipo) => setFiltros(f => ({ ...f, tipoCrime: tipo }))} />

                  {/* Filtros */}
                  <RadarFiltros filtros={filtros} onChange={setFiltros} />

                  {/* Reincidentes */}
                  <RadarReincidentesPanel />
                </div>

                {/* Ícones quando colapsada */}
                {sidebarCollapsed && (
                  <div className="flex flex-col items-center gap-3 pt-1">
                    <button
                      onClick={() => { setSidebarCollapsed(false); localStorage.setItem("radar-sidebar-collapsed", "false"); }}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Inteligência"
                    >
                      <BarChart2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setSidebarCollapsed(false); localStorage.setItem("radar-sidebar-collapsed", "false"); }}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Filtros"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setSidebarCollapsed(false); localStorage.setItem("radar-sidebar-collapsed", "false"); }}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                      title="Reincidentes"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Botão toggle — fora do overflow-hidden, sempre visível */}
            <button
              onClick={handleSidebarToggle}
              className={cn(
                "absolute top-0 z-20 flex items-center justify-center",
                "w-6 h-6 rounded-full border border-neutral-200 dark:border-neutral-700",
                "bg-white dark:bg-neutral-900 shadow-sm",
                "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200",
                "transition-all duration-200 cursor-pointer"
              )}
              style={{ left: sidebarCollapsed ? "calc(2.5rem - 12px)" : "calc(18rem - 12px)" }}
              title={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              {sidebarCollapsed
                ? <ChevronRight className="h-3.5 w-3.5" />
                : <ChevronLeft className="h-3.5 w-3.5" />
              }
            </button>

            {/* Feed principal */}
            <div className="flex-1 min-w-0 border-l border-neutral-100 dark:border-neutral-800 pl-4">
              <RadarFeed filtros={filtros} municipio={scope} onVerNoMapa={handleVerNoMapa} />
            </div>
          </div>

          {/* Mobile: feed sem sidebar */}
          <div className="lg:hidden">
            <RadarFeed filtros={filtros} municipio={scope} onVerNoMapa={handleVerNoMapa} />
          </div>

          {/* Sheet de inteligência — mobile */}
          <Sheet open={intelOpen} onOpenChange={setIntelOpen}>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle>Inteligência — {SCOPE_LABELS[scope]}</SheetTitle>
              </SheetHeader>
              <RadarIntelligencePanel scope={scope} />
            </SheetContent>
          </Sheet>

          {/* Sheet de reincidentes — mobile */}
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
          <RadarMapa filtros={filtros} onSelectNoticia={setSelectedNoticiaId} focusedNoticiaId={focusedNoticiaId} />
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
        onVerNoMapa={handleVerNoMapa}
      />
    </PageLayout>
  );
}
