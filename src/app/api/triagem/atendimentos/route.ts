import { NextRequest, NextResponse } from "next/server";
import { listAtendimentos } from "@/lib/services/triagem";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const defensorId = url.searchParams.get("defensor_id");
  const atendimentos = await listAtendimentos({
    defensorId: defensorId ? Number(defensorId) : undefined,
    status: url.searchParams.get("status") ?? undefined,
    area: url.searchParams.get("area") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 50),
    offset: Number(url.searchParams.get("offset") ?? 0),
  });

  return NextResponse.json({ atendimentos });
}
