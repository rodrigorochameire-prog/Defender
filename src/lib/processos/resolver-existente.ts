import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, processos } from "@/lib/db";

/**
 * Retorna o id do melhor processo existente do assistido (não deletado),
 * preferindo um CNJ real sobre um stub "SN-…" e, dentro disso, o mais recente.
 * `null` quando o assistido não tem nenhum processo.
 *
 * Serve para vincular atendimentos/demandas ao processo que o assistido já tem,
 * em vez de criar stubs "SN-<timestamp>" duplicados.
 */
export async function resolverProcessoExistente(assistidoId: number): Promise<number | null> {
  const [p] = await db
    .select({ id: processos.id })
    .from(processos)
    .where(and(eq(processos.assistidoId, assistidoId), isNull(processos.deletedAt)))
    // stubs (SN-…) por último; depois o mais recente
    .orderBy(sql`(${processos.numeroAutos} ilike 'SN-%') asc`, desc(processos.id))
    .limit(1);
  return p?.id ?? null;
}
