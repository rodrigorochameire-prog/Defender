export type Area =
  | "JURI" | "EXECUCAO_PENAL" | "VIOLENCIA_DOMESTICA" | "SUBSTITUICAO"
  | "CURADORIA" | "FAMILIA" | "CIVEL" | "FAZENDA_PUBLICA" | "CRIMINAL"
  | "INFANCIA_JUVENTUDE";

interface ProcessoMin {
  id: number;
  area: Area | null;
  isReferencia: boolean;
}

export function inferCasoArea(processos: ProcessoMin[] | null | undefined): Area {
  if (!processos || processos.length === 0) return "SUBSTITUICAO";

  const ref = processos.find((p) => p.isReferencia && p.area);
  if (ref && ref.area) return ref.area;

  const counts = new Map<Area, number>();
  for (const p of processos) {
    if (p.area) counts.set(p.area, (counts.get(p.area) ?? 0) + 1);
  }
  if (counts.size === 0) return "SUBSTITUICAO";

  let best: Area = "SUBSTITUICAO";
  let bestCount = -1;
  for (const p of processos) {
    if (!p.area) continue;
    const n = counts.get(p.area) ?? 0;
    if (n > bestCount) { best = p.area; bestCount = n; }
  }
  return best;
}
