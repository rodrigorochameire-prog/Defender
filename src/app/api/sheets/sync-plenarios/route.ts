/**
 * POST /api/sheets/sync-plenarios
 *
 * Sincroniza sessões de plenário para a aba "Plenários" do Google Sheets.
 * Chamado pelo botão "Sincronizar Planilha" na página de distribuição.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessoesJuri, processos } from "@/lib/db/schema";
import { eq, gte, and, sql } from "drizzle-orm";
import { syncAllPlenarios, type PlenarioParaSync } from "@/lib/services/google-sheets";
import { getSession } from "@/lib/auth/session";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth check
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let ano: number;
  try {
    const body = await req.json();
    ano = body.ano ?? new Date().getFullYear();
  } catch {
    ano = new Date().getFullYear();
  }

  const startDate = new Date(ano, 0, 1);
  const endDate = new Date(ano + 1, 0, 1);

  const rows = await db
    .select({
      id: sessoesJuri.id,
      dataSessao: sessoesJuri.dataSessao,
      assistidoNome: sessoesJuri.assistidoNome,
      defensorNome: sessoesJuri.defensorNome,
      status: sessoesJuri.status,
      observacoes: sessoesJuri.observacoes,
      numeroAutos: processos.numeroAutos,
    })
    .from(sessoesJuri)
    .leftJoin(processos, eq(sessoesJuri.processoId, processos.id))
    .where(
      and(
        gte(sessoesJuri.dataSessao, startDate),
        sql`${sessoesJuri.dataSessao} < ${endDate}`
      )
    )
    .orderBy(sessoesJuri.dataSessao);

  const plenarios: PlenarioParaSync[] = rows.map((r) => ({
    id: r.id,
    dataSessao: r.dataSessao?.toISOString() ?? "",
    assistidoNome: r.assistidoNome ?? "",
    numeroAutos: r.numeroAutos ?? "",
    defensorNome: r.defensorNome,
    status: r.status ?? "agendada",
    observacoes: r.observacoes,
  }));

  try {
    const stats = await syncAllPlenarios(plenarios);

    if (stats.errors.length > 0) {
      console.error("[sync-plenarios] Errors:", stats.errors);
    }

    return NextResponse.json({ ok: true, synced: stats.synced, errors: stats.errors });
  } catch (err) {
    console.error("[sync-plenarios] Fatal:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
