"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

type EntityType = "pessoa" | "caso" | "documento" | "fato";

export interface EntitySheetData {
  type: EntityType;
  name: string;
  id?: number;
  subtitle?: string;
}

interface EntitySheetContextValue {
  openEntity: (data: EntitySheetData) => void;
}

const EntitySheetContext = createContext<EntitySheetContextValue | undefined>(undefined);

export function EntitySheetProvider({ children }: { children: React.ReactNode }) {
  const [entity, setEntity] = useState<EntitySheetData | null>(null);
  const entityId = entity?.id ?? null;

  const personaQuery = trpc.casos.getPersonaById.useQuery(
    { id: entityId ?? 0 },
    { enabled: entity?.type === "pessoa" && !!entityId }
  );
  const factQuery = trpc.casos.getFactById.useQuery(
    { id: entityId ?? 0 },
    { enabled: entity?.type === "fato" && !!entityId }
  );
  const documentQuery = trpc.documents.getById.useQuery(
    { id: entityId ?? 0 },
    { enabled: entity?.type === "documento" && !!entityId }
  );
  const caseQuery = trpc.casos.getById.useQuery(
    { id: entityId ?? 0 },
    { enabled: entity?.type === "caso" && !!entityId }
  );

  const isLoading =
    personaQuery.isLoading ||
    factQuery.isLoading ||
    documentQuery.isLoading ||
    caseQuery.isLoading;

  const profileLink = (() => {
    if (!entity) return null;
    if (entity.type === "caso" && entityId) return `/admin/casos/${entityId}`;
    if (entity.type === "documento") return "/admin/documentos";
    if (entity.type === "pessoa") {
      const persona = personaQuery.data;
      if (persona?.assistidoId) return `/admin/assistidos/${persona.assistidoId}`;
      if (persona?.juradoId) return "/admin/jurados";
    }
    if (entity.type === "fato" && factQuery.data?.casoId) {
      return `/admin/casos/${factQuery.data.casoId}`;
    }
    return null;
  })();

  const value = useMemo(
    () => ({
      openEntity: (data: EntitySheetData) => setEntity(data),
    }),
    []
  );

  return (
    <EntitySheetContext.Provider value={value}>
      {children}
      <Sheet open={!!entity} onOpenChange={(open) => !open && setEntity(null)}>
        <SheetContent side="right" className="w-[380px] sm:w-[420px]">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold">Contexto da Entidade</SheetTitle>
            <SheetDescription>
              Visualização rápida para manter o foco sem trocar de página.
            </SheetDescription>
          </SheetHeader>

          {entity && (
            <div className="mt-6 space-y-4">
              <div>
                <Badge variant="outline" className="uppercase tracking-[0.2em] text-[10px]">
                  {entity.type}
                </Badge>
                <h3 className="text-lg font-semibold mt-2">{entity.name}</h3>
                {entity.subtitle && (
                  <p className="text-sm text-muted-foreground mt-1">{entity.subtitle}</p>
                )}
              </div>

              <div className="rounded-sm border border-slate-200 dark:border-slate-800 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Resumo</p>
                {isLoading && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                    Carregando detalhes...
                  </p>
                )}
                {!isLoading && entity.type === "pessoa" && personaQuery.data && (
                  <div className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Tipo</span>
                      <span className="font-medium">{personaQuery.data.tipo}</span>
                    </div>
                    {personaQuery.data.status && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Status</span>
                        <span className="font-medium">{personaQuery.data.status}</span>
                      </div>
                    )}
                    {personaQuery.data.observacoes && (
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Observações</span>
                        <p className="text-sm mt-1">{personaQuery.data.observacoes}</p>
                      </div>
                    )}
                    {(personaQuery.data.assistidoId || personaQuery.data.juradoId) && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Vínculo</span>
                        <span className="font-medium">
                          {personaQuery.data.assistidoId
                            ? `Assistido #${personaQuery.data.assistidoId}`
                            : `Jurado #${personaQuery.data.juradoId}`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {!isLoading && entity.type === "documento" && documentQuery.data && (
                  <div className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Categoria</span>
                      <span className="font-medium">{documentQuery.data.categoria}</span>
                    </div>
                    {documentQuery.data.tipoPeca && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Tipo</span>
                        <span className="font-medium">{documentQuery.data.tipoPeca}</span>
                      </div>
                    )}
                    {documentQuery.data.fileName && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Arquivo</span>
                        <span className="font-medium">{documentQuery.data.fileName}</span>
                      </div>
                    )}
                  </div>
                )}
                {!isLoading && entity.type === "fato" && factQuery.data && (
                  <div className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Tipo</span>
                      <span className="font-medium">{factQuery.data.tipo || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Status</span>
                      <span className="font-medium">{factQuery.data.status || "—"}</span>
                    </div>
                    {Array.isArray(factQuery.data.tags) && factQuery.data.tags.length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Tags</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {factQuery.data.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Evidências</span>
                      <span className="font-medium">{factQuery.data.evidenceCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Contradições</span>
                      <span className="font-medium">{factQuery.data.contradicoesCount}</span>
                    </div>
                  </div>
                )}
                {!isLoading && entity.type === "caso" && caseQuery.data && (
                  <div className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Status</span>
                      <span className="font-medium">{caseQuery.data.status}</span>
                    </div>
                    {caseQuery.data.fase && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Fase</span>
                        <span className="font-medium">{caseQuery.data.fase}</span>
                      </div>
                    )}
                    {caseQuery.data.prioridade && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Prioridade</span>
                        <span className="font-medium">{caseQuery.data.prioridade}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {profileLink ? (
                  <Button size="sm" asChild>
                    <Link href={profileLink}>Abrir perfil</Link>
                  </Button>
                ) : (
                  <Button size="sm" disabled>
                    Abrir perfil
                  </Button>
                )}
                <Button size="sm" variant="outline">Criar nota</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </EntitySheetContext.Provider>
  );
}

export function useEntitySheet() {
  const context = useContext(EntitySheetContext);
  if (!context) return null;
  return context;
}
