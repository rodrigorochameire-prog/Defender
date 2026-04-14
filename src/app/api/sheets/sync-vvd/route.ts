/**
 * POST /api/sheets/sync-vvd
 *
 * Sincroniza intimações VVD (ainda não promovidas a petição) para a aba
 * "Violência Doméstica" do Google Sheets. Análogo ao /api/sheets/sync-plenarios
 * para o Júri.
 *
 * Uso:
 *   - Chamado ao final de `importarIntimacoesPJe` (fire-and-forget) para
 *     garantir aparição imediata das intimações recém-importadas.
 *   - Pode ser executado manualmente para reconciliar a aba a qualquer momento.
 */

import { NextResponse } from "next/server";
import { syncVVDIntimacoesToSheet } from "@/lib/services/vvd-sync";
import { getSession } from "@/lib/auth/session";

export async function POST(): Promise<NextResponse> {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const stats = await syncVVDIntimacoesToSheet();
    if (stats.errors.length > 0) {
      console.error("[sync-vvd] Errors:", stats.errors);
    }
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    console.error("[sync-vvd] Fatal:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
