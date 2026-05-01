import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { montarEscalaMes } from "@/lib/services/triagem-escala";

async function getSheetsClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY não configurado");
  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch {
    credentials = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  }
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function sincronizarEscala() {
  const spreadsheetId = process.env.TRIAGEM_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("TRIAGEM_SPREADSHEET_ID não configurado");

  const sheets = await getSheetsClient();
  const now = new Date();
  const meses = [-1, 0, 1].map(offset => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return montarEscalaMes(d.getFullYear(), d.getMonth() + 1);
  });

  const rows: (string | number)[][] = [
    ["Mês", "Júri", "EP", "VVD", "1ª Crime", "2ª Crime", "Substituições"],
    ...meses.map(m => [
      `${String(m.mes).padStart(2, "0")}/${m.ano}`,
      m.juri, m.ep, m.vvd, m.vara1Crime, m.vara2Crime,
      m.substituicoes.map(s => `${s.defensor} (${s.tipo})`).join("; ") || "—",
    ]),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Escala!A1:G",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
}

async function sincronizarPlenarios() {
  // Fase 2: ler de audiencias com tipo='plenario_juri' das próximas 60 dias
  // MVP: deixar placeholder
  const spreadsheetId = process.env.TRIAGEM_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("TRIAGEM_SPREADSHEET_ID não configurado");
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Plenários!A1:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["Data", "Réu", "Processo", "Defensor designado", "Status"],
        ["—", "—", "—", "—", "Sincronização Plenários — Fase 2"],
      ],
    },
  });
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const cronAuth = req.headers.get("x-vercel-cron") === "1";
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";

  if (!cronAuth) {
    // Not a Vercel cron call — must authenticate via Bearer token
    if (!secret) {
      return NextResponse.json({ error: "Servidor não configurado" }, { status: 500 });
    }
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");

  try {
    if (tipo === "escala") await sincronizarEscala();
    else if (tipo === "plenarios") await sincronizarPlenarios();
    else {
      await sincronizarEscala();
      await sincronizarPlenarios();
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro";
    console.error("[Triagem Cron] falhou:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
