import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

interface AuditParams {
  userId: number;
  userName: string;
  entityType: string;
  entityId: number;
  action: "create" | "update" | "delete" | "import" | "status_change";
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: AuditParams) {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId,
      userName: params.userName,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      changes: params.changes ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (error) {
    // Audit log nunca deve quebrar a operação principal
    console.error("[audit] Failed to log:", error);
  }
}

/** Helper para detectar campos que mudaram entre old e new */
export function diffFields(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fields: string[]
): Record<string, { old: unknown; new: unknown }> | null {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const field of fields) {
    const oldVal = oldObj[field];
    const newVal = newObj[field];
    if (oldVal !== newVal && newVal !== undefined) {
      changes[field] = { old: oldVal, new: newVal };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}
