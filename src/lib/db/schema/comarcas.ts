import {
  pgTable,
  serial,
  varchar,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export type ComarcaFeatures = {
  drive: boolean;
  whatsapp: boolean;
  enrichment: boolean;
  calendar_sync: boolean;
};

export const comarcas = pgTable("comarcas", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  regional: varchar("regional", { length: 50 }),
  regiaoMetro: varchar("regiao_metro", { length: 50 }),
  uf: varchar("uf", { length: 2 }).default("BA").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  features: jsonb("features")
    .$type<ComarcaFeatures>()
    .default({ drive: false, whatsapp: false, enrichment: false, calendar_sync: false })
    .notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("comarcas_regiao_metro_idx").on(table.regiaoMetro),
  index("comarcas_ativo_idx").on(table.ativo),
]);

export type Comarca = typeof comarcas.$inferSelect;
export type InsertComarca = typeof comarcas.$inferInsert;
