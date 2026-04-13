"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, List, Scissors, Loader2, CheckCircle } from "lucide-react";
import { SectionCard, TIPO_TO_TIER, TIPO_LABELS, TIER_CONFIG } from "./SectionCard";
import { SectionDetailSheet } from "./SectionDetailSheet";

interface SectionsViewerProps {
  assistidoId: number;
  processoId?: number;
}

const TIER_ORDER = ["critico", "alto", "medio", "baixo"];

const DEPOIMENTO_TIPOS = [
  "depoimento_vitima", "depoimento_testemunha", "depoimento_investigado",
  "interrogatorio", "ata_audiencia", "acareacao",
];

export function SectionsViewer({ assistidoId, processoId }: SectionsViewerProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [groupByDepoente, setGroupByDepoente] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: sections, isLoading } = processoId
    ? trpc.drive.sectionsByProcesso.useQuery({ processoId })
    : trpc.drive.sectionsByAssistido.useQuery({ assistidoId });

  const filtered = useMemo(() => {
    if (!sections) return [];
    return sections.filter(s => {
      const tier = TIPO_TO_TIER[s.tipo] || "baixo";
      if (tier === "oculto") return false;
      if (selectedTier && tier !== selectedTier) return false;
      if (selectedTipo && s.tipo !== selectedTipo) return false;
      return true;
    });
  }, [sections, selectedTier, selectedTipo]);

  const tierCounts = useMemo(() => {
    if (!sections) return {};
    const counts: Record<string, number> = {};
    for (const s of sections) {
      const tier = TIPO_TO_TIER[s.tipo] || "baixo";
      if (tier === "oculto") continue;
      counts[tier] = (counts[tier] || 0) + 1;
    }
    return counts;
  }, [sections]);

  const tipoCounts = useMemo(() => {
    if (!filtered) return {};
    const counts: Record<string, number> = {};
    for (const s of filtered) {
      counts[s.tipo] = (counts[s.tipo] || 0) + 1;
    }
    return counts;
  }, [filtered]);

  const groupedByDepoente = useMemo(() => {
    if (!groupByDepoente || !filtered) return null;
    const depoimentos = filtered.filter(s => DEPOIMENTO_TIPOS.includes(s.tipo));
    const outros = filtered.filter(s => !DEPOIMENTO_TIPOS.includes(s.tipo));

    const groups: Record<string, typeof filtered> = {};
    for (const s of depoimentos) {
      const pessoas = (s.metadata as any)?.pessoas as Array<{ nome: string; papel: string }> | undefined;
      const key = pessoas?.[0]?.nome || "Não identificado";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }

    return { groups, outros };
  }, [filtered, groupByDepoente]);

  const handleOpenSection = (section: any) => {
    setSelectedSection(section);
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <List className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhuma peça classificada</p>
        <p className="text-xs mt-1">Use &quot;Smart Extract&quot; em um PDF para classificar as peças</p>
      </div>
    );
  }

  const totalRelevant = Object.values(tierCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700">
          {totalRelevant} peças classificadas
        </span>
        <Button
          variant={groupByDepoente ? "default" : "outline"}
          size="sm"
          onClick={() => setGroupByDepoente(!groupByDepoente)}
          className="text-xs h-7"
        >
          <Users className="w-3 h-3 mr-1" />
          Por depoente
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => { setSelectedTier(null); setSelectedTipo(null); }}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            !selectedTier ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          Todas ({totalRelevant})
        </button>
        {TIER_ORDER.map(tier => {
          const count = tierCounts[tier] || 0;
          if (count === 0) return null;
          const config = TIER_CONFIG[tier];
          return (
            <button
              key={tier}
              onClick={() => { setSelectedTier(selectedTier === tier ? null : tier); setSelectedTipo(null); }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTier === tier ? "ring-2 ring-zinc-400 " + config.color : config.color + " opacity-80 hover:opacity-100"
              }`}
            >
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {selectedTier && Object.keys(tipoCounts).length > 1 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(tipoCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([tipo, count]) => (
              <button
                key={tipo}
                onClick={() => setSelectedTipo(selectedTipo === tipo ? null : tipo)}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  selectedTipo === tipo
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {TIPO_LABELS[tipo] || tipo} ({count})
              </button>
            ))}
        </div>
      )}

      {groupByDepoente && groupedByDepoente ? (
        <div className="space-y-4">
          {Object.entries(groupedByDepoente.groups)
            .sort(([, a], [, b]) => b.length - a.length)
            .map(([nome, secs]) => (
              <div key={nome}>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  {nome} ({secs.length})
                </h4>
                <div className="space-y-1.5 ml-1">
                  {secs.map(s => (
                    <SectionCard key={s.id} section={s} onClick={() => handleOpenSection(s)} />
                  ))}
                </div>
              </div>
            ))}
          {groupedByDepoente.outros.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Outras peças ({groupedByDepoente.outros.length})
              </h4>
              <div className="space-y-1.5 ml-1">
                {groupedByDepoente.outros.map(s => (
                  <SectionCard key={s.id} section={s} onClick={() => handleOpenSection(s)} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(s => (
            <SectionCard key={s.id} section={s} onClick={() => handleOpenSection(s)} />
          ))}
        </div>
      )}

      <SectionDetailSheet
        section={selectedSection}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSectionUpdated={() => {
          // Refetch sections after approve/reject/extract
          if (processoId) {
            utils.drive.sectionsByProcesso.invalidate({ processoId });
          } else {
            utils.drive.sectionsByAssistido.invalidate({ assistidoId });
          }
        }}
      />
    </div>
  );
}
