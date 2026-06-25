/**
 * Deriva a "entidade em foco" a partir da rota atual, para o ⌘K oferecer as
 * skills de IA daquela entidade. Sem estado global — a URL é a fonte. Puro.
 */
import type { SkillEntity } from "./catalog";

export interface PaletteEntity {
  entity: Extract<SkillEntity, "processo" | "assistido">;
  id: number;
}

const ROUTES: { segment: string; entity: PaletteEntity["entity"] }[] = [
  { segment: "processos", entity: "processo" },
  { segment: "assistidos", entity: "assistido" },
];

/** Inteiro positivo a partir de uma string de path (rejeita 0, negativos, decimais). */
function positiveIntId(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function entityFromPathname(pathname: string | null): PaletteEntity | null {
  if (!pathname) return null;
  // Descarta query/hash e normaliza barras.
  const path = pathname.split(/[?#]/)[0];
  const parts = path.split("/").filter(Boolean); // ["admin","processos","123",...]
  const adminIdx = parts.indexOf("admin");
  if (adminIdx === -1) return null;

  const segment = parts[adminIdx + 1];
  const idRaw = parts[adminIdx + 2];
  const route = ROUTES.find((r) => r.segment === segment);
  if (!route) return null;

  const id = positiveIntId(idRaw);
  if (id == null) return null;

  return { entity: route.entity, id };
}
