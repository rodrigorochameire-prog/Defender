/**
 * Orquestra notificações de encaminhamentos.
 *
 * Canais: in-app (tabela notifications) + WhatsApp (evolution-api).
 * Disparado via Inngest event "cowork/encaminhamento.criado".
 *
 * buildWhatsappMessage e buildInappPayload são puras e testáveis.
 * dispatchNotificacoes faz I/O — testada manualmente via Inngest.
 */

import { db } from "@/lib/db";
import { encaminhamentos, encaminhamentoDestinatarios } from "@/lib/db/schema/cowork";
import { users } from "@/lib/db/schema/core";
import { notifications } from "@/lib/db/schema/comunicacao";
import { eq, inArray } from "drizzle-orm";
import { sendText } from "@/lib/services/evolution-api";

export type EncaminhamentoTipo =
  | "transferir" | "encaminhar" | "acompanhar" | "anotar" | "parecer";

export interface NotifierContext {
  remetente: { id: number; name: string; phone: string | null };
  destinatario: { id: number; name: string; phone: string | null };
  tipo: EncaminhamentoTipo;
  titulo: string | null;
  mensagem: string;
  url: string;
}

const VERB_PER_TIPO: Record<EncaminhamentoTipo, string> = {
  transferir: "quer transferir uma demanda para você",
  encaminhar: "encaminhou uma demanda para sua ciência",
  acompanhar: "pediu para acompanhar uma demanda sua",
  anotar: "anotou algo numa demanda sua",
  parecer: "está pedindo seu parecer",
};

function previewMensagem(mensagem: string, max = 120): string {
  const clean = mensagem.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

export function buildWhatsappMessage(ctx: NotifierContext): string {
  const verb = VERB_PER_TIPO[ctx.tipo];
  const preview = ctx.titulo ? `"${ctx.titulo}"` : `"${previewMensagem(ctx.mensagem, 80)}"`;
  return (
    `🔔 *${ctx.remetente.name}* ${verb} no OMBUDS:\n` +
    `${preview}\n\n` +
    `👉 ${ctx.url}`
  );
}

export function buildInappPayload(ctx: NotifierContext) {
  const verb = VERB_PER_TIPO[ctx.tipo];
  return {
    type: "encaminhamento" as const,
    title: `${ctx.remetente.name} ${verb}`,
    message: ctx.titulo ?? previewMensagem(ctx.mensagem, 180),
    actionUrl: ctx.url,
  };
}

/**
 * Busca o encaminhamento e dispara notificações para todos os destinatários
 * segundo as preferências do encaminhamento (notificarOmbuds / notificarWhatsapp).
 * Fire-and-forget no Inngest.
 */
export async function dispatchNotificacoes(encaminhamentoId: number, appBaseUrl: string) {
  const [enc] = await db
    .select()
    .from(encaminhamentos)
    .where(eq(encaminhamentos.id, encaminhamentoId))
    .limit(1);
  if (!enc) throw new Error(`encaminhamento ${encaminhamentoId} não encontrado`);

  const destinatarios = await db
    .select()
    .from(encaminhamentoDestinatarios)
    .where(eq(encaminhamentoDestinatarios.encaminhamentoId, enc.id));

  const userIds = [enc.remetenteId, ...destinatarios.map((d) => d.userId)];
  const userRows = await db
    .select({ id: users.id, name: users.name, phone: users.phone })
    .from(users)
    .where(inArray(users.id, userIds));
  const userById = new Map(userRows.map((u) => [u.id, u]));

  const remetente = userById.get(enc.remetenteId);
  if (!remetente) return;

  const url = `${appBaseUrl}/admin/cowork?enc=${enc.id}`;

  for (const d of destinatarios) {
    const destUser = userById.get(d.userId);
    if (!destUser) continue;
    const ctx: NotifierContext = {
      remetente: { id: remetente.id, name: remetente.name ?? "Colega", phone: remetente.phone ?? null },
      destinatario: { id: destUser.id, name: destUser.name ?? "Colega", phone: destUser.phone ?? null },
      tipo: enc.tipo as EncaminhamentoTipo,
      titulo: enc.titulo ?? null,
      mensagem: enc.mensagem,
      url,
    };

    if (enc.notificarOmbuds) {
      const payload = buildInappPayload(ctx);
      await db.insert(notifications).values({
        userId: destUser.id,
        processoId: enc.processoId ?? null,
        demandaId: enc.demandaId ?? null,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        actionUrl: payload.actionUrl,
      }).catch((e) => console.error("[notifier] in-app falhou:", e));
    }

    if (enc.notificarWhatsapp && destUser.phone) {
      const msg = buildWhatsappMessage(ctx);
      await sendText(destUser.phone, msg).catch((e) =>
        console.error(`[notifier] whatsapp falhou para ${destUser.phone}:`, e),
      );
    }
  }
}
