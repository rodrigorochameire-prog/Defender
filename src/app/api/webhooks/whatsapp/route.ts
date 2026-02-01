import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { whatsappConfig, whatsappMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Webhook para WhatsApp Business API (Meta)
 * 
 * Este endpoint lida com:
 * - Verificação do webhook (GET)
 * - Recebimento de mensagens e status (POST)
 * 
 * Configuração no Meta Business:
 * 1. URL do Callback: https://seu-dominio.com/api/webhooks/whatsapp
 * 2. Token de Verificação: definido na configuração do admin
 * 3. Campos: messages, message_template_status_update
 */

// ==========================================
// VERIFICAÇÃO DO WEBHOOK (GET)
// ==========================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Meta envia estes parâmetros para verificar o webhook
  if (mode === "subscribe" && token && challenge) {
    // Buscar configuração que tenha esse token
    const config = await db.query.whatsappConfig.findFirst({
      where: eq(whatsappConfig.webhookVerifyToken, token),
    });

    if (config) {
      // Token válido, retornar challenge
      console.log("[WhatsApp Webhook] Verificação bem-sucedida");
      return new NextResponse(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } else {
      console.log("[WhatsApp Webhook] Token de verificação inválido");
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return new NextResponse("Bad Request", { status: 400 });
}

// ==========================================
// RECEBIMENTO DE EVENTOS (POST)
// ==========================================

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string };
  document?: { id: string; filename: string; mime_type: string };
  reaction?: { message_id: string; emoji: string };
  interactive?: { type: string; button_reply?: { id: string; title: string } };
}

interface WhatsAppStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title: string; message: string }[];
}

interface WhatsAppWebhookEntry {
  id: string;
  changes: {
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: { profile: { name: string }; wa_id: string }[];
      messages?: WhatsAppMessage[];
      statuses?: WhatsAppStatus[];
    };
    field: string;
  }[];
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

export async function POST(request: NextRequest) {
  try {
    const body: WhatsAppWebhookPayload = await request.json();
    
    // Verificar se é um webhook do WhatsApp
    if (body.object !== "whatsapp_business_account") {
      return new NextResponse("OK", { status: 200 });
    }

    // Processar cada entrada
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== "messages") continue;
        
        const value = change.value;
        const phoneNumberId = value.metadata.phone_number_id;

        // Buscar configuração por phoneNumberId
        const config = await db.query.whatsappConfig.findFirst({
          where: eq(whatsappConfig.phoneNumberId, phoneNumberId),
        });

        if (!config) {
          console.log(`[WhatsApp Webhook] Configuração não encontrada para phoneNumberId: ${phoneNumberId}`);
          continue;
        }

        // Processar mensagens recebidas
        if (value.messages) {
          for (const message of value.messages) {
            await handleIncomingMessage(config.id, message, value.contacts?.[0]);
          }
        }

        // Processar atualizações de status
        if (value.statuses) {
          for (const status of value.statuses) {
            await handleStatusUpdate(config.id, status);
          }
        }
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook] Erro:", error);
    // Sempre retornar 200 para evitar retentativas do Meta
    return new NextResponse("OK", { status: 200 });
  }
}

// ==========================================
// HANDLERS
// ==========================================

async function handleIncomingMessage(
  configId: number,
  message: WhatsAppMessage,
  contact?: { profile: { name: string }; wa_id: string }
) {
  console.log(`[WhatsApp] Mensagem recebida de ${message.from}:`, message.type);

  // Salvar mensagem recebida no banco
  // Nota: Mensagens recebidas podem ser usadas para:
  // - Criar conversas bidirecionais
  // - Processar respostas automáticas
  // - Integrar com chatbot

  // Por enquanto, apenas logamos - implementar conforme necessidade
  // await db.insert(whatsappMessages).values({
  //   configId,
  //   toPhone: message.from,
  //   messageType: message.type as any,
  //   content: message.text?.body || JSON.stringify(message),
  //   messageId: message.id,
  //   status: "received",
  //   context: "incoming",
  //   createdAt: new Date(parseInt(message.timestamp) * 1000),
  // });
}

async function handleStatusUpdate(configId: number, status: WhatsAppStatus) {
  console.log(`[WhatsApp] Status atualizado: ${status.id} -> ${status.status}`);

  // Atualizar status da mensagem no banco
  try {
    const existingMessage = await db.query.whatsappMessages.findFirst({
      where: and(
        eq(whatsappMessages.configId, configId),
        eq(whatsappMessages.messageId, status.id)
      ),
    });

    if (existingMessage) {
      await db
        .update(whatsappMessages)
        .set({
          status: status.status,
          ...(status.status === "delivered" && { deliveredAt: new Date(parseInt(status.timestamp) * 1000) }),
          ...(status.status === "read" && { readAt: new Date(parseInt(status.timestamp) * 1000) }),
          ...(status.status === "failed" && { 
            errorMessage: status.errors?.[0]?.message || "Falha no envio" 
          }),
          updatedAt: new Date(),
        })
        .where(eq(whatsappMessages.id, existingMessage.id));
    }
  } catch (error) {
    console.error("[WhatsApp] Erro ao atualizar status:", error);
  }
}

// ==========================================
// CONFIGURAÇÃO DO WEBHOOK
// ==========================================

/**
 * Instruções para configurar o webhook no Meta Business:
 * 
 * 1. Acesse: https://developers.facebook.com/apps/
 * 2. Selecione seu app > WhatsApp > Configuração
 * 3. Em "Webhook", clique em "Editar"
 * 4. URL de callback: https://seu-dominio.com/api/webhooks/whatsapp
 * 5. Token de verificação: use o mesmo configurado no DefensorHub
 * 6. Campos de webhook: messages, message_template_status_update
 * 7. Clique em "Verificar e Salvar"
 * 
 * Requisitos:
 * - HTTPS obrigatório (produção)
 * - Responder em até 20 segundos
 * - Responder 200 OK para todas as notificações
 */
