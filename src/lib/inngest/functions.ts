/**
 * Inngest Functions - Handlers de Tarefas Assíncronas para DefensorHub
 * 
 * Cada função processa um tipo de evento com:
 * - Retentativas automáticas
 * - Backoff exponencial
 * - Logs de execução
 */

import { inngest } from "./client";
import { sendWhatsAppMessage } from "./whatsapp-helper";
import { syncFolderWithDatabase, getSyncFolders, smartSync, renewExpiringChannels, checkSyncHealth } from "@/lib/services/google-drive";
import { readSheet, getSheetName, COL, ATRIBUICAO_TO_SHEET, statusParaLabel } from "@/lib/services/google-sheets";
import { registerConflict, logSyncAction } from "@/lib/services/sync-engine";

// ============================================
// WHATSAPP FUNCTIONS
// ============================================

export const sendWhatsAppMessageFn = inngest.createFunction(
  {
    id: "send-whatsapp-message",
    name: "Send WhatsApp Message",
    retries: 5,
  },
  { event: "whatsapp/send.message" },
  async ({ event, step }) => {
    const { to, message } = event.data;
    
    const result = await step.run("send-message", async () => {
      const response = await sendWhatsAppMessage(to, message);
      
      if (!response.success) {
        throw new Error(response.error || "Failed to send message");
      }
      
      return response;
    });
    
    return { success: true, messageId: result?.messageId };
  }
);

// ============================================
// NOTIFICAÇÕES DE PRAZOS
// ============================================

export const notifyPrazoFn = inngest.createFunction(
  {
    id: "notify-prazo",
    name: "Notify Prazo",
    retries: 5,
  },
  { event: "prazo/vencimento" },
  async ({ event, step }) => {
    const { assistidoNome, assistidoTelefone, processoNumero, prazoData, ato } = event.data;
    
    if (!assistidoTelefone) {
      return { skipped: true, reason: "No phone number" };
    }
    
    await step.run("send-prazo-notification", async () => {
      const formattedDate = new Date(prazoData).toLocaleDateString("pt-BR");
      
      let message = `⚖️ *Defensoria Pública - Lembrete*\n\n`;
      message += `Olá, ${assistidoNome}!\n\n`;
      message += `📋 *Processo:* ${processoNumero}\n`;
      message += `📅 *Prazo:* ${formattedDate}\n`;
      message += `📝 *Ato:* ${ato}\n\n`;
      message += `Em caso de dúvidas, entre em contato com a Defensoria.`;
      
      await sendWhatsAppMessage(assistidoTelefone, message);
    });
    
    return { success: true };
  }
);

// ============================================
// NOTIFICAÇÕES DE AUDIÊNCIAS
// ============================================

export const notifyAudienciaFn = inngest.createFunction(
  {
    id: "notify-audiencia",
    name: "Notify Audiencia",
    retries: 5,
  },
  { event: "audiencia/agendada" },
  async ({ event, step }) => {
    const { assistidoNome, assistidoTelefone, processoNumero, dataAudiencia, local, tipo } = event.data;
    
    if (!assistidoTelefone) {
      return { skipped: true, reason: "No phone number" };
    }
    
    await step.run("send-audiencia-notification", async () => {
      const formattedDate = new Date(dataAudiencia).toLocaleDateString("pt-BR");
      const formattedTime = new Date(dataAudiencia).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      
      let message = `⚖️ *Defensoria Pública - Audiência Agendada*\n\n`;
      message += `Olá, ${assistidoNome}!\n\n`;
      message += `📋 *Processo:* ${processoNumero}\n`;
      message += `📅 *Data:* ${formattedDate} às ${formattedTime}\n`;
      message += `📍 *Local:* ${local || "A confirmar"}\n`;
      message += `🎯 *Tipo:* ${tipo}\n\n`;
      message += `*IMPORTANTE:* Compareça com 30 minutos de antecedência e traga documento com foto.`;
      
      await sendWhatsAppMessage(assistidoTelefone, message);
    });
    
    return { success: true };
  }
);

// ============================================
// NOTIFICAÇÕES DE JÚRI
// ============================================

export const notifyJuriFn = inngest.createFunction(
  {
    id: "notify-juri",
    name: "Notify Juri Session",
    retries: 5,
  },
  { event: "juri/agendado" },
  async ({ event, step }) => {
    const { assistidoNome, assistidoTelefone, processoNumero, dataSessao, sala } = event.data;
    
    if (!assistidoTelefone) {
      return { skipped: true, reason: "No phone number" };
    }
    
    await step.run("send-juri-notification", async () => {
      const formattedDate = new Date(dataSessao).toLocaleDateString("pt-BR");
      const formattedTime = new Date(dataSessao).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      
      let message = `⚖️ *Defensoria Pública - Sessão do Júri*\n\n`;
      message += `Olá, ${assistidoNome}!\n\n`;
      message += `📋 *Processo:* ${processoNumero}\n`;
      message += `📅 *Data:* ${formattedDate} às ${formattedTime}\n`;
      message += `🏛️ *Sala:* ${sala || "A confirmar"}\n\n`;
      message += `*IMPORTANTE:* Compareça com 1 hora de antecedência. Traga documento com foto. `;
      message += `Vista-se de forma adequada para o Tribunal.`;
      
      await sendWhatsAppMessage(assistidoTelefone, message);
    });
    
    return { success: true };
  }
);

// ============================================
// NOTIFICAÇÕES DE MOVIMENTAÇÃO
// ============================================

export const notifyMovimentacaoFn = inngest.createFunction(
  {
    id: "notify-movimentacao",
    name: "Notify Movimentacao Processual",
    retries: 5,
  },
  { event: "movimentacao/nova" },
  async ({ event, step }) => {
    const { assistidoNome, assistidoTelefone, processoNumero, descricao, dataMovimentacao } = event.data;
    
    if (!assistidoTelefone) {
      return { skipped: true, reason: "No phone number" };
    }
    
    await step.run("send-movimentacao-notification", async () => {
      const formattedDate = new Date(dataMovimentacao).toLocaleDateString("pt-BR");
      
      let message = `⚖️ *Defensoria Pública - Atualização Processual*\n\n`;
      message += `Olá, ${assistidoNome}!\n\n`;
      message += `📋 *Processo:* ${processoNumero}\n`;
      message += `📅 *Data:* ${formattedDate}\n`;
      message += `📝 *Movimentação:* ${descricao}\n\n`;
      message += `Em caso de dúvidas, entre em contato com a Defensoria.`;
      
      await sendWhatsAppMessage(assistidoTelefone, message);
    });
    
    return { success: true };
  }
);

// ============================================
// LEMBRETES GENÉRICOS
// ============================================

export const sendReminderFn = inngest.createFunction(
  {
    id: "send-reminder",
    name: "Send Generic Reminder",
    retries: 5,
  },
  { event: "reminder/send" },
  async ({ event, step }) => {
    const { phone, title, message: customMessage } = event.data;
    
    if (!phone) {
      return { skipped: true, reason: "No phone number" };
    }
    
    await step.run("send-reminder", async () => {
      let message = `⚖️ *Defensoria Pública - ${title}*\n\n`;
      message += customMessage;
      
      await sendWhatsAppMessage(phone, message);
    });
    
    return { success: true };
  }
);

// ============================================
// SINCRONIZAÇÃO GOOGLE DRIVE
// ============================================

/**
 * Sincronização periódica do Google Drive
 * Executa a cada 15 minutos para manter os arquivos atualizados
 */
