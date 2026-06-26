/**
 * POST /api/cron/pje-import
 *
 * Recebe texto bruto do PJe (caixa de intimações), faz parse e importa
 * demandas diretamente no banco — sem passar pelo modal de revisão da UI.
 *
 * Chamado pelo PJe scraper no Railway (Fase 2 — SCRUM-66) ou manualmente
 * para testes colando o texto copiado do PJe.
 *
 * Autenticação: Bearer token (CRON_SECRET)
 *
 * Body:
 *   textoJuri?      — texto copiado da pasta Vara do Júri no PJe
 *   textoExecucoes? — texto copiado da pasta Execuções no PJe
 *   defensorId?     — ID do defensor (fallback: env CRON_DEFENSOR_ID)
 *
 * Response 200:
 *   { ok, juri, execucoes, totalNovas }
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { parsePJeIntimacoesCompleto } from "@/lib/pje-parser";
import { importarDemandas, type ImportRow } from "@/lib/services/pje-import";
import { intimacaoToImportRow } from "@/lib/services/pje-intimacoes-import";
import { db } from "@/lib/db";
import { processos, demandas } from "@/lib/db/schema/core";
import { processosVVD } from "@/lib/db/schema/vvd";
import { and, eq, isNull, sql } from "drizzle-orm";

// ============================================================================
// HELPERS
// ============================================================================

function resolveDefensorId(bodyId?: number): number | null {
  if (bodyId) return bodyId;
  const envId = process.env.CRON_DEFENSOR_ID;
  return envId ? parseInt(envId, 10) : null;
}

async function processarTexto(
  texto: string,
  atribuicao: string,
  defensorId: number,
): Promise<{ imported: number; updated: number; skipped: number; errors: string[] }> {
  const resultado = parsePJeIntimacoesCompleto(texto);

  if (resultado.intimacoes.length === 0) {
    return { imported: 0, updated: 0, skipped: 0, errors: [] };
  }

  const batchId = randomUUID();

  // Mesma conversão usada pela promoção staging → demandas (fonte única).
  const rows: ImportRow[] = resultado.intimacoes.map((int) =>
    intimacaoToImportRow(int, atribuicao, batchId),
  );

  return importarDemandas(rows, defensorId, false);
}

/**
 * Após o import VVD, garante que todo processo de MPU tenha entrada em
 * `processos_vvd` com `tipo_processo='MPU'` e `mpu_ativa=true` — para que vá à
 * página especializada de Medidas Protetivas com o monitoramento próprio.
 *
 * A MPU-ness vive na CLASSE (`MPUMPCrim`), gravada em
 * `demandas.enrichment_data->>'tipo_processo'` — NÃO no número dos autos (o CNJ
 * começa com dígito; a versão anterior filtrava `numeroAutos LIKE 'MPUMP%'` e
 * por isso nunca casava nada).
 *
 * Idempotente: só insere quando NÃO existe (LEFT JOIN + IS NULL); não
 * sobrescreve dados manuais já preenchidos.
 *
 * Retorna `{ created: N }` com a quantidade de novas entradas inseridas.
 */
async function syncMpuProcessosVvd(): Promise<{ created: number }> {
  const processosMpu = await db
    .selectDistinct({ id: processos.id, numero: processos.numeroAutos })
    .from(processos)
    .innerJoin(demandas, eq(demandas.processoId, processos.id))
    .leftJoin(processosVVD, eq(processosVVD.processoId, processos.id))
    .where(
      and(
        eq(processos.atribuicao, "VVD_CAMACARI"),
        isNull(processosVVD.id),
        isNull(demandas.deletedAt),
        sql`${demandas.enrichmentData}->>'tipo_processo' = 'MPUMPCrim'`,
      ),
    );

  if (processosMpu.length === 0) {
    return { created: 0 };
  }

  await db.insert(processosVVD).values(
    processosMpu.map((p) => ({
      processoId: p.id,
      numeroAutos: p.numero,
      tipoProcesso: "MPU",
      mpuAtiva: true,
    })),
  );

  return { created: processosMpu.length };
}

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Autenticação por Bearer token
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse do body
  let body: { textoJuri?: string; textoExecucoes?: string; textoVvd?: string; defensorId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 3. Resolver defensorId
  const defensorId = resolveDefensorId(body.defensorId);
  if (!defensorId) {
    return NextResponse.json(
      { error: "defensorId obrigatório — informe body.defensorId ou configure CRON_DEFENSOR_ID" },
      { status: 400 },
    );
  }

  // 4. Processar cada texto em paralelo
  const [resultadoJuri, resultadoExecucoes, resultadoVvd] = await Promise.all([
    body.textoJuri
      ? processarTexto(body.textoJuri, "Tribunal do Júri", defensorId)
      : Promise.resolve({ imported: 0, updated: 0, skipped: 0, errors: [] }),
    body.textoExecucoes
      ? processarTexto(body.textoExecucoes, "Execução Penal", defensorId)
      : Promise.resolve({ imported: 0, updated: 0, skipped: 0, errors: [] }),
    body.textoVvd
      ? processarTexto(body.textoVvd, "VVD_CAMACARI", defensorId)
      : Promise.resolve({ imported: 0, updated: 0, skipped: 0, errors: [] }),
  ]);

  const totalNovas = resultadoJuri.imported + resultadoExecucoes.imported + resultadoVvd.imported;

  // Sync MPU em processos_vvd (apenas se VVD foi importado)
  let mpuSync = { created: 0 };
  if (body.textoVvd) {
    mpuSync = await syncMpuProcessosVvd();
    console.log(`[pje-import] MPU sync: +${mpuSync.created} entradas em processos_vvd`);
  }

  console.log(
    `[pje-import] Júri: +${resultadoJuri.imported} skip=${resultadoJuri.skipped} | ` +
    `Exec: +${resultadoExecucoes.imported} skip=${resultadoExecucoes.skipped} | ` +
    `VVD: +${resultadoVvd.imported} skip=${resultadoVvd.skipped} | ` +
    `Total novas: ${totalNovas}`,
  );

  return NextResponse.json({
    ok: true,
    juri: resultadoJuri,
    execucoes: resultadoExecucoes,
    vvd: resultadoVvd,
    mpuSync,
    totalNovas,
  });
}
