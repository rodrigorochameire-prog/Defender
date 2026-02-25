import { NextRequest, NextResponse } from "next/server";
import { db, driveWebhooks, driveSyncLogs, notifications, users } from "@/lib/db";
import { driveFiles } from "@/lib/db/schema";
import { eq, or, inArray } from "drizzle-orm";
import { syncFolderWithDatabase, listDistributionPendingFiles } from "@/lib/services/google-drive";
import { SPECIAL_FOLDER_IDS } from "@/lib/utils/text-extraction";
import { inngest } from "@/lib/inngest/client";

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
 *
 * Para registrar o webhook da pasta de Distribuição:
 * - POST https://www.googleapis.com/drive/v3/files/{DISTRIBUICAO_FOLDER_ID}/watch
 * - Body: { id: "unique-channel-id", type: "web_hook", address: "https://seu-dominio.com/api/webhooks/drive" }
 */

// ID da pasta de distribuição
const DISTRIBUICAO_FOLDER_ID = SPECIAL_FOLDER_IDS.DISTRIBUICAO;

/**
 * Processa novos arquivos na pasta de distribuição
 * Cria notificações para alertar os usuários com role admin ou defensor
 */
async function processDistributionFolder() {
  try {
    const files = await listDistributionPendingFiles();

    if (files.length === 0) {
      console.log("[Drive Webhook] Nenhum arquivo pendente na distribuição");
      return;
    }

    console.log(`[Drive Webhook] ${files.length} arquivo(s) pendente(s) na distribuição`);

    // Buscar admins e defensores para notificar
    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.role, "admin"), eq(users.role, "defensor")));

    if (adminUsers.length === 0) {
      console.warn("[Drive Webhook] Nenhum admin/defensor encontrado para notificar");
      return;
    }

    const message =
      files.length === 1
        ? `Novo documento aguardando distribuição: ${files[0].name}`
        : `${files.length} documentos aguardando distribuição`;

    // Criar notificação para cada admin/defensor
    for (const user of adminUsers) {
      await db.insert(notifications).values({
        userId: user.id,
        type: "info",
        title: "📁 Documentos para Distribuição",
        message: message,
        actionUrl: "/admin/distribuicao",
        isRead: false,
      });
    }

    console.log(`[Drive Webhook] ${adminUsers.length} notificação(ões) criada(s)`);
  } catch (error) {
    console.error("[Drive Webhook] Erro ao processar pasta de distribuição:", error);
  }
}

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
    console.log(
      `[Drive Webhook] Recebido: channel=${channelId}, state=${resourceState}, message=${messageNumber}`
    );

    if (!channelId) {
      return NextResponse.json({ error: "Missing channel ID" }, { status: 400 });
    }

    // Verificar se o webhook está registrado
    const [webhook] = await db
      .select()
      .from(driveWebhooks)
      .where(eq(driveWebhooks.channelId, channelId))
      .limit(1);

    if (!webhook) {
      console.warn(`[Drive Webhook] Canal não registrado: ${channelId}`);
      return NextResponse.json({ error: "Unknown channel" }, { status: 404 });
    }

    if (!webhook.isActive) {
      console.warn(`[Drive Webhook] Canal inativo: ${channelId}`);
      return NextResponse.json({ error: "Channel inactive" }, { status: 410 });
    }

    // Log no banco
    await db.insert(driveSyncLogs).values({
      driveFileId: null,
      action: "webhook_received",
      status: "success",
      details: `State: ${resourceState}, Channel: ${channelId}, Message: ${messageNumber}`,
    });

    // Verificar se é a pasta de distribuição
    const isDistributionFolder = webhook.folderId === DISTRIBUICAO_FOLDER_ID;

    // Processar com base no estado
    switch (resourceState) {
      case "sync":
        // Mensagem de sincronização inicial - apenas confirma que está funcionando
        console.log(`[Drive Webhook] Sync inicial do canal ${channelId}`);
        break;

      case "change":
      case "add":
      case "update":
        // Mudança detectada - sincronizar pasta
        console.log(
          `[Drive Webhook] Mudança detectada, sincronizando pasta ${webhook.folderId}`
        );

        // Sincronização assíncrona → auto-link → enrich pipeline via Inngest
        syncFolderWithDatabase(webhook.folderId)
          .then(async (syncResult) => {
            if (syncResult.newFileIds.length > 0) {
              console.log(
                `[Drive Webhook] ${syncResult.newFileIds.length} novo(s) arquivo(s) → pipeline auto-link & enrich`
              );

              // Disparar pipeline completo via Inngest
              await inngest.send({
                name: "drive/auto-link-and-enrich",
                data: {
                  folderId: webhook.folderId,
                  newFileIds: syncResult.newFileIds,
                },
              });
            }
          })
          .catch((error) => {
            console.error(`[Drive Webhook] Erro na sincronização:`, error);
          });

        // Se for a pasta de distribuição, processar e notificar
        if (isDistributionFolder && (resourceState === "add" || resourceState === "change")) {
          processDistributionFolder().catch(console.error);
        }
        break;

      case "remove":
      case "trash":
        // Arquivo removido ou movido para lixeira
        console.log(`[Drive Webhook] Arquivo removido da pasta ${webhook.folderId}`);
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
    distributionFolderId: DISTRIBUICAO_FOLDER_ID,
    timestamp: new Date().toISOString(),
  });
}
