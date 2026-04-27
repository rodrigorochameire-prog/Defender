import { NextRequest, NextResponse } from "next/server";
import { montarEscalaMes } from "@/lib/services/triagem-escala";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  if (!secret) {
    return NextResponse.json({ error: "Servidor não configurado" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const ano = Number(url.searchParams.get("ano") ?? new Date().getFullYear());
  const mes = Number(url.searchParams.get("mes") ?? new Date().getMonth() + 1);

  return NextResponse.json(montarEscalaMes(ano, mes));
}
