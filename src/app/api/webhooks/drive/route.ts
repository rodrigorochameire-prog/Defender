import { NextRequest, NextResponse } from "next/server";
import { db, driveWebhooks, driveSyncLogs } from "@/lib/db";
import { eq } from "drizzle-orm";
import { syncFolderWithDatabase } from "@/lib/services/google-drive";

/**
 * Webhook do Google Drive
 * 
 * Recebe notificações de mudanças em pastas monitoradas.
 * O Google Drive envia uma notificação quando arquivos são
 * adicionados, modificados ou removidos.
 * 
 * Configuração necessária:
 * 1. A URL do webhook deve ser HTTPS e publicamente acessível
 * 2. Registrar o webhook usando a API do Drive (watch)
 * 3. O webhook expira e precisa ser renovado periodicamente
 */

// POST - Recebe notificações do Google Drive
export async function POST(request: NextRequest) {
  try {
    // Headers enviados pelo Google Drive
    const channelId = request.headers.get("x-goog-channel-id");
    const resourceId = request.headers.get("x-goog-resource-id");
    const resourceState = request.headers.get("x-goog-resource-state");
    const messageNumber = request.headers.get("x-goog-message-number");
    const channelExpiration = request.headers.get("x-goog-channel-expiration");

    // Log da notificação
    console.log(`[Drive Webhook] Recebido: channel=${channelId}, state=${resourceState}, message=${messageNumber}`);

    if (!channelId) {
      return NextResponse.json(
        { error: "Missing channel ID" },
        { status: 400 }
      );
    }

    // Verificar se o webhook está registrado
    const [webhook] = await db
      .select()
      .from(driveWebhooks)
      .where(eq(driveWebhooks.channelId, channelId))
      .limit(1);

    if (!webhook) {
      console.warn(`[Drive Webhook] Canal não registrado: ${channelId}`);
      return NextResponse.json(
        { error: "Unknown channel" },
        { status: 404 }
      );
    }

    if (!webhook.isActive) {
      console.warn(`[Drive Webhook] Canal inativo: ${channelId}`);
      return NextResponse.json(
        { error: "Channel inactive" },
        { status: 410 }
      );
    }

    // Log no banco
    await db.insert(driveSyncLogs).values({
      driveFileId: null,
      action: "webhook_received",
      status: "success",
      details: `State: ${resourceState}, Channel: ${channelId}, Message: ${messageNumber}`,
    });

    // Processar com base no estado
    switch (resourceState) {
      case "sync":
        // Mensagem de sincronização inicial - apenas confirma que está funcionando
        console.log(`[Drive Webhook] Sync inicial do canal ${channelId}`);
        break;

      case "change":
        // Mudança detectada - sincronizar pasta
        console.log(`[Drive Webhook] Mudança detectada, sincronizando pasta ${webhook.folderId}`);
        
        // Sincronização assíncrona (não bloqueia a resposta)
        syncFolderWithDatabase(webhook.folderId).catch((error) => {
          console.error(`[Drive Webhook] Erro na sincronização:`, error);
        });
        break;

      case "add":
        // Arquivo adicionado
        console.log(`[Drive Webhook] Arquivo adicionado na pasta ${webhook.folderId}`);
        syncFolderWithDatabase(webhook.folderId).catch(console.error);
        break;

      case "remove":
      case "trash":
        // Arquivo removido ou movido para lixeira
        console.log(`[Drive Webhook] Arquivo removido da pasta ${webhook.folderId}`);
        syncFolderWithDatabase(webhook.folderId).catch(console.error);
        break;

      case "update":
        // Arquivo atualizado
        console.log(`[Drive Webhook] Arquivo atualizado na pasta ${webhook.folderId}`);
        syncFolderWithDatabase(webhook.folderId).catch(console.error);
        break;

      default:
        console.log(`[Drive Webhook] Estado desconhecido: ${resourceState}`);
    }

    // Responder rapidamente para o Google (prazo de 10 segundos)
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[Drive Webhook] Erro:", error);
    
    // Mesmo com erro, responde 200 para evitar que o Google desative o webhook
    return NextResponse.json(
      { error: "Internal error", processed: false },
      { status: 200 }
    );
  }
}

// GET - Verificação do webhook (alguns serviços fazem GET para verificar)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "active",
    service: "DefensorHub Drive Webhook",
    timestamp: new Date().toISOString(),
  });
}
