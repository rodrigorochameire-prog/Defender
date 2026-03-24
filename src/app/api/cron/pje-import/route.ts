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
import { parsePJeIntimacoesCompleto, intimacaoToDemanda } from "@/lib/pje-parser";
import { importarDemandas, type ImportRow } from "@/lib/services/pje-import";

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

  const rows: ImportRow[] = resultado.intimacoes.map((int) => {
    const demanda = intimacaoToDemanda(int, atribuicao);
    return {
      assistido: demanda.assistido,
      processoNumero: demanda.processos?.[0]?.numero,
      ato: demanda.ato || "Ciência",
      prazo: demanda.prazo || undefined,
      dataEntrada: demanda.data?.split("T")[0] || undefined,
      dataExpedicaoCompleta: demanda.data || undefined,
      dataInclusao: demanda.dataInclusao || undefined,
      status: demanda.status || "analisar",
      estadoPrisional: demanda.estadoPrisional || "Solto",
      atribuicao,
      importBatchId: batchId,
      ordemOriginal: int.ordemOriginal,
      tipoDocumento: int.tipoDocumento,
      crime: int.crime,
      tipoProcesso: int.tipoProcesso,
      vara: int.vara,
      idDocumentoPje: int.idDocumento,
      atribuicaoDetectada: int.atribuicaoDetectada,
    };
  });

  return importarDemandas(rows, defensorId, false);
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
  let body: { textoJuri?: string; textoExecucoes?: string; defensorId?: number };
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
  const [resultadoJuri, resultadoExecucoes] = await Promise.all([
    body.textoJuri
      ? processarTexto(body.textoJuri, "Tribunal do Júri", defensorId)
      : Promise.resolve({ imported: 0, updated: 0, skipped: 0, errors: [] }),
    body.textoExecucoes
      ? processarTexto(body.textoExecucoes, "Execução Penal", defensorId)
      : Promise.resolve({ imported: 0, updated: 0, skipped: 0, errors: [] }),
  ]);

  const totalNovas = resultadoJuri.imported + resultadoExecucoes.imported;

  console.log(
    `[pje-import] Júri: +${resultadoJuri.imported} skip=${resultadoJuri.skipped} | ` +
    `Exec: +${resultadoExecucoes.imported} skip=${resultadoExecucoes.skipped} | ` +
    `Total novas: ${totalNovas}`,
  );

  return NextResponse.json({
    ok: true,
    juri: resultadoJuri,
    execucoes: resultadoExecucoes,
    totalNovas,
  });
}
