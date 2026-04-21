import { NextRequest, NextResponse } from "next/server";
import { promoverAtendimento } from "@/lib/services/triagem";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const atendimentoId = Number(id);
  if (!Number.isFinite(atendimentoId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  let body: { defensorId?: number; delegarPara?: string; decididoPorId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.defensorId) {
    return NextResponse.json({ error: "defensorId é obrigatório" }, { status: 400 });
  }

  try {
    const result = await promoverAtendimento({
      atendimentoId,
      defensorId: body.defensorId,
      delegarPara: body.delegarPara,
      decididoPorId: body.decididoPorId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const status = (e as { statusCode?: number }).statusCode ?? 400;
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json({ error: msg }, { status });
  }
}
