/**
 * POST /api/sheets/migrate-vvd
 *
 * Migração one-time: converte a aba "Violência Doméstic" do layout manual
 * (sem __id__) para o layout padrão sync (com __id__ na coluna A).
 *
 * Passos:
 * 1. Lê dados atuais da aba
 * 2. Insere coluna A vazia (desloca tudo 1 para a direita)
 * 3. Casa cada linha com demandas do banco pelo número de autos
 * 4. Preenche coluna A com os IDs
 * 5. Escreve headers padrão na linha 3
 * 6. Aplica formatSheet (congela, filtro, cores, dropdowns)
 *
 * Autenticação: Bearer token (SHEETS_WEBHOOK_SECRET)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demandas, processos, assistidos } from "@/lib/db/schema";
import { eq, and, isNull, ilike } from "drizzle-orm";
import {
  getSheets,
  readSheet,
  formatSheet,
} from "@/lib/services/google-sheets";

const SHEET_NAME = "Violência Doméstic";

// Layout ATUAL da VVD (antes da migração, 1-indexed):
// A=Status | B=Prisão? | C=Data | D=Assistido | E=Autos | F=Ato | G=Prazo?
const OLD_COL_STATUS    = 0; // index 0
const OLD_COL_DATA      = 2; // index 2
const OLD_COL_ASSISTIDO = 3; // index 3
const OLD_COL_AUTOS     = 4; // index 4
const OLD_COL_ATO       = 5; // index 5

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    // 1. Encontrar sheetId
    const sheets = await getSheets();
    const vvdSheet = sheets.find((s) => s.title === SHEET_NAME);
    if (!vvdSheet) {
      return NextResponse.json({ error: `Aba "${SHEET_NAME}" não encontrada` }, { status: 404 });
    }

    // 2. Ler dados atuais
    const rows = await readSheet(SHEET_NAME);
    console.log(`[VVD Migration] ${rows.length} linhas lidas`);

    // 3. Inserir coluna A (desloca tudo 1 para a direita)
    const token = await getAuthToken();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [{
          insertDimension: {
            range: {
              sheetId: vvdSheet.sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: 1,
            },
            inheritFromBefore: false,
          },
        }],
      }),
    });

    console.log("[VVD Migration] Coluna A inserida");

    // 4. Escrever headers padrão na linha 3 (coluna A agora é __id__)
    const HEADERS = [
      "__id__", "Status", "Prisão", "Data", "Assistido",
      "Autos", "Ato", "Prazo", "Providências", "Delegado Para",
    ];

    // Título na linha 1
    const titleRow = Array(HEADERS.length).fill("");
    titleRow[1] = "    Intimações - Paz em casa";

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SHEET_NAME)}!A1:J3?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [titleRow, Array(HEADERS.length).fill(""), HEADERS],
        }),
      }
    );

    console.log("[VVD Migration] Headers escritos");

    // 5. Para cada linha de dados (a partir da linha 4, que antes era linha 3+),
    //    casar pelo número de autos e preencher __id__
    const results = { matched: 0, unmatched: 0, errors: [] as string[] };
    const idUpdates: Array<{ row: number; id: number }> = [];

    // Os dados agora estão deslocados: coluna B=Status (antigo A), etc.
    // Mas como inserimos a coluna A ANTES, os dados na planilha já estão deslocados.
    // Precisamos ler novamente para ter o layout atualizado.
    // Na verdade, os índices dos dados originais (rows[]) são PRÉ-inserção.
    // Após a inserção, na planilha as colunas estão +1.
    // O que importa é que rows[] tem os dados ANTIGOS (pré-inserção).
    // Então rows[i][OLD_COL_AUTOS] ainda é o número de autos.

    for (let i = 3; i < rows.length; i++) { // rows[0]=title, [1]=separator, [2]=headers, [3+]=data
      const row = rows[i];
      if (!row) continue;

      const autos = String(row[OLD_COL_AUTOS] ?? "").trim();
      if (!autos) continue;

      try {
        // Buscar demanda pelo número de autos
        const result = await db
          .select({
            demandaId: demandas.id,
          })
          .from(demandas)
          .innerJoin(processos, eq(demandas.processoId, processos.id))
          .where(
            and(
              eq(processos.numeroAutos, autos),
              isNull(demandas.deletedAt),
            )
          )
          .limit(1);

        if (result.length > 0) {
          // Linha na planilha agora é i+1 (1-indexed)
          idUpdates.push({ row: i + 1, id: result[0].demandaId });
          results.matched++;
        } else {
          results.unmatched++;
        }
      } catch (err) {
        results.errors.push(`Linha ${i + 1} (${autos}): ${(err as Error).message}`);
      }
    }

    // 6. Escrever todos os IDs na coluna A de uma vez (batch)
    if (idUpdates.length > 0) {
      const batchData = idUpdates.map((u) => ({
        range: `${SHEET_NAME}!A${u.row}`,
        values: [[String(u.id)]],
      }));

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            valueInputOption: "RAW",
            data: batchData,
          }),
        }
      );

      console.log(`[VVD Migration] ${idUpdates.length} IDs escritos na coluna A`);
    }

    // 7. Aplicar formatação padrão (congela header, filtro, cores, dropdowns)
    await formatSheet(vvdSheet.sheetId, SHEET_NAME);
    console.log("[VVD Migration] Formatação aplicada");

    return NextResponse.json({
      ok: true,
      message: `Migração concluída: ${results.matched} casados, ${results.unmatched} sem match`,
      ...results,
    });
  } catch (err) {
    console.error("[VVD Migration] Erro:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// Helper: obter token de autenticação
async function getAuthToken(): Promise<string> {
  const { GoogleAuth } = await import("google-auth-library");
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "";
  const key = keyRaw.startsWith("{") ? JSON.parse(keyRaw) : JSON.parse(Buffer.from(keyRaw, "base64").toString());
  const auth = new GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  return tokenRes.token ?? "";
}
