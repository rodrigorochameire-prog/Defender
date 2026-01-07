import { getDb } from "./db";
import { adminLogs, type InsertAdminLog } from "../drizzle/schema";
import type { Request } from "express";

interface LogActionParams {
  adminId: number;
  action: string;
  targetType?: string;
  targetId?: number;
  details?: Record<string, any>;
  req?: Request;
}

/**
 * Log an administrative action for audit trail
 */
export async function logAdminAction(params: LogActionParams) {
  try {
    const db = await getDb();
    
    const logEntry: InsertAdminLog = {
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType || null,
      targetId: params.targetId || null,
      details: params.details ? JSON.stringify(params.details) : null,
      ipAddress: (params.req as any)?.ip || (params.req as any)?.headers?.["x-forwarded-for"] as string || null,
      userAgent: (params.req as any)?.headers?.["user-agent"] || null,
    };

    await db!.insert(adminLogs).values(logEntry);

    console.log(`[Admin Log] ${params.action} by admin ${params.adminId}`);
  } catch (error) {
    console.error("[Admin Log] Error logging action:", error);
    // Don't throw - logging failures shouldn't break the main operation
  }
}

/**
 * Get admin logs with optional filters
 */
export async function getAdminLogs(filters?: {
  adminId?: number;
  action?: string;
  limit?: number;
}) {
  const db = await getDb();
  
  let query = db!.select().from(adminLogs);

  if (filters?.adminId) {
    query = query.where(eq(adminLogs.adminId, filters.adminId)) as any;
  }

  if (filters?.action) {
    query = query.where(eq(adminLogs.action, filters.action)) as any;
  }

  const logs = await query
    .orderBy(desc(adminLogs.createdAt))
    .limit(filters?.limit || 100);

  return logs;
}

// Import eq and desc from drizzle-orm
import { eq, desc } from "drizzle-orm";
