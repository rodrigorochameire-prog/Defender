/**
 * Database cleanup script
 * Removes all data except admin user
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function cleanDatabase() {
  console.log("🧹 Starting database cleanup...");

  // Create connection
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema, mode: "default" });

  try {
    // PostgreSQL doesn't need to disable foreign key checks
    // We'll delete in the correct order to respect foreign keys

    console.log("📋 Deleting data from tables...");

    // Delete from tables (order matters due to foreign keys)
    await db.delete(schema.wallComments);
    console.log("  ✓ wall_comments cleared");

    await db.delete(schema.wallReactions);
    console.log("  ✓ wall_reactions cleared");

    await db.delete(schema.wallPosts);
    console.log("  ✓ wall_posts cleared");

    await db.delete(schema.chatMessages);
    console.log("  ✓ chat_messages cleared");

    await db.delete(schema.conversations);
    console.log("  ✓ conversations cleared");

    await db.delete(schema.notifications);
    console.log("  ✓ notifications cleared");

    await db.delete(schema.photoReactions);
    console.log("  ✓ photo_reactions cleared");

    await db.delete(schema.behaviorRecords);
    console.log("  ✓ behaviorRecords cleared");

    await db.delete(schema.dailyLogs);
    console.log("  ✓ daily_logs cleared");

    await db.delete(schema.documents);
    console.log("  ✓ documents cleared");

    await db.delete(schema.calendarEvents);
    console.log("  ✓ calendar_events cleared");

    await db.delete(schema.fleaTreatments);
    console.log("  ✓ fleaTreatments cleared");

    await db.delete(schema.dewormingTreatments);
    console.log("  ✓ dewormingTreatments cleared");

    await db.delete(schema.petMedications);
    console.log("  ✓ pet_medications cleared");

    await db.delete(schema.petVaccines);
    console.log("  ✓ pet_vaccines cleared");

    await db.delete(schema.transactions);
    console.log("  ✓ transactions cleared");

    await db.delete(schema.petTutors);
    console.log("  ✓ pet_tutors cleared");

    await db.delete(schema.pets);
    console.log("  ✓ pets cleared");

    await db.delete(schema.bookingRequests);
    console.log("  ✓ booking_requests cleared");

    await db.delete(schema.auditLogs);
    console.log("  ✓ audit_logs cleared");

    await db.delete(schema.foodMovements);
    console.log("  ✓ food_movements cleared");

    await db.delete(schema.subscriptionPurchases);
    console.log("  ✓ subscription_purchases cleared");

    await db.delete(schema.creditPackagePurchases);
    console.log("  ✓ credit_package_purchases cleared");

    await db.delete(schema.tutorNotificationPreferences);
    console.log("  ✓ tutor_notification_preferences cleared");

    // Delete all users except admin (role = 'admin')
    await db.execute(sql`DELETE FROM users WHERE role != 'admin'`);
    console.log("  ✓ non-admin users cleared");

    console.log("\n✅ Database cleanup completed successfully!");
    console.log("📊 Admin user preserved, all other data removed.");

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run cleanup
cleanDatabase()
  .then(() => {
    console.log("\n🎉 Cleanup script finished!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Cleanup script failed:", error);
    process.exit(1);
  });
