import { getDb } from "./db";
import { bookingRequests, pets, users, petTutors, bookings } from "../drizzle/schema";
import { eq, and, sql, gte, lte, inArray } from "drizzle-orm";
import { format } from "date-fns";

/**
 * Get availability for a specific date
 * Returns current occupancy and max capacity
 */
export async function getAvailability(date: string) {
  const MAX_CAPACITY = 10; // Maximum pets allowed per day
  const db = (await getDb())!;

  // Count confirmed bookings for this date
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookings)
    .where(
      and(
        eq(bookings.bookingDate, new Date(date)),
        inArray(bookings.status, ["confirmed", "pending"])
      )
    );

  const occupancy = Number(result[0]?.count || 0);
  const available = MAX_CAPACITY - occupancy;

  return {
    date,
    occupancy,
    maxCapacity: MAX_CAPACITY,
    available,
    status: available > 3 ? "available" : available > 0 ? "limited" : "full",
  };
}

/**
 * Get availability for multiple dates
 */
export async function getAvailabilityForDates(dates: string[]) {
  const results = await Promise.all(dates.map((date) => getAvailability(date)));
  return results;
}

/**
 * Create a new booking request
 */
export async function createBookingRequest(data: {
  petId: number;
  tutorId: string;
  requestedDates: string[];
  notes?: string;
}) {
  const db = (await getDb())!;
  const result = await db
    .insert(bookingRequests)
    .values({
      petId: data.petId,
      tutorId: data.tutorId,
      requestedDates: data.requestedDates,
      notes: data.notes,
      status: "pending",
    }) as any;

  const insertId = Number(result[0]?.insertId || 0);

  // Get the created request
  const [request] = await db
    .select()
    .from(bookingRequests)
    .where(eq(bookingRequests.id, insertId))
    .limit(1);

  return request;
}

/**
 * Get all booking requests for a tutor
 */
export async function getTutorBookingRequests(tutorId: string) {
  const db = (await getDb())!;
  const requests = await db
    .select({
      id: bookingRequests.id,
      petId: bookingRequests.petId,
      petName: pets.name,
      petPhoto: pets.photo_url,
      requestedDates: bookingRequests.requestedDates,
      status: bookingRequests.status,
      notes: bookingRequests.notes,
      adminNotes: bookingRequests.adminNotes,
      approvedBy: bookingRequests.approvedBy,
      approvedAt: bookingRequests.approvedAt,
      createdAt: bookingRequests.createdAt,
    })
    .from(bookingRequests)
    .leftJoin(pets, eq(bookingRequests.petId, pets.id))
    .where(eq(bookingRequests.tutorId, tutorId))
    .orderBy(sql`${bookingRequests.createdAt} DESC`);

  return requests;
}

/**
 * Get all pending booking requests (for admins)
 */
export async function getPendingBookingRequests() {
  const db = (await getDb())!;
  const requests = await db
    .select({
      id: bookingRequests.id,
      petId: bookingRequests.petId,
      petName: pets.name,
      petPhoto: pets.photo_url,
      tutorId: bookingRequests.tutorId,
      tutorName: users.name,
      tutorEmail: users.email,
      requestedDates: bookingRequests.requestedDates,
      status: bookingRequests.status,
      notes: bookingRequests.notes,
      createdAt: bookingRequests.createdAt,
    })
    .from(bookingRequests)
    .leftJoin(pets, eq(bookingRequests.petId, pets.id))
    .leftJoin(users, eq(bookingRequests.tutorId, users.open_id))
    .where(eq(bookingRequests.status, "pending"))
    .orderBy(sql`${bookingRequests.createdAt} ASC`);

  return requests;
}

/**
 * Get all booking requests (for admins) with filters
 */
export async function getAllBookingRequests(status?: string) {
  const db = (await getDb())!;
  let query = db
    .select({
      id: bookingRequests.id,
      petId: bookingRequests.petId,
      petName: pets.name,
      petPhoto: pets.photo_url,
      tutorId: bookingRequests.tutorId,
      tutorName: users.name,
      tutorEmail: users.email,
      requestedDates: bookingRequests.requestedDates,
      status: bookingRequests.status,
      notes: bookingRequests.notes,
      adminNotes: bookingRequests.adminNotes,
      approvedBy: bookingRequests.approvedBy,
      approvedAt: bookingRequests.approvedAt,
      createdAt: bookingRequests.createdAt,
    })
    .from(bookingRequests)
    .leftJoin(pets, eq(bookingRequests.petId, pets.id))
    .leftJoin(users, eq(bookingRequests.tutorId, users.open_id));

  if (status) {
    const requests = await query
      .where(eq(bookingRequests.status, status as any))
      .orderBy(sql`${bookingRequests.createdAt} DESC`);
    return requests;
  }

  const requests = await query.orderBy(sql`${bookingRequests.createdAt} DESC`);
  return requests;
}

