import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { pets, users, calendarEvents, documents } from "../drizzle/schema";
import { or, like, and, eq } from "drizzle-orm";

export const searchRouter = router({
  global: protectedProcedure
    .input(z.object({
      query: z.string().min(2),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const searchTerm = `%${input.query}%`;

      // Search pets
      const petsResults = await db
        .select()
        .from(pets)
        .where(
          or(
            like(pets.name, searchTerm),
            like(pets.breed, searchTerm),
            // species field doesn't exist in schema
          )
        )
        .limit(5);

      // Search users (tutors)
      const tutorsResults = await db
        .select()
        .from(users)
        .where(
          or(
            like(users.name, searchTerm),
            like(users.email, searchTerm)
          )
        )
        .limit(5);

      // Search calendar events
      const eventsResults = await db
        .select()
        .from(calendarEvents)
        .where(
          or(
            like(calendarEvents.title, searchTerm),
            // notes field doesn't exist in schema
          )
        )
        .limit(5);

      // Search documents
      const documentsResults = await db
        .select()
        .from(documents)
        .where(
          or(
            like(documents.title, searchTerm),
            // type field doesn't exist in schema, use category instead
            like(documents.category, searchTerm)
          )
        )
        .limit(5);

      return {
        pets: petsResults,
        tutors: tutorsResults,
        events: eventsResults,
        documents: documentsResults,
      };
    }),
});
