import { router, adminProcedure } from "../init";
import { z } from "zod";
import { db } from "@/lib/db";
import { claudeCodeTasks, users, auditLogs } from "@/lib/db/schema";
import { and, eq, desc, inArray, sql, type SQL } from "drizzle-orm";

const AUDIT_SKILLS = ["pje-intimacoes-import", "varredura-triagem"] as const;

export function runDetailChangesSql(al: typeof auditLogs, taskId: number): SQL {
  return sql`SELECT * FROM ${al} WHERE ${al.metadata}->>'job_id' = ${String(taskId)} ORDER BY ${al.id} DESC LIMIT 500`;
}

export const auditoriaRouter = router({
  listRuns: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const rows = await db.select({
        id: claudeCodeTasks.id, skill: claudeCodeTasks.skill, status: claudeCodeTasks.status,
        startedAt: claudeCodeTasks.startedAt, completedAt: claudeCodeTasks.completedAt,
        createdAt: claudeCodeTasks.createdAt, resultado: claudeCodeTasks.resultado,
        createdBy: claudeCodeTasks.createdBy, quem: users.name,
      })
        .from(claudeCodeTasks)
        .leftJoin(users, eq(claudeCodeTasks.createdBy, users.id))
        .where(inArray(claudeCodeTasks.skill, AUDIT_SKILLS as unknown as string[]))
        .orderBy(desc(claudeCodeTasks.id)).limit(input.limit).offset(input.offset);
      return rows;
    }),
  runDetail: adminProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const [run] = await db.select().from(claudeCodeTasks).where(eq(claudeCodeTasks.id, input.taskId)).limit(1);
      const changes = await db.execute(runDetailChangesSql(auditLogs, input.taskId));
      return { run: run ?? null, changes: (changes as unknown as { rows: unknown[] }).rows ?? changes };
    }),
});
