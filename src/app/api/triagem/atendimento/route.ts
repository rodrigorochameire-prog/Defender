import { NextRequest, NextResponse } from "next/server";
import { createAtendimento } from "@/lib/services/triagem";

const ABAS_VALIDAS = new Set(["Juri", "VVD", "EP", "Crime1", "Crime2"]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  if (!secret) {
    return NextResponse.json({ error: "Servidor não configurado" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { aba?: string; linha?: number; payload?: Record<string, unknown>; apps_script_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.aba || !ABAS_VALIDAS.has(body.aba)) {
    return NextResponse.json({ error: `aba inválida: ${body.aba}` }, { status: 400 });
  }
  if (typeof body.linha !== "number") {
    return NextResponse.json({ error: "linha é obrigatória" }, { status: 400 });
  }
  if (!body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ error: "payload é obrigatório" }, { status: 400 });
  }

  try {
    const result = await createAtendimento({
      aba: body.aba as "Juri" | "VVD" | "EP" | "Crime1" | "Crime2",
      linha: body.linha,
      payload: body.payload,
      appsScriptId: body.apps_script_id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    console.error("[Triagem] criar atendimento falhou:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
