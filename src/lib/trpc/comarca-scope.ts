import { eq, or, inArray, exists, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assistidos, processos, assistidosProcessos, comarcas } from "@/lib/db/schema";
import type { User } from "@/lib/db/schema";

/** IDs das comarcas da Região Metropolitana de Salvador.
 *  Populado dinamicamente — evita hardcode de IDs do seed. */
export async function getRMSComarcaIds(): Promise<number[]> {
  const result = await db
    .select({ id: comarcas.id })
    .from(comarcas)
    .where(eq(comarcas.regiaoMetro, "RMS"));
  return result.map((r) => r.id);
}

/** ID da comarca do usuário. Fallback para 1 (Camaçari) se não configurado. */
export function getComarcaId(user: User): number {
  return user.comarcaId ?? 1;
}

/**
 * Filtro de visibilidade de assistidos em 3 camadas (OR):
 *
 * Camada 1 — comarca própria (sempre)
 * Camada 2 — RMS (opcional, via toggle em user_settings)
 * Camada 3 — assistido com processo tramitando na comarca do defensor (sempre automático)
 */
export async function getAssistidosVisibilityFilter(
  user: User,
  opts?: { verRMS?: boolean }
) {
  const comarcaId = getComarcaId(user);
  const camadas = [];

  // Camada 1: comarca própria
  camadas.push(eq(assistidos.comarcaId, comarcaId));

  // Camada 2: toggle RMS (opcional)
  if (opts?.verRMS) {
    const rmsIds = await getRMSComarcaIds();
    if (rmsIds.length > 0) {
      camadas.push(inArray(assistidos.comarcaId, rmsIds));
    }
  }

  // Camada 3: assistido com processo na comarca do defensor (automático)
  camadas.push(
    exists(
      db
        .select({ one: sql`1` })
        .from(assistidosProcessos)
        .innerJoin(processos, eq(processos.id, assistidosProcessos.processoId))
        .where(
          and(
            eq(assistidosProcessos.assistidoId, assistidos.id),
            eq(processos.comarcaId, comarcaId)
          )
        )
    )
  );

  return or(...camadas)!;
}

/**
 * Filtro simples por comarca — para processos, radar, configs.
 * Recebe a tabela como parâmetro para ser reutilizável.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getComarcaFilter<T extends { comarcaId: any }>(
  table: T,
  user: User
) {
  return eq(table.comarcaId, getComarcaId(user));
}
