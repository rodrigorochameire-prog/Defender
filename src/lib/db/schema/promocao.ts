import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { processos } from "./core";

// ==========================================
// PROMOÇÃO — auditoria da camada de promoção de dados estruturados
// ==========================================
// Cada decisão de promoção (vincular | criar | revisar | ignorar) é registrada
// aqui para trilha de auditoria (LGPD, pessoas sensíveis) e depuração do backfill.

export const promocaoLog = pgTable(
  "promocao_log",
  {
    id: serial("id").primaryKey(),
    entidade: varchar("entidade", { length: 20 }).notNull().default("pessoa"),
    processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }),
    candidatoNome: text("candidato_nome").notNull(),
    candidatoCpf: text("candidato_cpf"), // reusado p/ artigo (delito) / medida (cautelar) — text liberal (auditoria)
    acao: text("acao").notNull(), // vincular | criar | revisar | ignorar | sem-correspondencia
    pessoaId: integer("pessoa_id"),
    candidatosIds: text("candidatos_ids"), // CSV dos ids ambíguos quando acao=revisar
    confianca: numeric("confianca", { precision: 3, scale: 2 }),
    fonteRef: varchar("fonte_ref", { length: 120 }),
    modeloExtracao: varchar("modelo_extracao", { length: 60 }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("promocao_log_processo_idx").on(t.processoId),
    index("promocao_log_acao_idx").on(t.acao),
  ],
);

export type PromocaoLogRow = typeof promocaoLog.$inferSelect;
