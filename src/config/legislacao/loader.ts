import type { Legislacao } from "./types";

const cache = new Map<string, Legislacao>();

export async function loadLegislacao(id: string): Promise<Legislacao | null> {
  if (cache.has(id)) return cache.get(id)!;
  try {
    const mod = await import(`./data/${id}`);
    const data = mod.default as Legislacao;
    cache.set(id, data);
    return data;
  } catch {
    return null;
  }
}

export function clearCache() {
  cache.clear();
}
