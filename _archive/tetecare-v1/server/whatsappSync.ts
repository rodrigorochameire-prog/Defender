/**
 * WhatsApp Business Sync Service
 * 
 * Sincroniza mensagens entre o chat da plataforma e WhatsApp Business API
 */

import { getDb } from "./db";
import { chatMessages, conversations, users } from "../drizzle/schema";
import { eq, and, or } from "drizzle-orm";

/**
 * Envia mensagem via WhatsApp Business API
 */
export async function sendWhatsAppMessage(params: {
  phoneNumber: string;
  message: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "document";
}) {
  const { phoneNumber, message, mediaUrl, mediaType } = params;

  // Buscar configuração do WhatsApp Business
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [config] = await db.select().from((await import("../drizzle/schema")).whatsappConfig).where(
    eq((await import("../drizzle/schema")).whatsappConfig.isActive, true)
  );

  if (!config || !config.apiKey || !config.phoneNumberId) {
    throw new Error("WhatsApp Business não configurado");
  }

  const endpoint = `https://graph.facebook.com/v17.0/${config.phoneNumberId}/messages`;

  let payload: any = {
    messaging_product: "whatsapp",
    to: phoneNumber,
  };

  if (mediaUrl && mediaType) {
    // Enviar mídia
    payload.type = mediaType;
    payload[mediaType] = {
      link: mediaUrl,
      caption: message || undefined,
    };
  } else {
    // Enviar texto
    payload.type = "text";
    payload.text = { body: message };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao enviar mensagem WhatsApp: ${error}`);
  }

  const result = await response.json();
  return result.messages[0].id; // WhatsApp message ID
}

/**
 * Processa webhook do WhatsApp Business (mensagens recebidas)
 */
export async function processWhatsAppWebhook(webhookData: any) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const entry = webhookData.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages) {
      return { success: true, message: "No messages to process" };
    }

    for (const message of value.messages) {
      const whatsappMessageId = message.id;
      const fromPhone = message.from;
      const timestamp = parseInt(message.timestamp) * 1000;

      // Verificar se mensagem já foi processada
      const [existing] = await db.select().from(chatMessages).where(
        eq(chatMessages.whatsappMessageId, whatsappMessageId)
      );

      if (existing) {
        continue; // Já processada
      }

      // Buscar usuário pelo telefone
      const [user] = await db.select().from(users).where(
        eq(users.phone, fromPhone)
      );

      if (!user) {
        console.log(`Usuário não encontrado para telefone ${fromPhone}`);
        continue;
      }

      // Buscar ou criar conversa entre tutor e admin
      const allConversations = await db.select().from(conversations);
      let conversation = allConversations.find((conv) => {
        const participants = conv.participants as number[];
        return participants.includes(user.id) && participants.includes(1); // Admin ID = 1
      });

      if (!conversation) {
        // Criar nova conversa
        const [newConv] = await db.insert(conversations).values({
          participants: [user.id, 1], // Tutor e Admin
          lastMessageAt: new Date(timestamp),
          unreadCount: 0,
        }).returning();
        conversation = { id: newConv?.id, participants: [user.id, 1] } as any;
      }

      if (!conversation) {
        console.log(`Erro ao criar/encontrar conversa para usuário ${user.id}`);
        continue;
      }

      // Extrair conteúdo da mensagem
      let content = "";
      let mediaUrl = "";
      let mediaKey = "";
      let messageType: "text" | "image" | "video" | "audio" | "document" = "text";

      if (message.type === "text") {
        content = message.text.body;
      } else if (message.type === "image") {
        messageType = "image";
        content = message.image.caption || "";
        mediaUrl = message.image.link || "";
      } else if (message.type === "video") {
        messageType = "video";
        content = message.video.caption || "";
        mediaUrl = message.video.link || "";
      } else if (message.type === "audio") {
        messageType = "audio";
        mediaUrl = message.audio.link || "";
      } else if (message.type === "document") {
        messageType = "document";
        content = message.document.filename || "";
        mediaUrl = message.document.link || "";
      }

      // Salvar mensagem no banco
      await db.insert(chatMessages).values({
        conversationId: conversation.id,
        senderId: user.id,
        content,
        mediaUrl: mediaUrl || null,
        mediaKey: mediaKey || null,
        messageType,
        source: "whatsapp",
        whatsappMessageId,
        isRead: false,
        createdAt: new Date(timestamp),
      });

      // Atualizar última mensagem da conversa
      await db
        .update(conversations)
        .set({ lastMessageAt: new Date(timestamp) })
        .where(eq(conversations.id, conversation.id));
    }

    return { success: true, message: "Messages processed" };
  } catch (error) {
    console.error("Erro ao processar webhook WhatsApp:", error);
    throw error;
  }
}

/**
 * Sincroniza mensagem da plataforma para WhatsApp
 */
export async function syncMessageToWhatsApp(messageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [message] = await db.select().from(chatMessages).where(
    eq(chatMessages.id, messageId)
  );

  if (!message || message.source === "whatsapp") {
    return; // Não sincronizar mensagens que vieram do WhatsApp
  }

  // Buscar conversa e destinatário
  const [conversation] = await db.select().from(conversations).where(
    eq(conversations.id, message.conversationId)
  );

  if (!conversation) {
    throw new Error("Conversa não encontrada");
  }

  // Determinar destinatário (o outro usuário da conversa)
  const participants = conversation.participants as number[];
  const recipientId = participants.find(id => id !== message.senderId);

  const [recipient] = await db.select().from(users).where(
    eq(users.id, recipientId!)
  );

  if (!recipient || !recipient.phone) {
    throw new Error("Destinatário sem telefone cadastrado");
  }

  // Enviar via WhatsApp
  const whatsappMessageId = await sendWhatsAppMessage({
    phoneNumber: recipient.phone,
    message: message.content || "",
    mediaUrl: message.mediaUrl || undefined,
    mediaType: message.messageType !== "text" ? message.messageType as "image" | "document" | "video" | "audio" : undefined,
  });

  // Atualizar mensagem com ID do WhatsApp
  await db
    .update(chatMessages)
    .set({ whatsappMessageId })
    .where(eq(chatMessages.id, messageId));

  return whatsappMessageId;
}
