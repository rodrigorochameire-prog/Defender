import type { User } from "@/lib/db/schema";
import { recursos } from "@/lib/db/schema";
import { sql, eq, or, type SQL } from "drizzle-orm";

/**
 * Escopo de visualização de recursos da Instância Superior.
 *
 * Diferente das demandas (privadas por defensor), os recursos suportam
 * uma visão INSTITUCIONAL: o defensor pode comparar/visualizar recursos
 * agregados por comarca, unidade, especialidade, área ou localização —
 * cruzando dados de múltiplos defensores (inteligência institucional).
 *
 * Modos:
 * - `meus`         → recursos onde o defensor é origem (1º grau) ou destino (2º grau)
 * - `institucional`→ recursos de um recorte institucional (dimensão + valor)
 * - `todos`        → tudo (apenas admin/servidor)
 */

export type EscopoModo = "meus" | "institucional" | "todos";

export type EscopoDimensao =
  | "comarca"
  | "unidade"
  | "especialidade"
  | "area"
  | "localizacao";

export type EscopoRecurso = {
  modo?: EscopoModo;
  dimensao?: EscopoDimensao;
  valor?: string;
};

/** Colunas de defensores_ba liberadas para recorte institucional (whitelist anti-injection). */
const DIMENSAO_COLUNA: Record<EscopoDimensao, string> = {
  comarca: "comarca",
  unidade: "unidade",
  especialidade: "especialidade",
  area: "area",
  localizacao: "localizacao",
};

export function podeVerTodos(user: User): boolean {
  return user.role === "admin" || user.role === "servidor";
}

/**
 * Constrói a condição SQL de escopo para a tabela `recursos`.
 * Retorna `undefined` quando não há filtro (acesso total),
 * ou uma condição que pode ser combinada com `and(...)`.
 *
 * Condição impossível (`sql`false``) quando o usuário não tem
 * ponte com defensores_ba e pede o próprio recorte.
 */
export function buildRecursoScope(
  user: User,
  escopo: EscopoRecurso | undefined
): SQL | undefined {
  const modo: EscopoModo = escopo?.modo ?? (podeVerTodos(user) ? "todos" : "meus");

  // ── todos ──────────────────────────────────────────────────────────────
  if (modo === "todos") {
    if (podeVerTodos(user)) return undefined; // sem filtro
    // não autorizado → degrada para "meus"
    return scopeMeus(user);
  }

  // ── institucional ──────────────────────────────────────────────────────
  if (modo === "institucional" && escopo?.dimensao && escopo?.valor) {
    const coluna = DIMENSAO_COLUNA[escopo.dimensao];
    if (!coluna) return scopeMeus(user);
    const valor = escopo.valor;
    const subq = sql`SELECT id FROM defensores_ba WHERE ${sql.raw(coluna)} = ${valor}`;
    return sql`(${recursos.defensorOrigemId} IN (${subq}) OR ${recursos.defensorDestinoId} IN (${subq}))`;
  }

  // ── meus (default) ─────────────────────────────────────────────────────
  return scopeMeus(user);
}

function scopeMeus(user: User): SQL {
  const baId = (user as { defensorBaId?: number | null }).defensorBaId;
  if (!baId) return sql`false`; // sem ponte → nada
  return or(
    eq(recursos.defensorOrigemId, baId),
    eq(recursos.defensorDestinoId, baId)
  )!;
}
