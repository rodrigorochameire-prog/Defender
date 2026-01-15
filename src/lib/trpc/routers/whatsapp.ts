import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { whatsappMessages, whatsappConfig } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * Router tRPC para integração com WhatsApp Business API (Meta)
 * Adaptado para DefensorHub - notificações jurídicas
 */
export const whatsappRouter = router({
  // ============================================
  // Configuração
  // ============================================

  /**
   * Verifica se há configuração ativa
   */
  isConfigured: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") return false;
    
    const config = await db.query.whatsappConfig.findFirst({
      where: eq(whatsappConfig.adminId, ctx.user.id),
    });
    
    return config?.isActive ?? false;
  }),

  /**
   * Obtém configuração do admin atual (sem dados sensíveis)
   */
  getMyConfig: adminProcedure.query(async ({ ctx }) => {
    const config = await db.query.whatsappConfig.findFirst({
      where: eq(whatsappConfig.adminId, ctx.user.id),
    });
    
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
        autoNotifyPrazo: config.autoNotifyPrazo,
        autoNotifyAudiencia: config.autoNotifyAudiencia,
        autoNotifyJuri: config.autoNotifyJuri,
        autoNotifyMovimentacao: config.autoNotifyMovimentacao,
        hasAccessToken: !!config.accessToken,
      } : null,
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
      autoNotifyPrazo: z.boolean().optional(),
      autoNotifyAudiencia: z.boolean().optional(),
      autoNotifyJuri: z.boolean().optional(),
      autoNotifyMovimentacao: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existingConfig = await db.query.whatsappConfig.findFirst({
        where: eq(whatsappConfig.adminId, ctx.user.id),
      });
      
      if (existingConfig) {
        await db
          .update(whatsappConfig)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(whatsappConfig.adminId, ctx.user.id));
      } else {
        await db.insert(whatsappConfig).values({
          adminId: ctx.user.id,
          ...input,
        });
      }
      
      return { success: true };
    }),

  /**
   * Ativa/Desativa configuração
   */
  setActive: adminProcedure
    .input(z.object({ active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(whatsappConfig)
        .set({
          isActive: input.active,
          updatedAt: new Date(),
        })
        .where(eq(whatsappConfig.adminId, ctx.user.id));
      
      return { success: true };
    }),

  // ============================================
  // Envio de Mensagens
  // ============================================

  /**
   * Envia mensagem de texto simples
   */
  sendText: adminProcedure
    .input(z.object({
      phone: z.string().min(10),
      message: z.string().min(1).max(4096),
      assistidoId: z.number().optional(),
      context: z.enum(["prazo", "audiencia", "juri", "movimentacao", "manual"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const config = await db.query.whatsappConfig.findFirst({
        where: and(
          eq(whatsappConfig.adminId, ctx.user.id),
          eq(whatsappConfig.isActive, true)
        ),
      });
      
      if (!config?.accessToken || !config?.phoneNumberId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp não está configurado",
        });
      }

      // Formatar número
      const formattedPhone = input.phone.replace(/\D/g, "");
      const phoneWithCountry = formattedPhone.startsWith("55") ? formattedPhone : `55${formattedPhone}`;

      try {
        // Enviar via API do WhatsApp
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.accessToken}`,
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phoneWithCountry,
              type: "text",
              text: { body: input.message },
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || "Erro ao enviar mensagem");
        }

        // Registrar mensagem
        await db.insert(whatsappMessages).values({
          configId: config.id,
          toPhone: phoneWithCountry,
          assistidoId: input.assistidoId || null,
          messageType: "text",
          content: input.message,
          messageId: data.messages?.[0]?.id,
          status: "sent",
          context: input.context || "manual",
          sentById: ctx.user.id,
          sentAt: new Date(),
        });

        return {
          success: true,
          messageId: data.messages?.[0]?.id,
        };
      } catch (error: any) {
        // Registrar erro
        await db.insert(whatsappMessages).values({
          configId: config.id,
          toPhone: phoneWithCountry,
          assistidoId: input.assistidoId || null,
          messageType: "text",
          content: input.message,
          status: "failed",
          errorMessage: error.message,
          context: input.context || "manual",
          sentById: ctx.user.id,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Erro ao enviar mensagem",
        });
      }
    }),

  /**
   * Envia mensagem de teste
   */
  sendTestMessage: adminProcedure
    .input(z.object({
      phone: z.string().min(10),
    }))
    .mutation(async ({ ctx, input }) => {
      const config = await db.query.whatsappConfig.findFirst({
        where: and(
          eq(whatsappConfig.adminId, ctx.user.id),
          eq(whatsappConfig.isActive, true)
        ),
      });
      
      if (!config?.accessToken || !config?.phoneNumberId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp não está configurado",
        });
      }

      const formattedPhone = input.phone.replace(/\D/g, "");
      const phoneWithCountry = formattedPhone.startsWith("55") ? formattedPhone : `55${formattedPhone}`;

      const testMessage = `⚖️ *DefensorHub - Teste de Conexão*\n\n✅ A integração com WhatsApp está funcionando!\n\n_Mensagem enviada em ${new Date().toLocaleString("pt-BR")}_`;

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phoneWithCountry,
            type: "text",
            text: { body: testMessage },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: data.error?.message || "Erro ao enviar mensagem de teste",
        });
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
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
      assistidoId: z.number().optional(),
      context: z.enum(["prazo", "audiencia", "juri", "movimentacao", "manual"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const config = await db.query.whatsappConfig.findFirst({
        where: eq(whatsappConfig.adminId, ctx.user.id),
      });
      
      if (!config) {
        return { messages: [], total: 0 };
      }

      const conditions = [eq(whatsappMessages.configId, config.id)];
      
      if (input.assistidoId) {
        conditions.push(eq(whatsappMessages.assistidoId, input.assistidoId));
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
          assistido: true,
          sentBy: true,
        },
      });

      return {
        messages,
        total: messages.length,
      };
    }),

  // ============================================
  // Templates Jurídicos
  // ============================================

  /**
   * Retorna templates de mensagem para contexto jurídico
   */
  getTemplates: protectedProcedure.query(() => {
    return {
      prazoVencimento: {
        name: "Lembrete de Prazo",
        description: "Notificação sobre prazo próximo ao vencimento",
        example: `⚖️ *Defensoria Pública - Lembrete*

Olá, {nome}!

📋 *Processo:* {numero_processo}
📅 *Prazo:* {data_prazo}
📝 *Ato:* {tipo_ato}

Em caso de dúvidas, entre em contato com a Defensoria.`,
      },
      audienciaAgendada: {
        name: "Audiência Agendada",
        description: "Notificação sobre audiência marcada",
        example: `⚖️ *Defensoria Pública - Audiência*

Olá, {nome}!

📋 *Processo:* {numero_processo}
📅 *Data:* {data_audiencia}
📍 *Local:* {local}

*IMPORTANTE:* Compareça com 30min de antecedência.`,
      },
      juriAgendado: {
        name: "Sessão do Júri",
        description: "Notificação sobre plenário do Júri",
        example: `⚖️ *Defensoria Pública - Júri*

Olá, {nome}!

📋 *Processo:* {numero_processo}
📅 *Data:* {data_juri}
🏛️ *Sala:* {sala}

*IMPORTANTE:* Compareça 1h antes. Traga documento com foto.`,
      },
      movimentacao: {
        name: "Movimentação Processual",
        description: "Notificação sobre nova movimentação",
        example: `⚖️ *Defensoria Pública - Atualização*

Olá, {nome}!

📋 *Processo:* {numero_processo}
📅 *Data:* {data}
📝 *Movimentação:* {descricao}

Entre em contato para mais informações.`,
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
      const cleaned = input.phone.replace(/\D/g, "");
      const formatted = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
      const isValid = formatted.length >= 12 && formatted.length <= 13;
      
      return {
        original: input.phone,
        formatted,
        valid: isValid,
        reason: isValid ? undefined : "Número deve ter 10-11 dígitos + código do país",
      };
    }),

  /**
   * Retorna informações de configuração
   */
  getConfigInfo: adminProcedure.query(async ({ ctx }) => {
    const config = await db.query.whatsappConfig.findFirst({
      where: eq(whatsappConfig.adminId, ctx.user.id),
    });
    
    return {
      hasConfig: !!config,
      isActive: config?.isActive ?? false,
      requiredVars: [
        { name: "accessToken", description: "Token de acesso da API (Access Token)" },
        { name: "phoneNumberId", description: "ID do número de telefone (Phone Number ID)" },
      ],
      optionalVars: [
        { name: "businessAccountId", description: "ID da conta Business" },
        { name: "webhookVerifyToken", description: "Token para verificar webhooks" },
      ],
      docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    };
  }),
});
