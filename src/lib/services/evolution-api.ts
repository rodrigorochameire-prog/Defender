/**
 * Evolution API Service
 * Cliente para comunicação com a Evolution API (WhatsApp)
 *
 * @see https://doc.evolution-api.com/
 */

// Variáveis de ambiente
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "ombuds";

// Headers padrão para requisições
const getHeaders = (apiKey?: string) => ({
  "Content-Type": "application/json",
  apikey: apiKey || EVOLUTION_API_KEY,
});

// Tipos
export interface EvolutionMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text: string };
    imageMessage?: {
      url?: string;
      mimetype?: string;
      caption?: string;
      mediaKey?: string;
    };
    audioMessage?: {
      url?: string;
      mimetype?: string;
      seconds?: number;
      ptt?: boolean;
    };
    videoMessage?: {
      url?: string;
      mimetype?: string;
      caption?: string;
    };
    documentMessage?: {
      url?: string;
      mimetype?: string;
      title?: string;
      fileName?: string;
    };
    stickerMessage?: {
      url?: string;
      mimetype?: string;
    };
    locationMessage?: {
      degreesLatitude?: number;
      degreesLongitude?: number;
      name?: string;
      address?: string;
    };
    contactMessage?: {
      displayName?: string;
      vcard?: string;
    };
  };
  messageType?:
    | "conversation"
    | "extendedTextMessage"
    | "imageMessage"
    | "audioMessage"
    | "videoMessage"
    | "documentMessage"
    | "stickerMessage"
    | "locationMessage"
    | "contactMessage";
  messageTimestamp?: number;
}

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: EvolutionMessage;
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
}

export interface ConnectionState {
  instance: string;
  state: "open" | "close" | "connecting" | "refused";
}

export interface QRCodeResponse {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

export interface SendMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: Record<string, unknown>;
  messageTimestamp: number;
  status: string;
}

export interface ProfilePicResponse {
  wpiUrl?: string;
  profilePictureUrl?: string;
}

// =============================================================================
// FUNÇÕES DE INSTÂNCIA
// =============================================================================

/**
 * Cria uma nova instância na Evolution API
 */
export async function createInstance(
  instanceName: string,
  options?: {
    apiKey?: string;
    webhookUrl?: string;
    qrcode?: boolean;
    integration?: string;
  }
): Promise<{ instance: { instanceName: string; status: string }; hash?: string; qrcode?: QRCodeResponse }> {
  const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
    method: "POST",
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify({
      instanceName,
      qrcode: options?.qrcode ?? true,
      integration: options?.integration ?? "WHATSAPP-BAILEYS",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao criar instância: ${error}`);
  }

  return response.json();
}

/**
 * Busca o QR Code para conexão
 */
export async function getQRCode(
  instanceName: string = EVOLUTION_INSTANCE,
  apiKey?: string
): Promise<QRCodeResponse> {
  const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
    method: "GET",
    headers: getHeaders(apiKey),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao buscar QR Code: ${error}`);
  }

  return response.json();
}

/**
 * Verifica o status da conexão
 */
export async function getConnectionStatus(
  instanceName: string = EVOLUTION_INSTANCE,
  apiKey?: string
): Promise<ConnectionState> {
  const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
    method: "GET",
    headers: getHeaders(apiKey),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao verificar status: ${error}`);
  }

  return response.json();
}

/**
 * Desconecta a instância (logout)
 */
export async function logoutInstance(
  instanceName: string = EVOLUTION_INSTANCE,
  apiKey?: string
): Promise<{ status: string }> {
  const response = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
    method: "DELETE",
    headers: getHeaders(apiKey),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao desconectar: ${error}`);
  }

  return response.json();
}

/**
 * Reinicia a instância
 */
export async function restartInstance(
  instanceName: string = EVOLUTION_INSTANCE,
  apiKey?: string
): Promise<{ status: string }> {
  const response = await fetch(`${EVOLUTION_API_URL}/instance/restart/${instanceName}`, {
    method: "PUT",
    headers: getHeaders(apiKey),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao reiniciar: ${error}`);
  }

  return response.json();
}

/**
 * Deleta a instância
 */
export async function deleteInstance(
  instanceName: string,
  apiKey?: string
): Promise<{ status: string }> {
  const response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
    method: "DELETE",
    headers: getHeaders(apiKey),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao deletar instância: ${error}`);
  }

  return response.json();
}

