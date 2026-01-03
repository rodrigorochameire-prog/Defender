import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  foodBrand: varchar("food_brand", { length: 200 }),
  foodAmount: integer("food_amount"), // quantidade diária em gramas
  credits: integer("credits").default(0).notNull(), // créditos de creche
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
});

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
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
});

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
});

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
  mood: varchar("mood", { length: 50 }), // 'happy' | 'calm' | 'anxious' | 'tired'
  stool: varchar("stool", { length: 50 }), // 'normal' | 'soft' | 'diarrhea' | 'none'
  appetite: varchar("appetite", { length: 50 }), // 'good' | 'moderate' | 'poor'
  notes: text("notes"),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DailyLog = typeof dailyLogs.$inferSelect;
export type InsertDailyLog = typeof dailyLogs.$inferInsert;

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
  category: varchar("category", { length: 100 }).notNull(), // 'vaccination' | 'exam' | 'prescription' | 'other'
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 50 }),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BehaviorLog = typeof behaviorLogs.$inferSelect;
export type InsertBehaviorLog = typeof behaviorLogs.$inferInsert;

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
