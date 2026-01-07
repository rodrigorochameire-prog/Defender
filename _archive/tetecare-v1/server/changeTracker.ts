/**
 * Change Tracker Service
 * 
 * Tracks all modifications to shared resources between admins and tutors
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { changeHistory } from "../drizzle/schema";
import postgres from "postgres";

// Support multiple environment variable names (Vercel Supabase integration)
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
const client = databaseUrl ? postgres(databaseUrl) : null;
const database = client ? drizzle(client) : null;

export type ResourceType = "medication" | "food" | "preventive" | "pet_data" | "calendar";
export type ChangeType = "create" | "update" | "delete";
export type UserRole = "admin" | "tutor" | "user";

interface LogChangeOptions {
  resourceType: ResourceType;
  resourceId: number;
  petId: number;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  changedBy: number; // user ID
  changedByRole: UserRole;
  changeType: ChangeType;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log a change to the change history
 */
export async function logChange(options: LogChangeOptions): Promise<void> {
  if (!database) {
    console.warn("❌ Database not available for change tracking");
    return;
  }
  try {
    await database.insert(changeHistory).values({
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      petId: options.petId,
      fieldName: options.fieldName,
      oldValue: options.oldValue || null,
      newValue: options.newValue || null,
      changedBy: options.changedBy,
      changedByRole: options.changedByRole,
      changeType: options.changeType,
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null,
    });
    
    console.log(`✅ Change logged: ${options.resourceType} #${options.resourceId} by ${options.changedByRole}`);
  } catch (error) {
    console.error("❌ Failed to log change:", error);
  }
}

/**
 * Log multiple field changes at once (for updates)
 */
export async function logMultipleChanges(
  baseOptions: Omit<LogChangeOptions, "fieldName" | "oldValue" | "newValue">,
  changes: Array<{ fieldName: string; oldValue?: string | null; newValue?: string | null }>
): Promise<void> {
  for (const change of changes) {
    await logChange({
      ...baseOptions,
      ...change,
    });
  }
}

/**
 * Get change history for a specific resource
 */
export async function getResourceHistory(
  resourceType: ResourceType,
  resourceId: number
): Promise<any[]> {
  if (!database) return [];
  const { eq, and } = await import("drizzle-orm");
  
  return database
    .select()
    .from(changeHistory)
    .where(
      and(
        eq(changeHistory.resourceType, resourceType),
        eq(changeHistory.resourceId, resourceId)
      )
    )
    .orderBy(changeHistory.createdAt);
}

/**
 * Get change history for a specific pet (all resources)
 */
export async function getPetHistory(petId: number): Promise<any[]> {
  if (!database) return [];
  const { eq } = await import("drizzle-orm");
  
  return database
    .select()
    .from(changeHistory)
    .where(eq(changeHistory.petId, petId))
    .orderBy(changeHistory.createdAt);
}

/**
 * Get recent changes across all resources
 */
export async function getRecentChanges(limit: number = 50): Promise<any[]> {
  if (!database) return [];
  return database
    .select()
    .from(changeHistory)
    .orderBy(changeHistory.createdAt)
    .limit(limit);
}

/**
 * Get changes by user
 */
export async function getChangesByUser(userId: number): Promise<any[]> {
  if (!database) return [];
  const { eq } = await import("drizzle-orm");
  
  return database
    .select()
    .from(changeHistory)
    .where(eq(changeHistory.changedBy, userId))
    .orderBy(changeHistory.createdAt);
}

/**
 * Get collaboration stats (admin vs tutor activity)
 */
export async function getCollaborationStats(): Promise<{
  totalChanges: number;
  adminChanges: number;
  tutorChanges: number;
  byResourceType: Record<ResourceType, number>;
}> {
  if (!database) {
    return { totalChanges: 0, adminChanges: 0, tutorChanges: 0, byResourceType: { medication: 0, food: 0, preventive: 0, pet_data: 0, calendar: 0 } };
  }
  const { eq } = await import("drizzle-orm");
  
  const allChanges = await database.select().from(changeHistory);
  
  const adminChanges = allChanges.filter((c: any) => c.changedByRole === "admin").length;
  const tutorChanges = allChanges.filter((c: any) => c.changedByRole === "tutor").length;
  
  const byResourceType: Record<ResourceType, number> = {
    medication: 0,
    food: 0,
    preventive: 0,
    pet_data: 0,
    calendar: 0,
  };
  
  allChanges.forEach((change: any) => {
    if (change.resourceType in byResourceType) {
      byResourceType[change.resourceType as ResourceType]++;    }
  });
  
  return {
    totalChanges: allChanges.length,
    adminChanges,
    tutorChanges,
    byResourceType,
  };
}

/**
 * Helper to serialize values for storage
 */
export function serializeValue(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/**
 * Helper to compare old and new values
 */
export function hasChanged(oldValue: any, newValue: any): boolean {
  return serializeValue(oldValue) !== serializeValue(newValue);
}

/**
 * Get activity grouped by day for the last N days
 */
export async function getActivityByDay(days: number = 30): Promise<{
  date: string;
  adminChanges: number;
  tutorChanges: number;
}[]> {
  const { sql, desc } = await import("drizzle-orm");
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  if (!database) return [];
  
  // Get all changes in the period
  const allChanges = await database
    .select()
    .from(changeHistory)
    .where(sql`${changeHistory.createdAt} >= ${startDate}`)
    .orderBy(desc(changeHistory.createdAt));
  
  // Group by date
  const activityByDate: Record<string, { admin: number; tutor: number }> = {};
  
  allChanges.forEach((change: any) => {
    const dateKey = new Date(change.createdAt).toISOString().split('T')[0];
    
    if (!activityByDate[dateKey]) {
      activityByDate[dateKey] = { admin: 0, tutor: 0 };
    }
    
    if (change.changedByRole === 'admin') {
      activityByDate[dateKey].admin++;
    } else {
      activityByDate[dateKey].tutor++;
    }
  });
  
  // Fill in missing dates with zeros
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    
    result.push({
      date: dateKey,
      adminChanges: activityByDate[dateKey]?.admin || 0,
      tutorChanges: activityByDate[dateKey]?.tutor || 0,
    });
  }
  
  return result;
}
