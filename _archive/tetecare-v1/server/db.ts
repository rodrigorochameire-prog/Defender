import { eq, and, desc, sql, gte, lte, isNull, isNotNull, lt, or, count, asc, like, not } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  users,
  pets,
  petTutors,
  petVaccinations,
  petMedications,
  medicationLibrary,
  vaccineLibrary,
  preventiveLibrary,
  creditPackages,
  daycareCredits,
  daycareUsage,
  dailyLogs,
  calendarEvents,
  documents,
  transactions,
  notifications,
  petPhotos,
  subscriptionPlans,
  subscriptions,
  fleaTreatments,
  dewormingTreatments,
  behaviorRecords,
  trainingProgress,
  photoComments,
  photoReactions,
  bookings,
  reviews,
  payments,
  adminInvites,
  whatsappConfig,
  whatsappTemplates,
  whatsappMessages,
  whatsappConversations,
  whatsappGroups,
  whatsappGroupMembers,
  whatsappAutomations,
  auditLogs,
  notificationTemplates,
  tutorNotificationPreferences,
  healthBehaviorLogs,
  eventTypes,
  medicationAutoScheduleRules,
  petFoodStock,
  wallPosts,
  wallComments,
  wallReactions,
  conversations,
  chatMessages,
  type InsertUser,
  type InsertPet,
  type InsertPetTutor,
  type InsertPetVaccination,
  type InsertPetMedication,
  type InsertDailyLog,
  type InsertHealthBehaviorLog,
  type InsertEventType,
  type InsertMedicationAutoScheduleRule,
  type InsertPetFoodStock,
  type InsertCreditPackage,
  type InsertDaycareCredit,
  type InsertDaycareUsage,
  type InsertCalendarEvent,
  type InsertDocument,
  type InsertTransaction,
  type InsertNotification,
  type InsertPetPhoto,
  type InsertWallPost,
  type InsertWallComment,
  type InsertWallReaction,
  type InsertConversation,
  type InsertChatMessage,
  type InsertSubscriptionPlan,
  type InsertSubscription,
  type InsertFleaTreatment,
  type InsertDewormingTreatment,
  type InsertBehaviorRecord,
  type InsertTrainingProgress,
  type InsertPhotoComment,
  type InsertPhotoReaction,
  type InsertBooking,
  type InsertPayment,
  type InsertAdminInvite,
  type InsertReview,
  type InsertPreventiveLibrary,
  type InsertMedicationLibrary,
  type InsertVaccineLibrary,
  type Pet,
  type PetPhoto,
  type Notification,
  type Transaction,
  type User,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db) {
    // Support multiple environment variable names (Vercel Supabase integration uses POSTGRES_URL)
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
    
    if (databaseUrl) {
      try {
        const client = postgres(databaseUrl);
        _db = drizzle(client);
      } catch (error) {
        console.warn("[Database] Failed to connect:", error);
        _db = null;
      }
    }
  }
  return _db;
}

// ==================== USER OPERATIONS ====================

export async function upsertUser(user: Partial<InsertUser> & { open_id?: string | null; email?: string | null; auth_id?: string | null }): Promise<void> {
  // open_id is optional for email/password users
  if (!user.open_id && !user.email && !user.auth_id) {
    throw new Error("Either open_id, email, or auth_id is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Try to find existing user
    let existingUser: User | null = null;
    
    if (user.auth_id) {
      existingUser = await getUserByAuthId(user.auth_id);
    }
    if (!existingUser && user.open_id) {
      existingUser = await getUserByOpenId(user.open_id) || null;
    }
    if (!existingUser && user.email) {
      existingUser = await getUserByEmail(user.email) || null;
    }

    const updateSet: Record<string, unknown> = {};

    // Build update set
    if (user.name !== undefined) updateSet.name = user.name;
    if (user.email !== undefined) updateSet.email = user.email;
    if (user.open_id !== undefined) updateSet.open_id = user.open_id;
    if (user.auth_id !== undefined) updateSet.auth_id = user.auth_id;
    if (user.login_method !== undefined) updateSet.login_method = user.login_method;
    if (user.role !== undefined) {
      updateSet.role = user.role;
    } else if (user.open_id === ENV.ownerOpenId) {
      updateSet.role = "admin";
    }
    updateSet.last_signed_in = user.last_signed_in || new Date();
    updateSet.updated_at = new Date();

    if (existingUser) {
      // Update existing user
      await db.update(users)
        .set(updateSet)
        .where(eq(users.id, existingUser.id));
    } else {
      // Insert new user
      const insertValues: Partial<InsertUser> = {
        ...updateSet,
        created_at: new Date(),
      } as Partial<InsertUser>;
      
      // For insert, we need to handle the id - let the database generate it
      // Since id is bigint primary key, we'll let PostgreSQL handle it via sequence
      await db.insert(users).values(insertValues as any);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.open_id, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByAuthId(authId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.auth_id, authId)).limit(1);
  return result[0] || null;
}

export async function upsertUserFromSupabase(supabaseUser: { id: string; email?: string; user_metadata?: { name?: string } }) {
  const db = await getDb();
  if (!db) return;
  
  await upsertUser({
    auth_id: supabaseUser.id,
    email: supabaseUser.email || undefined,
    name: supabaseUser.user_metadata?.name || undefined,
    login_method: "supabase",
  });
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.created_at));
}

export async function getUsersByRole(role: "admin" | "user") {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).where(eq(users.role, role));
}

// ==================== PET OPERATIONS ====================

export async function createPet(pet: InsertPet) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pets).values(pet).returning();
  return result[0]?.id || 0;
}

export async function updatePet(id: number, data: Partial<InsertPet>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pets).set(data).where(eq(pets.id, id));
}

export async function deletePet(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pets).where(eq(pets.id, id));
}

export async function getPetById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(pets).where(eq(pets.id, id)).limit(1);
  return result[0] || null;
}

export async function getAllPets() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pets).orderBy(desc(pets.created_at));
}

export async function getPetsByStatus(status: "checked-in" | "checked-out") {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pets).where(eq(pets.status, status));
}

export async function getPetsByApprovalStatus(approvalStatus: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pets).where(eq(pets.approval_status, approvalStatus)).orderBy(desc(pets.created_at));
}

export async function getPetsByTutorId(tutor_id: number): Promise<Pet[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({ pet: pets })
    .from(petTutors)
    .innerJoin(pets, eq(petTutors.pet_id, pets.id))
    .where(eq(petTutors.tutor_id, tutor_id));
  
  return result.map(r => r.pet);
}

// ==================== PET-TUTOR RELATIONSHIP ====================

export async function addPetTutor(data: InsertPetTutor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(petTutors).values(data).returning();
  return result[0]?.id || 0;
}

export async function removePetTutor(pet_id: number, tutor_id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(petTutors).where(and(eq(petTutors.pet_id, pet_id), eq(petTutors.tutor_id, tutor_id)));
}

export async function getPetTutors(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({ tutor: users, is_primary: petTutors.is_primary })
    .from(petTutors)
    .innerJoin(users, eq(petTutors.tutor_id, users.id))
    .where(eq(petTutors.pet_id, pet_id));
  
  return result;
}

export async function getPetTutorsWithDetails(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      is_primary: petTutors.is_primary,
      createdAt: petTutors.created_at,
    })
    .from(petTutors)
    .innerJoin(users, eq(petTutors.tutor_id, users.id))
    .where(eq(petTutors.pet_id, pet_id));
  
  return result;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  return result[0] || null;
}

export async function setPrimaryTutor(pet_id: number, tutor_id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // First, set all tutors of this pet to non-primary
  await db
    .update(petTutors)
    .set({ is_primary: false })
    .where(eq(petTutors.pet_id, pet_id));
  
  // Then set the specified tutor as primary
  await db
    .update(petTutors)
    .set({ is_primary: true })
    .where(and(eq(petTutors.pet_id, pet_id), eq(petTutors.tutor_id, tutor_id)));
}

// ==================== DAYCARE CREDITS ====================

// Credit Packages
export async function getActivePackages() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(creditPackages)
    .where(eq(creditPackages.isActive, true))
    .orderBy(creditPackages.displayOrder);
}

export async function getPackageById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(creditPackages)
    .where(eq(creditPackages.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createPackage(data: InsertCreditPackage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(creditPackages).values(data).returning();
  return result[0]?.id || 0;
}

export async function updatePackage(id: number, data: Partial<InsertCreditPackage>) {
  const db = await getDb();
  if (!db) return;
  await db.update(creditPackages).set(data).where(eq(creditPackages.id, id));
}

// Daycare Credits
export async function addDaycareCredit(data: InsertDaycareCredit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(daycareCredits).values(data).returning();
  return result[0]?.id || 0;
}

export async function getPetCredits(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(daycareCredits)
    .where(eq(daycareCredits.pet_id, pet_id))
    .orderBy(desc(daycareCredits.purchase_date));
}

export async function getTotalCredits(pet_id: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ total: sql<number>`SUM(${daycareCredits.remaining_days})` })
    .from(daycareCredits)
    .where(eq(daycareCredits.pet_id, pet_id));
  
  const total = result[0]?.total;
  return total ? Number(total) : 0;
}

export async function consumeCredit(pet_id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Find first credit package with remaining days
  const credits = await db
    .select()
    .from(daycareCredits)
    .where(and(eq(daycareCredits.pet_id, pet_id), sql`${daycareCredits.remaining_days} > 0`))
    .orderBy(daycareCredits.purchase_date)
    .limit(1);
  
  if (credits.length === 0) {
    throw new Error("No credits available");
  }
  
  const credit = credits[0];
  await db
    .update(daycareCredits)
    .set({ remaining_days: credit.remaining_days - 1 })
    .where(eq(daycareCredits.id, credit.id));
  
  return credit.id;
}

export async function addDaycareUsage(data: InsertDaycareUsage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(daycareUsage).values(data).returning();
  return result[0]?.id || 0;
}

export async function getPetUsageHistory(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(daycareUsage)
    .where(eq(daycareUsage.pet_id, pet_id))
    .orderBy(desc(daycareUsage.usage_date));
}

// ==================== VACCINE OPERATIONS ====================

export async function getVaccineLibrary() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(vaccineLibrary).orderBy(vaccineLibrary.name);
}

export async function addVaccineToLibrary(data: Omit<typeof vaccineLibrary.$inferInsert, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(vaccineLibrary).values({ ...data, isCommon: false }).returning();
  return result[0]?.id || 0;
}

export async function addPetVaccination(data: InsertPetVaccination) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(petVaccinations).values(data).returning();
  return result[0]?.id || 0;
}

export async function getPetVaccinations(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      vaccination: petVaccinations,
      vaccine: vaccineLibrary,
    })
    .from(petVaccinations)
    .innerJoin(vaccineLibrary, eq(petVaccinations.vaccine_id, vaccineLibrary.id))
    .where(eq(petVaccinations.pet_id, pet_id))
    .orderBy(desc(petVaccinations.application_date));
  
  return result;
}

export async function getUpcomingVaccinations(daysAhead: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysAhead);
  
  return await db
    .select({
      vaccination: petVaccinations,
      vaccine: vaccineLibrary,
      pet: pets,
    })
    .from(petVaccinations)
    .innerJoin(vaccineLibrary, eq(petVaccinations.vaccine_id, vaccineLibrary.id))
    .innerJoin(pets, eq(petVaccinations.pet_id, pets.id))
    .where(and(
      sql`${petVaccinations.next_due_date} IS NOT NULL`,
      gte(petVaccinations.next_due_date, today),
      lte(petVaccinations.next_due_date, futureDate)
    ))
    .orderBy(petVaccinations.next_due_date);
}

export async function updatePetVaccination(
  id: number,
  data: {
    nextDueDate?: Date;
    veterinarian?: string;
    clinic?: string;
    notes?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updates: any = {};
  if (data.nextDueDate !== undefined) updates.next_due_date = data.nextDueDate;
  if (data.veterinarian !== undefined) updates.veterinarian = data.veterinarian;
  if (data.clinic !== undefined) updates.clinic = data.clinic;
  if (data.notes !== undefined) updates.notes = data.notes;
  
  await db.update(petVaccinations).set(updates).where(eq(petVaccinations.id, id));
}

export async function deletePetVaccination(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(petVaccinations).where(eq(petVaccinations.id, id));
}

// ==================== MEDICATION OPERATIONS ====================

export async function getMedicationLibrary() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(medicationLibrary).orderBy(medicationLibrary.type, medicationLibrary.name);
}

