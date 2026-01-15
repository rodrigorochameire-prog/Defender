/**
 * Serviço de integração com WhatsApp Business API (Meta Cloud API)
 * DefensorHub - Sistema de Gestão Jurídica
 * 
 * Suporta duas formas de configuração:
 * 1. Variáveis de ambiente (global/fallback)
 * 2. Configurações por admin no banco de dados (multi-tenant)
 * 
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { whatsappConfig, whatsappMessages, type WhatsAppConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ============================================
// Tipos
// ============================================

export interface WhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
}

export interface WhatsAppMessageResponse {
  messaging_product: "whatsapp";
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export interface WhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

export interface WhatsAppBusinessProfile {
  verified_name: string;
  code_verification_status: string;
  display_phone_number: string;
  quality_rating: string;
  platform_type: string;
  throughput: {
    level: string;
  };
}

export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";
export type MessageContext = "prazo" | "audiencia" | "juri" | "movimentacao" | "manual";

// ============================================
// Configuração
// ============================================

const GRAPH_API_VERSION = "v18.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Obtém credenciais das variáveis de ambiente (fallback global)
 */
function getEnvCredentials(): WhatsAppCredentials | null {
  const accessToken = env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return null;
  }

  return {
    accessToken,
    phoneNumberId,
    businessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  };
}

// ============================================
// Serviço Principal
// ============================================

export class WhatsAppService {
  private credentials: WhatsAppCredentials;
  private configId?: number;
  private adminId?: number;

