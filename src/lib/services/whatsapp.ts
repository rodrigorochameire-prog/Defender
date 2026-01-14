/**
 * Serviço de integração com WhatsApp Business API (Meta Cloud API)
 * 
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api
 * 
 * Esta implementação usa a API oficial da Meta, que funciona perfeitamente
 * com arquitetura serverless (Vercel).
 */

import { env } from "@/lib/env";

// ============================================
// Tipos
// ============================================

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

export type MessageStatus = "sent" | "delivered" | "read" | "failed";

// ============================================
// Configuração
// ============================================

const GRAPH_API_VERSION = "v18.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getConfig() {
  const accessToken = env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  const businessAccountId = env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp Business API não está configurada. Configure WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID.");
  }

  return {
    accessToken,
    phoneNumberId,
    businessAccountId,
  };
}

// ============================================
// Serviço Principal
// ============================================

export class WhatsAppService {
  /**
   * Verifica se o serviço está configurado
   */
  static isConfigured(): boolean {
    return !!(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
  }

  /**
   * Formata o número para o padrão internacional (E.164)
   * Remove caracteres não numéricos e adiciona código do país se necessário
   * 
   * Exemplo: (11) 98888-7777 -> 5511988887777
   */
  static formatNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleanNumber = phone.replace(/\D/g, "");
    
    // Adiciona o código do Brasil se não houver
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
    
    // Verifica tamanho (55 + 2 DDD + 8-9 número = 12-13 dígitos)
    if (formatted.length < 12 || formatted.length > 13) {
      return {
        valid: false,
        reason: "Número deve ter entre 10 e 11 dígitos (com DDD)",
      };
    }
    
    // Verifica se começa com 55 (Brasil)
    if (!formatted.startsWith("55")) {
      return { valid: false, reason: "Número deve ser brasileiro (começar com 55)" };
    }
    
    return { valid: true };
  }

