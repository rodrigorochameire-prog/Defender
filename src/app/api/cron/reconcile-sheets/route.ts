/**
 * GET /api/cron/reconcile-sheets
 *
 * Cron diário (Vercel) que audita OMBUDS × planilha:
 *  - Divergências (status/ato/autos/assistido)
 *  - Órfãs na planilha (linha existe mas demanda não)
 *  - Faltantes na planilha (demanda ativa sem linha correspondente)
 *
 * Registra os achados em `sync_log` com a origem "BANCO".
 * Em modo `?autofix=1`, aplica correções seguras: push de faltantes + reorder.
 *
 * Autenticação:
 *  - Header `Authorization: Bearer <CRON_SECRET>` (definido em env); OR
 *  - Vercel Cron (request header `x-vercel-cron`).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demandas, assistidos, processos } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  readSheet,
  statusParaLabel,
  getSheetName,
  pushDemanda,
  type DemandaParaSync,
} from "@/lib/services/google-sheets";
import { reorderAllSheets } from "@/lib/services/sheets-reorder";
import { logSyncAction } from "@/lib/services/sync-engine";

const DATA_START = 4;
const ATRIBUICAO_TO_SHEET: Record<string, string> = {
  JURI_CAMACARI: "Júri",
  GRUPO_JURI: "Júri",
  VVD_CAMACARI: "Violência Doméstica",
  EXECUCAO_PENAL: "EP",
  SUBSTITUICAO: "Substituição criminal",
  SUBSTITUICAO_CIVEL: "Substituição criminal",
};

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

  const autofix = new URL(req.url).searchParams.get("autofix") === "1";

  // Budget: aborta cedo se já passou do limite da função (evita consumir
  // compute à toa e garantir custo previsível). maxDuration=30s no vercel.json.
  const budgetMs = 25_000;
  const t0 = Date.now();
  const overBudget = () => Date.now() - t0 > budgetMs;

  const ativas = await db
    .select({
      id: demandas.id,
      status: demandas.status,
      substatus: demandas.substatus,
      reuPreso: demandas.reuPreso,
      dataEntrada: demandas.dataEntrada,
      dataExpedicao: demandas.dataExpedicao,
      ato: demandas.ato,
      prazo: demandas.prazo,
      defensorId: demandas.defensorId,
      assistidoNome: assistidos.nome,
      numeroAutos: processos.numeroAutos,
      atribuicao: processos.atribuicao,
    })
    .from(demandas)
    .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
    .leftJoin(processos, eq(demandas.processoId, processos.id))
    .where(and(isNull(demandas.deletedAt), isNull(processos.deletedAt)));

  const byId = new Map<number, (typeof ativas)[number]>();
  for (const d of ativas) byId.set(d.id, d);

  const stats = {
    bancoAtivas: ativas.length,
    ok: 0,
    divergentes: 0,
    orfasPlanilha: 0,
    faltantesPlanilha: 0,
    pushados: 0,
    erros: [] as string[],
  };

  const idsNaPlanilha = new Set<number>();
  const abas = [...new Set(Object.values(ATRIBUICAO_TO_SHEET))];

  for (const aba of abas) {
    if (overBudget()) { stats.erros.push(`budget exceeded — aborted`); break; }
    let sheet: string[][];
    try {
      sheet = await readSheet(aba);
    } catch (err) {
      stats.erros.push(`readSheet ${aba}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    for (let i = DATA_START - 1; i < sheet.length; i++) {
      const row = sheet[i];
      if (!row || !row[0]) continue;
      const idStr = String(row[0]).trim();
      if (!idStr || isNaN(Number(idStr))) continue;
      const id = Number(idStr);
      const planilhaStatus = String(row[1] ?? "").trim();
      const planilhaAssist = String(row[4] ?? "").trim();
      const planilhaAutos = String(row[5] ?? "").trim();
      const planilhaAto = String(row[6] ?? "").trim();

      const d = byId.get(id);
      if (!d) {
        stats.orfasPlanilha++;
        await logSyncAction(id, "reconciliation", "planilha-orfa", `aba=${aba} linha=${i + 1}`, "BANCO");
        continue;
      }
      idsNaPlanilha.add(id);

      const abaEsperada = ATRIBUICAO_TO_SHEET[d.atribuicao ?? "SUBSTITUICAO"] ?? "Substituição criminal";
      if (abaEsperada !== aba) continue; // será tratada na aba correta

      const bancoStatus = statusParaLabel(d.status, d.substatus);
      const diffs: string[] = [];
      if (planilhaStatus !== bancoStatus) diffs.push(`status`);
      if (planilhaAssist !== d.assistidoNome) diffs.push(`assistido`);
      if (planilhaAutos.replace(/\s/g, "") !== (d.numeroAutos ?? "").replace(/\s/g, "")) diffs.push(`autos`);
      if (planilhaAto !== (d.ato ?? "")) diffs.push(`ato`);

      if (diffs.length > 0) {
        stats.divergentes++;
        await logSyncAction(
          id,
          "reconciliation",
          `banco="${bancoStatus}"`,
          `planilha="${planilhaStatus}" campos=${diffs.join(",")}`,
          "BANCO",
        );
      } else {
        stats.ok++;
      }
    }
  }

  // Faltantes: demandas ativas cuja linha não existe na planilha
  const faltantes: Array<(typeof ativas)[number]> = [];
  for (const d of ativas) {
    if (!idsNaPlanilha.has(d.id)) faltantes.push(d);
  }
  stats.faltantesPlanilha = faltantes.length;

  if (autofix && faltantes.length > 0) {
    for (const d of faltantes) {
      if (overBudget()) { stats.erros.push(`budget exceeded on autofix`); break; }
      const atribuicao = d.atribuicao ?? "SUBSTITUICAO";
      const sync: DemandaParaSync = {
        id: d.id,
        status: d.status,
        substatus: d.substatus ?? null,
        reuPreso: d.reuPreso,
        dataEntrada: d.dataEntrada,
        dataExpedicao: d.dataExpedicao,
        ato: d.ato,
        prazo: d.prazo,
        providencias: "",
        assistidoNome: d.assistidoNome ?? "",
        numeroAutos: d.numeroAutos ?? "",
        atribuicao,
        delegadoNome: null,
        defensorId: d.defensorId,
      };
      try {
        const r = await pushDemanda(sync);
        if (r.pushed) stats.pushados++;
      } catch (err) {
        stats.erros.push(`push id=${d.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    // Reorder de cada aba afetada
    const abasAfetadas = new Set(faltantes.map((d) => getSheetName(d.atribuicao ?? "SUBSTITUICAO")));
    for (const aba of abasAfetadas) {
      try {
        await reorderAllSheets(aba);
      } catch (err) {
        stats.erros.push(`reorder ${aba}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    autofix,
    timestamp: new Date().toISOString(),
    stats,
  });
}
