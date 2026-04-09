import { pgTable, serial, integer, text, timestamp, jsonb, index, varchar } from "drizzle-orm/pg-core";
import { users } from "./core";

// ==========================================
// AUDIT LOG — Rastreia quem fez o quê
// ==========================================

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),

  // Quem fez a ação
  userId: integer("user_id").references(() => users.id),
  userName: text("user_name"), // Snapshot do nome (caso user seja deletado)

  // O que foi alterado
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'demanda', 'assistido', 'processo', etc.
  entityId: integer("entity_id").notNull(),

  // Tipo de ação
  action: varchar("action", { length: 30 }).notNull(), // 'create', 'update', 'delete', 'import', 'status_change'

  // Detalhes da mudança
  changes: jsonb("changes"), // { field: { old: "X", new: "Y" } }
  metadata: jsonb("metadata"), // Dados extras (import_batch_id, ip, etc.)

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  index("audit_logs_user_id_idx").on(table.userId),
  index("audit_logs_action_idx").on(table.action),
  index("audit_logs_created_at_idx").on(table.createdAt),
]);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
