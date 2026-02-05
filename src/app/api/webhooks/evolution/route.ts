/**
 * Webhook para Evolution API (WhatsApp)
 *
 * Recebe eventos da Evolution API e processa mensagens recebidas
 *
 * Eventos suportados:
 * - MESSAGES_UPSERT: Nova mensagem recebida/enviada
 * - MESSAGES_UPDATE: Status de mensagem atualizado
 * - CONNECTION_UPDATE: Status de conexão alterado
 * - QRCODE_UPDATED: QR Code atualizado
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  evolutionConfig,
  whatsappContacts,
  whatsappChatMessages,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  type EvolutionWebhookPayload,
  type EvolutionMessage,
  extractMessageText,
  getMessageType,
  extractMediaInfo,
  extractPhoneFromJid,
} from "@/lib/services/evolution-api";

// Tipos de evento da Evolution API
type EvolutionEvent =
  | "MESSAGES_UPSERT"
  | "MESSAGES_UPDATE"
  | "MESSAGES_DELETE"
  | "SEND_MESSAGE"
  | "CONNECTION_UPDATE"
  | "QRCODE_UPDATED"
  | "PRESENCE_UPDATE"
  | "CHATS_UPSERT"
  | "CONTACTS_UPSERT";

// Interface para payload de conexão
interface ConnectionUpdatePayload {
  instance: string;
  state: "open" | "close" | "connecting" | "refused";
  statusReason?: number;
}

// Interface para payload de QR Code
interface QRCodeUpdatePayload {
  instance: string;
  qrcode?: {
    base64?: string;
    code?: string;
  };
}

/**
 * GET - Verificação de saúde do webhook
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "evolution-webhook",
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST - Recebe eventos da Evolution API
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica secret do webhook (opcional, mas recomendado)
    const webhookSecret = request.headers.get("x-webhook-secret");
    const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET;

    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.warn("[Evolution Webhook] Invalid webhook secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as EvolutionWebhookPayload;
    const { event, instance, data } = payload;

    console.log(`[Evolution Webhook] Evento recebido: ${event} da instância: ${instance}`);

    // Busca configuração da instância no banco
    const [config] = await db
      .select()
      .from(evolutionConfig)
      .where(eq(evolutionConfig.instanceName, instance))
      .limit(1);

    if (!config) {
      console.warn(`[Evolution Webhook] Instância não encontrada: ${instance}`);
      // Retorna 200 para não causar retry da Evolution API
      return NextResponse.json({ status: "ignored", reason: "instance_not_found" });
    }

    // Processa evento com base no tipo
    switch (event as EvolutionEvent) {
      case "MESSAGES_UPSERT":
        await handleMessageUpsert(config.id, data as EvolutionMessage);
        break;

      case "MESSAGES_UPDATE":
        await handleMessageUpdate(config.id, data);
        break;

      case "CONNECTION_UPDATE":
        await handleConnectionUpdate(config.id, payload as unknown as ConnectionUpdatePayload);
        break;

      case "QRCODE_UPDATED":
        await handleQRCodeUpdate(config.id, payload as unknown as QRCodeUpdatePayload);
        break;

      case "SEND_MESSAGE":
        // Mensagem enviada pelo próprio sistema - já tratamos no MESSAGES_UPSERT
        console.log(`[Evolution Webhook] Mensagem enviada confirmada`);
        break;

      default:
        console.log(`[Evolution Webhook] Evento não tratado: ${event}`);
    }

    return NextResponse.json({ status: "ok", event });
  } catch (error) {
    console.error("[Evolution Webhook] Erro ao processar webhook:", error);
    // Retorna 200 para evitar retries infinitos
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 200 }
    );
  }
}

/**
 * Processa nova mensagem recebida
 */
