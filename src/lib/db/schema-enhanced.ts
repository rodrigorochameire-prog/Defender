/**
 * Schema Enhanced - Novos campos e tabelas para gestão profissional
 * 
 * Este arquivo define as novas tabelas e campos estruturados
 * para o TeteCareHub v2 Professional.
 */

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
  date,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { pets, users, calendarEvents, petMedications } from "./schema";

// ============================================
// INSPEÇÃO DE CHECK-IN
// ============================================

export const checkinInspections = pgTable("checkin_inspections", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  calendarEventId: integer("calendar_event_id")
    .references(() => calendarEvents.id, { onDelete: "set null" }),
  inspectionDate: timestamp("inspection_date").defaultNow().notNull(),
  
  // Estado Físico
  skinCoatStatus: varchar("skin_coat_status", { length: 20 }), // intact, parasites, hair_loss, wound, redness, hot_spot, dry
  skinCoatNotes: text("skin_coat_notes"),
  earStatus: varchar("ear_status", { length: 20 }), // clean, odor, discharge, sensitivity, red
  earNotes: text("ear_notes"),
  eyeStatus: varchar("eye_status", { length: 20 }), // clean, tearing, opacity, redness, discharge
  eyeNotes: text("eye_notes"),
  pawStatus: varchar("paw_status", { length: 20 }), // normal, long_nails, licking, pad_injury, interdigital
  pawNotes: text("paw_notes"),
  
  // Observações gerais
  checkinObservations: jsonb("checkin_observations").default(sql`'[]'::jsonb`), // array de observações
  generalNotes: text("general_notes"),
  
  // Fotos de evidência
  photos: jsonb("photos").default(sql`'[]'::jsonb`),
  
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("checkin_inspections_pet_id_idx").on(table.petId),
  index("checkin_inspections_date_idx").on(table.inspectionDate),
]);

export type CheckinInspection = typeof checkinInspections.$inferSelect;
export type InsertCheckinInspection = typeof checkinInspections.$inferInsert;

// ============================================
// MEDICAMENTOS DO PET
// ============================================
// NOTA: A tabela petMedications já existe em schema.ts
// Ela é importada no topo do arquivo para uso nas relações

// ============================================
// LOGS DE ADMINISTRAÇÃO DE MEDICAMENTOS
// ============================================

export const medicationLogs = pgTable("medication_logs", {
  id: serial("id").primaryKey(),
  petMedicationId: integer("pet_medication_id")
    .notNull()
    .references(() => petMedications.id, { onDelete: "cascade" }),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  
  administeredAt: timestamp("administered_at").notNull(),
  scheduledTime: varchar("scheduled_time", { length: 10 }), // "08:00"
  
  wasGiven: boolean("was_given").default(true),
  reasonNotGiven: text("reason_not_given"), // se não foi dado, por quê
  
  notes: text("notes"),
  administeredById: integer("administered_by_id").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("medication_logs_pet_id_idx").on(table.petId),
  index("medication_logs_date_idx").on(table.administeredAt),
]);

export type MedicationLog = typeof medicationLogs.$inferSelect;
export type InsertMedicationLog = typeof medicationLogs.$inferInsert;

// ============================================
// SKILLS MATRIX - COMANDOS DE TREINAMENTO
// ============================================

export const petTrainingCommands = pgTable("pet_training_commands", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  
  command: varchar("command", { length: 30 }).notNull(), // sit, down, stay, come, heel, place, etc.
  category: varchar("category", { length: 20 }), // basic, intermediate, advanced, fun, behavior
  
  proficiency: varchar("proficiency", { length: 20 }).default("not_started"), // not_started, learning, with_treat, reliable, proofed
  
  // 3Ds: Distance, Duration, Distraction
  distanceLevel: integer("distance_level").default(1), // 1-5
  durationLevel: integer("duration_level").default(1), // 1-5
  distractionLevel: integer("distraction_level").default(1), // 1-5
  
  notes: text("notes"),
  lastPracticed: date("last_practiced"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("pet_training_commands_pet_id_idx").on(table.petId),
  uniqueIndex("pet_training_commands_pet_command_unique").on(table.petId, table.command),
]);

export type PetTrainingCommand = typeof petTrainingCommands.$inferSelect;
export type InsertPetTrainingCommand = typeof petTrainingCommands.$inferInsert;

// ============================================
// SESSÕES DE TREINO
// ============================================

