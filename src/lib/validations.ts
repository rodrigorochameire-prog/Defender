import { z } from "zod";

// ==========================================
// SCHEMAS BASE REUTILIZÁVEIS
// ==========================================

/**
 * Email com normalização
 */
export const emailSchema = z
  .string()
  .email("Email inválido")
  .max(320, "Email muito longo")
  .transform((v) => v.toLowerCase().trim());

/**
 * Senha com requisitos de segurança
 */
export const passwordSchema = z
  .string()
  .min(6, "Senha deve ter no mínimo 6 caracteres")
  .max(100, "Senha muito longa");

/**
 * Senha forte com mais requisitos
 */
export const strongPasswordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .max(100, "Senha muito longa")
  .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
  .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
  .regex(/[0-9]/, "Senha deve conter pelo menos um número");

/**
 * Nome de pessoa
 */
export const nameSchema = z
  .string()
  .min(2, "Nome deve ter no mínimo 2 caracteres")
  .max(100, "Nome muito longo")
  .transform((v) => v.trim());

/**
 * Telefone brasileiro
 */
export const phoneSchema = z
  .string()
  .regex(/^[\d\s\-\(\)]+$/, "Telefone inválido")
  .min(10, "Telefone muito curto")
  .max(20, "Telefone muito longo")
  .optional()
  .or(z.literal(""));

/**
 * ID numérico (aceita number ou string convertível)
 */
export const idSchema = z
  .union([z.number(), z.string().transform((v) => parseInt(v, 10))])
  .pipe(z.number().int().positive("ID inválido"));

/**
 * ID opcional
 */
export const optionalIdSchema = idSchema.optional().nullable();

/**
 * Data em formato ISO string
 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "Data inválida (use YYYY-MM-DD)")
  .optional();

/**
 * Data/hora em formato ISO
 */
export const dateTimeSchema = z.string().datetime("Data/hora inválida");

/**
 * URL válida
 */
export const urlSchema = z.string().url("URL inválida").max(2000, "URL muito longa");

/**
 * URL opcional
 */
export const optionalUrlSchema = urlSchema.optional().nullable();

// ==========================================
// SCHEMAS DE PAGINAÇÃO E ORDENAÇÃO
// ==========================================

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export const searchSchema = z.object({
  query: z.string().max(200).optional(),
});

// ==========================================
// ENUMS E TIPOS
// ==========================================

export const userRoleSchema = z.enum(["admin", "defensor", "estagiario", "servidor"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const approvalStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

export const prioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export type Priority = z.infer<typeof prioritySchema>;

export const eventStatusSchema = z.enum(["scheduled", "completed", "cancelled"]);
export type EventStatus = z.infer<typeof eventStatusSchema>;

// ==========================================
// SCHEMAS DE ENTIDADES - USUÁRIO
// ==========================================

export const userSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
});

export const createUserSchema = userSchema.extend({
  password: passwordSchema,
});

export const updateUserSchema = userSchema.partial();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha é obrigatória"),
});

// ==========================================
// SCHEMAS DE ENTIDADES - EVENTO
// ==========================================

export const calendarEventSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200),
  description: z.string().max(2000).optional(),
  eventDate: dateTimeSchema,
  endDate: dateTimeSchema.optional(),
  eventType: z.string().min(1).max(100),
  // Relacionamentos jurídicos
  processoId: optionalIdSchema,
  assistidoId: optionalIdSchema,
  demandaId: optionalIdSchema,
  isAllDay: z.boolean().default(true),
  color: z.string().max(20).optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  reminderMinutes: z.number().int().min(0).optional(),
  priority: prioritySchema.default("normal"),
  status: eventStatusSchema.default("scheduled"),
  isRecurring: z.boolean().default(false),
  recurrenceType: z.enum(["daily", "weekly", "biweekly", "monthly", "yearly"]).optional(),
  recurrenceInterval: z.number().int().min(1).max(365).default(1),
  recurrenceEndDate: dateTimeSchema.optional(),
  recurrenceCount: z.number().int().min(1).max(365).optional(),
  recurrenceDays: z.string().max(50).optional(),
});

export const updateCalendarEventSchema = calendarEventSchema.partial().extend({
  id: idSchema,
});

// ==========================================
// SCHEMAS DE ENTIDADES - DOCUMENTOS
// ==========================================

export const documentCategorySchema = z.enum([
  "peticao",
  "despacho",
  "decisao",
  "sentenca",
  "recurso",
  "relatorio",
  "outro",
]);
export type DocumentCategory = z.infer<typeof documentCategorySchema>;

export const documentModuleSchema = z.enum([
  "processo",
  "assistido",
  "demanda",
  "caso",
  "audiencia",
  "juri",
  "outro",
]);
export type DocumentModule = z.infer<typeof documentModuleSchema>;

export const documentSchema = z.object({
  processoId: optionalIdSchema,
  assistidoId: optionalIdSchema,
  demandaId: optionalIdSchema,
  title: z.string().min(1, "Título é obrigatório").max(200),
  description: z.string().max(2000).optional(),
  category: documentCategorySchema,
  fileUrl: urlSchema,
  fileName: z.string().max(255).optional(),
  mimeType: z.string().max(100).optional(),
  fileSize: z.number().int().min(0).optional(),
  relatedModule: documentModuleSchema.optional(),
});

export const updateDocumentSchema = documentSchema.partial().extend({
  id: idSchema,
});

// ==========================================
// SCHEMAS DE ENTIDADES - NOTIFICAÇÃO
// ==========================================

export const notificationTypeSchema = z.enum(["info", "warning", "success", "error"]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSchema = z.object({
  userId: idSchema,
  processoId: optionalIdSchema,
  demandaId: optionalIdSchema,
  type: notificationTypeSchema.default("info"),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  actionUrl: z.string().max(500).optional(),
});

// ==========================================
// SCHEMAS DE FILTROS
// ==========================================

export const dateRangeFilterSchema = z.object({
  startDate: dateTimeSchema.optional(),
  endDate: dateTimeSchema.optional(),
});

// ==========================================
// TIPOS INFERIDOS
// ==========================================

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type NotificationInput = z.infer<typeof notificationSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeFilter = z.infer<typeof dateRangeFilterSchema>;
