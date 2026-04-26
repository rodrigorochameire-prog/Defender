import { NextRequest, NextResponse } from "next/server";
import { listAtendimentos } from "@/lib/services/triagem";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  if (!secret) {
    return NextResponse.json({ error: "Servidor não configurado" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const isBearerAuth = auth === `Bearer ${secret}`;

  const url = new URL(req.url);

  let workspaceId: number | null = null;

  if (isBearerAuth) {
    // Programmatic path: workspace_id may be passed as query param
    const wsParam = url.searchParams.get("workspace_id");
    workspaceId = wsParam ? Number(wsParam) : null;
  } else {
    // Browser session path
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    workspaceId = session.workspaceId ?? null;
  }

  const defensorId = url.searchParams.get("defensor_id");
  const atendimentos = await listAtendimentos({
    defensorId: defensorId ? Number(defensorId) : undefined,
    status: url.searchParams.get("status") ?? undefined,
    area: url.searchParams.get("area") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 50),
    offset: Number(url.searchParams.get("offset") ?? 0),
    workspaceId: workspaceId ?? undefined,
  });

  return NextResponse.json({ atendimentos });
}