  constructor(credentials: WhatsAppCredentials, configId?: number, adminId?: number) {
    this.credentials = credentials;
    this.configId = configId;
    this.adminId = adminId;
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Cria instância usando credenciais do banco de dados (por admin)
   */
  static async forAdmin(adminId: number): Promise<WhatsAppService | null> {
    const config = await db.query.whatsappConfig.findFirst({
      where: eq(whatsappConfig.adminId, adminId),
    });

    if (!config || !config.accessToken || !config.phoneNumberId || !config.isActive) {
      return null;
    }

    return new WhatsAppService(
      {
        accessToken: config.accessToken,
        phoneNumberId: config.phoneNumberId,
        businessAccountId: config.businessAccountId || undefined,
      },
      config.id,
      adminId
    );
  }

  /**
   * Cria instância usando variáveis de ambiente (fallback global)
   */
  static fromEnv(): WhatsAppService | null {
    const credentials = getEnvCredentials();
    if (!credentials) {
      return null;
    }
    return new WhatsAppService(credentials);
  }

  /**
   * Cria instância preferindo config do admin, com fallback para env
   */
  static async forAdminOrEnv(adminId?: number): Promise<WhatsAppService | null> {
    // Tenta primeiro pelo admin
    if (adminId) {
      const service = await WhatsAppService.forAdmin(adminId);
      if (service) {
        return service;
      }
    }

    // Fallback para variáveis de ambiente
    return WhatsAppService.fromEnv();
  }

  // ============================================
  // Static Methods (verificação de configuração)
  // ============================================

  /**
   * Verifica se há configuração global (env vars)
   */
  static isEnvConfigured(): boolean {
    return getEnvCredentials() !== null;
  }

  /**
   * Verifica se um admin tem configuração ativa
   */
  static async isAdminConfigured(adminId: number): Promise<boolean> {
    const config = await db.query.whatsappConfig.findFirst({
      where: eq(whatsappConfig.adminId, adminId),
    });
    return !!(config?.isActive && config?.accessToken && config?.phoneNumberId);
  }

  /**
   * Obtém configuração do admin (sem credentials sensíveis)
   */
  static async getAdminConfig(adminId: number): Promise<(Omit<WhatsAppConfig, "accessToken"> & { hasAccessToken: boolean }) | null> {
    const config = await db.query.whatsappConfig.findFirst({
      where: eq(whatsappConfig.adminId, adminId),
    });

    if (!config) {
      return null;
    }

    // Remove o accessToken por segurança e adiciona flag
    const { accessToken, ...safeConfig } = config;
    return {
      ...safeConfig,
      hasAccessToken: !!accessToken,
    };
  }

  /**
   * Salva/atualiza configuração do admin
   */
  static async saveAdminConfig(
    adminId: number,
    data: {
      accessToken?: string;
      phoneNumberId?: string;
      businessAccountId?: string;
      webhookVerifyToken?: string;
      autoNotifyPrazo?: boolean;
      autoNotifyAudiencia?: boolean;
      autoNotifyJuri?: boolean;
      autoNotifyMovimentacao?: boolean;
    }
  ): Promise<WhatsAppConfig> {
    const existing = await db.query.whatsappConfig.findFirst({
      where: eq(whatsappConfig.adminId, adminId),
    });

    if (existing) {
      // Update
      const [updated] = await db
        .update(whatsappConfig)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(whatsappConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert
      const [created] = await db
        .insert(whatsappConfig)
        .values({
          adminId,
          ...data,
          isActive: false,
        })
        .returning();
      return created;
    }
  }

  /**
   * Ativa/desativa configuração do admin
   */
  static async setAdminConfigActive(adminId: number, isActive: boolean): Promise<void> {
    await db
      .update(whatsappConfig)
      .set({ 
        isActive, 
        updatedAt: new Date(),
        lastVerifiedAt: isActive ? new Date() : undefined,
      })
      .where(eq(whatsappConfig.adminId, adminId));
  }

  /**
   * Atualiza informações do perfil na configuração
   */
  static async updateAdminProfile(
    adminId: number,
    profile: {
      displayPhoneNumber?: string;
      verifiedName?: string;
      qualityRating?: string;
    }
  ): Promise<void> {
    await db
      .update(whatsappConfig)
      .set({
        ...profile,
        lastVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(whatsappConfig.adminId, adminId));
  }

  // ============================================
  // Instance Methods
  // ============================================

  /**
   * Formata o número para o padrão internacional (E.164)
   */
  static formatNumber(phone: string): string {
    const cleanNumber = phone.replace(/\D/g, "");
    if (cleanNumber.startsWith("55")) {
      return cleanNumber;
    }
    return `55${cleanNumber}`;
  }

  /**
   * Valida se o número tem o formato correto para Brasil
   */
  static validateNumber(phone: string): { valid: boolean; reason?: string } {
    const formatted = this.formatNumber(phone);
    
    if (formatted.length < 12 || formatted.length > 13) {
      return {
        valid: false,
        reason: "Número deve ter entre 10 e 11 dígitos (com DDD)",
      };
    }
    
    if (!formatted.startsWith("55")) {
      return { valid: false, reason: "Número deve ser brasileiro (começar com 55)" };
    }
    
    return { valid: true };
  }

  /**
   * Envia uma mensagem de texto
   */
  async sendText(
    to: string,
    message: string,
    options?: {
      assistidoId?: number;
      context?: MessageContext;
      sentById?: number;
    }
  ): Promise<WhatsAppMessageResponse> {
    const formattedNumber = WhatsAppService.formatNumber(to);
    
    const validation = WhatsAppService.validateNumber(to);
    if (!validation.valid) {
      throw new Error(`Número inválido: ${validation.reason}`);
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${this.credentials.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.credentials.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedNumber,
            type: "text",
            text: {
              preview_url: true,
              body: message,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json() as WhatsAppError;
        const errorMessage = errorData.error?.message || `Erro ao enviar mensagem: ${response.status}`;
        
        // Log no histórico se tiver configId
        if (this.configId) {
          await this.logMessage({
            toPhone: formattedNumber,
            messageType: "text",
            content: message,
            status: "failed",
            errorMessage,
            context: options?.context,
            assistidoId: options?.assistidoId,
            sentById: options?.sentById,
          });
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json() as WhatsAppMessageResponse;

      // Log no histórico se tiver configId
      if (this.configId) {
        await this.logMessage({
          toPhone: formattedNumber,
          messageType: "text",
          content: message,
          messageId: result.messages[0]?.id,
          status: "sent",
          sentAt: new Date(),
          context: options?.context,
          assistidoId: options?.assistidoId,
          sentById: options?.sentById,
        });
      }

      return result;
    } catch (error) {
      console.error("[WhatsApp Service] Erro ao enviar mensagem:", error);
      throw error;
    }
  }

  /**
   * Envia uma mensagem usando template
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = "pt_BR",
    components?: Array<{
      type: "header" | "body" | "button";
      parameters: Array<{
        type: "text" | "image" | "document" | "video";
        text?: string;
        image?: { link: string };
        document?: { link: string; filename: string };
      }>;
    }>,
    options?: {
      assistidoId?: number;
      context?: MessageContext;
      sentById?: number;
    }
  ): Promise<WhatsAppMessageResponse> {
    const formattedNumber = WhatsAppService.formatNumber(to);
    
    const validation = WhatsAppService.validateNumber(to);
    if (!validation.valid) {
      throw new Error(`Número inválido: ${validation.reason}`);
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${this.credentials.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.credentials.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedNumber,
            type: "template",
            template: {
              name: templateName,
              language: { code: languageCode },
              components: components || [],
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json() as WhatsAppError;
        throw new Error(errorData.error?.message || `Erro ao enviar template: ${response.status}`);
      }

      const result = await response.json() as WhatsAppMessageResponse;

      if (this.configId) {
        await this.logMessage({
          toPhone: formattedNumber,
          messageType: "template",
          templateName,
          messageId: result.messages[0]?.id,
          status: "sent",
          sentAt: new Date(),
          context: options?.context,
          assistidoId: options?.assistidoId,
          sentById: options?.sentById,
        });
      }

      return result;
    } catch (error) {
      console.error("[WhatsApp Service] Erro ao enviar template:", error);
      throw error;
    }
  }

  /**
   * Envia uma imagem
   */
  async sendImage(
    to: string,
    imageUrl: string,
    caption?: string,
    options?: {
      assistidoId?: number;
      context?: MessageContext;
      sentById?: number;
    }
  ): Promise<WhatsAppMessageResponse> {
    const formattedNumber = WhatsAppService.formatNumber(to);
    
    const validation = WhatsAppService.validateNumber(to);
    if (!validation.valid) {
      throw new Error(`Número inválido: ${validation.reason}`);
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${this.credentials.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.credentials.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedNumber,
            type: "image",
            image: {
              link: imageUrl,
              caption: caption || "",
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json() as WhatsAppError;
        throw new Error(errorData.error?.message || `Erro ao enviar imagem: ${response.status}`);
      }

      const result = await response.json() as WhatsAppMessageResponse;

      if (this.configId) {
        await this.logMessage({
          toPhone: formattedNumber,
          messageType: "image",
          content: caption,
          messageId: result.messages[0]?.id,
          status: "sent",
          sentAt: new Date(),
          context: options?.context,
          assistidoId: options?.assistidoId,
          sentById: options?.sentById,
        });
      }

      return result;
    } catch (error) {
      console.error("[WhatsApp Service] Erro ao enviar imagem:", error);
      throw error;
    }
  }

  /**
   * Envia um documento
   */
  async sendDocument(
    to: string,
    documentUrl: string,
    fileName: string,
    caption?: string,
    options?: {
      assistidoId?: number;
      context?: MessageContext;
      sentById?: number;
    }
  ): Promise<WhatsAppMessageResponse> {
    const formattedNumber = WhatsAppService.formatNumber(to);
    
    const validation = WhatsAppService.validateNumber(to);
    if (!validation.valid) {
      throw new Error(`Número inválido: ${validation.reason}`);
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${this.credentials.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.credentials.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedNumber,
            type: "document",
            document: {
              link: documentUrl,
              filename: fileName,
              caption: caption || "",
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json() as WhatsAppError;
        throw new Error(errorData.error?.message || `Erro ao enviar documento: ${response.status}`);
      }

      const result = await response.json() as WhatsAppMessageResponse;

      if (this.configId) {
        await this.logMessage({
          toPhone: formattedNumber,
          messageType: "document",
          content: `${fileName}: ${caption || ""}`,
          messageId: result.messages[0]?.id,
          status: "sent",
          sentAt: new Date(),
          context: options?.context,
          assistidoId: options?.assistidoId,
          sentById: options?.sentById,
        });
      }

      return result;
    } catch (error) {
      console.error("[WhatsApp Service] Erro ao enviar documento:", error);
      throw error;
    }
  }

  /**
   * Obtém informações do perfil do número
   */
  async getBusinessProfile(): Promise<WhatsAppBusinessProfile> {
    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${this.credentials.phoneNumberId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating,platform_type,throughput`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${this.credentials.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json() as WhatsAppError;
        throw new Error(errorData.error?.message || `Erro ao obter perfil: ${response.status}`);
      }

      return await response.json() as WhatsAppBusinessProfile;
    } catch (error) {
      console.error("[WhatsApp Service] Erro ao obter perfil:", error);
      throw error;
    }
  }

  /**
   * Verifica o status da API
   */
  async checkConnection(): Promise<{
    connected: boolean;
    profile?: WhatsAppBusinessProfile;
    error?: string;
  }> {
    try {
      const profile = await this.getBusinessProfile();
      
      // Atualiza o perfil no banco se tiver adminId
      if (this.adminId) {
        await WhatsAppService.updateAdminProfile(this.adminId, {
          displayPhoneNumber: profile.display_phone_number,
          verifiedName: profile.verified_name,
          qualityRating: profile.quality_rating,
        });
      }

      return {
        connected: true,
        profile,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Lista templates disponíveis
   */
  async listTemplates(): Promise<Array<{
    name: string;
    status: string;
    category: string;
    language: string;
  }>> {
    if (!this.credentials.businessAccountId) {
      throw new Error("WHATSAPP_BUSINESS_ACCOUNT_ID é necessário para listar templates");
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${this.credentials.businessAccountId}/message_templates?fields=name,status,category,language`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${this.credentials.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json() as WhatsAppError;
        throw new Error(errorData.error?.message || `Erro ao listar templates: ${response.status}`);
      }

      const data = await response.json() as { data: Array<{ name: string; status: string; category: string; language: string }> };
      return data.data || [];
    } catch (error) {
      console.error("[WhatsApp Service] Erro ao listar templates:", error);
      throw error;
    }
  }

  /**
   * Registra mensagem no histórico
   */
  private async logMessage(data: {
    toPhone: string;
    toName?: string;
    messageType: string;
    templateName?: string;
    content?: string;
    messageId?: string;
    status: MessageStatus;
    errorMessage?: string;
    context?: MessageContext;
    assistidoId?: number;
    sentById?: number;
    sentAt?: Date;
  }): Promise<void> {
    if (!this.configId) return;

    try {
      await db.insert(whatsappMessages).values({
        configId: this.configId,
        toPhone: data.toPhone,
        toName: data.toName,
        messageType: data.messageType,
        templateName: data.templateName,
        content: data.content,
        messageId: data.messageId,
        status: data.status,
        errorMessage: data.errorMessage,
        context: data.context,
        assistidoId: data.assistidoId,
        sentById: data.sentById,
        sentAt: data.sentAt,
      });
    } catch (error) {
      console.error("[WhatsApp Service] Erro ao registrar mensagem:", error);
      // Não propaga o erro para não interromper o envio
    }
  }
}

// ============================================
// Templates de Mensagens para DefensorHub
// ============================================

export const WhatsAppTemplates = {
  // Notificação de prazo
  prazoAlerta: (assistidoNome: string, ato: string, prazo: string, processo: string) =>
    `⚠️ *Alerta de Prazo - Defensoria Pública*\n\nOlá! Informamos que há um prazo próximo:\n\n📋 *Ato:* ${ato}\n📅 *Prazo:* ${prazo}\n📂 *Processo:* ${processo}\n👤 *Assistido:* ${assistidoNome}\n\nFavor entrar em contato se precisar de mais informações.`,

  // Lembrete de audiência
  audienciaLembrete: (assistidoNome: string, data: string, hora: string, local: string, tipo: string) =>
    `📅 *Lembrete de Audiência - Defensoria Pública*\n\nOlá ${assistidoNome}!\n\nLembramos que você tem uma audiência agendada:\n\n📆 *Data:* ${data}\n⏰ *Horário:* ${hora}\n📍 *Local:* ${local}\n📋 *Tipo:* ${tipo}\n\n*Importante:* Compareça com 30 minutos de antecedência e traga documento com foto.\n\nDúvidas? Entre em contato com a Defensoria.`,

  // Aviso de sessão do júri
  juriAviso: (assistidoNome: string, data: string, local: string, defensor: string) =>
    `⚖️ *Aviso de Sessão do Júri - Defensoria Pública*\n\nOlá!\n\nInformamos sobre a sessão do Tribunal do Júri:\n\n👤 *Assistido:* ${assistidoNome}\n📆 *Data:* ${data}\n📍 *Local:* ${local}\n👨‍⚖️ *Defensor(a):* ${defensor}\n\nO familiar/contato receberá orientações sobre o procedimento.`,

  // Movimentação processual
  movimentacao: (assistidoNome: string, processo: string, descricao: string) =>
    `📋 *Movimentação Processual - Defensoria Pública*\n\nOlá! Há uma nova movimentação no processo:\n\n👤 *Assistido:* ${assistidoNome}\n📂 *Processo:* ${processo}\n📝 *Movimentação:* ${descricao}\n\nPara mais informações, entre em contato com a Defensoria.`,

  // Atendimento agendado
  atendimentoAgendado: (nome: string, data: string, hora: string, local: string) =>
    `📆 *Atendimento Agendado - Defensoria Pública*\n\nOlá ${nome}!\n\nSeu atendimento foi agendado:\n\n📅 *Data:* ${data}\n⏰ *Horário:* ${hora}\n📍 *Local:* ${local}\n\n*Documentos:* Traga RG, CPF, comprovante de residência e documentos relacionados ao caso.\n\nEm caso de impossibilidade, favor entrar em contato para reagendar.`,

  // Confirmação de visita carcerária
  visitaCarceraria: (nome: string, data: string, unidade: string, assistido: string) =>
    `🏢 *Visita Carcerária Agendada - Defensoria Pública*\n\nOlá ${nome}!\n\nA visita foi agendada:\n\n📅 *Data:* ${data}\n🏢 *Unidade:* ${unidade}\n👤 *Assistido:* ${assistido}\n\nLeve documento com foto.`,

  // Resultado do júri
  juriResultado: (assistidoNome: string, resultado: string, observacoes: string) =>
    `⚖️ *Resultado da Sessão do Júri - Defensoria Pública*\n\nInformamos o resultado da sessão:\n\n👤 *Assistido:* ${assistidoNome}\n📋 *Resultado:* ${resultado}\n${observacoes ? `\n📝 *Observações:* ${observacoes}` : ""}\n\nPara mais informações, entre em contato com a Defensoria.`,

  // Alerta genérico
  alertaGenerico: (titulo: string, mensagem: string) =>
    `🔔 *${titulo} - Defensoria Pública*\n\n${mensagem}\n\nDefensoria Pública do Estado`,
};

export const MetaTemplateNames = {
  PRAZO_ALERTA: "defensoria_prazo_alerta",
  AUDIENCIA_LEMBRETE: "defensoria_audiencia_lembrete",
  JURI_AVISO: "defensoria_juri_aviso",
  MOVIMENTACAO: "defensoria_movimentacao",
  ATENDIMENTO_AGENDADO: "defensoria_atendimento_agendado",
  VISITA_CARCERARIA: "defensoria_visita_carceraria",
  JURI_RESULTADO: "defensoria_juri_resultado",
  ALERTA_GENERICO: "defensoria_alerta_generico",
  WELCOME: "defensoria_bem_vindo",
};
