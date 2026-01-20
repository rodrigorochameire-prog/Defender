import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import { 
  db, 
  businessSettings,
  businessRules,
  dynamicFlags,
  petFlags,
  ruleExecutionLog,
  pets,
  petAlerts,
} from "@/lib/db";
import { eq, and, desc, sql, isNull, gte, lte } from "drizzle-orm";
import { safeAsync } from "@/lib/errors";

// Tipos de gatilhos disponíveis
const TRIGGER_TYPES = [
  { value: "pet_field_change", label: "Campo do pet alterado", entity: "pet" },
  { value: "log_created", label: "Log diário criado", entity: "daily_log" },
  { value: "behavior_logged", label: "Comportamento registrado", entity: "behavior_log" },
  { value: "feeding_logged", label: "Alimentação registrada", entity: "feeding_log" },
  { value: "threshold_reached", label: "Limite atingido", entity: null },
  { value: "vaccine_expiring", label: "Vacina próxima do vencimento", entity: "vaccine" },
  { value: "credits_low", label: "Créditos baixos", entity: "pet" },
  { value: "stock_low", label: "Estoque de ração baixo", entity: "pet" },
] as const;

// Tipos de ações disponíveis
const ACTION_TYPES = [
  { value: "create_alert", label: "Criar alerta no pet" },
  { value: "add_flag", label: "Adicionar flag ao pet" },
  { value: "remove_flag", label: "Remover flag do pet" },
  { value: "send_notification", label: "Enviar notificação interna" },
  { value: "send_whatsapp", label: "Enviar WhatsApp para tutor" },
  { value: "block_booking", label: "Bloquear novos agendamentos" },
  { value: "unblock_booking", label: "Desbloquear agendamentos" },
  { value: "assign_task", label: "Criar tarefa para equipe" },
  { value: "update_field", label: "Atualizar campo do pet" },
] as const;

// Condições disponíveis
const CONDITIONS = [
  { value: "equals", label: "É igual a" },
  { value: "not_equals", label: "É diferente de" },
  { value: "greater_than", label: "É maior que" },
  { value: "less_than", label: "É menor que" },
  { value: "greater_or_equal", label: "É maior ou igual a" },
  { value: "less_or_equal", label: "É menor ou igual a" },
  { value: "contains", label: "Contém" },
  { value: "is_empty", label: "Está vazio" },
  { value: "is_not_empty", label: "Não está vazio" },
] as const;

/**
 * Router de Regras de Negócio
 */
