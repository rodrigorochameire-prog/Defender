/**
 * System router — observability/health for background infrastructure.
 *
 * Currently exposes:
 *   - daemonStatus: heartbeat + queue stats for the claude-code-daemon
 */

import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { systemHeartbeat } from "@/lib/db/schema/system";
import { claudeCodeTasks } from "@/lib/db/schema/casos";
import { eq, gte, and, sql } from "drizzle-orm";

const DAEMON_NAME = "claude-code-daemon";
// Considered alive if heartbeat is newer than this. Daemon upserts every 30s,
// so 120s gives headroom for brief slowdowns without false alarms.
const ALIVE_THRESHOLD_MS = 120_000;

export const systemRouter = router({
  /**
   * Snapshot of daemon liveness + queue stats.
   * Safe to poll from the /admin/daemon page every few seconds.
   */
  daemonStatus: protectedProcedure.query(async () => {
    // 1. Heartbeat row
    const [hb] = await db
      .select()
      .from(systemHeartbeat)
      .where(eq(systemHeartbeat.name, DAEMON_NAME))
      .limit(1);

    const now = Date.now();
    const lastSeenMs = hb ? new Date(hb.lastSeen).getTime() : null;
    const alive =
      lastSeenMs !== null && now - lastSeenMs < ALIVE_THRESHOLD_MS;
    const secondsSinceHeartbeat =
      lastSeenMs !== null ? Math.floor((now - lastSeenMs) / 1000) : null;

    // 2. Queue counts by status
    const counts = await db
      .select({
        status: claudeCodeTasks.status,
        count: sql<number>`count(*)::int`,
      })
      .from(claudeCodeTasks)
      .groupBy(claudeCodeTasks.status);

    const byStatus: Record<string, number> = {};
    for (const row of counts) byStatus[row.status] = row.count;

    // 3. Recent tasks (last 20, newest first)
    const recent = await db
      .select({
        id: claudeCodeTasks.id,
        skill: claudeCodeTasks.skill,
        status: claudeCodeTasks.status,
        etapa: claudeCodeTasks.etapa,
        erro: claudeCodeTasks.erro,
        createdAt: claudeCodeTasks.createdAt,
        startedAt: claudeCodeTasks.startedAt,
        completedAt: claudeCodeTasks.completedAt,
        assistidoId: claudeCodeTasks.assistidoId,
        processoId: claudeCodeTasks.processoId,
      })
      .from(claudeCodeTasks)
      .orderBy(sql`${claudeCodeTasks.createdAt} DESC`)
      .limit(20);

    // 4. Failed in last 24h (for alerting)
    const since24h = new Date(now - 24 * 60 * 60 * 1000);
    const failed24h = await db
      .select({ id: claudeCodeTasks.id })
      .from(claudeCodeTasks)
      .where(
        and(
          eq(claudeCodeTasks.status, "failed"),
          gte(claudeCodeTasks.createdAt, since24h),
        ),
      );

    return {
      daemon: {
        name: DAEMON_NAME,
        alive,
        lastSeen: hb?.lastSeen ?? null,
        secondsSinceHeartbeat,
        metadata: (hb?.metadata ?? null) as Record<string, unknown> | null,
      },
      queue: {
        byStatus,
        pending: byStatus.pending ?? 0,
        processing: byStatus.processing ?? 0,
        completed: byStatus.completed ?? 0,
        failed: byStatus.failed ?? 0,
        needsReview: byStatus.needs_review ?? 0,
        failedLast24h: failed24h.length,
      },
      recent,
    };
  }),
});
