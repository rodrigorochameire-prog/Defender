import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, conversations, chatMessages, whatsappConfig } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { processWhatsAppWebhook, syncMessageToWhatsApp } from "./whatsappSync";

describe("WhatsApp Sync Integration", () => {
  let db: any;
  let testUserId: number;
  let testConversationId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Criar usuário de teste com telefone
    const [user] = await db.insert(users).values({
      openId: `whatsapp-test-${Date.now()}`,
      name: "WhatsApp Test User",
      phone: "+5511999999999",
      role: "user",
    });
    testUserId = user.insertId;

    // Criar conversa de teste
    const [conv] = await db.insert(conversations).values({
      participants: [testUserId, 1], // Tutor e Admin
      unreadCount: 0,
    });
    testConversationId = conv.insertId;
  });

  afterAll(async () => {
    if (!db) return;

    // Limpar dados de teste
    await db.delete(chatMessages).where(eq(chatMessages.conversationId, testConversationId));
    await db.delete(conversations).where(eq(conversations.id, testConversationId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should process WhatsApp webhook and create message with source=whatsapp", async () => {
    const webhookData = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: `wamid.test${Date.now()}`,
                    from: "+5511999999999",
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: "text",
                    text: {
                      body: "Olá, esta é uma mensagem de teste do WhatsApp",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = await processWhatsAppWebhook(webhookData);
    expect(result.success).toBe(true);

    // Verificar se mensagem foi salva com source=whatsapp
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, testConversationId));

    const whatsappMessage = messages.find((m: any) => m.source === "whatsapp");
    expect(whatsappMessage).toBeDefined();
    expect(whatsappMessage?.content).toBe("Olá, esta é uma mensagem de teste do WhatsApp");
  });

  it("should not duplicate messages when webhook is received twice", async () => {
    const messageId = `wamid.duplicate${Date.now()}`;
    const webhookData = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: messageId,
                    from: "+5511999999999",
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: "text",
                    text: {
                      body: "Mensagem duplicada",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    // Processar primeira vez
    await processWhatsAppWebhook(webhookData);

    // Processar segunda vez (duplicado)
    await processWhatsAppWebhook(webhookData);

    // Verificar que existe apenas uma mensagem
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.whatsappMessageId, messageId));

    expect(messages.length).toBe(1);
  });

  it("should mark platform messages with source=platform", async () => {
    const [message] = await db.insert(chatMessages).values({
      conversationId: testConversationId,
      senderId: testUserId,
      content: "Mensagem da plataforma",
      messageType: "text",
      source: "platform",
      isRead: false,
    });

    const savedMessage = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, message.insertId));

    expect(savedMessage[0].source).toBe("platform");
  });

  it("should handle image messages from WhatsApp", async () => {
    const webhookData = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: `wamid.image${Date.now()}`,
                    from: "+5511999999999",
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: "image",
                    image: {
                      link: "https://example.com/image.jpg",
                      caption: "Foto do pet",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = await processWhatsAppWebhook(webhookData);
    expect(result.success).toBe(true);

    // Verificar se mensagem de imagem foi salva corretamente
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, testConversationId));

    const imageMessage = messages.find(
      (m: any) => m.messageType === "image" && m.source === "whatsapp"
    );
    expect(imageMessage).toBeDefined();
    expect(imageMessage?.content).toBe("Foto do pet");
    expect(imageMessage?.mediaUrl).toBe("https://example.com/image.jpg");
  });
});
