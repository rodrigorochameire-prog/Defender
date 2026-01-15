import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ==========================================
// USUÁRIOS
// ==========================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 20 }).default("user").notNull(), // 'admin' | 'user'
  phone: text("phone"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  approvalStatus: varchar("approval_status", { length: 20 }).default("pending").notNull(), // 'pending' | 'approved' | 'rejected'
  // Soft delete
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // Índices para buscas frequentes
  index("users_role_idx").on(table.role),
  index("users_approval_status_idx").on(table.approvalStatus),
  index("users_deleted_at_idx").on(table.deletedAt),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==========================================
// PETS
// ==========================================

export const pets = pgTable("pets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  breed: varchar("breed", { length: 100 }),
  species: varchar("species", { length: 50 }).default("dog").notNull(), // 'dog' | 'cat'
  birthDate: timestamp("birth_date"),
  weight: integer("weight"), // em gramas (ex: 32500 = 32.5kg)
  photoUrl: text("photo_url"),
  status: varchar("status", { length: 50 }).default("active").notNull(), // 'active' | 'checked-in' | 'inactive'
  approvalStatus: varchar("approval_status", { length: 50 }).default("pending").notNull(), // 'pending' | 'approved' | 'rejected'
  notes: text("notes"),
  
  // === DADOS FÍSICOS AVANÇADOS ===
  size: varchar("size", { length: 20 }), // 'mini' | 'small' | 'medium' | 'large' | 'giant'
  coatType: varchar("coat_type", { length: 30 }), // 'short' | 'long' | 'double' | 'wire' | 'curly' | 'hairless'
  isCastrated: boolean("is_castrated"),
  lastHeatDate: timestamp("last_heat_date"), // Para fêmeas não castradas
  sex: varchar("sex", { length: 10 }), // 'male' | 'female'
  
  // === PERFIL COMPORTAMENTAL ===
  energyLevel: varchar("energy_level", { length: 20 }), // 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
  dogSociability: varchar("dog_sociability", { length: 20 }), // 'social' | 'selective' | 'reactive' | 'antisocial'
  humanSociability: varchar("human_sociability", { length: 20 }), // 'friendly' | 'cautious' | 'fearful' | 'reactive'
  playStyle: varchar("play_style", { length: 20 }), // 'wrestling' | 'chase' | 'independent' | 'observer'
  correctionSensitivity: varchar("correction_sensitivity", { length: 20 }), // 'high' | 'medium' | 'low'
  humanFocus: varchar("human_focus", { length: 20 }), // 'low' | 'medium' | 'high'
  fearTriggers: jsonb("fear_triggers").$type<string[]>().default([]), // ['thunder', 'dryer', 'broom', 'men_hat', 'dogs_barking', 'motorcycles']
  calmingTechnique: varchar("calming_technique", { length: 30 }), // 'treat' | 'chest_pet' | 'timeout' | 'specific_toy'
  equipmentRestrictions: jsonb("equipment_restrictions").$type<string[]>().default([]), // ['no_choke', 'harness_only', 'no_overhead_collar']
  
  // === RESTRIÇÕES DE CONVÍVIO ===
  sociabilityLevel: varchar("sociability_level", { length: 20 }), // 'shy' | 'selective' | 'friendly' | 'very_social'
  anxietySeparation: varchar("anxiety_separation", { length: 20 }), // 'none' | 'mild' | 'moderate' | 'severe'
  roomPreference: varchar("room_preference", { length: 50 }), // 'small_dogs' | 'large_dogs' | 'calm' | 'active'
  convivenceRestrictions: jsonb("convivence_restrictions").$type<string[]>().default([]), // ['no_intact_males', 'no_small_dogs', 'resource_guarding']
  
  // === MÉTRICAS DE TEMPERAMENTO (1-5) ===
  confidenceLevel: integer("confidence_level"), // 1=medroso, 5=muito confiante
  impulsivityLevel: integer("impulsivity_level"), // 1=reflexivo, 5=impulsivo
  resilienceLevel: integer("resilience_level"), // 1=demora a recuperar, 5=recupera rápido
  
  // === ALIMENTAÇÃO ===
  foodBrand: varchar("food_brand", { length: 200 }),
  foodType: varchar("food_type", { length: 50 }), // 'dry' | 'wet' | 'mixed' | 'natural' | 'barf'
  foodAmount: integer("food_amount"), // quantidade diária em gramas
  foodStockGrams: integer("food_stock_grams"), // estoque atual na creche em gramas
  foodStockLastUpdate: timestamp("food_stock_last_update"), // última atualização do estoque
  feedingInstructions: text("feeding_instructions"), // instruções especiais de preparo
  foodPreparation: varchar("food_preparation", { length: 30 }), // 'dry' | 'with_water' | 'natural_cold' | 'natural_heated' | 'with_topping'
  
  // === SAÚDE E ALERGIAS ===
  hasFoodAllergy: boolean("has_food_allergy"),
  foodAllergyDetails: text("food_allergy_details"), // Ingredientes alérgicos
  hasMedicationAllergy: boolean("has_medication_allergy"),
  medicationAllergyDetails: text("medication_allergy_details"),
  hasChronicCondition: boolean("has_chronic_condition"),
  chronicConditionDetails: text("chronic_condition_details"), // Cardíaco, Renal, Epilético
  
  // === PROTOCOLO DE EMERGÊNCIA ===
  emergencyVetName: varchar("emergency_vet_name", { length: 200 }),
  emergencyVetPhone: varchar("emergency_vet_phone", { length: 50 }),
  emergencyVetAddress: text("emergency_vet_address"),
  severeAllergies: text("severe_allergies"), // alergias graves
  medicalConditions: text("medical_conditions"), // condições médicas crônicas
  
  credits: integer("credits").default(0).notNull(), // créditos de creche
  // Soft delete
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // Índices para buscas frequentes
  index("pets_status_idx").on(table.status),
  index("pets_approval_status_idx").on(table.approvalStatus),
  index("pets_species_idx").on(table.species),
  index("pets_deleted_at_idx").on(table.deletedAt),
  index("pets_energy_level_idx").on(table.energyLevel),
  index("pets_room_preference_idx").on(table.roomPreference),
  index("pets_dog_sociability_idx").on(table.dogSociability),
]);