export const businessRulesRouter = router({
  // ============================================
  // CONFIGURAÇÕES GLOBAIS (THRESHOLDS)
  // ============================================

  /**
   * Lista todas as configurações
   */
  listSettings: adminProcedure
    .input(z.object({
      category: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const conditions = [];
        if (input?.category) {
          conditions.push(eq(businessSettings.category, input.category));
        }

        const settings = await db
          .select()
          .from(businessSettings)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(businessSettings.category, businessSettings.key);

        return settings.map(s => ({
          ...s,
          parsedValue: JSON.parse(s.value),
        }));
      }, "Erro ao listar configurações");
    }),

  /**
   * Obtém valor de uma configuração
   */
  getSetting: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const setting = await db.query.businessSettings.findFirst({
          where: eq(businessSettings.key, input.key),
        });

        if (!setting) return null;

        return {
          ...setting,
          parsedValue: JSON.parse(setting.value),
        };
      }, "Erro ao buscar configuração");
    }),

  /**
   * Atualiza uma configuração
   */
  updateSetting: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const existing = await db.query.businessSettings.findFirst({
          where: eq(businessSettings.key, input.key),
        });

        if (!existing) {
          throw new Error(`Configuração '${input.key}' não encontrada`);
        }

        await db
          .update(businessSettings)
          .set({
            value: JSON.stringify(input.value),
            updatedById: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(eq(businessSettings.key, input.key));

        return { success: true };
      }, "Erro ao atualizar configuração");
    }),

  /**
   * Cria configuração se não existir
   */
  upsertSetting: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.any(),
      category: z.string(),
      label: z.string(),
      description: z.string().optional(),
      dataType: z.enum(["number", "boolean", "string", "json"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const existing = await db.query.businessSettings.findFirst({
          where: eq(businessSettings.key, input.key),
        });

        if (existing) {
          await db
            .update(businessSettings)
            .set({
              value: JSON.stringify(input.value),
              updatedById: ctx.user.id,
              updatedAt: new Date(),
            })
            .where(eq(businessSettings.key, input.key));
        } else {
          await db.insert(businessSettings).values({
            key: input.key,
            value: JSON.stringify(input.value),
            category: input.category,
            label: input.label,
            description: input.description,
            dataType: input.dataType,
            updatedById: ctx.user.id,
          });
        }

        return { success: true };
      }, "Erro ao salvar configuração");
    }),

  /**
   * Inicializa configurações padrão
   */
  initializeDefaultSettings: adminProcedure
    .mutation(async ({ ctx }) => {
      return safeAsync(async () => {
        const defaults = [
          // Thresholds de Saúde
          { key: "vaccine_warning_days", value: 7, category: "thresholds", label: "Aviso de vacina (dias antes)", dataType: "number" as const },
          { key: "vaccine_critical_days", value: 0, category: "thresholds", label: "Vacina crítica (dias após vencimento)", dataType: "number" as const },
          { key: "weight_variation_alert", value: 10, category: "thresholds", label: "Variação de peso para alerta (%)", dataType: "number" as const },
          
          // Thresholds Financeiros
          { key: "credits_warning", value: 3, category: "thresholds", label: "Créditos para aviso", dataType: "number" as const },
          { key: "credits_critical", value: 1, category: "thresholds", label: "Créditos críticos", dataType: "number" as const },
          { key: "credits_block_booking", value: 0, category: "thresholds", label: "Créditos para bloquear agendamento", dataType: "number" as const },
          
          // Thresholds de Estoque
          { key: "food_stock_warning_days", value: 5, category: "thresholds", label: "Estoque de ração - aviso (dias)", dataType: "number" as const },
          { key: "food_stock_critical_days", value: 2, category: "thresholds", label: "Estoque de ração - crítico (dias)", dataType: "number" as const },
          
          // Configurações de Agendamento
          { key: "max_daily_capacity", value: 20, category: "scheduling", label: "Capacidade máxima diária", dataType: "number" as const },
          { key: "allow_overbooking", value: false, category: "scheduling", label: "Permitir overbooking", dataType: "boolean" as const },
          { key: "block_incompatible_pets", value: true, category: "scheduling", label: "Bloquear pets incompatíveis no mesmo dia", dataType: "boolean" as const },
          
          // Configurações de Notificação
          { key: "auto_notify_checkin", value: true, category: "notifications", label: "Notificar tutor no check-in", dataType: "boolean" as const },
          { key: "auto_notify_checkout", value: true, category: "notifications", label: "Notificar tutor no check-out", dataType: "boolean" as const },
          { key: "auto_notify_daily_log", value: false, category: "notifications", label: "Enviar log diário automaticamente", dataType: "boolean" as const },
        ];

        for (const setting of defaults) {
          const existing = await db.query.businessSettings.findFirst({
            where: eq(businessSettings.key, setting.key),
          });

          if (!existing) {
            await db.insert(businessSettings).values({
              ...setting,
              value: JSON.stringify(setting.value),
              updatedById: ctx.user.id,
            });
          }
        }

        return { success: true, count: defaults.length };
      }, "Erro ao inicializar configurações");
    }),

  // ============================================
  // REGRAS DE NEGÓCIO
  // ============================================

  /**
   * Metadados para o construtor de regras
   */
  getRuleBuilderMetadata: adminProcedure
    .query(async () => {
      return {
        triggerTypes: TRIGGER_TYPES,
        actionTypes: ACTION_TYPES,
        conditions: CONDITIONS,
        petFields: [
          { value: "energyLevel", label: "Nível de energia", type: "select", options: ["low", "medium", "high", "very_high"] },
          { value: "anxietySeparation", label: "Ansiedade de separação", type: "select", options: ["none", "mild", "moderate", "severe"] },
          { value: "credits", label: "Créditos", type: "number" },
          { value: "foodStockGrams", label: "Estoque de ração (g)", type: "number" },
          { value: "approvalStatus", label: "Status de aprovação", type: "select", options: ["pending", "approved", "rejected"] },
          { value: "severeAllergies", label: "Alergias graves", type: "text" },
          { value: "feedingInstructions", label: "Instruções de alimentação", type: "text" },
        ],
        behaviorFields: [
          { value: "mood", label: "Humor", type: "select", options: ["happy", "calm", "anxious", "aggressive", "tired", "playful"] },
          { value: "appetite", label: "Apetite", type: "select", options: ["normal", "increased", "decreased", "none"] },
          { value: "energy", label: "Energia observada", type: "select", options: ["low", "normal", "high"] },
        ],
        feedingFields: [
          { value: "consumption", label: "Consumo", type: "select", options: ["all", "most", "half", "little", "none"] },
        ],
        alertSeverities: ["info", "warning", "critical"],
      };
    }),

  /**
   * Lista regras de negócio
   */
  listRules: adminProcedure
    .input(z.object({
      activeOnly: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const conditions = [];
        if (input?.activeOnly) {
          conditions.push(eq(businessRules.isActive, true));
        }

        const rules = await db
          .select()
          .from(businessRules)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(businessRules.priority), businessRules.name);

        return rules.map(r => ({
          ...r,
          actionConfigParsed: JSON.parse(r.actionConfig),
        }));
      }, "Erro ao listar regras");
    }),

  /**
   * Cria nova regra
   */
  createRule: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      priority: z.number().default(0),
      triggerType: z.string(),
      triggerEntity: z.string().optional(),
      triggerField: z.string().optional(),
      triggerCondition: z.string().optional(),
      triggerValue: z.string().optional(),
      actionType: z.string(),
      actionConfig: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const [rule] = await db
          .insert(businessRules)
          .values({
            name: input.name,
            description: input.description,
            priority: input.priority,
            triggerType: input.triggerType,
            triggerEntity: input.triggerEntity,
            triggerField: input.triggerField,
            triggerCondition: input.triggerCondition,
            triggerValue: input.triggerValue,
            actionType: input.actionType,
            actionConfig: JSON.stringify(input.actionConfig),
            createdById: ctx.user.id,
          })
          .returning();

        return rule;
      }, "Erro ao criar regra");
    }),

  /**
   * Atualiza regra
   */
  updateRule: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      priority: z.number().optional(),
      triggerType: z.string().optional(),
      triggerEntity: z.string().optional(),
      triggerField: z.string().optional(),
      triggerCondition: z.string().optional(),
      triggerValue: z.string().optional(),
      actionType: z.string().optional(),
      actionConfig: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const updates: Record<string, unknown> = { updatedAt: new Date() };
        
        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        if (input.isActive !== undefined) updates.isActive = input.isActive;
        if (input.priority !== undefined) updates.priority = input.priority;
        if (input.triggerType !== undefined) updates.triggerType = input.triggerType;
        if (input.triggerEntity !== undefined) updates.triggerEntity = input.triggerEntity;
        if (input.triggerField !== undefined) updates.triggerField = input.triggerField;
        if (input.triggerCondition !== undefined) updates.triggerCondition = input.triggerCondition;
        if (input.triggerValue !== undefined) updates.triggerValue = input.triggerValue;
        if (input.actionType !== undefined) updates.actionType = input.actionType;
        if (input.actionConfig !== undefined) updates.actionConfig = JSON.stringify(input.actionConfig);

        await db
          .update(businessRules)
          .set(updates)
          .where(eq(businessRules.id, input.id));

        return { success: true };
      }, "Erro ao atualizar regra");
    }),

  /**
   * Exclui regra
   */
  deleteRule: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        await db.delete(businessRules).where(eq(businessRules.id, input.id));
        return { success: true };
      }, "Erro ao excluir regra");
    }),

  /**
   * Testa regra contra um pet
   */
  testRule: adminProcedure
    .input(z.object({
      ruleId: z.number(),
      petId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const rule = await db.query.businessRules.findFirst({
          where: eq(businessRules.id, input.ruleId),
        });

        if (!rule) throw new Error("Regra não encontrada");

        const pet = await db.query.pets.findFirst({
          where: eq(pets.id, input.petId),
        });

        if (!pet) throw new Error("Pet não encontrado");

        // Avaliar condição
        const matches = evaluateCondition(
          pet,
          rule.triggerField || "",
          rule.triggerCondition || "equals",
          rule.triggerValue || ""
        );

        return {
          matches,
          pet: { id: pet.id, name: pet.name },
          rule: { id: rule.id, name: rule.name },
          fieldValue: rule.triggerField ? (pet as Record<string, unknown>)[rule.triggerField] : null,
        };
      }, "Erro ao testar regra");
    }),

  // ============================================
  // FLAGS DINÂMICAS
  // ============================================

  /**
   * Lista flags disponíveis
   */
  listFlags: adminProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const conditions = [];
        if (input?.activeOnly) {
          conditions.push(eq(dynamicFlags.isActive, true));
        }

        const flags = await db
          .select()
          .from(dynamicFlags)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(dynamicFlags.name);

        return flags.map(f => ({
          ...f,
          autoConditionParsed: f.autoAssignCondition ? JSON.parse(f.autoAssignCondition) : null,
        }));
      }, "Erro ao listar flags");
    }),

  /**
   * Cria flag
   */
  createFlag: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      color: z.enum(["red", "orange", "yellow", "green", "blue", "purple"]),
      icon: z.string().optional(),
      description: z.string().optional(),
      autoAssignCondition: z.any().optional(),
      showOnCheckin: z.boolean().default(true),
      showOnCalendar: z.boolean().default(true),
      showOnPetCard: z.boolean().default(true),
      showOnDailyLog: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const [flag] = await db
          .insert(dynamicFlags)
          .values({
            name: input.name,
            color: input.color,
            icon: input.icon,
            description: input.description,
            autoAssignCondition: input.autoAssignCondition ? JSON.stringify(input.autoAssignCondition) : null,
            showOnCheckin: input.showOnCheckin,
            showOnCalendar: input.showOnCalendar,
            showOnPetCard: input.showOnPetCard,
            showOnDailyLog: input.showOnDailyLog,
            createdById: ctx.user.id,
          })
          .returning();

        return flag;
      }, "Erro ao criar flag");
    }),

  /**
   * Atribui flag a um pet
   */
  assignFlagToPet: adminProcedure
    .input(z.object({
      petId: z.number(),
      flagId: z.number(),
      notes: z.string().optional(),
      expiresAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar se já existe
        const existing = await db
          .select()
          .from(petFlags)
          .where(
            and(
              eq(petFlags.petId, input.petId),
              eq(petFlags.flagId, input.flagId)
            )
          );

        if (existing.length > 0) {
          throw new Error("Pet já possui esta flag");
        }

        await db.insert(petFlags).values({
          petId: input.petId,
          flagId: input.flagId,
          assignedById: ctx.user.id,
          notes: input.notes,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        });

        return { success: true };
      }, "Erro ao atribuir flag");
    }),

  /**
   * Remove flag de um pet
   */
  removeFlagFromPet: adminProcedure
    .input(z.object({
      petId: z.number(),
      flagId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        await db
          .delete(petFlags)
          .where(
            and(
              eq(petFlags.petId, input.petId),
              eq(petFlags.flagId, input.flagId)
            )
          );

        return { success: true };
      }, "Erro ao remover flag");
    }),

  /**
   * Obtém flags de um pet
   */
  getPetFlags: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const flags = await db
          .select({
            petFlag: petFlags,
            flag: dynamicFlags,
          })
          .from(petFlags)
          .innerJoin(dynamicFlags, eq(petFlags.flagId, dynamicFlags.id))
          .where(
            and(
              eq(petFlags.petId, input.petId),
              eq(dynamicFlags.isActive, true)
            )
          );

        return flags.map(f => ({
          ...f.flag,
          assignedAt: f.petFlag.createdAt,
          notes: f.petFlag.notes,
          expiresAt: f.petFlag.expiresAt,
        }));
      }, "Erro ao buscar flags do pet");
    }),

  // ============================================
  // EXECUÇÃO DE REGRAS
  // ============================================

  /**
   * Executa regras para um pet
   */
  executeRulesForPet: adminProcedure
    .input(z.object({
      petId: z.number(),
      triggerType: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const pet = await db.query.pets.findFirst({
          where: eq(pets.id, input.petId),
        });

        if (!pet) throw new Error("Pet não encontrado");

        // Buscar regras ativas
        const conditions = [eq(businessRules.isActive, true)];
        if (input.triggerType) {
          conditions.push(eq(businessRules.triggerType, input.triggerType));
        }

        const rules = await db
          .select()
          .from(businessRules)
          .where(and(...conditions))
          .orderBy(desc(businessRules.priority));

        const results = [];

        for (const rule of rules) {
          // Avaliar condição
          const matches = evaluateCondition(
            pet,
            rule.triggerField || "",
            rule.triggerCondition || "equals",
            rule.triggerValue || ""
          );

          if (matches) {
            // Executar ação
            const actionResult = await executeAction(
              rule,
              pet,
              ctx.user.id
            );

            // Registrar execução
            await db.insert(ruleExecutionLog).values({
              ruleId: rule.id,
              petId: pet.id,
              triggerData: JSON.stringify({ field: rule.triggerField, value: (pet as Record<string, unknown>)[rule.triggerField || ""] }),
              actionResult: JSON.stringify(actionResult),
              success: actionResult.success,
              errorMessage: actionResult.error,
            });

            // Atualizar contador
            await db
              .update(businessRules)
              .set({
                executionCount: sql`${businessRules.executionCount} + 1`,
                lastExecutedAt: new Date(),
              })
              .where(eq(businessRules.id, rule.id));

            results.push({
              rule: { id: rule.id, name: rule.name },
              matched: true,
              executed: true,
              result: actionResult,
            });
          }
        }

        return { 
          pet: { id: pet.id, name: pet.name },
          rulesEvaluated: rules.length,
          rulesExecuted: results.filter(r => r.executed).length,
          results,
        };
      }, "Erro ao executar regras");
    }),

  /**
   * Histórico de execução de regras
   */
  getExecutionHistory: adminProcedure
    .input(z.object({
      ruleId: z.number().optional(),
      petId: z.number().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const conditions = [];
        if (input.ruleId) {
          conditions.push(eq(ruleExecutionLog.ruleId, input.ruleId));
        }
        if (input.petId) {
          conditions.push(eq(ruleExecutionLog.petId, input.petId));
        }

        const history = await db
          .select({
            log: ruleExecutionLog,
            rule: businessRules,
            pet: pets,
          })
          .from(ruleExecutionLog)
          .leftJoin(businessRules, eq(ruleExecutionLog.ruleId, businessRules.id))
          .leftJoin(pets, eq(ruleExecutionLog.petId, pets.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(ruleExecutionLog.executedAt))
          .limit(input.limit);

        return history.map(h => ({
          ...h.log,
          ruleName: h.rule?.name,
          petName: h.pet?.name,
          triggerDataParsed: h.log.triggerData ? JSON.parse(h.log.triggerData) : null,
          actionResultParsed: h.log.actionResult ? JSON.parse(h.log.actionResult) : null,
        }));
      }, "Erro ao buscar histórico");
    }),
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function evaluateCondition(
  entity: Record<string, unknown>,
  field: string,
  condition: string,
  targetValue: string
): boolean {
  if (!field) return true; // Sem campo = sempre true

  const value = entity[field];
  
  switch (condition) {
    case "equals":
      return String(value) === targetValue;
    case "not_equals":
      return String(value) !== targetValue;
    case "greater_than":
      return Number(value) > Number(targetValue);
    case "less_than":
      return Number(value) < Number(targetValue);
    case "greater_or_equal":
      return Number(value) >= Number(targetValue);
    case "less_or_equal":
      return Number(value) <= Number(targetValue);
    case "contains":
      return String(value).toLowerCase().includes(targetValue.toLowerCase());
    case "is_empty":
      return value === null || value === undefined || value === "";
    case "is_not_empty":
      return value !== null && value !== undefined && value !== "";
    default:
      return false;
  }
}