export async function addMedicationToLibrary(data: Omit<typeof medicationLibrary.$inferInsert, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(medicationLibrary).values({ ...data, isCommon: false }).returning();
  return result[0]?.id || 0;
}

export async function addPetMedication(data: InsertPetMedication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(petMedications).values(data).returning();
  return result[0]?.id || 0;
}

export async function updatePetMedication(id: number, data: Partial<InsertPetMedication>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(petMedications).set(data).where(eq(petMedications.id, id));
}

export async function deletePetMedication(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(petMedications).where(eq(petMedications.id, id));
}

export async function getPetMedications(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      medication: petMedications,
      medicationInfo: medicationLibrary,
    })
    .from(petMedications)
    .innerJoin(medicationLibrary, eq(petMedications.medication_id, medicationLibrary.id))
    .where(eq(petMedications.pet_id, pet_id))
    .orderBy(desc(petMedications.start_date));
  
  return result;
}

export async function getActiveMedications(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      medication: petMedications,
      medicationInfo: medicationLibrary,
    })
    .from(petMedications)
    .innerJoin(medicationLibrary, eq(petMedications.medication_id, medicationLibrary.id))
    .where(and(eq(petMedications.pet_id, pet_id), eq(petMedications.is_active, true)))
    .orderBy(desc(petMedications.start_date));
  
  return result;
}

export async function getAllActiveMedications() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      medication: petMedications,
      medicationInfo: medicationLibrary,
      pet: pets,
    })
    .from(petMedications)
    .innerJoin(medicationLibrary, eq(petMedications.medication_id, medicationLibrary.id))
    .innerJoin(pets, eq(petMedications.pet_id, pets.id))
    .where(eq(petMedications.is_active, true))
    .orderBy(desc(petMedications.start_date));
  
  return result;
}

// ==================== DAILY LOGS ====================

export async function addDailyLog(data: InsertDailyLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(dailyLogs).values(data).returning();
  return result[0]?.id || 0;
}

export async function getPetLogs(pet_id: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  if (startDate && endDate) {
    return await db
      .select()
      .from(dailyLogs)
      .where(and(
        eq(dailyLogs.pet_id, pet_id),
        gte(dailyLogs.log_date, startDate),
        lte(dailyLogs.log_date, endDate)
      ))
      .orderBy(desc(dailyLogs.log_date));
  }
  
  return await db
    .select()
    .from(dailyLogs)
    .where(eq(dailyLogs.pet_id, pet_id))
    .orderBy(desc(dailyLogs.log_date));
}
export async function updateDailyLog(id: number, data: Partial<InsertDailyLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(dailyLogs).set(data).where(eq(dailyLogs.id, id));
}

export async function deleteDailyLog(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(dailyLogs).where(eq(dailyLogs.id, id));
}

export async function getLogsByDate(date: Date) {
  const db = await getDb();
  if (!db) return [];

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await db
    .select()
    .from(dailyLogs)
    .where(
      and(
        gte(dailyLogs.log_date, startOfDay),
        lte(dailyLogs.log_date, endOfDay)
      )
    )
    .orderBy(desc(dailyLogs.log_date));
}

export async function getAllTransactions() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: transactions.id,
      pet_id: transactions.pet_id,
      type: transactions.type,
      category: transactions.category,
      description: transactions.description,
      amount: transactions.amount,
      transactionDate: transactions.transaction_date,
      createdById: transactions.created_by_id,
      createdAt: transactions.created_at,
      petName: pets.name,
    })
    .from(transactions)
    .leftJoin(pets, eq(transactions.pet_id, pets.id))
    .orderBy(desc(transactions.transaction_date));
  
  return result.map(r => ({
    ...r,
    amount: r.amount / 100, // Convert from cents to reais
  }));
}

export async function updatePetCredits(pet_id: number, amount: number) {
  const db = await getDb();
  if (!db) return;
  
  const pet = await db.select().from(pets).where(eq(pets.id, pet_id)).limit(1);
  if (pet.length === 0) throw new Error("Pet not found");
  
  const currentCredits = pet[0]?.credits || 0;
  const newCredits = currentCredits + amount;
  
  await db.update(pets)
    .set({ credits: newCredits })
    .where(eq(pets.id, pet_id));
}

export async function getAllLogs() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(dailyLogs)
    .orderBy(desc(dailyLogs.log_date))
    .limit(100); // Limit to last 100 logs
}

// ==================== CALENDAR EVENTS ====================

export async function addCalendarEvent(data: InsertCalendarEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(calendarEvents).values(data).returning();
  return result[0]?.id || 0;
}

export async function updateCalendarEvent(id: number, data: Partial<InsertCalendarEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(calendarEvents).set(data).where(eq(calendarEvents.id, id));
}

export async function deleteCalendarEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
}

export async function getCalendarEvents(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(calendarEvents)
    .where(and(gte(calendarEvents.event_date, startDate), lte(calendarEvents.event_date, endDate)))
    .orderBy(calendarEvents.event_date);
}

export async function getPetEvents(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.pet_id, pet_id))
    .orderBy(calendarEvents.event_date);
}

// ==================== DOCUMENTS ====================

export async function addDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(data).returning();
  return result[0]?.id || 0;
}

export async function updateDocument(id: number, data: { title?: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  
  await db.update(documents).set(updateData).where(eq(documents.id, id));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(documents).where(eq(documents.id, id));
}

export async function getPetDocuments(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(documents)
    .where(eq(documents.pet_id, pet_id))
    .orderBy(desc(documents.created_at));
}

export async function getDocumentsByCategory(pet_id: number, category: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(documents)
    .where(and(eq(documents.pet_id, pet_id), eq(documents.category, category as any)))
    .orderBy(desc(documents.created_at));
}

export async function getAllDocuments(petId?: number, category?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db
    .select({
      id: documents.id,
      pet_id: documents.pet_id,
      petName: pets.name,
      title: documents.title,
      category: documents.category,
      fileUrl: documents.file_url,
      fileKey: documents.file_key,
      fileName: documents.file_name,
      mimeType: documents.mime_type,
      fileSize: documents.file_size,
      uploadedById: documents.uploaded_by_id,
      createdAt: documents.created_at,
    })
    .from(documents)
    .leftJoin(pets, eq(documents.pet_id, pets.id));
  
  const conditions = [];
  if (petId) conditions.push(eq(documents.pet_id, petId));
  if (category) conditions.push(eq(documents.category, category as any));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query.orderBy(desc(documents.created_at));
}

// ==================== NOTIFICATIONS ====================

export async function createNotification(data: Omit<typeof notifications.$inferInsert, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data).returning();
  return result[0]?.id || 0;
}

export async function getUserNotifications(user_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.user_id, user_id))
    .orderBy(desc(notifications.created_at));
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ is_read: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsAsRead(user_id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(notifications)
    .set({ is_read: true })
    .where(and(eq(notifications.user_id, user_id), eq(notifications.is_read, false)));
}

export async function getUnreadNotificationCount(user_id: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.user_id, user_id), eq(notifications.is_read, false)));
  
  return result.length;
}

export async function getPendingNotifications() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.is_sent, false))
    .orderBy(notifications.created_at);
}

// ==================== TRANSACTIONS ====================

export async function addTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(transactions).values(data).returning();
  return result[0]?.id || 0;
}

export async function getPetTransactions(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.pet_id, pet_id))
    .orderBy(desc(transactions.transaction_date));
}

export async function getTransactionsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(transactions)
    .where(and(gte(transactions.transaction_date, startDate), lte(transactions.transaction_date, endDate)))
    .orderBy(desc(transactions.transaction_date));
}

export async function getFinancialSummary(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return { credits: 0, debits: 0, balance: 0 };
  
  const result = await db
    .select({
      type: transactions.type,
      total: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(and(gte(transactions.transaction_date, startDate), lte(transactions.transaction_date, endDate)))
    .groupBy(transactions.type);
  
  const credits = result.find(r => r.type === "credit")?.total || 0;
  const debits = result.find(r => r.type === "debit")?.total || 0;
  
  return {
    credits,
    debits,
    balance: credits - debits,
  };
}


// ==================== PET PHOTOS ====================

export async function addPetPhoto(data: InsertPetPhoto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(petPhotos).values(data).returning();
  return result[0]?.id;
}

export async function getPetPhotos(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(petPhotos)
    .where(eq(petPhotos.pet_id, pet_id))
    .orderBy(desc(petPhotos.taken_at));
}

export async function deletePetPhoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(petPhotos).where(eq(petPhotos.id, id));
}

export async function getPhotoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(petPhotos).where(eq(petPhotos.id, id)).limit(1);
  return result[0] || null;
}

// ==================== AUTOMATED ALERTS ====================

export async function getPetsWithLowCredits(threshold: number = 5) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(pets)
    .where(lte(pets.credits, threshold))
    .orderBy(pets.credits);
}

export async function getVaccinesDueSoon(daysAhead: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  return await db
    .select({
      vaccination: petVaccinations,
      pet: pets,
      vaccine: vaccineLibrary,
    })
    .from(petVaccinations)
    .innerJoin(pets, eq(petVaccinations.pet_id, pets.id))
    .innerJoin(vaccineLibrary, eq(petVaccinations.vaccine_id, vaccineLibrary.id))
    .where(
      and(
        lte(petVaccinations.next_due_date, futureDate),
        gte(petVaccinations.next_due_date, new Date())
      )
    )
    .orderBy(petVaccinations.next_due_date);
}


// ============================================
// SUBSCRIPTION PLANS
// ============================================

export async function createSubscriptionPlan(data: InsertSubscriptionPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [plan] = await db.insert(subscriptionPlans).values(data);
  return plan;
}

export async function updateSubscriptionPlan(id: number, data: Partial<InsertSubscriptionPlan>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id));
}

export async function listSubscriptionPlans(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  }
  return db.select().from(subscriptionPlans);
}

export async function getSubscriptionPlanById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  return plan;
}

export async function deleteSubscriptionPlan(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
}

// ============================================
// SUBSCRIPTIONS
// ============================================

export async function createSubscription(data: InsertSubscription) {
  const db = await getDb();
  const [subscription] = await db!.insert(subscriptions).values(data);
  return subscription;
}

export async function getUserActiveSubscription(user_id: number) {
  const db = await getDb();
  const [subscription] = await db!
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, user_id),
        eq(subscriptions.status, "active")
      )
    )
    .limit(1);
  return subscription;
}

export async function getUserSubscriptionHistory(user_id: number) {
  const db = await getDb();
  return db!
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user_id))
    .orderBy(desc(subscriptions.createdAt));
}

export async function updateSubscription(id: number, data: Partial<InsertSubscription>) {
  const db = await getDb();
  await db!.update(subscriptions).set(data).where(eq(subscriptions.id, id));
}

export async function cancelSubscription(id: number) {
  const db = await getDb();
  await db!.update(subscriptions).set({ status: "cancelled", autoRenew: false }).where(eq(subscriptions.id, id));
}

export async function getSubscriptionsByPlan(planId: number) {
  const db = await getDb();
  return db!
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.planId, planId),
        eq(subscriptions.status, "active")
      )
    );
}

export async function getAllActiveSubscriptions() {
  const db = await getDb();
  return db!
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));
}

// ============================================
// SUBSCRIPTION METRICS
// ============================================

export async function getSubscriptionMetrics() {
  const activeSubscriptions = await getAllActiveSubscriptions();
  
  // Calculate MRR (Monthly Recurring Revenue)
  let mrr = 0;
  for (const sub of activeSubscriptions) {
    const plan = await getSubscriptionPlanById(sub.planId);
    if (plan) {
      // Convert to monthly revenue
      const monthlyPrice = (plan.price * 30) / plan.validityDays;
      mrr += monthlyPrice;
    }
  }
  
  // Count subscriptions by plan
  const planCounts: Record<number, number> = {};
  for (const sub of activeSubscriptions) {
    planCounts[sub.planId] = (planCounts[sub.planId] || 0) + 1;
  }
  
  return {
    totalActiveSubscriptions: activeSubscriptions.length,
    mrr: Math.round(mrr),
    planDistribution: planCounts,
  };
}


// Flea Treatments helpers
export async function createFleaTreatment(data: InsertFleaTreatment) {
  const db = (await getDb())!;
  const [result] = await db.insert(fleaTreatments).values(data).returning();
  return result;
}

export async function getFleaTreatmentsByPetId(pet_id: number) {
  const db = (await getDb())!;
  return db.select().from(fleaTreatments).where(eq(fleaTreatments.petId, pet_id)).orderBy(desc(fleaTreatments.applicationDate));
}

