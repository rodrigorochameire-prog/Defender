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
  assistidos,
} from "@/lib/db/schema";
import { eq, and, desc, asc, like, sql, or, isNull } from "drizzle-orm";
import {
  evolutionApi,
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
  getConnectionStatus,
  getQRCode,
  createInstance,
  setWebhook,
  logoutInstance,
  restartInstance,
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
  assistidoId: z.number().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
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
    const configs = await db
      .select()
      .from(evolutionConfig)
      .where(
        ctx.user.role === "admin"
          ? undefined
          : eq(evolutionConfig.workspaceId, ctx.user.workspaceId!)
      )
      .orderBy(desc(evolutionConfig.createdAt));

    return configs;
  }),

  /**
   * Busca configuração por ID
   */
  getConfig: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const [config] = await db
      .select()
      .from(evolutionConfig)
      .where(eq(evolutionConfig.id, input.id))
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
        workspaceId: ctx.user.workspaceId,
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
        const status = await getConnectionStatus(config.instanceName, config.apiKey);

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
        const qrCode = await getQRCode(config.instanceName, config.apiKey);

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
        await logoutInstance(config.instanceName, config.apiKey);

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
        await restartInstance(config.instanceName, config.apiKey);

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
      assistidoId,
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

    if (assistidoId) {
      conditions.push(eq(whatsappContacts.assistidoId, assistidoId));
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
      } catch (error) {
        console.error("Erro ao marcar como lido na Evolution API:", error);
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
        beforeId: z.number().optional(), // Para paginação baseada em cursor
      })
    )
    .query(async ({ input }) => {
      const { contactId, limit = 50, offset = 0, beforeId } = input;

      const conditions = [eq(whatsappChatMessages.contactId, contactId)];

      if (beforeId) {
        conditions.push(sql`${whatsappChatMessages.id} < ${beforeId}`);
      }

      const messages = await db
        .select()
        .from(whatsappChatMessages)
        .where(and(...conditions))
        .orderBy(desc(whatsappChatMessages.createdAt))
        .limit(limit)
        .offset(offset);

      // Conta total
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(whatsappChatMessages)
        .where(eq(whatsappChatMessages.contactId, contactId));

      // Retorna em ordem cronológica
      return {
        messages: messages.reverse(),
        total: Number(count),
        hasMore: messages.length === limit,
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
});
