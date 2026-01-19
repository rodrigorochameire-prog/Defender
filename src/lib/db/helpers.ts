import { isNull, and, SQL, sql } from "drizzle-orm";
import { PgTableWithColumns } from "drizzle-orm/pg-core";

// ==========================================
// HELPERS PARA SOFT DELETE
// ==========================================

/**
 * Condição para filtrar registros ativos (não deletados)
 * Uso: where(isActive(users))
 */
export function isActive<T extends { deletedAt: unknown }>(
  table: T
): SQL {
  return isNull((table as any).deletedAt);
}

/**
 * Condição para filtrar registros deletados
 * Uso: where(isDeleted(users))
 */
export function isDeleted<T extends { deletedAt: unknown }>(
  table: T
): SQL {
  return sql`${(table as any).deletedAt} IS NOT NULL`;
}

/**
 * Combina condição de ativo com outras condições
 * Uso: where(activeAnd(users, eq(users.role, 'admin')))
 */
export function activeAnd<T extends { deletedAt: unknown }>(
  table: T,
  ...conditions: SQL[]
): SQL {
  return and(isActive(table), ...conditions) as SQL;
}

// ==========================================
// HELPERS PARA TIMESTAMPS
// ==========================================

/**
 * Retorna o timestamp atual para uso em updates
 */
export function now(): Date {
  return new Date();
}

/**
 * Marca um registro como deletado (soft delete)
 */
export function softDeleteData() {
  return {
    deletedAt: now(),
    updatedAt: now(),
  };
}

/**
 * Restaura um registro deletado
 */
export function restoreData() {
  return {
    deletedAt: null,
    updatedAt: now(),
  };
}

// ==========================================
// HELPERS PARA PAGINAÇÃO
// ==========================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Calcula offset para paginação
 */
export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Monta o resultado paginado
 */
export function paginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

// ==========================================
// HELPERS PARA JSON
// ==========================================

/**
 * Parse seguro de JSON de campos text
 */
export function parseJsonArray<T>(json: string | null): T[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Parse seguro de JSON objeto
 */
export function parseJsonObject<T extends object>(
  json: string | null,
  defaultValue: T
): T {
  if (!json) return defaultValue;
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Stringify seguro para JSON
 */
export function stringifyJson<T>(value: T | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

// ==========================================
// HELPERS PARA DATAS
// ==========================================

/**
 * Início do dia
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Fim do dia
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Início da semana (domingo)
 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Início do mês
 */
export function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Início do ano
 */
export function startOfYear(date: Date): Date {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