  /**
   * Envia uma mensagem de texto simples
   * 
   * NOTA: Mensagens de texto só podem ser enviadas para números que
   * iniciaram conversa nas últimas 24 horas. Para mensagens proativas,
   * use sendTemplate().
   */
  static async sendText(
    to: string,
    message: string
  ): Promise<WhatsAppMessageResponse> {
    const config = getConfig();
    const formattedNumber = this.formatNumber(to);
    
    const validation = this.validateNumber(to);
    if (!validation.valid) {
      throw new Error(`Número inválido: ${validation.reason}`);
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.accessToken}`,
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
        throw new Error(errorData.error?.message || `Erro ao enviar mensagem: ${response.status}`);
      }

      return await response.json() as WhatsAppMessageResponse;
    } catch (error) {
      console.error("[WhatsApp Service] Erro ao enviar mensagem:", error);
      throw error;
    }
  }

  /**
   * Envia uma mensagem usando template aprovado
   * 
   * Templates são obrigatórios para iniciar conversas (mensagens proativas).
   * Os templates precisam ser aprovados pela Meta antes de usar.
   */
  static async sendTemplate(
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
    }>
  ): Promise<WhatsAppMessageResponse> {
    const config = getConfig();
    const formattedNumber = this.formatNumber(to);
    
    const validation = this.validateNumber(to);
    if (!validation.valid) {
      throw new Error(`Número inválido: ${validation.reason}`);
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedNumber,
            type: "template",
            template: {
              name: templateName,
              language: {
                code: languageCode,
              },
              components: components || [],
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json() as WhatsAppError;
        throw new Error(errorData.error?.message || `Erro ao enviar template: ${response.status}`);
      }

      return await response.json() as WhatsAppMessageResponse;
    } catch (error) {
      console.error("[WhatsApp Service] Erro ao enviar template:", error);
      throw error;
    }
  }

  /**
   * Envia uma imagem
   */
  static async sendImage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<WhatsAppMessageResponse> {
    const config = getConfig();
    const formattedNumber = this.formatNumber(to);
    
    const validation = this.validateNumber(to);
    if (!validation.valid) {
      throw new Error(`Número inválido: ${validation.reason}`);
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.accessToken}`,
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

      return await response.json() as WhatsAppMessageResponse;
    } catch (error) {
      console.error("[WhatsApp Service] Erro ao enviar imagem:", error);
      throw error;
    }
  }

  /**
   * Envia um documento
   */
  static async sendDocument(
    to: string,
    documentUrl: string,
    fileName: string,
    caption?: string
  ): Promise<WhatsAppMessageResponse> {
    const config = getConfig();
    const formattedNumber = this.formatNumber(to);
    
    const validation = this.validateNumber(to);
    if (!validation.valid) {
      throw new Error(`Número inválido: ${validation.reason}`);
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.accessToken}`,
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

      return await response.json() as WhatsAppMessageResponse;
    } catch (error) {
      console.error("[WhatsApp Service] Erro ao enviar documento:", error);
      throw error;
    }
  }

  /**
   * Obtém informações do perfil do número de telefone
   */
  static async getBusinessProfile(): Promise<WhatsAppBusinessProfile> {
    const config = getConfig();

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${config.phoneNumberId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating,platform_type,throughput`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${config.accessToken}`,
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
   * Verifica o status da API (faz uma chamada simples para validar token)
   */
  static async checkConnection(): Promise<{
    connected: boolean;
    profile?: WhatsAppBusinessProfile;
    error?: string;
  }> {
    try {
      const profile = await this.getBusinessProfile();
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
   * Lista templates disponíveis na conta
   */
  static async listTemplates(): Promise<Array<{
    name: string;
    status: string;
    category: string;
    language: string;
  }>> {
    const config = getConfig();
    
    if (!config.businessAccountId) {
      throw new Error("WHATSAPP_BUSINESS_ACCOUNT_ID é necessário para listar templates");
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/${config.businessAccountId}/message_templates?fields=name,status,category,language`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${config.accessToken}`,
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
}

// ============================================
// Templates de Mensagens para TeteCare
// ============================================

/**
 * Templates de mensagens pré-definidos.
 * 
 * IMPORTANTE: Para usar esses templates em produção, você precisa:
 * 1. Criar os templates no Meta Business Manager
 * 2. Aguardar aprovação da Meta (pode levar até 24h)
 * 3. Usar sendTemplate() com o nome exato do template aprovado
 * 
 * Esses exemplos são para referência e podem ser usados
 * como mensagens de texto em conversas ativas (janela de 24h).
 */
export const WhatsAppTemplates = {
  /**
   * Mensagem de check-in do pet
   */
  checkin: (petName: string, tutorName: string) =>
    `Olá ${tutorName}! 🐾\n\nO(a) ${petName} acabou de fazer check-in na TeteCare!\n\nQualquer novidade, entraremos em contato. Tenha um ótimo dia! 💙`,

  /**
   * Mensagem de check-out do pet
   */
  checkout: (petName: string, tutorName: string) =>
    `Olá ${tutorName}! 🐾\n\nO(a) ${petName} está pronto(a) para ir para casa!\n\nFoi um prazer cuidar do(a) seu(sua) pet hoje. Até a próxima! 💙`,

  /**
   * Lembrete de vacina
   */
  vaccineReminder: (petName: string, vaccineName: string, date: string) =>
    `🔔 Lembrete de Vacina\n\nOlá! O(a) ${petName} tem vacina de ${vaccineName} agendada para ${date}.\n\nNão se esqueça de trazer a carteirinha de vacinação! 💉`,

  /**
   * Lembrete de medicação
   */
  medicationReminder: (petName: string, medicationName: string, dosage: string) =>
    `💊 Lembrete de Medicação\n\nHora de dar ${medicationName} para o(a) ${petName}!\n\nDosagem: ${dosage}`,

  /**
   * Atualização do mural/daily log
   */
  dailyUpdate: (petName: string, updateType: string) =>
    `📸 Atualização de ${petName}\n\nAcabamos de publicar ${updateType} no mural do(a) ${petName}!\n\nAcesse o app para ver as novidades. 🐕`,

  /**
   * Confirmação de reserva
   */
  bookingConfirmation: (petName: string, date: string, service: string) =>
    `✅ Reserva Confirmada\n\nA reserva para ${petName} foi confirmada!\n\n📅 Data: ${date}\n🐾 Serviço: ${service}\n\nAguardamos vocês! 💙`,

  /**
   * Lembrete de reserva
   */
  bookingReminder: (petName: string, date: string, time: string) =>
    `⏰ Lembrete de Reserva\n\nOlá! Lembrando que amanhã (${date}) às ${time} você tem reserva para o(a) ${petName}.\n\nAté lá! 🐾`,

  /**
   * Alerta de comportamento
   */
  behaviorAlert: (petName: string, observation: string) =>
    `⚠️ Observação Importante\n\nNotamos algo sobre o(a) ${petName}:\n\n${observation}\n\nEntre em contato se precisar de mais informações.`,
};

// ============================================
// Nomes de Templates para Meta Business
// ============================================

/**
 * Nomes sugeridos para templates no Meta Business Manager.
 * Use esses nomes ao criar os templates para manter consistência.
 */
export const MetaTemplateNames = {
  CHECKIN: "tetecare_pet_checkin",
  CHECKOUT: "tetecare_pet_checkout",
  VACCINE_REMINDER: "tetecare_vaccine_reminder",
  MEDICATION_REMINDER: "tetecare_medication_reminder",
  DAILY_UPDATE: "tetecare_daily_update",
  BOOKING_CONFIRMATION: "tetecare_booking_confirmation",
  BOOKING_REMINDER: "tetecare_booking_reminder",
  BEHAVIOR_ALERT: "tetecare_behavior_alert",
  WELCOME: "tetecare_welcome",
};
