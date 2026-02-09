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
import { syncFolderWithDatabase, getSyncFolders } from "@/lib/services/google-drive";

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
  { cron: "*/15 * * * *" }, // A cada 15 minutos
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
          const syncResult = await syncFolderWithDatabase(folder.driveFolderId);
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

import { db, demandas, notifications, users, assistidos, processos } from "@/lib/db";
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
];