/**
 * Configura o webhook da instância
 */
export async function setWebhook(
  instanceName: string,
  webhookUrl: string,
  options?: {
    apiKey?: string;
    events?: string[];
    webhookByEvents?: boolean;
    webhookBase64?: boolean;
  }
): Promise<{ webhook: { url: string; events: string[] } }> {
  const response = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
    method: "POST",
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify({
      url: webhookUrl,
      webhook_by_events: options?.webhookByEvents ?? false,
      webhook_base64: options?.webhookBase64 ?? true,
      events: options?.events ?? [
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "MESSAGES_DELETE",
        "SEND_MESSAGE",
        "CONNECTION_UPDATE",
        "QRCODE_UPDATED",
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao configurar webhook: ${error}`);
  }

  return response.json();
}

// =============================================================================
// FUNÇÕES DE MENSAGEM
// =============================================================================

/**
 * Formata número de telefone para o padrão do WhatsApp
 */
export function formatPhoneNumber(phone: string): string {
  // Remove tudo que não é número
  const cleaned = phone.replace(/\D/g, "");

  // Se não começa com 55 (Brasil), adiciona
  if (!cleaned.startsWith("55")) {
    return `55${cleaned}@s.whatsapp.net`;
  }

  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Extrai número do remoteJid
 */
export function extractPhoneFromJid(jid: string): string {
  return jid.replace("@s.whatsapp.net", "").replace("@g.us", "");
}

/**
 * Envia mensagem de texto
 */
export async function sendText(
  to: string,
  text: string,
  options?: {
    instanceName?: string;
    apiKey?: string;
    delay?: number;
  }
): Promise<SendMessageResponse> {
  const instanceName = options?.instanceName || EVOLUTION_INSTANCE;
  const number = formatPhoneNumber(to);

  const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify({
      number: number.replace("@s.whatsapp.net", ""),
      text,
      delay: options?.delay,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao enviar mensagem: ${error}`);
  }

  return response.json();
}

/**
 * Envia imagem
 */
export async function sendImage(
  to: string,
  imageUrl: string,
  options?: {
    caption?: string;
    instanceName?: string;
    apiKey?: string;
  }
): Promise<SendMessageResponse> {
  const instanceName = options?.instanceName || EVOLUTION_INSTANCE;
  const number = formatPhoneNumber(to);

  const response = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
    method: "POST",
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify({
      number: number.replace("@s.whatsapp.net", ""),
      mediatype: "image",
      media: imageUrl,
      caption: options?.caption,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao enviar imagem: ${error}`);
  }

  return response.json();
}

/**
 * Envia documento/arquivo
 */
export async function sendDocument(
  to: string,
  documentUrl: string,
  filename: string,
  options?: {
    caption?: string;
    instanceName?: string;
    apiKey?: string;
  }
): Promise<SendMessageResponse> {
  const instanceName = options?.instanceName || EVOLUTION_INSTANCE;
  const number = formatPhoneNumber(to);

  const response = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
    method: "POST",
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify({
      number: number.replace("@s.whatsapp.net", ""),
      mediatype: "document",
      media: documentUrl,
      fileName: filename,
      caption: options?.caption,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao enviar documento: ${error}`);
  }

  return response.json();
}

/**
 * Envia áudio (voice message)
 */
export async function sendAudio(
  to: string,
  audioUrl: string,
  options?: {
    ptt?: boolean; // Push to talk (voice message)
    instanceName?: string;
    apiKey?: string;
  }
): Promise<SendMessageResponse> {
  const instanceName = options?.instanceName || EVOLUTION_INSTANCE;
  const number = formatPhoneNumber(to);

  const response = await fetch(`${EVOLUTION_API_URL}/message/sendWhatsAppAudio/${instanceName}`, {
    method: "POST",
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify({
      number: number.replace("@s.whatsapp.net", ""),
      audio: audioUrl,
      encoding: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao enviar áudio: ${error}`);
  }

  return response.json();
}

/**
 * Envia vídeo
 */
export async function sendVideo(
  to: string,
  videoUrl: string,
  options?: {
    caption?: string;
    instanceName?: string;
    apiKey?: string;
  }
): Promise<SendMessageResponse> {
  const instanceName = options?.instanceName || EVOLUTION_INSTANCE;
  const number = formatPhoneNumber(to);

  const response = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
    method: "POST",
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify({
      number: number.replace("@s.whatsapp.net", ""),
      mediatype: "video",
      media: videoUrl,
      caption: options?.caption,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao enviar vídeo: ${error}`);
  }

  return response.json();
}

/**
 * Envia localização
 */
export async function sendLocation(
  to: string,
  latitude: number,
  longitude: number,
  options?: {
    name?: string;
    address?: string;
    instanceName?: string;
    apiKey?: string;
  }
): Promise<SendMessageResponse> {
  const instanceName = options?.instanceName || EVOLUTION_INSTANCE;
  const number = formatPhoneNumber(to);

  const response = await fetch(`${EVOLUTION_API_URL}/message/sendLocation/${instanceName}`, {
    method: "POST",
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify({
      number: number.replace("@s.whatsapp.net", ""),
      latitude,
      longitude,
      name: options?.name,
      address: options?.address,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao enviar localização: ${error}`);
  }

  return response.json();
}

/**
 * Envia contato (vCard)
 */
export async function sendContact(
  to: string,
  contactName: string,
  contactPhone: string,
  options?: {
    instanceName?: string;
    apiKey?: string;
  }
): Promise<SendMessageResponse> {
  const instanceName = options?.instanceName || EVOLUTION_INSTANCE;
  const number = formatPhoneNumber(to);

  const response = await fetch(`${EVOLUTION_API_URL}/message/sendContact/${instanceName}`, {
    method: "POST",
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify({
      number: number.replace("@s.whatsapp.net", ""),
      contact: [
        {
          fullName: contactName,
          wuid: formatPhoneNumber(contactPhone).replace("@s.whatsapp.net", ""),
          phoneNumber: contactPhone,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao enviar contato: ${error}`);
  }

  return response.json();
}

// =============================================================================
// FUNÇÕES DE CHAT
// =============================================================================

/**
 * Marca mensagens como lidas
 */
export async function markAsRead(
  remoteJid: string,
  options?: {
    instanceName?: string;
    apiKey?: string;
  }
): Promise<{ read: boolean }> {
  const instanceName = options?.instanceName || EVOLUTION_INSTANCE;

  const response = await fetch(`${EVOLUTION_API_URL}/chat/markMessageAsRead/${instanceName}`, {
    method: "PUT",
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify({
      readMessages: [
        {
          remoteJid,
          fromMe: false,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao marcar como lido: ${error}`);
  }

  return response.json();
}

/**
 * Busca foto de perfil de um contato
 */
export async function getProfilePic(
  phone: string,
  options?: {
    instanceName?: string;
    apiKey?: string;
  }
): Promise<ProfilePicResponse> {
  const instanceName = options?.instanceName || EVOLUTION_INSTANCE;
  const number = formatPhoneNumber(phone).replace("@s.whatsapp.net", "");

  const response = await fetch(`${EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${instanceName}`, {
    method: "POST",
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify({ number }),
  });

  if (!response.ok) {
    // Não lança erro se não encontrar foto
    return {};
  }

  return response.json();
}

/**
 * Verifica se um número existe no WhatsApp
 */
export async function checkNumberExists(
  phone: string,
  options?: {
    instanceName?: string;
    apiKey?: string;
  }
): Promise<{ exists: boolean; jid?: string }> {
  const instanceName = options?.instanceName || EVOLUTION_INSTANCE;
  const number = formatPhoneNumber(phone).replace("@s.whatsapp.net", "");

  const response = await fetch(`${EVOLUTION_API_URL}/chat/whatsappNumbers/${instanceName}`, {
    method: "POST",
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify({ numbers: [number] }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao verificar número: ${error}`);
  }

  const result = await response.json();
  const numberInfo = result[0];

  return {
    exists: numberInfo?.exists ?? false,
    jid: numberInfo?.jid,
  };
}

/**
 * Busca histórico de mensagens de um chat
 */
export async function fetchMessages(
  remoteJid: string,
  options?: {
    limit?: number;
    instanceName?: string;
    apiKey?: string;
  }
): Promise<EvolutionMessage[]> {
  const instanceName = options?.instanceName || EVOLUTION_INSTANCE;

  const response = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`, {
    method: "POST",
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify({
      where: {
        key: {
          remoteJid,
        },
      },
      limit: options?.limit ?? 50,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao buscar mensagens: ${error}`);
  }

  return response.json();
}

/**
 * Arquiva/desarquiva um chat
 */
export async function archiveChat(
  remoteJid: string,
  archive: boolean,
  options?: {
    instanceName?: string;
    apiKey?: string;
  }
): Promise<{ archived: boolean }> {
  const instanceName = options?.instanceName || EVOLUTION_INSTANCE;

  const response = await fetch(`${EVOLUTION_API_URL}/chat/archiveChat/${instanceName}`, {
    method: "PUT",
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify({
      lastMessage: {
        key: { remoteJid },
      },
      archive,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao arquivar chat: ${error}`);
  }

  return response.json();
}

// =============================================================================
// HELPERS PARA PROCESSAMENTO DE WEBHOOK
// =============================================================================

/**
 * Extrai o texto da mensagem do payload do webhook
 */
export function extractMessageText(message: EvolutionMessage): string | null {
  if (!message.message) return null;

  if (message.message.conversation) {
    return message.message.conversation;
  }

  if (message.message.extendedTextMessage?.text) {
    return message.message.extendedTextMessage.text;
  }

  if (message.message.imageMessage?.caption) {
    return message.message.imageMessage.caption;
  }

  if (message.message.videoMessage?.caption) {
    return message.message.videoMessage.caption;
  }

  if (message.message.documentMessage?.title) {
    return message.message.documentMessage.title;
  }

  return null;
}

/**
 * Determina o tipo da mensagem
 */
export function getMessageType(
  message: EvolutionMessage
): "text" | "image" | "audio" | "video" | "document" | "sticker" | "location" | "contact" | "unknown" {
  if (!message.message) return "unknown";

  if (message.message.conversation || message.message.extendedTextMessage) {
    return "text";
  }
  if (message.message.imageMessage) return "image";
  if (message.message.audioMessage) return "audio";
  if (message.message.videoMessage) return "video";
  if (message.message.documentMessage) return "document";
  if (message.message.stickerMessage) return "sticker";
  if (message.message.locationMessage) return "location";
  if (message.message.contactMessage) return "contact";

  return "unknown";
}

/**
 * Extrai a URL da mídia da mensagem
 */
export function extractMediaUrl(message: EvolutionMessage): string | null {
  if (!message.message) return null;

  if (message.message.imageMessage?.url) {
    return message.message.imageMessage.url;
  }
  if (message.message.audioMessage?.url) {
    return message.message.audioMessage.url;
  }
  if (message.message.videoMessage?.url) {
    return message.message.videoMessage.url;
  }
  if (message.message.documentMessage?.url) {
    return message.message.documentMessage.url;
  }
  if (message.message.stickerMessage?.url) {
    return message.message.stickerMessage.url;
  }

  return null;
}

/**
 * Extrai informações de mídia da mensagem
 */
export function extractMediaInfo(message: EvolutionMessage): {
  url: string | null;
  mimeType: string | null;
  filename: string | null;
} {
  if (!message.message) {
    return { url: null, mimeType: null, filename: null };
  }

  if (message.message.imageMessage) {
    return {
      url: message.message.imageMessage.url || null,
      mimeType: message.message.imageMessage.mimetype || null,
      filename: null,
    };
  }

  if (message.message.audioMessage) {
    return {
      url: message.message.audioMessage.url || null,
      mimeType: message.message.audioMessage.mimetype || null,
      filename: null,
    };
  }

  if (message.message.videoMessage) {
    return {
      url: message.message.videoMessage.url || null,
      mimeType: message.message.videoMessage.mimetype || null,
      filename: null,
    };
  }

  if (message.message.documentMessage) {
    return {
      url: message.message.documentMessage.url || null,
      mimeType: message.message.documentMessage.mimetype || null,
      filename: message.message.documentMessage.fileName || message.message.documentMessage.title || null,
    };
  }

  if (message.message.stickerMessage) {
    return {
      url: message.message.stickerMessage.url || null,
      mimeType: message.message.stickerMessage.mimetype || null,
      filename: null,
    };
  }

  return { url: null, mimeType: null, filename: null };
}

// =============================================================================
// CLASSE CLIENTE (ALTERNATIVA OOP)
// =============================================================================

export class EvolutionApiClient {
  private apiUrl: string;
  private apiKey: string;
  private instanceName: string;

  constructor(options?: { apiUrl?: string; apiKey?: string; instanceName?: string }) {
    this.apiUrl = options?.apiUrl || EVOLUTION_API_URL;
    this.apiKey = options?.apiKey || EVOLUTION_API_KEY;
    this.instanceName = options?.instanceName || EVOLUTION_INSTANCE;
  }

  private get headers() {
    return getHeaders(this.apiKey);
  }

  // Instance methods
  async getConnectionStatus() {
    return getConnectionStatus(this.instanceName, this.apiKey);
  }

  async getQRCode() {
    return getQRCode(this.instanceName, this.apiKey);
  }

  async logout() {
    return logoutInstance(this.instanceName, this.apiKey);
  }

  async restart() {
    return restartInstance(this.instanceName, this.apiKey);
  }

  async setWebhook(webhookUrl: string, events?: string[]) {
    return setWebhook(this.instanceName, webhookUrl, { apiKey: this.apiKey, events });
  }

  // Message methods
  async sendText(to: string, text: string, delay?: number) {
    return sendText(to, text, { instanceName: this.instanceName, apiKey: this.apiKey, delay });
  }

  async sendImage(to: string, imageUrl: string, caption?: string) {
    return sendImage(to, imageUrl, { instanceName: this.instanceName, apiKey: this.apiKey, caption });
  }

  async sendDocument(to: string, documentUrl: string, filename: string, caption?: string) {
    return sendDocument(to, documentUrl, filename, {
      instanceName: this.instanceName,
      apiKey: this.apiKey,
      caption,
    });
  }

  async sendAudio(to: string, audioUrl: string) {
    return sendAudio(to, audioUrl, { instanceName: this.instanceName, apiKey: this.apiKey });
  }

  async sendVideo(to: string, videoUrl: string, caption?: string) {
    return sendVideo(to, videoUrl, { instanceName: this.instanceName, apiKey: this.apiKey, caption });
  }

  async sendLocation(to: string, latitude: number, longitude: number, name?: string, address?: string) {
    return sendLocation(to, latitude, longitude, {
      instanceName: this.instanceName,
      apiKey: this.apiKey,
      name,
      address,
    });
  }

  async sendContact(to: string, contactName: string, contactPhone: string) {
    return sendContact(to, contactName, contactPhone, {
      instanceName: this.instanceName,
      apiKey: this.apiKey,
    });
  }

  // Chat methods
  async markAsRead(remoteJid: string) {
    return markAsRead(remoteJid, { instanceName: this.instanceName, apiKey: this.apiKey });
  }

  async getProfilePic(phone: string) {
    return getProfilePic(phone, { instanceName: this.instanceName, apiKey: this.apiKey });
  }

  async checkNumberExists(phone: string) {
    return checkNumberExists(phone, { instanceName: this.instanceName, apiKey: this.apiKey });
  }

  async fetchMessages(remoteJid: string, limit?: number) {
    return fetchMessages(remoteJid, { instanceName: this.instanceName, apiKey: this.apiKey, limit });
  }

  async archiveChat(remoteJid: string, archive: boolean) {
    return archiveChat(remoteJid, archive, { instanceName: this.instanceName, apiKey: this.apiKey });
  }
}

// Export default client instance
export const evolutionApi = new EvolutionApiClient();