export type Pet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;

// ==========================================
// RELAÇÃO PET-TUTOR (N:N)
// ==========================================

export const petTutors = pgTable("pet_tutors", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  tutorId: integer("tutor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").default(false).notNull(), // tutor principal
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // Índices para joins rápidos
  index("pet_tutors_pet_id_idx").on(table.petId),
  index("pet_tutors_tutor_id_idx").on(table.tutorId),
  // Índice único para evitar duplicatas
  uniqueIndex("pet_tutors_pet_tutor_unique").on(table.petId, table.tutorId),
]);

export type PetTutor = typeof petTutors.$inferSelect;
export type InsertPetTutor = typeof petTutors.$inferInsert;

// ==========================================
// EVENTOS DO CALENDÁRIO
// ==========================================

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  endDate: timestamp("end_date"),
  eventType: varchar("event_type", { length: 100 }).notNull(), // 'checkin', 'vaccine', 'medication', etc.
  petId: integer("pet_id").references(() => pets.id, { onDelete: "cascade" }),
  isAllDay: boolean("is_all_day").default(true).notNull(),
  color: varchar("color", { length: 20 }),
  // Campos adicionais para detalhamento
  location: varchar("location", { length: 200 }), // Local do evento
  notes: text("notes"), // Notas adicionais
  reminderMinutes: integer("reminder_minutes"), // Lembrete X minutos antes
  priority: varchar("priority", { length: 20 }).default("normal"), // 'low' | 'normal' | 'high' | 'urgent'
  status: varchar("status", { length: 20 }).default("scheduled"), // 'scheduled' | 'completed' | 'cancelled'
  // Campos para recorrência
  isRecurring: boolean("is_recurring").default(false),
  recurrenceType: varchar("recurrence_type", { length: 20 }), // 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  recurrenceInterval: integer("recurrence_interval").default(1), // A cada X dias/semanas/meses
  recurrenceEndDate: timestamp("recurrence_end_date"), // Data final da recorrência
  recurrenceCount: integer("recurrence_count"), // Número de ocorrências (alternativa a endDate)
  recurrenceDays: varchar("recurrence_days", { length: 50 }), // Para weekly: "0,1,2,3,4" (Dom-Qui)
  parentEventId: integer("parent_event_id"), // Referência ao evento pai (para séries)
  // Soft delete
  deletedAt: timestamp("deleted_at"),
  // Metadados
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Índices para carregamento rápido do calendário
  index("calendar_events_event_date_idx").on(table.eventDate),
  index("calendar_events_pet_id_idx").on(table.petId),
  index("calendar_events_event_type_idx").on(table.eventType),
  index("calendar_events_status_idx").on(table.status),
  index("calendar_events_deleted_at_idx").on(table.deletedAt),
  // Índice composto para range queries de data
  index("calendar_events_date_range_idx").on(table.eventDate, table.endDate),
]);

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

// ==========================================
// BIBLIOTECA DE VACINAS
// ==========================================

