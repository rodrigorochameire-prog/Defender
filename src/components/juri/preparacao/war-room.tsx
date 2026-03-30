"use client";

import { useState, useMemo } from "react";
import {
  Map,
  Users,
  Calendar,
  FileSearch,
  AlertTriangle,
  ChevronRight,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { WarRoomCard, type CardType } from "./war-room-card";

// ============================================
// TYPES
// ============================================

interface WarRoomProps {
  sessaoId: string;
  casoId: number | null;
}

/** Actor returned from the API */
interface Actor {
  id: string;
  nome: string;
  tipo: "reu" | "vitima" | "testemunha_acusacao" | "testemunha_defesa";
  papel?: string;
  resumo?: string;
  depoimento?: string;
  fatosRelacionados?: string[];
}

/** Fact/event returned from the API */
interface Fact {
  id: string;
  descricao: string;
  data?: string;
  tipo?: string;
  atoresEnvolvidos?: string[];
  provasRelacionadas?: string[];
}

/** Evidence item returned from the API */
interface Evidence {
  id: string;
  descricao: string;
  tipo?: string;
  origem?: string;
  fatoRelacionado?: string;
}

/** Contradiction between testimonies */
interface Contradiction {
  id: string;
  personaA: string;
  personaB: string;
  descricao: string;
  fatoRelacionado?: string;
}

/** Full shape returned by the tRPC query */
interface WarRoomData {
  atores: Actor[];
  fatos: Fact[];
  provas: Evidence[];
  contradicoes: Contradiction[];
}

/** Union of all selectable item types for the detail panel */
type SelectedItem =
  | { kind: "actor"; data: Actor }
  | { kind: "fact"; data: Fact }
  | { kind: "evidence"; data: Evidence }
  | { kind: "contradiction"; data: Contradiction };

// ============================================
// HELPERS
// ============================================

function actorTypeToCardType(tipo: Actor["tipo"]): CardType {
  return tipo;
}

function formatFactDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

/** Given a selected item, return the IDs of related items to highlight */
function getRelatedIds(
  selected: SelectedItem,
  data: WarRoomData
): Set<string> {
  const ids = new Set<string>();

  switch (selected.kind) {
    case "actor": {
      const actor = selected.data;
      // Highlight facts this actor is involved in
      for (const f of data.fatos) {
        if (f.atoresEnvolvidos?.includes(actor.id)) {
          ids.add(f.id);
          // And evidence related to those facts
          for (const e of data.provas) {
            if (e.fatoRelacionado === f.id) ids.add(e.id);
          }
        }
      }
      // Highlight contradictions involving this actor
      for (const c of data.contradicoes) {
        if (c.personaA === actor.id || c.personaB === actor.id) {
          ids.add(c.id);
          // Also highlight the other persona
          const other = c.personaA === actor.id ? c.personaB : c.personaA;
          ids.add(other);
        }
      }
      break;
    }
    case "fact": {
      const fact = selected.data;
      // Highlight actors involved in this fact
      if (fact.atoresEnvolvidos) {
        for (const aid of fact.atoresEnvolvidos) ids.add(aid);
      }
      // Highlight evidence related to this fact
      for (const e of data.provas) {
        if (e.fatoRelacionado === fact.id) ids.add(e.id);
      }
      break;
    }
    case "evidence": {
      const evidence = selected.data;
      // Highlight the related fact
      if (evidence.fatoRelacionado) {
        ids.add(evidence.fatoRelacionado);
        // And actors involved in that fact
        const fact = data.fatos.find(
          (f) => f.id === evidence.fatoRelacionado
        );
        if (fact?.atoresEnvolvidos) {
          for (const aid of fact.atoresEnvolvidos) ids.add(aid);
        }
      }
      break;
    }
    case "contradiction": {
      const contradiction = selected.data;
      ids.add(contradiction.personaA);
      ids.add(contradiction.personaB);
      if (contradiction.fatoRelacionado) {
        ids.add(contradiction.fatoRelacionado);
      }
      break;
    }
  }

  return ids;
}

// ============================================
// SUB-COMPONENTS
// ============================================

function ColumnHeader({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </span>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">
        {count}
      </Badge>
    </div>
  );
}

function DetailPanel({
  selected,
  data,
  onClose,
}: {
  selected: SelectedItem;
  data: WarRoomData;
  onClose: () => void;
}) {
  const renderActorDetail = (actor: Actor) => {
    const relatedFacts = data.fatos.filter((f) =>
      f.atoresEnvolvidos?.includes(actor.id)
    );
    return (
      <>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="info" className="text-[10px]">
            {actor.tipo.replace("_", " ")}
          </Badge>
          {actor.papel && (
            <span className="text-xs text-muted-foreground">
              {actor.papel}
            </span>
          )}
        </div>
        {actor.resumo && (
          <p className="text-sm text-muted-foreground mb-3">
            {actor.resumo}
          </p>
        )}
        {actor.depoimento && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Depoimento
            </p>
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border leading-relaxed">
              {actor.depoimento}
            </p>
          </div>
        )}
        {relatedFacts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Fatos relacionados ({relatedFacts.length})
            </p>
            <ul className="space-y-1">
              {relatedFacts.map((f) => (
                <li
                  key={f.id}
                  className="text-xs text-muted-foreground flex items-start gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{f.descricao}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  };

  const renderFactDetail = (fact: Fact) => {
    const relatedEvidence = data.provas.filter(
      (e) => e.fatoRelacionado === fact.id
    );
    const involvedActors = data.atores.filter((a) =>
      fact.atoresEnvolvidos?.includes(a.id)
    );
    return (
      <>
        {fact.data && (
          <Badge variant="default" className="text-[10px] mb-2">
            <Calendar className="w-3 h-3 mr-1" />
            {formatFactDate(fact.data)}
          </Badge>
        )}
        <p className="text-sm text-muted-foreground mb-3">
          {fact.descricao}
        </p>
        {involvedActors.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Atores envolvidos ({involvedActors.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {involvedActors.map((a) => (
                <Badge key={a.id} variant="outline" className="text-[10px]">
                  {a.nome}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {relatedEvidence.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Provas vinculadas ({relatedEvidence.length})
            </p>
            <ul className="space-y-1">
              {relatedEvidence.map((e) => (
                <li
                  key={e.id}
                  className="text-xs text-muted-foreground flex items-start gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{e.descricao}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  };

  const renderEvidenceDetail = (evidence: Evidence) => {
    const relatedFact = data.fatos.find(
      (f) => f.id === evidence.fatoRelacionado
    );
    return (
      <>
        <div className="flex items-center gap-2 mb-2">
          {evidence.tipo && (
            <Badge variant="warning" className="text-[10px]">
              {evidence.tipo}
            </Badge>
          )}
          {evidence.origem && (
            <span className="text-xs text-muted-foreground">
              Origem: {evidence.origem}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {evidence.descricao}
        </p>
        {relatedFact && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Fato relacionado
            </p>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{relatedFact.descricao}</span>
            </p>
          </div>
        )}
      </>
    );
  };

  const renderContradictionDetail = (contradiction: Contradiction) => {
    const personaA = data.atores.find((a) => a.id === contradiction.personaA);
    const personaB = data.atores.find((a) => a.id === contradiction.personaB);
    const relatedFact = data.fatos.find(
      (f) => f.id === contradiction.fatoRelacionado
    );
    return (
      <>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="danger" className="text-[10px]">
            <AlertTriangle className="w-3 h-3 mr-0.5" />
            Contradicao
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm mb-3">
          <span className="font-semibold text-foreground/80">
            {personaA?.nome ?? contradiction.personaA}
          </span>
          <span className="text-muted-foreground/50">vs</span>
          <span className="font-semibold text-foreground/80">
            {personaB?.nome ?? contradiction.personaB}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {contradiction.descricao}
        </p>
        {relatedFact && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Fato em disputa
            </p>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{relatedFact.descricao}</span>
            </p>
          </div>
        )}
      </>
    );
  };

  const titleMap: Record<SelectedItem["kind"], string> = {
    actor: "Detalhe do Ator",
    fact: "Detalhe do Fato",
    evidence: "Detalhe da Prova",
    contradiction: "Detalhe da Contradicao",
  };

  return (
    <div className="mt-4 p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground/80">
          {titleMap[selected.kind]}
        </h4>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
          aria-label="Fechar painel de detalhe"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">
        {selected.kind === "actor" && selected.data.nome}
        {selected.kind === "fact" && selected.data.descricao}
        {selected.kind === "evidence" && selected.data.descricao}
        {selected.kind === "contradiction" &&
          `${selected.data.personaA} vs ${selected.data.personaB}`}
      </h3>
      <div>
        {selected.kind === "actor" && renderActorDetail(selected.data)}
        {selected.kind === "fact" && renderFactDetail(selected.data)}
        {selected.kind === "evidence" && renderEvidenceDetail(selected.data)}
        {selected.kind === "contradiction" &&
          renderContradictionDetail(selected.data)}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Mapa do Caso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((col) => (
            <div key={col} className="space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-3/4" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="min-h-[400px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Mapa do Caso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground text-sm text-center py-16 border-2 border-dashed border-border rounded-lg">
          <Map className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium">Vincule um caso para visualizar o mapa</p>
          <p className="text-xs mt-2 text-muted-foreground/50 max-w-sm mx-auto">
            O mapa estrategico mostra atores, fatos e provas conectados
            visualmente, destacando contradicoes e relacoes entre depoimentos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function WarRoom({ sessaoId, casoId }: WarRoomProps) {
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

  // ---- tRPC query ----
  const preparacaoRouter = (trpc as any).preparacao;
  const queryResult: {
    data: WarRoomData | undefined;
    isLoading: boolean;
    isError: boolean;
  } = preparacaoRouter
    ? preparacaoRouter.warRoomData.useQuery(
        { casoId: Number(casoId) },
        {
          enabled: !!casoId,
          retry: false,
          staleTime: 5 * 60 * 1000,
        }
      )
    : {
        data: undefined,
        isLoading: false,
        isError: true,
      };
  const { data, isLoading, isError } = queryResult;

  // ---- Compute highlighted IDs ----
  const highlightedIds = useMemo(() => {
    if (!selectedItem || !data) return new Set<string>();
    return getRelatedIds(selectedItem, data);
  }, [selectedItem, data]);

  // ---- Selection handlers ----
  const handleSelectActor = (actor: Actor) => {
    setSelectedItem((prev) =>
      prev?.kind === "actor" && prev.data.id === actor.id
        ? null
        : { kind: "actor", data: actor }
    );
  };

  const handleSelectFact = (fact: Fact) => {
    setSelectedItem((prev) =>
      prev?.kind === "fact" && prev.data.id === fact.id
        ? null
        : { kind: "fact", data: fact }
    );
  };

  const handleSelectEvidence = (evidence: Evidence) => {
    setSelectedItem((prev) =>
      prev?.kind === "evidence" && prev.data.id === evidence.id
        ? null
        : { kind: "evidence", data: evidence }
    );
  };

  const handleSelectContradiction = (contradiction: Contradiction) => {
    setSelectedItem((prev) =>
      prev?.kind === "contradiction" && prev.data.id === contradiction.id
        ? null
        : { kind: "contradiction", data: contradiction }
    );
  };

  // ---- Grouping actors by type ----
  const groupedActors = useMemo(() => {
    if (!data?.atores) return {};
    const groups: Partial<Record<Actor["tipo"], Actor[]>> = {};
    for (const actor of data.atores) {
      if (!groups[actor.tipo]) groups[actor.tipo] = [];
      groups[actor.tipo]!.push(actor);
    }
    return groups;
  }, [data?.atores]);

  // ---- Sorted facts by date ----
  const sortedFacts = useMemo(() => {
    if (!data?.fatos) return [];
    return [...data.fatos].sort((a, b) => {
      if (!a.data && !b.data) return 0;
      if (!a.data) return 1;
      if (!b.data) return -1;
      return new Date(a.data).getTime() - new Date(b.data).getTime();
    });
  }, [data?.fatos]);

  // ---- Guard states ----
  if (!casoId || isError) return <EmptyState />;
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState />;

  const { atores, provas, contradicoes } = data;
  const actorTypeOrder: Actor["tipo"][] = [
    "reu",
    "vitima",
    "testemunha_acusacao",
    "testemunha_defesa",
  ];
  const actorGroupLabels: Record<Actor["tipo"], string> = {
    reu: "Reu(s)",
    vitima: "Vitima(s)",
    testemunha_acusacao: "Testemunhas da Acusacao",
    testemunha_defesa: "Testemunhas da Defesa",
  };

  const selectedId =
    selectedItem?.kind === "actor"
      ? selectedItem.data.id
      : selectedItem?.kind === "fact"
        ? selectedItem.data.id
        : selectedItem?.kind === "evidence"
          ? selectedItem.data.id
          : selectedItem?.kind === "contradiction"
            ? selectedItem.data.id
            : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Map className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Mapa do Caso
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-[10px]">
              {atores.length} atores
            </Badge>
            <Badge variant="default" className="text-[10px]">
              {sortedFacts.length} fatos
            </Badge>
            <Badge variant="default" className="text-[10px]">
              {provas.length} provas
            </Badge>
            {contradicoes.length > 0 && (
              <Badge variant="danger" className="text-[10px]">
                <AlertTriangle className="w-3 h-3 mr-0.5" />
                {contradicoes.length} contradicoes
              </Badge>
            )}
          </div>
        </div>
        {selectedItem && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
            Clique em um card para ver detalhes. Cards relacionados ficam
            destacados.
          </p>
        )}
      </CardHeader>

      <CardContent>
        {/* 3-column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* ===== Column 1: Atores ===== */}
          <div>
            <ColumnHeader
              icon={<Users className="w-4 h-4" />}
              label="Atores"
              count={atores.length}
            />
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-4 pr-2">
                {actorTypeOrder.map((tipo) => {
                  const group = groupedActors[tipo];
                  if (!group || group.length === 0) return null;
                  return (
                    <div key={tipo}>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50 mb-1.5 ml-1">
                        {actorGroupLabels[tipo]}
                      </p>
                      <div className="space-y-2">
                        {group.map((actor) => (
                          <WarRoomCard
                            key={actor.id}
                            id={actor.id}
                            type={actorTypeToCardType(actor.tipo)}
                            title={actor.nome}
                            subtitle={actor.papel}
                            detail={actor.resumo}
                            isHighlighted={
                              (selectedId === actor.id) ||
                              highlightedIds.has(actor.id)
                            }
                            onClick={() => handleSelectActor(actor)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {atores.length === 0 && (
                  <p className="text-xs text-muted-foreground/50 text-center py-6">
                    Nenhum ator cadastrado
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ===== Column 2: Fatos / Timeline ===== */}
          <div className="border-x-0 md:border-x md:border-dashed border-border md:px-4">
            <ColumnHeader
              icon={<Calendar className="w-4 h-4" />}
              label="Fatos / Timeline"
              count={sortedFacts.length}
            />
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2 pr-2">
                {sortedFacts.map((fact) => (
                  <WarRoomCard
                    key={fact.id}
                    id={fact.id}
                    type="fato"
                    title={fact.descricao}
                    subtitle={
                      fact.data ? formatFactDate(fact.data) : undefined
                    }
                    detail={fact.tipo}
                    isHighlighted={
                      (selectedId === fact.id) ||
                      highlightedIds.has(fact.id)
                    }
                    onClick={() => handleSelectFact(fact)}
                  />
                ))}
                {sortedFacts.length === 0 && (
                  <p className="text-xs text-muted-foreground/50 text-center py-6">
                    Nenhum fato cadastrado
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ===== Column 3: Provas ===== */}
          <div>
            <ColumnHeader
              icon={<FileSearch className="w-4 h-4" />}
              label="Provas"
              count={provas.length}
            />
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2 pr-2">
                {provas.map((evidence) => (
                  <WarRoomCard
                    key={evidence.id}
                    id={evidence.id}
                    type="prova"
                    title={evidence.descricao}
                    subtitle={evidence.tipo}
                    detail={evidence.origem}
                    isHighlighted={
                      (selectedId === evidence.id) ||
                      highlightedIds.has(evidence.id)
                    }
                    onClick={() => handleSelectEvidence(evidence)}
                  />
                ))}
                {provas.length === 0 && (
                  <p className="text-xs text-muted-foreground/50 text-center py-6">
                    Nenhuma prova cadastrada
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* ===== Contradictions Section ===== */}
        {contradicoes.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h4 className="text-xs uppercase tracking-wider font-semibold text-red-600 dark:text-red-400">
                Contradicoes Identificadas
              </h4>
              <Badge variant="danger" className="text-[10px] px-1.5 py-0">
                {contradicoes.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {contradicoes.map((c) => {
                const personaAName =
                  atores.find((a) => a.id === c.personaA)?.nome ?? c.personaA;
                const personaBName =
                  atores.find((a) => a.id === c.personaB)?.nome ?? c.personaB;
                return (
                  <WarRoomCard
                    key={c.id}
                    id={c.id}
                    type="contradicao"
                    title={`${personaAName} vs ${personaBName}`}
                    detail={c.descricao}
                    isHighlighted={
                      (selectedId === c.id) ||
                      highlightedIds.has(c.id)
                    }
                    isContradiction
                    onClick={() => handleSelectContradiction(c)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ===== Detail Panel ===== */}
        {selectedItem && data && (
          <DetailPanel
            selected={selectedItem}
            data={data}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
