import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import * as schema from "../drizzle/schema";

/**
 * Get standard service prices
 */
export async function getServicePrices() {
  const db = await getDb();
  return db!.select().from(schema.servicePrices).where(eq(schema.servicePrices.isActive, true));
}

/**
 * Get price for specific service type
 */
export async function getServicePrice(serviceType: "creche" | "diaria") {
  const db = await getDb();
  const [price] = await db!
    .select()
    .from(schema.servicePrices)
    .where(
      and(
        eq(schema.servicePrices.serviceType, serviceType),
        eq(schema.servicePrices.isActive, true)
      )
    );
  return price;
}

/**
 * Get custom pricing plan for a tutor
 */
export async function getCustomPricingPlan(tutorId: number) {
  const db = await getDb();
  const [plan] = await db!
    .select()
    .from(schema.customPricingPlans)
    .where(
      and(
        eq(schema.customPricingPlans.tutorId, tutorId),
        eq(schema.customPricingPlans.isActive, true)
      )
    )
    .orderBy(schema.customPricingPlans.createdAt);
  return plan;
}

/**
 * Get effective price for a tutor (custom or standard)
 */
export async function getEffectivePrice(tutorId: number, serviceType: "creche" | "diaria") {
  const customPlan = await getCustomPricingPlan(tutorId);
  
  if (customPlan) {
    const customPrice = serviceType === "creche" ? customPlan.crechePrice : customPlan.diariaPrice;
    if (customPrice !== null) {
      return customPrice;
    }
  }
  
  const standardPrice = await getServicePrice(serviceType);
  return standardPrice?.priceInCents ?? 0;
}

/**
 * Create custom pricing plan
 */
export async function createCustomPricingPlan(data: schema.InsertCustomPricingPlan) {
  const db = await getDb();
  const result = await db!.insert(schema.customPricingPlans).values(data);
  return (result as any)[0].insertId;
}

/**
 * Get all custom pricing plans
 */
export async function getAllCustomPricingPlans() {
  const db = await getDb();
  return db!.select().from(schema.customPricingPlans);
}

/**
 * Update custom pricing plan
 */
export async function updateCustomPricingPlan(id: number, data: Partial<schema.InsertCustomPricingPlan>) {
  const db = await getDb();
  await db!.update(schema.customPricingPlans).set(data).where(eq(schema.customPricingPlans.id, id));
}

/**
 * Deactivate custom pricing plan
 */
export async function deactivateCustomPricingPlan(id: number) {
  const db = await getDb();
  await db!.update(schema.customPricingPlans).set({ isActive: false }).where(eq(schema.customPricingPlans.id, id));
}
