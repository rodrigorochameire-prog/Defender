"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { RefreshCw, ChevronLeft, ChevronRight, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { FactualMasthead } from "@/components/factual/factual-masthead";
import { FactualSection } from "@/components/factual/factual-section";
import { FactualArticleCard } from "@/components/factual/factual-article-card";
import { FactualFavoritesPanel } from "@/components/factual/factual-favorites-panel";
import { FactualSectionNav } from "@/components/factual/factual-section-nav";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Ordem editorial das seções
const SECAO_ORDEM = [
  "DESTAQUES", "CAMAÇARI", "LAURO DE FREITAS", "SALVADOR",
  "BAHIA", "BRASIL", "MUNDO", "TECNOLOGIA", "ESPORTE",
];

export default function NoticiasFactuaisPage() {
  const [favoritosOpen, setFavoritosOpen] = useState(false);
  const [activeSecao, setActiveSecao] = useState<string | undefined>();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Data
  const { data: edicao, isLoading } = trpc.factual.getLatestEdicao.useQuery();
  const { data: artigosPorSecao } = trpc.factual.getArtigosPorSecao.useQuery(
    { edicaoId: edicao?.id ?? 0 },
    { enabled: !!edicao?.id }
  );
  const { data: favoritosIds = [] } = trpc.factual.getFavoritosIds.useQuery();
  const { data: favoritosList = [] } = trpc.factual.listFavoritos.useQuery();
  const { data: stats } = trpc.factual.stats.useQuery();
  const { data: edicoes = [] } = trpc.factual.listEdicoes.useQuery({ limit: 10 });
  const utils = trpc.useUtils();

  // Mutations
  const toggleFavorito = trpc.factual.toggleFavorito.useMutation({
    onSuccess: () => {
      utils.factual.getFavoritosIds.invalidate();
      utils.factual.listFavoritos.invalidate();
    },
  });

  const clearFavoritos = trpc.factual.clearFavoritos.useMutation({
    onSuccess: () => {
      utils.factual.getFavoritosIds.invalidate();
      utils.factual.listFavoritos.invalidate();
      toast.success("Favoritos limpos");
    },
  });

  const triggerPipeline = trpc.factual.triggerPipeline.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Pipeline concluído!", {
          description: `${data.results?.length ?? 0} seções processadas`,
        });
        utils.factual.getLatestEdicao.invalidate();
        utils.factual.getArtigosPorSecao.invalidate();
        utils.factual.stats.invalidate();
        utils.factual.listEdicoes.invalidate();
      } else {
        toast.error("Falha no pipeline", { description: data.message });
      }
    },
    onError: (error) => {
      toast.error("Erro ao buscar notícias", { description: error.message });
    },
  });

  // Seções ordenadas
  const secoesOrdenadas = useMemo(() => {
    if (!artigosPorSecao) return [];
    return SECAO_ORDEM.filter(s => artigosPorSecao[s]?.length > 0);
  }, [artigosPorSecao]);

  // Scroll to section
  const scrollToSecao = useCallback((secao: string) => {
    const el = sectionRefs.current[secao];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSecao(secao);
    }
  }, []);

  // Intersection observer for active section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const secao = entry.target.getAttribute("data-secao");
            if (secao) setActiveSecao(secao);
          }
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0.1 }
    );

    for (const ref of Object.values(sectionRefs.current)) {
      if (ref) observer.observe(ref);
    }

    return () => observer.disconnect();
  }, [secoesOrdenadas]);

  // Navigation between editions
  const currentEdicaoIndex = edicoes.findIndex(e => e.id === edicao?.id);

  const handlePrevEdicao = () => {
    if (currentEdicaoIndex < edicoes.length - 1) {
      const prev = edicoes[currentEdicaoIndex + 1];
      // Could navigate to specific edition - for now just show toast
      toast.info(`Edição de ${format(new Date(prev.dataEdicao), "dd/MM/yyyy")}`);
    }
  };

  const handleNextEdicao = () => {
    if (currentEdicaoIndex > 0) {
      const next = edicoes[currentEdicaoIndex - 1];
      toast.info(`Edição de ${format(new Date(next.dataEdicao), "dd/MM/yyyy")}`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-[#1a1a2e] text-white py-12 px-6 text-center">
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-white/10 rounded w-64 mx-auto" />
            <div className="h-4 bg-white/10 rounded w-48 mx-auto" />
          </div>
        </div>
        <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse space-y-3">
              <div className="h-3 bg-zinc-200 dark:bg-border rounded w-24" />
              <div className="h-6 bg-zinc-200 dark:bg-border rounded w-3/4" />
              <div className="h-4 bg-zinc-100 dark:bg-muted rounded w-full" />
              <div className="h-4 bg-zinc-100 dark:bg-muted rounded w-5/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!edicao) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-serif font-medium text-zinc-800 dark:text-zinc-200"
              style={{ fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif" }}>
            Diário da Bahia
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nenhuma edição disponível. Execute o pipeline para gerar a primeira edição.
          </p>
        </div>
        <Button
          onClick={() => triggerPipeline.mutate()}
          disabled={triggerPipeline.isPending}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", triggerPipeline.isPending && "animate-spin")} />
          {triggerPipeline.isPending ? "Coletando notícias..." : "Gerar Primeira Edição"}
        </Button>
      </div>
    );
  }

  const totalArtigos = Object.values(artigosPorSecao ?? {}).reduce(
    (s, arr) => s + arr.length, 0
  );

  return (
    <div className="flex flex-col min-h-full -m-6 md:-m-8">

      {/* Masthead */}
      <FactualMasthead
        edicaoData={edicao.dataEdicao?.toISOString?.() ?? String(edicao.dataEdicao)}
        favoritosCount={favoritosIds.length}
        onOpenFavoritos={() => setFavoritosOpen(true)}
      />

      {/* Navigation bar */}
      <div className="sticky top-0 z-30 bg-white dark:bg-zinc-950 border-b border-zinc-200/60 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between gap-2">
          {/* Section nav */}
          <FactualSectionNav
            secoes={secoesOrdenadas}
            activeSecao={activeSecao}
            onSelectSecao={scrollToSecao}
          />

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => triggerPipeline.mutate()}
              disabled={triggerPipeline.isPending}
              title="Atualizar notícias"
              className="h-7 w-7 p-0 text-zinc-400"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", triggerPipeline.isPending && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-3xl mx-auto w-full px-4 md:px-8 pb-16">

        {/* Edition info bar */}
        <div className="flex items-center justify-between gap-3 py-4 text-xs text-zinc-400">
          <span>
            {totalArtigos} artigos em {secoesOrdenadas.length} seções
          </span>
          <div className="flex items-center gap-2">
            {edicoes.length > 1 && (
              <>
                <button
                  onClick={handlePrevEdicao}
                  disabled={currentEdicaoIndex >= edicoes.length - 1}
                  className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                  title="Edição anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-[11px]">
                  {format(new Date(edicao.dataEdicao), "dd MMM yyyy", { locale: ptBR })}
                </span>
                <button
                  onClick={handleNextEdicao}
                  disabled={currentEdicaoIndex <= 0}
                  className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                  title="Próxima edição"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sections with articles */}
        {secoesOrdenadas.map((secao, sIdx) => {
          const artigos = artigosPorSecao?.[secao] ?? [];
          return (
            <div
              key={secao}
              ref={(el) => { sectionRefs.current[secao] = el; }}
              data-secao={secao}
            >
              <FactualSection nome={secao}>
                {artigos.map((artigo, aIdx) => (
                  <FactualArticleCard
                    key={artigo.id}
                    id={artigo.id}
                    titulo={artigo.titulo}
                    resumo={artigo.resumo ?? ""}
                    fonteNome={artigo.fonteNome}
                    fonteUrl={artigo.fonteUrl}
                    destaque={artigo.destaque || (sIdx === 0 && aIdx < 3)}
                    isFavorito={favoritosIds.includes(artigo.id)}
                    onToggleFavorito={(id) => toggleFavorito.mutate({ artigoId: id })}
                  />
                ))}
              </FactualSection>
            </div>
          );
        })}

        {/* Footer */}
        <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-16 pt-8 pb-4 text-center">
          <p className="text-xs text-zinc-400 tracking-wide">
            Diário da Bahia &mdash; Edição diária &middot; Horário de Salvador
          </p>
          <p className="text-[11px] text-zinc-400/70 mt-2">
            Gerado automaticamente com base em fontes públicas. Todas as matérias possuem link para a fonte original.
          </p>
        </footer>
      </main>

      {/* Favorites panel */}
      <FactualFavoritesPanel
        open={favoritosOpen}
        onClose={() => setFavoritosOpen(false)}
        favoritos={favoritosList.map(f => ({
          id: f.id,
          artigoId: f.artigoId,
          titulo: f.titulo,
          resumo: f.resumo ?? "",
          fonteNome: f.fonteNome,
          fonteUrl: f.fonteUrl,
          createdAt: f.createdAt?.toISOString?.() ?? String(f.createdAt),
        }))}
        onRemove={(artigoId) => toggleFavorito.mutate({ artigoId })}
        onClearAll={() => clearFavoritos.mutate()}
      />
    </div>
  );
}
