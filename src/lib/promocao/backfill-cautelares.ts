import { and, eq, isNull, sql } from "drizzle-orm";
import { db, withTransaction } from "@/lib/db";
import { processos } from "@/lib/db/schema/core";
import { cautelaresDecisao } from "@/lib/db/schema/cautelares";
import { candidatosDeMedidasCautelares } from "./adaptador-medidas-cautelares";
import { planejarCautelares } from "./planejar-cautelares";
import { criarRepoCautelarDrizzle } from "./repo-cautelar";
import { aplicarAcoesCautelar } from "./applier-cautelar";
import type { CautelarExistente } from "./tipos-cautelar";

export interface BackfillCautelarContadores {
  processos: number;
  vinculadas: number;
  semCorrespondencia: number;
  ignoradas: number;
}

export interface BackfillCautelarOpts {
  /** Limite de processos a processar neste lote (default: 50). */
  limite?: number;
  /** Restringe a um workspace (default: todos). */
  workspaceId?: number;
}

/** Contadores de ações para um único processo promovido. */
export interface PromocaoCautelarProcessoContadores {
  vinculadas: number;
  semCorrespondencia: number;
  ignoradas: number;
}

/**
 * Promove as medidas cautelares extraídas pela IA
 * (`analysisData.pessoas[].medidasCautelares[]`, achatadas) para `cautelares_decisao`
 * de um único processo: carrega o estado (analysisData, decisões existentes),
 * planeja de forma idempotente e aplica em transação.
 *
 * Reusado pelo backfill (varredura em lote) e pelo hook de consolidação.
 * NÃO faz early-return em `cautelares_promovidas_em`: essa flag é apenas o filtro
 * de skip do backfill. Marca como promovido mesmo quando não há candidatos
 * (liveness do lote).
 */
export async function promoverCautelaresProcesso(
  processoId: number,
): Promise<PromocaoCautelarProcessoContadores> {
  const contadores: PromocaoCautelarProcessoContadores = {
    vinculadas: 0,
    semCorrespondencia: 0,
    ignoradas: 0,
  };

  // Estado do processo: analysisData.
  const [proc] = await db
    .select({ analysisData: processos.analysisData })
    .from(processos)
    .where(eq(processos.id, processoId))
    .limit(1);
  if (!proc) return contadores;

  const candidatos = candidatosDeMedidasCautelares(
    processoId,
    (proc.analysisData as Record<string, unknown> | null) ?? null,
  );

  if (candidatos.length === 0) {
    // Sem medidas extraíveis: marca como promovido mesmo assim (liveness do lote).
    await db
      .update(processos)
      .set({ cautelaresPromovidasEm: new Date() })
      .where(eq(processos.id, processoId));
    return contadores;
  }

  // Decisões cautelares já existentes no processo (com origem, p/ idempotência).
  const rowsCaut = await db
    .select({
      processoId: cautelaresDecisao.processoId,
      codigo: cautelaresDecisao.codigo,
      origem: cautelaresDecisao.origem,
    })
    .from(cautelaresDecisao)
    .where(eq(cautelaresDecisao.processoId, processoId));
  const existentes: CautelarExistente[] = rowsCaut.map((c) => ({
    processoId: c.processoId,
    codigo: c.codigo,
    origem: c.origem ?? "parser",
  }));

  const acoes = planejarCautelares({ processoId, candidatos, existentes });

  await withTransaction(async (tx) => {
    await aplicarAcoesCautelar(criarRepoCautelarDrizzle(tx), processoId, acoes);
  });

  for (const a of acoes) {
    if (a.tipo === "vincular") contadores.vinculadas += 1;
    else if (a.tipo === "sem-correspondencia") contadores.semCorrespondencia += 1;
    else if (a.tipo === "ignorar") contadores.ignoradas += 1;
  }

  return contadores;
}

/**
 * Varre os processos com pessoas extraídas pela IA (`analysisData.pessoas`) ainda
 * não promovidos quanto a cautelares (`cautelares_promovidas_em IS NULL`) e
 * promove em lote. Idempotente (o planejador deduplica). Lote default: 50.
 */
export async function backfillPromocaoCautelares(
  opts: BackfillCautelarOpts = {},
): Promise<BackfillCautelarContadores> {
  const limite = opts.limite ?? 50;
  const contadores: BackfillCautelarContadores = {
    processos: 0,
    vinculadas: 0,
    semCorrespondencia: 0,
    ignoradas: 0,
  };

  const wsFilter =
    opts.workspaceId != null ? eq(processos.workspaceId, opts.workspaceId) : undefined;

  const rows = await db
    .select({ processoId: processos.id })
    .from(processos)
    .where(
      and(
        isNull(processos.cautelaresPromovidasEm),
        sql`${processos.analysisData} -> 'pessoas' IS NOT NULL`,
        ...(wsFilter ? [wsFilter] : []),
      ),
    )
    .limit(limite);

  for (const r of rows) {
    const c = await promoverCautelaresProcesso(r.processoId);
    contadores.processos += 1;
    contadores.vinculadas += c.vinculadas;
    contadores.semCorrespondencia += c.semCorrespondencia;
    contadores.ignoradas += c.ignoradas;
  }

  return contadores;
}
