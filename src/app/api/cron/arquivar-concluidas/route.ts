/**
 * GET /api/cron/arquivar-concluidas
 *
 * Cron diário (Vercel) que arquiva demandas concluídas há mais de
 * ARQUIVAR_APOS_DIAS dias (status CONCLUIDO / 7_PROTOCOLADO / 7_CIENCIA /
 * 7_SEM_ATUACAO, usando dataConclusao — ou updatedAt como proxy quando a
 * conclusão não foi datada).
 *
 * Efeitos:
 *  - status → ARQUIVADO (sai do Kanban; consultável em /admin/demandas/arquivo)
 *  - linha removida da planilha do Google (a planilha mantém só o ativo)
 *
 * Autenticação:
 *  - Header `Authorization: Bearer <CRON_SECRET>` (definido em env); OR
 *  - Vercel Cron (request header `x-vercel-cron`).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demandas, processos } from "@/lib/db/schema";
import { eq, and, isNull, inArray, lt, sql } from "drizzle-orm";
import { removeDemandaFromSheets } from "@/lib/services/demanda-sync";

/** Dias após a conclusão para arquivar automaticamente. */
const ARQUIVAR_APOS_DIAS = 30;

/** Status considerados concluídos — candidatos a arquivamento. */
const STATUS_ARQUIVAVEIS = [
  "CONCLUIDO",
  "7_PROTOCOLADO",
  "7_CIENCIA",
  "7_SEM_ATUACAO",
] as const;

function authorized(req: NextRequest): boolean {
  // Vercel Cron injeta esse header automaticamente
  if (req.headers.get("x-vercel-cron")) return true;
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET ?? process.env.SHEETS_WEBHOOK_SECRET;
  return expected ? auth === `Bearer ${expected}` : false;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const limite = new Date();
  limite.setDate(limite.getDate() - ARQUIVAR_APOS_DIAS);

  // Candidatas: concluídas há mais de N dias (dataConclusao, ou updatedAt
  // como proxy para demandas concluídas sem data de conclusão registrada).
  const candidatas = await db
    .select({
      id: demandas.id,
      status: demandas.status,
      atribuicao: processos.atribuicao,
      defensorId: demandas.defensorId,
    })
    .from(demandas)
    .leftJoin(processos, eq(demandas.processoId, processos.id))
    .where(
      and(
        isNull(demandas.deletedAt),
        inArray(demandas.status, [...STATUS_ARQUIVAVEIS]),
        lt(sql`COALESCE(${demandas.dataConclusao}, ${demandas.updatedAt})`, limite),
      ),
    );

  if (candidatas.length === 0) {
    return NextResponse.json({ arquivadas: 0, message: "Nada a arquivar" });
  }

  const agora = new Date();
  await db
    .update(demandas)
    .set({
      status: "ARQUIVADO",
      substatus: "arquivado",
      updatedAt: agora,
    })
    .where(inArray(demandas.id, candidatas.map((c) => c.id)));

  // Remove as linhas das planilhas — master + planilha pessoal do defensor
  // (best-effort — erros não revertem o arquivamento)
  let removidasDaPlanilha = 0;
  for (const c of candidatas) {
    if (!c.atribuicao) continue;
    try {
      await removeDemandaFromSheets(c.id, c.atribuicao, c.defensorId);
      removidasDaPlanilha++;
    } catch (err) {
      console.error(`[arquivar-concluidas] Falha ao remover demanda ${c.id} da planilha:`, err);
    }
  }

  console.log(
    `[arquivar-concluidas] ${candidatas.length} demandas arquivadas (concluídas há ${ARQUIVAR_APOS_DIAS}+ dias), ${removidasDaPlanilha} removidas da planilha`,
  );

  return NextResponse.json({
    arquivadas: candidatas.length,
    removidasDaPlanilha,
    limite: limite.toISOString(),
  });
}
