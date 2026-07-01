import { describe, it, expect } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { and } from "drizzle-orm";
import { auditListConditions } from "./auditLogs";

function render(conds: any[]): string {
  if (!conds.length) return "";
  return new PgDialect().sqlToQuery(and(...conds)!).sql;
}

describe("auditListConditions", () => {
  it("jobId filtra por metadata->>'job_id'", () => {
    const s = render(auditListConditions({ jobId: 1352 }));
    expect(s).toContain("metadata");
    expect(s).toContain("job_id");
  });

  it("compõe entityType + action com AND", () => {
    const s = render(auditListConditions({ entityType: "demanda", action: "import" }));
    expect(s).toContain("entity_type");
    expect(s).toContain("action");
    expect(s.toLowerCase()).toContain("and");
  });

  it("sem filtros → nenhuma condição", () => {
    expect(auditListConditions({})).toHaveLength(0);
  });
});
