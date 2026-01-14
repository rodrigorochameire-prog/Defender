import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import { WhatsAppService, WhatsAppTemplates, MetaTemplateNames } from "@/lib/services/whatsapp";
import { TRPCError } from "@trpc/server";

/**
 * Router tRPC para integração com WhatsApp Business API (Meta)
 * 
 * Todas as operações requerem autenticação:
 * - Envio de mensagens: apenas admins
 * - Verificação de status: admins
 */
export const whatsappRouter = router({
  /**
   * Verifica se a API está configurada
   */
  isConfigured: protectedProcedure.query(() => {
    return WhatsAppService.isConfigured();
  }),

  /**
   * Verifica o status da conexão com a API
   */
  getConnectionStatus: adminProcedure.query(async () => {
    if (!WhatsAppService.isConfigured()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "WhatsApp Business API não está configurada. Configure as variáveis de ambiente.",
      });
    }

    try {
      const status = await WhatsAppService.checkConnection();
      return {
        connected: status.connected,
        profile: status.profile ? {
          name: status.profile.verified_name,
          phone: status.profile.display_phone_number,
          quality: status.profile.quality_rating,
          status: status.profile.code_verification_status,
        } : null,
        error: status.error,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Erro ao verificar status",
      });
    }
  }),

  /**
   * Obtém informações do perfil do número
   */
  getProfile: adminProcedure.query(async () => {
    if (!WhatsAppService.isConfigured()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "WhatsApp Business API não está configurada.",
      });
    }

    try {
      const profile = await WhatsAppService.getBusinessProfile();
      return {
        name: profile.verified_name,
        phone: profile.display_phone_number,
        quality: profile.quality_rating,
        status: profile.code_verification_status,
        throughput: profile.throughput?.level,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Erro ao obter perfil",
      });
    }
  }),

  /**
   * Lista templates aprovados (requer Business Account ID)
   */
  listTemplates: adminProcedure.query(async () => {
    if (!WhatsAppService.isConfigured()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "WhatsApp Business API não está configurada.",
      });
    }

    try {
      const templates = await WhatsAppService.listTemplates();
      return templates;
    } catch (error) {
      // Se falhar (ex: sem Business Account ID), retorna array vazio
      console.error("[WhatsApp] Erro ao listar templates:", error);
      return [];
    }
  }),

  /**
   * Envia uma mensagem de texto
   * 
   * NOTA: Só funciona para números que enviaram mensagem nas últimas 24h
   */
  sendText: adminProcedure
    .input(
      z.object({
        phone: z.string().min(10, "Número deve ter pelo menos 10 dígitos"),
        message: z.string().min(1, "Mensagem não pode estar vazia").max(4096, "Mensagem muito longa"),
      })
    )
    .mutation(async ({ input }) => {
      if (!WhatsAppService.isConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp Business API não está configurada.",
        });
      }

      const validation = WhatsAppService.validateNumber(input.phone);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.reason || "Número inválido",
        });
      }

      try {
        const result = await WhatsAppService.sendText(input.phone, input.message);
        return {
          success: true,
          messageId: result.messages[0]?.id,
          to: result.contacts[0]?.wa_id,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Erro ao enviar mensagem",
        });
      }
    }),

  /**
   * Envia uma mensagem usando template aprovado
   */
  sendTemplate: adminProcedure
    .input(
      z.object({
        phone: z.string().min(10),
        templateName: z.string().min(1, "Nome do template é obrigatório"),
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
      })
    )
    .mutation(async ({ input }) => {
      if (!WhatsAppService.isConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp Business API não está configurada.",
        });
      }

      const validation = WhatsAppService.validateNumber(input.phone);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.reason || "Número inválido",
        });
      }

      try {
        const result = await WhatsAppService.sendTemplate(
          input.phone,
          input.templateName,
          input.languageCode,
          input.parameters as Parameters<typeof WhatsAppService.sendTemplate>[3]
        );
        return {
          success: true,
          messageId: result.messages[0]?.id,
          to: result.contacts[0]?.wa_id,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Erro ao enviar template",
        });
      }
    }),

  /**
   * Envia uma imagem
   */
  sendImage: adminProcedure
    .input(
      z.object({
        phone: z.string().min(10),
        imageUrl: z.string().url("URL da imagem inválida"),
        caption: z.string().max(1024).optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!WhatsAppService.isConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp Business API não está configurada.",
        });
      }

      const validation = WhatsAppService.validateNumber(input.phone);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.reason || "Número inválido",
        });
      }

      try {
        const result = await WhatsAppService.sendImage(
          input.phone,
          input.imageUrl,
          input.caption
        );
        return {
          success: true,
          messageId: result.messages[0]?.id,
          to: result.contacts[0]?.wa_id,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Erro ao enviar imagem",
        });
      }
    }),

  /**
   * Envia um documento
   */
  sendDocument: adminProcedure
    .input(
      z.object({
        phone: z.string().min(10),
        documentUrl: z.string().url("URL do documento inválida"),
        fileName: z.string().min(1, "Nome do arquivo é obrigatório"),
        caption: z.string().max(1024).optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!WhatsAppService.isConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp Business API não está configurada.",
        });
      }

      const validation = WhatsAppService.validateNumber(input.phone);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.reason || "Número inválido",
        });
      }

      try {
        const result = await WhatsAppService.sendDocument(
          input.phone,
          input.documentUrl,
          input.fileName,
          input.caption
        );
        return {
          success: true,
          messageId: result.messages[0]?.id,
          to: result.contacts[0]?.wa_id,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Erro ao enviar documento",
        });
      }
    }),

  /**
   * Envia mensagem de teste
   */
  sendTestMessage: adminProcedure
    .input(
      z.object({
        phone: z.string().min(10),
      })
    )
    .mutation(async ({ input }) => {
      if (!WhatsAppService.isConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp Business API não está configurada.",
        });
      }

      const validation = WhatsAppService.validateNumber(input.phone);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.reason || "Número inválido",
        });
      }

      try {
        const testMessage = `🐾 *TeteCare Hub - Teste de Conexão*\n\n✅ A integração com WhatsApp Business está funcionando!\n\n_Mensagem enviada em ${new Date().toLocaleString("pt-BR")}_`;
        
        const result = await WhatsAppService.sendText(input.phone, testMessage);
        return {
          success: true,
          messageId: result.messages[0]?.id,
          to: result.contacts[0]?.wa_id,
          message: "Mensagem de teste enviada com sucesso!",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Erro ao enviar mensagem de teste",
        });
      }
    }),

  /**
   * Formata um número de telefone (útil para preview)
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
   * Retorna os templates de mensagens de exemplo
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

  /**
   * Retorna informações de configuração para o admin
   */
  getConfigInfo: adminProcedure.query(() => {
    return {
      isConfigured: WhatsAppService.isConfigured(),
      requiredVars: [
        { name: "WHATSAPP_ACCESS_TOKEN", description: "Token de acesso da API" },
        { name: "WHATSAPP_PHONE_NUMBER_ID", description: "ID do número de telefone" },
      ],
      optionalVars: [
        { name: "WHATSAPP_BUSINESS_ACCOUNT_ID", description: "ID da conta Business (para listar templates)" },
        { name: "WHATSAPP_WEBHOOK_VERIFY_TOKEN", description: "Token para verificar webhooks" },
      ],
      docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
      setupUrl: "https://developers.facebook.com/apps",
    };
  }),
});
