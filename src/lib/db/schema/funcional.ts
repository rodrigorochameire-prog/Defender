import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  date,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./core";

// ==========================================
// VIDA FUNCIONAL — Substituições e gratificações
// ==========================================
//
// Registra cada substituição (automática/cumulativa/extraordinária) sob a ótica
// do requerimento de gratificação: período, ESCOPO DE VARA escolhido pelo
// defensor (peculiaridade da 7ª/9ª DP de Camaçari, que atuam juntas), e o ciclo
// até o pagamento (em andamento → concluída → oficiada → paga).
//
// Difere de `afastamentos` (cobertura de equipe: quem cobre quem para acesso a
// demandas) — pode opcionalmente apontar para um afastamento via afastamentoId.

export const substituicoes = pgTable(
  "substituicoes",
  {
    id: serial("id").primaryKey(),
    // Quem exerceu a substituição (e requer a gratificação)
    defensorId: integer("defensor_id").references(() => users.id),
    // Unidade substituída — ex.: "7º DP de Camaçari"
    unidadeSubstituida: text("unidade_substituida").notNull(),
    // automatica | cumulativa | extraordinaria
    tipo: varchar("tipo", { length: 20 }).notNull().default("automatica"),
    // Escopo de vara/atribuição que o defensor considera a substituição.
    // Array de valores do atribuicaoEnum, ex.: ["JURI_CAMACARI","EXECUCAO_PENAL"].
    escopoAtribuicoes: jsonb("escopo_atribuicoes").$type<string[]>().notNull().default([]),
    dataInicio: date("data_inicio").notNull(),
    dataFim: date("data_fim"),
    // Motivo do afastamento da titular (férias, Portaria, etc.)
    motivo: text("motivo"),
    // em_andamento | concluida | oficiada | paga
    status: varchar("status", { length: 20 }).notNull().default("em_andamento"),
    oficioNumero: text("oficio_numero"),
    oficioPath: text("oficio_path"),
    relatorioPath: text("relatorio_path"),
    seiProtocolo: text("sei_protocolo"),
    observacoes: text("observacoes"),
    afastamentoId: integer("afastamento_id"),
    workspaceId: integer("workspace_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("substituicoes_defensor_id_idx").on(table.defensorId),
    index("substituicoes_status_idx").on(table.status),
    index("substituicoes_data_inicio_idx").on(table.dataInicio),
  ],
);

export type Substituicao = typeof substituicoes.$inferSelect;
export type InsertSubstituicao = typeof substituicoes.$inferInsert;
