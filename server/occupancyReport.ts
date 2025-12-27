/**
 * Occupancy Report Service
 * Calculates daycare occupancy statistics based on check-ins
 */

import { getDb } from "./db";

interface OccupancyReport {
  totalCheckIns: number;
  averageOccupancy: number;
  peakOccupancy: number;
  revenue: number;
  dailyData: Array<{
    date: string;
    checkIns: number;
    occupancyRate: number;
  }>;
}

/**
 * Calculate occupancy report for a date range
 * Assumes max capacity of 20 pets (adjust as needed)
 */
export async function getOccupancyReport(
  startDate: Date,
  endDate: Date
): Promise<OccupancyReport> {
  const dbInstance = await getDb();
  if (!dbInstance) {
    return {
      totalCheckIns: 0,
      averageOccupancy: 0,
      peakOccupancy: 0,
      revenue: 0,
      dailyData: [],
    };
  }

  const { daycareUsage } = await import("../drizzle/schema");
  const { between, and, isNotNull, sql } = await import("drizzle-orm");

  // Max capacity (adjust based on your daycare)
  const MAX_CAPACITY = 20;

  // Get all check-ins in the date range
  const checkIns = await dbInstance
    .select({
      date: sql<string>`DATE(${daycareUsage.check_in_time})`,
      count: sql<number>`COUNT(*)`,
      revenue: sql<number>`SUM(COALESCE(${daycareUsage.amount_cents}, 0))`,
    })
    .from(daycareUsage)
    .where(
      and(
        between(daycareUsage.check_in_time, startDate, endDate),
        isNotNull(daycareUsage.check_in_time)
      )
    )
    .groupBy(sql`DATE(${daycareUsage.check_in_time})`)
    .orderBy(sql`DATE(${daycareUsage.check_in_time})`);

  // Calculate statistics
  const totalCheckIns = checkIns.reduce((sum, day) => sum + day.count, 0);
  const totalRevenue = checkIns.reduce((sum, day) => sum + (day.revenue || 0), 0);

  const dailyData = checkIns.map((day) => ({
    date: day.date,
    checkIns: day.count,
    occupancyRate: (day.count / MAX_CAPACITY) * 100,
  }));

  const averageOccupancy = dailyData.length > 0
    ? dailyData.reduce((sum, day) => sum + day.occupancyRate, 0) / dailyData.length
    : 0;

  const peakOccupancy = dailyData.length > 0
    ? Math.max(...dailyData.map((day) => day.occupancyRate))
    : 0;

  return {
    totalCheckIns,
    averageOccupancy,
    peakOccupancy,
    revenue: totalRevenue,
    dailyData,
  };
}
