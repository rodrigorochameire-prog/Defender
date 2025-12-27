/**
 * Diagnostic script to check users table structure
 * Run this to see what columns actually exist in the database
 */

import { getDb } from "./db";
import { sql } from "drizzle-orm";

export async function checkUsersTableStructure() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  try {
    // Check what columns exist
    const columns = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log("=== Users Table Structure ===");
    console.log(JSON.stringify(columns.rows, null, 2));

    // Try to select one row to see what works
    try {
      const testQuery = await db.execute(sql`SELECT * FROM users LIMIT 1`);
      console.log("\n=== Test Query Result ===");
      console.log("Columns returned:", Object.keys(testQuery.rows[0] || {}));
    } catch (error: any) {
      console.error("\n=== Test Query Failed ===");
      console.error(error.message);
    }
  } catch (error: any) {
    console.error("Error checking table structure:", error.message);
  }
}

// Run if called directly
if (require.main === module) {
  checkUsersTableStructure()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

