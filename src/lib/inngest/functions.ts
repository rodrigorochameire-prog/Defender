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
];
