/**
 * POST /api/sheets/reformat
 *
 * Re-aplica formatação em todas as abas da planilha:
 * - Congela header (linhas 1-3)
 * - Cria/recria BasicFilter cobrindo 2000+ linhas
 * - Re-aplica dropdowns de Status e Ato
 * - Re-aplica cores condicionais
 *
 * Autenticação: Bearer token (SHEETS_WEBHOOK_SECRET)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSheets, formatSheet } from "@/lib/services/google-sheets";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const sheets = await getSheets();
    const results: Array<{ title: string; ok: boolean; error?: string }> = [];

    for (const sheet of sheets) {
      try {
        await formatSheet(sheet.sheetId, sheet.title);
        results.push({ title: sheet.title, ok: true });
      } catch (err) {
        results.push({ title: sheet.title, ok: false, error: (err as Error).message });
      }
    }

    const ok = results.filter((r) => r.ok).length;
    const errors = results.filter((r) => !r.ok);

    return NextResponse.json({
      message: `Reformatadas ${ok}/${sheets.length} abas`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[Sheets Reformat] Erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
