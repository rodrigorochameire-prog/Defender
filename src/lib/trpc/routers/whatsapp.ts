import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import { WhatsAppService, WhatsAppTemplates, MetaTemplateNames } from "@/lib/services/whatsapp";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { whatsappMessages, whatsappConfig } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * Router tRPC para integração com WhatsApp Business API (Meta)
 * 
 * Suporta configurações por admin (multi-tenant) com fallback
 * para variáveis de ambiente globais.
 */
export const whatsappRouter = router({
  // ============================================
  // Configuração
  // ============================================

  /**
   * Verifica se há configuração ativa (admin ou global)
   */
  isConfigured: protectedProcedure.query(async ({ ctx }) => {
    // Verifica config do admin logado
    if (ctx.user?.role === "admin") {
      const adminConfigured = await WhatsAppService.isAdminConfigured(ctx.user.id);
      if (adminConfigured) return true;
    }
    // Fallback para env
    return WhatsAppService.isEnvConfigured();
  }),

  /**
   * Obtém configuração do admin atual (sem dados sensíveis)
   */
  getMyConfig: adminProcedure.query(async ({ ctx }) => {
    const config = await WhatsAppService.getAdminConfig(ctx.user.id);
    return {
      hasConfig: !!config,
      config: config ? {
        phoneNumberId: config.phoneNumberId,
        businessAccountId: config.businessAccountId,
        displayPhoneNumber: config.displayPhoneNumber,
        verifiedName: config.verifiedName,
        qualityRating: config.qualityRating,
        isActive: config.isActive,
        lastVerifiedAt: config.lastVerifiedAt,
        autoNotifyCheckin: config.autoNotifyCheckin,
        autoNotifyCheckout: config.autoNotifyCheckout,
        autoNotifyDailyLog: config.autoNotifyDailyLog,
        autoNotifyBooking: config.autoNotifyBooking,
        hasAccessToken: config.hasAccessToken,
      } : null,
      hasEnvFallback: WhatsAppService.isEnvConfigured(),
    };
  }),

  /**
   * Salva configuração do admin
   */
  saveConfig: adminProcedure
    .input(z.object({
      accessToken: z.string().min(1).optional(),
      phoneNumberId: z.string().min(1).optional(),
      businessAccountId: z.string().optional(),
      webhookVerifyToken: z.string().optional(),
      autoNotifyCheckin: z.boolean().optional(),
      autoNotifyCheckout: z.boolean().optional(),
      autoNotifyDailyLog: z.boolean().optional(),
      autoNotifyBooking: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await WhatsAppService.saveAdminConfig(ctx.user.id, input);
      return { success: true };
    }),

  /**
   * Testa e ativa a configuração
   */
  testAndActivate: adminProcedure.mutation(async ({ ctx }) => {
    const service = await WhatsAppService.forAdmin(ctx.user.id);
    
    if (!service) {
      // Tenta criar um serviço temporário para teste
      const config = await WhatsAppService.getAdminConfig(ctx.user.id);
      if (!config?.phoneNumberId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Configure o Access Token e Phone Number ID primeiro",
        });
      }
    }

    // Tenta obter o serviço novamente com as credenciais
    const testService = await WhatsAppService.forAdmin(ctx.user.id);
    if (!testService) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Credenciais incompletas",
      });
    }

    const result = await testService.checkConnection();
    
    if (result.connected) {
      await WhatsAppService.setAdminConfigActive(ctx.user.id, true);
      return {
        success: true,
        profile: {
          name: result.profile?.verified_name,
          phone: result.profile?.display_phone_number,
          quality: result.profile?.quality_rating,
        },
      };
    } else {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: result.error || "Não foi possível conectar à API",
      });
    }
  }),

  /**
   * Desativa configuração
   */
  deactivate: adminProcedure.mutation(async ({ ctx }) => {
    await WhatsAppService.setAdminConfigActive(ctx.user.id, false);
    return { success: true };
  }),

  // ============================================
  // Status e Conexão
  // ============================================

  /**
   * Verifica status da conexão
   */
  getConnectionStatus: adminProcedure.query(async ({ ctx }) => {
    const service = await WhatsAppService.forAdminOrEnv(ctx.user.id);
    
    if (!service) {
      return {
        connected: false,
        source: "none" as const,
        error: "Nenhuma configuração encontrada",
      };
    }

    const result = await service.checkConnection();
    const config = await WhatsAppService.getAdminConfig(ctx.user.id);
    
    return {
      connected: result.connected,
      source: config?.isActive ? "admin" as const : "env" as const,
      profile: result.profile ? {
        name: result.profile.verified_name,
        phone: result.profile.display_phone_number,
        quality: result.profile.quality_rating,
        status: result.profile.code_verification_status,
      } : null,
      error: result.error,
    };
  }),

  // ============================================
  // Envio de Mensagens
  // ============================================

  /**
   * Envia mensagem de texto
   */
  sendText: adminProcedure
    .input(z.object({
      phone: z.string().min(10),
      message: z.string().min(1).max(4096),
      petId: z.number().optional(),
      context: z.enum(["checkin", "checkout", "daily_log", "booking", "manual"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = await WhatsAppService.forAdminOrEnv(ctx.user.id);
      
      if (!service) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp não está configurado",
        });
      }

      const validation = WhatsAppService.validateNumber(input.phone);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.reason || "Número inválido",
        });
      }

      const result = await service.sendText(input.phone, input.message, {
        petId: input.petId,
        context: input.context || "manual",
        sentById: ctx.user.id,
      });

      return {
        success: true,
        messageId: result.messages[0]?.id,
        to: result.contacts[0]?.wa_id,
      };
    }),

  /**
   * Envia template
   */
  sendTemplate: adminProcedure
    .input(z.object({
      phone: z.string().min(10),
      templateName: z.string().min(1),
      languageCode: z.string().default("pt_BR"),
      parameters: z.array(z.object({
        type: z.enum(["header", "body", "button"]),
        parameters: z.array(z.object({
          type: z.enum(["text", "image", "document", "video"]),
          text: z.string().optional(),
          image: z.object({ link: z.string() }).optional(),
          document: z.object({ link: z.string(), filename: z.string() }).optional(),
        })),
      })).optional(),
      petId: z.number().optional(),
      context: z.enum(["checkin", "checkout", "daily_log", "booking", "manual"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = await WhatsAppService.forAdminOrEnv(ctx.user.id);
      
      if (!service) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp não está configurado",
        });
      }

      const result = await service.sendTemplate(
        input.phone,
        input.templateName,
        input.languageCode,
        input.parameters as Parameters<typeof service.sendTemplate>[3],
        {
          petId: input.petId,
          context: input.context || "manual",
          sentById: ctx.user.id,
        }
      );

      return {
        success: true,
        messageId: result.messages[0]?.id,
        to: result.contacts[0]?.wa_id,
      };
    }),

  /**
   * Envia imagem
   */
  sendImage: adminProcedure
    .input(z.object({
      phone: z.string().min(10),
      imageUrl: z.string().url(),
      caption: z.string().max(1024).optional(),
      petId: z.number().optional(),
      context: z.enum(["checkin", "checkout", "daily_log", "booking", "manual"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = await WhatsAppService.forAdminOrEnv(ctx.user.id);
      
      if (!service) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp não está configurado",
        });
      }

      const result = await service.sendImage(input.phone, input.imageUrl, input.caption, {
        petId: input.petId,
        context: input.context || "manual",
        sentById: ctx.user.id,
      });

      return {
        success: true,
        messageId: result.messages[0]?.id,
        to: result.contacts[0]?.wa_id,
      };
    }),

  /**
   * Envia documento
   */
  sendDocument: adminProcedure
    .input(z.object({
      phone: z.string().min(10),
      documentUrl: z.string().url(),
      fileName: z.string().min(1),
      caption: z.string().max(1024).optional(),
      petId: z.number().optional(),
      context: z.enum(["checkin", "checkout", "daily_log", "booking", "manual"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = await WhatsAppService.forAdminOrEnv(ctx.user.id);
      
      if (!service) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp não está configurado",
        });
      }

      const result = await service.sendDocument(
        input.phone,
        input.documentUrl,
        input.fileName,
        input.caption,
        {
          petId: input.petId,
          context: input.context || "manual",
          sentById: ctx.user.id,
        }
      );

      return {
        success: true,
        messageId: result.messages[0]?.id,
        to: result.contacts[0]?.wa_id,
      };
    }),

  /**
   * Envia mensagem de teste
   */
  sendTestMessage: adminProcedure
    .input(z.object({
      phone: z.string().min(10),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = await WhatsAppService.forAdminOrEnv(ctx.user.id);
      
      if (!service) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp não está configurado",
        });
      }

      const testMessage = `🐾 *TeteCare Hub - Teste de Conexão*\n\n✅ A integração com WhatsApp está funcionando!\n\n_Mensagem enviada em ${new Date().toLocaleString("pt-BR")}_`;
      
      const result = await service.sendText(input.phone, testMessage, {
        context: "manual",
        sentById: ctx.user.id,
      });

      return {
        success: true,
        messageId: result.messages[0]?.id,
        to: result.contacts[0]?.wa_id,
      };
    }),

  // ============================================
  // Histórico
  // ============================================

  /**
   * Lista histórico de mensagens
   */
  getMessageHistory: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      petId: z.number().optional(),
      context: z.enum(["checkin", "checkout", "daily_log", "booking", "manual"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const config = await WhatsAppService.getAdminConfig(ctx.user.id);
      
      if (!config) {
        return { messages: [], total: 0 };
      }

      const conditions = [eq(whatsappMessages.configId, config.id)];
      
      if (input.petId) {
        conditions.push(eq(whatsappMessages.petId, input.petId));
      }
      if (input.context) {
        conditions.push(eq(whatsappMessages.context, input.context));
      }

      const messages = await db.query.whatsappMessages.findMany({
        where: and(...conditions),
        orderBy: [desc(whatsappMessages.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          pet: true,
          sentBy: true,
        },
      });

      return {
        messages,
        total: messages.length,
      };
    }),

  // ============================================
  // Templates
  // ============================================

  /**
   * Lista templates aprovados na conta
   */
  listApprovedTemplates: adminProcedure.query(async ({ ctx }) => {
    const service = await WhatsAppService.forAdminOrEnv(ctx.user.id);
    
    if (!service) {
      return [];
    }

    try {
      return await service.listTemplates();
    } catch {
      return [];
    }
  }),

  /**
   * Retorna templates de exemplo
   */
  getTemplates: protectedProcedure.query(() => {
    return {
      checkin: {
        name: "Check-in",
        metaTemplateName: MetaTemplateNames.CHECKIN,
        description: "Notificação quando pet faz check-in",
        example: WhatsAppTemplates.checkin("Max", "João"),
      },
      checkout: {
        name: "Check-out",
        metaTemplateName: MetaTemplateNames.CHECKOUT,
        description: "Notificação quando pet está pronto para ir embora",
        example: WhatsAppTemplates.checkout("Max", "João"),
      },
      vaccineReminder: {
        name: "Lembrete de Vacina",
        metaTemplateName: MetaTemplateNames.VACCINE_REMINDER,
        description: "Lembrete de vacina agendada",
        example: WhatsAppTemplates.vaccineReminder("Max", "V10", "15/01/2026"),
      },
      medicationReminder: {
        name: "Lembrete de Medicação",
        metaTemplateName: MetaTemplateNames.MEDICATION_REMINDER,
        description: "Lembrete de medicação",
        example: WhatsAppTemplates.medicationReminder("Max", "Frontline", "1 pipeta"),
      },
      dailyUpdate: {
        name: "Atualização Diária",
        metaTemplateName: MetaTemplateNames.DAILY_UPDATE,
        description: "Notificação de nova postagem no mural",
        example: WhatsAppTemplates.dailyUpdate("Max", "uma foto nova"),
      },
      bookingConfirmation: {
        name: "Confirmação de Reserva",
        metaTemplateName: MetaTemplateNames.BOOKING_CONFIRMATION,
        description: "Confirmação de reserva agendada",
        example: WhatsAppTemplates.bookingConfirmation("Max", "20/01/2026", "Day Care"),
      },
      bookingReminder: {
        name: "Lembrete de Reserva",
        metaTemplateName: MetaTemplateNames.BOOKING_REMINDER,
        description: "Lembrete de reserva para o dia seguinte",
        example: WhatsAppTemplates.bookingReminder("Max", "20/01/2026", "08:00"),
      },
      behaviorAlert: {
        name: "Alerta de Comportamento",
        metaTemplateName: MetaTemplateNames.BEHAVIOR_ALERT,
        description: "Notificação sobre observação importante",
        example: WhatsAppTemplates.behaviorAlert("Max", "O pet está um pouco mais quieto que o normal hoje."),
      },
    };
  }),

  // ============================================
  // Utilitários
  // ============================================

  /**
   * Formata número de telefone
   */
  formatNumber: protectedProcedure
    .input(z.object({ phone: z.string() }))
    .query(({ input }) => {
      const formatted = WhatsAppService.formatNumber(input.phone);
      const validation = WhatsAppService.validateNumber(input.phone);
      return {
        original: input.phone,
        formatted,
        valid: validation.valid,
        reason: validation.reason,
      };
    }),

  /**
   * Retorna informações de configuração
   */
  getConfigInfo: adminProcedure.query(async ({ ctx }) => {
    const adminConfig = await WhatsAppService.getAdminConfig(ctx.user.id);
    
    return {
      hasAdminConfig: !!adminConfig,
      isAdminActive: adminConfig?.isActive ?? false,
      hasEnvFallback: WhatsAppService.isEnvConfigured(),
      requiredVars: [
        { name: "accessToken", description: "Token de acesso da API (Access Token)" },
        { name: "phoneNumberId", description: "ID do número de telefone (Phone Number ID)" },
      ],
      optionalVars: [
        { name: "businessAccountId", description: "ID da conta Business (para listar templates)" },
        { name: "webhookVerifyToken", description: "Token para verificar webhooks" },
      ],
      docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
      setupUrl: "https://developers.facebook.com/apps",
    };
  }),
});
