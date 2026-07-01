import { describe, it, expect } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { registros, demandas } from "@/lib/db/schema";
import { analiseResumoSql, analiseDataSql } from "./_analise-resumo-sql";

// Renderiza o fragmento SQL do Drizzle para o texto SQL real + os params
// bindados (literais interpolados via sql`` viram $1, $2... e não aparecem
// no texto — precisam ser inspecionados separadamente em `.params`).
const dialect = new PgDialect();
function renderSql(fragment: SQL<unknown>) {
  return dialect.sqlToQuery(fragment);
}

describe("analise resumo sql", () => {
  it("usa jsonb_exists('objeto') como discriminador", () => {
    const { sql: rendered } = renderSql(analiseResumoSql(registros, demandas));
    expect(rendered).toContain("jsonb_exists");
    expect(rendered).toContain("objeto");
  });

  it("mantém fallback pelo título exato", () => {
    const { sql: rendered, params } = renderSql(analiseResumoSql(registros, demandas));
    // "titulo = " deve aparecer no SQL como cláusula de fallback, e o valor
    // literal "Resumo e providências" deve estar entre os params bindados.
    expect(rendered).toContain('"titulo"');
    expect(params).toContain("Resumo e providências");
  });

  it("analiseData retorna o enrichment_data do registro discriminado", () => {
    const { sql: rendered } = renderSql(analiseDataSql(registros, demandas));
    expect(rendered).toContain("enrichment_data");
    expect(rendered).toContain("jsonb_exists");
  });
});
