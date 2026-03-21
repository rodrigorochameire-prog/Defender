/**
 * Router tRPC para Chat WhatsApp via Evolution API
 *
 * Gerencia conversas, mensagens e configurações da instância Evolution
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  evolutionConfig,
  whatsappContacts,
  whatsappChatMessages,
  whatsappTemplates,
  assistidos,
  processos,
  assistidosProcessos,
  anotacoes,
  driveFiles,
} from "@/lib/db/schema";
import { eq, and, desc, like, ilike, sql, or, lt, ne, inArray, asc } from "drizzle-orm";
import { uploadFileBuffer } from "@/lib/services/google-drive";
import {
  EvolutionApiClient,
  sendText,
  sendImage,
  sendDocument,
  sendAudio,
  sendVideo,
  sendLocation,
  sendContact,
  markAsRead,
  getProfilePic,
  checkNumberExists,
  createInstance,
  setWebhook,
  deleteInstance,
  formatPhoneNumber,
} from "@/lib/services/evolution-api";

// =============================================================================
// SCHEMAS DE VALIDAÇÃO
// =============================================================================

const createConfigSchema = z.object({
  instanceName: z.string().min(3).max(100),
  apiUrl: z.string().url(),
  apiKey: z.string().min(1),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(),
  autoReply: z.boolean().optional(),
  autoReplyMessage: z.string().optional(),
});

const updateConfigSchema = z.object({
  id: z.number(),
  apiUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(),
  autoReply: z.boolean().optional(),
  autoReplyMessage: z.string().optional(),
});

const sendMessageSchema = z.object({
  contactId: z.number(),
  type: z.enum(["text", "image", "document", "audio", "video", "location", "contact"]),
  content: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  filename: z.string().optional(),
  caption: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
});

const contactFilterSchema = z.object({
  configId: z.number(),
  search: z.string().optional(),
  isArchived: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  hasUnread: z.boolean().optional(),
  hasConversation: z.boolean().optional(),
  assistidoId: z.number().optional(),
  tag: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

const importHistorySchema = z.object({
  configId: z.number(),
  jsonContent: z.string().min(1),
});

// =============================================================================
// ROUTER
// =============================================================================

export const whatsappChatRouter = router({
  // ===========================================================================
  // CONFIGURAÇÃO DA INSTÂNCIA
  // ===========================================================================

  /**
   * Lista todas as configurações de instância
   */
  listConfigs: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.user.role === "admin";
    const configs = await db
      .select()
      .from(evolutionConfig)
      .where(isAdmin ? undefined : eq(evolutionConfig.createdById, ctx.user.id))
      .orderBy(desc(evolutionConfig.createdAt));

    return configs;
  }),

  /**
   * Busca configuração por ID
   */
  getConfig: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
    const isAdmin = ctx.user.role === "admin";
    const [config] = await db
      .select()
      .from(evolutionConfig)
      .where(
        and(
          eq(evolutionConfig.id, input.id),
          isAdmin ? undefined : eq(evolutionConfig.createdById, ctx.user.id),
        )
      )
      .limit(1);

    if (!config) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Configuração não encontrada" });
    }

    return config;
  }),

  /**
   * Cria nova configuração de instância
   */
  createConfig: protectedProcedure.input(createConfigSchema).mutation(async ({ ctx, input }) => {
    // Verifica se já existe instância com mesmo nome
    const [existing] = await db
      .select()
      .from(evolutionConfig)
      .where(eq(evolutionConfig.instanceName, input.instanceName))
      .limit(1);

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Já existe uma instância com esse nome",
      });
    }

    // Cria instância na Evolution API
    try {
      await createInstance(input.instanceName, {
        apiKey: input.apiKey,
        webhookUrl: input.webhookUrl,
        qrcode: true,
      });
    } catch (error) {
      console.error("Erro ao criar instância na Evolution API:", error);
      // Continua mesmo se falhar, pois a instância pode já existir
    }

    // Salva configuração no banco
    const [config] = await db
      .insert(evolutionConfig)
      .values({
        instanceName: input.instanceName,
        apiUrl: input.apiUrl,
        apiKey: input.apiKey,
        webhookUrl: input.webhookUrl,
        webhookSecret: input.webhookSecret,
        autoReply: input.autoReply ?? false,
        autoReplyMessage: input.autoReplyMessage,
        createdById: ctx.user.id,
      })
      .returning();

    // Configura webhook se URL foi fornecida
    if (input.webhookUrl) {
      try {
        await setWebhook(input.instanceName, input.webhookUrl, { apiKey: input.apiKey });
      } catch (error) {
        console.error("Erro ao configurar webhook:", error);
      }
    }

    return config;
  }),

  /**
   * Atualiza configuração de instância
   */
  updateConfig: protectedProcedure.input(updateConfigSchema).mutation(async ({ input }) => {
    const { id, ...data } = input;

    const [config] = await db
      .update(evolutionConfig)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(evolutionConfig.id, id))
      .returning();

    if (!config) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Configuração não encontrada" });
    }

    return config;
  }),

  /**
   * Deleta configuração de instância
   */
  deleteConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [config] = await db
        .select()
        .from(evolutionConfig)
        .where(eq(evolutionConfig.id, input.id))
        .limit(1);

      if (!config) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Configuração não encontrada" });
      }

      // Tenta deletar instância na Evolution API
      try {
        await deleteInstance(config.instanceName, config.apiKey);
      } catch (error) {
        console.error("Erro ao deletar instância na Evolution API:", error);
      }

      // Deleta do banco (cascade vai deletar contatos e mensagens)
      await db.delete(evolutionConfig).where(eq(evolutionConfig.id, input.id));

      return { success: true };
    }),

  /**
   * Busca status de conexão da instância
   */
  getConnectionStatus: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .query(async ({ input }) => {
      const [config] = await db
        .select()
        .from(evolutionConfig)
        .where(eq(evolutionConfig.id, input.configId))
        .limit(1);

      if (!config) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Configuração não encontrada" });
      }

      try {
        // Usa EvolutionApiClient com URL e apiKey do banco de dados
        const client = new EvolutionApiClient({
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName,
        });
        const status = await client.getConnectionStatus();

        // Atualiza status no banco
        await db
          .update(evolutionConfig)
          .set({
            status: status.state === "open" ? "connected" : "disconnected",
            isActive: status.state === "open",
            updatedAt: new Date(),
          })
          .where(eq(evolutionConfig.id, input.configId));

        return status;
      } catch (error) {
        return {
          instance: config.instanceName,
          state: "close" as const,
        };
      }
    }),

  /**
   * Busca QR Code para conexão
   */
  getQRCode: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .query(async ({ input }) => {
      const [config] = await db
        .select()
        .from(evolutionConfig)
        .where(eq(evolutionConfig.id, input.configId))
        .limit(1);

      if (!config) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Configuração não encontrada" });
      }

      try {
        // Usa EvolutionApiClient com URL e apiKey do banco de dados
        const client = new EvolutionApiClient({
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName,
        });
        const qrCode = await client.getQRCode();

        // Salva QR Code no banco
        if (qrCode.base64) {
          await db
            .update(evolutionConfig)
            .set({
              qrCode: qrCode.base64,
              status: "waiting_qr",
              updatedAt: new Date(),
            })
            .where(eq(evolutionConfig.id, input.configId));
        }

        return qrCode;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar QR Code",
        });
      }
    }),

  /**
   * Desconecta instância (logout)
   */
  logout: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .mutation(async ({ input }) => {
      const [config] = await db
        .select()
        .from(evolutionConfig)
        .where(eq(evolutionConfig.id, input.configId))
        .limit(1);

      if (!config) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Configuração não encontrada" });
      }

      try {
        // Usa EvolutionApiClient com URL e apiKey do banco de dados
        const client = new EvolutionApiClient({
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName,
        });
        await client.logout();

        await db
          .update(evolutionConfig)
          .set({
            status: "disconnected",
            isActive: false,
            qrCode: null,
            updatedAt: new Date(),
          })
          .where(eq(evolutionConfig.id, input.configId));

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao desconectar",
        });
      }
    }),

  /**
   * Reinicia instância
   */
  restart: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .mutation(async ({ input }) => {
      const [config] = await db
        .select()
        .from(evolutionConfig)
        .where(eq(evolutionConfig.id, input.configId))
        .limit(1);

      if (!config) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Configuração não encontrada" });
      }

      try {
        // Usa EvolutionApiClient com URL e apiKey do banco de dados
        const client = new EvolutionApiClient({
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName,
        });
        await client.restart();

        await db
          .update(evolutionConfig)
          .set({
            status: "connecting",
            updatedAt: new Date(),
          })
          .where(eq(evolutionConfig.id, input.configId));

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao reiniciar",
        });
      }
    }),

  // ===========================================================================
  // CONTATOS
  // ===========================================================================

  /**
   * Lista contatos com filtros
   */
  listContacts: protectedProcedure.input(contactFilterSchema).query(async ({ input }) => {
    const {
      configId,
      search,
      isArchived,
      isFavorite,
      hasUnread,
      hasConversation,
      assistidoId,
      tag,
      limit = 50,
      offset = 0,
    } = input;

    // Monta condições de filtro
    const conditions = [eq(whatsappContacts.configId, configId)];

    if (isArchived !== undefined) {
      conditions.push(eq(whatsappContacts.isArchived, isArchived));
    }

    if (isFavorite !== undefined) {
      conditions.push(eq(whatsappContacts.isFavorite, isFavorite));
    }

    if (hasUnread) {
      conditions.push(sql`${whatsappContacts.unreadCount} > 0`);
    }

    if (hasConversation) {
      conditions.push(sql`${whatsappContacts.lastMessageAt} IS NOT NULL`);
    }

    if (assistidoId) {
      conditions.push(eq(whatsappContacts.assistidoId, assistidoId));
    }

    if (tag) {
      conditions.push(sql`${whatsappContacts.tags} @> ARRAY[${tag}]::text[]`);
    }

    if (search) {
      conditions.push(
        or(
          like(whatsappContacts.phone, `%${search}%`),
          like(whatsappContacts.name, `%${search}%`),
          like(whatsappContacts.pushName, `%${search}%`)
        )!
      );
    }

    // Busca contatos
    const contacts = await db
      .select({
        contact: whatsappContacts,
        assistido: {
          id: assistidos.id,
          nome: assistidos.nome,
        },
      })
      .from(whatsappContacts)
      .leftJoin(assistidos, eq(whatsappContacts.assistidoId, assistidos.id))
      .where(and(...conditions))
      .orderBy(desc(whatsappContacts.lastMessageAt))
      .limit(limit)
      .offset(offset);

    // Conta total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(whatsappContacts)
      .where(and(...conditions));

    return {
      contacts: contacts.map((c) => ({
        ...c.contact,
        assistido: c.assistido,
      })),
      total: Number(count),
    };
  }),

  /**
   * Lista contatos aguardando resposta (ultima mensagem inbound, nao arquivados)
   * Ordenados do mais antigo para o mais recente (mais urgente primeiro)
   */
  listPendingContacts: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .query(async ({ input }) => {
      const contacts = await db
        .select({
          contact: whatsappContacts,
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
          },
        })
        .from(whatsappContacts)
        .leftJoin(assistidos, eq(whatsappContacts.assistidoId, assistidos.id))
        .where(
          and(
            eq(whatsappContacts.configId, input.configId),
            eq(whatsappContacts.lastMessageDirection, "inbound"),
            eq(whatsappContacts.isArchived, false)
          )
        )
        .orderBy(asc(whatsappContacts.lastMessageAt))
        .limit(10);

      return contacts.map((c) => ({
        ...c.contact,
        assistido: c.assistido,
      }));
    }),

  /**
   * Busca contato por ID
   */
  getContact: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [result] = await db
        .select({
          contact: whatsappContacts,
          assistido: assistidos,
        })
        .from(whatsappContacts)
        .leftJoin(assistidos, eq(whatsappContacts.assistidoId, assistidos.id))
        .where(eq(whatsappContacts.id, input.id))
        .limit(1);

      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contato não encontrado" });
      }

      return {
        ...result.contact,
        assistido: result.assistido,
      };
    }),

  /**
   * Cria novo contato
   */
  createContact: protectedProcedure
    .input(
      z.object({
        configId: z.number(),
        phone: z.string().min(10),
        name: z.string().optional(),
        assistidoId: z.number().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Verifica se configuração existe
      const [config] = await db
        .select()
        .from(evolutionConfig)
        .where(eq(evolutionConfig.id, input.configId))
        .limit(1);

      if (!config) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Configuração não encontrada" });
      }

      // Formata número
      const phone = input.phone.replace(/\D/g, "");

      // Verifica se contato já existe
      const [existing] = await db
        .select()
        .from(whatsappContacts)
        .where(and(eq(whatsappContacts.configId, input.configId), eq(whatsappContacts.phone, phone)))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Contato já existe",
        });
      }

      // Verifica se número existe no WhatsApp
      try {
        const { exists } = await checkNumberExists(phone, {
          instanceName: config.instanceName,
          apiKey: config.apiKey,
        });

        if (!exists) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este número não está registrado no WhatsApp",
          });
        }
      } catch (error) {
        // Continua mesmo se verificação falhar
        console.warn("Não foi possível verificar se número existe no WhatsApp:", error);
      }

      // Busca foto de perfil
      let profilePicUrl: string | null = null;
      try {
        const pic = await getProfilePic(phone, {
          instanceName: config.instanceName,
          apiKey: config.apiKey,
        });
        profilePicUrl = pic.profilePictureUrl || pic.wpiUrl || null;
      } catch (error) {
        // Ignora erro de foto de perfil
      }

      // Cria contato
      const [contact] = await db
        .insert(whatsappContacts)
        .values({
          configId: input.configId,
          phone,
          name: input.name,
          profilePicUrl,
          assistidoId: input.assistidoId,
          tags: input.tags,
          notes: input.notes,
        })
        .returning();

      return contact;
    }),

  /**
   * Atualiza contato
   */
  updateContact: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        assistidoId: z.number().nullable().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
        isArchived: z.boolean().optional(),
        isFavorite: z.boolean().optional(),
        contactRelation: z.enum(["proprio", "familiar", "testemunha", "correu", "outro"]).optional(),
        contactRelationDetail: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [contact] = await db
        .update(whatsappContacts)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(whatsappContacts.id, id))
        .returning();

      if (!contact) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contato não encontrado" });
      }

      return contact;
    }),

  /**
   * Deleta contato
   */
  deleteContact: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(whatsappContacts).where(eq(whatsappContacts.id, input.id));
      return { success: true };
    }),

  /**
   * Marca todas as mensagens de um contato como lidas
   */
  markContactAsRead: protectedProcedure
    .input(z.object({ contactId: z.number() }))
    .mutation(async ({ input }) => {
      const [contact] = await db
        .select({
          contact: whatsappContacts,
          config: evolutionConfig,
        })
        .from(whatsappContacts)
        .innerJoin(evolutionConfig, eq(whatsappContacts.configId, evolutionConfig.id))
        .where(eq(whatsappContacts.id, input.contactId))
        .limit(1);

      if (!contact) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contato não encontrado" });
      }

      // Zera contador de não lidas
      await db
        .update(whatsappContacts)
        .set({ unreadCount: 0, updatedAt: new Date() })
        .where(eq(whatsappContacts.id, input.contactId));

      // Marca como lido na Evolution API
      try {
        const remoteJid = formatPhoneNumber(contact.contact.phone);
        await markAsRead(remoteJid, {
          instanceName: contact.config.instanceName,
          apiKey: contact.config.apiKey,
        });
      } catch {
        // Falha ao marcar como lido é não-crítica — ignora silenciosamente
      }

      return { success: true };
    }),

  /**
   * Vincula contato a um assistido
   */
  linkToAssistido: protectedProcedure
    .input(
      z.object({
        contactId: z.number(),
        assistidoId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const [contact] = await db
        .update(whatsappContacts)
        .set({
          assistidoId: input.assistidoId,
          updatedAt: new Date(),
        })
        .where(eq(whatsappContacts.id, input.contactId))
        .returning();

      if (!contact) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contato não encontrado" });
      }

      return contact;
    }),

  // ===========================================================================
  // MENSAGENS
  // ===========================================================================

  /**
   * Lista mensagens de um contato
   */
  listMessages: protectedProcedure
    .input(
      z.object({
        contactId: z.number(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
        beforeId: z.number().optional(), // Legacy: alias for cursor (loads older messages)
        cursor: z.number().optional(), // Cursor-based pagination: ID-based, loads messages with id < cursor (older)
      })
    )
    .query(async ({ input }) => {
      const { contactId, limit = 50, offset = 0, beforeId, cursor } = input;

      const conditions = [eq(whatsappChatMessages.contactId, contactId)];

      // Cursor takes precedence over beforeId (both do the same thing)
      const cursorId = cursor ?? beforeId;
      if (cursorId) {
        conditions.push(lt(whatsappChatMessages.id, cursorId));
      }

      // Fetch one extra to determine if there are more results
      const fetchLimit = cursorId ? limit + 1 : limit;

      const messages = await db
        .select()
        .from(whatsappChatMessages)
        .where(and(...conditions))
        .orderBy(desc(whatsappChatMessages.id))
        .limit(fetchLimit)
        .offset(cursorId ? 0 : offset); // When using cursor, ignore offset

      // Detect if there are more messages beyond this page
      const hasMore = cursorId ? messages.length > limit : messages.length === limit;
      if (cursorId && messages.length > limit) {
        messages.pop(); // Remove the extra detection item
      }

      // Conta total (only when not using cursor, to avoid expensive COUNT on every scroll)
      let total: number | null = null;
      if (!cursorId) {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(whatsappChatMessages)
          .where(eq(whatsappChatMessages.contactId, contactId));
        total = Number(count);
      }

      // nextCursor = the smallest ID in the current page (for loading older messages)
      const nextCursor = hasMore && messages.length > 0
        ? messages[messages.length - 1].id
        : null;

      // Retorna em ordem cronológica
      return {
        messages: messages.reverse(),
        total: total ?? 0,
        hasMore,
        nextCursor,
      };
    }),

  /**
   * Envia mensagem
   */
  sendMessage: protectedProcedure.input(sendMessageSchema).mutation(async ({ input }) => {
    const { contactId, type, content, ...mediaData } = input;

    // Busca contato e configuração
    const [result] = await db
      .select({
        contact: whatsappContacts,
        config: evolutionConfig,
      })
      .from(whatsappContacts)
      .innerJoin(evolutionConfig, eq(whatsappContacts.configId, evolutionConfig.id))
      .where(eq(whatsappContacts.id, contactId))
      .limit(1);

    if (!result) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Contato não encontrado" });
    }

    const { contact, config } = result;
    const options = { instanceName: config.instanceName, apiKey: config.apiKey };

    let response;
    let messageContent = content || "";

    try {
      switch (type) {
        case "text":
          if (!content) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Conteúdo é obrigatório para mensagem de texto" });
          }
          response = await sendText(contact.phone, content, options);
          break;

        case "image":
          if (!mediaData.mediaUrl) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "URL da imagem é obrigatória" });
          }
          response = await sendImage(contact.phone, mediaData.mediaUrl, {
            ...options,
            caption: mediaData.caption,
          });
          messageContent = mediaData.caption || "[Imagem]";
          break;

        case "document":
          if (!mediaData.mediaUrl || !mediaData.filename) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "URL e nome do arquivo são obrigatórios",
            });
          }
          response = await sendDocument(contact.phone, mediaData.mediaUrl, mediaData.filename, {
            ...options,
            caption: mediaData.caption,
          });
          messageContent = mediaData.caption || `[Documento: ${mediaData.filename}]`;
          break;

        case "audio":
          if (!mediaData.mediaUrl) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "URL do áudio é obrigatória" });
          }
          response = await sendAudio(contact.phone, mediaData.mediaUrl, options);
          messageContent = "[Áudio]";
          break;

        case "video":
          if (!mediaData.mediaUrl) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "URL do vídeo é obrigatória" });
          }
          response = await sendVideo(contact.phone, mediaData.mediaUrl, {
            ...options,
            caption: mediaData.caption,
          });
          messageContent = mediaData.caption || "[Vídeo]";
          break;

        case "location":
          if (mediaData.latitude === undefined || mediaData.longitude === undefined) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Latitude e longitude são obrigatórias",
            });
          }
          response = await sendLocation(
            contact.phone,
            mediaData.latitude,
            mediaData.longitude,
            {
              ...options,
              name: mediaData.locationName,
              address: mediaData.locationAddress,
            }
          );
          messageContent = `[Localização: ${mediaData.locationName || ""}]`;
          break;

        case "contact":
          if (!mediaData.contactName || !mediaData.contactPhone) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Nome e telefone do contato são obrigatórios",
            });
          }
          response = await sendContact(
            contact.phone,
            mediaData.contactName,
            mediaData.contactPhone,
            options
          );
          messageContent = `[Contato: ${mediaData.contactName}]`;
          break;

        default:
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tipo de mensagem inválido" });
      }

      // Salva mensagem no banco
      const [message] = await db
        .insert(whatsappChatMessages)
        .values({
          contactId,
          waMessageId: response.key.id,
          direction: "outbound",
          type,
          content: messageContent,
          mediaUrl: mediaData.mediaUrl,
          mediaFilename: mediaData.filename,
          status: "sent",
          metadata: { response },
        })
        .returning();

      // Atualiza lastMessageAt do contato
      await db
        .update(whatsappContacts)
        .set({ lastMessageAt: new Date(), updatedAt: new Date() })
        .where(eq(whatsappContacts.id, contactId));

      return message;
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Erro ao enviar mensagem",
      });
    }
  }),

  /**
   * Deleta mensagem (apenas do banco local)
   */
  deleteMessage: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(whatsappChatMessages).where(eq(whatsappChatMessages.id, input.id));
      return { success: true };
    }),

  // ===========================================================================
  // SINCRONIZAÇÃO
  // ===========================================================================

  /**
   * Sincroniza contatos da Evolution API com o banco local
   */
  syncContacts: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .mutation(async ({ input }) => {
      const [config] = await db
        .select()
        .from(evolutionConfig)
        .where(eq(evolutionConfig.id, input.configId))
        .limit(1);

      if (!config) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Configuração não encontrada" });
      }

      // Cria cliente Evolution API
      const client = new EvolutionApiClient({
        apiUrl: config.apiUrl,
        apiKey: config.apiKey,
        instanceName: config.instanceName,
      });

      // Busca chats (conversas reais) e contatos (nomes/fotos) da Evolution API
      const [chats, contacts] = await Promise.all([
        client.findChats().catch(() => []),
        client.findContacts().catch(() => []),
      ]);

      // Mapa phone -> info do contato (nome/foto)
      const contactMap = new Map<string, { pushName?: string; profilePictureUrl?: string | null }>();
      for (const c of contacts) {
        if (c.id && c.id.endsWith("@s.whatsapp.net")) {
          const phone = c.id.replace("@s.whatsapp.net", "");
          contactMap.set(phone, { pushName: c.pushName, profilePictureUrl: c.profilePictureUrl });
        }
      }

      // Filtra apenas chats individuais (não grupos)
      const individualChats = chats.filter(c => {
        const jid = c.remoteJid || c.id;
        return jid && jid.endsWith("@s.whatsapp.net") && !jid.includes("-") && jid !== "status@broadcast";
      });

      // Busca contatos existentes no banco
      const existingContacts = await db
        .select({ id: whatsappContacts.id, phone: whatsappContacts.phone })
        .from(whatsappContacts)
        .where(eq(whatsappContacts.configId, input.configId));

      const existingPhones = new Map(existingContacts.map(c => [c.phone, c.id]));

      // Separa inserções e atualizações
      const toInsert: typeof whatsappContacts.$inferInsert[] = [];
      const toUpdate: Array<{ id: number; phone: string; pushName?: string; profilePicUrl?: string | null; lastMessageAt?: Date; unreadCount?: number }> = [];

      for (const chat of individualChats) {
        const jid = chat.remoteJid || chat.id;
        const phone = jid.replace("@s.whatsapp.net", "");
        const contactInfo = contactMap.get(phone);
        const lastMessageAt = chat.lastMsgTimestamp ? new Date(chat.lastMsgTimestamp * 1000) : undefined;
        const existingId = existingPhones.get(phone);

        if (existingId) {
          toUpdate.push({
            id: existingId,
            phone,
            pushName: contactInfo?.pushName,
            profilePicUrl: contactInfo?.profilePictureUrl,
            lastMessageAt,
            unreadCount: chat.unreadCount,
          });
        } else {
          toInsert.push({
            configId: input.configId,
            phone,
            pushName: contactInfo?.pushName || chat.name || null,
            profilePicUrl: contactInfo?.profilePictureUrl || null,
            lastMessageAt: lastMessageAt || null,
            unreadCount: chat.unreadCount ?? 0,
          });
        }
      }

      // Insere novos contatos em lotes
      let insertedCount = 0;
      if (toInsert.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < toInsert.length; i += batchSize) {
          const batch = toInsert.slice(i, i + batchSize);
          await db.insert(whatsappContacts).values(batch);
          insertedCount += batch.length;
        }
      }

      // Atualiza contatos existentes em lotes paralelos
      let updatedCount = 0;
      if (toUpdate.length > 0) {
        const updateBatchSize = 50;
        for (let i = 0; i < toUpdate.length; i += updateBatchSize) {
          const batch = toUpdate.slice(i, i + updateBatchSize);
          await Promise.all(
            batch.map((update) => {
              const updateData: Record<string, unknown> = { updatedAt: new Date() };
              if (update.pushName) updateData.pushName = update.pushName;
              if (update.profilePicUrl) updateData.profilePicUrl = update.profilePicUrl;
              if (update.lastMessageAt) updateData.lastMessageAt = update.lastMessageAt;
              if (update.unreadCount !== undefined) updateData.unreadCount = update.unreadCount;

              return db
                .update(whatsappContacts)
                .set(updateData)
                .where(eq(whatsappContacts.id, update.id));
            })
          );
          updatedCount += batch.length;
        }
      }

      return {
        success: true,
        inserted: insertedCount,
        updated: updatedCount,
        total: individualChats.length,
      };
    }),

  /**
   * Importa histórico de mensagens de um contato da Evolution API
   * Útil para carregar conversas anteriores à configuração do webhook
   */
  importContactHistory: protectedProcedure
    .input(z.object({ contactId: z.number(), limit: z.number().min(1).max(200).optional() }))
    .mutation(async ({ input }) => {
      const [contact] = await db
        .select({ contact: whatsappContacts, config: evolutionConfig })
        .from(whatsappContacts)
        .innerJoin(evolutionConfig, eq(whatsappContacts.configId, evolutionConfig.id))
        .where(eq(whatsappContacts.id, input.contactId))
        .limit(1);

      if (!contact) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contato não encontrado" });
      }

      const client = new EvolutionApiClient({
        apiUrl: contact.config.apiUrl,
        apiKey: contact.config.apiKey,
        instanceName: contact.config.instanceName,
      });

      const remoteJid = `${contact.contact.phone}@s.whatsapp.net`;
      const messages = await client.fetchMessages(remoteJid, input.limit ?? 50).catch(() => []);

      if (messages.length === 0) return { imported: 0 };

      const { extractMessageText, getMessageType, extractMediaInfo, extractQuotedMessageId, extractPhoneFromJid: _epj } = await import("@/lib/services/evolution-api");

      let imported = 0;
      for (const msg of messages) {
        if (!msg.key?.id) continue;

        const [existing] = await db
          .select({ id: whatsappChatMessages.id })
          .from(whatsappChatMessages)
          .where(eq(whatsappChatMessages.waMessageId, msg.key.id))
          .limit(1);

        if (existing) continue;

        const text = extractMessageText(msg);
        const type = getMessageType(msg);
        const mediaInfo = extractMediaInfo(msg);
        const replyToId = extractQuotedMessageId(msg);

        await db.insert(whatsappChatMessages).values({
          contactId: input.contactId,
          waMessageId: msg.key.id,
          direction: msg.key.fromMe ? "outbound" : "inbound",
          type,
          content: text,
          mediaUrl: mediaInfo.url,
          mediaMimeType: mediaInfo.mimeType,
          mediaFilename: mediaInfo.filename,
          replyToId,
          status: msg.key.fromMe ? "sent" : "received",
          createdAt: msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000) : new Date(),
          metadata: { pushName: msg.pushName, timestamp: msg.messageTimestamp },
        });
        imported++;
      }

      // Atualiza lastMessageContent com a mensagem mais recente importada
      if (imported > 0) {
        const [lastMsg] = await db
          .select()
          .from(whatsappChatMessages)
          .where(eq(whatsappChatMessages.contactId, input.contactId))
          .orderBy(desc(whatsappChatMessages.id))
          .limit(1);

        if (lastMsg) {
          await db
            .update(whatsappContacts)
            .set({
              lastMessageContent: (lastMsg.content || "").substring(0, 150) || null,
              lastMessageDirection: lastMsg.direction,
              lastMessageType: lastMsg.type,
              updatedAt: new Date(),
            })
            .where(eq(whatsappContacts.id, input.contactId));
        }
      }

      return { imported };
    }),

  // ===========================================================================
  // TEMPLATES
  // ===========================================================================

  listTemplates: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const conditions = [eq(whatsappTemplates.isActive, true)];

      if (input?.category) {
        conditions.push(eq(whatsappTemplates.category, input.category));
      }

      if (input?.search) {
        conditions.push(
          or(
            like(whatsappTemplates.name, `%${input.search}%`),
            like(whatsappTemplates.title, `%${input.search}%`),
            like(whatsappTemplates.shortcut, `%${input.search}%`)
          )!
        );
      }

      return db
        .select()
        .from(whatsappTemplates)
        .where(and(...conditions))
        .orderBy(whatsappTemplates.sortOrder);
    }),

  getTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [template] = await db
        .select()
        .from(whatsappTemplates)
        .where(eq(whatsappTemplates.id, input.id))
        .limit(1);

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template não encontrado" });
      }

      return template;
    }),

  createTemplate: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      title: z.string().min(1).max(200),
      shortcut: z.string().max(50).optional(),
      category: z.string().max(50).default("geral"),
      content: z.string().min(1),
      variables: z.array(z.string()).optional(),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const [template] = await db
        .insert(whatsappTemplates)
        .values({
          ...input,
          createdById: ctx.user.id,
        })
        .returning();

      return template;
    }),

  updateTemplate: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      title: z.string().min(1).max(200).optional(),
      shortcut: z.string().max(50).optional().nullable(),
      category: z.string().max(50).optional(),
      content: z.string().min(1).optional(),
      variables: z.array(z.string()).optional().nullable(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [template] = await db
        .update(whatsappTemplates)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(whatsappTemplates.id, id))
        .returning();

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template não encontrado" });
      }

      return template;
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(whatsappTemplates)
        .where(eq(whatsappTemplates.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template não encontrado" });
      }

      return { success: true };
    }),

  resolveTemplateVariables: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      contactId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      // Fetch template
      const [template] = await db
        .select()
        .from(whatsappTemplates)
        .where(eq(whatsappTemplates.id, input.templateId))
        .limit(1);

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template não encontrado" });
      }

      // Fetch contact with assistido
      const [contact] = await db
        .select({
          contact: whatsappContacts,
          assistido: assistidos,
        })
        .from(whatsappContacts)
        .leftJoin(assistidos, eq(whatsappContacts.assistidoId, assistidos.id))
        .where(eq(whatsappContacts.id, input.contactId))
        .limit(1);

      // Fetch main processo if assistido exists
      let processo: any = null;
      if (contact?.assistido?.id) {
        const [proc] = await db
          .select()
          .from(processos)
          .where(eq(processos.assistidoId, contact.assistido.id))
          .orderBy(desc(processos.createdAt))
          .limit(1);
        processo = proc;
      }

      // Resolve variables
      let resolved = template.content;
      const variables: Record<string, string> = {
        "{nome_assistido}": contact?.assistido?.nome || "[Nome do Assistido]",
        "{numero_processo}": processo?.numeroAutos || "[Número do Processo]",
        "{vara}": processo?.vara || "[Vara]",
        "{nome_defensor}": ctx.user.name || "[Defensor]",
      };

      for (const [key, value] of Object.entries(variables)) {
        resolved = resolved.replaceAll(key, value);
      }

      return {
        original: template.content,
        resolved,
        variables,
        templateId: template.id,
        templateTitle: template.title,
      };
    }),

  // ===========================================================================
  // REPLY, SEARCH & CONTACT DETAILS
  // ===========================================================================

  /**
   * Envia uma resposta citando uma mensagem específica (quoted reply)
   */
  replyToMessage: protectedProcedure
    .input(
      z.object({
        contactId: z.number(),
        content: z.string().min(1),
        quotedMessageId: z.string(), // waMessageId of the message being replied to
      })
    )
    .mutation(async ({ input }) => {
      const { contactId, content, quotedMessageId } = input;

      // 1. Busca contato e configuração
      const [result] = await db
        .select({
          contact: whatsappContacts,
          config: evolutionConfig,
        })
        .from(whatsappContacts)
        .innerJoin(evolutionConfig, eq(whatsappContacts.configId, evolutionConfig.id))
        .where(eq(whatsappContacts.id, contactId))
        .limit(1);

      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contato não encontrado" });
      }

      const { contact, config } = result;

      // 2. Busca a mensagem citada para obter a key
      const [quotedMessage] = await db
        .select()
        .from(whatsappChatMessages)
        .where(
          and(
            eq(whatsappChatMessages.contactId, contactId),
            eq(whatsappChatMessages.waMessageId, quotedMessageId)
          )
        )
        .limit(1);

      if (!quotedMessage) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Mensagem citada não encontrada" });
      }

      // 3. Envia via Evolution API com quoted
      const remoteJid = formatPhoneNumber(contact.phone);
      const number = remoteJid.replace("@s.whatsapp.net", "");

      try {
        const response = await fetch(
          `${config.apiUrl}/message/sendText/${config.instanceName}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: config.apiKey,
            },
            body: JSON.stringify({
              number,
              text: content,
              quoted: {
                key: {
                  remoteJid,
                  fromMe: quotedMessage.direction === "outbound",
                  id: quotedMessageId,
                },
              },
            }),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Erro ao enviar resposta: ${error}`);
        }

        const apiResponse = await response.json();

        // 4. Salva mensagem no banco com replyToId
        const [message] = await db
          .insert(whatsappChatMessages)
          .values({
            contactId,
            waMessageId: apiResponse.key?.id,
            direction: "outbound",
            type: "text",
            content,
            replyToId: quotedMessageId,
            status: "sent",
            metadata: { response: apiResponse },
          })
          .returning();

        // 5. Atualiza lastMessageAt do contato
        await db
          .update(whatsappContacts)
          .set({
            lastMessageAt: new Date(),
            lastMessageContent: content.substring(0, 150),
            lastMessageDirection: "outbound",
            lastMessageType: "text",
            updatedAt: new Date(),
          })
          .where(eq(whatsappContacts.id, contactId));

        return message;
      } catch (error) {
        console.error("Erro ao enviar reply:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Erro ao enviar resposta",
        });
      }
    }),

  /**
   * Busca mensagens dentro de uma conversa
   */
  searchMessages: protectedProcedure
    .input(
      z.object({
        contactId: z.number(),
        query: z.string().min(1),
        limit: z.number().max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const { contactId, query, limit } = input;

      const messages = await db
        .select({
          id: whatsappChatMessages.id,
          waMessageId: whatsappChatMessages.waMessageId,
          content: whatsappChatMessages.content,
          direction: whatsappChatMessages.direction,
          type: whatsappChatMessages.type,
          createdAt: whatsappChatMessages.createdAt,
        })
        .from(whatsappChatMessages)
        .where(
          and(
            eq(whatsappChatMessages.contactId, contactId),
            ilike(whatsappChatMessages.content, `%${query}%`)
          )
        )
        .orderBy(desc(whatsappChatMessages.createdAt))
        .limit(limit);

      return messages;
    }),

  /**
   * Busca detalhes enriquecidos de um contato para o painel lateral
   */
  getContactDetails: protectedProcedure
    .input(z.object({ contactId: z.number() }))
    .query(async ({ input }) => {
      // 1. Busca o contato com assistido
      const [result] = await db
        .select({
          contact: whatsappContacts,
          assistido: assistidos,
        })
        .from(whatsappContacts)
        .leftJoin(assistidos, eq(whatsappContacts.assistidoId, assistidos.id))
        .where(eq(whatsappContacts.id, input.contactId))
        .limit(1);

      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contato não encontrado" });
      }

      // 2. Se assistido existe, busca processos vinculados
      let contactProcessos: {
        id: number;
        numeroAutos: string;
        vara: string | null;
        assunto: string | null;
        situacao: string | null;
        papel: string | null;
      }[] = [];

      if (result.assistido?.id) {
        contactProcessos = await db
          .select({
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            vara: processos.vara,
            assunto: processos.assunto,
            situacao: processos.situacao,
            papel: assistidosProcessos.papel,
          })
          .from(assistidosProcessos)
          .innerJoin(processos, eq(assistidosProcessos.processoId, processos.id))
          .where(eq(assistidosProcessos.assistidoId, result.assistido.id))
          .orderBy(desc(processos.createdAt))
          .limit(10);

        // Fallback: also check processos.assistidoId direct FK
        if (contactProcessos.length === 0) {
          const directProcessos = await db
            .select({
              id: processos.id,
              numeroAutos: processos.numeroAutos,
              vara: processos.vara,
              assunto: processos.assunto,
              situacao: processos.situacao,
            })
            .from(processos)
            .where(eq(processos.assistidoId, result.assistido.id))
            .orderBy(desc(processos.createdAt))
            .limit(10);

          contactProcessos = directProcessos.map((p) => ({
            ...p,
            papel: "reu" as string | null,
          }));
        }
      }

      // 3. Estatísticas de mensagens
      const [stats] = await db
        .select({
          totalMessages: sql<number>`count(*)`,
          mediaMessages: sql<number>`count(case when ${whatsappChatMessages.type} != 'text' then 1 end)`,
          firstMessageAt: sql<string>`min(${whatsappChatMessages.createdAt})`,
        })
        .from(whatsappChatMessages)
        .where(eq(whatsappChatMessages.contactId, input.contactId));

      return {
        contact: result.contact,
        assistido: result.assistido,
        processos: contactProcessos,
        stats: {
          totalMessages: Number(stats?.totalMessages ?? 0),
          mediaMessages: Number(stats?.mediaMessages ?? 0),
          firstMessageAt: stats?.firstMessageAt ?? null,
        },
      };
    }),

  // ===========================================================================
  // ESTATÍSTICAS
  // ===========================================================================

  /**
   * Busca estatísticas do chat
   */
  getStats: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .query(async ({ input }) => {
      const [stats] = await db
        .select({
          totalContacts: sql<number>`count(distinct ${whatsappContacts.id})`,
          totalMessages: sql<number>`count(${whatsappChatMessages.id})`,
          unreadMessages: sql<number>`sum(${whatsappContacts.unreadCount})`,
          inboundMessages: sql<number>`count(case when ${whatsappChatMessages.direction} = 'inbound' then 1 end)`,
          outboundMessages: sql<number>`count(case when ${whatsappChatMessages.direction} = 'outbound' then 1 end)`,
        })
        .from(whatsappContacts)
        .leftJoin(whatsappChatMessages, eq(whatsappContacts.id, whatsappChatMessages.contactId))
        .where(eq(whatsappContacts.configId, input.configId));

      // Busca contatos com mais mensagens não lidas
      const topUnread = await db
        .select({
          contact: whatsappContacts,
        })
        .from(whatsappContacts)
        .where(
          and(
            eq(whatsappContacts.configId, input.configId),
            sql`${whatsappContacts.unreadCount} > 0`
          )
        )
        .orderBy(desc(whatsappContacts.unreadCount))
        .limit(5);

      return {
        totalContacts: Number(stats.totalContacts),
        totalMessages: Number(stats.totalMessages),
        unreadMessages: Number(stats.unreadMessages) || 0,
        inboundMessages: Number(stats.inboundMessages),
        outboundMessages: Number(stats.outboundMessages),
        topUnread: topUnread.map((t) => t.contact),
      };
    }),

  // =============================================================================
  // WHATSAPP DEFENDER FASE 2 — Mutations
  // =============================================================================

  /**
   * saveToCase — Salva recorte de mensagens como anotação vinculada ao assistido
   */
  saveToCase: protectedProcedure
    .input(z.object({
      contactId: z.number(),
      messageIds: z.array(z.number()).min(1).max(100),
      importante: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Get contact with assistido
      const contact = await db.query.whatsappContacts.findFirst({
        where: eq(whatsappContacts.id, input.contactId),
        with: { assistido: true },
      });
      if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "Contato não encontrado" });
      if (!contact.assistidoId || !contact.assistido) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Contato não vinculado a um assistido" });
      }

      // 2. Get messages ordered by date
      const messages = await db
        .select()
        .from(whatsappChatMessages)
        .where(and(
          eq(whatsappChatMessages.contactId, input.contactId),
          inArray(whatsappChatMessages.id, input.messageIds)
        ))
        .orderBy(asc(whatsappChatMessages.createdAt));

      if (messages.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma mensagem encontrada" });

      // 3. Format content
      const contactDisplayName = contact.name || contact.pushName || contact.phone;
      const relationLabel = contact.contactRelation
        ? `${contact.contactRelation}${contact.contactRelationDetail ? ` - ${contact.contactRelationDetail}` : ''}`
        : null;

      const formattedLines = messages.map((msg) => {
        const date = new Date(msg.createdAt);
        const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

        const sender = msg.direction === 'outbound'
          ? 'Defensor'
          : relationLabel ? `${contactDisplayName} (${relationLabel})` : contactDisplayName;

        let content = msg.content || '';
        if (msg.type === 'image') content = content ? `[Imagem] ${content}` : '[Imagem]';
        if (msg.type === 'document') content = content ? `[Documento: ${msg.mediaFilename || 'arquivo'}] ${content}` : `[Documento: ${msg.mediaFilename || 'arquivo'}]`;
        if (msg.type === 'audio') content = '[Áudio]';
        if (msg.type === 'video') content = '[Vídeo]';

        return `[${dateStr}] ${sender}:\n${content}`;
      });

      const conteudo = formattedLines.join('\n\n');
      const hasMedia = messages.some(m => m.type !== 'text' && m.mediaUrl);

      // 4. Insert annotation
      const [anotacao] = await db.insert(anotacoes).values({
        assistidoId: contact.assistidoId,
        conteudo,
        tipo: 'whatsapp_recorte',
        importante: input.importante,
        metadata: {
          contactId: contact.id,
          contactName: contactDisplayName,
          contactPhone: contact.phone,
          contactRelation: contact.contactRelation,
          contactRelationDetail: contact.contactRelationDetail,
          messageCount: messages.length,
          messageIds: input.messageIds,
          dateRange: {
            from: messages[0].createdAt.toISOString(),
            to: messages[messages.length - 1].createdAt.toISOString(),
          },
          hasMedia,
        },
        createdById: ctx.user.id,
      }).returning();

      return { id: anotacao.id, conteudo };
    }),

  /**
   * saveMediaToDrive — Baixa mídias de mensagens e salva no Google Drive
   */
  saveMediaToDrive: protectedProcedure
    .input(z.object({
      contactId: z.number(),
      messageIds: z.array(z.number()).min(1).max(50),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Get contact with assistido
      const contact = await db.query.whatsappContacts.findFirst({
        where: eq(whatsappContacts.id, input.contactId),
        with: { assistido: true },
      });
      if (!contact?.assistidoId || !contact.assistido) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Contato não vinculado a um assistido" });
      }

      // 2. Get messages with media
      const messages = await db
        .select()
        .from(whatsappChatMessages)
        .where(and(
          eq(whatsappChatMessages.contactId, input.contactId),
          inArray(whatsappChatMessages.id, input.messageIds),
          ne(whatsappChatMessages.type, 'text')
        ))
        .orderBy(asc(whatsappChatMessages.createdAt));

      const mediaMessages = messages.filter(m => m.mediaUrl);
      if (mediaMessages.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma mídia encontrada nas mensagens selecionadas" });
      }

      // 3. Resolve Drive folder
      let targetFolderId = contact.assistido.driveFolderId;
      if (!targetFolderId) {
        const { SPECIAL_FOLDER_IDS } = await import("@/lib/utils/text-extraction");
        targetFolderId = SPECIAL_FOLDER_IDS.DISTRIBUICAO;
      }

      // 4. Download and upload each media
      const savedFiles: { name: string; driveFileId: string }[] = [];

      for (const msg of mediaMessages) {
        try {
          // Download from Evolution API
          const response = await fetch(msg.mediaUrl!);
          if (!response.ok) continue;
          const buffer = Buffer.from(await response.arrayBuffer());

          // Generate filename
          const date = new Date(msg.createdAt);
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const timeStr = `${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
          const typeLabel = msg.type === 'image' ? 'foto' : msg.type === 'document' ? 'doc' : msg.type === 'audio' ? 'audio' : msg.type;

          // Get extension from mimetype or filename
          const ext = msg.mediaFilename?.split('.').pop()
            || (msg.mediaMimeType?.split('/').pop()?.replace('jpeg', 'jpg'))
            || 'bin';
          const filename = `WhatsApp_${dateStr}_${timeStr}_${typeLabel}.${ext}`;

          // Upload to Drive
          const result = await uploadFileBuffer(
            buffer,
            filename,
            msg.mediaMimeType || 'application/octet-stream',
            targetFolderId!
          );

          if (result) {
            // Register in driveFiles
            await db.insert(driveFiles).values({
              driveFileId: result.id,
              driveFolderId: targetFolderId!,
              name: filename,
              mimeType: msg.mediaMimeType || 'application/octet-stream',
              fileSize: buffer.length,
              assistidoId: contact.assistidoId!,
              syncStatus: 'synced',
              lastSyncAt: new Date(),
            }).onConflictDoNothing();

            savedFiles.push({ name: filename, driveFileId: result.id });
          }
        } catch (error) {
          console.error(`Failed to save media ${msg.id} to Drive:`, error);
          // Continue with other files
        }
      }

      return { savedCount: savedFiles.length, files: savedFiles };
    }),

  /**
   * generateSummary — Gera resumo IA de mensagens via enrichment engine
   */
  generateSummary: protectedProcedure
    .input(z.object({
      contactId: z.number(),
      messageIds: z.array(z.number()).min(1).max(200),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Get contact with assistido
      const contact = await db.query.whatsappContacts.findFirst({
        where: eq(whatsappContacts.id, input.contactId),
        with: { assistido: true },
      });
      if (!contact?.assistidoId || !contact.assistido) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Contato não vinculado a um assistido" });
      }

      // 2. Get messages
      const messages = await db
        .select()
        .from(whatsappChatMessages)
        .where(and(
          eq(whatsappChatMessages.contactId, input.contactId),
          inArray(whatsappChatMessages.id, input.messageIds)
        ))
        .orderBy(asc(whatsappChatMessages.createdAt));

      if (messages.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma mensagem encontrada" });

      // 3. Format messages
      const contactDisplayName = contact.name || contact.pushName || contact.phone;
      const relationLabel = contact.contactRelation || 'contato';

      const formattedMessages = messages.map((msg) => {
        const date = new Date(msg.createdAt);
        const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        const sender = msg.direction === 'outbound' ? 'Defensor' : contactDisplayName;
        let content = msg.content || '';
        if (msg.type !== 'text') content = `[${msg.type}: ${msg.mediaFilename || msg.type}]${content ? ' ' + content : ''}`;
        return `[${dateStr}] ${sender}: ${content}`;
      }).join('\n');

      // 4. Get processo info
      let processoNumber: string | null = null;
      if (contact.assistidoId) {
        const processoLink = await db.query.assistidosProcessos?.findFirst?.({
          where: eq(assistidosProcessos.assistidoId, contact.assistidoId),
        });
        if (processoLink) {
          const processo = await db.query.processos?.findFirst?.({
            where: eq(processos.id, processoLink.processoId),
          });
          processoNumber = processo?.numeroAutos || null;
        }
      }

      // 5. Call enrichment engine
      const enrichmentUrl = process.env.ENRICHMENT_ENGINE_URL || 'https://enrichment-engine-production.up.railway.app';
      const enrichmentApiKey = process.env.ENRICHMENT_API_KEY || '';

      const enrichResponse = await fetch(`${enrichmentUrl}/enrich/summarize-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(enrichmentApiKey ? { 'Authorization': `Bearer ${enrichmentApiKey}` } : {}),
        },
        body: JSON.stringify({
          messages: formattedMessages,
          context: {
            assistido_name: contact.assistido.nome,
            interlocutor: `${contactDisplayName} (${relationLabel}${contact.contactRelationDetail ? ' - ' + contact.contactRelationDetail : ''})`,
            processo_number: processoNumber,
          },
        }),
      });

      if (!enrichResponse.ok) {
        const errorText = await enrichResponse.text().catch(() => 'Unknown error');
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao gerar resumo: ${enrichResponse.status} - ${errorText}`
        });
      }

      const result = await enrichResponse.json();
      return {
        summary: result.summary || '',
        structured: {
          fatos: result.structured?.fatos || [],
          pedidos: result.structured?.pedidos || [],
          providencias: result.structured?.providencias || [],
        },
      };
    }),

  /**
   * saveSummary — Salva resumo IA como anotação vinculada ao assistido
   */
  saveSummary: protectedProcedure
    .input(z.object({
      contactId: z.number(),
      messageIds: z.array(z.number()),
      summary: z.string().min(1),
      editedByUser: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const contact = await db.query.whatsappContacts.findFirst({
        where: eq(whatsappContacts.id, input.contactId),
        with: { assistido: true },
      });
      if (!contact?.assistidoId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Contato não vinculado a um assistido" });
      }

      const [anotacao] = await db.insert(anotacoes).values({
        assistidoId: contact.assistidoId,
        conteudo: input.summary,
        tipo: 'whatsapp_resumo_ia',
        metadata: {
          contactId: contact.id,
          contactName: contact.name || contact.pushName || contact.phone,
          contactRelation: contact.contactRelation,
          messageCount: input.messageIds.length,
          messageIds: input.messageIds,
          model: 'claude-sonnet-4-6',
          editedByUser: input.editedByUser,
        },
        createdById: ctx.user.id,
      }).returning();

      return { id: anotacao.id };
    }),

  // ===========================================================================
  // TAGS
  // ===========================================================================

  /**
   * Lista todas as tags distintas usadas nos contatos com contagem
   */
  listTags: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .query(async ({ input }) => {
      const result = await db.execute<{ tag: string; count: number }>(
        sql`SELECT unnest(${whatsappContacts.tags}) as tag, count(*)::int as count
            FROM ${whatsappContacts}
            WHERE ${whatsappContacts.configId} = ${input.configId}
              AND ${whatsappContacts.tags} IS NOT NULL
            GROUP BY tag
            ORDER BY count DESC`
      );

      return Array.from(result) as { tag: string; count: number }[];
    }),

  // ===========================================================================
  // EXTRAÇÃO DE DADOS (IA)
  // ===========================================================================

  /**
   * extractData — Extrai dados cadastrais de mensagens via IA
   */
  extractData: protectedProcedure
    .input(z.object({
      contactId: z.number(),
      messageIds: z.array(z.number()).min(1).max(200),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Get contact with assistido
      const contact = await db.query.whatsappContacts.findFirst({
        where: eq(whatsappContacts.id, input.contactId),
        with: { assistido: true },
      });
      if (!contact?.assistidoId || !contact.assistido) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Contato não vinculado a um assistido" });
      }

      // 2. Get messages
      const messages = await db
        .select()
        .from(whatsappChatMessages)
        .where(and(
          eq(whatsappChatMessages.contactId, input.contactId),
          inArray(whatsappChatMessages.id, input.messageIds)
        ))
        .orderBy(asc(whatsappChatMessages.createdAt));

      if (messages.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma mensagem encontrada" });

      // 3. Format messages
      const contactDisplayName = contact.name || contact.pushName || contact.phone;

      const formattedMessages = messages.map((msg) => {
        const date = new Date(msg.createdAt);
        const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        const sender = msg.direction === 'outbound' ? 'Defensor' : contactDisplayName;
        let content = msg.content || '';
        if (msg.type !== 'text') content = `[${msg.type}: ${msg.mediaFilename || msg.type}]${content ? ' ' + content : ''}`;
        return `[${dateStr}] ${sender}: ${content}`;
      }).join('\n');

      // 4. Get processo info
      let processoNumber: string | null = null;
      if (contact.assistidoId) {
        const processoLink = await db.query.assistidosProcessos?.findFirst?.({
          where: eq(assistidosProcessos.assistidoId, contact.assistidoId),
        });
        if (processoLink) {
          const processo = await db.query.processos?.findFirst?.({
            where: eq(processos.id, processoLink.processoId),
          });
          processoNumber = processo?.numeroAutos || null;
        }
      }

      // 5. Call enrichment engine
      const enrichmentUrl = process.env.ENRICHMENT_ENGINE_URL || 'https://enrichment-engine-production.up.railway.app';
      const enrichmentApiKey = process.env.ENRICHMENT_API_KEY || '';

      const enrichResponse = await fetch(`${enrichmentUrl}/enrich/extract-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(enrichmentApiKey ? { 'Authorization': `Bearer ${enrichmentApiKey}` } : {}),
        },
        body: JSON.stringify({
          messages: formattedMessages,
          context: {
            assistido_name: contact.assistido.nome,
            processo_number: processoNumber,
          },
        }),
      });

      if (!enrichResponse.ok) {
        const errorText = await enrichResponse.text().catch(() => 'Unknown error');
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao extrair dados: ${enrichResponse.status} - ${errorText}`
        });
      }

      const result = await enrichResponse.json();
      return {
        extracted: result.extracted || {},
        confidence: result.confidence || 0,
      };
    }),

  /**
   * applyExtractedData — Aplica dados extraídos pela IA ao cadastro do assistido
   */
  applyExtractedData: protectedProcedure
    .input(z.object({
      assistidoId: z.number(),
      data: z.object({
        endereco: z.string().optional(),
        telefone: z.string().optional(),
        relato_fatos: z.string().optional(),
        nomes_testemunhas: z.array(z.string()).optional(),
        datas_relevantes: z.array(z.object({
          data: z.string(),
          descricao: z.string(),
        })).optional(),
        locais: z.array(z.string()).optional(),
        documentos_mencionados: z.array(z.string()).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Verify assistido exists
      const assistido = await db.query.assistidos.findFirst({
        where: eq(assistidos.id, input.assistidoId),
      });
      if (!assistido) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assistido não encontrado" });
      }

      // 2. Build update object — only non-null fields
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.data.endereco) {
        updateData.endereco = input.data.endereco;
      }
      if (input.data.telefone) {
        updateData.telefone = input.data.telefone;
      }

      // 3. Update assistido if there are cadastral fields
      if (Object.keys(updateData).length > 1) {
        await db.update(assistidos)
          .set(updateData)
          .where(eq(assistidos.id, input.assistidoId));
      }

      // 4. Build anotacao content with all extracted data
      const parts: string[] = [];
      parts.push("## Dados Extraidos por IA (WhatsApp)\n");

      if (input.data.endereco) {
        parts.push(`**Endereco:** ${input.data.endereco}`);
      }
      if (input.data.telefone) {
        parts.push(`**Telefone:** ${input.data.telefone}`);
      }
      if (input.data.relato_fatos) {
        parts.push(`\n**Relato dos Fatos:**\n${input.data.relato_fatos}`);
      }
      if (input.data.nomes_testemunhas && input.data.nomes_testemunhas.length > 0) {
        parts.push(`\n**Testemunhas:** ${input.data.nomes_testemunhas.join(", ")}`);
      }
      if (input.data.datas_relevantes && input.data.datas_relevantes.length > 0) {
        parts.push(`\n**Datas Relevantes:**`);
        for (const d of input.data.datas_relevantes) {
          parts.push(`- ${d.data}: ${d.descricao}`);
        }
      }
      if (input.data.locais && input.data.locais.length > 0) {
        parts.push(`\n**Locais:** ${input.data.locais.join(", ")}`);
      }
      if (input.data.documentos_mencionados && input.data.documentos_mencionados.length > 0) {
        parts.push(`\n**Documentos Mencionados:** ${input.data.documentos_mencionados.join(", ")}`);
      }

      // 5. Create anotacao
      await db.insert(anotacoes).values({
        assistidoId: input.assistidoId,
        conteudo: parts.join("\n"),
        tipo: 'whatsapp_extracao_ia',
        metadata: {
          fieldsApplied: Object.keys(input.data).filter(k => {
            const val = input.data[k as keyof typeof input.data];
            return val !== undefined && val !== null && (typeof val !== 'string' || val.length > 0) && (!Array.isArray(val) || val.length > 0);
          }),
          model: 'claude-sonnet-4-6',
        },
        createdById: ctx.user.id,
      });

      return { success: true };
    }),

  importHistory: protectedProcedure
    .input(importHistorySchema)
    .mutation(async ({ input }) => {
      const { configId, jsonContent } = input;

      const [config] = await db
        .select()
        .from(evolutionConfig)
        .where(eq(evolutionConfig.id, configId))
        .limit(1);

      if (!config) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Instância não encontrada" });
      }

      let parsed: {
        chats: Array<{
          phone: string;
          name: string;
          messages: Array<{
            id: string;
            timestamp: string;
            fromMe: boolean;
            type: string;
            content: string | null;
            hasMedia: boolean;
          }>;
        }>;
      };

      try {
        parsed = JSON.parse(jsonContent);
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "JSON inválido" });
      }

      if (!parsed.chats || !Array.isArray(parsed.chats)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Formato inválido: campo 'chats' não encontrado" });
      }

      let contactsCreated = 0;
      let contactsUpdated = 0;
      let messagesImported = 0;
      let messagesSkipped = 0;

      for (const chat of parsed.chats) {
        if (!chat.phone || !Array.isArray(chat.messages) || chat.messages.length === 0) {
          continue;
        }

        const phone = chat.phone.replace(/\D/g, "");
        if (phone.length < 8) continue;

        const lastMsg = chat.messages[chat.messages.length - 1];
        const lastMessageAt = lastMsg?.timestamp ? new Date(lastMsg.timestamp) : null;

        const [existing] = await db
          .select({ id: whatsappContacts.id })
          .from(whatsappContacts)
          .where(and(
            eq(whatsappContacts.configId, configId),
            eq(whatsappContacts.phone, phone)
          ))
          .limit(1);

        let contactId: number;

        if (existing) {
          await db
            .update(whatsappContacts)
            .set({
              ...(chat.name ? { pushName: chat.name } : {}),
              ...(lastMessageAt ? { lastMessageAt } : {}),
              updatedAt: new Date(),
            })
            .where(eq(whatsappContacts.id, existing.id));
          contactId = existing.id;
          contactsUpdated++;
        } else {
          const [created] = await db
            .insert(whatsappContacts)
            .values({
              configId,
              phone,
              pushName: chat.name || null,
              lastMessageAt,
              unreadCount: 0,
            })
            .returning({ id: whatsappContacts.id });
          contactId = created.id;
          contactsCreated++;
        }

        for (const msg of chat.messages) {
          const waMessageId = `ios_import_${msg.id}`;

          const [dup] = await db
            .select({ id: whatsappChatMessages.id })
            .from(whatsappChatMessages)
            .where(eq(whatsappChatMessages.waMessageId, waMessageId))
            .limit(1);

          if (dup) {
            messagesSkipped++;
            continue;
          }

          const validTypes = ["text","image","audio","video","document","contact","location","sticker"] as const;
          const msgType = validTypes.includes(msg.type as typeof validTypes[number])
            ? (msg.type as typeof validTypes[number])
            : "text";

          await db.insert(whatsappChatMessages).values({
            contactId,
            waMessageId,
            direction: msg.fromMe ? "outbound" : "inbound",
            type: msgType,
            content: msg.content || (msg.hasMedia ? `[${msgType}]` : null),
            status: msg.fromMe ? "sent" : "received",
            imported: true,
            importedAt: new Date(),
            metadata: { importedFrom: "ios_backup", originalTimestamp: msg.timestamp },
            createdAt: new Date(msg.timestamp),
          });

          messagesImported++;
        }
      }

      return {
        contactsCreated,
        contactsUpdated,
        messagesImported,
        messagesSkipped,
        total: parsed.chats.length,
      };
    }),
});
