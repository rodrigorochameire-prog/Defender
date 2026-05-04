import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  varchar,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { processos } from "./core";

// ==========================================
// MÓDULO MPU - Análise estruturada
// ==========================================
// Cada processo VVD com MPU tem 1 relato classificado (1:1).
// Taxonomia viva cresce com cada extração (Fase 3 do pipeline).
// Ver: docs/superpowers/specs/2026-05-04-mpu-reform-design.md

export const mpuRelatos = pgTable(
  "mpu_relatos",
  {
    id: serial("id").primaryKey(),
    processoId: integer("processo_id")
      .notNull()
      // CASCADE: relato é dado derivado — quando processo deletado, relato perde sentido
      .references(() => processos.id, { onDelete: "cascade" }),

    // Relato literal extraído da representação/BO
    relatoTexto: text("relato_texto"),

    // Classificações (Lei 11.340/2006 art. 7º para violência)
    tiposViolencia: text("tipos_violencia").array(),
    relacao: varchar("relacao", { length: 30 }),
    gatilhos: text("gatilhos").array(),
    provasMencionadas: text("provas_mencionadas").array(),
    gravidade: varchar("gravidade", { length: 10 }),

    // Auditoria do classificador
    extraidoEm: timestamp("extraido_em").defaultNow().notNull(),
    extracaoModelo: varchar("extracao_modelo", { length: 40 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("mpu_relatos_processo_id_uniq").on(table.processoId),
    index("mpu_relatos_relacao_idx").on(table.relacao),
    index("mpu_relatos_gravidade_idx").on(table.gravidade),
  ],
);

export type MpuRelatoRow = typeof mpuRelatos.$inferSelect;
export type InsertMpuRelato = typeof mpuRelatos.$inferInsert;

export const mpuTaxonomia = pgTable(
  "mpu_taxonomia",
  {
    id: serial("id").primaryKey(),
    categoria: varchar("categoria", { length: 20 }).notNull(),
    // valores: gatilho | violencia | medida | relacao | prova
    termo: varchar("termo", { length: 60 }).notNull(),
    contagem: integer("contagem").default(0).notNull(),
    primeiroVistoEm: timestamp("primeiro_visto_em").defaultNow().notNull(),
    ultimoVistoEm: timestamp("ultimo_visto_em").defaultNow().notNull(),
    aprovado: boolean("aprovado").default(false).notNull(),
    variantes: text("variantes").array(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("mpu_taxonomia_categoria_termo_uniq").on(
      table.categoria,
      table.termo,
    ),
    index("mpu_taxonomia_categoria_idx").on(table.categoria),
    index("mpu_taxonomia_aprovado_idx").on(table.aprovado),
  ],
);

export type MpuTaxonomiaRow = typeof mpuTaxonomia.$inferSelect;
export type InsertMpuTaxonomiaRow = typeof mpuTaxonomia.$inferInsert;
