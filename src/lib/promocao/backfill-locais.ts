import { and, eq, isNull, sql } from "drizzle-orm";
import { db, withTransaction } from "@/lib/db";
import { processos } from "@/lib/db/schema/core";
import { lugares, participacoesLugar } from "@/lib/db/schema/lugares";
import { candidatosDeLocais } from "./adaptador-analysis-locais";
import { planejarLocais } from "./planejar-locais";
import { criarRepoLugarDrizzle } from "./repo-lugar";
import { aplicarAcoesLugar } from "./applier-lugar";
import type { LugarExistente, ParticipacaoLugarExistente } from "./tipos-lugar";

export interface BackfillLugarContadores {
  processos: number;
  vinculadas: number;
  criadas: number;
  ignoradas: number;
}

export interface BackfillLugarOpts {
  /** Limite de processos a processar neste lote (default: 50). */
  limite?: number;
  /** Restringe a um workspace (default: todos). */
  workspaceId?: number;
}

/** Contadores de ações para um único processo promovido. */
export interface PromocaoLugarProcessoContadores {
  vinculadas: number;
  criadas: number;
  ignoradas: number;
}

/**
 * Promove os lugares extraídos pela IA (`analysisData.locais[]`) para um único
 * processo: carrega o estado (workspaceId, analysisData, lugares existentes do
 * workspace, participações), planeja de forma idempotente e aplica em transação.
 *
 * Reusado pelo backfill (varredura em lote) e pelo hook de consolidação.
 * NÃO faz early-return em `lugares_promovidos_em`: essa flag é apenas o filtro
 * de skip do backfill. Marca como promovido mesmo quando não há candidatos
 * (liveness do lote).
 *
 * Pool de dedup escopado por workspace (mais conservador no caminho de escrita,
 * espelhando a promoção de pessoas). Lugares de outros workspaces não cross-linkam.
 */
export async function promoverLocaisProcesso(
  processoId: number,
): Promise<PromocaoLugarProcessoContadores> {
  const contadores: PromocaoLugarProcessoContadores = {
    vinculadas: 0,
    criadas: 0,
    ignoradas: 0,
  };

  // Estado do processo: workspaceId + analysisData.
  const [proc] = await db
    .select({ workspaceId: processos.workspaceId, analysisData: processos.analysisData })
    .from(processos)
    .where(eq(processos.id, processoId))
    .limit(1);
  if (!proc) return contadores;

  // `lugares.workspace_id` é NOT NULL → usa o workspace do processo ou fallback 1.
  const workspaceId = proc.workspaceId ?? 1;

  const candidatos = candidatosDeLocais(
    processoId,
    (proc.analysisData as Record<string, unknown> | null) ?? null,
  );

  if (candidatos.length === 0) {
    // Sem locais extraíveis: marca como promovido mesmo assim (liveness do lote).
    await db
      .update(processos)
      .set({ lugaresPromovidosEm: new Date() })
      .where(eq(processos.id, processoId));
    return contadores;
  }

  // Lugares existentes do workspace (pool de dedup; non-merged).
  const rowsLugares = await db
    .select({ id: lugares.id, enderecoNormalizado: lugares.enderecoNormalizado })
    .from(lugares)
    .where(and(isNull(lugares.mergedInto), eq(lugares.workspaceId, workspaceId)));
  const existentes: LugarExistente[] = rowsLugares.map((l) => ({
    id: l.id,
    enderecoNormalizado: l.enderecoNormalizado,
  }));

  // Participações já existentes no processo (com fonte, p/ idempotência).
  const rowsPart = await db
    .select({
      lugarId: participacoesLugar.lugarId,
      processoId: participacoesLugar.processoId,
      tipo: participacoesLugar.tipo,
      fonte: participacoesLugar.fonte,
    })
    .from(participacoesLugar)
    .where(eq(participacoesLugar.processoId, processoId));
  const participacoes: ParticipacaoLugarExistente[] = rowsPart.map((p) => ({
    lugarId: p.lugarId,
    processoId: p.processoId ?? processoId,
    tipo: p.tipo,
    fonte: p.fonte,
  }));

  const acoes = planejarLocais({ processoId, candidatos, existentes, participacoes });

  await withTransaction(async (tx) => {
    await aplicarAcoesLugar(criarRepoLugarDrizzle(tx), processoId, workspaceId, acoes);
  });

  for (const a of acoes) {
    if (a.tipo === "vincular") contadores.vinculadas += 1;
    else if (a.tipo === "criar") contadores.criadas += 1;
    else if (a.tipo === "ignorar") contadores.ignoradas += 1;
  }

  return contadores;
}

/**
 * Varre os processos com locais extraídos pela IA (`analysisData.locais`) ainda
 * não promovidos (`lugares_promovidos_em IS NULL`) e promove em lote.
 * Idempotente (o planejador deduplica). Lote default: 50.
 */
export async function backfillPromocaoLocais(
  opts: BackfillLugarOpts = {},
): Promise<BackfillLugarContadores> {
  const limite = opts.limite ?? 50;
  const contadores: BackfillLugarContadores = {
    processos: 0,
    vinculadas: 0,
    criadas: 0,
    ignoradas: 0,
  };

  const wsFilter =
    opts.workspaceId != null ? eq(processos.workspaceId, opts.workspaceId) : undefined;

  const rows = await db
    .select({ processoId: processos.id })
    .from(processos)
    .where(
      and(
        isNull(processos.lugaresPromovidosEm),
        sql`${processos.analysisData} -> 'locais' IS NOT NULL`,
        ...(wsFilter ? [wsFilter] : []),
      ),
    )
    .limit(limite);

  for (const r of rows) {
    const c = await promoverLocaisProcesso(r.processoId);
    contadores.processos += 1;
    contadores.vinculadas += c.vinculadas;
    contadores.criadas += c.criadas;
    contadores.ignoradas += c.ignoradas;
  }

  return contadores;
}
