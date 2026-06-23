/**
 * GET /api/cron/geocode-faltantes
 *
 * Cron (Vercel) que dispara a geocodificação em lote dos lugares ainda sem
 * coordenada — incluindo as residências de depoentes/assistido promovidas pelo
 * pipeline de lugares (Pessoa 360°, Fase B). Hoje a geocodificação só acontece
 * pelo botão manual no "mapa dos fatos"; este cron automatiza o backlog.
 *
 * Reusa o procedure `lugares.geocodificarFaltantes` (protegido, com throttle do
 * Nominatim e marcação de `nominatim-fail` para não re-tentar) via chamada HTTP
 * interna ao próprio deployment, com uma sessão admin assinada na hora
 * (AUTH_SECRET) — exatamente como `drive-auto-link`. NÃO duplica a lógica de
 * geocode (nenhuma edição no router de lugares).
 *
 * Autenticação:
 *  - Header `x-vercel-cron` (injetado pelo Vercel Cron); OU
 *  - `Authorization: Bearer <CRON_SECRET>`.
 */

import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

export const dynamic = "force-dynamic";
// Lote de 30 com throttle ~1.1s/req no Nominatim → bem dentro do limite.
export const maxDuration = 60;

const LOTE = 30;

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
  const res = await fetch(`${origin}/api/trpc/lugares.geocodificarFaltantes?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `defesahub_session=${token}` },
    body: JSON.stringify({ "0": { json: { limite: LOTE } } }),
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

  const d = (data ?? {}) as {
    tentados?: number;
    geocodificados?: number;
    falharam?: number;
  };
  return NextResponse.json({
    ok: true,
    tentados: d.tentados ?? 0,
    geocodificados: d.geocodificados ?? 0,
    falharam: d.falharam ?? 0,
  });
}
