import { NextRequest, NextResponse } from "next/server";
import { aplicarAcao, type AcaoAtendimento } from "@/lib/services/triagem";

const ACOES_VALIDAS: AcaoAtendimento[] = ["resolver", "devolver", "arquivar", "reatribuir"];

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  if (!secret) {
    return NextResponse.json({ error: "Servidor não configurado" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const atendimentoId = Number(id);
  if (!Number.isFinite(atendimentoId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => null) as
    | { acao?: string; motivo?: string; novoDefensorId?: number; decididoPorId?: number }
    | null;
  if (!body || !ACOES_VALIDAS.includes(body.acao as AcaoAtendimento)) {
    return NextResponse.json({ error: "ação inválida" }, { status: 400 });
  }

  try {
    const result = await aplicarAcao({
      atendimentoId,
      acao: body.acao as AcaoAtendimento,
      motivo: body.motivo,
      novoDefensorId: body.novoDefensorId,
      decididoPorId: body.decididoPorId,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
