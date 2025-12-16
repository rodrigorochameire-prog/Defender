import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, date, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extended with role field for admin/user distinction.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // Optional for email/password users
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }), // For email/password auth
  loginMethod: varchar("loginMethod", { length: 64 }).default("email").notNull(), // "oauth" or "email"
  emailVerified: boolean("emailVerified").default(false).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  phone: varchar("phone", { length: 20 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Password reset tokens table
 */
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).unique().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * Email verification tokens table
 */
export const emailVerificationTokens = mysqlTable("email_verification_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).unique().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

/**
 * Pets table - stores all pet information
 */
export const pets = mysqlTable("pets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  breed: varchar("breed", { length: 100 }),
  age: varchar("age", { length: 50 }), // e.g., "2a 3m"
  weight: int("weight"), // weight in grams (e.g., 32500 for 32.5kg)
  birthDate: timestamp("birthDate"),
  photoUrl: text("photoUrl"),
  photoKey: text("photoKey"), // S3 key for photo
  status: mysqlEnum("status", ["checked-in", "checked-out"]).default("checked-out").notNull(),
  approvalStatus: mysqlEnum("approvalStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  checkInTime: timestamp("checkInTime"),
  checkOutTime: timestamp("checkOutTime"),
  foodBrand: varchar("foodBrand", { length: 200 }),
  foodAmount: int("foodAmount"), // daily food amount in grams
  credits: int("credits").default(0).notNull(), // daycare credits
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;

/**
 * Pet-Tutor relationship table (N:N)
 */
export const petTutors = mysqlTable("pet_tutors", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  tutorId: int("tutorId").notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(), // primary contact
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PetTutor = typeof petTutors.$inferSelect;
export type InsertPetTutor = typeof petTutors.$inferInsert;

/**
 * Credit packages available for purchase
 */
export const creditPackages = mysqlTable("credit_packages", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  credits: int("credits").notNull(), // number of credits
  priceInCents: int("priceInCents").notNull(),
  discountPercent: int("discountPercent").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditPackage = typeof creditPackages.$inferSelect;
export type InsertCreditPackage = typeof creditPackages.$inferInsert;

/**
 * Daycare credits system
 */
export const daycareCredits = mysqlTable("daycare_credits", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  packageDays: int("packageDays").notNull(), // number of days purchased
  packagePrice: int("packagePrice").notNull(), // price in cents
  remainingDays: int("remainingDays").notNull(),
  purchaseDate: timestamp("purchaseDate").defaultNow().notNull(),
  expiryDate: timestamp("expiryDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DaycareCredit = typeof daycareCredits.$inferSelect;
export type InsertDaycareCredit = typeof daycareCredits.$inferInsert;

/**
 * Daycare usage history
 */
export const daycareUsage = mysqlTable("daycare_usage", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  usageDate: timestamp("usageDate").notNull(),
  checkInTime: timestamp("checkInTime"),
  checkOutTime: timestamp("checkOutTime"),
  creditId: int("creditId"), // which credit package was used
  amountCents: int("amountCents"), // valor da estadia em centavos
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "cancelled"]).default("pending").notNull(),
  paidAt: timestamp("paidAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DaycareUsage = typeof daycareUsage.$inferSelect;
export type InsertDaycareUsage = typeof daycareUsage.$inferInsert;

/**
 * Vaccine library - pre-defined common vaccines
 */
export const vaccineLibrary = mysqlTable("vaccine_library", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  intervalDays: int("intervalDays"), // recommended interval between doses
  dosesRequired: int("dosesRequired").default(1), // number of doses needed
  isCommon: boolean("isCommon").default(true).notNull(), // pre-defined vs custom
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VaccineLibrary = typeof vaccineLibrary.$inferSelect;
export type InsertVaccineLibrary = typeof vaccineLibrary.$inferInsert;

/**
 * Pet vaccination records
 */
export const petVaccinations = mysqlTable("pet_vaccinations", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  vaccineId: int("vaccineId").notNull(), // reference to vaccine_library
  applicationDate: timestamp("applicationDate").notNull(),
  nextDueDate: timestamp("nextDueDate"),
  doseNumber: int("doseNumber").default(1), // which dose (1, 2, 3...)
  veterinarian: varchar("veterinarian", { length: 200 }),
  clinic: varchar("clinic", { length: 200 }),
  batchNumber: varchar("batchNumber", { length: 100 }),
  notes: text("notes"),
  documentUrl: text("documentUrl"), // S3 url for vaccine certificate
  documentKey: text("documentKey"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PetVaccination = typeof petVaccinations.$inferSelect;
export type InsertPetVaccination = typeof petVaccinations.$inferInsert;

/**
 * Medication library - pre-defined common medications
 */
export const medicationLibrary = mysqlTable("medication_library", {
  id: int("id").autoincrement().primaryKey(),
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
export const preventiveLibrary = mysqlTable("preventive_library", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["flea", "deworming"]).notNull(),
  manufacturer: varchar("manufacturer", { length: 200 }),
  intervalDays: int("intervalDays"), // recommended interval in days
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PreventiveLibrary = typeof preventiveLibrary.$inferSelect;
export type InsertPreventiveLibrary = typeof preventiveLibrary.$inferInsert;

/**
 * Pet medication/treatment records
 */
export const petMedications = mysqlTable("pet_medications", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  medicationId: int("medicationId").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  dosage: varchar("dosage", { length: 200 }).notNull(),
  frequency: varchar("frequency", { length: 100 }), // e.g., "12h", "8h", "daily"
  // Advanced periodicity fields
  periodicity: mysqlEnum("periodicity", ["daily", "weekly", "monthly", "custom"]).default("daily"),
  customInterval: int("customInterval"), // interval in days for custom periodicity
  weekDays: text("weekDays"), // JSON array of week days [0-6] for weekly periodicity
  monthDays: text("monthDays"), // JSON array of month days [1-31] for monthly periodicity
  autoSchedule: boolean("autoSchedule").default(false).notNull(), // enable auto-scheduling
  // Dosage progression fields
  dosageProgression: mysqlEnum("dosageProgression", ["stable", "increase", "decrease"]).default("stable"),
  progressionRate: varchar("progressionRate", { length: 50 }), // e.g., "10%", "5mg"
  progressionInterval: int("progressionInterval"), // adjust every X doses
  targetDosage: varchar("targetDosage", { length: 200 }), // target dosage to reach
  currentDoseCount: int("currentDoseCount").default(0).notNull(), // track dose number for progression
  isActive: boolean("isActive").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PetMedication = typeof petMedications.$inferSelect;
export type InsertPetMedication = typeof petMedications.$inferInsert;

/**
 * Daily logs - segregated by source (home vs daycare)
 */
export const dailyLogs = mysqlTable("daily_logs", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  logDate: timestamp("logDate").notNull(),
  source: mysqlEnum("source", ["home", "daycare"]).notNull(),
  mood: mysqlEnum("mood", ["feliz", "calmo", "ansioso", "triste", "agitado"]),
  stool: mysqlEnum("stool", ["normal", "diarreia", "constipado", "nao_fez"]),
  appetite: mysqlEnum("appetite", ["normal", "aumentado", "diminuido", "nao_comeu"]),
  behavior: text("behavior"),
  behaviorNotes: text("behaviorNotes"),
  activities: text("activities"), // JSON array of activities
  foodConsumed: varchar("foodConsumed", { length: 50 }), // "all", "half", "little", "none"
  feedingTime: varchar("feedingTime", { length: 10 }), // HH:MM format
  feedingAmount: varchar("feedingAmount", { length: 100 }), // e.g., "200g", "1 xícara"
  feedingAcceptance: mysqlEnum("feedingAcceptance", ["excelente", "boa", "regular", "ruim", "recusou"]),
  weight: int("weight"), // weight in grams at time of log
  notes: text("notes"),
  createdById: int("createdById").notNull(), // user who created the log
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyLog = typeof dailyLogs.$inferSelect;
export type InsertDailyLog = typeof dailyLogs.$inferInsert;

/**
 * Calendar events
 */
export const calendarEvents = mysqlTable("calendar_events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  eventDate: timestamp("eventDate").notNull(),
  endDate: timestamp("endDate"), // For events with duration
  eventType: mysqlEnum("eventType", ["holiday", "medical", "general", "vaccination", "medication", "closure", "checkin", "checkout", "preventive", "custom"]).notNull(),
  customEventTypeId: int("customEventTypeId"), // Reference to eventTypes table for custom types
  customColor: varchar("customColor", { length: 20 }), // Hex color for custom events
  petId: int("petId"), // null for general events
  location: varchar("location", { length: 200 }),
  isAllDay: boolean("isAllDay").default(true).notNull(),
  // Multi-day stay period fields (for checkin events)
  checkInDate: timestamp("checkInDate"), // Start date of stay
  checkOutDate: timestamp("checkOutDate"), // End date of stay
  dailyCount: int("dailyCount"), // Number of days (calculated)
  // Attached media and logs
  photoUrls: json("photoUrls").$type<string[]>(), // Array of photo URLs
  photoKeys: json("photoKeys").$type<string[]>(), // Array of S3 keys
  logIds: json("logIds").$type<number[]>(), // Array of dailyLogs IDs
  reminderSent: boolean("reminderSent").default(false).notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

/**
 * Documents storage
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  category: mysqlEnum("category", ["vaccination_card", "veterinary_document", "exam", "certificate", "prescription", "other"]).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  fileName: varchar("fileName", { length: 255 }),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"), // in bytes
  description: text("description"),
  uploadedById: int("uploadedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Pet photos gallery
 */
export const petPhotos = mysqlTable("pet_photos", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  photoUrl: text("photoUrl").notNull(),
  photoKey: text("photoKey").notNull(), // S3 key
  caption: text("caption"),
  takenAt: timestamp("takenAt").notNull(),
  uploadedById: int("uploadedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PetPhoto = typeof petPhotos.$inferSelect;
export type InsertPetPhoto = typeof petPhotos.$inferInsert;

/**
 * Photo comments
 */
export const photoComments = mysqlTable("photo_comments", {
  id: int("id").autoincrement().primaryKey(),
  photoId: int("photoId").notNull(),
  userId: int("userId").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PhotoComment = typeof photoComments.$inferSelect;
export type InsertPhotoComment = typeof photoComments.$inferInsert;

/**
 * Photo reactions (likes)
 */
export const photoReactions = mysqlTable("photo_reactions", {
  id: int("id").autoincrement().primaryKey(),
  photoId: int("photoId").notNull(),
  userId: int("userId").notNull(),
  reactionType: mysqlEnum("reactionType", ["like", "love", "laugh"]).notNull().default("like"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PhotoReaction = typeof photoReactions.$inferSelect;
export type InsertPhotoReaction = typeof photoReactions.$inferInsert;

/**
 * Notification queue
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  petId: int("petId"),
  type: mysqlEnum("type", ["vaccine_reminder", "medication_reminder", "credit_low", "daily_update", "check_in", "check_out", "daily_report", "calendar_event", "system", "change_alert"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  resourceType: mysqlEnum("resource_type", ["medication", "vaccine", "preventive", "pet_data", "calendar"]),
  resourceId: int("resourceId"),
  isRead: boolean("isRead").default(false).notNull(),
  isSent: boolean("isSent").default(false).notNull(),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Financial transactions
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId"),
  type: mysqlEnum("type", ["credit", "debit", "income", "expense"]).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: int("amount").notNull(), // in cents
  transactionDate: timestamp("transactionDate").defaultNow().notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Subscription plans - configurable by admin
 */
export const subscriptionPlans = mysqlTable("subscriptionPlans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  price: int("price").notNull(), // in cents
  credits: int("credits").notNull(), // number of daycare credits included
  validityDays: int("validityDays").notNull(), // plan duration in days (e.g., 30 for monthly)
  benefits: text("benefits"), // JSON string of benefits
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

/**
 * User subscriptions
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  planId: int("planId").notNull(),
  status: mysqlEnum("status", ["active", "cancelled", "expired"]).default("active").notNull(),
  startDate: timestamp("startDate").defaultNow().notNull(),
  endDate: timestamp("endDate").notNull(),
  autoRenew: boolean("autoRenew").default(true).notNull(),
  lastRenewalDate: timestamp("lastRenewalDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Flea treatments (antipulgas)
 */
export const fleaTreatments = mysqlTable("fleaTreatments", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  productName: varchar("productName", { length: 200 }).notNull(),
  applicationDate: timestamp("applicationDate").notNull(),
  nextDueDate: timestamp("nextDueDate").notNull(),
  notes: text("notes"),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FleaTreatment = typeof fleaTreatments.$inferSelect;
export type InsertFleaTreatment = typeof fleaTreatments.$inferInsert;

/**
 * Deworming treatments (vermífugos)
 */
export const dewormingTreatments = mysqlTable("dewormingTreatments", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  productName: varchar("productName", { length: 200 }).notNull(),
  applicationDate: timestamp("applicationDate").notNull(),
  nextDueDate: timestamp("nextDueDate").notNull(),
  notes: text("notes"),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DewormingTreatment = typeof dewormingTreatments.$inferSelect;
export type InsertDewormingTreatment = typeof dewormingTreatments.$inferInsert;

/**
 * Behavior records (registros de comportamento)
 */
export const behaviorRecords = mysqlTable("behaviorRecords", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  date: timestamp("date").notNull(),
  location: varchar("location", { length: 50 }).notNull(), // creche, casa, passeio, veterinario
  behaviorType: varchar("behaviorType", { length: 100 }).notNull(),
  description: text("description").notNull(),
  tags: text("tags"), // JSON array: ["agressividade", "ansiedade", "socializacao"]
  severity: varchar("severity", { length: 20 }), // leve, moderado, grave
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BehaviorRecord = typeof behaviorRecords.$inferSelect;
export type InsertBehaviorRecord = typeof behaviorRecords.$inferInsert;

/**
 * Training progress (progresso de adestramento)
 */
export const trainingProgress = mysqlTable("trainingProgress", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  skill: varchar("skill", { length: 100 }).notNull(), // sentar, deitar, vir, ficar, etc
  startDate: timestamp("startDate").notNull(),
  currentLevel: int("currentLevel").notNull().default(0), // 0-100
  notes: text("notes"),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrainingProgress = typeof trainingProgress.$inferSelect;
export type InsertTrainingProgress = typeof trainingProgress.$inferInsert;

/**
 * Daycare bookings/reservations
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  tutorId: int("tutorId").notNull(),
  bookingDate: timestamp("bookingDate").notNull(),
  serviceType: mysqlEnum("serviceType", ["creche", "diaria"]).notNull().default("creche"), // creche = day care, diaria = overnight
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).notNull().default("pending"),
  numberOfDays: int("numberOfDays").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * Admin invites - email invitations to become admin
 */
export const adminInvites = mysqlTable("admin_invites", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  invitedBy: int("invited_by").notNull(), // admin user ID who sent the invite
  status: mysqlEnum("status", ["pending", "accepted", "expired"]).default("pending").notNull(),
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
export const changeHistory = mysqlTable("change_history", {
  id: int("id").autoincrement().primaryKey(),
  resourceType: mysqlEnum("resource_type", ["medication", "food", "preventive", "pet_data", "calendar"]).notNull(),
  resourceId: int("resource_id").notNull(),
  petId: int("pet_id").notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: int("changed_by").notNull(), // user ID
  changedByRole: mysqlEnum("changed_by_role", ["admin", "tutor"]).notNull(),
  changeType: mysqlEnum("change_type", ["create", "update", "delete"]).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ChangeHistory = typeof changeHistory.$inferSelect;
export type InsertChangeHistory = typeof changeHistory.$inferInsert;

export const adminLogs = mysqlTable("admin_logs", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("admin_id").notNull(), // admin who performed the action
  action: varchar("action", { length: 100 }).notNull(), // e.g., "promote_admin", "delete_user"
  targetType: varchar("target_type", { length: 50 }), // e.g., "user", "pet", "booking"
  targetId: int("target_id"), // ID of the affected entity
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
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }).notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  amount: int("amount").notNull(), // amount in cents
  currency: varchar("currency", { length: 3 }).default("brl").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // succeeded, failed, pending
  productType: varchar("product_type", { length: 50 }).notNull(), // plan, credits
  productKey: varchar("product_key", { length: 100 }), // PLAN_BASIC, CREDITS_10, etc
  creditsAdded: int("credits_added"), // credits added to user account
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Reviews and ratings
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  tutorId: int("tutorId").notNull(),
  rating: int("rating").notNull(), // 1-5 stars
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
export const whatsappConfig = mysqlTable("whatsappConfig", {
  id: int("id").autoincrement().primaryKey(),
  apiKey: text("apiKey"),
  phoneNumberId: varchar("phoneNumberId", { length: 100 }),
  businessAccountId: varchar("businessAccountId", { length: 100 }),
  webhookSecret: text("webhookSecret"),
  isActive: boolean("isActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsAppConfig = typeof whatsappConfig.$inferSelect;
export type InsertWhatsAppConfig = typeof whatsappConfig.$inferInsert;

// WhatsApp Message Templates
export const whatsappTemplates = mysqlTable("whatsappTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  category: mysqlEnum("category", [
    "welcome",
    "booking_confirmation",
    "vaccine_reminder",
    "checkin",
    "checkout",
    "daily_report",
    "new_photo",
    "medication_applied",
    "preventive_reminder",
    "custom",
  ]).notNull(),
  content: text("content").notNull(),
  variables: json("variables"), // Array of variable names like ["petName", "date"]
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsAppTemplate = typeof whatsappTemplates.$inferSelect;
export type InsertWhatsAppTemplate = typeof whatsappTemplates.$inferInsert;

// WhatsApp Conversations
export const whatsappConversations = mysqlTable("whatsappConversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // tutor who initiated conversation
  petId: int("petId"), // optional: conversation about specific pet
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  status: mysqlEnum("status", ["active", "resolved", "pending"]).default("active").notNull(),
  lastMessageAt: timestamp("lastMessageAt"),
  lastMessageContent: text("lastMessageContent"),
  unreadCount: int("unreadCount").default(0).notNull(), // unread messages for admin
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsAppConversation = typeof whatsappConversations.$inferSelect;
export type InsertWhatsAppConversation = typeof whatsappConversations.$inferInsert;

// WhatsApp Messages History
export const whatsappMessages = mysqlTable("whatsappMessages", {
  conversationId: int("conversationId"), // link to conversation
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId"),
  recipientPhone: varchar("recipientPhone", { length: 20 }).notNull(),
  recipientName: varchar("recipientName", { length: 200 }),
  messageContent: text("messageContent").notNull(),
  mediaUrl: text("mediaUrl"), // For photos/documents
  status: mysqlEnum("status", ["queued", "sent", "delivered", "read", "failed"]).default("queued").notNull(),
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
export const whatsappGroups = mysqlTable("whatsappGroups", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  groupName: varchar("groupName", { length: 200 }).notNull(),
  whatsappGroupId: varchar("whatsappGroupId", { length: 100 }),
  inviteLink: text("inviteLink"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsAppGroup = typeof whatsappGroups.$inferSelect;
export type InsertWhatsAppGroup = typeof whatsappGroups.$inferInsert;

// WhatsApp Group Members
export const whatsappGroupMembers = mysqlTable("whatsappGroupMembers", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  userId: int("userId"),
  phone: varchar("phone", { length: 20 }).notNull(),
  name: varchar("name", { length: 200 }),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  removedAt: timestamp("removedAt"),
});

export type WhatsAppGroupMember = typeof whatsappGroupMembers.$inferSelect;
export type InsertWhatsAppGroupMember = typeof whatsappGroupMembers.$inferInsert;

// WhatsApp Automations
export const whatsappAutomations = mysqlTable("whatsappAutomations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  triggerType: mysqlEnum("triggerType", [
    "photo_added",
    "vaccine_reminder_7d",
    "vaccine_reminder_1d",
    "checkin",
    "checkout",
    "daily_report",
    "medication_applied",
    "preventive_reminder",
  ]).notNull(),
  templateId: int("templateId").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  config: json("config"), // Additional configuration like time of day, filters
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsAppAutomation = typeof whatsappAutomations.$inferSelect;
export type InsertWhatsAppAutomation = typeof whatsappAutomations.$inferInsert;

/**
 * Booking requests from tutors for online scheduling
 */
export const bookingRequests = mysqlTable("booking_requests", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  tutorId: varchar("tutorId", { length: 64 }).notNull(), // openId from users
  requestedDates: json("requestedDates").$type<string[]>().notNull(), // Array of dates in YYYY-MM-DD format
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  notes: text("notes"),
  adminNotes: text("adminNotes"), // Admin notes when approving/rejecting
  approvedBy: varchar("approvedBy", { length: 64 }), // openId of admin who approved/rejected
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BookingRequest = typeof bookingRequests.$inferSelect;
export type InsertBookingRequest = typeof bookingRequests.$inferInsert;

/**
 * Service prices - standard pricing for creche and diaria
 */
export const servicePrices = mysqlTable("service_prices", {
  id: int("id").autoincrement().primaryKey(),
  serviceType: mysqlEnum("serviceType", ["creche", "diaria"]).notNull().unique(),
  priceInCents: int("priceInCents").notNull(), // creche: 6000 (R$ 60), diaria: 8000 (R$ 80)
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServicePrice = typeof servicePrices.$inferSelect;
export type InsertServicePrice = typeof servicePrices.$inferInsert;

/**
 * Custom pricing plans - personalized packages for specific tutors
 */
export const customPricingPlans = mysqlTable("custom_pricing_plans", {
  id: int("id").autoincrement().primaryKey(),
  tutorId: int("tutorId").notNull(), // user id
  planName: varchar("planName", { length: 200 }).notNull(),
  description: text("description"),
  crechePrice: int("crechePrice"), // custom price for creche in cents (null = use standard)
  diariaPrice: int("diariaPrice"), // custom price for diaria in cents (null = use standard)
  discountPercent: int("discountPercent").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  validFrom: timestamp("validFrom"),
  validUntil: timestamp("validUntil"),
  createdBy: int("createdBy").notNull(), // admin who created
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomPricingPlan = typeof customPricingPlans.$inferSelect;
export type InsertCustomPricingPlan = typeof customPricingPlans.$inferInsert;

/**
 * Food stock - current stock of food in the daycare
 */
export const foodStock = mysqlTable("food_stock", {
  id: int("id").autoincrement().primaryKey(),
  currentStockKg: int("currentStockKg").default(0).notNull(), // in grams (e.g., 20000 for 20kg)
  lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
});

export type FoodStock = typeof foodStock.$inferSelect;
export type InsertFoodStock = typeof foodStock.$inferInsert;

/**
 * Food movements - track purchases and consumption
 */
export const foodMovements = mysqlTable("food_movements", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["purchase", "consumption"]).notNull(),
  amountKg: int("amountKg").notNull(), // in grams (positive for purchase, negative for consumption)
  notes: text("notes"),
  createdBy: int("createdBy"), // admin who recorded (null for automatic consumption)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FoodMovement = typeof foodMovements.$inferSelect;
export type InsertFoodMovement = typeof foodMovements.$inferInsert;

/**
 * Audit logs - track security events and access attempts
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // null for unauthenticated attempts
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
export const notificationTemplates = mysqlTable("notification_templates", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", [
    "vaccine_reminder_7d",
    "vaccine_reminder_1d",
    "medication_reminder",
    "checkin_notification",
    "checkout_notification",
    "daily_report",
    "credits_low",
    "event_reminder"
  ]).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  availableVariables: text("availableVariables"), // JSON array of available variables like {{petName}}, {{date}}
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = typeof notificationTemplates.$inferInsert;

/**
 * Tutor notification preferences - individual settings for each tutor
 */
export const tutorNotificationPreferences = mysqlTable("tutor_notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  tutorId: int("tutorId").notNull(),
  notificationType: mysqlEnum("notificationType", [
    "vaccine_reminder_7d",
    "vaccine_reminder_1d",
    "medication_reminder",
    "checkin_notification",
    "checkout_notification",
    "daily_report",
    "credits_low",
    "event_reminder"
  ]).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  adminOverride: boolean("adminOverride").default(false).notNull(), // if true, admin has disabled for this tutor
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TutorNotificationPreference = typeof tutorNotificationPreferences.$inferSelect;
export type InsertTutorNotificationPreference = typeof tutorNotificationPreferences.$inferInsert;

/**
 * Health and Behavior Logs - Quick daily records of pet health and behavior
 */
export const healthBehaviorLogs = mysqlTable("health_behavior_logs", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  recordedBy: int("recordedBy").notNull(), // user ID who made the record
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  
  // Mood/Humor
  mood: mysqlEnum("mood", ["feliz", "ansioso", "calmo", "agitado", "letargico", "agressivo"]),
  
  // Fezes/Stool
  stool: mysqlEnum("stool", ["perfeitas", "normal", "levemente_moles", "moles", "pastosas", "diarreia", "ressecadas", "constipacao", "com_sangue", "muco"]),
  
  // Comportamento/Behavior
  behavior: mysqlEnum("behavior", ["ativo", "brincalhao", "sociavel", "calmo", "relaxado", "curioso", "timido", "protetor", "destrutivo", "letargico", "agressivo", "assustado"]),
  
  // Apetite
  appetite: mysqlEnum("appetite", ["normal", "aumentado", "diminuido", "recusou"]),
  
  // Água
  waterIntake: mysqlEnum("waterIntake", ["normal", "aumentado", "diminuido", "recusou"]),
  
  // Observações gerais
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HealthBehaviorLog = typeof healthBehaviorLogs.$inferSelect;
export type InsertHealthBehaviorLog = typeof healthBehaviorLogs.$inferInsert;

/**
 * Custom event types for calendar
 */
export const eventTypes = mysqlTable("event_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).notNull(), // Hex color code
  icon: varchar("icon", { length: 50 }), // Icon name from lucide-react
  isActive: boolean("isActive").default(true).notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventType = typeof eventTypes.$inferSelect;
export type InsertEventType = typeof eventTypes.$inferInsert;

/**
 * Pet food stock management
 * Tracks individual pet food inventory and consumption for restock alerts
 */
export const petFoodStock = mysqlTable("pet_food_stock", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull(),
  brandName: varchar("brandName", { length: 200 }).notNull(),
  currentStock: int("currentStock").notNull(), // current stock in grams
  dailyConsumption: int("dailyConsumption").notNull(), // average daily consumption in grams
  alertThresholdDays: int("alertThresholdDays").default(15).notNull(), // alert X days before running out
  lastPurchaseDate: timestamp("lastPurchaseDate"),
  lastPurchaseAmount: int("lastPurchaseAmount"), // amount purchased in grams
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PetFoodStock = typeof petFoodStock.$inferSelect;
export type InsertPetFoodStock = typeof petFoodStock.$inferInsert;

/**
 * Medication auto-schedule rules
 * Defines automatic scheduling rules for specific medications
 * e.g., Simparic: +35 days, V10: +365 days
 */
export const medicationAutoScheduleRules = mysqlTable("medication_auto_schedule_rules", {
  id: int("id").autoincrement().primaryKey(),
  medicationId: int("medicationId").notNull(), // references medications.id
  intervalDays: int("intervalDays").notNull(), // days to add for next dose
  intervalType: mysqlEnum("intervalType", ["days", "weeks", "months", "years"]).default("days").notNull(),
  intervalValue: int("intervalValue").notNull(), // numeric value (e.g., 35 for days, 1 for year)
  isActive: boolean("isActive").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MedicationAutoScheduleRule = typeof medicationAutoScheduleRules.$inferSelect;
export type InsertMedicationAutoScheduleRule = typeof medicationAutoScheduleRules.$inferInsert;

/**
 * Wall posts for interactive feed
 * Social-media style posts with photos, videos, and text
 */
export const wallPosts = mysqlTable("wall_posts", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId"), // optional: post can be about a specific pet or general
  authorId: int("authorId").notNull(),
  content: text("content"),
  mediaUrls: json("mediaUrls").$type<string[]>(), // array of photo/video URLs
  mediaKeys: json("mediaKeys").$type<string[]>(), // array of S3 keys
  postType: mysqlEnum("postType", ["photo", "video", "text", "mixed"]).default("text").notNull(),
  targetType: mysqlEnum("targetType", ["general", "tutor", "pet"]).default("general").notNull(), // post visibility
  targetId: int("targetId"), // ID of tutor or pet if targeted
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WallPost = typeof wallPosts.$inferSelect;
export type InsertWallPost = typeof wallPosts.$inferInsert;

/**
 * Comments on wall posts
 */
export const wallComments = mysqlTable("wall_comments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  authorId: int("authorId").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WallComment = typeof wallComments.$inferSelect;
export type InsertWallComment = typeof wallComments.$inferInsert;

/**
 * Reactions to wall posts
 */
export const wallReactions = mysqlTable("wall_reactions", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  userId: int("userId").notNull(),
  reactionType: mysqlEnum("reactionType", ["like", "love", "laugh", "wow", "sad"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WallReaction = typeof wallReactions.$inferSelect;
export type InsertWallReaction = typeof wallReactions.$inferInsert;

/**
 * Chat conversations between tutors and daycare
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId"), // optional: conversation can be about a specific pet
  participants: json("participants").$type<number[]>().notNull(), // array of user IDs
  lastMessageAt: timestamp("lastMessageAt"),
  unreadCount: int("unreadCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Chat messages with WhatsApp integration
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderId: int("senderId").notNull(),
  content: text("content"),
  mediaUrl: varchar("mediaUrl", { length: 500 }),
  mediaKey: varchar("mediaKey", { length: 500 }),
  messageType: mysqlEnum("messageType", ["text", "image", "video", "audio", "document"]).default("text").notNull(),
  source: mysqlEnum("source", ["platform", "whatsapp"]).default("platform").notNull(), // message origin
  whatsappMessageId: varchar("whatsappMessageId", { length: 200 }), // for sync with WhatsApp
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  pets: many(petTutors),
  logsCreated: many(dailyLogs),
  documentsUploaded: many(documents),
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
  pet: one(pets, { fields: [petTutors.petId], references: [pets.id] }),
  tutor: one(users, { fields: [petTutors.tutorId], references: [users.id] }),
}));
