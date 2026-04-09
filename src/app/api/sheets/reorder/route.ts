/**
 * POST /api/sheets/reorder
 *
 * Reescreve todas as abas da planilha (ou apenas uma, via ?sheet=Nome)
 * reordenando por grupo de status + ordemManual + createdAt + prazo.
 *
 * Autenticação: Bearer token (SHEETS_WEBHOOK_SECRET)
 *
 * Este endpoint é o trigger **manual**. O trigger **automático** (debounce 30s
 * após mutações de demanda) vive em `src/lib/inngest/functions.ts`
 * (`sheetsReorderDebouncedFn`).
 */

import { NextRequest, NextResponse } from "next/server";
import { reorderAllSheets } from "@/lib/services/sheets-reorder";

function getWebhookSecret(): string {
  return process.env.SHEETS_WEBHOOK_SECRET ?? "";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization") ?? "";
  const secret = getWebhookSecret();

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sheetNameFilter = url.searchParams.get("sheet") ?? undefined;

  const { totalWritten, sheets } = await reorderAllSheets(sheetNameFilter);

  return NextResponse.json({
    totalWritten,
    sheets,
    message: `Reordenação completa: ${totalWritten} linhas em ${sheets.length} abas`,
  });
}
