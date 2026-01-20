"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type EntityType = "pessoa" | "caso" | "documento" | "fato";

export interface EntitySheetData {
  type: EntityType;
  name: string;
  subtitle?: string;
}

interface EntitySheetContextValue {
  openEntity: (data: EntitySheetData) => void;
}

const EntitySheetContext = createContext<EntitySheetContextValue | undefined>(undefined);

export function EntitySheetProvider({ children }: { children: React.ReactNode }) {
  const [entity, setEntity] = useState<EntitySheetData | null>(null);

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
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                  Dados essenciais e vínculos recentes serão exibidos aqui.
                </p>
              </div>

              <div className="flex gap-2">
                <Button size="sm">Abrir perfil</Button>
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
