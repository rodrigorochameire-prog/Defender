import type { Legislacao } from "./types";
import { LEGISLACAO_REGISTRY } from "./registry";

export async function loadLegislacao(id: string): Promise<Legislacao | null> {
  return LEGISLACAO_REGISTRY[id] ?? null;
}

export function clearCache() {
  // Noop — registro estático não precisa de cache
}
