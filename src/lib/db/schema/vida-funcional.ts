import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  date,
  timestamp,
  bigint,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./core";

// ==========================================
// VIDA FUNCIONAL — Enums
// ==========================================

export const vfTipoEventoEnum = pgEnum("vf_tipo_evento", [
  // cluster: progressao
  "POSSE",
  "PROMOCAO",
  "REMOCAO",
  "TITULARIDADE",
  "ACUMULO",
  // cluster: ausencias
  "DESIGNACAO_RELEVANTE",
  "CONVOCACAO",
  "FERIAS",
  "LICENCA",
  "AFASTAMENTO",
  "COOPERACAO",
  // cluster: contraprestacao
  "DIARIA",
  "FOLGA",
  "TRABALHO_EXTRAORDINARIO",
  "SUBSTITUICAO",
  "GRATIFICACAO",
  "REEMBOLSO",
  // cluster: administrativo
  "SOLICITACAO_ADM",
]);

export const vfClusterEnum = pgEnum("vf_cluster", [
  "progressao",
  "ausencias",
  "contraprestacao",
  "administrativo",
]);

export const vfStatusEnum = pgEnum("vf_status", [
  "previsto",
  "em_curso",
  "concluido",
  "pendente",
  "arquivado",
]);

export const vfOrigemEnum = pgEnum("vf_origem", [
  "manual",
  "indexador",
  "skill",
]);

// ==========================================
// VIDA FUNCIONAL — Eventos (tabela polimórfica)
// ==========================================

export const vidaFuncionalEventos = pgTable("vida_funcional_eventos", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  tipo: vfTipoEventoEnum("tipo").notNull(),
  cluster: vfClusterEnum("cluster").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  dataEvento: date("data_evento").notNull(),
  dataFim: date("data_fim"),
  prazo: date("prazo"),
  status: vfStatusEnum("status").default("previsto").notNull(),
  valorCents: bigint("valor_cents", { mode: "number" }),
  driveFolderId: varchar("drive_folder_id", { length: 100 }),
  driveFileId: varchar("drive_file_id", { length: 100 }),
  origem: vfOrigemEnum("origem").default("manual").notNull(),
  dados: jsonb("dados").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("vf_eventos_defensor_status_deleted_idx").on(table.defensorId, table.status, table.deletedAt),
  index("vf_eventos_defensor_tipo_data_idx").on(table.defensorId, table.tipo, table.dataEvento),
  index("vf_eventos_defensor_prazo_idx").on(table.defensorId, table.prazo),
  index("vf_eventos_cluster_idx").on(table.cluster),
]);

export type VidaFuncionalEvento = typeof vidaFuncionalEventos.$inferSelect;
export type InsertVidaFuncionalEvento = typeof vidaFuncionalEventos.$inferInsert;
