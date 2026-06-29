import { pgTable, pgEnum, serial, integer, text, date, numeric, bigint, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./core";

export const diariaStatusEnum = pgEnum("diaria_status", [
  "a_requerer", "requerida", "autorizada", "paga", "cancelada",
]);

export const diarias = pgTable("diarias", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  destino: text("destino").notNull(),
  origem: text("origem"),
  motivo: text("motivo"),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim").notNull(),
  quantidade: numeric("quantidade", { precision: 5, scale: 1 }).notNull(),
  valorUnitarioCents: bigint("valor_unitario_cents", { mode: "number" }).notNull(),
  status: diariaStatusEnum("status").default("a_requerer").notNull(),
  seiProtocolo: text("sei_protocolo"),
  vidaFuncionalEventoId: integer("vida_funcional_evento_id"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("diarias_defensor_status_deleted_idx").on(table.defensorId, table.status, table.deletedAt),
  index("diarias_defensor_data_idx").on(table.defensorId, table.dataInicio),
]);

export type Diaria = typeof diarias.$inferSelect;
export type InsertDiaria = typeof diarias.$inferInsert;
