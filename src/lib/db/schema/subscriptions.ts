import {
  pgTable, serial, varchar, integer, timestamp, numeric,
  boolean, text, jsonb, index, date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./core";

// ==========================================
// ASSINATURAS (PLANOS DE DEFENSORES)
// ==========================================

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),

  // Plano
  plano: varchar("plano", { length: 20 }).notNull().default("essencial"),
    // "essencial" (R$100), "criminal" (R$150), "completo" (R$200)

  // Status
  status: varchar("status", { length: 20 }).notNull().default("pendente"),
    // "ativo", "pendente", "vencido", "cancelado", "isento"

  // Valores
  valorBase: numeric("valor_base").notNull(), // 100, 150, 200
  descontoPercentual: integer("desconto_percentual").default(0), // 0-100
  valorFinal: numeric("valor_final").notNull(), // valorBase * (1 - desconto/100)

  // Datas
  dataInicio: date("data_inicio"),
  dataVencimento: date("data_vencimento"), // proximo vencimento
  dataUltimoPagamento: date("data_ultimo_pagamento"),

  // Asaas (preenchido quando integracao estiver ativa)
  asaasCustomerId: varchar("asaas_customer_id", { length: 100 }),
  asaasSubscriptionId: varchar("asaas_subscription_id", { length: 100 }),

  // Tolerancia
  diasTolerancia: integer("dias_tolerancia").default(7),

  observacoes: text("observacoes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("subscriptions_user_idx").on(table.userId),
  index("subscriptions_status_idx").on(table.status),
  index("subscriptions_plano_idx").on(table.plano),
  index("subscriptions_vencimento_idx").on(table.dataVencimento),
]);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

// ==========================================
// PAGAMENTOS (HISTORICO)
// ==========================================

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),

  valor: numeric("valor").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pendente"),
    // "pendente", "confirmado", "expirado", "estornado"

  metodo: varchar("metodo", { length: 20 }).default("pix"),
  referenciaMes: varchar("referencia_mes", { length: 7 }), // "2026-04"

  // Asaas
  asaasPaymentId: varchar("asaas_payment_id", { length: 100 }),
  pixQrCode: text("pix_qr_code"),
  pixCopiaCola: text("pix_copia_cola"),

  dataPagamento: timestamp("data_pagamento"),
  dataVencimento: date("data_vencimento"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("payments_subscription_idx").on(table.subscriptionId),
  index("payments_user_idx").on(table.userId),
  index("payments_status_idx").on(table.status),
  index("payments_referencia_idx").on(table.referenciaMes),
]);

export const paymentsRelations = relations(payments, ({ one }) => ({
  subscription: one(subscriptions, { fields: [payments.subscriptionId], references: [subscriptions.id] }),
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