export async function updateFleaTreatment(data: { id: number; applicationDate?: string; nextDueDate?: string; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = {};
  if (data.applicationDate) updateData.applicationDate = new Date(data.applicationDate);
  if (data.nextDueDate) updateData.nextDueDate = new Date(data.nextDueDate);
  if (data.notes !== undefined) updateData.notes = data.notes;
  
  await db.update(fleaTreatments).set(updateData).where(eq(fleaTreatments.id, data.id));
}

export async function deleteFleaTreatment(id: number) {
  const db = (await getDb())!;
  await db.delete(fleaTreatments).where(eq(fleaTreatments.id, id));
}

// Deworming Treatments helpers
export async function createDewormingTreatment(data: InsertDewormingTreatment) {
  const db = (await getDb())!;
  const [result] = await db.insert(dewormingTreatments).values(data).returning();
  return result;
}

export async function getDewormingTreatmentsByPetId(pet_id: number) {
  const db = (await getDb())!;
  return db.select().from(dewormingTreatments).where(eq(dewormingTreatments.petId, pet_id)).orderBy(desc(dewormingTreatments.applicationDate));
}

export async function updateDewormingTreatment(data: { id: number; applicationDate?: string; nextDueDate?: string; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = {};
  if (data.applicationDate) updateData.applicationDate = new Date(data.applicationDate);
  if (data.nextDueDate) updateData.nextDueDate = new Date(data.nextDueDate);
  if (data.notes !== undefined) updateData.notes = data.notes;
  
  await db.update(dewormingTreatments).set(updateData).where(eq(dewormingTreatments.id, data.id));
}

export async function deleteDewormingTreatment(id: number) {
  const db = (await getDb())!;
  await db.delete(dewormingTreatments).where(eq(dewormingTreatments.id, id));
}


// Behavior Records
export async function createBehaviorRecord(data: InsertBehaviorRecord) {
  const db = await getDb();
  await db!.insert(behaviorRecords).values(data);
  const [record] = await db!.select().from(behaviorRecords).where(eq(behaviorRecords.id, sql`LAST_INSERT_ID()`)).limit(1);
  return record;
}

export async function listBehaviorRecords(petId?: number) {
  const db = await getDb();
  if (petId) {
    return db!.select().from(behaviorRecords).where(eq(behaviorRecords.petId, petId)).orderBy(desc(behaviorRecords.date));
  }
  return db!.select().from(behaviorRecords).orderBy(desc(behaviorRecords.date));
}

export async function deleteBehaviorRecord(id: number) {
  const db = await getDb();
  await db!.delete(behaviorRecords).where(eq(behaviorRecords.id, id));
}

// Training Progress
export async function createTrainingProgress(data: InsertTrainingProgress) {
  const db = await getDb();
  await db!.insert(trainingProgress).values(data);
  const [progress] = await db!.select().from(trainingProgress).where(eq(trainingProgress.id, sql`LAST_INSERT_ID()`)).limit(1);
  return progress;
}

export async function listTrainingProgress(petId?: number) {
  const db = await getDb();
  if (petId) {
    return db!.select().from(trainingProgress).where(eq(trainingProgress.petId, petId)).orderBy(desc(trainingProgress.updatedAt));
  }
  return db!.select().from(trainingProgress).orderBy(desc(trainingProgress.updatedAt));
}

export async function updateTrainingProgress(id: number, currentLevel: number, notes?: string) {
  const db = await getDb();
  const updated = await db!
    .update(trainingProgress)
    .set({ currentLevel, notes, updatedAt: new Date() })
    .where(eq(trainingProgress.id, id));
  return updated;
}

export async function deleteTrainingProgress(id: number) {
  const db = await getDb();
  await db!.delete(trainingProgress).where(eq(trainingProgress.id, id));
}

// Photo Comments
export async function addPhotoComment(photoId: number, user_id: number, comment: string) {
  const db = await getDb();
  await db!.insert(photoComments).values({ photoId, userId: user_id, comment });
  const [newComment] = await db!.select().from(photoComments).where(eq(photoComments.id, sql`LAST_INSERT_ID()`)).limit(1);
  return newComment;
}

export async function getPhotoComments(photoId: number) {
  const db = await getDb();
  const comments = await db!
    .select({
      id: photoComments.id,
      photoId: photoComments.photoId,
      user_id: photoComments.userId,
      comment: photoComments.comment,
      createdAt: photoComments.createdAt,
      user: {
        id: users.id,
        name: users.name,
      },
    })
    .from(photoComments)
    .leftJoin(users, eq(photoComments.userId, users.id))
    .where(eq(photoComments.photoId, photoId))
    .orderBy(desc(photoComments.createdAt));
  return comments;
}

export async function deletePhotoComment(id: number) {
  const db = await getDb();
  await db!.delete(photoComments).where(eq(photoComments.id, id));
}

// Photo Reactions
export async function addPhotoReaction(photoId: number, user_id: number, reactionType: "like" | "love" | "laugh") {
  const db = await getDb();
  
  // Check if user already reacted
  const existing = await db!
    .select()
    .from(photoReactions)
    .where(and(eq(photoReactions.photoId, photoId), eq(photoReactions.userId, user_id)))
    .limit(1);
  
  if (existing.length > 0) {
    // Update reaction type
    await db!
      .update(photoReactions)
      .set({ reactionType })
      .where(eq(photoReactions.id, existing[0].id));
    return existing[0];
  } else {
    // Create new reaction
    await db!.insert(photoReactions).values({ photoId, userId: user_id, reactionType });
    const [newReaction] = await db!.select().from(photoReactions).where(eq(photoReactions.id, sql`LAST_INSERT_ID()`)).limit(1);
    return newReaction;
  }
}

export async function removePhotoReaction(photoId: number, user_id: number) {
  const db = await getDb();
  await db!.delete(photoReactions).where(and(eq(photoReactions.photoId, photoId), eq(photoReactions.userId, user_id)));
}

export async function getPhotoReactions(photoId: number) {
  const db = await getDb();
  return db!.select().from(photoReactions).where(eq(photoReactions.photoId, photoId));
}

export async function getPhotoReactionCounts(photoId: number) {
  const db = await getDb();
  const reactions = await db!.select().from(photoReactions).where(eq(photoReactions.photoId, photoId));
  
  const counts: { [key: string]: number; like: number; love: number; laugh: number; total: number } = {
    like: 0,
    love: 0,
    laugh: 0,
    total: reactions.length,
  };
  
  reactions.forEach((reaction) => {
    if (reaction.reactionType in counts) {
      counts[reaction.reactionType]++;
    }
  });
  
  return counts;
}

// Bookings
export async function createBooking(data: InsertBooking) {
  const db = await getDb();
  await db!.insert(bookings).values(data);
  const [booking] = await db!.select().from(bookings).where(eq(bookings.id, sql`LAST_INSERT_ID()`)).limit(1);
  return booking;
}

export async function listBookings(filters?: { petId?: number; tutorId?: number; status?: string }) {
  const db = await getDb();
  let query = db!.select().from(bookings);
  
  if (filters?.petId) {
    query = query.where(eq(bookings.petId, filters.petId)) as any;
  }
  if (filters?.tutorId) {
    query = query.where(eq(bookings.tutorId, filters.tutorId)) as any;
  }
  if (filters?.status) {
    query = query.where(eq(bookings.status, filters.status as any)) as any;
  }
  
  return query.orderBy(desc(bookings.bookingDate));
}

export async function getBookingById(id: number) {
  const db = await getDb();
  const [booking] = await db!.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return booking;
}

export async function updateBookingStatus(id: number, status: "pending" | "confirmed" | "cancelled" | "completed") {
  const db = await getDb();
  await db!
    .update(bookings)
    .set({ status, updatedAt: new Date() })
    .where(eq(bookings.id, id));
}

export async function deleteBooking(id: number) {
  const db = await getDb();
  await db!.delete(bookings).where(eq(bookings.id, id));
}

export async function getBookingsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  return db!
    .select()
    .from(bookings)
    .where(and(
      sql`${bookings.bookingDate} >= ${startDate}`,
      sql`${bookings.bookingDate} <= ${endDate}`
    ))
    .orderBy(bookings.bookingDate);
}

// Reviews
export async function createReview(data: InsertReview) {
  const db = await getDb();
  await db!.insert(reviews).values(data);
  const [review] = await db!.select().from(reviews).where(eq(reviews.id, sql`LAST_INSERT_ID()`)).limit(1);
  return review;
}

export async function listReviews(filters?: { petId?: number; tutorId?: number; minRating?: number }) {
  const db = await getDb();
  let query = db!.select().from(reviews);
  
  if (filters?.petId) {
    query = query.where(eq(reviews.petId, filters.petId)) as any;
  }
  if (filters?.tutorId) {
    query = query.where(eq(reviews.tutorId, filters.tutorId)) as any;
  }
  if (filters?.minRating) {
    query = query.where(sql`${reviews.rating} >= ${filters.minRating}`) as any;
  }
  
  return query.orderBy(desc(reviews.createdAt));
}

export async function getAverageRating() {
  const db = await getDb();
  const result = await db!.select({ avg: sql`AVG(${reviews.rating})` }).from(reviews);
  return result[0]?.avg ? Number(result[0].avg) : 0;
}

export async function addReviewResponse(reviewId: number, response: string) {
  const db = await getDb();
  await db!
    .update(reviews)
    .set({ response, respondedAt: new Date() })
    .where(eq(reviews.id, reviewId));
}

// Analytics functions
export async function getWeightHistory(pet_id: number) {
  const db = await getDb();
  const logs = await db!
    .select({
      date: dailyLogs.log_date,
      weight: dailyLogs.weight,
    })
    .from(dailyLogs)
    .where(and(eq(dailyLogs.pet_id, pet_id), sql`${dailyLogs.weight} IS NOT NULL`))
    .orderBy(dailyLogs.log_date)
    .limit(30);
  
  return logs;
}

export async function getMoodHistory(pet_id: number) {
  const db = await getDb();
  const logs = await db!
    .select({
      date: dailyLogs.log_date,
      mood: dailyLogs.mood,
    })
    .from(dailyLogs)
    .where(and(eq(dailyLogs.pet_id, pet_id), sql`${dailyLogs.mood} IS NOT NULL`))
    .orderBy(dailyLogs.log_date)
    .limit(30);
  
  return logs;
}

export async function getFrequencyStats(pet_id: number) {
  const db = await getDb();
  
  // Get check-ins grouped by month for the last 12 months
  const stats = await db!
    .select({
      month: sql`DATE_FORMAT(${daycareUsage.check_in_time}, '%Y-%m')`,
      frequency: sql`COUNT(*)`,
    })
    .from(daycareUsage)
    .where(and(
      eq(daycareUsage.pet_id, pet_id),
      sql`${daycareUsage.check_in_time} >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`
    ))
    .groupBy(sql`DATE_FORMAT(${daycareUsage.check_in_time}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${daycareUsage.check_in_time}, '%Y-%m')`);
  
  return stats;
}


// User management functions
export async function listAllUsers() {
  const db = await getDb();
  return db!
    .select()
    .from(users)
    .orderBy(users.created_at);
}

export async function getUserById(user_id: number) {
  const db = await getDb();
  const result = await db!
    .select()
    .from(users)
    .where(eq(users.id, user_id))
    .limit(1);
  return result[0];
}

export async function updateUser(user_id: number, data: { name?: string; phone?: string }) {
  const db = await getDb();
  await db!
    .update(users)
    .set(data)
    .where(eq(users.id, user_id));
}

export async function updateUserRole(user_id: number, role: "user" | "admin") {
  const db = await getDb();
  await db!
    .update(users)
    .set({ role })
    .where(eq(users.id, user_id));
}

export async function deleteUser(user_id: number) {
  const db = await getDb();
  await db!
    .delete(users)
    .where(eq(users.id, user_id));
}


// Payment functions
export async function getPaymentsByUserId(user_id: number) {
  const db = await getDb();
  return db!
    .select()
    .from(payments)
    .where(eq(payments.userId, user_id))
    .orderBy(payments.createdAt);
}


// Admin Invite functions
export async function createAdminInvite(data: InsertAdminInvite) {
  const db = await getDb();
  const [result] = await db!.insert(adminInvites).values(data);
  return result;
}

export async function getAdminInviteByToken(token: string) {
  const db = await getDb();
  const [invite] = await db!
    .select()
    .from(adminInvites)
    .where(eq(adminInvites.token, token))
    .limit(1);
  return invite;
}

export async function listPendingAdminInvites() {
  const db = await getDb();
  return db!
    .select()
    .from(adminInvites)
    .where(eq(adminInvites.status, "pending"))
    .orderBy(adminInvites.createdAt);
}

export async function updateAdminInviteStatus(
  token: string,
  status: "accepted" | "expired"
) {
  const db = await getDb();
  await db!
    .update(adminInvites)
    .set({
      status,
      acceptedAt: status === "accepted" ? new Date() : null,
    })
    .where(eq(adminInvites.token, token));
}


// ==================== PREVENTIVE LIBRARY ====================

export async function getPreventiveLibrary() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(preventiveLibrary)
    .orderBy(preventiveLibrary.type, preventiveLibrary.name);
  
  return result;
}