export const vaccineLibrary = pgTable("vaccine_library", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  intervalDays: integer("interval_days"), // intervalo recomendado entre doses
  dosesRequired: integer("doses_required").default(1),
  isCommon: boolean("is_common").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type VaccineLibrary = typeof vaccineLibrary.$inferSelect;
export type InsertVaccineLibrary = typeof vaccineLibrary.$inferInsert;

// ==========================================
// VACINAÇÕES DO PET
// ==========================================

export const petVaccinations = pgTable("pet_vaccinations", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  vaccineId: integer("vaccine_id")
    .notNull()
    .references(() => vaccineLibrary.id),
  applicationDate: timestamp("application_date").notNull(),
  nextDueDate: timestamp("next_due_date"),
  doseNumber: integer("dose_number").default(1),
  veterinarian: varchar("veterinarian", { length: 200 }),
  clinic: varchar("clinic", { length: 200 }),
  notes: text("notes"),
  documentUrl: text("document_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PetVaccination = typeof petVaccinations.$inferSelect;
export type InsertPetVaccination = typeof petVaccinations.$inferInsert;

// ==========================================
// CRÉDITOS DE CRECHE
// ==========================================

export const creditPackages = pgTable("credit_packages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  credits: integer("credits").notNull(), // número de créditos/dias
  priceInCents: integer("price_in_cents").notNull(),
  discountPercent: integer("discount_percent").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CreditPackage = typeof creditPackages.$inferSelect;
export type InsertCreditPackage = typeof creditPackages.$inferInsert;

// ==========================================
// SOLICITAÇÕES DE RESERVA
// ==========================================

export const bookingRequests = pgTable("booking_requests", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  tutorId: integer("tutor_id")
    .notNull()
    .references(() => users.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  requestType: varchar("request_type", { length: 50 }).default("daycare").notNull(), // 'daycare' | 'hotel' | 'grooming' | 'vet'
  status: varchar("status", { length: 50 }).default("pending").notNull(), // 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed'
  notes: text("notes"),
  rejectionReason: text("rejection_reason"),
  adminNotes: text("admin_notes"),
  approvedById: integer("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // Índices para filtragem no dashboard admin
  index("booking_requests_status_idx").on(table.status),
  index("booking_requests_pet_id_idx").on(table.petId),
  index("booking_requests_tutor_id_idx").on(table.tutorId),
  index("booking_requests_request_type_idx").on(table.requestType),
  // Índice para range queries de data
  index("booking_requests_date_range_idx").on(table.startDate, table.endDate),
]);

export type BookingRequest = typeof bookingRequests.$inferSelect;
export type InsertBookingRequest = typeof bookingRequests.$inferInsert;

// ==========================================
// NOTIFICAÇÕES
// ==========================================

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  petId: integer("pet_id").references(() => pets.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(), // 'info' | 'warning' | 'success' | 'error'
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  actionUrl: text("action_url"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // Índices para notificações do usuário
  index("notifications_user_id_idx").on(table.userId),
  index("notifications_is_read_idx").on(table.isRead),
  // Índice composto para buscar notificações não lidas de um usuário
  index("notifications_user_unread_idx").on(table.userId, table.isRead),
]);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ==========================================
// LOGS DIÁRIOS
// ==========================================

export const dailyLogs = pgTable("daily_logs", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  logDate: timestamp("log_date").notNull(),
  source: varchar("source", { length: 50 }).notNull(), // 'daycare' | 'home'
  logType: varchar("log_type", { length: 50 }).default("general"), // 'general' | 'health' | 'feeding' | 'exercise' | 'grooming' | 'incident'
  mood: varchar("mood", { length: 50 }), // 'happy' | 'calm' | 'anxious' | 'tired' | 'agitated' | 'sick' | 'playful' | 'fearful' | 'aggressive' | 'apathetic'
  stool: varchar("stool", { length: 50 }), // 'normal' | 'soft' | 'hard' | 'diarrhea' | 'bloody' | 'mucus' | 'none'
  appetite: varchar("appetite", { length: 50 }), // 'excellent' | 'good' | 'moderate' | 'poor' | 'none' | 'stimulated'
  energy: varchar("energy", { length: 50 }), // 'high' | 'normal' | 'low' | 'very_low'
  waterIntake: varchar("water_intake", { length: 50 }), // 'normal' | 'increased' | 'decreased' | 'none'
  notes: text("notes"),
  attachments: text("attachments"), // JSON array de URLs de anexos
  // NOVOS CAMPOS ESTRUTURADOS
  stoolQuality: varchar("stool_quality", { length: 50 }), // Escala Bristol: type_1-7, blood, mucus, none
  urineQuality: varchar("urine_quality", { length: 50 }), // normal, dark, frequent, straining, blood, none
  physicalIntegrity: varchar("physical_integrity", { length: 50 }), // perfect, minor_scratch, bite_mark, limping, skin_issue, ear_issue, injury
  physicalNotes: text("physical_notes"), // Descrição de marcas/lesões
  napQuality: varchar("nap_quality", { length: 50 }), // deep, rested, restless, none
  groupRole: varchar("group_role", { length: 50 }), // leader, follower, peacemaker, shadow, loner, instigator
  bestFriendPetId: integer("best_friend_pet_id").references(() => pets.id, { onDelete: "set null" }), // Melhor amigo do dia
  activitiesPerformed: jsonb("activities_performed").$type<string[]>().default([]), // Atividades realizadas
  checkoutObservations: jsonb("checkout_observations").$type<string[]>().default([]), // Observações de checkout
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Índices para filtragem e análise de logs
  index("daily_logs_pet_id_idx").on(table.petId),
  index("daily_logs_log_date_idx").on(table.logDate),
  index("daily_logs_source_idx").on(table.source),
  index("daily_logs_log_type_idx").on(table.logType),
  // Índice composto para queries frequentes
  index("daily_logs_pet_date_idx").on(table.petId, table.logDate),
]);

export type DailyLog = typeof dailyLogs.$inferSelect;
export type InsertDailyLog = typeof dailyLogs.$inferInsert;

// ==========================================
// ANEXOS DE LOGS (DOCUMENTOS VINCULADOS)
// ==========================================

export const logAttachments = pgTable("log_attachments", {
  id: serial("id").primaryKey(),
  logId: integer("log_id")
    .notNull()
    .references(() => dailyLogs.id, { onDelete: "cascade" }),
  documentId: integer("document_id").references(() => documents.id, { onDelete: "set null" }),
  fileUrl: text("file_url").notNull(),
  fileName: varchar("file_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LogAttachment = typeof logAttachments.$inferSelect;
export type InsertLogAttachment = typeof logAttachments.$inferInsert;

// ==========================================
// RELAÇÕES
// ==========================================

export const usersRelations = relations(users, ({ many }) => ({
  petTutors: many(petTutors),
  notifications: many(notifications),
  dailyLogs: many(dailyLogs),
}));

export const petsRelations = relations(pets, ({ many }) => ({
  tutors: many(petTutors),
  vaccinations: many(petVaccinations),
  calendarEvents: many(calendarEvents),
  bookingRequests: many(bookingRequests),
  notifications: many(notifications),
  dailyLogs: many(dailyLogs),
  foodPlans: many(petFoodPlans),
  foodInventory: many(petFoodInventory),
  foodHistory: many(petFoodHistory),
  treats: many(petTreats),
  naturalFood: many(petNaturalFood),
}));

export const petTutorsRelations = relations(petTutors, ({ one }) => ({
  pet: one(pets, { fields: [petTutors.petId], references: [pets.id] }),
  tutor: one(users, { fields: [petTutors.tutorId], references: [users.id] }),
}));

// ==========================================
// BIBLIOTECA DE MEDICAMENTOS
// ==========================================

export const medicationLibrary = pgTable("medication_library", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // 'flea' | 'deworming' | 'antibiotic' | 'other'
  description: text("description"),
  commonDosage: varchar("common_dosage", { length: 200 }),
  isCommon: boolean("is_common").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MedicationLibrary = typeof medicationLibrary.$inferSelect;
export type InsertMedicationLibrary = typeof medicationLibrary.$inferInsert;

// ==========================================
// MEDICAMENTOS DO PET
// ==========================================

export const petMedications = pgTable("pet_medications", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  medicationId: integer("medication_id")
    .notNull()
    .references(() => medicationLibrary.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  dosage: varchar("dosage", { length: 200 }).notNull(),
  frequency: varchar("frequency", { length: 100 }),
  administrationTimes: text("administration_times"), // JSON array
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PetMedication = typeof petMedications.$inferSelect;
export type InsertPetMedication = typeof petMedications.$inferInsert;

// ==========================================
// TRATAMENTOS PREVENTIVOS
// ==========================================

export const preventiveTreatments = pgTable("preventive_treatments", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'flea' | 'deworming' | 'heartworm'
  productName: varchar("product_name", { length: 200 }).notNull(),
  applicationDate: timestamp("application_date").notNull(),
  nextDueDate: timestamp("next_due_date"),
  dosage: varchar("dosage", { length: 100 }),
  notes: text("notes"),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PreventiveTreatment = typeof preventiveTreatments.$inferSelect;
export type InsertPreventiveTreatment = typeof preventiveTreatments.$inferInsert;

// ==========================================
// DOCUMENTOS
// ==========================================

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  uploadedById: integer("uploaded_by_id")
    .notNull()
    .references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // 'vaccination' | 'exam' | 'prescription' | 'daily_log' | 'behavior' | 'training' | 'other'
  fileUrl: text("file_url").notNull(),
  fileKey: text("file_key"),
  fileName: varchar("file_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"),
  // Campos para integração com funcionalidades
  relatedModule: varchar("related_module", { length: 50 }), // 'daily_log' | 'behavior' | 'training' | 'health' | 'vaccination' | null
  relatedId: integer("related_id"), // ID do registro relacionado
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Índices para filtragem e análise de documentos
  index("documents_pet_id_idx").on(table.petId),
  index("documents_category_idx").on(table.category),
  index("documents_related_module_idx").on(table.relatedModule),
  // Índice composto para buscar documentos por módulo e ID relacionado
  index("documents_module_related_idx").on(table.relatedModule, table.relatedId),
]);

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ==========================================
// REGISTROS DE COMPORTAMENTO
// ==========================================

export const behaviorLogs = pgTable("behavior_logs", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  logDate: timestamp("log_date").notNull(),
  socialization: varchar("socialization", { length: 50 }), // 'excellent' | 'good' | 'moderate' | 'poor'
  energy: varchar("energy", { length: 50 }), // 'high' | 'normal' | 'low'
  obedience: varchar("obedience", { length: 50 }), // 'excellent' | 'good' | 'needs_work'
  anxiety: varchar("anxiety", { length: 50 }), // 'none' | 'mild' | 'moderate' | 'severe'
  aggression: varchar("aggression", { length: 50 }), // 'none' | 'mild' | 'moderate' | 'severe'
  notes: text("notes"),
  activities: text("activities"), // JSON array
  attachments: text("attachments"), // JSON array de URLs de anexos (fotos, vídeos, docs)
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Índices para filtragem e análise de comportamento
  index("behavior_logs_pet_id_idx").on(table.petId),
  index("behavior_logs_log_date_idx").on(table.logDate),
  // Índice composto para queries frequentes
  index("behavior_logs_pet_date_idx").on(table.petId, table.logDate),
]);

export type BehaviorLog = typeof behaviorLogs.$inferSelect;
export type InsertBehaviorLog = typeof behaviorLogs.$inferInsert;

// ==========================================
// ANEXOS DE COMPORTAMENTO
// ==========================================

export const behaviorAttachments = pgTable("behavior_attachments", {
  id: serial("id").primaryKey(),
  behaviorLogId: integer("behavior_log_id")
    .notNull()
    .references(() => behaviorLogs.id, { onDelete: "cascade" }),
  documentId: integer("document_id").references(() => documents.id, { onDelete: "set null" }),
  fileUrl: text("file_url").notNull(),
  fileName: varchar("file_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"),
  fileType: varchar("file_type", { length: 20 }), // 'image' | 'video' | 'document'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BehaviorAttachment = typeof behaviorAttachments.$inferSelect;
export type InsertBehaviorAttachment = typeof behaviorAttachments.$inferInsert;

// ==========================================
// MURAL - POSTS
// ==========================================

export const wallPosts = pgTable("wall_posts", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  petId: integer("pet_id").references(() => pets.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  visibility: varchar("visibility", { length: 50 }).default("all").notNull(), // 'all' | 'tutors' | 'admin'
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WallPost = typeof wallPosts.$inferSelect;
export type InsertWallPost = typeof wallPosts.$inferInsert;

// ==========================================
// MURAL - COMENTÁRIOS
// ==========================================

export const wallComments = pgTable("wall_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => wallPosts.id, { onDelete: "cascade" }),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WallComment = typeof wallComments.$inferSelect;
export type InsertWallComment = typeof wallComments.$inferInsert;

// ==========================================
// MURAL - CURTIDAS
// ==========================================

export const wallLikes = pgTable("wall_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => wallPosts.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WallLike = typeof wallLikes.$inferSelect;
export type InsertWallLike = typeof wallLikes.$inferInsert;

// ==========================================
// TRANSAÇÕES FINANCEIRAS
// ==========================================

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").references(() => pets.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }).notNull(), // 'credit_purchase' | 'credit_use' | 'refund'
  amount: integer("amount").notNull(), // em centavos
  credits: integer("credits"),
  description: text("description"),
  stripePaymentId: varchar("stripe_payment_id", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ==========================================
// TREINAMENTO / ADESTRAMENTO
// ==========================================

export const trainingLogs = pgTable("training_logs", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  logDate: timestamp("log_date").notNull(),
  command: varchar("command", { length: 100 }).notNull(), // 'sit' | 'stay' | 'come' | 'down' | 'heel' | custom
  category: varchar("category", { length: 50 }).notNull(), // 'obedience' | 'socialization' | 'behavior' | 'agility' | 'tricks'
  status: varchar("status", { length: 50 }).notNull(), // 'learning' | 'practicing' | 'mastered'
  successRate: integer("success_rate"), // 0-100 porcentagem de sucesso
  duration: integer("duration"), // duração em minutos
  treats: integer("treats"), // número de petiscos usados
  method: varchar("method", { length: 100 }), // 'positive_reinforcement' | 'clicker' | 'lure' | 'capture'
  notes: text("notes"),
  videoUrl: text("video_url"),
  attachments: text("attachments"), // JSON array de URLs de anexos (fotos, vídeos, docs)
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Índices para filtragem e análise de treinamento
  index("training_logs_pet_id_idx").on(table.petId),
  index("training_logs_log_date_idx").on(table.logDate),
  index("training_logs_category_idx").on(table.category),
  index("training_logs_status_idx").on(table.status),
  // Índice composto para queries frequentes
  index("training_logs_pet_date_idx").on(table.petId, table.logDate),
]);

export type TrainingLog = typeof trainingLogs.$inferSelect;
export type InsertTrainingLog = typeof trainingLogs.$inferInsert;

// ==========================================
// ANEXOS DE TREINAMENTO
// ==========================================

export const trainingAttachments = pgTable("training_attachments", {
  id: serial("id").primaryKey(),
  trainingLogId: integer("training_log_id")
    .notNull()
    .references(() => trainingLogs.id, { onDelete: "cascade" }),
  documentId: integer("document_id").references(() => documents.id, { onDelete: "set null" }),
  fileUrl: text("file_url").notNull(),
  fileName: varchar("file_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"),
  fileType: varchar("file_type", { length: 20 }), // 'image' | 'video' | 'document'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TrainingAttachment = typeof trainingAttachments.$inferSelect;
export type InsertTrainingAttachment = typeof trainingAttachments.$inferInsert;

// ==========================================
// COMANDOS DE TREINAMENTO (BIBLIOTECA)
// ==========================================

export const trainingCommands = pgTable("training_commands", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  difficulty: varchar("difficulty", { length: 20 }), // 'easy' | 'medium' | 'hard'
  steps: text("steps"), // JSON array com passos
  tips: text("tips"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TrainingCommand = typeof trainingCommands.$inferSelect;
export type InsertTrainingCommand = typeof trainingCommands.$inferInsert;

// ==========================================
// PLANO DE ALIMENTAÇÃO DO PET
// ==========================================

export const petFoodPlans = pgTable("pet_food_plans", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  foodType: varchar("food_type", { length: 50 }).notNull(), // 'dry' | 'wet' | 'natural' | 'mixed'
  brand: varchar("brand", { length: 200 }).notNull(),
  productName: varchar("product_name", { length: 200 }),
  dailyAmount: integer("daily_amount").notNull(), // quantidade diária em gramas
  portionsPerDay: integer("portions_per_day").default(2).notNull(), // número de porções por dia
  portionTimes: text("portion_times"), // JSON array de horários ["08:00", "18:00"]
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PetFoodPlan = typeof petFoodPlans.$inferSelect;
export type InsertPetFoodPlan = typeof petFoodPlans.$inferInsert;

// ==========================================
// ESTOQUE DE RAÇÃO DO PET
// ==========================================

export const petFoodInventory = pgTable("pet_food_inventory", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  brand: varchar("brand", { length: 200 }).notNull(),
  productName: varchar("product_name", { length: 200 }),
  quantityReceived: integer("quantity_received").notNull(), // quantidade recebida em gramas
  quantityRemaining: integer("quantity_remaining").notNull(), // quantidade restante em gramas
  receivedDate: timestamp("received_date").defaultNow().notNull(),
  expirationDate: timestamp("expiration_date"),
  batchNumber: varchar("batch_number", { length: 100 }),
  notes: text("notes"),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PetFoodInventory = typeof petFoodInventory.$inferSelect;
export type InsertPetFoodInventory = typeof petFoodInventory.$inferInsert;

// ==========================================
// HISTÓRICO DE RAÇÃO DO PET (REAÇÕES)
// ==========================================

export const petFoodHistory = pgTable("pet_food_history", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  foodPlanId: integer("food_plan_id").references(() => petFoodPlans.id, { onDelete: "set null" }),
  brand: varchar("brand", { length: 200 }).notNull(),
  productName: varchar("product_name", { length: 200 }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  // Reações do pet
  acceptance: varchar("acceptance", { length: 20 }), // 'loved' | 'liked' | 'neutral' | 'disliked' | 'rejected'
  digestion: varchar("digestion", { length: 20 }), // 'excellent' | 'good' | 'regular' | 'poor'
  stoolQuality: varchar("stool_quality", { length: 20 }), // 'normal' | 'soft' | 'hard' | 'diarrhea'
  coatCondition: varchar("coat_condition", { length: 20 }), // 'excellent' | 'good' | 'regular' | 'poor'
  energyLevel: varchar("energy_level", { length: 20 }), // 'high' | 'normal' | 'low'
  allergicReaction: boolean("allergic_reaction").default(false),
  allergicDetails: text("allergic_details"),
  overallRating: integer("overall_rating"), // 1-5 estrelas
  notes: text("notes"),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PetFoodHistory = typeof petFoodHistory.$inferSelect;
export type InsertPetFoodHistory = typeof petFoodHistory.$inferInsert;

// ==========================================
// PETISCOS E SNACKS
// ==========================================

export const petTreats = pgTable("pet_treats", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  treatType: varchar("treat_type", { length: 50 }).notNull(), // 'snack' | 'biscuit' | 'natural' | 'supplement' | 'other'
  name: varchar("name", { length: 200 }).notNull(),
  brand: varchar("brand", { length: 200 }),
  purpose: varchar("purpose", { length: 100 }), // 'reward' | 'training' | 'dental' | 'supplement' | 'enrichment'
  frequency: varchar("frequency", { length: 50 }), // 'daily' | 'weekly' | 'occasionally' | 'training_only'
  maxPerDay: integer("max_per_day"), // quantidade máxima por dia
  caloriesPerUnit: integer("calories_per_unit"), // calorias por unidade
  acceptance: varchar("acceptance", { length: 20 }), // 'loved' | 'liked' | 'neutral' | 'disliked'
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PetTreat = typeof petTreats.$inferSelect;
export type InsertPetTreat = typeof petTreats.$inferInsert;

// ==========================================
// ALIMENTAÇÃO NATURAL
// ==========================================

export const petNaturalFood = pgTable("pet_natural_food", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  mealType: varchar("meal_type", { length: 50 }).notNull(), // 'barf' | 'cooked' | 'mixed' | 'supplement'
  name: varchar("name", { length: 200 }).notNull(), // nome da receita/alimento
  ingredients: text("ingredients"), // JSON array de ingredientes
  proteinSource: varchar("protein_source", { length: 200 }), // fonte de proteína principal
  portionSize: integer("portion_size"), // tamanho da porção em gramas
  frequency: varchar("frequency", { length: 50 }), // 'daily' | 'weekly' | 'occasionally'
  preparationNotes: text("preparation_notes"),
  acceptance: varchar("acceptance", { length: 20 }), // 'loved' | 'liked' | 'neutral' | 'disliked'
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PetNaturalFood = typeof petNaturalFood.$inferSelect;
export type InsertPetNaturalFood = typeof petNaturalFood.$inferInsert;

// ==========================================
// RELAÇÕES DE ALIMENTAÇÃO
// ==========================================

export const petFoodPlansRelations = relations(petFoodPlans, ({ one }) => ({
  pet: one(pets, { fields: [petFoodPlans.petId], references: [pets.id] }),
  createdBy: one(users, { fields: [petFoodPlans.createdById], references: [users.id] }),
}));

export const petFoodInventoryRelations = relations(petFoodInventory, ({ one }) => ({
  pet: one(pets, { fields: [petFoodInventory.petId], references: [pets.id] }),
  createdBy: one(users, { fields: [petFoodInventory.createdById], references: [users.id] }),
}));

export const petFoodHistoryRelations = relations(petFoodHistory, ({ one }) => ({
  pet: one(pets, { fields: [petFoodHistory.petId], references: [pets.id] }),
  foodPlan: one(petFoodPlans, { fields: [petFoodHistory.foodPlanId], references: [petFoodPlans.id] }),
  createdBy: one(users, { fields: [petFoodHistory.createdById], references: [users.id] }),
}));

export const petTreatsRelations = relations(petTreats, ({ one }) => ({
  pet: one(pets, { fields: [petTreats.petId], references: [pets.id] }),
  createdBy: one(users, { fields: [petTreats.createdById], references: [users.id] }),
}));

export const petNaturalFoodRelations = relations(petNaturalFood, ({ one }) => ({
  pet: one(pets, { fields: [petNaturalFood.petId], references: [pets.id] }),
  createdBy: one(users, { fields: [petNaturalFood.createdById], references: [users.id] }),
}));

// ==========================================
// CONFIGURAÇÕES WHATSAPP (por admin/organização)
// ==========================================

export const whatsappConfig = pgTable("whatsapp_config", {
  id: serial("id").primaryKey(),
  // Cada admin pode ter sua própria configuração
  adminId: integer("admin_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  // Credenciais da Meta Cloud API
  accessToken: text("access_token"), // Token criptografado
  phoneNumberId: text("phone_number_id"),
  businessAccountId: text("business_account_id"),
  webhookVerifyToken: text("webhook_verify_token"),
  // Informações do número
  displayPhoneNumber: text("display_phone_number"),
  verifiedName: text("verified_name"),
  qualityRating: varchar("quality_rating", { length: 20 }),
  // Status
  isActive: boolean("is_active").default(false).notNull(),
  lastVerifiedAt: timestamp("last_verified_at"),
  // Configurações de envio
  autoNotifyCheckin: boolean("auto_notify_checkin").default(false).notNull(),
  autoNotifyCheckout: boolean("auto_notify_checkout").default(false).notNull(),
  autoNotifyDailyLog: boolean("auto_notify_daily_log").default(false).notNull(),
  autoNotifyBooking: boolean("auto_notify_booking").default(false).notNull(),
  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("whatsapp_config_admin_id_idx").on(table.adminId),
  index("whatsapp_config_is_active_idx").on(table.isActive),
]);

export type WhatsAppConfig = typeof whatsappConfig.$inferSelect;
export type InsertWhatsAppConfig = typeof whatsappConfig.$inferInsert;

// Relações do WhatsApp Config
export const whatsappConfigRelations = relations(whatsappConfig, ({ one }) => ({
  admin: one(users, { fields: [whatsappConfig.adminId], references: [users.id] }),
}));

// ==========================================
// HISTÓRICO DE MENSAGENS WHATSAPP
// ==========================================

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  configId: integer("config_id")
    .notNull()
    .references(() => whatsappConfig.id, { onDelete: "cascade" }),
  // Destinatário
  toPhone: text("to_phone").notNull(),
  toName: text("to_name"),
  petId: integer("pet_id")
    .references(() => pets.id, { onDelete: "set null" }),
  // Mensagem
  messageType: varchar("message_type", { length: 50 }).notNull(), // 'text' | 'template' | 'image' | 'document'
  templateName: text("template_name"),
  content: text("content"),
  // Status da API
  messageId: text("message_id"), // ID retornado pela API
  status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  errorMessage: text("error_message"),
  // Contexto
  context: varchar("context", { length: 50 }), // 'checkin' | 'checkout' | 'daily_log' | 'booking' | 'manual'
  sentById: integer("sent_by_id")
    .references(() => users.id, { onDelete: "set null" }),
  // Timestamps
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("whatsapp_messages_config_id_idx").on(table.configId),
  index("whatsapp_messages_pet_id_idx").on(table.petId),
  index("whatsapp_messages_status_idx").on(table.status),
  index("whatsapp_messages_context_idx").on(table.context),
  index("whatsapp_messages_created_at_idx").on(table.createdAt),
]);

export type WhatsAppMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsAppMessage = typeof whatsappMessages.$inferInsert;

// Relações de mensagens WhatsApp
export const whatsappMessagesRelations = relations(whatsappMessages, ({ one }) => ({
  config: one(whatsappConfig, { fields: [whatsappMessages.configId], references: [whatsappConfig.id] }),
  pet: one(pets, { fields: [whatsappMessages.petId], references: [pets.id] }),
  sentBy: one(users, { fields: [whatsappMessages.sentById], references: [users.id] }),
}));

// ==========================================
// CÍRCULO SOCIAL (Afinidades e Restrições)
// ==========================================

export const petSocialCircle = pgTable("pet_social_circle", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  relatedPetId: integer("related_pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  relationshipType: varchar("relationship_type", { length: 20 }).notNull(), // 'friend' | 'neutral' | 'avoid' | 'incompatible'
  notes: text("notes"), // observações sobre a relação
  severity: varchar("severity", { length: 20 }), // para 'avoid'/'incompatible': 'low' | 'medium' | 'high' | 'critical'
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("pet_social_circle_pet_id_idx").on(table.petId),
  index("pet_social_circle_related_pet_id_idx").on(table.relatedPetId),
  index("pet_social_circle_relationship_type_idx").on(table.relationshipType),
]);

export type PetSocialCircle = typeof petSocialCircle.$inferSelect;
export type InsertPetSocialCircle = typeof petSocialCircle.$inferInsert;

// Relações do círculo social
export const petSocialCircleRelations = relations(petSocialCircle, ({ one }) => ({
  pet: one(pets, { fields: [petSocialCircle.petId], references: [pets.id] }),
  relatedPet: one(pets, { fields: [petSocialCircle.relatedPetId], references: [pets.id] }),
  createdBy: one(users, { fields: [petSocialCircle.createdById], references: [users.id] }),
}));

// ==========================================
// HISTÓRICO DE PESO
// ==========================================

export const petWeightHistory = pgTable("pet_weight_history", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  weight: integer("weight").notNull(), // em gramas
  measuredAt: timestamp("measured_at").notNull(),
  notes: text("notes"),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("pet_weight_history_pet_id_idx").on(table.petId),
  index("pet_weight_history_measured_at_idx").on(table.measuredAt),
]);

export type PetWeightHistory = typeof petWeightHistory.$inferSelect;
export type InsertPetWeightHistory = typeof petWeightHistory.$inferInsert;

// Relações do histórico de peso
export const petWeightHistoryRelations = relations(petWeightHistory, ({ one }) => ({
  pet: one(pets, { fields: [petWeightHistory.petId], references: [pets.id] }),
  createdBy: one(users, { fields: [petWeightHistory.createdById], references: [users.id] }),
}));

// ==========================================
// LOG DE ALIMENTAÇÃO (Estoque)
// ==========================================

export const petFeedingLogs = pgTable("pet_feeding_logs", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  feedingDate: timestamp("feeding_date").notNull(),
  mealType: varchar("meal_type", { length: 20 }).notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  amountGrams: integer("amount_grams").notNull(), // quantidade oferecida
  consumption: varchar("consumption", { length: 20 }).notNull(), // 'all' | 'most' | 'half' | 'little' | 'none'
  notes: text("notes"),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("pet_feeding_logs_pet_id_idx").on(table.petId),
  index("pet_feeding_logs_feeding_date_idx").on(table.feedingDate),
  index("pet_feeding_logs_consumption_idx").on(table.consumption),
]);

export type PetFeedingLog = typeof petFeedingLogs.$inferSelect;
export type InsertPetFeedingLog = typeof petFeedingLogs.$inferInsert;

// Relações do log de alimentação
export const petFeedingLogsRelations = relations(petFeedingLogs, ({ one }) => ({
  pet: one(pets, { fields: [petFeedingLogs.petId], references: [pets.id] }),
  createdBy: one(users, { fields: [petFeedingLogs.createdById], references: [users.id] }),
}));

// ==========================================
// HABILIDADES DE ADESTRAMENTO
// ==========================================

export const petTrainingSkills = pgTable("pet_training_skills", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  skillName: varchar("skill_name", { length: 100 }).notNull(), // 'sit' | 'stay' | 'recall' | 'heel' | etc
  status: varchar("status", { length: 20 }).notNull(), // 'not_started' | 'learning' | 'inconsistent' | 'mastered'
  lastPracticed: timestamp("last_practiced"),
  notes: text("notes"),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("pet_training_skills_pet_id_idx").on(table.petId),
  index("pet_training_skills_status_idx").on(table.status),
]);

export type PetTrainingSkill = typeof petTrainingSkills.$inferSelect;
export type InsertPetTrainingSkill = typeof petTrainingSkills.$inferInsert;

// Relações das habilidades de adestramento
export const petTrainingSkillsRelations = relations(petTrainingSkills, ({ one }) => ({
  pet: one(pets, { fields: [petTrainingSkills.petId], references: [pets.id] }),
  createdBy: one(users, { fields: [petTrainingSkills.createdById], references: [users.id] }),
}));

// ==========================================
// ALERTAS E FLAGS DO PET
// ==========================================

export const petAlerts = pgTable("pet_alerts", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  alertType: varchar("alert_type", { length: 50 }).notNull(), // 'behavior' | 'health' | 'feeding' | 'social' | 'financial'
  severity: varchar("severity", { length: 20 }).notNull(), // 'info' | 'warning' | 'critical'
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedById: integer("resolved_by_id")
    .references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  // Referências opcionais para contexto
  relatedLogId: integer("related_log_id"),
  relatedEventId: integer("related_event_id"),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("pet_alerts_pet_id_idx").on(table.petId),
  index("pet_alerts_alert_type_idx").on(table.alertType),
  index("pet_alerts_severity_idx").on(table.severity),
  index("pet_alerts_is_active_idx").on(table.isActive),
]);

export type PetAlert = typeof petAlerts.$inferSelect;
export type InsertPetAlert = typeof petAlerts.$inferInsert;

// Relações dos alertas
export const petAlertsRelations = relations(petAlerts, ({ one }) => ({
  pet: one(pets, { fields: [petAlerts.petId], references: [pets.id] }),
  createdBy: one(users, { fields: [petAlerts.createdById], references: [users.id] }),
  resolvedBy: one(users, { fields: [petAlerts.resolvedById], references: [users.id] }),
}));

// ==========================================
// CONFIGURAÇÕES GLOBAIS DE NEGÓCIO
// ==========================================

export const businessSettings = pgTable("business_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(), // JSON stringified
  category: varchar("category", { length: 50 }).notNull(), // 'thresholds' | 'notifications' | 'scheduling' | 'financial'
  label: varchar("label", { length: 200 }).notNull(),
  description: text("description"),
  dataType: varchar("data_type", { length: 20 }).notNull(), // 'number' | 'boolean' | 'string' | 'json'
  updatedById: integer("updated_by_id")
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("business_settings_key_idx").on(table.key),
  index("business_settings_category_idx").on(table.category),
]);

export type BusinessSetting = typeof businessSettings.$inferSelect;
export type InsertBusinessSetting = typeof businessSettings.$inferInsert;

// ==========================================
// REGRAS DE NEGÓCIO (AUTOMAÇÕES)
// ==========================================

export const businessRules = pgTable("business_rules", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(0).notNull(), // ordem de execução
  
  // Gatilho (Trigger)
  triggerType: varchar("trigger_type", { length: 50 }).notNull(),
  // 'pet_field_change' | 'log_created' | 'event_created' | 'threshold_reached' | 'schedule'
  triggerEntity: varchar("trigger_entity", { length: 50 }), // 'pet' | 'daily_log' | 'calendar_event' | 'behavior_log'
  triggerField: varchar("trigger_field", { length: 100 }), // campo específico
  triggerCondition: varchar("trigger_condition", { length: 50 }), // 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_empty' | 'is_not_empty'
  triggerValue: text("trigger_value"), // valor para comparação
  
  // Ação (Action)
  actionType: varchar("action_type", { length: 50 }).notNull(),
  // 'create_alert' | 'send_notification' | 'add_flag' | 'block_booking' | 'send_whatsapp' | 'assign_task' | 'update_field'
  actionConfig: text("action_config").notNull(), // JSON com configuração da ação
  
  // Metadados
  executionCount: integer("execution_count").default(0).notNull(),
  lastExecutedAt: timestamp("last_executed_at"),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("business_rules_is_active_idx").on(table.isActive),
  index("business_rules_trigger_type_idx").on(table.triggerType),
  index("business_rules_priority_idx").on(table.priority),
]);

export type BusinessRule = typeof businessRules.$inferSelect;
export type InsertBusinessRule = typeof businessRules.$inferInsert;

// Relações das regras de negócio
export const businessRulesRelations = relations(businessRules, ({ one }) => ({
  createdBy: one(users, { fields: [businessRules.createdById], references: [users.id] }),
}));

// ==========================================
// FLAGS DINÂMICAS (ETIQUETAS)
// ==========================================

export const dynamicFlags = pgTable("dynamic_flags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).notNull(), // 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple'
  icon: varchar("icon", { length: 50 }), // nome do ícone Lucide
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  
  // Condição automática (opcional)
  autoAssignCondition: text("auto_assign_condition"), // JSON com regra de atribuição automática
  
  // Onde exibir
  showOnCheckin: boolean("show_on_checkin").default(true).notNull(),
  showOnCalendar: boolean("show_on_calendar").default(true).notNull(),
  showOnPetCard: boolean("show_on_pet_card").default(true).notNull(),
  showOnDailyLog: boolean("show_on_daily_log").default(true).notNull(),
  
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("dynamic_flags_is_active_idx").on(table.isActive),
]);

export type DynamicFlag = typeof dynamicFlags.$inferSelect;
export type InsertDynamicFlag = typeof dynamicFlags.$inferInsert;

// ==========================================
// ATRIBUIÇÃO DE FLAGS A PETS
// ==========================================

export const petFlags = pgTable("pet_flags", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  flagId: integer("flag_id")
    .notNull()
    .references(() => dynamicFlags.id, { onDelete: "cascade" }),
  assignedById: integer("assigned_by_id")
    .references(() => users.id),
  assignedByRule: integer("assigned_by_rule")
    .references(() => businessRules.id), // se foi atribuída automaticamente
  notes: text("notes"),
  expiresAt: timestamp("expires_at"), // flag temporária
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("pet_flags_pet_id_idx").on(table.petId),
  index("pet_flags_flag_id_idx").on(table.flagId),
]);

export type PetFlag = typeof petFlags.$inferSelect;
export type InsertPetFlag = typeof petFlags.$inferInsert;

// Relações das flags de pets
export const petFlagsRelations = relations(petFlags, ({ one }) => ({
  pet: one(pets, { fields: [petFlags.petId], references: [pets.id] }),
  flag: one(dynamicFlags, { fields: [petFlags.flagId], references: [dynamicFlags.id] }),
  assignedBy: one(users, { fields: [petFlags.assignedById], references: [users.id] }),
  rule: one(businessRules, { fields: [petFlags.assignedByRule], references: [businessRules.id] }),
}));

// ==========================================
// LOG DE EXECUÇÃO DE REGRAS
// ==========================================

export const ruleExecutionLog = pgTable("rule_execution_log", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id")
    .notNull()
    .references(() => businessRules.id, { onDelete: "cascade" }),
  petId: integer("pet_id")
    .references(() => pets.id, { onDelete: "set null" }),
  triggerData: text("trigger_data"), // JSON com dados do gatilho
  actionResult: text("action_result"), // JSON com resultado da ação
  success: boolean("success").default(true).notNull(),
  errorMessage: text("error_message"),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
}, (table) => [
  index("rule_execution_log_rule_id_idx").on(table.ruleId),
  index("rule_execution_log_pet_id_idx").on(table.petId),
  index("rule_execution_log_executed_at_idx").on(table.executedAt),
]);

export type RuleExecutionLog = typeof ruleExecutionLog.$inferSelect;
export type InsertRuleExecutionLog = typeof ruleExecutionLog.$inferInsert;