async function handleMessageUpsert(configId: number, message: EvolutionMessage) {
  try {
    const remoteJid = message.key.remoteJid;
    const fromMe = message.key.fromMe;
    const messageId = message.key.id;

    // Ignora mensagens de grupos por enquanto (terminam em @g.us)
    if (remoteJid.endsWith("@g.us")) {
      console.log(`[Evolution Webhook] Mensagem de grupo ignorada: ${remoteJid}`);
      return;
    }

    // Extrai número do telefone
    const phone = extractPhoneFromJid(remoteJid);

    // Busca ou cria contato
    let [contact] = await db
      .select()
      .from(whatsappContacts)
      .where(and(eq(whatsappContacts.configId, configId), eq(whatsappContacts.phone, phone)))
      .limit(1);

    if (!contact) {
      // Cria novo contato
      const [newContact] = await db
        .insert(whatsappContacts)
        .values({
          configId,
          phone,
          pushName: message.pushName || null,
          lastMessageAt: new Date(),
          unreadCount: fromMe ? 0 : 1,
        })
        .returning();

      contact = newContact;
      console.log(`[Evolution Webhook] Novo contato criado: ${phone}`);
    } else {
      // Atualiza contato existente
      await db
        .update(whatsappContacts)
        .set({
          pushName: message.pushName || contact.pushName,
          lastMessageAt: new Date(),
          unreadCount: fromMe ? contact.unreadCount : contact.unreadCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(whatsappContacts.id, contact.id));
    }

    // Verifica se mensagem já existe (evita duplicatas)
    const [existingMessage] = await db
      .select()
      .from(whatsappChatMessages)
      .where(eq(whatsappChatMessages.waMessageId, messageId))
      .limit(1);

    if (existingMessage) {
      console.log(`[Evolution Webhook] Mensagem já existe: ${messageId}`);
      return;
    }

    // Extrai informações da mensagem
    const text = extractMessageText(message);
    const type = getMessageType(message);
    const mediaInfo = extractMediaInfo(message);

    // Salva mensagem no banco
    await db.insert(whatsappChatMessages).values({
      contactId: contact.id,
      waMessageId: messageId,
      direction: fromMe ? "outbound" : "inbound",
      type,
      content: text,
      mediaUrl: mediaInfo.url,
      mediaMimeType: mediaInfo.mimeType,
      mediaFilename: mediaInfo.filename,
      status: fromMe ? "sent" : "received",
      metadata: {
        pushName: message.pushName,
        timestamp: message.messageTimestamp,
        rawMessage: message.message,
      },
    });

    console.log(
      `[Evolution Webhook] Mensagem salva: ${type} de ${fromMe ? "mim" : phone} - "${text?.substring(0, 50) || "[mídia]"}"`
    );

    // TODO: Disparar evento para atualização em tempo real (SSE/WebSocket/Pusher)
    // TODO: Verificar se há auto-reply configurado
    // TODO: Verificar se deve processar com IA
  } catch (error) {
    console.error("[Evolution Webhook] Erro ao processar mensagem:", error);
    throw error;
  }
}

/**
 * Processa atualização de status de mensagem
 */
async function handleMessageUpdate(configId: number, data: unknown) {
  try {
    const updateData = data as {
      key: { id: string; remoteJid: string; fromMe: boolean };
      update: { status?: number };
    };

    const messageId = updateData.key?.id;
    const status = updateData.update?.status;

    if (!messageId || status === undefined) {
      return;
    }

    // Mapeia status numérico para string
    // 0 = ERROR, 1 = PENDING, 2 = SERVER_ACK, 3 = DELIVERY_ACK, 4 = READ, 5 = PLAYED
    const statusMap: Record<number, string> = {
      0: "error",
      1: "pending",
      2: "sent",
      3: "delivered",
      4: "read",
      5: "played",
    };

    const statusString = statusMap[status] || "unknown";

    // Atualiza status da mensagem
    await db
      .update(whatsappChatMessages)
      .set({ status: statusString })
      .where(eq(whatsappChatMessages.waMessageId, messageId));

    console.log(`[Evolution Webhook] Status atualizado: ${messageId} -> ${statusString}`);
  } catch (error) {
    console.error("[Evolution Webhook] Erro ao atualizar status:", error);
  }
}

/**
 * Processa atualização de conexão
 */
async function handleConnectionUpdate(configId: number, payload: ConnectionUpdatePayload) {
  try {
    const state = payload.state;

    // Mapeia estado para status do banco
    const statusMap: Record<string, string> = {
      open: "connected",
      close: "disconnected",
      connecting: "connecting",
      refused: "error",
    };

    const status = statusMap[state] || "disconnected";

    // Atualiza status da configuração
    await db
      .update(evolutionConfig)
      .set({
        status,
        isActive: state === "open",
        updatedAt: new Date(),
        ...(state === "open" ? { lastSyncAt: new Date(), qrCode: null } : {}),
      })
      .where(eq(evolutionConfig.id, configId));

    console.log(`[Evolution Webhook] Conexão atualizada: ${state} -> ${status}`);
  } catch (error) {
    console.error("[Evolution Webhook] Erro ao atualizar conexão:", error);
  }
}

/**
 * Processa atualização de QR Code
 */
async function handleQRCodeUpdate(configId: number, payload: QRCodeUpdatePayload) {
  try {
    const qrCode = payload.qrcode?.base64 || payload.qrcode?.code;

    if (!qrCode) {
      return;
    }

    // Atualiza QR Code na configuração
    await db
      .update(evolutionConfig)
      .set({
        qrCode,
        status: "waiting_qr",
        updatedAt: new Date(),
      })
      .where(eq(evolutionConfig.id, configId));

    console.log(`[Evolution Webhook] QR Code atualizado`);
  } catch (error) {
    console.error("[Evolution Webhook] Erro ao atualizar QR Code:", error);
  }
}