export async function addPreventiveToLibrary(data: InsertPreventiveLibrary) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(preventiveLibrary).values(data).returning();
  return result[0]?.id;
}




// ==================== WHATSAPP OPERATIONS ====================

// Configuration
export async function getWhatsAppConfig() {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(whatsappConfig).limit(1);
  return result[0] || null;
}

export async function updateWhatsAppConfig(data: {
  apiKey: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookSecret?: string;
  isActive: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getWhatsAppConfig();
  
  if (existing) {
    await db.update(whatsappConfig).set(data).where(eq(whatsappConfig.id, existing.id));
  } else {
    await db.insert(whatsappConfig).values(data);
  }
}

// Templates
export async function getWhatsAppTemplates() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(whatsappTemplates).orderBy(whatsappTemplates.category, whatsappTemplates.name);
}

export async function createWhatsAppTemplate(data: {
  name: string;
  category: string;
  content: string;
  variables?: string[];
  status?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(whatsappTemplates).values(data as any).returning();
  return result[0]?.id;
}

export async function updateWhatsAppTemplate(data: {
  id: number;
  name?: string;
  content?: string;
  variables?: string[];
  status?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { id, ...updateData } = data;
  await db.update(whatsappTemplates).set(updateData as any).where(eq(whatsappTemplates.id, id));
}

export async function deleteWhatsAppTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, id));
}

// Message History
export async function getWhatsAppMessageHistory(limit: number = 50, status?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (status) {
    return await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.status, status as any))
      .orderBy(desc(whatsappMessages.createdAt))
      .limit(limit);
  }
  
  return await db
    .select()
    .from(whatsappMessages)
    .orderBy(desc(whatsappMessages.createdAt))
    .limit(limit);
}

// Groups
export async function getWhatsAppGroups() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: whatsappGroups.id,
      pet_id: whatsappGroups.petId,
      groupName: whatsappGroups.groupName,
      whatsappGroupId: whatsappGroups.whatsappGroupId,
      inviteLink: whatsappGroups.inviteLink,
      isActive: whatsappGroups.isActive,
      createdAt: whatsappGroups.createdAt,
      petName: pets.name,
    })
    .from(whatsappGroups)
    .leftJoin(pets, eq(whatsappGroups.petId, pets.id))
    .orderBy(whatsappGroups.createdAt);
}

export async function createWhatsAppGroup(data: { petId: number; groupName: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(whatsappGroups).values(data).returning();
  return result[0]?.id;
}

export async function addWhatsAppGroupMember(data: {
  groupId: number;
  userId?: number;
  phone: string;
  name?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(whatsappGroupMembers).values(data);
}

export async function removeWhatsAppGroupMember(groupId: number, memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(whatsappGroupMembers)
    .set({ removedAt: new Date() })
    .where(eq(whatsappGroupMembers.id, memberId));
}

// Automations
export async function getWhatsAppAutomations() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: whatsappAutomations.id,
      name: whatsappAutomations.name,
      triggerType: whatsappAutomations.triggerType,
      templateId: whatsappAutomations.templateId,
      enabled: whatsappAutomations.enabled,
      config: whatsappAutomations.config,
      createdAt: whatsappAutomations.createdAt,
      templateName: whatsappTemplates.name,
    })
    .from(whatsappAutomations)
    .leftJoin(whatsappTemplates, eq(whatsappAutomations.templateId, whatsappTemplates.id))
    .orderBy(whatsappAutomations.name);
}

export async function createWhatsAppAutomation(data: {
  name: string;
  triggerType: string;
  templateId: number;
  enabled?: boolean;
  config?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(whatsappAutomations).values(data as any).returning();
  return result[0]?.id;
}

export async function updateWhatsAppAutomation(data: {
  id: number;
  enabled?: boolean;
  config?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { id, ...updateData } = data;
  await db.update(whatsappAutomations).set(updateData).where(eq(whatsappAutomations.id, id));
}

export async function deleteWhatsAppAutomation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(whatsappAutomations).where(eq(whatsappAutomations.id, id));
}

// Statistics
export async function getWhatsAppStats() {
  const db = await getDb();
  if (!db) return {
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
  };
  
  const messages = await db.select().from(whatsappMessages);
  
  return {
    total: messages.length,
    sent: messages.filter(m => m.status === "sent").length,
    delivered: messages.filter(m => m.status === "delivered").length,
    read: messages.filter(m => m.status === "read").length,
    failed: messages.filter(m => m.status === "failed").length,
  };
}

// Conversations
export async function getWhatsAppConversations(status: string = "all") {
  const db = await getDb();
  if (!db) return [];
  
  if (status === "all") {
    return await db.select().from(whatsappConversations).orderBy(desc(whatsappConversations.lastMessageAt));
  }
  
  return await db.select()
    .from(whatsappConversations)
    .where(eq(whatsappConversations.status, status as any))
    .orderBy(desc(whatsappConversations.lastMessageAt));
}

export async function getWhatsAppConversation(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const conversation = await db.select()
    .from(whatsappConversations)
    .where(eq(whatsappConversations.id, id))
    .limit(1);
  
  return conversation[0] || null;
}

export async function updateWhatsAppConversationStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(whatsappConversations)
    .set({ status: status as any })
    .where(eq(whatsappConversations.id, id));
}

export async function markWhatsAppConversationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(whatsappConversations)
    .set({ unreadCount: 0 })
    .where(eq(whatsappConversations.id, id));
}


// ==================== PAYMENTS ====================
export async function getAllPayments() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(payments).orderBy(desc(payments.createdAt));
}

// ==================== NOTIFICATIONS & REMINDERS ====================

/**
 * Get upcoming vaccinations that need reminders (within specified days)
 */
export async function getUpcomingVaccinationReminders(daysAhead: number = 7) {
  const db = await getDb();
  if (!db) return [];
  
  const today = new Date();
  const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  
  const results = await db.select({
    vaccinationId: petVaccinations.id,
    pet_id: pets.id,
    petName: pets.name,
    vaccineId: vaccineLibrary.id,
    vaccineName: vaccineLibrary.name,
    next_due_date: petVaccinations.next_due_date,
  })
    .from(petVaccinations)
    .innerJoin(pets, eq(petVaccinations.pet_id, pets.id))
    .innerJoin(vaccineLibrary, eq(petVaccinations.vaccine_id, vaccineLibrary.id))
    .where(and(
      gte(petVaccinations.next_due_date, today),
      lte(petVaccinations.next_due_date, futureDate)
    ))
    .orderBy(petVaccinations.next_due_date);
  
  return results;
}

/**
 * Get active medications that are ending soon (within specified days)
 */
export async function getEndingMedicationReminders(daysAhead: number = 7) {
  const db = await getDb();
  if (!db) return [];
  
  const today = new Date();
  const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  
  const results = await db.select({
    medicationId: petMedications.id,
    pet_id: pets.id,
    petName: pets.name,
    medicationLibraryId: medicationLibrary.id,
    medicationName: medicationLibrary.name,
    endDate: petMedications.end_date,
  })
    .from(petMedications)
    .innerJoin(pets, eq(petMedications.pet_id, pets.id))
    .innerJoin(medicationLibrary, eq(petMedications.medication_id, medicationLibrary.id))
    .where(and(
      gte(petMedications.end_date, today),
      lte(petMedications.end_date, futureDate)
    ))
    .orderBy(petMedications.end_date);
  
  return results;
}

/**
 * Get flea treatments that are due soon (within specified days)
 */
export async function getUpcomingFleaTreatmentReminders(daysAhead: number = 7) {
  const db = await getDb();
  if (!db) return [];
  
  const today = new Date();
  const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  
  const results = await db.select({
    treatmentId: fleaTreatments.id,
    pet_id: pets.id,
    petName: pets.name,
    productName: fleaTreatments.productName,
    next_due_date: fleaTreatments.nextDueDate,
  })
    .from(fleaTreatments)
    .innerJoin(pets, eq(fleaTreatments.petId, pets.id))
    .where(and(
      gte(fleaTreatments.nextDueDate, today),
      lte(fleaTreatments.nextDueDate, futureDate)
    ))
    .orderBy(fleaTreatments.nextDueDate);
  
  return results;
}

/**
 * Get deworming treatments that are due soon (within specified days)
 */
export async function getUpcomingDewormingReminders(daysAhead: number = 7) {
  const db = await getDb();
  if (!db) return [];
  
  const today = new Date();
  const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  
  const results = await db.select({
    treatmentId: dewormingTreatments.id,
    pet_id: pets.id,
    petName: pets.name,
    productName: dewormingTreatments.productName,
    next_due_date: dewormingTreatments.nextDueDate,
  })
    .from(dewormingTreatments)
    .innerJoin(pets, eq(dewormingTreatments.petId, pets.id))
    .where(and(
      gte(dewormingTreatments.nextDueDate, today),
      lte(dewormingTreatments.nextDueDate, futureDate)
    ))
    .orderBy(dewormingTreatments.nextDueDate);
  
  return results;
}

/**
 * Get all upcoming health reminders grouped by type
 */
export async function getAllUpcomingHealthReminders(daysAhead: number = 7) {
  const vaccinations = await getUpcomingVaccinationReminders(daysAhead);
  const medications = await getEndingMedicationReminders(daysAhead);
  const fleaTreatments = await getUpcomingFleaTreatmentReminders(daysAhead);
  const dewormingTreatments = await getUpcomingDewormingReminders(daysAhead);
  
  return {
    vaccinations,
    medications,
    fleaTreatments,
    dewormingTreatments,
    total: vaccinations.length + medications.length + fleaTreatments.length + dewormingTreatments.length,
  };
}

// ==================== HEALTH STATISTICS ====================

/**
 * Get vaccination coverage statistics
 */
export async function getVaccinationStatistics() {
  const db = await getDb();
  if (!db) return { total: 0, upToDate: 0, overdue: 0, upcoming: 0, rate: 0 };
  
  const today = new Date();
  const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead
  
  // Get all active pets
  const allPets = await db.select().from(pets);
  const totalPets = allPets.length;
  
  if (totalPets === 0) return { total: 0, upToDate: 0, overdue: 0, upcoming: 0, rate: 0 };
  
  // Get all vaccinations
  const allVaccinations = await db.select({
    pet_id: petVaccinations.pet_id,
    next_due_date: petVaccinations.next_due_date,
  }).from(petVaccinations);
  
  // Group by pet and get latest due date
  const petVaccinationStatus = new Map<number, Date | null>();
  
  allVaccinations.forEach((v) => {
    const currentDate = petVaccinationStatus.get(v.pet_id);
    if (!currentDate || (v.next_due_date && v.next_due_date > currentDate)) {
      petVaccinationStatus.set(v.pet_id, v.next_due_date);
    }
  });
  
  let upToDate = 0;
  let overdue = 0;
  let upcoming = 0;
  
  allPets.forEach((pet) => {
    const nextDue = petVaccinationStatus.get(pet.id);
    if (!nextDue) {
      overdue++; // No vaccination record
    } else if (nextDue < today) {
      overdue++; // Overdue
    } else if (nextDue <= futureDate) {
      upcoming++; // Due soon
    } else {
      upToDate++; // Up to date
    }
  });
  
  const rate = totalPets > 0 ? Math.round((upToDate / totalPets) * 100) : 0;
  
  return {
    total: totalPets,
    upToDate,
    overdue,
    upcoming,
    rate,
  };
}

/**
 * Get active medications count
 */