export const trainingSessions = pgTable("training_sessions", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  
  sessionDate: timestamp("session_date").defaultNow().notNull(),
  durationMinutes: integer("duration_minutes"),
  
  commandsPracticed: jsonb("commands_practiced").default(sql`'[]'::jsonb`), // [{"command": "sit", "success_rate": 80}]
  
  focusLevel: integer("focus_level"), // 1-5
  motivationLevel: integer("motivation_level"), // 1-5
  
  notes: text("notes"),
  achievements: text("achievements"), // marcos alcançados
  
  trainerId: integer("trainer_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("training_sessions_pet_id_idx").on(table.petId),
  index("training_sessions_date_idx").on(table.sessionDate),
]);

export type TrainingSession = typeof trainingSessions.$inferSelect;
export type InsertTrainingSession = typeof trainingSessions.$inferInsert;

// ============================================
// MATRIZ DE COMPATIBILIDADE SOCIAL
// ============================================

export const petCompatibility = pgTable("pet_compatibility", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  otherPetId: integer("other_pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  
  compatibilityType: varchar("compatibility_type", { length: 20 }).notNull(), // friend, neutral, avoid, best_friend
  
  notes: text("notes"),
  observedDate: date("observed_date").defaultNow(),
  
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("pet_compatibility_pet_id_idx").on(table.petId),
  index("pet_compatibility_other_pet_id_idx").on(table.otherPetId),
  uniqueIndex("pet_compatibility_pair_unique").on(table.petId, table.otherPetId),
]);

export type PetCompatibility = typeof petCompatibility.$inferSelect;
export type InsertPetCompatibility = typeof petCompatibility.$inferInsert;

// ============================================
// ALERTAS DO SISTEMA
// ============================================

export const systemAlerts = pgTable("system_alerts", {
  id: serial("id").primaryKey(),
  
  alertType: varchar("alert_type", { length: 50 }).notNull(), // negative_credits, overdue_vaccine, behavior_incident, etc.
  severity: varchar("severity", { length: 20 }).default("medium"), // low, medium, high, critical
  
  relatedType: varchar("related_type", { length: 50 }), // pet, tutor, booking, etc.
  relatedId: integer("related_id"),
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedById: integer("resolved_by_id").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("system_alerts_type_idx").on(table.alertType),
  index("system_alerts_resolved_idx").on(table.isResolved),
  index("system_alerts_severity_idx").on(table.severity),
]);

export type SystemAlert = typeof systemAlerts.$inferSelect;
export type InsertSystemAlert = typeof systemAlerts.$inferInsert;

// ============================================
// RELAÇÕES
// ============================================

export const checkinInspectionsRelations = relations(checkinInspections, ({ one }) => ({
  pet: one(pets, { fields: [checkinInspections.petId], references: [pets.id] }),
  calendarEvent: one(calendarEvents, { fields: [checkinInspections.calendarEventId], references: [calendarEvents.id] }),
  createdBy: one(users, { fields: [checkinInspections.createdById], references: [users.id] }),
}));

export const petMedicationsRelations = relations(petMedications, ({ one, many }) => ({
  pet: one(pets, { fields: [petMedications.petId], references: [pets.id] }),
  logs: many(medicationLogs),
}));

export const medicationLogsRelations = relations(medicationLogs, ({ one }) => ({
  medication: one(petMedications, { fields: [medicationLogs.petMedicationId], references: [petMedications.id] }),
  pet: one(pets, { fields: [medicationLogs.petId], references: [pets.id] }),
  administeredBy: one(users, { fields: [medicationLogs.administeredById], references: [users.id] }),
}));

export const petTrainingCommandsRelations = relations(petTrainingCommands, ({ one }) => ({
  pet: one(pets, { fields: [petTrainingCommands.petId], references: [pets.id] }),
}));

export const trainingSessionsRelations = relations(trainingSessions, ({ one }) => ({
  pet: one(pets, { fields: [trainingSessions.petId], references: [pets.id] }),
  trainer: one(users, { fields: [trainingSessions.trainerId], references: [users.id] }),
}));

export const petCompatibilityRelations = relations(petCompatibility, ({ one }) => ({
  pet: one(pets, { fields: [petCompatibility.petId], references: [pets.id] }),
  otherPet: one(pets, { fields: [petCompatibility.otherPetId], references: [pets.id] }),
  createdBy: one(users, { fields: [petCompatibility.createdById], references: [users.id] }),
}));

export const systemAlertsRelations = relations(systemAlerts, ({ one }) => ({
  resolvedBy: one(users, { fields: [systemAlerts.resolvedById], references: [users.id] }),
}));
