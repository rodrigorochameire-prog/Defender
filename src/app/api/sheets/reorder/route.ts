/**
 * POST /api/sheets/reorder
 *
 * Reescreve todas as abas da planilha reordenando as linhas por:
 * 1. Grupo de status (prefixo numérico do label: 1 → 7)
 * 2. ordemManual do OMBUDS (ASC NULLS LAST)
 * 3. createdAt DESC (mais recente primeiro)
 * 4. prazo ASC NULLS LAST
 *
 * Operação idempotente mas pesada — dispara sob demanda, não a cada update.
 *
 * Autenticação: Bearer token (SHEETS_WEBHOOK_SECRET)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demandas, processos, assistidos, users } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import {
  reorderSheet,
  getSheetName,
  statusParaLabel,
  type DemandaParaSync,
} from "@/lib/services/google-sheets";

function getWebhookSecret(): string {
  return process.env.SHEETS_WEBHOOK_SECRET ?? "";
}

/**
 * Extrai o prefixo numérico do label ("5 - Triagem" → 5).
 * Fallback 99 para labels desconhecidos.
 */
function labelPrefix(label: string): number {
  const m = label.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 99;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization") ?? "";
  const secret = getWebhookSecret();

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Busca todas as demandas ativas com dados de join
  const rows = await db
    .select({
      id: demandas.id,
      status: demandas.status,
      substatus: demandas.substatus,
      reuPreso: demandas.reuPreso,
      dataEntrada: demandas.dataEntrada,
      ato: demandas.ato,
      prazo: demandas.prazo,
      providencias: demandas.providencias,
      ordemManual: demandas.ordemManual,
      createdAt: demandas.createdAt,
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

  // Agrupa por sheetName (= atribuição mapeada) e já carrega metadados de sort
  type Enriched = DemandaParaSync & {
    ordemManual: number | null;
    createdAt: Date;
    prazo: string | null;
    labelPrefix: number;
  };
  const bySheet = new Map<string, Enriched[]>();

  for (const r of rows) {
    const atribuicao = r.atribuicao ?? "SUBSTITUICAO";
    const sheetName = getSheetName(atribuicao);

    const sync: DemandaParaSync = {
      id: r.id,
      status: r.status,
      substatus: r.substatus ?? null,
      reuPreso: r.reuPreso,
      dataEntrada: r.dataEntrada,
      ato: r.ato,
      prazo: r.prazo,
      providencias: r.providencias,
      assistidoNome: r.assistidoNome ?? "",
      numeroAutos: r.numeroAutos ?? "",
      atribuicao,
      delegadoNome: r.delegadoNome ?? null,
    };

    const label = statusParaLabel(r.status, r.substatus);
    const enriched: Enriched = {
      ...sync,
      ordemManual: r.ordemManual,
      createdAt: r.createdAt,
      prazo: r.prazo,
      labelPrefix: labelPrefix(label),
    };

    if (!bySheet.has(sheetName)) bySheet.set(sheetName, []);
    bySheet.get(sheetName)!.push(enriched);
  }

  // Sort key: [labelPrefix ASC, ordemManual ASC NULLS LAST, createdAt DESC, prazo ASC NULLS LAST]
  const cmp = (a: Enriched, b: Enriched): number => {
    if (a.labelPrefix !== b.labelPrefix) return a.labelPrefix - b.labelPrefix;

    const ao = a.ordemManual;
    const bo = b.ordemManual;
    if (ao !== bo) {
      if (ao === null) return 1;
      if (bo === null) return -1;
      return ao - bo;
    }

    const ac = a.createdAt.getTime();
    const bc = b.createdAt.getTime();
    if (ac !== bc) return bc - ac; // DESC

    const ap = a.prazo;
    const bp = b.prazo;
    if (ap === bp) return 0;
    if (ap === null) return 1;
    if (bp === null) return -1;
    return ap.localeCompare(bp);
  };

  // Reordena cada aba sequencialmente (evita thundering herd na Sheets API)
  const results: Array<{ sheet: string; written: number; error?: string }> = [];
  let totalWritten = 0;
  for (const [sheetName, sortedDemandas] of bySheet.entries()) {
    sortedDemandas.sort(cmp);
    try {
      const { written } = await reorderSheet(sheetName, sortedDemandas);
      results.push({ sheet: sheetName, written });
      totalWritten += written;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ sheet: sheetName, written: 0, error: msg });
    }
  }

  return NextResponse.json({
    totalWritten,
    sheets: results,
    message: `Reordenação completa: ${totalWritten} linhas em ${results.length} abas`,
  });
}