export async function getActiveMedicationsCount() {
  const db = await getDb();
  if (!db) return { total: 0, byPet: [] };
  
  const today = new Date();
  
  const activeMeds = await db.select({
    pet_id: petMedications.pet_id,
    petName: pets.name,
    medicationName: medicationLibrary.name,
    endDate: petMedications.end_date,
  })
    .from(petMedications)
    .innerJoin(pets, eq(petMedications.pet_id, pets.id))
    .innerJoin(medicationLibrary, eq(petMedications.medication_id, medicationLibrary.id))
    .where(gte(petMedications.end_date, today));
  
  // Group by pet
  const byPet = activeMeds.reduce((acc: any[], med) => {
    const existing = acc.find((p) => p.pet_id === med.pet_id);
    if (existing) {
      existing.count++;
      existing.medications.push(med.medicationName);
    } else {
      acc.push({
        pet_id: med.pet_id,
        petName: med.petName,
        count: 1,
        medications: [med.medicationName],
      });
    }
    return acc;
  }, []);
  
  return {
    total: activeMeds.length,
    byPet,
  };
}

/**
 * Get preventives applied this month
 */
export async function getPreventivesThisMonth() {
  const db = await getDb();
  if (!db) return { flea: 0, deworming: 0, total: 0 };
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const fleaCount = await db.select({ count: sql<number>`count(*)` })
    .from(fleaTreatments)
    .where(and(
      gte(fleaTreatments.applicationDate, startOfMonth),
      lte(fleaTreatments.applicationDate, endOfMonth)
    ));
  
  const dewormingCount = await db.select({ count: sql<number>`count(*)` })
    .from(dewormingTreatments)
    .where(and(
      gte(dewormingTreatments.applicationDate, startOfMonth),
      lte(dewormingTreatments.applicationDate, endOfMonth)
    ));
  
  const flea = Number(fleaCount[0]?.count || 0);
  const deworming = Number(dewormingCount[0]?.count || 0);
  
  return {
    flea,
    deworming,
    total: flea + deworming,
  };
}

/**
 * Get overdue treatments (vaccinations and preventives)
 */
export async function getOverdueTreatments() {
  const db = await getDb();
  if (!db) return [];
  
  const today = new Date();
  
  // Overdue vaccinations
  const overdueVaccinations = await db.select({
    type: sql<string>`'vaccination'`,
    pet_id: pets.id,
    petName: pets.name,
    itemName: vaccineLibrary.name,
    dueDate: petVaccinations.next_due_date,
  })
    .from(petVaccinations)
    .innerJoin(pets, eq(petVaccinations.pet_id, pets.id))
    .innerJoin(vaccineLibrary, eq(petVaccinations.vaccine_id, vaccineLibrary.id))
    .where(lt(petVaccinations.next_due_date, today))
    .orderBy(petVaccinations.next_due_date);
  
  // Overdue flea treatments
  const overdueFlea = await db.select({
    type: sql<string>`'flea'`,
    pet_id: pets.id,
    petName: pets.name,
    itemName: fleaTreatments.productName,
    dueDate: fleaTreatments.nextDueDate,
  })
    .from(fleaTreatments)
    .innerJoin(pets, eq(fleaTreatments.petId, pets.id))
    .where(lt(fleaTreatments.nextDueDate, today))
    .orderBy(fleaTreatments.nextDueDate);
  
  // Overdue deworming
  const overdueDeworming = await db.select({
    type: sql<string>`'deworming'`,
    pet_id: pets.id,
    petName: pets.name,
    itemName: dewormingTreatments.productName,
    dueDate: dewormingTreatments.nextDueDate,
  })
    .from(dewormingTreatments)
    .innerJoin(pets, eq(dewormingTreatments.petId, pets.id))
    .where(lt(dewormingTreatments.nextDueDate, today))
    .orderBy(dewormingTreatments.nextDueDate);
  
  return [...overdueVaccinations, ...overdueFlea, ...overdueDeworming];
}

/**
 * Get all health statistics for dashboard
 */
export async function getHealthDashboardStats() {
  const vaccination = await getVaccinationStatistics();
  const medications = await getActiveMedicationsCount();
  const preventives = await getPreventivesThisMonth();
  const overdue = await getOverdueTreatments();
  
  return {
    vaccination,
    medications,
    preventives,
    overdue,
  };
}

// ==================== HEALTH HISTORY FOR REPORTS ====================

/**
 * Get complete vaccination history for a pet
 */
export async function getPetVaccinationHistory(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  const history = await db.select({
    id: petVaccinations.id,
    vaccineId: petVaccinations.vaccine_id,
    vaccineName: vaccineLibrary.name,
    vaccineDescription: vaccineLibrary.description,
    applicationDate: petVaccinations.application_date,
    next_due_date: petVaccinations.next_due_date,
    batchNumber: petVaccinations.batch_number,
    veterinarian: petVaccinations.veterinarian,
    notes: petVaccinations.notes,
  })
    .from(petVaccinations)
    .innerJoin(vaccineLibrary, eq(petVaccinations.vaccine_id, vaccineLibrary.id))
    .where(eq(petVaccinations.pet_id, pet_id))
    .orderBy(desc(petVaccinations.application_date));
  
  return history;
}

/**
 * Get complete medication history for a pet
 */
export async function getPetMedicationHistory(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  const history = await db.select({
    id: petMedications.id,
    medicationId: petMedications.medication_id,
    medicationName: medicationLibrary.name,
    medicationType: medicationLibrary.type,
    startDate: petMedications.start_date,
    endDate: petMedications.end_date,
    dosage: petMedications.dosage,
    frequency: petMedications.frequency,
    notes: petMedications.notes,
  })
    .from(petMedications)
    .innerJoin(medicationLibrary, eq(petMedications.medication_id, medicationLibrary.id))
    .where(eq(petMedications.pet_id, pet_id))
    .orderBy(desc(petMedications.start_date));
  
  return history;
}

/**
 * Get complete flea treatment history for a pet
 */
export async function getPetFleaTreatmentHistory(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  const history = await db.select()
    .from(fleaTreatments)
    .where(eq(fleaTreatments.petId, pet_id))
    .orderBy(desc(fleaTreatments.applicationDate));
  
  return history;
}

/**
 * Get complete deworming history for a pet
 */
export async function getPetDewormingHistory(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  const history = await db.select()
    .from(dewormingTreatments)
    .where(eq(dewormingTreatments.petId, pet_id))
    .orderBy(desc(dewormingTreatments.applicationDate));
  
  return history;
}

/**
 * Get complete health history for a pet (all records combined)
 */
export async function getPetCompleteHealthHistory(pet_id: number) {
  const [pet, vaccinations, medications, fleaTreatmentsData, dewormingTreatmentsData] = await Promise.all([
    getPetById(pet_id),
    getPetVaccinationHistory(pet_id),
    getPetMedicationHistory(pet_id),
    getPetFleaTreatmentHistory(pet_id),
    getPetDewormingHistory(pet_id),
  ]);
  
  if (!pet) {
    throw new Error("Pet not found");
  }
  
  return {
    pet,
    vaccinations,
    medications,
    preventives: {
      flea: fleaTreatmentsData,
      deworming: dewormingTreatmentsData,
    },
  };
}


/**
 * Get all health events for calendar view
 */
export async function getHealthCalendarEvents(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const events: Array<{
    id: string;
    title: string;
    start: Date;
    end: Date;
    type: "vaccine" | "medication" | "flea" | "deworming";
    pet_id: number;
    petName: string;
    notes?: string | null;
  }> = [];

  // Get vaccinations
  const vaccinations = await db
    .select({
      id: petVaccinations.id,
      pet_id: petVaccinations.pet_id,
      petName: pets.name,
      vaccineName: vaccineLibrary.name,
      next_due_date: petVaccinations.next_due_date,
      notes: petVaccinations.notes,
    })
    .from(petVaccinations)
    .leftJoin(pets, eq(petVaccinations.pet_id, pets.id))
    .leftJoin(vaccineLibrary, eq(petVaccinations.vaccine_id, vaccineLibrary.id))
    .where(
      and(
        startDate ? gte(petVaccinations.next_due_date, startDate) : undefined,
        endDate ? lte(petVaccinations.next_due_date, endDate) : undefined
      )
    )
    .orderBy(petVaccinations.next_due_date);

  for (const v of vaccinations) {
    if (v.next_due_date) {
      events.push({
        id: `vaccine-${v.id}`,
        title: `💉 ${v.vaccineName} - ${v.petName}`,
        start: v.next_due_date,
        end: v.next_due_date,
        type: "vaccine",
        pet_id: v.pet_id,
        petName: v.petName || "Pet",
        notes: v.notes,
      });
    }
  }

  // Get medications
  const medications = await db
    .select({
      id: petMedications.id,
      pet_id: petMedications.pet_id,
      petName: pets.name,
      medicationName: medicationLibrary.name,
      endDate: petMedications.end_date,
      notes: petMedications.notes,
    })
    .from(petMedications)
    .leftJoin(pets, eq(petMedications.pet_id, pets.id))
    .leftJoin(medicationLibrary, eq(petMedications.medication_id, medicationLibrary.id))
    .where(
      and(
        startDate ? gte(petMedications.end_date, startDate) : undefined,
        endDate ? lte(petMedications.end_date, endDate) : undefined
      )
    )
    .orderBy(petMedications.end_date);

  for (const m of medications) {
    if (m.endDate) {
      events.push({
        id: `medication-${m.id}`,
        title: `💊 ${m.medicationName} - ${m.petName}`,
        start: m.endDate,
        end: m.endDate,
        type: "medication",
        pet_id: m.pet_id,
        petName: m.petName || "Pet",
        notes: m.notes,
      });
    }
  }

  // Get flea treatments
  const fleaResults = await db
    .select()
    .from(fleaTreatments)
    .leftJoin(pets, eq(fleaTreatments.petId, pets.id))
    .where(
      and(
        startDate ? gte(fleaTreatments.nextDueDate, startDate) : undefined,
        endDate ? lte(fleaTreatments.nextDueDate, endDate) : undefined
      )
    )
    .orderBy(fleaTreatments.nextDueDate);

  for (const f of fleaResults) {
    events.push({
      id: `flea-${f.fleaTreatments.id}`,
      title: `🛡️ ${f.fleaTreatments.productName} - ${f.pets?.name}`,
      start: f.fleaTreatments.nextDueDate,
      end: f.fleaTreatments.nextDueDate,
      type: "flea",
      pet_id: f.fleaTreatments.petId,
      petName: f.pets?.name || "Pet",
      notes: f.fleaTreatments.notes,
    });
  }

  // Get deworming treatments
  const dewormingResults = await db
    .select()
    .from(dewormingTreatments)
    .leftJoin(pets, eq(dewormingTreatments.petId, pets.id))
    .where(
      and(
        startDate ? gte(dewormingTreatments.nextDueDate, startDate) : undefined,
        endDate ? lte(dewormingTreatments.nextDueDate, endDate) : undefined
      )
    )
    .orderBy(dewormingTreatments.nextDueDate);

  for (const d of dewormingResults) {
    events.push({
      id: `deworming-${d.dewormingTreatments.id}`,
      title: `🐛 ${d.dewormingTreatments.productName} - ${d.pets?.name}`,
      start: d.dewormingTreatments.nextDueDate,
      end: d.dewormingTreatments.nextDueDate,
      type: "deworming",
      pet_id: d.dewormingTreatments.petId,
      petName: d.pets?.name || "Pet",
      notes: d.dewormingTreatments.notes,
    });
  }

  return events;
}


/**
 * Get all tutors with pagination
 */
export async function getAllTutors(page: number = 1, limit: number = 20, search?: string) {
  const db = await getDb();
  if (!db) return { tutors: [], total: 0 };

  const offset = (page - 1) * limit;

  let query = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      createdAt: users.created_at,
      lastSignedIn: users.last_signed_in,
    })
    .from(users)
    .where(eq(users.role, "user"))
    .$dynamic();

  if (search) {
    query = query.where(
      or(
        sql`${users.name} LIKE ${`%${search}%`}`,
        sql`${users.email} LIKE ${`%${search}%`}`,
        sql`${users.phone} LIKE ${`%${search}%`}`
      )
    );
  }

  const tutors = await query.limit(limit).offset(offset).orderBy(desc(users.created_at));

  // Get total count
  const countResult = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.role, "user"));

  return {
    tutors,
    total: countResult[0]?.count || 0,
  };
}

/**
 * Get tutor by ID with linked pets
 */
