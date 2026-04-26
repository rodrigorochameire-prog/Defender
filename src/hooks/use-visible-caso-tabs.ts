import { useMemo } from "react";
import { inferCasoArea, type Area } from "@/lib/hierarquia/infer-caso-area";
import { computeVisibleCasoTabs, type CasoTab } from "@/lib/hierarquia/visible-caso-tabs";

interface ProcessoMin {
  id: number;
  area: Area | null;
  isReferencia: boolean;
}

export function useVisibleCasoTabs(processos: ProcessoMin[] | null | undefined): CasoTab[] {
  return useMemo(() => {
    const area = inferCasoArea(processos ?? []);
    return computeVisibleCasoTabs(area);
  }, [processos]);
}
