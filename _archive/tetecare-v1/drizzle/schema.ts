import { integer, pgEnum, pgTable, text, timestamp, varchar, boolean, numeric, date, jsonb, serial, bigint, bigserial, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extended with role field for admin/user distinction.
 * 
 * NOTE: Column names match the actual PostgreSQL database (snake_case).
 */
export const users = pgTable("users", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  open_id: varchar("open_id", { length: 64 }),
  auth_id: uuid("auth_id"),
  name: text("name"),
  email: text("email"),
  login_method: varchar("login_method", { length: 64 }).default("email").notNull(),
  email_verified: boolean("email_verified").default(false).notNull(),
  role: text("role").default("user").notNull(),
  phone: text("phone"),
  stripe_customer_id: text("stripe_customer_id"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  last_signed_in: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect & {
  auth_id?: string | null;
};
export type InsertUser = typeof users.$inferInsert;

/**
 * Password reset tokens table
 */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  user_id: bigint("user_id", { mode: "number" }).notNull(),
  token: varchar("token", { length: 255 }).unique().notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  used: boolean("used").default(false).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * Email verification tokens table
 */
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  user_id: bigint("user_id", { mode: "number" }).notNull(),
  token: varchar("token", { length: 255 }).unique().notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  used: boolean("used").default(false).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

/**
 * Pets table - stores all pet information
 */
export const pets = pgTable("pets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  breed: varchar("breed", { length: 100 }),
  age: varchar("age", { length: 50 }), // e.g., "2a 3m"
  weight: integer("weight"), // weight in grams (e.g., 32500 for 32.5kg)
  birth_date: timestamp("birth_date", { withTimezone: true }),
  photo_url: text("photo_url"),
  photo_key: text("photo_key"), // S3 key for photo
  status: varchar("status", { length: 100 }).default("checked-out").notNull(),
  approval_status: varchar("approval_status", { length: 100 }).default("pending").notNull(),
  check_in_time: timestamp("check_in_time", { withTimezone: true }),
  check_out_time: timestamp("check_out_time", { withTimezone: true }),
  food_brand: varchar("food_brand", { length: 200 }),
  food_amount: integer("food_amount"), // daily food amount in grams
  credits: integer("credits").default(0).notNull(), // daycare credits
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Pet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;

/**
 * Pet-Tutor relationship table (N:N)
 */
export const petTutors = pgTable("pet_tutors", {
  id: serial("id").primaryKey(),
  pet_id: integer("pet_id").notNull(),
  tutor_id: bigint("tutor_id", { mode: "number" }).notNull(),
  is_primary: boolean("is_primary").default(false).notNull(), // primary contact
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PetTutor = typeof petTutors.$inferSelect;
export type InsertPetTutor = typeof petTutors.$inferInsert;

/**
 * Credit packages available for purchase
 */
export const creditPackages = pgTable("credit_packages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  credits: integer("credits").notNull(), // number of credits
  priceInCents: integer("priceInCents").notNull(),
  discountPercent: integer("discountPercent").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  displayOrder: integer("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditPackage = typeof creditPackages.$inferSelect;
export type InsertCreditPackage = typeof creditPackages.$inferInsert;

/**
 * Daycare credits system
 */
export const daycareCredits = pgTable("daycare_credits", {
  id: serial("id").primaryKey(),
  pet_id: integer("pet_id").notNull(),
  package_days: integer("package_days").notNull(), // number of days purchased
  package_price: integer("package_price").notNull(), // price in cents
  remaining_days: integer("remaining_days").notNull(),
  purchase_date: timestamp("purchase_date", { withTimezone: true }).defaultNow().notNull(),
  expiry_date: timestamp("expiry_date", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DaycareCredit = typeof daycareCredits.$inferSelect;
export type InsertDaycareCredit = typeof daycareCredits.$inferInsert;

/**
 * Daycare usage history
 */
export const daycareUsage = pgTable("daycare_usage", {
  id: serial("id").primaryKey(),
  pet_id: integer("pet_id").notNull(),
  usage_date: timestamp("usage_date", { withTimezone: true }).notNull(),
  check_in_time: timestamp("check_in_time", { withTimezone: true }),
  check_out_time: timestamp("check_out_time", { withTimezone: true }),
  credit_id: integer("credit_id"), // which credit package was used
  amount_cents: integer("amount_cents"), // valor da estadia em centavos
  payment_status: varchar("payment_status", { length: 100 }).default("pending").notNull(),
  paid_at: timestamp("paid_at", { withTimezone: true }),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DaycareUsage = typeof daycareUsage.$inferSelect;
export type InsertDaycareUsage = typeof daycareUsage.$inferInsert;

/**
 * Vaccine library - pre-defined common vaccines
 */
export const vaccineLibrary = pgTable("vaccine_library", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  intervalDays: integer("intervalDays"), // recommended interval between doses
  dosesRequired: integer("dosesRequired").default(1), // number of doses needed
  isCommon: boolean("isCommon").default(true).notNull(), // pre-defined vs custom
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VaccineLibrary = typeof vaccineLibrary.$inferSelect;
export type InsertVaccineLibrary = typeof vaccineLibrary.$inferInsert;

/**
 * Pet vaccination records
 */
export const petVaccinations = pgTable("pet_vaccinations", {
  id: serial("id").primaryKey(),
  pet_id: integer("pet_id").notNull(),
  vaccine_id: integer("vaccine_id").notNull(), // reference to vaccine_library
  application_date: timestamp("application_date", { withTimezone: true }).notNull(),
  next_due_date: timestamp("next_due_date", { withTimezone: true }),
  dose_number: integer("dose_number").default(1), // which dose (1, 2, 3...)
  veterinarian: varchar("veterinarian", { length: 200 }),
  clinic: varchar("clinic", { length: 200 }),
  batch_number: varchar("batch_number", { length: 100 }),
  notes: text("notes"),
  document_url: text("document_url"), // S3 url for vaccine certificate
  document_key: text("document_key"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PetVaccination = typeof petVaccinations.$inferSelect;
export type InsertPetVaccination = typeof petVaccinations.$inferInsert;

/**
 * Medication library - pre-defined common medications
 */
export const medicationLibrary = pgTable("medication_library", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // Changed from enum to varchar to allow custom types
  description: text("description"),
  commonDosage: varchar("commonDosage", { length: 200 }),
  isCommon: boolean("isCommon").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MedicationLibrary = typeof medicationLibrary.$inferSelect;
export type InsertMedicationLibrary = typeof medicationLibrary.$inferInsert;

/**
 * Preventive products library (flea treatment, deworming)
 */
export const preventiveLibrary = pgTable("preventive_library", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 200 }),
  intervalDays: integer("intervalDays"), // recommended interval in days
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PreventiveLibrary = typeof preventiveLibrary.$inferSelect;
export type InsertPreventiveLibrary = typeof preventiveLibrary.$inferInsert;

/**
 * Pet medication/treatment records
 */
export const petMedications = pgTable("pet_medications", {
  id: serial("id").primaryKey(),
  pet_id: integer("pet_id").notNull(),
  medication_id: integer("medication_id").notNull(),
  start_date: timestamp("start_date", { withTimezone: true }).notNull(),
  end_date: timestamp("end_date", { withTimezone: true }),
  dosage: varchar("dosage", { length: 200 }).notNull(),
  frequency: varchar("frequency", { length: 100 }), // e.g., "12h", "8h", "daily"
  // Advanced periodicity fields
  periodicity: varchar("periodicity", { length: 100 }).default("daily"),
  custom_interval: integer("custom_interval"), // interval in days for custom periodicity
  week_days: text("week_days"), // JSON array of week days [0-6] for weekly periodicity
  month_days: text("month_days"), // JSON array of month days [1-31] for monthly periodicity
  auto_schedule: boolean("auto_schedule").default(false).notNull(), // enable auto-scheduling
  // Dosage progression fields
  dosage_progression: varchar("dosage_progression", { length: 100 }).default("stable"),
  progression_rate: varchar("progression_rate", { length: 50 }), // e.g., "10%", "5mg"
  progression_interval: integer("progression_interval"), // adjust every X doses
  target_dosage: varchar("target_dosage", { length: 200 }), // target dosage to reach
  current_dose_count: integer("current_dose_count").default(0).notNull(), // track dose number for progression
  administration_times: text("administration_times"), // JSON array of times in HH:MM format
  is_active: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PetMedication = typeof petMedications.$inferSelect;
export type InsertPetMedication = typeof petMedications.$inferInsert;

/**
 * Daily logs - segregated by source (home vs daycare)
 */
export const dailyLogs = pgTable("daily_logs", {
  id: serial("id").primaryKey(),
  pet_id: integer("pet_id").notNull(),
  log_date: timestamp("log_date", { withTimezone: true }).notNull(),
  source: varchar("source", { length: 100 }).notNull(),
  mood: varchar("mood", { length: 100 }),
  stool: varchar("stool", { length: 100 }),
  appetite: varchar("appetite", { length: 100 }),
  behavior: text("behavior"),
  behavior_notes: text("behavior_notes"),
  activities: text("activities"), // JSON array of activities
  food_consumed: varchar("food_consumed", { length: 50 }), // "all", "half", "little", "none"
  feeding_time: varchar("feeding_time", { length: 10 }), // HH:MM format
  feeding_amount: varchar("feeding_amount", { length: 100 }), // e.g., "200g", "1 xícara"
  feeding_acceptance: varchar("feeding_acceptance", { length: 100 }),
  weight: integer("weight"), // weight in grams at time of log
  notes: text("notes"),
  created_by_id: bigint("created_by_id", { mode: "number" }).notNull(), // user who created the log
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DailyLog = typeof dailyLogs.$inferSelect;
export type InsertDailyLog = typeof dailyLogs.$inferInsert;

/**
 * Calendar events
 */
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  event_date: timestamp("event_date", { withTimezone: true }).notNull(),
  end_date: timestamp("end_date", { withTimezone: true }), // For events with duration
  event_type: varchar("event_type", { length: 100 }).notNull(),
  custom_event_type_id: integer("custom_event_type_id"), // Reference to eventTypes table for custom types
  custom_color: varchar("custom_color", { length: 20 }), // Hex color for custom events
  pet_id: integer("pet_id"), // null for general events
  location: varchar("location", { length: 200 }),
  is_all_day: boolean("is_all_day").default(true).notNull(),
  // Multi-day stay period fields (for checkin events)
  check_in_date: timestamp("check_in_date", { withTimezone: true }), // Start date of stay
  check_out_date: timestamp("check_out_date", { withTimezone: true }), // End date of stay
  daily_count: integer("daily_count"), // Number of days (calculated)
  // Attached media and logs
  photo_urls: jsonb("photo_urls").$type<string[]>(), // Array of photo URLs
  photo_keys: jsonb("photo_keys").$type<string[]>(), // Array of S3 keys
  log_ids: jsonb("log_ids").$type<number[]>(), // Array of dailyLogs IDs
  // Resource linking for automatic integration
  linked_resource_type: varchar("linked_resource_type", { length: 100 }),
  linked_resource_id: integer("linked_resource_id"), // ID of the linked resource
  auto_created: boolean("auto_created").default(false).notNull(), // Indica se foi criado automaticamente
  reminder_sent: boolean("reminder_sent").default(false).notNull(),
  created_by_id: bigint("created_by_id", { mode: "number" }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

/**
 * Documents storage
 */
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  pet_id: integer("pet_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  file_url: text("file_url").notNull(),
  file_key: text("file_key").notNull(),
  file_name: varchar("file_name", { length: 255 }),
  mime_type: varchar("mime_type", { length: 100 }),
  file_size: integer("file_size"), // in bytes
  description: text("description"),
  uploaded_by_id: bigint("uploaded_by_id", { mode: "number" }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Pet photos gallery
 */
export const petPhotos = pgTable("pet_photos", {
  id: serial("id").primaryKey(),
  pet_id: integer("pet_id").notNull(),
  photo_url: text("photo_url").notNull(),
  photo_key: text("photo_key").notNull(), // S3 key
  caption: text("caption"),
  taken_at: timestamp("taken_at", { withTimezone: true }).notNull(),
  uploaded_by_id: bigint("uploaded_by_id", { mode: "number" }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PetPhoto = typeof petPhotos.$inferSelect;
export type InsertPetPhoto = typeof petPhotos.$inferInsert;

/**
 * Photo comments
 */
export const photoComments = pgTable("photo_comments", {
  id: serial("id").primaryKey(),
  photoId: integer("photoId").notNull(),
  userId: integer("userId").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PhotoComment = typeof photoComments.$inferSelect;
export type InsertPhotoComment = typeof photoComments.$inferInsert;

/**
 * Photo reactions (likes)
 */
export const photoReactions = pgTable("photo_reactions", {
  id: serial("id").primaryKey(),
  photoId: integer("photoId").notNull(),
  userId: integer("userId").notNull(),
  reactionType: varchar("reactionType", { length: 100 }).notNull().default("like"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PhotoReaction = typeof photoReactions.$inferSelect;
export type InsertPhotoReaction = typeof photoReactions.$inferInsert;

/**
 * Notification queue
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  user_id: bigint("user_id", { mode: "number" }).notNull(),
  pet_id: integer("pet_id"),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  resource_type: varchar("resource_type", { length: 100 }),
  resource_id: integer("resource_id"),
  is_read: boolean("is_read").default(false).notNull(),
  is_sent: boolean("is_sent").default(false).notNull(),
  sent_at: timestamp("sent_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Financial transactions
 */
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  pet_id: integer("pet_id"),
  type: varchar("type", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: integer("amount").notNull(), // in cents
  transaction_date: timestamp("transaction_date", { withTimezone: true }).defaultNow().notNull(),
  created_by_id: bigint("created_by_id", { mode: "number" }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Subscription plans - configurable by admin
 */
export const subscriptionPlans = pgTable("subscriptionPlans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  price: integer("price").notNull(), // in cents
  credits: integer("credits").notNull(), // number of daycare credits included
  validityDays: integer("validityDays").notNull(), // plan duration in days (e.g., 30 for monthly)
  benefits: text("benefits"), // JSON string of benefits
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

/**
 * User subscriptions
 */
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  planId: integer("planId").notNull(),
  status: varchar("status", { length: 100 }).default("active").notNull(),
  startDate: timestamp("startDate").defaultNow().notNull(),
  endDate: timestamp("endDate").notNull(),
  autoRenew: boolean("autoRenew").default(true).notNull(),
  lastRenewalDate: timestamp("lastRenewalDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Flea treatments (antipulgas)
 */
export const fleaTreatments = pgTable("fleaTreatments", {
  id: serial("id").primaryKey(),
  petId: integer("petId").notNull(),
  productName: varchar("productName", { length: 200 }).notNull(),
  applicationDate: timestamp("applicationDate").notNull(),
  nextDueDate: timestamp("nextDueDate").notNull(),
  notes: text("notes"),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type FleaTreatment = typeof fleaTreatments.$inferSelect;
export type InsertFleaTreatment = typeof fleaTreatments.$inferInsert;

/**
 * Deworming treatments (vermífugos)
 */
export const dewormingTreatments = pgTable("dewormingTreatments", {
  id: serial("id").primaryKey(),
  petId: integer("petId").notNull(),
  productName: varchar("productName", { length: 200 }).notNull(),
  applicationDate: timestamp("applicationDate").notNull(),
  nextDueDate: timestamp("nextDueDate").notNull(),
  notes: text("notes"),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DewormingTreatment = typeof dewormingTreatments.$inferSelect;
export type InsertDewormingTreatment = typeof dewormingTreatments.$inferInsert;

/**
 * Behavior records (registros de comportamento)
 */
export const behaviorRecords = pgTable("behaviorRecords", {
  id: serial("id").primaryKey(),
  petId: integer("petId").notNull(),
  date: timestamp("date").notNull(),
  location: varchar("location", { length: 50 }).notNull(), // creche, casa, passeio, veterinario
  behaviorType: varchar("behaviorType", { length: 100 }).notNull(),
  description: text("description").notNull(),
  tags: text("tags"), // JSON array: ["agressividade", "ansiedade", "socializacao"]
  severity: varchar("severity", { length: 20 }), // leve, moderado, grave
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BehaviorRecord = typeof behaviorRecords.$inferSelect;
export type InsertBehaviorRecord = typeof behaviorRecords.$inferInsert;

/**
 * Training progress (progresso de adestramento)
 */
export const trainingProgress = pgTable("trainingProgress", {
  id: serial("id").primaryKey(),
  petId: integer("petId").notNull(),
  skill: varchar("skill", { length: 100 }).notNull(), // sentar, deitar, vir, ficar, etc
  startDate: timestamp("startDate").notNull(),
  currentLevel: integer("currentLevel").notNull().default(0), // 0-100
  notes: text("notes"),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TrainingProgress = typeof trainingProgress.$inferSelect;
export type InsertTrainingProgress = typeof trainingProgress.$inferInsert;

/**
 * Daycare bookings/reservations
 */
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  petId: integer("petId").notNull(),
  tutorId: integer("tutorId").notNull(),
  bookingDate: timestamp("bookingDate").notNull(),
  serviceType: varchar("serviceType", { length: 100 }).notNull().default("creche"), // creche = day care, diaria = overnight
  status: varchar("status", { length: 100 }).notNull().default("pending"),
  numberOfDays: integer("numberOfDays").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * Admin invites - email invitations to become admin
 */
export const adminInvites = pgTable("admin_invites", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  invitedBy: integer("invited_by").notNull(), // admin user ID who sent the invite
  status: varchar("status", { length: 100 }).default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminInvite = typeof adminInvites.$inferSelect;
export type InsertAdminInvite = typeof adminInvites.$inferInsert;

/**
 * Admin action logs - audit trail for administrative actions
 */
/**
 * Change History - tracks all modifications to shared resources
 */
export const changeHistory = pgTable("change_history", {
  id: serial("id").primaryKey(),
  resourceType: varchar("resource_type", { length: 100 }).notNull(),
  resourceId: integer("resource_id").notNull(),
  petId: integer("pet_id").notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: integer("changed_by").notNull(), // user ID
  changedByRole: varchar("changed_by_role", { length: 100 }).notNull(),
  changeType: varchar("change_type", { length: 100 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ChangeHistory = typeof changeHistory.$inferSelect;
export type InsertChangeHistory = typeof changeHistory.$inferInsert;

export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(), // admin who performed the action
  action: varchar("action", { length: 100 }).notNull(), // e.g., "promote_admin", "delete_user"
  targetType: varchar("target_type", { length: 50 }), // e.g., "user", "pet", "booking"
  targetId: integer("target_id"), // ID of the affected entity
  details: text("details"), // JSON string with additional details
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = typeof adminLogs.$inferInsert;

/**
 * Payment transactions (stores only Stripe IDs)
 */
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }).notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  amount: integer("amount").notNull(), // amount in cents
  currency: varchar("currency", { length: 3 }).default("brl").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // succeeded, failed, pending
  productType: varchar("product_type", { length: 50 }).notNull(), // plan, credits
  productKey: varchar("product_key", { length: 100 }), // PLAN_BASIC, CREDITS_10, etc
  creditsAdded: integer("credits_added"), // credits added to user account
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Reviews and ratings
 */
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  petId: integer("petId").notNull(),
  tutorId: integer("tutorId").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  visitDate: timestamp("visitDate").notNull(),
  response: text("response"), // Admin response
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * WhatsApp Integration Tables
 */

// WhatsApp Configuration
export const whatsappConfig = pgTable("whatsappConfig", {
  id: serial("id").primaryKey(),
  apiKey: text("apiKey"),
  phoneNumberId: varchar("phoneNumberId", { length: 100 }),
  businessAccountId: varchar("businessAccountId", { length: 100 }),
  webhookSecret: text("webhookSecret"),
  isActive: boolean("isActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WhatsAppConfig = typeof whatsappConfig.$inferSelect;
export type InsertWhatsAppConfig = typeof whatsappConfig.$inferInsert;

// WhatsApp Message Templates
export const whatsappTemplates = pgTable("whatsappTemplates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 100 }).notNull(),
  content: text("content").notNull(),
  variables: jsonb("variables"), // Array of variable names like ["petName", "date"]
  status: varchar("status", { length: 100 }).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WhatsAppTemplate = typeof whatsappTemplates.$inferSelect;
export type InsertWhatsAppTemplate = typeof whatsappTemplates.$inferInsert;

// WhatsApp Conversations
export const whatsappConversations = pgTable("whatsappConversations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // tutor who initiated conversation
  petId: integer("petId"), // optional: conversation about specific pet
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  status: varchar("status", { length: 100 }).default("active").notNull(),
  lastMessageAt: timestamp("lastMessageAt"),
  lastMessageContent: text("lastMessageContent"),
  unreadCount: integer("unreadCount").default(0).notNull(), // unread messages for admin
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WhatsAppConversation = typeof whatsappConversations.$inferSelect;
export type InsertWhatsAppConversation = typeof whatsappConversations.$inferInsert;

// WhatsApp Messages History
export const whatsappMessages = pgTable("whatsappMessages", {
  conversationId: integer("conversationId"), // link to conversation
  id: serial("id").primaryKey(),
  templateId: integer("templateId"),
  recipientPhone: varchar("recipientPhone", { length: 20 }).notNull(),
  recipientName: varchar("recipientName", { length: 200 }),
  messageContent: text("messageContent").notNull(),
  mediaUrl: text("mediaUrl"), // For photos/documents
  status: varchar("status", { length: 100 }).default("queued").notNull(),
  whatsappMessageId: varchar("whatsappMessageId", { length: 100 }),
  sentAt: timestamp("sentAt"),
  deliveredAt: timestamp("deliveredAt"),
  readAt: timestamp("readAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WhatsAppMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsAppMessage = typeof whatsappMessages.$inferInsert;

// WhatsApp Groups (one per pet)
export const whatsappGroups = pgTable("whatsappGroups", {
  id: serial("id").primaryKey(),
  petId: integer("petId").notNull(),
  groupName: varchar("groupName", { length: 200 }).notNull(),
  whatsappGroupId: varchar("whatsappGroupId", { length: 100 }),
  inviteLink: text("inviteLink"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WhatsAppGroup = typeof whatsappGroups.$inferSelect;
export type InsertWhatsAppGroup = typeof whatsappGroups.$inferInsert;

// WhatsApp Group Members
export const whatsappGroupMembers = pgTable("whatsappGroupMembers", {
  id: serial("id").primaryKey(),
  groupId: integer("groupId").notNull(),
  userId: integer("userId"),
  phone: varchar("phone", { length: 20 }).notNull(),
  name: varchar("name", { length: 200 }),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  removedAt: timestamp("removedAt"),
});

export type WhatsAppGroupMember = typeof whatsappGroupMembers.$inferSelect;
export type InsertWhatsAppGroupMember = typeof whatsappGroupMembers.$inferInsert;

// WhatsApp Automations
export const whatsappAutomations = pgTable("whatsappAutomations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  triggerType: varchar("triggerType", { length: 100 }).notNull(),
  templateId: integer("templateId").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  config: jsonb("config"), // Additional configuration like time of day, filters
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WhatsAppAutomation = typeof whatsappAutomations.$inferSelect;
export type InsertWhatsAppAutomation = typeof whatsappAutomations.$inferInsert;

/**
 * Booking requests from tutors for online scheduling
 */
export const bookingRequests = pgTable("booking_requests", {
  id: serial("id").primaryKey(),
  petId: integer("petId").notNull(),
  tutorId: varchar("tutorId", { length: 64 }).notNull(), // openId from users
  requestedDates: jsonb("requestedDates").$type<string[]>().notNull(), // Array of dates in YYYY-MM-DD format
  status: varchar("status", { length: 100 }).default("pending").notNull(),
  notes: text("notes"),
  adminNotes: text("adminNotes"), // Admin notes when approving/rejecting
  approvedBy: varchar("approvedBy", { length: 64 }), // openId of admin who approved/rejected
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BookingRequest = typeof bookingRequests.$inferSelect;
export type InsertBookingRequest = typeof bookingRequests.$inferInsert;

/**
 * Service prices - standard pricing for creche and diaria
 */
export const servicePrices = pgTable("service_prices", {
  id: serial("id").primaryKey(),
  serviceType: varchar("serviceType", { length: 100 }).notNull().unique(),
  priceInCents: integer("priceInCents").notNull(), // creche: 6000 (R$ 60), diaria: 8000 (R$ 80)
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ServicePrice = typeof servicePrices.$inferSelect;
export type InsertServicePrice = typeof servicePrices.$inferInsert;

/**
 * Custom pricing plans - personalized packages for specific tutors
 */
export const customPricingPlans = pgTable("custom_pricing_plans", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutorId").notNull(), // user id
  planName: varchar("planName", { length: 200 }).notNull(),
  description: text("description"),
  crechePrice: integer("crechePrice"), // custom price for creche in cents (null = use standard)
  diariaPrice: integer("diariaPrice"), // custom price for diaria in cents (null = use standard)
  discountPercent: integer("discountPercent").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  validFrom: timestamp("validFrom"),
  validUntil: timestamp("validUntil"),
  createdBy: integer("createdBy").notNull(), // admin who created
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CustomPricingPlan = typeof customPricingPlans.$inferSelect;
export type InsertCustomPricingPlan = typeof customPricingPlans.$inferInsert;

/**
 * Food stock - current stock of food in the daycare
 */
export const foodStock = pgTable("food_stock", {
  id: serial("id").primaryKey(),
  currentStockKg: integer("currentStockKg").default(0).notNull(), // in grams (e.g., 20000 for 20kg)
  lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
});

export type FoodStock = typeof foodStock.$inferSelect;
export type InsertFoodStock = typeof foodStock.$inferInsert;

/**
 * Food movements - track purchases and consumption
 */
export const foodMovements = pgTable("food_movements", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 100 }).notNull(),
  amountKg: integer("amountKg").notNull(), // in grams (positive for purchase, negative for consumption)
  notes: text("notes"),
  createdBy: integer("createdBy"), // admin who recorded (null for automatic consumption)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FoodMovement = typeof foodMovements.$inferSelect;
export type InsertFoodMovement = typeof foodMovements.$inferInsert;

/**
 * Audit logs - track security events and access attempts
 */
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"), // null for unauthenticated attempts
  action: varchar("action", { length: 255 }).notNull(), // e.g., "pets.approve", "pets.updateMine"
  resource: varchar("resource", { length: 255 }), // e.g., "pet:123"
  success: boolean("success").notNull(),
  errorCode: varchar("errorCode", { length: 50 }), // e.g., "FORBIDDEN", "UNAUTHORIZED"
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 or IPv6
  userAgent: text("userAgent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Notification templates - customizable message templates for automatic notifications
 */
export const notificationTemplates = pgTable("notification_templates", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  availableVariables: text("availableVariables"), // JSON array of available variables like {{petName}}, {{date}}
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = typeof notificationTemplates.$inferInsert;

/**
 * Tutor notification preferences - individual settings for each tutor
 */
export const tutorNotificationPreferences = pgTable("tutor_notification_preferences", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutorId").notNull(),
  notificationType: varchar("notificationType", { length: 100 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  adminOverride: boolean("adminOverride").default(false).notNull(), // if true, admin has disabled for this tutor
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TutorNotificationPreference = typeof tutorNotificationPreferences.$inferSelect;
export type InsertTutorNotificationPreference = typeof tutorNotificationPreferences.$inferInsert;

/**
 * Health and Behavior Logs - Quick daily records of pet health and behavior
 */
export const healthBehaviorLogs = pgTable("health_behavior_logs", {
  id: serial("id").primaryKey(),
  petId: integer("petId").notNull(),
  recordedBy: integer("recordedBy").notNull(), // user ID who made the record
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  
  // Mood/Humor
  mood: varchar("mood", { length: 100 }),
  
  // Fezes/Stool
  stool: varchar("stool", { length: 100 }),
  
  // Comportamento/Behavior
  behavior: varchar("behavior", { length: 100 }),
  
  // Apetite
  appetite: varchar("appetite", { length: 100 }),
  
  // Água
  waterIntake: varchar("waterIntake", { length: 100 }),
  
  // Observações gerais
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type HealthBehaviorLog = typeof healthBehaviorLogs.$inferSelect;
export type InsertHealthBehaviorLog = typeof healthBehaviorLogs.$inferInsert;

/**
 * Custom event types for calendar
 */
export const eventTypes = pgTable("event_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).notNull(), // Hex color code
  icon: varchar("icon", { length: 50 }), // Icon name from lucide-react
  isActive: boolean("isActive").default(true).notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventType = typeof eventTypes.$inferSelect;
export type InsertEventType = typeof eventTypes.$inferInsert;

/**
 * Pet food stock management
 * Tracks individual pet food inventory and consumption for restock alerts
 */
export const petFoodStock = pgTable("pet_food_stock", {
  id: serial("id").primaryKey(),
  petId: integer("petId").notNull(),
  brandName: varchar("brandName", { length: 200 }).notNull(),
  currentStock: integer("currentStock").notNull(), // current stock in grams
  dailyConsumption: integer("dailyConsumption").notNull(), // average daily consumption in grams
  alertThresholdDays: integer("alertThresholdDays").default(15).notNull(), // alert X days before running out
  lastPurchaseDate: timestamp("lastPurchaseDate"),
  lastPurchaseAmount: integer("lastPurchaseAmount"), // amount purchased in grams
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PetFoodStock = typeof petFoodStock.$inferSelect;
export type InsertPetFoodStock = typeof petFoodStock.$inferInsert;

/**
 * Medication auto-schedule rules
 * Defines automatic scheduling rules for specific medications
 * e.g., Simparic: +35 days, V10: +365 days
 */
export const medicationAutoScheduleRules = pgTable("medication_auto_schedule_rules", {
  id: serial("id").primaryKey(),
  medicationId: integer("medicationId").notNull(), // references medications.id
  intervalDays: integer("intervalDays").notNull(), // days to add for next dose
  intervalType: varchar("intervalType", { length: 100 }).default("days").notNull(),
  intervalValue: integer("intervalValue").notNull(), // numeric value (e.g., 35 for days, 1 for year)
  isActive: boolean("isActive").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MedicationAutoScheduleRule = typeof medicationAutoScheduleRules.$inferSelect;
export type InsertMedicationAutoScheduleRule = typeof medicationAutoScheduleRules.$inferInsert;

/**
 * Wall posts for interactive feed
 * Social-media style posts with photos, videos, and text
 */
export const wallPosts = pgTable("wall_posts", {
  id: serial("id").primaryKey(),
  petId: integer("petId"), // optional: post can be about a specific pet or general
  authorId: integer("authorId").notNull(),
  content: text("content"),
  mediaUrls: jsonb("mediaUrls").$type<string[]>(), // array of photo/video URLs
  mediaKeys: jsonb("mediaKeys").$type<string[]>(), // array of S3 keys
  postType: varchar("postType", { length: 100 }).default("text").notNull(),
  targetType: varchar("targetType", { length: 100 }).default("general").notNull(), // post visibility
  targetId: integer("targetId"), // ID of tutor or pet if targeted
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WallPost = typeof wallPosts.$inferSelect;
export type InsertWallPost = typeof wallPosts.$inferInsert;

/**
 * Comments on wall posts
 */
export const wallComments = pgTable("wall_comments", {
  id: serial("id").primaryKey(),
  postId: integer("postId").notNull(),
  authorId: integer("authorId").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WallComment = typeof wallComments.$inferSelect;
export type InsertWallComment = typeof wallComments.$inferInsert;

/**
 * Reactions to wall posts
 */
export const wallReactions = pgTable("wall_reactions", {
  id: serial("id").primaryKey(),
  postId: integer("postId").notNull(),
  userId: integer("userId").notNull(),
  reactionType: varchar("reactionType", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WallReaction = typeof wallReactions.$inferSelect;
export type InsertWallReaction = typeof wallReactions.$inferInsert;

/**
 * Chat conversations between tutors and daycare
 */
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  petId: integer("petId"), // optional: conversation can be about a specific pet
  participants: jsonb("participants").$type<number[]>().notNull(), // array of user IDs
  lastMessageAt: timestamp("lastMessageAt"),
  unreadCount: integer("unreadCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Chat messages with WhatsApp integration
 */
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").notNull(),
  senderId: integer("senderId").notNull(),
  content: text("content"),
  mediaUrl: varchar("mediaUrl", { length: 500 }),
  mediaKey: varchar("mediaKey", { length: 500 }),
  messageType: varchar("messageType", { length: 100 }).default("text").notNull(),
  source: varchar("source", { length: 100 }).default("platform").notNull(), // message origin
  whatsappMessageId: varchar("whatsappMessageId", { length: 200 }), // for sync with WhatsApp
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  pets: many(petTutors),
  logsCreated: many(dailyLogs, { relationName: "logsCreated" }),
  documentsUploaded: many(documents, { relationName: "documentsUploaded" }),
  notifications: many(notifications),
}));

export const petsRelations = relations(pets, ({ many }) => ({
  tutors: many(petTutors),
  credits: many(daycareCredits),
  usageHistory: many(daycareUsage),
  vaccinations: many(petVaccinations),
  medications: many(petMedications),
  logs: many(dailyLogs),
  events: many(calendarEvents),
  documents: many(documents),
  transactions: many(transactions),
}));

export const petTutorsRelations = relations(petTutors, ({ one }) => ({
  pet: one(pets, { fields: [petTutors.pet_id], references: [pets.id] }),
  tutor: one(users, { fields: [petTutors.tutor_id], references: [users.id] }),
}));
