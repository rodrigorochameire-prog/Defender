import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import * as schema from "../drizzle/schema";

/**
 * Get current food stock
 */
export async function getCurrentStock() {
  const db = await getDb();
  const [stock] = await db!.select().from(schema.foodStock).limit(1);
  return stock || { id: 0, currentStockKg: 0, lastUpdated: new Date() };
}

/**
 * Convert kg to grams
 */
function kgToGrams(kg: number): number {
  return Math.round(kg * 1000);
}

/**
 * Convert grams to kg
 */
function gramsToKg(grams: number): number {
  return grams / 1000;
}

/**
 * Get food statistics
 */
export async function getFoodStats() {
  const db = await getDb();
  const stock = await getCurrentStock();
  const recentMovements = await db!
    .select()
    .from(schema.foodMovements)
    .orderBy(desc(schema.foodMovements.createdAt))
    .limit(10);

  return {
    currentStockKg: gramsToKg(stock.currentStockKg),
    lastUpdated: stock.lastUpdated,
    recentMovements: recentMovements.map(m => ({
      ...m,
      amountKg: gramsToKg(Math.abs(m.amountKg)),
    })),
  };
}

/**
 * Add stock (purchase or entry)
 */
export async function addStock(amountKg: number, notes?: string, createdBy?: number) {
  const db = await getDb();
  const stock = await getCurrentStock();
  const amountGrams = kgToGrams(amountKg);

  // Update or create stock record
  if (stock.id > 0) {
    await db!
      .update(schema.foodStock)
      .set({
        currentStockKg: stock.currentStockKg + amountGrams,
        lastUpdated: new Date(),
      })
      .where(eq(schema.foodStock.id, stock.id));
  } else {
    await db!.insert(schema.foodStock).values({
      currentStockKg: amountGrams,
      lastUpdated: new Date(),
    });
  }

  // Record movement
  await db!.insert(schema.foodMovements).values({
    type: "purchase",
    amountKg: amountGrams,
    notes,
    createdBy,
    createdAt: new Date(),
  });

  return { success: true };
}

/**
 * Record daily consumption
 */
export async function recordDailyConsumption(amountKg: number, notes?: string) {
  const db = await getDb();
  const stock = await getCurrentStock();
  const amountGrams = kgToGrams(amountKg);

  if (stock.id > 0) {
    const newStock = Math.max(0, stock.currentStockKg - amountGrams);
    await db!
      .update(schema.foodStock)
      .set({
        currentStockKg: newStock,
        lastUpdated: new Date(),
      })
      .where(eq(schema.foodStock.id, stock.id));
  }

  // Record movement
  await db!.insert(schema.foodMovements).values({
    type: "consumption",
    amountKg: -amountGrams,
    notes,
    createdAt: new Date(),
  });

  return { success: true };
}

/**
 * Get food movements history
 */
export async function getFoodMovements(limit: number = 50) {
  const db = await getDb();
  return await db!
    .select()
    .from(schema.foodMovements)
    .orderBy(desc(schema.foodMovements.createdAt))
    .limit(limit);
}
