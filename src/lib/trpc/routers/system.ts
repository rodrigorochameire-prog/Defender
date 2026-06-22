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
import { eq, gte, and, inArray, sql } from "drizzle-orm";

const DAEMON_NAME = "claude-code-daemon";
const BROWSER_DAEMON_NAME = "browser-broker";
// Considered alive if heartbeat is newer than this. Daemons upsert every 30s,
// so 120s gives headroom for brief slowdowns without false alarms.
const ALIVE_THRESHOLD_MS = 120_000;

/** Normaliza uma linha de heartbeat em status de liveness para a UI. */
function heartbeatStatus(
  name: string,
  hb: { lastSeen: Date | string; metadata: unknown } | undefined,
  now: number,
) {
  const lastSeenMs = hb ? new Date(hb.lastSeen).getTime() : null;
  return {
    name,
    alive: lastSeenMs !== null && now - lastSeenMs < ALIVE_THRESHOLD_MS,
    lastSeen: hb?.lastSeen ?? null,
    secondsSinceHeartbeat:
      lastSeenMs !== null ? Math.floor((now - lastSeenMs) / 1000) : null,
    metadata: (hb?.metadata ?? null) as Record<string, unknown> | null,
  };
}

export const systemRouter = router({
  /**
   * Snapshot of daemon liveness + queue stats.
   * Safe to poll from the /admin/daemon page every few seconds.
   */
  daemonStatus: protectedProcedure.query(async () => {
    // 1. Heartbeat rows — both daemons (lane 'ai' e lane 'browser')
    const hbRows = await db
      .select()
      .from(systemHeartbeat)
      .where(inArray(systemHeartbeat.name, [DAEMON_NAME, BROWSER_DAEMON_NAME]));

    const now = Date.now();
    const aiHb = hbRows.find((r) => r.name === DAEMON_NAME);
    const browserHb = hbRows.find((r) => r.name === BROWSER_DAEMON_NAME);

    // 2. Queue counts por status (totais) e por lane×status (split)
    const counts = await db
      .select({
        lane: claudeCodeTasks.lane,
        status: claudeCodeTasks.status,
        count: sql<number>`count(*)::int`,
      })
      .from(claudeCodeTasks)
      .groupBy(claudeCodeTasks.lane, claudeCodeTasks.status);

    const byStatus: Record<string, number> = {};
    const lanes: Record<string, Record<string, number>> = {};
    for (const row of counts) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + row.count;
      (lanes[row.lane] ??= {})[row.status] = row.count;
    }

    // 3. Recent tasks (last 20, newest first)
    const recent = await db
      .select({
        id: claudeCodeTasks.id,
        skill: claudeCodeTasks.skill,
        lane: claudeCodeTasks.lane,
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
      daemon: heartbeatStatus(DAEMON_NAME, aiHb, now),
      browserDaemon: heartbeatStatus(BROWSER_DAEMON_NAME, browserHb, now),
      queue: {
        byStatus,
        pending: byStatus.pending ?? 0,
        processing: byStatus.processing ?? 0,
        completed: byStatus.completed ?? 0,
        failed: byStatus.failed ?? 0,
        needsReview: byStatus.needs_review ?? 0,
        failedLast24h: failed24h.length,
      },
      lanes,
      recent,
    };
  }),
});
