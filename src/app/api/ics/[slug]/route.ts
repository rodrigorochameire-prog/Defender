/**
 * Feed iCalendar por calendário: GET /api/ics/[slug]?t=<token>
 * Token secreto por defensor (users.ics_token) — sem ele, 404 indistinto
 * (não revela se o slug existe). Assinado no Outlook via
 * "Adicionar Calendário → Assinar da web".
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { feedPorSlug } from "@/lib/ics/feeds";
import { eventosDoFeed } from "@/lib/ics/fontes";
import { serializarICS } from "@/lib/ics/serializar";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const feed = feedPorSlug(slug);
  if (!feed || token.length < 32) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [dono] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.icsToken, token))
    .limit(1);
  if (!dono) return new NextResponse("Not found", { status: 404 });

  const eventos = await eventosDoFeed(feed, dono.id);
  const ics = serializarICS({ nome: feed.nome, eventos });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${feed.slug}.ics"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