export async function getTutorById(tutor_id: number) {
  const db = await getDb();
  if (!db) return null;

  // Get tutor info
  const tutorResult = await db
    .select()
    .from(users)
    .where(and(eq(users.id, tutor_id), eq(users.role, "user")))
    .limit(1);

  if (tutorResult.length === 0) return null;

  const tutor = tutorResult[0];

  // Get linked pets
  const linkedPets = await db
    .select({
      pet_id: petTutors.pet_id,
      petName: pets.name,
      petBreed: pets.breed,
      petPhotoUrl: pets.photo_url,
      is_primary: petTutors.is_primary,
      linkedAt: petTutors.created_at,
    })
    .from(petTutors)
    .leftJoin(pets, eq(petTutors.pet_id, pets.id))
    .where(eq(petTutors.tutor_id, tutor_id))
    .orderBy(desc(petTutors.is_primary), pets.name);

  return {
    ...tutor,
    linkedPets,
  };
}

/**
 * Update tutor information
 */
export async function updateTutor(tutor_id: number, data: {
  name?: string;
  email?: string;
  phone?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  await db
    .update(users)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(users.id, tutor_id));

  return await getTutorById(tutor_id);
}

/**
 * Link pet to tutor
 */
export async function linkPetToTutor(pet_id: number, tutor_id: number, is_primary: boolean = false) {
  const db = await getDb();
  if (!db) return false;

  // Check if link already exists
  const existing = await db
    .select()
    .from(petTutors)
    .where(and(eq(petTutors.pet_id, pet_id), eq(petTutors.tutor_id, tutor_id)))
    .limit(1);

  if (existing.length > 0) {
    // Update is_primary if needed
    if (is_primary) {
      await db
        .update(petTutors)
        .set({ is_primary: true })
        .where(and(eq(petTutors.pet_id, pet_id), eq(petTutors.tutor_id, tutor_id)));
    }
    return true;
  }

  // If setting as primary, remove primary from other tutors
  if (is_primary) {
    await db
      .update(petTutors)
      .set({ is_primary: false })
      .where(eq(petTutors.pet_id, pet_id));
  }

  // Create new link
  await db.insert(petTutors).values({
    pet_id,
    tutor_id,
    is_primary,
  });

  return true;
}

/**
 * Unlink pet from tutor
 */
export async function unlinkPetFromTutor(pet_id: number, tutor_id: number) {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(petTutors)
    .where(and(eq(petTutors.pet_id, pet_id), eq(petTutors.tutor_id, tutor_id)));

  return true;
}

/**
 * Get reminder history for a tutor (mock for now - will be implemented with actual tracking)
 */
export async function getTutorReminderHistory(tutor_id: number) {
  const db = await getDb();
  if (!db) return [];

  // For now, return empty array
  // In the future, this will query a reminders_sent table
  return [];
}


// ===== CALENDAR - ALL EVENTS =====

/**
 * Get all calendar events (health, bookings, payments)
 */
export async function getAllCalendarEvents(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];

  // Get health events (existing function)
  const healthEvents = await getHealthCalendarEvents(startDate, endDate);

  // Get bookings/stays (check-in and check-out)
  const bookingsData = await db
    .select({
      id: bookings.id,
      pet_id: bookings.petId,
      petName: pets.name,
      bookingDate: bookings.bookingDate,
      numberOfDays: bookings.numberOfDays,
      status: bookings.status,
      notes: bookings.notes,
    })
    .from(bookings)
    .leftJoin(pets, eq(bookings.petId, pets.id))
    .where(
      and(
        gte(bookings.bookingDate, startDate),
        lte(bookings.bookingDate, endDate)
      )
    );

  // Transform bookings into check-in and check-out events
  const bookingEvents = bookingsData.flatMap((booking) => {
    const checkInDate = new Date(booking.bookingDate);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + (booking.numberOfDays || 1));

    return [
      {
        id: `checkin-${booking.id}`,
        title: `Check-in: ${booking.petName || "Pet"}`,
        start: checkInDate,
        end: checkInDate,
        type: "checkin" as const,
        pet_id: booking.pet_id,
        petName: booking.petName || "Pet",
        notes: booking.notes,
        status: booking.status,
        bookingId: booking.id,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
      },
      {
        id: `checkout-${booking.id}`,
        title: `Check-out: ${booking.petName || "Pet"}`,
        start: checkOutDate,
        end: checkOutDate,
        type: "checkout" as const,
        pet_id: booking.pet_id,
        petName: booking.petName || "Pet",
        notes: booking.notes,
        status: booking.status,
        bookingId: booking.id,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
      },
    ];
  });

  // Get payments (due dates from transactions)
  const paymentsData = await db
    .select({
      id: transactions.id,
      pet_id: transactions.pet_id,
      petName: pets.name,
      amount: transactions.amount,
      description: transactions.description,
      category: transactions.category,
      transactionDate: transactions.transaction_date,
      type: transactions.type,
    })
    .from(transactions)
    .leftJoin(pets, eq(transactions.pet_id, pets.id))
    .where(
      and(
        gte(transactions.transaction_date, startDate),
        lte(transactions.transaction_date, endDate),
        or(
          eq(transactions.type, "income"),
          eq(transactions.type, "expense")
        )
      )
    );

  const paymentEvents = paymentsData.map((payment) => ({
    id: `payment-${payment.id}`,
    title: `${payment.type === "income" ? "Receita" : "Despesa"}: ${payment.description}`,
    start: new Date(payment.transactionDate),
    end: new Date(payment.transactionDate),
    type: payment.type === "income" ? ("payment-income" as const) : ("payment-expense" as const),
    pet_id: payment.pet_id,
    petName: payment.petName || undefined,
    notes: `${payment.category} - R$ ${(payment.amount / 100).toFixed(2)}`,
    amount: payment.amount,
    category: payment.category,
  }));

  // Combine all events
  return [...healthEvents, ...bookingEvents, ...paymentEvents];
}


// ===== CALENDAR - OCCUPANCY & CREDITS =====

/**
 * Get daily occupancy stats for a date range
 */
export async function getDailyOccupancy(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];

  // Get all bookings in the range
  const bookingsData = await db
    .select({
      id: bookings.id,
      pet_id: bookings.petId,
      bookingDate: bookings.bookingDate,
      numberOfDays: bookings.numberOfDays,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        gte(bookings.bookingDate, startDate),
        lte(bookings.bookingDate, endDate),
        or(
          eq(bookings.status, "confirmed"),
          eq(bookings.status, "pending")
        )
      )
    );

  // Calculate occupancy per day
  const occupancyMap = new Map<string, number>();
  
  bookingsData.forEach((booking) => {
    const checkInDate = new Date(booking.bookingDate);
    const numberOfDays = booking.numberOfDays || 1;
    
    for (let i = 0; i < numberOfDays; i++) {
      const currentDate = new Date(checkInDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateKey = currentDate.toISOString().split('T')[0];
      
      occupancyMap.set(dateKey, (occupancyMap.get(dateKey) || 0) + 1);
    }
  });

  return Array.from(occupancyMap.entries()).map(([date, count]) => ({
    date,
    occupancy: count,
  }));
}


/**
 * Get credit consumption for a date range
 */
export async function getCreditConsumption(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return { total: 0, byPet: [] };

  const usageData = await db
    .select({
      pet_id: daycareUsage.pet_id,
      petName: pets.name,
      count: sql<number>`COUNT(*)`,
    })
    .from(daycareUsage)
    .leftJoin(pets, eq(daycareUsage.pet_id, pets.id))
    .where(
      and(
        gte(daycareUsage.usage_date, startDate),
        lte(daycareUsage.usage_date, endDate)
      )
    )
    .groupBy(daycareUsage.pet_id, pets.name);

  const total = usageData.reduce((sum, item) => sum + Number(item.count), 0);
  const byPet = usageData.map((item) => ({
    pet_id: item.pet_id,
    petName: item.petName || "Pet",
    creditsUsed: Number(item.count),
  }));

  return { total, byPet };
}

/**
 * Get events for a specific day
 */
export async function getDayEvents(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await getAllCalendarEvents(startOfDay, endOfDay);
}


// ==================== AUDIT LOGS ====================

export async function createAuditLog(data: {
  user_id: number | null;
  action: string;
  resource?: string;
  success: boolean;
  errorCode?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(auditLogs).values({
    userId: data.user_id,
    action: data.action,
    resource: data.resource || null,
    success: data.success,
    errorCode: data.errorCode || null,
    ipAddress: data.ipAddress || null,
    userAgent: data.userAgent || null,
  }) as any;
  // PostgreSQL returns the inserted row directly, not insertId
  return result[0]?.id || 0;
}

export async function getAuditLogs(filters?: {
  userId?: number;
  action?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(auditLogs);

  const conditions: any[] = [];
  if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
  if (filters?.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters?.success !== undefined) conditions.push(eq(auditLogs.success, filters.success));
  if (filters?.startDate) conditions.push(gte(auditLogs.timestamp, filters.startDate));
  if (filters?.endDate) conditions.push(lte(auditLogs.timestamp, filters.endDate));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.orderBy(desc(auditLogs.timestamp)) as any;

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }

  return await query;
}

export async function getFailedAccessAttempts(days: number = 7) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.success, false),
        gte(auditLogs.timestamp, startDate)
      )
    )
    .orderBy(desc(auditLogs.timestamp));
}


// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

export async function getAllNotificationTemplates() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notificationTemplates).orderBy(notificationTemplates.type);
}

export async function getNotificationTemplateByType(type: string) {
  const db = await getDb();
  if (!db) return null;
  const results = await db
    .select()
    .from(notificationTemplates)
    .where(eq(notificationTemplates.type, type as any))
    .limit(1);
  return results[0] || null;
}

export async function createNotificationTemplate(data: {
  type: string;
  title: string;
  message: string;
  availableVariables?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(notificationTemplates).values(data as any);
  return Number((result as any).insertId);
}

export async function updateNotificationTemplate(id: number, data: {
  title?: string;
  message?: string;
  availableVariables?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(notificationTemplates)
    .set(data)
    .where(eq(notificationTemplates.id, id));
  return true;
}

export async function deleteNotificationTemplate(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(notificationTemplates).where(eq(notificationTemplates.id, id));
  return true;
}

// ============================================================================
// TUTOR NOTIFICATION PREFERENCES
// ============================================================================

export async function getTutorNotificationPreferences(tutor_id: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(tutorNotificationPreferences)
    .where(eq(tutorNotificationPreferences.tutorId, tutor_id));
}

export async function getTutorPreferenceByType(tutor_id: number, type: string) {
  const db = await getDb();
  if (!db) return null;
  const results = await db
    .select()
    .from(tutorNotificationPreferences)
    .where(
      and(
        eq(tutorNotificationPreferences.tutorId, tutor_id),
        eq(tutorNotificationPreferences.notificationType, type as any)
      )
    )
    .limit(1);
  return results[0] || null;
}

export async function createTutorNotificationPreference(data: {
  tutorId: number;
  notificationType: string;
  enabled?: boolean;
  adminOverride?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(tutorNotificationPreferences).values(data as any);
  return Number((result as any).insertId);
}

export async function updateTutorNotificationPreference(id: number, data: {
  enabled?: boolean;
  adminOverride?: boolean;
}) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(tutorNotificationPreferences)
    .set(data)
    .where(eq(tutorNotificationPreferences.id, id));
  return true;
}

export async function deleteTutorNotificationPreference(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(tutorNotificationPreferences).where(eq(tutorNotificationPreferences.id, id));
  return true;
}

export async function getAllTutorPreferences() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: tutorNotificationPreferences.id,
      tutor_id: tutorNotificationPreferences.tutorId,
      tutorName: users.name,
      tutorEmail: users.email,
      notificationType: tutorNotificationPreferences.notificationType,
      enabled: tutorNotificationPreferences.enabled,
      adminOverride: tutorNotificationPreferences.adminOverride,
    })
    .from(tutorNotificationPreferences)
    .leftJoin(users, eq(tutorNotificationPreferences.tutorId, users.id))
    .orderBy(users.name, tutorNotificationPreferences.notificationType);
}

/**
 * Check if a tutor should receive a specific notification type
 * Returns true if:
 * 1. No preference exists (default to enabled)
 * 2. Preference exists and enabled=true AND adminOverride=false
 */
export async function shouldSendNotification(tutor_id: number, type: string): Promise<boolean> {
  const preference = await getTutorPreferenceByType(tutor_id, type);
  
  if (!preference) {
    // No preference = default enabled
    return true;
  }
  
  // If admin has overridden, respect that
  if (preference.adminOverride) {
    return false;
  }
  
  // Otherwise, respect tutor's preference
  return preference.enabled;
}


// ============================================
// Health & Behavior Logs
// ============================================

