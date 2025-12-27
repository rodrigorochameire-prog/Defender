import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load .env.local first (development), then .env (production)
const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log(`[drizzle] Loaded .env.local from ${envLocalPath}`);
}

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`[drizzle] Loaded .env from ${envPath}`);
}

// Debug: Check if DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error("[drizzle] ERROR: DATABASE_URL not found in environment variables!");
  console.error("[drizzle] Checked files:", { envLocalPath, envPath });
} else {
  // Mask password in URL for logging
  const maskedUrl = process.env.DATABASE_URL.replace(/:[^@]+@/, ":***@");
  console.log(`[drizzle] DATABASE_URL loaded: ${maskedUrl}`);
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
