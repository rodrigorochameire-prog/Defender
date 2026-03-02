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
  { cron: "*/5 * * * *" }, // A cada 5 minutos
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
      return await syncFolderWithDatabase(folderId, userId);
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
          const syncResult = await syncFolderWithDatabase(folder.driveFolderId, userId);
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

import { db, demandas, notifications, users, assistidos, processos, driveSyncLogs } from "@/lib/db";
import { and, eq, lte, gte, isNull, or, sql } from "drizzle-orm";

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
          or(
            // Prazo vencido ou nos próximos 7 dias
            lte(demandas.prazo, em7dias.toISOString().split("T")[0]),
            lte(demandas.prazoFinal, em7dias)
          ),
          // Não concluídas
          sql`${demandas.status} NOT IN ('CONCLUIDO', 'ARQUIVADO', '7_PROTOCOLADO', '7_CIENCIA')`
        ),
        with: {
          assistido: true,
          processo: true,
          responsavel: true,
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
      const prazoData = demanda.prazoFinal || (demanda.prazo ? new Date(demanda.prazo) : null);
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
      const destinatarios = demanda.responsavelId
        ? defensores.filter(d => d.id === demanda.responsavelId)
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
            or(
              lte(demandas.prazo, em7dias.toISOString().split("T")[0]),
              lte(demandas.prazoFinal, em7dias)
            ),
            sql`${demandas.status} NOT IN ('CONCLUIDO', 'ARQUIVADO', '7_PROTOCOLADO', '7_CIENCIA')`,
            eq(demandas.responsavelId, userId)
          )
        : and(
            or(
              lte(demandas.prazo, em7dias.toISOString().split("T")[0]),
              lte(demandas.prazoFinal, em7dias)
            ),
            sql`${demandas.status} NOT IN ('CONCLUIDO', 'ARQUIVADO', '7_PROTOCOLADO', '7_CIENCIA')`
          );

      return await db.query.demandas.findMany({
        where: whereClause,
        with: {
          assistido: true,
          processo: true,
        },
        orderBy: (d, { asc }) => [asc(d.prazoFinal), asc(d.prazo)],
      });
    });

    // Categorizar
    const vencidos = demandasCriticas.filter(d => {
      const prazo = d.prazoFinal || (d.prazo ? new Date(d.prazo) : null);
      return prazo && new Date(prazo) < hoje;
    });

    const venceHoje = demandasCriticas.filter(d => {
      const prazo = d.prazoFinal || (d.prazo ? new Date(d.prazo) : null);
      if (!prazo) return false;
      const prazoDate = new Date(prazo);
      prazoDate.setHours(0, 0, 0, 0);
      return prazoDate.getTime() === hoje.getTime();
    });

    const proximosDias = demandasCriticas.filter(d => {
      const prazo = d.prazoFinal || (d.prazo ? new Date(d.prazo) : null);
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
        prazo: d.prazoFinal || d.prazo,
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
  { cron: "*/5 * * * *" }, // A cada 5 minutos
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
          nome: documentos.nome,
          mimeType: documentos.mimeType,
          url: documentos.url,
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
  { cron: "*/30 * * * *" },
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

    // Step: Check if OCR is needed
    const needsOcr = await step.run("check-ocr-need", async () => {
      const { detectNeedsOcr } = await import("@/lib/services/pdf-extractor");
      return detectNeedsOcr(extraction.pages);
    });

    // Step: Run OCR if needed
    let finalPages = extraction.pages;
    if (needsOcr) {
      const ocrResult = await step.run("run-ocr", async () => {
        try {
          const { enrichmentClient } = await import("@/lib/services/enrichment-client");
          const result = await enrichmentClient.ocr({
            fileUrl: `drive://${driveGoogleId}`,
            driveFileId: driveGoogleId,
          });
          return { success: true, pages: result.pages };
        } catch (err) {
          console.error("OCR failed, continuing with original extraction:", err);
          return { success: false, pages: [] as { page_number: number; text: string }[] };
        }
      });

      if (ocrResult.success && ocrResult.pages.length > 0) {
        finalPages = ocrResult.pages.map((p) => ({
          pageNumber: p.page_number,
          text: p.text,
          lineCount: p.text.split("\n").length,
        }));
      }
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

      const chunks = chunkPages(finalPages, 20);
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

      // Mark file as completed
      await db
        .update(driveFiles)
        .set({
          enrichmentStatus: "completed",
          enrichmentError: null,
          enrichedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(driveFiles.id, driveFileId));

      return { sectionsStored: inserted.length };
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
              contentText: finalPages.map((p) => p.text).join("\n\n---PAGE---\n\n"),
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
              contentText: finalPages.map((p) => p.text).join("\n\n---PAGE---\n\n"),
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
      const result = await addBookmarksToPdf(buffer, sections);
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
];