export async function createHealthBehaviorLog(data: InsertHealthBehaviorLog) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(healthBehaviorLogs).values(data);
  return { id: Number((result as any).insertId) };
}

export async function getHealthBehaviorLogsByPet(pet_id: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: healthBehaviorLogs.id,
      pet_id: healthBehaviorLogs.petId,
      petName: pets.name,
      recordedBy: healthBehaviorLogs.recordedBy,
      recordedByName: users.name,
      recordedAt: healthBehaviorLogs.recordedAt,
      mood: healthBehaviorLogs.mood,
      stool: healthBehaviorLogs.stool,
      behavior: healthBehaviorLogs.behavior,
      appetite: healthBehaviorLogs.appetite,
      waterIntake: healthBehaviorLogs.waterIntake,
      notes: healthBehaviorLogs.notes,
      createdAt: healthBehaviorLogs.createdAt,
    })
    .from(healthBehaviorLogs)
    .leftJoin(pets, eq(healthBehaviorLogs.petId, pets.id))
    .leftJoin(users, eq(healthBehaviorLogs.recordedBy, users.id))
    .where(eq(healthBehaviorLogs.petId, pet_id))
    .orderBy(desc(healthBehaviorLogs.recordedAt))
    .limit(limit);
}

export async function getRecentHealthBehaviorLogs(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: healthBehaviorLogs.id,
      pet_id: healthBehaviorLogs.petId,
      petName: pets.name,
      recordedBy: healthBehaviorLogs.recordedBy,
      recordedByName: users.name,
      recordedAt: healthBehaviorLogs.recordedAt,
      mood: healthBehaviorLogs.mood,
      stool: healthBehaviorLogs.stool,
      behavior: healthBehaviorLogs.behavior,
      appetite: healthBehaviorLogs.appetite,
      waterIntake: healthBehaviorLogs.waterIntake,
      notes: healthBehaviorLogs.notes,
    })
    .from(healthBehaviorLogs)
    .leftJoin(pets, eq(healthBehaviorLogs.petId, pets.id))
    .leftJoin(users, eq(healthBehaviorLogs.recordedBy, users.id))
    .orderBy(desc(healthBehaviorLogs.recordedAt))
    .limit(limit);
}

export async function getHealthBehaviorLogById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db
    .select()
    .from(healthBehaviorLogs)
    .where(eq(healthBehaviorLogs.id, id))
    .limit(1);
  return results[0] || null;
}

export async function deleteHealthBehaviorLog(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(healthBehaviorLogs).where(eq(healthBehaviorLogs.id, id));
  return true;
}

/**
 * Get health behavior statistics for a pet
 */
export async function getHealthBehaviorStats(pet_id: number, days = 30) {
  const db = await getDb();
  if (!db) return null;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const logs = await db
    .select()
    .from(healthBehaviorLogs)
    .where(
      and(
        eq(healthBehaviorLogs.petId, pet_id),
        gte(healthBehaviorLogs.recordedAt, startDate)
      )
    )
    .orderBy(healthBehaviorLogs.recordedAt);
  
  // Calculate distributions
  const moodDist: Record<string, number> = {};
  const stoolDist: Record<string, number> = {};
  const behaviorDist: Record<string, number> = {};
  const appetiteDist: Record<string, number> = {};
  const waterDist: Record<string, number> = {};
  
  logs.forEach(log => {
    if (log.mood) moodDist[log.mood] = (moodDist[log.mood] || 0) + 1;
    if (log.stool) stoolDist[log.stool] = (stoolDist[log.stool] || 0) + 1;
    if (log.behavior) behaviorDist[log.behavior] = (behaviorDist[log.behavior] || 0) + 1;
    if (log.appetite) appetiteDist[log.appetite] = (appetiteDist[log.appetite] || 0) + 1;
    if (log.waterIntake) waterDist[log.waterIntake] = (waterDist[log.waterIntake] || 0) + 1;
  });
  
  return {
    totalLogs: logs.length,
    moodDistribution: moodDist,
    stoolDistribution: stoolDist,
    behaviorDistribution: behaviorDist,
    appetiteDistribution: appetiteDist,
    waterDistribution: waterDist,
    logs: logs.slice(0, 10), // Last 10 logs
  };
}


/**
 * Credit Packages - Manage available credit packages for purchase
 */
export async function getAllCreditPackages() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(creditPackages)
    .where(eq(creditPackages.isActive, true))
    .orderBy(creditPackages.displayOrder);
}

export async function getAllCreditPackagesIncludingInactive() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(creditPackages)
    .orderBy(creditPackages.displayOrder);
}

export async function getCreditPackageById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db
    .select()
    .from(creditPackages)
    .where(eq(creditPackages.id, id))
    .limit(1);
  return results[0] || null;
}

export async function createCreditPackage(data: InsertCreditPackage) {
  const db = await getDb();
  if (!db) return null;
  const result: any = await db.insert(creditPackages).values(data);
  return { id: Number(result.insertId) || 0 };
}

export async function updateCreditPackage(id: number, data: Partial<InsertCreditPackage>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(creditPackages).set(data).where(eq(creditPackages.id, id));
  return true;
}

export async function deleteCreditPackage(id: number) {
  const db = await getDb();
  if (!db) return false;
  // Soft delete by setting isActive to false
  await db.update(creditPackages).set({ isActive: false }).where(eq(creditPackages.id, id));
  return true;
}


// ============================================================================
// Event Types Functions
// ============================================================================

export async function getAllEventTypes() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(eventTypes).where(eq(eventTypes.isActive, true)).orderBy(eventTypes.name);
}

export async function getAllEventTypesIncludingInactive() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(eventTypes).orderBy(eventTypes.name);
}

export async function getEventTypeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(eventTypes).where(eq(eventTypes.id, id)).limit(1);
  return result || null;
}

export async function createEventType(data: InsertEventType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result: any = await db.insert(eventTypes).values(data);
  const insertId = Number(result.insertId) || Number(result[0]?.insertId) || 0;
  if (insertId === 0) {
    throw new Error("Failed to create event type");
  }
  return { id: insertId };
}

export async function updateEventType(id: number, data: Partial<InsertEventType>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(eventTypes).set(data).where(eq(eventTypes.id, id));
  return true;
}

export async function deleteEventType(id: number) {
  const db = await getDb();
  if (!db) return false;
  // Soft delete
  await db.update(eventTypes).set({ isActive: false }).where(eq(eventTypes.id, id));
  return true;
}


// ============================================
// MEDICATION AUTO-SCHEDULE RULES
// ============================================

export async function getAllAutoScheduleRules() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(medicationAutoScheduleRules).where(eq(medicationAutoScheduleRules.isActive, true));
}

export async function getAllAutoScheduleRulesIncludingInactive() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(medicationAutoScheduleRules);
}

export async function getAutoScheduleRuleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(medicationAutoScheduleRules).where(eq(medicationAutoScheduleRules.id, id)).limit(1);
  return result || null;
}

export async function getAutoScheduleRuleByMedicationId(medicationId: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db
    .select()
    .from(medicationAutoScheduleRules)
    .where(
      and(
        eq(medicationAutoScheduleRules.medicationId, medicationId),
        eq(medicationAutoScheduleRules.isActive, true)
      )
    )
    .limit(1);
  return result || null;
}

export async function createAutoScheduleRule(data: InsertMedicationAutoScheduleRule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result: any = await db.insert(medicationAutoScheduleRules).values(data);
  const insertId = Number(result.insertId) || Number(result[0]?.insertId) || 0;
  if (insertId === 0) {
    throw new Error("Failed to create auto-schedule rule");
  }
  return { id: insertId };
}

export async function updateAutoScheduleRule(id: number, data: Partial<InsertMedicationAutoScheduleRule>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(medicationAutoScheduleRules).set(data).where(eq(medicationAutoScheduleRules.id, id));
  return true;
}

export async function deleteAutoScheduleRule(id: number) {
  const db = await getDb();
  if (!db) return false;
  // Soft delete
  await db.update(medicationAutoScheduleRules).set({ isActive: false }).where(eq(medicationAutoScheduleRules.id, id));
  return true;
}


// ============================================
// PET FOOD STOCK MANAGEMENT
// ============================================

export async function getPetFoodStock(pet_id: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(petFoodStock).where(eq(petFoodStock.petId, pet_id)).limit(1);
  return result || null;
}

export async function createPetFoodStock(data: InsertPetFoodStock) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result: any = await db.insert(petFoodStock).values(data);
  const insertId = Number(result.insertId) || Number(result[0]?.insertId) || 0;
  if (insertId === 0) {
    throw new Error("Failed to create pet food stock");
  }
  return { id: insertId };
}

export async function updatePetFoodStock(pet_id: number, data: Partial<InsertPetFoodStock>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(petFoodStock).set(data).where(eq(petFoodStock.petId, pet_id));
  return true;
}

export async function getAllLowStockPets(thresholdDays?: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all pet food stocks
  const stocks = await db.select().from(petFoodStock);
  
  // Filter by threshold
  const lowStockPets = stocks.filter(stock => {
    const daysRemaining = Math.floor(stock.currentStock / stock.dailyConsumption);
    const threshold = thresholdDays || stock.alertThresholdDays;
    return daysRemaining <= threshold;
  });
  
  return lowStockPets;
}

/**
 * Calculate days remaining based on current stock and daily consumption
 */
export function calculateStockDuration(currentStock: number, dailyConsumption: number): number {
  if (dailyConsumption <= 0) return 0;
  return Math.floor(currentStock / dailyConsumption);
}

/**
 * Calculate estimated restock date based on current stock, consumption, and threshold
 */
export function calculateRestockDate(
  currentStock: number,
  dailyConsumption: number,
  alertThresholdDays: number
): Date {
  const daysRemaining = calculateStockDuration(currentStock, dailyConsumption);
  const daysUntilAlert = daysRemaining - alertThresholdDays;
  
  const restockDate = new Date();
  restockDate.setDate(restockDate.getDate() + Math.max(0, daysUntilAlert));
  
  return restockDate;
}


// ==================== WALL POSTS ====================

export async function createWallPost(data: InsertWallPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(wallPosts).values(data).returning();
  return result.id;
}

export async function getWallPosts(limit: number = 20, offset: number = 0, petId?: number, userId?: number, targetType?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db
    .select({
      id: wallPosts.id,
      pet_id: wallPosts.petId,
      authorId: wallPosts.authorId,
      content: wallPosts.content,
      mediaUrls: wallPosts.mediaUrls,
      mediaKeys: wallPosts.mediaKeys,
      postType: wallPosts.postType,
      targetType: wallPosts.targetType,
      targetId: wallPosts.targetId,
      createdAt: wallPosts.createdAt,
      updated_at: wallPosts.updatedAt,
      authorName: users.name,
      authorRole: users.role,
      petName: pets.name,
    })
    .from(wallPosts)
    .leftJoin(users, eq(wallPosts.authorId, users.id))
    .leftJoin(pets, eq(wallPosts.petId, pets.id))
    .orderBy(desc(wallPosts.createdAt))
    .limit(limit)
    .offset(offset);
  
  // Filter by petId if provided
  if (petId !== undefined) {
    query = query.where(eq(wallPosts.petId, petId)) as any;
  }
  
  // Filter by targetType if provided
  if (targetType && targetType !== "all") {
    query = query.where(eq(wallPosts.targetType, targetType as "general" | "tutor" | "pet")) as any;
  }
  
  // For tutors: show general posts + posts targeted to them or their pets
  if (userId) {
    const userInfo = await db.select().from(users).where(eq(users.id, userId));
    if (userInfo[0]?.role === "user") {
      // Get user's pets
      const userPets = await db.select().from(petTutors).where(eq(petTutors.tutor_id, userId));
      const petIds = userPets.map(pt => pt.pet_id);
      
      // Show: general posts OR posts targeted to this tutor OR posts targeted to their pets
      query = query.where(
        or(
          eq(wallPosts.targetType, "general"),
          and(eq(wallPosts.targetType, "tutor"), eq(wallPosts.targetId, userId)),
          and(eq(wallPosts.targetType, "pet"), petIds.length > 0 ? sql`${wallPosts.targetId} IN (${petIds.join(",")})` : sql`false`)
        )
      ) as any;
    }
  }
  
  return await query;
}