export const syncDriveFn = inngest.createFunction(
  {
    id: "sync-google-drive",
    name: "Sync Google Drive Folders",
    retries: 3,
  },
  { cron: "*/30 * * * *" }, // A cada 30 minutos
  async ({ step }) => {
    const folders = await step.run("get-sync-folders", async () => {
      return await getSyncFolders();
    });

    if (!folders || folders.length === 0) {
      return { skipped: true, reason: "No folders configured for sync" };
    }

    const results = [];
    
    for (const folder of folders) {
      const result = await step.run(`sync-folder-${folder.id}`, async () => {
        try {
          const syncResult = await smartSync(folder.driveFolderId);
          return {
            folderId: folder.driveFolderId,
            folderName: folder.name,
            ...syncResult,
          };
        } catch (error) {
          return {
            folderId: folder.driveFolderId,
            folderName: folder.name,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      results.push(result);
    }

    return {
      success: true,
      foldersProcessed: results.length,
      results
    };
  }
);

/**
 * Sincronização manual de uma pasta específica
 * Triggered por evento customizado
 */
export const syncDriveFolderFn = inngest.createFunction(
  {
    id: "sync-drive-folder",
    name: "Sync Specific Drive Folder",
    retries: 3,
  },
  { event: "drive/sync.folder" },
  async ({ event, step }) => {
    const { folderId, userId } = event.data;
    
    if (!folderId) {
      return { success: false, error: "No folder ID provided" };
    }
    
    const result = await step.run("sync-folder", async () => {
      return await smartSync(folderId, userId);
    });
    
    return result;
  }
);

/**
 * Sincronização completa de todas as pastas (manual)
 */
export const syncAllDriveFn = inngest.createFunction(
  {
    id: "sync-all-drive",
    name: "Sync All Drive Folders",
    retries: 2,
  },
  { event: "drive/sync.all" },
  async ({ event, step }) => {
    const { userId } = event.data || {};
    
    const folders = await step.run("get-sync-folders", async () => {
      return await getSyncFolders();
    });

    if (!folders || folders.length === 0) {
      return { success: false, error: "No folders configured for sync" };
    }

    const results = [];
    
    for (const folder of folders) {
      const result = await step.run(`sync-folder-${folder.id}`, async () => {
        try {
          const syncResult = await smartSync(folder.driveFolderId, userId);
          return {
            folderId: folder.driveFolderId,
            folderName: folder.name,
            ...syncResult,
          };
        } catch (error) {
          return {
            folderId: folder.driveFolderId,
            folderName: folder.name,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      results.push(result);
    }

    return {
      success: true,
      foldersProcessed: results.length,
      results
    };
  }
);

// ============================================
// VERIFICAÇÃO DIÁRIA DE PRAZOS
// ============================================

import { db, demandas, notifications, users, assistidos, processos, driveSyncLogs, driveSyncFolders } from "@/lib/db";
import { and, eq, lte, gte, isNull, or, sql, lt } from "drizzle-orm";

/**
 * Verificação diária de prazos críticos
 * Executa às 6h da manhã para gerar notificações internas
 */
export const checkPrazosCriticosFn = inngest.createFunction(
  {
    id: "check-prazos-criticos",
    name: "Check Prazos Criticos Diario",
    retries: 3,
  },
  { cron: "0 6 * * *" }, // Todos os dias às 6h
  async ({ step }) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const em7dias = new Date(hoje);
    em7dias.setDate(em7dias.getDate() + 7);

    // Buscar demandas com prazos críticos
    const demandasCriticas = await step.run("buscar-demandas-criticas", async () => {
      return await db.query.demandas.findMany({
        where: and(
          // Prazo vencido ou nos próximos 7 dias
          lte(demandas.prazo, em7dias.toISOString().split("T")[0]),
          // Não concluídas
          sql`${demandas.status} NOT IN ('CONCLUIDO', 'ARQUIVADO', '7_PROTOCOLADO', '7_CIENCIA')`
        ),
        with: {
          assistido: true,
          processo: true,
          defensor: true,
        },
      });
    });

    if (!demandasCriticas || demandasCriticas.length === 0) {
      return { success: true, notificationsCreated: 0, message: "Nenhum prazo crítico encontrado" };
    }

    // Buscar todos os defensores para notificar
    const defensores = await step.run("buscar-defensores", async () => {
      return await db.query.users.findMany({
        where: or(
          eq(users.role, "defensor"),
          eq(users.role, "admin")
        ),
      });
    });

    const notificacoesParaCriar: {
      userId: number;
      demandaId: number;
      title: string;
      message: string;
      type: string;
      actionUrl: string;
    }[] = [];

    for (const demanda of demandasCriticas) {
      const prazoData = demanda.prazo ? new Date(demanda.prazo) : null;
      if (!prazoData) continue;

      const prazoDate = new Date(prazoData);
      prazoDate.setHours(0, 0, 0, 0);

      const diffDias = Math.ceil((prazoDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      // Determinar urgência
      let tipo: string;
      let prefixo: string;

      if (diffDias < 0) {
        tipo = "error";
        prefixo = `⚠️ VENCIDO (${Math.abs(diffDias)} dias)`;
      } else if (diffDias === 0) {
        tipo = "error";
        prefixo = "🔴 VENCE HOJE";
      } else if (diffDias === 1) {
        tipo = "warning";
        prefixo = "🟠 VENCE AMANHÃ";
      } else if (diffDias <= 3) {
        tipo = "warning";
        prefixo = `🟡 VENCE EM ${diffDias} DIAS`;
      } else {
        tipo = "info";
        prefixo = `📅 Prazo em ${diffDias} dias`;
      }

      // Adicionar alerta extra para réu preso
      if (demanda.reuPreso) {
        prefixo = `🔒 RÉU PRESO - ${prefixo}`;
        if (tipo === "info") tipo = "warning";
      }

      const title = `${prefixo}: ${demanda.ato}`;
      const message = [
        demanda.assistido?.nome ? `Assistido: ${demanda.assistido.nome}` : "",
        demanda.processo?.numeroAutos ? `Processo: ${demanda.processo.numeroAutos}` : "",
        `Prazo: ${prazoDate.toLocaleDateString("pt-BR")}`,
      ].filter(Boolean).join("\n");

      // Notificar o responsável ou todos os defensores
      const destinatarios = demanda.defensorId
        ? defensores.filter(d => d.id === demanda.defensorId)
        : defensores;

      for (const defensor of destinatarios) {
        notificacoesParaCriar.push({
          userId: defensor.id,
          demandaId: demanda.id,
          title,
          message,
          type: tipo,
          actionUrl: `/admin/demandas/${demanda.id}`,
        });
      }
    }

    // Criar notificações em batch
    if (notificacoesParaCriar.length > 0) {
      await step.run("criar-notificacoes", async () => {
        // Verificar notificações já existentes para evitar duplicatas
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        for (const notif of notificacoesParaCriar) {
          // Verificar se já existe notificação para esta demanda hoje
          const existente = await db.query.notifications.findFirst({
            where: and(
              eq(notifications.userId, notif.userId),
              eq(notifications.demandaId, notif.demandaId),
              gte(notifications.createdAt, hoje)
            ),
          });

          if (!existente) {
            await db.insert(notifications).values({
              userId: notif.userId,
              demandaId: notif.demandaId,
              title: notif.title,
              message: notif.message,
              type: notif.type,
              actionUrl: notif.actionUrl,
              isRead: false,
            });
          }
        }
      });
    }

    return {
      success: true,
      demandasVerificadas: demandasCriticas.length,
      notificationsCreated: notificacoesParaCriar.length,
    };
  }
);

/**
 * Verificação manual de prazos (trigger por evento)
 */
export const checkPrazosManualFn = inngest.createFunction(
  {
    id: "check-prazos-manual",
    name: "Check Prazos Manual",
    retries: 2,
  },
  { event: "prazos/check" },
  async ({ event, step }) => {
    const { userId } = event.data || {};

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const em7dias = new Date(hoje);
    em7dias.setDate(em7dias.getDate() + 7);

    // Buscar demandas críticas
    const demandasCriticas = await step.run("buscar-demandas", async () => {
      const whereClause = userId
        ? and(
            lte(demandas.prazo, em7dias.toISOString().split("T")[0]),
            sql`${demandas.status} NOT IN ('CONCLUIDO', 'ARQUIVADO', '7_PROTOCOLADO', '7_CIENCIA')`,
            eq(demandas.defensorId, userId)
          )
        : and(
            lte(demandas.prazo, em7dias.toISOString().split("T")[0]),
            sql`${demandas.status} NOT IN ('CONCLUIDO', 'ARQUIVADO', '7_PROTOCOLADO', '7_CIENCIA')`
          );

      return await db.query.demandas.findMany({
        where: whereClause,
        with: {
          assistido: true,
          processo: true,
        },
        orderBy: (d, { asc }) => [asc(d.prazo)],
      });
    });

    // Categorizar
    const vencidos = demandasCriticas.filter(d => {
      const prazo = d.prazo ? new Date(d.prazo) : null;
      return prazo && new Date(prazo) < hoje;
    });

    const venceHoje = demandasCriticas.filter(d => {
      const prazo = d.prazo ? new Date(d.prazo) : null;
      if (!prazo) return false;
      const prazoDate = new Date(prazo);
      prazoDate.setHours(0, 0, 0, 0);
      return prazoDate.getTime() === hoje.getTime();
    });

    const proximosDias = demandasCriticas.filter(d => {
      const prazo = d.prazo ? new Date(d.prazo) : null;
      if (!prazo) return false;
      const prazoDate = new Date(prazo);
      prazoDate.setHours(0, 0, 0, 0);
      return prazoDate > hoje && prazoDate <= em7dias;
    });

    const reuPresoVencido = vencidos.filter(d => d.reuPreso).length;

    return {
      success: true,
      resumo: {
        total: demandasCriticas.length,
        vencidos: vencidos.length,
        venceHoje: venceHoje.length,
        proximosDias: proximosDias.length,
        reuPresoVencido,
      },
      detalhes: demandasCriticas.map(d => ({
        id: d.id,
        ato: d.ato,
        assistido: d.assistido?.nome,
        prazo: d.prazo,
        reuPreso: d.reuPreso,
      })),
    };
  }
);

// ============================================
// DISTRIBUIÇÃO AUTOMÁTICA DE DOCUMENTOS
// ============================================

import { listDistributionPendingFiles } from "@/lib/services/google-drive";
import { SPECIAL_FOLDER_IDS } from "@/lib/utils/text-extraction";

/**
 * Verificação periódica da pasta de distribuição
 * Executa a cada 5 minutos para detectar novos arquivos
 */
export const checkDistributionFolderFn = inngest.createFunction(
  {
    id: "check-distribution-folder",
    name: "Check Distribution Folder",
    retries: 3,
  },
  { cron: "*/15 * * * *" }, // A cada 15 minutos
  async ({ step }) => {
    const files = await step.run("list-pending-files", async () => {
      return await listDistributionPendingFiles();
    });

    if (!files || files.length === 0) {
      return { success: true, pendingFiles: 0 };
    }

    // Criar notificação se houver arquivos pendentes
    await step.run("create-notification", async () => {
      // Verificar se já existe notificação recente (últimos 30 minutos)
      const trintaMinutosAtras = new Date();
      trintaMinutosAtras.setMinutes(trintaMinutosAtras.getMinutes() - 30);

      const existente = await db.query.notifications.findFirst({
        where: and(
          eq(notifications.title, "📁 Documentos para Distribuição"),
          gte(notifications.createdAt, trintaMinutosAtras)
        ),
      });

      if (!existente) {
        // Buscar admins e defensores
        const adminUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(or(eq(users.role, "admin"), eq(users.role, "defensor")));

        if (adminUsers.length === 0) return;

        const message =
          files.length === 1
            ? `Novo documento aguardando distribuição: ${files[0].name}`
            : `${files.length} documentos aguardando distribuição`;

        // Criar notificação para cada admin/defensor
        for (const user of adminUsers) {
          await db.insert(notifications).values({
            userId: user.id,
            title: "📁 Documentos para Distribuição",
            message: message,
            type: "info",
            actionUrl: "/admin/distribuicao",
            isRead: false,
          });
        }
      }
    });

    return {
      success: true,
      pendingFiles: files.length,
      fileNames: files.map((f) => f.name),
    };
  }
);

/**
 * Processar distribuição automática de um arquivo
 * Triggered quando arquivo é adicionado via webhook
 */
export const processDistributionFileFn = inngest.createFunction(
  {
    id: "process-distribution-file",
    name: "Process Distribution File",
    retries: 3,
  },
  { event: "distribution/process.file" },
  async ({ event, step }) => {
    const { fileId, fileName } = event.data;

    if (!fileId) {
      return { success: false, error: "No file ID provided" };
    }

    // Por enquanto, apenas cria notificação
    // A extração automática pode ser implementada aqui
    await step.run("create-notification", async () => {
      // Buscar admins e defensores
      const adminUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(or(eq(users.role, "admin"), eq(users.role, "defensor")));

      for (const user of adminUsers) {
        await db.insert(notifications).values({
          userId: user.id,
          title: "📄 Novo Documento Recebido",
          message: `Arquivo "${fileName}" recebido e aguardando distribuição.`,
          type: "info",
          actionUrl: "/admin/distribuicao",
          isRead: false,
        });
      }
    });

    return {
      success: true,
      fileId,
      fileName,
      status: "pending_distribution",
    };
  }
);

// Exportar todas as funções para o handler
// ============================================
// INTELLIGENCE — SISTEMA NERVOSO DEFENSIVO
// ============================================

/**
 * Auto-enrich a document when triggered by Drive webhook or manual upload.
 * This enriches individual documents — consolidation is triggered separately.
 */
export const intelligenceEnrichDocumentFn = inngest.createFunction(
  {
    id: "intelligence-enrich-document",
    name: "Intelligence: Enrich Document",
    retries: 3,
    concurrency: [{ limit: 2 }], // Max 2 concurrent enrichments
  },
  { event: "intelligence/enrich.document" },
  async ({ event, step }) => {
    const { documentoId, assistidoId, processoId } = event.data;

    const result = await step.run("enrich-document", async () => {
      // Import dynamically to avoid circular dependencies
      const { db } = await import("@/lib/db");
      const { documentos } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");
      const { enrichmentClient } = await import("@/lib/services/enrichment-client");

      // Get document details
      const [doc] = await db
        .select({
          id: documentos.id,
          nome: documentos.titulo,
          mimeType: documentos.mimeType,
          url: documentos.fileUrl,
          enrichmentStatus: documentos.enrichmentStatus,
        })
        .from(documentos)
        .where(eq(documentos.id, documentoId))
        .limit(1);

      if (!doc) {
        return { success: false, error: "Document not found" };
      }

      // Skip if already enriched
      if (doc.enrichmentStatus === "enriched") {
        return { success: true, skipped: true, message: "Already enriched" };
      }

      // Mark as processing
      await db
        .update(documentos)
        .set({ enrichmentStatus: "processing" })
        .where(eq(documentos.id, documentoId));

      try {
        const enrichResult = await enrichmentClient.enrichDocument({
          fileUrl: doc.url || "",
          mimeType: doc.mimeType || "application/pdf",
          assistidoId: assistidoId || null,
          processoId: processoId || null,
          defensorId: "system",
        });

        // Save enrichment data
        await db
          .update(documentos)
          .set({
            enrichmentStatus: "enriched",
            enrichmentData: {
              document_type: enrichResult.document_type,
              extracted_data: enrichResult.extracted_data,
              confidence: enrichResult.confidence,
              markdown_preview: enrichResult.markdown_preview?.slice(0, 5000),
            },
            enrichedAt: new Date(),
            conteudoCompleto: enrichResult.markdown_preview || null,
          })
          .where(eq(documentos.id, documentoId));

        return {
          success: true,
          documentType: enrichResult.document_type,
          confidence: enrichResult.confidence,
        };
      } catch (error) {
        await db
          .update(documentos)
          .set({ enrichmentStatus: "failed" })
          .where(eq(documentos.id, documentoId));
        throw error; // Let Inngest retry
      }
    });

    // Trigger auto-consolidation if enrichment succeeded and we have an assistidoId
    if (result.success && !("skipped" in result && result.skipped) && assistidoId) {
      await step.run("trigger-consolidation", async () => {
        await inngest.send({
          name: "intelligence/consolidate",
          data: { assistidoId, processoId: processoId ?? undefined, userId: "system" },
        });
      });
    }

    return result;
  }
);

// ============================================
// DRIVE AUTO-LINK & ENRICH PIPELINE
// ============================================

/**
 * Após sync do Drive: auto-link por hierarquia + enrich novos arquivos
 */
export const driveAutoLinkAndEnrichFn = inngest.createFunction(
  {
    id: "drive-auto-link-and-enrich",
    name: "Drive Auto-Link & Enrich Pipeline",
    retries: 2,
    concurrency: { limit: 2 },
  },
  { event: "drive/auto-link-and-enrich" },
  async ({ event, step }) => {
    const { newFileIds } = event.data;

    if (!newFileIds || newFileIds.length === 0) {
      return { linked: 0, enrichQueued: 0 };
    }

    // Step 1: Auto-link by hierarchy
    const linkResult = await step.run("auto-link-by-hierarchy", async () => {
      const { autoLinkByHierarchy } = await import("@/lib/services/google-drive");
      return autoLinkByHierarchy(newFileIds);
    });

    // Step 2: Enqueue enrichment for non-folder files
    const enrichResult = await step.run("enqueue-enrichment", async () => {
      const { db } = await import("@/lib/db");
      const { driveFiles } = await import("@/lib/db/schema");
      const { eq, and, inArray } = await import("drizzle-orm");

      // Get files that are enrichable (not folders, supported types)
      const ENRICHABLE_TYPES = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.google-apps.document",
        "image/jpeg",
        "image/png",
        "image/tiff",
      ];

      const files = await db
        .select({
          id: driveFiles.id,
          driveFileId: driveFiles.driveFileId,
          mimeType: driveFiles.mimeType,
          webViewLink: driveFiles.webViewLink,
          assistidoId: driveFiles.assistidoId,
          processoId: driveFiles.processoId,
          fileSize: driveFiles.fileSize,
        })
        .from(driveFiles)
        .where(
          and(
            inArray(driveFiles.id, newFileIds),
            eq(driveFiles.isFolder, false),
          )
        );

      let queued = 0;
      const pdfFiles: Array<{ id: number; driveFileId: string }> = [];

      for (const file of files) {
        const isEnrichable =
          file.mimeType && ENRICHABLE_TYPES.some((t) => file.mimeType!.includes(t));
        const isTooLarge = file.fileSize && file.fileSize > 50 * 1024 * 1024; // 50MB

        if (isEnrichable && !isTooLarge) {
          await db
            .update(driveFiles)
            .set({ enrichmentStatus: "pending", updatedAt: new Date() })
            .where(eq(driveFiles.id, file.id));
          queued++;

          // Track PDFs for section extraction pipeline
          if (file.mimeType?.includes("pdf")) {
            pdfFiles.push({ id: file.id, driveFileId: file.driveFileId });
          }
        } else {
          await db
            .update(driveFiles)
            .set({
              enrichmentStatus: isTooLarge ? "skipped" : "unsupported",
              enrichmentError: isTooLarge ? "Arquivo muito grande (>50MB)" : null,
              updatedAt: new Date(),
            })
            .where(eq(driveFiles.id, file.id));
        }
      }

      return { queued, total: files.length, pdfFiles };
    });

    // Step 3: Trigger PDF extraction pipeline for PDF files
    if (enrichResult.pdfFiles && enrichResult.pdfFiles.length > 0) {
      await step.run("trigger-pdf-pipelines", async () => {
        const events = enrichResult.pdfFiles.map(
          (f: { id: number; driveFileId: string }) => ({
            name: "pdf/extract-and-classify" as const,
            data: { driveFileId: f.id, driveGoogleId: f.driveFileId },
          })
        );
        await inngest.send(events);
        return { triggered: events.length };
      });
    }

    return {
      linked: linkResult.linked,
      enrichQueued: enrichResult.queued,
      totalFiles: enrichResult.total,
      pdfPipelinesTriggered: enrichResult.pdfFiles?.length || 0,
    };
  }
);

// ============================================
// DRIVE INCREMENTAL SYNC (WEBHOOK / CRON / MANUAL)
// ============================================

/**
 * Incremental sync for a specific folder.
 * Uses smartSync (page-token based) instead of full rescan.
 * Triggers auto-link & enrich pipeline for any new files discovered.
 */
export const incrementalSyncFn = inngest.createFunction(
  {
    id: "drive-incremental-sync",
    name: "Drive Incremental Sync",
    retries: 3,
    concurrency: {
      limit: 1,
      key: "event.data.folderId",
    },
  },
  { event: "drive/incremental-sync" },
  async ({ event, step }) => {
    const { folderId, triggerSource } = event.data;

    const syncResult = await step.run("incremental-sync", async () => {
      return smartSync(folderId);
    });

    if (syncResult.newFileIds.length > 0) {
      await step.run("trigger-auto-link", async () => {
        await inngest.send({
          name: "drive/auto-link-and-enrich",
          data: {
            folderId,
            newFileIds: syncResult.newFileIds,
          },
        });
      });

      // Reverse Sync: Check if any new files are folders inside atribuição roots
      await step.run("reverse-sync-new-folders", async () => {
        const { driveFiles } = await import("@/lib/db/schema");
        const { inArray } = await import("drizzle-orm");
        const { handleNewAssistidoFolder, isAtribuicaoRootChild } = await import("@/lib/services/google-drive");

        // Query newly inserted driveFiles to find folders
        const newFiles = await db
          .select({
            id: driveFiles.id,
            driveFileId: driveFiles.driveFileId,
            name: driveFiles.name,
            isFolder: driveFiles.isFolder,
            mimeType: driveFiles.mimeType,
          })
          .from(driveFiles)
          .where(inArray(driveFiles.id, syncResult.newFileIds));

        const results = [];
        for (const file of newFiles) {
          if (!file.isFolder || !file.driveFileId) continue;

          // Fetch the file's parent from Drive API to check if it's an atribuição root
          const { getAccessToken } = await import("@/lib/services/google-drive");
          const accessToken = await getAccessToken();
          if (!accessToken) continue;

          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${file.driveFileId}?fields=parents&supportsAllDrives=true`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!res.ok) continue;

          const fileData = await res.json();
          const parentId = fileData.parents?.[0];
          if (!parentId || !isAtribuicaoRootChild(parentId)) continue;

          const result = await handleNewAssistidoFolder(
            file.driveFileId,
            file.name,
            parentId
          );
          if (result) results.push(result);
        }

        return { reverseSyncResults: results };
      });
    }

    return { folderId, triggerSource, ...syncResult };
  }
);

// ============================================
// DRIVE WEBHOOK CHANNEL RENEWAL (DAILY CRON)
// ============================================

/**
 * Renews expiring Google Drive webhook channels.
 * Runs daily at 3 AM to ensure uninterrupted push notifications.
 */
export const renewChannelsFn = inngest.createFunction(
  {
    id: "drive-renew-channels",
    name: "Renew Drive Webhook Channels",
    retries: 2,
  },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    const result = await step.run("renew-channels", async () => {
      const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000');
      return renewExpiringChannels(webhookBaseUrl);
    });
    return result;
  }
);

// ============================================
// ENRICHMENT: PROCESS FOLDER (REVERSE SYNC)
// ============================================

/**
 * Processes all files in a folder for enrichment.
 * Triggered after reverse sync creates/links an assistido.
 * Delay of 5 minutes to allow time for additional uploads.
 */
export const enrichmentProcessFolderFn = inngest.createFunction(
  {
    id: "enrichment-process-folder",
    name: "Enrichment Process Folder",
    retries: 2,
    concurrency: { limit: 5 },
  },
  { event: "enrichment/process-folder" },
  async ({ event, step }) => {
    const { assistidoId, driveFolderId } = event.data;

    // Step 1: Wait 5 minutes to let additional uploads settle
    await step.sleep("wait-for-uploads", "5m");

    // Step 2: List all files in the folder
    const files = await step.run("list-folder-files", async () => {
      const { listAllItemsInFolder } = await import("@/lib/services/google-drive");
      return listAllItemsInFolder(driveFolderId);
    });

    if (!files || files.length === 0) {
      return { assistidoId, processed: 0, skipped: 0, queued: 0 };
    }

    // Step 3: Check which files already have enrichment
    const enrichResult = await step.run("enqueue-enrichment-jobs", async () => {
      const { driveFiles } = await import("@/lib/db/schema");
      const { eq, and, isNull: drizzleIsNull } = await import("drizzle-orm");

      // Get tracked files that haven't been enriched
      const unenrichedFiles = await db
        .select({
          id: driveFiles.id,
          driveFileId: driveFiles.driveFileId,
          mimeType: driveFiles.mimeType,
          enrichmentStatus: driveFiles.enrichmentStatus,
        })
        .from(driveFiles)
        .where(
          and(
            eq(driveFiles.driveFolderId, driveFolderId),
            eq(driveFiles.isFolder, false),
          )
        );

      const ENRICHABLE_TYPES = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "image/tiff",
      ];

      let queued = 0;
      let skipped = 0;

      for (const file of unenrichedFiles) {
        if (file.enrichmentStatus === "completed" || file.enrichmentStatus === "processing") {
          skipped++;
          continue;
        }
        if (!file.mimeType || !ENRICHABLE_TYPES.includes(file.mimeType)) {
          skipped++;
          continue;
        }
        if (file.driveFileId && file.mimeType === "application/pdf") {
          await inngest.send({
            name: "pdf/extract-and-classify",
            data: {
              driveFileId: file.id,
              driveGoogleId: file.driveFileId,
            },
          });
          queued++;
        }
      }

      return { total: unenrichedFiles.length, queued, skipped };
    });

    return { assistidoId, ...enrichResult };
  }
);

// ============================================
// DRIVE SYNC HEALTH CHECK (EVERY 30 MIN)
// ============================================

/**
 * Monitors sync health: checks staleness, channel status, error rates.
 * Logs results and notifies admins when status is critical.
 */
export const healthCheckFn = inngest.createFunction(
  {
    id: "drive-health-check",
    name: "Drive Sync Health Check",
    retries: 1,
  },
  { cron: "0 */2 * * *" }, // A cada 2 horas
  async ({ step }) => {
    const health = await step.run("check-health", async () => {
      return checkSyncHealth();
    });

    await step.run("log-health", async () => {
      await db.insert(driveSyncLogs).values({
        action: 'health_check',
        status: health.status,
        details: JSON.stringify(health),
      });
    });

    if (health.status === 'critical') {
      await step.run("notify-admins", async () => {
        const admins = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.role, 'admin'));

        for (const admin of admins) {
          await db.insert(notifications).values({
            userId: admin.id,
            type: 'system',
            title: 'Drive sync offline',
            message: `Problemas detectados: ${health.issues.join('; ')}`,
          });
        }
      });
    }

    return health;
  }
);

// ============================================
// PDF ENRICHMENT PIPELINE
// ============================================

/**
 * Pipeline completo: extrai texto → classifica seções → salva no banco.
 * Trigger: "pdf/extract-and-classify" (enviado pelo auto-link-and-enrich)
 */
export const pdfExtractAndClassifyFn = inngest.createFunction(
  {
    id: "pdf-extract-and-classify",
    name: "PDF Extract & Classify Sections",
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: "pdf/extract-and-classify" },
  async ({ event, step }) => {
    const { driveFileId, driveGoogleId } = event.data;

    // Step 1: Download PDF from Drive
    const pdfBuffer = await step.run("download-pdf", async () => {
      const { downloadFileContent } = await import("@/lib/services/google-drive");
      const content = await downloadFileContent(driveGoogleId);
      if (!content) throw new Error(`Failed to download file ${driveGoogleId}`);
      return Buffer.from(content).toString("base64");
    });

    // Step 2: Extract text from PDF (pdfjs-dist)
    const extraction = await step.run("extract-text", async () => {
      const { extractTextFromPdf } = await import("@/lib/services/pdf-extractor");
      const buffer = Buffer.from(pdfBuffer, "base64");
      return await extractTextFromPdf(buffer);
    });

    if (!extraction.success || extraction.pages.length === 0) {
      // Mark as failed
      await step.run("mark-failed-extraction", async () => {
        const { driveFiles } = await import("@/lib/db/schema");
        const { eq } = await import("drizzle-orm");
        await db
          .update(driveFiles)
          .set({
            enrichmentStatus: "failed",
            enrichmentError: extraction.error || "No text extracted",
            updatedAt: new Date(),
          })
          .where(eq(driveFiles.id, driveFileId));
      });
      return { success: false, error: extraction.error, driveFileId };
    }

    // Step: Check extraction quality — decide if Docling needed
    const needsDocling = await step.run("check-extraction-quality", async () => {
      const { detectNeedsOcr } = await import("@/lib/services/pdf-extractor");

      const needsOcr = detectNeedsOcr(extraction.pages);
      const avgCharsPerPage = extraction.pages.reduce((sum, p) => sum + p.text.length, 0) / Math.max(extraction.pages.length, 1);

      // Use Docling for: scanned PDFs, sparse text, or complex layouts
      return needsOcr || avgCharsPerPage < 200;
    });

    // Step: Extract with Docling if needed (superior quality for scanned/complex docs)
    let finalPages = extraction.pages;
    let doclingMarkdown: string | null = null;
    let needsOcr = needsDocling; // Track for later OCR marking

    if (needsDocling) {
      const doclingResult = await step.run("extract-with-docling", async () => {
        try {
          const { enrichmentClient } = await import("@/lib/services/enrichment-client");

          // Try Docling first (has built-in OCR + layout/table preservation)
          const result = await enrichmentClient.extractText({
            fileUrl: `drive://${driveGoogleId}`,
            driveFileId: driveGoogleId,
          });

          return {
            success: true,
            engine: "docling" as const,
            pages: result.pages,
            markdown: result.markdown,
            ocrApplied: result.ocr_applied,
          };
        } catch (doclingErr) {
          // Docling failed — fall back to Tesseract OCR
          console.warn("Docling extraction failed, falling back to Tesseract:", doclingErr);

          try {
            const { enrichmentClient } = await import("@/lib/services/enrichment-client");
            const ocrResult = await enrichmentClient.ocr({
              fileUrl: `drive://${driveGoogleId}`,
              driveFileId: driveGoogleId,
            });

            return {
              success: true,
              engine: "tesseract" as const,
              pages: ocrResult.pages.map(p => ({
                page_number: p.page_number,
                text: p.text,
                char_count: p.text.length,
                quality: p.text.length > 100 ? "good" : p.text.length >= 10 ? "low" : "failed",
              })),
              markdown: null,
              ocrApplied: true,
            };
          } catch (ocrErr) {
            console.error("Both Docling and OCR failed:", ocrErr);
            return { success: false, engine: "none" as const, pages: [], markdown: null, ocrApplied: false };
          }
        }
      });

      if (doclingResult.success && doclingResult.pages.length > 0) {
        finalPages = doclingResult.pages.filter(Boolean).map((p: any) => ({
          pageNumber: p.page_number,
          text: p.text || "",
          lineCount: (p.text || "").split("\n").length,
        }));
        doclingMarkdown = doclingResult.markdown;
      }
      // If both failed, finalPages stays as original pdfjs extraction
    }

    // Step 3: Mark as processing
    await step.run("mark-processing", async () => {
      const { driveFiles } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");
      await db
        .update(driveFiles)
        .set({ enrichmentStatus: "processing", updatedAt: new Date() })
        .where(eq(driveFiles.id, driveFileId));
    });

    // Step 4: Classify sections with Gemini (in chunks of 20 pages)
    const classification = await step.run("classify-sections", async () => {
      const { chunkPages } = await import("@/lib/services/pdf-extractor");
      const { classifyFullDocument, isClassifierConfigured } = await import(
        "@/lib/services/pdf-classifier"
      );

      if (!isClassifierConfigured()) {
        return { success: false, sections: [], error: "Gemini not configured" };
      }

      const chunks = chunkPages(finalPages);
      return await classifyFullDocument(chunks);
    });

    if (!classification.success || classification.sections.length === 0) {
      await step.run("mark-failed-classification", async () => {
        const { driveFiles } = await import("@/lib/db/schema");
        const { eq } = await import("drizzle-orm");
        await db
          .update(driveFiles)
          .set({
            enrichmentStatus: "failed",
            enrichmentError: classification.error || "No sections classified",
            updatedAt: new Date(),
          })
          .where(eq(driveFiles.id, driveFileId));
      });
      return {
        success: false,
        error: classification.error,
        driveFileId,
        pagesExtracted: extraction.totalPages,
      };
    }

    // Step 5: Store sections in database
    const stored = await step.run("store-sections", async () => {
      const { driveDocumentSections, driveFiles } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      // Delete existing sections for this file (re-processing)
      await db
        .delete(driveDocumentSections)
        .where(eq(driveDocumentSections.driveFileId, driveFileId));

      // Insert new sections
      const values = classification.sections.map((s) => ({
        driveFileId,
        tipo: s.tipo,
        titulo: s.titulo,
        paginaInicio: s.paginaInicio,
        paginaFim: s.paginaFim,
        resumo: s.resumo,
        textoExtraido: finalPages
          .filter((p) => p.pageNumber >= s.paginaInicio && p.pageNumber <= s.paginaFim)
          .map((p) => p.text)
          .join("\n\n"),
        confianca: s.confianca,
        metadata: s.metadata,
      }));

      const inserted = await db
        .insert(driveDocumentSections)
        .values(values)
        .returning({ id: driveDocumentSections.id });

      // Build enrichmentData from classified sections
      const extractedSections = classification.sections.map((s) => ({
        titulo: s.titulo,
        tipo: s.tipo,
        pagina: s.paginaInicio,
      }));

      // Extract pessoa_nome from sections metadata (first person found)
      let pessoaNome: string | undefined;
      for (const s of classification.sections) {
        if (s.metadata?.pessoas && s.metadata.pessoas.length > 0) {
          pessoaNome = s.metadata.pessoas[0].nome;
          break;
        }
        if (s.metadata?.partesmencionadas && s.metadata.partesmencionadas.length > 0) {
          pessoaNome = s.metadata.partesmencionadas[0];
          break;
        }
      }

      // Extract numero_processo from text (CNJ pattern)
      let numeroProcesso: string | undefined;
      const fullText = finalPages.map((p) => p.text).join(" ");
      const cnjMatch = fullText.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
      if (cnjMatch) {
        numeroProcesso = cnjMatch[0];
      }

      // Compute average confidence
      const avgConfidence = classification.sections.length > 0
        ? classification.sections.reduce((sum, s) => sum + s.confianca, 0) / classification.sections.length / 100
        : 0;

      // Determine sub_type from the most common section tipo
      const tipoCount: Record<string, number> = {};
      for (const s of classification.sections) {
        tipoCount[s.tipo] = (tipoCount[s.tipo] || 0) + 1;
      }
      const subType = Object.entries(tipoCount).sort((a, b) => b[1] - a[1])[0]?.[0];

      // Mark file as completed with enrichmentData
      await db
        .update(driveFiles)
        .set({
          enrichmentStatus: "completed",
          enrichmentError: null,
          enrichedAt: new Date(),
          updatedAt: new Date(),
          enrichmentData: {
            numero_processo: numeroProcesso,
            pessoa_nome: pessoaNome,
            sub_type: subType,
            extracted_sections: extractedSections,
            confidence: Math.round(avgConfidence * 100) / 100,
          } as any,
        })
        .where(eq(driveFiles.id, driveFileId));

      return { sectionsStored: inserted.length };
    });

    // Step: Auto-review sections by confidence threshold
    await step.run("auto-review-by-confidence", async () => {
      const { db } = await import("@/lib/db");
      const { driveDocumentSections } = await import("@/lib/db/schema");
      const { eq, and, gte, lt } = await import("drizzle-orm");

      // Get all newly created sections for this file
      const sections = await db
        .select({
          id: driveDocumentSections.id,
          tipo: driveDocumentSections.tipo,
          confianca: driveDocumentSections.confianca,
          textoExtraido: driveDocumentSections.textoExtraido,
        })
        .from(driveDocumentSections)
        .where(eq(driveDocumentSections.driveFileId, driveFileId));

      let autoApproved = 0;
      let flaggedReview = 0;
      const fichaEvents: Array<{ name: "section/generate-ficha"; data: { sectionId: number } }> = [];

      for (const section of sections) {
        if (section.confianca && section.confianca >= 90) {
          // High confidence → auto-approve
          await db
            .update(driveDocumentSections)
            .set({ reviewStatus: "approved", updatedAt: new Date() })
            .where(eq(driveDocumentSections.id, section.id));
          autoApproved++;

          // Queue ficha generation if section has text
          if (section.textoExtraido && section.textoExtraido.trim().length >= 20) {
            fichaEvents.push({
              name: "section/generate-ficha" as const,
              data: { sectionId: section.id },
            });
          }
        } else if (section.confianca != null && section.confianca < 50) {
          // Low confidence → flag for review
          await db
            .update(driveDocumentSections)
            .set({ reviewStatus: "needs_review", updatedAt: new Date() })
            .where(eq(driveDocumentSections.id, section.id));
          flaggedReview++;
        }
        // 50-89: stays as "pending" (default)
      }

      // Batch trigger ficha generation for auto-approved sections
      if (fichaEvents.length > 0) {
        await inngest.send(fichaEvents);
      }

      return { autoApproved, flaggedReview, fichaTriggered: fichaEvents.length };
    });

    // Step: Mark OCR status in driveFileContents
    if (needsOcr) {
      await step.run("mark-ocr-applied", async () => {
        const { driveFileContents } = await import("@/lib/db/schema");
        const { eq } = await import("drizzle-orm");

        const [existing] = await db
          .select()
          .from(driveFileContents)
          .where(eq(driveFileContents.driveFileId, driveFileId))
          .limit(1);

        if (existing) {
          await db
            .update(driveFileContents)
            .set({
              ocrApplied: true,
              contentText: doclingMarkdown || finalPages.map((p) => p.text).join("\n\n---PAGE---\n\n"),
              extractionStatus: "COMPLETED",
              extractedAt: new Date(),
            })
            .where(eq(driveFileContents.driveFileId, driveFileId));
        } else {
          await db
            .insert(driveFileContents)
            .values({
              driveFileId: driveFileId,
              extractionStatus: "COMPLETED",
              ocrApplied: true,
              contentText: doclingMarkdown || finalPages.map((p) => p.text).join("\n\n---PAGE---\n\n"),
              pageCount: finalPages.length,
              extractedAt: new Date(),
            });
        }
      });
    }

    // Step 6: Trigger bookmark insertion pipeline
    await step.run("trigger-bookmark-pipeline", async () => {
      await inngest.send({
        name: "pdf/insert-bookmarks",
        data: { driveFileId, driveGoogleId },
      });
    });

    // Step 7: Trigger auto-consolidation if file is linked to an assistido
    await step.run("trigger-consolidation", async () => {
      const { db } = await import("@/lib/db");
      const { driveFiles } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const [file] = await db
        .select({ assistidoId: driveFiles.assistidoId })
        .from(driveFiles)
        .where(eq(driveFiles.id, driveFileId))
        .limit(1);

      if (file?.assistidoId) {
        await inngest.send({
          name: "intelligence/consolidate",
          data: { assistidoId: file.assistidoId, userId: "system" },
        });
      }
    });

    return {
      success: true,
      driveFileId,
      totalPages: extraction.totalPages,
      sectionsFound: classification.sections.length,
      sectionsStored: stored.sectionsStored,
      tokensUsed: classification.tokensUsed,
    };
  }
);

// ============================================
// PDF BOOKMARK INSERTION
// ============================================

/**
 * Insere bookmarks/outline no PDF original e faz upload de volta ao Drive.
 * Trigger: "pdf/insert-bookmarks" (enviado após classificação)
 */
export const pdfInsertBookmarksFn = inngest.createFunction(
  {
    id: "pdf-insert-bookmarks",
    name: "PDF Insert Bookmarks",
    retries: 2,
    concurrency: { limit: 2 },
  },
  { event: "pdf/insert-bookmarks" },
  async ({ event, step }) => {
    const { driveFileId, driveGoogleId } = event.data;

    // Step 1: Load sections from database
    const sections = await step.run("load-sections", async () => {
      const { driveDocumentSections } = await import("@/lib/db/schema");
      const { eq, asc } = await import("drizzle-orm");
      return db
        .select({
          tipo: driveDocumentSections.tipo,
          titulo: driveDocumentSections.titulo,
          paginaInicio: driveDocumentSections.paginaInicio,
          paginaFim: driveDocumentSections.paginaFim,
          resumo: driveDocumentSections.resumo,
        })
        .from(driveDocumentSections)
        .where(eq(driveDocumentSections.driveFileId, driveFileId))
        .orderBy(asc(driveDocumentSections.paginaInicio));
    });

    if (sections.length === 0) {
      return { success: true, skipped: true, reason: "No sections to bookmark" };
    }

    // Step 2: Download PDF
    const pdfBase64 = await step.run("download-pdf", async () => {
      const { downloadFileContent } = await import("@/lib/services/google-drive");
      const content = await downloadFileContent(driveGoogleId);
      if (!content) throw new Error(`Failed to download file ${driveGoogleId}`);
      return Buffer.from(content).toString("base64");
    });

    // Step 3: Add bookmarks
    const bookmarkResult = await step.run("add-bookmarks", async () => {
      const { addBookmarksToPdf } = await import("@/lib/services/pdf-bookmarker");
      const buffer = Buffer.from(pdfBase64, "base64");
      const result = await addBookmarksToPdf(buffer, sections as any[]);
      if (!result.success) throw new Error(result.error || "Bookmark insertion failed");
      return {
        bookmarksAdded: result.bookmarksAdded,
        pdfBase64: result.pdfBuffer.toString("base64"),
      };
    });

    // Step 4: Upload modified PDF back to Drive
    const uploadResult = await step.run("upload-bookmarked-pdf", async () => {
      const { updateFileInDrive } = await import("@/lib/services/google-drive");
      const buffer = Buffer.from(bookmarkResult.pdfBase64, "base64");
      const result = await updateFileInDrive(driveGoogleId, buffer, "application/pdf");
      if (!result) throw new Error("Failed to upload bookmarked PDF to Drive");
      return { uploadedFileId: result.id };
    });

    return {
      success: true,
      driveFileId,
      bookmarksAdded: bookmarkResult.bookmarksAdded,
      uploadedFileId: uploadResult.uploadedFileId,
    };
  }
);

// ============================================
// SECTION FICHA GENERATION
// ============================================

/**
 * Gera ficha tipo-específica para seção aprovada pelo defensor.
 * Trigger: "section/generate-ficha" (enviado pelo approveSection mutation)
 *
 * Fluxo: defensor aprova seção → Inngest → enrichment-engine → fichaData salva no banco
 */
export const sectionGenerateFichaFn = inngest.createFunction(
  {
    id: "section-generate-ficha",
    name: "Generate Section Ficha",
    retries: 2,
    concurrency: { limit: 5 },
  },
  { event: "section/generate-ficha" },
  async ({ event, step }) => {
    const { sectionId, tipo } = event.data as { sectionId: number; tipo: string };

    // Step 1: Load section data from database
    const section = await step.run("load-section", async () => {
      const { db } = await import("@/lib/db");
      const { driveDocumentSections } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const [result] = await db
        .select()
        .from(driveDocumentSections)
        .where(eq(driveDocumentSections.id, sectionId))
        .limit(1);

      if (!result) throw new Error(`Section ${sectionId} not found`);
      return {
        id: result.id,
        tipo: result.tipo,
        titulo: result.titulo,
        textoExtraido: result.textoExtraido,
        resumo: result.resumo,
        fichaData: result.fichaData,
      };
    });

    // Skip if ficha already exists
    if (section.fichaData && Object.keys(section.fichaData).length > 0) {
      return { success: true, skipped: true, reason: "Ficha already exists", sectionId };
    }

    // Step 2: Check if we have text to process
    if (!section.textoExtraido || section.textoExtraido.trim().length < 20) {
      // Mark as needs_review — not enough text
      await step.run("mark-insufficient-text", async () => {
        const { db } = await import("@/lib/db");
        const { driveDocumentSections } = await import("@/lib/db/schema");
        const { eq } = await import("drizzle-orm");
        await db
          .update(driveDocumentSections)
          .set({ fichaData: { error: "Texto insuficiente para geração de ficha", confidence: 0 } })
          .where(eq(driveDocumentSections.id, sectionId));
      });
      return { success: false, error: "Insufficient text", sectionId };
    }

    // Step 3: Call enrichment-engine to generate ficha
    const fichaResult = await step.run("generate-ficha", async () => {
      const { enrichmentClient } = await import("@/lib/services/enrichment-client");
      return await enrichmentClient.generateFicha({
        sectionText: section.textoExtraido!,
        sectionTipo: tipo || section.tipo || "outro",
        sectionTitulo: section.titulo || "",
      });
    });

    // Step 4: Store ficha in database
    await step.run("store-ficha", async () => {
      const { db } = await import("@/lib/db");
      const { driveDocumentSections } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(driveDocumentSections)
        .set({
          fichaData: fichaResult.ficha_data as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(driveDocumentSections.id, sectionId));
    });

    return {
      success: true,
      sectionId,
      tipo: fichaResult.section_tipo,
      confidence: fichaResult.confidence,
      fieldsExtracted: Object.keys(fichaResult.ficha_data).length,
    };
  }
);

// ============================================
// TRANSCRIPTION (async, avoids Vercel 60s timeout)
// ============================================

/**
 * Transcreve arquivo de áudio/vídeo do Drive de forma assíncrona.
 * Disparado pelo tRPC mutation que retorna imediatamente.
 * Para arquivos >25MB usa Gemini (pode levar 5-10 min).
 */
export const transcribeDriveFileFn = inngest.createFunction(
  {
    id: "transcribe-drive-file",
    name: "Transcribe Drive File",
    retries: 2,
    concurrency: [{ limit: 2 }], // Max 2 concurrent transcriptions
  },
  { event: "drive/transcribe.file" },
  async ({ event, step }) => {
    const { driveFileId, diarize, expectedSpeakers, language } = event.data;

    // Step 1: Get file metadata and validate
    const fileData = await step.run("get-file-metadata", async () => {
      const { db } = await import("@/lib/db");
      const { driveFiles } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const [file] = await db
        .select({
          id: driveFiles.id,
          name: driveFiles.name,
          mimeType: driveFiles.mimeType,
          fileSize: driveFiles.fileSize,
          driveFileId: driveFiles.driveFileId,
        })
        .from(driveFiles)
        .where(eq(driveFiles.driveFileId, driveFileId))
        .limit(1);

      if (!file) {
        throw new Error(`Arquivo não encontrado: ${driveFileId}`);
      }

      const audioVideoMimes = ["audio/", "video/", "application/ogg"];
      const isAudioVideo = audioVideoMimes.some(
        (m) => file.mimeType?.startsWith(m),
      );
      if (!isAudioVideo) {
        throw new Error(`Não é áudio/vídeo: ${file.mimeType}`);
      }

      return file;
    });

    // Step 2: Get access token
    const accessToken = await step.run("get-access-token", async () => {
      const { getAccessToken } = await import("@/lib/services/google-drive");
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Não foi possível obter token do Google Drive");
      }
      return token;
    });

    // Step 3: Call enrichment engine (this is the long step — may take 5+ min)
    const transcriptionResult = await step.run("call-enrichment-engine", async () => {
      const { enrichmentClient } = await import("@/lib/services/enrichment-client");
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileData.driveFileId}?alt=media`;

      return await enrichmentClient.transcribe({
        fileUrl: downloadUrl,
        fileName: fileData.name || "audio.mp3",
        language: language,
        diarize: diarize,
        expectedSpeakers: expectedSpeakers ?? null,
        authHeader: `Bearer ${accessToken}`,
      });
    });

    // Step 4: Save result to database
    await step.run("save-transcription", async () => {
      const { db } = await import("@/lib/db");
      const { driveFiles } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(driveFiles)
        .set({
          enrichmentStatus: "completed",
          enrichedAt: new Date(),
          documentType: "transcricao_audio",
          enrichmentError: null,
          enrichmentData: {
            sub_type: "transcricao_audio",
            confidence: transcriptionResult.confidence,
            // Store transcript data for UI polling
            transcript: transcriptionResult.transcript,
            transcript_plain: transcriptionResult.transcript_plain,
            speakers: transcriptionResult.speakers,
            duration: transcriptionResult.duration,
            diarization_applied: transcriptionResult.diarization_applied,
          } as any,
          updatedAt: new Date(),
        })
        .where(eq(driveFiles.driveFileId, driveFileId));
    });

    // Trigger auto-consolidation after transcription
    await step.run("trigger-consolidation", async () => {
      const { db } = await import("@/lib/db");
      const { driveFiles: driveFilesSchema } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const [file] = await db
        .select({ assistidoId: driveFilesSchema.assistidoId })
        .from(driveFilesSchema)
        .where(eq(driveFilesSchema.driveFileId, driveFileId))
        .limit(1);

      if (file?.assistidoId) {
        await inngest.send({
          name: "intelligence/consolidate",
          data: { assistidoId: file.assistidoId, userId: "system" },
        });
      }
    });

    return {
      success: true,
      driveFileId,
      fileName: fileData.name,
      speakers: transcriptionResult.speakers?.length ?? 0,
      duration: transcriptionResult.duration,
    };
  }
);

// ============================================
// DRIVE SYNC WATCHDOG (A CADA 5 MINUTOS)
// ============================================

/**
 * Verifica pastas com sync estagnado (> 20 min) e dispara incremental sync.
 * Funciona como segurança quando webhooks falham.
 * Usa rateLimit global para evitar sobrecarga se o cron atrasar.
 */
export const driveWatchdogFn = inngest.createFunction(
  {
    id: "drive-watchdog",
    name: "Drive Sync Watchdog",
    retries: 0,
    rateLimit: { limit: 1, period: "5m" }, // máx 1 run global por janela de 5 min
  },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const staleThreshold = new Date(Date.now() - 20 * 60 * 1000); // 20 min atrás

    const staleFolders = await step.run("find-stale-folders", async () => {
      return db
        .select({ driveFolderId: driveSyncFolders.driveFolderId, name: driveSyncFolders.name })
        .from(driveSyncFolders)
        .where(
          and(
            eq(driveSyncFolders.isActive, true),
            or(
              lt(driveSyncFolders.lastSyncAt, staleThreshold),
              isNull(driveSyncFolders.lastSyncAt)
            )
          )
        );
    });

    if (staleFolders.length === 0) {
      return { staleFolders: 0 };
    }

    for (const folder of staleFolders) {
      await inngest.send({
        name: "drive/incremental-sync",
        data: { folderId: folder.driveFolderId, triggerSource: "watchdog" },
      });
    }

    return { staleFolders: staleFolders.length, dispatched: staleFolders.map(f => f.name) };
  }
);

/**
 * Auto-consolidate enriched data for an assistido/processo.
 * Debounced: waits 5 min after last enrichment event, max 30 min.
 * Concurrency: 1 per assistido to avoid duplicate runs.
 */
export const intelligenceConsolidateFn = inngest.createFunction(
  {
    id: "intelligence-consolidate",
    name: "Intelligence: Auto-Consolidate Case",
    retries: 2,
    debounce: {
      key: "event.data.assistidoId",
      period: "5m",
      timeout: "30m",
    },
    concurrency: [{ limit: 1, key: "event.data.assistidoId" }],
  },
  { event: "intelligence/consolidate" },
  async ({ event, step }) => {
    const { assistidoId, processoId, userId } = event.data;

    const result = await step.run("consolidate-case", async () => {
      const { consolidateForAssistido, consolidateForProcesso } =
        await import("@/lib/services/intelligence-consolidation");

      if (assistidoId) {
        return consolidateForAssistido(assistidoId, userId || "system");
      } else if (processoId) {
        return consolidateForProcesso(processoId, userId || "system");
      }
      return { success: false, error: "No assistidoId or processoId provided" };
    });

    return result;
  }
);

// ============================================
// SYNC PLANILHA POLLING
// ============================================

/**
 * Polling de segurança: lê a planilha a cada 5 minutos e sincroniza
 * mudanças que o webhook pode ter perdido.
 */
export const syncSheetPollingFn = inngest.createFunction(
  { id: "sync-sheet-polling", name: "Sync Planilha Polling (5min)" },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const stats = { checked: 0, updated: 0, conflicts: 0, errors: 0 };

    await step.run("poll-sheets", async () => {
      const { db } = await import("@/lib/db");
      const { demandas } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      // Status label → DB status mapping
      const LABEL_TO_STATUS: Record<string, { status: string; substatus: string | null }> = {
        "1 - Urgente": { status: "URGENTE", substatus: null },
        "2 - Atender": { status: "2_ATENDER", substatus: "2 - Atender" },
        "2 - Analisar": { status: "2_ATENDER", substatus: "2 - Analisar" },
        "2 - Elaborar": { status: "2_ATENDER", substatus: "2 - Elaborar" },
        "2 - Buscar": { status: "2_ATENDER", substatus: "2 - Buscar" },
        "4 - Monitorar": { status: "4_MONITORAR", substatus: null },
        "5 - Triagem": { status: "5_TRIAGEM", substatus: null },
        "7 - Protocolado": { status: "7_PROTOCOLADO", substatus: null },
        "7 - Ciência": { status: "7_CIENCIA", substatus: null },
        "7 - Sem atuação": { status: "7_SEM_ATUACAO", substatus: null },
        "7 - Resolvido": { status: "CONCLUIDO", substatus: "7 - Resolvido" },
        "7 - Sigad": { status: "7_PROTOCOLADO", substatus: "7 - Sigad" },
      };

      const DATA_START_ROW = 4; // Row 4 in sheets = index 3

      for (const [atribuicao, sheetName] of Object.entries(ATRIBUICAO_TO_SHEET)) {
        // Plenários vive em `sessoesJuri`, não em `demandas` — esse loop não se aplica.
        if (sheetName === "Plenários") continue;

        try {
          const rows = await readSheet(sheetName);

          for (let i = DATA_START_ROW - 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[COL.ID - 1]) continue;

            const demandaId = parseInt(row[COL.ID - 1]);
            if (isNaN(demandaId)) continue;

            const demanda = await db.query.demandas.findFirst({
              where: eq(demandas.id, demandaId),
              columns: { id: true, status: true, substatus: true, updatedAt: true, syncedAt: true },
            });
            if (!demanda) continue;

            stats.checked++;

            const planilhaStatus = (row[COL.STATUS - 1] ?? "").trim();
            if (!planilhaStatus) continue;

            const bancoStatusLabel = statusParaLabel(demanda.status, demanda.substatus);

            if (planilhaStatus !== bancoStatusLabel) {
              const syncedAt = demanda.syncedAt ?? new Date(0);
              const bancoMudou = demanda.updatedAt > syncedAt;

              if (bancoMudou) {
                // Conflito — ambos mudaram
                await registerConflict(demandaId, "status", bancoStatusLabel, planilhaStatus, demanda.updatedAt, new Date());
                stats.conflicts++;
              } else {
                // Planilha vence — atualizar banco
                const mapping = LABEL_TO_STATUS[planilhaStatus];
                if (mapping) {
                  await db.update(demandas).set({
                    status: mapping.status as typeof demandas.status.enumValues[number],
                    substatus: mapping.substatus,
                    syncedAt: new Date(),
                  }).where(eq(demandas.id, demandaId));
                  await logSyncAction(demandaId, "status", bancoStatusLabel, planilhaStatus, "PLANILHA");
                  stats.updated++;
                }
              }
            }
          }

          // Se houve update via planilha nesta aba, agendar reorder para que
          // as linhas reposicionem-se no grupo correto (debounce 15s).
          if (stats.updated > 0) {
            await inngest.send({
              name: "sheets/reorder.requested",
              data: { sheetName, reason: "poller-sync" },
            });
          }
        } catch (err) {
          console.error(`[Polling] Erro na aba ${sheetName}:`, err);
          stats.errors++;
        }
      }
    });

    return stats;
  }
);

// ============================================
// COWORK IMPORT — Auto-detect _analise_ia.json
// ============================================

export const coworkImportAnalysisFn = inngest.createFunction(
  {
    id: "cowork-import-analysis",
    name: "Cowork: Importar _analise_ia.json",
    retries: 3,
  },
  { event: "cowork/import-analysis" },
  async ({ event, step }) => {
    const { driveFolderId, fileName, driveFileId } = event.data as {
      driveFolderId: string;
      fileName: string;
      driveFileId: string;
    };

    return await step.run("import-analysis-json", async () => {
      const { db } = await import("@/lib/db");
      const { driveFiles, processos, assistidos } = await import("@/lib/db/schema");
      const { eq, and, isNull } = await import("drizzle-orm");
      const { getAccessToken } = await import("@/lib/services/google-drive");

      // 1. Obter access token
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Sem access token para Google Drive");
      }

      // 2. Identificar assistido e processo pela pasta no Drive
      // A pasta pai do _analise_ia.json deve ser a pasta do processo/assistido
      // Buscar no banco qual assistido/processo tem essa pasta
      const folderFile = await db.query.driveFiles.findFirst({
        where: and(
          eq(driveFiles.driveFileId, driveFolderId),
          eq(driveFiles.isFolder, true),
        ),
        columns: { id: true, name: true, driveFolderId: true },
      });

      // Tentar encontrar processo pelo driveFolderId
      let processoId: number | null = null;
      let assistidoId: number | null = null;

      const processo = await db.query.processos.findFirst({
        where: eq(processos.driveFolderId, driveFolderId),
        columns: { id: true, assistidoId: true },
      });

      if (processo) {
        processoId = processo.id;
        assistidoId = processo.assistidoId;
      } else {
        // Tentar pelo assistido (pasta pode ser do assistido, não do processo)
        const assistido = await db.query.assistidos.findFirst({
          where: eq(assistidos.driveFolderId, driveFolderId),
          columns: { id: true },
        });
        if (assistido) {
          assistidoId = assistido.id;
        }
      }

      if (!assistidoId) {
        console.warn(`[CoworkImport] Não encontrou assistido/processo para pasta ${driveFolderId}`);
        // Tentar encontrar pela hierarquia de pastas (pasta pai)
        if (folderFile?.driveFolderId) {
          const parentAssistido = await db.query.assistidos.findFirst({
            where: eq(assistidos.driveFolderId, folderFile.driveFolderId),
            columns: { id: true },
          });
          if (parentAssistido) {
            assistidoId = parentAssistido.id;
          }
        }
      }

      if (!assistidoId) {
        console.error(`[CoworkImport] Impossível identificar assistido para ${driveFolderId}/${fileName}`);
        return { success: false, error: "Assistido não identificado" };
      }

      // 3. Chamar enrichment engine para importar
      const enrichmentUrl = process.env.ENRICHMENT_ENGINE_URL || "http://localhost:8000";
      try {
        const response = await fetch(`${enrichmentUrl}/cowork/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assistido_id: assistidoId,
            processo_id: processoId,
            audiencia_id: null,
            drive_folder_id: driveFolderId,
            arquivo_nome: fileName,
            access_token: accessToken,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Enrichment retornou ${response.status}: ${error}`);
        }

        const result = await response.json();
        console.log(`[CoworkImport] Sucesso: ${JSON.stringify(result)}`);
        return { success: true, ...result };
      } catch (err) {
        console.error(`[CoworkImport] Erro ao importar ${fileName}:`, err);
        throw err; // Inngest vai retry
      }
    });
  }
);

// ============================================
// SHEETS REORDER — Debounced (30s silence)
// ============================================

/**
 * Reordena a planilha Google Sheets 30s após a última mutação de demanda.
 *
 * Debounce evita:
 * - Hammering na Sheets API durante edições em lote
 * - Reorder redundante quando o usuário está arrastando várias demandas
 *
 * A chave de debounce é por `sheetName`, então edições em abas diferentes
 * (ex: Júri + EP) rodam em paralelo, mas múltiplas edições na mesma aba
 * coalescem em uma única execução.
 *
 * Quando `sheetName` não vem no payload (bulk/manual), o debounce usa
 * a chave "__all__" e o handler reordena todas as abas.
 */
export const sheetsReorderDebouncedFn = inngest.createFunction(
  {
    id: "sheets-reorder-debounced",
    name: "Reordenar Planilha (debounced)",
    debounce: {
      period: "15s",
      key: "event.data.sheetName",
    },
    retries: 2,
  },
  { event: "sheets/reorder.requested" },
  async ({ event, step }) => {
    const { sheetName, reason } = event.data as {
      sheetName?: string;
      reason?: string;
    };

    const result = await step.run("reorder", async () => {
      const { reorderAllSheets } = await import("@/lib/services/sheets-reorder");
      const filter = sheetName && sheetName !== "__all__" ? sheetName : undefined;
      return await reorderAllSheets(filter);
    });

    console.log(
      `[sheets-reorder-debounced] reason=${reason ?? "?"} sheet=${sheetName ?? "ALL"} ` +
      `→ ${result.totalWritten} linhas em ${result.sheets.length} abas`,
    );

    return result;
  },
);

export const functions = [
  sendWhatsAppMessageFn,
  notifyPrazoFn,
  notifyAudienciaFn,
  notifyJuriFn,
  notifyMovimentacaoFn,
  sendReminderFn,
  syncDriveFn,
  syncDriveFolderFn,
  syncAllDriveFn,
  checkPrazosCriticosFn,
  checkPrazosManualFn,
  checkDistributionFolderFn,
  processDistributionFileFn,
  intelligenceEnrichDocumentFn,
  driveAutoLinkAndEnrichFn,
  incrementalSyncFn,
  renewChannelsFn,
  healthCheckFn,
  pdfExtractAndClassifyFn,
  pdfInsertBookmarksFn,
  sectionGenerateFichaFn,
  transcribeDriveFileFn,
  enrichmentProcessFolderFn,
  driveWatchdogFn,
  intelligenceConsolidateFn,
  syncSheetPollingFn,
  sheetsReorderDebouncedFn,
  coworkImportAnalysisFn,
];
