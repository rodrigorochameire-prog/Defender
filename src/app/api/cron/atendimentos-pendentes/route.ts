/**
 * GET /api/cron/atendimentos-pendentes
 *
 * Cron diário (dias úteis, fim de tarde) que avisa cada defensor sobre os
 * atendimentos que já aconteceram e seguem sem registro (a registrar). Cria
 * UMA notificação por defensor com pendência, deduplicada por dia (não repete
 * se já houve aviso do mesmo tipo no mesmo dia).
 *
 * Autenticação:
 *  - Vercel Cron (header `x-vercel-cron`); OU
 *  - `Authorization: Bearer <CRON_SECRET>`.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registros } from "@/lib/db/schema/agenda";
import { notifications } from "@/lib/db/schema/comunicacao";
import { and, eq, lt, sql } from "drizzle-orm";

const TIPO_NOTIFICACAO = "atendimentos_pendentes";

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

  // Pendentes por defensor (autor): atendimento agendado que já passou da hora.
  const porDefensor = await db
    .select({
      autorId: registros.autorId,
      total: sql<number>`count(*)::int`,
    })
    .from(registros)
    .where(
      and(
        eq(registros.tipo, "atendimento"),
        eq(registros.status, "agendado"),
        lt(registros.dataRegistro, new Date())
      )
    )
    .groupBy(registros.autorId);

  let criadas = 0;
  let pulados = 0;

  for (const { autorId, total } of porDefensor) {
    if (!autorId || total <= 0) continue;

    // Dedup diário (fuso America/Bahia) — não repete o aviso no mesmo dia.
    const [jaAvisado] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, autorId),
          eq(notifications.type, TIPO_NOTIFICACAO),
          sql`(${notifications.createdAt} AT TIME ZONE 'America/Bahia')::date = (now() AT TIME ZONE 'America/Bahia')::date`
        )
      )
      .limit(1);

    if (jaAvisado) {
      pulados++;
      continue;
    }

    await db.insert(notifications).values({
      userId: autorId,
      type: TIPO_NOTIFICACAO,
      title: `${total} atendimento${total > 1 ? "s" : ""} a registrar`,
      message:
        total > 1
          ? `Você tem ${total} atendimentos que já aconteceram e seguem sem registro.`
          : `Você tem 1 atendimento que já aconteceu e segue sem registro.`,
      actionUrl: "/admin/atendimentos?pendentes=1",
      isRead: false,
    });
    criadas++;
  }

  console.log(
    `[atendimentos-pendentes] ${criadas} notificações criadas, ${pulados} puladas (já avisado hoje)`
  );

  return NextResponse.json({ defensoresComPendencia: porDefensor.length, criadas, pulados });
}
