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
 * Nome de pessoa/pet
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

export const userRoleSchema = z.enum(["admin", "user"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const approvalStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

export const speciesSchema = z.enum(["dog", "cat"]);
export type Species = z.infer<typeof speciesSchema>;

export const petStatusSchema = z.enum(["active", "checked-in", "inactive"]);
export type PetStatus = z.infer<typeof petStatusSchema>;

export const bookingTypeSchema = z.enum(["daycare", "hotel", "grooming", "vet"]);
export type BookingType = z.infer<typeof bookingTypeSchema>;

export const bookingStatusSchema = z.enum(["pending", "approved", "rejected", "cancelled", "completed"]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export const prioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export type Priority = z.infer<typeof prioritySchema>;

export const eventStatusSchema = z.enum(["scheduled", "completed", "cancelled"]);
export type EventStatus = z.infer<typeof eventStatusSchema>;

export const logSourceSchema = z.enum(["daycare", "home"]);
export type LogSource = z.infer<typeof logSourceSchema>;

export const logTypeSchema = z.enum(["general", "health", "feeding", "exercise", "grooming", "incident"]);
export type LogType = z.infer<typeof logTypeSchema>;

export const moodSchema = z.enum(["happy", "calm", "anxious", "tired", "agitated", "sick"]);
export type Mood = z.infer<typeof moodSchema>;

export const stoolSchema = z.enum(["normal", "soft", "hard", "diarrhea", "bloody", "mucus", "none"]);
export type Stool = z.infer<typeof stoolSchema>;

export const appetiteSchema = z.enum(["excellent", "good", "moderate", "poor", "none"]);
export type Appetite = z.infer<typeof appetiteSchema>;

export const energySchema = z.enum(["high", "normal", "low", "very_low"]);
export type Energy = z.infer<typeof energySchema>;

export const waterIntakeSchema = z.enum(["normal", "increased", "decreased", "none"]);
export type WaterIntake = z.infer<typeof waterIntakeSchema>;

export const trainingCategorySchema = z.enum(["obedience", "socialization", "behavior", "agility", "tricks"]);
export type TrainingCategory = z.infer<typeof trainingCategorySchema>;

export const trainingStatusSchema = z.enum(["learning", "practicing", "mastered"]);
export type TrainingStatus = z.infer<typeof trainingStatusSchema>;

export const trainingMethodSchema = z.enum(["positive_reinforcement", "clicker", "lure", "capture"]);
export type TrainingMethod = z.infer<typeof trainingMethodSchema>;

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
// SCHEMAS DE ENTIDADES - PET
// ==========================================

export const petSchema = z.object({
  // Dados básicos
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome muito longo")
    .transform((v) => v.trim()),
  breed: z.string().max(100).optional(),
  species: speciesSchema.default("dog"),
  birthDate: dateStringSchema,
  weight: z.number().min(0).max(200000).optional(), // até 200kg em gramas
  photoUrl: optionalUrlSchema,
  notes: z.string().max(2000).optional(),
  
  // Dados físicos
  size: z.enum(["mini", "small", "medium", "large", "giant"]).optional(),
  coatType: z.enum(["short", "medium", "long", "wire", "curly", "double", "hairless"]).optional(),
  gender: z.enum(["male", "female"]).optional(),
  neuteredStatus: z.enum(["yes", "no", "scheduled"]).optional(),
  neuteredDate: dateStringSchema,
  
  // Alimentação
  foodBrand: z.string().max(200).optional(),
  foodType: z.enum(["dry_kibble", "wet_food", "natural_raw", "natural_cooked", "mixed", "prescription"]).optional(),
  foodAmount: z.number().min(0).max(10000).optional(), // até 10kg por dia
  foodPreparation: z.enum(["dry_pure", "dry_warm_water", "dry_broth", "natural_cold", "natural_heated", "kibble_topping", "hand_feed", "slow_feeder", "elevated"]).optional(),
  feedingInstructions: z.string().max(1000).optional(),
  
  // Perfil Comportamental
  energyLevel: z.enum(["very_low", "low", "moderate", "high", "hyperactive"]).optional(),
  dogSociability: z.enum(["social", "selective", "reactive", "antisocial"]).optional(),
  humanSociability: z.enum(["friendly", "cautious", "fearful", "reactive"]).optional(),
  playStyle: z.enum(["wrestling", "chase", "fetch", "tug", "independent", "observer"]).optional(),
  correctionSensitivity: z.enum(["high", "medium", "low"]).optional(),
  humanFocusLevel: z.enum(["low", "medium", "high"]).optional(),
  
  // Arrays de seleção múltipla (JSON)
  fearTriggers: z.array(z.string()).optional(),
  calmingMethods: z.array(z.string()).optional(),
  equipmentRestrictions: z.array(z.string()).optional(),
  coexistenceRestrictions: z.array(z.string()).optional(),
  
  // Saúde
  hasFoodAllergy: z.boolean().optional(),
  foodAllergies: z.array(z.string()).optional(),
  hasMedicationAllergy: z.boolean().optional(),
  medicationAllergies: z.array(z.string()).optional(),
  hasChronicCondition: z.boolean().optional(),
  chronicConditions: z.array(z.string()).optional(),
  
  // Protocolo de Emergência
  emergencyVetName: z.string().max(200).optional(),
  emergencyVetPhone: z.string().max(50).optional(),
  emergencyVetAddress: z.string().max(500).optional(),
  
  // Dados de Cio (fêmeas não castradas)
  lastHeatDate: dateStringSchema,
  heatDurationDays: z.number().min(1).max(30).optional(),
});

export const createPetSchema = petSchema;

export const updatePetSchema = petSchema.partial().extend({
  id: idSchema,
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
  petId: optionalIdSchema,
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
// SCHEMAS DE ENTIDADES - RESERVA
// ==========================================

export const bookingRequestSchema = z.object({
  petId: idSchema,
  startDate: dateTimeSchema,
  endDate: dateTimeSchema,
  requestType: bookingTypeSchema.default("daycare"),
  notes: z.string().max(500).optional(),
});

export const updateBookingStatusSchema = z.object({
  id: idSchema,
  status: bookingStatusSchema,
  rejectionReason: z.string().max(500).optional(),
  adminNotes: z.string().max(1000).optional(),
});

// ==========================================
// SCHEMAS DE ENTIDADES - LOGS DIÁRIOS
// ==========================================

export const dailyLogSchema = z.object({
  petId: idSchema,
  logDate: dateTimeSchema,
  source: logSourceSchema,
  logType: logTypeSchema.default("general"),
  mood: moodSchema.optional(),
  stool: stoolSchema.optional(),
  appetite: appetiteSchema.optional(),
  energy: energySchema.optional(),
  waterIntake: waterIntakeSchema.optional(),
  notes: z.string().max(2000).optional(),
  attachments: z.array(z.string().url()).optional(),
});

export const updateDailyLogSchema = dailyLogSchema.partial().extend({
  id: idSchema,
});

// ==========================================
// SCHEMAS DE ENTIDADES - COMPORTAMENTO
// ==========================================

export const behaviorLogSchema = z.object({
  petId: idSchema,
  logDate: dateTimeSchema,
  socialization: z.enum(["excellent", "good", "moderate", "poor"]).optional(),
  energy: z.enum(["high", "normal", "low"]).optional(),
  obedience: z.enum(["excellent", "good", "needs_work"]).optional(),
  anxiety: z.enum(["none", "mild", "moderate", "severe"]).optional(),
  aggression: z.enum(["none", "mild", "moderate", "severe"]).optional(),
  notes: z.string().max(2000).optional(),
  activities: z.array(z.string()).optional(),
  attachments: z.array(z.string().url()).optional(),
});

export const updateBehaviorLogSchema = behaviorLogSchema.partial().extend({
  id: idSchema,
});

// ==========================================
// SCHEMAS DE ENTIDADES - TREINAMENTO
// ==========================================

export const trainingLogSchema = z.object({
  petId: idSchema,
  logDate: dateTimeSchema,
  command: z.string().min(1).max(100),
  category: trainingCategorySchema,
  status: trainingStatusSchema,
  successRate: z.number().int().min(0).max(100).optional(),
  duration: z.number().int().min(0).max(480).optional(), // até 8 horas
  treats: z.number().int().min(0).max(100).optional(),
  method: trainingMethodSchema.optional(),
  notes: z.string().max(2000).optional(),
  videoUrl: optionalUrlSchema,
  attachments: z.array(z.string().url()).optional(),
});

export const updateTrainingLogSchema = trainingLogSchema.partial().extend({
  id: idSchema,
});

// ==========================================
// SCHEMAS DE ENTIDADES - DOCUMENTOS
// ==========================================

export const documentCategorySchema = z.enum([
  "vaccination",
  "exam",
  "prescription",
  "daily_log",
  "behavior",
  "training",
  "nutrition",
  "other",
]);
export type DocumentCategory = z.infer<typeof documentCategorySchema>;

export const documentModuleSchema = z.enum([
  "daily_log",
  "behavior",
  "training",
  "health",
  "vaccination",
  "nutrition",
]);
export type DocumentModule = z.infer<typeof documentModuleSchema>;

export const documentSchema = z.object({
  petId: idSchema,
  title: z.string().min(1, "Título é obrigatório").max(200),
  description: z.string().max(2000).optional(),
  category: documentCategorySchema,
  fileUrl: urlSchema,
  fileName: z.string().max(255).optional(),
  mimeType: z.string().max(100).optional(),
  fileSize: z.number().int().min(0).optional(),
  relatedModule: documentModuleSchema.optional(),
  relatedId: optionalIdSchema,
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
  petId: optionalIdSchema,
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

export const petFilterSchema = z.object({
  petId: optionalIdSchema,
  species: speciesSchema.optional(),
  status: petStatusSchema.optional(),
});

export const logFilterSchema = z.object({
  petId: optionalIdSchema,
  source: logSourceSchema.optional(),
  logType: logTypeSchema.optional(),
  ...dateRangeFilterSchema.shape,
  ...paginationSchema.shape,
});

// ==========================================
// TIPOS INFERIDOS
// ==========================================

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PetInput = z.infer<typeof petSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
export type DailyLogInput = z.infer<typeof dailyLogSchema>;
export type BehaviorLogInput = z.infer<typeof behaviorLogSchema>;
export type TrainingLogInput = z.infer<typeof trainingLogSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type NotificationInput = z.infer<typeof notificationSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeFilter = z.infer<typeof dateRangeFilterSchema>;
export type LogFilter = z.infer<typeof logFilterSchema>;