async function executeAction(
  rule: typeof businessRules.$inferSelect,
  pet: typeof pets.$inferSelect,
  userId: number
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const config = JSON.parse(rule.actionConfig);

    switch (rule.actionType) {
      case "create_alert":
        await db.insert(petAlerts).values({
          petId: pet.id,
          alertType: config.alertType || "behavior",
          severity: config.severity || "warning",
          title: config.title || `Alerta automático: ${rule.name}`,
          description: config.description || `Regra "${rule.name}" acionada automaticamente`,
          createdById: userId,
        });
        return { success: true, message: "Alerta criado" };

      case "add_flag":
        if (config.flagId) {
          // Verificar se já existe
          const existing = await db
            .select()
            .from(petFlags)
            .where(
              and(
                eq(petFlags.petId, pet.id),
                eq(petFlags.flagId, config.flagId)
              )
            );

          if (existing.length === 0) {
            await db.insert(petFlags).values({
              petId: pet.id,
              flagId: config.flagId,
              assignedByRule: rule.id,
              notes: `Atribuída automaticamente pela regra "${rule.name}"`,
            });
          }
        }
        return { success: true, message: "Flag adicionada" };

      case "update_field":
        if (config.field && config.value !== undefined) {
          await db
            .update(pets)
            .set({ [config.field]: config.value })
            .where(eq(pets.id, pet.id));
        }
        return { success: true, message: `Campo ${config.field} atualizado` };

      default:
        return { success: false, error: `Ação '${rule.actionType}' não implementada` };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
