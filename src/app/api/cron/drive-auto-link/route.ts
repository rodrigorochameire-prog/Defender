/**
 * GET /api/cron/drive-auto-link
 *
 * Cron diário (Vercel) que roda o `drive.smartSync` para vincular assistidos
 * recém-criados à sua pasta correspondente no Google Drive (por nome, nas
 * raízes de cada atribuição + pastas extras como VVD (MPU)). Corrige a causa
 * raiz do "Google Drive não conectado": novos assistidos nascem sem pasta e
 * passam a ser religados automaticamente, sem tocar nas rotas de criação.
 *
 * Reusa o procedure `drive.smartSync` (admin) via chamada HTTP interna ao
 * próprio deployment, com uma sessão admin assinada na hora (AUTH_SECRET).
 *
 * Autenticação:
 *  - Header `x-vercel-cron` (injetado pelo Vercel Cron); OU
 *  - `Authorization: Bearer <CRON_SECRET>`.
 */

import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron")) return true;
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET ?? process.env.SHEETS_WEBHOOK_SECRET;
  return expected ? auth === `Bearer ${expected}` : false;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "AUTH_SECRET ausente" }, { status: 500 });
  }

  // Sessão admin efêmera (usuário 1 = admin) para chamar o procedure protegido.
  const token = await new SignJWT({ userId: 1, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));

  const origin = new URL(req.url).origin;
  const res = await fetch(`${origin}/api/trpc/drive.smartSync?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `defesahub_session=${token}` },
    body: JSON.stringify({ "0": { json: { dryRun: false, createMissing: false } } }),
  });

  const txt = await res.text();
  let data: unknown = null;
  try {
    const j = JSON.parse(txt);
    data = j?.[0]?.result?.data?.json ?? j?.[0]?.error ?? j;
  } catch {
    data = txt.slice(0, 500);
  }

  if (res.status !== 200) {
    return NextResponse.json({ ok: false, status: res.status, data }, { status: 502 });
  }

  const acts = (data as { actions?: Array<{ action: string }> })?.actions ?? [];
  const links = acts.filter((a) => a.action === "link").length;
  return NextResponse.json({
    ok: true,
    vinculados: links,
    scanned: (data as { scanned?: unknown })?.scanned ?? null,
  });
}
