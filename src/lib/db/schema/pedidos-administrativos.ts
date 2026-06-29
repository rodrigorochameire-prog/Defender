import { pgTable, pgEnum, serial, integer, text, date, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./core";

export const pedidoEstadoEnum = pgEnum("pedido_estado", [
  "solicitado", "em_analise", "deferido", "indeferido", "cancelado",
]);

export const pedidosAdministrativos = pgTable("pedidos_administrativos", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  assunto: text("assunto").notNull(),
  descricao: text("descricao"),
  dataPedido: date("data_pedido").notNull(),
  prazo: date("prazo"),
  estado: pedidoEstadoEnum("estado").default("solicitado").notNull(),
  seiProtocolo: text("sei_protocolo"),
  observacao: text("observacao"),
  vidaFuncionalEventoId: integer("vida_funcional_evento_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("pedidos_adm_defensor_estado_deleted_idx").on(table.defensorId, table.estado, table.deletedAt),
  index("pedidos_adm_defensor_prazo_idx").on(table.defensorId, table.prazo),
]);

export type PedidoAdministrativo = typeof pedidosAdministrativos.$inferSelect;
export type InsertPedidoAdministrativo = typeof pedidosAdministrativos.$inferInsert;
