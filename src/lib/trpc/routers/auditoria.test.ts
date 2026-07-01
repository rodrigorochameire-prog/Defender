import { describe, it, expect } from "vitest";
import { runDetailChangesSql } from "./auditoria";
import { auditLogs } from "@/lib/db/schema";
import { PgDialect } from "drizzle-orm/pg-core";
describe("auditoria runDetail", () => {
  it("filtra audit_logs por metadata.job_id", () => {
    const s = new PgDialect().sqlToQuery(runDetailChangesSql(auditLogs, 1352)).sql;
    expect(s).toContain("metadata");
    expect(s).toContain("job_id");
  });
});
