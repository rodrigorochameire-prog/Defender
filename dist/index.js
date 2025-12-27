var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/const.ts
var COOKIE_NAME, ONE_YEAR_MS, AXIOS_TIMEOUT_MS, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG;
var init_const = __esm({
  "shared/const.ts"() {
    "use strict";
    COOKIE_NAME = "app_session_id";
    ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
    AXIOS_TIMEOUT_MS = 3e4;
    UNAUTHED_ERR_MSG = "Please login (10001)";
    NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// server/_core/notification.ts
var notification_exports = {};
__export(notification_exports, {
  notifyOwner: () => notifyOwner
});
import { TRPCError } from "@trpc/server";
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}
var TITLE_MAX_LENGTH, CONTENT_MAX_LENGTH, trimValue, isNonEmptyString, buildEndpointUrl, validatePayload;
var init_notification = __esm({
  "server/_core/notification.ts"() {
    "use strict";
    init_env();
    TITLE_MAX_LENGTH = 1200;
    CONTENT_MAX_LENGTH = 2e4;
    trimValue = (value) => value.trim();
    isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
    buildEndpointUrl = (baseUrl) => {
      const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      return new URL(
        "webdevtoken.v1.WebDevService/SendNotification",
        normalizedBase
      ).toString();
    };
    validatePayload = (input) => {
      if (!isNonEmptyString(input.title)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification title is required."
        });
      }
      if (!isNonEmptyString(input.content)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification content is required."
        });
      }
      const title = trimValue(input.title);
      const content = trimValue(input.content);
      if (title.length > TITLE_MAX_LENGTH) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
        });
      }
      if (content.length > CONTENT_MAX_LENGTH) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
        });
      }
      return { title, content };
    };
  }
});

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminInvites: () => adminInvites,
  adminLogs: () => adminLogs,
  auditLogs: () => auditLogs,
  behaviorRecords: () => behaviorRecords,
  bookingRequests: () => bookingRequests,
  bookings: () => bookings,
  calendarEvents: () => calendarEvents,
  changeHistory: () => changeHistory,
  chatMessages: () => chatMessages,
  conversations: () => conversations,
  creditPackages: () => creditPackages,
  customPricingPlans: () => customPricingPlans,
  dailyLogs: () => dailyLogs,
  daycareCredits: () => daycareCredits,
  daycareUsage: () => daycareUsage,
  dewormingTreatments: () => dewormingTreatments,
  documents: () => documents,
  emailVerificationTokens: () => emailVerificationTokens,
  eventTypes: () => eventTypes,
  fleaTreatments: () => fleaTreatments,
  foodMovements: () => foodMovements,
  foodStock: () => foodStock,
  healthBehaviorLogs: () => healthBehaviorLogs,
  medicationAutoScheduleRules: () => medicationAutoScheduleRules,
  medicationLibrary: () => medicationLibrary,
  notificationTemplates: () => notificationTemplates,
  notifications: () => notifications,
  passwordResetTokens: () => passwordResetTokens,
  payments: () => payments,
  petFoodStock: () => petFoodStock,
  petMedications: () => petMedications,
  petPhotos: () => petPhotos,
  petTutors: () => petTutors,
  petTutorsRelations: () => petTutorsRelations,
  petVaccinations: () => petVaccinations,
  pets: () => pets,
  petsRelations: () => petsRelations,
  photoComments: () => photoComments,
  photoReactions: () => photoReactions,
  preventiveLibrary: () => preventiveLibrary,
  reviews: () => reviews,
  servicePrices: () => servicePrices,
  subscriptionPlans: () => subscriptionPlans,
  subscriptions: () => subscriptions,
  trainingProgress: () => trainingProgress,
  transactions: () => transactions,
  tutorNotificationPreferences: () => tutorNotificationPreferences,
  users: () => users,
  usersRelations: () => usersRelations,
  vaccineLibrary: () => vaccineLibrary,
  wallComments: () => wallComments,
  wallPosts: () => wallPosts,
  wallReactions: () => wallReactions,
  whatsappAutomations: () => whatsappAutomations,
  whatsappConfig: () => whatsappConfig,
  whatsappConversations: () => whatsappConversations,
  whatsappGroupMembers: () => whatsappGroupMembers,
  whatsappGroups: () => whatsappGroups,
  whatsappMessages: () => whatsappMessages,
  whatsappTemplates: () => whatsappTemplates
});
import { integer, pgTable, text, timestamp, varchar, boolean, jsonb, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
var users, passwordResetTokens, emailVerificationTokens, pets, petTutors, creditPackages, daycareCredits, daycareUsage, vaccineLibrary, petVaccinations, medicationLibrary, preventiveLibrary, petMedications, dailyLogs, calendarEvents, documents, petPhotos, photoComments, photoReactions, notifications, transactions, subscriptionPlans, subscriptions, fleaTreatments, dewormingTreatments, behaviorRecords, trainingProgress, bookings, adminInvites, changeHistory, adminLogs, payments, reviews, whatsappConfig, whatsappTemplates, whatsappConversations, whatsappMessages, whatsappGroups, whatsappGroupMembers, whatsappAutomations, bookingRequests, servicePrices, customPricingPlans, foodStock, foodMovements, auditLogs, notificationTemplates, tutorNotificationPreferences, healthBehaviorLogs, eventTypes, petFoodStock, medicationAutoScheduleRules, wallPosts, wallComments, wallReactions, conversations, chatMessages, usersRelations, petsRelations, petTutorsRelations;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      // Note: Column names must match the actual database column names
      // If your DB has camelCase columns (with quotes), use: varchar("openId", ...)
      // If your DB has snake_case columns, use: varchar("open_id", ...)
      openId: varchar("openId", { length: 64 }).unique(),
      // Try camelCase first (with quotes in DB)
      authId: varchar("auth_id", { length: 255 }).unique(),
      // This one is definitely snake_case
      name: text("name"),
      email: varchar("email", { length: 320 }).unique(),
      passwordHash: varchar("passwordHash", { length: 255 }),
      // Try camelCase first
      loginMethod: varchar("loginMethod", { length: 64 }).default("email").notNull(),
      // Try camelCase first
      emailVerified: boolean("emailVerified").default(false).notNull(),
      // Try camelCase first
      role: varchar("role", { length: 20 }).default("user").notNull(),
      phone: varchar("phone", { length: 20 }),
      stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      // Try camelCase first
      updatedAt: timestamp("updatedAt").defaultNow().notNull(),
      // Try camelCase first
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
      // Try camelCase first
    });
    passwordResetTokens = pgTable("password_reset_tokens", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      token: varchar("token", { length: 255 }).unique().notNull(),
      expiresAt: timestamp("expiresAt").notNull(),
      used: boolean("used").default(false).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    emailVerificationTokens = pgTable("email_verification_tokens", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      token: varchar("token", { length: 255 }).unique().notNull(),
      expiresAt: timestamp("expiresAt").notNull(),
      used: boolean("used").default(false).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    pets = pgTable("pets", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      breed: varchar("breed", { length: 100 }),
      age: varchar("age", { length: 50 }),
      // e.g., "2a 3m"
      weight: integer("weight"),
      // weight in grams (e.g., 32500 for 32.5kg)
      birthDate: timestamp("birthDate"),
      photoUrl: text("photoUrl"),
      photoKey: text("photoKey"),
      // S3 key for photo
      status: varchar("status", { length: 100 }).default("checked-out").notNull(),
      approvalStatus: varchar("approvalStatus", { length: 100 }).default("pending").notNull(),
      checkInTime: timestamp("checkInTime"),
      checkOutTime: timestamp("checkOutTime"),
      foodBrand: varchar("foodBrand", { length: 200 }),
      foodAmount: integer("foodAmount"),
      // daily food amount in grams
      credits: integer("credits").default(0).notNull(),
      // daycare credits
      notes: text("notes"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    petTutors = pgTable("pet_tutors", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      tutorId: integer("tutorId").notNull(),
      isPrimary: boolean("isPrimary").default(false).notNull(),
      // primary contact
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    creditPackages = pgTable("credit_packages", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      description: text("description"),
      credits: integer("credits").notNull(),
      // number of credits
      priceInCents: integer("priceInCents").notNull(),
      discountPercent: integer("discountPercent").default(0).notNull(),
      isActive: boolean("isActive").default(true).notNull(),
      displayOrder: integer("displayOrder").default(0).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    daycareCredits = pgTable("daycare_credits", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      packageDays: integer("packageDays").notNull(),
      // number of days purchased
      packagePrice: integer("packagePrice").notNull(),
      // price in cents
      remainingDays: integer("remainingDays").notNull(),
      purchaseDate: timestamp("purchaseDate").defaultNow().notNull(),
      expiryDate: timestamp("expiryDate"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    daycareUsage = pgTable("daycare_usage", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      usageDate: timestamp("usageDate").notNull(),
      checkInTime: timestamp("checkInTime"),
      checkOutTime: timestamp("checkOutTime"),
      creditId: integer("creditId"),
      // which credit package was used
      amountCents: integer("amountCents"),
      // valor da estadia em centavos
      paymentStatus: varchar("paymentStatus", { length: 100 }).default("pending").notNull(),
      paidAt: timestamp("paidAt"),
      notes: text("notes"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    vaccineLibrary = pgTable("vaccine_library", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 200 }).notNull(),
      description: text("description"),
      intervalDays: integer("intervalDays"),
      // recommended interval between doses
      dosesRequired: integer("dosesRequired").default(1),
      // number of doses needed
      isCommon: boolean("isCommon").default(true).notNull(),
      // pre-defined vs custom
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    petVaccinations = pgTable("pet_vaccinations", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      vaccineId: integer("vaccineId").notNull(),
      // reference to vaccine_library
      applicationDate: timestamp("applicationDate").notNull(),
      nextDueDate: timestamp("nextDueDate"),
      doseNumber: integer("doseNumber").default(1),
      // which dose (1, 2, 3...)
      veterinarian: varchar("veterinarian", { length: 200 }),
      clinic: varchar("clinic", { length: 200 }),
      batchNumber: varchar("batchNumber", { length: 100 }),
      notes: text("notes"),
      documentUrl: text("documentUrl"),
      // S3 url for vaccine certificate
      documentKey: text("documentKey"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    medicationLibrary = pgTable("medication_library", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 200 }).notNull(),
      type: varchar("type", { length: 100 }).notNull(),
      // Changed from enum to varchar to allow custom types
      description: text("description"),
      commonDosage: varchar("commonDosage", { length: 200 }),
      isCommon: boolean("isCommon").default(true).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    preventiveLibrary = pgTable("preventive_library", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 200 }).notNull(),
      type: varchar("type", { length: 100 }).notNull(),
      manufacturer: varchar("manufacturer", { length: 200 }),
      intervalDays: integer("intervalDays"),
      // recommended interval in days
      notes: text("notes"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    petMedications = pgTable("pet_medications", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      medicationId: integer("medicationId").notNull(),
      startDate: timestamp("startDate").notNull(),
      endDate: timestamp("endDate"),
      dosage: varchar("dosage", { length: 200 }).notNull(),
      frequency: varchar("frequency", { length: 100 }),
      // e.g., "12h", "8h", "daily"
      // Advanced periodicity fields
      periodicity: varchar("periodicity", { length: 100 }).default("daily"),
      customInterval: integer("customInterval"),
      // interval in days for custom periodicity
      weekDays: text("weekDays"),
      // JSON array of week days [0-6] for weekly periodicity
      monthDays: text("monthDays"),
      // JSON array of month days [1-31] for monthly periodicity
      autoSchedule: boolean("autoSchedule").default(false).notNull(),
      // enable auto-scheduling
      // Dosage progression fields
      dosageProgression: varchar("dosageProgression", { length: 100 }).default("stable"),
      progressionRate: varchar("progressionRate", { length: 50 }),
      // e.g., "10%", "5mg"
      progressionInterval: integer("progressionInterval"),
      // adjust every X doses
      targetDosage: varchar("targetDosage", { length: 200 }),
      // target dosage to reach
      currentDoseCount: integer("currentDoseCount").default(0).notNull(),
      // track dose number for progression
      administrationTimes: text("administrationTimes"),
      // JSON array of times in HH:MM format
      isActive: boolean("isActive").default(true).notNull(),
      notes: text("notes"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    dailyLogs = pgTable("daily_logs", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      logDate: timestamp("logDate").notNull(),
      source: varchar("source", { length: 100 }).notNull(),
      mood: varchar("mood", { length: 100 }),
      stool: varchar("stool", { length: 100 }),
      appetite: varchar("appetite", { length: 100 }),
      behavior: text("behavior"),
      behaviorNotes: text("behaviorNotes"),
      activities: text("activities"),
      // JSON array of activities
      foodConsumed: varchar("foodConsumed", { length: 50 }),
      // "all", "half", "little", "none"
      feedingTime: varchar("feedingTime", { length: 10 }),
      // HH:MM format
      feedingAmount: varchar("feedingAmount", { length: 100 }),
      // e.g., "200g", "1 xícara"
      feedingAcceptance: varchar("feedingAcceptance", { length: 100 }),
      weight: integer("weight"),
      // weight in grams at time of log
      notes: text("notes"),
      createdById: integer("createdById").notNull(),
      // user who created the log
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    calendarEvents = pgTable("calendar_events", {
      id: serial("id").primaryKey(),
      title: varchar("title", { length: 200 }).notNull(),
      description: text("description"),
      eventDate: timestamp("eventDate").notNull(),
      endDate: timestamp("endDate"),
      // For events with duration
      eventType: varchar("eventType", { length: 100 }).notNull(),
      customEventTypeId: integer("customEventTypeId"),
      // Reference to eventTypes table for custom types
      customColor: varchar("customColor", { length: 20 }),
      // Hex color for custom events
      petId: integer("petId"),
      // null for general events
      location: varchar("location", { length: 200 }),
      isAllDay: boolean("isAllDay").default(true).notNull(),
      // Multi-day stay period fields (for checkin events)
      checkInDate: timestamp("checkInDate"),
      // Start date of stay
      checkOutDate: timestamp("checkOutDate"),
      // End date of stay
      dailyCount: integer("dailyCount"),
      // Number of days (calculated)
      // Attached media and logs
      photoUrls: jsonb("photoUrls").$type(),
      // Array of photo URLs
      photoKeys: jsonb("photoKeys").$type(),
      // Array of S3 keys
      logIds: jsonb("logIds").$type(),
      // Array of dailyLogs IDs
      // Resource linking for automatic integration
      linkedResourceType: varchar("linkedResourceType", { length: 100 }),
      linkedResourceId: integer("linkedResourceId"),
      // ID of the linked resource
      autoCreated: boolean("autoCreated").default(false).notNull(),
      // Indica se foi criado automaticamente
      reminderSent: boolean("reminderSent").default(false).notNull(),
      createdById: integer("createdById").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    documents = pgTable("documents", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      title: varchar("title", { length: 200 }).notNull(),
      category: varchar("category", { length: 100 }).notNull(),
      fileUrl: text("fileUrl").notNull(),
      fileKey: text("fileKey").notNull(),
      fileName: varchar("fileName", { length: 255 }),
      mimeType: varchar("mimeType", { length: 100 }),
      fileSize: integer("fileSize"),
      // in bytes
      description: text("description"),
      uploadedById: integer("uploadedById").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    petPhotos = pgTable("pet_photos", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      photoUrl: text("photoUrl").notNull(),
      photoKey: text("photoKey").notNull(),
      // S3 key
      caption: text("caption"),
      takenAt: timestamp("takenAt").notNull(),
      uploadedById: integer("uploadedById").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    photoComments = pgTable("photo_comments", {
      id: serial("id").primaryKey(),
      photoId: integer("photoId").notNull(),
      userId: integer("userId").notNull(),
      comment: text("comment").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    photoReactions = pgTable("photo_reactions", {
      id: serial("id").primaryKey(),
      photoId: integer("photoId").notNull(),
      userId: integer("userId").notNull(),
      reactionType: varchar("reactionType", { length: 100 }).notNull().default("like"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    notifications = pgTable("notifications", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      petId: integer("petId"),
      type: varchar("type", { length: 100 }).notNull(),
      title: varchar("title", { length: 200 }).notNull(),
      message: text("message").notNull(),
      resourceType: varchar("resource_type", { length: 100 }),
      resourceId: integer("resourceId"),
      isRead: boolean("isRead").default(false).notNull(),
      isSent: boolean("isSent").default(false).notNull(),
      sentAt: timestamp("sentAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    transactions = pgTable("transactions", {
      id: serial("id").primaryKey(),
      petId: integer("petId"),
      type: varchar("type", { length: 100 }).notNull(),
      category: varchar("category", { length: 100 }).notNull(),
      description: varchar("description", { length: 500 }).notNull(),
      amount: integer("amount").notNull(),
      // in cents
      transactionDate: timestamp("transactionDate").defaultNow().notNull(),
      createdById: integer("createdById").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    subscriptionPlans = pgTable("subscriptionPlans", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      description: text("description"),
      price: integer("price").notNull(),
      // in cents
      credits: integer("credits").notNull(),
      // number of daycare credits included
      validityDays: integer("validityDays").notNull(),
      // plan duration in days (e.g., 30 for monthly)
      benefits: text("benefits"),
      // JSON string of benefits
      isActive: boolean("isActive").default(true).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    subscriptions = pgTable("subscriptions", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      planId: integer("planId").notNull(),
      status: varchar("status", { length: 100 }).default("active").notNull(),
      startDate: timestamp("startDate").defaultNow().notNull(),
      endDate: timestamp("endDate").notNull(),
      autoRenew: boolean("autoRenew").default(true).notNull(),
      lastRenewalDate: timestamp("lastRenewalDate"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    fleaTreatments = pgTable("fleaTreatments", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      productName: varchar("productName", { length: 200 }).notNull(),
      applicationDate: timestamp("applicationDate").notNull(),
      nextDueDate: timestamp("nextDueDate").notNull(),
      notes: text("notes"),
      createdById: integer("createdById").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    dewormingTreatments = pgTable("dewormingTreatments", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      productName: varchar("productName", { length: 200 }).notNull(),
      applicationDate: timestamp("applicationDate").notNull(),
      nextDueDate: timestamp("nextDueDate").notNull(),
      notes: text("notes"),
      createdById: integer("createdById").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    behaviorRecords = pgTable("behaviorRecords", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      date: timestamp("date").notNull(),
      location: varchar("location", { length: 50 }).notNull(),
      // creche, casa, passeio, veterinario
      behaviorType: varchar("behaviorType", { length: 100 }).notNull(),
      description: text("description").notNull(),
      tags: text("tags"),
      // JSON array: ["agressividade", "ansiedade", "socializacao"]
      severity: varchar("severity", { length: 20 }),
      // leve, moderado, grave
      createdById: integer("createdById").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    trainingProgress = pgTable("trainingProgress", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      skill: varchar("skill", { length: 100 }).notNull(),
      // sentar, deitar, vir, ficar, etc
      startDate: timestamp("startDate").notNull(),
      currentLevel: integer("currentLevel").notNull().default(0),
      // 0-100
      notes: text("notes"),
      createdById: integer("createdById").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    bookings = pgTable("bookings", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      tutorId: integer("tutorId").notNull(),
      bookingDate: timestamp("bookingDate").notNull(),
      serviceType: varchar("serviceType", { length: 100 }).notNull().default("creche"),
      // creche = day care, diaria = overnight
      status: varchar("status", { length: 100 }).notNull().default("pending"),
      numberOfDays: integer("numberOfDays").notNull().default(1),
      notes: text("notes"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    adminInvites = pgTable("admin_invites", {
      id: serial("id").primaryKey(),
      email: varchar("email", { length: 320 }).notNull(),
      token: varchar("token", { length: 64 }).notNull().unique(),
      invitedBy: integer("invited_by").notNull(),
      // admin user ID who sent the invite
      status: varchar("status", { length: 100 }).default("pending").notNull(),
      expiresAt: timestamp("expires_at").notNull(),
      acceptedAt: timestamp("accepted_at"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    changeHistory = pgTable("change_history", {
      id: serial("id").primaryKey(),
      resourceType: varchar("resource_type", { length: 100 }).notNull(),
      resourceId: integer("resource_id").notNull(),
      petId: integer("pet_id").notNull(),
      fieldName: varchar("field_name", { length: 100 }).notNull(),
      oldValue: text("old_value"),
      newValue: text("new_value"),
      changedBy: integer("changed_by").notNull(),
      // user ID
      changedByRole: varchar("changed_by_role", { length: 100 }).notNull(),
      changeType: varchar("change_type", { length: 100 }).notNull(),
      ipAddress: varchar("ip_address", { length: 45 }),
      userAgent: text("user_agent"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    adminLogs = pgTable("admin_logs", {
      id: serial("id").primaryKey(),
      adminId: integer("admin_id").notNull(),
      // admin who performed the action
      action: varchar("action", { length: 100 }).notNull(),
      // e.g., "promote_admin", "delete_user"
      targetType: varchar("target_type", { length: 50 }),
      // e.g., "user", "pet", "booking"
      targetId: integer("target_id"),
      // ID of the affected entity
      details: text("details"),
      // JSON string with additional details
      ipAddress: varchar("ip_address", { length: 45 }),
      userAgent: text("user_agent"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    payments = pgTable("payments", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }).notNull(),
      stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
      amount: integer("amount").notNull(),
      // amount in cents
      currency: varchar("currency", { length: 3 }).default("brl").notNull(),
      status: varchar("status", { length: 50 }).notNull(),
      // succeeded, failed, pending
      productType: varchar("product_type", { length: 50 }).notNull(),
      // plan, credits
      productKey: varchar("product_key", { length: 100 }),
      // PLAN_BASIC, CREDITS_10, etc
      creditsAdded: integer("credits_added"),
      // credits added to user account
      metadata: text("metadata"),
      // JSON string for additional data
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    reviews = pgTable("reviews", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      tutorId: integer("tutorId").notNull(),
      rating: integer("rating").notNull(),
      // 1-5 stars
      comment: text("comment"),
      visitDate: timestamp("visitDate").notNull(),
      response: text("response"),
      // Admin response
      respondedAt: timestamp("respondedAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    whatsappConfig = pgTable("whatsappConfig", {
      id: serial("id").primaryKey(),
      apiKey: text("apiKey"),
      phoneNumberId: varchar("phoneNumberId", { length: 100 }),
      businessAccountId: varchar("businessAccountId", { length: 100 }),
      webhookSecret: text("webhookSecret"),
      isActive: boolean("isActive").default(false).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    whatsappTemplates = pgTable("whatsappTemplates", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 100 }).notNull().unique(),
      category: varchar("category", { length: 100 }).notNull(),
      content: text("content").notNull(),
      variables: jsonb("variables"),
      // Array of variable names like ["petName", "date"]
      status: varchar("status", { length: 100 }).default("active").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    whatsappConversations = pgTable("whatsappConversations", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      // tutor who initiated conversation
      petId: integer("petId"),
      // optional: conversation about specific pet
      phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
      status: varchar("status", { length: 100 }).default("active").notNull(),
      lastMessageAt: timestamp("lastMessageAt"),
      lastMessageContent: text("lastMessageContent"),
      unreadCount: integer("unreadCount").default(0).notNull(),
      // unread messages for admin
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    whatsappMessages = pgTable("whatsappMessages", {
      conversationId: integer("conversationId"),
      // link to conversation
      id: serial("id").primaryKey(),
      templateId: integer("templateId"),
      recipientPhone: varchar("recipientPhone", { length: 20 }).notNull(),
      recipientName: varchar("recipientName", { length: 200 }),
      messageContent: text("messageContent").notNull(),
      mediaUrl: text("mediaUrl"),
      // For photos/documents
      status: varchar("status", { length: 100 }).default("queued").notNull(),
      whatsappMessageId: varchar("whatsappMessageId", { length: 100 }),
      sentAt: timestamp("sentAt"),
      deliveredAt: timestamp("deliveredAt"),
      readAt: timestamp("readAt"),
      errorMessage: text("errorMessage"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    whatsappGroups = pgTable("whatsappGroups", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      groupName: varchar("groupName", { length: 200 }).notNull(),
      whatsappGroupId: varchar("whatsappGroupId", { length: 100 }),
      inviteLink: text("inviteLink"),
      isActive: boolean("isActive").default(true).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    whatsappGroupMembers = pgTable("whatsappGroupMembers", {
      id: serial("id").primaryKey(),
      groupId: integer("groupId").notNull(),
      userId: integer("userId"),
      phone: varchar("phone", { length: 20 }).notNull(),
      name: varchar("name", { length: 200 }),
      addedAt: timestamp("addedAt").defaultNow().notNull(),
      removedAt: timestamp("removedAt")
    });
    whatsappAutomations = pgTable("whatsappAutomations", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 200 }).notNull(),
      triggerType: varchar("triggerType", { length: 100 }).notNull(),
      templateId: integer("templateId").notNull(),
      enabled: boolean("enabled").default(true).notNull(),
      config: jsonb("config"),
      // Additional configuration like time of day, filters
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    bookingRequests = pgTable("booking_requests", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      tutorId: varchar("tutorId", { length: 64 }).notNull(),
      // openId from users
      requestedDates: jsonb("requestedDates").$type().notNull(),
      // Array of dates in YYYY-MM-DD format
      status: varchar("status", { length: 100 }).default("pending").notNull(),
      notes: text("notes"),
      adminNotes: text("adminNotes"),
      // Admin notes when approving/rejecting
      approvedBy: varchar("approvedBy", { length: 64 }),
      // openId of admin who approved/rejected
      approvedAt: timestamp("approvedAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    servicePrices = pgTable("service_prices", {
      id: serial("id").primaryKey(),
      serviceType: varchar("serviceType", { length: 100 }).notNull().unique(),
      priceInCents: integer("priceInCents").notNull(),
      // creche: 6000 (R$ 60), diaria: 8000 (R$ 80)
      description: text("description"),
      isActive: boolean("isActive").default(true).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    customPricingPlans = pgTable("custom_pricing_plans", {
      id: serial("id").primaryKey(),
      tutorId: integer("tutorId").notNull(),
      // user id
      planName: varchar("planName", { length: 200 }).notNull(),
      description: text("description"),
      crechePrice: integer("crechePrice"),
      // custom price for creche in cents (null = use standard)
      diariaPrice: integer("diariaPrice"),
      // custom price for diaria in cents (null = use standard)
      discountPercent: integer("discountPercent").default(0).notNull(),
      isActive: boolean("isActive").default(true).notNull(),
      validFrom: timestamp("validFrom"),
      validUntil: timestamp("validUntil"),
      createdBy: integer("createdBy").notNull(),
      // admin who created
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    foodStock = pgTable("food_stock", {
      id: serial("id").primaryKey(),
      currentStockKg: integer("currentStockKg").default(0).notNull(),
      // in grams (e.g., 20000 for 20kg)
      lastUpdated: timestamp("lastUpdated").defaultNow().notNull()
    });
    foodMovements = pgTable("food_movements", {
      id: serial("id").primaryKey(),
      type: varchar("type", { length: 100 }).notNull(),
      amountKg: integer("amountKg").notNull(),
      // in grams (positive for purchase, negative for consumption)
      notes: text("notes"),
      createdBy: integer("createdBy"),
      // admin who recorded (null for automatic consumption)
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    auditLogs = pgTable("audit_logs", {
      id: serial("id").primaryKey(),
      userId: integer("userId"),
      // null for unauthenticated attempts
      action: varchar("action", { length: 255 }).notNull(),
      // e.g., "pets.approve", "pets.updateMine"
      resource: varchar("resource", { length: 255 }),
      // e.g., "pet:123"
      success: boolean("success").notNull(),
      errorCode: varchar("errorCode", { length: 50 }),
      // e.g., "FORBIDDEN", "UNAUTHORIZED"
      ipAddress: varchar("ipAddress", { length: 45 }),
      // IPv4 or IPv6
      userAgent: text("userAgent"),
      timestamp: timestamp("timestamp").defaultNow().notNull()
    });
    notificationTemplates = pgTable("notification_templates", {
      id: serial("id").primaryKey(),
      type: varchar("type", { length: 100 }).notNull().unique(),
      title: varchar("title", { length: 255 }).notNull(),
      message: text("message").notNull(),
      availableVariables: text("availableVariables"),
      // JSON array of available variables like {{petName}}, {{date}}
      isActive: boolean("isActive").default(true).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    tutorNotificationPreferences = pgTable("tutor_notification_preferences", {
      id: serial("id").primaryKey(),
      tutorId: integer("tutorId").notNull(),
      notificationType: varchar("notificationType", { length: 100 }).notNull(),
      enabled: boolean("enabled").default(true).notNull(),
      adminOverride: boolean("adminOverride").default(false).notNull(),
      // if true, admin has disabled for this tutor
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    healthBehaviorLogs = pgTable("health_behavior_logs", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      recordedBy: integer("recordedBy").notNull(),
      // user ID who made the record
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
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    eventTypes = pgTable("event_types", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      color: varchar("color", { length: 20 }).notNull(),
      // Hex color code
      icon: varchar("icon", { length: 50 }),
      // Icon name from lucide-react
      isActive: boolean("isActive").default(true).notNull(),
      createdById: integer("createdById").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    petFoodStock = pgTable("pet_food_stock", {
      id: serial("id").primaryKey(),
      petId: integer("petId").notNull(),
      brandName: varchar("brandName", { length: 200 }).notNull(),
      currentStock: integer("currentStock").notNull(),
      // current stock in grams
      dailyConsumption: integer("dailyConsumption").notNull(),
      // average daily consumption in grams
      alertThresholdDays: integer("alertThresholdDays").default(15).notNull(),
      // alert X days before running out
      lastPurchaseDate: timestamp("lastPurchaseDate"),
      lastPurchaseAmount: integer("lastPurchaseAmount"),
      // amount purchased in grams
      notes: text("notes"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    medicationAutoScheduleRules = pgTable("medication_auto_schedule_rules", {
      id: serial("id").primaryKey(),
      medicationId: integer("medicationId").notNull(),
      // references medications.id
      intervalDays: integer("intervalDays").notNull(),
      // days to add for next dose
      intervalType: varchar("intervalType", { length: 100 }).default("days").notNull(),
      intervalValue: integer("intervalValue").notNull(),
      // numeric value (e.g., 35 for days, 1 for year)
      isActive: boolean("isActive").default(true).notNull(),
      notes: text("notes"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    wallPosts = pgTable("wall_posts", {
      id: serial("id").primaryKey(),
      petId: integer("petId"),
      // optional: post can be about a specific pet or general
      authorId: integer("authorId").notNull(),
      content: text("content"),
      mediaUrls: jsonb("mediaUrls").$type(),
      // array of photo/video URLs
      mediaKeys: jsonb("mediaKeys").$type(),
      // array of S3 keys
      postType: varchar("postType", { length: 100 }).default("text").notNull(),
      targetType: varchar("targetType", { length: 100 }).default("general").notNull(),
      // post visibility
      targetId: integer("targetId"),
      // ID of tutor or pet if targeted
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    wallComments = pgTable("wall_comments", {
      id: serial("id").primaryKey(),
      postId: integer("postId").notNull(),
      authorId: integer("authorId").notNull(),
      comment: text("comment").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    wallReactions = pgTable("wall_reactions", {
      id: serial("id").primaryKey(),
      postId: integer("postId").notNull(),
      userId: integer("userId").notNull(),
      reactionType: varchar("reactionType", { length: 100 }).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    conversations = pgTable("conversations", {
      id: serial("id").primaryKey(),
      petId: integer("petId"),
      // optional: conversation can be about a specific pet
      participants: jsonb("participants").$type().notNull(),
      // array of user IDs
      lastMessageAt: timestamp("lastMessageAt"),
      unreadCount: integer("unreadCount").default(0).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    chatMessages = pgTable("chat_messages", {
      id: serial("id").primaryKey(),
      conversationId: integer("conversationId").notNull(),
      senderId: integer("senderId").notNull(),
      content: text("content"),
      mediaUrl: varchar("mediaUrl", { length: 500 }),
      mediaKey: varchar("mediaKey", { length: 500 }),
      messageType: varchar("messageType", { length: 100 }).default("text").notNull(),
      source: varchar("source", { length: 100 }).default("platform").notNull(),
      // message origin
      whatsappMessageId: varchar("whatsappMessageId", { length: 200 }),
      // for sync with WhatsApp
      isRead: boolean("isRead").default(false).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    usersRelations = relations(users, ({ many }) => ({
      pets: many(petTutors),
      logsCreated: many(dailyLogs),
      documentsUploaded: many(documents),
      notifications: many(notifications)
    }));
    petsRelations = relations(pets, ({ many }) => ({
      tutors: many(petTutors),
      credits: many(daycareCredits),
      usageHistory: many(daycareUsage),
      vaccinations: many(petVaccinations),
      medications: many(petMedications),
      logs: many(dailyLogs),
      events: many(calendarEvents),
      documents: many(documents),
      transactions: many(transactions)
    }));
    petTutorsRelations = relations(petTutors, ({ one }) => ({
      pet: one(pets, { fields: [petTutors.petId], references: [pets.id] }),
      tutor: one(users, { fields: [petTutors.tutorId], references: [users.id] })
    }));
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  addCalendarEvent: () => addCalendarEvent,
  addChatMessage: () => addChatMessage,
  addDailyLog: () => addDailyLog,
  addDaycareCredit: () => addDaycareCredit,
  addDaycareUsage: () => addDaycareUsage,
  addDocument: () => addDocument,
  addMedicationToLibrary: () => addMedicationToLibrary,
  addPetMedication: () => addPetMedication,
  addPetPhoto: () => addPetPhoto,
  addPetTutor: () => addPetTutor,
  addPetVaccination: () => addPetVaccination,
  addPhotoComment: () => addPhotoComment,
  addPhotoReaction: () => addPhotoReaction,
  addPreventiveToLibrary: () => addPreventiveToLibrary,
  addReviewResponse: () => addReviewResponse,
  addTransaction: () => addTransaction,
  addVaccineToLibrary: () => addVaccineToLibrary,
  addWallComment: () => addWallComment,
  addWallReaction: () => addWallReaction,
  addWhatsAppGroupMember: () => addWhatsAppGroupMember,
  autoCreateDewormingEvent: () => autoCreateDewormingEvent,
  autoCreateFleaEvent: () => autoCreateFleaEvent,
  autoCreateHealthLogEvent: () => autoCreateHealthLogEvent,
  autoCreateMedicationEvent: () => autoCreateMedicationEvent,
  autoCreateMedicationPeriod: () => autoCreateMedicationPeriod,
  autoCreateVaccineEvent: () => autoCreateVaccineEvent,
  calculateRestockDate: () => calculateRestockDate,
  calculateStockDuration: () => calculateStockDuration,
  cancelSubscription: () => cancelSubscription,
  consumeCredit: () => consumeCredit,
  createAdminInvite: () => createAdminInvite,
  createAuditLog: () => createAuditLog,
  createAutoScheduleRule: () => createAutoScheduleRule,
  createBehaviorRecord: () => createBehaviorRecord,
  createBooking: () => createBooking,
  createConversation: () => createConversation,
  createCreditPackage: () => createCreditPackage,
  createDewormingTreatment: () => createDewormingTreatment,
  createEventType: () => createEventType,
  createFleaTreatment: () => createFleaTreatment,
  createHealthBehaviorLog: () => createHealthBehaviorLog,
  createNotification: () => createNotification,
  createNotificationTemplate: () => createNotificationTemplate,
  createPackage: () => createPackage,
  createPet: () => createPet,
  createPetFoodStock: () => createPetFoodStock,
  createReview: () => createReview,
  createSubscription: () => createSubscription,
  createSubscriptionPlan: () => createSubscriptionPlan,
  createTrainingProgress: () => createTrainingProgress,
  createTutorNotificationPreference: () => createTutorNotificationPreference,
  createWallPost: () => createWallPost,
  createWhatsAppAutomation: () => createWhatsAppAutomation,
  createWhatsAppGroup: () => createWhatsAppGroup,
  createWhatsAppTemplate: () => createWhatsAppTemplate,
  deleteAutoScheduleRule: () => deleteAutoScheduleRule,
  deleteBehaviorRecord: () => deleteBehaviorRecord,
  deleteBooking: () => deleteBooking,
  deleteCalendarEvent: () => deleteCalendarEvent,
  deleteCreditPackage: () => deleteCreditPackage,
  deleteDailyLog: () => deleteDailyLog,
  deleteDewormingTreatment: () => deleteDewormingTreatment,
  deleteDocument: () => deleteDocument,
  deleteEventType: () => deleteEventType,
  deleteFleaTreatment: () => deleteFleaTreatment,
  deleteHealthBehaviorLog: () => deleteHealthBehaviorLog,
  deleteNotificationTemplate: () => deleteNotificationTemplate,
  deletePet: () => deletePet,
  deletePetMedication: () => deletePetMedication,
  deletePetPhoto: () => deletePetPhoto,
  deletePetVaccination: () => deletePetVaccination,
  deletePhotoComment: () => deletePhotoComment,
  deleteSubscriptionPlan: () => deleteSubscriptionPlan,
  deleteTrainingProgress: () => deleteTrainingProgress,
  deleteTutorNotificationPreference: () => deleteTutorNotificationPreference,
  deleteUser: () => deleteUser,
  deleteWallComment: () => deleteWallComment,
  deleteWallPost: () => deleteWallPost,
  deleteWhatsAppAutomation: () => deleteWhatsAppAutomation,
  deleteWhatsAppTemplate: () => deleteWhatsAppTemplate,
  getActiveMedications: () => getActiveMedications,
  getActiveMedicationsCount: () => getActiveMedicationsCount,
  getActivePackages: () => getActivePackages,
  getAdminInviteByToken: () => getAdminInviteByToken,
  getAllActiveMedications: () => getAllActiveMedications,
  getAllActiveSubscriptions: () => getAllActiveSubscriptions,
  getAllAutoScheduleRules: () => getAllAutoScheduleRules,
  getAllAutoScheduleRulesIncludingInactive: () => getAllAutoScheduleRulesIncludingInactive,
  getAllCalendarEvents: () => getAllCalendarEvents,
  getAllCreditPackages: () => getAllCreditPackages,
  getAllCreditPackagesIncludingInactive: () => getAllCreditPackagesIncludingInactive,
  getAllDocuments: () => getAllDocuments,
  getAllEventTypes: () => getAllEventTypes,
  getAllEventTypesIncludingInactive: () => getAllEventTypesIncludingInactive,
  getAllLogs: () => getAllLogs,
  getAllLowStockPets: () => getAllLowStockPets,
  getAllNotificationTemplates: () => getAllNotificationTemplates,
  getAllPayments: () => getAllPayments,
  getAllPets: () => getAllPets,
  getAllTransactions: () => getAllTransactions,
  getAllTutorPreferences: () => getAllTutorPreferences,
  getAllTutors: () => getAllTutors,
  getAllUpcomingHealthReminders: () => getAllUpcomingHealthReminders,
  getAllUsers: () => getAllUsers,
  getAuditLogs: () => getAuditLogs,
  getAutoScheduleRuleById: () => getAutoScheduleRuleById,
  getAutoScheduleRuleByMedicationId: () => getAutoScheduleRuleByMedicationId,
  getAverageRating: () => getAverageRating,
  getBookingById: () => getBookingById,
  getBookingsByDateRange: () => getBookingsByDateRange,
  getCalendarEvents: () => getCalendarEvents,
  getChatMessages: () => getChatMessages,
  getConversationById: () => getConversationById,
  getConversations: () => getConversations,
  getCreditConsumption: () => getCreditConsumption,
  getCreditPackageById: () => getCreditPackageById,
  getDailyOccupancy: () => getDailyOccupancy,
  getDayEvents: () => getDayEvents,
  getDb: () => getDb,
  getDewormingTreatmentsByPetId: () => getDewormingTreatmentsByPetId,
  getDocumentsByCategory: () => getDocumentsByCategory,
  getEndingMedicationReminders: () => getEndingMedicationReminders,
  getEventTypeById: () => getEventTypeById,
  getFailedAccessAttempts: () => getFailedAccessAttempts,
  getFinancialSummary: () => getFinancialSummary,
  getFleaTreatmentsByPetId: () => getFleaTreatmentsByPetId,
  getFrequencyStats: () => getFrequencyStats,
  getHealthBehaviorLogById: () => getHealthBehaviorLogById,
  getHealthBehaviorLogsByPet: () => getHealthBehaviorLogsByPet,
  getHealthBehaviorStats: () => getHealthBehaviorStats,
  getHealthCalendarEvents: () => getHealthCalendarEvents,
  getHealthDashboardStats: () => getHealthDashboardStats,
  getLogsByDate: () => getLogsByDate,
  getMedicationLibrary: () => getMedicationLibrary,
  getMoodHistory: () => getMoodHistory,
  getNotificationTemplateByType: () => getNotificationTemplateByType,
  getOverdueTreatments: () => getOverdueTreatments,
  getPackageById: () => getPackageById,
  getPaymentsByUserId: () => getPaymentsByUserId,
  getPendingNotifications: () => getPendingNotifications,
  getPetById: () => getPetById,
  getPetCompleteHealthHistory: () => getPetCompleteHealthHistory,
  getPetCredits: () => getPetCredits,
  getPetDewormingHistory: () => getPetDewormingHistory,
  getPetDocuments: () => getPetDocuments,
  getPetEvents: () => getPetEvents,
  getPetFleaTreatmentHistory: () => getPetFleaTreatmentHistory,
  getPetFoodStock: () => getPetFoodStock,
  getPetLogs: () => getPetLogs,
  getPetMedicationHistory: () => getPetMedicationHistory,
  getPetMedications: () => getPetMedications,
  getPetPhotos: () => getPetPhotos,
  getPetTransactions: () => getPetTransactions,
  getPetTutors: () => getPetTutors,
  getPetTutorsWithDetails: () => getPetTutorsWithDetails,
  getPetUsageHistory: () => getPetUsageHistory,
  getPetVaccinationHistory: () => getPetVaccinationHistory,
  getPetVaccinations: () => getPetVaccinations,
  getPetsByApprovalStatus: () => getPetsByApprovalStatus,
  getPetsByStatus: () => getPetsByStatus,
  getPetsByTutor: () => getPetsByTutor,
  getPetsByTutorId: () => getPetsByTutorId,
  getPetsWithLowCredits: () => getPetsWithLowCredits,
  getPetsWithTutors: () => getPetsWithTutors,
  getPhotoById: () => getPhotoById,
  getPhotoComments: () => getPhotoComments,
  getPhotoReactionCounts: () => getPhotoReactionCounts,
  getPhotoReactions: () => getPhotoReactions,
  getPreventiveLibrary: () => getPreventiveLibrary,
  getPreventivesThisMonth: () => getPreventivesThisMonth,
  getRecentHealthBehaviorLogs: () => getRecentHealthBehaviorLogs,
  getSubscriptionMetrics: () => getSubscriptionMetrics,
  getSubscriptionPlanById: () => getSubscriptionPlanById,
  getSubscriptionsByPlan: () => getSubscriptionsByPlan,
  getTotalCredits: () => getTotalCredits,
  getTransactionsByDateRange: () => getTransactionsByDateRange,
  getTutorById: () => getTutorById,
  getTutorNotificationPreferences: () => getTutorNotificationPreferences,
  getTutorPreferenceByType: () => getTutorPreferenceByType,
  getTutorReminderHistory: () => getTutorReminderHistory,
  getTutorsByPet: () => getTutorsByPet,
  getTutorsWithPets: () => getTutorsWithPets,
  getUnreadNotificationCount: () => getUnreadNotificationCount,
  getUpcomingDewormingReminders: () => getUpcomingDewormingReminders,
  getUpcomingFleaTreatmentReminders: () => getUpcomingFleaTreatmentReminders,
  getUpcomingVaccinationReminders: () => getUpcomingVaccinationReminders,
  getUpcomingVaccinations: () => getUpcomingVaccinations,
  getUserActiveSubscription: () => getUserActiveSubscription,
  getUserByAuthId: () => getUserByAuthId,
  getUserByEmail: () => getUserByEmail,
  getUserById: () => getUserById,
  getUserByOpenId: () => getUserByOpenId,
  getUserNotifications: () => getUserNotifications,
  getUserSubscriptionHistory: () => getUserSubscriptionHistory,
  getUsersByRole: () => getUsersByRole,
  getVaccinationStatistics: () => getVaccinationStatistics,
  getVaccineLibrary: () => getVaccineLibrary,
  getVaccinesDueSoon: () => getVaccinesDueSoon,
  getWallComments: () => getWallComments,
  getWallPostById: () => getWallPostById,
  getWallPosts: () => getWallPosts,
  getWallReactionCounts: () => getWallReactionCounts,
  getWallReactions: () => getWallReactions,
  getWeightHistory: () => getWeightHistory,
  getWhatsAppAutomations: () => getWhatsAppAutomations,
  getWhatsAppConfig: () => getWhatsAppConfig,
  getWhatsAppConversation: () => getWhatsAppConversation,
  getWhatsAppConversations: () => getWhatsAppConversations,
  getWhatsAppGroups: () => getWhatsAppGroups,
  getWhatsAppMessageHistory: () => getWhatsAppMessageHistory,
  getWhatsAppStats: () => getWhatsAppStats,
  getWhatsAppTemplates: () => getWhatsAppTemplates,
  linkPetToTutor: () => linkPetToTutor,
  listAllUsers: () => listAllUsers,
  listBehaviorRecords: () => listBehaviorRecords,
  listBookings: () => listBookings,
  listPendingAdminInvites: () => listPendingAdminInvites,
  listReviews: () => listReviews,
  listSubscriptionPlans: () => listSubscriptionPlans,
  listTrainingProgress: () => listTrainingProgress,
  markAllNotificationsAsRead: () => markAllNotificationsAsRead,
  markMessagesAsRead: () => markMessagesAsRead,
  markNotificationAsRead: () => markNotificationAsRead,
  markWhatsAppConversationAsRead: () => markWhatsAppConversationAsRead,
  removePetTutor: () => removePetTutor,
  removePhotoReaction: () => removePhotoReaction,
  removeWallReaction: () => removeWallReaction,
  removeWhatsAppGroupMember: () => removeWhatsAppGroupMember,
  setPrimaryTutor: () => setPrimaryTutor,
  shouldSendNotification: () => shouldSendNotification,
  unlinkPetFromTutor: () => unlinkPetFromTutor,
  updateAdminInviteStatus: () => updateAdminInviteStatus,
  updateAutoScheduleRule: () => updateAutoScheduleRule,
  updateBookingStatus: () => updateBookingStatus,
  updateCalendarEvent: () => updateCalendarEvent,
  updateCreditPackage: () => updateCreditPackage,
  updateDailyLog: () => updateDailyLog,
  updateDewormingTreatment: () => updateDewormingTreatment,
  updateDocument: () => updateDocument,
  updateEventType: () => updateEventType,
  updateFleaTreatment: () => updateFleaTreatment,
  updateNotificationTemplate: () => updateNotificationTemplate,
  updatePackage: () => updatePackage,
  updatePet: () => updatePet,
  updatePetCredits: () => updatePetCredits,
  updatePetFoodStock: () => updatePetFoodStock,
  updatePetMedication: () => updatePetMedication,
  updatePetVaccination: () => updatePetVaccination,
  updateSubscription: () => updateSubscription,
  updateSubscriptionPlan: () => updateSubscriptionPlan,
  updateTrainingProgress: () => updateTrainingProgress,
  updateTutor: () => updateTutor,
  updateTutorNotificationPreference: () => updateTutorNotificationPreference,
  updateUser: () => updateUser,
  updateUserRole: () => updateUserRole,
  updateWhatsAppAutomation: () => updateWhatsAppAutomation,
  updateWhatsAppConfig: () => updateWhatsAppConfig,
  updateWhatsAppConversationStatus: () => updateWhatsAppConversationStatus,
  updateWhatsAppTemplate: () => updateWhatsAppTemplate,
  upsertUser: () => upsertUser,
  upsertUserFromSupabase: () => upsertUserFromSupabase
});
import { eq, and, desc, sql, gte, lte, lt, or, count, asc, not } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client3 = postgres(process.env.DATABASE_URL);
      _db = drizzle(client3);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId && !user.email) {
    throw new Error("Either openId or email is required for upsert");
  }
  const db2 = await getDb();
  if (!db2) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {};
    const updateSet = {};
    if (user.openId) {
      values.openId = user.openId;
    }
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? void 0;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db2.insert(users).values(values).onConflictDoUpdate({ target: users.authId, set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db2 = await getDb();
  if (!db2) return void 0;
  const result = await db2.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAllUsers() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(users).orderBy(desc(users.createdAt));
}
async function getUsersByRole(role) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(users).where(eq(users.role, role));
}
async function createPet(pet) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(pets).values(pet);
  return Number(result[0]?.insertId || 0);
}
async function updatePet(id, data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.update(pets).set(data).where(eq(pets.id, id));
}
async function deletePet(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.delete(pets).where(eq(pets.id, id));
}
async function getPetById(id) {
  const db2 = await getDb();
  if (!db2) return null;
  const result = await db2.select().from(pets).where(eq(pets.id, id)).limit(1);
  return result[0] || null;
}
async function getAllPets() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(pets).orderBy(desc(pets.createdAt));
}
async function getPetsByStatus(status) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(pets).where(eq(pets.status, status));
}
async function getPetsByApprovalStatus(approvalStatus) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(pets).where(eq(pets.approvalStatus, approvalStatus)).orderBy(desc(pets.createdAt));
}
async function getPetsByTutorId(tutorId) {
  const db2 = await getDb();
  if (!db2) return [];
  const result = await db2.select({ pet: pets }).from(petTutors).innerJoin(pets, eq(petTutors.petId, pets.id)).where(eq(petTutors.tutorId, tutorId));
  return result.map((r) => r.pet);
}
async function addPetTutor(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(petTutors).values(data);
  return Number(result[0]?.insertId || 0);
}
async function removePetTutor(petId, tutorId) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.delete(petTutors).where(and(eq(petTutors.petId, petId), eq(petTutors.tutorId, tutorId)));
}
async function getPetTutors(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  const result = await db2.select({ tutor: users, isPrimary: petTutors.isPrimary }).from(petTutors).innerJoin(users, eq(petTutors.tutorId, users.id)).where(eq(petTutors.petId, petId));
  return result;
}
async function getPetTutorsWithDetails(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  const result = await db2.select({
    id: users.id,
    name: users.name,
    email: users.email,
    isPrimary: petTutors.isPrimary,
    createdAt: petTutors.createdAt
  }).from(petTutors).innerJoin(users, eq(petTutors.tutorId, users.id)).where(eq(petTutors.petId, petId));
  return result;
}
async function getUserByEmail(email) {
  const db2 = await getDb();
  if (!db2) return null;
  try {
    const result = await db2.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.warn("[getUserByEmail] Drizzle query failed, trying raw SQL:", error.message);
    try {
      const rawResult = await db2.execute(sql`
        SELECT 
          id,
          open_id as "openId",
          auth_id as "authId",
          name,
          email,
          password_hash as "passwordHash",
          login_method as "loginMethod",
          email_verified as "emailVerified",
          role,
          phone,
          stripe_customer_id as "stripeCustomerId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          last_signed_in as "lastSignedIn"
        FROM users
        WHERE email = ${email.toLowerCase()}
        LIMIT 1
      `);
      return rawResult.rows[0] || null;
    } catch (rawError) {
      console.warn("[getUserByEmail] Snake_case failed, trying camelCase:", rawError.message);
      try {
        const camelResult = await db2.execute(sql`
          SELECT 
            id,
            "openId",
            auth_id as "authId",
            name,
            email,
            "passwordHash",
            "loginMethod",
            "emailVerified",
            role,
            phone,
            stripe_customer_id as "stripeCustomerId",
            "createdAt",
            "updatedAt",
            "lastSignedIn"
          FROM users
          WHERE email = ${email.toLowerCase()}
          LIMIT 1
        `);
        return camelResult.rows[0] || null;
      } catch (camelError) {
        console.error("[getUserByEmail] All query methods failed:", camelError.message);
        throw new Error(`Failed to query users table: ${camelError.message}`);
      }
    }
  }
}
async function getUserByAuthId(authId) {
  const db2 = await getDb();
  if (!db2) return null;
  const result = await db2.select().from(users).where(eq(users.authId, authId)).limit(1);
  return result[0] || null;
}
async function upsertUserFromSupabase(supabaseUser) {
  const db2 = await getDb();
  if (!db2) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const name = supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "User";
    const values = {
      authId: supabaseUser.id,
      email: supabaseUser.email || null,
      name,
      loginMethod: "email",
      emailVerified: true,
      lastSignedIn: /* @__PURE__ */ new Date()
    };
    const updateSet = {
      name,
      email: supabaseUser.email || null,
      emailVerified: true,
      lastSignedIn: /* @__PURE__ */ new Date()
    };
    await db2.insert(users).values(values).onConflictDoUpdate({ target: users.authId, set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user from Supabase:", error);
    throw error;
  }
}
async function setPrimaryTutor(petId, tutorId) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.update(petTutors).set({ isPrimary: false }).where(eq(petTutors.petId, petId));
  await db2.update(petTutors).set({ isPrimary: true }).where(and(eq(petTutors.petId, petId), eq(petTutors.tutorId, tutorId)));
}
async function getActivePackages() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(creditPackages).where(eq(creditPackages.isActive, true)).orderBy(creditPackages.displayOrder);
}
async function getPackageById(id) {
  const db2 = await getDb();
  if (!db2) return null;
  const result = await db2.select().from(creditPackages).where(eq(creditPackages.id, id)).limit(1);
  return result[0] || null;
}
async function createPackage(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(creditPackages).values(data);
  return Number(result[0]?.insertId || 0);
}
async function updatePackage(id, data) {
  const db2 = await getDb();
  if (!db2) return;
  await db2.update(creditPackages).set(data).where(eq(creditPackages.id, id));
}
async function addDaycareCredit(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(daycareCredits).values(data);
  return Number(result[0]?.insertId || 0);
}
async function getPetCredits(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(daycareCredits).where(eq(daycareCredits.petId, petId)).orderBy(desc(daycareCredits.purchaseDate));
}
async function getTotalCredits(petId) {
  const db2 = await getDb();
  if (!db2) return 0;
  const result = await db2.select({ total: sql`SUM(${daycareCredits.remainingDays})` }).from(daycareCredits).where(eq(daycareCredits.petId, petId));
  const total = result[0]?.total;
  return total ? Number(total) : 0;
}
async function consumeCredit(petId) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const credits = await db2.select().from(daycareCredits).where(and(eq(daycareCredits.petId, petId), sql`${daycareCredits.remainingDays} > 0`)).orderBy(daycareCredits.purchaseDate).limit(1);
  if (credits.length === 0) {
    throw new Error("No credits available");
  }
  const credit = credits[0];
  await db2.update(daycareCredits).set({ remainingDays: credit.remainingDays - 1 }).where(eq(daycareCredits.id, credit.id));
  return credit.id;
}
async function addDaycareUsage(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(daycareUsage).values(data);
  return Number(result[0]?.insertId || 0);
}
async function getPetUsageHistory(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(daycareUsage).where(eq(daycareUsage.petId, petId)).orderBy(desc(daycareUsage.usageDate));
}
async function getVaccineLibrary() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(vaccineLibrary).orderBy(vaccineLibrary.name);
}
async function addVaccineToLibrary(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(vaccineLibrary).values({ ...data, isCommon: false });
  return Number(result[0]?.insertId || 0);
}
async function addPetVaccination(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(petVaccinations).values(data);
  return Number(result[0]?.insertId || 0);
}
async function getPetVaccinations(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  const result = await db2.select({
    vaccination: petVaccinations,
    vaccine: vaccineLibrary
  }).from(petVaccinations).innerJoin(vaccineLibrary, eq(petVaccinations.vaccineId, vaccineLibrary.id)).where(eq(petVaccinations.petId, petId)).orderBy(desc(petVaccinations.applicationDate));
  return result;
}
async function getUpcomingVaccinations(daysAhead = 30) {
  const db2 = await getDb();
  if (!db2) return [];
  const today = /* @__PURE__ */ new Date();
  const futureDate = /* @__PURE__ */ new Date();
  futureDate.setDate(today.getDate() + daysAhead);
  return await db2.select({
    vaccination: petVaccinations,
    vaccine: vaccineLibrary,
    pet: pets
  }).from(petVaccinations).innerJoin(vaccineLibrary, eq(petVaccinations.vaccineId, vaccineLibrary.id)).innerJoin(pets, eq(petVaccinations.petId, pets.id)).where(and(
    sql`${petVaccinations.nextDueDate} IS NOT NULL`,
    gte(petVaccinations.nextDueDate, today),
    lte(petVaccinations.nextDueDate, futureDate)
  )).orderBy(petVaccinations.nextDueDate);
}
async function updatePetVaccination(id, data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const updates = {};
  if (data.nextDueDate !== void 0) updates.nextDueDate = data.nextDueDate;
  if (data.veterinarian !== void 0) updates.veterinarian = data.veterinarian;
  if (data.clinic !== void 0) updates.clinic = data.clinic;
  if (data.notes !== void 0) updates.notes = data.notes;
  await db2.update(petVaccinations).set(updates).where(eq(petVaccinations.id, id));
}
async function deletePetVaccination(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.delete(petVaccinations).where(eq(petVaccinations.id, id));
}
async function getMedicationLibrary() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(medicationLibrary).orderBy(medicationLibrary.type, medicationLibrary.name);
}
async function addMedicationToLibrary(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(medicationLibrary).values({ ...data, isCommon: false });
  return Number(result[0]?.insertId || 0);
}
async function addPetMedication(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(petMedications).values(data);
  return Number(result[0]?.insertId || 0);
}
async function updatePetMedication(id, data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.update(petMedications).set(data).where(eq(petMedications.id, id));
}
async function deletePetMedication(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.delete(petMedications).where(eq(petMedications.id, id));
}
async function getPetMedications(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  const result = await db2.select({
    medication: petMedications,
    medicationInfo: medicationLibrary
  }).from(petMedications).innerJoin(medicationLibrary, eq(petMedications.medicationId, medicationLibrary.id)).where(eq(petMedications.petId, petId)).orderBy(desc(petMedications.startDate));
  return result;
}
async function getActiveMedications(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  const result = await db2.select({
    medication: petMedications,
    medicationInfo: medicationLibrary
  }).from(petMedications).innerJoin(medicationLibrary, eq(petMedications.medicationId, medicationLibrary.id)).where(and(eq(petMedications.petId, petId), eq(petMedications.isActive, true))).orderBy(desc(petMedications.startDate));
  return result;
}
async function getAllActiveMedications() {
  const db2 = await getDb();
  if (!db2) return [];
  const result = await db2.select({
    medication: petMedications,
    medicationInfo: medicationLibrary,
    pet: pets
  }).from(petMedications).innerJoin(medicationLibrary, eq(petMedications.medicationId, medicationLibrary.id)).innerJoin(pets, eq(petMedications.petId, pets.id)).where(eq(petMedications.isActive, true)).orderBy(desc(petMedications.startDate));
  return result;
}
async function addDailyLog(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(dailyLogs).values(data);
  return Number(result[0]?.insertId || 0);
}
async function getPetLogs(petId, startDate, endDate) {
  const db2 = await getDb();
  if (!db2) return [];
  if (startDate && endDate) {
    return await db2.select().from(dailyLogs).where(and(
      eq(dailyLogs.petId, petId),
      gte(dailyLogs.logDate, startDate),
      lte(dailyLogs.logDate, endDate)
    )).orderBy(desc(dailyLogs.logDate));
  }
  return await db2.select().from(dailyLogs).where(eq(dailyLogs.petId, petId)).orderBy(desc(dailyLogs.logDate));
}
async function updateDailyLog(id, data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.update(dailyLogs).set(data).where(eq(dailyLogs.id, id));
}
async function deleteDailyLog(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.delete(dailyLogs).where(eq(dailyLogs.id, id));
}
async function getLogsByDate(date2) {
  const db2 = await getDb();
  if (!db2) return [];
  const startOfDay = new Date(date2);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date2);
  endOfDay.setHours(23, 59, 59, 999);
  return await db2.select().from(dailyLogs).where(
    and(
      gte(dailyLogs.logDate, startOfDay),
      lte(dailyLogs.logDate, endOfDay)
    )
  ).orderBy(desc(dailyLogs.logDate));
}
async function getAllTransactions() {
  const db2 = await getDb();
  if (!db2) return [];
  const result = await db2.select({
    id: transactions.id,
    petId: transactions.petId,
    type: transactions.type,
    category: transactions.category,
    description: transactions.description,
    amount: transactions.amount,
    transactionDate: transactions.transactionDate,
    createdById: transactions.createdById,
    createdAt: transactions.createdAt,
    petName: pets.name
  }).from(transactions).leftJoin(pets, eq(transactions.petId, pets.id)).orderBy(desc(transactions.transactionDate));
  return result.map((r) => ({
    ...r,
    amount: r.amount / 100
    // Convert from cents to reais
  }));
}
async function updatePetCredits(petId, amount) {
  const db2 = await getDb();
  if (!db2) return;
  const pet = await db2.select().from(pets).where(eq(pets.id, petId)).limit(1);
  if (pet.length === 0) throw new Error("Pet not found");
  const currentCredits = pet[0]?.credits || 0;
  const newCredits = currentCredits + amount;
  await db2.update(pets).set({ credits: newCredits }).where(eq(pets.id, petId));
}
async function getAllLogs() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(dailyLogs).orderBy(desc(dailyLogs.logDate)).limit(100);
}
async function addCalendarEvent(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(calendarEvents).values(data);
  return Number(result[0]?.insertId || 0);
}
async function updateCalendarEvent(id, data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.update(calendarEvents).set(data).where(eq(calendarEvents.id, id));
}
async function deleteCalendarEvent(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.delete(calendarEvents).where(eq(calendarEvents.id, id));
}
async function getCalendarEvents(startDate, endDate) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(calendarEvents).where(and(gte(calendarEvents.eventDate, startDate), lte(calendarEvents.eventDate, endDate))).orderBy(calendarEvents.eventDate);
}
async function getPetEvents(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(calendarEvents).where(eq(calendarEvents.petId, petId)).orderBy(calendarEvents.eventDate);
}
async function addDocument(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(documents).values(data);
  return Number(result[0]?.insertId || 0);
}
async function updateDocument(id, data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const updateData = {};
  if (data.title !== void 0) updateData.title = data.title;
  if (data.description !== void 0) updateData.description = data.description;
  await db2.update(documents).set(updateData).where(eq(documents.id, id));
}
async function deleteDocument(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.delete(documents).where(eq(documents.id, id));
}
async function getPetDocuments(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(documents).where(eq(documents.petId, petId)).orderBy(desc(documents.createdAt));
}
async function getDocumentsByCategory(petId, category) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(documents).where(and(eq(documents.petId, petId), eq(documents.category, category))).orderBy(desc(documents.createdAt));
}
async function getAllDocuments(petId, category) {
  const db2 = await getDb();
  if (!db2) return [];
  let query = db2.select({
    id: documents.id,
    petId: documents.petId,
    petName: pets.name,
    title: documents.title,
    category: documents.category,
    fileUrl: documents.fileUrl,
    fileKey: documents.fileKey,
    fileName: documents.fileName,
    mimeType: documents.mimeType,
    fileSize: documents.fileSize,
    uploadedById: documents.uploadedById,
    createdAt: documents.createdAt
  }).from(documents).leftJoin(pets, eq(documents.petId, pets.id));
  const conditions = [];
  if (petId) conditions.push(eq(documents.petId, petId));
  if (category) conditions.push(eq(documents.category, category));
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  return await query.orderBy(desc(documents.createdAt));
}
async function createNotification(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(notifications).values(data);
  return Number(result[0]?.insertId || 0);
}
async function getUserNotifications(userId) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
}
async function markNotificationAsRead(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}
async function markAllNotificationsAsRead(userId) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}
async function getUnreadNotificationCount(userId) {
  const db2 = await getDb();
  if (!db2) return 0;
  const result = await db2.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result.length;
}
async function getPendingNotifications() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(notifications).where(eq(notifications.isSent, false)).orderBy(notifications.createdAt);
}
async function addTransaction(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(transactions).values(data);
  return Number(result[0]?.insertId || 0);
}
async function getPetTransactions(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(transactions).where(eq(transactions.petId, petId)).orderBy(desc(transactions.transactionDate));
}
async function getTransactionsByDateRange(startDate, endDate) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(transactions).where(and(gte(transactions.transactionDate, startDate), lte(transactions.transactionDate, endDate))).orderBy(desc(transactions.transactionDate));
}
async function getFinancialSummary(startDate, endDate) {
  const db2 = await getDb();
  if (!db2) return { credits: 0, debits: 0, balance: 0 };
  const result = await db2.select({
    type: transactions.type,
    total: sql`SUM(${transactions.amount})`
  }).from(transactions).where(and(gte(transactions.transactionDate, startDate), lte(transactions.transactionDate, endDate))).groupBy(transactions.type);
  const credits = result.find((r) => r.type === "credit")?.total || 0;
  const debits = result.find((r) => r.type === "debit")?.total || 0;
  return {
    credits,
    debits,
    balance: credits - debits
  };
}
async function addPetPhoto(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(petPhotos).values(data);
  return result.insertId;
}
async function getPetPhotos(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(petPhotos).where(eq(petPhotos.petId, petId)).orderBy(desc(petPhotos.takenAt));
}
async function deletePetPhoto(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.delete(petPhotos).where(eq(petPhotos.id, id));
}
async function getPhotoById(id) {
  const db2 = await getDb();
  if (!db2) return null;
  const result = await db2.select().from(petPhotos).where(eq(petPhotos.id, id)).limit(1);
  return result[0] || null;
}
async function getPetsWithLowCredits(threshold = 5) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(pets).where(lte(pets.credits, threshold)).orderBy(pets.credits);
}
async function getVaccinesDueSoon(daysAhead = 30) {
  const db2 = await getDb();
  if (!db2) return [];
  const futureDate = /* @__PURE__ */ new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  return await db2.select({
    vaccination: petVaccinations,
    pet: pets,
    vaccine: vaccineLibrary
  }).from(petVaccinations).innerJoin(pets, eq(petVaccinations.petId, pets.id)).innerJoin(vaccineLibrary, eq(petVaccinations.vaccineId, vaccineLibrary.id)).where(
    and(
      lte(petVaccinations.nextDueDate, futureDate),
      gte(petVaccinations.nextDueDate, /* @__PURE__ */ new Date())
    )
  ).orderBy(petVaccinations.nextDueDate);
}
async function createSubscriptionPlan(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const [plan] = await db2.insert(subscriptionPlans).values(data);
  return plan;
}
async function updateSubscriptionPlan(id, data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id));
}
async function listSubscriptionPlans(activeOnly = false) {
  const db2 = await getDb();
  if (!db2) return [];
  if (activeOnly) {
    return db2.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  }
  return db2.select().from(subscriptionPlans);
}
async function getSubscriptionPlanById(id) {
  const db2 = await getDb();
  if (!db2) return null;
  const [plan] = await db2.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  return plan;
}
async function deleteSubscriptionPlan(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
}
async function createSubscription(data) {
  const db2 = await getDb();
  const [subscription] = await db2.insert(subscriptions).values(data);
  return subscription;
}
async function getUserActiveSubscription(userId) {
  const db2 = await getDb();
  const [subscription] = await db2.select().from(subscriptions).where(
    and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.status, "active")
    )
  ).limit(1);
  return subscription;
}
async function getUserSubscriptionHistory(userId) {
  const db2 = await getDb();
  return db2.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt));
}
async function updateSubscription(id, data) {
  const db2 = await getDb();
  await db2.update(subscriptions).set(data).where(eq(subscriptions.id, id));
}
async function cancelSubscription(id) {
  const db2 = await getDb();
  await db2.update(subscriptions).set({ status: "cancelled", autoRenew: false }).where(eq(subscriptions.id, id));
}
async function getSubscriptionsByPlan(planId) {
  const db2 = await getDb();
  return db2.select().from(subscriptions).where(
    and(
      eq(subscriptions.planId, planId),
      eq(subscriptions.status, "active")
    )
  );
}
async function getAllActiveSubscriptions() {
  const db2 = await getDb();
  return db2.select().from(subscriptions).where(eq(subscriptions.status, "active"));
}
async function getSubscriptionMetrics() {
  const activeSubscriptions = await getAllActiveSubscriptions();
  let mrr = 0;
  for (const sub of activeSubscriptions) {
    const plan = await getSubscriptionPlanById(sub.planId);
    if (plan) {
      const monthlyPrice = plan.price * 30 / plan.validityDays;
      mrr += monthlyPrice;
    }
  }
  const planCounts = {};
  for (const sub of activeSubscriptions) {
    planCounts[sub.planId] = (planCounts[sub.planId] || 0) + 1;
  }
  return {
    totalActiveSubscriptions: activeSubscriptions.length,
    mrr: Math.round(mrr),
    planDistribution: planCounts
  };
}
async function createFleaTreatment(data) {
  const db2 = await getDb();
  const [result] = await db2.insert(fleaTreatments).values(data);
  return result;
}
async function getFleaTreatmentsByPetId(petId) {
  const db2 = await getDb();
  return db2.select().from(fleaTreatments).where(eq(fleaTreatments.petId, petId)).orderBy(desc(fleaTreatments.applicationDate));
}
async function updateFleaTreatment(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const updateData = {};
  if (data.applicationDate) updateData.applicationDate = new Date(data.applicationDate);
  if (data.nextDueDate) updateData.nextDueDate = new Date(data.nextDueDate);
  if (data.notes !== void 0) updateData.notes = data.notes;
  await db2.update(fleaTreatments).set(updateData).where(eq(fleaTreatments.id, data.id));
}
async function deleteFleaTreatment(id) {
  const db2 = await getDb();
  await db2.delete(fleaTreatments).where(eq(fleaTreatments.id, id));
}
async function createDewormingTreatment(data) {
  const db2 = await getDb();
  const [result] = await db2.insert(dewormingTreatments).values(data);
  return result;
}
async function getDewormingTreatmentsByPetId(petId) {
  const db2 = await getDb();
  return db2.select().from(dewormingTreatments).where(eq(dewormingTreatments.petId, petId)).orderBy(desc(dewormingTreatments.applicationDate));
}
async function updateDewormingTreatment(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const updateData = {};
  if (data.applicationDate) updateData.applicationDate = new Date(data.applicationDate);
  if (data.nextDueDate) updateData.nextDueDate = new Date(data.nextDueDate);
  if (data.notes !== void 0) updateData.notes = data.notes;
  await db2.update(dewormingTreatments).set(updateData).where(eq(dewormingTreatments.id, data.id));
}
async function deleteDewormingTreatment(id) {
  const db2 = await getDb();
  await db2.delete(dewormingTreatments).where(eq(dewormingTreatments.id, id));
}
async function createBehaviorRecord(data) {
  const db2 = await getDb();
  await db2.insert(behaviorRecords).values(data);
  const [record] = await db2.select().from(behaviorRecords).where(eq(behaviorRecords.id, sql`LAST_INSERT_ID()`)).limit(1);
  return record;
}
async function listBehaviorRecords(petId) {
  const db2 = await getDb();
  if (petId) {
    return db2.select().from(behaviorRecords).where(eq(behaviorRecords.petId, petId)).orderBy(desc(behaviorRecords.date));
  }
  return db2.select().from(behaviorRecords).orderBy(desc(behaviorRecords.date));
}
async function deleteBehaviorRecord(id) {
  const db2 = await getDb();
  await db2.delete(behaviorRecords).where(eq(behaviorRecords.id, id));
}
async function createTrainingProgress(data) {
  const db2 = await getDb();
  await db2.insert(trainingProgress).values(data);
  const [progress] = await db2.select().from(trainingProgress).where(eq(trainingProgress.id, sql`LAST_INSERT_ID()`)).limit(1);
  return progress;
}
async function listTrainingProgress(petId) {
  const db2 = await getDb();
  if (petId) {
    return db2.select().from(trainingProgress).where(eq(trainingProgress.petId, petId)).orderBy(desc(trainingProgress.updatedAt));
  }
  return db2.select().from(trainingProgress).orderBy(desc(trainingProgress.updatedAt));
}
async function updateTrainingProgress(id, currentLevel, notes) {
  const db2 = await getDb();
  const updated = await db2.update(trainingProgress).set({ currentLevel, notes, updatedAt: /* @__PURE__ */ new Date() }).where(eq(trainingProgress.id, id));
  return updated;
}
async function deleteTrainingProgress(id) {
  const db2 = await getDb();
  await db2.delete(trainingProgress).where(eq(trainingProgress.id, id));
}
async function addPhotoComment(photoId, userId, comment) {
  const db2 = await getDb();
  await db2.insert(photoComments).values({ photoId, userId, comment });
  const [newComment] = await db2.select().from(photoComments).where(eq(photoComments.id, sql`LAST_INSERT_ID()`)).limit(1);
  return newComment;
}
async function getPhotoComments(photoId) {
  const db2 = await getDb();
  const comments = await db2.select({
    id: photoComments.id,
    photoId: photoComments.photoId,
    userId: photoComments.userId,
    comment: photoComments.comment,
    createdAt: photoComments.createdAt,
    user: {
      id: users.id,
      name: users.name
    }
  }).from(photoComments).leftJoin(users, eq(photoComments.userId, users.id)).where(eq(photoComments.photoId, photoId)).orderBy(desc(photoComments.createdAt));
  return comments;
}
async function deletePhotoComment(id) {
  const db2 = await getDb();
  await db2.delete(photoComments).where(eq(photoComments.id, id));
}
async function addPhotoReaction(photoId, userId, reactionType) {
  const db2 = await getDb();
  const existing = await db2.select().from(photoReactions).where(and(eq(photoReactions.photoId, photoId), eq(photoReactions.userId, userId))).limit(1);
  if (existing.length > 0) {
    await db2.update(photoReactions).set({ reactionType }).where(eq(photoReactions.id, existing[0].id));
    return existing[0];
  } else {
    await db2.insert(photoReactions).values({ photoId, userId, reactionType });
    const [newReaction] = await db2.select().from(photoReactions).where(eq(photoReactions.id, sql`LAST_INSERT_ID()`)).limit(1);
    return newReaction;
  }
}
async function removePhotoReaction(photoId, userId) {
  const db2 = await getDb();
  await db2.delete(photoReactions).where(and(eq(photoReactions.photoId, photoId), eq(photoReactions.userId, userId)));
}
async function getPhotoReactions(photoId) {
  const db2 = await getDb();
  return db2.select().from(photoReactions).where(eq(photoReactions.photoId, photoId));
}
async function getPhotoReactionCounts(photoId) {
  const db2 = await getDb();
  const reactions = await db2.select().from(photoReactions).where(eq(photoReactions.photoId, photoId));
  const counts = {
    like: 0,
    love: 0,
    laugh: 0,
    total: reactions.length
  };
  reactions.forEach((reaction) => {
    counts[reaction.reactionType]++;
  });
  return counts;
}
async function createBooking(data) {
  const db2 = await getDb();
  await db2.insert(bookings).values(data);
  const [booking] = await db2.select().from(bookings).where(eq(bookings.id, sql`LAST_INSERT_ID()`)).limit(1);
  return booking;
}
async function listBookings(filters) {
  const db2 = await getDb();
  let query = db2.select().from(bookings);
  if (filters?.petId) {
    query = query.where(eq(bookings.petId, filters.petId));
  }
  if (filters?.tutorId) {
    query = query.where(eq(bookings.tutorId, filters.tutorId));
  }
  if (filters?.status) {
    query = query.where(eq(bookings.status, filters.status));
  }
  return query.orderBy(desc(bookings.bookingDate));
}
async function getBookingById(id) {
  const db2 = await getDb();
  const [booking] = await db2.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return booking;
}
async function updateBookingStatus(id, status) {
  const db2 = await getDb();
  await db2.update(bookings).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(bookings.id, id));
}
async function deleteBooking(id) {
  const db2 = await getDb();
  await db2.delete(bookings).where(eq(bookings.id, id));
}
async function getBookingsByDateRange(startDate, endDate) {
  const db2 = await getDb();
  return db2.select().from(bookings).where(and(
    sql`${bookings.bookingDate} >= ${startDate}`,
    sql`${bookings.bookingDate} <= ${endDate}`
  )).orderBy(bookings.bookingDate);
}
async function createReview(data) {
  const db2 = await getDb();
  await db2.insert(reviews).values(data);
  const [review] = await db2.select().from(reviews).where(eq(reviews.id, sql`LAST_INSERT_ID()`)).limit(1);
  return review;
}
async function listReviews(filters) {
  const db2 = await getDb();
  let query = db2.select().from(reviews);
  if (filters?.petId) {
    query = query.where(eq(reviews.petId, filters.petId));
  }
  if (filters?.tutorId) {
    query = query.where(eq(reviews.tutorId, filters.tutorId));
  }
  if (filters?.minRating) {
    query = query.where(sql`${reviews.rating} >= ${filters.minRating}`);
  }
  return query.orderBy(desc(reviews.createdAt));
}
async function getAverageRating() {
  const db2 = await getDb();
  const result = await db2.select({ avg: sql`AVG(${reviews.rating})` }).from(reviews);
  return result[0]?.avg ? Number(result[0].avg) : 0;
}
async function addReviewResponse(reviewId, response) {
  const db2 = await getDb();
  await db2.update(reviews).set({ response, respondedAt: /* @__PURE__ */ new Date() }).where(eq(reviews.id, reviewId));
}
async function getWeightHistory(petId) {
  const db2 = await getDb();
  const logs = await db2.select({
    date: dailyLogs.logDate,
    weight: dailyLogs.weight
  }).from(dailyLogs).where(and(eq(dailyLogs.petId, petId), sql`${dailyLogs.weight} IS NOT NULL`)).orderBy(dailyLogs.logDate).limit(30);
  return logs;
}
async function getMoodHistory(petId) {
  const db2 = await getDb();
  const logs = await db2.select({
    date: dailyLogs.logDate,
    mood: dailyLogs.mood
  }).from(dailyLogs).where(and(eq(dailyLogs.petId, petId), sql`${dailyLogs.mood} IS NOT NULL`)).orderBy(dailyLogs.logDate).limit(30);
  return logs;
}
async function getFrequencyStats(petId) {
  const db2 = await getDb();
  const stats = await db2.select({
    month: sql`DATE_FORMAT(${daycareUsage.checkInTime}, '%Y-%m')`,
    frequency: sql`COUNT(*)`
  }).from(daycareUsage).where(and(
    eq(daycareUsage.petId, petId),
    sql`${daycareUsage.checkInTime} >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`
  )).groupBy(sql`DATE_FORMAT(${daycareUsage.checkInTime}, '%Y-%m')`).orderBy(sql`DATE_FORMAT(${daycareUsage.checkInTime}, '%Y-%m')`);
  return stats;
}
async function listAllUsers() {
  const db2 = await getDb();
  return db2.select().from(users).orderBy(users.createdAt);
}
async function getUserById(userId) {
  const db2 = await getDb();
  const result = await db2.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}
async function updateUser(userId, data) {
  const db2 = await getDb();
  await db2.update(users).set(data).where(eq(users.id, userId));
}
async function updateUserRole(userId, role) {
  const db2 = await getDb();
  await db2.update(users).set({ role }).where(eq(users.id, userId));
}
async function deleteUser(userId) {
  const db2 = await getDb();
  await db2.delete(users).where(eq(users.id, userId));
}
async function getPaymentsByUserId(userId) {
  const db2 = await getDb();
  return db2.select().from(payments).where(eq(payments.userId, userId)).orderBy(payments.createdAt);
}
async function createAdminInvite(data) {
  const db2 = await getDb();
  const [result] = await db2.insert(adminInvites).values(data);
  return result;
}
async function getAdminInviteByToken(token) {
  const db2 = await getDb();
  const [invite] = await db2.select().from(adminInvites).where(eq(adminInvites.token, token)).limit(1);
  return invite;
}
async function listPendingAdminInvites() {
  const db2 = await getDb();
  return db2.select().from(adminInvites).where(eq(adminInvites.status, "pending")).orderBy(adminInvites.createdAt);
}
async function updateAdminInviteStatus(token, status) {
  const db2 = await getDb();
  await db2.update(adminInvites).set({
    status,
    acceptedAt: status === "accepted" ? /* @__PURE__ */ new Date() : null
  }).where(eq(adminInvites.token, token));
}
async function getPreventiveLibrary() {
  const db2 = await getDb();
  if (!db2) return [];
  const result = await db2.select().from(preventiveLibrary).orderBy(preventiveLibrary.type, preventiveLibrary.name);
  return result;
}
async function addPreventiveToLibrary(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(preventiveLibrary).values(data);
  return result[0].insertId;
}
async function getWhatsAppConfig() {
  const db2 = await getDb();
  if (!db2) return null;
  const result = await db2.select().from(whatsappConfig).limit(1);
  return result[0] || null;
}
async function updateWhatsAppConfig(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const existing = await getWhatsAppConfig();
  if (existing) {
    await db2.update(whatsappConfig).set(data).where(eq(whatsappConfig.id, existing.id));
  } else {
    await db2.insert(whatsappConfig).values(data);
  }
}
async function getWhatsAppTemplates() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(whatsappTemplates).orderBy(whatsappTemplates.category, whatsappTemplates.name);
}
async function createWhatsAppTemplate(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(whatsappTemplates).values(data);
  return result[0].insertId;
}
async function updateWhatsAppTemplate(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const { id, ...updateData } = data;
  await db2.update(whatsappTemplates).set(updateData).where(eq(whatsappTemplates.id, id));
}
async function deleteWhatsAppTemplate(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.delete(whatsappTemplates).where(eq(whatsappTemplates.id, id));
}
async function getWhatsAppMessageHistory(limit = 50, status) {
  const db2 = await getDb();
  if (!db2) return [];
  if (status) {
    return await db2.select().from(whatsappMessages).where(eq(whatsappMessages.status, status)).orderBy(desc(whatsappMessages.createdAt)).limit(limit);
  }
  return await db2.select().from(whatsappMessages).orderBy(desc(whatsappMessages.createdAt)).limit(limit);
}
async function getWhatsAppGroups() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select({
    id: whatsappGroups.id,
    petId: whatsappGroups.petId,
    groupName: whatsappGroups.groupName,
    whatsappGroupId: whatsappGroups.whatsappGroupId,
    inviteLink: whatsappGroups.inviteLink,
    isActive: whatsappGroups.isActive,
    createdAt: whatsappGroups.createdAt,
    petName: pets.name
  }).from(whatsappGroups).leftJoin(pets, eq(whatsappGroups.petId, pets.id)).orderBy(whatsappGroups.createdAt);
}
async function createWhatsAppGroup(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(whatsappGroups).values(data);
  return result[0].insertId;
}
async function addWhatsAppGroupMember(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.insert(whatsappGroupMembers).values(data);
}
async function removeWhatsAppGroupMember(groupId, memberId) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.update(whatsappGroupMembers).set({ removedAt: /* @__PURE__ */ new Date() }).where(eq(whatsappGroupMembers.id, memberId));
}
async function getWhatsAppAutomations() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select({
    id: whatsappAutomations.id,
    name: whatsappAutomations.name,
    triggerType: whatsappAutomations.triggerType,
    templateId: whatsappAutomations.templateId,
    enabled: whatsappAutomations.enabled,
    config: whatsappAutomations.config,
    createdAt: whatsappAutomations.createdAt,
    templateName: whatsappTemplates.name
  }).from(whatsappAutomations).leftJoin(whatsappTemplates, eq(whatsappAutomations.templateId, whatsappTemplates.id)).orderBy(whatsappAutomations.name);
}
async function createWhatsAppAutomation(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(whatsappAutomations).values(data);
  return result[0].insertId;
}
async function updateWhatsAppAutomation(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const { id, ...updateData } = data;
  await db2.update(whatsappAutomations).set(updateData).where(eq(whatsappAutomations.id, id));
}
async function deleteWhatsAppAutomation(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.delete(whatsappAutomations).where(eq(whatsappAutomations.id, id));
}
async function getWhatsAppStats() {
  const db2 = await getDb();
  if (!db2) return {
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0
  };
  const messages = await db2.select().from(whatsappMessages);
  return {
    total: messages.length,
    sent: messages.filter((m) => m.status === "sent").length,
    delivered: messages.filter((m) => m.status === "delivered").length,
    read: messages.filter((m) => m.status === "read").length,
    failed: messages.filter((m) => m.status === "failed").length
  };
}
async function getWhatsAppConversations(status = "all") {
  const db2 = await getDb();
  if (!db2) return [];
  if (status === "all") {
    return await db2.select().from(whatsappConversations).orderBy(desc(whatsappConversations.lastMessageAt));
  }
  return await db2.select().from(whatsappConversations).where(eq(whatsappConversations.status, status)).orderBy(desc(whatsappConversations.lastMessageAt));
}
async function getWhatsAppConversation(id) {
  const db2 = await getDb();
  if (!db2) return null;
  const conversation = await db2.select().from(whatsappConversations).where(eq(whatsappConversations.id, id)).limit(1);
  return conversation[0] || null;
}
async function updateWhatsAppConversationStatus(id, status) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.update(whatsappConversations).set({ status }).where(eq(whatsappConversations.id, id));
}
async function markWhatsAppConversationAsRead(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.update(whatsappConversations).set({ unreadCount: 0 }).where(eq(whatsappConversations.id, id));
}
async function getAllPayments() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(payments).orderBy(desc(payments.createdAt));
}
async function getUpcomingVaccinationReminders(daysAhead = 7) {
  const db2 = await getDb();
  if (!db2) return [];
  const today = /* @__PURE__ */ new Date();
  const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1e3);
  const results = await db2.select({
    vaccinationId: petVaccinations.id,
    petId: pets.id,
    petName: pets.name,
    vaccineId: vaccineLibrary.id,
    vaccineName: vaccineLibrary.name,
    nextDueDate: petVaccinations.nextDueDate
  }).from(petVaccinations).innerJoin(pets, eq(petVaccinations.petId, pets.id)).innerJoin(vaccineLibrary, eq(petVaccinations.vaccineId, vaccineLibrary.id)).where(and(
    gte(petVaccinations.nextDueDate, today),
    lte(petVaccinations.nextDueDate, futureDate)
  )).orderBy(petVaccinations.nextDueDate);
  return results;
}
async function getEndingMedicationReminders(daysAhead = 7) {
  const db2 = await getDb();
  if (!db2) return [];
  const today = /* @__PURE__ */ new Date();
  const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1e3);
  const results = await db2.select({
    medicationId: petMedications.id,
    petId: pets.id,
    petName: pets.name,
    medicationLibraryId: medicationLibrary.id,
    medicationName: medicationLibrary.name,
    endDate: petMedications.endDate
  }).from(petMedications).innerJoin(pets, eq(petMedications.petId, pets.id)).innerJoin(medicationLibrary, eq(petMedications.medicationId, medicationLibrary.id)).where(and(
    gte(petMedications.endDate, today),
    lte(petMedications.endDate, futureDate)
  )).orderBy(petMedications.endDate);
  return results;
}
async function getUpcomingFleaTreatmentReminders(daysAhead = 7) {
  const db2 = await getDb();
  if (!db2) return [];
  const today = /* @__PURE__ */ new Date();
  const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1e3);
  const results = await db2.select({
    treatmentId: fleaTreatments.id,
    petId: pets.id,
    petName: pets.name,
    productName: fleaTreatments.productName,
    nextDueDate: fleaTreatments.nextDueDate
  }).from(fleaTreatments).innerJoin(pets, eq(fleaTreatments.petId, pets.id)).where(and(
    gte(fleaTreatments.nextDueDate, today),
    lte(fleaTreatments.nextDueDate, futureDate)
  )).orderBy(fleaTreatments.nextDueDate);
  return results;
}
async function getUpcomingDewormingReminders(daysAhead = 7) {
  const db2 = await getDb();
  if (!db2) return [];
  const today = /* @__PURE__ */ new Date();
  const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1e3);
  const results = await db2.select({
    treatmentId: dewormingTreatments.id,
    petId: pets.id,
    petName: pets.name,
    productName: dewormingTreatments.productName,
    nextDueDate: dewormingTreatments.nextDueDate
  }).from(dewormingTreatments).innerJoin(pets, eq(dewormingTreatments.petId, pets.id)).where(and(
    gte(dewormingTreatments.nextDueDate, today),
    lte(dewormingTreatments.nextDueDate, futureDate)
  )).orderBy(dewormingTreatments.nextDueDate);
  return results;
}
async function getAllUpcomingHealthReminders(daysAhead = 7) {
  const vaccinations = await getUpcomingVaccinationReminders(daysAhead);
  const medications = await getEndingMedicationReminders(daysAhead);
  const fleaTreatments2 = await getUpcomingFleaTreatmentReminders(daysAhead);
  const dewormingTreatments2 = await getUpcomingDewormingReminders(daysAhead);
  return {
    vaccinations,
    medications,
    fleaTreatments: fleaTreatments2,
    dewormingTreatments: dewormingTreatments2,
    total: vaccinations.length + medications.length + fleaTreatments2.length + dewormingTreatments2.length
  };
}
async function getVaccinationStatistics() {
  const db2 = await getDb();
  if (!db2) return { total: 0, upToDate: 0, overdue: 0, upcoming: 0, rate: 0 };
  const today = /* @__PURE__ */ new Date();
  const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1e3);
  const allPets = await db2.select().from(pets);
  const totalPets = allPets.length;
  if (totalPets === 0) return { total: 0, upToDate: 0, overdue: 0, upcoming: 0, rate: 0 };
  const allVaccinations = await db2.select({
    petId: petVaccinations.petId,
    nextDueDate: petVaccinations.nextDueDate
  }).from(petVaccinations);
  const petVaccinationStatus = /* @__PURE__ */ new Map();
  allVaccinations.forEach((v) => {
    const currentDate = petVaccinationStatus.get(v.petId);
    if (!currentDate || v.nextDueDate && v.nextDueDate > currentDate) {
      petVaccinationStatus.set(v.petId, v.nextDueDate);
    }
  });
  let upToDate = 0;
  let overdue = 0;
  let upcoming = 0;
  allPets.forEach((pet) => {
    const nextDue = petVaccinationStatus.get(pet.id);
    if (!nextDue) {
      overdue++;
    } else if (nextDue < today) {
      overdue++;
    } else if (nextDue <= futureDate) {
      upcoming++;
    } else {
      upToDate++;
    }
  });
  const rate = totalPets > 0 ? Math.round(upToDate / totalPets * 100) : 0;
  return {
    total: totalPets,
    upToDate,
    overdue,
    upcoming,
    rate
  };
}
async function getActiveMedicationsCount() {
  const db2 = await getDb();
  if (!db2) return { total: 0, byPet: [] };
  const today = /* @__PURE__ */ new Date();
  const activeMeds = await db2.select({
    petId: petMedications.petId,
    petName: pets.name,
    medicationName: medicationLibrary.name,
    endDate: petMedications.endDate
  }).from(petMedications).innerJoin(pets, eq(petMedications.petId, pets.id)).innerJoin(medicationLibrary, eq(petMedications.medicationId, medicationLibrary.id)).where(gte(petMedications.endDate, today));
  const byPet = activeMeds.reduce((acc, med) => {
    const existing = acc.find((p) => p.petId === med.petId);
    if (existing) {
      existing.count++;
      existing.medications.push(med.medicationName);
    } else {
      acc.push({
        petId: med.petId,
        petName: med.petName,
        count: 1,
        medications: [med.medicationName]
      });
    }
    return acc;
  }, []);
  return {
    total: activeMeds.length,
    byPet
  };
}
async function getPreventivesThisMonth() {
  const db2 = await getDb();
  if (!db2) return { flea: 0, deworming: 0, total: 0 };
  const now = /* @__PURE__ */ new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const fleaCount = await db2.select({ count: sql`count(*)` }).from(fleaTreatments).where(and(
    gte(fleaTreatments.applicationDate, startOfMonth),
    lte(fleaTreatments.applicationDate, endOfMonth)
  ));
  const dewormingCount = await db2.select({ count: sql`count(*)` }).from(dewormingTreatments).where(and(
    gte(dewormingTreatments.applicationDate, startOfMonth),
    lte(dewormingTreatments.applicationDate, endOfMonth)
  ));
  const flea = Number(fleaCount[0]?.count || 0);
  const deworming = Number(dewormingCount[0]?.count || 0);
  return {
    flea,
    deworming,
    total: flea + deworming
  };
}
async function getOverdueTreatments() {
  const db2 = await getDb();
  if (!db2) return [];
  const today = /* @__PURE__ */ new Date();
  const overdueVaccinations = await db2.select({
    type: sql`'vaccination'`,
    petId: pets.id,
    petName: pets.name,
    itemName: vaccineLibrary.name,
    dueDate: petVaccinations.nextDueDate
  }).from(petVaccinations).innerJoin(pets, eq(petVaccinations.petId, pets.id)).innerJoin(vaccineLibrary, eq(petVaccinations.vaccineId, vaccineLibrary.id)).where(lt(petVaccinations.nextDueDate, today)).orderBy(petVaccinations.nextDueDate);
  const overdueFlea = await db2.select({
    type: sql`'flea'`,
    petId: pets.id,
    petName: pets.name,
    itemName: fleaTreatments.productName,
    dueDate: fleaTreatments.nextDueDate
  }).from(fleaTreatments).innerJoin(pets, eq(fleaTreatments.petId, pets.id)).where(lt(fleaTreatments.nextDueDate, today)).orderBy(fleaTreatments.nextDueDate);
  const overdueDeworming = await db2.select({
    type: sql`'deworming'`,
    petId: pets.id,
    petName: pets.name,
    itemName: dewormingTreatments.productName,
    dueDate: dewormingTreatments.nextDueDate
  }).from(dewormingTreatments).innerJoin(pets, eq(dewormingTreatments.petId, pets.id)).where(lt(dewormingTreatments.nextDueDate, today)).orderBy(dewormingTreatments.nextDueDate);
  return [...overdueVaccinations, ...overdueFlea, ...overdueDeworming];
}
async function getHealthDashboardStats() {
  const vaccination = await getVaccinationStatistics();
  const medications = await getActiveMedicationsCount();
  const preventives = await getPreventivesThisMonth();
  const overdue = await getOverdueTreatments();
  return {
    vaccination,
    medications,
    preventives,
    overdue
  };
}
async function getPetVaccinationHistory(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  const history = await db2.select({
    id: petVaccinations.id,
    vaccineId: petVaccinations.vaccineId,
    vaccineName: vaccineLibrary.name,
    vaccineDescription: vaccineLibrary.description,
    applicationDate: petVaccinations.applicationDate,
    nextDueDate: petVaccinations.nextDueDate,
    batchNumber: petVaccinations.batchNumber,
    veterinarian: petVaccinations.veterinarian,
    notes: petVaccinations.notes
  }).from(petVaccinations).innerJoin(vaccineLibrary, eq(petVaccinations.vaccineId, vaccineLibrary.id)).where(eq(petVaccinations.petId, petId)).orderBy(desc(petVaccinations.applicationDate));
  return history;
}
async function getPetMedicationHistory(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  const history = await db2.select({
    id: petMedications.id,
    medicationId: petMedications.medicationId,
    medicationName: medicationLibrary.name,
    medicationType: medicationLibrary.type,
    startDate: petMedications.startDate,
    endDate: petMedications.endDate,
    dosage: petMedications.dosage,
    frequency: petMedications.frequency,
    notes: petMedications.notes
  }).from(petMedications).innerJoin(medicationLibrary, eq(petMedications.medicationId, medicationLibrary.id)).where(eq(petMedications.petId, petId)).orderBy(desc(petMedications.startDate));
  return history;
}
async function getPetFleaTreatmentHistory(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  const history = await db2.select().from(fleaTreatments).where(eq(fleaTreatments.petId, petId)).orderBy(desc(fleaTreatments.applicationDate));
  return history;
}
async function getPetDewormingHistory(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  const history = await db2.select().from(dewormingTreatments).where(eq(dewormingTreatments.petId, petId)).orderBy(desc(dewormingTreatments.applicationDate));
  return history;
}
async function getPetCompleteHealthHistory(petId) {
  const [pet, vaccinations, medications, fleaTreatments2, dewormingTreatments2] = await Promise.all([
    getPetById(petId),
    getPetVaccinationHistory(petId),
    getPetMedicationHistory(petId),
    getPetFleaTreatmentHistory(petId),
    getPetDewormingHistory(petId)
  ]);
  if (!pet) {
    throw new Error("Pet not found");
  }
  return {
    pet,
    vaccinations,
    medications,
    preventives: {
      flea: fleaTreatments2,
      deworming: dewormingTreatments2
    }
  };
}
async function getHealthCalendarEvents(startDate, endDate) {
  const db2 = await getDb();
  if (!db2) return [];
  const events = [];
  const vaccinations = await db2.select({
    id: petVaccinations.id,
    petId: petVaccinations.petId,
    petName: pets.name,
    vaccineName: vaccineLibrary.name,
    nextDueDate: petVaccinations.nextDueDate,
    notes: petVaccinations.notes
  }).from(petVaccinations).leftJoin(pets, eq(petVaccinations.petId, pets.id)).leftJoin(vaccineLibrary, eq(petVaccinations.vaccineId, vaccineLibrary.id)).where(
    and(
      startDate ? gte(petVaccinations.nextDueDate, startDate) : void 0,
      endDate ? lte(petVaccinations.nextDueDate, endDate) : void 0
    )
  ).orderBy(petVaccinations.nextDueDate);
  for (const v of vaccinations) {
    if (v.nextDueDate) {
      events.push({
        id: `vaccine-${v.id}`,
        title: `\u{1F489} ${v.vaccineName} - ${v.petName}`,
        start: v.nextDueDate,
        end: v.nextDueDate,
        type: "vaccine",
        petId: v.petId,
        petName: v.petName || "Pet",
        notes: v.notes
      });
    }
  }
  const medications = await db2.select({
    id: petMedications.id,
    petId: petMedications.petId,
    petName: pets.name,
    medicationName: medicationLibrary.name,
    endDate: petMedications.endDate,
    notes: petMedications.notes
  }).from(petMedications).leftJoin(pets, eq(petMedications.petId, pets.id)).leftJoin(medicationLibrary, eq(petMedications.medicationId, medicationLibrary.id)).where(
    and(
      startDate ? gte(petMedications.endDate, startDate) : void 0,
      endDate ? lte(petMedications.endDate, endDate) : void 0
    )
  ).orderBy(petMedications.endDate);
  for (const m of medications) {
    if (m.endDate) {
      events.push({
        id: `medication-${m.id}`,
        title: `\u{1F48A} ${m.medicationName} - ${m.petName}`,
        start: m.endDate,
        end: m.endDate,
        type: "medication",
        petId: m.petId,
        petName: m.petName || "Pet",
        notes: m.notes
      });
    }
  }
  const fleaResults = await db2.select().from(fleaTreatments).leftJoin(pets, eq(fleaTreatments.petId, pets.id)).where(
    and(
      startDate ? gte(fleaTreatments.nextDueDate, startDate) : void 0,
      endDate ? lte(fleaTreatments.nextDueDate, endDate) : void 0
    )
  ).orderBy(fleaTreatments.nextDueDate);
  for (const f of fleaResults) {
    events.push({
      id: `flea-${f.fleaTreatments.id}`,
      title: `\u{1F6E1}\uFE0F ${f.fleaTreatments.productName} - ${f.pets?.name}`,
      start: f.fleaTreatments.nextDueDate,
      end: f.fleaTreatments.nextDueDate,
      type: "flea",
      petId: f.fleaTreatments.petId,
      petName: f.pets?.name || "Pet",
      notes: f.fleaTreatments.notes
    });
  }
  const dewormingResults = await db2.select().from(dewormingTreatments).leftJoin(pets, eq(dewormingTreatments.petId, pets.id)).where(
    and(
      startDate ? gte(dewormingTreatments.nextDueDate, startDate) : void 0,
      endDate ? lte(dewormingTreatments.nextDueDate, endDate) : void 0
    )
  ).orderBy(dewormingTreatments.nextDueDate);
  for (const d of dewormingResults) {
    events.push({
      id: `deworming-${d.dewormingTreatments.id}`,
      title: `\u{1F41B} ${d.dewormingTreatments.productName} - ${d.pets?.name}`,
      start: d.dewormingTreatments.nextDueDate,
      end: d.dewormingTreatments.nextDueDate,
      type: "deworming",
      petId: d.dewormingTreatments.petId,
      petName: d.pets?.name || "Pet",
      notes: d.dewormingTreatments.notes
    });
  }
  return events;
}
async function getAllTutors(page = 1, limit = 20, search) {
  const db2 = await getDb();
  if (!db2) return { tutors: [], total: 0 };
  const offset = (page - 1) * limit;
  let query = db2.select({
    id: users.id,
    name: users.name,
    email: users.email,
    phone: users.phone,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn
  }).from(users).where(eq(users.role, "user")).$dynamic();
  if (search) {
    query = query.where(
      or(
        sql`${users.name} LIKE ${`%${search}%`}`,
        sql`${users.email} LIKE ${`%${search}%`}`,
        sql`${users.phone} LIKE ${`%${search}%`}`
      )
    );
  }
  const tutors = await query.limit(limit).offset(offset).orderBy(desc(users.createdAt));
  const countResult = await db2.select({ count: count() }).from(users).where(eq(users.role, "user"));
  return {
    tutors,
    total: countResult[0]?.count || 0
  };
}
async function getTutorById(tutorId) {
  const db2 = await getDb();
  if (!db2) return null;
  const tutorResult = await db2.select().from(users).where(and(eq(users.id, tutorId), eq(users.role, "user"))).limit(1);
  if (tutorResult.length === 0) return null;
  const tutor = tutorResult[0];
  const linkedPets = await db2.select({
    petId: petTutors.petId,
    petName: pets.name,
    petBreed: pets.breed,
    petPhotoUrl: pets.photoUrl,
    isPrimary: petTutors.isPrimary,
    linkedAt: petTutors.createdAt
  }).from(petTutors).leftJoin(pets, eq(petTutors.petId, pets.id)).where(eq(petTutors.tutorId, tutorId)).orderBy(desc(petTutors.isPrimary), pets.name);
  return {
    ...tutor,
    linkedPets
  };
}
async function updateTutor(tutorId, data) {
  const db2 = await getDb();
  if (!db2) return null;
  await db2.update(users).set({
    ...data,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(users.id, tutorId));
  return await getTutorById(tutorId);
}
async function linkPetToTutor(petId, tutorId, isPrimary = false) {
  const db2 = await getDb();
  if (!db2) return false;
  const existing = await db2.select().from(petTutors).where(and(eq(petTutors.petId, petId), eq(petTutors.tutorId, tutorId))).limit(1);
  if (existing.length > 0) {
    if (isPrimary) {
      await db2.update(petTutors).set({ isPrimary: true }).where(and(eq(petTutors.petId, petId), eq(petTutors.tutorId, tutorId)));
    }
    return true;
  }
  if (isPrimary) {
    await db2.update(petTutors).set({ isPrimary: false }).where(eq(petTutors.petId, petId));
  }
  await db2.insert(petTutors).values({
    petId,
    tutorId,
    isPrimary
  });
  return true;
}
async function unlinkPetFromTutor(petId, tutorId) {
  const db2 = await getDb();
  if (!db2) return false;
  await db2.delete(petTutors).where(and(eq(petTutors.petId, petId), eq(petTutors.tutorId, tutorId)));
  return true;
}
async function getTutorReminderHistory(tutorId) {
  const db2 = await getDb();
  if (!db2) return [];
  return [];
}
async function getAllCalendarEvents(startDate, endDate) {
  const db2 = await getDb();
  if (!db2) return [];
  const healthEvents = await getHealthCalendarEvents(startDate, endDate);
  const bookingsData = await db2.select({
    id: bookings.id,
    petId: bookings.petId,
    petName: pets.name,
    bookingDate: bookings.bookingDate,
    numberOfDays: bookings.numberOfDays,
    status: bookings.status,
    notes: bookings.notes
  }).from(bookings).leftJoin(pets, eq(bookings.petId, pets.id)).where(
    and(
      gte(bookings.bookingDate, startDate),
      lte(bookings.bookingDate, endDate)
    )
  );
  const bookingEvents = bookingsData.flatMap((booking) => {
    const checkInDate = new Date(booking.bookingDate);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + (booking.numberOfDays || 1));
    return [
      {
        id: `checkin-${booking.id}`,
        title: `Check-in: ${booking.petName || "Pet"}`,
        start: checkInDate,
        end: checkInDate,
        type: "checkin",
        petId: booking.petId,
        petName: booking.petName || "Pet",
        notes: booking.notes,
        status: booking.status,
        bookingId: booking.id,
        checkInDate,
        checkOutDate
      },
      {
        id: `checkout-${booking.id}`,
        title: `Check-out: ${booking.petName || "Pet"}`,
        start: checkOutDate,
        end: checkOutDate,
        type: "checkout",
        petId: booking.petId,
        petName: booking.petName || "Pet",
        notes: booking.notes,
        status: booking.status,
        bookingId: booking.id,
        checkInDate,
        checkOutDate
      }
    ];
  });
  const paymentsData = await db2.select({
    id: transactions.id,
    petId: transactions.petId,
    petName: pets.name,
    amount: transactions.amount,
    description: transactions.description,
    category: transactions.category,
    transactionDate: transactions.transactionDate,
    type: transactions.type
  }).from(transactions).leftJoin(pets, eq(transactions.petId, pets.id)).where(
    and(
      gte(transactions.transactionDate, startDate),
      lte(transactions.transactionDate, endDate),
      or(
        eq(transactions.type, "income"),
        eq(transactions.type, "expense")
      )
    )
  );
  const paymentEvents = paymentsData.map((payment) => ({
    id: `payment-${payment.id}`,
    title: `${payment.type === "income" ? "Receita" : "Despesa"}: ${payment.description}`,
    start: new Date(payment.transactionDate),
    end: new Date(payment.transactionDate),
    type: payment.type === "income" ? "payment-income" : "payment-expense",
    petId: payment.petId,
    petName: payment.petName || void 0,
    notes: `${payment.category} - R$ ${(payment.amount / 100).toFixed(2)}`,
    amount: payment.amount,
    category: payment.category
  }));
  return [...healthEvents, ...bookingEvents, ...paymentEvents];
}
async function getDailyOccupancy(startDate, endDate) {
  const db2 = await getDb();
  if (!db2) return [];
  const bookingsData = await db2.select({
    id: bookings.id,
    petId: bookings.petId,
    bookingDate: bookings.bookingDate,
    numberOfDays: bookings.numberOfDays,
    status: bookings.status
  }).from(bookings).where(
    and(
      gte(bookings.bookingDate, startDate),
      lte(bookings.bookingDate, endDate),
      or(
        eq(bookings.status, "confirmed"),
        eq(bookings.status, "pending")
      )
    )
  );
  const occupancyMap = /* @__PURE__ */ new Map();
  bookingsData.forEach((booking) => {
    const checkInDate = new Date(booking.bookingDate);
    const numberOfDays = booking.numberOfDays || 1;
    for (let i = 0; i < numberOfDays; i++) {
      const currentDate = new Date(checkInDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateKey = currentDate.toISOString().split("T")[0];
      occupancyMap.set(dateKey, (occupancyMap.get(dateKey) || 0) + 1);
    }
  });
  return Array.from(occupancyMap.entries()).map(([date2, count2]) => ({
    date: date2,
    occupancy: count2
  }));
}
async function getCreditConsumption(startDate, endDate) {
  const db2 = await getDb();
  if (!db2) return { total: 0, byPet: [] };
  const usageData = await db2.select({
    petId: daycareUsage.petId,
    petName: pets.name,
    count: sql`COUNT(*)`
  }).from(daycareUsage).leftJoin(pets, eq(daycareUsage.petId, pets.id)).where(
    and(
      gte(daycareUsage.usageDate, startDate),
      lte(daycareUsage.usageDate, endDate)
    )
  ).groupBy(daycareUsage.petId, pets.name);
  const total = usageData.reduce((sum, item) => sum + Number(item.count), 0);
  const byPet = usageData.map((item) => ({
    petId: item.petId,
    petName: item.petName || "Pet",
    creditsUsed: Number(item.count)
  }));
  return { total, byPet };
}
async function getDayEvents(date2) {
  const startOfDay = new Date(date2);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date2);
  endOfDay.setHours(23, 59, 59, 999);
  return await getAllCalendarEvents(startOfDay, endOfDay);
}
async function createAuditLog(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(auditLogs).values({
    userId: data.userId,
    action: data.action,
    resource: data.resource || null,
    success: data.success,
    errorCode: data.errorCode || null,
    ipAddress: data.ipAddress || null,
    userAgent: data.userAgent || null
  });
  return Number(result[0]?.insertId || 0);
}
async function getAuditLogs(filters) {
  const db2 = await getDb();
  if (!db2) return [];
  let query = db2.select().from(auditLogs);
  const conditions = [];
  if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
  if (filters?.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters?.success !== void 0) conditions.push(eq(auditLogs.success, filters.success));
  if (filters?.startDate) conditions.push(gte(auditLogs.timestamp, filters.startDate));
  if (filters?.endDate) conditions.push(lte(auditLogs.timestamp, filters.endDate));
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  query = query.orderBy(desc(auditLogs.timestamp));
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  return await query;
}
async function getFailedAccessAttempts(days = 7) {
  const db2 = await getDb();
  if (!db2) return [];
  const startDate = /* @__PURE__ */ new Date();
  startDate.setDate(startDate.getDate() - days);
  return await db2.select().from(auditLogs).where(
    and(
      eq(auditLogs.success, false),
      gte(auditLogs.timestamp, startDate)
    )
  ).orderBy(desc(auditLogs.timestamp));
}
async function getAllNotificationTemplates() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(notificationTemplates).orderBy(notificationTemplates.type);
}
async function getNotificationTemplateByType(type) {
  const db2 = await getDb();
  if (!db2) return null;
  const results = await db2.select().from(notificationTemplates).where(eq(notificationTemplates.type, type)).limit(1);
  return results[0] || null;
}
async function createNotificationTemplate(data) {
  const db2 = await getDb();
  if (!db2) return null;
  const result = await db2.insert(notificationTemplates).values(data);
  return Number(result.insertId);
}
async function updateNotificationTemplate(id, data) {
  const db2 = await getDb();
  if (!db2) return false;
  await db2.update(notificationTemplates).set(data).where(eq(notificationTemplates.id, id));
  return true;
}
async function deleteNotificationTemplate(id) {
  const db2 = await getDb();
  if (!db2) return false;
  await db2.delete(notificationTemplates).where(eq(notificationTemplates.id, id));
  return true;
}
async function getTutorNotificationPreferences(tutorId) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(tutorNotificationPreferences).where(eq(tutorNotificationPreferences.tutorId, tutorId));
}
async function getTutorPreferenceByType(tutorId, type) {
  const db2 = await getDb();
  if (!db2) return null;
  const results = await db2.select().from(tutorNotificationPreferences).where(
    and(
      eq(tutorNotificationPreferences.tutorId, tutorId),
      eq(tutorNotificationPreferences.notificationType, type)
    )
  ).limit(1);
  return results[0] || null;
}
async function createTutorNotificationPreference(data) {
  const db2 = await getDb();
  if (!db2) return null;
  const result = await db2.insert(tutorNotificationPreferences).values(data);
  return Number(result.insertId);
}
async function updateTutorNotificationPreference(id, data) {
  const db2 = await getDb();
  if (!db2) return false;
  await db2.update(tutorNotificationPreferences).set(data).where(eq(tutorNotificationPreferences.id, id));
  return true;
}
async function deleteTutorNotificationPreference(id) {
  const db2 = await getDb();
  if (!db2) return false;
  await db2.delete(tutorNotificationPreferences).where(eq(tutorNotificationPreferences.id, id));
  return true;
}
async function getAllTutorPreferences() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select({
    id: tutorNotificationPreferences.id,
    tutorId: tutorNotificationPreferences.tutorId,
    tutorName: users.name,
    tutorEmail: users.email,
    notificationType: tutorNotificationPreferences.notificationType,
    enabled: tutorNotificationPreferences.enabled,
    adminOverride: tutorNotificationPreferences.adminOverride
  }).from(tutorNotificationPreferences).leftJoin(users, eq(tutorNotificationPreferences.tutorId, users.id)).orderBy(users.name, tutorNotificationPreferences.notificationType);
}
async function shouldSendNotification(tutorId, type) {
  const preference = await getTutorPreferenceByType(tutorId, type);
  if (!preference) {
    return true;
  }
  if (preference.adminOverride) {
    return false;
  }
  return preference.enabled;
}
async function createHealthBehaviorLog(data) {
  const db2 = await getDb();
  if (!db2) return null;
  const result = await db2.insert(healthBehaviorLogs).values(data);
  return { id: Number(result.insertId) };
}
async function getHealthBehaviorLogsByPet(petId, limit = 50) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select({
    id: healthBehaviorLogs.id,
    petId: healthBehaviorLogs.petId,
    petName: pets.name,
    recordedBy: healthBehaviorLogs.recordedBy,
    recordedByName: users.name,
    recordedAt: healthBehaviorLogs.recordedAt,
    mood: healthBehaviorLogs.mood,
    stool: healthBehaviorLogs.stool,
    behavior: healthBehaviorLogs.behavior,
    appetite: healthBehaviorLogs.appetite,
    waterIntake: healthBehaviorLogs.waterIntake,
    notes: healthBehaviorLogs.notes,
    createdAt: healthBehaviorLogs.createdAt
  }).from(healthBehaviorLogs).leftJoin(pets, eq(healthBehaviorLogs.petId, pets.id)).leftJoin(users, eq(healthBehaviorLogs.recordedBy, users.id)).where(eq(healthBehaviorLogs.petId, petId)).orderBy(desc(healthBehaviorLogs.recordedAt)).limit(limit);
}
async function getRecentHealthBehaviorLogs(limit = 20) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select({
    id: healthBehaviorLogs.id,
    petId: healthBehaviorLogs.petId,
    petName: pets.name,
    recordedBy: healthBehaviorLogs.recordedBy,
    recordedByName: users.name,
    recordedAt: healthBehaviorLogs.recordedAt,
    mood: healthBehaviorLogs.mood,
    stool: healthBehaviorLogs.stool,
    behavior: healthBehaviorLogs.behavior,
    appetite: healthBehaviorLogs.appetite,
    waterIntake: healthBehaviorLogs.waterIntake,
    notes: healthBehaviorLogs.notes
  }).from(healthBehaviorLogs).leftJoin(pets, eq(healthBehaviorLogs.petId, pets.id)).leftJoin(users, eq(healthBehaviorLogs.recordedBy, users.id)).orderBy(desc(healthBehaviorLogs.recordedAt)).limit(limit);
}
async function getHealthBehaviorLogById(id) {
  const db2 = await getDb();
  if (!db2) return null;
  const results = await db2.select().from(healthBehaviorLogs).where(eq(healthBehaviorLogs.id, id)).limit(1);
  return results[0] || null;
}
async function deleteHealthBehaviorLog(id) {
  const db2 = await getDb();
  if (!db2) return false;
  await db2.delete(healthBehaviorLogs).where(eq(healthBehaviorLogs.id, id));
  return true;
}
async function getHealthBehaviorStats(petId, days = 30) {
  const db2 = await getDb();
  if (!db2) return null;
  const startDate = /* @__PURE__ */ new Date();
  startDate.setDate(startDate.getDate() - days);
  const logs = await db2.select().from(healthBehaviorLogs).where(
    and(
      eq(healthBehaviorLogs.petId, petId),
      gte(healthBehaviorLogs.recordedAt, startDate)
    )
  ).orderBy(healthBehaviorLogs.recordedAt);
  const moodDist = {};
  const stoolDist = {};
  const behaviorDist = {};
  const appetiteDist = {};
  const waterDist = {};
  logs.forEach((log) => {
    if (log.mood) moodDist[log.mood] = (moodDist[log.mood] || 0) + 1;
    if (log.stool) stoolDist[log.stool] = (stoolDist[log.stool] || 0) + 1;
    if (log.behavior) behaviorDist[log.behavior] = (behaviorDist[log.behavior] || 0) + 1;
    if (log.appetite) appetiteDist[log.appetite] = (appetiteDist[log.appetite] || 0) + 1;
    if (log.waterIntake) waterDist[log.waterIntake] = (waterDist[log.waterIntake] || 0) + 1;
  });
  return {
    totalLogs: logs.length,
    moodDistribution: moodDist,
    stoolDistribution: stoolDist,
    behaviorDistribution: behaviorDist,
    appetiteDistribution: appetiteDist,
    waterDistribution: waterDist,
    logs: logs.slice(0, 10)
    // Last 10 logs
  };
}
async function getAllCreditPackages() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(creditPackages).where(eq(creditPackages.isActive, true)).orderBy(creditPackages.displayOrder);
}
async function getAllCreditPackagesIncludingInactive() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(creditPackages).orderBy(creditPackages.displayOrder);
}
async function getCreditPackageById(id) {
  const db2 = await getDb();
  if (!db2) return null;
  const results = await db2.select().from(creditPackages).where(eq(creditPackages.id, id)).limit(1);
  return results[0] || null;
}
async function createCreditPackage(data) {
  const db2 = await getDb();
  if (!db2) return null;
  const result = await db2.insert(creditPackages).values(data);
  return { id: Number(result.insertId) || 0 };
}
async function updateCreditPackage(id, data) {
  const db2 = await getDb();
  if (!db2) return false;
  await db2.update(creditPackages).set(data).where(eq(creditPackages.id, id));
  return true;
}
async function deleteCreditPackage(id) {
  const db2 = await getDb();
  if (!db2) return false;
  await db2.update(creditPackages).set({ isActive: false }).where(eq(creditPackages.id, id));
  return true;
}
async function getAllEventTypes() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(eventTypes).where(eq(eventTypes.isActive, true)).orderBy(eventTypes.name);
}
async function getAllEventTypesIncludingInactive() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(eventTypes).orderBy(eventTypes.name);
}
async function getEventTypeById(id) {
  const db2 = await getDb();
  if (!db2) return null;
  const [result] = await db2.select().from(eventTypes).where(eq(eventTypes.id, id)).limit(1);
  return result || null;
}
async function createEventType(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(eventTypes).values(data);
  const insertId = Number(result.insertId) || Number(result[0]?.insertId) || 0;
  if (insertId === 0) {
    throw new Error("Failed to create event type");
  }
  return { id: insertId };
}
async function updateEventType(id, data) {
  const db2 = await getDb();
  if (!db2) return false;
  await db2.update(eventTypes).set(data).where(eq(eventTypes.id, id));
  return true;
}
async function deleteEventType(id) {
  const db2 = await getDb();
  if (!db2) return false;
  await db2.update(eventTypes).set({ isActive: false }).where(eq(eventTypes.id, id));
  return true;
}
async function getAllAutoScheduleRules() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(medicationAutoScheduleRules).where(eq(medicationAutoScheduleRules.isActive, true));
}
async function getAllAutoScheduleRulesIncludingInactive() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(medicationAutoScheduleRules);
}
async function getAutoScheduleRuleById(id) {
  const db2 = await getDb();
  if (!db2) return null;
  const [result] = await db2.select().from(medicationAutoScheduleRules).where(eq(medicationAutoScheduleRules.id, id)).limit(1);
  return result || null;
}
async function getAutoScheduleRuleByMedicationId(medicationId) {
  const db2 = await getDb();
  if (!db2) return null;
  const [result] = await db2.select().from(medicationAutoScheduleRules).where(
    and(
      eq(medicationAutoScheduleRules.medicationId, medicationId),
      eq(medicationAutoScheduleRules.isActive, true)
    )
  ).limit(1);
  return result || null;
}
async function createAutoScheduleRule(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(medicationAutoScheduleRules).values(data);
  const insertId = Number(result.insertId) || Number(result[0]?.insertId) || 0;
  if (insertId === 0) {
    throw new Error("Failed to create auto-schedule rule");
  }
  return { id: insertId };
}
async function updateAutoScheduleRule(id, data) {
  const db2 = await getDb();
  if (!db2) return false;
  await db2.update(medicationAutoScheduleRules).set(data).where(eq(medicationAutoScheduleRules.id, id));
  return true;
}
async function deleteAutoScheduleRule(id) {
  const db2 = await getDb();
  if (!db2) return false;
  await db2.update(medicationAutoScheduleRules).set({ isActive: false }).where(eq(medicationAutoScheduleRules.id, id));
  return true;
}
async function getPetFoodStock(petId) {
  const db2 = await getDb();
  if (!db2) return null;
  const [result] = await db2.select().from(petFoodStock).where(eq(petFoodStock.petId, petId)).limit(1);
  return result || null;
}
async function createPetFoodStock(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(petFoodStock).values(data);
  const insertId = Number(result.insertId) || Number(result[0]?.insertId) || 0;
  if (insertId === 0) {
    throw new Error("Failed to create pet food stock");
  }
  return { id: insertId };
}
async function updatePetFoodStock(petId, data) {
  const db2 = await getDb();
  if (!db2) return false;
  await db2.update(petFoodStock).set(data).where(eq(petFoodStock.petId, petId));
  return true;
}
async function getAllLowStockPets(thresholdDays) {
  const db2 = await getDb();
  if (!db2) return [];
  const stocks = await db2.select().from(petFoodStock);
  const lowStockPets = stocks.filter((stock) => {
    const daysRemaining = Math.floor(stock.currentStock / stock.dailyConsumption);
    const threshold = thresholdDays || stock.alertThresholdDays;
    return daysRemaining <= threshold;
  });
  return lowStockPets;
}
function calculateStockDuration(currentStock, dailyConsumption) {
  if (dailyConsumption <= 0) return 0;
  return Math.floor(currentStock / dailyConsumption);
}
function calculateRestockDate(currentStock, dailyConsumption, alertThresholdDays) {
  const daysRemaining = calculateStockDuration(currentStock, dailyConsumption);
  const daysUntilAlert = daysRemaining - alertThresholdDays;
  const restockDate = /* @__PURE__ */ new Date();
  restockDate.setDate(restockDate.getDate() + Math.max(0, daysUntilAlert));
  return restockDate;
}
async function createWallPost(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const [result] = await db2.insert(wallPosts).values(data);
  return result.insertId;
}
async function getWallPosts(limit = 20, offset = 0, petId, userId, targetType) {
  const db2 = await getDb();
  if (!db2) return [];
  let query = db2.select({
    id: wallPosts.id,
    petId: wallPosts.petId,
    authorId: wallPosts.authorId,
    content: wallPosts.content,
    mediaUrls: wallPosts.mediaUrls,
    mediaKeys: wallPosts.mediaKeys,
    postType: wallPosts.postType,
    targetType: wallPosts.targetType,
    targetId: wallPosts.targetId,
    createdAt: wallPosts.createdAt,
    updatedAt: wallPosts.updatedAt,
    authorName: users.name,
    authorRole: users.role,
    petName: pets.name
  }).from(wallPosts).leftJoin(users, eq(wallPosts.authorId, users.id)).leftJoin(pets, eq(wallPosts.petId, pets.id)).orderBy(desc(wallPosts.createdAt)).limit(limit).offset(offset);
  if (petId !== void 0) {
    query = query.where(eq(wallPosts.petId, petId));
  }
  if (targetType && targetType !== "all") {
    query = query.where(eq(wallPosts.targetType, targetType));
  }
  if (userId) {
    const userInfo = await db2.select().from(users).where(eq(users.id, userId));
    if (userInfo[0]?.role === "user") {
      const userPets = await db2.select().from(petTutors).where(eq(petTutors.tutorId, userId));
      const petIds = userPets.map((pt) => pt.petId);
      query = query.where(
        or(
          eq(wallPosts.targetType, "general"),
          and(eq(wallPosts.targetType, "tutor"), eq(wallPosts.targetId, userId)),
          and(eq(wallPosts.targetType, "pet"), petIds.length > 0 ? sql`${wallPosts.targetId} IN (${petIds.join(",")})` : sql`false`)
        )
      );
    }
  }
  return await query;
}
async function getWallPostById(id) {
  const db2 = await getDb();
  if (!db2) return null;
  const [post] = await db2.select({
    id: wallPosts.id,
    petId: wallPosts.petId,
    authorId: wallPosts.authorId,
    content: wallPosts.content,
    mediaUrls: wallPosts.mediaUrls,
    mediaKeys: wallPosts.mediaKeys,
    postType: wallPosts.postType,
    createdAt: wallPosts.createdAt,
    updatedAt: wallPosts.updatedAt,
    authorName: users.name,
    authorRole: users.role,
    petName: pets.name
  }).from(wallPosts).leftJoin(users, eq(wallPosts.authorId, users.id)).leftJoin(pets, eq(wallPosts.petId, pets.id)).where(eq(wallPosts.id, id));
  return post || null;
}
async function deleteWallPost(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.delete(wallPosts).where(eq(wallPosts.id, id));
}
async function addWallComment(postId, authorId, comment) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const [result] = await db2.insert(wallComments).values({ postId, authorId, comment });
  return result.insertId;
}
async function getWallComments(postId) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select({
    id: wallComments.id,
    postId: wallComments.postId,
    authorId: wallComments.authorId,
    comment: wallComments.comment,
    createdAt: wallComments.createdAt,
    authorName: users.name,
    authorRole: users.role
  }).from(wallComments).leftJoin(users, eq(wallComments.authorId, users.id)).where(eq(wallComments.postId, postId)).orderBy(asc(wallComments.createdAt));
}
async function deleteWallComment(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.delete(wallComments).where(eq(wallComments.id, id));
}
async function addWallReaction(postId, userId, reactionType) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const existing = await db2.select().from(wallReactions).where(and(eq(wallReactions.postId, postId), eq(wallReactions.userId, userId)));
  if (existing.length > 0) {
    await db2.update(wallReactions).set({ reactionType }).where(and(eq(wallReactions.postId, postId), eq(wallReactions.userId, userId)));
  } else {
    await db2.insert(wallReactions).values({ postId, userId, reactionType });
  }
}
async function removeWallReaction(postId, userId) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.delete(wallReactions).where(and(eq(wallReactions.postId, postId), eq(wallReactions.userId, userId)));
}
async function getWallReactions(postId) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(wallReactions).where(eq(wallReactions.postId, postId));
}
async function getWallReactionCounts(postId) {
  const db2 = await getDb();
  if (!db2) return {};
  const reactions = await db2.select().from(wallReactions).where(eq(wallReactions.postId, postId));
  const counts = {};
  reactions.forEach((r) => {
    counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
  });
  return counts;
}
async function createConversation(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const [result] = await db2.insert(conversations).values(data);
  return result.insertId;
}
async function getConversations(userId) {
  const db2 = await getDb();
  if (!db2) return [];
  const allConversations = await db2.select().from(conversations);
  return allConversations.filter((conv) => {
    const participants = conv.participants;
    return participants.includes(userId);
  });
}
async function getConversationById(id) {
  const db2 = await getDb();
  if (!db2) return null;
  const [conv] = await db2.select().from(conversations).where(eq(conversations.id, id));
  return conv || null;
}
async function addChatMessage(data) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const [result] = await db2.insert(chatMessages).values(data);
  await db2.update(conversations).set({ lastMessageAt: /* @__PURE__ */ new Date() }).where(eq(conversations.id, data.conversationId));
  return result.insertId;
}
async function getChatMessages(conversationId, limit = 50, offset = 0) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select({
    id: chatMessages.id,
    conversationId: chatMessages.conversationId,
    senderId: chatMessages.senderId,
    content: chatMessages.content,
    mediaUrl: chatMessages.mediaUrl,
    mediaKey: chatMessages.mediaKey,
    messageType: chatMessages.messageType,
    whatsappMessageId: chatMessages.whatsappMessageId,
    isRead: chatMessages.isRead,
    createdAt: chatMessages.createdAt,
    senderName: users.name,
    senderRole: users.role
  }).from(chatMessages).leftJoin(users, eq(chatMessages.senderId, users.id)).where(eq(chatMessages.conversationId, conversationId)).orderBy(asc(chatMessages.createdAt)).limit(limit).offset(offset);
}
async function markMessagesAsRead(conversationId, userId) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.update(chatMessages).set({ isRead: true }).where(and(
    eq(chatMessages.conversationId, conversationId),
    not(eq(chatMessages.senderId, userId))
  ));
}
async function getTutorsByPet(petId) {
  const db2 = await getDb();
  if (!db2) return [];
  const tutors = await db2.select({
    tutorId: petTutors.tutorId,
    petId: petTutors.petId,
    isPrimary: petTutors.isPrimary,
    tutorName: users.name,
    tutorEmail: users.email,
    tutorPhone: users.phone,
    tutorRole: users.role
  }).from(petTutors).leftJoin(users, eq(petTutors.tutorId, users.id)).where(eq(petTutors.petId, petId));
  return tutors;
}
async function getPetsByTutor(tutorId) {
  const db2 = await getDb();
  if (!db2) return [];
  const petsList = await db2.select({
    petId: petTutors.petId,
    tutorId: petTutors.tutorId,
    isPrimary: petTutors.isPrimary,
    petName: pets.name,
    petBreed: pets.breed,
    petStatus: pets.status,
    petCredits: pets.credits
  }).from(petTutors).leftJoin(pets, eq(petTutors.petId, pets.id)).where(eq(petTutors.tutorId, tutorId));
  return petsList;
}
async function getTutorsWithPets() {
  const db2 = await getDb();
  if (!db2) return [];
  const allTutors = await db2.select().from(users).where(eq(users.role, "user"));
  const tutorsWithPets = await Promise.all(
    allTutors.map(async (tutor) => {
      const petsList = await getPetsByTutor(tutor.id);
      return {
        ...tutor,
        pets: petsList,
        petCount: petsList.length
      };
    })
  );
  return tutorsWithPets;
}
async function getPetsWithTutors() {
  const db2 = await getDb();
  if (!db2) return [];
  const allPets = await db2.select().from(pets);
  const petsWithTutors = await Promise.all(
    allPets.map(async (pet) => {
      const tutorsList = await getTutorsByPet(pet.id);
      return {
        ...pet,
        tutors: tutorsList,
        tutorCount: tutorsList.length
      };
    })
  );
  return petsWithTutors;
}
async function autoCreateMedicationEvent(petId, medicationId, medicationName, eventDate, dosage, frequency, createdById) {
  const description = `Medicamento: ${medicationName}
Dosagem: ${dosage}${frequency ? `
Frequ\xEAncia: ${frequency}` : ""}`;
  const eventId = await addCalendarEvent({
    title: `\u{1F48A} ${medicationName}`,
    description,
    eventDate,
    eventType: "medication",
    petId,
    isAllDay: false,
    linkedResourceType: "medication",
    linkedResourceId: medicationId,
    autoCreated: true,
    createdById
  });
  return eventId;
}
async function autoCreateMedicationPeriod(petId, medicationId, medicationName, startDate, endDate, dosage, frequency, createdById) {
  const eventIds = [];
  if (!endDate) {
    const eventId = await autoCreateMedicationEvent(
      petId,
      medicationId,
      medicationName,
      startDate,
      dosage,
      frequency,
      createdById
    );
    return [eventId];
  }
  const currentDate = new Date(startDate);
  const finalDate = new Date(endDate);
  const maxDays = 180;
  let dayCount = 0;
  while (currentDate <= finalDate && dayCount < maxDays) {
    const eventId = await autoCreateMedicationEvent(
      petId,
      medicationId,
      medicationName,
      new Date(currentDate),
      dosage,
      frequency,
      createdById
    );
    eventIds.push(eventId);
    currentDate.setDate(currentDate.getDate() + 1);
    dayCount++;
  }
  return eventIds;
}
async function autoCreateVaccineEvent(petId, vaccineId, vaccineName, eventDate, doseNumber, veterinarian, clinic, createdById) {
  let description = `Vacina: ${vaccineName}
Dose: ${doseNumber}\xAA`;
  if (veterinarian) description += `
Veterin\xE1rio: ${veterinarian}`;
  if (clinic) description += `
Cl\xEDnica: ${clinic}`;
  const eventId = await addCalendarEvent({
    title: `\u{1F489} ${vaccineName} (${doseNumber}\xAA dose)`,
    description,
    eventDate,
    eventType: "vaccination",
    petId,
    isAllDay: true,
    linkedResourceType: "vaccine",
    linkedResourceId: vaccineId,
    autoCreated: true,
    createdById
  });
  return eventId;
}
async function autoCreateFleaEvent(petId, treatmentId, productName, applicationDate, nextDueDate, createdById) {
  let description = `Antipulgas: ${productName}
Aplica\xE7\xE3o: ${applicationDate.toLocaleDateString("pt-BR")}`;
  if (nextDueDate) description += `
Pr\xF3xima aplica\xE7\xE3o: ${nextDueDate.toLocaleDateString("pt-BR")}`;
  const eventId = await addCalendarEvent({
    title: `\u{1F41B} Antipulgas: ${productName}`,
    description,
    eventDate: applicationDate,
    eventType: "preventive",
    petId,
    isAllDay: true,
    linkedResourceType: "preventive_flea",
    linkedResourceId: treatmentId,
    autoCreated: true,
    createdById
  });
  return eventId;
}
async function autoCreateDewormingEvent(petId, treatmentId, productName, applicationDate, nextDueDate, createdById) {
  let description = `Verm\xEDfugo: ${productName}
Aplica\xE7\xE3o: ${applicationDate.toLocaleDateString("pt-BR")}`;
  if (nextDueDate) description += `
Pr\xF3xima aplica\xE7\xE3o: ${nextDueDate.toLocaleDateString("pt-BR")}`;
  const eventId = await addCalendarEvent({
    title: `\u{1FAB1} Verm\xEDfugo: ${productName}`,
    description,
    eventDate: applicationDate,
    eventType: "preventive",
    petId,
    isAllDay: true,
    linkedResourceType: "preventive_deworming",
    linkedResourceId: treatmentId,
    autoCreated: true,
    createdById
  });
  return eventId;
}
async function autoCreateHealthLogEvent(petId, logId, recordedAt, mood, behavior, stool, appetite, waterIntake, notes, createdById) {
  let title = "\u{1F4CB} Registro de Sa\xFAde";
  if (behavior) title = `\u{1F4CB} Comportamento: ${behavior}`;
  else if (mood) title = `\u{1F4CB} Humor: ${mood}`;
  let description = "";
  if (mood) description += `Humor: ${mood}
`;
  if (behavior) description += `Comportamento: ${behavior}
`;
  if (stool) description += `Fezes: ${stool}
`;
  if (appetite) description += `Apetite: ${appetite}
`;
  if (waterIntake) description += `\xC1gua: ${waterIntake}
`;
  if (notes) description += `
Observa\xE7\xF5es: ${notes}`;
  const eventId = await addCalendarEvent({
    title,
    description: description.trim(),
    eventDate: recordedAt,
    eventType: "medical",
    petId,
    isAllDay: false,
    linkedResourceType: "health_log",
    linkedResourceId: logId,
    autoCreated: true,
    createdById
  });
  return eventId;
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    _db = null;
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  storageGet: () => storageGet,
  storagePut: () => storagePut
});
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
async function buildDownloadUrl(baseUrl, relKey, apiKey) {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey)
  });
  return (await response.json()).url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}
async function storageGet(relKey) {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey)
  };
}
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_env();
  }
});

// server/adminLogger.ts
var adminLogger_exports = {};
__export(adminLogger_exports, {
  getAdminLogs: () => getAdminLogs,
  logAdminAction: () => logAdminAction
});
import { eq as eq2, desc as desc2 } from "drizzle-orm";
async function logAdminAction(params) {
  try {
    const db2 = await getDb();
    const logEntry = {
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType || null,
      targetId: params.targetId || null,
      details: params.details ? JSON.stringify(params.details) : null,
      ipAddress: params.req?.ip || params.req?.headers["x-forwarded-for"] || null,
      userAgent: params.req?.headers["user-agent"] || null
    };
    await db2.insert(adminLogs).values(logEntry);
    console.log(`[Admin Log] ${params.action} by admin ${params.adminId}`);
  } catch (error) {
    console.error("[Admin Log] Error logging action:", error);
  }
}
async function getAdminLogs(filters) {
  const db2 = await getDb();
  let query = db2.select().from(adminLogs);
  if (filters?.adminId) {
    query = query.where(eq2(adminLogs.adminId, filters.adminId));
  }
  if (filters?.action) {
    query = query.where(eq2(adminLogs.action, filters.action));
  }
  const logs = await query.orderBy(desc2(adminLogs.createdAt)).limit(filters?.limit || 100);
  return logs;
}
var init_adminLogger = __esm({
  "server/adminLogger.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/changeTracker.ts
var changeTracker_exports = {};
__export(changeTracker_exports, {
  getActivityByDay: () => getActivityByDay,
  getChangesByUser: () => getChangesByUser,
  getCollaborationStats: () => getCollaborationStats,
  getPetHistory: () => getPetHistory,
  getRecentChanges: () => getRecentChanges,
  getResourceHistory: () => getResourceHistory,
  hasChanged: () => hasChanged,
  logChange: () => logChange,
  logMultipleChanges: () => logMultipleChanges,
  serializeValue: () => serializeValue
});
import { drizzle as drizzle2 } from "drizzle-orm/postgres-js";
import postgres2 from "postgres";
async function logChange(options) {
  try {
    await database.insert(changeHistory).values({
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      petId: options.petId,
      fieldName: options.fieldName,
      oldValue: options.oldValue || null,
      newValue: options.newValue || null,
      changedBy: options.changedBy,
      changedByRole: options.changedByRole,
      changeType: options.changeType,
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null
    });
    console.log(`\u2705 Change logged: ${options.resourceType} #${options.resourceId} by ${options.changedByRole}`);
  } catch (error) {
    console.error("\u274C Failed to log change:", error);
  }
}
async function logMultipleChanges(baseOptions, changes) {
  for (const change of changes) {
    await logChange({
      ...baseOptions,
      ...change
    });
  }
}
async function getResourceHistory(resourceType, resourceId) {
  const { eq: eq13, and: and8 } = await import("drizzle-orm");
  return database.select().from(changeHistory).where(
    and8(
      eq13(changeHistory.resourceType, resourceType),
      eq13(changeHistory.resourceId, resourceId)
    )
  ).orderBy(changeHistory.createdAt);
}
async function getPetHistory(petId) {
  const { eq: eq13 } = await import("drizzle-orm");
  return database.select().from(changeHistory).where(eq13(changeHistory.petId, petId)).orderBy(changeHistory.createdAt);
}
async function getRecentChanges(limit = 50) {
  return database.select().from(changeHistory).orderBy(changeHistory.createdAt).limit(limit);
}
async function getChangesByUser(userId) {
  const { eq: eq13 } = await import("drizzle-orm");
  return database.select().from(changeHistory).where(eq13(changeHistory.changedBy, userId)).orderBy(changeHistory.createdAt);
}
async function getCollaborationStats() {
  const { eq: eq13 } = await import("drizzle-orm");
  const allChanges = await database.select().from(changeHistory);
  const adminChanges = allChanges.filter((c) => c.changedByRole === "admin").length;
  const tutorChanges = allChanges.filter((c) => c.changedByRole === "tutor").length;
  const byResourceType = {
    medication: 0,
    food: 0,
    preventive: 0,
    pet_data: 0,
    calendar: 0
  };
  allChanges.forEach((change) => {
    if (change.resourceType in byResourceType) {
      byResourceType[change.resourceType]++;
    }
  });
  return {
    totalChanges: allChanges.length,
    adminChanges,
    tutorChanges,
    byResourceType
  };
}
function serializeValue(value) {
  if (value === null || value === void 0) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
function hasChanged(oldValue, newValue) {
  return serializeValue(oldValue) !== serializeValue(newValue);
}
async function getActivityByDay(days = 30) {
  const { sql: sql4, desc: desc4 } = await import("drizzle-orm");
  const startDate = /* @__PURE__ */ new Date();
  startDate.setDate(startDate.getDate() - days);
  const allChanges = await database.select().from(changeHistory).where(sql4`${changeHistory.createdAt} >= ${startDate}`).orderBy(desc4(changeHistory.createdAt));
  const activityByDate = {};
  allChanges.forEach((change) => {
    const dateKey = new Date(change.createdAt).toISOString().split("T")[0];
    if (!activityByDate[dateKey]) {
      activityByDate[dateKey] = { admin: 0, tutor: 0 };
    }
    if (change.changedByRole === "admin") {
      activityByDate[dateKey].admin++;
    } else {
      activityByDate[dateKey].tutor++;
    }
  });
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date2 = /* @__PURE__ */ new Date();
    date2.setDate(date2.getDate() - i);
    const dateKey = date2.toISOString().split("T")[0];
    result.push({
      date: dateKey,
      adminChanges: activityByDate[dateKey]?.admin || 0,
      tutorChanges: activityByDate[dateKey]?.tutor || 0
    });
  }
  return result;
}
var client, database;
var init_changeTracker = __esm({
  "server/changeTracker.ts"() {
    "use strict";
    init_schema();
    client = postgres2(process.env.DATABASE_URL);
    database = drizzle2(client);
  }
});

// server/notificationService.ts
var notificationService_exports = {};
__export(notificationService_exports, {
  createNotification: () => createNotification2,
  notifyCalendarEvent: () => notifyCalendarEvent,
  notifyCheckIn: () => notifyCheckIn,
  notifyCheckOut: () => notifyCheckOut,
  notifyDailyReport: () => notifyDailyReport,
  notifyLowCredits: () => notifyLowCredits,
  notifyMedicationReminder: () => notifyMedicationReminder,
  sendChangeAlertNotification: () => sendChangeAlertNotification
});
function renderTemplate(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}
async function getRenderedTemplate(type, variables, fallbackTitle, fallbackMessage) {
  try {
    const template = await getNotificationTemplateByType(type);
    if (template && template.isActive) {
      return {
        title: renderTemplate(template.title, variables),
        message: renderTemplate(template.message, variables)
      };
    }
  } catch (error) {
    console.error(`[Template] Error loading template ${type}:`, error);
  }
  return { title: fallbackTitle, message: fallbackMessage };
}
async function createNotification2(data) {
  try {
    const typeMapping = {
      "check_in": "checkin_notification",
      "check_out": "checkout_notification",
      "daily_report": "daily_report",
      "medication_reminder": "medication_reminder",
      "credit_low": "credits_low",
      "calendar_event": "event_reminder"
    };
    const preferenceType = typeMapping[data.type];
    if (preferenceType) {
      const shouldSend = await shouldSendNotification(data.userId, preferenceType);
      if (!shouldSend) {
        console.log(`[Notification] Skipped for user ${data.userId} (preference disabled): ${data.title}`);
        return { success: true, skipped: true };
      }
    }
    await createNotification({
      userId: data.userId,
      petId: data.petId,
      type: data.type,
      title: data.title,
      message: data.message,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      isRead: false,
      isSent: true,
      sentAt: /* @__PURE__ */ new Date()
    });
    console.log(`[Notification] Sent to user ${data.userId}: ${data.title}`);
    return { success: true };
  } catch (error) {
    console.error("[Notification Service] Error:", error);
    return { success: false, error };
  }
}
async function notifyCheckIn(petId) {
  try {
    const pet = await getPetById(petId);
    if (!pet) return;
    const tutors = await getPetTutors(petId);
    const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    for (const tutor of tutors) {
      const { title, message } = await getRenderedTemplate(
        "checkin_notification",
        {
          petName: pet.name,
          time,
          tutorName: tutor.tutor.name || "Tutor"
        },
        `${pet.name} chegou na creche! \u{1F43E}`,
        `${pet.name} fez check-in \xE0s ${time}. Tenha um \xF3timo dia!`
      );
      await createNotification2({
        userId: tutor.tutor.id,
        petId,
        type: "check_in",
        title,
        message
      });
    }
  } catch (error) {
    console.error("[Notification Service] Check-in error:", error);
  }
}
async function notifyCheckOut(petId) {
  try {
    const pet = await getPetById(petId);
    if (!pet) return;
    const tutors = await getPetTutors(petId);
    const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    for (const tutor of tutors) {
      const { title, message } = await getRenderedTemplate(
        "checkout_notification",
        {
          petName: pet.name,
          time,
          tutorName: tutor.tutor.name || "Tutor"
        },
        `${pet.name} saiu da creche! \u{1F3E0}`,
        `${pet.name} fez check-out \xE0s ${time}. Esperamos que tenha se divertido muito!`
      );
      await createNotification2({
        userId: tutor.tutor.id,
        petId,
        type: "check_out",
        title,
        message
      });
    }
  } catch (error) {
    console.error("[Notification Service] Check-out error:", error);
  }
}
async function notifyDailyReport(petId, reportSummary) {
  try {
    const pet = await getPetById(petId);
    if (!pet) return;
    const tutors = await getPetTutors(petId);
    const date2 = (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR");
    for (const tutor of tutors) {
      const { title, message } = await getRenderedTemplate(
        "daily_report",
        {
          petName: pet.name,
          date: date2,
          mood: reportSummary,
          activities: reportSummary,
          tutorName: tutor.tutor.name || "Tutor"
        },
        `Relat\xF3rio di\xE1rio de ${pet.name} dispon\xEDvel! \u{1F4CB}`,
        `Um novo relat\xF3rio sobre o dia de ${pet.name} na creche foi publicado. ${reportSummary}`
      );
      await createNotification2({
        userId: tutor.tutor.id,
        petId,
        type: "daily_report",
        title,
        message
      });
    }
  } catch (error) {
    console.error("[Notification Service] Daily report error:", error);
  }
}
async function notifyCalendarEvent(petId, eventTitle, eventDate) {
  try {
    const pet = await getPetById(petId);
    if (!pet) return;
    const tutors = await getPetTutors(petId);
    const dateStr = eventDate.toLocaleDateString("pt-BR");
    for (const tutor of tutors) {
      const { title, message } = await getRenderedTemplate(
        "event_reminder",
        {
          petName: pet.name,
          eventTitle,
          eventDate: dateStr,
          tutorName: tutor.tutor.name || "Tutor"
        },
        `Lembrete: ${eventTitle} \u{1F4C5}`,
        `${pet.name} tem "${eventTitle}" agendado para ${dateStr}. N\xE3o esque\xE7a!`
      );
      await createNotification2({
        userId: tutor.tutor.id,
        petId,
        type: "calendar_event",
        title,
        message
      });
    }
  } catch (error) {
    console.error("[Notification Service] Calendar event error:", error);
  }
}
async function notifyMedicationReminder(petId, medicationName, dosage, time) {
  try {
    const pet = await getPetById(petId);
    if (!pet) return;
    const tutors = await getPetTutors(petId);
    for (const tutor of tutors) {
      const { title, message } = await getRenderedTemplate(
        "medication_reminder",
        {
          petName: pet.name,
          medicationName,
          dosage: dosage || "conforme prescrito",
          time: time || (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          tutorName: tutor.tutor.name || "Tutor"
        },
        `Hora do medicamento de ${pet.name}! \u{1F48A}`,
        `N\xE3o esque\xE7a de administrar ${medicationName} para ${pet.name}.`
      );
      await createNotification2({
        userId: tutor.tutor.id,
        petId,
        type: "medication_reminder",
        title,
        message
      });
    }
  } catch (error) {
    console.error("[Notification Service] Medication reminder error:", error);
  }
}
async function notifyLowCredits(petId, remainingCredits) {
  try {
    const pet = await getPetById(petId);
    if (!pet) return;
    const tutors = await getPetTutors(petId);
    for (const tutor of tutors) {
      const { title, message } = await getRenderedTemplate(
        "credits_low",
        {
          petName: pet.name,
          remainingCredits: remainingCredits.toString(),
          tutorName: tutor.tutor.name || "Tutor"
        },
        `Cr\xE9ditos baixos para ${pet.name}! \u26A0\uFE0F`,
        `${pet.name} tem apenas ${remainingCredits} cr\xE9dito(s) restante(s). Recarregue para continuar usando a creche.`
      );
      await createNotification2({
        userId: tutor.tutor.id,
        petId,
        type: "credit_low",
        title,
        message
      });
    }
  } catch (error) {
    console.error("[Notification Service] Low credits error:", error);
  }
}
async function sendChangeAlertNotification(options) {
  const resourceTypeMap = {
    medication: "medicamento",
    vaccine: "vacina",
    preventive: "preventivo",
    pet_data: "dados",
    calendar: "evento do calend\xE1rio"
  };
  const roleMap = {
    admin: "administrador",
    tutor: "tutor"
  };
  const resourceLabel = resourceTypeMap[options.resourceType] || options.resourceType;
  const roleLabel = roleMap[options.changedByRole];
  await createNotification2({
    userId: options.userId,
    type: "change_alert",
    title: `${resourceLabel.charAt(0).toUpperCase() + resourceLabel.slice(1)} de ${options.petName} atualizado`,
    message: `O ${roleLabel} ${options.changedBy} fez altera\xE7\xF5es em ${options.resourceName} de ${options.petName}.`,
    petId: options.petId,
    resourceType: options.resourceType,
    resourceId: options.resourceId
  });
}
var init_notificationService = __esm({
  "server/notificationService.ts"() {
    "use strict";
    init_db();
  }
});

// server/whatsappService.ts
var whatsappService_exports = {};
__export(whatsappService_exports, {
  getWhatsAppConfig: () => getWhatsAppConfig2,
  sendBulkMessages: () => sendBulkMessages,
  sendMediaMessage: () => sendMediaMessage,
  sendTemplateMessage: () => sendTemplateMessage,
  sendTextMessage: () => sendTextMessage,
  updateMessageStatus: () => updateMessageStatus
});
import { eq as eq3 } from "drizzle-orm";
async function getWhatsAppConfig2() {
  const db2 = await getDb();
  if (!db2) return null;
  const configs = await db2.select().from(whatsappConfig).limit(1);
  if (configs.length === 0) return null;
  return configs[0];
}
async function sendTextMessage(phone, message, recipientName) {
  const config = await getWhatsAppConfig2();
  if (!config || !config.isActive || !config.apiKey || !config.phoneNumberId) {
    return { success: false, error: "WhatsApp n\xE3o configurado ou inativo" };
  }
  try {
    const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          body: message
        }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      await logMessage({
        recipientPhone: phone,
        recipientName,
        messageContent: message,
        status: "failed",
        errorMessage: JSON.stringify(data)
      });
      return { success: false, error: data.error?.message || "Erro ao enviar mensagem" };
    }
    await logMessage({
      recipientPhone: phone,
      recipientName,
      messageContent: message,
      status: "sent",
      whatsappMessageId: data.messages[0].id,
      sentAt: /* @__PURE__ */ new Date()
    });
    return { success: true, messageId: data.messages[0].id };
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    await logMessage({
      recipientPhone: phone,
      recipientName,
      messageContent: message,
      status: "failed",
      errorMessage: error.message
    });
    return { success: false, error: error.message };
  }
}
async function sendMediaMessage(phone, mediaUrl, caption, recipientName, mediaType = "image") {
  const config = await getWhatsAppConfig2();
  if (!config || !config.isActive || !config.apiKey || !config.phoneNumberId) {
    return { success: false, error: "WhatsApp n\xE3o configurado ou inativo" };
  }
  try {
    const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;
    const body = {
      messaging_product: "whatsapp",
      to: phone,
      type: mediaType
    };
    if (mediaType === "image") {
      body.image = {
        link: mediaUrl,
        caption: caption || ""
      };
    } else if (mediaType === "document") {
      body.document = {
        link: mediaUrl,
        caption: caption || ""
      };
    }
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      await logMessage({
        recipientPhone: phone,
        recipientName,
        messageContent: caption || "M\xEDdia enviada",
        mediaUrl,
        status: "failed",
        errorMessage: JSON.stringify(data)
      });
      return { success: false, error: data.error?.message || "Erro ao enviar m\xEDdia" };
    }
    await logMessage({
      recipientPhone: phone,
      recipientName,
      messageContent: caption || "M\xEDdia enviada",
      mediaUrl,
      status: "sent",
      whatsappMessageId: data.messages[0].id,
      sentAt: /* @__PURE__ */ new Date()
    });
    return { success: true, messageId: data.messages[0].id };
  } catch (error) {
    console.error("Error sending WhatsApp media:", error);
    await logMessage({
      recipientPhone: phone,
      recipientName,
      messageContent: caption || "M\xEDdia enviada",
      mediaUrl,
      status: "failed",
      errorMessage: error.message
    });
    return { success: false, error: error.message };
  }
}
async function sendTemplateMessage(phone, templateName, variables, recipientName) {
  const config = await getWhatsAppConfig2();
  if (!config || !config.isActive || !config.apiKey || !config.phoneNumberId) {
    return { success: false, error: "WhatsApp n\xE3o configurado ou inativo" };
  }
  try {
    const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;
    const components = variables.length > 0 ? [{
      type: "body",
      parameters: variables.map((v) => ({ type: "text", text: v }))
    }] : [];
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "pt_BR" },
          components
        }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      await logMessage({
        recipientPhone: phone,
        recipientName,
        messageContent: `Template: ${templateName}`,
        status: "failed",
        errorMessage: JSON.stringify(data)
      });
      return { success: false, error: data.error?.message || "Erro ao enviar template" };
    }
    await logMessage({
      recipientPhone: phone,
      recipientName,
      messageContent: `Template: ${templateName}`,
      status: "sent",
      whatsappMessageId: data.messages[0].id,
      sentAt: /* @__PURE__ */ new Date()
    });
    return { success: true, messageId: data.messages[0].id };
  } catch (error) {
    console.error("Error sending WhatsApp template:", error);
    await logMessage({
      recipientPhone: phone,
      recipientName,
      messageContent: `Template: ${templateName}`,
      status: "failed",
      errorMessage: error.message
    });
    return { success: false, error: error.message };
  }
}
async function logMessage(data) {
  const db2 = await getDb();
  if (!db2) return;
  try {
    await db2.insert(whatsappMessages).values({
      recipientPhone: data.recipientPhone,
      recipientName: data.recipientName,
      messageContent: data.messageContent,
      mediaUrl: data.mediaUrl,
      status: data.status || "queued",
      whatsappMessageId: data.whatsappMessageId,
      sentAt: data.sentAt,
      errorMessage: data.errorMessage,
      templateId: data.templateId
    });
  } catch (error) {
    console.error("Error logging WhatsApp message:", error);
  }
}
async function updateMessageStatus(whatsappMessageId, status, errorMessage) {
  const db2 = await getDb();
  if (!db2) return;
  try {
    const updateData = { status };
    if (status === "delivered") {
      updateData.deliveredAt = /* @__PURE__ */ new Date();
    } else if (status === "read") {
      updateData.readAt = /* @__PURE__ */ new Date();
    } else if (status === "failed" && errorMessage) {
      updateData.errorMessage = errorMessage;
    }
    await db2.update(whatsappMessages).set(updateData).where(eq3(whatsappMessages.whatsappMessageId, whatsappMessageId));
  } catch (error) {
    console.error("Error updating message status:", error);
  }
}
async function sendBulkMessages(recipients, delayMs = 1e3) {
  let sent = 0;
  let failed = 0;
  const errors = [];
  for (const recipient of recipients) {
    const result = await sendTextMessage(recipient.phone, recipient.message, recipient.name);
    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${recipient.phone}: ${result.error}`);
    }
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return { sent, failed, errors };
}
var init_whatsappService = __esm({
  "server/whatsappService.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/stripeWebhook.ts
var stripeWebhook_exports = {};
__export(stripeWebhook_exports, {
  getStripe: () => getStripe,
  handleStripeWebhook: () => handleStripeWebhook
});
import Stripe from "stripe";
import { eq as eq6 } from "drizzle-orm";
function getStripe() {
  if (!stripeInstance) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured. Stripe features are disabled.");
    }
    stripeInstance = new Stripe(stripeKey, {
      apiVersion: "2025-12-15.clover"
    });
  }
  return stripeInstance;
}
async function handleStripeWebhook(req, res) {
  try {
    const stripe = getStripe();
  } catch (error) {
    console.warn("[Webhook] Stripe not configured:", error.message);
    return res.status(503).json({ error: "Stripe is not configured" });
  }
  const sig = req.headers["stripe-signature"];
  if (!sig) {
    console.error("[Webhook] Missing stripe-signature header");
    return res.status(400).send("Missing signature");
  }
  let event;
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }
  console.log(`[Webhook] Received event: ${event.type}`);
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        await handlePaymentFailed(paymentIntent);
        break;
      }
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
    res.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error processing event:", error);
    res.status(500).json({ error: error.message });
  }
}
async function handleCheckoutCompleted(session) {
  console.log("[Webhook] Processing checkout.session.completed");
  const userId = session.metadata?.user_id;
  const productKey = session.metadata?.product_key;
  const productType = session.metadata?.product_type;
  if (!userId) {
    console.error("[Webhook] Missing user_id in metadata");
    return;
  }
  const db2 = await getDb();
  if (!db2) {
    console.error("[Webhook] Database connection failed");
    return;
  }
  if (session.customer) {
    await db2.update(users).set({ stripeCustomerId: session.customer }).where(eq6(users.id, parseInt(userId)));
  }
  console.log(`[Webhook] Checkout completed for user ${userId}, product: ${productKey}`);
}
async function handlePaymentSucceeded(paymentIntent) {
  console.log("[Webhook] Processing payment_intent.succeeded");
  const userId = paymentIntent.metadata?.user_id;
  const productKey = paymentIntent.metadata?.product_key;
  const productType = paymentIntent.metadata?.product_type;
  const creditsToAdd = paymentIntent.metadata?.credits ? parseInt(paymentIntent.metadata.credits) : 0;
  if (!userId) {
    console.error("[Webhook] Missing user_id in metadata");
    return;
  }
  const db2 = await getDb();
  if (!db2) {
    console.error("[Webhook] Database connection failed");
    return;
  }
  await db2.insert(payments).values({
    userId: parseInt(userId),
    stripePaymentIntentId: paymentIntent.id,
    stripeCustomerId: paymentIntent.customer || null,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: "succeeded",
    productType: productType || "unknown",
    productKey: productKey || null,
    creditsAdded: creditsToAdd > 0 ? creditsToAdd : null,
    metadata: JSON.stringify(paymentIntent.metadata)
  });
  if (productType === "credits" && creditsToAdd > 0) {
    const userPets = await db2.select().from(pets).where(eq6(pets.id, parseInt(userId)));
    if (userPets.length > 0) {
      const creditsPerPet = Math.floor(creditsToAdd / userPets.length);
      for (const pet of userPets) {
        await db2.update(pets).set({ credits: (pet.credits || 0) + creditsPerPet }).where(eq6(pets.id, pet.id));
      }
    }
  }
  console.log(`[Webhook] Payment succeeded for user ${userId}, amount: ${paymentIntent.amount}`);
}
async function handlePaymentFailed(paymentIntent) {
  console.log("[Webhook] Processing payment_intent.payment_failed");
  const userId = paymentIntent.metadata?.user_id;
  if (!userId) {
    console.error("[Webhook] Missing user_id in metadata");
    return;
  }
  const db2 = await getDb();
  if (!db2) {
    console.error("[Webhook] Database connection failed");
    return;
  }
  await db2.insert(payments).values({
    userId: parseInt(userId),
    stripePaymentIntentId: paymentIntent.id,
    stripeCustomerId: paymentIntent.customer || null,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: "failed",
    productType: paymentIntent.metadata?.product_type || "unknown",
    productKey: paymentIntent.metadata?.product_key || null,
    metadata: JSON.stringify(paymentIntent.metadata)
  });
  console.log(`[Webhook] Payment failed for user ${userId}`);
}
var stripeInstance;
var init_stripeWebhook = __esm({
  "server/stripeWebhook.ts"() {
    "use strict";
    init_db();
    init_schema();
    stripeInstance = null;
  }
});

// server/emailAuth.ts
var emailAuth_exports = {};
__export(emailAuth_exports, {
  changePassword: () => changePassword,
  generateResetToken: () => generateResetToken,
  generateVerificationToken: () => generateVerificationToken,
  loginUser: () => loginUser,
  registerUser: () => registerUser,
  resetPassword: () => resetPassword,
  verifyEmail: () => verifyEmail
});
import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq as eq7, and as and4, gt, sql as sql2 } from "drizzle-orm";
async function registerUser(input) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const existingUser = await getUserByEmail(input.email.toLowerCase());
  if (existingUser) {
    throw new Error("Email already registered");
  }
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const [newUser] = await db2.insert(users).values({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    loginMethod: "email",
    role: input.role || "user",
    lastSignedIn: /* @__PURE__ */ new Date()
  });
  return {
    id: newUser.insertId,
    email: input.email.toLowerCase(),
    name: input.name,
    role: input.role || "user"
  };
}
async function loginUser(input) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const user = await getUserByEmail(input.email.toLowerCase());
  if (!user) {
    throw new Error("Invalid email or password");
  }
  if (user.loginMethod !== "email" || !user.passwordHash) {
    throw new Error("This account uses a different login method");
  }
  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }
  await db2.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where(eq7(users.id, user.id));
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
}
async function changePassword(userId, oldPassword, newPassword) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  let user;
  try {
    const userResults = await db2.select().from(users).where(eq7(users.id, userId)).limit(1);
    user = userResults.length > 0 ? userResults[0] : null;
  } catch (error) {
    console.warn("[changePassword] Drizzle query failed, trying raw SQL:", error.message);
    try {
      const rawResult = await db2.execute(sql2`
        SELECT id, "passwordHash", "loginMethod", email, name, role
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `);
      user = rawResult.rows[0] || null;
    } catch (rawError) {
      try {
        const snakeResult = await db2.execute(sql2`
          SELECT id, password_hash as "passwordHash", login_method as "loginMethod", email, name, role
          FROM users
          WHERE id = ${userId}
          LIMIT 1
        `);
        user = snakeResult.rows[0] || null;
      } catch (snakeError) {
        throw new Error(`Failed to query user: ${snakeError.message}`);
      }
    }
  }
  if (!user || !user.passwordHash) {
    throw new Error("User not found or invalid auth method");
  }
  const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isValidPassword) {
    throw new Error("Current password is incorrect");
  }
  const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db2.update(users).set({ passwordHash: newPasswordHash }).where(eq7(users.id, userId));
  return { success: true };
}
async function generateResetToken(email) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const user = await getUserByEmail(email.toLowerCase());
  if (!user) {
    return { success: true };
  }
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1e3);
  await db2.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt
  });
  return { success: true, token, userId: user.id, email: user.email, name: user.name };
}
async function resetPassword(token, newPassword) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const tokenResults = await db2.select().from(passwordResetTokens).where(
    and4(
      eq7(passwordResetTokens.token, token),
      eq7(passwordResetTokens.used, false),
      gt(passwordResetTokens.expiresAt, /* @__PURE__ */ new Date())
    )
  ).limit(1);
  const resetToken = tokenResults.length > 0 ? tokenResults[0] : null;
  if (!resetToken) {
    throw new Error("Invalid or expired reset token");
  }
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db2.update(users).set({ passwordHash }).where(eq7(users.id, resetToken.userId));
  await db2.update(passwordResetTokens).set({ used: true }).where(eq7(passwordResetTokens.id, resetToken.id));
  return { success: true };
}
async function generateVerificationToken(userId) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
  await db2.insert(emailVerificationTokens).values({
    userId,
    token,
    expiresAt
  });
  return { token };
}
async function verifyEmail(token) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const tokenResults = await db2.select().from(emailVerificationTokens).where(
    and4(
      eq7(emailVerificationTokens.token, token),
      eq7(emailVerificationTokens.used, false),
      gt(emailVerificationTokens.expiresAt, /* @__PURE__ */ new Date())
    )
  ).limit(1);
  const verificationToken = tokenResults.length > 0 ? tokenResults[0] : null;
  if (!verificationToken) {
    throw new Error("Invalid or expired verification token");
  }
  await db2.update(users).set({ emailVerified: true }).where(eq7(users.id, verificationToken.userId));
  await db2.update(emailVerificationTokens).set({ used: true }).where(eq7(emailVerificationTokens.id, verificationToken.id));
  return { success: true };
}
var SALT_ROUNDS;
var init_emailAuth = __esm({
  "server/emailAuth.ts"() {
    "use strict";
    init_db();
    init_schema();
    SALT_ROUNDS = 10;
  }
});

// shared/_core/errors.ts
var HttpError, ForbiddenError;
var init_errors = __esm({
  "shared/_core/errors.ts"() {
    "use strict";
    HttpError = class extends Error {
      constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "HttpError";
      }
    };
    ForbiddenError = (msg) => new HttpError(403, msg);
  }
});

// server/_core/sdk.ts
var sdk_exports = {};
__export(sdk_exports, {
  sdk: () => sdk
});
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2, EXCHANGE_TOKEN_PATH, GET_USER_INFO_PATH, GET_USER_INFO_WITH_JWT_PATH, OAuthService, createOAuthHttpClient, SDKServer, sdk;
var init_sdk = __esm({
  "server/_core/sdk.ts"() {
    "use strict";
    init_const();
    init_errors();
    init_db();
    init_env();
    isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
    EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
    GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
    GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
    OAuthService = class {
      constructor(client3) {
        this.client = client3;
        if (ENV.oAuthServerUrl) {
          console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
        }
      }
      decodeState(state) {
        const redirectUri = atob(state);
        return redirectUri;
      }
      async getTokenByCode(code, state) {
        const payload = {
          clientId: ENV.appId,
          grantType: "authorization_code",
          code,
          redirectUri: this.decodeState(state)
        };
        const { data } = await this.client.post(
          EXCHANGE_TOKEN_PATH,
          payload
        );
        return data;
      }
      async getUserInfoByToken(token) {
        const { data } = await this.client.post(
          GET_USER_INFO_PATH,
          {
            accessToken: token.accessToken
          }
        );
        return data;
      }
    };
    createOAuthHttpClient = () => {
      if (!ENV.oAuthServerUrl) {
        return {
          post: async () => {
            throw new Error("OAuth is not configured. This feature requires OAUTH_SERVER_URL to be set.");
          },
          get: async () => {
            throw new Error("OAuth is not configured. This feature requires OAUTH_SERVER_URL to be set.");
          }
        };
      }
      return axios.create({
        baseURL: ENV.oAuthServerUrl,
        timeout: AXIOS_TIMEOUT_MS
      });
    };
    SDKServer = class {
      client;
      oauthService;
      constructor(client3 = createOAuthHttpClient()) {
        this.client = client3;
        this.oauthService = new OAuthService(this.client);
      }
      deriveLoginMethod(platforms, fallback) {
        if (fallback && fallback.length > 0) return fallback;
        if (!Array.isArray(platforms) || platforms.length === 0) return null;
        const set = new Set(
          platforms.filter((p) => typeof p === "string")
        );
        if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
        if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
        if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
        if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
          return "microsoft";
        if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
        const first = Array.from(set)[0];
        return first ? first.toLowerCase() : null;
      }
      /**
       * Exchange OAuth authorization code for access token
       * @example
       * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
       */
      async exchangeCodeForToken(code, state) {
        return this.oauthService.getTokenByCode(code, state);
      }
      /**
       * Get user information using access token
       * @example
       * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
       */
      async getUserInfo(accessToken) {
        const data = await this.oauthService.getUserInfoByToken({
          accessToken
        });
        const loginMethod = this.deriveLoginMethod(
          data?.platforms,
          data?.platform ?? data.platform ?? null
        );
        return {
          ...data,
          platform: loginMethod,
          loginMethod
        };
      }
      parseCookies(cookieHeader) {
        if (!cookieHeader) {
          return /* @__PURE__ */ new Map();
        }
        const parsed = parseCookieHeader(cookieHeader);
        return new Map(Object.entries(parsed));
      }
      getSessionSecret() {
        const secret = ENV.cookieSecret;
        return new TextEncoder().encode(secret);
      }
      /**
       * Create a session token for a Manus user openId
       * @example
       * const sessionToken = await sdk.createSessionToken(userInfo.openId);
       */
      async createSessionToken(openId, options = {}) {
        return this.signSession(
          {
            openId,
            appId: ENV.appId,
            name: options.name || ""
          },
          options
        );
      }
      async signSession(payload, options = {}) {
        const issuedAt = Date.now();
        const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
        const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
        const secretKey = this.getSessionSecret();
        return new SignJWT({
          openId: payload.openId,
          appId: payload.appId,
          name: payload.name
        }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
      }
      async verifySession(cookieValue) {
        if (!cookieValue) {
          console.warn("[Auth] Missing session cookie");
          return null;
        }
        try {
          const secretKey = this.getSessionSecret();
          const { payload } = await jwtVerify(cookieValue, secretKey, {
            algorithms: ["HS256"]
          });
          const { openId, appId, name } = payload;
          if (!isNonEmptyString2(openId) || !isNonEmptyString2(appId) || !isNonEmptyString2(name)) {
            console.warn("[Auth] Session payload missing required fields");
            return null;
          }
          return {
            openId,
            appId,
            name
          };
        } catch (error) {
          console.warn("[Auth] Session verification failed", String(error));
          return null;
        }
      }
      async getUserInfoWithJwt(jwtToken) {
        const payload = {
          jwtToken,
          projectId: ENV.appId
        };
        const { data } = await this.client.post(
          GET_USER_INFO_WITH_JWT_PATH,
          payload
        );
        const loginMethod = this.deriveLoginMethod(
          data?.platforms,
          data?.platform ?? data.platform ?? null
        );
        return {
          ...data,
          platform: loginMethod,
          loginMethod
        };
      }
      async authenticateRequest(req) {
        const cookies = this.parseCookies(req.headers.cookie);
        const sessionCookie = cookies.get(COOKIE_NAME);
        const session = await this.verifySession(sessionCookie);
        if (!session) {
          throw ForbiddenError("Invalid session cookie");
        }
        const sessionUserId = session.openId;
        const signedInAt = /* @__PURE__ */ new Date();
        let user = await getUserByOpenId(sessionUserId);
        if (!user) {
          try {
            let userInfo = {};
            try {
              userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
            } catch (remoteError) {
              console.warn("[Auth] Warning: Could not fetch detailed user info from remote:", remoteError);
            }
            const finalOpenId = userInfo.openId || sessionUserId;
            const finalName = userInfo.name || session.name || "Unknown User";
            if (!finalOpenId) {
              throw new Error("Critical: No openId available even from session.");
            }
            await upsertUser({
              openId: finalOpenId,
              name: finalName,
              email: userInfo.email ?? null,
              // FIX: Default to "email" if loginMethod is missing/null to prevent DB error
              loginMethod: userInfo.loginMethod ?? userInfo.platform ?? "email",
              lastSignedIn: signedInAt
            });
            user = await getUserByOpenId(finalOpenId);
          } catch (error) {
            console.error("[Auth] Failed to sync user from OAuth:", error);
            throw ForbiddenError("Failed to sync user info");
          }
        }
        if (!user) {
          throw ForbiddenError("User not found after sync attempt");
        }
        await upsertUser({
          openId: user.openId,
          lastSignedIn: signedInAt
        });
        return user;
      }
    };
    sdk = new SDKServer();
  }
});

// server/medicationScheduler.ts
var medicationScheduler_exports = {};
__export(medicationScheduler_exports, {
  calculateAutoScheduledDose: () => calculateAutoScheduledDose,
  calculateFutureDoses: () => calculateFutureDoses,
  calculateNextDose: () => calculateNextDose,
  parseMonthDays: () => parseMonthDays,
  parseWeekDays: () => parseWeekDays
});
function calculateNextDose(lastDate, config) {
  const next = new Date(lastDate);
  switch (config.periodicity) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      if (!config.weekDays || config.weekDays.length === 0) {
        next.setDate(next.getDate() + 7);
      } else {
        const sortedDays = [...config.weekDays].sort((a, b) => a - b);
        const currentDay = next.getDay();
        let nextDay = sortedDays.find((day) => day > currentDay);
        if (nextDay === void 0) {
          nextDay = sortedDays[0];
          const daysToAdd = 7 - currentDay + nextDay;
          next.setDate(next.getDate() + daysToAdd);
        } else {
          const daysToAdd = nextDay - currentDay;
          next.setDate(next.getDate() + daysToAdd);
        }
      }
      break;
    case "monthly":
      if (!config.monthDays || config.monthDays.length === 0) {
        next.setMonth(next.getMonth() + 1);
      } else {
        const sortedDays = [...config.monthDays].sort((a, b) => a - b);
        const currentDay = next.getDate();
        let nextDay = sortedDays.find((day) => day > currentDay);
        if (nextDay === void 0) {
          next.setMonth(next.getMonth() + 1);
          nextDay = sortedDays[0];
          next.setDate(nextDay);
        } else {
          next.setDate(nextDay);
        }
        if (next.getDate() !== nextDay) {
          next.setMonth(next.getMonth() + 1);
          next.setDate(sortedDays[0]);
        }
      }
      break;
    case "custom":
      const interval = config.customInterval || 1;
      next.setDate(next.getDate() + interval);
      break;
  }
  return next;
}
function calculateFutureDoses(startDate, config, count2 = 5) {
  const doses = [new Date(startDate)];
  for (let i = 1; i < count2; i++) {
    const nextDose = calculateNextDose(doses[i - 1], config);
    doses.push(nextDose);
  }
  return doses;
}
function calculateAutoScheduledDose(lastDate, intervalType, intervalValue) {
  const next = new Date(lastDate);
  switch (intervalType) {
    case "days":
      next.setDate(next.getDate() + intervalValue);
      break;
    case "weeks":
      next.setDate(next.getDate() + intervalValue * 7);
      break;
    case "months":
      next.setMonth(next.getMonth() + intervalValue);
      break;
    case "years":
      next.setFullYear(next.getFullYear() + intervalValue);
      break;
  }
  return next;
}
function parseWeekDays(weekDaysJson) {
  if (!weekDaysJson) return void 0;
  try {
    const parsed = JSON.parse(weekDaysJson);
    return Array.isArray(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function parseMonthDays(monthDaysJson) {
  if (!monthDaysJson) return void 0;
  try {
    const parsed = JSON.parse(monthDaysJson);
    return Array.isArray(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}
var init_medicationScheduler = __esm({
  "server/medicationScheduler.ts"() {
    "use strict";
  }
});

// server/dosageProgression.ts
var dosageProgression_exports = {};
__export(dosageProgression_exports, {
  calculateProgressiveDosage: () => calculateProgressiveDosage,
  formatPeriodicity: () => formatPeriodicity,
  generateDosagePreview: () => generateDosagePreview,
  hasReachedTarget: () => hasReachedTarget,
  parseDosage: () => parseDosage,
  parseProgressionRate: () => parseProgressionRate
});
function parseDosage(dosage) {
  const trimmed = dosage.trim().toLowerCase();
  const match = trimmed.match(/^([\d.]+)\s*(.*)$/);
  if (!match) {
    throw new Error(`Invalid dosage format: ${dosage}`);
  }
  const value = parseFloat(match[1]);
  const unit = match[2] || "";
  if (isNaN(value)) {
    throw new Error(`Invalid dosage value: ${dosage}`);
  }
  return { value, unit };
}
function parseProgressionRate(rate) {
  const trimmed = rate.trim();
  if (trimmed.endsWith("%")) {
    const value = parseFloat(trimmed.slice(0, -1));
    if (isNaN(value)) {
      throw new Error(`Invalid progression rate: ${rate}`);
    }
    return { value, isPercentage: true };
  }
  const parsed = parseDosage(trimmed);
  return {
    value: parsed.value,
    isPercentage: false,
    unit: parsed.unit
  };
}
function calculateProgressiveDosage(baseDosage, config) {
  if (config.dosageProgression === "stable") {
    return baseDosage;
  }
  const base = parseDosage(baseDosage);
  const adjustmentCount = Math.floor(config.currentDoseCount / config.progressionInterval);
  if (adjustmentCount === 0) {
    return baseDosage;
  }
  const rate = parseProgressionRate(config.progressionRate);
  if (!rate.isPercentage && rate.unit && rate.unit !== base.unit) {
    throw new Error(
      `Progression rate unit (${rate.unit}) doesn't match dosage unit (${base.unit})`
    );
  }
  let adjustmentPerInterval;
  if (rate.isPercentage) {
    adjustmentPerInterval = base.value * (rate.value / 100);
  } else {
    adjustmentPerInterval = rate.value;
  }
  if (config.dosageProgression === "decrease") {
    adjustmentPerInterval = -adjustmentPerInterval;
  }
  let currentValue = base.value + adjustmentPerInterval * adjustmentCount;
  if (currentValue < 0) {
    currentValue = 0;
  }
  if (config.targetDosage) {
    const target = parseDosage(config.targetDosage);
    if (config.dosageProgression === "increase") {
      if (currentValue > target.value) {
        currentValue = target.value;
      }
    } else if (config.dosageProgression === "decrease") {
      if (currentValue < target.value) {
        currentValue = target.value;
      }
    }
  }
  return `${currentValue}${base.unit}`;
}
function generateDosagePreview(baseDosage, config, previewCount = 10) {
  const preview = [];
  for (let i = 0; i < previewCount; i++) {
    const doseNumber = config.currentDoseCount + i + 1;
    const dosage = calculateProgressiveDosage(baseDosage, {
      ...config,
      currentDoseCount: doseNumber - 1
    });
    preview.push({ doseNumber, dosage });
  }
  return preview;
}
function hasReachedTarget(baseDosage, config) {
  if (!config.targetDosage || config.dosageProgression === "stable") {
    return false;
  }
  const current = parseDosage(calculateProgressiveDosage(baseDosage, config));
  const target = parseDosage(config.targetDosage);
  if (config.dosageProgression === "increase") {
    return current.value >= target.value;
  } else {
    return current.value <= target.value;
  }
}
function formatPeriodicity(periodicity, customInterval, weekDays, monthDays) {
  switch (periodicity) {
    case "daily":
      return "Di\xE1ria";
    case "weekly": {
      if (!weekDays) return "Semanal";
      const days = JSON.parse(weekDays);
      const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "S\xE1b"];
      const selectedDays = days.map((d) => dayNames[d]).join(", ");
      return `Semanal: ${selectedDays}`;
    }
    case "monthly": {
      if (!monthDays) return "Mensal";
      const days = JSON.parse(monthDays);
      return `Mensal: dias ${days.join(", ")}`;
    }
    case "custom":
      return customInterval ? `A cada ${customInterval} dias` : "Personalizada";
    default:
      return "N\xE3o configurada";
  }
}
var init_dosageProgression = __esm({
  "server/dosageProgression.ts"() {
    "use strict";
  }
});

// server/dailyPeriodHelper.ts
var dailyPeriodHelper_exports = {};
__export(dailyPeriodHelper_exports, {
  calculateDailyCount: () => calculateDailyCount,
  formatPeriod: () => formatPeriod,
  generatePeriodDates: () => generatePeriodDates,
  isDateInPeriod: () => isDateInPeriod,
  validatePeriod: () => validatePeriod
});
function calculateDailyCount(checkInDate, checkOutDate) {
  const checkIn = new Date(checkInDate);
  checkIn.setHours(0, 0, 0, 0);
  const checkOut = new Date(checkOutDate);
  checkOut.setHours(0, 0, 0, 0);
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}
function generatePeriodDates(checkInDate, checkOutDate) {
  const dates = [];
  const current = new Date(checkInDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(checkOutDate);
  end.setHours(0, 0, 0, 0);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
function isDateInPeriod(date2, checkInDate, checkOutDate) {
  const normalized = new Date(date2);
  normalized.setHours(0, 0, 0, 0);
  const checkIn = new Date(checkInDate);
  checkIn.setHours(0, 0, 0, 0);
  const checkOut = new Date(checkOutDate);
  checkOut.setHours(0, 0, 0, 0);
  return normalized >= checkIn && normalized <= checkOut;
}
function formatPeriod(checkInDate, checkOutDate, dailyCount) {
  const checkIn = new Date(checkInDate).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
  const checkOut = new Date(checkOutDate).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
  const diariasText = dailyCount === 1 ? "di\xE1ria" : "di\xE1rias";
  return `${checkIn} a ${checkOut} (${dailyCount} ${diariasText})`;
}
function validatePeriod(checkInDate, checkOutDate) {
  const checkIn = new Date(checkInDate);
  checkIn.setHours(0, 0, 0, 0);
  const checkOut = new Date(checkOutDate);
  checkOut.setHours(0, 0, 0, 0);
  if (checkOut < checkIn) {
    return {
      valid: false,
      error: "Data de check-out deve ser posterior \xE0 data de check-in"
    };
  }
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
  if (diffDays > 90) {
    return {
      valid: false,
      error: "Per\xEDodo n\xE3o pode exceder 90 dias"
    };
  }
  return { valid: true };
}
var init_dailyPeriodHelper = __esm({
  "server/dailyPeriodHelper.ts"() {
    "use strict";
  }
});

// server/icalExport.ts
var icalExport_exports = {};
__export(icalExport_exports, {
  exportAllFutureEventsToICal: () => exportAllFutureEventsToICal,
  exportEventsToICal: () => exportEventsToICal,
  generateICalFile: () => generateICalFile
});
function formatICalDate(date2, isAllDay = false) {
  const year = date2.getUTCFullYear();
  const month = String(date2.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date2.getUTCDate()).padStart(2, "0");
  if (isAllDay) {
    return `${year}${month}${day}`;
  }
  const hours = String(date2.getUTCHours()).padStart(2, "0");
  const minutes = String(date2.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date2.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}
function escapeICalText(text2) {
  return text2.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
function generateICalFile(events) {
  const now = /* @__PURE__ */ new Date();
  const timestamp2 = formatICalDate(now);
  let ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tet\xEA Care//Gest\xE3o de Creche de Pets//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Tet\xEA Care - Eventos",
    "X-WR-TIMEZONE:America/Bahia"
  ].join("\r\n");
  for (const event of events) {
    const uid = `event-${event.id}@tecare.app`;
    const dtstart = formatICalDate(new Date(event.eventDate), event.isAllDay);
    const dtend = event.endDate ? formatICalDate(new Date(event.endDate), event.isAllDay) : formatICalDate(
      new Date(new Date(event.eventDate).getTime() + (event.isAllDay ? 864e5 : 36e5)),
      event.isAllDay
    );
    const summary = escapeICalText(event.title);
    const description = event.description ? escapeICalText(event.description) : "";
    const location = event.location ? escapeICalText(event.location) : "";
    ical += "\r\n" + [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${timestamp2}`,
      event.isAllDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART:${dtstart}`,
      event.isAllDay ? `DTEND;VALUE=DATE:${dtend}` : `DTEND:${dtend}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : "",
      location ? `LOCATION:${location}` : "",
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "END:VEVENT"
    ].filter((line) => line !== "").join("\r\n");
  }
  ical += "\r\nEND:VCALENDAR";
  return ical;
}
async function exportEventsToICal(startDate, endDate) {
  const { getCalendarEvents: getCalendarEvents2 } = await Promise.resolve().then(() => (init_db(), db_exports));
  const events = await getCalendarEvents2(startDate, endDate);
  return generateICalFile(events);
}
async function exportAllFutureEventsToICal() {
  const now = /* @__PURE__ */ new Date();
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1e3);
  return exportEventsToICal(now, oneYearFromNow);
}
var init_icalExport = __esm({
  "server/icalExport.ts"() {
    "use strict";
  }
});

// server/jobs/calendarReminders.ts
var calendarReminders_exports = {};
__export(calendarReminders_exports, {
  sendCalendarReminders: () => sendCalendarReminders
});
async function sendCalendarReminders() {
  console.log("[CalendarReminders] Starting calendar reminders job...");
  try {
    const tomorrow = /* @__PURE__ */ new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    const allEvents = await getCalendarEvents(tomorrow, dayAfterTomorrow);
    const upcomingEvents = allEvents.filter((e) => !e.reminderSent);
    console.log(`[CalendarReminders] Found ${upcomingEvents.length} events for tomorrow`);
    let sentCount = 0;
    let errorCount = 0;
    for (const event of upcomingEvents) {
      try {
        const eventDateStr = event.eventDate.toLocaleDateString("pt-BR");
        const eventTimeStr = event.isAllDay ? "Dia inteiro" : event.eventDate.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        });
        const eventTypeLabels = {
          holiday: "Feriado",
          closure: "Fechamento",
          medical: "Consulta M\xE9dica",
          general: "Evento",
          vaccination: "Vacina\xE7\xE3o",
          medication: "Medica\xE7\xE3o"
        };
        const eventTypeLabel = eventTypeLabels[event.eventType] || "Evento";
        let message = `\u{1F514} *Lembrete de ${eventTypeLabel}*

`;
        message += `\u{1F4C5} *${event.title}*
`;
        message += `\u{1F5D3}\uFE0F Data: ${eventDateStr}
`;
        message += `\u23F0 Hor\xE1rio: ${eventTimeStr}
`;
        if (event.location) {
          message += `\u{1F4CD} Local: ${event.location}
`;
        }
        if (event.description) {
          message += `
${event.description}`;
        }
        if (event.eventType === "closure" || event.eventType === "holiday") {
          console.log(`[CalendarReminders] Closure/Holiday event: ${event.title}`);
        }
        if (event.petId) {
          const petTutors3 = await getPetTutorsWithDetails(event.petId);
          for (const pt of petTutors3) {
            console.log(
              `[CalendarReminders] Would send reminder to ${pt.name} for event: ${event.title}`
            );
          }
        }
        await updateCalendarEvent(event.id, { reminderSent: true });
        sentCount++;
      } catch (error) {
        console.error(`[CalendarReminders] Error processing event ${event.id}:`, error);
        errorCount++;
      }
    }
    console.log(
      `[CalendarReminders] Job completed. Sent: ${sentCount}, Errors: ${errorCount}`
    );
    return {
      success: true,
      processed: upcomingEvents.length,
      sent: sentCount,
      errors: errorCount
    };
  } catch (error) {
    console.error("[CalendarReminders] Job failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
var init_calendarReminders = __esm({
  "server/jobs/calendarReminders.ts"() {
    "use strict";
    init_db();
  }
});

// server/jobs/lowCreditsAlerts.ts
var lowCreditsAlerts_exports = {};
__export(lowCreditsAlerts_exports, {
  sendLowCreditsAlerts: () => sendLowCreditsAlerts
});
async function sendLowCreditsAlerts() {
  console.log("[LowCreditsAlerts] Starting low credits alerts job...");
  try {
    const threshold = 3;
    const petsWithLowCredits = await getPetsWithLowCredits(threshold);
    console.log(`[LowCreditsAlerts] Found ${petsWithLowCredits.length} pets with low credits`);
    let sentCount = 0;
    let errorCount = 0;
    for (const pet of petsWithLowCredits) {
      try {
        const credits = pet.credits || 0;
        let message = `\u26A0\uFE0F *Alerta de Cr\xE9ditos Baixos*

`;
        message += `\u{1F43E} Pet: *${pet.name}*
`;
        message += `\u{1F4B3} Cr\xE9ditos restantes: *${credits}*

`;
        if (credits === 0) {
          message += `\u274C Sem cr\xE9ditos dispon\xEDveis! O pet n\xE3o poder\xE1 fazer check-in na creche at\xE9 que novos cr\xE9ditos sejam adicionados.

`;
        } else {
          message += `\u23F0 Restam apenas ${credits} ${credits === 1 ? "dia" : "dias"} de creche. Recomendamos adicionar mais cr\xE9ditos em breve.

`;
        }
        message += `\u{1F4A1} Entre em contato com a creche para adicionar mais cr\xE9ditos e garantir o atendimento cont\xEDnuo do seu pet.`;
        const petTutors3 = await getPetTutorsWithDetails(pet.id);
        for (const tutor of petTutors3) {
          console.log(
            `[LowCreditsAlerts] Would send alert to ${tutor.name} for pet: ${pet.name} (${credits} credits)`
          );
        }
        await notifyOwner({
          title: `Alerta: ${pet.name} com cr\xE9ditos baixos`,
          content: `O pet ${pet.name} possui apenas ${credits} cr\xE9ditos restantes. Entre em contato com os tutores para adicionar mais cr\xE9ditos.`
        });
        sentCount++;
      } catch (error) {
        console.error(`[LowCreditsAlerts] Error processing pet ${pet.id}:`, error);
        errorCount++;
      }
    }
    console.log(
      `[LowCreditsAlerts] Job completed. Sent: ${sentCount}, Errors: ${errorCount}`
    );
    return {
      success: true,
      processed: petsWithLowCredits.length,
      sent: sentCount,
      errors: errorCount
    };
  } catch (error) {
    console.error("[LowCreditsAlerts] Job failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
var init_lowCreditsAlerts = __esm({
  "server/jobs/lowCreditsAlerts.ts"() {
    "use strict";
    init_db();
    init_notification();
  }
});

// server/occupancyReport.ts
var occupancyReport_exports = {};
__export(occupancyReport_exports, {
  getOccupancyReport: () => getOccupancyReport
});
async function getOccupancyReport(startDate, endDate) {
  const dbInstance = await getDb();
  if (!dbInstance) {
    return {
      totalCheckIns: 0,
      averageOccupancy: 0,
      peakOccupancy: 0,
      revenue: 0,
      dailyData: []
    };
  }
  const { daycareUsage: daycareUsage2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { between, and: and8, isNotNull: isNotNull3, sql: sql4 } = await import("drizzle-orm");
  const MAX_CAPACITY = 20;
  const checkIns = await dbInstance.select({
    date: sql4`DATE(${daycareUsage2.checkInTime})`,
    count: sql4`COUNT(*)`,
    revenue: sql4`SUM(COALESCE(${daycareUsage2.amountCents}, 0))`
  }).from(daycareUsage2).where(
    and8(
      between(daycareUsage2.checkInTime, startDate, endDate),
      isNotNull3(daycareUsage2.checkInTime)
    )
  ).groupBy(sql4`DATE(${daycareUsage2.checkInTime})`).orderBy(sql4`DATE(${daycareUsage2.checkInTime})`);
  const totalCheckIns = checkIns.reduce((sum, day) => sum + day.count, 0);
  const totalRevenue = checkIns.reduce((sum, day) => sum + (day.revenue || 0), 0);
  const dailyData = checkIns.map((day) => ({
    date: day.date,
    checkIns: day.count,
    occupancyRate: day.count / MAX_CAPACITY * 100
  }));
  const averageOccupancy = dailyData.length > 0 ? dailyData.reduce((sum, day) => sum + day.occupancyRate, 0) / dailyData.length : 0;
  const peakOccupancy = dailyData.length > 0 ? Math.max(...dailyData.map((day) => day.occupancyRate)) : 0;
  return {
    totalCheckIns,
    averageOccupancy,
    peakOccupancy,
    revenue: totalRevenue,
    dailyData
  };
}
var init_occupancyReport = __esm({
  "server/occupancyReport.ts"() {
    "use strict";
    init_db();
  }
});

// server/bookingRequests.db.ts
var bookingRequests_db_exports = {};
__export(bookingRequests_db_exports, {
  approveBookingRequest: () => approveBookingRequest,
  cancelBookingRequest: () => cancelBookingRequest,
  createBookingRequest: () => createBookingRequest,
  getAllBookingRequests: () => getAllBookingRequests,
  getAvailability: () => getAvailability,
  getAvailabilityForDates: () => getAvailabilityForDates,
  getBookingRequestStats: () => getBookingRequestStats,
  getPendingBookingRequests: () => getPendingBookingRequests,
  getTutorBookingRequests: () => getTutorBookingRequests,
  rejectBookingRequest: () => rejectBookingRequest
});
import { eq as eq8, and as and5, sql as sql3, inArray } from "drizzle-orm";
async function getAvailability(date2) {
  const MAX_CAPACITY = 10;
  const db2 = await getDb();
  const result = await db2.select({ count: sql3`count(*)` }).from(bookings).where(
    and5(
      eq8(bookings.bookingDate, new Date(date2)),
      inArray(bookings.status, ["confirmed", "pending"])
    )
  );
  const occupancy = Number(result[0]?.count || 0);
  const available = MAX_CAPACITY - occupancy;
  return {
    date: date2,
    occupancy,
    maxCapacity: MAX_CAPACITY,
    available,
    status: available > 3 ? "available" : available > 0 ? "limited" : "full"
  };
}
async function getAvailabilityForDates(dates) {
  const results = await Promise.all(dates.map((date2) => getAvailability(date2)));
  return results;
}
async function createBookingRequest(data) {
  const db2 = await getDb();
  const result = await db2.insert(bookingRequests).values({
    petId: data.petId,
    tutorId: data.tutorId,
    requestedDates: data.requestedDates,
    notes: data.notes,
    status: "pending"
  });
  const insertId = Number(result[0]?.insertId || 0);
  const [request] = await db2.select().from(bookingRequests).where(eq8(bookingRequests.id, insertId)).limit(1);
  return request;
}
async function getTutorBookingRequests(tutorId) {
  const db2 = await getDb();
  const requests = await db2.select({
    id: bookingRequests.id,
    petId: bookingRequests.petId,
    petName: pets.name,
    petPhoto: pets.photoUrl,
    requestedDates: bookingRequests.requestedDates,
    status: bookingRequests.status,
    notes: bookingRequests.notes,
    adminNotes: bookingRequests.adminNotes,
    approvedBy: bookingRequests.approvedBy,
    approvedAt: bookingRequests.approvedAt,
    createdAt: bookingRequests.createdAt
  }).from(bookingRequests).leftJoin(pets, eq8(bookingRequests.petId, pets.id)).where(eq8(bookingRequests.tutorId, tutorId)).orderBy(sql3`${bookingRequests.createdAt} DESC`);
  return requests;
}
async function getPendingBookingRequests() {
  const db2 = await getDb();
  const requests = await db2.select({
    id: bookingRequests.id,
    petId: bookingRequests.petId,
    petName: pets.name,
    petPhoto: pets.photoUrl,
    tutorId: bookingRequests.tutorId,
    tutorName: users.name,
    tutorEmail: users.email,
    requestedDates: bookingRequests.requestedDates,
    status: bookingRequests.status,
    notes: bookingRequests.notes,
    createdAt: bookingRequests.createdAt
  }).from(bookingRequests).leftJoin(pets, eq8(bookingRequests.petId, pets.id)).leftJoin(users, eq8(bookingRequests.tutorId, users.openId)).where(eq8(bookingRequests.status, "pending")).orderBy(sql3`${bookingRequests.createdAt} ASC`);
  return requests;
}
async function getAllBookingRequests(status) {
  const db2 = await getDb();
  let query = db2.select({
    id: bookingRequests.id,
    petId: bookingRequests.petId,
    petName: pets.name,
    petPhoto: pets.photoUrl,
    tutorId: bookingRequests.tutorId,
    tutorName: users.name,
    tutorEmail: users.email,
    requestedDates: bookingRequests.requestedDates,
    status: bookingRequests.status,
    notes: bookingRequests.notes,
    adminNotes: bookingRequests.adminNotes,
    approvedBy: bookingRequests.approvedBy,
    approvedAt: bookingRequests.approvedAt,
    createdAt: bookingRequests.createdAt
  }).from(bookingRequests).leftJoin(pets, eq8(bookingRequests.petId, pets.id)).leftJoin(users, eq8(bookingRequests.tutorId, users.openId));
  if (status) {
    const requests2 = await query.where(eq8(bookingRequests.status, status)).orderBy(sql3`${bookingRequests.createdAt} DESC`);
    return requests2;
  }
  const requests = await query.orderBy(sql3`${bookingRequests.createdAt} DESC`);
  return requests;
}
async function approveBookingRequest(requestId, adminId, adminNotes) {
  const db2 = await getDb();
  const [request] = await db2.select().from(bookingRequests).where(eq8(bookingRequests.id, requestId));
  if (!request) {
    throw new Error("Booking request not found");
  }
  if (request.status !== "pending") {
    throw new Error("Booking request is not pending");
  }
  const [pet] = await db2.select().from(pets).where(eq8(pets.id, request.petId));
  if (!pet) {
    throw new Error("Pet not found");
  }
  const requestedDates = request.requestedDates;
  const requiredCredits = requestedDates.length;
  if (pet.credits < requiredCredits) {
    throw new Error(
      `Insufficient credits. Required: ${requiredCredits}, Available: ${pet.credits}`
    );
  }
  const availabilities = await getAvailabilityForDates(requestedDates);
  const unavailableDates = availabilities.filter((a) => a.status === "full");
  if (unavailableDates.length > 0) {
    throw new Error(
      `Some dates are no longer available: ${unavailableDates.map((d) => d.date).join(", ")}`
    );
  }
  const [tutor] = await db2.select({ id: users.id }).from(users).where(eq8(users.openId, request.tutorId));
  if (!tutor) {
    throw new Error("Tutor not found");
  }
  for (const date2 of requestedDates) {
    await db2.insert(bookings).values({
      petId: request.petId,
      tutorId: tutor.id,
      bookingDate: new Date(date2),
      status: "confirmed",
      numberOfDays: 1,
      notes: request.notes
    });
  }
  await db2.update(pets).set({
    credits: pet.credits - requiredCredits,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq8(pets.id, request.petId));
  await db2.update(bookingRequests).set({
    status: "approved",
    approvedBy: adminId,
    approvedAt: /* @__PURE__ */ new Date(),
    adminNotes,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq8(bookingRequests.id, requestId));
  return { success: true, creditsUsed: requiredCredits };
}
async function rejectBookingRequest(requestId, adminId, adminNotes) {
  const db2 = await getDb();
  const [request] = await db2.select().from(bookingRequests).where(eq8(bookingRequests.id, requestId));
  if (!request) {
    throw new Error("Booking request not found");
  }
  if (request.status !== "pending") {
    throw new Error("Booking request is not pending");
  }
  await db2.update(bookingRequests).set({
    status: "rejected",
    approvedBy: adminId,
    approvedAt: /* @__PURE__ */ new Date(),
    adminNotes,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq8(bookingRequests.id, requestId));
  return { success: true };
}
async function cancelBookingRequest(requestId, tutorId) {
  const db2 = await getDb();
  const [request] = await db2.select().from(bookingRequests).where(eq8(bookingRequests.id, requestId));
  if (!request) {
    throw new Error("Booking request not found");
  }
  if (request.tutorId !== tutorId) {
    throw new Error("Unauthorized");
  }
  if (request.status !== "pending") {
    throw new Error("Can only cancel pending requests");
  }
  await db2.update(bookingRequests).set({
    status: "cancelled",
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq8(bookingRequests.id, requestId));
  return { success: true };
}
async function getBookingRequestStats() {
  const db2 = await getDb();
  const [stats] = await db2.select({
    total: sql3`count(*)`,
    pending: sql3`sum(case when ${bookingRequests.status} = 'pending' then 1 else 0 end)`,
    approved: sql3`sum(case when ${bookingRequests.status} = 'approved' then 1 else 0 end)`,
    rejected: sql3`sum(case when ${bookingRequests.status} = 'rejected' then 1 else 0 end)`,
    cancelled: sql3`sum(case when ${bookingRequests.status} = 'cancelled' then 1 else 0 end)`
  }).from(bookingRequests);
  return {
    total: Number(stats.total || 0),
    pending: Number(stats.pending || 0),
    approved: Number(stats.approved || 0),
    rejected: Number(stats.rejected || 0),
    cancelled: Number(stats.cancelled || 0)
  };
}
var init_bookingRequests_db = __esm({
  "server/bookingRequests.db.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/_core/websocket.ts
var websocket_exports = {};
__export(websocket_exports, {
  broadcastNotification: () => broadcastNotification,
  getConnectedUsersCount: () => getConnectedUsersCount,
  getWebSocketServer: () => getWebSocketServer,
  initializeWebSocket: () => initializeWebSocket,
  isUserConnected: () => isUserConnected,
  notifyAdmins: () => notifyAdmins,
  notifyRole: () => notifyRole,
  notifyUser: () => notifyUser
});
import { Server } from "socket.io";
import { drizzle as drizzle3 } from "drizzle-orm/postgres-js";
import postgres3 from "postgres";
import { eq as eq9 } from "drizzle-orm";
function initializeWebSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      // In production, restrict to your domain
      methods: ["GET", "POST"]
    }
  });
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }
    try {
      const session = await sdk.verifySession(token);
      if (!session) {
        return next(new Error("Authentication error: Invalid session token"));
      }
      const [user] = await db.select().from(users).where(eq9(users.openId, session.openId)).limit(1);
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }
      socket.userId = user.openId || String(user.id);
      socket.userRole = user.role;
      socket.join(`user:${socket.userId}`);
      socket.join(`role:${user.role}`);
      console.log(`[WebSocket] User ${socket.userId} (${user.role}) connected`);
      next();
    } catch (error) {
      console.error("[WebSocket] Authentication error:", error);
      return next(new Error("Authentication error: Invalid token"));
    }
  });
  io.on("connection", (socket) => {
    console.log(`[WebSocket] Socket ${socket.id} connected for user ${socket.userId}`);
    socket.on("disconnect", (reason) => {
      console.log(`[WebSocket] Socket ${socket.id} disconnected: ${reason}`);
    });
    socket.on("ping", () => {
      socket.emit("pong");
    });
  });
  return io;
}
function getWebSocketServer() {
  return io;
}
function notifyUser(userId, notification) {
  if (!io) {
    console.warn("[WebSocket] Server not initialized");
    return false;
  }
  io.to(`user:${userId}`).emit("notification", notification);
  console.log(`[WebSocket] Notification sent to user ${userId}:`, notification.type);
  return true;
}
function notifyAdmins(notification) {
  if (!io) {
    console.warn("[WebSocket] Server not initialized");
    return false;
  }
  io.to("role:admin").emit("notification", notification);
  console.log(`[WebSocket] Notification sent to all admins:`, notification.type);
  return true;
}
function notifyRole(role, notification) {
  if (!io) {
    console.warn("[WebSocket] Server not initialized");
    return false;
  }
  io.to(`role:${role}`).emit("notification", notification);
  console.log(`[WebSocket] Notification sent to role ${role}:`, notification.type);
  return true;
}
function broadcastNotification(notification) {
  if (!io) {
    console.warn("[WebSocket] Server not initialized");
    return false;
  }
  io.emit("notification", notification);
  console.log(`[WebSocket] Notification broadcasted:`, notification.type);
  return true;
}
function getConnectedUsersCount() {
  if (!io) return 0;
  return io.sockets.sockets.size;
}
async function isUserConnected(userId) {
  if (!io) return false;
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets.length > 0;
}
var client2, db, io;
var init_websocket = __esm({
  "server/_core/websocket.ts"() {
    "use strict";
    init_sdk();
    init_schema();
    client2 = postgres3(process.env.DATABASE_URL);
    db = drizzle3(client2);
    io = null;
  }
});

// server/healthReminders.ts
var healthReminders_exports = {};
__export(healthReminders_exports, {
  sendAllHealthReminders: () => sendAllHealthReminders,
  sendHealthReminderToOwner: () => sendHealthReminderToOwner,
  sendSummaryReminderToOwner: () => sendSummaryReminderToOwner
});
async function getPrimaryTutorForPet(petId) {
  const database2 = await getDb();
  if (!database2) return null;
  const { petTutors: petTutors3, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq13, and: and8 } = await import("drizzle-orm");
  const tutorRelations = await database2.select({
    tutorId: petTutors3.tutorId,
    isPrimary: petTutors3.isPrimary
  }).from(petTutors3).where(eq13(petTutors3.petId, petId));
  if (tutorRelations.length === 0) return null;
  const primaryRelation = tutorRelations.find((r) => r.isPrimary) || tutorRelations[0];
  const tutors = await database2.select({
    name: users2.name,
    phone: users2.phone
  }).from(users2).where(eq13(users2.id, primaryRelation.tutorId));
  if (tutors.length === 0 || !tutors[0].phone) return null;
  return {
    phone: tutors[0].phone,
    name: tutors[0].name || "Tutor"
  };
}
async function sendHealthReminderToOwner(ownerPhone, ownerName, petName, reminderType, itemName, dueDate, daysUntilDue) {
  const templates = {
    vaccine: `Ol\xE1 ${ownerName}! \u{1F43E}

Lembrete importante: A vacina *${itemName}* do seu pet *${petName}* vence em ${daysUntilDue} ${daysUntilDue === 1 ? "dia" : "dias"} (${dueDate.toLocaleDateString("pt-BR")}).

Por favor, agende a aplica\xE7\xE3o para manter a sa\xFAde do seu pet em dia! \u{1F489}

_TeteCare - Cuidando com amor_ \u2764\uFE0F`,
    medication: `Ol\xE1 ${ownerName}! \u{1F43E}

Lembrete: O medicamento *${itemName}* do seu pet *${petName}* termina em ${daysUntilDue} ${daysUntilDue === 1 ? "dia" : "dias"} (${dueDate.toLocaleDateString("pt-BR")}).

N\xE3o esque\xE7a de renovar a medica\xE7\xE3o se necess\xE1rio! \u{1F48A}

_TeteCare - Cuidando com amor_ \u2764\uFE0F`,
    flea: `Ol\xE1 ${ownerName}! \u{1F43E}

Lembrete: O antipulgas *${itemName}* do seu pet *${petName}* vence em ${daysUntilDue} ${daysUntilDue === 1 ? "dia" : "dias"} (${dueDate.toLocaleDateString("pt-BR")}).

Agende a pr\xF3xima aplica\xE7\xE3o para manter seu pet protegido! \u{1F6E1}\uFE0F

_TeteCare - Cuidando com amor_ \u2764\uFE0F`,
    deworming: `Ol\xE1 ${ownerName}! \u{1F43E}

Lembrete: O verm\xEDfugo *${itemName}* do seu pet *${petName}* vence em ${daysUntilDue} ${daysUntilDue === 1 ? "dia" : "dias"} (${dueDate.toLocaleDateString("pt-BR")}).

Agende a pr\xF3xima dose para manter seu pet saud\xE1vel! \u{1F41B}

_TeteCare - Cuidando com amor_ \u2764\uFE0F`
  };
  const message = templates[reminderType];
  return await sendTextMessage(ownerPhone, message, ownerName);
}
async function sendAllHealthReminders(daysAhead = 7) {
  const results = {
    totalSent: 0,
    totalFailed: 0,
    byType: {
      vaccines: 0,
      medications: 0,
      flea: 0,
      deworming: 0
    },
    errors: []
  };
  try {
    const vaccines = await getUpcomingVaccinationReminders(daysAhead);
    const medications = await getEndingMedicationReminders(daysAhead);
    const flea = await getUpcomingFleaTreatmentReminders(daysAhead);
    const deworming = await getUpcomingDewormingReminders(daysAhead);
    const remindersByOwner = /* @__PURE__ */ new Map();
    for (const vaccine of vaccines) {
      const pet = await getPetById(vaccine.petId);
      if (!pet) continue;
      const tutor = await getPrimaryTutorForPet(vaccine.petId);
      if (!tutor) continue;
      if (!vaccine.nextDueDate) continue;
      if (!remindersByOwner.has(tutor.phone)) {
        remindersByOwner.set(tutor.phone, {
          name: tutor.name,
          reminders: []
        });
      }
      const daysUntilDue = Math.ceil((vaccine.nextDueDate.getTime() - Date.now()) / (1e3 * 60 * 60 * 24));
      remindersByOwner.get(tutor.phone).reminders.push({
        type: "vaccine",
        petName: pet.name,
        itemName: vaccine.vaccineName,
        dueDate: vaccine.nextDueDate,
        daysUntilDue
      });
    }
    for (const medication of medications) {
      const pet = await getPetById(medication.petId);
      if (!pet) continue;
      const tutor = await getPrimaryTutorForPet(medication.petId);
      if (!tutor) continue;
      if (!medication.endDate) continue;
      if (!remindersByOwner.has(tutor.phone)) {
        remindersByOwner.set(tutor.phone, {
          name: tutor.name,
          reminders: []
        });
      }
      const daysUntilDue = Math.ceil((medication.endDate.getTime() - Date.now()) / (1e3 * 60 * 60 * 24));
      remindersByOwner.get(tutor.phone).reminders.push({
        type: "medication",
        petName: pet.name,
        itemName: medication.medicationName,
        dueDate: medication.endDate,
        daysUntilDue
      });
    }
    for (const treatment of flea) {
      const pet = await getPetById(treatment.petId);
      if (!pet) continue;
      const tutor = await getPrimaryTutorForPet(treatment.petId);
      if (!tutor) continue;
      if (!remindersByOwner.has(tutor.phone)) {
        remindersByOwner.set(tutor.phone, {
          name: tutor.name,
          reminders: []
        });
      }
      const daysUntilDue = Math.ceil((treatment.nextDueDate.getTime() - Date.now()) / (1e3 * 60 * 60 * 24));
      remindersByOwner.get(tutor.phone).reminders.push({
        type: "flea",
        petName: pet.name,
        itemName: treatment.productName,
        dueDate: treatment.nextDueDate,
        daysUntilDue
      });
    }
    for (const treatment of deworming) {
      const pet = await getPetById(treatment.petId);
      if (!pet) continue;
      const tutor = await getPrimaryTutorForPet(treatment.petId);
      if (!tutor) continue;
      if (!remindersByOwner.has(tutor.phone)) {
        remindersByOwner.set(tutor.phone, {
          name: tutor.name,
          reminders: []
        });
      }
      const daysUntilDue = Math.ceil((treatment.nextDueDate.getTime() - Date.now()) / (1e3 * 60 * 60 * 24));
      remindersByOwner.get(tutor.phone).reminders.push({
        type: "deworming",
        petName: pet.name,
        itemName: treatment.productName,
        dueDate: treatment.nextDueDate,
        daysUntilDue
      });
    }
    for (const [phone, ownerData] of Array.from(remindersByOwner.entries())) {
      for (const reminder of ownerData.reminders) {
        const result = await sendHealthReminderToOwner(
          phone,
          ownerData.name,
          reminder.petName,
          reminder.type,
          reminder.itemName,
          reminder.dueDate,
          reminder.daysUntilDue
        );
        if (result.success) {
          results.totalSent++;
          if (reminder.type === "vaccine") results.byType.vaccines++;
          else if (reminder.type === "medication") results.byType.medications++;
          else if (reminder.type === "flea") results.byType.flea++;
          else if (reminder.type === "deworming") results.byType.deworming++;
        } else {
          results.totalFailed++;
          results.errors.push(`${phone} (${reminder.petName} - ${reminder.itemName}): ${result.error}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
    return results;
  } catch (error) {
    console.error("Error sending health reminders:", error);
    results.errors.push(`Erro geral: ${error.message}`);
    return results;
  }
}
async function sendSummaryReminderToOwner(ownerPhone, ownerName, reminders) {
  if (reminders.length === 0) {
    return { success: true };
  }
  const typeEmojis = {
    vaccine: "\u{1F489}",
    medication: "\u{1F48A}",
    flea: "\u{1F6E1}\uFE0F",
    deworming: "\u{1F41B}"
  };
  let message = `Ol\xE1 ${ownerName}! \u{1F43E}

`;
  message += `Voc\xEA tem *${reminders.length}* ${reminders.length === 1 ? "lembrete" : "lembretes"} de sa\xFAde:

`;
  for (const reminder of reminders) {
    const emoji = typeEmojis[reminder.type] || "\u{1F4CB}";
    message += `${emoji} *${reminder.petName}* - ${reminder.itemName}
`;
    message += `   Vence em ${reminder.daysUntilDue} ${reminder.daysUntilDue === 1 ? "dia" : "dias"} (${reminder.dueDate.toLocaleDateString("pt-BR")})

`;
  }
  message += `_TeteCare - Cuidando com amor_ \u2764\uFE0F`;
  return await sendTextMessage(ownerPhone, message, ownerName);
}
var init_healthReminders = __esm({
  "server/healthReminders.ts"() {
    "use strict";
    init_db();
    init_whatsappService();
  }
});

// server/pricing.db.ts
var pricing_db_exports = {};
__export(pricing_db_exports, {
  createCustomPricingPlan: () => createCustomPricingPlan,
  deactivateCustomPricingPlan: () => deactivateCustomPricingPlan,
  getAllCustomPricingPlans: () => getAllCustomPricingPlans,
  getCustomPricingPlan: () => getCustomPricingPlan,
  getEffectivePrice: () => getEffectivePrice,
  getServicePrice: () => getServicePrice,
  getServicePrices: () => getServicePrices,
  updateCustomPricingPlan: () => updateCustomPricingPlan
});
import { eq as eq10, and as and6 } from "drizzle-orm";
async function getServicePrices() {
  const db2 = await getDb();
  return db2.select().from(servicePrices).where(eq10(servicePrices.isActive, true));
}
async function getServicePrice(serviceType) {
  const db2 = await getDb();
  const [price] = await db2.select().from(servicePrices).where(
    and6(
      eq10(servicePrices.serviceType, serviceType),
      eq10(servicePrices.isActive, true)
    )
  );
  return price;
}
async function getCustomPricingPlan(tutorId) {
  const db2 = await getDb();
  const [plan] = await db2.select().from(customPricingPlans).where(
    and6(
      eq10(customPricingPlans.tutorId, tutorId),
      eq10(customPricingPlans.isActive, true)
    )
  ).orderBy(customPricingPlans.createdAt);
  return plan;
}
async function getEffectivePrice(tutorId, serviceType) {
  const customPlan = await getCustomPricingPlan(tutorId);
  if (customPlan) {
    const customPrice = serviceType === "creche" ? customPlan.crechePrice : customPlan.diariaPrice;
    if (customPrice !== null) {
      return customPrice;
    }
  }
  const standardPrice = await getServicePrice(serviceType);
  return standardPrice?.priceInCents ?? 0;
}
async function createCustomPricingPlan(data) {
  const db2 = await getDb();
  const result = await db2.insert(customPricingPlans).values(data);
  return result[0].insertId;
}
async function getAllCustomPricingPlans() {
  const db2 = await getDb();
  return db2.select().from(customPricingPlans);
}
async function updateCustomPricingPlan(id, data) {
  const db2 = await getDb();
  await db2.update(customPricingPlans).set(data).where(eq10(customPricingPlans.id, id));
}
async function deactivateCustomPricingPlan(id) {
  const db2 = await getDb();
  await db2.update(customPricingPlans).set({ isActive: false }).where(eq10(customPricingPlans.id, id));
}
var init_pricing_db = __esm({
  "server/pricing.db.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/food.db.ts
var food_db_exports = {};
__export(food_db_exports, {
  addStock: () => addStock,
  getCurrentStock: () => getCurrentStock,
  getFoodMovements: () => getFoodMovements,
  getFoodStats: () => getFoodStats,
  recordDailyConsumption: () => recordDailyConsumption
});
import { eq as eq11, desc as desc3 } from "drizzle-orm";
async function getCurrentStock() {
  const db2 = await getDb();
  const [stock] = await db2.select().from(foodStock).limit(1);
  return stock || { id: 0, currentStockKg: 0, lastUpdated: /* @__PURE__ */ new Date() };
}
function kgToGrams(kg) {
  return Math.round(kg * 1e3);
}
function gramsToKg(grams) {
  return grams / 1e3;
}
async function getFoodStats() {
  const db2 = await getDb();
  const stock = await getCurrentStock();
  const recentMovements = await db2.select().from(foodMovements).orderBy(desc3(foodMovements.createdAt)).limit(10);
  return {
    currentStockKg: gramsToKg(stock.currentStockKg),
    lastUpdated: stock.lastUpdated,
    recentMovements: recentMovements.map((m) => ({
      ...m,
      amountKg: gramsToKg(Math.abs(m.amountKg))
    }))
  };
}
async function addStock(amountKg, notes, createdBy) {
  const db2 = await getDb();
  const stock = await getCurrentStock();
  const amountGrams = kgToGrams(amountKg);
  if (stock.id > 0) {
    await db2.update(foodStock).set({
      currentStockKg: stock.currentStockKg + amountGrams,
      lastUpdated: /* @__PURE__ */ new Date()
    }).where(eq11(foodStock.id, stock.id));
  } else {
    await db2.insert(foodStock).values({
      currentStockKg: amountGrams,
      lastUpdated: /* @__PURE__ */ new Date()
    });
  }
  await db2.insert(foodMovements).values({
    type: "purchase",
    amountKg: amountGrams,
    notes,
    createdBy,
    createdAt: /* @__PURE__ */ new Date()
  });
  return { success: true };
}
async function recordDailyConsumption(amountKg, notes) {
  const db2 = await getDb();
  const stock = await getCurrentStock();
  const amountGrams = kgToGrams(amountKg);
  if (stock.id > 0) {
    const newStock = Math.max(0, stock.currentStockKg - amountGrams);
    await db2.update(foodStock).set({
      currentStockKg: newStock,
      lastUpdated: /* @__PURE__ */ new Date()
    }).where(eq11(foodStock.id, stock.id));
  }
  await db2.insert(foodMovements).values({
    type: "consumption",
    amountKg: -amountGrams,
    notes,
    createdAt: /* @__PURE__ */ new Date()
  });
  return { success: true };
}
async function getFoodMovements(limit = 50) {
  const db2 = await getDb();
  return await db2.select().from(foodMovements).orderBy(desc3(foodMovements.createdAt)).limit(limit);
}
var init_food_db = __esm({
  "server/food.db.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/whatsappSync.ts
var whatsappSync_exports = {};
__export(whatsappSync_exports, {
  processWhatsAppWebhook: () => processWhatsAppWebhook,
  sendWhatsAppMessage: () => sendWhatsAppMessage,
  syncMessageToWhatsApp: () => syncMessageToWhatsApp
});
import { eq as eq12 } from "drizzle-orm";
async function sendWhatsAppMessage(params) {
  const { phoneNumber, message, mediaUrl, mediaType } = params;
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const [config] = await db2.select().from((await Promise.resolve().then(() => (init_schema(), schema_exports))).whatsappConfig).where(
    eq12((await Promise.resolve().then(() => (init_schema(), schema_exports))).whatsappConfig.isActive, true)
  );
  if (!config || !config.apiKey || !config.phoneNumberId) {
    throw new Error("WhatsApp Business n\xE3o configurado");
  }
  const endpoint = `https://graph.facebook.com/v17.0/${config.phoneNumberId}/messages`;
  let payload = {
    messaging_product: "whatsapp",
    to: phoneNumber
  };
  if (mediaUrl && mediaType) {
    payload.type = mediaType;
    payload[mediaType] = {
      link: mediaUrl,
      caption: message || void 0
    };
  } else {
    payload.type = "text";
    payload.text = { body: message };
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao enviar mensagem WhatsApp: ${error}`);
  }
  const result = await response.json();
  return result.messages[0].id;
}
async function processWhatsAppWebhook(webhookData) {
  try {
    const db2 = await getDb();
    if (!db2) throw new Error("Database not available");
    const entry = webhookData.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    if (!value?.messages) {
      return { success: true, message: "No messages to process" };
    }
    for (const message of value.messages) {
      const whatsappMessageId = message.id;
      const fromPhone = message.from;
      const timestamp2 = parseInt(message.timestamp) * 1e3;
      const [existing] = await db2.select().from(chatMessages).where(
        eq12(chatMessages.whatsappMessageId, whatsappMessageId)
      );
      if (existing) {
        continue;
      }
      const [user] = await db2.select().from(users).where(
        eq12(users.phone, fromPhone)
      );
      if (!user) {
        console.log(`Usu\xE1rio n\xE3o encontrado para telefone ${fromPhone}`);
        continue;
      }
      const allConversations = await db2.select().from(conversations);
      let conversation = allConversations.find((conv) => {
        const participants = conv.participants;
        return participants.includes(user.id) && participants.includes(1);
      });
      if (!conversation) {
        const [newConv] = await db2.insert(conversations).values({
          participants: [user.id, 1],
          // Tutor e Admin
          lastMessageAt: new Date(timestamp2),
          unreadCount: 0
        });
        conversation = { id: newConv.insertId, participants: [user.id, 1] };
      }
      if (!conversation) {
        console.log(`Erro ao criar/encontrar conversa para usu\xE1rio ${user.id}`);
        continue;
      }
      let content = "";
      let mediaUrl = "";
      let mediaKey = "";
      let messageType = "text";
      if (message.type === "text") {
        content = message.text.body;
      } else if (message.type === "image") {
        messageType = "image";
        content = message.image.caption || "";
        mediaUrl = message.image.link || "";
      } else if (message.type === "video") {
        messageType = "video";
        content = message.video.caption || "";
        mediaUrl = message.video.link || "";
      } else if (message.type === "audio") {
        messageType = "audio";
        mediaUrl = message.audio.link || "";
      } else if (message.type === "document") {
        messageType = "document";
        content = message.document.filename || "";
        mediaUrl = message.document.link || "";
      }
      await db2.insert(chatMessages).values({
        conversationId: conversation.id,
        senderId: user.id,
        content,
        mediaUrl: mediaUrl || null,
        mediaKey: mediaKey || null,
        messageType,
        source: "whatsapp",
        whatsappMessageId,
        isRead: false,
        createdAt: new Date(timestamp2)
      });
      await db2.update(conversations).set({ lastMessageAt: new Date(timestamp2) }).where(eq12(conversations.id, conversation.id));
    }
    return { success: true, message: "Messages processed" };
  } catch (error) {
    console.error("Erro ao processar webhook WhatsApp:", error);
    throw error;
  }
}
async function syncMessageToWhatsApp(messageId) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const [message] = await db2.select().from(chatMessages).where(
    eq12(chatMessages.id, messageId)
  );
  if (!message || message.source === "whatsapp") {
    return;
  }
  const [conversation] = await db2.select().from(conversations).where(
    eq12(conversations.id, message.conversationId)
  );
  if (!conversation) {
    throw new Error("Conversa n\xE3o encontrada");
  }
  const participants = conversation.participants;
  const recipientId = participants.find((id) => id !== message.senderId);
  const [recipient] = await db2.select().from(users).where(
    eq12(users.id, recipientId)
  );
  if (!recipient || !recipient.phone) {
    throw new Error("Destinat\xE1rio sem telefone cadastrado");
  }
  const whatsappMessageId = await sendWhatsAppMessage({
    phoneNumber: recipient.phone,
    message: message.content || "",
    mediaUrl: message.mediaUrl || void 0,
    mediaType: message.messageType !== "text" ? message.messageType : void 0
  });
  await db2.update(chatMessages).set({ whatsappMessageId }).where(eq12(chatMessages.id, messageId));
  return whatsappMessageId;
}
var init_whatsappSync = __esm({
  "server/whatsappSync.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/_core/index.ts
import dotenv from "dotenv";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/routers.ts
init_const();

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    // FIX: "lax" é mais seguro e robusto que "none" para a maioria das apps modernas
    // "none" exige estritamente secure: true, o que falha se o proxy não for detectado
    sameSite: "lax",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
init_notification();
import { z } from "zod";

// server/_core/trpc.ts
init_const();
import { initTRPC, TRPCError as TRPCError3 } from "@trpc/server";
import superjson from "superjson";

// server/middleware/rateLimiter.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
var rateLimitStore = /* @__PURE__ */ new Map();
var RATE_LIMITS = {
  default: { maxRequests: 100, windowMs: 6e4 },
  // 100 requests per minute
  auth: { maxRequests: 5, windowMs: 6e4 },
  // 5 auth attempts per minute
  upload: { maxRequests: 10, windowMs: 6e4 },
  // 10 uploads per minute
  payment: { maxRequests: 3, windowMs: 3e5 }
  // 3 payments per 5 minutes
};
function rateLimiter(identifier, type = "default") {
  const limit = RATE_LIMITS[type];
  const now = Date.now();
  const key = `${type}:${identifier}`;
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.windowMs
    });
    return;
  }
  if (entry.count >= limit.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1e3);
    throw new TRPCError2({
      code: "TOO_MANY_REQUESTS",
      message: `Muitas requisi\xE7\xF5es. Tente novamente em ${retryAfter} segundos.`
    });
  }
  entry.count++;
  rateLimitStore.set(key, entry);
}
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 3e5);

// server/_core/trpc.ts
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var rateLimitMiddleware = t.middleware(async (opts) => {
  const { ctx, path: path3 } = opts;
  const identifier = ctx.user?.id?.toString() || ctx.req.ip || "anonymous";
  if (path3.includes("auth.login") || path3.includes("auth.register")) {
    rateLimiter(identifier, "auth");
  } else if (path3.includes("upload")) {
    rateLimiter(identifier, "upload");
  } else if (path3.includes("payment") || path3.includes("checkout")) {
    rateLimiter(identifier, "payment");
  } else {
    rateLimiter(identifier, "default");
  }
  return opts.next();
});
var publicProcedure = t.procedure.use(rateLimitMiddleware);
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError3({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(rateLimitMiddleware).use(requireUser);
var adminProcedure = t.procedure.use(rateLimitMiddleware).use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
init_db();
init_storage();
init_notification();
init_adminLogger();
init_changeTracker();
import { TRPCError as TRPCError4 } from "@trpc/server";
import { z as z3 } from "zod";

// server/_core/llm.ts
init_env();
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  payload.max_tokens = 32768;
  payload.thinking = {
    "budget_tokens": 128
  };
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/routers.ts
init_notificationService();

// server/jobs/vaccineNotifications.ts
init_db();
init_schema();
init_whatsappService();
import { and as and2, eq as eq4, gte as gte2, lte as lte2, isNotNull as isNotNull2 } from "drizzle-orm";
async function checkUpcomingVaccines() {
  const db2 = await getDb();
  if (!db2) {
    console.error("[VaccineNotifications] Database not available");
    return { success: false, error: "Database not available" };
  }
  try {
    const today = /* @__PURE__ */ new Date();
    const sevenDaysFromNow = /* @__PURE__ */ new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const upcomingVaccines = await db2.select({
      vaccination: petVaccinations,
      pet: pets,
      vaccine: vaccineLibrary
    }).from(petVaccinations).innerJoin(pets, eq4(petVaccinations.petId, pets.id)).innerJoin(vaccineLibrary, eq4(petVaccinations.vaccineId, vaccineLibrary.id)).where(
      and2(
        isNotNull2(petVaccinations.nextDueDate),
        gte2(petVaccinations.nextDueDate, today),
        lte2(petVaccinations.nextDueDate, sevenDaysFromNow)
      )
    );
    console.log(`[VaccineNotifications] Found ${upcomingVaccines.length} upcoming vaccines`);
    const notifications2 = [];
    for (const { vaccination, pet, vaccine } of upcomingVaccines) {
      try {
        const tutorRelations = await db2.select({
          tutor: users,
          isPrimary: petTutors.isPrimary
        }).from(petTutors).innerJoin(users, eq4(petTutors.tutorId, users.id)).where(eq4(petTutors.petId, pet.id)).orderBy(petTutors.isPrimary);
        if (tutorRelations.length === 0) {
          console.warn(`[VaccineNotifications] No tutors found for pet ${pet.name}`);
          continue;
        }
        const primaryTutor = tutorRelations.find((t2) => t2.isPrimary)?.tutor || tutorRelations[0].tutor;
        if (!primaryTutor.email) {
          console.warn(`[VaccineNotifications] No email for tutor of pet ${pet.name}`);
          continue;
        }
        const dueDate = new Date(vaccination.nextDueDate);
        const formattedDate = dueDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
        const message = `\u{1F514} *Lembrete de Vacina*

Ol\xE1 ${primaryTutor.name || "Tutor"}!

A vacina *${vaccine.name}* do seu pet *${pet.name}* est\xE1 pr\xF3xima do vencimento.

\u{1F4C5} Data prevista: ${formattedDate}
\u23F0 Faltam ${daysUntil} ${daysUntil === 1 ? "dia" : "dias"}

Por favor, agende a aplica\xE7\xE3o com anteced\xEAncia para manter a sa\xFAde do seu pet em dia! \u{1F43E}`;
        let whatsappSent = false;
        try {
          const result = await sendTextMessage(
            primaryTutor.email,
            // Assuming email is used as phone identifier
            message,
            primaryTutor.name || void 0
          );
          whatsappSent = result.success;
        } catch (error) {
          console.error(`[VaccineNotifications] WhatsApp error for ${pet.name}:`, error);
        }
        notifications2.push({
          success: whatsappSent,
          petName: pet.name,
          vaccineName: vaccine.name
        });
        console.log(
          `[VaccineNotifications] Notification ${whatsappSent ? "sent" : "failed"} for ${pet.name} - ${vaccine.name}`
        );
      } catch (error) {
        console.error(`[VaccineNotifications] Error processing vaccine for ${pet.name}:`, error);
        notifications2.push({
          success: false,
          petName: pet.name,
          vaccineName: "Unknown"
        });
      }
    }
    return {
      success: true,
      totalVaccines: upcomingVaccines.length,
      notifications: notifications2
    };
  } catch (error) {
    console.error("[VaccineNotifications] Error checking vaccines:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function triggerVaccineNotificationsManually() {
  console.log("[VaccineNotifications] Manual trigger started");
  const result = await checkUpcomingVaccines();
  console.log("[VaccineNotifications] Manual trigger completed:", result);
  return result;
}

// server/products.ts
var PRODUCTS = {
  // Monthly Plans
  PLAN_BASIC: {
    name: "Plano B\xE1sico",
    description: "At\xE9 5 visitas por m\xEAs",
    priceId: "price_basic_monthly",
    // Replace with actual Stripe Price ID
    amount: 19900,
    // R$ 199.00 in cents
    currency: "brl",
    interval: "month",
    features: [
      "At\xE9 5 visitas por m\xEAs",
      "Relat\xF3rios di\xE1rios",
      "Fotos ilimitadas",
      "Suporte por email"
    ]
  },
  PLAN_STANDARD: {
    name: "Plano Padr\xE3o",
    description: "At\xE9 12 visitas por m\xEAs",
    priceId: "price_standard_monthly",
    amount: 39900,
    // R$ 399.00
    currency: "brl",
    interval: "month",
    features: [
      "At\xE9 12 visitas por m\xEAs",
      "Relat\xF3rios di\xE1rios",
      "Fotos ilimitadas",
      "Assistente IA",
      "Suporte priorit\xE1rio"
    ]
  },
  PLAN_PREMIUM: {
    name: "Plano Premium",
    description: "Visitas ilimitadas",
    priceId: "price_premium_monthly",
    amount: 69900,
    // R$ 699.00
    currency: "brl",
    interval: "month",
    features: [
      "Visitas ilimitadas",
      "Relat\xF3rios di\xE1rios",
      "Fotos ilimitadas",
      "Assistente IA",
      "Analytics avan\xE7ado",
      "Suporte 24/7"
    ]
  },
  // Credit Packages
  CREDITS_10: {
    name: "Pacote 10 Cr\xE9ditos",
    description: "10 di\xE1rias avulsas",
    priceId: "price_credits_10",
    amount: 25e3,
    // R$ 250.00
    currency: "brl",
    credits: 10
  },
  CREDITS_20: {
    name: "Pacote 20 Cr\xE9ditos",
    description: "20 di\xE1rias avulsas",
    priceId: "price_credits_20",
    amount: 45e3,
    // R$ 450.00 (10% discount)
    currency: "brl",
    credits: 20
  },
  CREDITS_50: {
    name: "Pacote 50 Cr\xE9ditos",
    description: "50 di\xE1rias avulsas",
    priceId: "price_credits_50",
    amount: 1e5,
    // R$ 1000.00 (20% discount)
    currency: "brl",
    credits: 50
  }
};

// server/searchRouter.ts
init_db();
init_schema();
import { z as z2 } from "zod";
import { or as or2, like as like2 } from "drizzle-orm";
var searchRouter = router({
  global: protectedProcedure.input(z2.object({
    query: z2.string().min(2)
  })).query(async ({ input, ctx }) => {
    const db2 = await getDb();
    if (!db2) {
      throw new Error("Database not available");
    }
    const searchTerm = `%${input.query}%`;
    const petsResults = await db2.select().from(pets).where(
      or2(
        like2(pets.name, searchTerm),
        like2(pets.breed, searchTerm),
        like2(pets.species, searchTerm)
      )
    ).limit(5);
    const tutorsResults = await db2.select().from(users).where(
      or2(
        like2(users.name, searchTerm),
        like2(users.email, searchTerm)
      )
    ).limit(5);
    const eventsResults = await db2.select().from(calendarEvents).where(
      or2(
        like2(calendarEvents.title, searchTerm),
        like2(calendarEvents.notes, searchTerm)
      )
    ).limit(5);
    const documentsResults = await db2.select().from(documents).where(
      or2(
        like2(documents.title, searchTerm),
        like2(documents.type, searchTerm)
      )
    ).limit(5);
    return {
      pets: petsResults,
      tutors: tutorsResults,
      events: eventsResults,
      documents: documentsResults
    };
  })
});

// server/routers.ts
init_stripeWebhook();
var adminProcedure2 = protectedProcedure.use(async ({ ctx, next, path: path3 }) => {
  const isAdmin = ctx.user.role === "admin";
  try {
    await createAuditLog({
      userId: ctx.user.id,
      action: path3,
      success: isAdmin,
      errorCode: isAdmin ? null : "FORBIDDEN",
      ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"] || null,
      userAgent: ctx.req.headers["user-agent"] || null
    });
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
  if (!isAdmin) {
    throw new TRPCError4({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
    /**
     * Register new user with email/password
     */
    register: publicProcedure.input(z3.object({
      name: z3.string().min(1),
      email: z3.string().email(),
      password: z3.string().min(6),
      role: z3.enum(["user", "admin"]).optional()
    })).mutation(async ({ input, ctx }) => {
      const { registerUser: registerUser2, generateVerificationToken: generateVerificationToken2 } = await Promise.resolve().then(() => (init_emailAuth(), emailAuth_exports));
      const { sdk: sdk2 } = await Promise.resolve().then(() => (init_sdk(), sdk_exports));
      const user = await registerUser2(input);
      const verificationResult = await generateVerificationToken2(user.id);
      await notifyOwner({
        title: "New User Registration - Email Verification",
        content: `User ${user.name} (${input.email}) registered. Verification token: ${verificationResult.token}`
      });
      const sessionToken = await sdk2.createSessionToken(String(user.id), {
        name: user.name,
        expiresInMs: 365 * 24 * 60 * 60 * 1e3
        // 1 year
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
      return { success: true, user };
    }),
    /**
     * Login with email/password
     */
    login: publicProcedure.input(z3.object({
      email: z3.string().email(),
      password: z3.string()
    })).mutation(async ({ input, ctx }) => {
      const { loginUser: loginUser2 } = await Promise.resolve().then(() => (init_emailAuth(), emailAuth_exports));
      const { sdk: sdk2 } = await Promise.resolve().then(() => (init_sdk(), sdk_exports));
      const user = await loginUser2(input);
      const sessionToken = await sdk2.createSessionToken(String(user.id), {
        name: user.name || user.email || void 0,
        expiresInMs: 365 * 24 * 60 * 60 * 1e3
        // 1 year
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
      return { success: true, user };
    }),
    /**
     * Change password (protected)
     */
    changePassword: protectedProcedure.input(z3.object({
      oldPassword: z3.string(),
      newPassword: z3.string().min(6)
    })).mutation(async ({ input, ctx }) => {
      const { changePassword: changePassword2 } = await Promise.resolve().then(() => (init_emailAuth(), emailAuth_exports));
      return await changePassword2(ctx.user.id, input.oldPassword, input.newPassword);
    }),
    /**
     * Request password reset (public)
     */
    requestPasswordReset: publicProcedure.input(z3.object({
      email: z3.string().email()
    })).mutation(async ({ input }) => {
      const { generateResetToken: generateResetToken2 } = await Promise.resolve().then(() => (init_emailAuth(), emailAuth_exports));
      const result = await generateResetToken2(input.email);
      if (result.token && result.email) {
        await notifyOwner({
          title: "Password Reset Requested",
          content: `User ${result.name} (${result.email}) requested a password reset. Token: ${result.token}`
        });
      }
      return { success: true };
    }),
    /**
     * Reset password with token (public)
     */
    resetPassword: publicProcedure.input(z3.object({
      token: z3.string(),
      newPassword: z3.string().min(6)
    })).mutation(async ({ input }) => {
      const { resetPassword: resetPassword2 } = await Promise.resolve().then(() => (init_emailAuth(), emailAuth_exports));
      return await resetPassword2(input.token, input.newPassword);
    }),
    /**
     * Request email verification (protected)
     */
    requestEmailVerification: protectedProcedure.mutation(async ({ ctx }) => {
      const { generateVerificationToken: generateVerificationToken2 } = await Promise.resolve().then(() => (init_emailAuth(), emailAuth_exports));
      const result = await generateVerificationToken2(ctx.user.id);
      await notifyOwner({
        title: "Email Verification Requested",
        content: `User ${ctx.user.name} (${ctx.user.email}) requested email verification. Token: ${result.token}`
      });
      return { success: true };
    }),
    /**
     * Verify email with token (public)
     */
    verifyEmail: publicProcedure.input(z3.object({
      token: z3.string()
    })).mutation(async ({ input }) => {
      const { verifyEmail: verifyEmail2 } = await Promise.resolve().then(() => (init_emailAuth(), emailAuth_exports));
      return await verifyEmail2(input.token);
    }),
    /**
     * Update user profile (protected)
     */
    updateProfile: protectedProcedure.input(z3.object({
      name: z3.string().optional(),
      phone: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      await updateUser(ctx.user.id, input);
      return { success: true };
    })
  }),
  // ==================== PET MANAGEMENT ====================
  pets: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        return await getAllPets();
      }
      return await getPetsByTutorId(ctx.user.id);
    }),
    listMine: protectedProcedure.query(async ({ ctx }) => {
      return await getPetsByTutorId(ctx.user.id);
    }),
    byId: protectedProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => {
      return await getPetById(input.id);
    }),
    byStatus: adminProcedure2.input(z3.object({ status: z3.enum(["checked-in", "checked-out"]) })).query(async ({ input }) => {
      return await getPetsByStatus(input.status);
    }),
    create: protectedProcedure.input(z3.object({
      name: z3.string().min(1, "Nome do pet \xE9 obrigat\xF3rio"),
      breed: z3.string().optional(),
      age: z3.string().optional(),
      weight: z3.number().optional(),
      birthDate: z3.string().optional(),
      foodBrand: z3.string().optional(),
      foodAmount: z3.number().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const birthDate = input.birthDate ? new Date(input.birthDate) : void 0;
      const petId = await createPet({
        ...input,
        birthDate,
        approvalStatus: ctx.user.role === "admin" ? "approved" : "pending"
      });
      await linkPetToTutor(petId, ctx.user.id, true);
      return { id: petId };
    }),
    updateMine: protectedProcedure.input(z3.object({
      id: z3.number(),
      name: z3.string().optional(),
      breed: z3.string().optional(),
      age: z3.string().optional(),
      weight: z3.number().optional(),
      birthDate: z3.string().optional(),
      foodBrand: z3.string().optional(),
      foodAmount: z3.number().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const userPets = await getPetsByTutorId(ctx.user.id);
      const pet = userPets.find((p) => p.id === id);
      if (!pet) {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Voc\xEA n\xE3o tem permiss\xE3o para editar este pet" });
      }
      if (pet.approvalStatus === "approved") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Pets aprovados n\xE3o podem ser editados. Entre em contato com a creche." });
      }
      const birthDate = data.birthDate ? new Date(data.birthDate) : void 0;
      await updatePet(id, {
        ...data,
        birthDate,
        approvalStatus: "pending"
        // Reset to pending after edit
      });
      return { success: true };
    }),
    updateAdmin: adminProcedure2.input(z3.object({
      id: z3.number(),
      name: z3.string().optional(),
      breed: z3.string().optional(),
      age: z3.string().optional(),
      weight: z3.number().optional(),
      birthDate: z3.date().optional(),
      photoUrl: z3.string().optional(),
      photoKey: z3.string().optional(),
      foodBrand: z3.string().optional(),
      foodAmount: z3.number().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await updatePet(id, data);
      if (data.weight || data.foodBrand || data.foodAmount) {
        const changes = [];
        if (data.weight) changes.push(`Peso: ${data.weight}kg`);
        if (data.foodBrand) changes.push(`Ra\xE7\xE3o: ${data.foodBrand}`);
        if (data.foodAmount) changes.push(`Quantidade: ${data.foodAmount}g`);
        await logChange({
          resourceType: "pet_data",
          resourceId: id,
          petId: id,
          fieldName: "pet_info_updated",
          oldValue: null,
          newValue: changes.join(", "),
          changedBy: ctx.user.id,
          changedByRole: ctx.user.role,
          changeType: "update"
        });
      }
      return { success: true };
    }),
    delete: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deletePet(input.id);
      return { success: true };
    }),
    checkIn: adminProcedure2.input(z3.object({ petId: z3.number() })).mutation(async ({ input }) => {
      const now = /* @__PURE__ */ new Date();
      await updatePet(input.petId, {
        status: "checked-in",
        checkInTime: now
      });
      await notifyCheckIn(input.petId);
      return { success: true };
    }),
    checkOut: adminProcedure2.input(z3.object({ petId: z3.number() })).mutation(async ({ input }) => {
      const now = /* @__PURE__ */ new Date();
      await updatePet(input.petId, {
        status: "checked-out",
        checkOutTime: now
      });
      await notifyCheckOut(input.petId);
      return { success: true };
    }),
    getWeightHistory: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      const logs = await getPetLogs(input.petId);
      return logs.filter((log) => log.weight).map((log) => ({
        date: log.logDate,
        weight: log.weight
      }));
    }),
    getMoodHistory: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      const logs = await getPetLogs(input.petId);
      return logs.filter((log) => log.mood).map((log) => ({
        date: log.logDate,
        mood: log.mood
      }));
    }),
    getFrequencyStats: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      const logs = await getPetLogs(input.petId);
      const daycareLog = logs.filter((log) => log.location === "daycare");
      const monthlyFrequency = {};
      daycareLog.forEach((log) => {
        const date2 = new Date(log.logDate);
        const monthKey = `${date2.getFullYear()}-${String(date2.getMonth() + 1).padStart(2, "0")}`;
        monthlyFrequency[monthKey] = (monthlyFrequency[monthKey] || 0) + 1;
      });
      return Object.entries(monthlyFrequency).map(([month, count2]) => ({
        month: (/* @__PURE__ */ new Date(month + "-01")).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        frequency: count2
      })).sort((a, b) => a.month.localeCompare(b.month));
    }),
    uploadPhoto: protectedProcedure.input(z3.object({
      petId: z3.number(),
      fileName: z3.string(),
      fileContent: z3.string(),
      // base64
      mimeType: z3.string()
    })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        const userPets = await getPetsByTutorId(ctx.user.id);
        const hasAccess = userPets.some((p) => p.id === input.petId);
        if (!hasAccess) {
          throw new TRPCError4({ code: "FORBIDDEN", message: "Access denied" });
        }
      }
      const buffer = Buffer.from(input.fileContent, "base64");
      const timestamp2 = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const extension = input.fileName.split(".").pop();
      const fileKey = `pets/${input.petId}/profile-${timestamp2}-${randomSuffix}.${extension}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      await updatePet(input.petId, {
        photoUrl: url,
        photoKey: fileKey
      });
      return { photoUrl: url };
    }),
    listPending: adminProcedure2.query(async () => {
      const pets2 = await getPetsByApprovalStatus("pending");
      const enrichedPets = await Promise.all(
        pets2.map(async (pet) => {
          const tutors = await getPetTutors(pet.id);
          const primaryTutor = tutors.find((t2) => t2.isPrimary) || tutors[0];
          return {
            ...pet,
            tutorName: primaryTutor?.tutor?.name || "Desconhecido",
            tutorId: primaryTutor?.tutor?.id
          };
        })
      );
      return enrichedPets;
    }),
    approve: adminProcedure2.input(z3.object({ petId: z3.number() })).mutation(async ({ input }) => {
      await updatePet(input.petId, {
        approvalStatus: "approved"
      });
      return { success: true };
    }),
    reject: adminProcedure2.input(z3.object({ petId: z3.number() })).mutation(async ({ input }) => {
      await updatePet(input.petId, {
        approvalStatus: "rejected"
      });
      return { success: true };
    })
  }),
  // ==================== PET CHECK-IN/OUT ====================
  checkin: router({
    checkIn: adminProcedure2.input(z3.object({ petId: z3.number() })).mutation(async ({ input }) => {
      const balance = await getTotalCredits(input.petId);
      if (balance <= 0) {
        throw new TRPCError4({
          code: "PRECONDITION_FAILED",
          message: "Pet n\xE3o possui cr\xE9ditos suficientes para check-in. Por favor, adicione cr\xE9ditos antes de fazer o check-in."
        });
      }
      const now = /* @__PURE__ */ new Date();
      const creditId = await consumeCredit(input.petId);
      await addDaycareUsage({
        petId: input.petId,
        usageDate: now,
        checkInTime: now,
        creditId
      });
      await updatePet(input.petId, {
        status: "checked-in",
        checkInTime: now
      });
      await notifyCheckIn(input.petId);
      const remainingCredits = await getTotalCredits(input.petId);
      return {
        success: true,
        remainingCredits,
        message: `Check-in realizado! Cr\xE9ditos restantes: ${remainingCredits}`
      };
    }),
    checkOut: adminProcedure2.input(z3.object({ petId: z3.number() })).mutation(async ({ input }) => {
      const now = /* @__PURE__ */ new Date();
      await updatePet(input.petId, {
        status: "checked-out",
        checkOutTime: now
      });
      await notifyCheckOut(input.petId);
      return { success: true };
    }),
    // Analytics endpoints
    getWeightHistory: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return getWeightHistory(input.petId);
    }),
    getMoodHistory: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return getMoodHistory(input.petId);
    }),
    getFrequencyStats: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return getFrequencyStats(input.petId);
    })
  }),
  // ==================== PET-TUTOR RELATIONSHIPS ====================
  petTutors: router({
    getTutors: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return await getPetTutors(input.petId);
    }),
    getTutorsByPet: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return await getPetTutorsWithDetails(input.petId);
    }),
    searchUserByEmail: adminProcedure2.input(z3.object({ email: z3.string() })).mutation(async ({ input }) => {
      return await getUserByEmail(input.email);
    }),
    linkTutor: adminProcedure2.input(z3.object({
      petId: z3.number(),
      tutorId: z3.number(),
      isPrimary: z3.boolean().default(false)
    })).mutation(async ({ input }) => {
      await addPetTutor(input);
      return { success: true };
    }),
    unlinkTutor: adminProcedure2.input(z3.object({
      petId: z3.number(),
      tutorId: z3.number()
    })).mutation(async ({ input }) => {
      await removePetTutor(input.petId, input.tutorId);
      return { success: true };
    }),
    setPrimary: adminProcedure2.input(z3.object({
      petId: z3.number(),
      tutorId: z3.number()
    })).mutation(async ({ input }) => {
      await setPrimaryTutor(input.petId, input.tutorId);
      return { success: true };
    }),
    addTutor: adminProcedure2.input(z3.object({
      petId: z3.number(),
      tutorId: z3.number(),
      isPrimary: z3.boolean().default(false)
    })).mutation(async ({ input }) => {
      await addPetTutor(input);
      return { success: true };
    }),
    removeTutor: adminProcedure2.input(z3.object({
      petId: z3.number(),
      tutorId: z3.number()
    })).mutation(async ({ input }) => {
      await removePetTutor(input.petId, input.tutorId);
      return { success: true };
    })
  }),
  // ==================== USERS/TUTORS ====================
  users: router({
    list: adminProcedure2.query(async () => {
      return await getAllUsers();
    }),
    tutors: adminProcedure2.query(async () => {
      return await getUsersByRole("user");
    })
  }),
  // ==================== DAYCARE CREDITS ====================
  credits: router({
    // Package management
    getPackages: protectedProcedure.query(async () => {
      return await getActivePackages();
    }),
    purchasePackage: protectedProcedure.input(z3.object({
      petId: z3.number(),
      packageId: z3.number()
    })).mutation(async ({ input, ctx }) => {
      const pkg = await getPackageById(input.packageId);
      if (!pkg) {
        throw new Error("Pacote n\xE3o encontrado");
      }
      const creditId = await addDaycareCredit({
        petId: input.petId,
        packageDays: pkg.credits,
        packagePrice: pkg.priceInCents,
        remainingDays: pkg.credits
      });
      await addTransaction({
        petId: input.petId,
        type: "credit",
        category: "daycare_package",
        description: `${pkg.name} - ${pkg.credits} cr\xE9ditos`,
        amount: pkg.priceInCents,
        transactionDate: /* @__PURE__ */ new Date(),
        createdById: ctx.user.id
      });
      return { success: true, creditId, credits: pkg.credits };
    }),
    getBalance: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return await getTotalCredits(input.petId);
    }),
    getHistory: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return await getPetCredits(input.petId);
    }),
    getUsageHistory: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return await getPetUsageHistory(input.petId);
    }),
    addPackage: adminProcedure2.input(z3.object({
      petId: z3.number(),
      packageDays: z3.number(),
      packagePrice: z3.number(),
      expiryDate: z3.date().optional()
    })).mutation(async ({ input, ctx }) => {
      const creditId = await addDaycareCredit({
        ...input,
        remainingDays: input.packageDays
      });
      await addTransaction({
        petId: input.petId,
        type: "credit",
        category: "daycare_package",
        description: `Pacote de ${input.packageDays} dias`,
        amount: input.packagePrice,
        transactionDate: /* @__PURE__ */ new Date(),
        createdById: ctx.user.id
      });
      return { id: creditId };
    }),
    getTransactions: adminProcedure2.query(async () => {
      return await getAllTransactions();
    }),
    getStats: adminProcedure2.query(async () => {
      const transactions2 = await getAllTransactions();
      const now = /* @__PURE__ */ new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyTransactions = transactions2.filter(
        (t2) => new Date(t2.transactionDate) >= firstDayOfMonth
      );
      const monthlyRevenue = monthlyTransactions.filter((t2) => t2.type === "credit" || t2.type === "income").reduce((sum, t2) => sum + t2.amount, 0);
      const monthlyExpenses = monthlyTransactions.filter((t2) => t2.type === "expense").reduce((sum, t2) => sum + t2.amount, 0);
      const pets2 = await getAllPets();
      const petsWithCredits = pets2.filter((p) => (p.credits || 0) > 0).length;
      const totalActiveCredits = pets2.reduce((sum, p) => sum + (p.credits || 0), 0);
      return {
        monthlyRevenue,
        monthlyExpenses,
        petsWithCredits,
        totalActiveCredits
      };
    }),
    add: adminProcedure2.input(z3.object({
      petId: z3.number(),
      amount: z3.number(),
      description: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      await updatePetCredits(input.petId, input.amount);
      await addTransaction({
        petId: input.petId,
        type: "credit",
        category: "daycare_credits",
        description: input.description || `Adi\xE7\xE3o de ${input.amount} cr\xE9ditos`,
        amount: input.amount * 50,
        // Assuming R$50 per credit
        transactionDate: /* @__PURE__ */ new Date(),
        createdById: ctx.user.id
      });
      return { success: true };
    }),
    addTransaction: adminProcedure2.input(z3.object({
      petId: z3.number().optional(),
      amount: z3.number(),
      type: z3.enum(["income", "expense", "credit"]),
      category: z3.string(),
      description: z3.string()
    })).mutation(async ({ input, ctx }) => {
      const id = await addTransaction({
        ...input,
        transactionDate: /* @__PURE__ */ new Date(),
        createdById: ctx.user.id
      });
      return { id };
    })
  }),
  // ==================== VACCINES ====================
  vaccines: router({
    library: publicProcedure.query(async () => {
      return await getVaccineLibrary();
    }),
    addToLibrary: adminProcedure2.input(z3.object({
      name: z3.string(),
      description: z3.string().optional(),
      intervalDays: z3.number().optional(),
      dosesRequired: z3.number().default(1)
    })).mutation(async ({ input }) => {
      const id = await addVaccineToLibrary(input);
      return { id };
    }),
    getPetVaccinations: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return await getPetVaccinations(input.petId);
    }),
    addVaccination: protectedProcedure.input(z3.object({
      petId: z3.number(),
      vaccineId: z3.number(),
      applicationDate: z3.date(),
      nextDueDate: z3.date().optional(),
      doseNumber: z3.number().default(1),
      veterinarian: z3.string().optional(),
      clinic: z3.string().optional(),
      batchNumber: z3.string().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const id = await addPetVaccination(input);
      const { logChange: logChange2 } = await Promise.resolve().then(() => (init_changeTracker(), changeTracker_exports));
      await logChange2({
        resourceType: "preventive",
        resourceId: id,
        petId: input.petId,
        fieldName: "vaccine_added",
        oldValue: null,
        newValue: `Dose ${input.doseNumber}${input.veterinarian ? ", Vet: " + input.veterinarian : ""}`,
        changedBy: ctx.user.id,
        changedByRole: ctx.user.role,
        changeType: "create"
      });
      const vaccines = await getVaccineLibrary();
      const vaccine = vaccines.find((v) => v.id === input.vaccineId);
      const vaccineName = vaccine?.name || "Vacina";
      await autoCreateVaccineEvent(
        input.petId,
        id,
        vaccineName,
        input.applicationDate,
        input.doseNumber,
        input.veterinarian,
        input.clinic,
        ctx.user.id
      );
      if (input.nextDueDate) {
        await autoCreateVaccineEvent(
          input.petId,
          id,
          vaccineName,
          input.nextDueDate,
          input.doseNumber + 1,
          input.veterinarian,
          input.clinic,
          ctx.user.id
        );
      }
      return { id };
    }),
    upcoming: adminProcedure2.input(z3.object({ daysAhead: z3.number().default(30) })).query(async ({ input }) => {
      return await getUpcomingVaccinations(input.daysAhead);
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      petId: z3.number(),
      nextDueDate: z3.date().optional(),
      veterinarian: z3.string().optional(),
      clinic: z3.string().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const { id, petId, ...data } = input;
      await updatePetVaccination(id, data);
      const changes = [];
      if (data.nextDueDate) {
        changes.push(`Pr\xF3xima dose: ${data.nextDueDate.toLocaleDateString("pt-BR")}`);
      }
      if (data.veterinarian) {
        changes.push(`Veterin\xE1rio: ${data.veterinarian}`);
      }
      if (data.clinic) {
        changes.push(`Cl\xEDnica: ${data.clinic}`);
      }
      if (data.notes) {
        changes.push(`Observa\xE7\xF5es atualizadas`);
      }
      if (changes.length > 0) {
        await logChange({
          resourceType: "preventive",
          resourceId: id,
          petId,
          fieldName: "vaccination_updated",
          oldValue: null,
          newValue: changes.join(", "),
          changedBy: ctx.user.id,
          changedByRole: ctx.user.role,
          changeType: "update"
        });
      }
      return { success: true };
    }),
    delete: protectedProcedure.input(z3.object({
      id: z3.number(),
      petId: z3.number()
    })).mutation(async ({ input, ctx }) => {
      await deletePetVaccination(input.id);
      const { logChange: logChange2 } = await Promise.resolve().then(() => (init_changeTracker(), changeTracker_exports));
      await logChange2({
        resourceType: "preventive",
        resourceId: input.id,
        petId: input.petId,
        fieldName: "vaccination_deleted",
        oldValue: null,
        newValue: "Vacina\xE7\xE3o removida",
        changedBy: ctx.user.id,
        changedByRole: ctx.user.role,
        changeType: "delete"
      });
      return { success: true };
    })
  }),
  // ==================== MEDICATIONS ====================
  medications: router({
    library: publicProcedure.query(async () => {
      return await getMedicationLibrary();
    }),
    addToLibrary: adminProcedure2.input(z3.object({
      name: z3.string(),
      type: z3.string(),
      // Changed from enum to string to allow custom medication types
      description: z3.string().optional(),
      commonDosage: z3.string().optional()
    })).mutation(async ({ input }) => {
      const id = await addMedicationToLibrary(input);
      return { id };
    }),
    getPetMedications: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return await getPetMedications(input.petId);
    }),
    getActive: protectedProcedure.input(z3.object({ petId: z3.number().optional() })).query(async ({ input }) => {
      if (input.petId) {
        return await getActiveMedications(input.petId);
      }
      return await getAllActiveMedications();
    }),
    add: protectedProcedure.input(z3.object({
      petId: z3.number(),
      medicationId: z3.number().optional(),
      // Custom medication fields (when tutor creates new medication)
      customMedName: z3.string().optional(),
      customMedType: z3.string().optional(),
      customMedDescription: z3.string().optional(),
      startDate: z3.date(),
      endDate: z3.date().optional(),
      dosage: z3.string(),
      frequency: z3.string().optional(),
      administrationTimes: z3.string().optional(),
      // JSON string of times array
      // Advanced periodicity fields
      periodicity: z3.enum(["daily", "weekly", "monthly", "custom"]).optional(),
      customInterval: z3.number().optional(),
      weekDays: z3.array(z3.number().min(0).max(6)).optional(),
      monthDays: z3.array(z3.number().min(1).max(31)).optional(),
      autoSchedule: z3.boolean().optional(),
      // Dosage progression fields
      dosageProgression: z3.enum(["stable", "increase", "decrease"]).optional(),
      progressionRate: z3.string().optional(),
      progressionInterval: z3.number().optional(),
      targetDosage: z3.string().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      let medicationId = input.medicationId;
      if (input.customMedName && input.customMedType) {
        medicationId = await addMedicationToLibrary({
          name: input.customMedName,
          type: input.customMedType,
          description: input.customMedDescription
        });
      }
      if (!medicationId) {
        throw new Error("Medicamento n\xE3o especificado");
      }
      const medicationData = {
        ...input,
        medicationId,
        weekDays: input.weekDays ? JSON.stringify(input.weekDays) : void 0,
        monthDays: input.monthDays ? JSON.stringify(input.monthDays) : void 0,
        isActive: true
      };
      const id = await addPetMedication(medicationData);
      const { logChange: logChange2 } = await Promise.resolve().then(() => (init_changeTracker(), changeTracker_exports));
      await logChange2({
        resourceType: "medication",
        resourceId: id,
        petId: input.petId,
        fieldName: "medication_added",
        oldValue: null,
        newValue: `Dosagem: ${input.dosage}${input.frequency ? ", Frequ\xEAncia: " + input.frequency : ""}`,
        changedBy: ctx.user.id,
        changedByRole: ctx.user.role,
        changeType: "create"
      });
      const medName = input.customMedName || (await getMedicationLibrary()).find((m) => m.id === medicationId)?.name || "Medicamento";
      await autoCreateMedicationPeriod(
        input.petId,
        id,
        medName,
        input.startDate,
        input.endDate,
        input.dosage,
        input.frequency,
        ctx.user.id
      );
      return { id };
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      petId: z3.number(),
      dosage: z3.string().optional(),
      frequency: z3.string().optional(),
      startDate: z3.date().optional(),
      endDate: z3.date().optional(),
      administrationTimes: z3.string().optional(),
      isActive: z3.boolean().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const { id, petId, ...data } = input;
      await updatePetMedication(id, data);
      const { logChange: logChange2, serializeValue: serializeValue2 } = await Promise.resolve().then(() => (init_changeTracker(), changeTracker_exports));
      const changes = [];
      if (data.endDate) {
        changes.push(`Data final: ${data.endDate.toLocaleDateString("pt-BR")}`);
      }
      if (data.isActive !== void 0) {
        changes.push(`Status: ${data.isActive ? "Ativo" : "Finalizado"}`);
      }
      if (data.notes) {
        changes.push(`Notas atualizadas`);
      }
      if (changes.length > 0) {
        await logChange2({
          resourceType: "medication",
          resourceId: id,
          petId,
          fieldName: "medication_updated",
          oldValue: null,
          newValue: changes.join(", "),
          changedBy: ctx.user.id,
          changedByRole: ctx.user.role,
          changeType: "update"
        });
        if (ctx.user.role === "admin") {
          const pet = await getPetById(petId);
          const tutors = await getPetTutors(petId);
          const { sendChangeAlertNotification: sendChangeAlertNotification2 } = await Promise.resolve().then(() => (init_notificationService(), notificationService_exports));
          for (const tutor of tutors) {
            await sendChangeAlertNotification2({
              userId: tutor.tutor.id,
              petName: pet?.name || "Pet",
              resourceType: "medication",
              resourceName: "medicamento",
              changedBy: ctx.user.name || "Administrador",
              changedByRole: "admin",
              resourceId: id,
              petId
            });
          }
        }
      }
      return { success: true };
    }),
    scheduleNext: protectedProcedure.input(z3.object({
      medicationId: z3.number(),
      petId: z3.number()
    })).mutation(async ({ input, ctx }) => {
      const medications = await getPetMedications(input.petId);
      const medication = medications.find((m) => m.medication.id === input.medicationId);
      if (!medication) {
        throw new TRPCError4({ code: "NOT_FOUND", message: "Medicamento n\xE3o encontrado" });
      }
      const med = medication.medication;
      const { calculateNextDose: calculateNextDose2 } = await Promise.resolve().then(() => (init_medicationScheduler(), medicationScheduler_exports));
      const nextDate = calculateNextDose2(/* @__PURE__ */ new Date(), {
        periodicity: med.periodicity || "daily",
        customInterval: med.customInterval || void 0,
        weekDays: med.weekDays ? JSON.parse(med.weekDays) : void 0,
        monthDays: med.monthDays ? JSON.parse(med.monthDays) : void 0
      });
      if (!nextDate) {
        throw new TRPCError4({ code: "BAD_REQUEST", message: "N\xE3o foi poss\xEDvel calcular pr\xF3xima dose" });
      }
      const { calculateProgressiveDosage: calculateProgressiveDosage2 } = await Promise.resolve().then(() => (init_dosageProgression(), dosageProgression_exports));
      let currentDosage = med.dosage;
      if (med.dosageProgression && med.dosageProgression !== "stable") {
        currentDosage = calculateProgressiveDosage2(med.dosage, {
          dosageProgression: med.dosageProgression,
          progressionRate: med.progressionRate || "0",
          progressionInterval: med.progressionInterval || 1,
          targetDosage: med.targetDosage || void 0,
          currentDoseCount: med.currentDoseCount || 0
        });
      }
      const library = await getMedicationLibrary();
      const medInfo = library.find((m) => m.id === med.medicationId);
      const medName = medInfo?.name || "Medicamento";
      const eventId = await autoCreateMedicationEvent(
        input.petId,
        med.id,
        medName,
        nextDate,
        currentDosage,
        med.frequency || void 0,
        ctx.user.id
      );
      await updatePetMedication(med.id, {
        currentDoseCount: (med.currentDoseCount || 0) + 1
      });
      return {
        eventId,
        nextDate,
        dosage: currentDosage
      };
    }),
    delete: protectedProcedure.input(z3.object({
      id: z3.number(),
      petId: z3.number()
    })).mutation(async ({ input, ctx }) => {
      await deletePetMedication(input.id);
      const { logChange: logChange2 } = await Promise.resolve().then(() => (init_changeTracker(), changeTracker_exports));
      await logChange2({
        resourceType: "medication",
        resourceId: input.id,
        petId: input.petId,
        fieldName: "medication_deleted",
        oldValue: null,
        newValue: "Medicamento removido",
        changedBy: ctx.user.id,
        changedByRole: ctx.user.role,
        changeType: "delete"
      });
      return { success: true };
    })
  }),
  // ==================== DAILY LOGS ====================
  logs: router({
    add: protectedProcedure.input(z3.object({
      petId: z3.number(),
      logDate: z3.date(),
      source: z3.enum(["home", "daycare"]),
      mood: z3.enum(["feliz", "calmo", "ansioso", "triste", "agitado"]).optional(),
      stool: z3.enum(["normal", "diarreia", "constipado", "nao_fez"]).optional(),
      appetite: z3.enum(["normal", "aumentado", "diminuido", "nao_comeu"]).optional(),
      behavior: z3.string().optional(),
      behaviorNotes: z3.string().optional(),
      activities: z3.string().optional(),
      foodConsumed: z3.string().optional(),
      feedingTime: z3.string().optional(),
      feedingAmount: z3.string().optional(),
      feedingAcceptance: z3.enum(["excelente", "boa", "regular", "ruim", "recusou"]).optional(),
      weight: z3.number().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const id = await addDailyLog({
        ...input,
        createdById: ctx.user.id
      });
      return { id };
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      petId: z3.number(),
      logDate: z3.date(),
      source: z3.enum(["home", "daycare"]),
      mood: z3.enum(["feliz", "calmo", "ansioso", "triste", "agitado"]).optional(),
      stool: z3.enum(["normal", "diarreia", "constipado", "nao_fez"]).optional(),
      appetite: z3.enum(["normal", "aumentado", "diminuido", "nao_comeu"]).optional(),
      behavior: z3.string().optional(),
      behaviorNotes: z3.string().optional(),
      activities: z3.string().optional(),
      foodConsumed: z3.string().optional(),
      feedingTime: z3.string().optional(),
      feedingAmount: z3.string().optional(),
      feedingAcceptance: z3.enum(["excelente", "boa", "regular", "ruim", "recusou"]).optional(),
      weight: z3.number().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      await updateDailyLog(input.id, input);
      return { success: true };
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteDailyLog(input.id);
      return { success: true };
    }),
    getPetLogs: protectedProcedure.input(z3.object({
      petId: z3.number(),
      startDate: z3.date().optional(),
      endDate: z3.date().optional()
    })).query(async ({ input }) => {
      return await getPetLogs(input.petId, input.startDate, input.endDate);
    }),
    getByDate: adminProcedure2.input(z3.object({ date: z3.date() })).query(async ({ input }) => {
      return await getLogsByDate(input.date);
    }),
    list: adminProcedure2.input(z3.object({ petId: z3.number() }).optional()).query(async ({ input }) => {
      if (input?.petId) {
        return await getPetLogs(input.petId);
      }
      return await getAllLogs();
    }),
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const myPets = await getPetsByTutorId(ctx.user.id);
      const petIds = myPets.map((p) => p.id);
      const allLogs = [];
      for (const petId of petIds) {
        const logs = await getPetLogs(petId);
        allLogs.push(...logs);
      }
      return allLogs.sort(
        (a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime()
      );
    })
  }),
  // ==================== CALENDAR ====================
  calendar: router({
    getEvents: protectedProcedure.input(z3.object({
      startDate: z3.date(),
      endDate: z3.date()
    })).query(async ({ input }) => {
      return await getCalendarEvents(input.startDate, input.endDate);
    }),
    getPetEvents: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return await getPetEvents(input.petId);
    }),
    add: protectedProcedure.input(z3.object({
      title: z3.string(),
      description: z3.string().optional(),
      eventDate: z3.date(),
      endDate: z3.date().optional(),
      eventType: z3.enum(["holiday", "medical", "general", "vaccination", "medication", "closure", "checkin", "checkout", "preventive"]),
      petId: z3.number().optional(),
      location: z3.string().optional(),
      isAllDay: z3.boolean().default(true),
      // Multi-day stay period fields
      checkInDate: z3.date().optional(),
      checkOutDate: z3.date().optional()
    })).mutation(async ({ input, ctx }) => {
      let dailyCount;
      if (input.checkInDate && input.checkOutDate) {
        const { calculateDailyCount: calculateDailyCount2, validatePeriod: validatePeriod2 } = await Promise.resolve().then(() => (init_dailyPeriodHelper(), dailyPeriodHelper_exports));
        const validation = validatePeriod2(input.checkInDate, input.checkOutDate);
        if (!validation.valid) {
          throw new TRPCError4({ code: "BAD_REQUEST", message: validation.error });
        }
        dailyCount = calculateDailyCount2(input.checkInDate, input.checkOutDate);
      }
      const id = await addCalendarEvent({
        ...input,
        dailyCount,
        createdById: ctx.user.id
      });
      if (input.petId) {
        await logChange({
          resourceType: "calendar",
          resourceId: id,
          petId: input.petId,
          fieldName: "event_added",
          oldValue: null,
          newValue: `${input.title} - ${input.eventType}`,
          changedBy: ctx.user.id,
          changedByRole: ctx.user.role,
          changeType: "create"
        });
      }
      return { id };
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      petId: z3.number().optional(),
      title: z3.string().optional(),
      description: z3.string().optional(),
      eventDate: z3.date().optional(),
      endDate: z3.date().optional(),
      eventType: z3.enum(["holiday", "medical", "general", "vaccination", "medication", "closure", "checkin", "checkout", "preventive"]).optional(),
      location: z3.string().optional(),
      isAllDay: z3.boolean().optional()
    })).mutation(async ({ input, ctx }) => {
      const { id, petId, ...data } = input;
      await updateCalendarEvent(id, data);
      if (petId && Object.keys(data).length > 0) {
        await logChange({
          resourceType: "calendar",
          resourceId: id,
          petId,
          fieldName: "event_updated",
          oldValue: null,
          newValue: JSON.stringify(data),
          changedBy: ctx.user.id,
          changedByRole: ctx.user.role,
          changeType: "update"
        });
      }
      return { success: true };
    }),
    delete: protectedProcedure.input(z3.object({
      id: z3.number(),
      petId: z3.number().optional(),
      title: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      await deleteCalendarEvent(input.id);
      if (input.petId) {
        await logChange({
          resourceType: "calendar",
          resourceId: input.id,
          petId: input.petId,
          fieldName: "event_deleted",
          oldValue: input.title || "Event",
          newValue: null,
          changedBy: ctx.user.id,
          changedByRole: ctx.user.role,
          changeType: "delete"
        });
      }
      return { success: true };
    }),
    exportToICal: protectedProcedure.input(z3.object({
      startDate: z3.date(),
      endDate: z3.date()
    })).mutation(async ({ input }) => {
      const { exportEventsToICal: exportEventsToICal2 } = await Promise.resolve().then(() => (init_icalExport(), icalExport_exports));
      const icalContent = await exportEventsToICal2(input.startDate, input.endDate);
      return { icalContent };
    })
  }),
  // ==================== DOCUMENTS ====================
  documents: router({
    listAll: adminProcedure2.input(z3.object({
      petId: z3.number().optional(),
      category: z3.enum(["vaccination_card", "veterinary_document", "exam", "certificate", "prescription", "other"]).optional()
    })).query(async ({ input }) => {
      return await getAllDocuments(input.petId, input.category);
    }),
    getPetDocuments: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return await getPetDocuments(input.petId);
    }),
    getByCategory: protectedProcedure.input(z3.object({
      petId: z3.number(),
      category: z3.enum(["vaccination_card", "veterinary_document", "exam", "certificate", "prescription", "other"])
    })).query(async ({ input }) => {
      return await getDocumentsByCategory(input.petId, input.category);
    }),
    upload: protectedProcedure.input(z3.object({
      petId: z3.number(),
      title: z3.string(),
      description: z3.string().optional(),
      category: z3.enum(["vaccination_card", "veterinary_document", "exam", "certificate", "prescription", "other"]),
      fileData: z3.string(),
      fileName: z3.string(),
      mimeType: z3.string()
    })).mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.fileData.split(",")[1] || input.fileData, "base64");
      const ext = input.fileName.split(".").pop() || "bin";
      const fileKey = `pets/${input.petId}/documents/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      const id = await addDocument({
        petId: input.petId,
        title: input.title,
        description: input.description,
        category: input.category,
        fileUrl: url,
        fileKey,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: buffer.length,
        uploadedById: ctx.user.id
      });
      return { id, url };
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      title: z3.string().optional(),
      description: z3.string().optional()
    })).mutation(async ({ input }) => {
      await updateDocument(input.id, {
        title: input.title,
        description: input.description
      });
      return { success: true };
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteDocument(input.id);
      return { success: true };
    })
  }),
  // ==================== NOTIFICATIONS ====================
  notifications: router({
    getUserNotifications: protectedProcedure.query(async ({ ctx }) => {
      return await getUserNotifications(ctx.user.id);
    }),
    markAsRead: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await markNotificationAsRead(input.id);
      return { success: true };
    }),
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),
    getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
      const count2 = await getUnreadNotificationCount(ctx.user.id);
      return { count: count2 };
    }),
    triggerVaccineAlerts: adminProcedure2.mutation(async () => {
      const result = await triggerVaccineNotificationsManually();
      return result;
    }),
    triggerCalendarReminders: adminProcedure2.mutation(async () => {
      const { sendCalendarReminders: sendCalendarReminders2 } = await Promise.resolve().then(() => (init_calendarReminders(), calendarReminders_exports));
      const result = await sendCalendarReminders2();
      return result;
    }),
    triggerLowCreditsAlerts: adminProcedure2.mutation(async () => {
      const { sendLowCreditsAlerts: sendLowCreditsAlerts2 } = await Promise.resolve().then(() => (init_lowCreditsAlerts(), lowCreditsAlerts_exports));
      const result = await sendLowCreditsAlerts2();
      return result;
    })
  }),
  // ==================== TRANSACTIONS & FINANCES ====================
  finances: router({
    getPetTransactions: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return await getPetTransactions(input.petId);
    }),
    getByDateRange: adminProcedure2.input(z3.object({
      startDate: z3.date(),
      endDate: z3.date()
    })).query(async ({ input }) => {
      return await getTransactionsByDateRange(input.startDate, input.endDate);
    }),
    getSummary: adminProcedure2.input(z3.object({
      startDate: z3.date(),
      endDate: z3.date()
    })).query(async ({ input }) => {
      return await getFinancialSummary(input.startDate, input.endDate);
    }),
    addTransaction: adminProcedure2.input(z3.object({
      petId: z3.number().optional(),
      type: z3.enum(["credit", "debit"]),
      category: z3.enum(["daycare_package", "daycare_usage", "grooming", "veterinary", "other"]),
      description: z3.string(),
      amount: z3.number()
    })).mutation(async ({ input, ctx }) => {
      const id = await addTransaction({
        ...input,
        transactionDate: /* @__PURE__ */ new Date(),
        createdById: ctx.user.id
      });
      return { id };
    })
  }),
  // ==================== REPORTS ====================
  reports: router({
    generate: protectedProcedure.input(z3.object({
      petId: z3.number(),
      type: z3.enum(["behavior", "health", "financial"]),
      periodDays: z3.number()
    })).mutation(async ({ input }) => {
      const reportUrl = `/api/reports/${input.petId}/${input.type}/${input.periodDays}`;
      return {
        success: true,
        url: reportUrl,
        message: `Relat\xF3rio de ${input.type} gerado com sucesso`
      };
    }),
    occupancy: adminProcedure2.input(z3.object({
      startDate: z3.date(),
      endDate: z3.date()
    })).query(async ({ input }) => {
      const { getOccupancyReport: getOccupancyReport2 } = await Promise.resolve().then(() => (init_occupancyReport(), occupancyReport_exports));
      return await getOccupancyReport2(input.startDate, input.endDate);
    })
  }),
  // ==================== DASHBOARD STATS ====================
  dashboard: router({
    stats: adminProcedure2.query(async () => {
      const allPets = await getAllPets();
      const checkedIn = allPets.filter((p) => p.status === "checked-in").length;
      const checkedOut = allPets.filter((p) => p.status === "checked-out").length;
      const today = /* @__PURE__ */ new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const monthlyFinances = await getFinancialSummary(startOfMonth, endOfMonth);
      const upcomingVaccines = await getUpcomingVaccinations(30);
      return {
        totalPets: allPets.length,
        checkedIn,
        checkedOut,
        monthlyRevenue: monthlyFinances.credits,
        monthlyExpenses: monthlyFinances.debits,
        upcomingVaccines: upcomingVaccines.length
      };
    })
  }),
  // ==================== PET PHOTOS ====================
  photos: router({
    list: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return await getPetPhotos(input.petId);
    }),
    upload: protectedProcedure.input(z3.object({
      petId: z3.number(),
      photoData: z3.string(),
      // base64
      caption: z3.string().optional(),
      takenAt: z3.date()
    })).mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.photoData.split(",")[1], "base64");
      const fileKey = `pets/${input.petId}/photos/${Date.now()}.jpg`;
      const { url } = await storagePut(fileKey, buffer, "image/jpeg");
      const photoId = await addPetPhoto({
        petId: input.petId,
        photoUrl: url,
        photoKey: fileKey,
        caption: input.caption || null,
        takenAt: input.takenAt,
        uploadedById: ctx.user.id
      });
      return { id: photoId, url };
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input, ctx }) => {
      const photo = await getPhotoById(input.id);
      if (!photo) {
        throw new TRPCError4({ code: "NOT_FOUND", message: "Photo not found" });
      }
      if (ctx.user.role !== "admin" && photo.uploadedById !== ctx.user.id) {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Cannot delete this photo" });
      }
      await deletePetPhoto(input.id);
      return { success: true };
    }),
    uploadMultiple: protectedProcedure.input(z3.object({
      petId: z3.number(),
      photos: z3.array(z3.object({
        photoData: z3.string(),
        // base64
        caption: z3.string().optional(),
        takenAt: z3.date()
      }))
    })).mutation(async ({ input, ctx }) => {
      const results = [];
      for (const photo of input.photos) {
        const buffer = Buffer.from(photo.photoData.split(",")[1], "base64");
        const fileKey = `pets/${input.petId}/photos/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const { url } = await storagePut(fileKey, buffer, "image/jpeg");
        const photoId = await addPetPhoto({
          petId: input.petId,
          photoUrl: url,
          photoKey: fileKey,
          caption: photo.caption || null,
          takenAt: photo.takenAt,
          uploadedById: ctx.user.id
        });
        results.push({ id: photoId, url });
      }
      return results;
    }),
    addComment: protectedProcedure.input(z3.object({
      photoId: z3.number(),
      comment: z3.string().min(1)
    })).mutation(async ({ input, ctx }) => {
      const comment = await addPhotoComment(input.photoId, ctx.user.id, input.comment);
      return comment;
    }),
    getComments: protectedProcedure.input(z3.object({ photoId: z3.number() })).query(async ({ input }) => {
      return await getPhotoComments(input.photoId);
    }),
    addReaction: protectedProcedure.input(z3.object({
      photoId: z3.number(),
      reactionType: z3.enum(["like", "love", "laugh"]).default("like")
    })).mutation(async ({ input, ctx }) => {
      const reaction = await addPhotoReaction(input.photoId, ctx.user.id, input.reactionType);
      return reaction;
    }),
    removeReaction: protectedProcedure.input(z3.object({ photoId: z3.number() })).mutation(async ({ input, ctx }) => {
      await removePhotoReaction(input.photoId, ctx.user.id);
      return { success: true };
    }),
    getReactions: protectedProcedure.input(z3.object({ photoId: z3.number() })).query(async ({ input }) => {
      return await getPhotoReactions(input.photoId);
    }),
    getTimeline: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      const photos = await getPetPhotos(input.petId);
      const timeline = {};
      photos.forEach((photo) => {
        const dateKey = new Date(photo.takenAt).toISOString().split("T")[0];
        if (!timeline[dateKey]) {
          timeline[dateKey] = [];
        }
        timeline[dateKey].push(photo);
      });
      return timeline;
    })
  }),
  // ==================== AUTOMATED ALERTS ====================
  alerts: router({
    checkLowCredits: adminProcedure2.input(z3.object({ threshold: z3.number().default(5) })).mutation(async ({ input }) => {
      const petsWithLowCredits = await getPetsWithLowCredits(input.threshold);
      if (petsWithLowCredits.length > 0) {
        const petNames = petsWithLowCredits.map((p) => `${p.name} (${p.credits} di\xE1rias)`).join(", ");
        await notifyOwner({
          title: "\u26A0\uFE0F Alerta: Pets com Saldo Baixo",
          content: `${petsWithLowCredits.length} pet(s) com saldo baixo de di\xE1rias: ${petNames}`
        });
      }
      return { count: petsWithLowCredits.length, pets: petsWithLowCredits };
    }),
    checkUpcomingVaccines: adminProcedure2.input(z3.object({ daysAhead: z3.number().default(30) })).mutation(async ({ input }) => {
      const vaccinesDue = await getVaccinesDueSoon(input.daysAhead);
      if (vaccinesDue.length > 0) {
        const vaccineList = vaccinesDue.map(
          (v) => `${v.pet.name} - ${v.vaccine.name} (${new Date(v.vaccination.nextDueDate).toLocaleDateString("pt-BR")})`
        ).join(", ");
        await notifyOwner({
          title: "\u{1F489} Alerta: Vacinas Pr\xF3ximas do Vencimento",
          content: `${vaccinesDue.length} vacina(s) vencendo nos pr\xF3ximos ${input.daysAhead} dias: ${vaccineList}`
        });
      }
      return { count: vaccinesDue.length, vaccines: vaccinesDue };
    }),
    runAllChecks: adminProcedure2.mutation(async () => {
      const lowCredits = await getPetsWithLowCredits(5);
      const vaccinesDue = await getVaccinesDueSoon(30);
      const alerts = [];
      if (lowCredits.length > 0) {
        const petNames = lowCredits.map((p) => `${p.name} (${p.credits} di\xE1rias)`).join(", ");
        await notifyOwner({
          title: "\u26A0\uFE0F Alerta: Pets com Saldo Baixo",
          content: `${lowCredits.length} pet(s) com saldo baixo de di\xE1rias: ${petNames}`
        });
        alerts.push({ type: "low_credits", count: lowCredits.length });
      }
      if (vaccinesDue.length > 0) {
        const vaccineList = vaccinesDue.map(
          (v) => `${v.pet.name} - ${v.vaccine.name} (${new Date(v.vaccination.nextDueDate).toLocaleDateString("pt-BR")})`
        ).join(", ");
        await notifyOwner({
          title: "\u{1F489} Alerta: Vacinas Pr\xF3ximas do Vencimento",
          content: `${vaccinesDue.length} vacina(s) vencendo nos pr\xF3ximos 30 dias: ${vaccineList}`
        });
        alerts.push({ type: "vaccines_due", count: vaccinesDue.length });
      }
      return { alerts, totalAlerts: alerts.length };
    })
  }),
  // Subscription Plans Management
  plans: router({
    list: adminProcedure2.input(z3.object({ activeOnly: z3.boolean().optional() }).optional()).query(async ({ input }) => {
      return listSubscriptionPlans(input?.activeOnly);
    }),
    create: adminProcedure2.input(z3.object({
      name: z3.string().min(1),
      description: z3.string().optional(),
      price: z3.number().int().positive(),
      credits: z3.number().int().positive(),
      validityDays: z3.number().int().positive(),
      benefits: z3.string().optional()
    })).mutation(async ({ input }) => {
      return createSubscriptionPlan(input);
    }),
    update: adminProcedure2.input(z3.object({
      id: z3.number(),
      name: z3.string().min(1).optional(),
      description: z3.string().optional(),
      price: z3.number().int().positive().optional(),
      credits: z3.number().int().positive().optional(),
      validityDays: z3.number().int().positive().optional(),
      benefits: z3.string().optional(),
      isActive: z3.boolean().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateSubscriptionPlan(id, data);
      return { success: true };
    }),
    delete: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteSubscriptionPlan(input.id);
      return { success: true };
    }),
    getSubscribers: adminProcedure2.input(z3.object({ planId: z3.number() })).query(async ({ input }) => {
      return getSubscriptionsByPlan(input.planId);
    })
  }),
  // User Subscriptions
  subscriptions: router({
    getActive: protectedProcedure.query(async ({ ctx }) => {
      return getUserActiveSubscription(ctx.user.id);
    }),
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      return getUserSubscriptionHistory(ctx.user.id);
    }),
    subscribe: protectedProcedure.input(z3.object({
      planId: z3.number()
    })).mutation(async ({ ctx, input }) => {
      const existing = await getUserActiveSubscription(ctx.user.id);
      if (existing) {
        throw new TRPCError4({
          code: "BAD_REQUEST",
          message: "Voc\xEA j\xE1 possui uma assinatura ativa"
        });
      }
      const plan = await getSubscriptionPlanById(input.planId);
      if (!plan || !plan.isActive) {
        throw new TRPCError4({
          code: "NOT_FOUND",
          message: "Plano n\xE3o encontrado ou inativo"
        });
      }
      const startDate = /* @__PURE__ */ new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + plan.validityDays);
      const subscription = await createSubscription({
        userId: ctx.user.id,
        planId: input.planId,
        status: "active",
        startDate,
        endDate,
        autoRenew: true
      });
      const userPets = await getPetsByTutorId(ctx.user.id);
      if (userPets.length > 0) {
        const firstPet = userPets[0];
        await updatePet(firstPet.id, { credits: (firstPet.credits || 0) + plan.credits });
      }
      return subscription;
    }),
    cancel: protectedProcedure.input(z3.object({ subscriptionId: z3.number() })).mutation(async ({ ctx, input }) => {
      const subscription = await getUserActiveSubscription(ctx.user.id);
      if (!subscription || subscription.id !== input.subscriptionId) {
        throw new TRPCError4({
          code: "NOT_FOUND",
          message: "Assinatura n\xE3o encontrada"
        });
      }
      await cancelSubscription(input.subscriptionId);
      return { success: true };
    }),
    // Admin only: Get all subscriptions and metrics
    getMetrics: adminProcedure2.query(async () => {
      return getSubscriptionMetrics();
    }),
    getAllActive: adminProcedure2.query(async () => {
      return getAllActiveSubscriptions();
    })
  }),
  // Flea Treatments Router
  flea: router({
    create: protectedProcedure.input(z3.object({
      petId: z3.number(),
      productName: z3.string(),
      applicationDate: z3.date(),
      nextDueDate: z3.date(),
      notes: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const pets2 = await getPetsByTutorId(ctx.user.id);
      const pet = pets2.find((p) => p.id === input.petId);
      if (!pet && ctx.user.role !== "admin") {
        throw new TRPCError4({
          code: "FORBIDDEN",
          message: "Voc\xEA n\xE3o tem permiss\xE3o para acessar este pet"
        });
      }
      const result = await createFleaTreatment({
        ...input,
        createdById: ctx.user.id
      });
      const { logChange: logChange2 } = await Promise.resolve().then(() => (init_changeTracker(), changeTracker_exports));
      await logChange2({
        resourceType: "preventive",
        resourceId: result.insertId,
        petId: input.petId,
        fieldName: "flea_treatment_added",
        oldValue: null,
        newValue: `${input.productName} - Pr\xF3xima aplica\xE7\xE3o: ${input.nextDueDate.toLocaleDateString("pt-BR")}`,
        changedBy: ctx.user.id,
        changedByRole: ctx.user.role,
        changeType: "create"
      });
      await autoCreateFleaEvent(
        input.petId,
        result.insertId,
        input.productName,
        input.applicationDate,
        input.nextDueDate,
        ctx.user.id
      );
      await autoCreateFleaEvent(
        input.petId,
        result.insertId,
        input.productName,
        input.nextDueDate,
        void 0,
        ctx.user.id
      );
      return result;
    }),
    list: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ ctx, input }) => {
      const pets2 = await getPetsByTutorId(ctx.user.id);
      const pet = pets2.find((p) => p.id === input.petId);
      if (!pet && ctx.user.role !== "admin") {
        throw new TRPCError4({
          code: "FORBIDDEN",
          message: "Voc\xEA n\xE3o tem permiss\xE3o para acessar este pet"
        });
      }
      return getFleaTreatmentsByPetId(input.petId);
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
      await deleteFleaTreatment(input.id);
      return { success: true };
    })
  }),
  // Deworming Treatments Router
  deworming: router({
    create: protectedProcedure.input(z3.object({
      petId: z3.number(),
      productName: z3.string(),
      applicationDate: z3.date(),
      nextDueDate: z3.date(),
      notes: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const pets2 = await getPetsByTutorId(ctx.user.id);
      const pet = pets2.find((p) => p.id === input.petId);
      if (!pet && ctx.user.role !== "admin") {
        throw new TRPCError4({
          code: "FORBIDDEN",
          message: "Voc\xEA n\xE3o tem permiss\xE3o para acessar este pet"
        });
      }
      const result = await createDewormingTreatment({
        ...input,
        createdById: ctx.user.id
      });
      const { logChange: logChange2 } = await Promise.resolve().then(() => (init_changeTracker(), changeTracker_exports));
      await logChange2({
        resourceType: "preventive",
        resourceId: result.insertId,
        petId: input.petId,
        fieldName: "deworming_treatment_added",
        oldValue: null,
        newValue: `${input.productName} - Pr\xF3xima aplica\xE7\xE3o: ${input.nextDueDate.toLocaleDateString("pt-BR")}`,
        changedBy: ctx.user.id,
        changedByRole: ctx.user.role,
        changeType: "create"
      });
      await autoCreateDewormingEvent(
        input.petId,
        result.insertId,
        input.productName,
        input.applicationDate,
        input.nextDueDate,
        ctx.user.id
      );
      await autoCreateDewormingEvent(
        input.petId,
        result.insertId,
        input.productName,
        input.nextDueDate,
        void 0,
        ctx.user.id
      );
      return result;
    }),
    list: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ ctx, input }) => {
      const pets2 = await getPetsByTutorId(ctx.user.id);
      const pet = pets2.find((p) => p.id === input.petId);
      if (!pet && ctx.user.role !== "admin") {
        throw new TRPCError4({
          code: "FORBIDDEN",
          message: "Voc\xEA n\xE3o tem permiss\xE3o para acessar este pet"
        });
      }
      return getDewormingTreatmentsByPetId(input.petId);
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
      await deleteDewormingTreatment(input.id);
      return { success: true };
    })
  }),
  behavior: router({
    create: protectedProcedure.input(z3.object({
      petId: z3.number(),
      date: z3.date(),
      location: z3.enum(["daycare", "home", "walk", "vet", "other"]),
      behaviorType: z3.enum(["positive", "negative", "neutral"]),
      description: z3.string(),
      tags: z3.string().optional(),
      severity: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const pets2 = await getPetsByTutorId(ctx.user.id);
      const pet = pets2.find((p) => p.id === input.petId);
      if (!pet && ctx.user.role !== "admin") {
        throw new TRPCError4({
          code: "FORBIDDEN",
          message: "Voc\xEA n\xE3o tem permiss\xE3o para acessar este pet"
        });
      }
      return createBehaviorRecord({
        ...input,
        createdById: ctx.user.id
      });
    }),
    list: protectedProcedure.input(z3.object({ petId: z3.number().optional() })).query(async ({ ctx, input }) => {
      if (input.petId) {
        const pets2 = await getPetsByTutorId(ctx.user.id);
        const pet = pets2.find((p) => p.id === input.petId);
        if (!pet && ctx.user.role !== "admin") {
          throw new TRPCError4({
            code: "FORBIDDEN",
            message: "Voc\xEA n\xE3o tem permiss\xE3o para acessar este pet"
          });
        }
        return listBehaviorRecords(input.petId);
      }
      return listBehaviorRecords();
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
      await deleteBehaviorRecord(input.id);
      return { success: true };
    })
  }),
  training: router({
    create: protectedProcedure.input(z3.object({
      petId: z3.number(),
      skill: z3.string(),
      startDate: z3.date(),
      currentLevel: z3.number().min(1).max(10),
      notes: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const pets2 = await getPetsByTutorId(ctx.user.id);
      const pet = pets2.find((p) => p.id === input.petId);
      if (!pet && ctx.user.role !== "admin") {
        throw new TRPCError4({
          code: "FORBIDDEN",
          message: "Voc\xEA n\xE3o tem permiss\xE3o para acessar este pet"
        });
      }
      return createTrainingProgress({
        ...input,
        createdById: ctx.user.id
      });
    }),
    list: protectedProcedure.input(z3.object({ petId: z3.number().optional() })).query(async ({ ctx, input }) => {
      if (input.petId) {
        const pets2 = await getPetsByTutorId(ctx.user.id);
        const pet = pets2.find((p) => p.id === input.petId);
        if (!pet && ctx.user.role !== "admin") {
          throw new TRPCError4({
            code: "FORBIDDEN",
            message: "Voc\xEA n\xE3o tem permiss\xE3o para acessar este pet"
          });
        }
        return listTrainingProgress(input.petId);
      }
      return listTrainingProgress();
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      currentLevel: z3.number().min(1).max(10),
      notes: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      return updateTrainingProgress(input.id, input.currentLevel, input.notes);
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
      await deleteTrainingProgress(input.id);
      return { success: true };
    })
  }),
  bookings: router({
    create: protectedProcedure.input(z3.object({
      petId: z3.number(),
      bookingDate: z3.date(),
      numberOfDays: z3.number().min(1).default(1),
      notes: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const booking = await createBooking({
        petId: input.petId,
        tutorId: ctx.user.id,
        bookingDate: input.bookingDate,
        numberOfDays: input.numberOfDays,
        notes: input.notes,
        status: "confirmed"
        // Auto-confirm for now
      });
      await createNotification2({
        userId: ctx.user.id,
        petId: input.petId,
        type: "system",
        title: "Agendamento confirmado! \u{1F4C5}",
        message: `Seu agendamento para ${new Date(input.bookingDate).toLocaleDateString("pt-BR")} foi confirmado com sucesso.`
      });
      return booking;
    }),
    list: protectedProcedure.input(z3.object({
      petId: z3.number().optional(),
      status: z3.string().optional()
    })).query(async ({ ctx, input }) => {
      return listBookings({
        tutorId: ctx.user.id,
        petId: input.petId,
        status: input.status
      });
    }),
    cancel: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
      const booking = await getBookingById(input.id);
      if (!booking || booking.tutorId !== ctx.user.id) {
        throw new TRPCError4({ code: "FORBIDDEN" });
      }
      await updateBookingStatus(input.id, "cancelled");
      return { success: true };
    }),
    getByDateRange: protectedProcedure.input(z3.object({
      startDate: z3.date(),
      endDate: z3.date()
    })).query(async ({ input }) => {
      return getBookingsByDateRange(input.startDate, input.endDate);
    })
  }),
  reviews: router({
    create: protectedProcedure.input(z3.object({
      petId: z3.number(),
      rating: z3.number().min(1).max(5),
      comment: z3.string().optional(),
      visitDate: z3.date()
    })).mutation(async ({ ctx, input }) => {
      return createReview({
        petId: input.petId,
        tutorId: ctx.user.id,
        rating: input.rating,
        comment: input.comment,
        visitDate: input.visitDate
      });
    }),
    list: protectedProcedure.input(z3.object({
      petId: z3.number().optional()
    })).query(async ({ ctx, input }) => {
      return listReviews({
        tutorId: ctx.user.id,
        petId: input.petId
      });
    }),
    getAverageRating: publicProcedure.query(async () => {
      return getAverageRating();
    })
  }),
  ai: router({
    chat: protectedProcedure.input(z3.object({
      message: z3.string(),
      context: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      try {
        const systemPrompt = `Voc\xEA \xE9 um assistente virtual especializado em cuidados com pets, especialmente c\xE3es. 
Voc\xEA trabalha para a TeteCare, uma creche para pets profissional.

Contexto do usu\xE1rio:
${input.context || "Nenhum pet cadastrado ainda."}

Responda de forma amig\xE1vel, profissional e informativa. Se a pergunta for sobre sa\xFAde espec\xEDfica, sempre recomende consultar um veterin\xE1rio.
Mantenha as respostas concisas (m\xE1ximo 3 par\xE1grafos) e pr\xE1ticas.`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.message }
          ]
        });
        const assistantMessage = response.choices[0]?.message?.content || "Desculpe, n\xE3o consegui processar sua mensagem.";
        return {
          message: assistantMessage
        };
      } catch (error) {
        console.error("AI chat error:", error);
        throw new TRPCError4({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao processar mensagem"
        });
      }
    })
  }),
  // ==================== USER MANAGEMENT ====================
  userManagement: router({
    list: adminProcedure2.query(async () => {
      return await listAllUsers();
    }),
    byId: adminProcedure2.input(z3.object({ id: z3.number() })).query(async ({ input }) => {
      return await getUserById(input.id);
    }),
    updateRole: adminProcedure2.input(z3.object({ userId: z3.number(), role: z3.enum(["admin", "user"]) })).mutation(async ({ input, ctx }) => {
      await updateUserRole(input.userId, input.role);
      await logAdminAction({
        adminId: ctx.user.id,
        action: input.role === "admin" ? "promote_admin" : "demote_admin",
        targetType: "user",
        targetId: input.userId,
        details: { newRole: input.role },
        req: ctx.req
      });
      return { success: true };
    }),
    delete: adminProcedure2.input(z3.object({ userId: z3.number() })).mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError4({
          code: "BAD_REQUEST",
          message: "Voc\xEA n\xE3o pode deletar sua pr\xF3pria conta"
        });
      }
      await deleteUser(input.userId);
      return { success: true };
    })
  }),
  // ==================== ADMIN LOGS ====================
  adminLogs: router({
    list: adminProcedure2.input(z3.object({
      adminId: z3.number().optional(),
      action: z3.string().optional(),
      limit: z3.number().optional()
    }).optional()).query(async ({ input }) => {
      const { getAdminLogs: getAdminLogs2 } = await Promise.resolve().then(() => (init_adminLogger(), adminLogger_exports));
      return await getAdminLogs2(input);
    })
  }),
  // ==================== ADMIN INVITES ====================
  adminInvites: router({
    create: adminProcedure2.input(z3.object({ email: z3.string().email() })).mutation(async ({ input, ctx }) => {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await createAdminInvite({
        email: input.email,
        token,
        invitedBy: ctx.user.id,
        status: "pending",
        expiresAt
      });
      const origin = ctx.req.headers.origin || "http://localhost:3000";
      const inviteUrl = `${origin}/accept-invite?token=${token}`;
      console.log(`[Admin Invite] Invite URL for ${input.email}: ${inviteUrl}`);
      await notifyOwner({
        title: "Novo Convite de Admin Enviado",
        content: `Convite enviado para: ${input.email}

Link do convite:
${inviteUrl}

V\xE1lido at\xE9: ${expiresAt.toLocaleString("pt-BR")}`
      });
      return { success: true, inviteUrl };
    }),
    list: adminProcedure2.query(async () => {
      return await listPendingAdminInvites();
    }),
    accept: publicProcedure.input(z3.object({ token: z3.string() })).mutation(async ({ input, ctx }) => {
      const invite = await getAdminInviteByToken(input.token);
      if (!invite) {
        throw new TRPCError4({ code: "NOT_FOUND", message: "Convite n\xE3o encontrado" });
      }
      if (invite.status !== "pending") {
        throw new TRPCError4({ code: "BAD_REQUEST", message: "Convite j\xE1 foi usado ou expirou" });
      }
      if (/* @__PURE__ */ new Date() > new Date(invite.expiresAt)) {
        await updateAdminInviteStatus(input.token, "expired");
        throw new TRPCError4({ code: "BAD_REQUEST", message: "Convite expirado" });
      }
      if (!ctx.user) {
        throw new TRPCError4({ code: "UNAUTHORIZED", message: "Fa\xE7a login para aceitar o convite" });
      }
      if (ctx.user.email !== invite.email) {
        throw new TRPCError4({
          code: "FORBIDDEN",
          message: "Este convite foi enviado para outro email"
        });
      }
      await updateUserRole(ctx.user.id, "admin");
      await updateAdminInviteStatus(input.token, "accepted");
      return { success: true };
    })
  }),
  // ==================== PAYMENTS ====================
  payments: router({
    createCheckout: protectedProcedure.input(z3.object({
      productKey: z3.string()
    })).mutation(async ({ input, ctx }) => {
      const stripe = getStripe();
      const product = PRODUCTS[input.productKey];
      if (!product) {
        throw new TRPCError4({ code: "BAD_REQUEST", message: "Produto inv\xE1lido" });
      }
      const origin = ctx.req.headers.origin || "http://localhost:3000";
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: ctx.user.email || void 0,
        client_reference_id: ctx.user.id.toString(),
        allow_promotion_codes: true,
        line_items: [
          {
            price_data: {
              currency: product.currency,
              product_data: {
                name: product.name,
                description: product.description
              },
              unit_amount: product.amount
            },
            quantity: 1
          }
        ],
        metadata: {
          user_id: ctx.user.id.toString(),
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
          product_key: input.productKey,
          product_type: "credits" in product ? "credits" : "plan",
          credits: "credits" in product ? product.credits.toString() : "0"
        },
        success_url: `${origin}/tutor/credits?success=true`,
        cancel_url: `${origin}/tutor/credits?canceled=true`
      });
      return { url: session.url };
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getPaymentsByUserId(ctx.user.id);
    }),
    listAll: protectedProcedure.input(z3.object({
      limit: z3.number().optional().default(50),
      offset: z3.number().optional().default(0),
      status: z3.enum(["all", "succeeded", "failed", "pending"]).optional().default("all")
    })).query(async ({ input, ctx }) => {
      const allPayments = await getAllPayments();
      const isAdmin = ctx.user.role === "admin";
      let filtered = isAdmin ? allPayments : allPayments.filter((p) => p.userId === ctx.user.id);
      if (input.status !== "all") {
        filtered = filtered.filter((p) => p.status === input.status);
      }
      const paginated = filtered.slice(input.offset, input.offset + input.limit);
      return {
        payments: paginated,
        total: filtered.length
      };
    }),
    getStats: adminProcedure2.query(async () => {
      const allPayments = await getAllPayments();
      const totalRevenue = allPayments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + p.amount, 0);
      const successCount = allPayments.filter((p) => p.status === "succeeded").length;
      const failedCount = allPayments.filter((p) => p.status === "failed").length;
      const pendingCount = allPayments.filter((p) => p.status === "pending").length;
      return {
        totalRevenue,
        successCount,
        failedCount,
        pendingCount,
        totalCount: allPayments.length
      };
    })
  }),
  // ==================== CHANGE HISTORY ====================
  changeHistory: router({
    getRecentChanges: adminProcedure2.input(z3.object({ limit: z3.number().default(50) }).optional()).query(async ({ input }) => {
      const { getRecentChanges: getRecentChanges2 } = await Promise.resolve().then(() => (init_changeTracker(), changeTracker_exports));
      return await getRecentChanges2(input?.limit || 50);
    }),
    getPetHistory: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      const { getPetHistory: getPetHistory2 } = await Promise.resolve().then(() => (init_changeTracker(), changeTracker_exports));
      return await getPetHistory2(input.petId);
    }),
    getResourceHistory: protectedProcedure.input(z3.object({
      resourceType: z3.enum(["medication", "food", "preventive", "pet_data", "calendar"]),
      resourceId: z3.number()
    })).query(async ({ input }) => {
      const { getResourceHistory: getResourceHistory2 } = await Promise.resolve().then(() => (init_changeTracker(), changeTracker_exports));
      return await getResourceHistory2(input.resourceType, input.resourceId);
    }),
    getCollaborationStats: adminProcedure2.query(async () => {
      const { getCollaborationStats: getCollaborationStats2 } = await Promise.resolve().then(() => (init_changeTracker(), changeTracker_exports));
      return await getCollaborationStats2();
    }),
    getChangesByUser: adminProcedure2.input(z3.object({ userId: z3.number() })).query(async ({ input }) => {
      const { getChangesByUser: getChangesByUser2 } = await Promise.resolve().then(() => (init_changeTracker(), changeTracker_exports));
      return await getChangesByUser2(input.userId);
    }),
    getActivityByDay: adminProcedure2.input(z3.object({
      days: z3.number().default(30)
    }).optional()).query(async ({ input }) => {
      const { getActivityByDay: getActivityByDay2 } = await Promise.resolve().then(() => (init_changeTracker(), changeTracker_exports));
      return await getActivityByDay2(input?.days || 30);
    })
  }),
  // ==================== WHATSAPP INTEGRATION ====================
  whatsapp: router({
    // Configuration
    getConfig: adminProcedure2.query(async () => {
      return await getWhatsAppConfig();
    }),
    updateConfig: adminProcedure2.input(z3.object({
      apiKey: z3.string(),
      phoneNumberId: z3.string(),
      businessAccountId: z3.string(),
      webhookSecret: z3.string().optional(),
      isActive: z3.boolean()
    })).mutation(async ({ input }) => {
      await updateWhatsAppConfig(input);
      return { success: true };
    }),
    // Templates
    listTemplates: adminProcedure2.query(async () => {
      return await getWhatsAppTemplates();
    }),
    createTemplate: adminProcedure2.input(z3.object({
      name: z3.string(),
      category: z3.enum([
        "welcome",
        "booking_confirmation",
        "vaccine_reminder",
        "checkin",
        "checkout",
        "daily_report",
        "new_photo",
        "medication_applied",
        "preventive_reminder",
        "custom"
      ]),
      content: z3.string(),
      variables: z3.array(z3.string()).optional(),
      status: z3.enum(["active", "inactive"]).default("active")
    })).mutation(async ({ input }) => {
      const id = await createWhatsAppTemplate(input);
      return { success: true, templateId: id };
    }),
    updateTemplate: adminProcedure2.input(z3.object({
      id: z3.number(),
      name: z3.string().optional(),
      content: z3.string().optional(),
      variables: z3.array(z3.string()).optional(),
      status: z3.enum(["active", "inactive"]).optional()
    })).mutation(async ({ input }) => {
      await updateWhatsAppTemplate(input);
      return { success: true };
    }),
    deleteTemplate: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteWhatsAppTemplate(input.id);
      return { success: true };
    }),
    // Messages
    sendMessage: adminProcedure2.input(z3.object({
      phone: z3.string(),
      message: z3.string(),
      recipientName: z3.string().optional()
    })).mutation(async ({ input }) => {
      const whatsapp = await Promise.resolve().then(() => (init_whatsappService(), whatsappService_exports));
      return await whatsapp.sendTextMessage(input.phone, input.message, input.recipientName);
    }),
    sendMedia: adminProcedure2.input(z3.object({
      phone: z3.string(),
      mediaUrl: z3.string(),
      caption: z3.string().optional(),
      recipientName: z3.string().optional(),
      mediaType: z3.enum(["image", "document"]).default("image")
    })).mutation(async ({ input }) => {
      const whatsapp = await Promise.resolve().then(() => (init_whatsappService(), whatsappService_exports));
      return await whatsapp.sendMediaMessage(
        input.phone,
        input.mediaUrl,
        input.caption,
        input.recipientName,
        input.mediaType
      );
    }),
    sendTemplate: adminProcedure2.input(z3.object({
      phone: z3.string(),
      templateName: z3.string(),
      variables: z3.array(z3.string()),
      recipientName: z3.string().optional()
    })).mutation(async ({ input }) => {
      const whatsapp = await Promise.resolve().then(() => (init_whatsappService(), whatsappService_exports));
      return await whatsapp.sendTemplateMessage(
        input.phone,
        input.templateName,
        input.variables,
        input.recipientName
      );
    }),
    sendBulk: adminProcedure2.input(z3.object({
      recipients: z3.array(z3.object({
        phone: z3.string(),
        name: z3.string().optional(),
        message: z3.string()
      })),
      delayMs: z3.number().default(1e3)
    })).mutation(async ({ input }) => {
      const whatsapp = await Promise.resolve().then(() => (init_whatsappService(), whatsappService_exports));
      return await whatsapp.sendBulkMessages(input.recipients, input.delayMs);
    }),
    getMessageHistory: adminProcedure2.input(z3.object({
      limit: z3.number().default(50),
      status: z3.enum(["queued", "sent", "delivered", "read", "failed"]).optional()
    })).query(async ({ input }) => {
      return await getWhatsAppMessageHistory(input.limit, input.status);
    }),
    // Groups
    listGroups: adminProcedure2.query(async () => {
      return await getWhatsAppGroups();
    }),
    createPetGroup: adminProcedure2.input(z3.object({
      petId: z3.number(),
      groupName: z3.string()
    })).mutation(async ({ input }) => {
      const id = await createWhatsAppGroup(input);
      return { success: true, groupId: id };
    }),
    addGroupMember: adminProcedure2.input(z3.object({
      groupId: z3.number(),
      userId: z3.number().optional(),
      phone: z3.string(),
      name: z3.string().optional()
    })).mutation(async ({ input }) => {
      await addWhatsAppGroupMember(input);
      return { success: true };
    }),
    removeGroupMember: adminProcedure2.input(z3.object({
      groupId: z3.number(),
      memberId: z3.number()
    })).mutation(async ({ input }) => {
      await removeWhatsAppGroupMember(input.groupId, input.memberId);
      return { success: true };
    }),
    // Automations
    listAutomations: adminProcedure2.query(async () => {
      return await getWhatsAppAutomations();
    }),
    createAutomation: adminProcedure2.input(z3.object({
      name: z3.string(),
      triggerType: z3.enum([
        "photo_added",
        "vaccine_reminder_7d",
        "vaccine_reminder_1d",
        "checkin",
        "checkout",
        "daily_report",
        "medication_applied",
        "preventive_reminder"
      ]),
      templateId: z3.number(),
      enabled: z3.boolean().default(true),
      config: z3.any().optional()
    })).mutation(async ({ input }) => {
      const id = await createWhatsAppAutomation(input);
      return { success: true, automationId: id };
    }),
    updateAutomation: adminProcedure2.input(z3.object({
      id: z3.number(),
      enabled: z3.boolean().optional(),
      config: z3.any().optional()
    })).mutation(async ({ input }) => {
      await updateWhatsAppAutomation(input);
      return { success: true };
    }),
    deleteAutomation: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteWhatsAppAutomation(input.id);
      return { success: true };
    }),
    // Statistics
    getStats: adminProcedure2.query(async () => {
      return await getWhatsAppStats();
    }),
    // Conversations
    listConversations: adminProcedure2.input(z3.object({
      status: z3.enum(["all", "active", "resolved", "pending"]).default("all")
    })).query(async ({ input }) => {
      return await getWhatsAppConversations(input.status);
    }),
    getConversation: adminProcedure2.input(z3.object({ id: z3.number() })).query(async ({ input }) => {
      return await getWhatsAppConversation(input.id);
    }),
    updateConversationStatus: adminProcedure2.input(z3.object({
      id: z3.number(),
      status: z3.enum(["active", "resolved", "pending"])
    })).mutation(async ({ input }) => {
      await updateWhatsAppConversationStatus(input.id, input.status);
      return { success: true };
    }),
    markAsRead: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await markWhatsAppConversationAsRead(input.id);
      return { success: true };
    })
  }),
  // ==================== PREVENTIVES LIBRARY ====================
  preventives: router({
    library: publicProcedure.query(async () => {
      return await getPreventiveLibrary();
    }),
    addToLibrary: adminProcedure2.input(z3.object({
      name: z3.string(),
      type: z3.enum(["flea", "deworming"]),
      manufacturer: z3.string().optional(),
      intervalDays: z3.number().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      const id = await addPreventiveToLibrary(input);
      return { id };
    }),
    updateFlea: protectedProcedure.input(z3.object({
      id: z3.number(),
      applicationDate: z3.string().optional(),
      nextDueDate: z3.string().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      await updateFleaTreatment(input);
      return { success: true };
    }),
    deleteFlea: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteFleaTreatment(input.id);
      return { success: true };
    }),
    updateDeworming: protectedProcedure.input(z3.object({
      id: z3.number(),
      applicationDate: z3.string().optional(),
      nextDueDate: z3.string().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      await updateDewormingTreatment(input);
      return { success: true };
    }),
    deleteDeworming: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteDewormingTreatment(input.id);
      return { success: true };
    })
  }),
  // ==================== HEALTH NOTIFICATIONS ====================
  healthNotifications: router({
    /**
     * Get all upcoming health reminders
     */
    getUpcomingReminders: adminProcedure2.input(z3.object({ daysAhead: z3.number().default(7) })).query(async ({ input }) => {
      return await getAllUpcomingHealthReminders(input.daysAhead);
    }),
    /**
     * Send notification to owner about upcoming health items
     */
    sendHealthReminders: adminProcedure2.input(z3.object({ daysAhead: z3.number().default(7) })).mutation(async ({ input }) => {
      const reminders = await getAllUpcomingHealthReminders(input.daysAhead);
      if (reminders.total === 0) {
        return {
          success: true,
          message: "Nenhum item pr\xF3ximo do vencimento",
          sent: false
        };
      }
      let content = `\u{1F43E} **Lembretes de Sa\xFAde - Pr\xF3ximos ${input.daysAhead} dias**

`;
      if (reminders.vaccinations.length > 0) {
        content += `\u{1F489} **Vacinas (${reminders.vaccinations.length})**
`;
        reminders.vaccinations.forEach((v) => {
          const date2 = new Date(v.nextDueDate).toLocaleDateString("pt-BR");
          content += `- ${v.petName}: ${v.vaccineName} (${date2})
`;
        });
        content += "\n";
      }
      if (reminders.medications.length > 0) {
        content += `\u{1F48A} **Medicamentos Terminando (${reminders.medications.length})**
`;
        reminders.medications.forEach((m) => {
          const date2 = new Date(m.endDate).toLocaleDateString("pt-BR");
          content += `- ${m.petName}: ${m.medicationName} (${date2})
`;
        });
        content += "\n";
      }
      if (reminders.fleaTreatments.length > 0) {
        content += `\u{1F41C} **Antipulgas (${reminders.fleaTreatments.length})**
`;
        reminders.fleaTreatments.forEach((f) => {
          const date2 = new Date(f.nextDueDate).toLocaleDateString("pt-BR");
          content += `- ${f.petName}: ${f.productName} (${date2})
`;
        });
        content += "\n";
      }
      if (reminders.dewormingTreatments.length > 0) {
        content += `\u{1F41B} **Verm\xEDfugos (${reminders.dewormingTreatments.length})**
`;
        reminders.dewormingTreatments.forEach((d) => {
          const date2 = new Date(d.nextDueDate).toLocaleDateString("pt-BR");
          content += `- ${d.petName}: ${d.productName} (${date2})
`;
        });
      }
      const { notifyOwner: notifyOwner2 } = await Promise.resolve().then(() => (init_notification(), notification_exports));
      const sent = await notifyOwner2({
        title: `\u{1F514} ${reminders.total} Lembretes de Sa\xFAde`,
        content
      });
      return {
        success: true,
        message: sent ? `Notifica\xE7\xE3o enviada com ${reminders.total} lembretes` : "Falha ao enviar notifica\xE7\xE3o",
        sent,
        reminders
      };
    })
  }),
  // ==================== HEALTH STATISTICS ====================
  healthStats: router({
    /**
     * Get all health statistics for dashboard
     */
    getDashboardStats: protectedProcedure.query(async () => {
      return await getHealthDashboardStats();
    }),
    /**
     * Get vaccination statistics
     */
    getVaccinationStats: protectedProcedure.query(async () => {
      return await getVaccinationStatistics();
    }),
    /**
     * Get active medications count
     */
    getActiveMedications: protectedProcedure.query(async () => {
      return await getActiveMedicationsCount();
    }),
    /**
     * Get preventives applied this month
     */
    getPreventivesThisMonth: protectedProcedure.query(async () => {
      return await getPreventivesThisMonth();
    }),
    /**
     * Get overdue treatments
     */
    getOverdueTreatments: protectedProcedure.query(async () => {
      return await getOverdueTreatments();
    })
  }),
  // ==================== HEALTH REPORTS ====================
  healthReports: router({
    /**
     * Get complete health history for a pet
     */
    getPetHealthHistory: protectedProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      return await getPetCompleteHealthHistory(input.petId);
    })
  }),
  // ==================== UNIFIED CALENDAR ====================
  healthCalendar: router({
    /**
     * Get all calendar events (health, bookings, payments)
     */
    getEvents: protectedProcedure.input(z3.object({
      startDate: z3.date(),
      endDate: z3.date()
    })).query(async ({ input }) => {
      return await getAllCalendarEvents(input.startDate, input.endDate);
    }),
    /**
     * Get events for a specific day
     */
    getDayEvents: protectedProcedure.input(z3.object({ date: z3.date() })).query(async ({ input }) => {
      return await getDayEvents(input.date);
    }),
    /**
     * Get daily occupancy stats
     */
    getOccupancyStats: protectedProcedure.input(z3.object({
      startDate: z3.date(),
      endDate: z3.date()
    })).query(async ({ input }) => {
      return await getDailyOccupancy(input.startDate, input.endDate);
    }),
    /**
     * Get credit consumption stats
     */
    getCreditStats: protectedProcedure.input(z3.object({
      startDate: z3.date(),
      endDate: z3.date()
    })).query(async ({ input }) => {
      return await getCreditConsumption(input.startDate, input.endDate);
    }),
    /**
     * Create new vaccination
     */
    createVaccination: adminProcedure2.input(z3.object({
      petId: z3.number(),
      vaccineId: z3.number(),
      applicationDate: z3.date(),
      nextDueDate: z3.date().optional(),
      veterinarian: z3.string().optional(),
      clinic: z3.string().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const data = {
        ...input,
        createdById: ctx.user.id
      };
      return await addPetVaccination(data);
    }),
    /**
     * Create new medication
     */
    createMedication: adminProcedure2.input(z3.object({
      petId: z3.number(),
      medicationId: z3.number(),
      startDate: z3.date(),
      endDate: z3.date().optional(),
      dosage: z3.string(),
      frequency: z3.string(),
      notes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const data = {
        ...input,
        createdById: ctx.user.id
      };
      return await addPetMedication(data);
    }),
    /**
     * Create new booking/check-in
     */
    createBooking: adminProcedure2.input(z3.object({
      petId: z3.number(),
      tutorId: z3.number(),
      bookingDate: z3.date(),
      numberOfDays: z3.number().default(1),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { bookings: bookings2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const dbInstance = await getDb2();
      if (!dbInstance) throw new Error("Database not available");
      const result = await dbInstance.insert(bookings2).values({
        ...input,
        status: "confirmed"
      });
      return Number(result[0]?.insertId || 0);
    }),
    /**
     * Create new transaction
     */
    createTransaction: adminProcedure2.input(z3.object({
      petId: z3.number().optional(),
      type: z3.enum(["income", "expense"]),
      category: z3.string(),
      description: z3.string(),
      amount: z3.number(),
      transactionDate: z3.date()
    })).mutation(async ({ input, ctx }) => {
      const data = {
        ...input,
        createdById: ctx.user.id
      };
      return await addTransaction(data);
    }),
    /**
     * Delete vaccination
     */
    deleteVaccination: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      return await deletePetVaccination(input.id);
    }),
    /**
     * Delete medication
     */
    deleteMedication: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      return await deletePetMedication(input.id);
    }),
    /**
     * Delete booking
     */
    deleteBooking: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { bookings: bookings2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq13 } = await import("drizzle-orm");
      const dbInstance = await getDb2();
      if (!dbInstance) throw new Error("Database not available");
      await dbInstance.delete(bookings2).where(eq13(bookings2.id, input.id));
      return true;
    }),
    /**
     * Update booking dates
     */
    updateBooking: adminProcedure2.input(z3.object({
      id: z3.number(),
      checkInDate: z3.string(),
      checkOutDate: z3.string(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { bookings: bookings2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq13 } = await import("drizzle-orm");
      const dbInstance = await getDb2();
      if (!dbInstance) throw new Error("Database not available");
      const checkIn = new Date(input.checkInDate);
      const checkOut = new Date(input.checkOutDate);
      const numberOfDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1e3 * 60 * 60 * 24));
      await dbInstance.update(bookings2).set({
        bookingDate: checkIn,
        numberOfDays,
        notes: input.notes
      }).where(eq13(bookings2.id, input.id));
      return true;
    }),
    /**
     * Update transaction
     */
    updateTransaction: adminProcedure2.input(z3.object({
      id: z3.number(),
      amount: z3.number(),
      category: z3.string(),
      description: z3.string(),
      transactionDate: z3.string()
    })).mutation(async ({ input }) => {
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { transactions: transactions2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq13 } = await import("drizzle-orm");
      const dbInstance = await getDb2();
      if (!dbInstance) throw new Error("Database not available");
      await dbInstance.update(transactions2).set({
        amount: Math.round(input.amount * 100),
        // Convert to cents
        category: input.category,
        description: input.description,
        transactionDate: new Date(input.transactionDate)
      }).where(eq13(transactions2.id, input.id));
      return true;
    })
  }),
  // ==================== TUTORS MANAGEMENT ====================
  tutors: router({
    /**
     * List all tutors with pagination and search
     */
    list: adminProcedure2.input(z3.object({
      page: z3.number().default(1),
      limit: z3.number().default(20),
      search: z3.string().optional()
    })).query(async ({ input }) => {
      return await getAllTutors(input.page, input.limit, input.search);
    }),
    /**
     * Get tutor by ID with linked pets
     */
    getById: adminProcedure2.input(z3.object({ tutorId: z3.number() })).query(async ({ input }) => {
      return await getTutorById(input.tutorId);
    }),
    /**
     * Update tutor information
     */
    update: adminProcedure2.input(z3.object({
      tutorId: z3.number(),
      name: z3.string().optional(),
      email: z3.string().email().optional(),
      phone: z3.string().optional()
    })).mutation(async ({ input }) => {
      const { tutorId, ...data } = input;
      return await updateTutor(tutorId, data);
    }),
    /**
     * Link pet to tutor
     */
    linkPet: adminProcedure2.input(z3.object({
      petId: z3.number(),
      tutorId: z3.number(),
      isPrimary: z3.boolean().default(false)
    })).mutation(async ({ input }) => {
      return await linkPetToTutor(input.petId, input.tutorId, input.isPrimary);
    }),
    /**
     * Unlink pet from tutor
     */
    unlinkPet: adminProcedure2.input(z3.object({
      petId: z3.number(),
      tutorId: z3.number()
    })).mutation(async ({ input }) => {
      return await unlinkPetFromTutor(input.petId, input.tutorId);
    }),
    /**
     * Get reminder history for tutor
     */
    getReminderHistory: adminProcedure2.input(z3.object({ tutorId: z3.number() })).query(async ({ input }) => {
      return await getTutorReminderHistory(input.tutorId);
    }),
    /**
     * Get all pets with their tutors grouped
     */
    getPetsWithTutors: adminProcedure2.query(async () => {
      return await getPetsWithTutors();
    }),
    /**
     * Notify all tutors of a specific pet
     */
    notifyPetTutors: adminProcedure2.input(z3.object({
      petId: z3.number(),
      title: z3.string(),
      message: z3.string()
    })).mutation(async ({ input }) => {
      const tutors = await getTutorsByPet(input.petId);
      for (const tutor of tutors) {
        if (tutor.tutorId) {
          await createNotification({
            userId: tutor.tutorId,
            type: "system",
            title: input.title,
            message: input.message,
            isRead: false
          });
        }
      }
      return { success: true, notifiedCount: tutors.length };
    })
  }),
  // ==================== BOOKING REQUESTS ====================
  bookingRequests: router({
    /**
     * Get availability for specific dates
     */
    getAvailability: publicProcedure.input(z3.object({ dates: z3.array(z3.string()) })).query(async ({ input }) => {
      const { getAvailabilityForDates: getAvailabilityForDates2 } = await Promise.resolve().then(() => (init_bookingRequests_db(), bookingRequests_db_exports));
      return await getAvailabilityForDates2(input.dates);
    }),
    /**
     * Create a new booking request (tutors)
     */
    create: protectedProcedure.input(z3.object({
      petId: z3.number(),
      requestedDates: z3.array(z3.string()),
      notes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const { createBookingRequest: createBookingRequest2 } = await Promise.resolve().then(() => (init_bookingRequests_db(), bookingRequests_db_exports));
      const result = await createBookingRequest2({
        petId: input.petId,
        tutorId: ctx.user.openId || ctx.user.email || "",
        requestedDates: input.requestedDates,
        notes: input.notes
      });
      const { notifyAdmins: notifyAdmins2 } = await Promise.resolve().then(() => (init_websocket(), websocket_exports));
      notifyAdmins2({
        type: "booking_request_created",
        title: "Nova Solicita\xE7\xE3o de Reserva",
        message: `${ctx.user.name || "Usu\xE1rio"} solicitou reserva para ${input.requestedDates.length} dia(s)`,
        data: { requestId: result.id, petId: input.petId },
        timestamp: /* @__PURE__ */ new Date()
      });
      return result;
    }),
    /**
     * Get tutor's booking requests
     */
    myRequests: protectedProcedure.query(async ({ ctx }) => {
      const { getTutorBookingRequests: getTutorBookingRequests2 } = await Promise.resolve().then(() => (init_bookingRequests_db(), bookingRequests_db_exports));
      return await getTutorBookingRequests2(ctx.user.openId || ctx.user.email || "");
    }),
    /**
     * Cancel a booking request (tutors)
     */
    cancel: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input, ctx }) => {
      const { cancelBookingRequest: cancelBookingRequest2 } = await Promise.resolve().then(() => (init_bookingRequests_db(), bookingRequests_db_exports));
      return await cancelBookingRequest2(input.id, ctx.user.openId || ctx.user.email || "");
    }),
    /**
     * Get all pending requests (admins)
     */
    pending: adminProcedure2.query(async () => {
      const { getPendingBookingRequests: getPendingBookingRequests2 } = await Promise.resolve().then(() => (init_bookingRequests_db(), bookingRequests_db_exports));
      return await getPendingBookingRequests2();
    }),
    /**
     * Get all requests with filters (admins)
     */
    all: adminProcedure2.input(z3.object({ status: z3.string().optional() })).query(async ({ input }) => {
      const { getAllBookingRequests: getAllBookingRequests2 } = await Promise.resolve().then(() => (init_bookingRequests_db(), bookingRequests_db_exports));
      return await getAllBookingRequests2(input.status);
    }),
    /**
     * Approve a booking request (admins)
     */
    approve: adminProcedure2.input(z3.object({
      id: z3.number(),
      adminNotes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const { approveBookingRequest: approveBookingRequest2 } = await Promise.resolve().then(() => (init_bookingRequests_db(), bookingRequests_db_exports));
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { bookingRequests: bookingRequests2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq13 } = await import("drizzle-orm");
      const db2 = await getDb2();
      const [request] = await db2.select().from(bookingRequests2).where(eq13(bookingRequests2.id, input.id));
      const result = await approveBookingRequest2(input.id, ctx.user.openId || ctx.user.email || "", input.adminNotes);
      if (request) {
        const { notifyUser: notifyUser2 } = await Promise.resolve().then(() => (init_websocket(), websocket_exports));
        notifyUser2(request.tutorId, {
          type: "booking_request_approved",
          title: "Reserva Aprovada!",
          message: `Sua solicita\xE7\xE3o de reserva foi aprovada. ${result.creditsUsed} cr\xE9dito(s) consumido(s).`,
          data: { requestId: input.id },
          timestamp: /* @__PURE__ */ new Date()
        });
      }
      return result;
    }),
    /**
     * Reject a booking request (admins)
     */
    reject: adminProcedure2.input(z3.object({
      id: z3.number(),
      adminNotes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const { rejectBookingRequest: rejectBookingRequest2 } = await Promise.resolve().then(() => (init_bookingRequests_db(), bookingRequests_db_exports));
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { bookingRequests: bookingRequests2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq13 } = await import("drizzle-orm");
      const db2 = await getDb2();
      const [request] = await db2.select().from(bookingRequests2).where(eq13(bookingRequests2.id, input.id));
      const result = await rejectBookingRequest2(input.id, ctx.user.openId || ctx.user.email || "", input.adminNotes);
      if (request) {
        const { notifyUser: notifyUser2 } = await Promise.resolve().then(() => (init_websocket(), websocket_exports));
        notifyUser2(request.tutorId, {
          type: "booking_request_rejected",
          title: "Reserva Rejeitada",
          message: input.adminNotes || "Sua solicita\xE7\xE3o de reserva foi rejeitada.",
          data: { requestId: input.id },
          timestamp: /* @__PURE__ */ new Date()
        });
      }
      return result;
    }),
    /**
     * Get booking request statistics (admins)
     */
    stats: adminProcedure2.query(async () => {
      const { getBookingRequestStats: getBookingRequestStats2 } = await Promise.resolve().then(() => (init_bookingRequests_db(), bookingRequests_db_exports));
      return await getBookingRequestStats2();
    })
  }),
  // ==================== HEALTH REMINDERS ====================
  healthReminders: router({
    /**
     * Send all pending health reminders to tutors via WhatsApp
     */
    sendAllReminders: adminProcedure2.input(z3.object({ daysAhead: z3.number().default(7) })).mutation(async ({ input }) => {
      const { sendAllHealthReminders: sendAllHealthReminders2 } = await Promise.resolve().then(() => (init_healthReminders(), healthReminders_exports));
      return await sendAllHealthReminders2(input.daysAhead);
    }),
    /**
     * Send test reminder to a specific tutor
     */
    sendTestReminder: adminProcedure2.input(z3.object({
      phone: z3.string(),
      name: z3.string(),
      petName: z3.string(),
      reminderType: z3.enum(["vaccine", "medication", "flea", "deworming"]),
      itemName: z3.string(),
      daysUntilDue: z3.number()
    })).mutation(async ({ input }) => {
      const { sendHealthReminderToOwner: sendHealthReminderToOwner2 } = await Promise.resolve().then(() => (init_healthReminders(), healthReminders_exports));
      const dueDate = /* @__PURE__ */ new Date();
      dueDate.setDate(dueDate.getDate() + input.daysUntilDue);
      return await sendHealthReminderToOwner2(
        input.phone,
        input.name,
        input.petName,
        input.reminderType,
        input.itemName,
        dueDate,
        input.daysUntilDue
      );
    })
  }),
  // ==================== PRICING ====================
  pricing: router({
    /**
     * Get standard service prices
     */
    getServicePrices: publicProcedure.query(async () => {
      const { getServicePrices: getServicePrices2 } = await Promise.resolve().then(() => (init_pricing_db(), pricing_db_exports));
      return await getServicePrices2();
    }),
    /**
     * Get price for specific service type
     */
    getServicePrice: publicProcedure.input(z3.object({ serviceType: z3.enum(["creche", "diaria"]) })).query(async ({ input }) => {
      const { getServicePrice: getServicePrice2 } = await Promise.resolve().then(() => (init_pricing_db(), pricing_db_exports));
      return await getServicePrice2(input.serviceType);
    }),
    /**
     * Get effective price for a tutor (custom or standard)
     */
    getEffectivePrice: protectedProcedure.input(z3.object({
      tutorId: z3.number(),
      serviceType: z3.enum(["creche", "diaria"])
    })).query(async ({ input }) => {
      const { getEffectivePrice: getEffectivePrice2 } = await Promise.resolve().then(() => (init_pricing_db(), pricing_db_exports));
      return await getEffectivePrice2(input.tutorId, input.serviceType);
    }),
    /**
     * Get custom pricing plan for a tutor
     */
    getCustomPlan: adminProcedure2.input(z3.object({ tutorId: z3.number() })).query(async ({ input }) => {
      const { getCustomPricingPlan: getCustomPricingPlan2 } = await Promise.resolve().then(() => (init_pricing_db(), pricing_db_exports));
      return await getCustomPricingPlan2(input.tutorId);
    }),
    /**
     * Get all custom pricing plans
     */
    getAllCustomPlans: adminProcedure2.query(async () => {
      const { getAllCustomPricingPlans: getAllCustomPricingPlans2 } = await Promise.resolve().then(() => (init_pricing_db(), pricing_db_exports));
      return await getAllCustomPricingPlans2();
    }),
    /**
     * Create custom pricing plan
     */
    createCustomPlan: adminProcedure2.input(z3.object({
      tutorId: z3.number(),
      planName: z3.string(),
      description: z3.string().optional(),
      crechePrice: z3.number().nullable().optional(),
      diariaPrice: z3.number().nullable().optional(),
      discountPercent: z3.number().default(0),
      validFrom: z3.date().optional(),
      validUntil: z3.date().optional()
    })).mutation(async ({ input, ctx }) => {
      const { createCustomPricingPlan: createCustomPricingPlan2 } = await Promise.resolve().then(() => (init_pricing_db(), pricing_db_exports));
      const id = await createCustomPricingPlan2({
        ...input,
        createdBy: ctx.user.id,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      });
      return { id };
    }),
    /**
     * Update custom pricing plan
     */
    updateCustomPlan: adminProcedure2.input(z3.object({
      id: z3.number(),
      crechePrice: z3.number().nullable().optional(),
      diariaPrice: z3.number().nullable().optional(),
      notes: z3.string().optional(),
      isActive: z3.boolean().optional()
    })).mutation(async ({ input }) => {
      const { updateCustomPricingPlan: updateCustomPricingPlan2 } = await Promise.resolve().then(() => (init_pricing_db(), pricing_db_exports));
      const { id, ...data } = input;
      await updateCustomPricingPlan2(id, data);
      return { success: true };
    }),
    /**
     * Deactivate custom pricing plan
     */
    deactivateCustomPlan: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      const { deactivateCustomPricingPlan: deactivateCustomPricingPlan2 } = await Promise.resolve().then(() => (init_pricing_db(), pricing_db_exports));
      await deactivateCustomPricingPlan2(input.id);
      return { success: true };
    })
  }),
  // ==================== FOOD ====================
  food: router({
    /**
     * Get food statistics
     */
    getStats: adminProcedure2.query(async () => {
      const { getFoodStats: getFoodStats2 } = await Promise.resolve().then(() => (init_food_db(), food_db_exports));
      return await getFoodStats2();
    }),
    /**
     * Add stock
     */
    addStock: adminProcedure2.input(z3.object({ amountKg: z3.number(), notes: z3.string().optional() })).mutation(async ({ input, ctx }) => {
      const { addStock: addStock2 } = await Promise.resolve().then(() => (init_food_db(), food_db_exports));
      return await addStock2(input.amountKg, input.notes, ctx.user.id);
    }),
    /**
     * Record daily consumption
     */
    recordConsumption: adminProcedure2.input(z3.object({ amountKg: z3.number(), notes: z3.string().optional() })).mutation(async ({ input }) => {
      const { recordDailyConsumption: recordDailyConsumption2 } = await Promise.resolve().then(() => (init_food_db(), food_db_exports));
      return await recordDailyConsumption2(input.amountKg, input.notes);
    }),
    /**
     * Get food movements history
     */
    getMovements: adminProcedure2.input(z3.object({ limit: z3.number().optional() })).query(async ({ input }) => {
      const { getFoodMovements: getFoodMovements2 } = await Promise.resolve().then(() => (init_food_db(), food_db_exports));
      return await getFoodMovements2(input.limit);
    })
  }),
  // ==================== NOTIFICATION TEMPLATES ====================
  notificationTemplates: router({
    /**
     * Get all notification templates
     */
    getAll: adminProcedure2.query(async () => {
      return await getAllNotificationTemplates();
    }),
    /**
     * Get template by type
     */
    getByType: publicProcedure.input(z3.object({ type: z3.string() })).query(async ({ input }) => {
      return await getNotificationTemplateByType(input.type);
    }),
    /**
     * Create notification template
     */
    create: adminProcedure2.input(z3.object({
      type: z3.enum([
        "vaccine_reminder_7d",
        "vaccine_reminder_1d",
        "medication_reminder",
        "checkin_notification",
        "checkout_notification",
        "daily_report",
        "credits_low",
        "event_reminder"
      ]),
      title: z3.string().min(1),
      message: z3.string().min(1),
      availableVariables: z3.string().optional(),
      isActive: z3.boolean().optional()
    })).mutation(async ({ input }) => {
      const id = await createNotificationTemplate(input);
      return { id: id || 0, success: true };
    }),
    /**
     * Update notification template
     */
    update: adminProcedure2.input(z3.object({
      id: z3.number(),
      title: z3.string().optional(),
      message: z3.string().optional(),
      availableVariables: z3.string().optional(),
      isActive: z3.boolean().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateNotificationTemplate(id, data);
      return { success: true };
    }),
    /**
     * Delete notification template
     */
    delete: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteNotificationTemplate(input.id);
      return { success: true };
    })
  }),
  // ==================== TUTOR NOTIFICATION PREFERENCES ====================
  tutorPreferences: router({
    /**
     * Get all tutor preferences (admin only)
     */
    getAll: adminProcedure2.query(async () => {
      return await getAllTutorPreferences();
    }),
    /**
     * Get preferences for current tutor
     */
    getMine: protectedProcedure.query(async ({ ctx }) => {
      return await getTutorNotificationPreferences(ctx.user.id);
    }),
    /**
     * Get preferences for specific tutor (admin only)
     */
    getByTutor: adminProcedure2.input(z3.object({ tutorId: z3.number() })).query(async ({ input }) => {
      return await getTutorNotificationPreferences(input.tutorId);
    }),
    /**
     * Create or update tutor preference
     */
    upsert: protectedProcedure.input(z3.object({
      notificationType: z3.enum([
        "vaccine_reminder_7d",
        "vaccine_reminder_1d",
        "medication_reminder",
        "checkin_notification",
        "checkout_notification",
        "daily_report",
        "credits_low",
        "event_reminder"
      ]),
      enabled: z3.boolean()
    })).mutation(async ({ input, ctx }) => {
      const existing = await getTutorPreferenceByType(ctx.user.id, input.notificationType);
      if (existing) {
        if (existing.adminOverride) {
          throw new TRPCError4({
            code: "FORBIDDEN",
            message: "Esta prefer\xEAncia foi bloqueada pelo administrador"
          });
        }
        await updateTutorNotificationPreference(existing.id, { enabled: input.enabled });
        return { success: true, id: existing.id };
      } else {
        const id = await createTutorNotificationPreference({
          tutorId: ctx.user.id,
          notificationType: input.notificationType,
          enabled: input.enabled
        });
        return { success: true, id };
      }
    }),
    /**
     * Admin override - force enable/disable for specific tutor
     */
    adminOverride: adminProcedure2.input(z3.object({
      tutorId: z3.number(),
      notificationType: z3.enum([
        "vaccine_reminder_7d",
        "vaccine_reminder_1d",
        "medication_reminder",
        "checkin_notification",
        "checkout_notification",
        "daily_report",
        "credits_low",
        "event_reminder"
      ]),
      adminOverride: z3.boolean()
    })).mutation(async ({ input }) => {
      const existing = await getTutorPreferenceByType(input.tutorId, input.notificationType);
      if (existing) {
        await updateTutorNotificationPreference(existing.id, {
          adminOverride: input.adminOverride,
          enabled: !input.adminOverride
          // If overriding, disable
        });
        return { success: true, id: existing.id };
      } else {
        const id = await createTutorNotificationPreference({
          tutorId: input.tutorId,
          notificationType: input.notificationType,
          enabled: !input.adminOverride,
          adminOverride: input.adminOverride
        });
        return { success: true, id };
      }
    }),
    /**
     * Delete preference
     */
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        const pref = await getTutorNotificationPreferences(ctx.user.id);
        const owned = pref.find((p) => p.id === input.id);
        if (!owned) {
          throw new TRPCError4({ code: "FORBIDDEN" });
        }
      }
      await deleteTutorNotificationPreference(input.id);
      return { success: true };
    })
  }),
  /**
   * Health & Behavior Logs router
   */
  healthBehaviorLogs: router({
    /**
     * Create new health/behavior log
     */
    create: protectedProcedure.input(z3.object({
      petId: z3.number(),
      mood: z3.enum(["feliz", "ansioso", "calmo", "agitado", "letargico", "agressivo"]).optional(),
      stool: z3.enum(["normal", "diarreia", "constipacao", "com_sangue", "muco"]).optional(),
      behavior: z3.enum(["ativo", "brincalhao", "sociavel", "calmo", "relaxado", "curioso", "timido", "protetor", "destrutivo", "letargico", "agressivo", "assustado"]).optional(),
      appetite: z3.enum(["normal", "aumentado", "diminuido", "recusou"]).optional(),
      waterIntake: z3.enum(["normal", "aumentado", "diminuido", "recusou"]).optional(),
      notes: z3.string().optional(),
      recordedAt: z3.date().optional()
    })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        const tutorPets = await getPetsByTutorId(ctx.user.id);
        const hasAccess = tutorPets.some((p) => p.id === input.petId);
        if (!hasAccess) {
          throw new TRPCError4({ code: "FORBIDDEN", message: "Voc\xEA n\xE3o tem acesso a este pet" });
        }
      }
      const result = await createHealthBehaviorLog({
        ...input,
        recordedBy: ctx.user.id,
        recordedAt: input.recordedAt || /* @__PURE__ */ new Date()
      });
      await autoCreateHealthLogEvent(
        input.petId,
        result.insertId,
        input.recordedAt || /* @__PURE__ */ new Date(),
        input.mood,
        input.behavior,
        input.stool,
        input.appetite,
        input.waterIntake,
        input.notes,
        ctx.user.id
      );
      return result;
    }),
    /**
     * Get logs by pet
     */
    getByPet: protectedProcedure.input(z3.object({
      petId: z3.number(),
      limit: z3.number().optional()
    })).query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        const tutorPets = await getPetsByTutorId(ctx.user.id);
        const hasAccess = tutorPets.some((p) => p.id === input.petId);
        if (!hasAccess) {
          throw new TRPCError4({ code: "FORBIDDEN" });
        }
      }
      return await getHealthBehaviorLogsByPet(input.petId, input.limit);
    }),
    /**
     * Get recent logs (admin only)
     */
    getRecent: adminProcedure2.input(z3.object({
      limit: z3.number().optional()
    })).query(async ({ input }) => {
      return await getRecentHealthBehaviorLogs(input.limit);
    }),
    /**
     * Get statistics for a pet
     */
    getStats: protectedProcedure.input(z3.object({
      petId: z3.number(),
      days: z3.number().optional()
    })).query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        const tutorPets = await getPetsByTutorId(ctx.user.id);
        const hasAccess = tutorPets.some((p) => p.id === input.petId);
        if (!hasAccess) {
          throw new TRPCError4({ code: "FORBIDDEN" });
        }
      }
      return await getHealthBehaviorStats(input.petId, input.days);
    }),
    /**
     * Delete log
     */
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input, ctx }) => {
      const log = await getHealthBehaviorLogById(input.id);
      if (!log) {
        throw new TRPCError4({ code: "NOT_FOUND" });
      }
      if (ctx.user.role !== "admin" && log.recordedBy !== ctx.user.id) {
        throw new TRPCError4({ code: "FORBIDDEN" });
      }
      await deleteHealthBehaviorLog(input.id);
      return { success: true };
    })
  }),
  /**
   * Credit Packages Router - Manage available credit packages
   */
  creditPackages: router({
    /**
     * List all active packages
     */
    list: publicProcedure.query(async () => {
      return await getAllCreditPackages();
    }),
    /**
     * List all packages including inactive (admin only)
     */
    listAll: adminProcedure2.query(async () => {
      return await getAllCreditPackagesIncludingInactive();
    }),
    /**
     * Get package by ID
     */
    getById: publicProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => {
      const pkg = await getCreditPackageById(input.id);
      if (!pkg) {
        throw new TRPCError4({ code: "NOT_FOUND", message: "Pacote n\xE3o encontrado" });
      }
      return pkg;
    }),
    /**
     * Create new package (admin only)
     */
    create: adminProcedure2.input(z3.object({
      name: z3.string().min(1),
      description: z3.string().optional(),
      credits: z3.number().min(1),
      priceInCents: z3.number().min(0),
      discountPercent: z3.number().min(0).max(100).optional(),
      displayOrder: z3.number().optional()
    })).mutation(async ({ input }) => {
      return await createCreditPackage({
        ...input,
        isActive: true
      });
    }),
    /**
     * Update package (admin only)
     */
    update: adminProcedure2.input(z3.object({
      id: z3.number(),
      name: z3.string().min(1).optional(),
      description: z3.string().optional(),
      credits: z3.number().min(1).optional(),
      priceInCents: z3.number().min(0).optional(),
      discountPercent: z3.number().min(0).max(100).optional(),
      isActive: z3.boolean().optional(),
      displayOrder: z3.number().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateCreditPackage(id, data);
      return { success: true };
    }),
    /**
     * Delete package (soft delete - admin only)
     */
    delete: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteCreditPackage(input.id);
      return { success: true };
    })
  }),
  /**
   * Event Types Router - Manage custom event types for calendar
   */
  eventTypes: router({
    /**
     * List all active event types
     */
    list: publicProcedure.query(async () => {
      return await getAllEventTypes();
    }),
    /**
     * List all event types including inactive (admin only)
     */
    listAll: adminProcedure2.query(async () => {
      return await getAllEventTypesIncludingInactive();
    }),
    /**
     * Get event type by ID
     */
    getById: publicProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => {
      return await getEventTypeById(input.id);
    }),
    /**
     * Create new event type (admin only)
     */
    create: adminProcedure2.input(z3.object({
      name: z3.string().min(1),
      color: z3.string().regex(/^#[0-9A-Fa-f]{6}$/),
      icon: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const result = await createEventType({
        ...input,
        createdById: ctx.user.id
      });
      return result;
    }),
    /**
     * Update event type (admin only)
     */
    update: adminProcedure2.input(z3.object({
      id: z3.number(),
      name: z3.string().min(1).optional(),
      color: z3.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      icon: z3.string().optional(),
      isActive: z3.boolean().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateEventType(id, data);
      return { success: true };
    }),
    /**
     * Delete event type (soft delete - admin only)
     */
    delete: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteEventType(input.id);
      return { success: true };
    })
  }),
  /**
   * Medication Auto-Schedule Rules Router - Manage automatic scheduling rules
   */
  autoScheduleRules: router({
    /**
     * List all active auto-schedule rules
     */
    list: publicProcedure.query(async () => {
      return await getAllAutoScheduleRules();
    }),
    /**
     * List all auto-schedule rules including inactive (admin only)
     */
    listAll: adminProcedure2.query(async () => {
      return await getAllAutoScheduleRulesIncludingInactive();
    }),
    /**
     * Get auto-schedule rule by ID
     */
    getById: publicProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => {
      return await getAutoScheduleRuleById(input.id);
    }),
    /**
     * Get auto-schedule rule by medication ID
     */
    getByMedicationId: publicProcedure.input(z3.object({ medicationId: z3.number() })).query(async ({ input }) => {
      return await getAutoScheduleRuleByMedicationId(input.medicationId);
    }),
    /**
     * Create new auto-schedule rule (admin only)
     */
    create: adminProcedure2.input(z3.object({
      medicationId: z3.number(),
      intervalDays: z3.number().min(1),
      intervalType: z3.enum(["days", "weeks", "months", "years"]),
      intervalValue: z3.number().min(1),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      const result = await createAutoScheduleRule(input);
      return result;
    }),
    /**
     * Update auto-schedule rule (admin only)
     */
    update: adminProcedure2.input(z3.object({
      id: z3.number(),
      medicationId: z3.number().optional(),
      intervalDays: z3.number().min(1).optional(),
      intervalType: z3.enum(["days", "weeks", "months", "years"]).optional(),
      intervalValue: z3.number().min(1).optional(),
      isActive: z3.boolean().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateAutoScheduleRule(id, data);
      return { success: true };
    }),
    /**
     * Delete auto-schedule rule (soft delete - admin only)
     */
    delete: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteAutoScheduleRule(input.id);
      return { success: true };
    })
  }),
  /**
   * Pet Food Stock Router - Manage pet food inventory and consumption
   */
  petFoodStock: router({
    /**
     * Get food stock for a specific pet
     */
    get: publicProcedure.input(z3.object({ petId: z3.number() })).query(async ({ input }) => {
      const stock = await getPetFoodStock(input.petId);
      if (!stock) return null;
      const daysRemaining = calculateStockDuration(stock.currentStock, stock.dailyConsumption);
      const restockDate = calculateRestockDate(
        stock.currentStock,
        stock.dailyConsumption,
        stock.alertThresholdDays
      );
      const needsRestock = daysRemaining <= stock.alertThresholdDays;
      return {
        ...stock,
        daysRemaining,
        restockDate,
        needsRestock
      };
    }),
    /**
     * Create or update food stock for a pet
     */
    upsert: protectedProcedure.input(z3.object({
      petId: z3.number(),
      brandName: z3.string().min(1),
      currentStock: z3.number().min(0),
      dailyConsumption: z3.number().min(1),
      alertThresholdDays: z3.number().min(1).optional(),
      lastPurchaseDate: z3.date().optional(),
      lastPurchaseAmount: z3.number().min(0).optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      const existing = await getPetFoodStock(input.petId);
      if (existing) {
        await updatePetFoodStock(input.petId, input);
        return { success: true, id: existing.id };
      } else {
        const result = await createPetFoodStock(input);
        return { success: true, id: result.id };
      }
    }),
    /**
     * Register a food purchase (adds to current stock)
     */
    registerPurchase: protectedProcedure.input(z3.object({
      petId: z3.number(),
      amount: z3.number().min(1),
      // amount in grams
      brandName: z3.string().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      const stock = await getPetFoodStock(input.petId);
      if (!stock) {
        throw new TRPCError4({
          code: "NOT_FOUND",
          message: "Food stock not found for this pet. Please create it first."
        });
      }
      const newStock = stock.currentStock + input.amount;
      await updatePetFoodStock(input.petId, {
        currentStock: newStock,
        lastPurchaseDate: /* @__PURE__ */ new Date(),
        lastPurchaseAmount: input.amount,
        brandName: input.brandName || stock.brandName,
        notes: input.notes
      });
      return { success: true, newStock };
    }),
    /**
     * Get all pets with low food stock (admin only)
     */
    getLowStock: adminProcedure2.input(z3.object({
      thresholdDays: z3.number().min(1).optional()
    }).optional()).query(async ({ input }) => {
      const lowStockPets = await getAllLowStockPets(input?.thresholdDays);
      return lowStockPets.map((stock) => ({
        ...stock,
        daysRemaining: calculateStockDuration(stock.currentStock, stock.dailyConsumption)
      }));
    })
  }),
  /**
   * Wall posts router - Interactive feed with photos, comments, and reactions
   */
  wall: router({
    /**
     * Create a new wall post
     */
    createPost: protectedProcedure.input(z3.object({
      petId: z3.number().optional(),
      content: z3.string().optional(),
      mediaData: z3.array(z3.string()).optional(),
      // base64 encoded images/videos
      postType: z3.enum(["photo", "video", "text", "mixed"]).default("text"),
      targetType: z3.enum(["general", "tutor", "pet"]).default("general"),
      targetId: z3.number().optional()
      // tutor or pet ID if targeted
    })).mutation(async ({ ctx, input }) => {
      const mediaUrls = [];
      const mediaKeys = [];
      if (input.mediaData && input.mediaData.length > 0) {
        const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
        for (const base64Data of input.mediaData) {
          try {
            if (!base64Data || typeof base64Data !== "string") {
              throw new Error("Invalid image data format");
            }
            const parts = base64Data.split(",");
            const base64Content = parts.length > 1 ? parts[1] : parts[0];
            if (!base64Content) {
              throw new Error("Empty image data");
            }
            const buffer = Buffer.from(base64Content, "base64");
            const contentTypeMatch = base64Data.match(/data:([^;]+)/);
            const contentType = contentTypeMatch ? contentTypeMatch[1] : "image/jpeg";
            let ext = "jpg";
            if (contentType.includes("png")) ext = "png";
            else if (contentType.includes("gif")) ext = "gif";
            else if (contentType.includes("webp")) ext = "webp";
            else if (contentType.includes("mp4") || contentType.includes("video")) ext = "mp4";
            const randomSuffix = Math.random().toString(36).substring(7);
            const key = `wall-posts/${ctx.user.id}/${Date.now()}-${randomSuffix}.${ext}`;
            const { url } = await storagePut2(key, buffer, contentType);
            mediaUrls.push(url);
            mediaKeys.push(key);
          } catch (error) {
            console.error("Error processing wall post image:", error);
            throw new Error(`Failed to process image: ${error.message}`);
          }
        }
      }
      const postId = await createWallPost({
        petId: input.petId,
        authorId: ctx.user.id,
        content: input.content,
        mediaUrls,
        mediaKeys,
        postType: input.postType,
        targetType: input.targetType,
        targetId: input.targetId
      });
      if (input.targetType === "tutor" && input.targetId) {
        await createNotification({
          userId: input.targetId,
          type: "system",
          title: "Nova mensagem no mural",
          message: `${ctx.user.name || "Administrador"} publicou uma mensagem direcionada para voc\xEA no mural da creche`,
          isRead: false
        });
      } else if (input.targetType === "pet" && input.targetId) {
        const tutors = await getTutorsByPet(input.targetId);
        for (const tutor of tutors) {
          if (tutor.tutorId) {
            const pet = await getPetById(input.targetId);
            await createNotification({
              userId: tutor.tutorId,
              type: "system",
              title: "Nova atualiza\xE7\xE3o sobre seu pet",
              message: `${ctx.user.name || "Administrador"} publicou uma atualiza\xE7\xE3o sobre ${pet?.name || "seu pet"} no mural da creche`,
              isRead: false
            });
          }
        }
      }
      return { success: true, postId };
    }),
    /**
     * Get wall posts with pagination and visibility filtering
     */
    getPosts: protectedProcedure.input(z3.object({
      limit: z3.number().min(1).max(50).default(20),
      offset: z3.number().min(0).default(0),
      petId: z3.number().optional(),
      targetType: z3.enum(["general", "tutor", "pet", "all"]).optional()
    })).query(async ({ ctx, input }) => {
      const posts = await getWallPosts(input.limit, input.offset, input.petId, ctx.user.id, input.targetType);
      const enrichedPosts = await Promise.all(
        posts.map(async (post) => {
          const comments = await getWallComments(post.id);
          const reactionCounts = await getWallReactionCounts(post.id);
          return {
            ...post,
            mediaUrls: post.mediaUrls ? JSON.parse(post.mediaUrls) : [],
            comments,
            reactionCounts,
            commentCount: comments.length
          };
        })
      );
      return enrichedPosts;
    }),
    /**
     * Add a comment to a post
     */
    addComment: protectedProcedure.input(z3.object({
      postId: z3.number(),
      comment: z3.string().min(1)
    })).mutation(async ({ ctx, input }) => {
      const commentId = await addWallComment(input.postId, ctx.user.id, input.comment);
      return { success: true, commentId };
    }),
    /**
     * Add or update a reaction to a post
     */
    addReaction: protectedProcedure.input(z3.object({
      postId: z3.number(),
      reactionType: z3.enum(["like", "love", "laugh", "wow", "sad"])
    })).mutation(async ({ ctx, input }) => {
      await addWallReaction(input.postId, ctx.user.id, input.reactionType);
      return { success: true };
    }),
    /**
     * Remove a reaction from a post
     */
    removeReaction: protectedProcedure.input(z3.object({
      postId: z3.number()
    })).mutation(async ({ ctx, input }) => {
      await removeWallReaction(input.postId, ctx.user.id);
      return { success: true };
    }),
    /**
     * Delete a post (admin or author only)
     */
    deletePost: protectedProcedure.input(z3.object({
      postId: z3.number()
    })).mutation(async ({ ctx, input }) => {
      const post = await getWallPostById(input.postId);
      if (!post) {
        throw new TRPCError4({
          code: "NOT_FOUND",
          message: "Post not found"
        });
      }
      if (ctx.user.role !== "admin" && post.authorId !== ctx.user.id) {
        throw new TRPCError4({
          code: "FORBIDDEN",
          message: "You can only delete your own posts"
        });
      }
      await deleteWallPost(input.postId);
      return { success: true };
    })
  }),
  /**
   * Chat router - Messaging with WhatsApp integration
   */
  chat: router({
    /**
     * Get user's conversations
     */
    getConversations: protectedProcedure.query(async ({ ctx }) => {
      return await getConversations(ctx.user.id);
    }),
    /**
     * Get messages from a conversation
     */
    getMessages: protectedProcedure.input(z3.object({
      conversationId: z3.number(),
      limit: z3.number().min(1).max(100).default(50),
      offset: z3.number().min(0).default(0)
    })).query(async ({ input }) => {
      return await getChatMessages(input.conversationId, input.limit, input.offset);
    }),
    /**
     * Send a message
     */
    sendMessage: protectedProcedure.input(z3.object({
      conversationId: z3.number(),
      content: z3.string().optional(),
      mediaData: z3.string().optional(),
      // base64 encoded media
      messageType: z3.enum(["text", "image", "video", "audio", "document"]).default("text")
    })).mutation(async ({ ctx, input }) => {
      let mediaUrl;
      let mediaKey;
      if (input.mediaData) {
        const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
        const buffer = Buffer.from(input.mediaData.split(",")[1], "base64");
        const randomSuffix = Math.random().toString(36).substring(7);
        const ext = input.messageType === "image" ? "jpg" : input.messageType === "video" ? "mp4" : "bin";
        const key = `chat-media/${ctx.user.id}/${Date.now()}-${randomSuffix}.${ext}`;
        const { url } = await storagePut2(key, buffer, input.mediaData.split(";")[0].split(":")[1]);
        mediaUrl = url;
        mediaKey = key;
      }
      const messageId = await addChatMessage({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        content: input.content,
        mediaUrl,
        mediaKey,
        messageType: input.messageType
      });
      try {
        const { syncMessageToWhatsApp: syncMessageToWhatsApp2 } = await Promise.resolve().then(() => (init_whatsappSync(), whatsappSync_exports));
        await syncMessageToWhatsApp2(messageId);
      } catch (error) {
        console.error("Erro ao sincronizar mensagem com WhatsApp:", error);
      }
      return { success: true, messageId };
    }),
    /**
     * Mark messages as read
     */
    markAsRead: protectedProcedure.input(z3.object({
      conversationId: z3.number()
    })).mutation(async ({ ctx, input }) => {
      await markMessagesAsRead(input.conversationId, ctx.user.id);
      return { success: true };
    }),
    /**
     * Create a new conversation
     */
    createConversation: protectedProcedure.input(z3.object({
      petId: z3.number().optional(),
      participantIds: z3.array(z3.number())
    })).mutation(async ({ ctx, input }) => {
      const participantSet = /* @__PURE__ */ new Set([...input.participantIds, ctx.user.id]);
      const participants = Array.from(participantSet);
      const conversationId = await createConversation({
        petId: input.petId,
        participants
      });
      return { success: true, conversationId };
    })
  }),
  // Search
  search: searchRouter
});

// server/_core/context.ts
init_db();
import { createClient } from "@supabase/supabase-js";
var supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        `Missing Supabase environment variables. VITE_SUPABASE_URL: ${supabaseUrl ? "OK" : "MISSING"}, SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? "OK" : "MISSING"}`
      );
    }
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdmin;
}
async function createContext(opts) {
  let user = null;
  try {
    const authHeader = opts.req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return {
        req: opts.req,
        res: opts.res,
        user: null
      };
    }
    const token = authHeader.substring(7);
    const {
      data: { user: supabaseUser },
      error
    } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !supabaseUser) {
      return {
        req: opts.req,
        res: opts.res,
        user: null
      };
    }
    await upsertUserFromSupabase(supabaseUser);
    const foundUser = await getUserByAuthId(supabaseUser.id);
    if (!foundUser) {
      return {
        req: opts.req,
        res: opts.res,
        user: null
      };
    }
    user = foundUser;
  } catch (error) {
    console.warn("[Auth] Error authenticating request:", error);
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/uploadRouter.ts
init_storage();
import { Router } from "express";
import { nanoid } from "nanoid";
var uploadRouter = Router();
uploadRouter.post("/upload-photo", async (req, res) => {
  try {
    const { fileName, fileType, fileData } = req.body;
    if (!fileName || !fileType || !fileData) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const base64Data = fileData.split(",")[1] || fileData;
    const buffer = Buffer.from(base64Data, "base64");
    const extension = fileName.split(".").pop() || "jpg";
    const uniqueId = nanoid(10);
    const fileKey = `pets/photos/${uniqueId}.${extension}`;
    const { url } = await storagePut(fileKey, buffer, fileType);
    res.json({ url, key: fileKey });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload photo" });
  }
});

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var plugins = [react(), tailwindcss(), vitePluginManusRuntime()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
init_websocket();
dotenv.config({ path: ".env.local" });
dotenv.config();
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  app.set("trust proxy", 1);
  const server = createServer(app);
  const { handleStripeWebhook: handleStripeWebhook2 } = await Promise.resolve().then(() => (init_stripeWebhook(), stripeWebhook_exports));
  app.post("/api/stripe/webhook", express2.raw({ type: "application/json" }), handleStripeWebhook2);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  app.use("/api", uploadRouter);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  initializeWebSocket(server);
  console.log("[WebSocket] Server initialized");
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
