import { router, adminProcedure } from "../init";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { and, eq, desc, sql, count } from "drizzle-orm";

/**
 * Constrói as condições WHERE do `list` de auditLogs a partir do input.
 * Extraído como helper puro/exportado para ser testável sem DB (render SQL via PgDialect).
 */
export function auditListConditions(input: {
  entityType?: string;
  entityId?: number;
  action?: string;
  jobId?: number;
}) {
  const conds = [] as any[];
  if (input.entityType) conds.push(eq(auditLogs.entityType, input.entityType));
  if (input.entityId !== undefined) conds.push(eq(auditLogs.entityId, input.entityId));
  if (input.action) conds.push(eq(auditLogs.action, input.action));
  if (input.jobId !== undefined) conds.push(sql`${auditLogs.metadata}->>'job_id' = ${String(input.jobId)}`);
  return conds;
}

export const auditLogsRouter = router({
  /**
   * Lista logs de auditoria (admin)
   */
  list: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        entityType: z.string().optional(),
        entityId: z.number().optional(),
        action: z.string().optional(),
        jobId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const conds = auditListConditions(input);
      const where = conds.length ? and(...conds) : undefined;
      const logs = await db.select().from(auditLogs).where(where)
        .orderBy(desc(auditLogs.id)).limit(input.limit).offset(input.offset);
      const [{ total }] = await db.select({ total: count() }).from(auditLogs).where(where);
      return { logs, total };
    }),

  /**
   * Estatísticas de auditoria
   */
  stats: adminProcedure.query(async () => {
    const byAction = await db.select({ action: auditLogs.action, n: count() })
      .from(auditLogs).groupBy(auditLogs.action);
    const [{ total }] = await db.select({ total: count() }).from(auditLogs);
    const [{ users }] = await db.select({ users: sql<number>`count(distinct ${auditLogs.userId})::int` }).from(auditLogs);
    return { total, byAction, uniqueUsers: users };
  }),
});
