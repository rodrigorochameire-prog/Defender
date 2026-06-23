import { and, eq, isNull, sql } from "drizzle-orm";
import { db, withTransaction } from "@/lib/db";
import { processos } from "@/lib/db/schema/core";
import { tipificacoes } from "@/lib/db/schema/delitos-catalogo";
import { delitosCatalogo } from "@/lib/db/schema/delitos-catalogo";
import { candidatosDeImputacoes } from "./adaptador-imputacoes";
import { planejarDelitos } from "./planejar-delito";
import { criarRepoDelitoDrizzle } from "./repo-delito";
import { aplicarAcoesDelito } from "./applier-delito";
import type { CatalogoDelito, TipificacaoExistente } from "./tipos-delito";

export interface BackfillDelitoContadores {
  processos: number;
  vinculadas: number;
  semCorrespondencia: number;
  ignoradas: number;
}

export interface BackfillDelitoOpts {
  /** Limite de processos a processar neste lote (default: 50). */
  limite?: number;
  /** Restringe a um workspace (default: todos). */
  workspaceId?: number;
}

/** Contadores de ações para um único processo promovido. */
export interface PromocaoDelitoProcessoContadores {
  vinculadas: number;
  semCorrespondencia: number;
  ignoradas: number;
}

/** Coerção defensiva de coluna jsonb que deveria ser string[]. */
function comoArrayDeStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

/**
 * Promove os delitos extraídos pela IA (`analysisData.imputacoes[]`) para um
 * único processo: carrega o estado (analysisData, catálogo, tipificações
 * existentes), planeja de forma idempotente e aplica em transação.
 *
 * Reusado pelo backfill (varredura em lote) e pelo hook de consolidação.
 * NÃO faz early-return em `delitos_promovidos_em`: essa flag é apenas o filtro
 * de skip do backfill. Quando chamado diretamente, sempre processa — a
 * idempotência é garantida pelo planejador. Marca como promovido mesmo quando
 * não há candidatos (liveness do lote).
 */
export async function promoverDelitosProcesso(
  processoId: number,
): Promise<PromocaoDelitoProcessoContadores> {
  const contadores: PromocaoDelitoProcessoContadores = {
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

  const candidatos = candidatosDeImputacoes(
    processoId,
    (proc.analysisData as Record<string, unknown> | null) ?? null,
  );

  if (candidatos.length === 0) {
    // Sem delitos extraíveis: marca como promovido mesmo assim, para o backfill
    // não re-selecionar este processo a cada execução (liveness do lote).
    await db
      .update(processos)
      .set({ delitosPromovidosEm: new Date() })
      .where(eq(processos.id, processoId));
    return contadores;
  }

  // Catálogo completo (match conservador — nunca cria entrada).
  const rowsCatalogo = await db
    .select({
      id: delitosCatalogo.id,
      codigoLei: delitosCatalogo.codigoLei,
      artigo: delitosCatalogo.artigo,
      paragrafo: delitosCatalogo.paragrafo,
      inciso: delitosCatalogo.inciso,
    })
    .from(delitosCatalogo);
  const catalogo: CatalogoDelito[] = rowsCatalogo.map((c) => ({
    id: c.id,
    codigoLei: c.codigoLei,
    artigo: c.artigo,
    paragrafo: c.paragrafo,
    inciso: c.inciso,
  }));

  // Tipificações já existentes no processo (com origem, p/ idempotência).
  const rowsTip = await db
    .select({
      processoId: tipificacoes.processoId,
      delitoId: tipificacoes.delitoId,
      qualificadoras: tipificacoes.qualificadoras,
      origem: tipificacoes.origem,
    })
    .from(tipificacoes)
    .where(eq(tipificacoes.processoId, processoId));
  const existentes: TipificacaoExistente[] = rowsTip.map((t) => ({
    processoId: t.processoId,
    delitoId: t.delitoId,
    qualificadoras: comoArrayDeStrings(t.qualificadoras),
    origem: t.origem,
  }));

  const acoes = planejarDelitos({ processoId, candidatos, catalogo, tipificacoes: existentes });

  await withTransaction(async (tx) => {
    await aplicarAcoesDelito(criarRepoDelitoDrizzle(tx), processoId, acoes);
  });

  for (const a of acoes) {
    if (a.tipo === "vincular") contadores.vinculadas += 1;
    else if (a.tipo === "sem-correspondencia") contadores.semCorrespondencia += 1;
    else if (a.tipo === "ignorar") contadores.ignoradas += 1;
  }

  return contadores;
}

/**
 * Varre os processos com delitos extraídos pela IA (`analysisData.imputacoes`)
 * ainda não promovidos (`delitos_promovidos_em IS NULL`) e promove em lote.
 * Idempotente (o planejador deduplica). Lote default: 50.
 */
export async function backfillPromocaoDelitos(
  opts: BackfillDelitoOpts = {},
): Promise<BackfillDelitoContadores> {
  const limite = opts.limite ?? 50;
  const contadores: BackfillDelitoContadores = {
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
        isNull(processos.delitosPromovidosEm),
        sql`${processos.analysisData} -> 'imputacoes' IS NOT NULL`,
        ...(wsFilter ? [wsFilter] : []),
      ),
    )
    .limit(limite);

  for (const r of rows) {
    const c = await promoverDelitosProcesso(r.processoId);
    contadores.processos += 1;
    contadores.vinculadas += c.vinculadas;
    contadores.semCorrespondencia += c.semCorrespondencia;
    contadores.ignoradas += c.ignoradas;
  }

  return contadores;
}
