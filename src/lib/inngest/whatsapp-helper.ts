/**
 * Helper para enviar mensagens WhatsApp no contexto do Inngest
 * 
 * Este helper obtém credenciais das variáveis de ambiente e envia mensagens.
 */

import { WhatsAppService, WhatsAppCredentials } from "@/lib/services/whatsapp";

/**
 * Obtém credenciais do WhatsApp das variáveis de ambiente
 */
function getCredentials(): WhatsAppCredentials | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!accessToken || !phoneNumberId) {
    return null;
  }
  
  return {
    accessToken,
    phoneNumberId,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  };
}

/**
 * Envia uma mensagem de texto via WhatsApp
 * @returns O resultado da operação ou null se não houver credenciais
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const credentials = getCredentials();
  
  if (!credentials) {
    console.warn("[WhatsApp] Credenciais não configuradas");
    return { 
      success: false, 
      error: "WhatsApp credentials not configured" 
    };
  }
  
  try {
    const service = new WhatsAppService(credentials);
    const response = await service.sendText(to, message);
    
    return {
      success: true,
      messageId: response.messages?.[0]?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[WhatsApp] Error sending message:", errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}