export async function getWallPostById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [post] = await db
    .select({
      id: wallPosts.id,
      pet_id: wallPosts.petId,
      authorId: wallPosts.authorId,
      content: wallPosts.content,
      mediaUrls: wallPosts.mediaUrls,
      mediaKeys: wallPosts.mediaKeys,
      postType: wallPosts.postType,
      createdAt: wallPosts.createdAt,
      updated_at: wallPosts.updatedAt,
      authorName: users.name,
      authorRole: users.role,
      petName: pets.name,
    })
    .from(wallPosts)
    .leftJoin(users, eq(wallPosts.authorId, users.id))
    .leftJoin(pets, eq(wallPosts.petId, pets.id))
    .where(eq(wallPosts.id, id));
  
  return post || null;
}

export async function deleteWallPost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(wallPosts).where(eq(wallPosts.id, id));
}

// ==================== WALL COMMENTS ====================

export async function addWallComment(postId: number, authorId: number, comment: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(wallComments).values({ postId, authorId, comment }).returning();
  return result.id;
}

export async function getWallComments(postId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: wallComments.id,
      postId: wallComments.postId,
      authorId: wallComments.authorId,
      comment: wallComments.comment,
      createdAt: wallComments.createdAt,
      authorName: users.name,
      authorRole: users.role,
    })
    .from(wallComments)
    .leftJoin(users, eq(wallComments.authorId, users.id))
    .where(eq(wallComments.postId, postId))
    .orderBy(asc(wallComments.createdAt));
}

export async function deleteWallComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(wallComments).where(eq(wallComments.id, id));
}

// ==================== WALL REACTIONS ====================

export async function addWallReaction(postId: number, user_id: number, reactionType: "like" | "love" | "laugh" | "wow" | "sad") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if user already reacted
  const existing = await db
    .select()
    .from(wallReactions)
    .where(and(eq(wallReactions.postId, postId), eq(wallReactions.userId, user_id)));
  
  if (existing.length > 0) {
    // Update existing reaction
    await db
      .update(wallReactions)
      .set({ reactionType })
      .where(and(eq(wallReactions.postId, postId), eq(wallReactions.userId, user_id)));
  } else {
    // Insert new reaction
    await db.insert(wallReactions).values({ postId, userId: user_id, reactionType });
  }
}

export async function removeWallReaction(postId: number, user_id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(wallReactions).where(and(eq(wallReactions.postId, postId), eq(wallReactions.userId, user_id)));
}

export async function getWallReactions(postId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(wallReactions).where(eq(wallReactions.postId, postId));
}

export async function getWallReactionCounts(postId: number) {
  const db = await getDb();
  if (!db) return {};
  
  const reactions = await db.select().from(wallReactions).where(eq(wallReactions.postId, postId));
  
  const counts: Record<string, number> = {};
  reactions.forEach((r: any) => {
    counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
  });
  
  return counts;
}

// ==================== CHAT & CONVERSATIONS ====================

export async function createConversation(data: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(conversations).values(data).returning();
  return result.id;
}

export async function getConversations(user_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get conversations where user is a participant
  const allConversations = await db.select().from(conversations);
  
  return allConversations.filter((conv: any) => {
    const participants = conv.participants as number[];
    return participants.includes(user_id);
  });
}

export async function getConversationById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  return conv || null;
}

export async function addChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(chatMessages).values(data).returning();
  
  // Update conversation lastMessageAt
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, data.conversationId));
  
  return result.id;
}

export async function getChatMessages(conversationId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: chatMessages.id,
      conversationId: chatMessages.conversationId,
      senderId: chatMessages.senderId,
      content: chatMessages.content,
      mediaUrl: chatMessages.mediaUrl,
      mediaKey: chatMessages.mediaKey,
      messageType: chatMessages.messageType,
      whatsappMessageId: chatMessages.whatsappMessageId,
      isRead: chatMessages.isRead,
      createdAt: chatMessages.createdAt,
      senderName: users.name,
      senderRole: users.role,
    })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.senderId, users.id))
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function markMessagesAsRead(conversationId: number, user_id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(chatMessages)
    .set({ isRead: true })
    .where(and(
      eq(chatMessages.conversationId, conversationId),
      not(eq(chatMessages.senderId, user_id))
    ));
}


/**
 * Get tutors grouped by pet
 * Returns all tutors for a specific pet
 */
export async function getTutorsByPet(pet_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  const tutors = await db
    .select({
      tutor_id: petTutors.tutor_id,
      pet_id: petTutors.pet_id,
      is_primary: petTutors.is_primary,
      tutorName: users.name,
      tutorEmail: users.email,
      tutorPhone: users.phone,
      tutorRole: users.role,
    })
    .from(petTutors)
    .leftJoin(users, eq(petTutors.tutor_id, users.id))
    .where(eq(petTutors.pet_id, pet_id));
  
  return tutors;
}

/**
 * Get pets grouped by tutor
 * Returns all pets for a specific tutor
 */
export async function getPetsByTutor(tutor_id: number) {
  const db = await getDb();
  if (!db) return [];
  
  const petsList = await db
    .select({
      pet_id: petTutors.pet_id,
      tutor_id: petTutors.tutor_id,
      is_primary: petTutors.is_primary,
      petName: pets.name,
      petBreed: pets.breed,
      petStatus: pets.status,
      petCredits: pets.credits,
    })
    .from(petTutors)
    .leftJoin(pets, eq(petTutors.pet_id, pets.id))
    .where(eq(petTutors.tutor_id, tutor_id));
  
  return petsList;
}

/**
 * Get all tutors with their pets grouped
 * Returns tutors with array of their pets
 */
export async function getTutorsWithPets() {
  const db = await getDb();
  if (!db) return [];
  
  // Get all tutors
  const allTutors = await db
    .select()
    .from(users)
    .where(eq(users.role, "user"));
  
  // Get pets for each tutor
  const tutorsWithPets = await Promise.all(
    allTutors.map(async (tutor) => {
      const petsList = await getPetsByTutor(tutor.id);
      return {
        ...tutor,
        pets: petsList,
        petCount: petsList.length,
      };
    })
  );
  
  return tutorsWithPets;
}

/**
 * Get all pets with their tutors grouped
 * Returns pets with array of their tutors
 */
export async function getPetsWithTutors() {
  const db = await getDb();
  if (!db) return [];
  
  // Get all pets
  const allPets = await db.select().from(pets);
  
  // Get tutors for each pet
  const petsWithTutors = await Promise.all(
    allPets.map(async (pet) => {
      const tutorsList = await getTutorsByPet(pet.id);
      return {
        ...pet,
        tutors: tutorsList,
        tutorCount: tutorsList.length,
      };
    })
  );
  
  return petsWithTutors;
}

// ============================================
// AUTO CALENDAR INTEGRATION HELPERS
// ============================================

/**
 * Automatically create calendar event from medication (single dose)
 */
export async function autoCreateMedicationEvent(
  pet_id: number,
  medicationId: number,
  medicationName: string,
  event_date: Date,
  dosage: string,
  frequency: string | undefined,
  createdById: number
): Promise<number> {
  const description = `Medicamento: ${medicationName}\nDosagem: ${dosage}${frequency ? `\nFrequência: ${frequency}` : ''}`;

  const eventId = await addCalendarEvent({
    title: `💊 ${medicationName}`,
    description,
    event_date: event_date,
    event_type: "medication",
    pet_id: pet_id,
    is_all_day: false,
    linked_resource_type: "medication",
    linked_resource_id: medicationId,
    auto_created: true,
    created_by_id: createdById,
  });

  return eventId;
}

/**
 * Create daily medication events for entire treatment period
 */
export async function autoCreateMedicationPeriod(
  pet_id: number,
  medicationId: number,
  medicationName: string,
  startDate: Date,
  endDate: Date | undefined,
  dosage: string,
  frequency: string | undefined,
  createdById: number
): Promise<number[]> {
  const eventIds: number[] = [];

  // If no end date, create only one event
  if (!endDate) {
    const eventId = await autoCreateMedicationEvent(
      pet_id,
      medicationId,
      medicationName,
      startDate,
      dosage,
      frequency,
      createdById
    );
    return [eventId];
  }

  // Create events for each day in the period
  const currentDate = new Date(startDate);
  const finalDate = new Date(endDate);

  // Limit to avoid creating too many events (max 180 days)
  const maxDays = 180;
  let dayCount = 0;

  while (currentDate <= finalDate && dayCount < maxDays) {
    const eventId = await autoCreateMedicationEvent(
      pet_id,
      medicationId,
      medicationName,
      new Date(currentDate),
      dosage,
      frequency,
      createdById
    );
    eventIds.push(eventId);

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    dayCount++;
  }

  return eventIds;
}

/**
 * Automatically create calendar event from vaccination
 */
export async function autoCreateVaccineEvent(
  pet_id: number,
  vaccineId: number,
  vaccineName: string,
  event_date: Date,
  doseNumber: number,
  veterinarian: string | undefined,
  clinic: string | undefined,
  createdById: number
): Promise<number> {
  let description = `Vacina: ${vaccineName}\nDose: ${doseNumber}ª`;
  if (veterinarian) description += `\nVeterinário: ${veterinarian}`;
  if (clinic) description += `\nClínica: ${clinic}`;

  const eventId = await addCalendarEvent({
    title: `💉 ${vaccineName} (${doseNumber}ª dose)`,
    description,
    event_date: event_date,
    event_type: "vaccination",
    pet_id: pet_id,
    is_all_day: true,
    linked_resource_type: "vaccine",
    linked_resource_id: vaccineId,
    auto_created: true,
    created_by_id: createdById,
  });

  return eventId;
}

/**
 * Automatically create calendar event from flea treatment
 */
export async function autoCreateFleaEvent(
  pet_id: number,
  treatmentId: number,
  productName: string,
  applicationDate: Date,
  next_due_date: Date | undefined,
  createdById: number
): Promise<number> {
  let description = `Antipulgas: ${productName}\nAplicação: ${applicationDate.toLocaleDateString('pt-BR')}`;
  if (next_due_date) description += `\nPróxima aplicação: ${next_due_date.toLocaleDateString('pt-BR')}`;

  const eventId = await addCalendarEvent({
    title: `🐛 Antipulgas: ${productName}`,
    description,
    event_date: applicationDate,
    event_type: "preventive",
    pet_id: pet_id,
    is_all_day: true,
    linked_resource_type: "preventive_flea",
    linked_resource_id: treatmentId,
    auto_created: true,
    created_by_id: createdById,
  });

  return eventId;
}

/**
 * Automatically create calendar event from deworming treatment
 */
export async function autoCreateDewormingEvent(
  pet_id: number,
  treatmentId: number,
  productName: string,
  applicationDate: Date,
  next_due_date: Date | undefined,
  createdById: number
): Promise<number> {
  let description = `Vermífugo: ${productName}\nAplicação: ${applicationDate.toLocaleDateString('pt-BR')}`;
  if (next_due_date) description += `\nPróxima aplicação: ${next_due_date.toLocaleDateString('pt-BR')}`;

  const eventId = await addCalendarEvent({
    title: `🪱 Vermífugo: ${productName}`,
    description,
    event_date: applicationDate,
    event_type: "preventive",
    pet_id: pet_id,
    is_all_day: true,
    linked_resource_type: "preventive_deworming",
    linked_resource_id: treatmentId,
    auto_created: true,
    created_by_id: createdById,
  });

  return eventId;
}

/**
 * Automatically create calendar event from health/behavior log
 */
export async function autoCreateHealthLogEvent(
  pet_id: number,
  logId: number,
  recordedAt: Date,
  mood: string | undefined,
  behavior: string | undefined,
  stool: string | undefined,
  appetite: string | undefined,
  waterIntake: string | undefined,
  notes: string | undefined,
  createdById: number
): Promise<number> {
  // Build title based on most relevant info
  let title = '📋 Registro de Saúde';
  if (behavior) title = `📋 Comportamento: ${behavior}`;
  else if (mood) title = `📋 Humor: ${mood}`;

  // Build description
  let description = '';
  if (mood) description += `Humor: ${mood}\n`;
  if (behavior) description += `Comportamento: ${behavior}\n`;
  if (stool) description += `Fezes: ${stool}\n`;
  if (appetite) description += `Apetite: ${appetite}\n`;
  if (waterIntake) description += `Água: ${waterIntake}\n`;
  if (notes) description += `\nObservações: ${notes}`;

  const eventId = await addCalendarEvent({
    title,
    description: description.trim(),
    event_date: recordedAt,
    event_type: "medical",
    pet_id: pet_id,
    is_all_day: false,
    linked_resource_type: "health_log",
    linked_resource_id: logId,
    auto_created: true,
    created_by_id: createdById,
  });

  return eventId;
}
