"use client";

import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Scissors, Loader2 } from "lucide-react";
import { ProcessoSelector } from "./ProcessoSelector";
import { PecasIndex } from "./PecasIndex";
import { PecaPreview } from "./PecaPreview";

interface ProcessoBasicData {
  id: number;
  numeroAutos: string | null;
  tipoProcesso: string | null;
  isReferencia: boolean | null;
}

interface ProcessoTabProps {
  assistidoId: number;
  processos: ProcessoBasicData[];
}

// Virtual "all" option when processos have no classified sections yet
// but the assistido does (files sit at assistido level)
const ALL_OPTION: ProcessoBasicData = {
  id: -1,
  numeroAutos: "Todos os arquivos do assistido",
  tipoProcesso: "Geral",
  isReferencia: true,
};

export function ProcessoTab({ assistidoId, processos }: ProcessoTabProps) {
  const initialProcessoId = useMemo(() => {
    const ref = processos.find((p) => p.isReferencia);
    return ref?.id ?? processos[0]?.id ?? -1;
  }, [processos]);

  const [selectedProcessoId, setSelectedProcessoId] = useState<number>(initialProcessoId);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Query: filter by processoId if selected, else by assistidoId
  const queryInput = selectedProcessoId > 0
    ? { processoId: selectedProcessoId }
    : { assistidoId };

  const { data, isLoading } = trpc.processo.getGroupedSections.useQuery(queryInput);

  // If the selected processo has 0 sections but the assistido has some,
  // automatically switch to the virtual "Todos" option
  const { data: fallbackData } = trpc.processo.getGroupedSections.useQuery(
    { assistidoId },
    { enabled: selectedProcessoId > 0 && data?.total === 0 },
  );
  const shouldOfferFallback = selectedProcessoId > 0 && data?.total === 0 && (fallbackData?.total ?? 0) > 0;

  const extractApprovedMutation = trpc.documentSections.extractApprovedToDrive.useMutation({
    onSuccess: () => {
      utils.processo.getGroupedSections.invalidate(queryInput);
    },
  });

  const activeSection = useMemo(() => {
    if (!data || !activeSectionId) return null;
    for (const g of data.groups) {
      const found = g.sections.find((s) => s.id === activeSectionId);
      if (found) return found;
    }
    for (const dp of data.depoimentos) {
      const found = dp.sections.find((s) => s.id === activeSectionId);
      if (found) return found;
    }
    return null;
  }, [data, activeSectionId]);

  const firstSectionId = useMemo(() => {
    if (!data) return null;
    if (data.groups[0]?.sections[0]) return data.groups[0].sections[0].id;
    if (data.depoimentos[0]?.sections[0]) return data.depoimentos[0].sections[0].id;
    return null;
  }, [data]);

  useEffect(() => {
    if (data && !activeSectionId && firstSectionId) {
      setActiveSectionId(firstSectionId);
    }
  }, [data, activeSectionId, firstSectionId]);

  const approvedCount = useMemo(() => {
    if (!data) return 0;
    let n = 0;
    for (const g of data.groups) n += g.sections.filter((s) => s.reviewStatus === "approved").length;
    for (const dp of data.depoimentos) n += dp.sections.filter((s) => s.reviewStatus === "approved").length;
    return n;
  }, [data]);

  const firstFileId = useMemo(() => {
    if (!data) return null;
    for (const g of data.groups) {
      if (g.sections[0]) return (g.sections[0] as any).fileId as number;
    }
    for (const dp of data.depoimentos) {
      if (dp.sections[0]) return (dp.sections[0] as any).fileId as number;
    }
    return null;
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-[320px_1fr] gap-4 p-4">
        <Skeleton className="h-[500px]" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto text-center py-16">
          <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-6 h-6 text-zinc-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Nenhuma peça classificada
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            {shouldOfferFallback
              ? `Este processo não tem peças classificadas, mas o assistido tem ${fallbackData?.total ?? 0} peças vinculadas. Veja todas as peças do assistido:`
              : "Para ver as peças organizadas (denúncia, depoimentos, laudos, etc.), classifique os autos usando o botão \"Classificar\" na aba Drive."}
          </p>
          {shouldOfferFallback && (
            <Button
              onClick={() => setSelectedProcessoId(-1)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Ver todas as peças do assistido ({fallbackData?.total})
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Adds a virtual "All" option to the selector if we have any orphaned sections
  const processosWithAll: ProcessoBasicData[] = (fallbackData && fallbackData.total > 0) || selectedProcessoId === -1
    ? [ALL_OPTION, ...processos]
    : processos;

  return (
    <div className="p-4 space-y-4 h-full flex flex-col min-h-0">
      <div className="flex items-center gap-3 flex-wrap">
        <ProcessoSelector
          processos={processosWithAll}
          selectedId={selectedProcessoId}
          onSelect={(id) => {
            setSelectedProcessoId(id);
            setActiveSectionId(null);
          }}
        />
        <div className="flex-1" />
        {approvedCount > 0 && firstFileId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => extractApprovedMutation.mutate({ driveFileId: firstFileId })}
            disabled={extractApprovedMutation.isPending}
            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          >
            {extractApprovedMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Scissors className="w-3.5 h-3.5 mr-1.5" />
            )}
            Fatiar {approvedCount} aprovada{approvedCount !== 1 ? "s" : ""}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-4 flex-1 min-h-0">
        <PecasIndex
          groups={data.groups as any}
          depoimentos={data.depoimentos as any}
          activeId={activeSectionId}
          onSelect={setActiveSectionId}
          total={data.total}
        />
        <PecaPreview
          section={activeSection as any}
          onUpdated={() => {
            utils.processo.getGroupedSections.invalidate({ processoId: selectedProcessoId });
          }}
        />
      </div>
    </div>
  );
}
