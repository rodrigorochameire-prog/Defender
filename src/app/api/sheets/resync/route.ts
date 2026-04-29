/**
 * POST /api/sheets/resync
 *
 * Re-sincroniza todas as demandas ativas para a planilha Google Sheets.
 * Útil após mudanças no formato de sincronização.
 *
 * Autenticação: Bearer token (SHEETS_WEBHOOK_SECRET)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demandas, processos, assistidos, users } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { pushDemanda, type DemandaParaSync } from "@/lib/services/google-sheets";
import { buildProvidenciasCell } from "@/lib/services/registros-summary";

function getWebhookSecret(): string {
  return process.env.SHEETS_WEBHOOK_SECRET ?? "";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization") ?? "";
  const secret = getWebhookSecret();

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: demandas.id,
      status: demandas.status,
      substatus: demandas.substatus,
      reuPreso: demandas.reuPreso,
      dataEntrada: demandas.dataEntrada,
      ato: demandas.ato,
      prazo: demandas.prazo,
      defensorId: demandas.defensorId,
      assistidoNome: assistidos.nome,
      numeroAutos: processos.numeroAutos,
      atribuicao: processos.atribuicao,
      delegadoNome: users.name,
    })
    .from(demandas)
    .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
    .leftJoin(processos, eq(demandas.processoId, processos.id))
    .leftJoin(users, eq(demandas.delegadoParaId, users.id))
    .where(isNull(demandas.deletedAt));

  const lista: DemandaParaSync[] = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      status: r.status,
      substatus: r.substatus ?? null,
      reuPreso: r.reuPreso,
      dataEntrada: r.dataEntrada,
      ato: r.ato,
      prazo: r.prazo,
      providencias: await buildProvidenciasCell(r.id),
      assistidoNome: r.assistidoNome ?? "",
      numeroAutos: r.numeroAutos ?? "",
      atribuicao: r.atribuicao ?? "SUBSTITUICAO",
      delegadoNome: r.delegadoNome ?? null,
      defensorId: r.defensorId,
    })),
  );

  let pushed = 0;
  let conflicts = 0;
  for (const row of lista) {
    const result = await pushDemanda(row);
    if (result.pushed) pushed++;
    if (result.conflict) conflicts++;
  }

  return NextResponse.json({
    total: lista.length,
    pushed,
    conflicts,
    message: conflicts > 0
      ? `${conflicts} conflitos detectados — resolva em /conflitos`
      : "Sync completo",
  });
}
