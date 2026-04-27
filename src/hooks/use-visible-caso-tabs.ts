import { useMemo } from "react";
import { inferCasoArea, type Area } from "@/lib/hierarquia/infer-caso-area";
import { computeVisibleCasoTabs, type CasoTab } from "@/lib/hierarquia/visible-caso-tabs";

interface ProcessoLike {
  id: number;
  area: string | null | undefined;
  isReferencia?: boolean | null;
  [k: string]: unknown;
}

export function useVisibleCasoTabs(processos: ProcessoLike[] | null | undefined): CasoTab[] {
  return useMemo(() => {
    const normalized = (processos ?? []).map((p) => ({
      id: p.id,
      area: (p.area ?? null) as Area | null,
      isReferencia: !!p.isReferencia,
    }));
    const area = inferCasoArea(normalized);
    return computeVisibleCasoTabs(area);
  }, [processos]);
}
