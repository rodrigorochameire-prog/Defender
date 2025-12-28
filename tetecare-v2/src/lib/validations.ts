import { z } from "zod";

/**
 * Schemas de validação reutilizáveis
 */

// Email
export const emailSchema = z
  .string()
  .email("Email inválido")
  .max(320, "Email muito longo")
  .transform((v) => v.toLowerCase().trim());

// Senha
export const passwordSchema = z
  .string()
  .min(6, "Senha deve ter no mínimo 6 caracteres")
  .max(100, "Senha muito longa");

// Nome
export const nameSchema = z
  .string()
  .min(2, "Nome deve ter no mínimo 2 caracteres")
  .max(100, "Nome muito longo")
  .transform((v) => v.trim());

// Telefone (opcional)
export const phoneSchema = z
  .string()
  .regex(/^[\d\s\-\(\)]+$/, "Telefone inválido")
  .min(10, "Telefone muito curto")
  .max(20, "Telefone muito longo")
  .optional()
  .or(z.literal(""));

// ID numérico
export const idSchema = z.number().int().positive("ID inválido");

// Data (string ISO)
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "Data inválida (use YYYY-MM-DD)")
  .optional();

// Paginação
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Ordenação
export const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Schemas de entidades
 */

// Usuário
export const userSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
});

export const createUserSchema = userSchema.extend({
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha é obrigatória"),
});

// Pet
export const petSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome muito longo")
    .transform((v) => v.trim()),
  breed: z.string().max(100).optional(),
  species: z.enum(["dog", "cat"]).default("dog"),
  birthDate: dateStringSchema,
  weight: z.number().min(0).max(200000).optional(), // até 200kg em gramas
  notes: z.string().max(2000).optional(),
  foodBrand: z.string().max(200).optional(),
  foodAmount: z.number().min(0).max(10000).optional(), // até 10kg por dia
});

export const updatePetSchema = petSchema.partial().extend({
  id: idSchema,
});

// Evento do calendário
export const calendarEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  eventDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  eventType: z.string().min(1).max(100),
  petId: idSchema.optional(),
  isAllDay: z.boolean().default(true),
  color: z.string().max(20).optional(),
});

// Solicitação de reserva
export const bookingRequestSchema = z.object({
  petId: idSchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  requestType: z.enum(["daycare", "hotel", "grooming", "vet"]).default("daycare"),
  notes: z.string().max(500).optional(),
});

// Notificação
export const notificationSchema = z.object({
  userId: idSchema,
  petId: idSchema.optional(),
  type: z.enum(["info", "warning", "success", "error"]).default("info"),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  actionUrl: z.string().max(500).optional(),
});

/**
 * Tipos inferidos dos schemas
 */
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PetInput = z.infer<typeof petSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
