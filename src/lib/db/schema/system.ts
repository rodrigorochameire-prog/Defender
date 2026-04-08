import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

/**
 * system_heartbeat — liveness reporting for background workers.
 *
 * scripts/claude-code-daemon.mjs upserts its own row every 30s.
 * /admin/daemon reads from this table to show "🟢 ativo / 🔴 parado".
 */
export const systemHeartbeat = pgTable("system_heartbeat", {
  name: text("name").primaryKey(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

export type SystemHeartbeat = typeof systemHeartbeat.$inferSelect;
