import { getDb } from "./db";
import { whatsappConfig, whatsappMessages, InsertWhatsAppMessage } from "../drizzle/schema";
import { eq } from "drizzle-orm";

interface WhatsAppConfig {
  apiKey: string | null;
  phoneNumberId: string | null;
  businessAccountId: string | null;
  isActive: boolean;
}

/**
 * Get WhatsApp configuration from database
 */
export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  const db = await getDb();
  if (!db) return null;

  const configs = await db.select().from(whatsappConfig).limit(1);
  if (configs.length === 0) return null;

  return configs[0];
}

/**
 * Send text message via WhatsApp Business API
 */
export async function sendTextMessage(
  phone: string,
  message: string,
  recipientName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWhatsAppConfig();
  
  if (!config || !config.isActive || !config.apiKey || !config.phoneNumberId) {
    return { success: false, error: "WhatsApp não configurado ou inativo" };
  }

  try {
    // WhatsApp Business API endpoint
    const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          body: message,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      await logMessage({
        recipientPhone: phone,
        recipientName,
        messageContent: message,
        status: "failed",
        errorMessage: JSON.stringify(data),
      });
      return { success: false, error: data.error?.message || "Erro ao enviar mensagem" };
    }

    // Log successful message
    await logMessage({
      recipientPhone: phone,
      recipientName,
      messageContent: message,
      status: "sent",
      whatsappMessageId: data.messages[0].id,
      sentAt: new Date(),
    });

    return { success: true, messageId: data.messages[0].id };
  } catch (error: any) {
    console.error("Error sending WhatsApp message:", error);
    await logMessage({
      recipientPhone: phone,
      recipientName,
      messageContent: message,
      status: "failed",
      errorMessage: error.message,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Send media message (image, document, etc.) via WhatsApp
 */
export async function sendMediaMessage(
  phone: string,
  mediaUrl: string,
  caption?: string,
  recipientName?: string,
  mediaType: "image" | "document" = "image"
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWhatsAppConfig();
  
  if (!config || !config.isActive || !config.apiKey || !config.phoneNumberId) {
    return { success: false, error: "WhatsApp não configurado ou inativo" };
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;
    
    const body: any = {
      messaging_product: "whatsapp",
      to: phone,
      type: mediaType,
    };

    if (mediaType === "image") {
      body.image = {
        link: mediaUrl,
        caption: caption || "",
      };
    } else if (mediaType === "document") {
      body.document = {
        link: mediaUrl,
        caption: caption || "",
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      await logMessage({
        recipientPhone: phone,
        recipientName,
        messageContent: caption || "Mídia enviada",
        mediaUrl,
        status: "failed",
        errorMessage: JSON.stringify(data),
      });
      return { success: false, error: data.error?.message || "Erro ao enviar mídia" };
    }

    await logMessage({
      recipientPhone: phone,
      recipientName,
      messageContent: caption || "Mídia enviada",
      mediaUrl,
      status: "sent",
      whatsappMessageId: data.messages[0].id,
      sentAt: new Date(),
    });

    return { success: true, messageId: data.messages[0].id };
  } catch (error: any) {
    console.error("Error sending WhatsApp media:", error);
    await logMessage({
      recipientPhone: phone,
      recipientName,
      messageContent: caption || "Mídia enviada",
      mediaUrl,
      status: "failed",
      errorMessage: error.message,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Send template message via WhatsApp
 */
export async function sendTemplateMessage(
  phone: string,
  templateName: string,
  variables: string[],
  recipientName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWhatsAppConfig();
  
  if (!config || !config.isActive || !config.apiKey || !config.phoneNumberId) {
    return { success: false, error: "WhatsApp não configurado ou inativo" };
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;
    
    const components = variables.length > 0 ? [{
      type: "body",
      parameters: variables.map(v => ({ type: "text", text: v })),
    }] : [];

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "pt_BR" },
          components,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      await logMessage({
        recipientPhone: phone,
        recipientName,
        messageContent: `Template: ${templateName}`,
        status: "failed",
        errorMessage: JSON.stringify(data),
      });
      return { success: false, error: data.error?.message || "Erro ao enviar template" };
    }

    await logMessage({
      recipientPhone: phone,
      recipientName,
      messageContent: `Template: ${templateName}`,
      status: "sent",
      whatsappMessageId: data.messages[0].id,
      sentAt: new Date(),
    });

    return { success: true, messageId: data.messages[0].id };
  } catch (error: any) {
    console.error("Error sending WhatsApp template:", error);
    await logMessage({
      recipientPhone: phone,
      recipientName,
      messageContent: `Template: ${templateName}`,
      status: "failed",
      errorMessage: error.message,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Log message to database
 */
async function logMessage(data: Partial<InsertWhatsAppMessage>) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(whatsappMessages).values({
      recipientPhone: data.recipientPhone!,
      recipientName: data.recipientName,
      messageContent: data.messageContent!,
      mediaUrl: data.mediaUrl,
      status: data.status || "queued",
      whatsappMessageId: data.whatsappMessageId,
      sentAt: data.sentAt,
      errorMessage: data.errorMessage,
      templateId: data.templateId,
    });
  } catch (error) {
    console.error("Error logging WhatsApp message:", error);
  }
}

/**
 * Update message status (called by webhook)
 */
export async function updateMessageStatus(
  whatsappMessageId: string,
  status: "delivered" | "read" | "failed",
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    const updateData: any = { status };
    
    if (status === "delivered") {
      updateData.deliveredAt = new Date();
    } else if (status === "read") {
      updateData.readAt = new Date();
    } else if (status === "failed" && errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await db
      .update(whatsappMessages)
      .set(updateData)
      .where(eq(whatsappMessages.whatsappMessageId, whatsappMessageId));
  } catch (error) {
    console.error("Error updating message status:", error);
  }
}

/**
 * Send bulk messages (with rate limiting)
 */
export async function sendBulkMessages(
  recipients: Array<{ phone: string; name?: string; message: string }>,
  delayMs: number = 1000
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    const result = await sendTextMessage(recipient.phone, recipient.message, recipient.name);
    
    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${recipient.phone}: ${result.error}`);
    }

    // Rate limiting delay
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { sent, failed, errors };
}