/**
 * Approve a booking request and create actual bookings
 */
export async function approveBookingRequest(
  requestId: number,
  adminId: string,
  adminNotes?: string
) {
  const db = (await getDb())!;
  
  // Get the request
  const [request] = await db
    .select()
    .from(bookingRequests)
    .where(eq(bookingRequests.id, requestId));

  if (!request) {
    throw new Error("Booking request not found");
  }

  if (request.status !== "pending") {
    throw new Error("Booking request is not pending");
  }

  // Get pet info to check credits
  const [pet] = await db
    .select()
    .from(pets)
    .where(eq(pets.id, request.petId));

  if (!pet) {
    throw new Error("Pet not found");
  }

  const requestedDates = request.requestedDates as string[];
  const requiredCredits = requestedDates.length;

  if (pet.credits < requiredCredits) {
    throw new Error(
      `Insufficient credits. Required: ${requiredCredits}, Available: ${pet.credits}`
    );
  }

  // Check availability for all dates
  const availabilities = await getAvailabilityForDates(requestedDates);
  const unavailableDates = availabilities.filter((a) => a.status === "full");

  if (unavailableDates.length > 0) {
    throw new Error(
      `Some dates are no longer available: ${unavailableDates.map((d) => d.date).join(", ")}`
    );
  }

  // Get tutorId as number
  const [tutor] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.open_id, request.tutorId));

  if (!tutor) {
    throw new Error("Tutor not found");
  }

  // Create bookings for each date
  for (const date of requestedDates) {
    await db.insert(bookings).values({
      petId: request.petId,
      tutorId: tutor.id,
      bookingDate: new Date(date),
      status: "confirmed",
      numberOfDays: 1,
      notes: request.notes,
    });
  }

  // Deduct credits
  await db
    .update(pets)
    .set({
      credits: pet.credits - requiredCredits,
      updated_at: new Date(),
    })
    .where(eq(pets.id, request.petId));

  // Update request status
  await db
    .update(bookingRequests)
    .set({
      status: "approved",
      approvedBy: adminId,
      approvedAt: new Date(),
      adminNotes,
      updatedAt: new Date(),
    })
    .where(eq(bookingRequests.id, requestId));

  return { success: true, creditsUsed: requiredCredits };
}

/**
 * Reject a booking request
 */
export async function rejectBookingRequest(
  requestId: number,
  adminId: string,
  adminNotes?: string
) {
  const db = (await getDb())!;
  const [request] = await db
    .select()
    .from(bookingRequests)
    .where(eq(bookingRequests.id, requestId));

  if (!request) {
    throw new Error("Booking request not found");
  }

  if (request.status !== "pending") {
    throw new Error("Booking request is not pending");
  }

  await db
    .update(bookingRequests)
    .set({
      status: "rejected",
      approvedBy: adminId,
      approvedAt: new Date(),
      adminNotes,
      updatedAt: new Date(),
    })
    .where(eq(bookingRequests.id, requestId));

  return { success: true };
}

/**
 * Cancel a booking request (by tutor)
 */
export async function cancelBookingRequest(requestId: number, tutorId: string) {
  const db = (await getDb())!;
  const [request] = await db
    .select()
    .from(bookingRequests)
    .where(eq(bookingRequests.id, requestId));

  if (!request) {
    throw new Error("Booking request not found");
  }

  if (request.tutorId !== tutorId) {
    throw new Error("Unauthorized");
  }

  if (request.status !== "pending") {
    throw new Error("Can only cancel pending requests");
  }

  await db
    .update(bookingRequests)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(bookingRequests.id, requestId));

  return { success: true };
}

/**
 * Get booking request statistics
 */
export async function getBookingRequestStats() {
  const db = (await getDb())!;
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      pending: sql<number>`sum(case when ${bookingRequests.status} = 'pending' then 1 else 0 end)`,
      approved: sql<number>`sum(case when ${bookingRequests.status} = 'approved' then 1 else 0 end)`,
      rejected: sql<number>`sum(case when ${bookingRequests.status} = 'rejected' then 1 else 0 end)`,
      cancelled: sql<number>`sum(case when ${bookingRequests.status} = 'cancelled' then 1 else 0 end)`,
    })
    .from(bookingRequests);

  return {
    total: Number(stats.total || 0),
    pending: Number(stats.pending || 0),
    approved: Number(stats.approved || 0),
    rejected: Number(stats.rejected || 0),
    cancelled: Number(stats.cancelled || 0),
  };
}
